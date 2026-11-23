# Tasks: Equipo de 3 agentes de IA (Orquestador, Develop, Testing)

**Input**: Design documents from `/specs/001-agent-team/`

**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/api.md, quickstart.md

**Tests**: Incluidos (research D8: Vitest). Los tests se escriben PRIMERO y deben
fallar antes de implementar (TDD dentro de cada historia para el núcleo).

**Organization**: Tareas agrupadas por user story de `spec.md` (P1 → P3).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Paralelizable (archivos distintos, sin dependencias de tareas incompletas)
- **[Story]**: [US1], [US2], [US3] según `spec.md`

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inicialización del proyecto Next.js y herramientas

- [ ] T001 Crear la app Next.js 15 (App Router, TypeScript, Tailwind CSS 4, sin src/) en la raíz del repo con `create-next-app`, sin sobrescribir `README.md`, `docs/`, `.specify/`, `specs/` ni `.env.example` (fusionar `.gitignore` y `package.json`)
- [ ] T002 [P] Configurar Vitest en `vitest.config.ts` (environment node, alias `@/` → raíz) y script `test` en `package.json`
- [ ] T003 [P] Configurar Drizzle + `drizzle-kit` en `drizzle.config.ts` (dialect postgresql, schema `lib/db/schema.ts`) y script `db:push` en `package.json`
- [ ] T004 [P] Crear la mini-web semilla en `sandbox/`: `index.html`, `servicios.html`, `sobre-nosotros.html`, `styles.css`, `main.js` — empresa ficticia, SIN página de contacto (research D9), enlaces entre páginas funcionando
- [ ] T005 Actualizar `.env.example` añadiendo `DATABASE_URL`, `AUTH_SECRET`, `APP_USER`, `APP_PASSWORD` con placeholders y comentarios (constitución III)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infraestructura núcleo que bloquea TODAS las historias

**⚠️ CRITICAL**: Ninguna user story puede empezar hasta completar esta fase

