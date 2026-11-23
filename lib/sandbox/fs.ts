import type { Store } from "@/lib/store";

/**
 * Sistema de archivos virtual de la mini-web (research D4): los agentes
 * trabajan sobre la tabla sandbox_files, no sobre el disco.
 */
export function createSandboxFs(store: Store) {
  return {
    list: () => store.sandboxList(),
    read: (path: string) => store.sandboxRead(normalize(path)),
    write: (path: string, content: string, runId: string | null) =>
      store.sandboxWrite(normalize(path), content, runId),
    snapshot: () => store.sandboxSnapshot(),
  };
}

export function normalize(path: string): string {
  const clean = path.trim().replace(/\\/g, "/");
  return clean.startsWith("/") ? clean : `/${clean}`;
}

export type SandboxFs = ReturnType<typeof createSandboxFs>;
