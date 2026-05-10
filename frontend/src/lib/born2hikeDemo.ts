"use client";

import { setStoredWorkspaceId, workspacesApi } from "@/lib/api";
import type { Workspace } from "@/lib/types";

export type Born2HikeDemoResult = {
  workspace: Workspace;
  bootstrap: Awaited<ReturnType<typeof workspacesApi.demoBootstrap>> | null;
  warnings: string[];
};

export const BORN2HIKE_PREVIOUS_WORKSPACE_KEY =
  "smartmena.previousWorkspaceIdBeforeBorn2Hike";

export function isBorn2HikeWorkspace(workspace?: Workspace | null) {
  if (!workspace) return false;
  const profile = workspace.brand_voice_json as
    | { business_name?: unknown; page_name?: unknown; instagram_handle?: unknown }
    | null
    | undefined;
  const name = [
    workspace.slug,
    workspace.name,
    profile?.business_name,
    profile?.page_name,
    profile?.instagram_handle,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
  return name.includes("born2hike");
}

export async function activateBorn2HikeDemo(): Promise<Born2HikeDemoResult> {
  const existing = await workspacesApi.list();
  let workspace = existing.find((w) => w.slug === "born2hike") || null;

  if (!workspace) {
    try {
      workspace = await workspacesApi.create({
        name: "Born2Hike",
        slug: "born2hike",
        region_default: "LB",
        locale_default: "en",
        industry: "outdoor_travel",
      });
    } catch (err) {
      const latest = await workspacesApi.list();
      workspace = latest.find((w) => w.slug === "born2hike") || null;
      if (!workspace) throw err;
    }
  }

  const profile = await workspacesApi.applyBorn2HikeProfile(workspace.id);
  setStoredWorkspaceId(workspace.id);

  const warnings: string[] = [];
  let bootstrap: Born2HikeDemoResult["bootstrap"] = null;
  try {
    bootstrap = await workspacesApi.demoBootstrap(workspace.id);
    warnings.push(...(bootstrap.warnings || []));
  } catch (err) {
    warnings.push(
      err instanceof Error
        ? `demo_seed_skipped: ${err.message}`
        : "demo_seed_skipped",
    );
  }

  return {
    workspace: {
      ...workspace,
      name: profile.business_name,
      industry_hint: profile.category,
      primary_region: profile.country,
      brand_voice_json: profile,
    },
    bootstrap,
    warnings,
  };
}
