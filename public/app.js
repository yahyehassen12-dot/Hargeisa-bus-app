// Initialize Socket.io connection
const socket = io();

// User State (Persisted in localStorage)
let currentUser = null;
try {
  const savedUser = localStorage.getItem('hga_bus_user');
  if (savedUser) currentUser = JSON.parse(savedUser);
} catch (e) {
  currentUser = null;
}

// Modal & Registration Temp State
let selectedRole = 'passenger'; // 'passenger' | 'driver'
let selectedOperator = 'Telesom';
let selectedPrefix = '+252 63';
let generatedOtp = '5821';
let pendingUser = null;

// App State
let appStops = [];
let appBuses = {};
let appWaitingCounts = {};
let appWaitingDetails = {};

// Passenger State
let passengerDirection = 'to_suuq';
let passengerStopId = '150ka';
let isPassengerWaiting = false;

// Driver State (Local simulated driver: bus-01)
const myBusId = 'bus-01';
let driverDirection = 'to_jigjiga';
let isDriverOnline = true;
let freeSeatsCount = 5;
let isSimulatingDrive = false;
let simInterval = null;
let simStepIndex = 1;

// Leaflet Map & Markers
let map = null;
let stopMarkers = {};
let busMarkers = {};
let routePolyline = null;

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initMap();
  setupSocketListeners();
  renderUserProfile();
  setViewMode('passenger');
});

// View switching
function switchView(mode) {
  document.querySelectorAll('.role-btn').forEach(btn => btn.classList.remove('active'));
  document.getElementById(`tab-${mode}`).classList.add('active');
  setViewMode(mode);
}

function setViewMode(mode) {
  document.body.className = `view-${mode}`;
  setTimeout(() => {
    if (map) map.invalidateSize();
  }, 250);
}

// Leaflet Map Setup
function initMap() {
  map = L.map('bus-map').setView([9.574, 44.071], 14);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }).addTo(map);
}

// Setup Socket.IO Events
function setupSocketListeners() {
  socket.on('init_data', (data) => {
    appStops = data.stops || [];
    appBuses = data.buses || {};
    appWaitingCounts = data.waitingCounts || {};
    appWaitingDetails = data.waitingDetails || {};

    renderStopsOnMap();
    populateStopDropdown();
    updateBusMarkers();
    renderDriverQueue();
    updatePassengerETA();
  });

  socket.on('buses_updated', (buses) => {
    appBuses = buses;
    updateBusMarkers();
    updatePassengerETA();
  });

  socket.on('passengers_updated', (data) => {
    appWaitingCounts = data.summary || {};
    appWaitingDetails = data.details || {};
    updateStopBadges();
    renderDriverQueue();
  });
}

// Map Rendering: Stops & Route
function renderStopsOnMap() {
  if (!map || appStops.length === 0) return;

  const latlngs = appStops.map(s => [s.lat, s.lng]);

  if (routePolyline) map.removeLayer(routePolyline);
  routePolyline = L.polyline(latlngs, {
    color: '#059669',
    weight: 5,
    opacity: 0.85,
    dashArray: '8, 8'
  }).addTo(map);

  appStops.forEach((stop) => {
    if (stopMarkers[stop.id]) {
      map.removeLayer(stopMarkers[stop.id]);
    }

    const customIcon = L.divIcon({
      className: 'stop-marker-wrap',
      html: `
        <div class="stop-marker-dot" id="stop-dot-${stop.id}"></div>
        <div class="stop-marker-badge hidden" id="stop-badge-${stop.id}">0</div>
      `,
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });

    const marker = L.marker([stop.lat, stop.lng], { icon: customIcon }).addTo(map);
    marker.bindPopup(`<b>${stop.name}</b><br><span style="font-size:12px;color:#666;">Isgoys / Bus Stop</span>`);
    
    marker.on('click', () => {
      passengerStopId = stop.id;
      const select = document.getElementById('passenger-stop-select');
      if (select) select.value = stop.id;
      onPassengerStopChange();
    });

    stopMarkers[stop.id] = marker;
  });

  updateStopBadges();
}

function populateStopDropdown() {
  const select = document.getElementById('passenger-stop-select');
  if (!select) return;
  select.innerHTML = '';
  appStops.forEach(stop => {
    const opt = document.createElement('option');
    opt.value = stop.id;
    opt.textContent = stop.name;
    if (stop.id === passengerStopId) opt.selected = true;
    select.appendChild(opt);
  });
}

