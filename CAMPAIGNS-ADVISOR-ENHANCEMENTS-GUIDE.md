# Campaigns & Advisor Enhancements - Implementation Guide

This guide provides all the code you need to add the requested enhancements to your campaigns and advisor pages.

---

## 📦 Part 1: Campaign Page Enhancements

### 1. Performance Metrics Cards (MetricCard already created!)

Add this component at the **top of your campaigns page**, right after the header and before the table:

```typescript
// Add these imports at the top of campaigns/page.tsx
import { MetricCard } from "@/components/campaigns/MetricCard";
import { DollarSign, Eye, TrendingUp, Target } from "lucide-react";
import { useMemo } from "react";

// Add this inside your CampaignsPage component, after campaignsQ definition:
const metrics = useMemo(() => {
  if (!campaignsQ.data?.data) return null;
  
  const campaigns = campaignsQ.data.data;
  const activeCampaigns = campaigns.filter(c => c.status === 'ACTIVE').length;
  
  // Calculate total spend (mock - replace with real insights data)
  const totalSpend = campaigns.reduce((sum, c) => {
    const budget = Number(c.daily_budget || 0) / 100;
    return sum + budget * 7; // 7 days estimate
  }, 0);
  
  // Calculate total impressions (mock - replace with real data)
  const totalImpressions = campaigns.length * 15000; // Mock average
  
  // Calculate average CPM (mock)
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
}, [campaignsQ.data]);

// Add this JSX right after your header section and before the table:
{metrics && (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
)}
```

---

### 2. Quick Actions Bar (Pause/Resume, Edit Budget, Duplicate)

Add these mutations and handlers to your campaigns page:

```typescript
// Add imports
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Play, Pause, DollarSign, Copy, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";

// Add these mutations inside your component:
const queryClient = useQueryClient();
const router = useRouter();

const toggleStatusMutation = useMutation({
  mutationFn: async ({ id, newStatus }: { id: string; newStatus: string }) => {
    // TODO: Replace with your actual API call
    console.log(`Toggle campaign ${id} to ${newStatus}`);
    // return advisorApi.updateCampaignStatus(id, newStatus);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["advisor-campaigns"] });
  },
});

const [editingBudget, setEditingBudget] = useState<string | null>(null);
const [budgetValue, setBudgetValue] = useState("");

const updateBudgetMutation = useMutation({
  mutationFn: async ({ id, budget }: { id: string; budget: number }) => {
    // TODO: Replace with your actual API call
    console.log(`Update campaign ${id} budget to ${budget}`);
    // return advisorApi.updateCampaignBudget(id, budget);
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ["advisor-campaigns"] });
    setEditingBudget(null);
  },
});

// Add this column to your table (replace the empty <td> at the end):
<td className="px-3 md:px-5 py-3 md:py-4">
  <div className="flex items-center gap-2">
    {/* Pause/Resume */}
    <Button
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        toggleStatusMutation.mutate({
          id: c.id,
          newStatus: c.status === 'ACTIVE' ? 'PAUSED' : 'ACTIVE'
        });
      }}
      disabled={toggleStatusMutation.isPending}
      title={c.status === 'ACTIVE' ? 'Pause' : 'Resume'}
    >
      {c.status === 'ACTIVE' ? (
        <Pause className="h-3.5 w-3.5" />
      ) : (
        <Play className="h-3.5 w-3.5" />
      )}
    </Button>

    {/* Edit Budget */}
    {editingBudget === c.id ? (
      <div className="flex items-center gap-1">
        <input
          type="number"
          value={budgetValue}
          onChange={(e) => setBudgetValue(e.target.value)}
          className="w-20 px-2 py-1 text-xs border rounded"
          placeholder="Budget"
          autoFocus
        />
        <Button
          size="sm"
          onClick={() => {
            updateBudgetMutation.mutate({
              id: c.id,
              budget: parseFloat(budgetValue) * 100 // Convert to cents
            });
          }}
        >
          Save
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setEditingBudget(null)}
        >
          Cancel
        </Button>
      </div>
    ) : (
      <Button
        size="sm"
        variant="outline"
        onClick={(e) => {
          e.stopPropagation();
          setEditingBudget(c.id);
          setBudgetValue(((Number(c.daily_budget) || 0) / 100).toString());
        }}
        title="Edit Budget"
      >
        <DollarSign className="h-3.5 w-3.5" />
      </Button>
    )}

    {/* Duplicate */}
    <Button
      size="sm"
      variant="outline"
      onClick={(e) => {
        e.stopPropagation();
        // TODO: Implement duplicate logic
        console.log('Duplicate campaign', c.id);
      }}
      title="Duplicate Campaign"
    >
      <Copy className="h-3.5 w-3.5" />
    </Button>

    {/* Ask Advisor */}
    <Button
      size="sm"
      style={{ background: 'oklch(46% 0.108 320)', color: 'white' }}
      onClick={(e) => {
        e.stopPropagation();
        router.push(`/advisor?campaign=${c.id}&name=${encodeURIComponent(c.name)}`);
      }}
      title="Ask Advisor"
    >
      <Sparkles className="h-3.5 w-3.5" />
    </Button>
  </div>
</td>
```

