import { FEATURES, IMPROVEMENTS } from "@/components/about-content";

export const dynamic = "force-static";

export default function AcercaDePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <section>
        <h1 className="mb-2 text-2xl font-bold dark:text-stone-100">
          Acerca de Coop AI Workflow
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          Una demo técnica construida con <strong>spec-driven development</strong>{" "}
          (GitHub Spec Kit): toda la planificación vive en el propio repositorio
          (<code>.specify/</code>, <code>specs/</code>, <code>docs/</code>). El
          objetivo es demostrar un equipo pequeño de agentes de IA trabajando
          juntos de forma visible, robusta y gratuita.
        </p>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold dark:text-stone-100">
          Qué incluye la webapp
        </h2>
        <ul className="list-disc space-y-1.5 pl-5 text-stone-700 dark:text-stone-300">
          {FEATURES.map((feature) => (
            <li key={feature}>{feature}</li>
          ))}
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-bold dark:text-stone-100">
          Posibles mejoras (roadmap de ideas)
        </h2>
        <p className="mb-2 text-sm text-stone-600 dark:text-stone-400">
          Conscientemente fuera del alcance de esta entrega, ordenadas por
          valor percibido:
        </p>
        <ol className="list-decimal space-y-1.5 pl-5 text-stone-700 dark:text-stone-300">
          {IMPROVEMENTS.map((improvement) => (
            <li key={improvement}>{improvement}</li>
          ))}
        </ol>
      </section>
    </div>
  );
}
