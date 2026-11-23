# Coop AI Workflow

Equipo de 3 agentes de IA que colaboran para completar peticiones de desarrollo web:

- **Orquestador** — recibe una petición (p. ej. «añade una página de contacto a esta web»), la divide en tareas y las reparte.
- **Develop** — ejecuta las tareas de desarrollo.
- **Testing** — verifica el trabajo de Develop y devuelve lo que falla, hasta que todo pasa.

La pantalla muestra en tiempo real qué hace cada agente y en qué estado está cada tarea.

> Proyecto en preparación. La especificación y el plan se gestionan con
> [GitHub Spec Kit](https://github.com/github/spec-kit) (ver `.specify/` y `docs/`).

## Stack

- **Next.js** (App Router)
- **Base de datos gratuita** — ver decisión en `docs/plan-de-entrega.md`
- **Despliegue en Vercel**
- **LLM en dos modos**: local (sin coste) o mediante API keys configurables — ver `docs/arquitectura-llm.md`

## Desarrollo con Spec Kit

El proyecto se construye siguiendo el flujo Spec-Driven Development:

1. `/skill:speckit-constitution` — principios del proyecto
2. `/skill:speckit-specify` — especificación base
3. `/skill:speckit-plan` — plan de implementación
4. `/skill:speckit-tasks` — tareas accionables
5. `/skill:speckit-implement` — ejecución

## Documentación

- `docs/requisitos.md` — requisitos originales del encargo
- `docs/plan-de-entrega.md` — entregables, decisiones técnicas y checklist
- `docs/arquitectura-llm.md` — diseño del modo local / modo API keys
- `docs/como-usamos-la-ia.md` — cómo se usó el agente de codificación (Kimi Code)

## Claves y secretos

Ninguna clave de API se sube al repositorio. La configuración se hace con
variables de entorno (`.env.local`, ignorado por git). Ver `.env.example`.
