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
const { encryptToken } = require("./tokenCrypto");

const CORE_SCOPES = [
  "public_profile",
  "pages_show_list",
  "pages_read_engagement",
  "instagram_basic",
];

const INSIGHTS_SCOPES = [
  ...CORE_SCOPES,
  "instagram_manage_insights",
];

const INBOX_SCOPES = [
  ...INSIGHTS_SCOPES,
  "instagram_manage_comments",
  "instagram_manage_messages",
  "pages_manage_metadata",
];

const FULL_SCOPES = [
  ...INBOX_SCOPES,
  "business_management",
  "instagram_content_publish",
];

const SCOPE_PACKS = {
  core: CORE_SCOPES,
  insights: INSIGHTS_SCOPES,
  inbox: INBOX_SCOPES,
  full: FULL_SCOPES,
};

const ACTIVE_SCOPES = env.META_OAUTH_SCOPES.length
  ? env.META_OAUTH_SCOPES
  : SCOPE_PACKS.full;

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
function uniqueScopes(scopes) {
  return Array.from(new Set((scopes || []).filter(Boolean)));
}

function resolveScopes(scopePack) {
  if (env.META_OAUTH_SCOPES.length) return uniqueScopes(env.META_OAUTH_SCOPES);
  return uniqueScopes(SCOPE_PACKS[scopePack] || ACTIVE_SCOPES);
}

function buildAuthorizationUrl({ state, scopes = ACTIVE_SCOPES }) {
  assertEnabled();
  const params = new URLSearchParams({
    client_id: env.META_APP_ID,
    redirect_uri: env.META_REDIRECT_URI,
    response_type: "code",
    state,
    scope: uniqueScopes(scopes).join(","),
    auth_type: "rerequest",
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
    params: { fields: "id,name", access_token: accessToken },
    timeout: 10_000,
  });
  return res.data;
}

async function debugToken(accessToken) {
  assertEnabled();
  const appAccessToken = `${env.META_APP_ID}|${env.META_APP_SECRET}`;
  const res = await axios.get(`${GRAPH_BASE()}/debug_token`, {
    params: {
      input_token: accessToken,
      access_token: appAccessToken,
    },
    timeout: 10_000,
  });
  return res.data?.data || {};
}

async function fetchGrantedPermissions(accessToken) {
  try {
    const res = await axios.get(`${GRAPH_BASE()}/me/permissions`, {
      params: { access_token: accessToken },
      timeout: 10_000,
    });
    const rows = Array.isArray(res.data?.data) ? res.data.data : [];
    return rows
      .filter((row) => row.status === "granted")
      .map((row) => row.permission);
  } catch (err) {
    logger.warn?.("[metaOAuth] /me/permissions failed:", err.message);
    return [];
  }
}

/**
 * Fetch Facebook Pages the user can manage, plus -- when present -- the
 * Instagram Business account linked to each Page.
 */
