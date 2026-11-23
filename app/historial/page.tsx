import Link from "next/link";
import { getStore } from "@/lib/db/store";
import { RunStatusBadge } from "@/components/run-badges";

export const dynamic = "force-dynamic";

export default async function HistorialPage() {
  const store = getStore();
  const runs = await store.listRuns(50);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-4 text-2xl font-bold dark:text-stone-100">
        Historial de ejecuciones
      </h1>
      {runs.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-stone-500 dark:border-stone-700 dark:text-stone-400">
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
                className="block rounded-lg border border-stone-300 bg-white p-4 shadow-sm transition hover:border-stone-400 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-stone-500"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium dark:text-stone-100">«{run.request}»</p>
                  <RunStatusBadge status={run.status} />
                </div>
                <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
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
