"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { RunStatusBadge } from "@/components/run-badges";

interface RunRow {
  id: string;
  request: string;
  status: string;
  createdAt: string;
  finishedAt: string | null;
}

export function RecentRuns({
  refreshKey,
  onActiveRun,
}: {
  refreshKey?: number;
  onActiveRun?: (runId: string | null) => void;
}) {
  const [runs, setRuns] = useState<RunRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/runs?limit=6");
        if (!res.ok) return;
        const data = (await res.json()) as { runs: RunRow[] };
        if (cancelled) return;
        setRuns(data.runs);
        const active = data.runs.find(
          (run) => run.status === "pending" || run.status === "running",
        );
        onActiveRun?.(active?.id ?? null);
      } catch {
        // sin conexión: mantener lo último mostrado
      }
    }

    load();
    const interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-bold dark:text-stone-100">Últimas ejecuciones</h2>
        <Link
          href="/historial"
          className="text-sm text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Ver todas
        </Link>
      </div>
      {runs.length === 0 ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Todavía no hay ejecuciones: lanza la primera petición.
        </p>
      ) : (
        <ol className="divide-y divide-stone-200 dark:divide-stone-700">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/ejecucion/${run.id}`}
                className="flex items-center justify-between gap-3 py-2 hover:bg-stone-50 dark:hover:bg-stone-800/60"
              >
                <span className="truncate text-sm dark:text-stone-200">
                  «{run.request}»
                </span>
                <RunStatusBadge status={run.status} />
              </Link>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
