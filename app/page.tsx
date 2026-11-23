"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { useProviderStatus } from "@/components/provider-status";

const EXAMPLE = "Añade una página de contacto a la web";

export default function HomePage() {
  const router = useRouter();
  const provider = useProviderStatus();
  const [request, setRequest] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const noProvider = provider !== null && provider.provider === null;

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setActiveRunId(null);
    try {
      const res = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ request }),
      });
      const data = await res.json();
      if (res.status === 409) {
        setError(data.error);
        setActiveRunId(data.activeRunId ?? null);
        return;
      }
      if (!res.ok) {
        setError(data.error ?? "No se pudo crear la ejecución.");
        return;
      }
      router.push(`/ejecucion/${data.id}`);
    } catch {
      setError("Error de conexión. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-2 text-2xl font-bold">¿Qué quieres cambiar en la web?</h1>
      <p className="mb-4 text-stone-600">
        El <strong>Orquestador</strong> dividirá tu petición en tareas,{" "}
        <strong>Develop</strong> las hará sobre la web de ejemplo y{" "}
        <strong>Testing</strong> las revisará hasta que todo pase.
      </p>

      {noProvider && (
        <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">No hay servicio de IA configurado.</p>
          <p className="mt-1">{provider.warning}</p>
          <p className="mt-1">
            En local: instala Ollama y arráncalo (<code>ollama serve</code>).
            En producción: define <code>LLM_API_BASE_URL</code>,{" "}
            <code>LLM_API_MODEL</code> y <code>LLM_API_KEY</code>.
          </p>
        </div>
      )}

      <form onSubmit={onSubmit} className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm">
        <textarea
          value={request}
          onChange={(e) => setRequest(e.target.value)}
          placeholder={EXAMPLE}
          rows={3}
          className="w-full rounded border border-stone-300 px-3 py-2"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setRequest(EXAMPLE)}
            className="text-sm text-stone-500 underline hover:text-stone-700"
          >
            Usar ejemplo
          </button>
          <button
            type="submit"
            disabled={loading || noProvider || request.trim().length < 5}
            className="rounded bg-stone-800 px-4 py-2 font-medium text-white hover:bg-stone-700 disabled:opacity-50"
          >
            {loading ? "Creando…" : "Lanzar equipo de agentes"}
          </button>
        </div>
      </form>

      {error && (
        <div className="mt-4 rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-800">
          <p>{error}</p>
          {activeRunId && (
            <button
              onClick={() => router.push(`/ejecucion/${activeRunId}`)}
              className="mt-2 font-medium underline"
            >
              Ver la ejecución en curso
            </button>
          )}
        </div>
      )}
    </div>
  );
}
