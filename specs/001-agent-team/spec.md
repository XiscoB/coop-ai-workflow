# Feature Specification: Equipo de 3 agentes de IA (Orquestador, Develop, Testing)

**Feature Branch**: `001-agent-team`

**Created**: 2026-11-23

**Status**: Draft

**Input**: User description: "Construye un pequeño equipo de 3 agentes de IA que trabajen juntos: Orquestador (recibe una petición, la divide en tareas y las reparte), Develop (hace las tareas de desarrollo) y Testing (comprueba lo hecho por Develop y devuelve lo que falla, hasta que todo pasa). En pantalla se ve qué hace cada agente y en qué estado está cada tarea. Ver `docs/requisitos.md`."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Lanzar una petición y verla completar de principio a fin (Priority: P1)

El usuario escribe una petición en lenguaje natural (por ejemplo «añade una página de
contacto a esta web») y la envía. El Orquestador la descompone en tareas visibles,
las asigna a Develop, que las ejecuta una a una; Testing revisa el resultado y, si
algo falla, lo devuelve a Develop con el motivo. El ciclo se repite hasta que todo
pasa (o se agota el número de ciclos). Durante todo el proceso el usuario ve en
pantalla qué agente está trabajando, qué está haciendo y el estado de cada tarea.
Al terminar, se muestra el resultado final y un resumen de lo realizado.

**Why this priority**: Es el núcleo del encargo. Sin este bucle visible no hay
producto; todo lo demás es complemento.

**Independent Test**: Enviar una petición sencilla desde la pantalla principal y
observar cómo se crean las tareas, cambian de estado, el bucle Develop↔Testing
itera y la ejecución termina con un resultado. Entrega valor por sí sola: demuestra
el equipo de agentes funcionando.

**Acceptance Scenarios**:

1. **Given** la app abierta con un servicio de IA configurado, **When** el usuario
   envía «añade una página de contacto a esta web», **Then** aparece la ejecución en
   curso con la lista de tareas creadas por el Orquestador y el estado de cada una.
2. **Given** una ejecución en curso, **When** Develop completa una tarea, **Then**
   su estado cambia a completada y Testing pasa a revisarla, visible en pantalla sin
   recargar la página.
3. **Given** Testing detecta un fallo, **When** devuelve la tarea, **Then** la tarea
   vuelve a Develop con el motivo del fallo visible, y el ciclo continúa hasta que
   todo pasa o se alcanza el límite de ciclos.
4. **Given** todas las tareas verificadas, **When** la ejecución termina, **Then**
   se muestra el resultado final (qué se hizo y dónde puede verse) y el estado
   global «completada».

---

### User Story 2 - Consultar el historial de ejecuciones anteriores (Priority: P2)

El usuario puede abrir una lista de ejecuciones pasadas, entrar en cualquiera y ver
sus tareas, los estados finales, la actividad registrada de cada agente y el
resultado. Nada se pierde al recargar la página o volver otro día.

**Why this priority**: La persistencia es requisito implícito del encargo (base de
datos gratuita) y da credibilidad a la demo: el revisor puede abrir ejecuciones ya
hechas sin gastar ni una llamada de IA.

**Independent Test**: Completar (o sembrar) una ejecución, cerrar la app, volver a
abrirla y comprobar que la ejecución y todo su detalle siguen consultables.

**Acceptance Scenarios**:

1. **Given** una ejecución terminada, **When** el usuario abre el historial,
   **Then** la ve listada con su petición, estado final y fecha.
2. **Given** el historial, **When** el usuario entra en una ejecución, **Then** ve
   sus tareas con estados finales y el registro de actividad de cada agente.

---

### User Story 3 - Elegir el servicio de IA: local o API externa (Priority: P3)

El usuario (o quien despliega la app) elige de dónde sale la inteligencia: un modelo
local gratuito o una API externa con su propia key (cualquier proveedor compatible
con OpenAI). La app detecta lo disponible en modo automático, muestra siempre qué
proveedor está activo y, si no hay ninguno, lo explica claramente en lugar de
fallar.

**Why this priority**: Permite cumplir «no hace falta gastar dinero» (modo local) y
dar calidad en producción (modo API). No es núcleo del bucle, pero condiciona que la
demo sea gratuita y que nadie queme las keys del despliegue.

**Independent Test**: Arrancar la app sin keys y con un modelo local activo:
funciona y muestra «local» como proveedor. Configurar una API key válida: el
proveedor activo cambia y se muestra. Sin ninguno: aviso claro y las peticiones
quedan en espera explicadas.

**Acceptance Scenarios**:

1. **Given** modo automático con modelo local disponible y sin API key, **When** la
   app arranca, **Then** el proveedor activo mostrado es el local.
2. **Given** modo automático sin modelo local pero con API key configurada, **When**
   la app arranca, **Then** el proveedor activo es la API externa.
3. **Given** ningún proveedor disponible, **When** el usuario intenta lanzar una
   petición, **Then** se le explica el motivo y cómo configurar uno; no se produce
   un error técnico sin explicar.

---

### Edge Cases

- **Sin servicio de IA disponible**: banner/aviso claro; las peticiones nuevas se
  rechazan con explicación (no se encolan mudas ni explotan).
- **El servicio de IA falla a mitad de ejecución**: reintentos automáticos; si se
  agotan, la ejecución queda en estado «error» con el motivo visible y conservada en
  el historial.
- **Testing nunca da el visto bueno**: límite de ciclos Develop↔Testing (por
  defecto 5); al agotarse, la ejecución termina como «completada con fallos» con el
  informe de lo que quedó fallando.
- **Petición vacía o ininteligible**: el Orquestador la rechaza con una explicación
  en lenguaje natural, sin crear tareas.
