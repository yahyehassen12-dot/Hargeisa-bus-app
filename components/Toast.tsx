"use client";

import { Icon } from "./Icon";
import { useTransit } from "@/lib/store";

export function Toast() {
  const { toast, dismissToast } = useTransit();
  if (!toast) return null;

  const icon = toast.tone === "error" ? "alertCircle" : toast.tone === "info" ? "info" : "check";

  return (
    <button
      type="button"
      key={toast.id}
      className={`toast toast-${toast.tone}`}
      onClick={dismissToast}
      role="status"
      aria-live="polite"
    >
      <span className="toast-icon">
        <Icon name={icon} size={15} />
      </span>
      <span>{toast.text}</span>
    </button>
  );
}
