"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Plus, ExternalLink } from "lucide-react";

import PageHeader from "@/components/ui/PageHeader";
import { Card, EmptyState } from "@/components/ui/Card";
import Chip from "@/components/ui/Chip";
import { useI18n } from "@/i18n/I18nProvider";
import { campaignsApi, metaAdsApi } from "@/lib/api";
import type { MetaAdsCampaign, MetaAdsListResponse } from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/types";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const OBJECTIVE_LABELS: Record<string, string> = {
  LINK_CLICKS: "Clicks",
  CONVERSIONS: "Conversions",
  PAGE_LIKES: "Page Likes",
  POST_ENGAGEMENT: "Engagement",
  BRAND_AWARENESS: "Awareness",
  APP_INSTALLS: "App Installs",
  REACH: "Reach",
  VIDEO_VIEWS: "Video Views",
  LEAD_GENERATION: "Leads",
  MESSAGES: "Messages",
  STORE_VISITS: "Store Visits",
};

type ChipTone = "neutral" | "brand" | "green" | "amber" | "red";

function campaignStatusTone(status: string): ChipTone {
  if (status === "ACTIVE") return "green";
  if (status === "PAUSED") return "amber";
  if (status === "ARCHIVED") return "neutral";
  return "red";
}

function formatBudget(campaign: MetaAdsCampaign, locale: Locale): string {
  if (campaign.daily_budget) {
    return `$${formatNumber(Number(campaign.daily_budget) / 100, locale)}/day`;
  }
  if (campaign.lifetime_budget) {
    return `$${formatNumber(Number(campaign.lifetime_budget) / 100, locale)} total`;
  }
  return "—";
}

// ---------------------------------------------------------------------------
// Meta Ads campaigns table
// ---------------------------------------------------------------------------