---

### 3. Performance Alerts (Badges)

Add this function to calculate alerts:

```typescript
// Add this helper function
function getCampaignAlert(campaign: AdvisorCampaign) {
  // Mock logic - replace with real performance data
  const budget = Number(campaign.daily_budget || 0) / 100;
  const mockCPM = Math.random() * 5; // Mock CPM
  
  if (mockCPM > 3.5) {
    return { text: "⚠️ High CPM", type: "warning" as const };
  }
  if (campaign.status === 'ACTIVE' && budget > 50) {
    return { text: "✅ Outperforming", type: "success" as const };
  }
  return null;
}

// Add this to the campaign name cell:
<td className="px-3 md:px-5 py-3 md:py-4">
  <div className="flex flex-col gap-1">
    <span className="font-medium max-w-xs truncate">
      {c.name}
    </span>
    {(() => {
      const alert = getCampaignAlert(c);
      if (!alert) return null;
      return (
        <span
          className={cn(
            "text-[10px] font-medium px-2 py-0.5 rounded-full w-fit cursor-pointer",
            alert.type === "warning" && "bg-amber-100 text-amber-700",
            alert.type === "success" && "bg-green-100 text-green-700"
          )}
          onClick={(e) => {
            e.stopPropagation();
            router.push(`/advisor?campaign=${c.id}&alert=${alert.text}`);
          }}
        >
          {alert.text}
        </span>
      );
    })()}
  </div>
</td>
```

---

### 4. Search & Advanced Filters

Add this above your table:

```typescript
// Add state
const [searchQuery, setSearchQuery] = useState("");
const [objectiveFilter, setObjectiveFilter] = useState<string>("all");
const [sortBy, setSortBy] = useState<"name" | "budget" | "created">("created");

// Update your campaigns filtering logic:
const filteredCampaigns = useMemo(() => {
  let filtered = campaigns;
  
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
  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "name") return a.name.localeCompare(b.name);
    if (sortBy === "budget") return (Number(b.daily_budget) || 0) - (Number(a.daily_budget) || 0);
    return new Date(b.created_time).getTime() - new Date(a.created_time).getTime();
  });
  
  return filtered;
}, [campaigns, searchQuery, objectiveFilter, sortBy]);

// Add this JSX above your table:
<div className="flex flex-col md:flex-row gap-4 mb-4">
  {/* Search */}
  <input
    type="text"
    placeholder="Search campaigns..."
    value={searchQuery}
    onChange={(e) => setSearchQuery(e.target.value)}
    className="px-4 py-2 border rounded-lg flex-1"
  />
  
  {/* Objective Filter */}
  <select
    value={objectiveFilter}
    onChange={(e) => setObjectiveFilter(e.target.value)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="all">All Objectives</option>
    {Object.keys(OBJECTIVE_LABELS).map(obj => (
      <option key={obj} value={obj}>{OBJECTIVE_LABELS[obj]}</option>
    ))}
  </select>
  
  {/* Sort */}
  <select
    value={sortBy}
    onChange={(e) => setSortBy(e.target.value as any)}
    className="px-4 py-2 border rounded-lg"
  >
    <option value="created">Sort by: Date</option>
    <option value="name">Sort by: Name</option>
    <option value="budget">Sort by: Budget</option>
  </select>
</div>
```

