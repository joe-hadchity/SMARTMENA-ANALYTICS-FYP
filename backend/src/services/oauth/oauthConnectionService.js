/**
 * oauthConnectionService -- CRUD helpers for public.oauth_connections and
 * the short-lived public.oauth_states table used during the OAuth dance.
 *
 * All plaintext tokens are encrypted via tokenCrypto before being persisted;
 * the plaintext never leaves this module.
 */

const crypto = require("crypto");

const { getSupabase } = require("../../config/supabase");
const { encryptToken, decryptToken } = require("./tokenCrypto");

const CONN_TABLE = "oauth_connections";
const STATE_TABLE = "oauth_states";

function requireSupabase() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }
  return supabase;
}

// ---------------------------------------------------------------------------
// oauth_states
// ---------------------------------------------------------------------------

async function createState({ workspaceId, provider, redirectAfter, metadata = {} }) {
  const supabase = requireSupabase();
  const state = crypto.randomBytes(32).toString("base64url");
  const { error } = await supabase.from(STATE_TABLE).insert({
    state,
    workspace_id: workspaceId,
    provider,
    redirect_after: redirectAfter ?? null,
    metadata,
  });
  if (error) {
    const err = new Error(error.message || "Failed to create oauth state");
    err.status = 500;
    throw err;
  }
  return state;
}

async function consumeState(state) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from(STATE_TABLE)
    .select("*")
    .eq("state", state)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to look up oauth state");
    err.status = 500;
    throw err;
  }
  if (!data) {
    const err = new Error("Unknown or expired OAuth state");
    err.status = 400;
    throw err;
  }
  const expiresAt = new Date(data.expires_at).getTime();
  if (Number.isFinite(expiresAt) && expiresAt < Date.now()) {
    await supabase.from(STATE_TABLE).delete().eq("state", state);
    const err = new Error("OAuth state has expired");
    err.status = 400;
    throw err;
  }
  // Single-use: delete immediately.
  await supabase.from(STATE_TABLE).delete().eq("state", state);
  return data;
}

// ---------------------------------------------------------------------------
// oauth_connections
// ---------------------------------------------------------------------------

/**
 * Upsert an OAuth connection row for (workspace, provider, externalUserId).
 * Plaintext tokens are encrypted inline and never stored in the clear.
 */
async function upsertConnection({
  workspaceId,
  provider,
  externalUserId,
  scope,
  accessToken,
  refreshToken,
  tokenType = "bearer",
  expiresAt,
  metadata = {},
}) {
  const supabase = requireSupabase();

  const accessCipher = encryptToken(accessToken);
  const refreshCipher = refreshToken ? encryptToken(refreshToken) : null;

  const row = {
    workspace_id: workspaceId,
    provider,
    external_user_id: externalUserId ?? null,
    scope: scope ?? null,
    access_token_ciphertext: accessCipher,
    refresh_token_ciphertext: refreshCipher,
    token_type: tokenType,
    expires_at: expiresAt ?? null,
    metadata,
    status: "active",
    last_verified_at: new Date().toISOString(),
    last_error_message: null,
  };

  // Manual upsert -- Supabase-JS cannot target a named unique constraint
  // when the column is `null`able (external_user_id may be null).
  let existing = null;
  {
    const q = supabase
      .from(CONN_TABLE)
      .select("id")
      .eq("workspace_id", workspaceId)
      .eq("provider", provider);
    if (externalUserId) q.eq("external_user_id", externalUserId);
    else q.is("external_user_id", null);
    const { data, error } = await q.maybeSingle();
    if (error && error.code !== "PGRST116") {
      const err = new Error(error.message || "Failed to look up oauth connection");
      err.status = 500;
      throw err;
    }
    existing = data;
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from(CONN_TABLE)
      .update(row)
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) {
      const err = new Error(error.message || "Failed to update oauth connection");
      err.status = 500;
      throw err;
    }
    return data;
  }

  const { data, error } = await supabase
    .from(CONN_TABLE)
    .insert(row)
    .select("*")
    .single();
  if (error) {
    const err = new Error(error.message || "Failed to insert oauth connection");
    err.status = 500;
    throw err;
  }
  return data;
}

async function getConnectionById(id) {
  const supabase = requireSupabase();
  const { data, error } = await supabase
    .from(CONN_TABLE)
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to load oauth connection");
    err.status = 500;
    throw err;
  }
  return data;
}

async function getConnectionByProvider({ workspaceId, provider, externalUserId }) {
  const supabase = requireSupabase();
  const q = supabase
    .from(CONN_TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("status", "active");
  if (externalUserId) q.eq("external_user_id", externalUserId);
  const { data, error } = await q.maybeSingle();
  if (error && error.code !== "PGRST116") {
    const err = new Error(error.message || "Failed to load oauth connection");
    err.status = 500;
    throw err;
  }
  return data;
}

/**
 * Decrypts and returns { accessToken, refreshToken } for a persisted
 * connection row. Any decryption failure raises.
 */
function extractPlaintext(connection) {
  if (!connection) return null;
  const accessToken = decryptToken(connection.access_token_ciphertext);
  const refreshToken = connection.refresh_token_ciphertext
    ? decryptToken(connection.refresh_token_ciphertext)
    : null;
  return { accessToken, refreshToken };
}

async function markError(id, message) {
  const supabase = requireSupabase();
  await supabase
    .from(CONN_TABLE)
    .update({
      status: "error",
      last_error_message: String(message || "unknown error").slice(0, 500),
    })
    .eq("id", id);
}

async function revokeConnection(id) {
  const supabase = requireSupabase();
  const { error } = await supabase
    .from(CONN_TABLE)
    .update({ status: "revoked" })
    .eq("id", id);
  if (error) {
    const err = new Error(error.message || "Failed to revoke oauth connection");
    err.status = 500;
    throw err;
  }
}

/**
 * Redact helper: returns a plain object safe to ship to the frontend.
 */
function sanitizeConnection(connection) {
  if (!connection) return null;
  return {
    id: connection.id,
    workspace_id: connection.workspace_id,
    provider: connection.provider,
    external_user_id: connection.external_user_id,
    scope: connection.scope,
    token_type: connection.token_type,
    expires_at: connection.expires_at,
    status: connection.status,
    last_verified_at: connection.last_verified_at,
    last_error_message: connection.last_error_message,
    created_at: connection.created_at,
    updated_at: connection.updated_at,
    metadata: connection.metadata,
  };
}

module.exports = {
  createState,
  consumeState,
  upsertConnection,
  getConnectionById,
  getConnectionByProvider,
  extractPlaintext,
  markError,
  revokeConnection,
  sanitizeConnection,
};
