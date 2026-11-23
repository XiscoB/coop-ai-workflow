import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  completeWithRetries,
  LLMError,
  parseJsonDefensive,
} from "@/lib/llm/complete";
import {
  HttpError,
  OpenAiCompatibleClient,
} from "@/lib/llm/openai-compatible";

describe("parseJsonDefensive", () => {
  it("parsea JSON limpio", () => {
    expect(parseJsonDefensive('{"a": 1}')).toEqual({ a: 1 });
  });

  it("quita fences ```json y ```", () => {
    expect(parseJsonDefensive('```json\n{"a": 1}\n```')).toEqual({ a: 1 });
    expect(parseJsonDefensive('```\n{"a": 2}\n```')).toEqual({ a: 2 });
    expect(parseJsonDefensive('  ```json\n{"a": 3}\n```  ')).toEqual({ a: 3 });
  });

  it("rechaza JSON que no es objeto", () => {
    expect(() => parseJsonDefensive("[1, 2]")).toThrow(LLMError);
    expect(() => parseJsonDefensive('"texto"')).toThrow(LLMError);
    expect(() => parseJsonDefensive("no json")).toThrow();
  });
});

describe("completeWithRetries", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("devuelve el JSON parseado a la primera", async () => {
    const call = vi.fn().mockResolvedValue('{"ok": true}');
    const promise = completeWithRetries(call, { requiredKeys: ["ok"] });
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(call).toHaveBeenCalledTimes(1);
  });

  it("reintenta con backoff tras respuestas inválidas y acaba funcionando", async () => {
    const call = vi
      .fn()
      .mockRejectedValueOnce(new Error("red caída"))
      .mockResolvedValueOnce("no es json")
      .mockResolvedValue('{"ok": true}');
    const promise = completeWithRetries(call, {});
    await vi.runAllTimersAsync();
    await expect(promise).resolves.toEqual({ ok: true });
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("lanza LLMError tras 3 intentos", async () => {
    const call = vi.fn().mockResolvedValue('{"falta": true}');
    const promise = completeWithRetries(call, { requiredKeys: ["ok"] });
    const assertion = expect(promise).rejects.toThrow(LLMError);
    await vi.runAllTimersAsync();
    await assertion;
    expect(call).toHaveBeenCalledTimes(3);
  });

  it("valida required_keys y lo cuenta como fallo", async () => {
    const call = vi.fn().mockResolvedValue('{"otra": 1}');
    const promise = completeWithRetries(call, { requiredKeys: ["ok"] });
    const assertion = expect(promise).rejects.toThrow(/campos obligatorios/);
    await vi.runAllTimersAsync();
    await assertion;
  });
});

describe("OpenAiCompatibleClient (fallback de parámetros ante 400)", () => {
  function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  }

  it("reintenta sin temperature si el 400 la menciona y no la reenvía", async () => {
    const bodies: string[] = [];
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return new Response('{"error": "invalid temperature"}', { status: 400 });
      })
      .mockImplementation(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return jsonResponse({ choices: [{ message: { content: '{"ok": true}' } }] });
      });

    const client = new OpenAiCompatibleClient(
      "https://api.example.com/v1",
      "modelo-x",
      "key",
      fetchMock,
    );

    const call = client.call("system", "prompt");
    const content = await call(0.3);
    expect(content).toBe('{"ok": true}');
    expect(JSON.parse(bodies[0])).toHaveProperty("temperature", 0.3);
    expect(JSON.parse(bodies[1])).not.toHaveProperty("temperature");

    // Segunda llamada: ya no se manda temperature desde el principio.
    const call2 = client.call("system", "prompt");
    await call2(0.3);
    const last = JSON.parse(bodies[bodies.length - 1]);
    expect(last).not.toHaveProperty("temperature");
  });

  it("también retira response_format si el proveedor lo rechaza con 400", async () => {
    const bodies: string[] = [];
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return new Response('{"error": "response_format not supported"}', {
          status: 400,
        });
      })
      .mockImplementation(async (_url: string, init: RequestInit) => {
        bodies.push(String(init.body));
        return jsonResponse({
          choices: [{ message: { content: '{"ok": true}' } }],
        });
      });

    const client = new OpenAiCompatibleClient(
      "https://api.example.com/v1",
      "modelo-x",
      "key",
      fetchMock,
    );

    const content = await client.call("system", "prompt")(0.1);
    expect(content).toBe('{"ok": true}');
    expect(JSON.parse(bodies[0])).toHaveProperty("response_format");
    expect(JSON.parse(bodies[1])).not.toHaveProperty("response_format");
  });

  it("respeta el Retry-After del proveedor ante un 429 (vía completeWithRetries)", async () => {
    vi.useFakeTimers();
    try {
      const http429 = new HttpError(
        429,
        "HTTP 429: rate limit",
        0.01, // retryAfterSeconds
      );
      const call = vi
        .fn()
        .mockRejectedValueOnce(http429)
        .mockResolvedValue('{"ok": true}');

      const promise = completeWithRetries(call, {});
      await vi.runAllTimersAsync();
      await expect(promise).resolves.toEqual({ ok: true });
      expect(call).toHaveBeenCalledTimes(2);
    } finally {
      vi.useRealTimers();
    }
  });

  it("lanza LLMError con el cuerpo del error HTTP", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("model not found", { status: 404 }));
    const client = new OpenAiCompatibleClient(
      "https://api.example.com/v1",
      "modelo-x",
      "key",
      fetchMock,
    );
    await expect(client.call("s", "p")(0.1)).rejects.toThrow(/model not found/);
  });
});
