# Feature Specification: Centro de control (dashboard) y modo oscuro

**Feature Branch**: `002-control-panel`
**Created**: 2026-11-23
**Status**: Draft
**Input**: Mejora QoL propuesta por el usuario: un panel único para verlo y
gestionarlo todo (nueva petición + ejecución activa + historial + estado del
sistema) y modo oscuro. No altera ningún requisito del encargo; reorganiza la UI.

## User Scenarios & Testing

### User Story 1 - Centro de control como portada (Priority: P1)

Al entrar, el usuario ve en una sola pantalla: el formulario para lanzar una
petición, la ejecución activa (si la hay) con el agente trabajando y el progreso
de sus tareas en vivo, las últimas ejecuciones con su estado, y el estado del
sistema (proveedor de IA, sandbox limpio/sucio, acceso a preview y restablecer).
Ya no hace falta saltar entre páginas para entender qué está pasando.

**Why this priority**: Es la primera impresión del revisor; condensa la demo.

**Independent Test**: Abrir `/` con una ejecución en curso y comprobar que la
tarjeta avanza en vivo; sin ejecución activa, ver formulario + historial + estado.

**Acceptance Scenarios**:

1. **Given** sin ejecución activa, **When** abro `/`, **Then** veo el formulario,
   las últimas ejecuciones y el estado del sistema sin navegar a otras páginas.
2. **Given** una ejecución activa, **When** abro `/`, **Then** la tarjeta de la
   ejecución muestra agente activo, progreso de tareas y avanza sola (conduce el
   motor igual que la página de detalle).
3. **Given** el sandbox modificado por agentes, **When** miro la tarjeta de
   sistema, **Then** indica «con cambios» y ofrece restablecer (deshabilitado
   mientras haya ejecución activa).

### User Story 2 - Modo oscuro (Priority: P2)

El usuario puede alternar entre tema claro y oscuro desde la cabecera. La
preferencia persiste entre visitas y se aplica sin parpadeo al cargar.

**Why this priority**: QoL pura; mejora la presentación en pantallas oscuras.

**Independent Test**: Alternar el tema, recargar y comprobar que persiste y no
hay flash de tema incorrecto.

**Acceptance Scenarios**:

1. **Given** tema claro, **When** pulso el toggle, **Then** toda la app pasa a
   oscuro (fondos, textos, tarjetas, badges) y al recargar sigue oscuro.
2. **Given** primera visita, **When** cargo cualquier página, **Then** se
   respeta la preferencia del sistema operativo sin flash.

## Requirements

### Functional Requirements

- **FR-001**: `/` MUST ser el centro de control: formulario de petición,
  ejecución activa en vivo, historial reciente (≥5) y tarjeta de sistema.
- **FR-002**: La tarjeta de ejecución activa MUST conducir el motor (advance)
  igual que la página de detalle, y enlazar al detalle completo.
- **FR-003**: La tarjeta de sistema MUST mostrar proveedor de IA + sonda y el
  estado del sandbox (limpio / con cambios de agentes + nº de ficheros), con
  acciones de ver preview y restablecer (409 si hay ejecución activa).
- **FR-004**: Las páginas existentes (`/ejecucion/[id]`, `/historial`,
  `/preview`) MUST seguir funcionando como detalle.
- **FR-005**: La app MUST ofrecer toggle claro/oscuro persistente
  (localStorage), con detección de preferencia del SO en la primera visita y
  sin flash de tema al cargar (script inline pre-paint).
- **FR-006**: Todos los componentes MUST tener variantes `dark:` legibles
  (contraste suficiente en badges y estados).

### Key Entities

- **Estado del sandbox**: limpio (idéntico a la semilla) o con cambios
  (ficheros tocados por alguna ejecución o número distinto al de la semilla).

## Success Criteria

- **SC-001**: Las 4 áreas de información visibles en `/` sin scroll lateral ni
  navegación intermedia (viewport ≥1280px).
- **SC-002**: La tarjeta de ejecución activa refleja cambios en <2 s (mismo
  driver que el detalle).
- **SC-003**: El cambio de tema es instantáneo, persiste 12 meses y no produce
  flash en recarga.

## Assumptions

- `/historial` se mantiene como lista completa; el dashboard muestra las 6 más
  recientes.
- El driver de ejecución se extrae a un hook compartido (dashboard y detalle).
- Tema por defecto: el del sistema operativo; el toggle pisa la preferencia.