function MetaAdsCampaignsTable({
  campaigns,
  locale,
}: {
  campaigns: MetaAdsCampaign[];
  locale: Locale;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-surface-raised text-fg-muted text-xs uppercase tracking-wide">
            <th className="px-4 py-3 text-start font-medium">Campaign</th>
            <th className="px-4 py-3 text-start font-medium">Status</th>
            <th className="px-4 py-3 text-start font-medium">Objective</th>
            <th className="px-4 py-3 text-start font-medium">Budget</th>
            <th className="px-4 py-3 text-start font-medium">Created</th>
            <th className="px-4 py-3 text-start font-medium"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {campaigns.map((c) => (
            <tr key={c.id} className="hover:bg-surface-raised/50 transition-colors">
              <td className="px-4 py-3 font-medium max-w-xs truncate">{c.name}</td>
              <td className="px-4 py-3">
                <Chip tone={campaignStatusTone(c.effective_status || c.status)}>
                  {c.effective_status || c.status}
                </Chip>
              </td>
              <td className="px-4 py-3 text-fg-muted">
                {OBJECTIVE_LABELS[c.objective] || c.objective}
              </td>
              <td className="px-4 py-3 font-medium">{formatBudget(c, locale)}</td>
              <td className="px-4 py-3 text-fg-muted">
                {formatDate(c.created_time, locale)}
              </td>
              <td className="px-4 py-3">
                <a
                  href={`https://www.facebook.com/adsmanager/manage/campaigns?selected_campaign_ids=${c.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-brand-500 hover:text-brand-600 inline-flex items-center gap-1"
                  title="Open in Ads Manager"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Meta Ads tab content
// ---------------------------------------------------------------------------

function MetaAdsTab({ locale }: { locale: Locale }) {
  const accountsQ = useQuery({
    queryKey: ["metaAds", "accounts"],
    queryFn: () => metaAdsApi.accounts(),
  });

  const firstAccountId = accountsQ.data?.data?.[0]?.id;

  const campaignsQ = useQuery<MetaAdsListResponse<MetaAdsCampaign>>({
    queryKey: ["metaAds", "campaigns", firstAccountId],
    queryFn: () => metaAdsApi.listCampaigns({ adAccountId: firstAccountId! }),
    enabled: Boolean(firstAccountId),
  });

  // Not connected — OAuth token not available
  if (
    accountsQ.data?._status === "not_implemented" ||
    (!accountsQ.isLoading && !accountsQ.data?.data?.length && accountsQ.isSuccess)
  ) {
    return (
      <Card>
        <EmptyState
          title="Meta Ads not connected"
          description="Connect your Meta account to manage paid campaigns directly from SmartMENA."
          cta={
            <Link href="/connections" className="btn btn-primary">
              Connect Meta
            </Link>
          }
        />
      </Card>
    );
  }

  if (accountsQ.isLoading || campaignsQ.isLoading) {
    return (
      <div className="space-y-2">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
        ))}
      </div>
    );
  }

  const campaigns = campaignsQ.data?.data ?? [];

  return (
    <div className="space-y-4">
      {/* Account selector row */}
      <div className="flex items-center justify-between gap-4">
        <div className="text-sm text-fg-muted">
          Ad account:{" "}
          <span className="font-medium text-fg">
            {accountsQ.data?.data?.[0]?.name ?? firstAccountId}
          </span>
        </div>
        <Link
          href="https://www.facebook.com/adsmanager"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-ghost text-xs inline-flex items-center gap-1"
        >
          Open Ads Manager <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {campaigns.length === 0 ? (
        <Card>
          <EmptyState
            title="No campaigns found"
            description="Create your first Meta Ads campaign to get started."
          />
        </Card>
      ) : (
        <MetaAdsCampaignsTable campaigns={campaigns} locale={locale} />
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type Tab = "organic" | "meta-ads";

export default function CampaignsListPage() {
  const { t, locale } = useI18n();
  const [activeTab, setActiveTab] = useState<Tab>("organic");

  const q = useQuery({
    queryKey: ["campaigns"],
    queryFn: () => campaignsApi.list({ limit: 100 }),
  });

  return (
    <div className="space-y-6 max-w-6xl">
      <PageHeader
        variant="compact"
        title={t("campaigns.title")}
        actions={
          activeTab === "organic" ? (
            <Link href="/campaigns/new" className="btn btn-primary">
              <Plus className="h-4 w-4" />
              {t("campaigns.new")}
            </Link>
          ) : null
        }
      />

      {/* Tab strip */}
      <div className="flex gap-1 border-b border-border">
        {(
          [
            { id: "organic", label: "Organic" },
            { id: "meta-ads", label: "Meta Ads" },
          ] as { id: Tab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={[
              "px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors",
              activeTab === tab.id
                ? "border-brand-500 text-brand-600"
                : "border-transparent text-fg-muted hover:text-fg",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Organic tab */}
      {activeTab === "organic" && (
        <>
          {q.data && q.data.length === 0 ? (
            <Card>
              <EmptyState
                title={t("common.empty")}
                cta={
                  <Link href="/campaigns/new" className="btn btn-primary">
                    {t("campaigns.new")}
                  </Link>
                }
              />
            </Card>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {q.data?.map((c) => (
              <Link key={c.id} href={`/campaigns/${c.id}`} className="block">
                <Card className="hover:border-brand-300 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-medium truncate">{c.campaign_name}</div>
                    <Chip tone="brand">{c.platform}</Chip>
                  </div>
                  <div className="mt-2 text-xs text-fg-muted">
                    {formatDate(c.created_at, locale)}
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <div className="text-fg-muted">Budget</div>
                      <div className="font-medium">
                        ${formatNumber(c.budget, locale)}
                      </div>
                    </div>
                    <div>
                      <div className="text-fg-muted">Region</div>
                      <div className="font-medium">{c.region || "—"}</div>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        </>
      )}

      {/* Meta Ads tab */}
      {activeTab === "meta-ads" && <MetaAdsTab locale={locale} />}
    </div>
  );
}
