# Coop AI Workflow

Un equipo de 3 agentes de IA que trabaja en cooperación sobre una web de
ejemplo, con visibilidad total del proceso en tiempo real:

- **Orquestador** — recibe una petición en lenguaje natural (p. ej. «añade una
  página de contacto a esta web»), la descompone en tareas y las asigna.
- **Developer** — ejecuta cada tarea, modificando la web de verdad.
- **Testing** — verifica el trabajo de Developer (checks automáticos + revisión
  con criterio) y devuelve lo que falla hasta que todo pasa, con un límite de
  ciclos de corrección.

La pantalla muestra en todo momento qué hace cada agente, el estado de cada
tarea y un timeline de la actividad; todo queda persistido y es consultable.

## Características

- **Centro de control** con ejecución en vivo, historial y estado del sistema
- **Recuperación real de fallos**: reanudar ejecuciones en error o con fallos,
  y revertir los cambios de cualquier ejecución (foto del sandbox por ejecución)
- **Doble modo de IA**: local con Ollama (coste cero) o cualquier API
  compatible con OpenAI (Groq, DeepSeek, OpenAI, OpenRouter…), con detección
  automática y sonda de salud
- **Configuración desde la UI**: proveedor de IA y prompts por agente; la API
  key se guarda solo en el servidor y nunca se expone al navegador
- **Notificaciones, TTS y logs** del sistema; tema claro/oscuro
- **Seguridad**: login con rate limit y comparación en tiempo constante, CSP
  sobre el contenido generado por agentes, cerrojo anti-concurrencia del motor

## Stack

- **Next.js** (App Router, TypeScript, Tailwind) — desplegado en **Vercel**
- **Neon Postgres** (tier gratuito) con Drizzle ORM; driver serverless (HTTP)
  en producción y TCP clásico (`pg`) para cualquier Postgres local
- **GitHub Spec Kit** — el proyecto se construyó con spec-driven development:
  `.specify/memory/constitution.md` y `specs/`

## Arranque local (coste cero)

1. Requisitos: Node 22+, [Ollama](https://ollama.com) con un modelo
   (`ollama pull qwen2.5-coder:7b`) y una base de datos Postgres: gratuita en
   [Neon](https://neon.tech) o local en Docker
   (`docker run -d -p 55433:5432 -e POSTGRES_PASSWORD=cambia-esto postgres:16-alpine`).
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

4. Abre http://localhost:3000 e inicia sesión con la credencial
   (`APP_USER`/`APP_PASSWORD`). La app detecta Ollama automáticamente
   (`LLM_MODE=auto`).

## Despliegue en Vercel

1. Importa el repo en Vercel y define las variables de entorno:
   `DATABASE_URL`, `AUTH_SECRET`, `APP_USER`, `APP_PASSWORD` y, para el modo
   API, `LLM_API_BASE_URL`, `LLM_API_MODEL` y `LLM_API_KEY` (ejemplos en
   `.env.example`).
2. Ejecuta `npm run db:push` una vez contra la misma `DATABASE_URL` para crear
   las tablas (si aún no existen).
3. Comparte la URL y la credencial de prueba con el revisor.

El modo local (Ollama) está pensado para desarrollo en tu máquina; en el
despliegue se configura el modo API. La IA también puede configurarse después
desde la propia aplicación (página Configuración), guardándose de forma segura
en el servidor.

## Cómo funciona por dentro

- **Motor por pasos**: cada ejecución es una máquina de estados persistida
  (`orchestrate → develop → test → … → report`); cada invocación ejecuta un
  paso (<60 s), compatible con los límites del plan gratuito de Vercel. Si el
  usuario cierra la pestaña, la ejecución queda en pausa y se reanuda al volver.
- **Sandbox en base de datos**: la web de ejemplo vive en Postgres (el
  filesystem de Vercel es de solo lectura) y se sirve con content-type real
  en `/site/*`, navegable desde la app.
- **Testing híbrido**: checks deterministas (HTML equilibrado, enlaces y
  recursos existentes, criterio de aceptación por tarea) más revisión del LLM
  para lo cualitativo.
- **Robustez LLM**: reintentos con backoff (2/5/10 s), parsing defensivo del
  JSON, fallback de parámetros ante HTTP 400 y sonda real de completions.
- **Concurrencia segura**: una ejecución activa y cerrojo por paso
  (`locked_at` con TTL), que impide que dos clientes avancen la misma
  ejecución en paralelo.

Contratos de la API: `specs/001-agent-team/contracts/api.md`.

## Tests y calidad

```bash
npm test        # Vitest: 50 tests (capa LLM, sandbox, motor, recuperación, auth)
npm run build   # build de producción
```

## Seguridad y secretos

Ninguna clave se sube al repositorio: `.env*` está ignorado por git (excepto
`.env.example`, con placeholders). Todas las llamadas a la IA se ejecutan en
el servidor y las claves nunca se devuelven al cliente (se muestran
enmascaradas). La autenticación usa cookie firmada (HMAC-SHA256), HttpOnly y
con expiración, y el login aplica rate limit por IP.

## Documentación

- `docs/requisitos.md` — encargo original
- `docs/plan-de-entrega.md` — decisiones, entregables y estado de validación
- `docs/arquitectura-llm.md` — arquitectura del doble modo local / API
- `docs/proveedores-ia-gratuitos.md` — tiers gratuitos evaluados para producción
- `docs/como-usamos-la-ia.md` — cómo se construyó el proyecto con Kimi Code + Spec Kit

## Licencia

[MIT](./LICENSE)
