# Contracts: API HTTP (Phase 1)

Todas las rutas son Route Handlers de Next.js (`app/api/…`), runtime Node, y todo
acceso a LLM/BD ocurre server-side (constitución III). Salvo `/api/login`, todas
requieren la cookie de sesión (D6); sin ella → `401` (las páginas redirigen a
`/login` vía middleware).

Formato de error común:

```json
{ "error": "mensaje claro en español", "code": "SNAKE_CASE" }
```

## `POST /api/login`

Body: `{ "user": string, "password": string }`
→ `200 { "ok": true }` + cookie `session` (HttpOnly, firmada HMAC, 12 h)
→ `401 { "error", "code": "BAD_CREDENTIALS" }`

## `POST /api/logout`

→ `200 { "ok": true }` + cookie borrada.

## `GET /api/llm/status`

Devuelve el proveedor detectado y el resultado de la sonda (FR-010, D7).

→ `200`:
```json
{
  "mode": "auto",
  "provider": { "type": "ollama", "label": "Ollama local (qwen2.5-coder)" },
  "probe": { "ok": true, "detail": null }
}
```
`provider.type`: `"ollama" | "openai_compatible" | null`. Si `provider` es `null`,
`probe.detail` explica el motivo y cómo configurar uno (edge case «sin IA»).

## `POST /api/runs`

Body: `{ "request": string }` — crea la ejecución (FR-001, FR-013).

→ `201 { "id": "uuid", "status": "pending" }`
→ `409 { "code": "RUN_IN_PROGRESS", "error": "Ya hay una ejecución en curso…" }`
→ `422 { "code": "EMPTY_REQUEST", … }` (petición vacía: ni siquiera llega al LLM)
→ `503 { "code": "NO_LLM_PROVIDER", … }` (sin proveedor configurado)

## `GET /api/runs?limit=20`

Historial (US2) → `200`:
```json
{ "runs": [ { "id", "request", "status", "created_at", "finished_at" } ] }
```

## `GET /api/runs/[id]?after=<activityId>`

Detalle para polling (SC-002). `after` opcional: solo actividad con id mayor
(incremental).

→ `200`:
```json
{
  "run": { "id", "request", "status", "step", "cycles_used", "max_cycles",
           "final_report", "error_message" },
  "tasks": [ { "id", "seq", "description", "status", "attempts",
               "last_failure_reason", "result_summary" } ],
  "activities": [ { "id", "task_id", "agent", "kind", "content",
                    "duration_ms", "created_at" } ]
}
```
→ `404 { "code": "NOT_FOUND" }`

## `POST /api/runs/[id]/advance`

Ejecuta el **siguiente paso** del motor (D2). Idempotente por diseño: si la
ejecución no está en `pending`/`running`, no hace nada y devuelve el estado actual.

→ `200`: mismo payload que `GET /api/runs/[id]`
→ `409 { "code": "RUN_NOT_ACTIVE" }` si ya terminó (el cliente deja de llamar)
→ `503 { "code": "NO_LLM_PROVIDER" }` si el proveedor cayó a mitad

## `POST /api/sandbox/reset`

Restablece la mini-web al estado semilla (D9). Solo sin ejecución activa.
→ `200 { "ok": true, "files": 5 }`
→ `409 { "code": "RUN_IN_PROGRESS" }`

## `GET /api/sandbox/files` y `GET /api/sandbox/files/[path]`

Lista y contenido de la mini-web actual (alimenta la vista `/preview` y el panel
de cambios de Develop).

## Contrato de pasos del motor (interno, `lib/engine`)

`advance(runId)` ejecuta exactamente uno de estos pasos y persiste el resultado:

| Paso | Acción | Siguiente |
|---|---|---|
| `orchestrate` | Orquestador descompone la petición en `tasks` (o rechaza) | `develop` / fin `rejected` |
| `develop` | Develop trabaja la tarea `current_task_id` sobre el sandbox | `test` |
| `test` | Testing: checks deterministas + veredicto (D5) | `develop` (siguiente tarea o reintento) / `report` |
| `report` | Informe final, estado terminal, `finished_at` | — (terminal) |

Cada paso registra sus `activities` (FR-008) antes de responder.
