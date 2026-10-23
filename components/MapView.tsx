"use client";

import { useEffect, useRef, useState } from "react";
import type { Circle, Map as LeafletMap, Marker } from "leaflet";
import { Icon, BUS_GLYPH } from "./Icon";
import { GPS_ROUTE_RADIUS, ROUTE_NAME } from "@/lib/config";
import { STOPS, cleanPhone } from "@/lib/data";
import { useTransit } from "@/lib/store";
import type { Bus } from "@/lib/types";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function busMarkerHtml(bus: Bus, isMe: boolean) {
  const towards = bus.direction === "to_suuq" ? "Suuqa" : "Jigjiga-Yar";
  const arrow = bus.direction === "to_suuq" ? "→" : "←";
  return `<div class="bus-marker ${isMe ? "is-me" : ""}">
    <span class="bus-ping"></span>
    <span class="bus-bubble">${BUS_GLYPH}<span class="bus-dir">${arrow}</span></span>
    <span class="bus-label"><b>${escapeHtml(bus.name)}</b><i>${towards}</i></span>
    ${isMe ? '<span class="bus-me-tag">ADIGA</span>' : ""}
  </div>`;
}

function busPopupHtml(bus: Bus, isMe: boolean) {
  const direction = bus.direction === "to_suuq" ? "Suuqa" : "Jigjiga-Yar";
  const phone = cleanPhone(bus.driverPhone);
  return `<div class="map-popup">
    <div class="map-popup-top">
      <strong>${escapeHtml(bus.name)}</strong>
      <span class="map-popup-plate">${escapeHtml(bus.plate)}</span>
    </div>
    ${isMe ? '<span class="map-popup-me">Baskan adigaa wata</span>' : ""}
    <div class="map-popup-row"><span>Dareewal</span><b>${escapeHtml(bus.driverName)}</b></div>
    <div class="map-popup-row"><span>Jihada</span><b>${direction}</b></div>
    <div class="map-popup-row"><span>Kuraas banaan</span><b class="is-green">${bus.freeSeats}</b></div>
    ${
      bus.driverPhone
        ? `<a class="map-popup-call" href="tel:${phone}"><span>Wac dareewalka</span><b>${escapeHtml(bus.driverPhone)}</b></a>`
        : ""
    }
  </div>`;
}

function stopMarkerHtml(active: boolean, count: number, terminal: boolean) {
  return `<div class="stop-marker ${active ? "is-active" : ""} ${terminal ? "is-terminal" : ""}">
    <span class="stop-halo"></span>
    <span class="stop-dot"></span>
    ${count > 0 ? `<span class="stop-count">${count}</span>` : ""}
  </div>`;
}

function userMarkerHtml(label: string) {
  return `<div class="user-marker">
    <span class="user-pulse"></span>
    <span class="user-dot"></span>
    <span class="user-tag">${label}</span>
  </div>`;
}

