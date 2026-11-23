"use client";

import { useEffect, useState } from "react";

interface StatusResponse {
  mode: string;
  provider: { type: string; label: string } | null;
  probe: { ok: boolean; detail: string | null };
  warning: string | null;
}

export function ProviderStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);

  useEffect(() => {
    fetch("/api/llm/status")
      .then((res) => (res.ok ? res.json() : "noauth" as const))
      .then((data) => setStatus(data === "noauth" ? null : data))
      .catch(() => setStatus(null));
  }, []);

  if (status === null && typeof window !== "undefined" && window.location.pathname === "/login") {
    return null;
  }

  if (!status) {
    return (
      <span className="rounded-full bg-stone-200 px-3 py-1 text-xs text-stone-500">
        IA: comprobando…
      </span>
    );
  }

  if (!status.provider) {
    return (
      <span
        className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-800"
        title={status.warning ?? "Sin servicio de IA"}
      >
        IA: no configurada
      </span>
    );
  }

  return (
    <span
      className={`rounded-full px-3 py-1 text-xs font-medium ${
        status.probe.ok
          ? "bg-emerald-100 text-emerald-800"
          : "bg-amber-100 text-amber-800"
      }`}
      title={status.probe.detail ?? `Modo ${status.mode}`}
    >
      IA: {status.provider.label}
      {!status.probe.ok && " (sonda falla)"}
    </span>
  );
}

export function useProviderStatus() {
  const [status, setStatus] = useState<StatusResponse | null>(null);
  useEffect(() => {
    fetch("/api/llm/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, []);
  return status;
}
