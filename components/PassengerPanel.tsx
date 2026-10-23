"use client";

import { Icon } from "./Icon";
import { GPS_ROUTE_RADIUS, ROUTE_LABEL } from "@/lib/config";
import { cleanPhone } from "@/lib/data";
import { distanceToStop, formatDistance, etaMinutes } from "@/lib/geo";
import { useTransit } from "@/lib/store";
import type { Direction } from "@/lib/types";

const directionLabel = (direction: Direction) =>
  direction === "to_suuq" ? "Suuqa" : "Jigjiga-Yar";

function gpsHeadline(status: string) {
  switch (status) {
    case "active":
      return "Goobtaada waa la helay";
    case "requesting":
      return "Goobtaada ayaa la raadinaya…";
    case "denied":
      return "Fasax GPS lama bixin";
    case "unavailable":
      return "GPS-kaagu lama heli karo";
    case "timeout":
      return "GPS-ku waqti buu qaatay";
    case "insecure":
      return "GPS wuxuu u baahan yahay HTTPS";
    case "unsupported":
      return "Browser-kaagu ma taageero GPS";
    default:
      return "GPS-kaaga ayaa la furi doonaa";
  }
}

function gpsNote(status: string) {
  switch (status) {
    case "denied":
      return "Fasax GPS-ka browser-ka, kadibna isku day mar kale. Goobta waxaad weli gacan ku dooran kartaa.";
    case "unavailable":
      return "Hubi in GPS-ka taleefankaagu shidan yahay, kadibna isku day mar kale.";
    case "timeout":
      return "Isku day mar kale — goobta ayaa laga yaabaa inay gaabis tahay.";
    case "insecure":
      return "Fur app-ka HTTPS ama localhost si GPS-ku u shaqeeyo.";
    case "unsupported":
      return "Isticmaal browser casri ah sida Chrome ama Safari.";
    default:
      return "Ogolow fasaxa GPS-ka marka browser-ku ku weydiiyo — goobtaada si otomaatig ah ayaa loo heli doonaa.";
  }
}

