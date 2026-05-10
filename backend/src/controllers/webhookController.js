const env = require("../config/env");
const inboxService = require("../services/inboxService");
const logger = require("../utils/logger");
const fs = require("fs");
const path = require("path");

function verifyMetaWebhook(req, res) {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token && token === env.META_INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
}

async function receiveMetaWebhook(req, res) {
  // Reply fast so Meta does not retry aggressively. Persistence is best effort.
  res.sendStatus(200);

  try {
    persistWebhookDebugEvent(req);
    const result = await inboxService.ingestMetaWebhook(req.body || {});
    logger.info(
      `meta webhook received entries=${Array.isArray(req.body?.entry) ? req.body.entry.length : 0} imported=${result?.imported || 0}`,
    );
    if (result?.warnings?.length) {
      logger.warn(`meta webhook processed with warnings: ${result.warnings.join(", ")}`);
    }
  } catch (err) {
    logger.warn(`meta webhook ingest failed: ${err.message}`);
  }
}

function persistWebhookDebugEvent(req) {
  // Local-only debug trail for Meta webhook setup. It helps us verify whether
  // Meta is hitting the callback and what event shape is being delivered.
  const logDir = path.resolve(__dirname, "../../..", ".tools");
  const logPath = path.join(logDir, "meta-webhook-events.log");
  fs.mkdirSync(logDir, { recursive: true });
  fs.appendFileSync(
    logPath,
    `${JSON.stringify({
      received_at: new Date().toISOString(),
      object: req.body?.object || null,
      entry_count: Array.isArray(req.body?.entry) ? req.body.entry.length : 0,
      signature_present: Boolean(req.headers["x-hub-signature-256"]),
      user_agent: req.headers["user-agent"] || null,
      body: req.body || {},
    })}\n`,
  );
}

module.exports = {
  verifyMetaWebhook,
  receiveMetaWebhook,
};
