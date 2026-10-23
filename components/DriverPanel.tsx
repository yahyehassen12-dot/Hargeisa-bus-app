"use client";

import { Icon } from "./Icon";
import { cleanPhone } from "@/lib/data";
import { useTransit } from "@/lib/store";
import type { Direction } from "@/lib/types";

const directionLabel = (direction: Direction) =>
  direction === "to_suuq" ? "Suuqa (Saldhiga)" : "Jigjiga-Yar";

function gpsNote({
  isDriver,
  driverGps,
  driverGpsActive,
  driverGpsOffRoute,
  status,
}: {
  isDriver: boolean;
  driverGps: boolean;
  driverGpsActive: boolean;
  driverGpsOffRoute: boolean;
  status: string;
}) {
  if (!isDriver) {
    return "Diiwaangeli akoonka dareewalka, kadibna GPS-kaaga si otomaatig ah ayuu baska u wadi doonaa.";
  }
  if (!driverGps) {
    return "Daar GPS-ka baska si baskaagu u raaco taleefankaaga.";
  }
  if (driverGpsActive) {
    return "GPS-kaaga ayaa baska wada. Tijaabada socodka si otomaatig ah ayaa loo joojiyay.";
  }
  if (driverGpsOffRoute) {
    return "GPS-kaagu aad buu uga fog yahay wadada Hargeisa, sidaas darteed baska demo-ga ayaa soconaya.";
  }
  switch (status) {
    case "denied":
      return "Fasax GPS lama bixin. Fasax browser-ka kadibna isku day mar kale.";
    case "unavailable":
      return "GPS-kaagu hadda lama heli karo. Hubi in GPS-ku shidan yahay.";
    case "timeout":
      return "GPS-ku waqti buu qaatay. Isku day mar kale.";
    case "insecure":
      return "GPS wuxuu u baahan yahay HTTPS ama localhost.";
    default:
      return "Ogolow fasaxa GPS-ka marka browser-ku ku weydiiyo — baskaaga si otomaatig ah ayaa loo heli doonaa.";
  }
}

