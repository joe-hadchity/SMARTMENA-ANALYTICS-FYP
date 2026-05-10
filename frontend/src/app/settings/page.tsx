"use client";

import { useQuery } from "@tanstack/react-query";
import { Mountain, Settings } from "lucide-react";

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
import { workspacesApi } from "@/lib/api";

export default function SettingsPage() {
  const current = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });

  const workspace = current.data;

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        title="Business settings"
        subtitle="Born2Hike profile, market, and discovery seeds."
      />

      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle className="flex items-center gap-2">
              <Mountain className="h-4 w-4 text-primary" />
              Born2Hike intelligence profile
            </CardTitle>
            <CardDescription>
              Lebanon hiking group profile.
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
