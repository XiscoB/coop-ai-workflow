# Tasks: Recuperación de ejecuciones y timeline

- [x] T001 Añadir `sandbox_snapshot` (jsonb, nullable) a `runs` en
  `lib/db/schema.ts`, al patch de `updateRun` en `lib/store.ts` y al store en
  memoria `lib/testing/memory-store.ts`; capturar la foto en el paso
  `orchestrate` de `lib/engine/runner.ts` (tras `ensureSandboxSeeded`) [FR-001]
- [x] T002 Crear `lib/engine/recovery.ts`: `resumeRun(store, runId)` y
  `revertRun(store, runId)` con las reglas de FR-002/FR-003
- [x] T003 Endpoints `POST /api/runs/[id]/resume` y `POST /api/runs/[id]/revert`
  (409/422 según spec) [FR-002, FR-003]
- [x] T004 Botones en `components/run-view.tsx`: «Reintentar» (status error,
  reanuda y el driver continúa) y «Revertir cambios» (terminal con snapshot)
  [FR-004]
- [x] T005 Timeline en `components/run-view.tsx`: hora HH:MM:SS por evento y
  riel visual cronológico [FR-005]
- [x] T006 Tests en `tests/engine/recovery.test.ts`: resume desde error completa
  conservando trabajo; revert restaura el sandbox; guardas 409/422
- [x] T007 Gates: `npm test`, `npm run build` y verificación manual en vivo
