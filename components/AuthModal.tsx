"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { useTransit } from "@/lib/store";
import { OPERATOR_PREFIX } from "@/lib/types";
import type { Operator, Role } from "@/lib/types";

const OPERATORS: Operator[] = ["Telesom", "Somtel", "Soltelco"];

const OP_CODES: Record<Operator, string> = {
  Telesom: "+252 63",
  Somtel: "+252 65",
  Soltelco: "+252 67",
};

export function AuthModal() {
  const { authOpen, authRole, closeAuth, login } = useTransit();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("passenger");
  const [name, setName] = useState("");
  const [operator, setOperator] = useState<Operator>("Telesom");
  const [digits, setDigits] = useState("");
  const [busPlate, setBusPlate] = useState("");
  const [busName, setBusName] = useState("");
  const [otp, setOtp] = useState(["", "", "", ""]);
  const [generated, setGenerated] = useState("");
  const [error, setError] = useState("");

  const otpRefs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (!authOpen) return;
    setStep(1);
    setRole(authRole);
    setError("");
    setOtp(["", "", "", ""]);
    setGenerated("");
  }, [authOpen, authRole]);

  useEffect(() => {
    if (!authOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeAuth();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [authOpen, closeAuth]);

  if (!authOpen) return null;

  const phone = `${OPERATOR_PREFIX[operator]} ${digits}`;

  const goToOtp = () => {
    setError("");
    if (name.trim().length < 2) {
      setError("Fadlan geli magacaaga oo buuxa.");
      return;
    }
    if (digits.length !== 7) {
      setError("Fadlan geli 7-da lambar ee dambe ee taleefankaaga.");
      return;
    }

    const code = String(Math.floor(1000 + Math.random() * 9000));
    setGenerated(code);
    setOtp(code.split(""));
    setStep(2);
  };

  const verify = () => {
    const entered = otp.join("");
    if (entered !== generated) {
      setError("Koodhka xaqiijintu waa khalad. Fadlan isku day mar kale.");
      return;
    }

    login({
      name: name.trim(),
      phone,
      operator,
      role,
      ...(role === "driver"
        ? {
            busPlate: busPlate.trim() || "HGA-4592",
            busName: busName.trim() || "Caasi 12 (Caddaan)",
          }
        : {}),
    });
  };

  const handleOtpChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, "").slice(-1);
    const next = [...otp];
    next[index] = digit;
    setOtp(next);
    setError("");
    if (digit && index < 3) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKey = (index: number, key: string) => {
    if (key === "Backspace" && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  return (
    <div
      className="modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label="Is-diiwaangeli ama gal"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) closeAuth();
      }}
    >
      <div className="modal auth-modal">
        <div className="modal-head">
          <div>
            <span className="modal-kicker">
              <Icon name="shield" size={13} />
              Amaan & Xaqiijin
            </span>
            <h3 className="modal-title">
              {step === 1 ? "Is-diiwaangeli / Gal" : "Xaqiiji lambarkaaga"}
            </h3>
            <p className="modal-sub">
              {step === 1
                ? "Geli lambarkaaga taleefanka si aad u isticmaasho adeegga."
                : "Waxaan koodh xaqiijin ah u dirnay lambarkaaga."}
            </p>
          </div>
          <button
            type="button"
            className="btn-icon-ghost"
            onClick={closeAuth}
            aria-label="Xir"
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {step === 1 ? (
          <div className="modal-body">
            <div className="field">
              <span className="field-label">Waxaad u gelaysaa sida:</span>
              <div className="role-cards">
                <button
                  type="button"
                  className={`role-card ${role === "passenger" ? "active" : ""}`}
                  onClick={() => setRole("passenger")}
                >
                  <Icon name="user" size={19} />
                  <span className="role-card-title">Rakaab</span>
                  <span className="role-card-sub">Bus raadinaya</span>
                </button>
                <button
                  type="button"
                  className={`role-card ${role === "driver" ? "active" : ""}`}
                  onClick={() => setRole("driver")}
                >
                  <Icon name="bus" size={19} />
                  <span className="role-card-title">Dareewal</span>
                  <span className="role-card-sub">Bus wada</span>
                </button>
              </div>
            </div>

            <label className="field">
              <span className="field-label">Magacaaga oo buuxa</span>
              <input
                className="input"
                type="text"
                value={name}
                onChange={(event) => {
                  setName(event.target.value);
                  setError("");
                }}
                placeholder="Tusaale: Maxamed Cali"
                autoComplete="name"
              />
            </label>

            <div className="field">
              <span className="field-label">Dooro shirkadda isgaadhsiinta</span>
              <div className="operator-grid">
                {OPERATORS.map((op) => (
                  <button
                    type="button"
                    key={op}
                    className={`operator-box op-${op.toLowerCase()} ${
                      operator === op ? "active" : ""
                    }`}
                    onClick={() => setOperator(op)}
                  >
                    <span className="operator-radio">
                      <Icon name="check" size={11} />
                    </span>
                    <span className="operator-name">{op}</span>
                    <span className="operator-code">{OP_CODES[op]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <span className="field-label">Lambarka taleefanka</span>
              <div className="phone-input">
                <span className="phone-prefix">{OPERATOR_PREFIX[operator]}</span>
                <input
                  className="phone-digits"
                  type="tel"
                  inputMode="numeric"
                  value={digits}
                  maxLength={7}
                  aria-label="Lambarka taleefanka"
                  onChange={(event) => {
                    setDigits(event.target.value.replace(/\D/g, "").slice(0, 7));
                    setError("");
                  }}
                  placeholder="4452134"
                  autoComplete="tel-national"
                />
              </div>
              <span className="field-hint">
                Geli 7-da lambar ee dambe (Tusaale: 4452134)
              </span>
            </div>

            {role === "driver" && (
              <div className="driver-extra">
                <label className="field">
                  <span className="field-label">Taargada baska</span>
                  <input
                    className="input"
                    type="text"
                    value={busPlate}
                    onChange={(event) => setBusPlate(event.target.value)}
                    placeholder="Tusaale: HGA-4592"
                  />
                </label>
                <label className="field">
                  <span className="field-label">Magaca / nooca baska</span>
                  <input
                    className="input"
                    type="text"
                    value={busName}
                    onChange={(event) => setBusName(event.target.value)}
                    placeholder="Tusaale: Caasi 12 (Caddaan)"
                  />
                </label>
              </div>
            )}

            {error && (
              <div className="form-error">
                <Icon name="alertCircle" size={14} />
                {error}
              </div>
            )}

            <button type="button" className="btn-primary" onClick={goToOtp}>
              <span>Sii wad — dir koodhka SMS</span>
              <Icon name="arrowRight" size={16} />
            </button>
          </div>
        ) : (
          <div className="modal-body">
            <div className="otp-banner">
              <span className="otp-icon">
                <Icon name="phone" size={21} />
              </span>
              <p>Koodhka xaqiijinta waxaan u dirnay:</p>
              <strong>{phone}</strong>
            </div>

            <div className="sms-bubble">
              <span className="sms-icon">
                <Icon name="info" size={16} />
              </span>
              <div>
                <b>SMS demo ({operator})</b>
                <p>
                  Koodhkaaga xaqiijinta HargeisaBus waa{" "}
                  <span className="sms-code">{generated}</span>
                </p>
              </div>
            </div>

            <div className="field center">
              <span className="field-label">Geli koodhka 4-ta lambar ah</span>
              <div className="otp-grid">
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => {
                      otpRefs.current[index] = element;
                    }}
                    className="otp-digit"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    autoFocus={index === 0}
                    aria-label={`Lambar ${index + 1}`}
                    onChange={(event) => handleOtpChange(index, event.target.value)}
                    onKeyDown={(event) => handleOtpKey(index, event.key)}
                  />
                ))}
              </div>
            </div>

            {error && (
              <div className="form-error">
                <Icon name="alertCircle" size={14} />
                {error}
              </div>
            )}

            <button type="button" className="btn-primary" onClick={verify}>
              <Icon name="badgeCheck" size={16} />
              Xaqiiji & dhammee
            </button>
            <button
              type="button"
              className="btn-link"
              onClick={() => {
                setStep(1);
                setError("");
              }}
            >
              <Icon name="arrowLeft" size={14} />
              Dib ugu noqo lambarka
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
