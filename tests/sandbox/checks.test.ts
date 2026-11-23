import { describe, expect, it } from "vitest";
import {
  checkHtmlBalance,
  checkLocalReferences,
  evaluateAcceptanceCheck,
  runDeterministicChecks,
  type VirtualFiles,
} from "@/lib/sandbox/checks";

const INDEX = `<!DOCTYPE html>
<html><head><link rel="stylesheet" href="styles.css"></head>
<body><nav><a href="servicios.html">Servicios</a><a href="#arriba">Arriba</a></nav>
<main><p>Hola</p></main>
<footer><a href="https://example.com">Externo</a><a href="mailto:hola@example.com">Mail</a></footer>
<script src="main.js"></script>
</body></html>`;

const FILES: VirtualFiles = {
  "/index.html": INDEX,
  "/servicios.html": "<html><body><p>Servicios</p></body></html>",
  "/styles.css": "body { margin: 0; }",
  "/main.js": "console.log('ok');",
};

describe("checkHtmlBalance", () => {
  it("no falla con HTML equilibrado", () => {
    expect(checkHtmlBalance(FILES)).toEqual([]);
  });

  it("detecta etiquetas desequilibradas", () => {
    const files: VirtualFiles = {
      "/roto.html": "<html><body><div><p>sin cerrar</body></html>",
    };
    const failures = checkHtmlBalance(files);
    expect(failures.length).toBeGreaterThan(0);
    expect(failures[0].detail).toContain("roto.html");
  });
});

describe("checkLocalReferences", () => {
  it("acepta referencias locales existentes, anclas y externas", () => {
    expect(checkLocalReferences(FILES)).toEqual([]);
  });

  it("detecta enlaces a ficheros inexistentes", () => {
    const files: VirtualFiles = {
      ...FILES,
      "/index.html": INDEX.replace("servicios.html", "noexisto.html"),
    };
    const failures = checkLocalReferences(files);
    expect(failures).toHaveLength(1);
    expect(failures[0].detail).toContain("noexisto.html");
  });
});

describe("evaluateAcceptanceCheck", () => {
  it("file_exists: pasa si existe, falla si no", () => {
    expect(
      evaluateAcceptanceCheck(
        { type: "file_exists", path: "/index.html" },
        FILES,
      ),
    ).toBeNull();
    const failure = evaluateAcceptanceCheck(
      { type: "file_exists", path: "/contacto.html" },
      FILES,
    );
    expect(failure?.detail).toContain("/contacto.html");
  });

  it("element_exists: encuentra tag, #id y tag.clase", () => {
    const files: VirtualFiles = {
      "/contacto.html":
        '<html><body><form id="contacto" class="formulario"><input></form></body></html>',
    };
    expect(
      evaluateAcceptanceCheck(
        { type: "element_exists", path: "/contacto.html", selector: "form" },
        files,
      ),
    ).toBeNull();
    expect(
      evaluateAcceptanceCheck(
        {
          type: "element_exists",
          path: "/contacto.html",
          selector: "form#contacto",
        },
        files,
      ),
    ).toBeNull();
    expect(
      evaluateAcceptanceCheck(
        {
          type: "element_exists",
          path: "/contacto.html",
          selector: "form.formulario",
        },
        files,
      ),
    ).toBeNull();
    const failure = evaluateAcceptanceCheck(
      {
        type: "element_exists",
        path: "/contacto.html",
        selector: "table",
      },
      files,
    );
    expect(failure?.detail).toContain("table");
  });

  it("link_exists: exige el enlace en el fichero origen", () => {
    expect(
      evaluateAcceptanceCheck(
        { type: "link_exists", from: "/index.html", to: "/servicios.html" },
        FILES,
      ),
    ).toBeNull();
    const failure = evaluateAcceptanceCheck(
      { type: "link_exists", from: "/index.html", to: "/contacto.html" },
      FILES,
    );
    expect(failure?.detail).toContain("/contacto.html");
  });
});

describe("runDeterministicChecks", () => {
  it("devuelve los criterios llm_review aparte para el veredicto del LLM", () => {
    const result = runDeterministicChecks(
      { type: "llm_review", criterion: "El estilo es consistente" },
      FILES,
    );
    expect(result.failures).toEqual([]);
    expect(result.llmReviewCriteria).toEqual(["El estilo es consistente"]);
  });

  it("acumula fallos de balance, referencias y acceptance_check", () => {
    const files: VirtualFiles = {
      "/index.html": '<html><body><div><a href="fantasma.html">x</a></body></html>',
    };
    const result = runDeterministicChecks(
      { type: "file_exists", path: "/contacto.html" },
      files,
    );
    const checks = result.failures.map((failure) => failure.check);
    expect(checks).toContain("html_balance");
    expect(checks).toContain("local_reference");
    expect(checks).toContain("file_exists");
  });
});
