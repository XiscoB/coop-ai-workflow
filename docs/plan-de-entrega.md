# Plan de entrega

Estado: **entregado** (2026-11-23). App desplegada en
[coop-ai-workflow.vercel.app](https://coop-ai-workflow.vercel.app).

## Decisiones técnicas

| Área | Decisión | Motivo |
|---|---|---|
| Framework | Next.js (App Router, TypeScript) | Requisito del encargo |
| Despliegue | Vercel (plan gratuito) | Requisito del encargo; integración nativa con Next.js |
| Base de datos | Neon Postgres (tier gratuito) + Drizzle ORM | Serverless-friendly, maduro, gratuito. Driver HTTP en producción, TCP en local |
| LLM | Doble modo: **local** (Ollama) y **API compatible con OpenAI** (Groq, DeepSeek, OpenAI, OpenRouter…) | Patrón validado en producción en otro proyecto del equipo; detalle en `arquitectura-llm.md` |
| Actualización en vivo | Motor por pasos + polling (1,5 s) | Las ejecuciones duran minutos y los límites de funciones serverless del plan gratuito (~60 s) no admiten procesos largos ni SSE fiable |
| Agente de codificación | **Kimi Code** (ver `como-usamos-la-ia.md`) | El encargo sugiere Claude Code o Codex; se optó por Kimi Code, con integración nativa de Spec Kit |

## Flujo de trabajo (Spec Kit)

El proyecto se construyó siguiendo el flujo completo de spec-driven development:

1. `speckit-constitution` — principios (calidad, simplicidad, cero secretos, coste cero, demo primero).
2. `speckit-specify` — especificación del sistema de 3 agentes (2 aclaraciones resueltas con el equipo).
3. `speckit-plan` — plan técnico con 9 decisiones de research documentadas (D1–D9).
4. `speckit-tasks` — 38 tareas organizadas por user story.
5. `speckit-analyze` — análisis cruzado: 2 inconsistencias detectadas y remediadas antes de implementar.
6. `speckit-implement` — implementación y validación.

Las mejoras posteriores (centro de control, recuperación, configuración y UX)
siguieron el mismo flujo como specs 002, 003 y 004 (`specs/`).

## Checklist de entregables

- [x] App desplegada en Vercel: [coop-ai-workflow.vercel.app](https://coop-ai-workflow.vercel.app) (validada en producción)
- [x] Repositorio público en GitHub: [XiscoB/coop-ai-workflow](https://github.com/XiscoB/coop-ai-workflow)
- [x] Usuario y contraseña de prueba (login compartido; se entrega junto a la URL)
- [x] Respuestas a las 4 preguntas cortas (redactadas abajo)
- [x] README final con instrucciones de arranque local y despliegue
- [x] `.env.example` documentado; ninguna clave real en el repo
- [x] Documentado cómo se usó el agente de IA (`como-usamos-la-ia.md`)

## Estado de validación (2026-11-23)

- [x] `npm test` — 50/50 en verde (capa LLM, checks de sandbox, motor, recuperación, config, auth)
- [x] `npm run build` — build de producción en verde
- [x] Acceso: middleware redirige a /login sin sesión (307), API responde 401, cookie firmada verificada
- [x] Proveedor IA: detección `auto` contra Ollama real (`qwen2.5-coder:7b`) y sonda de completion real OK, coste 0
- [x] Bucle completo en vivo (Ollama + Postgres): «Añade una página de contacto» → tareas completadas, informe final y `contacto.html` enlazada desde `index.html`
- [x] Validación completa contra Neon en la nube (stack idéntico a producción): ejecución E2E 6/6 tareas, `/site/contacto.html` servido desde Neon, historial OK
- [x] Seguridad: rate limit de login (429 al 6º intento), key de API siempre enmascarada, CSP sobre el sandbox, headers de seguridad
- [x] V7 producción: app desplegada y validada en Vercel (login, ejecución E2E con LLM API, historial, preview, reset, badge de proveedor, logs)
- [x] Resiliencia LLM en producción: retry con Retry-After, pacing dinámico, fallback automático entre proveedores (verificado en el timeline de ejecuciones reales)

## Las 4 preguntas cortas

Las preguntas exactas se conocerán al entregar. Respuestas preparadas:

1. **¿Cómo usaste Claude Code / Codex?** → El proyecto se construyó con Kimi Code
   (agente de codificación de la misma categoría) siguiendo spec-driven
   development con GitHub Spec Kit: toda la planificación está versionada en el
   repo. Detalle completo en `como-usamos-la-ia.md`.
2. **¿Cómo se reparten el trabajo los agentes?** → El Orquestador descompone la
   petición en tareas con criterio de aceptación; Developer las ejecuta sobre la
   web de ejemplo; Testing las verifica (checks automáticos + revisión) y las
   devuelve en bucle hasta que todo pasa o se agota el límite de ciclos.
3. **¿Cómo persistís el estado?** → Todo vive en Postgres (Neon, tier gratuito):
   ejecuciones, tareas, timeline de actividad por agente, sandbox de la web y
   ajustes de configuración.
4. **¿Cómo funcionaría sin gastar dinero?** → La app funciona completa en local
   con Ollama (coste cero, demostrado en la validación) y en producción con
   tiers gratuitos de API (Groq, Google AI Studio…). Infraestructura: planes
   gratuitos de Vercel y Neon.
