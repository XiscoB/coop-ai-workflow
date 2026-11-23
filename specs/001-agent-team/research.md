# Research: decisiones técnicas (Phase 0)

Todas las incógnitas del Technical Context resueltas. Formato: decisión, motivo y
alternativas descartadas.

## D1. Base de datos gratuita: Neon (Postgres serverless)

- **Decision**: Neon Postgres con Drizzle ORM y el driver `@neondatabase/serverless`.
- **Rationale**: tier gratuito generoso y sin caducidad; driver por HTTP/WebSocket
  pensado para funciones serverless (sin pool persistente); Postgres real por si la
  demo crece; Drizzle es ligero, type-safe y no necesita motor binario (a
  diferencia de Prisma) — arranque en frío menor.
- **Alternativas**: Supabase (igual de válida, pero incluye auth/storage que no
  usamos — más peso); Turso (SQLite distribuida: muy buena, pero el ecosistema
  Vercel+Postgres es más conocido por el revisor); Vercel Postgres (es Neon por
  debajo; ir directos a Neon da el dashboard y el connection string sin atarse al
  marketplace); Firebase (NoSQL: encaja peor con runs/tareas/actividad
  relacionales).

## D2. Ejecución de agentes de larga duración: motor por pasos

- **Decision**: máquina de estados persistida en BD. Cada ejecución avanza por
  **pasos** (`orchestrate → develop → test → … → report`); un Route Handler
  `POST /api/runs/[id]/advance` ejecuta UN paso (<60 s) y devuelve el estado. El
  cliente (página de ejecución) llama a `advance` en bucle mientras la ejecución
  siga en curso.
- **Rationale**: el plan Hobby de Vercel limita la duración de cada función
  serverless (~60 s); un bucle de agentes de varios minutos no cabe en una sola
  invocación. El motor por pasos funciona igual en local y en Vercel, deja todo el
  estado en BD (historial gratis por D1), y si el usuario cierra la pestaña la
  ejecución simplemente espera — otro `advance` la reanuda (edge case «pérdida de
  conexión»).
- **Alternativas**: Vercel Workflow/DevKit (durable execution nativo, muy potente,
  pero añade una dependencia joven y una curva que no necesitamos para 3 agentes —
  constitución VI); proceso de fondo con streaming SSE (frágil en serverless y
  corta la demo si se cierra la conexión); cola externa + worker (rompe coste
  cero/simplicidad); self-invocation encadenada (el paso llama al siguiente por
  fetch: funciona, pero es más difícil de depurar y de pausar que el driver del
  cliente).

## D3. Actualización en vivo: polling corto (sin SSE)

- **Decision**: la página de ejecución hace polling a `GET /api/runs/[id]` cada
  1.5 s y, mientras la ejecución esté en curso, dispara `POST …/advance` tras cada
  respuesta.
- **Rationale**: cumple SC-002 (<2 s) con código trivial; SSE/WebSocket en
  serverless Hobby es inestable o requiere servicios extra (Pusher/Ably: coste y
  secretos nuevos). El polling dobla como driver del motor (D2): una sola
  pantalla, un solo mecanismo.
- **Alternativas**: SSE (ver arriba); React Server Components con `revalidate`
  (no da granularidad de segundos); SWR/React Query (innecesario: un `useEffect`
  con `fetch` basta).

## D4. Sandbox: sistema de archivos virtual en BD

- **Decision**: la mini-web es un sitio estático (HTML/CSS/JS sencillo) cuyos
  ficheros viven en la tabla `sandbox_files` (path, content). Develop opera con
  herramientas de archivo (`list`, `read`, `write`) sobre esa tabla. Se siembra
  desde la carpeta `sandbox/` del repo en el primer arranque (y existe acción de
  «restablecer sandbox»).
- **Rationale**: el filesystem de Vercel es efímero/solo lectura: no se puede
  editar código real en producción. La BD da persistencia, historial y el mismo
  comportamiento en local y en producción. Un sitio estático evita necesitar un
  bundler para «compilar» el trabajo de Develop.
