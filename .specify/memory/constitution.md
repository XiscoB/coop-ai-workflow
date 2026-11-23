# Coop AI Workflow Constitution

<!--
Sync Impact Report
- Version change: (none) → 1.0.0 (initial adoption)
- Modified principles: none (initial ratification)
- Added sections: Core Principles (I-VI), Restricciones adicionales, Flujo de desarrollo, Governance
- Removed sections: none
- Follow-up TODOs: none
-->

## Core Principles

### I. Spec-Driven Development (NON-NEGOTIABLE)

Todo el trabajo pasa por los artefactos de Spec Kit: constitución → spec → plan →
tasks → implementación. No se escribe código de aplicación sin una spec aprobada y
tareas generadas a partir de ella. Las decisiones y el razonamiento viven en el
repositorio (`.specify/`, `specs/`, `docs/`), no solo en el historial de chat.

*Rationale*: el revisor del ejercicio debe poder auditar cómo se construyó; el
proceso es parte del entregable.

### II. Coste cero (NON-NEGOTIABLE)

La app DEBE poder ejecutarse y demostrarse sin gastar dinero: plan gratuito de
Vercel, base de datos con tier gratuito, y modo LLM local (Ollama) funcional sin
ninguna API key. Ninguna funcionalidad esencial puede depender de un servicio de
pago. Las API keys son una opción de calidad, nunca un requisito.

### III. Cero secretos en el repositorio (NON-NEGOTIABLE)

Ninguna clave, token o credencial real se commitea. Las claves viven en variables
de entorno (`.env.local`, gitignored) o en el dashboard de Vercel; el repo solo
contiene `.env.example` con placeholders. Toda llamada al LLM se hace server-side:
las keys jamás llegan al navegador. `.gitignore` protege `.env*` desde el primer
commit.

### IV. Proveedor de IA intercambiable

La app accede al LLM únicamente a través de una capa de abstracción con dos
implementaciones: local (Ollama) y API compatible con OpenAI (DeepSeek, Kimi,
OpenAI, OpenRouter…). El proveedor se resuelve por configuración (`LLM_MODE`:
auto/local/api), nunca está hardcodeado, y la app degrada con elegancia —aviso
claro, tareas en espera— cuando no hay proveedor disponible. Se aplican las
reglas de robustez de `docs/arquitectura-llm.md`: reintentos con backoff, parsing
defensivo del JSON, fallback de parámetros ante HTTP 400 y sonda de salud real.

*Rationale*: patrón ya validado en producción en otro proyecto; además permite la
demo gratuita del principio II.

### V. Visibilidad de los agentes (requisito del encargo)

En pantalla se ve en todo momento qué hace cada agente (Orquestador, Develop,
Testing) y en qué estado está cada tarea. Toda acción de agente queda registrada
(agente, tarea, contenido, resultado, latencia) y se muestra actualizada en la UI.
La persistencia del estado no es opcional: es lo que alimenta la pantalla.

### VI. Simplicidad y demo primero

Se construye lo mínimo que demuestra el bucle completo de los 3 agentes de
principio a fin, funcionando y desplegado. YAGNI: nada de features extra,
frameworks adicionales o abstracciones sin un requisito que las pida. Si una
mejora no cabe en el alcance, se anota como trabajo futuro y no se implementa.

## Restricciones adicionales

- **Stack fijado por el encargo**: Next.js, despliegue en Vercel, base de datos
  con plan gratuito (decisión concreta registrada en `docs/plan-de-entrega.md`).
- **Robustez LLM** según `docs/arquitectura-llm.md`: reintentos con backoff fijo
  (2/5/10 s), timeout ~120 s, parsing defensivo (strip de fences ```json,
  validación de campos obligatorios), sonda de salud con completion real mínima.
- **Coste/latencia LLM**: temperatura baja por defecto en tareas mecánicas;
  parámetros de razonamiento («thinking») desactivados salvo necesidad justificada.
- **Idioma**: UI y documentación de entrega en español; código y comentarios
  técnicos en inglés cuando el ecosistema lo haga más legible.

## Flujo de desarrollo

- Orden Spec Kit: constitution → specify → clarify → plan → checklist → tasks →
  analyze → implement. No se saltan fases sin motivo registrado.
- **Quality gates antes de dar algo por terminado**: `npm run build` (y linter si
  se configura) en verde; ningún secreto en `git ls-files`; README al día; la app
  desplegada en Vercel responde y el bucle de 3 agentes funciona end-to-end en la
  URL pública.
- Cada fase produce commits propios y descriptivos en `main` (repo público: la
  historia también es parte de la entrega).
- Las desviaciones del plan se documentan en `docs/` cuando afectan a lo que verá
  el revisor.

## Governance

Esta constitución prevalece sobre cualquier otra guía del proyecto. Las enmiendas
requieren: (1) documentar el cambio y su motivo, (2) actualizar la versión con
versionado semántico (MAJOR: principio eliminado o redefinido de forma
incompatible; MINOR: principio o sección nueva o ampliada; PATCH: aclaraciones y
redacción), y (3) revisar que las plantillas y artefactos dependientes siguen
siendo coherentes. Toda spec, plan y tarea debe verificar cumplimiento de los
principios NON-NEGOTIABLE antes de implementarse.

**Version**: 1.0.0 | **Ratified**: 2026-11-23 | **Last Amended**: 2026-11-23
