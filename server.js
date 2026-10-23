const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Predefined route: Jigjiga-Yar <-> Saldhiga Dhexe (Suuqa)
const STOPS = [
  { id: 'saldhiga', name: 'Saldhiga Dhexe (Suuqa)', lat: 9.5602, lng: 44.0640 },
  { id: 'taallada', name: 'Taallada Diyaaradda', lat: 9.5630, lng: 44.0665 },
  { id: 'shaabka', name: 'Isgoyska Shaabka', lat: 9.5670, lng: 44.0700 },
  { id: '150ka', name: 'Isgoyska 150-ka', lat: 9.5745, lng: 44.0735 },
  { id: 'kaah', name: 'Kaah Express / Hadhwanaag', lat: 9.5810, lng: 44.0760 },
  { id: 'jigjiga_yar', name: 'Jigjiga-Yar (Kala-jeexada)', lat: 9.5875, lng: 44.0785 }
];

// In-memory registered users: { [phone]: { name, phone, operator, role, busPlate, createdAt } }
let registeredUsers = {
  '+252634452134': {
    name: 'Yahyaa',
    phone: '+252 63 4452134',
    operator: 'Telesom',
    role: 'driver',
    busPlate: 'HGA-4592',
    busName: 'Caasi 12 (Caddaan)'
  }
};

// Active buses: { [busId]: { id, name, plate, driverName, driverPhone, operator, direction, lat, lng, speed, online, freeSeats, lastUpdated } }
let activeBuses = {
  'bus-01': {
    id: 'bus-01',
    name: 'Caasi 12 (Caddaan)',
    plate: 'HGA-4592',
    driverName: 'Yahyaa',
    driverPhone: '+252 63 4452134',
    operator: 'Telesom',
    direction: 'to_jigjiga',
    lat: 9.5630,
    lng: 44.0665,
    speed: 25,
    online: true,
    capacity: 14,
    freeSeats: 5,
    lastUpdated: Date.now()
  }
};

// Waiting passengers: { [stopId]: [ { passengerId, name, phone, operator, direction, timestamp } ] }
let waitingPassengers = {
  'saldhiga': [],
  'taallada': [
    { passengerId: 'seed-p3', name: 'Mustafe Xasan', phone: '+252 67 4018822', operator: 'Soltelco', direction: 'to_jigjiga', timestamp: Date.now() }
  ],
  'shaabka': [],
  '150ka': [
    { passengerId: 'seed-p1', name: 'Cabdi Axmed', phone: '+252 63 4412984', operator: 'Telesom', direction: 'to_suuq', timestamp: Date.now() },
    { passengerId: 'seed-p2', name: 'Deeqa Jaamac', phone: '+252 65 9182374', operator: 'Somtel', direction: 'to_suuq', timestamp: Date.now() }
  ],
  'kaah': [],
  'jigjiga_yar': []
};

io.on('connection', (socket) => {
  console.log(`[Socket] Connected: ${socket.id}`);

  // Send initial data to client
  socket.emit('init_data', {
    stops: STOPS,
    buses: activeBuses,
    waitingCounts: getWaitingCountsSummary(),
    waitingDetails: waitingPassengers
  });

  // User Registration / Login
  socket.on('user_register', (userData, callback) => {
    // userData: { name, phone, operator, role, busPlate, busName }
    const key = userData.phone.replace(/\s+/g, '');
    registeredUsers[key] = {
      ...userData,
      createdAt: Date.now()
    };

    console.log(`[Auth] Registered: ${userData.name} (${userData.operator} ${userData.phone}) as ${userData.role}`);
    if (typeof callback === 'function') {
      callback({ success: true, user: registeredUsers[key] });
    }
  });

  // Driver registers / updates location & status
  socket.on('driver_update', (data) => {
    if (!data.busId) return;
    activeBuses[data.busId] = {
      ...activeBuses[data.busId],
      ...data,
      lastUpdated: Date.now()
    };
    io.emit('buses_updated', activeBuses);
  });

  // Passenger signals that they are waiting at a stop
  socket.on('passenger_signal', (data) => {
    // data: { passengerId, stopId, direction, action: 'add' | 'cancel', name, phone, operator }
    const { passengerId, stopId, direction, action, name, phone, operator } = data;
    if (!waitingPassengers[stopId]) waitingPassengers[stopId] = [];

    if (action === 'add') {
      const idx = waitingPassengers[stopId].findIndex(p => p.passengerId === passengerId);
      const passengerEntry = {
        passengerId,
        name: name || 'Rakaab Socda',
        phone: phone || '',
        operator: operator || 'Telesom',
        direction,
        timestamp: Date.now()
      };

      if (idx >= 0) {
        waitingPassengers[stopId][idx] = passengerEntry;
      } else {
        waitingPassengers[stopId].push(passengerEntry);
      }
    } else if (action === 'cancel') {
      waitingPassengers[stopId] = waitingPassengers[stopId].filter(p => p.passengerId !== passengerId);
    }

    io.emit('passengers_updated', {
      summary: getWaitingCountsSummary(),
      details: waitingPassengers
    });
  });

  // Driver picks up passengers at a stop
  socket.on('driver_pickup', (data) => {
    const { stopId, direction } = data;
    if (waitingPassengers[stopId]) {
      if (direction) {
        waitingPassengers[stopId] = waitingPassengers[stopId].filter(p => p.direction !== direction);
      } else {
        waitingPassengers[stopId] = [];
      }
    }
    io.emit('passengers_updated', {
      summary: getWaitingCountsSummary(),
      details: waitingPassengers
    });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Disconnected: ${socket.id}`);
  });
});

function getWaitingCountsSummary() {
  const summary = {};
  for (const stop of STOPS) {
    const list = waitingPassengers[stop.id] || [];
    summary[stop.id] = {
      total: list.length,
      to_suuq: list.filter(p => p.direction === 'to_suuq').length,
      to_jigjiga: list.filter(p => p.direction === 'to_jigjiga').length
    };
  }
  return summary;
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚌 Hargeisa Bus App running at http://localhost:${PORT}`);
});
