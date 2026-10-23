"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ADMIN_PASSCODES, GPS_ROUTE_RADIUS, STORAGE } from "./config";
import { INITIAL_BUSES, SEED_WAITING, STOPS } from "./data";
import {
  distanceToStop,
  etaMinutes,
  nearestStop,
  pointAt,
  projectOntoRoute,
  type NearestStopResult,
  type RouteProjection,
} from "./geo";
import { useDeviceLocation } from "./useDeviceLocation";
import type {
  Bus,
  DeviceLocation,
  Direction,
  Operator,
  Passenger,
  Role,
  User,
  ViewMode,
  WaitCount,
} from "./types";

export type ToastTone = "success" | "error" | "info";

export interface ToastMessage {
  id: number;
  text: string;
  tone: ToastTone;
}

export interface NearestBus {
  bus: Bus;
  meters: number;
  minutes: number;
}

interface TransitContextValue {
  stops: typeof STOPS;
  buses: Bus[];
  myBus: Bus;
  waitings: Passenger[];
  waitCounts: Record<string, WaitCount>;
  onlineCount: number;

  view: ViewMode;
  setView: (view: ViewMode) => void;

  splitUnlocked: boolean;
  unlockOpen: boolean;
  openUnlock: () => void;
  closeUnlock: () => void;
  tryUnlock: (code: string) => boolean;
  lockSplit: () => void;

  user: User | null;
  authOpen: boolean;
  authRole: Role;
  openAuth: (role?: Role) => void;
  closeAuth: () => void;
  login: (user: User) => void;
  logout: () => void;

  passengerStopId: string;
  setPassengerStopId: (id: string) => void;
  passengerStopAuto: boolean;
  useGpsStop: () => void;
  passengerDirection: Direction;
  setPassengerDirection: (direction: Direction) => void;
  isWaiting: boolean;
  toggleWaiting: () => void;
  nearestBus: NearestBus | null;

  location: DeviceLocation;
  requestLocation: () => void;
  nearestUserStop: NearestStopResult | null;

  setMyDirection: (direction: Direction) => void;
  toggleDriverOnline: () => void;
  setDriverSeats: (seats: number) => void;
  driverGps: boolean;
  toggleDriverGps: () => void;
  driverGpsActive: boolean;
  driverGpsOffRoute: boolean;
  driverProjection: RouteProjection | null;
  simRunning: boolean;
  toggleSim: () => void;
  pickup: (stopId: string) => void;

  toast: ToastMessage | null;
  notify: (text: string, tone?: ToastTone) => void;
  dismissToast: () => void;
}

const TransitContext = createContext<TransitContextValue | null>(null);

const MY_BUS_ID = "bus-01";
const EMPTY_COUNT: WaitCount = { total: 0, to_suuq: 0, to_jigjiga: 0 };

