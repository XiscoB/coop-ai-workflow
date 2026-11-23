"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { addNotification, isTtsEnabled, speak } from "@/components/notifications";

export interface RunPayload {
  run: {
    id: string;
    request: string;
    status: string;
    step: string;
    cyclesUsed: number;
    maxCycles: number;
    finalReport: string | null;
    errorMessage: string | null;
    providerSnapshot: string | null;
    sandboxSnapshot: Record<string, string> | null;
    revertedAt: string | null;
    createdAt: string;
    finishedAt: string | null;
  };
  tasks: Array<{
    id: string;
    seq: number;
    description: string;
    status: string;
    attempts: number;
    lastFailureReason: string | null;
    resultSummary: string | null;
  }>;
  activities: Array<{
    id: number;
    taskId: string | null;
    agent: string;
    kind: string;
    content: string;
    durationMs: number | null;
    createdAt: string;
  }>;
}

export const TERMINAL_STATUSES = new Set([
  "completed",
  "completed_with_failures",
  "error",
  "rejected",
]);

export interface RunDriver {
  payload: RunPayload | null;
  paused: string | null;
  busyWait: boolean;
  notFound: boolean;
  active: boolean;
  resume: () => Promise<string | null>;
}

/**
 * Conduce una ejecución: carga su estado y, mientras esté activa, dispara
 * `advance` en bucle (research D2). Compartido por la página de detalle y la
 * tarjeta de ejecución activa del dashboard (spec 002, T001).
 */
export function useRunDriver(runId: string): RunDriver {
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [paused, setPaused] = useState<string | null>(null);
  const [busyWait, setBusyWait] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [driveNonce, setDriveNonce] = useState(0);
  const prevStatus = useRef<string | null>(null);

  /** Notifica (campana + TTS) la transición a estado terminal (FR-006). */
  const notifyIfTerminal = useCallback(async (data: RunPayload) => {
    const status = data.run.status;
    const was = prevStatus.current;
    prevStatus.current = status;
    if (
      !TERMINAL_STATUSES.has(status) ||
      was === null ||
      TERMINAL_STATUSES.has(was)
    ) {
      return;
    }
    const titles: Record<string, string> = {
      completed: "Ejecución completada",
      completed_with_failures: "Ejecución completada con fallos",
      error: "Ejecución en error",
      rejected: "Petición rechazada",
    };
    const title = titles[status] ?? "Ejecución terminada";
    const body = `«${data.run.request}»`;
    addNotification({ title, body, runId: data.run.id });
    if (await isTtsEnabled()) {
      speak(`${title}. ${data.run.request}`);
    }
  }, []);

  const load = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}`);
    if (res.status === 404) {
      setNotFound(true);
      return null;
    }
    const data = (await res.json()) as RunPayload;
    setPayload(data);
    prevStatus.current = data.run.status;
    return data;
  }, [runId]);

  useEffect(() => {
    // `cancelled` es local a cada instancia del efecto: al reanudar (nonce)
    // o desmontar, el bucle viejo no puede revivir ni competir por el
    // cerrojo de avance (bug del RUN_BUSY en una sola pestaña).
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function drive() {
      if (cancelled) return;
      const current = await load();
      if (!current || cancelled) return;
      if (TERMINAL_STATUSES.has(current.run.status)) return;

      try {
        const res = await fetch(`/api/runs/${runId}/advance`, { method: "POST" });
        if (cancelled) return;
        const data = await res.json();
        if (res.status === 503) {
          setPaused(data.error ?? "Sin servicio de IA disponible.");
          return;
        }
        if (res.status === 409 && data.code === "RUN_BUSY") {
          // Otra pestaña/proceso está conduciendo la ejecución (FR-006):
          // no es un error — esperamos y reintentamos sin avanzar.
          setBusyWait(true);
          timer = setTimeout(drive, 3000);
          return;
        }
        setBusyWait(false);
        if (res.ok) {
          setPayload(data as RunPayload);
          setPaused(null);
          void notifyIfTerminal(data as RunPayload);
          if (!TERMINAL_STATUSES.has((data as RunPayload).run.status)) {
            timer = setTimeout(drive, 400);
          }
          return;
        }
        setPaused(data.error ?? "Error avanzando la ejecución.");
      } catch {
        if (!cancelled) setPaused("Error de conexión con el servidor.");
      }
    }

    drive();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, runId, driveNonce, notifyIfTerminal]);

  /** Reanuda una ejecución en error y rearranca el driver (spec 003). */
  const resume = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}/resume`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      return (data as { error?: string }).error ?? "No se pudo reanudar.";
    }
    setPaused(null);
    setDriveNonce((nonce) => nonce + 1);
    return null;
  }, [runId]);

  const active = payload !== null && !TERMINAL_STATUSES.has(payload.run.status);
  return { payload, paused, busyWait, notFound, active, resume };
}
