/**
 * scheduledPostService -- CRUD + publish pipeline for drafts and scheduled
 * outbound posts. Composes `platformIntegrations/*` to simulate publishing
 * while the real OAuth integrations are still pending.
 *
 * Life-cycle:
 *   draft -> scheduled -> publishing -> published
 *                                   \-> failed
 *   draft | scheduled -> cancelled (manual action)
 *
 * `publishDuePosts()` is safe to invoke repeatedly. It picks rows where
 * status=scheduled AND scheduled_at <= now(), atomically flips them to
 * `publishing`, and then calls the matching integration's `publishPost`.
 */

const db = require("./dbService");
const { getSupabase } = require("../config/supabase");
const { getIntegrationService } = require("./platformIntegrations");
const logger = require("../utils/logger");

const TABLE = "scheduled_posts";

const STATUSES = [
  "draft",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "cancelled",
];

const EDITABLE_STATUSES = ["draft", "scheduled", "failed"];

function requireClient() {
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

function normaliseStrings(value, max = 32) {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v) => typeof v === "string")
    .map((v) => v.trim())
    .filter(Boolean)
    .slice(0, max);
}

function buildPayload(input, { partial = false } = {}) {
  const payload = {};

  if (input.social_account_id !== undefined)
    payload.social_account_id = input.social_account_id || null;
  if (input.platform !== undefined) payload.platform = input.platform;
  if (input.caption !== undefined) payload.caption = input.caption;
  if (input.language !== undefined) payload.language = input.language || null;
  if (input.dialect !== undefined) payload.dialect = input.dialect || null;
  if (input.scheduled_at !== undefined) payload.scheduled_at = input.scheduled_at;
  if (input.status !== undefined) payload.status = input.status;
  if (input.mena_event_id !== undefined)
    payload.mena_event_id = input.mena_event_id || null;

  if (input.media_urls !== undefined)
    payload.media_urls = normaliseStrings(input.media_urls, 10);
  if (input.hashtags !== undefined)
    payload.hashtags = normaliseStrings(input.hashtags, 30);

  if (input.content_score_json !== undefined)
    payload.content_score_json = input.content_score_json || {};
  if (input.metadata_json !== undefined)
    payload.metadata_json = input.metadata_json || {};

  if (!partial) {
    if (!payload.platform) throw badRequest("platform is required");
    if (!payload.caption || !payload.caption.trim())
      throw badRequest("caption is required");
    if (!payload.scheduled_at)
      throw badRequest("scheduled_at is required (ISO-8601 timestamp)");
    payload.status = payload.status || "scheduled";
  }

  return payload;
}

function badRequest(message) {
  const err = new Error(message);
  err.status = 400;
  return err;
}

async function listForWorkspace(
  workspaceId,
  { status, from, to, limit = 200 } = {},
) {
  if (!workspaceId) throw badRequest("workspaceId is required");
  const supabase = requireClient();

  let q = supabase
    .from(TABLE)
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (status) {
    if (Array.isArray(status)) q = q.in("status", status);
    else q = q.eq("status", status);
  }
  if (from) q = q.gte("scheduled_at", from);
  if (to) q = q.lte("scheduled_at", to);

  const { data, error } = await q;
  if (error) {
    if (error.code === "42P01") {
      const err = new Error(
        "scheduled_posts table missing. Apply backend/db/schema_v8.sql.",
      );
      err.status = 503;
      err.code = "SCHEMA_MISSING";
      throw err;
    }
    const err = new Error(error.message || "Failed to list scheduled posts");
    err.status = 400;
    throw err;
  }
  return data || [];
}

async function getById(id) {
  return db.getById(TABLE, id);
}

async function createScheduledPost(workspaceId, input) {
  if (!workspaceId) throw badRequest("workspaceId is required");
  const payload = buildPayload(input);
  payload.workspace_id = workspaceId;
  return db.insert(TABLE, payload);
}