- **Petición fuera de alcance** (algo que no sea modificaciones de la web de
  ejemplo): el Orquestador lo indica y no genera tareas imposibles.
- **Dos peticiones a la vez**: una ejecución activa como máximo; la segunda se
  rechaza indicando que hay una en curso (simplicidad de demo).
- **Pérdida de conexión del usuario**: la ejecución queda en pausa en el último
  paso completado (el motor avanza por pasos persistidos); al volver a entrar, el
  usuario ve el estado actual y puede reanudarla.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: El sistema MUST aceptar peticiones en lenguaje natural desde una
  pantalla principal y crear una ejecución por petición.
- **FR-002**: El Orquestador MUST descomponer cada petición aceptada en una lista de
  tareas concretas, visibles en pantalla con su estado individual.
- **FR-003**: Develop MUST ejecutar las tareas asignadas, produciendo cambios
  reales y verificables sobre la mini-web de ejemplo (sandbox) incluida en la
  propia app: una web pequeña preexistente que los agentes modifican de verdad
  (añadir páginas, secciones, estilos…), de modo que Testing pueda comprobar
  el resultado real.
- **FR-004**: Testing MUST revisar el trabajo de Develop tras cada tarea (o bloque)
  y emitir un veredicto: pasa / no pasa con el motivo del fallo.
- **FR-005**: El sistema MUST repetir el ciclo Develop↔Testing hasta que todo pase
  o se alcance un límite de ciclos configurable (por defecto 5).
- **FR-006**: La pantalla MUST mostrar en todo momento, sin recarga manual: agente
  activo, acción en curso y estado de cada tarea (pendiente, en curso, en revisión,
  fallada, completada).
- **FR-007**: El sistema MUST persistir ejecuciones, tareas, actividad de agentes y
  resultados, consultables después en un historial.
- **FR-008**: El sistema MUST registrar cada acción de agente (qué hizo, cuándo,
  resultado, latencia) asociada a su ejecución y tarea.
- **FR-009**: El sistema MUST funcionar con un servicio de IA local gratuito y, de
  forma alternativa, con una API externa mediante key, seleccionable por
  configuración (modos: automático, local, API).
- **FR-010**: El proveedor de IA activo MUST ser visible en la interfaz; sin
  proveedor disponible, el sistema MUST explicarlo y rechazar nuevas peticiones con
  instrucciones de configuración.
- **FR-011**: Las claves de API MUST permanecer solo en el servidor (nunca
  expuestas al navegador ni al repositorio).
- **FR-012**: El acceso a la app MUST exigir un login sencillo con una
  credencial compartida (usuario/contraseña de prueba), para proteger el gasto
  de la API key del despliegue público; la credencial se entrega al revisor
  como parte de la entrega.
- **FR-013**: El sistema MUST limitar a una ejecución activa simultánea, rechazando
  nuevas peticiones mientras haya otra en curso con un mensaje claro.
- **FR-014**: El resultado final de una ejecución completada MUST mostrar qué se
  hizo y cómo comprobarlo (p. ej. enlace o vista del resultado).

### Key Entities *(include if feature involves data)*

- **Ejecución (Run)**: una petición procesada de principio a fin. Atributos:
  petición original, estado global (en curso, completada, completada con fallos,
  error), fechas, número de ciclos consumidos.
- **Tarea**: unidad de trabajo creada por el Orquestador. Atributos: descripción,
  agente asignado, estado, orden, número de intentos, motivo del último fallo.
- **Agente**: rol dentro del equipo (Orquestador, Develop, Testing) con su estado
  actual (inactivo, trabajando en X).
- **Actividad (Evento)**: registro de una acción de un agente dentro de una
  ejecución (mensaje, herramienta usada, resultado, latencia). Alimenta la
  pantalla en vivo y el historial.
- **Veredicto**: resultado de una revisión de Testing sobre una tarea o sobre la
  ejecución completa (pasa / no pasa + motivos).
- **Configuración de IA**: modo, proveedor activo, modelo y credenciales (solo
  servidor).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Una petición sencilla («añade una página de contacto») llega a
  resultado final en menos de 5 minutos en el entorno de demo.
- **SC-002**: El 100% de los cambios de estado de tareas y agentes se reflejan en
  pantalla en menos de 2 segundos, sin recargar la página.
- **SC-003**: El 100% de las ejecuciones quedan registradas y son consultables en
  el historial con su detalle completo (tareas, actividad, resultado).
- **SC-004**: La app completa una ejecución entera sin coste alguno usando
  únicamente el servicio de IA local y planes gratuitos de infraestructura.
- **SC-005**: Un usuario nuevo entiende qué está haciendo cada agente y el estado
  de cada tarea sin leer documentación (pantalla autoexplicativa).
- **SC-006**: Ninguna ejecución supera el límite de ciclos (5 por defecto) ni deja
  estados inconsistentes al terminar por límite: siempre muestra informe final.

## Assumptions

- La infraestructura se limita a planes gratuitos (hosting y base de datos); el
  servicio de IA puede ser local (coste cero) o una API externa con key del usuario.
- Una ejecución activa simultánea es suficiente para la demo (no hay concurrencia).
- El límite de ciclos Develop↔Testing por defecto es 5; configurable.
- La interfaz y los mensajes de los agentes se presentan en español.
- «Usuario y contraseña de prueba si hacen falta» (del encargo): hacen falta —
  la app pública va detrás de un login sencillo con credencial compartida.
- La mini-web sandbox es parte de la app: los cambios de Develop son reales y
  el resultado es comprobable tras cada ejecución.
- No se requiere gestión de usuarios, roles ni multi-tenant: es una demo pública.