export function DriverPanel() {
  const {
    stops,
    myBus,
    user,
    waitings,
    setMyDirection,
    toggleDriverOnline,
    setDriverSeats,
    driverGps,
    toggleDriverGps,
    driverGpsActive,
    driverGpsOffRoute,
    location,
    requestLocation,
    simRunning,
    toggleSim,
    pickup,
    openAuth,
  } = useTransit();

  const headingPassengers = waitings.filter(
    (passenger) => passenger.direction === myBus.direction,
  );
  const totalWaiting = headingPassengers.length;
  const progress = Math.round(myBus.progress * 100);
  const isDriver = user?.role === "driver";
  const gpsLive = location.status === "active";
  const accuracy =
    location.accuracy === null ? 0 : Math.round(location.accuracy);
  const speed =
    location.speed !== null && location.speed >= 0
      ? Math.round(location.speed * 3.6)
      : null;
  const gpsHeadline = !isDriver
    ? "GPS-ka baska waa diyaar"
    : driverGpsActive
      ? "Baska wuxuu raacayaa GPS-kaaga"
      : driverGpsOffRoute
        ? "GPS-kaagu wuu ka fog yahay wadada"
        : driverGps && gpsLive
          ? "GPS waa la helay"
          : driverGps
            ? "GPS-kaaga ayaa la raadinaya…"
            : "GPS-ka baska waa damisan yahay";

  return (
    <section className="panel" aria-label="Shaashadda dareewalka">
      <div className="panel-head">
        <div>
          <span className="panel-kicker amber">
            <Icon name="bus" size={13} />
            Dareewal Mode
          </span>
          <h2 className="panel-title">Shaashadda dareewalka</h2>
          <p className="panel-sub">Maamul baskaaga & rakaabta sugaysa</p>
        </div>
        <div className="online-switch">
          <span className={`online-label ${myBus.online ? "is-on" : ""}`}>
            {myBus.online ? "Shaqo" : "Offline"}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={myBus.online}
            aria-label="Baska online / offline"
            className={`switch ${myBus.online ? "is-on" : ""}`}
            onClick={toggleDriverOnline}
          >
            <span className="switch-knob" />
          </button>
        </div>
      </div>

      <div className="card driver-card">
        <div className="driver-profile">
          <span className="bus-avatar">
            <Icon name="bus" size={22} />
          </span>
          <div className="driver-profile-main">
            <span className="card-eyebrow">Baskaaga</span>
            <h3 className="bus-name sm">{myBus.name}</h3>
            <div className="driver-row">
              <Icon name="user" size={12} />
              <span>{user?.role === "driver" ? user.name : myBus.driverName}</span>
              <span className={`op-tag op-${(user?.role === "driver" ? user.operator : myBus.operator).toLowerCase()}`}>
                {user?.role === "driver" ? user.operator : myBus.operator}
              </span>
            </div>
          </div>
          <span className="plate">{myBus.plate}</span>
        </div>

        {!user && (
          <button
            type="button"
            className="link-btn"
            onClick={() => openAuth("driver")}
          >
            <Icon name="user" size={13} />
            Diiwaangeli magacaaga & baskaaga
          </button>
        )}

        <div className="seats-row">
          <div className="seats-copy">
            <span>Kuraasida bannaan</span>
            <small>Beddel tirada kursi ee diyaar ah</small>
          </div>
          <div className="counter">
            <button
              type="button"
              className="counter-btn"
              onClick={() => setDriverSeats(myBus.freeSeats - 1)}
              disabled={myBus.freeSeats <= 0}
              aria-label="Dhim kursi"
            >
              <Icon name="minus" size={14} />
            </button>
            <span className="counter-value">{myBus.freeSeats}</span>
            <button
              type="button"
              className="counter-btn"
              onClick={() => setDriverSeats(myBus.freeSeats + 1)}
              disabled={myBus.freeSeats >= 14}
              aria-label="Kordhi kursi"
            >
              <Icon name="plus" size={14} />
            </button>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-label">
          <Icon name="compass" size={14} />
          Jihada aad u socoto
        </div>
        <div className="pill-group">
          <button
            type="button"
            className={`pill ${myBus.direction === "to_suuq" ? "active" : ""}`}
            onClick={() => setMyDirection("to_suuq")}
          >
            <Icon name="arrowDown" size={15} />
            Suuqa
          </button>
          <button
            type="button"
            className={`pill ${myBus.direction === "to_jigjiga" ? "active" : ""}`}
            onClick={() => setMyDirection("to_jigjiga")}
          >
            <Icon name="arrowUp" size={15} />
            Jigjiga-Yar
          </button>
        </div>
        <p className="field-hint">
          <Icon name="navigation" size={12} />
          Rakaabta {directionLabel(myBus.direction)} ayaa kuu muuqan doonta
        </p>
      </div>

      <div className={`card gps-card driver-gps ${driverGpsActive ? "is-live" : ""}`}>
        <div className="gps-head">
          <span className={`gps-orb ${driverGps && !gpsLive ? "is-busy" : ""}`}>
            <Icon name="navigation" size={16} />
          </span>
          <div className="gps-copy">
            <span className="card-eyebrow">GPS otomaatig ah</span>
            <b>{gpsHeadline}</b>
          </div>
          {isDriver ? (
            <button
              type="button"
              role="switch"
              aria-checked={driverGps}
              aria-label="GPS-ka baska"
              className={`switch sm ${driverGps ? "is-on" : ""}`}
              onClick={toggleDriverGps}
            >
              <span className="switch-knob" />
            </button>
          ) : (
            <span className="gps-pill">
              <span className="live-dot" />
              GPS
            </span>
          )}
        </div>

        {isDriver && driverGpsActive ? (
          <>
            <div className="gps-metrics">
              <div>
                <span>Jihada</span>
                <b>{directionLabel(myBus.direction)}</b>
              </div>
              <div>
                <span>Xawaaraha</span>
                <b>{speed === null ? "—" : `${speed} km/h`}</b>
              </div>
              <div>
                <span>Saxnaanta</span>
                <b>±{accuracy} m</b>
              </div>
            </div>
            <div className="gps-actions">
              <span className="gps-live-line">
                <span className="live-dot" />
                GPS toos ah · wadada {progress}%
              </span>
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
            <p className="gps-note">
              {gpsNote({ isDriver, driverGps, driverGpsActive, driverGpsOffRoute, status: location.status })}
            </p>
            <div className="gps-actions">
              {isDriver ? (
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
                    : "Cusboonaysii GPS"}
                </button>
              ) : (
                <button
                  type="button"
                  className="gps-btn"
                  onClick={() => openAuth("driver")}
                >
                  <Icon name="user" size={13} />
                  Diiwaangeli dareewal
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <div className="card sim-card">
        <div className="sim-head">
          <div>
            <h3 className="sim-title">
              <Icon name="star" size={15} />
              Tijaabi socodka baska
            </h3>
            <p className="sim-desc">
              {driverGpsActive
                ? "GPS-ka ayaa baska wada — simulation-ka waa la joojiyay"
                : "Baska si toos ah wadada ha u maro"}
            </p>
          </div>
          <button
            type="button"
            className={`sim-btn ${simRunning ? "is-running" : ""}`}
            onClick={toggleSim}
            disabled={driverGpsActive}
            title={
              driverGpsActive
                ? "Dami GPS-ka baska haddii aad rabto simulation-ka"
                : undefined
            }
          >
            <Icon name={simRunning ? "pause" : "play"} size={14} />
            {simRunning ? "Jooji" : "Bilow"}
          </button>
        </div>
        <div className="progress-wrap">
          <span className="progress-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="progress-meta">
          <span>
            <Icon name="mapPin" size={11} />
            {myBus.direction === "to_suuq" ? "Jigjiga-Yar → Suuqa" : "Suuqa → Jigjiga-Yar"}
          </span>
          <b>{progress}%</b>
        </div>
      </div>

      <div className="card queue-card">
        <div className="queue-top">
          <div>
            <h3 className="queue-title">
              <Icon name="users" size={15} />
              Rakaabka sugaya
            </h3>
            <span className="queue-sub">Magacyada & lambarada telefoonka</span>
          </div>
          <span className="badge-count">{totalWaiting} qof</span>
        </div>

        {totalWaiting === 0 ? (
          <div className="queue-empty">
            <Icon name="users" size={22} />
            <b>Ma jiro rakaab sugaya jihadaadan</b>
            <span>Marka rakaab signaalo, halkan ayay ka soo muuqan doonaan.</span>
          </div>
        ) : (
          <div className="queue-list">
            {stops.map((stop, index) => {
              const people = headingPassengers.filter(
                (passenger) => passenger.stopId === stop.id,
              );
              if (people.length === 0) return null;
              return (
                <div className="queue-stop has-waiting" key={stop.id}>
                  <div className="queue-stop-head">
                    <span className="queue-stop-name">
                      <span className="queue-index">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {stop.short}
                    </span>
                    <span className="queue-stop-count">
                      <Icon name="users" size={11} />
                      {people.length}
                    </span>
                    <button
                      type="button"
                      className="pickup-btn"
                      onClick={() => pickup(stop.id)}
                    >
                      <Icon name="check" size={12} />
                      Qaad
                    </button>
                  </div>
                  <div className="queue-people">
                    {people.map((passenger) => (
                      <div className="person-row" key={passenger.id}>
                        <span className="person-avatar">
                          {passenger.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="person-info">
                          <span className="person-name">{passenger.name}</span>
                          <span className="person-phone">
                            <span
                              className={`op-tag op-${passenger.operator.toLowerCase()}`}
                            >
                              {passenger.operator}
                            </span>
                            {passenger.phone}
                          </span>
                        </span>
                        {passenger.phone && (
                          <a
                            className="call-btn"
                            href={`tel:${cleanPhone(passenger.phone)}`}
                          >
                            <Icon name="phone" size={11} />
                            Wac
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
