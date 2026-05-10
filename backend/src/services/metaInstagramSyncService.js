/**
 * metaInstagramSyncService — pulls the workspace's own posts + per-post
 * insights from the Instagram Graph API and persists them into the same
 * `social_accounts` / `social_posts` / `post_metrics_snapshots` tables that
 * Apify writes to.
 *
 * The rest of the app (posts page, competitor comparison, analytics) keeps
 * working unchanged — it just sees real Graph-API data instead of a public
 * scrape when this service has been run.
 */

const { getSupabase } = require("../config/supabase");
const provider = require("./providers/metaInstagramProvider");

async function syncOwnInstagram(workspaceId, { limit = 50, accessToken } = {}) {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error("Supabase is not configured.");
    err.status = 503;
    throw err;
  }

  // 1. Profile
  const profile = await provider.fetchProfile(accessToken);
  const handle = String(profile?.username || "").toLowerCase();
  if (!handle) throw new Error("Instagram Graph API returned no username");

  // 2. Upsert social_account row keyed by IG ID so re-runs are idempotent
  const accountPayload = {
    workspace_id: workspaceId,
    provider: "meta_instagram",
    external_account_id: `meta_ig:${profile.id}`,
    handle,
    display_name: profile?.name || handle,
    profile_url: `https://www.instagram.com/${handle}/`,
    account_type: "instagram_login",
    status: "connected",
    is_mock: false,
    metadata: {
      source: "meta_graph",
      provider: "meta_graph",
      ig_user_id: profile.id,
      account_type: profile.account_type,
      followers_count: profile.followers_count ?? null,
      follows_count: profile.follows_count ?? null,
      media_count: profile.media_count ?? null,
      biography: profile.biography ?? null,
      profile_picture_url: profile.profile_picture_url ?? null,
    },
  };
  const { data: acctRows, error: acctErr } = await supabase
    .from("social_accounts")
    .upsert(accountPayload, {
      onConflict: "workspace_id,provider,external_account_id",
    })
    .select("id");
  if (acctErr) throw new Error(`social_account upsert failed: ${acctErr.message}`);
  const accountId = acctRows?.[0]?.id;
  if (!accountId) throw new Error("social_account upsert returned no id");

  // 3. Audience snapshot (followers over time)
  if (profile.followers_count != null) {
    await supabase.from("audience_snapshots").insert({
      social_account_id: accountId,
      followers_count: Number(profile.followers_count) || 0,
      following_count: Number(profile.follows_count) || 0,
      profile_views: 0,
      metadata_json: {
        source: "meta_graph",
        provider: "meta_graph",
        media_count: profile.media_count ?? null,
      },
    });
  }

  // 4. Media list
  const media = await provider.fetchMedia(accessToken, { limit });
  if (!media.length) {
    await touchAccountSync(supabase, accountId);
    return { posts_imported: 0, account_id: accountId, handle, profile, warnings: [] };
  }

  const postRows = media.map((m) => ({
    social_account_id: accountId,
    platform_post_id: String(m.id),
    caption: m.caption ?? null,
    media_type: provider.normalizeMediaType(m.media_type, m.media_product_type),
    permalink: m.permalink ?? null,
    published_at: m.timestamp ?? null,
    metadata_json: {
      source: "meta_graph",
      provider: "meta_graph",
      ig_user_id: profile.id,
      media_url: m.media_url || m.thumbnail_url || null,
      raw_payload: m,
    },
  }));

  const { data: savedPosts, error: postsErr } = await supabase
    .from("social_posts")
    .upsert(postRows, { onConflict: "social_account_id,platform_post_id" })
    .select("id, platform_post_id");
  if (postsErr) throw new Error(`social_posts upsert failed: ${postsErr.message}`);

  // 5. Insights — fetched in parallel, capped to avoid overwhelming the API
  const idMap = new Map((savedPosts || []).map((r) => [r.platform_post_id, r.id]));
  const followers = Number(profile.followers_count) || 0;
  const warnings = [];

  const insightResults = await Promise.allSettled(
    media.map(async (m) => {
      const insights = await provider.fetchMediaInsights(m.id, m.media_type, accessToken);
      if (insights._error) warnings.push(`insights_failed:${m.id}:${insights._error}`);
      return { media: m, insights };
    }),
  );

  // Comments are the best available audience-reaction text for sentiment.
  // If the token lacks comment access, this returns warnings and the audience
  // page falls back to caption sentiment.
  const commentResults = await Promise.allSettled(
    media.slice(0, Math.min(media.length, 30)).map(async (m) => {
      const comments = await provider.fetchMediaComments(m.id, accessToken, { limit: 50 });
      if (comments._error) warnings.push(`comments_failed:${m.id}:${comments._error}`);
      return { media: m, comments: comments.data || [] };
    }),
  );

  const snapshotRows = [];
  let commentTextUnavailableCount = 0;
  for (const result of insightResults) {
    if (result.status !== "fulfilled") continue;
    const { media: m, insights } = result.value;
    const postId = idMap.get(String(m.id));
    if (!postId) continue;
    const likes = Number(insights.likes ?? m.like_count ?? 0);
    const comments = Number(insights.comments ?? m.comments_count ?? 0);
    const shares = Number(insights.shares ?? 0);
    const saves = Number(insights.saved ?? 0);
    const reach = Number(insights.reach ?? 0);
    const views = Number(insights.views ?? 0);
    const totalInteractions = Number(insights.total_interactions ?? 0);
    const engagement = totalInteractions || likes + comments + shares + saves;
    snapshotRows.push({
      social_post_id: postId,
      likes,
      comments,
      shares,
      saves,
      impressions: views || 0,
      reach,
      engagement_rate:
        followers > 0 ? Number((engagement / followers).toFixed(5)) : null,
      metadata_json: {
        source: "meta_graph",
        provider: "meta_graph",
        followers_at_snapshot: followers,
        total_interactions: totalInteractions,
        views,
      },
    });
  }

  let commentsImported = 0;
  for (const result of commentResults) {
    if (result.status !== "fulfilled") continue;
    const { media: m, comments } = result.value;
    const postId = idMap.get(String(m.id));
    if (!postId) continue;
    const existing = postRows.find((row) => row.platform_post_id === String(m.id))?.metadata_json || {};
    const graphComments = comments
      .filter((comment) => String(comment.text || "").trim())
      .slice(0, 50);
    commentsImported += graphComments.length;
    if (Number(m.comments_count || 0) > 0 && graphComments.length === 0) {
      commentTextUnavailableCount += 1;
    }

    await supabase
      .from("social_posts")
      .update({
        metadata_json: {
          ...existing,
          comments_source: "meta_graph",
          comments_synced_at: new Date().toISOString(),
          graph_comments: graphComments,
        },
      })
      .eq("id", postId);
  }

  if (snapshotRows.length) {
    const { error: snapErr } = await supabase
      .from("post_metrics_snapshots")
      .insert(snapshotRows);
    if (snapErr) warnings.push(`snapshots_insert_failed:${snapErr.message}`);
  }
  if (commentTextUnavailableCount > 0) {
    warnings.push(
      `comments_text_unavailable:${commentTextUnavailableCount}_posts_have_comment_counts_but_graph_returned_no_comment_text`,
    );
  }

  await touchAccountSync(supabase, accountId);

  return {
    posts_imported: savedPosts?.length ?? 0,
    metrics_snapshots_inserted: snapshotRows.length,
    comments_imported: commentsImported,
    account_id: accountId,
    handle,
    profile: {
      id: profile.id,
      username: profile.username,
      account_type: profile.account_type,
      followers_count: profile.followers_count ?? null,
      media_count: profile.media_count ?? null,
    },
    warnings,
  };
}

async function touchAccountSync(supabase, accountId) {
  await supabase
    .from("social_accounts")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("id", accountId);
}

module.exports = { syncOwnInstagram };
