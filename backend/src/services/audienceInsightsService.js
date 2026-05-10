const { getSupabase } = require("../config/supabase");
const env = require("../config/env");
const { syncOwnInstagram } = require("./metaInstagramSyncService");
const metaInstagramProvider = require("./providers/metaInstagramProvider");
const mlClient = require("./mlClient");

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function requireClient() {
  const supabase = getSupabase();
  if (!supabase) {
    const err = new Error("Supabase is not configured.");
    err.status = 503;
    throw err;
  }
  return supabase;
}

async function getAudienceInsights(workspaceId, { days = 90 } = {}) {
  const supabase = requireClient();
  const since = new Date(Date.now() - Number(days || 90) * 24 * 60 * 60 * 1000).toISOString();

  const accounts = await loadGraphAccounts(supabase, workspaceId);
  const accountIds = accounts.map((account) => account.id);

  if (!accountIds.length) {
    return emptyPayload({
      warnings: ["graph_account_missing:connect_or_refresh_instagram_graph_first"],
    });
  }

  const [audienceSnapshots, loadedPosts] = await Promise.all([
    loadAudienceSnapshots(supabase, accountIds),
    loadGraphPostsWithMetrics(supabase, accountIds, since),
  ]);
  const posts = await attachCachedInboxComments(supabase, loadedPosts);

  const latestAudience = latestBy(audienceSnapshots, "snapshot_time");
  const latestGraphAudience = latestAudience?.metadata_json?.graph_audience || {};
  const liveWarnings = latestAudience?.metadata_json?.graph_warnings || [];
  const derived = deriveFromPosts(posts);
  const followerGrowth = audienceSnapshots.map((row) => ({
    date: row.snapshot_time,
    followers: row.followers_count || 0,
    following: row.following_count || 0,
  }));

  const latestFollowers = latestAudience?.followers_count ?? accounts[0]?.metadata?.followers_count ?? null;
  const firstFollowers = followerGrowth[0]?.followers ?? latestFollowers;
  const followerDelta =
    latestFollowers != null && firstFollowers != null ? latestFollowers - firstFollowers : null;

  const demographic = normalizeDemographics(latestGraphAudience);
  const locations = normalizeLocations(latestGraphAudience);
  const active = normalizeActiveTimes(latestGraphAudience, derived);
  const totals = {
    reach: sum(posts.map((post) => post.latest_metrics?.reach)),
    impressions: sum(posts.map((post) => post.latest_metrics?.impressions)),
    engaged_accounts:
      sum(posts.map((post) => post.latest_metrics?.metadata_json?.total_interactions)) ||
      sum(posts.map((post) => engagement(post.latest_metrics))),
    profile_views: sum(audienceSnapshots.map((row) => row.profile_views)),
  };

  const sentiment = await computeAudienceReactionSentiment(supabase, posts);
  const previousFollowers =
    followerGrowth.length >= 2 ? followerGrowth[Math.floor(followerGrowth.length / 2)].followers : null;

  const payload = {
    source: "meta_graph",
    generated_at: new Date().toISOString(),
    window_days: Number(days || 90),
    account: {
      id: accounts[0].id,
      handle: accounts[0].handle,
      display_name: accounts[0].display_name,
      provider: accounts[0].provider,
      last_synced_at: accounts[0].last_synced_at,
    },
    kpis: {
      followers: latestFollowers,
      follower_delta: followerDelta,
      reach: totals.reach,
      impressions: totals.impressions,
      engaged_accounts: totals.engaged_accounts,
      profile_views: totals.profile_views,
      posts_analyzed: posts.length,
    },
    follower_growth: followerGrowth,
    active_times: active,
    gender_distribution: demographic.gender_distribution,
    age_ranges: demographic.age_ranges,
    top_cities: locations.top_cities,
    top_countries: locations.top_countries,
    content_response: derived.content_response,
    sentiment_distribution: sentiment.distribution,
    sentiment_samples: sentiment.samples,
    sentiment_source: sentiment.source,
    comments_analyzed: sentiment.commentsAnalyzed,
    caption_sentiment_distribution: sentiment.captionDistribution,
    caption_sentiment_samples: sentiment.captionSamples,
    comment_sentiment_distribution: sentiment.commentDistribution,
    comment_sentiment_samples: sentiment.commentSamples,
    warnings: [
      ...liveWarnings,
      ...(demographic.hasData ? [] : ["audience_demographics_unavailable:graph_metric_not_returned"]),
      ...(locations.hasData ? [] : ["audience_locations_unavailable:graph_metric_not_returned"]),
      ...(active.source === "derived_from_posts"
        ? ["active_times_derived:online_followers_metric_unavailable"]
        : []),
      ...(sentiment.warnings || []),
    ],
  };

  payload.ai_insights = buildAiInsights(payload, { previousFollowers });
  return payload;
}

