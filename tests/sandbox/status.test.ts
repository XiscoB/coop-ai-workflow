import { describe, expect, it } from "vitest";
import { computeSandboxStatus } from "@/lib/sandbox/status";

const SEED = [
  { path: "/index.html", content: "<html>inicio</html>" },
  { path: "/styles.css", content: "body {}" },
];

describe("computeSandboxStatus", () => {
  it("limpio cuando es idéntico a la semilla", () => {
    const snapshot = Object.fromEntries(SEED.map((f) => [f.path, f.content]));
    const status = computeSandboxStatus(snapshot, SEED);
    expect(status.dirty).toBe(false);
    expect(status.modifiedPaths).toEqual([]);
    expect(status.files).toBe(2);
  });

  it("marca ficheros modificados, nuevos y borrados", () => {
    const status = computeSandboxStatus(
      {
        "/index.html": "<html>tocado</html>",
        "/contacto.html": "<html>nueva</html>",
      },
      SEED,
    );
    expect(status.dirty).toBe(true);
    expect(status.modifiedPaths).toEqual([
      "/contacto.html",
      "/index.html",
      "/styles.css",
    ]);
  });

  it("un fichero borrado ya ensucia", () => {
    const status = computeSandboxStatus(
      { "/index.html": "<html>inicio</html>" },
      SEED,
    );
    expect(status.dirty).toBe(true);
    expect(status.modifiedPaths).toEqual(["/styles.css"]);
  });
});