- [ ] T006 Definir el esquema Drizzle en `lib/db/schema.ts` según `data-model.md`: `runs` (status enum pending/running/completed/completed_with_failures/error/rejected, step, current_task_id, cycles_used, max_cycles default 5, final_report, error_message, provider_snapshot, created_at, finished_at), `tasks` (run_id FK cascade, seq, description, acceptance_check jsonb de tipo cerrado: `file_exists` / `element_exists` / `link_exists` / `llm_review` — ver data-model.md, status enum pending/in_progress/in_review/failed/completed, attempts default 0, last_failure_reason, result_summary, created_at, completed_at), `activities` (bigserial id, run_id FK cascade, task_id FK nullable, agent enum orchestrator/develop/testing/system, kind enum message/tool_call/file_change/verdict/status_change, content, detail jsonb, duration_ms nullable, created_at; índice `(run_id, id)`), `sandbox_files` (path text PK, content, updated_by_run FK nullable, updated_at)
- [ ] T007 Crear el cliente de BD en `lib/db/client.ts` con `@neondatabase/serverless` + Drizzle leyendo `DATABASE_URL`
- [ ] T008 Crear `lib/config.ts`: lectura tipada de env (`LLM_MODE` default auto, `LOCAL_LLM_BASE_URL` default `http://localhost:11434`, `LOCAL_LLM_MODEL`, `LLM_API_BASE_URL`, `LLM_API_MODEL`, `LLM_API_KEY`, overrides por agente, `AUTH_SECRET`, `APP_USER`, `APP_PASSWORD`, `DATABASE_URL`) con validación y mensajes de error claros
- [ ] T009 [P] Implementar auth de credencial compartida (research D6): `lib/auth.ts` (cookie HttpOnly firmada HMAC-SHA256 con `AUTH_SECRET`, 12 h), `app/api/login/route.ts` (POST → 200 `{ok:true}` + cookie / 401 `BAD_CREDENTIALS`), `app/api/logout/route.ts` y `middleware.ts` protegiendo todo salvo `/login`, `/api/login` y assets → 401 en API, redirect en páginas (FR-012)
- [ ] T010 [P] Implementar el núcleo LLM en `lib/llm/complete.ts`: reintentos con backoff fijo 2/5/10 s, timeout 120 s, parsing defensivo (strip de fences ```json) y validación de `required_keys`, según `docs/arquitectura-llm.md` §3
- [ ] T011 [P] Implementar el proveedor Ollama en `lib/llm/ollama.ts`: `POST {url}/api/generate` con `format: "json"`, `stream: false`, `options.temperature` 0.1 por defecto (research D7)
- [ ] T012 [P] Implementar el proveedor OpenAI-compatible en `lib/llm/openai-compatible.ts`: `POST {url}/chat/completions` con `Authorization: Bearer` si hay key, `response_format: json_object`, y fallback de parámetros ante HTTP 400 (si el 400 menciona `temperature` u otro parámetro, reintentar sin él y no reenviarlo en la sesión) (research D7, docs/arquitectura-llm.md §3)
- [ ] T013 Implementar detección de proveedor y sonda en `lib/llm/index.ts`: modos `auto|local|api` (auto = ping `GET {url}/api/tags` timeout 3 s → Ollama; si no, API si hay key; si no, null), sonda de completion real mínima (`{"ok": true}`, sin temperature ni max_tokens), y nombre visible del proveedor (docs/arquitectura-llm.md §1 y §4)
- [ ] T014 [P] Implementar el FS virtual del sandbox en `lib/sandbox/fs.ts`: `list()`, `read(path)`, `write(path, content)` sobre la tabla `sandbox_files` (research D4)
- [ ] T015 [P] Implementar los checks deterministas en `lib/sandbox/checks.ts`: el HTML parsea, todo `href`/`src` local apunta a un fichero existente, y evaluación de los tipos cerrados de `acceptance_check` (`file_exists`, `element_exists`, `link_exists`); `llm_review` se deja al veredicto del LLM (research D5)
- [ ] T016 Crear `lib/sandbox/seed.ts` + script `db:push`: aplica el esquema y siembra `sandbox_files` desde `sandbox/` si la tabla está vacía (research D9)

**Checkpoint**: Foundation lista — las historias pueden empezar

---

## Phase 3: User Story 1 - Lanzar una petición y verla completar (Priority: P1) 🎯 MVP

**Goal**: Bucle completo Orquestador → Develop → Testing visible en pantalla, con
persistencia de actividad y resultado final sobre la mini-web sandbox

**Independent Test**: Enviar «Añade una página de contacto a la web» desde `/` y
observar tareas, estados, bucle de revisión e informe final (quickstart V3)

### Tests for User Story 1 ⚠️ (escribir primero, deben FALLAR)

- [ ] T017 [P] [US1] Test de integración del motor en `tests/engine/runner.test.ts`: con LLM mockeado y BD de test, una ejecución avanza orchestrate → develop → test → report y termina en `completed`; el caso «Testing falla 2 veces y luego pasa» consume ciclos y completa; al agotar `max_cycles` (5) termina `completed_with_failures` con informe
- [ ] T018 [P] [US1] Test unitario de `lib/sandbox/checks.ts` en `tests/sandbox/checks.test.ts`: detecta enlaces rotos, recursos inexistentes y valida un `acceptance_check` («existe /contacto.html con un form»)
- [ ] T019 [P] [US1] Test unitario de `lib/llm/complete.ts` en `tests/llm/complete.test.ts`: backoff 2/5/10, parsing defensivo de fences, `required_keys`, y fallback de parámetros ante HTTP 400 (fetch mockeado)

### Implementation for User Story 1

- [ ] T020 [US1] Implementar el Orquestador en `lib/agents/orchestrator.ts`: dada la petición y el listado del sandbox, devuelve JSON de tareas (`description`, `acceptance_check` de tipo cerrado según data-model.md) o rechazo con motivo (FR-002, edge cases petición vacía/fuera de alcance); registra su actividad
- [ ] T021 [US1] Implementar Develop en `lib/agents/develop.ts`: ejecuta UNA tarea sobre el sandbox con herramientas `list/read/write` (lib/sandbox/fs.ts), produce cambios de ficheros y `result_summary` (FR-003); registra actividad con `file_change` y latencia
- [ ] T022 [US1] Implementar Testing en `lib/agents/testing.ts`: aplica checks deterministas (lib/sandbox/checks.ts) + revisión LLM del cambio, y emite veredicto pasa/no pasa con motivo (FR-004, research D5); registra `verdict`
- [ ] T023 [US1] Implementar el motor en `lib/engine/steps.ts` + `lib/engine/runner.ts`: `advance(runId)` ejecuta exactamente un paso según `contracts/api.md` (orchestrate → develop → test → report), gestiona `current_task_id`, `attempts`, `cycles_used` (sube cuando Testing devuelve una tarea), límite de ciclos → `completed_with_failures` con informe, errores LLM tras reintentos → `error` con motivo (FR-005, edge cases)
- [ ] T024 [US1] Implementar `POST /api/runs` en `app/api/runs/route.ts`: valida petición no vacía (422 `EMPTY_REQUEST`), proveedor disponible (503 `NO_LLM_PROVIDER`), una sola ejecución activa (409 `RUN_IN_PROGRESS`), crea la run `pending` con `provider_snapshot` (FR-001, FR-013)
- [ ] T025 [US1] Implementar `GET /api/runs/[id]` (con `?after=` incremental) y `POST /api/runs/[id]/advance` en `app/api/runs/[id]/route.ts` y `app/api/runs/[id]/advance/route.ts` según `contracts/api.md` (advance idempotente; 409 `RUN_NOT_ACTIVE` si terminó)
- [ ] T026 [US1] Implementar la pantalla principal `app/page.tsx` + `app/ejecucion/[id]/page.tsx`: formulario de petición, vista en vivo con polling 1.5 s que dispara `advance` mientras la ejecución esté activa, agente activo, estados de tareas (pendiente/en curso/en revisión/fallada/completada), feed de actividad, informe final y enlace a `/preview` (FR-006, FR-014, SC-002)
- [ ] T027 [US1] Implementar `app/preview/page.tsx` + `GET /api/sandbox/files` y `GET /api/sandbox/files/[path]` en `app/api/sandbox/`: render navegable de la mini-web actual desde BD
- [ ] T028 [US1] Implementar `POST /api/sandbox/reset` + botón en UI (solo sin ejecución activa, 409 si la hay): re-siembra la mini-web (D9)

**Checkpoint**: US1 funcional end-to-end en local — validar con quickstart V3

---

## Phase 4: User Story 2 - Historial de ejecuciones (Priority: P2)

**Goal**: Lista de ejecuciones pasadas y detalle consultable; nada se pierde al
recargar o reiniciar

**Independent Test**: Completar una ejecución, reiniciar el servidor y comprobar
que `/historial` y el detalle muestran todo (quickstart V5)

- [ ] T029 [US2] Implementar `GET /api/runs?limit=20` en `app/api/runs/route.ts` (lista con id, request, status, created_at, finished_at)
- [ ] T030 [US2] Implementar `app/historial/page.tsx`: lista de ejecuciones con petición, estado global y fecha, enlazando al detalle `app/ejecucion/[id]/page.tsx` en modo solo-lectura cuando la ejecución terminó (sin polling ni advance)

**Checkpoint**: US1 y US2 funcionan de forma independiente — validar quickstart V5

---

## Phase 5: User Story 3 - Elegir el servicio de IA (Priority: P3)

**Goal**: Proveedor activo siempre visible; modos auto/local/api; sin proveedor →
aviso claro y peticiones bloqueadas con explicación

**Independent Test**: quickstart V2 — local sin key, API sin Ollama, y sin ninguno
(banner + 503)

- [ ] T031 [P] [US3] Test unitario de detección en `tests/llm/detect.test.ts`: modo auto con/sin Ollama (fetch mockeado), local sin Ollama → aviso sin fallback, api sin key → aviso; sonda devuelve motivos en claro (401, modelo inexistente, JSON ilegible)
- [ ] T032 [US3] Implementar `GET /api/llm/status` en `app/api/llm/status/route.ts` según `contracts/api.md` (modo, proveedor, sonda con `ok`/`detail`)
- [ ] T033 [US3] Implementar el badge de proveedor activo y el banner «IA no configurada» en la cabecera/layout (`app/layout.tsx` + componente `components/provider-status.tsx`): consulta `/api/llm/status`, deshabilita el formulario de petición si no hay proveedor y muestra instrucciones de configuración (FR-010)

**Checkpoint**: Las tres historias funcionan — validar quickstart V2 completo

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Quality gates de la constitución y entregables

- [ ] T034 [P] Ejecutar la validación completa de `quickstart.md` (V1–V6) y corregir lo que falle
- [ ] T035 [P] Actualizar `README.md` final: qué es, arranque local (Ollama), despliegue Vercel, modos de IA, credenciales de prueba, estructura del repo
- [ ] T036 [P] Completar `docs/como-usamos-la-ia.md` con el registro real de uso (prompts clave, decisiones aceptadas/rechazadas, intervenciones manuales) y `docs/plan-de-entrega.md` marcando el checklist de entregables
- [ ] T037 Desplegar en Vercel: importar repo, configurar env (`DATABASE_URL`, `AUTH_SECRET`, `APP_USER`, `APP_PASSWORD`, `LLM_API_*`), verificar build y quickstart V7 en la URL pública
- [ ] T038 Quality gates finales: `npm run build` y `npm test` en verde, `git ls-files` sin secretos, keys ausentes del bundle del navegador (constitución II, III)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: sin dependencias — inmediato
- **Foundational (Phase 2)**: depende de Setup — BLOQUEA todas las historias
- **US1 (Phase 3)**: depende de Foundational — es el MVP
- **US2 (Phase 4)**: depende de US1 (reutiliza detalle de ejecución y BD)
- **US3 (Phase 5)**: depende de Foundational (detección LLM); integra con la UI de US1
- **Polish (Phase 6)**: depende de US1+US2+US3

### User Story Dependencies

- **US1 (P1)**: tras Foundational; sin dependencias de otras historias
- **US2 (P2)**: tras US1 (el detalle read-only reutiliza la página de ejecución)
- **US3 (P3)**: tras Foundational; el badge/banner se integra en el layout de US1

### Parallel Opportunities

- Phase 1: T002, T003, T004 en paralelo (archivos distintos)
- Phase 2: T009, T010, T011, T012, T014, T015 en paralelo; T013 depende de T011+T012; T016 depende de T006+T007
- US1 tests: T017, T018, T019 en paralelo (antes de implementar)
- Phase 6: T034, T035, T036 en paralelo

## Parallel Example: User Story 1

```bash
# Tests de US1 juntos (deben fallar primero):
Task: "Test de integración del motor en tests/engine/runner.test.ts"
Task: "Test unitario de checks en tests/sandbox/checks.test.ts"
Task: "Test unitario de complete.ts en tests/llm/complete.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 + Phase 2 → fundación
2. Phase 3 (US1) → **STOP**: validar quickstart V3 → ya hay demo del bucle

### Incremental Delivery

1. Setup + Foundational → fundación lista
2. US1 → validar V3 → demo MVP
3. US2 → validar V5 → demo con historial
4. US3 → validar V2 → demo completa
5. Phase 6 → despliegue y entrega

## Notes

- Commit tras cada tarea o grupo lógico (historia del repo = parte de la entrega)
- Las rutas de archivos siguen `plan.md` §Project Structure
- Constraint textual de `data-model.md`: `max_cycles` default 5; enums de estado
  exactamente como se listan en T006
