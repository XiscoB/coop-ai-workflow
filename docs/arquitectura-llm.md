# Arquitectura LLM: modo local y modo API keys

> Estado: **borrador de diseño**. Se alineará con el patrón del proyecto
> anterior que se adjuntará antes de empezar la implementación.

## Objetivo

Que la app funcione en dos modos sin cambiar código:

1. **Modo local** — los 3 agentes usan un modelo servido en la máquina del
   usuario (Ollama o LM Studio, API compatible con OpenAI). Coste cero, ideal
   para desarrollo y para la demo del requisito «no hace falta gastar dinero».
2. **Modo API keys** — los agentes usan proveedores cloud (Anthropic, OpenAI,
   u otros compatibles) configurados por variables de entorno. Pensado para el
   despliegue en Vercel y para quien quiera más calidad de modelo.

## Diseño propuesto

- **Capa de abstracción de proveedor** única (`lib/llm/`): una interfaz
  `complete(messages, options)` que resuelve el proveedor según configuración.
- **Resolución por entorno** (orden de prioridad):
  1. `LLM_PROVIDER=local` → endpoint `LOCAL_LLM_BASE_URL` (p. ej.
     `http://localhost:11434/v1` para Ollama), modelo `LOCAL_LLM_MODEL`.
  2. `LLM_PROVIDER=anthropic|openai|...` → usa la key correspondiente
     (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`…).
  3. Sin configuración → mensaje de error claro en pantalla explicando cómo
     configurar uno de los dos modos.
- **Por agente**: posibilidad de sobreescribir proveedor/modelo por agente
  (`ORCHESTRATOR_MODEL`, `DEVELOP_MODEL`, `TESTING_MODEL`) para mezclar
  (p. ej. Orquestador con modelo cloud y Testing en local).
- **Sin keys en el repo**: solo `.env.example` con placeholders; `.env*`
  ignorados por git (ver `.gitignore`). En Vercel, las keys se configuran en
  el dashboard del proyecto.

## Compatibilidad con Vercel

Las llamadas al LLM se hacen **server-side** (Route Handlers / Server
Actions), nunca desde el navegador: las keys no se exponen al cliente. En modo
local, el despliegue de Vercel no puede alcanzar `localhost`, así que el modo
local es para desarrollo y el modo API keys para producción (documentado en el
README final).
