import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ProviderStatus } from "@/components/provider-status";
import { ThemeToggle } from "@/components/theme-toggle";

export const metadata: Metadata = {
  title: "Coop AI Workflow",
  description:
    "Equipo de 3 agentes de IA (Orquestador, Develop, Testing) que trabajan juntos sobre una web de ejemplo.",
};

// Aplica el tema antes del primer paint: localStorage manda; si no hay
// preferencia guardada, se respeta la del sistema operativo (FR-005).
const themeScript = `(function(){try{var t=localStorage.getItem("theme");if(t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches)){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-screen">
        <header className="border-b border-stone-300 bg-white dark:border-stone-700 dark:bg-stone-900">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-baseline gap-4">
              <Link href="/" className="text-lg font-bold dark:text-stone-100">
                Coop AI Workflow
              </Link>
              <nav className="flex gap-3 text-sm text-stone-600 dark:text-stone-400">
                <Link href="/" className="hover:text-stone-900 dark:hover:text-stone-100">
                  Panel
                </Link>
                <Link href="/historial" className="hover:text-stone-900 dark:hover:text-stone-100">
                  Historial
                </Link>
                <Link href="/preview" className="hover:text-stone-900 dark:hover:text-stone-100">
                  Web de ejemplo
                </Link>
              </nav>
            </div>
            <div className="flex items-center gap-2">
              <ProviderStatus />
              <ThemeToggle />
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
