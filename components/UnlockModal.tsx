"use client";

import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { Icon } from "./Icon";
import { useTransit } from "@/lib/store";

export function UnlockModal() {
  const { unlockOpen, closeUnlock, tryUnlock } = useTransit();
  const [code, setCode] = useState("");
  const [show, setShow] = useState(false);
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  useEffect(() => {
    if (!unlockOpen) return;
    setCode("");
    setError("");
    setShow(false);
    setShake(false);
  }, [unlockOpen]);

  useEffect(() => {
    if (!unlockOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeUnlock();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [unlockOpen, closeUnlock]);

  if (!unlockOpen) return null;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (tryUnlock(code)) return;
    setError("Koodhka sirta ahi waa khalad.");
    setShake(true);
    window.setTimeout(() => setShake(false), 450);
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Gelitaan gaar ah"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeUnlock();
      }}
    >
      <form
        className={`modal unlock-modal ${shake ? "shake" : ""}`}
        onSubmit={submit}
      >
        <div className="modal-head">
          <span className="unlock-badge">
            <Icon name="shield" size={24} />
          </span>
          <button
            type="button"
            className="btn-icon-ghost"
            onClick={closeUnlock}
            aria-label="Xir"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        <div className="unlock-body">
          <h3 className="modal-title">Gelitaan gaar ah</h3>
          <p className="modal-sub">
            Awooddan waxaa isticmaali kara kaliya maamulaha. Geli koodhka sirta ah
            si aad u furto shaashadda tijaabada.
          </p>

          <label className="unlock-field">
            <Icon name="key" size={16} className="unlock-field-icon" />
            <input
              type={show ? "text" : "password"}
              value={code}
              onChange={(event) => {
                setCode(event.target.value);
                setError("");
              }}
              placeholder="Koodhka sirta ah"
              autoFocus
              autoComplete="off"
              aria-label="Koodhka sirta ah"
            />
            <button
              type="button"
              className="unlock-eye"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Qari koodhka" : "Muuji koodhka"}
            >
              <Icon name={show ? "eyeOff" : "eye"} size={16} />
            </button>
          </label>

          {error && (
            <div className="form-error">
              <Icon name="alertCircle" size={14} />
              {error}
            </div>
          )}

          <button type="submit" className="btn-primary">
            <Icon name="unlock" size={16} />
            Fur awoodda
          </button>

          <p className="unlock-note">
            <Icon name="lock" size={11} />
            Awooddan waxay ku qarsoon tahay isticmaalayaasha caadiga ah.
          </p>
        </div>
      </form>
    </div>
  );
}
