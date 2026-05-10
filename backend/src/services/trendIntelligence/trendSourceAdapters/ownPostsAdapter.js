const { getSupabase } = require("../../../config/supabase");
const {
  engagementTotal,
  extractHashtags,
  inferLocation,
  normalizeMediaType,
} = require("../trendTextUtils");

async function collect({ workspaceId, context, limit = 80 }) {
  const supabase = getSupabase();
  if (!supabase) {
    return {
      evidence: [],
      warnings: ["own_posts_skipped:supabase_not_configured"],
    };
  }

  const warnings = [];
  const [socialEvidence, legacyEvidence] = await Promise.all([
    loadSocialPosts(supabase, workspaceId, context, limit, warnings),
    loadLegacyCampaignPosts(supabase, workspaceId, context, Math.floor(limit / 2), warnings),
  ]);
  const evidence = [...socialEvidence, ...legacyEvidence].filter((item) =>
    isRelevantOwnEvidence(item, context),
  );

  return {
    evidence,
    warnings,
  };
}

async function loadSocialPosts(supabase, workspaceId, context, limit, warnings) {
  const { data: accounts, error: accountError } = await supabase
    .from("social_accounts")
    .select("id, provider, handle, display_name, profile_url")
    .eq("workspace_id", workspaceId);
  if (accountError) {
    warnings.push(`own_social_accounts_unavailable:${accountError.message}`);
    return [];
  }
  const accountIds = (accounts || []).map((a) => a.id);
  if (!accountIds.length) return [];

  const { data: posts, error: postError } = await supabase
    .from("social_posts")
    .select("*")
    .in("social_account_id", accountIds)
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(limit);
  if (postError) {
    warnings.push(`own_social_posts_unavailable:${postError.message}`);
    return [];
  }
  if (!posts?.length) return [];

  const postIds = posts.map((p) => p.id);
  const metricsByPost = await latestPostMetrics(supabase, postIds, warnings);
  const accountById = new Map((accounts || []).map((a) => [a.id, a]));

  return posts.map((post) => {
    const account = accountById.get(post.social_account_id) || {};
    const metrics = metricsByPost.get(post.id) || {};
    const text = [post.caption, post.metadata_json?.alt_text].filter(Boolean).join(" ");
    return {
      source: "own_posts",
      scope: "micro",
      platform: account.provider || "owned_social",
      title: "Own published post",
      caption: post.caption || null,
      url: post.permalink || null,
      author: account.handle || account.display_name || context.brand_name,
      published_at: post.published_at || post.created_at || null,
      metrics: {
        ...metrics,
        engagement_total: engagementTotal(metrics),
      },
      hashtags: extractHashtags(post.caption, post.metadata_json?.hashtags),
      media_type: normalizeMediaType(post.media_type, text),
      location_hint: inferLocation(text, context.location),
      raw_payload: {
        table: "social_posts",
        post,
        account,
        metrics,
      },
    };
  });
}

async function latestPostMetrics(supabase, postIds, warnings) {
  if (!postIds.length) return new Map();
  const { data, error } = await supabase
    .from("post_metrics_snapshots")
    .select("*")
    .in("social_post_id", postIds)
    .order("snapshot_time", { ascending: false });
  if (error) {
    warnings.push(`own_post_metrics_unavailable:${error.message}`);
    return new Map();
  }
  const byPost = new Map();
  for (const row of data || []) {
    if (byPost.has(row.social_post_id)) continue;
    byPost.set(row.social_post_id, {
      impressions: row.impressions || 0,
      reach: row.reach || 0,
      likes: row.likes || 0,
      comments: row.comments || 0,
      saves: row.saves || 0,
      shares: row.shares || 0,
      engagement_rate: Number(row.engagement_rate || 0),
    });
  }
  return byPost;
}

async function loadLegacyCampaignPosts(supabase, workspaceId, context, limit, warnings) {
  const { data, error } = await supabase
    .from("posts")
    .select("id, campaign_id, workspace_id, text_content, language, created_at")
    .eq("workspace_id", workspaceId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    warnings.push(`own_campaign_posts_unavailable:${error.message}`);
    return [];
  }

  return (data || []).map((post) => ({
    source: "own_campaign_posts",
    scope: "micro",
    platform: "campaign",
    title: "Own campaign draft",
    caption: post.text_content || null,
    url: null,
    author: context.brand_name,
    published_at: post.created_at || null,
    metrics: { engagement_total: 0 },
    hashtags: extractHashtags(post.text_content),
    media_type: "text",
    location_hint: inferLocation(post.text_content, context.location),
    raw_payload: {
      table: "posts",
      post,
    },
  }));
}

function isRelevantOwnEvidence(item, context = {}) {
  const category = String(context.category || "").toLowerCase();
  const isHiking = /hiking|trail|outdoor|adventure|eco|tourism/.test(category);
  if (!isHiking) return true;
  const text = [item.title, item.caption, ...(item.hashtags || [])]
    .join(" ")
    .toLowerCase();
  const positive =
    /(hiking|hike|trail|outdoor|adventure|nature|mountain|camping|trek|walk|waterfall|sunset|eco.?tour|lebanon)/i;
  const negative =
    /(ramadan menu|iftar crew|riyadh|snack|burger|coffee|delivery|discount|eid offer|menu drops|مطعم|توصيل|خصم)/i;
  return positive.test(text) && !negative.test(text);
}

module.exports = {
  collect,
};
