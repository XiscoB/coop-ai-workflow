import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import type { SeedFile, Store } from "@/lib/store";

const SEED_DIR = path.join(process.cwd(), "sandbox");

export async function loadSeedFiles(): Promise<SeedFile[]> {
  const names = await readdir(SEED_DIR);
  const files: SeedFile[] = [];
  for (const name of names.sort()) {
    const content = await readFile(path.join(SEED_DIR, name), "utf-8");
    files.push({ path: `/${name}`, content });
  }
  return files;
}

/** Siembra la mini-web si la tabla está vacía (primer arranque). */
export async function ensureSandboxSeeded(store: Store): Promise<void> {
  if ((await store.sandboxCount()) === 0) {
    await store.sandboxReset(await loadSeedFiles());
  }
}

/** Restablece la mini-web al estado semilla (acción manual, research D9). */
export async function resetSandbox(store: Store): Promise<number> {
  const files = await loadSeedFiles();
  await store.sandboxReset(files);
  return files.length;
}
