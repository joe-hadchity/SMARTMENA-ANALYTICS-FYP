/**
 * metaOAuthService -- Graph API v19 OAuth flow for Facebook + Instagram.
 *
 * This module implements the three pieces needed to graduate the beta from
 * mock-mode to live Meta integrations:
 *
 *   1. buildAuthorizationUrl()    -- produce the Facebook login URL
 *   2. exchangeCodeForToken()     -- exchange `code` -> short -> long-lived user token
 *   3. syncMetaConnection()       -- fan-out token into social_accounts rows
 *                                    (Pages + Instagram Business accounts)
 *
 * The only side-effects are (a) HTTPS calls to graph.facebook.com and
 * (b) rows inserted / updated in oauth_connections and social_accounts.
 *
 * Live token secrets are passed around as in-memory strings and written to
 * the DB through oauthConnectionService.upsertConnection() (AES-256-GCM).
 */

const axios = require("axios");

const env = require("../../config/env");
const logger = require("../../utils/logger");
const db = require("../dbService");
const oauthConnectionService = require("./oauthConnectionService");

const SCOPES = [
  "public_profile",
  "email",
  "pages_show_list",
  "pages_read_engagement",
  "pages_read_user_content",
  "instagram_basic",
  "instagram_manage_insights",
  "business_management",
];

const GRAPH_BASE = () =>
  `https://graph.facebook.com/${env.META_GRAPH_VERSION}`;
const OAUTH_BASE = () =>
  `https://www.facebook.com/${env.META_GRAPH_VERSION}/dialog/oauth`;

function assertEnabled() {
  if (!env.META_OAUTH_ENABLED) {
    const err = new Error(
      "Meta OAuth is disabled. Set META_APP_ID, META_APP_SECRET, TOKEN_ENCRYPTION_KEY.",
    );
    err.status = 503;
    throw err;
  }
}

/**
 * Build the Facebook dialog URL the browser should be redirected to.
 * `state` must come from oauthConnectionService.createState() so the callback
 * can verify it.
 */
function buildAuthorizationUrl({ state, scopes = SCOPES }) {
  assertEnabled();
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: env.META_REDIRECT_URI,
    response_type: "code",
    state,
    scope: scopes.join(","),
  });
  return `${OAUTH_BASE()}?${params.toString()}`;
}

/**
 * Exchange the `code` from the callback for a long-lived user token.
 * Returns { accessToken, tokenType, expiresAt }.
 */
async function exchangeCodeForToken(code) {
  assertEnabled();

  // Step 1: code -> short-lived user token.
  const shortRes = await axios.get(`${GRAPH_BASE()}/oauth/access_token`, {
    params: {
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      redirect_uri: env.META_REDIRECT_URI,
      code,
    },
    timeout: 15_000,
  });
  const shortToken = shortRes.data?.access_token;
  if (!shortToken) {
    throw new Error("Meta OAuth: missing short-lived access_token in response");
  }

  // Step 2: short -> long-lived user token (typically ~60 days).
  const longRes = await axios.get(`${GRAPH_BASE()}/oauth/access_token`, {
    params: {
      grant_type: "fb_exchange_token",
      client_id: env.META_APP_ID,
      client_secret: env.META_APP_SECRET,
      fb_exchange_token: shortToken,
    },
    timeout: 15_000,
  });
  const accessToken = longRes.data?.access_token;
  const expiresIn = Number(longRes.data?.expires_in) || null;
  if (!accessToken) {
    throw new Error("Meta OAuth: long-lived token exchange failed");
  }

  return {
    accessToken,
    tokenType: longRes.data?.token_type || "bearer",
    expiresAt: expiresIn
      ? new Date(Date.now() + expiresIn * 1000).toISOString()
      : null,
  };
}

/**
 * Fetch `/me` on behalf of the user to stamp the external_user_id on the
 * oauth_connections row.
 */
async function fetchMe(accessToken) {
  const res = await axios.get(`${GRAPH_BASE()}/me`, {
    params: { fields: "id,name,email", access_token: accessToken },
    timeout: 10_000,
  });
  return res.data;
}

/**
 * Fetch Facebook Pages the user can manage, plus -- when present -- the
 * Instagram Business account linked to each Page.
 */
async function fetchAccountsPayload(accessToken) {
  const res = await axios.get(`${GRAPH_BASE()}/me/accounts`, {
    params: {
      fields:
        "id,name,username,category,picture{url},link,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count}",
      access_token: accessToken,
    },
    timeout: 15_000,
  });
  return res.data?.data || [];
}

/**
 * Given an active oauth_connections row, hit the Graph API, then create /
 * update one social_accounts row per Page and per linked IG Business account.
 * Returns a summary that the frontend can surface directly.
 */
