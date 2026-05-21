const advisorClient = require("../services/advisorClient");
const env = require("../config/env");

/**
 * Get context for advisor: existing campaigns, account info, etc.
 * This provides the advisor with historical data to make better recommendations.
 *
 * GET /api/advisor/context
 */
async function getAdvisorContext(req, res) {
  if (!env.ADVISOR_API_ENABLED) {
    return res.json({
      _status: "not_configured",
      _note: "Advisor API is not configured.",
      context: null,
    });
  }

  try {
    // Fetch recent campaigns (last 30 days of active/paused campaigns)
    const campaignsResult = await advisorClient.listCampaigns({
      status: undefined, // all statuses
      limit: 20,
    });

    const campaigns = campaignsResult.data || [];

    // Calculate some aggregate stats
    const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;
    const totalCampaigns = campaigns.length;

    // Get average daily budget across campaigns
    const budgets = campaigns
      .filter(c => c.daily_budget)
      .map(c => Number(c.daily_budget) / 100);
    const avgDailyBudget = budgets.length > 0
      ? budgets.reduce((sum, b) => sum + b, 0) / budgets.length
      : null;

    // Get most common objectives
    const objectiveCounts = {};
    campaigns.forEach(c => {
      if (c.objective) {
        objectiveCounts[c.objective] = (objectiveCounts[c.objective] || 0) + 1;
      }
    });

    const context = {
      totalCampaigns,
      activeCampaigns,
      avgDailyBudget,
      commonObjectives: Object.entries(objectiveCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([obj, count]) => ({ objective: obj, count })),
      recentCampaigns: campaigns.slice(0, 5).map(c => ({
        name: c.name,
        objective: c.objective,
        status: c.status,
        daily_budget: c.daily_budget ? Number(c.daily_budget) / 100 : null,
        created_time: c.created_time,
      })),
    };

    res.json({
      _status: "live",
      context,
    });
  } catch (error) {
    console.error("[Advisor Context Error]", error.message);
    res.status(500).json({
      error: "Failed to fetch advisor context",
      message: error.message,
    });
  }
}

module.exports = {
  getAdvisorContext,
};
