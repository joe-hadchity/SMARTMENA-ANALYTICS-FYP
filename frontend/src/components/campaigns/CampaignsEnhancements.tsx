/**
 * Campaign Page Enhancements
 *
 * This file contains reusable components for enhancing the campaigns page.
 * Copy the components you need into your campaigns/page.tsx
 */

import { useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Play,
  Pause,
  DollarSign,
  Copy,
  Sparkles,
  Eye,
  TrendingUp,
  Target,
  Search,
  Filter
} from "lucide-react";
import { MetricCard } from "./MetricCard";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { AdvisorCampaign } from "@/lib/api";

// ============================================================================
// 1. PERFORMANCE METRICS CARDS
// ============================================================================

type MetricsData = {
  totalSpend: string;
  spendChange: string;
  impressions: string;
  impressionsChange: string;
  avgCPM: string;
  cpmChange: string;
  activeCampaigns: string;
};

export function useCalculateMetrics(campaigns: AdvisorCampaign[]): MetricsData | null {
  return useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;

    const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;

    // Calculate total spend (7 days estimate)
    const totalSpend = campaigns.reduce((sum, c) => {
      const budget = Number(c.daily_budget || 0) / 100;
      return sum + budget * 7;
    }, 0);

    // Mock calculations - replace with real insights data from API
    const totalImpressions = campaigns.length * 15000;
    const avgCPM = totalSpend > 0 ? (totalSpend / (totalImpressions / 1000)) : 0;

    return {
      totalSpend: `$${totalSpend.toFixed(0)}`,
      spendChange: "+12%",
      impressions: `${(totalImpressions / 1000).toFixed(1)}K`,
      impressionsChange: "+8%",
      avgCPM: `$${avgCPM.toFixed(2)}`,
      cpmChange: "-5%",
      activeCampaigns: activeCampaigns.toString(),
    };
  }, [campaigns]);
}

export function PerformanceMetricsCards({ metrics }: { metrics: MetricsData }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <MetricCard
        label="Total Spend (7d)"
        value={metrics.totalSpend}
        change={metrics.spendChange}
        changeType="negative"
        icon={<DollarSign className="h-5 w-5" />}
      />
      <MetricCard
        label="Impressions"
        value={metrics.impressions}
        change={metrics.impressionsChange}
        changeType="positive"
        icon={<Eye className="h-5 w-5" />}
      />
      <MetricCard
        label="Avg CPM"
        value={metrics.avgCPM}
        change={metrics.cpmChange}
        changeType="positive"
        icon={<TrendingUp className="h-5 w-5" />}
      />
      <MetricCard
        label="Active Campaigns"
        value={metrics.activeCampaigns}
        icon={<Target className="h-5 w-5" />}
      />
    </div>
  );
}

// ============================================================================
// 2. SEARCH & FILTERS BAR
// ============================================================================

type FiltersProps = {
  searchQuery: string;
  onSearchChange: (value: string) => void;
  objectiveFilter: string;
  onObjectiveChange: (value: string) => void;
  sortBy: string;
  onSortChange: (value: string) => void;
  objectives: Record<string, string>;
};

export function SearchAndFilters({
  searchQuery,
  onSearchChange,
  objectiveFilter,
  onObjectiveChange,
  sortBy,
  onSortChange,
  objectives,
}: FiltersProps) {
  return (
    <div className="flex flex-col md:flex-row gap-3 mb-4 animate-in fade-in slide-in-from-top-4 duration-500">
      {/* Search */}
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-fg-muted" />
        <input
          type="text"
          placeholder="Search campaigns..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand/50 transition-shadow text-sm"
        />
      </div>

      {/* Objective Filter */}
      <select
        value={objectiveFilter}
        onChange={(e) => onObjectiveChange(e.target.value)}
        className="px-4 py-2.5 border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand/50 transition-shadow text-sm min-w-[180px]"
      >
        <option value="all">All Objectives</option>
        {Object.entries(objectives).map(([key, label]) => (
          <option key={key} value={key}>{label}</option>
        ))}
      </select>

      {/* Sort */}
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value)}
        className="px-4 py-2.5 border rounded-lg bg-surface focus:outline-none focus:ring-2 focus:ring-brand/50 transition-shadow text-sm min-w-[180px]"
      >
        <option value="created">Sort by: Date</option>
        <option value="name">Sort by: Name</option>
        <option value="budget">Sort by: Budget</option>
        <option value="status">Sort by: Status</option>
      </select>
    </div>
  );
}

