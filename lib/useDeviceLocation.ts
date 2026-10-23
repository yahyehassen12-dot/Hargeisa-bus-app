"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DeviceLocation, GeoStatus } from "./types";

const INITIAL: DeviceLocation = {
  status: "idle",
  lat: null,
  lng: null,
  accuracy: null,
  heading: null,
  speed: null,
  updatedAt: null,
  error: null,
};

/** How long we wait before asking the browser for the current position. */
const AUTO_START_DELAY = 900;

function statusForError(code: number): GeoStatus {
  if (code === 1) return "denied";
  if (code === 2) return "unavailable";
  return "timeout";
}

/**
 * Watches the device GPS for as long as the app is open.
 *
 * The browser always asks the person for permission the first time. Once it is
 * granted, every passenger and driver screen reads the same live fix, so nobody
 * has to type an address or pick a stop by hand.
 */
export function useDeviceLocation() {
  const [location, setLocation] = useState<DeviceLocation>(INITIAL);
  const watchRef = useRef<number | null>(null);
  const stoppedRef = useRef(false);

  const stop = useCallback(() => {
    if (watchRef.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchRef.current);
    }
    watchRef.current = null;
  }, []);

  const start = useCallback(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    if (!("geolocation" in navigator)) {
      setLocation((current) => ({
        ...current,
        status: "unsupported",
        error: "Browser-kaagu ma taageero GPS.",
      }));
      return;
    }

    if (!window.isSecureContext) {
      setLocation((current) => ({
        ...current,
        status: "insecure",
        error: "GPS wuxuu u baahan yahay HTTPS ama localhost.",
      }));
      return;
    }

    stop();
    stoppedRef.current = false;
    setLocation((current) => ({
      ...current,
      status: "requesting",
      error: null,
    }));

    watchRef.current = navigator.geolocation.watchPosition(
      (position) => {
        if (stoppedRef.current) return;
        const { latitude, longitude, accuracy, heading, speed } = position.coords;
        setLocation({
          status: "active",
          lat: latitude,
          lng: longitude,
          accuracy: Number.isFinite(accuracy) ? accuracy : null,
          heading: Number.isFinite(heading) ? heading : null,
          speed: Number.isFinite(speed) ? speed : null,
          updatedAt: Date.now(),
          error: null,
        });
      },
      (error) => {
        if (stoppedRef.current) return;
        const status = statusForError(error.code);
        setLocation((current) => ({
          ...current,
          status,
          error: error.message || null,
        }));
        // A blocked permission will never recover by itself; stop the watcher
        // so the browser does not keep firing the same error.
        if (status === "denied") stop();
      },
      {
        enableHighAccuracy: true,
        maximumAge: 4000,
        timeout: 15000,
      },
    );
  }, [stop]);

  /* Ask automatically, but give the page a moment to settle first. */
  useEffect(() => {
    const timer = window.setTimeout(start, AUTO_START_DELAY);
    return () => {
      window.clearTimeout(timer);
      stoppedRef.current = true;
      stop();
    };
  }, [start, stop]);

  return { location, requestLocation: start };
}
