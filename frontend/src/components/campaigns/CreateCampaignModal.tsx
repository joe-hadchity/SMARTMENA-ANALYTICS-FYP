"use client";

import { useState } from "react";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import {
  X,
  AlertCircle,
  CheckCircle,
  Info,
  Megaphone,
  MousePointerClick,
  Users,
  Target,
  Smartphone,
  ShoppingBag,
  TrendingUp,
  Lightbulb,
} from "lucide-react";

type CampaignObjective =
  | "awareness"
  | "traffic"
  | "engagement"
  | "leads"
  | "app_promotion"
  | "sales";

type BudgetStrategy = "campaign_budget" | "adset_budget";

type BidStrategy = "lowest_cost" | "cost_cap" | "bid_cap" | "highest_value";

type AdvisorMessage = {
  type: "warning" | "info" | "success";
  message: string;
};

const OBJECTIVES: Array<{
  value: CampaignObjective;
  label: string;
  icon: typeof Megaphone;
  description: string;
}> = [
  {
    value: "awareness",
    label: "Awareness",
    icon: Megaphone,
    description: "Reach people near your business location or a specific area",
  },
  {
    value: "traffic",
    label: "Traffic",
    icon: MousePointerClick,
    description: "Send people to a destination like a website or app",
  },
  {
    value: "engagement",
    label: "Engagement",
    icon: Users,
    description: "Get more messages, video views, post engagement or page likes",
  },
  {
    value: "leads",
    label: "Leads",
    icon: Target,
    description: "Collect leads for your business",
  },
  {
    value: "app_promotion",
    label: "App promotion",
    icon: Smartphone,
    description: "Get more people to install or take action in your app",
  },
  {
    value: "sales",
    label: "Sales",
    icon: ShoppingBag,
    description: "Find people likely to purchase your product or service",
  },
];

const BUYING_TYPE_OPTIONS = [
  { value: "auction", label: "Auction" },
  { value: "reach", label: "Reach and frequency" },
];

const BID_STRATEGY_OPTIONS = [
  { value: "lowest_cost", label: "Lowest cost" },
  { value: "cost_cap", label: "Cost cap" },
  { value: "bid_cap", label: "Bid cap" },
  { value: "highest_value", label: "Highest value" },
];

