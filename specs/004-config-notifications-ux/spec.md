# Feature Specification: Configuración, notificaciones y pulido UX (cierre)

**Feature Branch**: `004-config-notifications-ux`
**Created**: 2026-11-23
**Status**: Draft
**Input**: Tanda final de mejoras del usuario: menú de configuración (proveedor
de IA + key solo local, prompts por agente editables), iconos de tema, fechas en
«Últimas ejecuciones», TTS al terminar/error + pestaña de notificaciones + logs,
panel de actividad más ancho y cronología inversa con fechas multi-día, informe
final arriba, estados de carga con spinner, botones con spinner anti doble-clic,
cabecera de estado anclada, informe oculto tras reanudar, y página «Acerca de»
con objetivo del repo y posibles mejoras.

## User Scenarios & Testing

### US1 - Configurar el servicio de IA desde la UI, con privacidad (P1)

El usuario abre «Configuración», elige modo (auto/local/api), URL, modelo y pega
su API key. La key se guarda **solo en el servidor** (tabla settings de la BD,
sin variables de entorno) y **nunca se devuelve al navegador**: la UI solo
muestra una versión enmascarada. Al guardar, se re-detecta el proveedor y se ve
el resultado de la sonda.

**Independent Test**: Guardar una key válida y ver el badge cambiar a «API
externa»; recargar y comprobar que la key nunca viaja en ninguna respuesta.

**Acceptance Scenarios**:
1. **Given** ajustes guardados en BD, **When** la app detecta el proveedor,
   **Then** los ajustes de BD tienen prioridad sobre las variables de entorno.
2. **Given** una key guardada, **When** la UI pide la configuración, **Then**
   recibe la key enmascarada (`••••1234`) o nada, jamás la key completa.

### US2 - Prompts por agente editables (P1)

En Configuración, el usuario ve el system prompt efectivo de cada agente
(Orquestador, Develop, Testing), puede modificarlo y guardarlo como override, o
restablecer el valor por defecto. Las ejecuciones nuevas usan el prompt
personalizado.

**Independent Test**: Cambiar el prompt de Testing (p. ej. «sé muy estricto»),
guardar, lanzar una ejecución y verificar que se aplica.

### US3 - Notificaciones, TTS y logs (P2)

Al terminar una ejecución (completada, con fallos o error) la app crea una
notificación (campana en la cabecera con contador de no leídas y panel) y, si el
TTS está activado (por defecto sí, conmutable en Configuración), lo anuncia por
voz con Web Speech API (gratuita, local al navegador). La página «Logs» muestra
los eventos de sistema recientes de todas las ejecuciones.

**Independent Test**: Terminar una ejecución y ver la notificación en la campana
y el evento en «Logs»; desactivar TTS y comprobar que no habla.

### US4 - Pulido de la página de ejecución (P2)

- Informe final (si existe) se muestra **arriba**, bajo la tarjeta de estado.
- La tarjeta de estado queda **anclada** (sticky) al hacer scroll.
- La actividad es más ancha y en **cronología inversa** (lo nuevo arriba, estilo
  Twitter), con hora exacta y fecha cuando el evento es de otro día («ayer» o
  fecha corta).
- Estados de carga con **spinner** y error claro; botones (Reintentar,
  Revertir) con spinner y deshabilitados mientras trabajan.
- Al reanudar una ejecución, el informe final anterior **desaparece** (backend
  lo limpia) hasta que la ejecución termina de nuevo.

**Independent Test**: Abrir una ejecución con informe y actividad de varios días
y comprobar layout, orden y fechas; reanudar y ver que el informe desaparece.

### US5 - Detalles del panel (P3)

- «Últimas ejecuciones» muestra fecha y hora de cada una.
- El toggle de tema usa iconos sol/luna en vez de texto.

### US6 - Página «Acerca de» (P3)

Página pública que explica qué es la app (equipo de 3 agentes, sandbox, modos de
IA, recuperación), el objetivo del repo (demo técnica spec-driven con GitHub
Spec Kit, enlace al repo) y una lista de **posibles mejoras futuras**: eliminar
o editar tareas del plan antes de ejecutarlo (human-in-the-loop), visor de
diffs de los ficheros cambiados, verificación con Playwright, planificación de
los agentes con Spec Kit, concurrencia de ejecuciones, métricas por modelo, etc.

**Independent Test**: Abrir «Acerca de» y ver las tres secciones.

## Requirements

- **FR-001**: Tabla `settings` (key PK, value) con métodos de store
  `getSettings`, `setSetting`, `deleteSetting`. Claves: `llm_mode`,
  `local_llm_base_url`, `local_llm_model`, `llm_api_base_url`, `llm_api_model`,
  `llm_api_key`, `tts_enabled`,
  `prompt_orchestrator`, `prompt_develop`, `prompt_testing`.
- **FR-002**: La configuración efectiva MUST ser: ajuste en BD si existe, si no
  variable de entorno, si no defecto. `GET /api/config` MUST enmascarar la key
  y NUNCA devolverla completa. `POST /api/config` guarda (la key solo si viene
  nueva; cadena vacía o enmascarada = conservar).
- **FR-003**: Los agentes MUST aceptar override de system prompt desde settings
  (`prompt_<agente>`); si no hay override, el prompt por defecto. Los prompts
  por defecto se exportan para mostrarlos en la UI.
- **FR-004**: `GET /api/logs` MUST devolver los eventos de sistema recientes
  (agent=`system`, desc, límite) con enlace a su ejecución.
- **FR-005**: `resumeRun` MUST limpiar `finalReport` al reanudar.
- **FR-006**: Notificaciones en cliente (localStorage + campana con no leídas)
  creadas por el driver al detectar transición a estado terminal; TTS con Web
  Speech API si `tts_enabled` (defecto activado).
- **FR-007**: Layout de ejecución: informe arriba, tarjeta sticky, actividad
  cronológica inversa con fechas multi-día, spinners de carga y en botones.
- **FR-008**: «Acerca de» estática con objetivo, contenido de la app y mejoras
  futuras, también mostrada como **popup de bienvenida en la primera visita**
  (una vez por navegador, localStorage). «Últimas ejecuciones» con fecha/hora.
  Toggle de tema con iconos.

## Success Criteria

- **SC-001**: La API key nunca aparece en ninguna respuesta API ni en el bundle
  del navegador (verificado por inspección).
- **SC-002**: Un prompt personalizado se aplica en la siguiente ejecución.
- **SC-003**: Terminar una ejecución produce notificación + evento en Logs en
  <2 s desde el cambio de estado.
- **SC-004**: Eventos de días distintos se distinguen sin ambigüedad (fecha
  visible cuando no es hoy).

## Assumptions

- Notificaciones y TTS son de cliente (navegador): sin backend nuevo ni push.
- Los ajustes en BD aplican a toda la instancia (no multi-usuario).
- El TTS usa voces del navegador (es-ES si existe); sin dependencias.
