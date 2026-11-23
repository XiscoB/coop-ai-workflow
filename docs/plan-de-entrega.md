# Plan de entrega

Estado: **preparación** (el proyecto aún no se ha empezado; este documento fija el plan).

## Decisiones técnicas propuestas

| Área | Propuesta | Motivo |
|---|---|---|
| Framework | Next.js (App Router, última versión estable) | Requisito del encargo |
| Despliegue | Vercel | Requisito del encargo; integración nativa con Next.js |
| Base de datos | **Propuesta: Neon (Postgres serverless)** o Supabase | Plan gratuito, maduro, fácil de conectar desde Vercel. Decisión final al arrancar la fase de spec |
| LLM | Doble modo: **local** (Ollama) y **API compatible con OpenAI** (DeepSeek, Kimi, OpenAI, OpenRouter…) | Patrón ya validado en otro proyecto nuestro; detalle completo en `arquitectura-llm.md` |
| Estado en pantalla | Streaming (SSE / React Server Components) | Se ve en vivo qué hace cada agente y el estado de cada tarea |
| Agente de codificación | **Kimi Code** (ver `como-usamos-la-ia.md`) | El encargo pide Claude Code o Codex; usamos Kimi Code y lo explicamos |

> El diseño del modo local / API keys (`arquitectura-llm.md`) ya está alineado
> con el patrón validado en producción de otro proyecto nuestro.

## Flujo de trabajo (Spec Kit)

Al arrancar el proyecto, en este orden:

1. `/skill:speckit-constitution` — principios (calidad, simplicidad, cero secretos en repo, demo primero).
2. `/skill:speckit-specify` — especificación del sistema de 3 agentes a partir de `requisitos.md`.
3. `/skill:speckit-clarify` — resolver ambigüedades (alcance del "desarrollo" que hace Develop, criterios de Testing, persistencia).
4. `/skill:speckit-plan` — plan técnico (Next.js, BD elegida, streaming, modo local/API).
5. `/skill:speckit-checklist` — checklist de calidad de los requisitos.
6. `/skill:speckit-tasks` — desglose en tareas.
7. `/skill:speckit-analyze` — coherencia entre artefactos.
8. `/skill:speckit-implement` — implementación.

## Checklist de entregables

- [ ] App desplegada en Vercel con URL pública
- [ ] Repositorio público en GitHub (este repo: `coop-ai-workflow`)
- [ ] Usuario y contraseña de prueba (si hace falta auth)
- [ ] Respuestas a las 4 preguntas cortas
- [ ] README final con instrucciones de arranque local y despliegue
- [ ] `.env.example` documentado; ninguna clave real en el repo
- [ ] Documentado cómo se usó el agente de IA (`como-usamos-la-ia.md`)

## Las 4 preguntas cortas

Las preguntas exactas se conocerán al entregar. Respuestas previsibles a preparar
(borrador, a completar durante el desarrollo):

1. **¿Cómo usaste Claude Code / Codex?** → Usamos Kimi Code con Spec Kit
   (spec-driven development). Ver `como-usamos-la-ia.md`.
2. **¿Cómo se reparten el trabajo los agentes?** → Orquestador descompone y
   asigna; Develop implementa; Testing verifica en bucle hasta que todo pasa.
3. **¿Cómo persistís el estado?** → Base de datos gratuita (Neon/Supabase);
   cada tarea y mensaje de agente queda registrado.
4. **¿Cómo funcionaría sin gastar dinero / en local?** → Modo local con
   Ollama; modo API externa (cualquier API compatible con OpenAI) para
   producción. Ver `arquitectura-llm.md`.
