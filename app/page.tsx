"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { PassengerPanel } from "@/components/PassengerPanel";
import { DriverPanel } from "@/components/DriverPanel";
import { MapView } from "@/components/MapView";
import { AuthModal } from "@/components/AuthModal";
import { UnlockModal } from "@/components/UnlockModal";
import { Icon } from "@/components/Icon";
import { useTransit } from "@/lib/store";

export default function Home() {
  const { view, splitUnlocked } = useTransit();
  const [splitTab, setSplitTab] = useState<"passenger" | "driver">("passenger");

  const isSplit = view === "split" && splitUnlocked;

  return (
    <>
      <Header />

      <main className="main">
        <h1 className="sr-only">Hargeisa Bus Transit</h1>

        <div className={`workspace ${isSplit ? "split" : "single"}`}>
          {isSplit && (
            <div className="split-tabs">
              <button
                type="button"
                className={splitTab === "passenger" ? "active" : ""}
                onClick={() => setSplitTab("passenger")}
              >
                <Icon name="user" size={14} />
                Rakaabka
              </button>
              <button
                type="button"
                className={splitTab === "driver" ? "active" : ""}
                onClick={() => setSplitTab("driver")}
              >
                <Icon name="bus" size={14} />
                Dareewalka
              </button>
              <span className="split-tabs-badge">
                <Icon name="columns" size={12} />
                Tijaabi Labadaba
              </span>
            </div>
          )}

          <div
            className={`panel-col split-panel split-left ${
              isSplit && splitTab !== "passenger" ? "mobile-hide" : ""
            }`}
          >
            {isSplit || view !== "driver" ? <PassengerPanel /> : <DriverPanel />}
          </div>

          {isSplit ? (
            <>
              <div className="map-wrap split-map">
                <MapView />
              </div>
              <div
                className={`panel-col split-panel split-right ${
                  splitTab !== "driver" ? "mobile-hide" : ""
                }`}
              >
                <DriverPanel />
              </div>
            </>
          ) : (
            <div className="map-wrap">
              <MapView />
            </div>
          )}
        </div>

        <footer className="app-footer">
          <span className="footer-dot" />
          Hargeisa Bus Transit · React + Next.js · Xogta waa demo
        </footer>
      </main>

      <AuthModal />
      <UnlockModal />
    </>
  );
}
