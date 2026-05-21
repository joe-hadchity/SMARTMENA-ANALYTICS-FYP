/**
 * Controller for AI Advisor conversations
 *
 * Handles CRUD operations for persistent conversation history with the AI Advisor.
 * Integrates with Fyp/Claude SDK session management via external_session_id.
 */

const { getSupabase } = require("../config/supabase");

/**
 * List recent conversations for a workspace
 *
 * GET /api/advisor-chat/conversations?limit=20
 *
 * Returns conversations ordered by most recent message first.
 * Includes message count but NOT individual messages (use getById for that).
 */
exports.listConversations = async (req, res) => {
  const { workspaceId } = req;
  const limit = parseInt(req.query.limit) || 20;
  const status = req.query.status || "active"; // active | archived | all

  try {
    let query = getSupabase()
      .from("advisor_conversations")
      .select("id, title, mode, status, message_count, created_at, last_message_at, metadata")
      .eq("workspace_id", workspaceId)
      .order("last_message_at", { ascending: false })
      .limit(limit);

    if (status !== "all") {
      query = query.eq("status", status);
    }

    const { data, error } = await query;

    if (error) {
      console.error("[Advisor Conversations] List error:", error);
      return res.status(500).json({
        error: "Failed to fetch conversations",
        message: error.message,
      });
    }

    return res.json({
      conversations: data || [],
      count: data?.length || 0,
    });
  } catch (err) {
    console.error("[Advisor Conversations] List exception:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};

/**
 * Get a single conversation with all messages
 *
 * GET /api/advisor-chat/conversations/:id
 *
 * Returns full conversation details including all messages ordered chronologically.
 * The external_session_id is included so the frontend can resume the conversation.
 */
exports.getConversationById = async (req, res) => {
  const { workspaceId } = req;
  const { id } = req.params;

  try {
    // Fetch conversation metadata
    const { data: conversation, error: convError } = await getSupabase()
      .from("advisor_conversations")
      .select("*")
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .single();

    if (convError || !conversation) {
      return res.status(404).json({
        error: "Conversation not found",
        message: "The requested conversation does not exist or you don't have access.",
      });
    }

    // Fetch all messages for this conversation
    const { data: messages, error: msgError } = await getSupabase()
      .from("advisor_messages")
      .select("id, role, content, campaign_created, campaign_id, created_at, metadata")
      .eq("conversation_id", id)
      .order("created_at", { ascending: true });

    if (msgError) {
      console.error("[Advisor Conversations] Messages fetch error:", msgError);
      return res.status(500).json({
        error: "Failed to fetch messages",
        message: msgError.message,
      });
    }

    return res.json({
      conversation: {
        ...conversation,
        messages: messages || [],
      },
    });
  } catch (err) {
    console.error("[Advisor Conversations] Get exception:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};

/**
 * Create a new conversation
 *
 * POST /api/advisor-chat/conversations
 * Body: { title?: string, mode?: 'general' | 'create_campaign' }
 *
 * Returns the created conversation ID. Typically called automatically by the chat endpoint,
 * but can be used to pre-create a conversation with a specific mode.
 */
exports.createConversation = async (req, res) => {
  const { workspaceId } = req;
  const { title, mode = "general" } = req.body;

  try {
    const { data, error } = await getSupabase()
      .from("advisor_conversations")
      .insert({
        workspace_id: workspaceId,
        title: title || "New Conversation",
        mode,
        status: "active",
        message_count: 0,
      })
      .select()
      .single();

    if (error) {
      console.error("[Advisor Conversations] Create error:", error);
      return res.status(500).json({
        error: "Failed to create conversation",
        message: error.message,
      });
    }

    return res.status(201).json({
      conversation: data,
    });
  } catch (err) {
    console.error("[Advisor Conversations] Create exception:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};

/**
 * Update conversation metadata
 *
 * PATCH /api/advisor-chat/conversations/:id
 * Body: { title?: string, status?: 'active' | 'archived' }
 *
 * Allows updating title (rename) or status (archive/restore).
 */
exports.updateConversation = async (req, res) => {
  const { workspaceId } = req;
  const { id } = req.params;
  const { title, status } = req.body;

  try {
    const updates = {};
    if (title !== undefined) updates.title = title;
    if (status !== undefined) updates.status = status;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: "Bad request",
        message: "No valid update fields provided",
      });
    }

    const { data, error } = await getSupabase()
      .from("advisor_conversations")
      .update(updates)
      .eq("id", id)
      .eq("workspace_id", workspaceId)
      .select()
      .single();

    if (error || !data) {
      console.error("[Advisor Conversations] Update error:", error);
      return res.status(404).json({
        error: "Conversation not found",
        message: "Could not update conversation",
      });
    }

    return res.json({
      conversation: data,
    });
  } catch (err) {
    console.error("[Advisor Conversations] Update exception:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};

/**
 * Delete a conversation and all its messages
 *
 * DELETE /api/advisor-chat/conversations/:id
 *
 * Permanently deletes the conversation. Use with caution - prefer archiving instead.
 */
exports.deleteConversation = async (req, res) => {
  const { workspaceId } = req;
  const { id } = req.params;

  try {
    const { error } = await getSupabase()
      .from("advisor_conversations")
      .delete()
      .eq("id", id)
      .eq("workspace_id", workspaceId);

    if (error) {
      console.error("[Advisor Conversations] Delete error:", error);
      return res.status(500).json({
        error: "Failed to delete conversation",
        message: error.message,
      });
    }

    return res.status(204).send();
  } catch (err) {
    console.error("[Advisor Conversations] Delete exception:", err);
    return res.status(500).json({
      error: "Internal server error",
      message: err.message,
    });
  }
};
