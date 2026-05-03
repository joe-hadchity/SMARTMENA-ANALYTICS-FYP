"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mountain } from "lucide-react";
import { toast } from "sonner";

import { Switch } from "@/components/ui/Switch";
import {
  activateBorn2HikeDemo,
  BORN2HIKE_PREVIOUS_WORKSPACE_KEY,
  isBorn2HikeWorkspace,
} from "@/lib/born2hikeDemo";
import { setStoredWorkspaceId, workspacesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

export default function Born2HikeDemoSwitch() {
  const qc = useQueryClient();
  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const active = isBorn2HikeWorkspace(workspaceQ.data);

  const activate = useMutation({
    mutationFn: async () => {
      rememberPreviousWorkspace(workspaceQ.data?.id, active);
      return activateBorn2HikeDemo();
    },
    onSuccess: (result) => {
      qc.setQueryData(["workspace", "current"], result.workspace);
      qc.invalidateQueries();
      toast.success("Born2Hike demo loaded", {
        description: result.bootstrap
          ? `${result.bootstrap.postsSynced} posts synced for the hiking demo.`
          : "The hiking profile is active. Demo source seeding was skipped.",
      });
      if (result.warnings.length) {
        toast.warning("Demo loaded with warnings", {
          description: result.warnings.slice(0, 2).join(" / "),
        });
      }
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error ? err.message : "Could not load Born2Hike demo.",
      );
    },
  });

  const leaveDemo = () => {
    const previous = readPreviousWorkspace();
    if (previous && previous !== workspaceQ.data?.id) {
      setStoredWorkspaceId(previous);
      clearPreviousWorkspace();
      qc.invalidateQueries();
      toast.success("Returned to your previous workspace.");
      return;
    }

    toast.info("Born2Hike is active", {
      description: "Use the workspace switcher to choose another workspace.",
    });
  };

  const pending = activate.isPending || workspaceQ.isLoading;

  return (
    <label
      className={cn(
        "inline-flex h-8 items-center gap-2 rounded-md border border-border bg-surface px-2 text-xs shadow-xs",
        "text-fg-muted transition-colors hover:bg-surface-muted",
        pending && "opacity-70",
      )}
      title="Load the Born2Hike hiking demo"
    >
      <Mountain className={cn("h-3.5 w-3.5", active ? "text-primary" : "")} />
      <span className="hidden xl:inline font-medium text-fg">Born2Hike</span>
      <Switch
        checked={active}
        disabled={pending}
        onCheckedChange={(checked) => {
          if (checked) activate.mutate();
          else leaveDemo();
        }}
        aria-label="Load Born2Hike demo"
      />
    </label>
  );
}

function rememberPreviousWorkspace(id?: string | null, alreadyActive?: boolean) {
  if (!id || alreadyActive || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(BORN2HIKE_PREVIOUS_WORKSPACE_KEY, id);
  } catch {
    // Local storage can be unavailable in private browsing.
  }
}

function readPreviousWorkspace() {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(BORN2HIKE_PREVIOUS_WORKSPACE_KEY);
  } catch {
    return null;
  }
}

function clearPreviousWorkspace() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(BORN2HIKE_PREVIOUS_WORKSPACE_KEY);
  } catch {
    // ignore
  }
}
