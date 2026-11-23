"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  notFound: boolean;
  active: boolean;
}

/**
 * Conduce una ejecución: carga su estado y, mientras esté activa, dispara
 * `advance` en bucle (research D2). Compartido por la página de detalle y la
 * tarjeta de ejecución activa del dashboard (spec 002, T001).
 */
export function useRunDriver(runId: string): RunDriver {
  const [payload, setPayload] = useState<RunPayload | null>(null);
  const [paused, setPaused] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const stopped = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/runs/${runId}`);
    if (res.status === 404) {
      setNotFound(true);
      return null;
    }
    const data = (await res.json()) as RunPayload;
    setPayload(data);
    return data;
  }, [runId]);

  useEffect(() => {
    stopped.current = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    async function drive() {
      const current = await load();
      if (!current || stopped.current) return;
      if (TERMINAL_STATUSES.has(current.run.status)) return;

      try {
        const res = await fetch(`/api/runs/${runId}/advance`, { method: "POST" });
        const data = await res.json();
        if (res.status === 503) {
          setPaused(data.error ?? "Sin servicio de IA disponible.");
          return;
        }
        if (res.ok) {
          setPayload(data as RunPayload);
          setPaused(null);
          if (!TERMINAL_STATUSES.has((data as RunPayload).run.status)) {
            timer = setTimeout(drive, 400);
          }
          return;
        }
        setPaused(data.error ?? "Error avanzando la ejecución.");
      } catch {
        setPaused("Error de conexión con el servidor.");
      }
    }

    drive();
    return () => {
      stopped.current = true;
      if (timer) clearTimeout(timer);
    };
  }, [load, runId]);

  const active = payload !== null && !TERMINAL_STATUSES.has(payload.run.status);
  return { payload, paused, notFound, active };
}
