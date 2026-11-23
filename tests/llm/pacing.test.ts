import { describe, expect, it } from "vitest";
import { nextPaceMs } from "@/lib/llm/openai-compatible";

describe("nextPaceMs (ritmo dinámico)", () => {
  it("sin 429: decae a la mitad sin bajar de la base", () => {
    expect(nextPaceMs(40_000, { baseMs: 0 })).toBe(20_000);
    expect(nextPaceMs(40_000, { baseMs: 0 })).not.toBe(0);
    expect(nextPaceMs(10_000, { baseMs: 15_000 })).toBe(15_000);
    expect(nextPaceMs(0, { baseMs: 0 })).toBe(0);
  });

  it("con 429: sube al Retry-After del proveedor (mínimo 20 s)", () => {
    expect(nextPaceMs(0, { retryAfterSeconds: 17.4, baseMs: 0 })).toBe(20_000);
    expect(nextPaceMs(0, { retryAfterSeconds: 30, baseMs: 0 })).toBe(30_000);
  });

  it("429 repetidos escalan ×1,5 hasta el tope de 60 s", () => {
    expect(nextPaceMs(20_000, { retryAfterSeconds: 17, baseMs: 0 })).toBe(
      30_000,
    );
    expect(nextPaceMs(50_000, { retryAfterSeconds: 10, baseMs: 0 })).toBe(
      60_000,
    );
  });

  it("la base configurada no baja el mínimo tras 429", () => {
    expect(nextPaceMs(0, { retryAfterSeconds: 5, baseMs: 45_000 })).toBe(
      45_000,
    );
  });
});
