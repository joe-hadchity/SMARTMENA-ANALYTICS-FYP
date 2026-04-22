const express = require("express");

const asyncHandler = require("../utils/asyncHandler");
const workspaceContext = require("../middleware/workspaceContext");
const {
  chat,
  listConversations,
  listMessages,
  contextPreview,
} = require("../controllers/assistantController");

const router = express.Router();

// POST /api/assistant/chat -- streaming Server-Sent Events
router.post("/chat", workspaceContext(), chat);

// GET /api/assistant/conversations
router.get("/conversations", workspaceContext(), asyncHandler(listConversations));

// GET /api/assistant/conversations/:id/messages
router.get("/conversations/:id/messages", asyncHandler(listMessages));

// GET /api/assistant/context -- useful for debugging / prompt tuning
router.get("/context", workspaceContext(), asyncHandler(contextPreview));

module.exports = router;