// Bilingual EN/AR keyword scoring — used as a fallback when the ML sentiment
// model is unavailable. Not as nuanced as CAMeLBERT, but it always responds
// and never blocks the audience page.
const POSITIVE_TERMS = [
  // English
  "amazing", "awesome", "great", "love", "loved", "beautiful", "incredible",
  "stunning", "perfect", "best", "epic", "magical", "breathtaking", "fantastic",
  "wonderful", "happy", "excited", "blessed", "grateful", "joy", "fun",
  "unforgettable", "highlight", "highlights", "thank", "thanks",
  // Arabic
  "رائع", "جميل", "ممتاز", "جنان", "حلو", "مذهل", "خرافي", "احلى", "روعة",
  "نشكر", "شكرا", "مبسوط", "سعيد", "تجربة",
];
const NEGATIVE_TERMS = [
  "bad", "worst", "terrible", "hate", "hated", "awful", "boring", "disappoint",
  "disappointed", "disappointing", "cancelled", "canceled", "delay", "delayed",
  "warning", "danger", "dangerous", "issue", "problem", "sad", "sorry",
  "سيء", "مشكلة", "تأجيل", "خطر", "محذور", "ممل", "حزين",
];

function heuristicSentiment(text) {
  const lower = (text || "").toLowerCase();
  let pos = 0;
  let neg = 0;
  for (const term of POSITIVE_TERMS) if (lower.includes(term)) pos += 1;
  for (const term of NEGATIVE_TERMS) if (lower.includes(term)) neg += 1;
  // Heuristic emoji boost
  if (/[😍🥳🤩❤️🔥👏✨🌟]/u.test(text)) pos += 1;
  if (/[😢😡👎💔]/u.test(text)) neg += 1;

  const total = pos + neg;
  if (total === 0) {
    return { sentiment: "neutral", confidence: 0.5 };
  }
  if (pos > neg) {
    return { sentiment: "positive", confidence: Math.min(0.5 + (pos - neg) * 0.1, 0.92) };
  }
  if (neg > pos) {
    return { sentiment: "negative", confidence: Math.min(0.5 + (neg - pos) * 0.1, 0.92) };
  }
  return { sentiment: "neutral", confidence: 0.55 };
}

/**
 * Run sentiment analysis on both sides of the conversation:
 * - audience comments: reaction sentiment
 * - own captions: brand tone sentiment
 *
 * Comment text is only present when Graph exposes the comments edge. Captions
 * are always analyzed, so the page can still show brand tone even when comment
 * permissions are not ready.
 */
async function computeAudienceReactionSentiment(supabase, posts) {
  const recent = posts.slice(0, 40);
  const warnings = [];
  const commentItems = collectCommentItems(recent);
  const captionItems = collectCaptionItems(recent, { includeCached: true });

  const [commentResult, captionResult] = await Promise.all([
    analyzeSentimentItems(commentItems, { source: "comments", warnings }),
    analyzeSentimentItems(captionItems, { source: "captions", warnings, supabase }),
  ]);

  const primary = commentResult.distribution.total > 0 ? commentResult : captionResult;
  return {
    distribution: primary.distribution,
    samples: primary.samples,
    source: primary.source,
    commentsAnalyzed: commentResult.distribution.total,
    captionDistribution: captionResult.distribution,
    captionSamples: captionResult.samples,
    commentDistribution: commentResult.distribution,
    commentSamples: commentResult.samples,
    warnings: [
      ...warnings,
      ...(commentResult.distribution.total === 0
        ? ["audience_comment_sentiment_unavailable:caption_sentiment_still_analyzed"]
        : []),
      "audience_dm_sentiment_unavailable:instagram_messages_require_messaging_api_connection",
    ],
  };
}

