import { loadSeedFiles } from "./seed";
import type { SeedFile, Store } from "@/lib/store";

export interface SandboxStatus {
  files: number;
  seedFiles: number;
  dirty: boolean;
  modifiedPaths: string[];
}

/**
 * Compara el sandbox actual con la semilla: «limpio» si contiene exactamente
 * los mismos ficheros con el mismo contenido (FR-003 de 002-control-panel).
 */
export function computeSandboxStatus(
  snapshot: Record<string, string>,
  seed: SeedFile[],
): SandboxStatus {
  const seedMap = new Map(seed.map((file) => [file.path, file.content]));
  const modified = new Set<string>();

  for (const [path, content] of Object.entries(snapshot)) {
    if (!seedMap.has(path) || seedMap.get(path) !== content) {
      modified.add(path);
    }
  }
  for (const path of seedMap.keys()) {
    if (!(path in snapshot)) modified.add(path);
  }

  const modifiedPaths = [...modified].sort();
  return {
    files: Object.keys(snapshot).length,
    seedFiles: seed.length,
    dirty: modifiedPaths.length > 0,
    modifiedPaths,
  };
}

export async function getSandboxStatus(store: Store): Promise<SandboxStatus> {
  const [snapshot, seed] = await Promise.all([
    store.sandboxSnapshot(),
    loadSeedFiles(),
  ]);
  return computeSandboxStatus(snapshot, seed);
}
