"use client";

import { useQuery } from "@tanstack/react-query";
import { Activity, Mountain, Settings } from "lucide-react";
import { useEffect, useState } from "react";

import BusinessProfileSettings from "@/components/settings/BusinessProfileSettings";
import { Badge } from "@/components/ui/Badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import PageHeader from "@/components/ui/PageHeader";
import { Switch } from "@/components/ui/Switch";
import { workspacesApi } from "@/lib/api";
import {
  readLiveSignalsEnabled,
  writeLiveSignalsEnabled,
} from "@/lib/uiPreferences";

export default function SettingsPage() {
  const [liveSignalsEnabled, setLiveSignalsEnabled] = useState(true);

  const current = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });

  const workspace = current.data;

  useEffect(() => {
    setLiveSignalsEnabled(readLiveSignalsEnabled());
  }, []);

  const updateLiveSignals = (enabled: boolean) => {
    setLiveSignalsEnabled(enabled);
    writeLiveSignalsEnabled(enabled);
  };

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Business settings"
        subtitle="Workspace profile, interface preferences, and discovery seeds."
      />

      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-primary" />
              Interface
            </CardTitle>
            <CardDescription>
              Keep the workspace clean while still showing the live context you need.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-muted px-3 py-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-fg">Live Signals bar</div>
              <div className="mt-0.5 text-xs text-fg-muted">
                Show compact inbox and insight updates at the bottom of the workspace.
              </div>
            </div>
            <Switch
              aria-label="Toggle Live Signals bar"
              checked={liveSignalsEnabled}
              onCheckedChange={updateLiveSignals}
            />
          </div>
        </CardContent>
      </Card>

      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-primary" />
              Business intelligence profile
            </CardTitle>
            <CardDescription>
              Market, audience, and discovery context for this workspace.
            </CardDescription>
          </div>
          <Badge tone="success" dot>
            Evidence-first setup
          </Badge>
        </CardHeader>
        <CardContent>
          {workspace ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
              <MiniStat label="Workspace" value={workspace.name} />
              <MiniStat label="Region" value={workspace.region_default || "LB"} />
              <MiniStat label="Industry" value={workspace.industry || "outdoor_travel"} />
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-fg-muted">
              <Settings className="h-4 w-4 animate-spin" />
              Loading workspace...
            </div>
          )}
        </CardContent>
      </Card>

      {workspace ? (
        <BusinessProfileSettings workspaceId={workspace.id} />
      ) : null}
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface-muted px-3 py-2">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="mt-0.5 font-medium text-fg truncate">{value}</div>
    </div>
  );
}
