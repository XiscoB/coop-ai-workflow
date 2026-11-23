import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { ProviderStatus } from "@/components/provider-status";

export const metadata: Metadata = {
  title: "Coop AI Workflow",
  description:
    "Equipo de 3 agentes de IA (Orquestador, Develop, Testing) que trabajan juntos sobre una web de ejemplo.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="es">
      <body className="min-h-screen">
        <header className="border-b border-stone-300 bg-white">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-4 py-3">
            <div className="flex items-baseline gap-4">
              <Link href="/" className="text-lg font-bold">
                Coop AI Workflow
              </Link>
              <nav className="flex gap-3 text-sm text-stone-600">
                <Link href="/" className="hover:text-stone-900">
                  Nueva petición
                </Link>
                <Link href="/historial" className="hover:text-stone-900">
                  Historial
                </Link>
                <Link href="/preview" className="hover:text-stone-900">
                  Web de ejemplo
                </Link>
              </nav>
            </div>
            <ProviderStatus />
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
