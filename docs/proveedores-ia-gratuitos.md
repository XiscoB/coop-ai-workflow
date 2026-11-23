# Proveedores de IA gratuitos para el despliegue

> Fuente: [itsfree.ai](https://itsfree.ai/) (directorio verificado de tiers
> gratuitos, consultado el 2026-11-23). Los límites cambian con el tiempo:
> confirmar el tier vigente antes de entregar.

## Contexto

En Vercel el modo local (Ollama) no es alcanzable, así que la demo pública
necesita una **API externa gratuita**. Nuestra capa `lib/llm/openai-compatible.ts`
habla el protocolo OpenAI (`POST /chat/completions`, `response_format:
json_object`, Bearer key), así que cualquier proveedor OpenAI-compatible sirve
cambiando **URL + modelo + key**, sin tocar código (constitución IV).

## Candidatos recomendados (signup solo con email)

| Proveedor | Tier gratuito | Base URL | Notas |
|---|---|---|---|
| **Groq** (recomendado) | ~1.000 req/día | `https://api.groq.com/openai/v1` | Muy rápido; soporta `json_object`. Modelos: `openai/gpt-oss-120b`, `qwen3-32b`… |
| **Google AI Studio** | ~1.500 req/día | `https://generativelanguage.googleapis.com/v1beta/openai/` | Endpoint OpenAI-compatible oficial; modelos `gemini-*-flash` |
| **OpenRouter** | varios modelos `:free` | `https://openrouter.ai/api/v1` | Un solo punto de acceso a muchos modelos; filtrar por sufijo `:free` |
| **Vercel AI Gateway** | 5 $/mes de crédito | `https://ai-gateway.vercel.sh/v1` | Integración nativa con el propio Vercel |

Una ejecución completa consume ~10-20 llamadas (5-7 tareas × develop+test), así
que cualquiera de estos tiers da para muchas demos al día.

## Avisos documentados

- **Son tiers de evaluación**: sin garantía de disponibilidad y varios prohíben
  uso en producción «real». Para una demo de entrevista sobra; para producción
  habría que pasar a tier de pago.
- **Privacidad**: algunos proveedores gratuitos entrenan con los prompts
  (Google lo declara para su tier gratis). Nuestra demo solo procesa contenido
  ficticio de una web de ejemplo, así que no hay dato sensible.
- **Compatibilidad**: si un proveedor rechaza `temperature` con HTTP 400, el
  cliente reintenta sin el parámetro y no lo reenvía (fallback ya implementado
  y testeado). Si un modelo concreto no soporta `response_format: json_object`,
  elegir otro modelo del mismo proveedor (Groq y Gemini Flash lo soportan).
- **Fallback siempre disponible**: la app funciona al 100% en local con Ollama
  aunque el proveedor cloud cambie su tier — es la garantía de «coste cero»
  de la constitución II.

## Configuración (recordatorio)

```bash
LLM_MODE=api
LLM_API_BASE_URL=https://api.groq.com/openai/v1
LLM_API_MODEL=<modelo del proveedor>
LLM_API_KEY=<key del dashboard del proveedor>
```