// Hook for filtering and sorting campaigns
export function useFilteredCampaigns(
  campaigns: AdvisorCampaign[],
  searchQuery: string,
  objectiveFilter: string,
  sortBy: string
) {
  return useMemo(() => {
    let filtered = [...campaigns];

    // Search
    if (searchQuery) {
      filtered = filtered.filter(c =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Objective filter
    if (objectiveFilter !== "all") {
      filtered = filtered.filter(c => c.objective === objectiveFilter);
    }

    // Sort
    filtered.sort((a, b) => {
      if (sortBy === "name") return a.name.localeCompare(b.name);
      if (sortBy === "budget") return (Number(b.daily_budget) || 0) - (Number(a.daily_budget) || 0);
      if (sortBy === "status") return a.status.localeCompare(b.status);
      return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
    });

    return filtered;
  }, [campaigns, searchQuery, objectiveFilter, sortBy]);
}

// ============================================================================
// 3. QUICK ACTIONS CELL
// ============================================================================

type QuickActionsProps = {
  campaign: AdvisorCampaign;
  editingBudget: string | null;
  budgetValue: string;
  onEditBudgetStart: () => void;
  onEditBudgetCancel: () => void;
  onBudgetChange: (value: string) => void;
  onBudgetSave: () => void;
};

export function QuickActionsCampaignRow({
  campaign,
  editingBudget,
  budgetValue,
  onEditBudgetStart,
  onEditBudgetCancel,
  onBudgetChange,
  onBudgetSave,
}: QuickActionsProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
      // TODO: Replace with your actual API call
      console.log(`Toggle campaign ${id} to ${newStatus}`);
      await new Promise(resolve => setTimeout(resolve, 500)); // Mock delay
      // return advisorApi.updateCampaignStatus(id, newStatus);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["advisor-campaigns"] });
    },
  });

  if (editingBudget === campaign.id) {
    return (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={budgetValue}
          onChange={(e) => onBudgetChange(e.target.value)}
          className="w-20 px-2 py-1 text-xs border rounded focus:outline-none focus:ring-2 focus:ring-brand/50"
          placeholder="Budget"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === 'Enter') onBudgetSave();
            if (e.key === 'Escape') onEditBudgetCancel();
          }}
        />
        <Button
          size="sm"
          onClick={onBudgetSave}
          style={{ background: 'oklch(46% 0.108 320)', color: 'white' }}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={onEditBudgetCancel}
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
      {/* Pause/Resume */}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          toggleStatusMutation.mutate({
            id: campaign.id,
            newStatus: campaign.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
          });
        }}
        disabled={toggleStatusMutation.isPending}
        title={campaign.status === 'ACTIVE' ? 'Pause' : 'Resume'}
      >
        {campaign.status === 'ACTIVE' ? (
          <Pause className="h-3.5 w-3.5" />
        ) : (
          <Play className="h-3.5 w-3.5" />
        )}
      </Button>

      {/* Edit Budget */}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          onEditBudgetStart();
        }}
        title="Edit Budget"
      >
        <DollarSign className="h-3.5 w-3.5" />
      </Button>

      {/* Duplicate */}
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          console.log('Duplicate campaign', campaign.id);
          // TODO: Implement duplicate logic
        }}
        title="Duplicate Campaign"
      >
        <Copy className="h-3.5 w-3.5" />
      </Button>

      {/* Ask Advisor */}
      <Button
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/advisor?campaign=${campaign.id}&name=${encodeURIComponent(campaign.name)}`);
        }}
        style={{ background: 'oklch(46% 0.108 320)', color: 'white' }}
        title="Ask Advisor"
      >
        <Sparkles className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

// ============================================================================
// 4. PERFORMANCE ALERT BADGE
// ============================================================================

export function getPerformanceAlert(campaign: AdvisorCampaign) {
  // Mock logic - replace with real performance data from insights
  const budget = Number(campaign.daily_budget || 0) / 100;
  const mockCPM = Math.random() * 5;

  if (mockCPM > 3.5) {
    return { text: "⚠️ High CPM", type: "warning" as const, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" };
  }
  if (campaign.status === 'ACTIVE' && budget > 50) {
    return { text: "✅ Outperforming", type: "success" as const, color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" };
  }
  if (campaign.status === 'PAUSED') {
    return { text: "⏸️ Paused", type: "neutral" as const, color: "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400" };
  }
  return null;
}

export function PerformanceAlertBadge({ campaign }: { campaign: AdvisorCampaign }) {
  const router = useRouter();
  const alert = getPerformanceAlert(campaign);

  if (!alert) return null;

  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full w-fit cursor-pointer hover:opacity-80 transition-opacity",
        alert.color
      )}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/advisor?campaign=${campaign.id}&alert=${encodeURIComponent(alert.text)}`);
      }}
      title="Click to ask advisor about this"
    >
      {alert.text}
    </span>
  );
}
