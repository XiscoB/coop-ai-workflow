# Implementation Plan: Equipo de 3 agentes de IA (Orquestador, Develop, Testing)

**Branch**: `001-agent-team` | **Date**: 2026-11-23 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-agent-team/spec.md`

## Summary

Equipo de 3 agentes de IA (Orquestador → Develop → Testing en bucle) que procesa
peticiones en lenguaje natural sobre una mini-web sandbox, con visibilidad en vivo
del agente activo y del estado de cada tarea, historial persistido y doble modo de
IA (local Ollama / API compatible con OpenAI). App Next.js desplegada en Vercel con
base de datos gratuita (Neon). Las ejecuciones duran minutos, así que el motor
avanza por **pasos** (máquina de estados persistida): cada petición HTTP ejecuta un
paso de agente, compatible con los límites de duración del plan gratuito de Vercel.

## Technical Context

**Language/Version**: TypeScript 5, Node 22, Next.js 15+ (App Router)

**Primary Dependencies**: Next.js, React 19, Tailwind CSS 4, Drizzle ORM +
`@neondatabase/serverless`. Sin SDKs de LLM: `fetch` directo (ver
`docs/arquitectura-llm.md`). Sin framework de auth: cookie firmada propia.

**Storage**: Neon Postgres (tier gratuito) vía driver serverless; sandbox como
sistema de archivos virtual en BD (el filesystem de Vercel es de solo lectura).

**Testing**: Vitest (unit + integración del motor, proveedores LLM y checks).

**Target Platform**: Vercel (producción, plan Hobby) y Node local (desarrollo con
Ollama).

**Project Type**: web-application (Next.js full-stack, todo server-side).

**Performance Goals**: cambios de estado visibles en <2 s (polling de 1.5 s);
una petición sencilla completada en <5 min; pasos de agente individuales <60 s
(límite de función serverless del plan Hobby).

**Constraints**: coste cero (constitución II); cero secretos en repo y keys solo
server-side (III); proveedor de IA intercambiable con degradación elegante (IV);
una ejecución activa simultánea; límite de 5 ciclos Develop↔Testing por defecto.

**Scale/Scope**: demo pública — decenas de ejecuciones, ~10 tablas/entidades, una
sola app (no monorepo), login de credencial compartida.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principio | Veredicto | Evidencia |
|---|---|---|
| I. Spec-Driven Development | PASS | Este plan nace de `spec.md` validada; sigue tasks → implement |
| II. Coste cero | PASS | Vercel Hobby + Neon free + Ollama local; ningún servicio de pago requerido |
| III. Cero secretos | PASS | `.env.example` con placeholders; keys en env server-side; `fetch` LLM solo en Route Handlers/Server Actions |
| IV. Proveedor intercambiable | PASS | Capa `lib/llm/` con detección auto/local/api según `docs/arquitectura-llm.md` |
| V. Visibilidad de agentes | PASS | Tabla `activities` + polling 1.5 s; estados de tarea persistidos |
| VI. Simplicidad | PASS | Sin ORM pesado (Drizzle), sin NextAuth, sin SDKs de LLM, sin colas externas; motor por pasos en vez de workers |

Sin violaciones que justificar. Re-check post-diseño (Phase 1): PASS — el diseño
final (data-model, contracts, quickstart) no introduce dependencias ni servicios
nuevos que rompan los principios.

## Project Structure

### Documentation (this feature)

```text
specs/001-agent-team/
├── plan.md              # Este archivo
├── research.md          # Phase 0 — decisiones técnicas
├── data-model.md        # Phase 1 — entidades y estados
├── quickstart.md        # Phase 1 — guía de validación end-to-end
├── contracts/
│   └── api.md           # Phase 1 — contratos de las rutas HTTP
└── tasks.md             # Phase 2 (/skill:speckit-tasks)
```

### Source Code (repository root)

```text
app/                        # Next.js App Router
├── page.tsx                # Pantalla principal: nueva petición + ejecución en vivo
├── login/page.tsx          # Login de credencial compartida
├── historial/page.tsx      # US2: lista de ejecuciones
├── ejecucion/[id]/page.tsx # Detalle en vivo / histórico de una ejecución
├── preview/page.tsx        # Render de la mini-web sandbox (estado actual)
└── api/
    ├── login/route.ts      # POST — valida credencial, fija cookie firmada
    ├── runs/route.ts       # GET lista, POST nueva ejecución (FR-001, FR-013)
    ├── runs/[id]/route.ts  # GET detalle (tareas + actividad, para polling)
    ├── runs/[id]/advance/route.ts  # POST — ejecuta el siguiente paso del motor
    └── llm/status/route.ts # GET proveedor activo / sonda (FR-010)

lib/
├── llm/                    # Constitución IV: abstracción de proveedor
│   ├── index.ts            # detección de proveedor (auto/local/api) + sonda
│   ├── ollama.ts           # POST /api/generate, format json
│   ├── openai-compatible.ts# POST /chat/completions, fallback de parámetros 400
│   └── complete.ts         # reintentos backoff 2/5/10, parsing defensivo
├── agents/
│   ├── orchestrator.ts     # descompone petición en tareas (FR-002)
│   ├── develop.ts          # ejecuta tareas sobre el sandbox (FR-003)
│   └── testing.ts          # veredictos pasa/no pasa + checks deterministas (FR-004)
├── engine/
│   ├── runner.ts           # máquina de estados: siguiente paso de una ejecución
│   └── steps.ts            # pasos: orchestrate, develop, test, report
├── sandbox/
│   ├── fs.ts               # sistema de archivos virtual en BD (read/write/list)
│   ├── checks.ts           # checks deterministas: HTML parsea, enlaces existen…
│   └── seed.ts             # mini-web inicial (se siembra desde sandbox/)
├── auth.ts                 # cookie firmada (HMAC) + middleware de sesión
├── db/
│   ├── schema.ts           # Drizzle: runs, tasks, activities, sandbox_files
│   └── client.ts           # conexión Neon serverless
└── config.ts               # lectura de env (LLM_MODE, keys, DATABASE_URL…)

sandbox/                    # Ficheros semilla de la mini-web (index.html, styles…)
middleware.ts               # Protege todo salvo /login y assets (FR-012)
tests/                      # Vitest: unit (llm, sandbox, checks) + integración (engine)
```

**Structure Decision**: app Next.js única (no monorepo, no backend separado): el
encargo exige Next.js y Vercel, y todo el trabajo pesado es server-side en Route
Handlers. El motor de agentes vive en `lib/` (fuera de `app/`) para ser testeable
con Vitest sin levantar Next.

## Complexity Tracking

Sin violaciones de la constitución: tabla no aplicable.