export function PassengerPanel() {
  const {
    stops,
    buses,
    nearestBus,
    waitCounts,
    passengerStopId,
    setPassengerStopId,
    passengerStopAuto,
    useGpsStop,
    location,
    requestLocation,
    nearestUserStop,
    passengerDirection,
    setPassengerDirection,
    isWaiting,
    toggleWaiting,
    user,
  } = useTransit();

  const gpsLive = location.status === "active" && location.lat !== null;
  const gpsAccuracy =
    location.accuracy === null ? null : Math.round(location.accuracy);

  const currentStop = stops.find((stop) => stop.id === passengerStopId) ?? stops[0];
  const stopIndex = stops.findIndex((stop) => stop.id === currentStop.id);
  const stopWaiting = waitCounts[currentStop.id]?.total ?? 0;
  const hasOnlineBus = buses.some((bus) => bus.online);

  const otherBuses = buses
    .filter((bus) => bus.online && bus.id !== nearestBus?.bus.id)
    .map((bus) => ({
      bus,
      meters: distanceToStop(stops, bus.progress, bus.direction, stopIndex),
    }))
    .sort((a, b) => a.meters - b.meters)
    .slice(0, 3);

  return (
    <section className="panel" aria-label="Shaashadda rakaabka">
      <div className="panel-head">
        <div>
          <span className="panel-kicker">
            <Icon name="user" size={13} />
            Rakaab Mode
          </span>
          <h2 className="panel-title">Raadi baska kuugu dhow</h2>
          <p className="panel-sub">
            {ROUTE_LABEL} · {stops.length} goobo
          </p>
        </div>
        <span className="badge-live">
          <span className="live-dot" />
          Live
        </span>
      </div>

      <div className="card">
        <div className="card-label">
          <Icon name="compass" size={14} />
          Halkee u socotaa?
        </div>
        <div className="pill-group">
          <button
            type="button"
            className={`pill ${passengerDirection === "to_suuq" ? "active" : ""}`}
            onClick={() => setPassengerDirection("to_suuq")}
          >
            <Icon name="arrowDown" size={15} />
            U socda Suuqa
          </button>
          <button
            type="button"
            className={`pill ${passengerDirection === "to_jigjiga" ? "active" : ""}`}
            onClick={() => setPassengerDirection("to_jigjiga")}
          >
            <Icon name="arrowUp" size={15} />
            U socda Jigjiga-Yar
          </button>
        </div>
      </div>

      <div className={`card gps-card ${gpsLive ? "is-live" : ""}`}>
        <div className="gps-head">
          <span className={`gps-orb ${location.status === "requesting" ? "is-busy" : ""}`}>
            <Icon name="navigation" size={16} />
          </span>
          <div className="gps-copy">
            <span className="card-eyebrow">GPS otomaatig ah</span>
            <b>{gpsHeadline(location.status)}</b>
          </div>
          <span className={`gps-pill ${gpsLive ? "is-live" : ""}`}>
            <span className="live-dot" />
            {gpsLive ? `±${gpsAccuracy ?? 0} m` : "GPS"}
          </span>
        </div>

        {gpsLive && nearestUserStop ? (
          <>
            <div className="gps-metrics">
              <div>
                <span>Goobta ugu dhow</span>
                <b>{nearestUserStop.stop.short}</b>
              </div>
              <div>
                <span>Fogaanta</span>
                <b>{formatDistance(nearestUserStop.meters)}</b>
              </div>
              <div>
                <span>Saxnaanta</span>
                <b>±{gpsAccuracy ?? 0} m</b>
              </div>
            </div>

            {nearestUserStop.meters > GPS_ROUTE_RADIUS && (
              <p className="gps-warn">
                <Icon name="alertCircle" size={12} />
                GPS-kaagu aad buu uga fog yahay wadada — goobta si gacan ah u dooro.
              </p>
            )}

            <div className="gps-actions">
              <button
                type="button"
                className={`gps-btn ${passengerStopAuto ? "is-on" : ""}`}
                onClick={useGpsStop}
                disabled={
                  passengerStopAuto || nearestUserStop.meters > GPS_ROUTE_RADIUS
                }
              >
                <Icon name={passengerStopAuto ? "check" : "locate"} size={13} />
                {passengerStopAuto
                  ? "Goobtaada waa la isticmaalayaa"
                  : "Isticmaal goobtaada"}
              </button>
              <button
                type="button"
                className="gps-refresh"
                onClick={requestLocation}
                aria-label="Cusboonaysii GPS"
                title="Cusboonaysii GPS"
              >
                <Icon name="refresh" size={14} />
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="gps-note">{gpsNote(location.status)}</p>
            <div className="gps-actions">
              <button
                type="button"
                className="gps-btn"
                onClick={requestLocation}
                disabled={location.status === "requesting"}
              >
                <Icon
                  name={location.status === "requesting" ? "refresh" : "locate"}
                  size={13}
                />
                {location.status === "requesting"
                  ? "Raadinaya…"
                  : "Isku day GPS"}
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <div className="card-label">
          <Icon name="mapPin" size={14} />
          Halkee wadada ka taagan tahay?
        </div>
        <div className="select-wrap">
          <select
            className="select"
            value={passengerStopId}
            onChange={(event) => setPassengerStopId(event.target.value)}
            aria-label="Dooro goobta"
          >
            {stops.map((stop) => (
              <option key={stop.id} value={stop.id}>
                {stop.name}
              </option>
            ))}
          </select>
          <Icon name="chevronDown" size={16} className="select-chevron" />
        </div>
        <p className="field-hint">
          <Icon name="users" size={12} />
          {stopWaiting > 0
            ? `${stopWaiting} qof ayaa goobtan sugaya`
            : "Qofna hadda kama sugayo goobtan"}
        </p>
      </div>

      <button
        type="button"
        className={`signal-btn ${isWaiting ? "active" : ""}`}
        onClick={toggleWaiting}
      >
        <span className="signal-icon">
          <Icon name={isWaiting ? "badgeCheck" : "hand"} size={23} />
        </span>
        <span className="signal-copy">
          <span className="signal-title">
            {isWaiting ? "BAS BAAN SUGAYAA" : "WADADA AYAAN TAAGANAHAY"}
          </span>
          <span className="signal-sub">
            {isWaiting
              ? "Riix mar kale si aad u baajiso signaalka"
              : "Riix si dareewalku u arko lambarkaaga & goobtaada"}
          </span>
        </span>
        <span className="signal-arrow">
          <Icon name="navigation" size={16} />
        </span>
      </button>

      {isWaiting && user && (
        <div className="callout">
          <Icon name="check" size={15} />
          <span>
            <b>{user.name}</b> — dareewalka ayaa ku arkaya goobta{" "}
            <b>{currentStop.short}</b>. Fadlan sug meesha.
          </span>
        </div>
      )}

      {nearestBus ? (
        <div className="card nearest-card">
          <div className="nearest-top">
            <div>
              <span className="card-eyebrow">Baska kuugu dhow</span>
              <h3 className="bus-name">{nearestBus.bus.name}</h3>
              <div className="driver-row">
                <Icon name="user" size={13} />
                <span>{nearestBus.bus.driverName}</span>
                <span className={`op-tag op-${nearestBus.bus.operator.toLowerCase()}`}>
                  {nearestBus.bus.operator}
                </span>
                {nearestBus.bus.driverPhone && (
                  <a
                    className="call-btn"
                    href={`tel:${cleanPhone(nearestBus.bus.driverPhone)}`}
                  >
                    <Icon name="phone" size={11} />
                    Wac
                  </a>
                )}
              </div>
            </div>
            <span className="plate">{nearestBus.bus.plate}</span>
          </div>

          <div className="stats-grid">
            <div className="stat">
              <Icon name="clock" size={15} className="text-emerald" />
              <span className="stat-label">Waqtiga (ETA)</span>
              <span className="stat-value">{nearestBus.minutes} daqiiqo</span>
            </div>
            <div className="stat">
              <Icon name="road" size={15} className="text-sky" />
              <span className="stat-label">Fogaanta</span>
              <span className="stat-value">{formatDistance(nearestBus.meters)}</span>
            </div>
            <div className="stat">
              <Icon name="seat" size={15} className="text-amber" />
              <span className="stat-label">Kuraas banaan</span>
              <span
                className={`stat-value ${
                  nearestBus.bus.freeSeats <= 2 ? "text-rose" : ""
                }`}
              >
                {nearestBus.bus.freeSeats} kursi
              </span>
            </div>
          </div>

          <div className="nearest-foot">
            <span className="live-line">
              <span className="live-dot" />
              GPS toos ah · {directionLabel(nearestBus.bus.direction)}
            </span>
            <span className="muted-strong">
              {nearestBus.bus.online ? "Wadada ku jira" : "Offline"}
            </span>
          </div>
        </div>
      ) : (
        <div className="card empty-card">
          <Icon name="bus" size={26} />
          <b>
            {hasOnlineBus
              ? "Ma jiro bas hadda u socda jihadaada"
              : "Ma jiro bas online ah hadda"}
          </b>
          <span>
            {hasOnlineBus
              ? "Beddel jihada ama sug wax yar — baska xiga ayaa soo socda."
              : "Fadlan sug wax yar ama dooro goob kale."}
          </span>
        </div>
      )}

      {otherBuses.length > 0 && (
        <div className="card mini-card">
          <div className="card-label">
            <Icon name="layers" size={14} />
            Basaska kale ee wadada
          </div>
          <div className="mini-list">
            {otherBuses.map(({ bus, meters }) => (
              <div className="mini-bus" key={bus.id}>
                <span className="mini-bus-icon">
                  <Icon name="bus" size={14} />
                </span>
                <span className="mini-bus-main">
                  <b>{bus.name}</b>
                  <span>{directionLabel(bus.direction)}</span>
                </span>
                <span className="mini-bus-meta">
                  <b>{etaMinutes(meters)} daq.</b>
                  <span>{formatDistance(meters)}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
