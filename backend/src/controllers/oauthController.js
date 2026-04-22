/**
 * oauthController -- HTTP layer for live OAuth flows.
 *
 * Endpoints exposed via routes/oauthRoutes.js:
 *
 *   GET  /api/oauth/meta/init       -- start the Meta OAuth dance (redirects)
 *   GET  /api/oauth/meta/callback   -- Graph API redirects here with code+state
 *   GET  /api/oauth/meta/status     -- whether live Meta OAuth is configured
 *   POST /api/oauth/meta/sync       -- manually re-run the accounts sync
 *   DELETE /api/oauth/meta/:id      -- revoke a connection (sets status=revoked)
 *
 * The /init endpoint expects `x-workspace-id` (resolved by workspaceContext)
 * and an optional `redirect_after` query string. The /callback endpoint does
 * NOT apply workspaceContext -- the workspace_id is looked up from the
 * oauth_states row that was inserted during /init.
 */

const env = require("../config/env");
const metaOAuthService = require("../services/oauth/metaOAuthService");
const oauthConnectionService = require("../services/oauth/oauthConnectionService");

/**
 * GET /api/oauth/meta/status
 * Public probe the frontend uses to render a "Connect with Meta (Live)" vs
 * "Connect with Meta (Mock)" button.
 */
async function status(req, res) {
  res.status(200).json({
    provider: "meta",
    enabled: env.META_OAUTH_ENABLED,
    mode: env.META_OAUTH_ENABLED ? "live" : "mock",
    graph_version: env.META_GRAPH_VERSION,
    redirect_uri: env.META_REDIRECT_URI,
    scopes: metaOAuthService.SCOPES,
    missing: env.META_OAUTH_ENABLED
      ? []
      : [
          !process.env.META_APP_ID ? "META_APP_ID" : null,
          !process.env.META_APP_SECRET ? "META_APP_SECRET" : null,
          !process.env.TOKEN_ENCRYPTION_KEY ? "TOKEN_ENCRYPTION_KEY" : null,
        ].filter(Boolean),
  });
}

/**
 * GET /api/oauth/meta/init
 * Redirects the browser to the Facebook login dialog.
 * Accepts `redirect_after` query param to return the user to a specific SPA
 * route after the dance (defaults to /connections).
 */
async function initMeta(req, res) {
  if (!env.META_OAUTH_ENABLED) {
    const err = new Error(
      "Meta OAuth is disabled. Set META_APP_ID, META_APP_SECRET and TOKEN_ENCRYPTION_KEY.",
    );
    err.status = 503;
    err.details = { mode: "mock" };
    throw err;
  }
  const { url } = await metaOAuthService.startAuthorization({
    workspaceId: req.workspaceId,
    redirectAfter: typeof req.query.redirect_after === "string"
      ? req.query.redirect_after
      : "/connections",
  });
  if (String(req.query.format).toLowerCase() === "json") {
    return res.status(200).json({ authorization_url: url });
  }
  res.redirect(302, url);
}

/**
 * GET /api/oauth/meta/callback
 * Graph API redirects the browser here after the user authorises the app.
 */
async function callbackMeta(req, res) {
  const { code, state, error, error_description } = req.query;

  // Build the URL to send the user back to in the SPA.
  const frontend = (env.FRONTEND_URL || "").replace(/\/+$/, "");

  if (error) {
    const target = `${frontend}/connections?oauth=meta&status=error&message=${encodeURIComponent(
      String(error_description || error),
    )}`;
    return res.redirect(302, target);
  }
  if (typeof code !== "string" || typeof state !== "string") {
    const target = `${frontend}/connections?oauth=meta&status=error&message=${encodeURIComponent(
      "missing code or state",
    )}`;
    return res.redirect(302, target);
  }

  try {
    const result = await metaOAuthService.handleCallback({ code, state });
    const redirectAfter = result.redirect_after || "/connections";
    const qs = new URLSearchParams({
      oauth: "meta",
      status: "ok",
      accounts: String(result.sync?.accounts_synced ?? 0),
    });
    return res.redirect(302, `${frontend}${redirectAfter}?${qs.toString()}`);
  } catch (err) {
    const message = err.message || "OAuth callback failed";
    const target = `${frontend}/connections?oauth=meta&status=error&message=${encodeURIComponent(
      message,
    )}`;
    return res.redirect(302, target);
  }
}

/**
 * POST /api/oauth/meta/sync
 * Re-runs the Pages+IG accounts sync using the stored token. Useful when
 * the user has added a new Page in Meta Business Suite and wants it to show
 * up in /connections without clicking through OAuth again.
 */
async function syncMeta(req, res) {
  if (!env.META_OAUTH_ENABLED) {
    const err = new Error("Meta OAuth is disabled (mock mode).");
    err.status = 503;
    throw err;
  }
  const connection = await oauthConnectionService.getConnectionByProvider({
    workspaceId: req.workspaceId,
    provider: "meta",
  });
  if (!connection) {
    const err = new Error("No active Meta OAuth connection for this workspace.");
    err.status = 404;
    throw err;
  }
  const result = await metaOAuthService.syncMetaConnection({ connection });
  res.status(200).json({
    connection: oauthConnectionService.sanitizeConnection(connection),
    sync: result,
  });
}

/**
 * DELETE /api/oauth/meta/connection/:id
 * Marks the connection as revoked. The linked social_accounts rows keep
 * existing but their `is_mock=false` flag is left untouched for audit
 * purposes; they simply lose their live token.
 */
async function revokeMeta(req, res) {
  await oauthConnectionService.revokeConnection(req.params.id);
  res.status(200).json({ id: req.params.id, status: "revoked" });
}

module.exports = {
  status,
  initMeta,
  callbackMeta,
  syncMeta,
  revokeMeta,
};