export function MapView() {
  const {
    buses,
    myBus,
    user,
    view,
    onlineCount,
    waitCounts,
    passengerStopId,
    setPassengerStopId,
    location,
    nearestUserStop,
    requestLocation,
    notify,
  } = useTransit();

  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const busMarkers = useRef<Map<string, Marker>>(new Map());
  const busMarkerModes = useRef<Map<string, string>>(new Map());
  const stopMarkers = useRef<Marker[]>([]);
  const userMarkerRef = useRef<Marker | null>(null);
  const userMarkerModeRef = useRef<string | null>(null);
  const accuracyCircleRef = useRef<Circle | null>(null);
  const [ready, setReady] = useState(false);

  // "ADIGA" only makes sense while looking at the bus you control, not when a
  // passenger is simply browsing the live map.
  const isDriverContext =
    user?.role === "driver" || view === "driver" || view === "split";
  const gpsLive =
    location.status === "active" &&
    location.lat !== null &&
    location.lng !== null;

  /* init map */
  useEffect(() => {
    let cancelled = false;
    let resizeTimer: number | null = null;
    const element = containerRef.current;
    if (!element) return;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !element) return;

      const map = L.map(element, {
        center: [9.574, 44.062],
        zoom: 14,
        zoomControl: false,
        attributionControl: true,
        preferCanvas: false,
        zoomSnap: 0.5,
        wheelPxPerZoomLevel: 90,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        subdomains: "abcd",
        maxZoom: 20,
        detectRetina: true,
        attribution:
          '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
      }).addTo(map);

      const latlngs = STOPS.map((stop) => [stop.lat, stop.lng] as [number, number]);

      // A dark road casing, a soft emerald glow, then a moving dotted centre
      // line. Together they read as a live route instead of a flat polyline.
      L.polyline(latlngs, {
        color: "#04120f",
        weight: 16,
        opacity: 0.92,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      L.polyline(latlngs, {
        color: "#34e0a1",
        weight: 9,
        opacity: 0.13,
        lineCap: "round",
        lineJoin: "round",
      }).addTo(map);

      L.polyline(latlngs, {
        color: "#9ffbdc",
        weight: 2.4,
        opacity: 0.95,
        dashArray: "3 14",
        lineCap: "round",
        className: "route-flow",
      }).addTo(map);

      // No animation on the initial fit: a fast view switch can unmount the map
      // before Leaflet's zoom transition ends.
      map.fitBounds(L.latLngBounds(latlngs), { padding: [46, 46], animate: false });
      map.setMinZoom(12);
      mapRef.current = map;
      leafletRef.current = L;

      resizeTimer = window.setTimeout(() => {
        if (!cancelled && mapRef.current === map) map.invalidateSize();
      }, 180);
      setReady(true);
    })();

    return () => {
      cancelled = true;
      if (resizeTimer !== null) window.clearTimeout(resizeTimer);
      busMarkers.current.clear();
      busMarkerModes.current.clear();
      stopMarkers.current = [];
      userMarkerRef.current = null;
      userMarkerModeRef.current = null;
      accuracyCircleRef.current = null;
      // Stop any running pan/fly animation before tearing the map down.
      mapRef.current?.stop();
      mapRef.current?.remove();
      mapRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  /* stop markers */
  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    stopMarkers.current.forEach((marker) => map.removeLayer(marker));
    stopMarkers.current = [];

    STOPS.forEach((stop, index) => {
      const count = waitCounts[stop.id]?.total ?? 0;
      const active = stop.id === passengerStopId;
      const terminal = index === 0 || index === STOPS.length - 1;
      const icon = L.divIcon({
        className: "stop-div-icon",
        html: stopMarkerHtml(active, count, terminal),
        iconSize: [26, 26],
        iconAnchor: [13, 13],
      });

      const marker = L.marker([stop.lat, stop.lng], { icon, riseOnHover: true }).addTo(map);

      if (terminal) {
        marker.bindTooltip(stop.short, {
          permanent: true,
          direction: index === 0 ? "left" : "right",
          offset: [index === 0 ? -14 : 14, 0],
          className: "hga-terminal",
        });
      } else {
        marker.bindTooltip(stop.name, {
          direction: "top",
          offset: [0, -10],
          className: "hga-tooltip",
        });
      }

      marker.on("click", () => setPassengerStopId(stop.id));
      stopMarkers.current.push(marker);
    });
  }, [ready, waitCounts, passengerStopId, setPassengerStopId]);

  /* bus markers */
  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    for (const bus of buses) {
      const isMe = isDriverContext && bus.id === myBus.id;
      const existing = busMarkers.current.get(bus.id);
      const mode = `${isMe ? "me" : "other"}-${bus.direction}`;

      if (!bus.online) {
        if (existing) {
          map.removeLayer(existing);
          busMarkers.current.delete(bus.id);
          busMarkerModes.current.delete(bus.id);
        }
        continue;
      }

      if (existing) {
        existing.setLatLng([bus.lat, bus.lng]);
        // Replacing the icon restarts the pulse animation, so only do it when
        // the visual mode (my bus / direction) actually changes.
        if (busMarkerModes.current.get(bus.id) !== mode) {
          existing.setIcon(
            L.divIcon({
              className: "bus-div-icon",
              html: busMarkerHtml(bus, isMe),
              iconSize: [64, 64],
              iconAnchor: [32, 32],
              popupAnchor: [0, -24],
            }),
          );
          busMarkerModes.current.set(bus.id, mode);
        }
        existing.setPopupContent(busPopupHtml(bus, isMe));
      } else {
        const icon = L.divIcon({
          className: "bus-div-icon",
          html: busMarkerHtml(bus, isMe),
          iconSize: [64, 64],
          iconAnchor: [32, 32],
          popupAnchor: [0, -24],
        });
        const marker = L.marker([bus.lat, bus.lng], { icon, riseOnHover: true }).addTo(map);
        marker.bindPopup(busPopupHtml(bus, isMe), {
          closeButton: false,
          offset: [0, -6],
        });
        busMarkers.current.set(bus.id, marker);
        busMarkerModes.current.set(bus.id, mode);
      }
    }
  }, [ready, buses, myBus.id, isDriverContext]);

  /* device GPS marker + accuracy ring */
  useEffect(() => {
    if (!ready) return;
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map) return;

    if (!gpsLive || location.lat === null || location.lng === null) {
      if (userMarkerRef.current) {
        map.removeLayer(userMarkerRef.current);
        userMarkerRef.current = null;
        userMarkerModeRef.current = null;
      }
      if (accuracyCircleRef.current) {
        map.removeLayer(accuracyCircleRef.current);
        accuracyCircleRef.current = null;
      }
      return;
    }

    const point: [number, number] = [location.lat, location.lng];
    const mode = isDriverContext ? "gps" : "me";

    if (userMarkerRef.current) {
      userMarkerRef.current.setLatLng(point);
      if (userMarkerModeRef.current !== mode) {
        userMarkerRef.current.setIcon(
          L.divIcon({
            className: "user-div-icon",
            html: userMarkerHtml(isDriverContext ? "GPS" : "ADIGA"),
            iconSize: [40, 40],
            iconAnchor: [20, 20],
          }),
        );
        userMarkerModeRef.current = mode;
      }
    } else {
      const marker = L.marker(point, {
        icon: L.divIcon({
          className: "user-div-icon",
          html: userMarkerHtml(isDriverContext ? "GPS" : "ADIGA"),
          iconSize: [40, 40],
          iconAnchor: [20, 20],
        }),
        zIndexOffset: 500,
      }).addTo(map);
      marker.bindTooltip(isDriverContext ? "GPS-kaaga" : "Goobtaada", {
        direction: "top",
        offset: [0, -14],
        className: "hga-tooltip",
      });
      userMarkerRef.current = marker;
      userMarkerModeRef.current = mode;
    }

    // A huge accuracy radius (common indoors) would cover the whole map, so it
    // is capped visually while the numeric accuracy stays truthful in the UI.
    const radius = Math.min(Math.max(location.accuracy ?? 0, 8), 2000);
    if (accuracyCircleRef.current) {
      accuracyCircleRef.current.setLatLng(point);
      accuracyCircleRef.current.setRadius(radius);
    } else {
      accuracyCircleRef.current = L.circle(point, {
        radius,
        color: "#4cd7f6",
        weight: 1,
        opacity: 0.35,
        fillColor: "#4cd7f6",
        fillOpacity: 0.07,
        className: "user-accuracy",
        interactive: false,
      }).addTo(map);
    }
  }, [ready, gpsLive, location.lat, location.lng, location.accuracy, isDriverContext]);

  const recenter = () => {
    const map = mapRef.current;
    if (!map) return;
    const bounds = STOPS.map((stop) => [stop.lat, stop.lng] as [number, number]);
    map.flyToBounds(bounds, { padding: [50, 50], duration: 0.7 });
  };

  const showMe = () => {
    const map = mapRef.current;
    if (!map) return;
    if (gpsLive && location.lat !== null && location.lng !== null) {
      map.flyTo([location.lat, location.lng], Math.max(map.getZoom(), 15), {
        duration: 0.9,
      });
      return;
    }
    requestLocation();
    if (location.status === "denied") {
      notify("Fasax GPS-ka browser-ka, kadibna isku day mar kale.", "info");
    } else {
      notify("GPS-ka ayaa la raadinaya… Ogolow fasaxa browser-ka.", "info");
    }
  };

  const gpsChip =
    location.status === "active"
      ? `±${Math.round(location.accuracy ?? 0)} m`
      : location.status === "requesting"
        ? "GPS…"
        : location.status === "denied"
          ? "GPS off"
          : "GPS";

  const gpsFar =
    gpsLive &&
    nearestUserStop !== null &&
    nearestUserStop.meters > GPS_ROUTE_RADIUS;

  return (
    <div className="map-shell">
      <div ref={containerRef} className="map-canvas" />

      {!ready && (
        <div className="map-loading" aria-live="polite">
          <span className="map-spinner" />
          <span>Khariidadda ayaa soo baxaysa…</span>
        </div>
      )}

      <div className="map-overlay">
        <div className="map-top">
          <div className="map-brand">
            <span className="map-brand-icon">
              <Icon name="route" size={15} />
            </span>
            <span className="map-brand-copy">
              <b>Khariidadda tooska ah</b>
              <span>{ROUTE_NAME}</span>
            </span>
          </div>

          <div className="map-chips">
            <span className="glass-pill">
              <span className="live-dot" />
              {onlineCount} bas
            </span>
            <span
              className={`glass-pill gps-chip ${
                gpsLive ? "is-live" : location.status === "denied" ? "is-off" : ""
              }`}
              title={gpsFar ? "GPS-kaagu wuu ka fog yahay wadada" : "Goobta GPS"}
            >
              <Icon name="navigation" size={12} />
              {gpsChip}
            </span>
          </div>
        </div>

        <div className="map-bottom">
          <div className="map-legend">
            <span>
              <i className="legend-dot bg-emerald" /> Bas
            </span>
            <span>
              <i className="legend-dot bg-sky" /> Goob
            </span>
            <span>
              <i className="legend-line" /> Wadada
            </span>
          </div>
          <div className="map-tools">
            <button
              type="button"
              className={`map-tool ${gpsLive ? "is-on" : ""}`}
              onClick={showMe}
              title="I tus goobtaada"
              aria-label="I tus goobtaada"
            >
              <Icon name="locate" size={18} />
            </button>
            <button
              type="button"
              className="map-tool"
              onClick={recenter}
              title="Ku noqo wadada"
              aria-label="Ku noqo wadada"
            >
              <Icon name="route" size={18} />
            </button>
            <button
              type="button"
              className="map-tool"
              onClick={() => mapRef.current?.zoomIn()}
              title="U dhowee"
              aria-label="U dhowee khariidadda"
            >
              <Icon name="plus" size={18} />
            </button>
            <button
              type="button"
              className="map-tool"
              onClick={() => mapRef.current?.zoomOut()}
              title="Fogee"
              aria-label="Fogee khariidadda"
            >
              <Icon name="minus" size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