async function updateScheduledPost(id, input) {
  const existing = await getById(id);
  if (!EDITABLE_STATUSES.includes(existing.status)) {
    throw badRequest(
      `Cannot edit post in status='${existing.status}'. Cancel it first.`,
    );
  }
  const payload = buildPayload(input, { partial: true });
  return db.update(TABLE, id, payload);
}

async function cancelScheduledPost(id) {
  const existing = await getById(id);
  if (existing.status === "published") {
    throw badRequest("Cannot cancel a post that is already published.");
  }
  return db.update(TABLE, id, { status: "cancelled" });
}

async function deleteScheduledPost(id) {
  return db.remove(TABLE, id);
}

// ---------------------------------------------------------------------------
// Publish worker
// ---------------------------------------------------------------------------

/**
 * Atomically claim a batch of due scheduled posts by flipping their status
 * to 'publishing'. Returns the rows that won the race.
 *
 * Using `match` with status=scheduled gives us last-write-wins semantics at
 * the row level in Postgres; two workers can safely race and only one
 * UPDATE will "see" each row as scheduled.
 */
async function claimDuePosts({ limit = 10, now = new Date() } = {}) {
  const supabase = requireClient();

  const { data: candidates, error: selErr } = await supabase
    .from(TABLE)
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", now.toISOString())
    .order("scheduled_at", { ascending: true })
    .limit(limit);

  if (selErr) {
    if (selErr.code === "42P01") return [];
    throw selErr;
  }
  if (!candidates || candidates.length === 0) return [];

  const ids = candidates.map((c) => c.id);
  const { data: claimed, error: updErr } = await supabase
    .from(TABLE)
    .update({ status: "publishing" })
    .in("id", ids)
    .eq("status", "scheduled")
    .select("*");

  if (updErr) throw updErr;
  return claimed || [];
}

async function markPublished(id, publishResult) {
  const payload = {
    status: "published",
    published_at: publishResult.publishedAt || new Date().toISOString(),
    external_post_id: publishResult?.post?.platformPostId || null,
    error_message: null,
    metadata_json: {
      ...(publishResult.metadata_json || {}),
      last_publish_result: publishResult,
    },
  };
  return db.update(TABLE, id, payload);
}

async function markFailed(id, error) {
  const payload = {
    status: "failed",
    error_message: String(error?.message || error || "publish failed"),
  };
  return db.update(TABLE, id, payload);
}

async function publishOne(row) {
  const integration = getIntegrationService(row.platform);
  if (!integration || typeof integration.publishPost !== "function") {
    throw new Error(
      `No integration registered for platform='${row.platform}'. ` +
        `Cannot publish yet.`,
    );
  }

  const result = await integration.publishPost({
    platform: row.platform,
    caption: row.caption,
    mediaUrls: row.media_urls || [],
    hashtags: row.hashtags || [],
    accountExternalId: null, // resolved from social_accounts once OAuth is live
  });

  return result;
}

/**
 * Publish all scheduled posts that are due.
 * Returns a summary `{ claimed, published, failed, rows }`.
 */
async function publishDuePosts({ limit = 10, now = new Date() } = {}) {
  const summary = { claimed: 0, published: 0, failed: 0, rows: [] };

  let claimed;
  try {
    claimed = await claimDuePosts({ limit, now });
  } catch (err) {
    logger.warn(`scheduledPostService.publishDuePosts claim error: ${err.message}`);
    return summary;
  }

  summary.claimed = claimed.length;

  for (const row of claimed) {
    try {
      const result = await publishOne(row);
      const updated = await markPublished(row.id, result);
      summary.published += 1;
      summary.rows.push({ id: row.id, status: updated.status, result });
    } catch (err) {
      logger.warn(
        `scheduledPostService.publishDuePosts: row ${row.id} failed -- ${err.message}`,
      );
      await markFailed(row.id, err).catch(() => {});
      summary.failed += 1;
      summary.rows.push({
        id: row.id,
        status: "failed",
        error: err.message,
      });
    }
  }

  return summary;
}

