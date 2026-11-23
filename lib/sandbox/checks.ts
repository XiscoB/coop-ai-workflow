import { normalize } from "./fs";

export type AcceptanceCheck =
  | { type: "file_exists"; path: string }
  | { type: "element_exists"; path: string; selector: string }
  | { type: "link_exists"; from: string; to: string }
  | { type: "llm_review"; criterion: string };

export interface CheckFailure {
  check: string;
  detail: string;
}

export type VirtualFiles = Record<string, string>;

const EXTERNAL_REF = /^(https?:)?\/\/|^mailto:|^tel:|^#|^data:/;
const COMMON_TAGS = [
  "html", "head", "body", "header", "footer", "main", "nav", "section",
  "article", "div", "ul", "ol", "li", "form", "table", "tr", "td", "th",
  "thead", "tbody", "select", "button",
];

function isHtml(path: string): boolean {
  return path.endsWith(".html");
}

/**
 * Comprobación leniente de que el HTML está bien formado: etiquetas comunes
 * equilibradas. No es un parser completo (los ficheros son pequeños y los
 * escribe el agente con formato simple); lo que no es mecanizable lo revisa
 * el LLM (research D5).
 */
export function checkHtmlBalance(files: VirtualFiles): CheckFailure[] {
  const failures: CheckFailure[] = [];
  for (const [path, content] of Object.entries(files)) {
    if (!isHtml(path)) continue;
    for (const tag of COMMON_TAGS) {
      const open = (content.match(new RegExp(`<${tag}(\\s|>)`, "gi")) ?? [])
        .length;
      const close = (content.match(new RegExp(`</${tag}>`, "gi")) ?? []).length;
      if (open !== close) {
        failures.push({
          check: "html_balance",
          detail: `${path}: la etiqueta <${tag}> aparece ${open} veces abierta y ${close} cerrada`,
        });
      }
    }
  }
  return failures;
}

function extractRefs(content: string): string[] {
  const refs: string[] = [];
  const pattern = /(?:href|src)\s*=\s*"([^"]+)"/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(content)) !== null) {
    refs.push(match[1]);
  }
  return refs;
}

/**
 * Toda referencia local (href/src) debe apuntar a un fichero existente del
 * sandbox. Las anclas (#seccion) solo se comprueban si apuntan a otro fichero.
 */
export function checkLocalReferences(files: VirtualFiles): CheckFailure[] {
  const failures: CheckFailure[] = [];
  const paths = new Set(Object.keys(files));
  for (const [path, content] of Object.entries(files)) {
    if (!isHtml(path)) continue;
    for (const ref of extractRefs(content)) {
      if (EXTERNAL_REF.test(ref)) continue;
      const [target] = ref.split("#");
      if (target === "") continue;
      const normalized = normalize(target);
      if (!paths.has(normalized)) {
        failures.push({
          check: "local_reference",
          detail: `${path}: la referencia "${ref}" apunta a un fichero que no existe (${normalized})`,
        });
      }
    }
  }
  return failures;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function selectorToRegex(selector: string): RegExp | null {
  const match = selector
    .trim()
    .match(/^([a-zA-Z][a-zA-Z0-9-]*)?(?:#([\w-]+))?(?:\.([\w-]+))?$/);
  if (!match || (!match[1] && !match[2] && !match[3])) return null;
  const [, tag, id, className] = match;
  const tagPart = tag ?? "[a-zA-Z][a-zA-Z0-9-]*";
  let attrs = "";
  if (id) attrs += `(?=[^>]*\\bid\\s*=\\s*"${escapeRegex(id)}")`;
  if (className) {
    attrs += `(?=[^>]*\\bclass\\s*=\\s*"[^"]*\\b${escapeRegex(className)}\\b[^"]*")`;
  }
  return new RegExp(`<${tagPart}\\b${attrs}[^>]*>`, "i");
}

export function evaluateAcceptanceCheck(
  check: AcceptanceCheck,
  files: VirtualFiles,
): CheckFailure | null {
  switch (check.type) {
    case "file_exists": {
      const path = normalize(check.path);
      return path in files
        ? null
        : { check: "file_exists", detail: `no existe el fichero ${path}` };
    }
    case "element_exists": {
      const path = normalize(check.path);
      const content = files[path];
      if (content === undefined) {
        return {
          check: "element_exists",
          detail: `no existe el fichero ${path} donde buscar "${check.selector}"`,
        };
      }
      const regex = selectorToRegex(check.selector);
      if (!regex) {
        return {
          check: "element_exists",
          detail: `selector no soportado: "${check.selector}" (usa tag, #id, .clase o combinaciones)`,
        };
      }
      return regex.test(content)
        ? null
        : {
            check: "element_exists",
            detail: `${path}: no se encontró el elemento "${check.selector}"`,
          };
    }
    case "link_exists": {
      const from = normalize(check.from);
      const content = files[from];
      if (content === undefined) {
        return {
          check: "link_exists",
          detail: `no existe el fichero ${from} desde el que enlazar`,
        };
      }
      const target = normalize(check.to);
      const regex = new RegExp(
        `href\\s*=\\s*"${escapeRegex(target.slice(1))}(#[^"]*)?"`,
        "i",
      );
      return regex.test(content)
        ? null
        : {
            check: "link_exists",
            detail: `${from}: no enlaza a ${target}`,
          };
    }
    case "llm_review":
      // No mecanizable: el veredicto lo da el LLM (research D5).
      return null;
  }
}

export interface DeterministicResult {
  failures: CheckFailure[];
  llmReviewCriteria: string[];
}

/**
 * Batería determinista de una tarea: HTML equilibrado, referencias locales
 * válidas y acceptance_check (si es de tipo mecanizable). Los criterios
 * `llm_review` se devuelven aparte para el veredicto del LLM.
 */
export function runDeterministicChecks(
  check: AcceptanceCheck,
  files: VirtualFiles,
): DeterministicResult {
  const failures = [
    ...checkHtmlBalance(files),
    ...checkLocalReferences(files),
  ];
  const llmReviewCriteria: string[] = [];
  if (check.type === "llm_review") {
    llmReviewCriteria.push(check.criterion);
  } else {
    const failure = evaluateAcceptanceCheck(check, files);
    if (failure) failures.push(failure);
  }
  return { failures, llmReviewCriteria };
}
