"use client";

import { useRef } from "react";
import { Icon } from "./Icon";
import { LOGO_TAPS_TO_UNLOCK, ROUTE_LABEL } from "@/lib/config";
import { useTransit } from "@/lib/store";
import type { ViewMode } from "@/lib/types";

export function Header() {
  const {
    view,
    setView,
    splitUnlocked,
    lockSplit,
    openUnlock,
    user,
    openAuth,
    logout,
  } = useTransit();

  const taps = useRef<number[]>([]);

  const handleLogoClick = () => {
    const now = Date.now();
    taps.current = [...taps.current.filter((time) => now - time < 2400), now];
    if (taps.current.length >= LOGO_TAPS_TO_UNLOCK) {
      taps.current = [];
      openUnlock();
    }
  };

  const tab = (mode: ViewMode, icon: "user" | "bus" | "columns", label: string) => (
    <button
      type="button"
      className={`role-btn ${mode === "split" ? "split-btn" : ""} ${
        view === mode ? "active" : ""
      }`}
      onClick={() => setView(mode)}
      aria-pressed={view === mode}
    >
      <Icon name={icon} size={15} />
      <span>{label}</span>
    </button>
  );

  return (
    <header className="app-header">
      <button
        type="button"
        className="brand"
        onClick={handleLogoClick}
        aria-label="HargeisaBus"
      >
        <span className="brand-badge">
          <Icon name="bus" size={25} strokeWidth={1.9} />
        </span>
        <span className="brand-text">
          <span className="brand-title">
            Hargeisa<span>Bus</span>
          </span>
          <span className="brand-sub">
            <Icon name="swap" size={11} />
            {ROUTE_LABEL}
          </span>
        </span>
      </button>

      <nav className="role-switcher" aria-label="Dooro shaashadda">
        {tab("passenger", "user", "Rakaabka")}
        {tab("driver", "bus", "Dareewalka")}
        {splitUnlocked && tab("split", "columns", "Tijaabi Labadaba")}
      </nav>

      <div className="auth-area">
        {splitUnlocked && (
          <button
            type="button"
            className="btn-icon-ghost"
            onClick={lockSplit}
            title="Qari awoodda tijaabada"
            aria-label="Qari awoodda tijaabada"
          >
            <Icon name="lock" size={16} />
          </button>
        )}

        {user ? (
          <div className="profile-chip">
            <span className="avatar">{user.name.charAt(0).toUpperCase()}</span>
            <span className="profile-meta">
              <span className="profile-name">{user.name}</span>
              <span className="profile-phone">
                <span className={`op-tag op-${user.operator.toLowerCase()}`}>
                  {user.operator}
                </span>
                {user.phone}
              </span>
            </span>
            <button
              type="button"
              className="btn-icon-ghost"
              onClick={logout}
              title="Ka bax"
              aria-label="Ka bax akoonka"
            >
              <Icon name="logout" size={16} />
            </button>
          </div>
        ) : (
          <button type="button" className="btn-login" onClick={() => openAuth()}>
            <Icon name="user" size={16} />
            <span>Is-diiwaangeli / Gal</span>
          </button>
        )}
      </div>
    </header>
  );
}
