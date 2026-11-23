"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ResetSandboxButton } from "@/components/reset-sandbox-button";

interface SandboxStatus {
  files: number;
  seedFiles: number;
  dirty: boolean;
  modifiedPaths: string[];
}

export function SandboxStatusCard({
  hasActiveRun,
  refreshKey,
}: {
  hasActiveRun: boolean;
  refreshKey?: number;
}) {
  const [status, setStatus] = useState<SandboxStatus | null>(null);

  useEffect(() => {
    fetch("/api/sandbox/status")
      .then((res) => (res.ok ? res.json() : null))
      .then(setStatus)
      .catch(() => setStatus(null));
  }, [refreshKey]);

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="mb-2 font-bold dark:text-stone-100">Web de ejemplo</h2>
      {!status ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Comprobando…</p>
      ) : (
        <>
          <p className="flex items-center gap-2 text-sm">
            {status.dirty ? (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                Con cambios de agentes ({status.modifiedPaths.length})
              </span>
            ) : (
              <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Limpia (estado semilla)
              </span>
            )}
            <span className="text-stone-500 dark:text-stone-400">
              {status.files} ficheros
            </span>
          </p>
          {status.dirty && (
            <p className="mt-1 truncate text-xs text-stone-500 dark:text-stone-400">
              {status.modifiedPaths.join(", ")}
            </p>
          )}
        </>
      )}
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <Link
          href="/preview"
          className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
        >
          Ver la web
        </Link>
        {hasActiveRun ? (
          <span
            className="rounded border border-stone-200 px-3 py-1.5 text-sm text-stone-400 dark:border-stone-700 dark:text-stone-500"
            title="No se puede restablecer con una ejecución en curso"
          >
            Restablecer web
          </span>
        ) : (
          <ResetSandboxButton onReset={() => window.location.reload()} />
        )}
      </div>
    </section>
  );
}
