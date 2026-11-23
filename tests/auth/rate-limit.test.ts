import { describe, expect, it } from "vitest";
import { rateLimit } from "@/lib/rate-limit";

describe("rateLimit", () => {
  it("permite hasta el límite dentro de la ventana y luego bloquea", () => {
    const key = `test:${Math.random()}`;
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000)).toBe(true);
    }
    expect(rateLimit(key, 5, 60_000)).toBe(false);
    expect(rateLimit(key, 5, 60_000)).toBe(false);
  });

  it("reinicia tras la ventana", () => {
    const key = `test:${Math.random()}`;
    expect(rateLimit(key, 1, -1)).toBe(true); // ventana ya expirada
    expect(rateLimit(key, 1, -1)).toBe(true);
  });

  it("claves independientes", () => {
    const a = `test:${Math.random()}`;
    const b = `test:${Math.random()}`;
    expect(rateLimit(a, 1, 60_000)).toBe(true);
    expect(rateLimit(a, 1, 60_000)).toBe(false);
    expect(rateLimit(b, 1, 60_000)).toBe(true);
  });
});
