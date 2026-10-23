export type Direction = "to_suuq" | "to_jigjiga";
export type Role = "passenger" | "driver";
export type ViewMode = Role | "split";
export type Operator = "Telesom" | "Somtel" | "Soltelco";

export type GeoStatus =
  | "idle"
  | "requesting"
  | "active"
  | "denied"
  | "unavailable"
  | "timeout"
  | "unsupported"
  | "insecure";

export interface DeviceLocation {
  status: GeoStatus;
  lat: number | null;
  lng: number | null;
  accuracy: number | null;
  heading: number | null;
  speed: number | null;
  updatedAt: number | null;
  error: string | null;
}

export interface Stop {
  id: string;
  name: string;
  short: string;
  lat: number;
  lng: number;
}

export interface Passenger {
  id: string;
  name: string;
  phone: string;
  operator: Operator;
  stopId: string;
  direction: Direction;
  waitingSince: number;
}

export interface Bus {
  id: string;
  name: string;
  plate: string;
  driverName: string;
  driverPhone: string;
  operator: Operator;
  lat: number;
  lng: number;
  /** 0 = Jigjiga-Yar, 1 = Suuqa */
  progress: number;
  direction: Direction;
  freeSeats: number;
  online: boolean;
}

export interface User {
  name: string;
  phone: string;
  operator: Operator;
  role: Role;
  busPlate?: string;
  busName?: string;
}

export interface WaitCount {
  total: number;
  to_suuq: number;
  to_jigjiga: number;
}

export const OPERATOR_PREFIX: Record<Operator, string> = {
  Telesom: "+252 63",
  Somtel: "+252 65",
  Soltelco: "+252 67",
};