// ---------------------------------------------------------------------------
// Calendar view: MENA events + scheduled posts for a workspace + range
// ---------------------------------------------------------------------------

async function getCalendar(
  workspaceId,
  { from, to, region } = {},
) {
  if (!workspaceId) throw badRequest("workspaceId is required");
  const supabase = requireClient();

  const rangeFrom = from ? new Date(from) : startOfMonth(new Date());
  const rangeTo = to ? new Date(to) : addDays(rangeFrom, 45);

  const fromIso = rangeFrom.toISOString();
  const toIso = rangeTo.toISOString();
  const fromDate = rangeFrom.toISOString().slice(0, 10);
  const toDate = rangeTo.toISOString().slice(0, 10);

  // Events visible to this workspace: global (workspace_id=null) + own events.
  let eventsQ = supabase
    .from("mena_events")
    .select("*")
    .gte("event_date", fromDate)
    .lte("event_date", toDate)
    .order("event_date", { ascending: true });

  // `or` filter: workspace_id.is.null or eq workspaceId
  eventsQ = eventsQ.or(`workspace_id.is.null,workspace_id.eq.${workspaceId}`);

  if (region) {
    eventsQ = eventsQ.or(`region.is.null,region.eq.${region}`);
  }

  const [{ data: events, error: evErr }, { data: posts, error: spErr }] =
    await Promise.all([
      eventsQ,
      supabase
        .from(TABLE)
        .select("*")
        .eq("workspace_id", workspaceId)
        .gte("scheduled_at", fromIso)
        .lte("scheduled_at", toIso)
        .order("scheduled_at", { ascending: true }),
    ]);

  const out = {
    range: { from: fromIso, to: toIso },
    events: [],
    scheduled_posts: [],
    warnings: [],
  };

  if (evErr) {
    if (evErr.code === "42P01") {
      out.warnings.push(
        "mena_events table missing. Apply backend/db/schema_v8.sql.",
      );
    } else {
      out.warnings.push(`events:${evErr.message}`);
    }
  } else {
    out.events = events || [];
  }

  if (spErr) {
    if (spErr.code === "42P01") {
      out.warnings.push(
        "scheduled_posts table missing. Apply backend/db/schema_v8.sql.",
      );
    } else {
      out.warnings.push(`scheduled_posts:${spErr.message}`);
    }
  } else {
    out.scheduled_posts = posts || [];
  }

  return out;
}

function startOfMonth(d) {
  const x = new Date(d);
  x.setUTCDate(1);
  x.setUTCHours(0, 0, 0, 0);
  return x;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

// ---------------------------------------------------------------------------
// Worker bootstrap (called once from app start)
// ---------------------------------------------------------------------------

let workerInterval = null;
function startPublishWorker({ intervalMs = 60_000 } = {}) {
  if (workerInterval) return workerInterval;
  const tick = async () => {
    try {
      const summary = await publishDuePosts({ limit: 20 });
      if (summary.claimed > 0) {
        logger.info(
          `scheduledPostService worker: claimed=${summary.claimed} published=${summary.published} failed=${summary.failed}`,
        );
      }
    } catch (err) {
      logger.warn(`scheduledPostService worker error: ${err.message}`);
    }
  };
  // Fire once on boot so demo data publishes quickly.
  tick();
  workerInterval = setInterval(tick, intervalMs);
  return workerInterval;
}

function stopPublishWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}

module.exports = {
  TABLE,
  STATUSES,
  listForWorkspace,
  getById,
  createScheduledPost,
  updateScheduledPost,
  cancelScheduledPost,
  deleteScheduledPost,
  publishDuePosts,
  getCalendar,
  startPublishWorker,
  stopPublishWorker,
};
