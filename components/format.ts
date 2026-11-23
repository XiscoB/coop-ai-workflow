/** Formateadores de fecha/hora para la UI (spec 004). */

function sameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isYesterday(date: Date, now: Date): boolean {
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  return sameDay(date, yesterday);
}

/**
 * Hora exacta para el timeline multi-día: hoy → HH:MM:SS; ayer →
 * «ayer HH:MM:SS»; otro día → «dd MMM, HH:MM:SS».
 */
export function formatEventTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  if (sameDay(date, now)) return time;
  if (isYesterday(date, now)) return `ayer ${time}`;
  return `${date.toLocaleDateString("es", { day: "2-digit", month: "short" })}, ${time}`;
}

/** Fecha + hora corta para listados («23 nov, 13:42»; hoy solo la hora). */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const time = date.toLocaleTimeString("es", {
    hour: "2-digit",
    minute: "2-digit",
  });
  if (sameDay(date, now)) return `hoy, ${time}`;
  if (isYesterday(date, now)) return `ayer, ${time}`;
  return `${date.toLocaleDateString("es", { day: "2-digit", month: "short" })}, ${time}`;
}