async function analyzeSentimentItems(items, { source, warnings, supabase } = {}) {
  const concurrency = 4;
  const queue = [...items];
  let mlBroken = false;

  async function worker() {
    while (queue.length) {
      const item = queue.shift();
      if (!item) return;
      const text = (item.text || "").trim();
      if (!text) continue;
      if (item.sentiment?.text_hash === text.length) continue;

      let ml;
      // Try ML once per worker; if it fails, switch to heuristic for the rest
      if (!mlBroken) {
        try {
          ml = await mlClient.predictSentiment(text);
        } catch (err) {
          mlBroken = true;
          warnings.push(`sentiment_ml_unavailable:${err.message?.slice(0, 80)}`);
        }
      }
      if (!ml) {
        ml = heuristicSentiment(text);
      }

      const sentiment = {
        label: String(ml.sentiment || "neutral").toLowerCase(),
        confidence: Number(ml.confidence) || 0,
        analyzed_at: new Date().toISOString(),
        source: mlBroken ? "keyword_heuristic" : "ml_model",
        text_hash: text.length,
      };

      item.sentiment = sentiment;
      if (source === "captions" && item.post && supabase) {
        const meta = item.post.metadata_json || {};
        if (!meta.sentiment || meta.sentiment.text_hash !== item.text.length) {
          item.post.metadata_json = { ...meta, sentiment };
          try {
            await supabase
              .from("social_posts")
              .update({ metadata_json: item.post.metadata_json })
              .eq("id", item.post.id);
          } catch {
            // Persistence failure shouldn't break the analytics request
          }
        }
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, worker));

  const counts = { positive: 0, neutral: 0, negative: 0 };
  let totalConfidence = 0;
  let counted = 0;
  const samples = [];

  for (const item of items) {
    const sentiment = item.sentiment;
    if (!sentiment) continue;
    const label = sentiment.label === "positive" || sentiment.label === "negative"
      ? sentiment.label
      : "neutral";
    counts[label] += 1;
    totalConfidence += Number(sentiment.confidence) || 0;
    counted += 1;
    if (samples.length < 6) {
      samples.push({
        id: item.id || item.post?.id,
        caption: (item.text || "").slice(0, 180),
        permalink: item.post?.permalink || null,
        published_at: item.timestamp || item.post?.published_at || null,
        post_caption: item.post?.caption ? String(item.post.caption).slice(0, 100) : null,
        author: item.author || null,
        source,
        sentiment: label,
        confidence: Number(sentiment.confidence) || 0,
      });
    }
  }

  const total = counts.positive + counts.neutral + counts.negative;
  return {
    distribution: {
      positive: counts.positive,
      neutral: counts.neutral,
      negative: counts.negative,
      total,
      avg_confidence: counted > 0 ? Number((totalConfidence / counted).toFixed(3)) : null,
      coverage: items.length > 0 ? Number((total / items.length).toFixed(2)) : 0,
    },
    samples,
    source,
  };
}

function collectCommentItems(posts) {
  const items = [];
  for (const post of posts) {
    const comments = Array.isArray(post.metadata_json?.graph_comments)
      ? post.metadata_json.graph_comments
      : [];
    for (const comment of comments) {
      const text = String(comment.text || "").trim();
      if (!text) continue;
      items.push({
        id: comment.id,
        text,
        timestamp: comment.timestamp || null,
        author: comment.username || null,
        post,
      });
    }
  }
  return items.slice(0, 400);
}

function collectCaptionItems(posts, { includeCached = false } = {}) {
  return posts
    .slice(0, 40)
    .filter((post) => (post.caption || "").trim())
    .map((post) => ({
      post,
      text: post.caption,
      sentiment: includeCached ? post.metadata_json?.sentiment : null,
    }));
}

/**
 * Generate short, deterministic narrative strings from the data. Each line
 * is a single sentence — no LLM needed; everything is computable from the
 * payload we already have.
 */
function buildAiInsights(payload, { previousFollowers } = {}) {
  const out = [];

  const followers = payload.kpis.followers || 0;
  const delta = payload.kpis.follower_delta;
  if (followers && delta != null && previousFollowers && previousFollowers > 0) {
    const pct = ((followers - previousFollowers) / previousFollowers) * 100;
    if (Math.abs(pct) >= 0.1) {
      out.push({
        kind: "growth",
        text: `Audience ${pct >= 0 ? "grew" : "shrank"} ${Math.abs(pct).toFixed(1)}% over the last ${payload.window_days} days.`,
      });
    }
  }

  if (payload.age_ranges?.length) {
    const top = [...payload.age_ranges].sort((a, b) => b.share - a.share)[0];
    if (top && top.share) {
      out.push({
        kind: "demographic",
        text: `${(top.share * 100).toFixed(0)}% of your audience is aged ${top.range}.`,
      });
    }
  }

  if (payload.gender_distribution?.length) {
    const top = [...payload.gender_distribution].sort((a, b) => b.share - a.share)[0];
    if (top && top.share && top.share > 0.5) {
      out.push({
        kind: "demographic",
        text: `${capitalize(top.gender)} followers make up ${(top.share * 100).toFixed(0)}% of your audience.`,
      });
    }
  }

  if (payload.top_cities?.length) {
    const top = payload.top_cities[0];
    if (top?.name && top.share) {
      out.push({
        kind: "geo",
        text: `${top.name} drives ${(top.share * 100).toFixed(0)}% of your audience — your strongest local market.`,
      });
    }
  }

  if (payload.active_times?.by_hour?.length) {
    const peak = [...payload.active_times.by_hour].sort((a, b) => b.score - a.score)[0];
    if (peak && peak.score) {
      const hour = peak.hour;
      const slot = hour < 6 ? "early morning" : hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";
      out.push({
        kind: "timing",
        text: `Peak engagement happens at ${formatHour(hour)} — schedule key posts in the ${slot}.`,
      });
    }
  }

  if (payload.content_response?.length) {
    const top = payload.content_response[0];
    if (top?.format && top.posts >= 2) {
      out.push({
        kind: "content",
        text: `${capitalize(top.format)}s drive your highest engagement (${Math.round(top.avg_engagement)} per post).`,
      });
    }
  }

  if (payload.sentiment_distribution?.total) {
    const s = payload.sentiment_distribution;
    if (s.total >= 3) {
      const pos = s.positive / s.total;
      const neg = s.negative / s.total;
      if (payload.sentiment_source === "comments") {
        if (pos > 0.6) {
          out.push({
            kind: "sentiment",
            text: `Audience comments skew strongly positive (${(pos * 100).toFixed(0)}%) - keep the upbeat, community-led voice.`,
          });
        } else if (neg > 0.3) {
          out.push({
            kind: "sentiment",
            text: `${(neg * 100).toFixed(0)}% of audience comments read as negative - review recurring objections and reply quickly.`,
          });
        } else {
          out.push({
            kind: "sentiment",
            text: `Audience reaction is balanced: ${(pos * 100).toFixed(0)}% positive, ${(s.neutral / s.total * 100).toFixed(0)}% neutral.`,
          });
        }
        return out.slice(0, 4);
      }
      if (pos > 0.6) {
        out.push({
          kind: "sentiment",
          text: `Captions skew strongly positive (${(pos * 100).toFixed(0)}%) — keep the upbeat, community-led voice.`,
        });
      } else if (neg > 0.3) {
        out.push({
          kind: "sentiment",
          text: `${(neg * 100).toFixed(0)}% of captions read as negative — review tone before publishing.`,
        });
      } else {
        out.push({
          kind: "sentiment",
          text: `Caption tone is balanced: ${(pos * 100).toFixed(0)}% positive, ${(s.neutral / s.total * 100).toFixed(0)}% neutral.`,
        });
      }
    }
  }

  return out.slice(0, 4);
}

function capitalize(s) {
  return String(s || "").charAt(0).toUpperCase() + String(s || "").slice(1);
}

function formatHour(h) {
  const hh = Number(h);
  if (!Number.isFinite(hh)) return String(h);
  const suffix = hh < 12 ? "AM" : "PM";
  const display = hh % 12 === 0 ? 12 : hh % 12;
  return `${display}${suffix}`;
}

async function refreshAudienceInsights(workspaceId, { limit = 50 } = {}) {
  const syncResult = await syncOwnInstagram(workspaceId, { limit });
  const supabase = requireClient();

  const graphResult = env.META_INSTAGRAM_ENABLED
    ? await metaInstagramProvider.fetchAudienceInsights()
    : { metrics: {}, warnings: ["meta_graph_skipped:missing_META_INSTAGRAM_ACCESS_TOKEN"] };

  if (syncResult.account_id) {
    await supabase.from("audience_snapshots").insert({
      social_account_id: syncResult.account_id,
      followers_count: Number(syncResult.profile?.followers_count || 0),
      following_count: 0,
      profile_views: Number(graphResult.metrics?.profile_views || 0),
      metadata_json: {
        source: "meta_graph",
        provider: "meta_graph",
        refresh_type: "audience_insights",
        graph_audience: graphResult.metrics || {},
        graph_warnings: graphResult.warnings || [],
      },
    });
  }

  const payload = await getAudienceInsights(workspaceId);
  const refreshWarnings = [...(syncResult.warnings || []), ...(graphResult.warnings || [])];
  return {
    ...payload,
    warnings: [...(payload.warnings || []), ...refreshWarnings],
    refresh: {
      posts_imported: syncResult.posts_imported || 0,
      metrics_snapshots_inserted: syncResult.metrics_snapshots_inserted || 0,
      comments_imported: syncResult.comments_imported || 0,
      warnings: refreshWarnings,
    },
  };
}

async function loadGraphAccounts(supabase, workspaceId) {
  const { data, error } = await supabase
    .from("social_accounts")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("provider", "meta_instagram")
    .order("last_synced_at", { ascending: false, nullsFirst: false });
  if (error) throw new Error(error.message);
  return (data || []).filter((account) => account.metadata?.source === "meta_graph");
}

async function loadAudienceSnapshots(supabase, accountIds) {
  const { data, error } = await supabase
    .from("audience_snapshots")
    .select("*")
    .in("social_account_id", accountIds)
    .order("snapshot_time", { ascending: true });
  if (error) throw new Error(error.message);
  return data || [];
}

async function loadGraphPostsWithMetrics(supabase, accountIds, since) {
  const { data, error } = await supabase
    .from("social_posts")
    .select("*, post_metrics_snapshots(*)")
    .in("social_account_id", accountIds)
    .eq("metadata_json->>source", "meta_graph")
    .gte("published_at", since)
    .order("published_at", { ascending: false })
    .limit(500);
  if (error) throw new Error(error.message);

  return (data || []).map((post) => {
    const snapshots = Array.isArray(post.post_metrics_snapshots) ? post.post_metrics_snapshots : [];
    const latest = latestBy(snapshots, "snapshot_time");
    return { ...post, latest_metrics: latest };
  });
}

async function attachCachedInboxComments(supabase, posts) {
  if (!posts.length) return posts;
  const postIds = posts.map((post) => post.id).filter(Boolean);
  if (!postIds.length) return posts;

  const { data, error } = await supabase
    .from("inbox_items")
    .select("id, social_post_id, body, author_username, published_at, external_id, raw_payload_json")
    .in("social_post_id", postIds)
    .eq("item_type", "comment")
    .eq("direction", "inbound")
    .limit(1000);

  if (error) return posts;

  const byPost = new Map();
  for (const row of data || []) {
    if (!byPost.has(row.social_post_id)) byPost.set(row.social_post_id, []);
    byPost.get(row.social_post_id).push({
      id: row.external_id || row.id,
      text: row.body,
      username: row.author_username,
      timestamp: row.published_at,
      source: "inbox_cache",
      raw_payload: row.raw_payload_json,
    });
  }

  return posts.map((post) => {
    const cached = byPost.get(post.id) || [];
    if (!cached.length) return post;
    const meta = post.metadata_json || {};
    const existing = Array.isArray(meta.graph_comments) ? meta.graph_comments : [];
    return {
      ...post,
      metadata_json: {
        ...meta,
        graph_comments: existing.length ? existing : cached,
        comments_source: existing.length ? meta.comments_source : "inbox_cache",
      },
    };
  });
}

function deriveFromPosts(posts) {
  const byHour = new Map();
  const byDay = new Map();
  const byFormat = new Map();

  for (const post of posts) {
    const date = new Date(post.published_at || post.created_at);
    if (!Number.isFinite(date.getTime())) continue;
    const metrics = post.latest_metrics || {};
    const score = engagement(metrics) || metrics.reach || metrics.impressions || 0;
    const hour = date.getHours();
    const day = DAY_NAMES[date.getDay()];
    addAggregate(byHour, hour, score);
    addAggregate(byDay, day, score);
    addAggregate(byFormat, post.media_type || "unknown", score);
  }

  return {
    active_by_hour: Array.from(byHour.entries())
      .map(([hour, row]) => ({ hour: Number(hour), score: avg(row), posts: row.count }))
      .sort((a, b) => a.hour - b.hour),
    active_by_day: DAY_NAMES.map((day) => {
      const row = byDay.get(day);
      return { day, score: row ? avg(row) : 0, posts: row?.count || 0 };
    }),
    content_response: Array.from(byFormat.entries())
      .map(([format, row]) => ({ format, avg_engagement: avg(row), posts: row.count }))
      .sort((a, b) => b.avg_engagement - a.avg_engagement),
  };
}

function normalizeActiveTimes(graphAudience, derived) {
  const online = graphAudience.online_followers;
  if (online && typeof online === "object" && !Array.isArray(online) && Object.keys(online).length) {
    return {
      source: "meta_graph",
      by_hour: Object.entries(online)
        .map(([hour, value]) => ({ hour: Number(hour), score: Number(value) || 0 }))
        .sort((a, b) => a.hour - b.hour),
      by_day: derived.active_by_day,
    };
  }
  return {
    source: "derived_from_posts",
    by_hour: derived.active_by_hour,
    by_day: derived.active_by_day,
  };
}

function normalizeDemographics(graphAudience) {
  const genderBreakdown = graphAudience.follower_demographics_gender || {};
  const ageBreakdown = graphAudience.follower_demographics_age || {};
  const raw = graphAudience.audience_gender_age || {};
  const genderTotals = {};
  const ageTotals = {};

  for (const [gender, value] of Object.entries(genderBreakdown || {})) {
    const count = Number(value) || 0;
    if (!count) continue;
    genderTotals[normalizeGenderLabel(gender)] = (genderTotals[normalizeGenderLabel(gender)] || 0) + count;
  }

  for (const [age, value] of Object.entries(ageBreakdown || {})) {
    const count = Number(value) || 0;
    if (!count) continue;
    ageTotals[age] = (ageTotals[age] || 0) + count;
  }

  for (const [key, value] of Object.entries(raw || {})) {
    const [gender, age] = String(key).split(".");
    const count = Number(value) || 0;
    if (!count) continue;
    genderTotals[normalizeGenderLabel(gender)] = (genderTotals[normalizeGenderLabel(gender)] || 0) + count;
    ageTotals[age] = (ageTotals[age] || 0) + count;
  }

  return {
    hasData: Object.keys(genderTotals).length > 0 || Object.keys(ageTotals).length > 0,
    gender_distribution: entriesToRows(genderTotals, "gender"),
    age_ranges: entriesToRows(ageTotals, "range"),
  };
}

function normalizeLocations(graphAudience) {
  const cities = entriesToRows(
    graphAudience.follower_demographics_city || graphAudience.audience_city || {},
    "name",
  ).slice(0, 10);
  const countries = entriesToRows(
    graphAudience.follower_demographics_country || graphAudience.audience_country || {},
    "name",
  ).slice(0, 10);
  return {
    hasData: cities.length > 0 || countries.length > 0,
    top_cities: cities,
    top_countries: countries,
  };
}

function normalizeGenderLabel(value) {
  const key = String(value || "").toUpperCase();
  if (key === "F") return "Female";
  if (key === "M") return "Male";
  if (key === "U") return "Unspecified";
  return value || "Unspecified";
}

function entriesToRows(obj = {}, keyName) {
  const total = sum(Object.values(obj));
  return Object.entries(obj)
    .map(([key, value]) => ({
      [keyName]: key,
      value: Number(value) || 0,
      share: total > 0 ? (Number(value) || 0) / total : null,
    }))
    .filter((row) => row.value > 0)
    .sort((a, b) => b.value - a.value);
}

function addAggregate(map, key, value) {
  const row = map.get(key) || { total: 0, count: 0 };
  row.total += Number(value) || 0;
  row.count += 1;
  map.set(key, row);
}

function latestBy(rows, timeField) {
  return (rows || [])
    .slice()
    .sort((a, b) => new Date(b[timeField]) - new Date(a[timeField]))[0] || null;
}

function engagement(metrics = {}) {
  return (
    Number(metrics.likes || 0) +
    Number(metrics.comments || 0) +
    Number(metrics.shares || 0) +
    Number(metrics.saves || 0)
  );
}

function avg(row) {
  return row?.count ? Math.round(row.total / row.count) : 0;
}

function sum(values = []) {
  return values.reduce((total, value) => total + (Number(value) || 0), 0);
}

function emptyPayload({ warnings = [] } = {}) {
  return {
    source: "meta_graph",
    generated_at: new Date().toISOString(),
    window_days: 90,
    account: null,
    kpis: {
      followers: null,
      follower_delta: null,
      reach: 0,
      impressions: 0,
      engaged_accounts: 0,
      profile_views: 0,
      posts_analyzed: 0,
    },
    follower_growth: [],
    active_times: { source: "unavailable", by_hour: [], by_day: [] },
    gender_distribution: [],
    age_ranges: [],
    top_cities: [],
    top_countries: [],
    content_response: [],
    sentiment_source: "unavailable",
    comments_analyzed: 0,
    warnings,
  };
}

module.exports = {
  getAudienceInsights,
  refreshAudienceInsights,
};
