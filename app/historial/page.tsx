import Link from "next/link";
import { getStore } from "@/lib/db/store";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, { label: string; classes: string }> = {
  pending: { label: "En cola", classes: "bg-stone-200 text-stone-600" },
  running: { label: "En curso", classes: "bg-blue-100 text-blue-800" },
  completed: { label: "Completada", classes: "bg-emerald-100 text-emerald-800" },
  completed_with_failures: {
    label: "Con fallos",
    classes: "bg-amber-100 text-amber-800",
  },
  error: { label: "Error", classes: "bg-red-100 text-red-800" },
  rejected: { label: "Rechazada", classes: "bg-stone-200 text-stone-600" },
};

export default async function HistorialPage() {
  const store = getStore();
  const runs = await store.listRuns(50);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold">Historial de ejecuciones</h1>
      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-stone-500">
          Todavía no hay ejecuciones.{" "}
          <Link href="/" className="underline">
            Lanza la primera petición
          </Link>
          .
        </p>
      ) : (
        <ol className="space-y-3">
          {runs.map((run) => (
            <li key={run.id}>
              <Link
                href={`/ejecucion/${run.id}`}
                className="block rounded-lg border border-stone-300 bg-white p-4 shadow-sm transition hover:border-stone-400"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium">«{run.request}»</p>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_LABEL[run.status]?.classes ?? "bg-stone-200"}`}
                  >
                    {STATUS_LABEL[run.status]?.label ?? run.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {new Date(run.createdAt).toLocaleString("es")}
                  {run.finishedAt &&
                    ` · terminada ${new Date(run.finishedAt).toLocaleString("es")}`}
                </p>
              </Link>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