---

## 💬 Part 2: Advisor Page Enhancements

All of these go in `frontend/src/app/advisor/page.tsx`:

### 1. Markdown Rendering

```typescript
// Add import at top
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Replace message content rendering with:
<ReactMarkdown
  remarkPlugins={[remarkGfm]}
  className="prose prose-sm max-w-none dark:prose-invert"
  components={{
    // Style code blocks
    code: ({ node, inline, ...props }) => (
      inline ? (
        <code className="bg-surface-muted px-1.5 py-0.5 rounded text-xs" {...props} />
      ) : (
        <code className="block bg-surface-muted p-3 rounded-lg text-xs overflow-x-auto" {...props} />
      )
    ),
    // Style links
    a: ({ node, ...props }) => (
      <a className="text-brand hover:underline" {...props} />
    ),
  }}
>
  {msg.content}
</ReactMarkdown>
```

---

### 2. Typing Indicator

```typescript
// Add this right after the messages map, before closing the messages div:
{chatMutation.isPending && (
  <div className="flex gap-3 justify-start animate-in fade-in duration-200">
    <div
      className="h-8 w-8 rounded-lg grid place-items-center flex-shrink-0"
      style={{ background: primaryColor }}
    >
      <Sparkles className="h-4 w-4 text-white" />
    </div>
    <div
      className="rounded-xl px-4 py-3 bg-surface border flex items-center gap-2"
      style={{ borderColor }}
    >
      <Loader2 className="h-4 w-4 animate-spin text-fg-muted" />
      <span className="text-sm text-fg-muted">
        {t("advisor.thinking", "AI is thinking...")}
      </span>
    </div>
  </div>
)}
```

---

### 3. Message Timestamps

```typescript
// Add this helper function at the top:
function formatRelativeTime(date: string, locale: string) {
  const now = new Date();
  const messageDate = new Date(date);
  const diffMs = now.getTime() - messageDate.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return messageDate.toLocaleDateString(locale === "ar" ? "ar" : "en", {
    month: "short",
    day: "numeric",
  });
}

// Wrap each message bubble in a div with timestamp:
<div
  key={msg.id}
  className={cn(
    "flex gap-3 group",
    msg.role === "user" ? "justify-end" : "justify-start",
  )}
>
  {/* Message content... */}
  
  {/* Timestamp - shows on hover */}
  <span
    className="text-[10px] text-fg-subtle opacity-0 group-hover:opacity-100 transition-opacity absolute -bottom-4"
    title={new Date(msg.created_at).toLocaleString()}
  >
    {formatRelativeTime(msg.created_at, locale)}
  </span>
</div>
```

---

### 4. Context-Aware Suggested Prompts

```typescript
// Replace the static suggestions with:
const suggestions = useMemo(() => {
  const lastMessage = messages[messages.length - 1];
  const lastUserMessage = messages.filter(m => m.role === 'user').pop();
  
  // If last message mentions campaigns
  if (lastMessage?.content.toLowerCase().includes('campaign')) {
    return [
      t("advisor.suggestOptimize", "How can I optimize this campaign?"),
      t("advisor.suggestBudget", "What budget should I allocate?"),
      t("advisor.suggestAudience", "Who should I target?"),
    ];
  }
  
  // If last message mentions performance
  if (lastMessage?.content.toLowerCase().includes('performance')) {
    return [
      t("advisor.suggestImprove", "How can I improve my metrics?"),
      t("advisor.suggestCompare", "Compare my campaigns"),
      t("advisor.suggestTrends", "Show me trends"),
    ];
  }
  
  // Default suggestions
  return [
    t("advisor.suggestion1", "Help me create a new awareness campaign"),
    t("advisor.suggestion2", "What's the best budget for my next campaign?"),
    t("advisor.suggestion3", "Show me my campaign performance"),
  ];
}, [messages, t]);
```

