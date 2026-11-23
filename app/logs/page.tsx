import Link from "next/link";
import { getStore } from "@/lib/db/store";
import { formatEventTime } from "@/components/format";

export const dynamic = "force-dynamic";

export default async function LogsPage() {
  const store = getStore();
  const events = await store.listSystemActivities(100);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-1 text-2xl font-bold dark:text-stone-100">
        Logs del sistema
      </h1>
      <p className="mb-4 text-stone-600 dark:text-stone-400">
        Eventos internos de la app (arranques, finales, errores, reanudaciones),
        del más reciente al más antiguo.
      </p>
      {events.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 p-6 text-stone-500 dark:border-stone-700 dark:text-stone-400">
          Sin eventos todavía.
        </p>
      ) : (
        <ol className="space-y-2">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex flex-wrap items-baseline justify-between gap-2 rounded border border-stone-200 bg-white p-3 text-sm shadow-sm dark:border-stone-700 dark:bg-stone-900"
            >
              <span className="whitespace-pre-wrap text-stone-700 dark:text-stone-300">
                {event.content}
              </span>
              <span className="flex shrink-0 items-baseline gap-3 text-xs text-stone-400 dark:text-stone-500">
                <time dateTime={event.createdAt.toISOString()}>
                  {formatEventTime(event.createdAt.toISOString())}
                </time>
                <Link
                  href={`/ejecucion/${event.runId}`}
                  className="underline hover:text-stone-600 dark:hover:text-stone-300"
                >
                  ejecución
                </Link>
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