async function fetchAccountsPayload(accessToken) {
  const res = await axios.get(`${GRAPH_BASE()}/me/accounts`, {
    params: {
      fields:
        "id,name,username,category,tasks,picture{url},link,access_token,instagram_business_account{id,username,name,profile_picture_url,followers_count,media_count,biography,website},connected_instagram_account{id,username,name,profile_picture_url}",
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
  const warnings = [];
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
    const pageTokenCiphertext = page.access_token
      ? encryptToken(page.access_token)
      : null;
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
        tasks: page.tasks || [],
        page_access_token_present: Boolean(page.access_token),
        page_access_token_ciphertext: pageTokenCiphertext,
        graph_source: "facebook_login",
      },
    });
    createdOrUpdated.push(fbRow);

    const ig = page.instagram_business_account || page.connected_instagram_account;
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
          biography: ig.biography || null,
          website: ig.website || null,
          linked_page_id: page.id,
          linked_page_name: page.name || null,
          page_access_token_present: Boolean(page.access_token),
          page_access_token_ciphertext: pageTokenCiphertext,
          graph_source: page.instagram_business_account
            ? "instagram_business_account"
            : "connected_instagram_account",
        },
      });
      createdOrUpdated.push(igRow);
    } else {
      warnings.push(`page_without_linked_instagram:${page.name || page.id}`);
    }
  }

  return {
    connection_id: connection.id,
    pages: pages.length,
    instagram_accounts: createdOrUpdated.filter(
      (account) => account.provider === "meta_instagram",
    ).length,
    accounts_synced: createdOrUpdated.length,
    accounts: createdOrUpdated,
    warnings,
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
async function startAuthorization({ workspaceId, redirectAfter, scopePack = "full" }) {
  assertEnabled();
  const scopes = resolveScopes(scopePack);
  const state = await oauthConnectionService.createState({
    workspaceId,
    provider: "meta",
    redirectAfter,
    metadata: { scope_pack: scopePack, requested_scopes: scopes },
  });
  return {
    url: buildAuthorizationUrl({ state, scopes }),
    state,
    scopes,
    scope_pack: scopePack,
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
  const tokenDebug = await safeGraph(() => debugToken(token.accessToken), {});
  const grantedScopes = await fetchGrantedPermissions(token.accessToken);
  const requestedScopes = stateRow.metadata?.requested_scopes || ACTIVE_SCOPES;

  const connection = await oauthConnectionService.upsertConnection({
    workspaceId: stateRow.workspace_id,
    provider: "meta",
    externalUserId: me.id,
    scope: uniqueScopes(grantedScopes.length ? grantedScopes : requestedScopes).join(" "),
    accessToken: token.accessToken,
    refreshToken: null,
    tokenType: token.tokenType,
    expiresAt: token.expiresAt,
    metadata: {
      user_name: me.name || null,
      user_email: me.email || null,
      graph_version: env.META_GRAPH_VERSION,
      scope_pack: stateRow.metadata?.scope_pack || "full",
      requested_scopes: requestedScopes,
      granted_scopes: grantedScopes,
      declined_scopes: requestedScopes.filter(
        (scope) => !grantedScopes.includes(scope),
      ),
      token_debug: sanitizeTokenDebug(tokenDebug),
    },
  });

  const syncResult = await syncMetaConnection({ connection });

  return {
    connection: oauthConnectionService.sanitizeConnection(connection),
    redirect_after: stateRow.redirect_after || "/connections",
    sync: syncResult,
  };
}

async function getDiagnostics({ workspaceId }) {
  const connection = await oauthConnectionService.getConnectionByProvider({
    workspaceId,
    provider: "meta",
  });
  if (!connection) {
    return {
      connected: false,
      connection: null,
      requested_scopes: ACTIVE_SCOPES,
      granted_scopes: [],
      missing_scopes: ACTIVE_SCOPES,
      pages: 0,
      instagram_accounts: 0,
      accounts: [],
      warnings: ["no_active_meta_oauth_connection"],
    };
  }

  const plaintext = oauthConnectionService.extractPlaintext(connection);
  const tokenDebug = await safeGraph(
    () => debugToken(plaintext.accessToken),
    connection.metadata?.token_debug || {},
  );
  const grantedScopes = await fetchGrantedPermissions(plaintext.accessToken);
  const requestedScopes = connection.metadata?.requested_scopes || ACTIVE_SCOPES;
  let syncPreview = null;
  const warnings = [];
  try {
    const pages = await fetchAccountsPayload(plaintext.accessToken);
    syncPreview = {
      pages: pages.length,
      instagram_accounts: pages.filter(
        (page) => page.instagram_business_account || page.connected_instagram_account,
      ).length,
      accounts: pages.map((page) => ({
        page_id: page.id,
        page_name: page.name || null,
        page_category: page.category || null,
        tasks: page.tasks || [],
        has_page_token: Boolean(page.access_token),
        instagram:
          page.instagram_business_account || page.connected_instagram_account || null,
      })),
    };
  } catch (err) {
    warnings.push(
      `graph_discovery_failed:${err.response?.data?.error?.message || err.message}`,
    );
  }

  return {
    connected: connection.status === "active",
    connection: oauthConnectionService.sanitizeConnection({
      ...connection,
      metadata: {
        ...(connection.metadata || {}),
        token_debug: sanitizeTokenDebug(tokenDebug),
      },
    }),
    requested_scopes: requestedScopes,
    granted_scopes: grantedScopes,
    missing_scopes: requestedScopes.filter((scope) => !grantedScopes.includes(scope)),
    pages: syncPreview?.pages || 0,
    instagram_accounts: syncPreview?.instagram_accounts || 0,
    accounts: syncPreview?.accounts || [],
    warnings,
  };
}

async function safeGraph(fn, fallback) {
  try {
    return await fn();
  } catch (err) {
    logger.warn?.("[metaOAuth] graph probe failed:", err.message);
    return fallback;
  }
}

function sanitizeTokenDebug(debug = {}) {
  return {
    app_id: debug.app_id || null,
    type: debug.type || null,
    application: debug.application || null,
    data_access_expires_at: debug.data_access_expires_at || null,
    expires_at: debug.expires_at || null,
    is_valid: debug.is_valid ?? null,
    issued_at: debug.issued_at || null,
    scopes: debug.scopes || [],
    user_id: debug.user_id || null,
  };
}

module.exports = {
  SCOPES: ACTIVE_SCOPES,
  SCOPE_PACKS,
  GRAPH_VERSION: env.META_GRAPH_VERSION,
  buildAuthorizationUrl,
  exchangeCodeForToken,
  fetchMe,
  debugToken,
  fetchGrantedPermissions,
  fetchAccountsPayload,
  syncMetaConnection,
  startAuthorization,
  handleCallback,
  getDiagnostics,
};
