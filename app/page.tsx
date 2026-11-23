"use client";

import { useState } from "react";
import { ActiveRunCard } from "@/components/active-run-card";
import { RecentRuns } from "@/components/recent-runs";
import { RequestForm } from "@/components/request-form";
import { SandboxStatusCard } from "@/components/sandbox-status";
import { WelcomeModal } from "@/components/welcome-modal";

export default function DashboardPage() {
  const [activeRunId, setActiveRunId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-4">
      <WelcomeModal />
      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <RequestForm
          hasActiveRun={activeRunId !== null}
          onCreated={(id) => {
            setActiveRunId(id);
            setRefreshKey((key) => key + 1);
          }}
        />
        <SandboxStatusCard
          hasActiveRun={activeRunId !== null}
          refreshKey={refreshKey}
        />
      </div>

      {activeRunId && <ActiveRunCard key={activeRunId} runId={activeRunId} />}

      <RecentRuns refreshKey={refreshKey} onActiveRun={setActiveRunId} />
    </div>
  );
}
