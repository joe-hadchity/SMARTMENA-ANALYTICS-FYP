const { getSupabase } = require("../../config/supabase");
const { extractHashtags, keywordTokens } = require("./competitorTextUtils");

async function buildContext(workspaceId, input = {}) {
  const workspace = await loadWorkspace(workspaceId);
  const voice = workspace?.brand_voice_json || {};
  const category =
    input.category ||
    input.business_category ||
    voice.category ||
    voice.business_category ||
    workspace?.industry_hint ||
    workspace?.industry ||
    "business";
  const location =
    input.location ||
    voice.location ||
    workspace?.primary_region ||
    workspace?.region_default ||
    "";
  const pageName = input.page_name || workspace?.name || "";
  const hashtags = [
    ...extractHashtags(input.hashtags || [], voice.hashtags || [], voice.bio, voice.about),
    ...String(input.hashtags || "")
      .split(/[,\s]+/)
      .map((tag) => tag.replace(/^#/, "").trim().toLowerCase())
      .filter(Boolean),
  ];
  const keywords = [
    ...keywordTokens(
      category,
      location,
      pageName,
      input.keywords || [],
      input.seed_keywords || [],
      input.bio,
      input.about,
      voice.bio,
      voice.about,
    ),
    ...hashtags,
  ];

  return {
    workspace_id: workspaceId,
    brand_name: pageName || "Workspace",
    category: normalizeCategory(category),
    location: normalizeLocation(location),
    platform: input.platform || "meta_instagram",
    keywords: [...new Set(keywords)].slice(0, 24),
    hashtags: [...new Set(hashtags)].slice(0, 16),
    audience_size: input.audience_size || null,
  };
}

async function loadWorkspace(workspaceId) {
  const supabase = getSupabase();
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("workspaces")
    .select("id, name, slug, region_default, industry, industry_hint, primary_region, brand_voice_json")
    .eq("id", workspaceId)
    .maybeSingle();
  if (error) {
    const err = new Error(error.message || "Failed to load workspace");
    err.status = 500;
    throw err;
  }
  if (!data) {
    const err = new Error(`workspace ${workspaceId} not found`);
    err.status = 404;
    throw err;
  }
  return data;
}

function normalizeCategory(value) {
  const raw = String(value || "").trim().toLowerCase();
  if (/hiking|trail|outdoor|adventure|eco.?tour/.test(raw)) return "hiking group";
  return raw || "business";
}

function normalizeLocation(value) {
  const raw = String(value || "").trim();
  if (/^(lb|lebanon)$/i.test(raw)) return "Lebanon";
  if (/^(ae|uae|united arab emirates)$/i.test(raw)) return "UAE";
  if (/^(sa|ksa|saudi arabia)$/i.test(raw)) return "Saudi Arabia";
  return raw;
}

module.exports = {
  buildContext,
};
