/**
 * assistantController
 *
 * Thin HTTP layer around assistantService. The chat endpoint streams via
 * Server-Sent Events so the browser can render tokens as they arrive.
 */

const assistantService = require("../services/assistantService");
const logger = require("../utils/logger");

function resolveWorkspaceId(req) {
  // Preferred: workspaceContext middleware populated req.workspace.
  // Fallback: allow clients to pass the id in the body or header explicitly.
  return (
    req.workspace?.id ||
    req.body?.workspaceId ||
    req.get("x-workspace-id") ||
    null
  );
}

function sseInit(res) {
  res.status(200);
  res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  // Flush headers immediately so the browser enters stream mode.
  if (typeof res.flushHeaders === "function") res.flushHeaders();
}

function sseSend(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function chat(req, res) {
  const workspaceId = resolveWorkspaceId(req);
  if (!workspaceId) {
    res.status(400).json({
      error: {
        code: "WORKSPACE_REQUIRED",
        message:
          "workspaceId is required (via x-workspace-id header or body.workspaceId).",
      },
    });
    return;
  }

  const { message, conversationId, locale = "en" } = req.body || {};
  if (!message || typeof message !== "string") {
    res
      .status(400)
      .json({ error: { code: "INVALID_INPUT", message: "message is required" } });
    return;
  }

  sseInit(res);

  const stream = assistantService.streamAssistantReply({
    workspaceId,
    conversationId,
    userMessage: message,
    locale,
  });

  let clientAborted = false;
  req.on("close", () => {
    clientAborted = true;
  });

  try {
    for await (const frame of stream) {
      if (clientAborted) break;
      sseSend(res, frame.type, frame);
    }
  } catch (err) {
    logger.error("assistant stream failed", err);
    sseSend(res, "error", {
      type: "error",
      code: "INTERNAL",
      message: err?.message || "stream failed",
    });
  } finally {
    if (!clientAborted) {
      res.write("event: end\ndata: {}\n\n");
      res.end();
    }
  }
}

async function listConversations(req, res) {
  const workspaceId = resolveWorkspaceId(req);
  if (!workspaceId) {
    res.status(400).json({
      error: { code: "WORKSPACE_REQUIRED", message: "workspaceId is required." },
    });
    return;
  }
  const rows = await assistantService.listConversations(workspaceId);
  res.json(rows);
}

async function listMessages(req, res) {
  const rows = await assistantService.listMessages(req.params.id);
  res.json(rows);
}

async function contextPreview(req, res) {
  const workspaceId = resolveWorkspaceId(req);
  if (!workspaceId) {
    res.status(400).json({
      error: { code: "WORKSPACE_REQUIRED", message: "workspaceId is required." },
    });
    return;
  }
  const bundle = await assistantService.buildContextBundle(workspaceId, {
    locale: req.query.locale === "ar" ? "ar" : "en",
  });
  res.json(bundle);
}

module.exports = {
  chat,
  listConversations,
  listMessages,
  contextPreview,
};
