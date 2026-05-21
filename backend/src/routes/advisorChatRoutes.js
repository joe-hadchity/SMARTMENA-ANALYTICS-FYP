const express = require("express");
const axios = require("axios");
const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const advisorClient = require("../services/advisorClient");
const { getSupabase } = require("../config/supabase");
const conversationsController = require("../controllers/advisorConversationsController");

const router = express.Router();

/**
 * POST /api/advisor-chat/chat
 *
 * Enhanced advisor chat endpoint with persistent conversation storage.
 * - Creates or resumes conversations via conversationId
 * - Stores all messages in the database
 * - Maintains session continuity with Fyp via external_session_id
 * - Supports campaign creation workflow with context injection
 */
router.post(
  "/chat",
  workspaceContext(), // Extract workspaceId from x-workspace-id header
  asyncHandler(async (req, res) => {
    const { message, conversationId, mode } = req.body;
    const { workspaceId } = req;

    if (!message || typeof message !== "string" || message.trim().length === 0) {
      return res.status(400).json({ error: "Message is required" });
    }

    const FYP_CLIENT_ID = "c218eadd-6861-45b3-8fc3-8af5691d080c";
    const FYP_ADVISOR_URL = "http://localhost:3001";

    try {
      // --------------------------------------------------------------------
      // Step 1: Load or create conversation
      // --------------------------------------------------------------------
      let conversation;
      let isNewConversation = false;

      if (conversationId) {
        // Resume existing conversation
        const { data, error } = await getSupabase()
          .from("advisor_conversations")
          .select("*")
          .eq("id", conversationId)
          .eq("workspace_id", workspaceId)
          .single();

        if (error || !data) {
          return res.status(404).json({
            error: "Conversation not found",
            message: "The specified conversation does not exist or you don't have access",
          });
        }

        conversation = data;
      } else {
        // Create new conversation
        const { data, error } = await getSupabase()
          .from("advisor_conversations")
          .insert({
            workspace_id: workspaceId,
            title: message.substring(0, 60), // Use first message as title
            mode: mode || "general",
            status: "active",
            message_count: 0,
          })
          .select()
          .single();

        if (error) {
          console.error("[Advisor Chat] Failed to create conversation:", error);
          return res.status(500).json({
            error: "Failed to create conversation",
            message: error.message,
          });
        }

        conversation = data;
        isNewConversation = true;
      }

      // --------------------------------------------------------------------
      // Step 2: Save user message to database
      // --------------------------------------------------------------------
      const { error: userMsgError } = await getSupabase()
        .from("advisor_messages")
        .insert({
          conversation_id: conversation.id,
          role: "user",
          content: message,
        });

      if (userMsgError) {
        console.error("[Advisor Chat] Failed to save user message:", userMsgError);
        // Continue - don't block the chat if DB write fails
      }
      // --------------------------------------------------------------------
      // Step 3: Fetch context for campaign creation mode
      // --------------------------------------------------------------------
      let contextPrompt = "";
      const hasUserRequirements = message.toLowerCase().includes("goal") ||
                                   message.toLowerCase().includes("budget") ||
                                   /\$\d+/.test(message);

      if (conversation.mode === "create_campaign" && hasUserRequirements && advisorClient.isEnabled()) {
        try {
          const campaignsResult = await advisorClient.listCampaigns({
            status: undefined,
            limit: 10,
          });

          const campaigns = campaignsResult.data || [];

          if (campaigns.length > 0) {
            const activeCampaigns = campaigns.filter(c => c.status === "ACTIVE").length;
            const budgets = campaigns
              .filter(c => c.daily_budget)
              .map(c => Number(c.daily_budget) / 100);
            const avgBudget = budgets.length > 0
              ? (budgets.reduce((sum, b) => sum + b, 0) / budgets.length).toFixed(2)
              : "N/A";

            contextPrompt = `\n\n[CONTEXT: Account has ${campaigns.length} total campaigns, ${activeCampaigns} active. Average daily budget: $${avgBudget}. Recent campaigns: ${campaigns.slice(0, 3).map(c => `"${c.name}" (${c.objective}, $${(Number(c.daily_budget || 0) / 100).toFixed(0)}/day)`).join(", ")}]`;
          }
        } catch (contextError) {
          console.warn("[Context Fetch Warning]", contextError.message);
          // Continue without context if fetch fails
        }
      }

      // --------------------------------------------------------------------
      // Step 4: Forward to Fyp advisor with session continuity
      // --------------------------------------------------------------------
      const enhancedMessage = message + contextPrompt;

      const response = await axios.post(
        `${FYP_ADVISOR_URL}/chat`,
        {
          message: enhancedMessage,
          clientId: FYP_CLIENT_ID,
          sessionId: conversation.external_session_id || undefined, // Resume via external_session_id
          enableWriteTools: conversation.mode === "create_campaign",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 180000, // 3 minute timeout
        }
      );

      const advisorMessage = response.data.message;
      const fypSessionId = response.data.sessionId;

      // Update external_session_id if this is a new conversation
      if (isNewConversation || !conversation.external_session_id) {
        await getSupabase()
          .from("advisor_conversations")
          .update({ external_session_id: fypSessionId })
          .eq("id", conversation.id);

        conversation.external_session_id = fypSessionId;
      }

      // --------------------------------------------------------------------
      // Step 5: Handle campaign creation if detected
      // --------------------------------------------------------------------
      let campaignCreated = false;
      let campaignId = null;
      let finalMessage = advisorMessage;

      const isConfirmed = advisorMessage.includes("Campaign specifications confirmed");

      if (isConfirmed) {
        console.log("[Advisor Chat] Campaign confirmation detected, attempting to parse specs...");
        console.log("[Advisor Chat] Full message (first 500 chars):", advisorMessage.substring(0, 500));

        // Try to extract campaign specs and create it
        try {
          // Parse specs from Claude's bullet list format:
          // - **Name:** Born2Hike | Awareness | Men MENA | May2026 (no backticks)
          // - **Objective:** OUTCOME_AWARENESS
          // - **Budget:** $5/day

          // Name: Match with or without backticks, stop at newline
          const nameMatch = advisorMessage.match(/\*\*Name:\*\*\s*[`"]?([^`"\n]+?)\s*(?:\n|$)/i);
          const objectiveMatch = advisorMessage.match(/\*\*Objective:\*\*\s*([A-Z_]+)/i);
          const budgetMatch = advisorMessage.match(/\*\*Budget:\*\*\s*\$(\d+(?:\.\d+)?)\/day/i);

          console.log("[Advisor Chat] Regex test results:");
          console.log("  - Name pattern 1:", advisorMessage.match(/[-|]?\s*Name:\s*[`"]?([^`"\n|]+)[`"]?/));
          console.log("  - Objective pattern 1:", advisorMessage.match(/[-|]?\s*Objective:\s*[`"]?([A-Z_]+)[`"]?/));
          console.log("  - Budget pattern 1:", advisorMessage.match(/[-|]?\s*Budget:\s*\$(\d+)\/day/));

          console.log("[Advisor Chat] Parsed values:", {
            name: nameMatch?.[1],
            objective: objectiveMatch?.[1],
            budget: budgetMatch?.[1]
          });

          if (nameMatch && objectiveMatch && budgetMatch) {
            const campaignName = nameMatch[1].trim();
            const objective = objectiveMatch[1].trim();
            const dailyBudget = Math.round(parseFloat(budgetMatch[1]) * 100); // Convert dollars to cents

            console.log("[Advisor Chat] Creating campaign:", { campaignName, objective, dailyBudget });

            // Create campaign via Fyp API
            const createResponse = await axios.post(
              `${FYP_ADVISOR_URL}/api/clients/${FYP_CLIENT_ID}/campaigns`,
              {
                name: campaignName,
                objective: objective,
                status: "PAUSED",
                daily_budget: dailyBudget,
                special_ad_categories: [],
                bid_strategy: "LOWEST_COST_WITHOUT_CAP",
              },
              {
                headers: { "Content-Type": "application/json" },
                timeout: 30000,
              }
            );

            // Campaign created successfully
            campaignId = createResponse.data.id;
            campaignCreated = true;
            console.log("[Advisor Chat] Campaign created! ID:", campaignId);

            const successMessage = `\n\n✅ **Campaign Created Successfully!**\n\nCampaign ID: \`${campaignId}\`\n\nYou can view it in Meta Ads Manager or use this ID for further operations.`;
            finalMessage = advisorMessage + successMessage;
          } else {
            console.log("[Advisor Chat] Failed to parse all required fields from advisor response");
          }
        } catch (createError) {
          console.error("[Advisor Chat] Campaign Creation Error:", createError.message);

          // Creation failed
          const errorNote = `\n\n⚠️ Note: Campaign specs were confirmed, but automatic creation failed. You can create it manually in Meta Ads Manager.\n\nError: ${createError.message}`;
          finalMessage = advisorMessage + errorNote;
        }
      }

      // --------------------------------------------------------------------
      // Step 6: Save assistant message to database
      // --------------------------------------------------------------------
      const { error: assistantMsgError } = await getSupabase()
        .from("advisor_messages")
        .insert({
          conversation_id: conversation.id,
          role: "assistant",
          content: finalMessage,
          campaign_created: campaignCreated,
          campaign_id: campaignId,
        });

      if (assistantMsgError) {
        console.error("[Advisor Chat] Failed to save assistant message:", assistantMsgError);
        // Continue - don't block response if DB write fails
      }

      // --------------------------------------------------------------------
      // Step 7: Return response with conversation context
      // --------------------------------------------------------------------
      return res.json({
        conversationId: conversation.id,
        externalSessionId: conversation.external_session_id,
        message: finalMessage,
        campaignCreated,
        campaignId,
      });
    } catch (error) {
      console.error("[Advisor Chat Error]", error.message);

      // Check if Fyp backend is running
      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Advisor backend unavailable",
          message:
            "The AI Advisor backend is not running. Please start it with: cd Fyp/claude-sdk && npm start",
        });
      }

      // Forward error from Fyp backend
      if (error.response) {
        return res
          .status(error.response.status)
          .json(error.response.data);
      }

      // Generic error
      return res.status(500).json({
        error: "Failed to communicate with advisor",
        message: error.message,
      });
    }
  })
);

// ---------------------------------------------------------------------------
// Conversation management routes
// ---------------------------------------------------------------------------

/**
 * GET /api/advisor-chat/conversations
 *
 * List recent conversations for the workspace.
 * Query params: limit (default 20), status (active | archived | all)
 */
router.get(
  "/conversations",
  workspaceContext(),
  asyncHandler(conversationsController.listConversations)
);

/**
 * GET /api/advisor-chat/conversations/:id
 *
 * Get a single conversation with all messages.
 * Returns external_session_id for resuming with Claude.
 */
router.get(
  "/conversations/:id",
  workspaceContext(),
  asyncHandler(conversationsController.getConversationById)
);

/**
 * POST /api/advisor-chat/conversations
 *
 * Create a new empty conversation (optional - usually created automatically by /chat).
 * Body: { title?: string, mode?: 'general' | 'create_campaign' }
 */
router.post(
  "/conversations",
  workspaceContext(),
  asyncHandler(conversationsController.createConversation)
);

/**
 * PATCH /api/advisor-chat/conversations/:id
 *
 * Update conversation metadata (title, status).
 * Body: { title?: string, status?: 'active' | 'archived' }
 */
router.patch(
  "/conversations/:id",
  workspaceContext(),
  asyncHandler(conversationsController.updateConversation)
);

/**
 * DELETE /api/advisor-chat/conversations/:id
 *
 * Delete a conversation and all its messages permanently.
 */
router.delete(
  "/conversations/:id",
  workspaceContext(),
  asyncHandler(conversationsController.deleteConversation)
);

// ---------------------------------------------------------------------------
// Legacy campaign creation endpoint
// ---------------------------------------------------------------------------

/**
 * POST /api/advisor-chat/create-campaign
 *
 * Create a campaign using the Fyp API based on advisor recommendations.
 */
router.post(
  "/create-campaign",
  asyncHandler(async (req, res) => {
    const {
      name,
      objective,
      daily_budget,
      lifetime_budget,
      status,
      special_ad_categories,
      bid_strategy,
    } = req.body;

    if (!name || !objective) {
      return res.status(400).json({
        error: "Bad Request",
        message: "Campaign name and objective are required",
      });
    }

    // TODO: Get workspace credentials from Supabase
    const FYP_CLIENT_ID = "c218eadd-6861-45b3-8fc3-8af5691d080c";
    const FYP_ADVISOR_URL = "http://localhost:3001";

    try {
      // Call Fyp API to create campaign
      const response = await axios.post(
        `${FYP_ADVISOR_URL}/api/clients/${FYP_CLIENT_ID}/campaigns`,
        {
          name,
          objective,
          daily_budget,
          lifetime_budget,
          status: status || "PAUSED",
          special_ad_categories: special_ad_categories || [],
          bid_strategy: bid_strategy || "LOWEST_COST_WITHOUT_CAP",
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000,
        }
      );

      return res.json({
        success: true,
        campaign: response.data,
      });
    } catch (error) {
      console.error("[Campaign Creation Error]", error.message);

      if (error.code === "ECONNREFUSED") {
        return res.status(503).json({
          error: "Advisor backend unavailable",
          message: "Cannot create campaign - Fyp backend is not running.",
        });
      }

      if (error.response) {
        return res
          .status(error.response.status)
          .json(error.response.data);
      }

      return res.status(500).json({
        error: "Failed to create campaign",
        message: error.message,
      });
    }
  })
);

module.exports = router;