- **Alternativas**: editar ficheros reales del repo (imposible en Vercel);
  generar artefactos de código sin verificación (descartada en la aclaración Q1:
  menos real); Vercel Sandbox/VM efímeras (potente pero añade complejidad y
  límites; la guardamos como mejora futura).

## D5. Verificación de Testing: checks deterministas + juicio del LLM

- **Decision**: Testing combina (a) **checks deterministas** en Node — el HTML
  parsea, los enlaces `<a href>` apuntan a ficheros existentes, los recursos
  referenciados (CSS/JS/img) existen, la petición original quedó cubierta según
  una comprobación objetivable por tarea (p. ej. existe `/contacto.html` con un
  `<form>`) — y (b) **revisión LLM** del diff de la tarea cuando haga falta criterio
  cualitativo.
- **Rationale**: los checks deterministas son rápidos, gratuitos y repetibles (y
  demuestran «Testing comprueba de verdad»); el LLM aporta el juicio para lo no
  mecanizable. Es el mismo patrón de «sonda real» de `docs/arquitectura-llm.md`:
  no fiarlo todo a una llamada.
- **Alternativas**: solo LLM (perezoso, caro y menos creíble); ejecutar la web en
  un navegador headless (Playwright en serverless: pesado y de pago en la práctica).

## D6. Auth: cookie firmada propia (sin NextAuth)

- **Decision**: credencial compartida en env (`APP_USER`, `APP_PASSWORD`);
  `POST /api/login` valida y fija cookie HttpOnly firmada con HMAC-SHA256
  (`AUTH_SECRET`); `middleware.ts` protege todo salvo `/login` y assets.
- **Rationale**: una credencial, cero tablas, cero dependencias (constitución VI).
  NextAuth/Clerk serían sobredimensionar para «un usuario y contraseña de prueba».
- **Alternativas**: NextAuth (sobredimensionado); Basic Auth de Vercel (protege
  todo el despliegue, incluidas las APIs, sin posibilidad de branding; además el
  plan Hobby lo limita a preview).

## D7. Capa LLM sin SDK

- **Decision**: `fetch` directo a Ollama (`/api/generate`, `format: json`) y a
  cualquier API OpenAI-compatible (`/chat/completions`, `response_format:
  json_object`), con reintentos backoff 2/5/10 s, timeout 120 s, parsing defensivo
  y fallback de parámetros ante HTTP 400. Detección `auto/local/api` y sonda real.
- **Rationale**: es el patrón validado de `docs/arquitectura-llm.md`; evita
  dependencias de SDK por proveedor (una sola implementación sirve para DeepSeek,
  Kimi, OpenAI, OpenRouter…). En Next.js todo corre en Route Handlers (Node
  runtime), nunca en el navegador (constitución III).
- **Alternativas**: SDK `openai` (cómodo pero otra dependencia y abstracción que
  no controlamos); Vercel AI SDK (buena, pero ataría la capa a un ecosistema para
  algo que son dos `fetch`).

## D8. Tests: Vitest

- **Decision**: Vitest para unit tests (`lib/llm`, `lib/sandbox/checks`, parsing
  defensivo, detección de proveedor) e integración del motor (`engine/runner` con
  LLM mockeado y BD de test).
- **Rationale**: estándar en el ecosistema Next/Vite, rápido, ESM nativo. Jest
  queda descartado por peso y configuración. Tests E2E de navegador: fuera de
  alcance (validación manual guiada por `quickstart.md`).

## D9. Mini-web semilla

- **Decision**: la carpeta `sandbox/` contiene una web de empresa ficticia de 3-4
  páginas (`index.html`, `servicios.html`, `sobre-nosotros.html`, `styles.css`,
  `main.js`) sin página de contacto — así la petición de ejemplo del encargo
  («añade una página de contacto») siempre tiene trabajo real que hacer.
- **Rationale**: demo autocontenida y repetible (botón «restablecer sandbox»).
