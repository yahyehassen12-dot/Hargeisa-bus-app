export const APP_NAME = "HargeisaBus";
export const ROUTE_LABEL = "Jigjiga-Yar ⇄ Saldhiga Dhexe";
export const ROUTE_NAME = "Wadada: Wadnaha & 150-ka";

export const STORAGE = {
  user: "hga_bus_user_v2",
  admin: "hga_admin_v2",
} as const;

/**
 * Awoodda "Tijaabi Labadaba" waa mid qarsoon.
 * Si aad u furto: riix logo-ga 5 jeer, ama Ctrl + Shift + B,
 * ama fur ?admin=1, kadib geli koodhka hoose.
 *
 * Halkan ka beddel koodhka sirta ah.
 */
export const ADMIN_PASSCODES = ["2026", "hargeisa2026"];
export const LOGO_TAPS_TO_UNLOCK = 5;

/**
 * GPS positions further than this from the route are shown as a warning instead
 * of being snapped onto the road (e.g. somebody testing the demo from abroad).
 */
export const GPS_ROUTE_RADIUS = 12000;
