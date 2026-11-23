"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProviderStatus } from "@/components/provider-status";

const EXAMPLE = "Añade una página de contacto a la web";

export function RequestForm({
  onCreated,
  hasActiveRun,
}: {
  onCreated?: (runId: string) => void;
  hasActiveRun?: boolean;
}) {
  const router = useRouter();
  const provider = useProviderStatus();
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const noProvider = provider !== null && provider.provider === null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la ejecución.");
        return;
      }
      setRequest("");
      if (onCreated) onCreated(data.id);
      else router.push(`/ejecucion/${data.id}`);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <h2 className="mb-1 font-bold dark:text-stone-100">Nueva petición</h2>
      <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">
        El <strong>Orquestador</strong> la divide en tareas,{" "}
        <strong>Developer</strong> las ejecuta y <strong>Testing</strong> las
        revisa hasta que todo pasa.
      </p>

      {noProvider && (
        <div className="mb-3 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/60 dark:text-amber-200">
          <p className="font-semibold">No hay servicio de IA configurado.</p>
          <p className="mt-1">{provider.warning}</p>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={EXAMPLE}
          rows={2}
          className="w-full rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
        />
        <div className="mt-2 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRequest(EXAMPLE)}
            className="text-sm text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Usar ejemplo
          </button>
          <button
            type="submit"
            disabled={loading || noProvider || request.trim().length < 5}
            className="rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            {loading ? "Creando…" : "Lanzar equipo de agentes"}
          </button>
        </div>
      </form>

      {error && (
        <p className="mt-3 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
          {error}
        </p>
      )}
    </section>
  );
}
