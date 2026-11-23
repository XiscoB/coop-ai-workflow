# Arquitectura LLM: modo local y modo API keys

Patrón validado en producción en otro proyecto nuestro (app local con LLM
configurable: local u API externa de pago). Aquí está adaptado a Next.js.
Sirve para **cualquier proveedor con API compatible con OpenAI** (DeepSeek,
Kimi/Moonshot, OpenAI, OpenRouter…) y para **Ollama** en local.

## 1. Modos y detección del proveedor

Un solo ajuste `LLM_MODE` con tres valores:

| Modo | Comportamiento |
|---|---|
| `auto` (por defecto) | Ping a Ollama local (timeout corto, ~3 s) → si responde, se usa local. Si no responde y hay API key configurada, se usa la API externa. Si no hay ninguna, la app lo muestra claramente (banner «IA no configurada») en vez de fallar. |
| `local` | Fuerza Ollama local. Si no responde, aviso claro («arráncalo o cambia de proveedor»), **sin fallback silencioso**. |
| `api` | Fuerza la API externa. Si falta la key, aviso claro. |

Lecciones clave del patrón original:

- **Detección en arranque y re-detección al cambiar la config**: el resultado
  (`ProveedorDetectado`) se guarda en estado y lo consumen los agentes y la UI
  (que muestra siempre el proveedor activo: «Ollama local (modelo X)» /
  «API externa (modelo Y)» / «Ninguno»).
- **Sin proveedor ≠ crash**: las tareas que necesitan LLM quedan en espera con
  motivo visible («LLM no disponible»), y al configurar uno se reintentan.

## 2. Capa de abstracción de proveedor

Una interfaz única que implementan dos clases de proveedor:

```
complete(messages, options) → respuesta
```

- **Proveedor local (Ollama)**: `POST {LOCAL_LLM_BASE_URL}/api/generate` con
  `format: "json"`, `stream: false`, temperatura baja (0.1) y contexto
  limitado. Alternativa: el endpoint OpenAI-compatible de Ollama (`/v1`).
- **Proveedor API (OpenAI-compatible)**: `POST {LLM_API_BASE_URL}/chat/completions`
  con `Authorization: Bearer {LLM_API_KEY}` y `response_format: json_object`.
  El mismo código sirve para DeepSeek, Kimi, OpenAI u OpenRouter: solo cambian
  URL, modelo y key.

## 3. Robustez (lo que el patrón original aprendió a base de fallos reales)

- **Reintentos con backoff fijo** (p. ej. 2 s, 5 s, 10 s) y timeout generoso
  (~120 s) por llamada.
- **Parsing defensivo del JSON**: quitar fences ```` ```json ```` antes de
  `JSON.parse`, y validar que la respuesta tiene los campos obligatorios; si
  no, cuenta como fallo y reintenta.
- **Fallback de parámetros ante HTTP 400**: hay modelos que rechazan
  `temperature` (solo admiten la suya) o parámetros desconocidos (p. ej.
  `thinking` en DeepSeek). Si el 400 menciona el parámetro, se reintenta la
  misma llamada sin él y **no se vuelve a enviar en lo que queda de sesión**.
- **Desactivar el «razonamiento» cuando se pueda**: en tareas mecánicas el
  thinking multiplicaba la latencia (3 s → 20-38 s) y el coste (los tokens de
  razonamiento facturan como salida).
- **Errores HTTP con cuerpo**: el motivo real (key inválida, modelo
  inexistente, sin saldo) está en el body de la respuesta; mostrarlo, no solo
  el código de estado.
- **Log de cada llamada**: proveedor, modelo, tarea, nº de intentos, latencia,
  error y respuesta cruda. En nuestro caso, a la tabla de actividad de
  agentes — además nos da gratis el «qué hace cada agente en pantalla» del
  requisito.

## 4. Sonda de salud (health check real)

Un `GET /models` **no** detecta los fallos que luego tumban una ejecución
(key sin permiso de completions, modelo renombrado, cuenta sin saldo,
`response_format` no soportado). La sonda es una **completion mínima real**
(pedir `{"ok": true}` con un prompt de un token), sin `temperature` ni
`max_tokens` (los modelos con razonamiento pueden consumir el límite pensando
y devolver vacío). Devuelve el motivo del fallo en claro para mostrarlo en la
UI de configuración.

## 5. Configuración y API keys

Orden de resolución (de mayor a menor prioridad):

1. **Variables de entorno** (`LLM_MODE`, `LLM_API_KEY`, `LLM_API_BASE_URL`,
   `LLM_API_MODEL`, `LOCAL_LLM_BASE_URL`, `LOCAL_LLM_MODEL`) — en Vercel se
   configuran en el dashboard; en local, `.env.local` (gitignored).
2. **Ajustes guardados en BD** desde la propia UI (opcional): la key se guarda
   **solo server-side**, se muestra enmascarada (input tipo password con
   toggle) y nunca se expone al cliente.

Reglas de seguridad del patrón:

- Ninguna key en el repo: solo `.env.example` con placeholders; `.env*` en
  `.gitignore` desde el primer commit.
- Las llamadas al LLM se hacen **server-side** (Route Handlers / Server
  Actions): la key jamás viaja al navegador.
- Al guardar la config en la UI, se **re-detecta el proveedor** y se notifica
  el resultado (éxito con nombre visible, o aviso con el motivo).

## 6. Particularidad Vercel

El modo `local` (Ollama en `localhost`) solo funciona en desarrollo: el
despliegue en Vercel no puede alcanzar la máquina del usuario. En producción
se usa el modo `api`. Esto se documentará en el README final con las
instrucciones de ambos arranques.

## 7. Modelos por agente (extensión opcional)

Overrides por agente (`ORCHESTRATOR_MODEL`, `DEVELOP_MODEL`, `TESTING_MODEL`)
para mezclar proveedores o calibres: p. ej. Orquestador con un modelo cloud
potente y Testing con un modelo local rápido. Por defecto, todos heredan el
modelo del proveedor activo.

## 8. Proveedores gratuitos para el despliegue

En Vercel no hay Ollama alcanzable: la demo pública usa una API externa con
tier gratuito (Groq, Google AI Studio, OpenRouter…). Candidatos, límites,
URLs base y avisos en `docs/proveedores-ia-gratuitos.md` (fuente:
[itsfree.ai](https://itsfree.ai/), directorio verificado de tiers gratuitos).
