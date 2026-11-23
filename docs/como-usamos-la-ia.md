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

## Registro de uso (a completar durante el desarrollo)

- [ ] Prompts clave usados en cada fase
- [ ] Decisiones que propuso la IA y aceptamos / rechazamos (y por qué)
- [ ] Problemas que resolvió de forma autónoma
- [ ] Intervenciones manuales necesarias
