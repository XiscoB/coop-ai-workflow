# Cómo usamos la IA para construir este proyecto

## Herramienta: Kimi Code

El encargo sugiere Claude Code o Codex. El proyecto se construyó con
**[Kimi Code](https://www.kimi.com/code)**, un agente de codificación en CLI de
la misma categoría (agentic coding en terminal: edición de archivos, ejecución
de comandos y razonamiento sobre el repositorio). Lo elegimos porque:

- Cubre el mismo flujo que Claude Code/Codex: lee el codebase, propone planes,
  edita, ejecuta tests y depura de forma autónoma supervisada.
- Se integra de forma nativa con **GitHub Spec Kit** (integración oficial
  `specify init --integration kimi`), lo que permite trabajar con spec-driven
  development de principio a fin.
- Demostrar criterio al elegir herramientas —y no solo seguir la opción por
  defecto— es parte de lo que evalúa este ejercicio.

## Metodología: Spec-Driven Development con Spec Kit

En lugar de «pedir código» directamente, todo el proyecto parte de artefactos
versionados en el repo:

1. **Constitution** — principios no negociables (`.specify/memory/`).
2. **Spec** — qué hace el sistema, en lenguaje de producto.
3. **Plan** — cómo se construye: stack, estructura, decisiones técnicas.
4. **Tasks** — desglose accionable y ordenado.
5. **Implement** — el agente ejecuta las tareas sobre el repo.

El razonamiento queda en el repositorio (`.specify/`, `specs/`, `docs/`), no
solo en un historial de chat. Las mejoras posteriores (specs 002, 003 y 004)
siguieron el mismo flujo.

## Registro de uso

### Fases y prompts clave

- **Preparación**: lectura del encargo y montaje del repo con
  `specify init --integration kimi` (Spec Kit 1.2.2), sin escribir una línea de
  aplicación: primero documentación (`docs/`), constitución y decisión de stack.
- **Constitution**: 6 principios, 3 de ellos NON-NEGOTIABLE (spec-driven, coste
  cero, cero secretos). Todo el diseño posterior se verifica contra ellos en
  cada fase (gate de la skill de plan).
- **Specify**: spec en lenguaje de producto con 2 marcadores de aclaración
  resueltos por el equipo (Developer trabaja sobre una mini-web sandbox; login
  con credencial compartida para proteger el gasto de la API key pública).
- **Plan**: 9 decisiones de research documentadas con alternativas (D1–D9). Las
  más determinantes:
  - **Motor por pasos** (D2): una ejecución de agentes dura minutos y no cabe
    en una función serverless del plan gratuito (~60 s); máquina de estados
    persistida, un paso por invocación, conducida por la propia UI.
  - **Sandbox en BD** (D4): el filesystem de Vercel es de solo lectura, así que
    la mini-web vive en Postgres y se sirve con content-type real en `/site/*`.
  - **Testing híbrido** (D5): checks deterministas gratuitos + juicio del LLM
    solo para lo cualitativo.
- **Tasks + Analyze**: 38 tareas organizadas por user story; el análisis cruzado
  detectó 2 inconsistencias (un edge case que contradecía D2 y el formato de
  `acceptance_check` sin cerrar) y se remediaron antes de implementar.

### Decisiones propuestas por la IA, aceptadas o corregidas

- **Aceptada**: inyectar el acceso a datos tras una interfaz `Store` (Drizzle
  en producción, en memoria en tests) — permitió testear el motor completo sin
  base de datos.
- **Corregida por los tests**: el primer test del motor detectó roles
  confundidos en el doble de prueba (el prompt de Testing menciona a
  «Developer»); se corrigió la detección y quedó como caso de regresión.
- **Corregida en validación en vivo**: una sesión de humo sirvió la app con un
  servidor antiguo sin variables de entorno y la cookie se verificaba contra un
  secreto vacío; se aislaron los servidores dev y se añadió el código
  `DB_UNAVAILABLE` (503 limpio) tras observar un 500 crudo al probar sin BD.

### Resuelto de forma autónoma por la IA

- Toda la mecánica de la capa LLM del patrón de referencia (backoff 2/5/10,
  parsing defensivo, fallback de parámetros ante HTTP 400, sonda real) portada
  a TypeScript sin SDKs, con tests de los casos de fallo históricos.
- Detección de proveedor auto/local/api validada en vivo contra Ollama real
  (`qwen2.5-coder:7b`): detección, sonda y badge de proveedor en la UI.

### Intervenciones humanas necesarias

- Resolución de las 2 aclaraciones de la spec (alcance de Developer y auth).
- Credenciales y entorno (`.env.local`, cuenta de Neon, despliegue en Vercel):
  por seguridad, siempre las introduce una persona.
- Arranque de Docker Desktop para la base de datos local de validación.

### Hallazgos de la validación en vivo

- **Modelo local y JSON degradado**: tras varios ciclos de corrección, Developer
  (Ollama 7B) devolvió repetidamente un JSON sin el campo `summary` —un campo
  descriptivo, no sustantivo— y la ejecución murió por él. Fix: `summary`
  opcional con fallback generado desde los ficheros cambiados. Lección: la capa
  defensiva debe distinguir campos sustantivos de decorativos, sobre todo con
  prompts largos en modelos pequeños.
- **Estados transitorios al fallar**: una tarea quedó colgada en `in_progress`
  pese a la ejecución terminal. Fix: al terminar en `error`, toda tarea
  transitoria pasa a `failed` con el motivo, con test de regresión.
- **Concurrencia de drivers**: dos pestañas conduciendo la misma ejecución
  ejecutaron pasos en paralelo (doble orquestación detectada en el log de
  actividad). Fix: cerrojo de avance por fila (`locked_at` con TTL), 409
  `RUN_BUSY` para el segundo cliente y manejo suave en la UI.
- **Endurecimiento de seguridad**: rate limit en login, comparación en tiempo
  constante de credenciales, CSP sobre el contenido generado por agentes
  (`connect-src 'none'`) y headers de seguridad globales — todo ello surgido de
  la auditoría previa al despliegue público.

### Estado final de calidad

- **50 tests automatizados** (capa LLM, sandbox, motor, recuperación, config y
  auth) y build de producción en verde en cada entrega.
- Validación E2E real en dos entornos: Postgres local (Docker) y Neon en la
  nube, con ejecuciones completas del equipo de agentes usando Ollama a coste
  cero.
