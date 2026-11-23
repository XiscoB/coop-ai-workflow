# Tasks: Configuración, notificaciones y pulido UX

- [x] T001 Tabla `settings` en `lib/db/schema.ts` + métodos `getSettings`,
  `setSetting`, `deleteSetting` en `lib/store.ts`, `lib/db/store.ts` y
  `lib/testing/memory-store.ts`; migración manual CREATE TABLE en Neon [FR-001]
- [x] T002 `getEffectiveConfig(store)` en `lib/config.ts` (BD > env > defecto) y
  uso en `app/api/llm/status`, `app/api/runs/route.ts` (POST) y
  `app/api/runs/[id]/advance/route.ts` [FR-002]
- [x] T003 `GET/POST /api/config` (settings efectivos, key enmascarada al leer,
  conservar key si vacía/enmascarada al escribir) [FR-002]
- [x] T004 Overrides de prompt: exportar `DEFAULT_SYSTEM_PROMPT` en
  `lib/agents/*.ts`, parámetro opcional de prompt en cada agente, y runner lee
  `prompt_<agente>` de settings vía store [FR-003]
- [x] T005 `GET/POST /api/config/prompts` (efectivo + default + flag custom por
  agente; POST guarda override o lo borra con null) [FR-003]
- [x] T006 `listSystemActivities(limit)` en store (+ memoria) y
  `GET /api/logs`; página `app/logs/page.tsx` con enlace a cada ejecución [FR-004]
- [x] T007 `resumeRun` limpia `finalReport` + test [FR-005]
- [x] T008 `components/notifications.ts` (store localStorage + evento),
  `components/notification-bell.tsx` (campana + no leídas + panel), y creación de
  notificación + TTS (Web Speech API, si `tts_enabled`) en
  `components/use-run-driver.ts` al detectar transición a terminal [FR-006]
- [x] T009 Página `app/configuracion/page.tsx` + secciones cliente:
  servicio de IA (modo/url/modelo/key enmascarada + guardar + resultado sonda),
  toggle TTS, y prompts por agente (textarea + guardar/restablecer) [US1, US2]
- [x] T010 Pulido run-view: informe final arriba, tarjeta de estado sticky,
  actividad inversa con riel y `formatEventTime` (hoy HH:MM:SS, ayer, fecha
  corta), spinner de carga y error, spinner en botones [US4, FR-007]
- [x] T011 `components/format.ts` con `formatEventTime` y `formatDateTime`;
  datetime en `components/recent-runs.tsx`; iconos sol/luna en
  `components/theme-toggle.tsx` [US5]
- [x] T012 Página `app/acerca-de/page.tsx` (qué es, objetivo del repo, posibles
  mejoras) + enlaces de navegación (Configuración, Logs, Acerca de) en
  `app/layout.tsx` [US6]
- [x] T013 Tests: settings en memoria, getEffectiveConfig (BD > env), resume
  limpia finalReport; `npm test` + `npm run build` en verde