async function syncMetaConnection({ connection }) {
  const plaintext = oauthConnectionService.extractPlaintext(connection);
  if (!plaintext?.accessToken) {
    throw new Error("syncMetaConnection: connection is missing an access token");
  }

  let pages;
  try {
    pages = await fetchAccountsPayload(plaintext.accessToken);
  } catch (err) {
    const message =
      err.response?.data?.error?.message || err.message || "Meta Graph error";
    await oauthConnectionService.markError(connection.id, message);
    const e = new Error(message);
    e.status = 502;
    throw e;
  }

  const createdOrUpdated = [];

  for (const page of pages) {
    // Facebook Page row.
    const fbRow = await upsertSocialAccount({
      workspaceId: connection.workspace_id,
      oauthConnectionId: connection.id,
      provider: "meta_facebook",
      externalAccountId: page.id,
      handle: page.username || page.name || null,
      displayName: page.name || null,
      avatarUrl: page.picture?.data?.url || null,
      profileUrl: page.link || null,
      metadata: {
        category: page.category || null,
        page_access_token_present: Boolean(page.access_token),
      },
    });
    createdOrUpdated.push(fbRow);

    const ig = page.instagram_business_account;
    if (ig?.id) {
      const igRow = await upsertSocialAccount({
        workspaceId: connection.workspace_id,
        oauthConnectionId: connection.id,
        provider: "meta_instagram",
        externalAccountId: ig.id,
        handle: ig.username || null,
        displayName: ig.name || ig.username || null,
        avatarUrl: ig.profile_picture_url || null,
        profileUrl: ig.username ? `https://instagram.com/${ig.username}` : null,
        metadata: {
          followers_count: ig.followers_count ?? null,
          media_count: ig.media_count ?? null,
          linked_page_id: page.id,
        },
      });
      createdOrUpdated.push(igRow);
    }
  }

  return {
    connection_id: connection.id,
    pages: pages.length,
    accounts_synced: createdOrUpdated.length,
    accounts: createdOrUpdated,
  };
}

/**
 * Insert-or-update a social_accounts row for a live (non-mock) Meta account.
 */
async function upsertSocialAccount({
  workspaceId,
  oauthConnectionId,
  provider,
  externalAccountId,
  handle,
  displayName,
  avatarUrl,
  profileUrl,
  metadata,
}) {
  const supabase = require("../../config/supabase").getSupabase();
  const { data: existing, error: findErr } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("external_account_id", externalAccountId)
    .maybeSingle();
  if (findErr && findErr.code !== "PGRST116") {
    throw new Error(findErr.message || "Failed to look up social_accounts");
  }

  const patch = {
    handle,
    display_name: displayName,
    avatar_url: avatarUrl,
    profile_url: profileUrl,
    status: "connected",
    is_mock: false,
    oauth_connection_id: oauthConnectionId,
    metadata: { ...(existing?.metadata || {}), ...metadata },
  };

  if (existing?.id) {
    return db.update("social_accounts", existing.id, patch);
  }
  return db.insert("social_accounts", {
    workspace_id: workspaceId,
    provider,
    external_account_id: externalAccountId,
    ...patch,
    connected_at: new Date().toISOString(),
  });
}

/**
 * Full init flow: caller passes workspaceId + redirectAfter, we persist an
 * oauth_states row and return the URL the browser should jump to.
 */
async function startAuthorization({ workspaceId, redirectAfter }) {
  assertEnabled();
  const state = await oauthConnectionService.createState({
    workspaceId,
    provider: "meta",
    redirectAfter,
  });
  return {
    url: buildAuthorizationUrl({ state }),
    state,
  };
}

/**
 * Full callback flow: exchange code, upsert the oauth_connections row, fan
 * out into social_accounts.
 */
async function handleCallback({ code, state }) {
  assertEnabled();
  const stateRow = await oauthConnectionService.consumeState(state);
  if (stateRow.provider !== "meta") {
    throw Object.assign(new Error("OAuth state is not for Meta"), { status: 400 });
  }

  const token = await exchangeCodeForToken(code);
  let me = { id: null, name: null, email: null };
  try {
    me = await fetchMe(token.accessToken);
  } catch (err) {
    logger.warn?.("[metaOAuth] /me failed:", err.message);
  }

  const connection = await oauthConnectionService.upsertConnection({
    workspaceId: stateRow.workspace_id,
    provider: "meta",
    externalUserId: me.id,
    scope: SCOPES.join(" "),
    accessToken: token.accessToken,
    refreshToken: null,
    tokenType: token.tokenType,
    expiresAt: token.expiresAt,
    metadata: {
      user_name: me.name || null,
      user_email: me.email || null,
      graph_version: env.META_GRAPH_VERSION,
    },
  });

  const syncResult = await syncMetaConnection({ connection });

  return {
    connection: oauthConnectionService.sanitizeConnection(connection),
    redirect_after: stateRow.redirect_after || "/connections",
    sync: syncResult,
  };
}

module.exports = {
  SCOPES,
  GRAPH_VERSION: env.META_GRAPH_VERSION,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchMe,
  fetchAccountsPayload,
  syncMetaConnection,
  startAuthorization,
  handleCallback,
};
