import type { Metadata, Viewport } from "next";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import { TransitProvider } from "@/lib/store";
import { Toast } from "@/components/Toast";

export const metadata: Metadata = {
  title: "HargeisaBus — Raacdeeyaha Basaska Hargeysa",
  description:
    "Hargeisa Bus Transit — raadi baska kuugu dhow, signaali dareewalka, oo la soco basaska wadada Jigjiga-Yar iyo Saldhiga Dhexe.",
  applicationName: "HargeisaBus",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "HargeisaBus",
  },
};

export const viewport: Viewport = {
  themeColor: "#05080f",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="so">
      <body>
        <div className="app-bg" aria-hidden="true" />
        <TransitProvider>
          {children}
          <Toast />
        </TransitProvider>
      </body>
    </html>
  );
}
