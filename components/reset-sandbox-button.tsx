"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function ResetSandboxButton({ onReset }: { onReset: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function reset() {
    if (!confirm("¿Restablecer la web de ejemplo a su estado inicial?")) return;
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/sandbox/reset", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo restablecer.");
        return;
      }
      setMessage(`Web restablecida (${data.files} ficheros).`);
      router.refresh();
      onReset();
    } catch {
      setMessage("Error de conexión.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <span className="inline-flex items-center gap-3">
      <button
        onClick={reset}
        disabled={loading}
        className="rounded border border-stone-300 bg-white px-3 py-1.5 text-sm hover:bg-stone-100 disabled:opacity-50"
      >
        {loading ? "Restableciendo…" : "Restablecer web"}
      </button>
      {message && <span className="text-sm text-stone-600">{message}</span>}
    </span>
  );
}
