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
- [x] Respuestas a las 4 preguntas cortas (perfil profesional; redactadas abajo)
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

Las preguntas del formulario de entrega eran de **perfil profesional del
candidato** (experiencia con integraciones externas, apps publicadas, sistemas
multi-agente y gestión de alcance con clientes), no sobre este proyecto, y se
respondieron por el canal de entrega. Por privacidad, no se publican en este
repositorio.

Para cualquier detalle técnico sobre la demo, la documentación del proyecto
está en `README.md` y `docs/` (arquitectura LLM, cómo se construyó con
Kimi Code + Spec Kit, y estado de validación).

### Nota técnica sobre la demo desplegada (incluida en la entrega)

Demo completamente funcional con la capa de inferencia desacoplada mediante un patrón multi-proveedor con fallback:

- Para las pruebas web utiliza la API de **DeepSeek** como motor principal, respaldada por un proveedor secundario de contingencia (**Groq**) para garantizar disponibilidad continua sin incurrir en costes desmedidos de infraestructura para una PoC.
- El backend está desacoplado y preparado para conectarse a inferencia local soberana vía **Ollama** (p. ej. `qwen2.5-coder:7b`) para escenarios que exijan privacidad estricta o ejecución sin costes recurrentes de API.

Estos tiers y modelos compactos están dimensionados para validar el flujo funcional de la demo y no para cargas pesadas de producción; la arquitectura base y la integración end-to-end están probadas y listas para escalar a modelos comerciales de mayor capacidad si el caso de uso lo requiere.
