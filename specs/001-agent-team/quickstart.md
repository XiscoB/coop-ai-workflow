# Quickstart: validación end-to-end (Phase 1)

Guía de validación ejecutable de la feature. Mapea cada escenario con los Success
Criteria de `spec.md`. No incluye código de implementación (eso va en `tasks.md`).

## Prerequisitos

- Node 22+, una base de datos Postgres gratuita en [Neon](https://neon.tech)
  (copiar el connection string) y, para el modo local,
  [Ollama](https://ollama.com) con un modelo (`ollama pull qwen2.5-coder`).
- `.env.local` creado desde `.env.example` con: `DATABASE_URL`, `AUTH_SECRET`,
  `APP_USER`, `APP_PASSWORD`, y `LLM_MODE=auto` (detectará Ollama si está
  arrancado).

## Arranque local

```bash
npm install
npm run db:push     # crea tablas y siembra la mini-web sandbox
npm run dev         # http://localhost:3000
```

## Escenarios de validación

### V1. Acceso protegido (FR-012)

1. Abrir `/` sin sesión → redirige a `/login`.
2. Login con la credencial de prueba → entra a la pantalla principal.
3. **Esperado**: ninguna ruta `/api/*` responde sin cookie (probar con curl → 401).

### V2. Proveedor de IA visible y modos (FR-009, FR-010, SC-004)

1. Con Ollama arrancado y sin `LLM_API_KEY` → la cabecera muestra
   «Proveedor: Ollama local (modelo)». `GET /api/llm/status` → `probe.ok: true`.
2. Parar Ollama, poner `LLM_API_KEY` válida (DeepSeek, Kimi…) → reiniciar →
   muestra «API externa». (En Vercel solo aplica este modo: documentar.)
3. Sin ninguno → banner «IA no configurada» con instrucciones; el botón de enviar
   petición queda deshabilitado y `POST /api/runs` responde `503 NO_LLM_PROVIDER`.
4. **SC-004**: todo este escenario con Ollama tiene coste 0.

### V3. Bucle completo (US1, SC-001, SC-002, SC-006)

1. En `/`, enviar: «Añade una página de contacto a la web».
2. **Esperado (SC-002)**: sin recargar, se ven aparecer las tareas del Orquestador
   y sus cambios de estado con ≤2 s de retraso; se ve qué agente trabaja en cada
   momento.
3. **Esperado**: si Testing devuelve algo, la tarea muestra el motivo y Develop la
   retoma; `cycles_used` sube. Nunca pasa de `max_cycles` (5): al límite, estado
   `completed_with_failures` + informe de lo que quedó fallando (SC-006).
4. Al terminar: estado `completed`, informe final visible, y `/preview` muestra la
   web con la página de contacto enlazada desde la home (FR-014).
5. Cronometrar: petición sencilla < 5 min (SC-001).

### V4. Concurrencia y errores (FR-013, edge cases)

1. Con una ejecución en curso, enviar otra petición → `409 RUN_IN_PROGRESS` y
   mensaje claro.
2. Enviar petición vacía → `422` sin crear ejecución.
3. Enviar «háckeme el pentagono» (fuera de alcance) → el Orquestador la rechaza:
   ejecución `rejected` con explicación, sin tareas.
4. Simular caída del LLM a mitad (parar Ollama durante una ejecución) → tras los
   reintentos, ejecución en `error` con motivo visible, conservada en historial.
5. Cerrar la pestaña a mitad y reabrir la URL de la ejecución → se ve el estado
   actual y continúa al pulsar «reanudar».

### V5. Historial (US2, SC-003)

1. Completar una ejecución, cerrar sesión, reiniciar el servidor, entrar de nuevo.
2. `/historial` lista la ejecución con estado y fecha; al entrar se ven tareas,
   actividad completa de cada agente e informe final.

### V6. Sandbox restablecible (D9)

1. Tras una ejecución que modificó la web, pulsar «Restablecer sandbox».
2. **Esperado**: la mini-web vuelve al estado semilla (sin página de contacto) y
   `/preview` lo refleja.

### V7. Despliegue (entregable)

1. Repo en GitHub → importar en Vercel → configurar env (`DATABASE_URL`,
   `AUTH_SECRET`, `APP_USER`, `APP_PASSWORD`, `LLM_API_*` si se quiere demo cloud).
2. **Esperado**: la URL pública pide login y supera V3 con la API externa.
3. Verificar: ningún `.env*` en `git ls-files`; las keys no aparecen en el bundle
   del navegador (constitución III).

## Tests automatizados

```bash
npm test            # Vitest: unit (llm, checks, sandbox) + engine con LLM mockeado
npm run build       # quality gate: build de producción en verde
```
