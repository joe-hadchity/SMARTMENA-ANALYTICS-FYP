"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, ChevronDown } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { advisorApi } from "@/lib/api";
import type {
  AdvisorCampaign,
  AdvisorAdSet,
  AdvisorAd,
  AdvisorListResponse,
  AdvisorSingleResponse,
} from "@/lib/api";
import { formatDate, formatNumber } from "@/lib/format";
import type { Locale } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, EmptyState } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import Chip from "@/components/ui/Chip";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { Plus } from "lucide-react";
import AdvisorChatModal from "@/components/campaigns/AdvisorChatModal";

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
  OUTCOME_ENGAGEMENT: "Engagement",
  OUTCOME_SALES: "Sales",
  OUTCOME_LEADS: "Leads",
  OUTCOME_AWARENESS: "Awareness",
  OUTCOME_TRAFFIC: "Traffic",
  OUTCOME_APP_PROMOTION: "App Promotion",
};

type ChipTone = "neutral" | "brand" | "green" | "amber" | "red";

function campaignStatusTone(status: string): ChipTone {
  if (status === "ACTIVE") return "brand"; // Use brand (plum) instead of green
  if (status === "PAUSED") return "amber";
  if (status === "ARCHIVED") return "neutral";
  return "red";
}

// ---------------------------------------------------------------------------
// Campaigns table
// ---------------------------------------------------------------------------

