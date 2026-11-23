# Data Model: Equipo de 3 agentes (Phase 1)

Entidades de la spec (FR-007/FR-008) en Drizzle/Postgres. Tipos TS entre
paréntesis. Todas las tablas llevan `created_at` salvo indicación contraria.

## `runs` — Ejecuciones

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | default `gen_random_uuid()` |
| request | text | petición original del usuario (FR-001) |
| status | enum | `pending`, `running`, `completed`, `completed_with_failures`, `error`, `rejected` |
| step | text | siguiente paso del motor (`orchestrate`, `develop`, `test`, `report`) — D2 |
| current_task_id | uuid FK → tasks | tarea en curso (nullable) |
| cycles_used | int | ciclos Develop↔Testing consumidos (FR-005) |
| max_cycles | int | default 5 |
| final_report | text | informe final visible (FR-014), nullable |
| error_message | text | motivo si status=`error` (edge case) |
| provider_snapshot | text | proveedor/modelo usado (auditoría, FR-010) |
| created_at / finished_at | timestamptz | |

**Transiciones de estado**:

```text
pending → running → completed
                  → completed_with_failures   (límite de ciclos agotado)
                  → error                     (LLM caído tras reintentos, fallo interno)
pending → rejected                            (petición vacía/fuera de alcance, FR-013)
```

## `tasks` — Tareas

| Campo | Tipo | Notas |
|---|---|---|
| id | uuid PK | |
| run_id | uuid FK → runs | cascade delete |
| seq | int | orden dentro de la ejecución |
| description | text | descripción creada por el Orquestador (FR-002) |
| acceptance_check | jsonb | comprobación que Testing aplicará (D5), de tipo cerrado: `{"type":"file_exists","path"}` \| `{"type":"element_exists","path","selector"}` \| `{"type":"link_exists","from","to"}`; si el Orquestador no puede expresarla así, `{"type":"llm_review","criterion"}` y manda el veredicto del LLM |
| status | enum | `pending`, `in_progress`, `in_review`, `failed`, `completed` |
| attempts | int | nº de pasadas por Develop (default 0) |
| last_failure_reason | text | motivo devuelto por Testing, nullable |
| result_summary | text | qué hizo Develop al completarla, nullable |
| created_at / completed_at | timestamptz | |

**Transiciones**: `pending → in_progress → in_review → completed`
y `in_review → failed → in_progress` (reintento con el motivo del fallo).

## `activities` — Actividad de agentes

| Campo | Tipo | Notas |
|---|---|---|
| id | bigserial PK | orden natural de inserción |
| run_id | uuid FK → runs | cascade |
| task_id | uuid FK → tasks | nullable (actividad del Orquestador sin tarea) |
| agent | enum | `orchestrator`, `develop`, `testing`, `system` |
| kind | enum | `message`, `tool_call`, `file_change`, `verdict`, `status_change` |
| content | text | texto visible en pantalla (FR-006) |
| detail | jsonb | payload opcional (diff, args de herramienta, veredicto) |
| duration_ms | int | latencia de la acción, nullable (FR-008) |
| created_at | timestamptz | |

Índice `(run_id, id)` para el polling incremental.

## `sandbox_files` — Mini-web (D4)

| Campo | Tipo | Notas |
|---|---|---|
| path | text PK | ruta POSIX (`/index.html`) |
| content | text | contenido íntegro del fichero |
| updated_by_run | uuid FK → runs | última ejecución que lo tocó, nullable |
| updated_at | timestamptz | |

Semilla: contenido de la carpeta `sandbox/` del repo (D9). Acción «restablecer
sandbox»: borra y re-siembra (solo sin ejecución en curso).

## Reglas de validación (de la spec)

- `runs.status = 'running'` ⇒ como máximo UNA fila en toda la tabla (FR-013):
  se garantiza en el `POST /api/runs` (rechazo con 409), no con constraint.
- `tasks.attempts` se incrementa en cada pasada Develop; el contador de ciclos de
  la ejecución sube cuando Testing devuelve una tarea.
- `activities.agent='system'` reservado a eventos del motor (inicio, fin, error).

## Fuera de modelo

- **Sin tabla de usuarios**: credencial compartida por env + cookie HMAC (D6).
- **Sin tabla de configuración de IA**: el proveedor se resuelve por env en cada
  arranque/petición (constitución III; `provider_snapshot` en `runs` deja rastro).
