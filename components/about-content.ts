/** Contenido de «Acerca de» compartido por la página y el popup de bienvenida. */

export const FEATURES = [
  "Equipo de 3 agentes de IA: Orquestador (divide en tareas), Developer (modifica la web de verdad) y Testing (checks automáticos + revisión, con bucle de corrección).",
  "Motor por pasos persistido: las ejecuciones sobreviven a cierres de pestaña y a cortes del servicio de IA.",
  "Doble modo de IA: local (Ollama, coste cero) o cualquier API compatible con OpenAI, configurable desde la propia app con la key solo en el servidor.",
  "Sandbox real: una mini-web viva en base de datos que los agentes modifican; se puede previsualizar, revertir por ejecución o restablecer a la semilla.",
  "Recuperación: reanudar ejecuciones en error o con fallos, revertir los cambios de una ejecución concreta.",
  "Visibilidad total: timeline de actividad con hora por evento, notificaciones, TTS, logs del sistema y prompts por agente editables.",
  "Tema claro/oscuro persistente.",
];

export const IMPROVEMENTS = [
  "Pulir la UI: más pulido visual y de interacción en general (animaciones, estados vacíos, responsive fino, accesibilidad).",
  "Vista previa en vivo: ver en la propia pantalla de la ejecución cómo queda la web mientras Developer la modifica (render actualizado tras cada cambio de fichero, junto a la actividad).",
  "Human-in-the-loop: revisar, editar o eliminar tareas del plan del Orquestador antes de ejecutarlo.",
  "Visor de diffs: ver el antes/después de cada fichero que toca Developer, directamente en la tarjeta de la tarea.",
  "Verificación con Playwright: que Testing compruebe la web renderizada en un navegador real (visual y funcional), no solo estática.",
  "Planificación de los agentes con GitHub Spec Kit (constitution/spec/plan/tasks) para tareas más grandes y robustas.",
  "Concurrencia de ejecuciones con cola, y papel de «usuario» pidiendo cambios mientras el equipo trabaja.",
  "Métricas por modelo: latencia, tasa de acierto de Testing y coste estimado por proveedor, para elegir con datos.",
  "Modo multi-repo: apuntar el equipo a proyectos reales vía git, con PRs automáticas.",
];
