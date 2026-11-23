"use client";

import { useEffect, useState } from "react";
import { invalidateTtsCache } from "@/components/notifications";
import { Spinner } from "@/components/spinner";

interface ConfigResponse {
  settings: {
    llm_mode: string;
    local_llm_base_url: string;
    local_llm_model: string;
    llm_api_base_url: string;
    llm_api_model: string;
    llm_api_key: string;
    llm_min_interval_seconds: string;
    tts_enabled: boolean;
  };
  detection: { type: string; label: string } | null;
  warning: string | null;
}

interface PromptInfo {
  label: string;
  default: string;
  current: string;
  custom: boolean;
}

const AGENT_ORDER = ["orchestrator", "develop", "testing"] as const;

export default function ConfiguracionPage() {
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [prompts, setPrompts] = useState<Record<string, PromptInfo>>({});
  const [form, setForm] = useState({
    llm_mode: "auto",
    local_llm_base_url: "",
    local_llm_model: "",
    llm_api_base_url: "",
    llm_api_model: "",
    llm_api_key: "",
    llm_min_interval_seconds: "",
    tts_enabled: true,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/config").then((res) => (res.ok ? res.json() : Promise.reject())),
      fetch("/api/config/prompts").then((res) =>
        res.ok ? res.json() : Promise.reject(),
      ),
    ])
      .then(([cfg, pr]) => {
        setConfig(cfg);
        setForm({
          llm_mode: cfg.settings.llm_mode,
          local_llm_base_url: cfg.settings.local_llm_base_url,
          local_llm_model: cfg.settings.local_llm_model,
          llm_api_base_url: cfg.settings.llm_api_base_url,
          llm_api_model: cfg.settings.llm_api_model,
          llm_api_key: cfg.settings.llm_api_key,
          llm_min_interval_seconds: cfg.settings.llm_min_interval_seconds,
          tts_enabled: cfg.settings.tts_enabled,
        });
        setPrompts(pr.prompts);
      })
      .catch(() =>
        setLoadError("No se pudo cargar la configuración. Recarga la página."),
      );
  }, []);

  async function saveSettings(event: React.FormEvent) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "No se pudo guardar.");
        return;
      }
      setConfig(data);
      invalidateTtsCache();
      setMessage(
        data.detection
          ? `Guardado. Proveedor activo: ${data.detection.label}.`
          : `Guardado. ${data.warning ?? "Sin proveedor disponible."}`,
      );
    } catch {
      setMessage("Error de conexión al guardar.");
    } finally {
      setSaving(false);
    }
  }

  async function savePrompt(agent: string, value: string | null) {
    const res = await fetch("/api/config/prompts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, prompt: value }),
    });
    if (res.ok) {
      const data = await res.json();
      setPrompts(data.prompts);
    }
  }

  if (loadError) {
    return (
      <p className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-300">
        {loadError}
      </p>
    );
  }

  if (!config) {
    return (
      <div className="flex items-center gap-3 text-stone-500 dark:text-stone-400">
        <Spinner /> Cargando configuración…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold dark:text-stone-100">Configuración</h1>

      <form
        onSubmit={saveSettings}
        className="space-y-4 rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900"
      >
        <h2 className="font-bold dark:text-stone-100">Servicio de IA</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          Proveedor activo:{" "}
          <strong>{config.detection?.label ?? "Ninguno"}</strong>
          {config.warning && ` — ${config.warning}`}
        </p>

        <label className="block text-sm dark:text-stone-200">
          <span className="mb-1 block font-medium">Modo</span>
          <select
            value={form.llm_mode}
            onChange={(e) => setForm({ ...form, llm_mode: e.target.value })}
            className="w-64 rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
          >
            <option value="auto">auto (local si responde, si no API)</option>
            <option value="local">local (Ollama)</option>
            <option value="api">api (API externa)</option>
          </select>
        </label>

        <fieldset className="space-y-3 rounded border border-stone-200 p-3 dark:border-stone-700">
          <legend className="px-1 text-sm font-medium text-stone-600 dark:text-stone-400">
            Ollama local
          </legend>
          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">URL</span>
            <input
              type="text"
              value={form.local_llm_base_url}
              onChange={(e) =>
                setForm({ ...form, local_llm_base_url: e.target.value })
              }
              placeholder="http://localhost:11434"
              className="w-full rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">Modelo</span>
            <input
              type="text"
              value={form.local_llm_model}
              onChange={(e) =>
                setForm({ ...form, local_llm_model: e.target.value })
              }
              placeholder="qwen2.5-coder:7b"
              className="w-72 rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
        </fieldset>

        <fieldset className="space-y-3 rounded border border-stone-200 p-3 dark:border-stone-700">
          <legend className="px-1 text-sm font-medium text-stone-600 dark:text-stone-400">
            API externa
          </legend>
          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">URL de la API</span>
            <input
              type="text"
              value={form.llm_api_base_url}
              onChange={(e) =>
                setForm({ ...form, llm_api_base_url: e.target.value })
              }
              placeholder="https://api.groq.com/openai/v1"
              className="w-full rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>

          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">Modelo</span>
            <input
              type="text"
              value={form.llm_api_model}
              onChange={(e) => setForm({ ...form, llm_api_model: e.target.value })}
              placeholder="openai/gpt-oss-120b"
              className="w-72 rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>

          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">
              API key (se guarda solo en este servidor, nunca se muestra completa)
            </span>
            <input
              type="password"
              value={form.llm_api_key}
              onChange={(e) => setForm({ ...form, llm_api_key: e.target.value })}
              placeholder="••••"
              autoComplete="off"
              className="w-full rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>

          <label className="block text-sm dark:text-stone-200">
            <span className="mb-1 block font-medium">
              Pausa mínima entre llamadas, en segundos («modo lento»; 0 o vacío =
              desactivado. Además, tras un 429 la app frena sola)
            </span>
            <input
              type="number"
              min={0}
              max={120}
              value={form.llm_min_interval_seconds}
              onChange={(e) =>
                setForm({ ...form, llm_min_interval_seconds: e.target.value })
              }
              placeholder="0"
              className="w-32 rounded border border-stone-300 px-3 py-2 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
            />
          </label>
        </fieldset>

        <label className="flex items-center gap-2 text-sm dark:text-stone-200">
          <input
            type="checkbox"
            checked={form.tts_enabled}
            onChange={(e) =>
              setForm({ ...form, tts_enabled: e.target.checked })
            }
          />
          Aviso por voz (TTS) cuando una ejecución termina o falla
        </label>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded bg-stone-800 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            {saving && <Spinner />} Guardar
          </button>
          {message && (
            <span className="text-sm text-stone-600 dark:text-stone-400">
              {message}
            </span>
          )}
        </div>
      </form>

      <section className="space-y-4">
        <h2 className="font-bold dark:text-stone-100">Prompts por agente</h2>
        <p className="text-sm text-stone-600 dark:text-stone-400">
          El system prompt que guía a cada agente. Si lo personalizas, las
          nuevas ejecuciones lo usarán; puedes restablecer el original.
        </p>
        {AGENT_ORDER.map((key) => {
          const info = prompts[key];
          if (!info) return null;
          return (
            <PromptEditor
              key={key}
              agent={key}
              info={info}
              onSave={savePrompt}
            />
          );
        })}
      </section>
    </div>
  );
}

