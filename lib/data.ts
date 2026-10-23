import type { Bus, Passenger, Stop } from "./types";
import { pointAt } from "./geo";

export const STOPS: Stop[] = [
  { id: "jigjiga-yar", name: "Jigjiga-Yar", short: "Jigjiga-Yar", lat: 9.5862, lng: 44.0529 },
  { id: "gahayr", name: "Gahayr", short: "Gahayr", lat: 9.5831, lng: 44.0577 },
  { id: "150ka", name: "150-ka", short: "150-ka", lat: 9.5786, lng: 44.0626 },
  { id: "wadnaha", name: "Wadnaha", short: "Wadnaha", lat: 9.5736, lng: 44.0672 },
  { id: "xero-awr", name: "Xero Awr", short: "Xero Awr", lat: 9.5682, lng: 44.07 },
  { id: "suuqa", name: "Saldhiga Dhexe (Suuqa)", short: "Suuqa", lat: 9.5612, lng: 44.0706 },
];

const busAt = (
  bus: Omit<Bus, "lat" | "lng">,
): Bus => {
  const pos = pointAt(STOPS, bus.progress);
  return { ...bus, lat: pos.lat, lng: pos.lng };
};

export const INITIAL_BUSES: Bus[] = [
  busAt({
    id: "bus-01",
    name: "Caasi 12",
    plate: "HGA-4592",
    driverName: "Xasan Cali",
    driverPhone: "+252 63 4452134",
    operator: "Telesom",
    progress: 0.18,
    direction: "to_suuq",
    freeSeats: 5,
    online: true,
  }),
  busAt({
    id: "bus-02",
    name: "Dhamme 04",
    plate: "HGA-1180",
    driverName: "Cabdirahman Maxamed",
    driverPhone: "+252 65 7719022",
    operator: "Somtel",
    progress: 0.46,
    direction: "to_suuq",
    freeSeats: 9,
    online: true,
  }),
  busAt({
    id: "bus-03",
    name: "Xamar 07",
    plate: "HGA-3021",
    driverName: "Cawil Jaamac",
    driverPhone: "+252 67 3301450",
    operator: "Soltelco",
    progress: 0.78,
    direction: "to_jigjiga",
    freeSeats: 2,
    online: true,
  }),
];

const now = Date.now();

export const SEED_WAITING: Passenger[] = [
  {
    id: "seed-amina",
    name: "Amina Cabdi",
    phone: "+252 63 5510224",
    operator: "Telesom",
    stopId: "150ka",
    direction: "to_suuq",
    waitingSince: now - 1000 * 60 * 3,
  },
  {
    id: "seed-maxamed",
    name: "Maxamed Faarax",
    phone: "+252 65 8820141",
    operator: "Somtel",
    stopId: "wadnaha",
    direction: "to_suuq",
    waitingSince: now - 1000 * 60 * 2,
  },
  {
    id: "seed-hodan",
    name: "Hodan Yuusuf",
    phone: "+252 67 2203398",
    operator: "Soltelco",
    stopId: "150ka",
    direction: "to_jigjiga",
    waitingSince: now - 1000 * 60 * 6,
  },
  {
    id: "seed-cabdillahi",
    name: "Cabdillahi Nuur",
    phone: "+252 63 7702130",
    operator: "Telesom",
    stopId: "suuqa",
    direction: "to_jigjiga",
    waitingSince: now - 1000 * 60 * 1,
  },
];

export const OPERATORS = ["Telesom", "Somtel", "Soltelco"] as const;

export function cleanPhone(phone: string) {
  return phone.replace(/[^\d+]/g, "");
}
