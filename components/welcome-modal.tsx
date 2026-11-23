"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { IMPROVEMENTS, TECH_NOTE } from "@/components/about-content";

const SEEN_KEY = "coopai-welcome-seen";

/**
 * Popup de primera visita (spec 004, FR-008): presenta la app y el roadmap de
 * mejoras. Se muestra una sola vez por navegador (localStorage).
 */
export function WelcomeModal() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      // sin almacenamiento: no molestar
    }
  }, []);

  function close() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      // nada que persistir
    }
    setOpen(false);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Bienvenida"
      onClick={close}
    >
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-xl border border-stone-300 bg-white p-6 shadow-xl dark:border-stone-700 dark:bg-stone-900"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="mb-1 text-xl font-bold dark:text-stone-100">
          Bienvenido a Coop AI Workflow
        </h2>
        <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
          Un equipo de 3 agentes de IA (Orquestador, Developer y Testing) que
          trabaja en vivo sobre una web de ejemplo. Lanza una petición desde el
          panel y mira cómo se reparten el trabajo, con recuperación de errores,
          notificaciones y doble modo de IA (local o API).
        </p>

        <h3 className="mb-2 text-sm font-bold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Roadmap de posibles mejoras
        </h3>
        <ol className="mb-4 list-decimal space-y-1 pl-5 text-sm text-stone-700 dark:text-stone-300">
          {IMPROVEMENTS.map((improvement) => (
            <li key={improvement}>{improvement}</li>
          ))}
        </ol>

        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-900 dark:bg-blue-950/40">
          <p className="mb-1 text-xs font-bold text-blue-900 dark:text-blue-200">
            Nota técnica sobre la demo desplegada
          </p>
          <p className="text-xs text-blue-900 dark:text-blue-200">{TECH_NOTE}</p>
        </div>

        <div className="flex items-center justify-between gap-3">
          <Link
            href="/acerca-de"
            onClick={close}
            className="text-sm text-stone-500 underline hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Más sobre el proyecto
          </Link>
          <button
            onClick={close}
            className="rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