export default function CreateCampaignModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { t } = useI18n();
  const [step, setStep] = useState<"objective" | "budget">("objective");

  // Form state
  const [campaignName, setCampaignName] = useState("");
  const [buyingType, setBuyingType] = useState("auction");
  const [objective, setObjective] = useState<CampaignObjective | null>(null);
  const [budgetStrategy, setBudgetStrategy] =
    useState<BudgetStrategy>("campaign_budget");
  const [dailyBudget, setDailyBudget] = useState("");
  const [bidStrategy, setBidStrategy] = useState<BidStrategy>("lowest_cost");

  // Advisor state
  const [advisorMessages, setAdvisorMessages] = useState<AdvisorMessage[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // Analyze budget and provide advice
  const analyzeBudget = (budget: string) => {
    const budgetNum = parseFloat(budget);
    const messages: AdvisorMessage[] = [];

    if (isNaN(budgetNum) || budgetNum <= 0) {
      return messages;
    }

    // Budget too low
    if (budgetNum < 5) {
      messages.push({
        type: "warning",
        message: `A daily budget of $${budgetNum} is very low. Meta recommends at least $5/day for optimal campaign performance.`,
      });
    }

    // Budget unusually high
    if (budgetNum > 100) {
      messages.push({
        type: "warning",
        message: `Your daily budget of $${budgetNum.toFixed(2)} looks higher than usual. If it's correct, you can ignore this warning. For testing, consider starting with $20-50/day.`,
      });
    }

    // Sweet spot
    if (budgetNum >= 10 && budgetNum <= 50) {
      messages.push({
        type: "success",
        message: `Great choice! $${budgetNum}/day is a solid starting budget for ${objective || "most"} campaigns in the MENA region.`,
      });
    }

    // Objective-specific advice
    if (objective === "awareness" && budgetNum < 10) {
      messages.push({
        type: "info",
        message:
          "For awareness campaigns, Meta recommends at least $10/day to reach a meaningful audience size.",
      });
    }

    if (objective === "sales" && budgetNum < 20) {
      messages.push({
        type: "info",
        message:
          "Sales campaigns typically need $20+/day for the algorithm to optimize effectively and find converting customers.",
      });
    }

    if (objective === "engagement" && budgetNum >= 5) {
      messages.push({
        type: "success",
        message:
          "Engagement campaigns can perform well even with modest budgets. You're all set!",
      });
    }

    return messages;
  };

  // Handle budget change with debounced analysis
  const handleBudgetChange = (value: string) => {
    setDailyBudget(value);
    setIsAnalyzing(true);

    // Simulate advisor API call
    setTimeout(() => {
      const messages = analyzeBudget(value);
      setAdvisorMessages(messages);
      setIsAnalyzing(false);
    }, 500);
  };

  const handleCreate = () => {
    // TODO: Integrate with actual campaign creation API
    console.log("Creating campaign:", {
      campaignName,
      buyingType,
      objective,
      budgetStrategy,
      dailyBudget: parseFloat(dailyBudget) * 100, // Convert to cents
      bidStrategy,
    });

    // Close modal and reset
    onOpenChange(false);
    resetForm();
  };

  const resetForm = () => {
    setStep("objective");
    setCampaignName("");
    setBuyingType("auction");
    setObjective(null);
    setBudgetStrategy("campaign_budget");
    setDailyBudget("");
    setBidStrategy("lowest_cost");
    setAdvisorMessages([]);
  };

  const canContinue = step === "objective" ? objective !== null : dailyBudget && parseFloat(dailyBudget) > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle className="text-xl">
                {step === "objective"
                  ? "Create new campaign"
                  : "Budget & Strategy"}
              </DialogTitle>
              <div className="flex items-center gap-2 text-sm">
                <button
                  onClick={() => setStep("objective")}
                  className={cn(
                    "px-3 py-1 rounded-md transition-colors",
                    step === "objective"
                      ? "bg-primary text-primary-fg"
                      : "text-fg-muted hover:text-fg"
                  )}
                  style={{
                    background:
                      step === "objective"
                        ? "oklch(46% 0.108 320)"
                        : "transparent",
                    color:
                      step === "objective"
                        ? "white"
                        : "oklch(var(--fg-muted))",
                  }}
                >
                  New campaign
                </button>
                <span className="text-fg-muted">/</span>
                <button
                  onClick={() => objective && setStep("budget")}
                  disabled={!objective}
                  className={cn(
                    "px-3 py-1 rounded-md transition-colors",
                    step === "budget"
                      ? "bg-primary text-primary-fg"
                      : "text-fg-muted hover:text-fg disabled:opacity-50"
                  )}
                  style={{
                    background:
                      step === "budget"
                        ? "oklch(46% 0.108 320)"
                        : "transparent",
                    color:
                      step === "budget" ? "white" : "oklch(var(--fg-muted))",
                  }}
                >
                  Budget
                </button>
              </div>
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="text-fg-muted hover:text-fg transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </DialogHeader>

        <div className="space-y-6 mt-4">
          {step === "objective" && (
            <>
              {/* Buying Type */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Choose a buying type
                  <button
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] text-fg-muted hover:bg-surface-muted"
                    title="Learn more about buying types"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </label>
                <select
                  value={buyingType}
                  onChange={(e) => setBuyingType(e.target.value)}
                  className="input w-full"
                >
                  {BUYING_TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Campaign Objective */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Choose a campaign objective
                </label>

                <div className="grid grid-cols-1 gap-3">
                  {OBJECTIVES.map((obj) => {
                    const Icon = obj.icon;
                    const isSelected = objective === obj.value;

                    return (
                      <button
                        key={obj.value}
                        type="button"
                        onClick={() => setObjective(obj.value)}
                        className={cn(
                          "flex items-start gap-4 p-4 rounded-lg border-2 transition-all duration-200 text-start",
                          "hover:border-primary/50 hover:shadow-md",
                          isSelected &&
                            "border-primary shadow-lg shadow-primary/20"
                        )}
                        style={{
                          borderColor: isSelected
                            ? "oklch(46% 0.108 320)"
                            : "oklch(var(--border))",
                          background: isSelected
                            ? "oklch(96% 0.015 320)"
                            : "oklch(var(--surface))",
                        }}
                      >
                        <div
                          className={cn(
                            "flex items-center justify-center w-10 h-10 rounded-lg shrink-0",
                            isSelected ? "bg-primary/10" : "bg-surface-muted"
                          )}
                        >
                          <Icon
                            className="h-5 w-5"
                            style={{
                              color: isSelected
                                ? "oklch(46% 0.108 320)"
                                : "oklch(var(--fg-muted))",
                            }}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-fg">
                            {obj.label}
                          </div>
                          <div className="text-sm text-fg-muted mt-0.5">
                            {obj.description}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle
                            className="h-5 w-5 shrink-0"
                            style={{ color: "oklch(46% 0.108 320)" }}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Info panel */}
                <div
                  className="flex gap-3 p-4 rounded-lg"
                  style={{ background: "oklch(var(--surface-muted))" }}
                >
                  <Info
                    className="h-5 w-5 shrink-0 mt-0.5"
                    style={{ color: "oklch(52% 0.13 195)" }}
                  />
                  <div className="text-sm text-fg-muted">
                    <strong className="text-fg">
                      Your campaign objective
                    </strong>{" "}
                    is the business goal you hope to achieve by running your
                    ads. Hover over each one for more information.
                  </div>
                </div>
              </div>
            </>
          )}

          {step === "budget" && (
            <>
              {/* Budget Strategy */}
              <div
                className="space-y-4 p-4 rounded-lg border"
                style={{
                  borderColor: "oklch(var(--border))",
                  background: "oklch(var(--surface))",
                }}
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold flex items-center gap-2">
                    <CheckCircle
                      className="h-5 w-5"
                      style={{ color: "oklch(40% 0.090 150)" }}
                    />
                    Budget
                  </h3>
                  <span
                    className="text-xs px-2 py-1 rounded-full"
                    style={{
                      background: "oklch(40% 0.090 150 / 0.1)",
                      color: "oklch(40% 0.090 150)",
                    }}
                  >
                    Advantage+ on
                  </span>
                </div>

                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="budget-strategy"
                      checked={budgetStrategy === "campaign_budget"}
                      onChange={() => setBudgetStrategy("campaign_budget")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">
                        Campaign budget{" "}
                        <span className="text-primary">(Recommended)</span>
                      </div>
                      <div className="text-xs text-fg-muted mt-1">
                        Automatically distribute your budget to the best
                        opportunities across your campaign. Also known as
                        Advantage+ campaign budget.{" "}
                        <button
                          className="text-primary hover:underline"
                          style={{ color: "oklch(46% 0.108 320)" }}
                        >
                          About campaign budget
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <input
                      type="radio"
                      name="budget-strategy"
                      checked={budgetStrategy === "adset_budget"}
                      onChange={() => setBudgetStrategy("adset_budget")}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <div className="font-medium text-sm">Ad set budget</div>
                      <div className="text-xs text-fg-muted mt-1">
                        Set different bid strategies or budget schedules for
                        each ad set.
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Daily Budget Input */}
              {budgetStrategy === "campaign_budget" && (
                <div className="space-y-3">
                  <label className="block text-sm font-medium">
                    Daily budget
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-fg-muted">$</span>
                    <input
                      type="number"
                      value={dailyBudget}
                      onChange={(e) => handleBudgetChange(e.target.value)}
                      placeholder="25.00"
                      min="1"
                      step="0.01"
                      className="input flex-1"
                    />
                    <span className="text-fg-muted">USD</span>
                  </div>

                  {/* Advisor Messages */}
                  {isAnalyzing && (
                    <div className="flex items-center gap-2 text-sm text-fg-muted">
                      <div className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" />
                      Analyzing budget...
                    </div>
                  )}

                  {!isAnalyzing && advisorMessages.length > 0 && (
                    <div className="space-y-2">
                      {advisorMessages.map((msg, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg text-sm animate-in fade-in slide-in-from-top-2 duration-300"
                          )}
                          style={{
                            background:
                              msg.type === "warning"
                                ? "oklch(98% 0.02 60)"
                                : msg.type === "success"
                                  ? "oklch(96% 0.04 148)"
                                  : "oklch(96% 0.04 240)",
                            borderLeft: `3px solid ${
                              msg.type === "warning"
                                ? "oklch(54% 0.130 60)"
                                : msg.type === "success"
                                  ? "oklch(40% 0.090 150)"
                                  : "oklch(52% 0.13 195)"
                            }`,
                            animationDelay: `${idx * 100}ms`,
                          }}
                        >
                          {msg.type === "warning" && (
                            <AlertCircle
                              className="h-5 w-5 shrink-0 mt-0.5"
                              style={{ color: "oklch(54% 0.130 60)" }}
                            />
                          )}
                          {msg.type === "success" && (
                            <CheckCircle
                              className="h-5 w-5 shrink-0 mt-0.5"
                              style={{ color: "oklch(40% 0.090 150)" }}
                            />
                          )}
                          {msg.type === "info" && (
                            <Lightbulb
                              className="h-5 w-5 shrink-0 mt-0.5"
                              style={{ color: "oklch(52% 0.13 195)" }}
                            />
                          )}
                          <span
                            style={{
                              color:
                                msg.type === "warning"
                                  ? "oklch(44% 0.110 60)"
                                  : msg.type === "success"
                                    ? "oklch(34% 0.080 150)"
                                    : "oklch(42% 0.11 195)",
                            }}
                          >
                            {msg.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Budget Info */}
                  {dailyBudget && parseFloat(dailyBudget) > 0 && (
                    <div className="text-xs text-fg-muted space-y-1">
                      <p>
                        You'll spend an average of ${dailyBudget} per day. Your
                        maximum daily spend is{" "}
                        <strong>
                          ${(parseFloat(dailyBudget) * 1.25).toFixed(2)}
                        </strong>{" "}
                        and your maximum weekly spend is{" "}
                        <strong>
                          ${(parseFloat(dailyBudget) * 7).toFixed(2)}
                        </strong>
                        .{" "}
                        <button
                          className="text-primary hover:underline"
                          style={{ color: "oklch(46% 0.108 320)" }}
                        >
                          About daily budget
                        </button>
                      </p>
                      <p className="text-fg-subtle">
                        Your spending may exceed ${dailyBudget} the first few
                        days.
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Bid Strategy */}
              <div className="space-y-3">
                <label className="block text-sm font-medium">
                  Campaign bid strategy
                  <button
                    className="ml-2 inline-flex items-center justify-center w-4 h-4 rounded-full border border-border text-[10px] text-fg-muted hover:bg-surface-muted"
                    title="Learn about bid strategies"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </label>
                <select
                  value={bidStrategy}
                  onChange={(e) => setBidStrategy(e.target.value as BidStrategy)}
                  className="input w-full"
                >
                  {BID_STRATEGY_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-fg-muted">
                  {bidStrategy === "lowest_cost" &&
                    "Highest volume - Get the most results for your budget"}
                  {bidStrategy === "cost_cap" &&
                    "Control costs while maximizing volume"}
                  {bidStrategy === "bid_cap" &&
                    "Set a maximum bid for each auction"}
                  {bidStrategy === "highest_value" &&
                    "Focus on getting the highest value results"}
                </p>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-border mt-6">
          <button
            onClick={() => onOpenChange(false)}
            className="text-sm text-fg-muted hover:text-fg transition-colors"
          >
            Cancel
          </button>

          <div className="flex items-center gap-3">
            {step === "budget" && (
              <Button
                variant="outline"
                onClick={() => setStep("objective")}
                size="md"
              >
                Back
              </Button>
            )}

            <Button
              variant="primary"
              onClick={() => {
                if (step === "objective") {
                  setStep("budget");
                } else {
                  handleCreate();
                }
              }}
              disabled={!canContinue}
              size="md"
              className="min-w-[120px]"
              style={{
                background: canContinue
                  ? "linear-gradient(135deg, oklch(46% 0.108 320) 0%, oklch(50% 0.110 320) 100%)"
                  : undefined,
                opacity: canContinue ? 1 : 0.5,
              }}
            >
              {step === "objective" ? "Continue" : "Create Campaign"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
