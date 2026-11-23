# Feature Specification: Recuperación de ejecuciones y timeline de actividad

**Feature Branch**: `003-recovery-timeline`
**Created**: 2026-11-23
**Status**: Draft
**Input**: Tras una ejecución real que terminó en error (LLM caído a mitad), el
usuario pide: botón de reintentar/continuar, opción de revertir cambios, y que la
actividad de agentes muestre un timeline cronológico con fecha/hora.

## User Scenarios & Testing

### User Story 1 - Reanudar una ejecución en error (Priority: P1)

Cuando una ejecución termina en `error` (el servicio de IA falló a mitad), el
usuario ve un botón «Reintentar» que la devuelve a marcha: continúa desde el
paso persistido donde se detuvo, con las tareas falladas por la interrupción
reactivadas (conservando el motivo como feedback para Develop).

**Why this priority**: los errores transitorios del LLM (el caso real observado)
no deben tirar a la basura el trabajo ya hecho.

**Independent Test**: Forzar un error a mitad, pulsar «Reintentar» con el
servicio de IA recuperado y ver la ejecución completar desde donde se detuvo.

**Acceptance Scenarios**:

1. **Given** una ejecución en `error`, **When** pulso «Reintentar», **Then**
   vuelve a `running` y avanza desde su paso persistido; las tareas falladas por
   la interrupción vuelven a pendiente conservando el feedback.
2. **Given** una ejecución no terminal o terminal sin error, **When** se llama a
   resume, **Then** responde 409 sin tocar nada.

### User Story 2 - Revertir los cambios de una ejecución (Priority: P2)

Cada ejecución guarda una foto del sandbox al arrancar. En una ejecución
terminada, el usuario puede pulsar «Revertir cambios» para dejar la web como
estaba antes de esa ejecución.

**Why this priority**: experimentar sin miedo («que podamos quitar fácilmente»).

**Independent Test**: Completar una ejecución que cambia ficheros, revertir y
comprobar que el sandbox vuelve exactamente al estado previo.

**Acceptance Scenarios**:

1. **Given** una ejecución terminada con snapshot, **When** pulso «Revertir»,
   **Then** el sandbox queda idéntico a la foto previa y la tarjeta de sistema
   lo refleja.
2. **Given** otra ejecución activa, **When** intento revertir, **Then** 409 sin
   tocar nada. Revertir una ejecución sin snapshot (anteriores a la feature)
   devuelve 422 explicado.

### User Story 3 - Timeline de actividad (Priority: P3)

El panel de actividad muestra cada evento con su hora exacta (HH:MM:SS) sobre un
riel visual de timeline, en orden cronológico (ya garantizado por inserción).

**Independent Test**: Abrir cualquier ejecución con actividad y ver horas
crecientes de arriba abajo con el riel visual.

## Requirements

- **FR-001**: `runs` MUST persistir una foto del sandbox (`sandbox_snapshot`
  jsonb, nullable) capturada en el paso `orchestrate` tras la siembra.
- **FR-002**: `POST /api/runs/[id]/resume` MUST reactivar ejecuciones en
  `error` o `completed_with_failures`: status `running`, error y finishedAt
  limpiados, **presupuesto de ciclos renovado** (`cycles_used = 0`), tareas
  `failed` reactivadas a `pending` (conservando `lastFailureReason`),
  `currentTaskId` a la primera reactivada, `step` coherente (develop si hay
  tarea, report si no).
- **FR-003**: `POST /api/runs/[id]/revert` MUST restaurar el sandbox desde
  `sandbox_snapshot` solo con la ejecución terminal y sin otra activa.
- **FR-004**: La UI de detalle MUST mostrar «Reintentar» (si `error`) y
  «Revertir cambios» (si terminal con snapshot), y el dashboard reflejar los
  cambios.
- **FR-005**: La actividad MUST mostrar hora exacta por evento y riel de
  timeline, orden cronológico ascendente.
- **FR-006**: El avance de una ejecución MUST ser exclusivo: dos clientes
  (p. ej. dos pestañas) no pueden ejecutar pasos en paralelo. Cerrojo por
  fila (`locked_at`, TTL 120 s); si está ocupada, `advance` responde 409
  `RUN_BUSY` sin tocar nada.

## Success Criteria

- **SC-001**: Una ejecución en error reanudada conserva todo su trabajo previo
  (tareas completadas no se repiten).
- **SC-002**: Revertir deja el sandbox idéntico (mismo contenido por fichero) a
  la foto previa de la ejecución.
- **SC-003**: El 100% de los eventos muestran hora en orden ascendente.

## Assumptions

- «Añadir modificaciones» no requiere mecanismo nuevo: el sandbox persiste entre
  ejecuciones; una nueva petición ya opera sobre lo anterior.
- Las ejecuciones anteriores a esta feature no tienen snapshot: no se pueden
  revertir (422 explicado), pero sí reanudar si están en `error`.
