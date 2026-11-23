"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  listNotifications,
  markAllRead,
  onNotificationsChange,
  type AppNotification,
} from "@/components/notifications";
import { formatEventTime } from "@/components/format";

export function NotificationBell() {
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setItems(listNotifications());
    return onNotificationsChange(() => setItems(listNotifications()));
  }, []);

  useEffect(() => {
    function onClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const unread = items.filter((item) => !item.read).length;

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) markAllRead();
        }}
        className="relative rounded border border-stone-300 px-2.5 py-1.5 hover:bg-stone-100 dark:border-stone-600 dark:hover:bg-stone-800"
        title="Notificaciones"
        aria-label="Notificaciones"
      >
        <svg
          className="h-4 w-4 text-stone-600 dark:text-stone-300"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        {unread > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-lg border border-stone-300 bg-white shadow-lg dark:border-stone-700 dark:bg-stone-900">
          <p className="border-b border-stone-200 px-3 py-2 text-sm font-bold dark:border-stone-700 dark:text-stone-100">
            Notificaciones
          </p>
          <ol className="max-h-80 overflow-y-auto">
            {items.length === 0 && (
              <li className="px-3 py-4 text-sm text-stone-500 dark:text-stone-400">
                Sin notificaciones todavía.
              </li>
            )}
            {items.map((item) => (
              <li
                key={item.id}
                className="border-b border-stone-100 px-3 py-2 last:border-0 dark:border-stone-800"
              >
                <p className="text-sm font-medium dark:text-stone-100">
                  {item.title}
                </p>
                <p className="text-xs text-stone-600 dark:text-stone-400">
                  {item.body}
                </p>
                <p className="mt-0.5 flex items-center justify-between text-[11px] text-stone-400 dark:text-stone-500">
                  <time dateTime={item.createdAt}>
                    {formatEventTime(item.createdAt)}
                  </time>
                  {item.runId && (
                    <Link
                      href={`/ejecucion/${item.runId}`}
                      className="underline hover:text-stone-600 dark:hover:text-stone-300"
                      onClick={() => setOpen(false)}
                    >
                      ver ejecución
                    </Link>
                  )}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}