// Update Bus Markers with details
function updateBusMarkers() {
  if (!map) return;

  Object.values(appBuses).forEach(bus => {
    if (!bus.online) {
      if (busMarkers[bus.id]) {
        map.removeLayer(busMarkers[bus.id]);
        delete busMarkers[bus.id];
      }
      return;
    }

    const busIcon = L.divIcon({
      className: 'custom-bus-icon',
      html: `
        <div class="bus-marker-bubble">
          <i class="fa-solid fa-van-shuttle"></i>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const popupHtml = `
      <div style="font-size:13px; line-height: 1.5;">
        <b>${bus.name}</b> (${bus.plate})<br>
        <span style="color:#64748b;">Dareewal: ${bus.driverName || 'Xasan'} (${bus.operator || 'Telesom'} ${bus.driverPhone || ''})</span><br>
        <span>Jihada: <b>${bus.direction === 'to_suuq' ? 'Suuqa' : 'Jigjiga-Yar'}</b></span><br>
        <span style="color:#059669; font-weight:bold;">Kuraas bannaan: ${bus.freeSeats || 0}</span>
      </div>
    `;

    if (!busMarkers[bus.id]) {
      const marker = L.marker([bus.lat, bus.lng], { icon: busIcon }).addTo(map);
      marker.bindPopup(popupHtml);
      busMarkers[bus.id] = marker;
    } else {
      busMarkers[bus.id].setLatLng([bus.lat, bus.lng]);
      busMarkers[bus.id].setPopupContent(popupHtml);
    }
  });
}

function updateStopBadges() {
  Object.keys(stopMarkers).forEach(stopId => {
    const countData = appWaitingCounts[stopId];
    const total = countData ? countData.total : 0;
    const badgeEl = document.getElementById(`stop-badge-${stopId}`);
    if (badgeEl) {
      if (total > 0) {
        badgeEl.textContent = total;
        badgeEl.classList.remove('hidden');
      } else {
        badgeEl.classList.add('hidden');
      }
    }
  });
}

function calculateDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3;
  const phi1 = lat1 * Math.PI / 180;
  const phi2 = lat2 * Math.PI / 180;
  const deltaPhi = (lat2 - lat1) * Math.PI / 180;
  const deltaLambda = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

function updatePassengerETA() {
  const currentStop = appStops.find(s => s.id === passengerStopId);
  if (!currentStop) return;

  const activeBusList = Object.values(appBuses).filter(b => b.online);

  if (activeBusList.length === 0) {
    document.getElementById('nearest-bus-name').textContent = 'Bas online maaha';
    document.getElementById('nearest-bus-plate').textContent = '---';
    document.getElementById('nearest-bus-dist').textContent = '---';
    document.getElementById('nearest-bus-eta').textContent = '---';
    document.getElementById('nearest-bus-seats').textContent = '---';
    return;
  }

  let nearestBus = null;
  let minDistance = Infinity;

  activeBusList.forEach(bus => {
    const dist = calculateDistanceMeters(currentStop.lat, currentStop.lng, bus.lat, bus.lng);
    if (dist < minDistance) {
      minDistance = dist;
      nearestBus = bus;
    }
  });

  if (nearestBus) {
    document.getElementById('nearest-bus-name').textContent = nearestBus.name;
    document.getElementById('nearest-bus-plate').textContent = nearestBus.plate;
    document.getElementById('nearest-bus-seats').textContent = `${nearestBus.freeSeats} kursi`;

    // Driver contact
    document.getElementById('nearest-driver-name').textContent = nearestBus.driverName || 'Dareewal';
    const opEl = document.getElementById('nearest-driver-op');
    opEl.textContent = nearestBus.operator || 'Telesom';
    opEl.className = `op-tag op-${(nearestBus.operator || 'telesom').toLowerCase()} sm-tag`;

    const callEl = document.getElementById('nearest-driver-call');
    if (nearestBus.driverPhone) {
      callEl.href = `tel:${nearestBus.driverPhone.replace(/\s+/g, '')}`;
      callEl.style.display = 'inline-flex';
    } else {
      callEl.style.display = 'none';
    }

    if (minDistance < 1000) {
      document.getElementById('nearest-bus-dist').textContent = `${minDistance} m`;
    } else {
      document.getElementById('nearest-bus-dist').textContent = `${(minDistance / 1000).toFixed(1)} km`;
    }

    const minutes = Math.max(1, Math.round(minDistance / 360));
    document.getElementById('nearest-bus-eta').textContent = `${minutes} daqiiqo`;
  }
}

// Passenger Action: Direction & Stop
function setPassengerDirection(dir) {
  passengerDirection = dir;
  document.getElementById('btn-dir-suuq').classList.toggle('active', dir === 'to_suuq');
  document.getElementById('btn-dir-jigjiga').classList.toggle('active', dir === 'to_jigjiga');
  
  if (isPassengerWaiting) {
    emitPassengerSignal('add');
  }
}

function onPassengerStopChange() {
  const select = document.getElementById('passenger-stop-select');
  passengerStopId = select.value;
  updatePassengerETA();

  if (isPassengerWaiting) {
    emitPassengerSignal('add');
  }
}

// Passenger Action: Signal Bus (Wadada ayaan taaganahay)
function togglePassengerWaiting() {
  // If not logged in, prompt user to register/login with their phone number!
  if (!currentUser) {
    openAuthModal('passenger');
    return;
  }

  const btn = document.getElementById('btn-signal-bus');
  const toast = document.getElementById('signal-status-toast');
  const toastMsg = document.getElementById('signal-toast-msg');

  if (!isPassengerWaiting) {
    isPassengerWaiting = true;
    btn.className = 'btn-signal is-waiting';
    btn.querySelector('.main-cta').textContent = 'BAS BAAN SUGAYAA (RIIX SI AAD U BAAJISO)';
    btn.querySelector('.sub-cta').textContent = `${currentUser.name} (${currentUser.phone}): Dareewalka ayaa ku arkaya`;
    toastMsg.textContent = `${currentUser.name}, lambarkaaga (${currentUser.phone}) dareewaladu way arkaan!`;
    toast.classList.remove('hidden');

    emitPassengerSignal('add');
  } else {
    isPassengerWaiting = false;
    btn.className = 'btn-signal not-waiting';
    btn.querySelector('.main-cta').textContent = 'WADADA AYAAN TAAGANAHAY';
    btn.querySelector('.sub-cta').textContent = 'Riix si dareewalku u arko lambarkaaga & goobtaada';
    toast.classList.add('hidden');

    emitPassengerSignal('cancel');
  }
}

function emitPassengerSignal(action) {
  const pId = currentUser ? currentUser.phone : 'guest-' + Math.random().toString(36).substring(2, 7);
  socket.emit('passenger_signal', {
    passengerId: pId,
    name: currentUser ? currentUser.name : 'Rakaab Socda',
    phone: currentUser ? currentUser.phone : '',
    operator: currentUser ? currentUser.operator : 'Telesom',
    stopId: passengerStopId,
    direction: passengerDirection,
    action: action
  });
}

// Driver Panel: Render Queue with Detailed Passenger Names & Phones
function renderDriverQueue() {
  const container = document.getElementById('stops-queue-list');
  const badgeTotal = document.getElementById('total-waiting-badge');
  if (!container) return;

  container.innerHTML = '';
  let grandTotal = 0;

  appStops.forEach(stop => {
    const countData = appWaitingCounts[stop.id] || { total: 0, to_suuq: 0, to_jigjiga: 0 };
    grandTotal += countData.total;

    const stopPassengers = appWaitingDetails[stop.id] || [];
    const relevantPassengers = stopPassengers.filter(p => p.direction === driverDirection);
    const hasWaiting = relevantPassengers.length > 0;

    const stopBlock = document.createElement('div');
    stopBlock.className = `queue-stop-block ${hasWaiting ? 'has-waiting' : ''}`;

    let passengersHtml = '';
    if (hasWaiting) {
      passengersHtml = `
        <div class="waiting-passengers-sublist">
          ${relevantPassengers.map(p => `
            <div class="passenger-row">
              <div class="passenger-meta">
                <span class="op-tag op-${(p.operator || 'telesom').toLowerCase()}">${p.operator || 'Telesom'}</span>
                <span class="p-name">${p.name}</span>
                <span class="p-phone">${p.phone || ''}</span>
              </div>
              ${p.phone ? `
                <a href="tel:${p.phone.replace(/\s+/g, '')}" class="call-link">
                  <i class="fa-solid fa-phone"></i> Wac
                </a>
              ` : ''}
            </div>
          `).join('')}
        </div>
      `;
    }

    stopBlock.innerHTML = `
      <div class="queue-stop-header">
        <span class="stop-title">${stop.name}</span>
        <div style="display:flex; align-items:center; gap:0.5rem;">
          <span class="stop-waiting-count ${hasWaiting ? 'highlight' : ''}">
            <i class="fa-solid fa-users"></i> ${relevantPassengers.length} qof
          </span>
          ${hasWaiting ? `
            <button class="btn-pickup" onclick="driverPickup('${stop.id}')">
              <i class="fa-solid fa-check"></i> Qaad
            </button>
          ` : ''}
        </div>
      </div>
      ${passengersHtml}
    `;

    container.appendChild(stopBlock);
  });

  if (badgeTotal) {
    badgeTotal.textContent = `${grandTotal} qof ayaa wadada taagan`;
  }
}

function driverPickup(stopId) {
  socket.emit('driver_pickup', {
    stopId: stopId,
    direction: driverDirection
  });
}

function toggleDriverOnline() {
  isDriverOnline = document.getElementById('driver-online-toggle').checked;
  socket.emit('driver_update', {
    busId: myBusId,
    online: isDriverOnline
  });
}

function adjustSeats(delta) {
  freeSeatsCount = Math.max(0, Math.min(14, freeSeatsCount + delta));
  document.getElementById('free-seats-counter').textContent = freeSeatsCount;
  socket.emit('driver_update', {
    busId: myBusId,
    freeSeats: freeSeatsCount
  });
}

function setDriverDirection(dir) {
  driverDirection = dir;
  document.getElementById('driver-dir-suuq').classList.toggle('active', dir === 'to_suuq');
  document.getElementById('driver-dir-jigjiga').classList.toggle('active', dir === 'to_jigjiga');
  
  socket.emit('driver_update', {
    busId: myBusId,
    direction: driverDirection
  });
  renderDriverQueue();
}

function toggleDriveSimulation() {
  const btn = document.getElementById('btn-toggle-sim');
  const progressBar = document.getElementById('sim-progress-bar');

  if (!isSimulatingDrive) {
    isSimulatingDrive = true;
    btn.innerHTML = '<i class="fa-solid fa-pause"></i> Jooji';
    btn.style.backgroundColor = '#dc2626';

    simInterval = setInterval(() => {
      if (!appStops || appStops.length === 0) return;

      const targetStop = appStops[simStepIndex];
      const progressPercent = ((simStepIndex + 1) / appStops.length) * 100;
      if (progressBar) progressBar.style.width = `${progressPercent}%`;

      socket.emit('driver_update', {
        busId: myBusId,
        lat: targetStop.lat,
        lng: targetStop.lng,
        direction: driverDirection,
        online: true
      });

      if (driverDirection === 'to_jigjiga') {
        simStepIndex++;
        if (simStepIndex >= appStops.length) {
          simStepIndex = appStops.length - 2;
          setDriverDirection('to_suuq');
        }
      } else {
        simStepIndex--;
        if (simStepIndex < 0) {
          simStepIndex = 1;
          setDriverDirection('to_jigjiga');
        }
      }
    }, 2800);
  } else {
    isSimulatingDrive = false;
    clearInterval(simInterval);
    btn.innerHTML = '<i class="fa-solid fa-play"></i> Bilow';
    btn.style.backgroundColor = '#f59e0b';
  }
}

// -------------------------------------------------------------
// AUTHENTICATION & REGISTRATION MODAL LOGIC (TELESOM / SOMTEL / SOLTELCO)
// -------------------------------------------------------------

function openAuthModal(defaultRole) {
  if (defaultRole) selectAuthRole(defaultRole);
  document.getElementById('auth-step-1').classList.remove('hidden');
  document.getElementById('auth-step-2').classList.add('hidden');
  document.getElementById('auth-modal').classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
}

function selectAuthRole(role) {
  selectedRole = role;
  document.getElementById('role-card-passenger').classList.toggle('active', role === 'passenger');
  document.getElementById('role-card-driver').classList.toggle('active', role === 'driver');
  document.getElementById('driver-extra-fields').classList.toggle('hidden', role !== 'driver');
}

function selectOperator(name, code) {
  selectedOperator = name;
  if (code === '25263') selectedPrefix = '+252 63';
  else if (code === '25265') selectedPrefix = '+252 65';
  else if (code === '25267') selectedPrefix = '+252 67';

  document.querySelectorAll('.operator-box').forEach(b => b.classList.remove('active'));
  document.getElementById(`op-btn-${name.toLowerCase()}`).classList.add('active');
  document.getElementById('phone-prefix-display').textContent = selectedPrefix;
}

function validatePhoneInput() {
  const input = document.getElementById('reg-phone-digits');
  // allow only numeric
  input.value = input.value.replace(/\D/g, '');
}

function goToOtpStep() {
  const name = document.getElementById('reg-name').value.trim();
  const digits = document.getElementById('reg-phone-digits').value.trim();

  if (!name) {
    alert('Fadlan geli magacaaga oo buuxa!');
    return;
  }

  if (digits.length < 7) {
    alert('Fadlan geli 7-da lambar ee dambe ee taleefankaaga!');
    return;
  }

  const fullPhone = `${selectedPrefix} ${digits}`;
  
  let busPlate = '';
  let busName = '';
  if (selectedRole === 'driver') {
    busPlate = document.getElementById('reg-bus-plate').value.trim() || 'HGA-4592';
    busName = document.getElementById('reg-bus-name').value.trim() || 'Caasi 12 (Caddaan)';
  }

  pendingUser = {
    name,
    phone: fullPhone,
    digits,
    operator: selectedOperator,
    role: selectedRole,
    busPlate,
    busName
  };

  // Generate 4-digit verification code
  generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
  document.getElementById('otp-phone-display').textContent = fullPhone;
  document.getElementById('sms-sender-op').textContent = selectedOperator;
  document.getElementById('gen-otp-code').textContent = generatedOtp;

  // Auto-fill OTP inputs for smooth testing experience
  document.getElementById('otp-1').value = generatedOtp[0];
  document.getElementById('otp-2').value = generatedOtp[1];
  document.getElementById('otp-3').value = generatedOtp[2];
  document.getElementById('otp-4').value = generatedOtp[3];

  document.getElementById('auth-step-1').classList.add('hidden');
  document.getElementById('auth-step-2').classList.remove('hidden');
}

function backToStep1() {
  document.getElementById('auth-step-2').classList.add('hidden');
  document.getElementById('auth-step-1').classList.remove('hidden');
}

function moveOtpFocus(current, nextId) {
  if (current.value.length === 1 && nextId) {
    document.getElementById(nextId).focus();
  }
}

function verifyOtpAndLogin() {
  const o1 = document.getElementById('otp-1').value;
  const o2 = document.getElementById('otp-2').value;
  const o3 = document.getElementById('otp-3').value;
  const o4 = document.getElementById('otp-4').value;
  const enteredOtp = `${o1}${o2}${o3}${o4}`;

  if (enteredOtp !== generatedOtp) {
    alert('Koodhka xaqiijintu waa khalad, fadlan sax!');
    return;
  }

  // Success
  currentUser = { ...pendingUser };
  localStorage.setItem('hga_bus_user', JSON.stringify(currentUser));

  // Inform backend
  socket.emit('user_register', currentUser);

  if (currentUser.role === 'driver') {
    socket.emit('driver_update', {
      busId: myBusId,
      name: currentUser.busName,
      plate: currentUser.busPlate,
      driverName: currentUser.name,
      driverPhone: currentUser.phone,
      operator: currentUser.operator
    });
    switchView('driver');
  } else {
    switchView('passenger');
  }

  renderUserProfile();
  closeAuthModal();
}

function logoutUser() {
  if (confirm('Ma hubtaa inaad rabto inaad ka baxdo akoonkaaga?')) {
    localStorage.removeItem('hga_bus_user');
    currentUser = null;
    isPassengerWaiting = false;

    // Reset passenger button if active
    const btn = document.getElementById('btn-signal-bus');
    btn.className = 'btn-signal not-waiting';
    btn.querySelector('.main-cta').textContent = 'WADADA AYAAN TAAGANAHAY';
    btn.querySelector('.sub-cta').textContent = 'Riix si dareewalku u arko lambarkaaga & goobtaada';
    document.getElementById('signal-status-toast').classList.add('hidden');

    renderUserProfile();
  }
}

function renderUserProfile() {
  const badge = document.getElementById('user-profile-badge');
  const btnOpen = document.getElementById('btn-open-login');

  if (currentUser) {
    badge.classList.remove('hidden');
    btnOpen.classList.add('hidden');

    document.getElementById('header-user-name').textContent = currentUser.name;
    document.getElementById('header-phone-val').textContent = currentUser.phone;

    const opTag = document.getElementById('header-op-tag');
    opTag.textContent = currentUser.operator;
    opTag.className = `op-tag op-${currentUser.operator.toLowerCase()}`;

    document.getElementById('user-avatar-initial').textContent = currentUser.name.charAt(0).toUpperCase();

    // If driver, sync driver UI labels
    if (currentUser.role === 'driver') {
      document.getElementById('driver-bus-title').textContent = currentUser.busName || 'Caasi 12 (Caddaan)';
      document.getElementById('driver-plate-badge').textContent = currentUser.busPlate || 'HGA-4592';
      document.getElementById('driver-display-phone').innerHTML = `
        <span class="op-tag op-${currentUser.operator.toLowerCase()}">${currentUser.operator}</span> ${currentUser.phone} (${currentUser.name})
      `;
    }
  } else {
    badge.classList.add('hidden');
    btnOpen.classList.remove('hidden');
  }
}
