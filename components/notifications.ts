/**
 * Notificaciones de cliente (spec 004, FR-006): persistidas en localStorage
 * y sincronizadas entre componentes con un evento propio. Sin backend.
 */

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  runId: string | null;
  createdAt: string;
  read: boolean;
}

const STORAGE_KEY = "coopai-notifications";
const EVENT = "coopai-notifications-changed";
const MAX_ITEMS = 50;

function read(): AppNotification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AppNotification[]) : [];
  } catch {
    return [];
  }
}

function write(items: AppNotification[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, MAX_ITEMS)));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    // almacenamiento no disponible: las notificaciones viven solo en memoria
  }
}

export function listNotifications(): AppNotification[] {
  return read();
}

export function addNotification(
  input: Omit<AppNotification, "id" | "createdAt" | "read">,
): void {
  const items = read();
  items.unshift({
    ...input,
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
    read: false,
  });
  write(items);
}

export function markAllRead(): void {
  write(read().map((item) => ({ ...item, read: true })));
}

export function unreadCount(): number {
  return read().filter((item) => !item.read).length;
}

export function onNotificationsChange(callback: () => void): () => void {
  const handler = () => callback();
  window.addEventListener(EVENT, handler);
  window.addEventListener("storage", handler);
  return () => {
    window.removeEventListener(EVENT, handler);
    window.removeEventListener("storage", handler);
  };
}

/** TTS con Web Speech API (gratuita, local al navegador). */
export function speak(text: string): void {
  try {
    if (!("speechSynthesis" in window)) return;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "es-ES";
    utterance.rate = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  } catch {
    // TTS no disponible: silencio
  }
}

let ttsEnabledCache: boolean | null = null;

export async function isTtsEnabled(): Promise<boolean> {
  if (ttsEnabledCache !== null) return ttsEnabledCache;
  try {
    const res = await fetch("/api/config");
    if (!res.ok) return true;
    const data = await res.json();
    ttsEnabledCache = data.settings?.tts_enabled !== false;
    return ttsEnabledCache;
  } catch {
    return true;
  }
}

export function invalidateTtsCache(): void {
  ttsEnabledCache = null;
}