function AdvisorCampaignsTable({
  campaigns,
  locale,
  onViewDetails,
}: {
  campaigns: AdvisorCampaign[];
  locale: Locale;
  onViewDetails: (id: string) => void;
}) {
  return (
    <div
      className="overflow-hidden rounded-xl border shadow-lg transition-shadow duration-300 hover:shadow-xl"
      style={{
        borderColor: 'oklch(var(--border))',
        background: 'oklch(var(--surface))'
      }}
    >
      <div className="overflow-x-auto -mx-1 px-1">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr
              className="border-b text-xs uppercase tracking-wider"
              style={{
                borderColor: 'oklch(var(--border))',
                background: 'linear-gradient(to bottom, oklch(var(--surface-muted) / 0.8), oklch(var(--surface-muted) / 0.4))',
                color: 'oklch(var(--fg-muted))',
              }}
            >
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold">Campaign</th>
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold">Status</th>
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold">Objective</th>
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold">Budget</th>
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold">Ends</th>
              <th className="px-3 md:px-5 py-3.5 md:py-4 text-start font-semibold"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {campaigns.map((c, idx) => {
              // Show warning if status is ACTIVE but effective_status is not
              const hasStatusMismatch = c.status === "ACTIVE" && c.effective_status && c.effective_status !== "ACTIVE";
              const displayStatus = c.effective_status || c.status;

              return (
                <tr
                  key={c.id}
                  className="group transition-all duration-300 ease-out animate-in fade-in slide-in-from-bottom-2"
                  style={{
                    background: 'oklch(var(--surface))',
                    animationDelay: `${idx * 50}ms`,
                    animationFillMode: 'backwards'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(to right, oklch(96% 0.015 320), oklch(var(--surface)))';
                    e.currentTarget.style.transform = 'translateX(4px)';
                    e.currentTarget.style.boxShadow = 'inset 3px 0 0 oklch(46% 0.108 320)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'oklch(var(--surface))';
                    e.currentTarget.style.transform = 'translateX(0)';
                    e.currentTarget.style.boxShadow = 'none';
                  }}
                >
                  <td className="px-3 md:px-5 py-3 md:py-4 font-medium max-w-xs truncate transition-colors duration-200" style={{ color: 'oklch(var(--fg))' }}>
                    {c.name}
                  </td>
                  <td className="px-3 md:px-5 py-3 md:py-4">
                    <div className="flex flex-col gap-1">
                      <Chip tone={campaignStatusTone(displayStatus)}>
                        {displayStatus}
                      </Chip>
                      {hasStatusMismatch && (
                        <span
                          className="text-[10px] animate-pulse"
                          style={{ color: 'oklch(var(--warning))' }}
                          title="Campaign is active but not delivering ads"
                        >
                          ⚠ No ads running
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 md:px-5 py-3 md:py-4 transition-colors duration-200" style={{ color: 'oklch(var(--fg-muted))' }}>
                    {OBJECTIVE_LABELS[c.objective] || c.objective}
                  </td>
                  <td
                    className="px-3 md:px-5 py-3 md:py-4 font-medium tabular-nums transition-colors duration-200"
                    style={{ color: 'oklch(var(--fg))' }}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-baseline sm:gap-1">
                      <span
                        className="inline-block transition-transform duration-200 group-hover:scale-105"
                        style={{
                          background: 'linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(54% 0.130 60) 100%)',
                          WebkitBackgroundClip: 'text',
                          backgroundClip: 'text',
                          WebkitTextFillColor: 'transparent'
                        }}
                      >
                        ${formatNumber(Number(c.daily_budget) / 100, locale)}
                      </span>
                      <span className="text-fg-muted text-[10px] sm:text-xs">/day</span>
                    </div>
                  </td>
                  <td className="px-3 md:px-5 py-3 md:py-4 transition-colors duration-200" style={{ color: 'oklch(var(--fg-muted))' }}>
                    {c.stop_time ? formatDate(c.stop_time, locale) : "—"}
                  </td>
                  <td className="px-3 md:px-5 py-3 md:py-4">
                    <button
                      onClick={() => onViewDetails(c.id)}
                      className="text-xs font-medium transition-all duration-300 hover:scale-110 active:scale-95 px-3 py-1.5 rounded-lg"
                      style={{
                        color: 'oklch(var(--primary))',
                        background: 'transparent'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'white';
                        e.currentTarget.style.background = 'oklch(46% 0.108 320)';
                        e.currentTarget.style.boxShadow = '0 2px 8px oklch(46% 0.108 320 / 0.3)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'oklch(46% 0.108 320)';
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.boxShadow = 'none';
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Campaign details dialog with metrics
// ---------------------------------------------------------------------------

type DateRangePreset = "last_7d" | "last_30d" | "last_90d";

function CampaignDetailsDialog({
  campaignId,
  open,
  onOpenChange,
  locale,
}: {
  campaignId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  locale: Locale;
}) {
  const [dateRange, setDateRange] = useState<DateRangePreset>("last_7d");
  const [expandedAdSets, setExpandedAdSets] = useState<Set<string>>(new Set());

  const detailsQ = useQuery({
    queryKey: ["advisor", "campaign", campaignId],
    queryFn: () => advisorApi.getCampaignDetails(campaignId),
    enabled: open,
  });

  const insightsQ = useQuery({
    queryKey: ["advisor", "campaign", campaignId, "insights", dateRange],
    queryFn: () =>
      advisorApi.getCampaignInsights(campaignId, {
        date_range: dateRange,
      }),
    enabled: open,
  });

  const adSetsQ = useQuery({
    queryKey: ["advisor", "campaign", campaignId, "adsets"],
    queryFn: () => advisorApi.listAdSets(campaignId),
    enabled: open,
  });

  const campaign = detailsQ.data?.data;
  const insights = insightsQ.data?.data;
  const adSets = adSetsQ.data?.data ?? [];

  const toggleAdSet = (adsetId: string) => {
    setExpandedAdSets(prev => {
      const next = new Set(prev);
      if (next.has(adsetId)) {
        next.delete(adsetId);
      } else {
        next.add(adsetId);
      }
      return next;
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{campaign?.name || "Campaign Details"}</DialogTitle>
        </DialogHeader>

        {detailsQ.isLoading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-lg bg-surface-raised animate-pulse" />
            ))}
          </div>
        ) : campaign ? (
          <div className="space-y-6">
            {/* Campaign details grid */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <div className="text-fg-muted text-xs">Status</div>
                <div className="mt-1">
                  <Chip tone={campaignStatusTone(campaign.status)}>
                    {campaign.status}
                  </Chip>
                </div>
              </div>
              <div>
                <div className="text-fg-muted text-xs">Objective</div>
                <div className="font-medium mt-1">
                  {OBJECTIVE_LABELS[campaign.objective] || campaign.objective}
                </div>
              </div>
              <div>
                <div className="text-fg-muted text-xs">Daily Budget</div>
                <div className="font-medium mt-1">
                  ${formatNumber(Number(campaign.daily_budget) / 100, locale)}/day
                </div>
              </div>
              {campaign.buying_type && (
                <div>
                  <div className="text-fg-muted text-xs">Buying Type</div>
                  <div className="font-medium mt-1">{campaign.buying_type}</div>
                </div>
              )}
              {campaign.start_time && (
                <div>
                  <div className="text-fg-muted text-xs">Start Time</div>
                  <div className="font-medium mt-1">
                    {formatDate(campaign.start_time, locale)}
                  </div>
                </div>
              )}
              {campaign.stop_time && (
                <div>
                  <div className="text-fg-muted text-xs">Stop Time</div>
                  <div className="font-medium mt-1">
                    {formatDate(campaign.stop_time, locale)}
                  </div>
                </div>
              )}
            </div>

            {/* Performance metrics section */}
            <div className="border-t border-border pt-4">
              <div className="flex items-center justify-between mb-4">
                <div className="text-sm font-medium">Performance Metrics</div>
                <SegmentedControl<DateRangePreset>
                  value={dateRange}
                  onChange={setDateRange}
                                    options={[
                    { value: "last_7d", label: "7d" },
                    { value: "last_30d", label: "30d" },
                    { value: "last_90d", label: "90d" },
                  ]}
                />
              </div>

              {insightsQ.isLoading ? (
                <div className="grid grid-cols-3 gap-3">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="h-20 rounded-lg bg-surface-raised animate-pulse" />
                  ))}
                </div>
              ) : insights ? (
                <div className="grid grid-cols-3 gap-3">
                  <MetricCard
                    label="Spend"
                    value={insights.spend != null ? `$${formatNumber(insights.spend, locale)}` : "—"}
                  />
                  <MetricCard
                    label="Impressions"
                    value={insights.impressions != null ? formatNumber(insights.impressions, locale) : "—"}
                  />
                  <MetricCard
                    label="Clicks"
                    value={insights.clicks != null ? formatNumber(insights.clicks, locale) : "—"}
                  />
                  <MetricCard
                    label="CPC"
                    value={insights.cpc != null ? `$${insights.cpc.toFixed(2)}` : "—"}
                  />
                  <MetricCard
                    label="CTR"
                    value={insights.ctr != null ? `${insights.ctr.toFixed(2)}%` : "—"}
                  />
                  {insights.conversions !== undefined && insights.conversions !== null && (
                    <MetricCard
                      label="Conversions"
                      value={formatNumber(insights.conversions, locale)}
                    />
                  )}
                  {insights.purchase_roas !== undefined && insights.purchase_roas !== null && (
                    <MetricCard
                      label="ROAS"
                      value={`${insights.purchase_roas.toFixed(2)}x`}
                    />
                  )}
                </div>
              ) : (
                <div className="text-sm text-fg-muted text-center py-4">
                  No insights available for this period
                </div>
              )}
            </div>

            {/* Ad Sets & Ads Hierarchy */}
            <div className="border-t border-border pt-4">
              <div className="text-sm font-medium mb-3">Ad Sets & Ads</div>
              {adSetsQ.isLoading ? (
                <div className="space-y-2">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="h-12 rounded-lg bg-surface-raised animate-pulse" />
                  ))}
                </div>
              ) : adSets.length === 0 ? (
                <div className="text-sm text-fg-muted text-center py-4 border border-border rounded-lg">
                  No ad sets found
                </div>
              ) : (
                <div className="space-y-2">
                  {adSets.map((adset) => (
                    <AdSetItem
                      key={adset.id}
                      adset={adset}
                      campaignId={campaignId}
                      locale={locale}
                      expanded={expandedAdSets.has(adset.id)}
                      onToggle={() => toggleAdSet(adset.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-sm text-fg-muted text-center py-4">
            Campaign details not available
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Ad Set Item with Ads
// ---------------------------------------------------------------------------

function AdSetItem({
  adset,
  campaignId,
  locale,
  expanded,
  onToggle,
}: {
  adset: AdvisorAdSet;
  campaignId: string;
  locale: Locale;
  expanded: boolean;
  onToggle: () => void;
}) {
  const adsQ = useQuery({
    queryKey: ["advisor", "campaign", campaignId, "adset", adset.id, "ads"],
    queryFn: () => advisorApi.listAds(campaignId, adset.id),
    enabled: expanded,
  });

  const ads = adsQ.data?.data ?? [];

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      {/* Ad Set Header */}
      <button
        onClick={onToggle}
        className="w-full px-4 py-3 flex items-center justify-between hover:bg-surface-raised/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-fg-muted" />
          ) : (
            <ChevronRight className="h-4 w-4 text-fg-muted" />
          )}
          <div className="text-start">
            <div className="font-medium text-sm">{adset.name}</div>
            <div className="text-xs text-fg-muted">
              {adset.optimization_goal || "—"} · $
              {formatNumber(Number(adset.daily_budget || 0) / 100, locale)}/day
            </div>
          </div>
        </div>
        <Chip tone={campaignStatusTone(adset.effective_status || adset.status)}>
          {adset.effective_status || adset.status}
        </Chip>
      </button>

      {/* Ads List (when expanded) */}
      {expanded && (
        <div className="border-t border-border bg-surface-raised/30">
          {adsQ.isLoading ? (
            <div className="p-3 space-y-2">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="h-10 rounded bg-surface animate-pulse" />
              ))}
            </div>
          ) : ads.length === 0 ? (
            <div className="p-4 text-center text-xs text-fg-muted">No ads in this ad set</div>
          ) : (
            <div className="divide-y divide-border">
              {ads.map((ad) => (
                <div key={ad.id} className="px-4 py-2.5 flex items-center justify-between">
                  <div className="text-sm">
                    <div className="font-medium">{ad.name}</div>
                    {ad.creative && (
                      <div className="text-xs text-fg-muted mt-0.5">
                        Creative: {ad.creative.name}
                      </div>
                    )}
                  </div>
                  <Chip tone={campaignStatusTone(ad.effective_status || ad.status)}>
                    {ad.effective_status || ad.status}
                  </Chip>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-surface p-3">
      <div className="text-xs text-fg-muted">{label}</div>
      <div className="text-lg font-semibold mt-1">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

type CampaignFilter = "all" | "active" | "paused" | "effective";

export default function CampaignsListPage() {
  const { t, locale } = useI18n();
  const [statusFilter, setStatusFilter] = useState<CampaignFilter>("all");
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedCampaignId, setSelectedCampaignId] = useState<string | null>(null);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // Fetch campaigns with API-side filtering (all filters supported by Advisor API)
  const campaignsQ = useQuery<AdvisorListResponse<AdvisorCampaign>>({
    queryKey: ["advisor", "campaigns", statusFilter],
    queryFn: () => {
      // Map UI filter to API status parameter (lowercase for Advisor API)
      const apiStatus = statusFilter === "all" ? undefined : statusFilter;
      return advisorApi.listCampaigns({
        status: apiStatus,
        limit: 50,
      });
    },
  });

  // Not configured state
  if (campaignsQ.data?._status === "not_configured") {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-fg">
            {t("campaigns.title", "Campaigns")}
          </h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
        <Card>
          <EmptyState
            title="Advisor API not configured"
            description="Configure ADVISOR_API_BASE_URL and ADVISOR_CLIENT_ID in backend/.env to connect."
          />
        </Card>
      </div>
    );
  }

  // Error state
  if (campaignsQ.isError) {
    return (
      <div className="space-y-6 max-w-7xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-fg">
            {t("campaigns.title", "Campaigns")}
          </h1>
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
        <Card>
          <EmptyState
            title="Failed to load campaigns"
            description="Could not connect to Advisor API. Please try again later."
          />
        </Card>
      </div>
    );
  }

  // Sort campaigns: ongoing first (by created_time DESC), then ending campaigns (by stop_time DESC)
  const campaigns = (campaignsQ.data?.data ?? []).sort((a, b) => {
    // Ongoing campaigns (no end date) come first
    if (!a.stop_time && b.stop_time) return -1;
    if (a.stop_time && !b.stop_time) return 1;
    // Both ongoing - sort by created_time DESC (newest first)
    if (!a.stop_time && !b.stop_time) {
      return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
    }
    // Both have end dates - sort by end date DESC (latest ending first)
    return new Date(b.stop_time!).getTime() - new Date(a.stop_time!).getTime();
  });

  const handleViewDetails = (campaignId: string) => {
    setSelectedCampaignId(campaignId);
    setDetailsDialogOpen(true);
  };

  return (
    <div className="space-y-6 max-w-7xl animate-in fade-in duration-500">
      {/* Header with title, filters, and create button */}
      <div className="animate-in slide-in-from-top-4 duration-700">
        {/* Mobile: Stack everything vertically */}
        <div className="flex flex-col gap-4 md:hidden">
          {/* Title and button on top */}
          <div className="flex items-center justify-between gap-3">
            <h1
              className="text-xl font-semibold"
              style={{
                color: 'oklch(var(--fg))',
                background: 'linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(54% 0.130 60) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {t("campaigns.title", "Campaigns")}
            </h1>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                console.log('Create button clicked (mobile)');
                setCreateModalOpen(true);
              }}
              className="shrink-0 hover:scale-105 active:scale-95 transition-transform duration-200"
              style={{
                background: 'linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(50% 0.110 320) 100%)',
                boxShadow: '0 4px 12px oklch(46% 0.108 320 / 0.25)'
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden xs:inline">Create</span>
            </Button>
          </div>

          {/* Filters below on mobile */}
          {!campaignsQ.isLoading && (
            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-hide">
              {(
                [
                  { value: "all", label: "All" },
                  { value: "active", label: "Active" },
                  { value: "paused", label: "Paused" },
                  { value: "effective", label: "Effective" },
                ] as { value: CampaignFilter; label: string }[]
              ).map((filter, idx) => {
                const active = statusFilter === filter.value;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatusFilter(filter.value)}
                    className={cn(
                      "h-8 px-3.5 rounded-full text-xs font-medium border transition-all duration-300 ease-out shrink-0",
                      "hover:scale-105 active:scale-95"
                    )}
                    style={{
                      background: active
                        ? 'oklch(46% 0.108 320)'
                        : 'oklch(var(--surface))',
                      color: active
                        ? 'white'
                        : 'oklch(var(--fg-muted))',
                      borderColor: active
                        ? 'oklch(46% 0.108 320)'
                        : 'oklch(var(--border))',
                      boxShadow: active
                        ? '0 4px 12px oklch(46% 0.108 320 / 0.2)'
                        : 'none',
                      animationDelay: `${idx * 50}ms`
                    }}
                    aria-pressed={active}
                  >
                    {filter.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Desktop/Tablet: All in one row */}
        <div className="hidden md:flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 flex-1 min-w-0">
            <h1
              className="text-2xl font-semibold shrink-0"
              style={{
                color: 'oklch(var(--fg))',
                background: 'linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(54% 0.130 60) 100%)',
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              {t("campaigns.title", "Campaigns")}
            </h1>

            {/* Status filter pills - inline with title */}
            {!campaignsQ.isLoading && (
              <div className="flex items-center gap-2 animate-in slide-in-from-left-4 duration-500 delay-150">
                {(
                  [
                    { value: "all", label: "All" },
                    { value: "active", label: "Active" },
                    { value: "paused", label: "Paused" },
                    { value: "effective", label: "Effective" },
                  ] as { value: CampaignFilter; label: string }[]
                ).map((filter, idx) => {
                  const active = statusFilter === filter.value;
                  return (
                    <button
                      key={filter.value}
                      type="button"
                      onClick={() => setStatusFilter(filter.value)}
                      className={cn(
                        "h-8 px-3.5 rounded-full text-xs font-medium border transition-all duration-300 ease-out",
                        "hover:scale-105 active:scale-95"
                      )}
                      style={{
                        background: active
                          ? 'oklch(46% 0.108 320)'
                          : 'oklch(var(--surface))',
                        color: active
                          ? 'white'
                          : 'oklch(var(--fg-muted))',
                        borderColor: active
                          ? 'oklch(46% 0.108 320)'
                          : 'oklch(var(--border))',
                        boxShadow: active
                          ? '0 4px 12px oklch(46% 0.108 320 / 0.2)'
                          : 'none',
                        animationDelay: `${idx * 50}ms`
                      }}
                      aria-pressed={active}
                    >
                      {filter.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Create Campaign button - always on the right */}
          <Button
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
            className="shrink-0 animate-in slide-in-from-right-4 duration-500 delay-200 hover:scale-105 active:scale-95 transition-transform duration-200"
            style={{
              background: 'linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(50% 0.110 320) 100%)',
              boxShadow: '0 4px 12px oklch(46% 0.108 320 / 0.25)'
            }}
          >
            <Plus className="h-4 w-4" />
            Create Campaign
          </Button>
        </div>
      </div>

      {/* Loading state */}
      {campaignsQ.isLoading ? (
        <div className="space-y-3 animate-in fade-in duration-300">
          {[...Array(5)].map((_, i) => (
            <div
              key={i}
              className="h-16 rounded-xl animate-pulse"
              style={{
                background: 'oklch(var(--surface-muted))',
                animationDelay: `${i * 100}ms`,
                animationDuration: '1.5s'
              }}
            />
          ))}
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-700 delay-300">
          {/* Campaigns table */}
          {campaigns.length === 0 ? (
            <Card>
              <EmptyState
                title="No campaigns found"
                description="No campaigns match the selected filters."
              />
            </Card>
          ) : (
            <AdvisorCampaignsTable
              campaigns={campaigns}
              locale={locale}
              onViewDetails={handleViewDetails}
            />
          )}
        </div>
      )}

      {/* Details dialog */}
      {selectedCampaignId && (
        <CampaignDetailsDialog
          campaignId={selectedCampaignId}
          open={detailsDialogOpen}
          onOpenChange={setDetailsDialogOpen}
          locale={locale}
        />
      )}

      {/* AI Advisor Chat Modal */}
      <AdvisorChatModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
      />
    </div>
  );
}
