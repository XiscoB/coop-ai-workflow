# Cómo usamos la IA para construir este proyecto

> Documento vivo: se completa durante el desarrollo. Este borrador fija el
> relato y deja hueco para los ejemplos concretos.

## Herramienta: Kimi Code

El encargo sugiere Claude Code o Codex. Construimos el proyecto con
**[Kimi Code](https://www.kimi.com/code)**, un agente de codificación en CLI de
la misma categoría (agentic coding en terminal, con edición de archivos,
ejecución de comandos y razonamiento sobre el repo). Lo elegimos porque:

- Cubre el mismo flujo que Claude Code/Codex: lee el codebase, propone planes,
  edita, ejecuta tests y depura de forma autónoma supervisada.
- Se integra de forma nativa con **GitHub Spec Kit** (tiene integración
  oficial `specify init --integration kimi`), lo que nos permite trabajar con
  spec-driven development de principio a fin.
- Consideramos que demostrar criterio al elegir herramientas —y no solo seguir
  la opción por defecto— es parte de lo que evalúa este ejercicio.

## Metodología: Spec-Driven Development con Spec Kit

En lugar de «pedir código» directamente, todo el proyecto parte de artefactos
versionados en el repo:

1. **Constitution** — principios no negociables (`.specify/memory/`).
2. **Spec** — qué hace el sistema, en lenguaje de producto.
3. **Plan** — cómo se construye: stack, estructura, decisiones técnicas.
4. **Tasks** — desglose accionable y ordenado.
5. **Implement** — el agente ejecuta las tareas sobre el repo.

Ventaja para el revisor: el razonamiento queda en el repositorio
(`.specify/`, `specs/`), no solo en un historial de chat.

## Registro de uso (durante el desarrollo)

### Fases y prompts clave

- **Preparación**: se leyó el encargo y se montó el repo con
  `specify init --integration kimi` (Spec Kit 1.2.2) sin escribir una línea de
  aplicación: primero documentación (`docs/`), constitución y decisión de stack.
- **Constitution**: 6 principios, 3 de ellos NON-NEGOTIABLE (spec-driven, coste
  cero, cero secretos). Todo el diseño posterior se verifica contra ellos en cada
  fase (gate de la skill de plan).
- **Specify**: la spec se escribió en lenguaje de producto con 2 marcadores de
  aclaración que el humano resolvió (Develop trabaja sobre una mini-web sandbox;
  login con credencial compartida para proteger el gasto de la API key).
- **Plan**: 9 decisiones de research documentadas con alternativas (D1–D9). Las
  más importantes:
  - **Motor por pasos** (D2): una ejecución de agentes dura minutos y no cabe en
    una función serverless del plan Hobby (~60 s); máquina de estados persistida,
    un paso por invocación, conducida por la propia UI.
  - **Sandbox en BD** (D4): el filesystem de Vercel es de solo lectura, así que la
    mini-web vive en Postgres y se sirve con content-type real en `/site/*`.
  - **Testing híbrido** (D5): checks deterministas gratuitos + juicio del LLM solo
    para lo cualitativo.
- **Tasks + Analyze**: 38 tareas organizadas por user story; el análisis cruzado
  detectó 2 inconsistencias MEDIUM (un edge case que contradecía D2 y el formato
  de `acceptance_check` sin cerrar) y se remediaron antes de implementar.

### Decisiones que propuso la IA y aceptamos / corregimos

- **Aceptada**: inyectar el acceso a datos tras una interfaz `Store` (Drizzle en
  producción, en memoria en tests) — permitió 32 tests del motor sin base de datos.
- **Corregida por los tests**: el primer test del motor detectó roles confundidos
  en el doble de prueba (el prompt de Testing menciona a «Develop»); se corrigió
  la detección y quedó como caso regresión.
- **Corregida en validación en vivo**: la primera sesión de humo sirvió la app con
  un servidor viejo sin variables de entorno y la cookie se verificaba contra un
  secreto vacío; se aislaron los servidores dev y se añadió el código de error
  `DB_UNAVAILABLE` (503 limpio) tras observar un 500 crudo al probar sin BD.

### Lo que la IA resolvió de forma autónoma

- Toda la mecánica de la capa LLM del patrón de referencia (backoff 2/5/10,
  parsing defensivo, fallback de parámetros ante HTTP 400, sonda real) portada a
  TypeScript sin SDKs, con tests que cubren los casos de fallo históricos.
- Detección de proveedor auto/local/api validada en vivo contra Ollama real
  (`qwen2.5-coder:7b`): detección, sonda y badge de proveedor en la UI.

### Intervenciones manuales necesarias

- Resolución de las 2 aclaraciones de la spec (alcance de Develop y auth).
- Credenciales y entorno (`.env.local`, cuenta de Neon, despliegue en Vercel):
  por seguridad, siempre las introduce el humano.
- Arranque de Docker Desktop para la base de datos local de validación
  (requiere interacción en la máquina del usuario).

### Hallazgos de la validación en vivo (posteriores)

- **Ejecución real del usuario («hola mundo», Ollama 7B)**: tras 4 ciclos de
  corrección, Develop devolvió 3 veces un JSON sin el campo `summary` (campo
  descriptivo, no sustantivo) y la ejecución murió por él. Fix: `summary`
  opcional con fallback generado desde los ficheros cambiados.
- **Mismo incidente, segunda lectura**: la tarea quedó colgada en `in_progress`
  pese a la ejecución terminal — el motor no limpiaba estados transitorios al
  morir. Fix: al terminar en `error`, toda tarea `in_progress`/`in_review` pasa
  a `failed` con el motivo (SC-006), con test de regresión y saneado de la fila
  afectada en Neon.
- Lección documentable para la entrega: los modelos pequeños degradan el JSON en
  prompts largos (prompt + feedback acumulado); la capa defensiva debe distinguir
  campos sustantivos de decorativos.