---

### 5. Handle Deep Links from Campaigns

```typescript
// Add at the top of your component:
import { useSearchParams } from 'next/navigation';

const searchParams = useSearchParams();
const campaignId = searchParams.get('campaign');
const campaignName = searchParams.get('name');
const alertText = searchParams.get('alert');

// Auto-populate input when coming from campaigns page:
useEffect(() => {
  if (campaignId && campaignName) {
    const message = alertText
      ? `I need help with campaign "${campaignName}". ${alertText}`
      : `Tell me about campaign "${campaignName}" (ID: ${campaignId})`;
    setInput(message);
  }
}, [campaignId, campaignName, alertText]);
```

---

### 6. Quick Actions from AI Responses

```typescript
// Add this after each assistant message:
{msg.role === 'assistant' && msg.campaign_created && msg.campaign_id && (
  <div className="mt-2 flex gap-2">
    <Button
      size="sm"
      onClick={() => {
        // Navigate to campaign or show success
        alert(`Campaign created: ${msg.campaign_id}`);
      }}
      style={{ background: 'oklch(46% 0.108 320)', color: 'white' }}
    >
      View Campaign
    </Button>
  </div>
)}

// Also detect "specifications confirmed" text:
{msg.role === 'assistant' && msg.content.includes('specifications confirmed') && (
  <div className="mt-2 p-3 bg-surface-muted rounded-lg border">
    <p className="text-xs text-fg-muted mb-2">
      Ready to create this campaign?
    </p>
    <Button
      size="sm"
      onClick={() => {
        // Trigger campaign creation
        console.log('Creating campaign from specs');
      }}
      style={{ background: 'oklch(46% 0.108 320)', color: 'white' }}
    >
      Create Campaign Now
    </Button>
  </div>
)}
```

---

## 🎨 Add Translations

Add these to `frontend/src/i18n/messages.ts`:

```typescript
// English
"advisor.thinking": "AI is thinking...",
"advisor.suggestOptimize": "How can I optimize this campaign?",
"advisor.suggestBudget": "What budget should I allocate?",
"advisor.suggestAudience": "Who should I target?",
"advisor.suggestImprove": "How can I improve my metrics?",
"advisor.suggestCompare": "Compare my campaigns",
"advisor.suggestTrends": "Show me trends",

// Arabic
"advisor.thinking": "الذكاء الاصطناعي يفكر...",
"advisor.suggestOptimize": "كيف يمكنني تحسين هذه الحملة؟",
"advisor.suggestBudget": "ما الميزانية التي يجب تخصيصها؟",
"advisor.suggestAudience": "من يجب أن أستهدف؟",
"advisor.suggestImprove": "كيف يمكنني تحسين مقاييسي؟",
"advisor.suggestCompare": "قارن حملاتي",
"advisor.suggestTrends": "أرني الاتجاهات",
```

---

## 🚀 Implementation Priority

Start with these in order:

1. ✅ **MetricCard** (already created)
2. ✅ **Markdown rendering** (5 min - just add ReactMarkdown)
3. ✅ **Typing indicator** (2 min - copy paste)
4. ✅ **Message timestamps** (5 min)
5. ✅ **Quick Actions Bar** (15 min - pause/resume/edit budget)
6. ✅ **Ask Advisor button** (5 min - just link to advisor)
7. ✅ **Search & Filters** (10 min)
8. ✅ **Performance Metrics Cards** (10 min)
9. ✅ **Context-aware prompts** (5 min)
10. ✅ **Deep link handling** (5 min)

Total time: ~1-2 hours for all enhancements!

---

Need help with any specific implementation? Let me know which feature you want to start with!
