import type { Direction, Stop } from "./types";

const R = 6371000;

export function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const dPhi = ((lat2 - lat1) * Math.PI) / 180;
  const dLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dPhi / 2) * Math.sin(dPhi / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLambda / 2) * Math.sin(dLambda / 2);
  return Math.round(R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

/** Distance (metres) from the start of the route to every stop. */
export function cumulativeDistances(stops: Stop[]): number[] {
  const out = [0];
  for (let i = 1; i < stops.length; i++) {
    out.push(out[i - 1] + haversine(stops[i - 1].lat, stops[i - 1].lng, stops[i].lat, stops[i].lng));
  }
  return out;
}

export function totalDistance(stops: Stop[]) {
  const cum = cumulativeDistances(stops);
  return cum[cum.length - 1];
}

export function clamp01(n: number) {
  return Math.min(1, Math.max(0, n));
}

/** Interpolate a position along the route. progress 0 = first stop, 1 = last stop. */
export function pointAt(stops: Stop[], progress: number): { lat: number; lng: number } {
  if (stops.length === 0) return { lat: 0, lng: 0 };
  const p = clamp01(progress);
  const cum = cumulativeDistances(stops);
  const total = cum[cum.length - 1] || 1;
  const d = p * total;

  for (let i = 0; i < stops.length - 1; i++) {
    const segment = cum[i + 1] - cum[i];
    if (d <= cum[i + 1] || i === stops.length - 2) {
      const t = segment > 0 ? Math.min(1, Math.max(0, (d - cum[i]) / segment)) : 0;
      return {
        lat: stops[i].lat + (stops[i + 1].lat - stops[i].lat) * t,
        lng: stops[i].lng + (stops[i + 1].lng - stops[i].lng) * t,
      };
    }
  }
  return { lat: stops[stops.length - 1].lat, lng: stops[stops.length - 1].lng };
}

/**
 * Remaining distance (metres) a bus still has to travel to reach a stop,
 * following the route in its current direction (wraps around at the end).
 */
export function distanceToStop(
  stops: Stop[],
  progress: number,
  direction: Direction,
  stopIndex: number,
) {
  const cum = cumulativeDistances(stops);
  const total = cum[cum.length - 1] || 0;
  const current = clamp01(progress) * total;
  const target = cum[stopIndex] ?? 0;

  // Buses shuttle back and forth: they reverse at each endpoint instead of
  // teleporting to the other end, so a stop that was already passed is reached
  // after travelling to the terminus and back.
  if (direction === "to_suuq") {
    return target >= current ? target - current : total - current + (total - target);
  }
  return target <= current ? current - target : current + target;
}

/** Approximate driving time in minutes (city bus ~20 km/h). */
export function etaMinutes(meters: number) {
  return Math.max(1, Math.round(meters / 340));
}

export interface NearestStopResult {
  stop: Stop;
  index: number;
  meters: number;
}

/** Closest stop to a raw GPS position. */
export function nearestStop(stops: Stop[], lat: number, lng: number): NearestStopResult | null {
  if (stops.length === 0) return null;
  let best: NearestStopResult | null = null;
  for (let index = 0; index < stops.length; index += 1) {
    const stop = stops[index];
    const meters = haversine(lat, lng, stop.lat, stop.lng);
    if (!best || meters < best.meters) best = { stop, index, meters };
  }
  return best;
}

function projectOnSegment(
  lat: number,
  lng: number,
  a: Stop,
  b: Stop,
): { lat: number; lng: number; t: number } {
  // Local equirectangular projection is accurate enough for a few kilometres.
  const scale = Math.cos((a.lat * Math.PI) / 180);
  const ax = a.lng * scale;
  const ay = a.lat;
  const bx = b.lng * scale;
  const by = b.lat;
  const px = lng * scale;
  const py = lat;
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  const t =
    lengthSquared > 0
      ? Math.min(1, Math.max(0, ((px - ax) * dx + (py - ay) * dy) / lengthSquared))
      : 0;
  return {
    lat: a.lat + (b.lat - a.lat) * t,
    lng: a.lng + (b.lng - a.lng) * t,
    t,
  };
}

export interface RouteProjection {
  /** Snapped point on the route. */
  lat: number;
  lng: number;
  /** 0 = Jigjiga-Yar, 1 = Suuqa. */
  progress: number;
  /** How far the raw GPS point is from the route, in metres. */
  meters: number;
}

/**
 * Snap a GPS position onto the nearest point of the route and return how far
 * along the route that point is. Used to turn a driver's phone GPS into the
 * bus position without letting the marker drift off the road.
 */
export function projectOntoRoute(
  stops: Stop[],
  lat: number,
  lng: number,
): RouteProjection | null {
  if (stops.length < 2) return null;
  const cumulative = cumulativeDistances(stops);
  const total = cumulative[cumulative.length - 1] || 1;

  let best: RouteProjection | null = null;
  for (let i = 0; i < stops.length - 1; i += 1) {
    const projected = projectOnSegment(lat, lng, stops[i], stops[i + 1]);
    const meters = haversine(lat, lng, projected.lat, projected.lng);
    const segment = cumulative[i + 1] - cumulative[i];
    const progress =
      (cumulative[i] + projected.t * segment) / total;
    if (!best || meters < best.meters) {
      best = {
        lat: projected.lat,
        lng: projected.lng,
        progress: clamp01(progress),
        meters,
      };
    }
  }
  return best;
}

export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1)} km`;
}
