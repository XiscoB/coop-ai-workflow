# Tasks: Centro de control y modo oscuro

**Input**: `spec.md` de 002-control-panel. Implementación directa (feature de UI,
sin cambios de modelo ni de motor).

## Tasks

- [x] T001 Extraer el driver de ejecución de `components/run-view.tsx` a un hook
  compartido `components/use-run-driver.ts` (carga inicial + bucle advance/pausa)
  usado por la página de detalle y por la tarjeta del dashboard [FR-002]
- [x] T002 Extraer el formulario de petición de `app/page.tsx` a
  `components/request-form.tsx` (mismo comportamiento: 409 → enlace a activa,
  banner sin proveedor)
- [x] T003 Crear `GET /api/sandbox/status` en `app/api/sandbox/status/route.ts`:
  `{ files, seedFiles, dirty, modifiedPaths }` comparando con la semilla
  (`lib/sandbox/seed.ts`) [FR-003]
- [x] T004 Crear `components/active-run-card.tsx`: tarjeta en vivo (agente
  activo, progreso de tareas, ciclos, enlace al detalle) usando use-run-driver
- [x] T005 Crear `components/recent-runs.tsx`: últimas 6 ejecuciones con estado
  (fetch `GET /api/runs?limit=6`, enlace a `/historial` para ver todas)
- [x] T006 Crear `components/sandbox-status.tsx`: estado del sandbox + proveedor
  (reusa `/api/llm/status`), enlace a `/preview` y botón restablecer (deshabilitado
  con ejecución activa, muestra el 409) [FR-003]
- [x] T007 Reescribir `app/page.tsx` como dashboard componiendo T002+T004+T005+T006 [FR-001]
- [x] T008 Modo oscuro: `@custom-variant dark` en `app/globals.css`, script inline
  pre-paint en `app/layout.tsx` (localStorage > preferencia SO), y
  `components/theme-toggle.tsx` en la cabecera [FR-005]
- [x] T009 Variantes `dark:` en todos los componentes y páginas (layout, page,
  run-view, historial, login, preview, provider-status, badges) [FR-006]
- [x] T010 Test del estado del sandbox en `tests/sandbox/status.test.ts` (limpio,
  modificado, fichero de más) extrayendo la lógica a `lib/sandbox/status.ts`
- [x] T011 Gates: `npm test` y `npm run build` en verde; verificación visual
  manual del dashboard en claro y oscuro

## Notes

- Sin cambios en BD, motor ni contratos existentes (salvo endpoint nuevo de T003).
- La página `/historial` se mantiene como lista completa.
