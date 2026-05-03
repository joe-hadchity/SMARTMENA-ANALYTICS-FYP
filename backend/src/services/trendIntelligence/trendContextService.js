const { getSupabase } = require("../../config/supabase");
const { extractHashtags, topKeywords } = require("./trendTextUtils");

const DEFAULT_CONTEXT = {
  brand_name: "Workspace",
  category: "business",
  industry: "social media",
  location: null,
  audience: "relevant local and global audiences",
  keywords: [],
  hashtags: [],
};

async function buildContext(workspaceId, brandId = null) {
  const supabase = getSupabase();
  if (!supabase) {
    return hikingFallback({
      ...DEFAULT_CONTEXT,
      brand_id: brandId,
      warnings: ["Supabase is not configured; trend context used a generic fallback."],
    });
  }

  const warnings = [];
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("id, name, slug, region_default, industry, industry_hint, primary_region, brand_voice_json")
    .eq("id", workspaceId)
    .maybeSingle();

  if (wsError) {
    const err = new Error(wsError.message || "Failed to load workspace trend context");
    err.status = 500;
    throw err;
  }
  if (!workspace) {
    const err = new Error(`workspace ${workspaceId} not found`);
    err.status = 404;
    throw err;
  }

  const voice = workspace.brand_voice_json || {};
  const category = normalizeCategory(
    voice.category ||
      voice.business_category ||
      workspace.industry_hint ||
      workspace.industry ||
      inferCategoryFromName(workspace.name),
  );
  const location = normalizeLocation(
    voice.location || workspace.primary_region || workspace.region_default,
  );
  const base = {
    brand_id: brandId,
    brand_name: workspace.name || workspace.slug || "Workspace",
    category,
    industry: workspace.industry || workspace.industry_hint || category,
    location,
    audience:
      voice.audience ||
      voice.target_audience ||
      buildAudience(category, location),
    keywords: buildKeywords({
      category,
      location,
      brandName: workspace.name,
      voice,
    }),
    hashtags: buildHashtags({ category, location, voice }),
    warnings,
  };

  return isHikingContext(base) ? hikingFallback(base) : base;
}

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (!raw) return "business";
  if (/(hiking|trail|outdoor|adventure|eco.?tour)/i.test(raw)) return "hiking_group";
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "business";
}

function normalizeLocation(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^(lb|lebanon)$/i.test(raw)) return "Lebanon";
  if (/^(ae|uae|united arab emirates)$/i.test(raw)) return "UAE";
  if (/^(sa|ksa|saudi arabia)$/i.test(raw)) return "Saudi Arabia";
  return raw;
}

function inferCategoryFromName(name) {
  if (/(hike|hiking|trail|outdoor|adventure)/i.test(name || "")) return "hiking_group";
  return "business";
}

function buildAudience(category, location) {
  if (category === "hiking_group") {
    return location
      ? `local hikers, outdoor travelers, and weekend adventure groups in ${location}`
      : "hikers, outdoor travelers, and weekend adventure groups";
  }
  return location
    ? `customers and communities in ${location}`
    : "relevant local and global audiences";
}

function buildKeywords({ category, location, brandName, voice }) {
  const fromVoice = [
    ...(Array.isArray(voice.keywords) ? voice.keywords : []),
    ...(Array.isArray(voice.tone_keywords) ? voice.tone_keywords : []),
    ...topKeywords(`${voice.bio || ""} ${voice.about || ""}`, [], 8),
  ];
  const local = location ? String(location) : "";
  const readableCategory = category.replace(/_/g, " ");
  const seeds = [
    `${readableCategory} ${local}`.trim(),
    `${local} ${readableCategory}`.trim(),
    brandName,
    readableCategory,
    ...fromVoice,
  ].filter(Boolean);

  return [...new Set(seeds.map((v) => String(v).trim()).filter(Boolean))].slice(0, 16);
}

function buildHashtags({ category, location, voice }) {
  const tags = extractHashtags(
    ...(Array.isArray(voice.hashtags) ? voice.hashtags : []),
    voice.bio,
    voice.about,
  );
  if (category === "hiking_group") {
    tags.push("hiking", "trails", "outdoors");
    if (/lebanon/i.test(location || "")) {
      tags.push("hikinglebanon", "lebanontrails", "lebanon");
    }
  }
  return [...new Set(tags)].slice(0, 16);
}

function isHikingContext(context) {
  const haystack = [
    context.brand_name,
    context.category,
    context.industry,
    context.audience,
    ...(context.keywords || []),
    ...(context.hashtags || []),
  ]
    .join(" ")
    .toLowerCase();
  return /(hiking|hike|trail|outdoor|adventure)/.test(haystack);
}

function hikingFallback(context) {
  const location = context.location || "Lebanon";
  const keywords = [
    "hiking Lebanon",
    "Lebanon trails",
    "group hikes",
    "eco tourism Lebanon",
    "outdoor adventure Lebanon",
    "weekend hikes Lebanon",
    ...(context.keywords || []),
  ];
  const hashtags = [
    "hikinglebanon",
    "lebanontrails",
    "hiking",
    "outdoorlebanon",
    ...(context.hashtags || []),
  ];
  return {
    ...context,
    category: "hiking_group",
    industry: context.industry || "outdoor travel",
    location,
    audience:
      context.audience ||
      "local hikers, outdoor travelers, and weekend adventure communities",
    keywords: [...new Set(keywords)].slice(0, 16),
    hashtags: [...new Set(hashtags)].slice(0, 16),
  };
}

module.exports = {
  buildContext,
};
