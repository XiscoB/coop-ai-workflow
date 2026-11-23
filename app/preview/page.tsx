import { PreviewFrame } from "@/components/preview-frame";

export const dynamic = "force-dynamic";

export default function PreviewPage() {
  return (
    <div>
      <h1 className="mb-1 text-2xl font-bold dark:text-stone-100">Web de ejemplo</h1>
      <p className="mb-4 text-stone-600 dark:text-stone-400">
        Esta es la mini-web sobre la que trabaja el equipo de agentes. Es
        navegable: puedes usar sus enlaces. Tras una ejecución, vuelve aquí para
        ver el resultado.
      </p>
      <PreviewFrame />
    </div>
  );
}