export function TransitProvider({ children }: { children: React.ReactNode }) {
  const [buses, setBuses] = useState<Bus[]>(INITIAL_BUSES);
  const [waitings, setWaitings] = useState<Passenger[]>(SEED_WAITING);
  const [user, setUser] = useState<User | null>(null);
  const [view, setViewState] = useState<ViewMode>("passenger");

  const [splitUnlocked, setSplitUnlocked] = useState(false);
  const [unlockOpen, setUnlockOpen] = useState(false);

  const [authOpen, setAuthOpen] = useState(false);
  const [authRole, setAuthRole] = useState<Role>("passenger");

  const [passengerStopId, setPassengerStopIdState] = useState("150ka");
  const [passengerStopAuto, setPassengerStopAuto] = useState(true);
  const [passengerDirection, setPassengerDirection] = useState<Direction>("to_suuq");
  const [isWaiting, setIsWaiting] = useState(false);

  const [driverGps, setDriverGps] = useState(true);
  const [simRunning, setSimRunning] = useState(false);

  const [toast, setToast] = useState<ToastMessage | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /* ------------------------------------------------------- live GPS */
  const { location, requestLocation } = useDeviceLocation();

  const nearestUserStop = useMemo<NearestStopResult | null>(() => {
    if (location.lat === null || location.lng === null) return null;
    return nearestStop(STOPS, location.lat, location.lng);
  }, [location.lat, location.lng]);

  const driverProjection = useMemo<RouteProjection | null>(() => {
    if (location.lat === null || location.lng === null) return null;
    return projectOntoRoute(STOPS, location.lat, location.lng);
  }, [location.lat, location.lng]);

  const driverGpsActive =
    driverGps &&
    user?.role === "driver" &&
    location.status === "active" &&
    driverProjection !== null &&
    driverProjection.meters <= GPS_ROUTE_RADIUS;

  const driverGpsOffRoute =
    driverGps &&
    user?.role === "driver" &&
    location.status === "active" &&
    driverProjection !== null &&
    driverProjection.meters > GPS_ROUTE_RADIUS;

  const notify = useCallback((text: string, tone: ToastTone = "success") => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast({ id: Date.now(), text, tone });
    toastTimer.current = setTimeout(() => setToast(null), 4200);
  }, []);

  const dismissToast = useCallback(() => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  }, []);

  /* -------------------------------------------------- hydrate */
  useEffect(() => {
    let unlocked = false;
    try {
      const raw = localStorage.getItem(STORAGE.user);
      if (raw) setUser(JSON.parse(raw) as User);
      unlocked = localStorage.getItem(STORAGE.admin) === "1";
      if (unlocked) setSplitUnlocked(true);
    } catch {
      /* ignore */
    }
    try {
      const url = new URL(window.location.href);
      if (!unlocked && url.searchParams.get("admin") === "1") {
        setUnlockOpen(true);
        // Keep the address bar clean so a refresh does not reopen the modal.
        url.searchParams.delete("admin");
        window.history.replaceState({}, "", url.toString());
      }
    } catch {
      /* ignore */
    }
  }, []);

  /* -------------------------------------------- secret shortcut */
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key.toLowerCase() === "b") {
        event.preventDefault();
        setUnlockOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  /* ------------------------------------------------ body scroll */
  useEffect(() => {
    if (!authOpen && !unlockOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [authOpen, unlockOpen]);

  /* --------------------------------------------- moving buses */
  useEffect(() => {
    const timer = setInterval(() => {
      setBuses((prev) =>
        prev.map((bus) => {
          if (!bus.online) return bus;
          // When the driver's phone is feeding the bus position, the simulated
          // movement must not fight the real GPS.
          if (bus.id === MY_BUS_ID && driverGpsActive) return bus;
          const fast = bus.id === MY_BUS_ID && simRunning;
          const step = fast ? 0.035 : bus.id === MY_BUS_ID ? 0.006 : 0.008;
          let direction = bus.direction;
          let progress = bus.progress + (direction === "to_suuq" ? step : -step);

          if (progress >= 1) {
            progress = 1;
            direction = "to_jigjiga";
          } else if (progress <= 0) {
            progress = 0;
            direction = "to_suuq";
          }

          const pos = pointAt(STOPS, progress);
          return { ...bus, progress, direction, lat: pos.lat, lng: pos.lng };
        }),
      );
    }, 2000);
    return () => clearInterval(timer);
  }, [simRunning, driverGpsActive]);

  /* ------------------------------------------- auto passenger stop */
  useEffect(() => {
    if (!passengerStopAuto || !nearestUserStop) return;
    if (nearestUserStop.meters > GPS_ROUTE_RADIUS) return;
    setPassengerStopIdState(nearestUserStop.stop.id);
  }, [passengerStopAuto, nearestUserStop]);

  /* ------------------------------------------------ driver GPS bus */
  useEffect(() => {
    if (!driverGpsActive || !driverProjection) return;
    setBuses((prev) =>
      prev.map((bus) => {
        if (bus.id !== MY_BUS_ID) return bus;
        const delta = driverProjection.progress - bus.progress;
        const direction =
          delta > 0.0008
            ? "to_suuq"
            : delta < -0.0008
              ? "to_jigjiga"
              : bus.direction;
        return {
          ...bus,
          lat: driverProjection.lat,
          lng: driverProjection.lng,
          progress: driverProjection.progress,
          direction,
          online: true,
        };
      }),
    );
  }, [driverGpsActive, driverProjection]);

  /* --------------------------------- driver profile -> my bus */
  useEffect(() => {
    if (!user || user.role !== "driver") return;
    setBuses((prev) =>
      prev.map((bus) =>
        bus.id === MY_BUS_ID
          ? {
              ...bus,
              name: user.busName || bus.name,
              plate: user.busPlate || bus.plate,
              driverName: user.name,
              driverPhone: user.phone,
              operator: user.operator,
            }
          : bus,
      ),
    );
  }, [user]);

  /* ---------------------------------- keep signal on selected stop */
  useEffect(() => {
    if (!isWaiting || !user) return;
    const id = `me-${user.phone}`;
    setWaitings((prev) =>
      prev.map((passenger) =>
        passenger.id === id
          ? { ...passenger, stopId: passengerStopId, direction: passengerDirection }
          : passenger,
      ),
    );
  }, [isWaiting, user, passengerStopId, passengerDirection]);

  /* ------------------------------------------------- split guard */
  useEffect(() => {
    if (view === "split" && !splitUnlocked) setViewState("passenger");
  }, [view, splitUnlocked]);

  const setView = useCallback(
    (next: ViewMode) => {
      if (next === "split" && !splitUnlocked) {
        setUnlockOpen(true);
        return;
      }
      setViewState(next);
    },
    [splitUnlocked],
  );

  /* ------------------------------------------------------ unlock */
  const openUnlock = useCallback(() => setUnlockOpen(true), []);
  const closeUnlock = useCallback(() => setUnlockOpen(false), []);

  const tryUnlock = useCallback(
    (code: string) => {
      const ok = ADMIN_PASSCODES.includes(code.trim().toLowerCase());
      if (!ok) return false;
      setSplitUnlocked(true);
      setUnlockOpen(false);
      setViewState("split");
      try {
        localStorage.setItem(STORAGE.admin, "1");
      } catch {
        /* ignore */
      }
      notify("Awoodda “Tijaabi Labadaba” waa furan tahay");
      return true;
    },
    [notify],
  );

  const lockSplit = useCallback(() => {
    setSplitUnlocked(false);
    setViewState("passenger");
    try {
      localStorage.removeItem(STORAGE.admin);
    } catch {
      /* ignore */
    }
    notify("Awoodda tijaabada waa la qariyay", "info");
  }, [notify]);

  /* -------------------------------------------------------- auth */
  const openAuth = useCallback((role: Role = "passenger") => {
    setAuthRole(role);
    setAuthOpen(true);
  }, []);

  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const login = useCallback(
    (nextUser: User) => {
      setUser(nextUser);
      try {
        localStorage.setItem(STORAGE.user, JSON.stringify(nextUser));
      } catch {
        /* ignore */
      }
      setAuthOpen(false);
      setViewState((current) => (current === "split" ? "split" : nextUser.role));
      notify(`Ku soo dhawoow, ${nextUser.name.split(" ")[0]}!`);
    },
    [notify],
  );

  const logout = useCallback(() => {
    if (user) {
      setWaitings((list) => list.filter((p) => p.id !== `me-${user.phone}`));
    }
    setUser(null);
    setIsWaiting(false);
    // Remove the logged-in driver's identity from the shared demo bus so it
    // does not stay visible after the account is closed.
    const base = INITIAL_BUSES[0];
    setBuses((prev) =>
      prev.map((bus) =>
        bus.id === MY_BUS_ID
          ? {
              ...bus,
              name: base.name,
              plate: base.plate,
              driverName: base.driverName,
              driverPhone: base.driverPhone,
              operator: base.operator,
            }
          : bus,
      ),
    );
    try {
      localStorage.removeItem(STORAGE.user);
    } catch {
      /* ignore */
    }
    notify("Waad ka baxday akoonkaaga", "info");
  }, [user, notify]);

  /* ---------------------------------------------------- passenger */
  const choosePassengerStop = useCallback((id: string) => {
    // A manual choice wins over the automatic GPS suggestion from now on.
    setPassengerStopAuto(false);
    setPassengerStopIdState(id);
  }, []);

  const useGpsStop = useCallback(() => {
    setPassengerStopAuto(true);
    if (nearestUserStop) {
      setPassengerStopIdState(nearestUserStop.stop.id);
    } else {
      requestLocation();
    }
  }, [nearestUserStop, requestLocation]);

  const toggleWaiting = useCallback(() => {
    if (!user) {
      openAuth("passenger");
      notify("Fadlan is-diiwaangeli si dareewalku kuu arko", "info");
      return;
    }

    const id = `me-${user.phone}`;

    if (isWaiting) {
      setWaitings((prev) => prev.filter((p) => p.id !== id));
      setIsWaiting(false);
      notify("Signaalka waa la joojiyay. Mar kale riix markaad diyaar tahay.", "info");
      return;
    }

    setWaitings((prev) => [
      ...prev.filter((p) => p.id !== id),
      {
        id,
        name: user.name,
        phone: user.phone,
        operator: user.operator,
        stopId: passengerStopId,
        direction: passengerDirection,
        waitingSince: Date.now(),
      },
    ]);
    setIsWaiting(true);
    notify("Dareewalka waa la wargeliyay — baska ayaa ku soo socda!");
  }, [user, isWaiting, passengerStopId, passengerDirection, openAuth, notify]);

  /* ------------------------------------------------------- driver */
  const setMyDirection = useCallback((direction: Direction) => {
    setBuses((prev) =>
      prev.map((bus) =>
        bus.id === MY_BUS_ID ? { ...bus, direction, online: true } : bus,
      ),
    );
  }, []);

  const toggleDriverGps = useCallback(() => {
    setDriverGps((enabled) => {
      if (!enabled) requestLocation();
      return !enabled;
    });
  }, [requestLocation]);

  const toggleDriverOnline = useCallback(() => {
    setBuses((prev) =>
      prev.map((bus) =>
        bus.id === MY_BUS_ID ? { ...bus, online: !bus.online } : bus,
      ),
    );
  }, []);

  const setDriverSeats = useCallback((seats: number) => {
    const clamped = Math.max(0, Math.min(14, seats));
    setBuses((prev) =>
      prev.map((bus) =>
        bus.id === MY_BUS_ID ? { ...bus, freeSeats: clamped } : bus,
      ),
    );
  }, []);

  const toggleSim = useCallback(() => {
    setSimRunning((running) => !running);
    setBuses((prev) =>
      prev.map((bus) => (bus.id === MY_BUS_ID ? { ...bus, online: true } : bus)),
    );
  }, []);

  const pickup = useCallback(
    (stopId: string) => {
      const myBus = buses.find((bus) => bus.id === MY_BUS_ID);
      const direction = myBus?.direction ?? "to_suuq";
      const count = waitings.filter(
        (p) => p.stopId === stopId && p.direction === direction,
      ).length;

      if (count === 0) return;
      setWaitings((prev) =>
        prev.filter((p) => !(p.stopId === stopId && p.direction === direction)),
      );
      notify(`${count} rakaab ah ayaa la qaaday — safar wanaagsan!`);
    },
    [buses, waitings, notify],
  );

  /* ------------------------------------------------- derived data */
  const myBus = useMemo(
    () => buses.find((bus) => bus.id === MY_BUS_ID) ?? buses[0],
    [buses],
  );

  const waitCounts = useMemo(() => {
    const counts: Record<string, WaitCount> = {};
    for (const stop of STOPS) counts[stop.id] = { ...EMPTY_COUNT };
    for (const passenger of waitings) {
      const bucket = counts[passenger.stopId];
      if (!bucket) continue;
      bucket.total += 1;
      bucket[passenger.direction] += 1;
    }
    return counts;
  }, [waitings]);

  const nearestBus = useMemo<NearestBus | null>(() => {
    const targetIndex = STOPS.findIndex((stop) => stop.id === passengerStopId);
    if (targetIndex < 0) return null;

    // Only buses travelling in the requested direction can actually pick the
    // passenger up; an opposite-direction bus would give a misleading ETA.
    const pool = buses.filter(
      (bus) => bus.online && bus.direction === passengerDirection,
    );
    if (pool.length === 0) return null;

    let best: NearestBus | null = null;
    for (const bus of pool) {
      const meters = distanceToStop(STOPS, bus.progress, bus.direction, targetIndex);
      if (!best || meters < best.meters) {
        best = { bus, meters, minutes: etaMinutes(meters) };
      }
    }
    return best;
  }, [buses, passengerStopId, passengerDirection]);

  const onlineCount = useMemo(
    () => buses.filter((bus) => bus.online).length,
    [buses],
  );

  const value: TransitContextValue = {
    stops: STOPS,
    buses,
    myBus,
    waitings,
    waitCounts,
    onlineCount,
    view,
    setView,
    splitUnlocked,
    unlockOpen,
    openUnlock,
    closeUnlock,
    tryUnlock,
    lockSplit,
    user,
    authOpen,
    authRole,
    openAuth,
    closeAuth,
    login,
    logout,
    passengerStopId,
    setPassengerStopId: choosePassengerStop,
    passengerStopAuto,
    useGpsStop,
    passengerDirection,
    setPassengerDirection,
    isWaiting,
    toggleWaiting,
    nearestBus,
    location,
    requestLocation,
    nearestUserStop,
    setMyDirection,
    toggleDriverOnline,
    setDriverSeats,
    driverGps,
    toggleDriverGps,
    driverGpsActive,
    driverGpsOffRoute,
    driverProjection,
    simRunning,
    toggleSim,
    pickup,
    toast,
    notify,
    dismissToast,
  };

  return <TransitContext.Provider value={value}>{children}</TransitContext.Provider>;
}

export function useTransit() {
  const context = useContext(TransitContext);
  if (!context) throw new Error("useTransit must be used inside <TransitProvider>");
  return context;
}
