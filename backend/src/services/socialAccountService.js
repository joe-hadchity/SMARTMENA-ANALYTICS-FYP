/**
 * socialAccountService -- persistence and connect logic for connected
 * social accounts. Delegates all platform-specific behaviour to the
 * provider registry in ./providers.
 */

const db = require("./dbService");
const { getProvider } = require("./providers");
const { getSupabase } = require("../config/supabase");

const TABLE = "social_accounts";

function providerKeyForMetaKind(kind) {
  if (kind === "instagram") return "meta_instagram";
  if (kind === "facebook") return "meta_facebook";
  const err = new Error(`Unsupported Meta kind: ${kind}`);
  err.status = 400;
  throw err;
}

async function listSocialAccounts({ workspaceId } = {}) {
  return db.list(TABLE, {
    filters: workspaceId ? { workspace_id: workspaceId } : undefined,
    orderBy: "connected_at",
    ascending: false,
  });
}

async function getSocialAccountById(id) {
  return db.getById(TABLE, id);
}

async function deleteSocialAccount(id) {
  return db.remove(TABLE, id);
}

/**
 * Connect a Meta (Instagram / Facebook) account in mock mode.
 *
 * Because the provider's external_account_id is deterministic per-handle
 * (see metaMockProvider), re-connecting the same handle inside the same
 * workspace returns the existing row instead of 409-ing.
 */
async function connectMetaAccount({ workspaceId, kind, handle, displayName }) {
  const providerKey = providerKeyForMetaKind(kind);
  const provider = getProvider(providerKey);
  const normalized = await provider.connectMock({ handle, displayName });

  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error(
      "Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
    err.status = 503;
    throw err;
  }

  // If the same (workspace, provider, external_account_id) already exists,
  // return it. The DB has a unique constraint on that triple; we pre-check
  // so the caller gets a clean 200 instead of a 409.
  const { data: existingRows, error: existingErr } = await supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", normalized.provider)
    .eq("external_account_id", normalized.externalAccountId)
    .limit(1);

  if (existingErr) {
    const err = new Error(existingErr.message || "Failed to look up account");
    err.status = 400;
    err.details = { code: existingErr.code };
    throw err;
  }

  if (existingRows && existingRows.length > 0) {
    // Refresh mutable fields (handle/displayName/avatar) + mark as connected.
    const existing = existingRows[0];
    return db.update(TABLE, existing.id, {
      handle: normalized.handle,
      display_name: normalized.displayName,
      avatar_url: normalized.avatarUrl,
      profile_url: normalized.profileUrl,
      status: "connected",
      metadata: normalized.metadata,
    });
  }

  return db.insert(TABLE, {
    workspace_id: workspaceId,
    provider: normalized.provider,
    external_account_id: normalized.externalAccountId,
    handle: normalized.handle,
    display_name: normalized.displayName,
    avatar_url: normalized.avatarUrl,
    profile_url: normalized.profileUrl,
    status: "connected",
    access_token_ciphertext: normalized.accessTokenCiphertext ?? null,
    token_expires_at: normalized.tokenExpiresAt ?? null,
    is_mock: normalized.isMock !== false,
    metadata: normalized.metadata ?? {},
  });
}

async function touchLastSyncedAt(accountId) {
  return db.update(TABLE, accountId, { last_synced_at: new Date().toISOString() });
}

/**
 * Platform-agnostic create. Used by POST /api/social-accounts for cases where
 * the caller already has the external account id (e.g. admin import, second
 * provider onboarded later). For the mock Meta OAuth flow call
 * connectMetaAccount() instead.
 *
 * Maps the generic request shape to the columns actually in the DB:
 *   platform             -> provider
 *   account_name         -> display_name
 *   account_external_id  -> external_account_id
 *   account_type         -> account_type        (v3 column)
 *   metadata_json        -> metadata
 */
async function createSocialAccount({
  workspaceId,
  platform,
  account_name,
  account_external_id,
  account_type,
  status,
  metadata_json,
}) {
  if (!workspaceId) {
    const err = new Error("workspace_id is required");
    err.status = 400;
    throw err;
  }

  const row = {
    workspace_id: workspaceId,
    provider: platform,
    external_account_id: account_external_id,
    display_name: account_name ?? null,
    handle: account_name ?? null,
    status: status ?? "connected",
    is_mock: false,
    metadata: metadata_json ?? {},
  };

  // Only include v3 columns when the caller provided them, so the endpoint
  // still works against a Supabase instance that has not yet applied
  // schema_v3.sql.
  if (account_type !== undefined) row.account_type = account_type;

  return db.insert(TABLE, row);
}

module.exports = {
  TABLE,
  listSocialAccounts,
  getSocialAccountById,
  deleteSocialAccount,
  connectMetaAccount,
  createSocialAccount,
  touchLastSyncedAt,
  providerKeyForMetaKind,
};
