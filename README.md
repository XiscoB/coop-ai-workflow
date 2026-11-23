# Coop AI Workflow

Un equipo de 3 agentes de IA que trabajan juntos sobre una web de ejemplo:

- **Orquestador** — recibe una petición en lenguaje natural (p. ej. «añade una
  página de contacto a esta web»), la divide en tareas y las reparte.
- **Develop** — ejecuta las tareas de desarrollo, modificando de verdad la web.
- **Testing** — comprueba lo hecho por Develop (checks automáticos + revisión) y
  devuelve lo que falla, hasta que todo pasa o se agota el límite de ciclos.

En pantalla se ve en todo momento qué hace cada agente y en qué estado está cada
tarea. Todo queda registrado y consultable en el historial.

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) desplegado en **Vercel**
- **Neon** Postgres (plan gratuito) con Drizzle ORM. El cliente elige driver
  según la URL: serverless (HTTP) para Neon en producción, TCP clásico (`pg`)
  para cualquier Postgres local en desarrollo (p. ej. Docker)
- **IA en dos modos**: local (Ollama, coste cero) o API compatible con OpenAI
  (DeepSeek, Kimi, OpenAI, OpenRouter…) — detalle en `docs/arquitectura-llm.md`
- Construido con **spec-driven development** (GitHub Spec Kit): ver
  `.specify/memory/constitution.md` y `specs/001-agent-team/`

## Arranque local (coste cero)

1. Requisitos: Node 22+, [Ollama](https://ollama.com) con un modelo
   (`ollama pull qwen2.5-coder:7b` y `ollama serve`), y una base de datos
   Postgres: una gratuita en [Neon](https://neon.tech) (copia el connection
   string) o una local en Docker
   (`docker run -d -p 55433:5432 -e POSTGRES_PASSWORD=cambia-esto postgres:16-alpine`
   → `DATABASE_URL=postgres://postgres:cambia-esto@127.0.0.1:55433/postgres`).
2. Configura el entorno:

   ```bash
   cp .env.example .env.local
   # Rellena: DATABASE_URL, AUTH_SECRET (largo y aleatorio), APP_USER, APP_PASSWORD
   ```

3. Instala, crea las tablas y arranca:

   ```bash
   npm install
   npm run db:push
   npm run dev
   ```

4. Abre http://localhost:3000, entra con la credencial (`APP_USER`/`APP_PASSWORD`)
   y lanza una petición. La app detecta Ollama automáticamente (`LLM_MODE=auto`).

## Despliegue en Vercel

1. Sube este repo a GitHub e impórtalo en Vercel.
2. En **Environment Variables** define: `DATABASE_URL`, `AUTH_SECRET`,
   `APP_USER`, `APP_PASSWORD` y, para la IA en producción, `LLM_API_BASE_URL`,
   `LLM_API_MODEL` y `LLM_API_KEY` (cualquier API compatible con OpenAI;
   ejemplos en `.env.example`).
3. Ejecuta `npm run db:push` una vez contra la misma `DATABASE_URL` para crear
   las tablas.
4. Comparte la URL y la credencial de prueba con quien la revise.

> El modo local (Ollama) solo funciona en desarrollo: Vercel no puede alcanzar
> el `localhost` de tu máquina. En producción se usa el modo API.

## Cómo funciona por dentro

- **Motor por pasos**: cada ejecución es una máquina de estados persistida
  (`orchestrate → develop → test → … → report`). Cada llamada a
  `POST /api/runs/[id]/advance` ejecuta un paso (<60 s), así funciona dentro de
  los límites del plan gratuito de Vercel; la página de la ejecución lo conduce
  en vivo y, si cierras la pestaña, la ejecución queda en pausa y se reanuda al
  volver.
- **Sandbox**: la web de ejemplo vive en la base de datos (el filesystem de
  Vercel es de solo lectura). Develop la modifica con herramientas de fichero;
  Testing combina checks deterministas (HTML equilibrado, enlaces y recursos
  existentes, criterio de aceptación por tarea) con revisión del LLM.
- **Límite de ciclos**: 5 por defecto; al agotarse, la ejecución termina como
  «completada con fallos» con informe de lo pendiente.
- **Una ejecución a la vez**: las nuevas peticiones se rechazan con 409 mientras
  haya otra en curso.

Contratos de la API: `specs/001-agent-team/contracts/api.md`.

## Tests y calidad

```bash
npm test        # Vitest: capa LLM, checks del sandbox y motor (32 tests)
npm run build   # build de producción
```

## Claves y secretos

Ninguna clave se sube al repositorio: `.env*` está ignorado por git (excepto
`.env.example`, con placeholders) y todas las llamadas a la IA se hacen
server-side.

## Documentación

- `docs/requisitos.md` — encargo original
- `docs/plan-de-entrega.md` — decisiones, entregables y checklist
- `docs/arquitectura-llm.md` — doble modo local / API keys (patrón validado)
- `docs/proveedores-ia-gratuitos.md` — tiers gratuitos para el despliegue (Groq, Google AI Studio, OpenRouter…)
- `docs/como-usamos-la-ia.md` — cómo construimos el proyecto con Kimi Code + Spec Kit
