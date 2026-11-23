"use client";

import { useState } from "react";
import { ResetSandboxButton } from "@/components/reset-sandbox-button";

export function PreviewFrame() {
  const [frameKey, setFrameKey] = useState(0);

  return (
    <div>
      <div className="mb-3">
        <ResetSandboxButton onReset={() => setFrameKey((key) => key + 1)} />
      </div>
      <iframe
        key={frameKey}
        src="/site/index.html"
        title="Web de ejemplo (mini-web sandbox)"
        className="h-[70vh] w-full rounded-lg border border-stone-300 bg-white dark:border-stone-700"
      />
    </div>
  );
}