function PromptEditor({
  agent,
  info,
  onSave,
}: {
  agent: string;
  info: PromptInfo;
  onSave: (agent: string, value: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState(info.current);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => setValue(info.current), [info.current]);

  async function save(prompt: string | null) {
    setSaving(true);
    setSaved(false);
    await onSave(agent, prompt);
    setSaving(false);
    setSaved(true);
  }

  return (
    <div className="rounded-lg border border-stone-300 bg-white p-4 shadow-sm dark:border-stone-700 dark:bg-stone-900">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="font-medium dark:text-stone-100">
          {info.label}
          {info.custom && (
            <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-950 dark:text-blue-300">
              personalizado
            </span>
          )}
        </h3>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="text-xs text-emerald-700 dark:text-emerald-400">
              Guardado
            </span>
          )}
          {info.custom && (
            <button
              onClick={() => save(null)}
              disabled={saving}
              className="text-xs text-stone-500 underline hover:text-stone-700 dark:text-stone-400"
            >
              Restablecer
            </button>
          )}
          <button
            onClick={() => save(value)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded bg-stone-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-stone-700 disabled:opacity-50 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-white"
          >
            {saving && <Spinner small />} Guardar
          </button>
        </div>
      </div>
      <textarea
        value={value}
        onChange={(e) => setValue(e.target.value)}
        rows={10}
        className="w-full rounded border border-stone-300 px-3 py-2 font-mono text-xs dark:border-stone-600 dark:bg-stone-800 dark:text-stone-100"
      />
    </div>
  );
}
