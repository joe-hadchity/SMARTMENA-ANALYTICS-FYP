/**
 * Workspace service.
 *
 * A workspace is the tenant boundary for the beta. There is no auth yet, so
 * the backend resolves the active workspace from an x-workspace-id header
 * (via `middleware/workspaceContext.js`) and falls back to a `demo` workspace
 * that is auto-created the first time it's needed.
 */

const db = require("./dbService");

const TABLE = "workspaces";
const DEMO_SLUG = "demo";

function normalizeSlug(input) {
  return String(input || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

async function listWorkspaces() {
  return db.list(TABLE, { orderBy: "created_at", ascending: false });
}

async function getWorkspaceById(id) {
  return db.getById(TABLE, id);
}

async function listSocialAccountsForWorkspace(id) {
  // Ensure the workspace exists (404s cleanly via dbService.getById).
  await db.getById(TABLE, id);
  return db.list("social_accounts", {
    filters: { workspace_id: id },
    orderBy: "connected_at",
    ascending: false,
  });
}

async function listSyncJobsForWorkspace(id, { limit, platform, status } = {}) {
  await db.getById(TABLE, id);
  const filters = { workspace_id: id };
  if (platform) filters.platform = platform;
  if (status) filters.status = status;
  return db.list("sync_jobs", {
    filters,
    orderBy: "created_at",
    ascending: false,
    limit,
  });
}

async function findWorkspaceBySlug(slug) {
  const rows = await db.list(TABLE, {
    filters: { slug },
    limit: 1,
  });
  return rows[0] || null;
}

async function createWorkspace(payload) {
  const slug = normalizeSlug(payload.slug || payload.name);
  if (!slug) {
    const err = new Error("Workspace slug could not be derived from payload");
    err.status = 400;
    throw err;
  }

  // Accept both `region` (new generic alias) and `region_default`
  // (original column name); the latter wins when both are provided.
  const region = payload.region_default ?? payload.region ?? null;

  const row = {
    name: payload.name,
    slug,
    region_default: region,
    locale_default: payload.locale_default ?? "ar",
    owner_user_id: payload.owner_user_id ?? null,
  };

  // Only include v3 columns when the caller provided them, so the endpoint
  // still works against a Supabase instance that has not yet applied
  // schema_v3.sql.
  if (payload.industry !== undefined) row.industry = payload.industry;

  return db.insert(TABLE, row);
}

/**
 * Resolve (or lazily create) the default demo workspace. Used by the
 * workspaceContext middleware when no x-workspace-id header is provided.
 */
async function getOrCreateDemoWorkspace() {
  const existing = await findWorkspaceBySlug(DEMO_SLUG);
  if (existing) return existing;

  return createWorkspace({
    name: "Born2Hike Demo",
    slug: DEMO_SLUG,
    region_default: "LB",
    locale_default: "en",
    industry: "outdoor_travel",
  });
}

// ---------------------------------------------------------------------------
// Business profile settings
// ---------------------------------------------------------------------------

const DEFAULT_BRAND_VOICE = {
  tone_keywords: [],
  do: [],
  dont: [],
  sample_phrases: [],
  default_dialect: "msa",
};

const VALID_DIALECTS = new Set([
  "khaleeji",
  "levantine",
  "egyptian",
  "maghrebi",
  "msa",
]);

const BORN2HIKE_PROFILE = {
  onboarding_completed: false,
  business_name: "Born2Hike",
  page_name: "Born2Hike",
  instagram_handle: "born2hike",
  category: "hiking_group",
  business_type: "community_group",
  location: "Lebanon",
  country: "LB",
  website: null,
  bio:
    "Born2Hike is a Lebanon-based hiking community organizing safe weekend hikes, trail experiences, and outdoor adventures.",
  about:
    "The brand focuses on group hiking, Lebanese trails, mountain escapes, waterfalls, nature, safety, and community participation.",
  audience:
    "local hikers, outdoor travelers, students, young professionals, and weekend adventure groups in Lebanon",
  keywords: [
    "hiking Lebanon",
    "Lebanon trails",
    "group hikes",
    "weekend hikes Lebanon",
    "outdoor adventure Lebanon",
    "eco tourism Lebanon",
  ],
  hashtags: [
    "hikinglebanon",
    "lebanontrails",
    "hiking",
    "outdoorlebanon",
    "lebanon",
  ],
  tone_keywords: ["adventurous", "community", "safe", "local", "nature-first"],
  content_pillars: [
    "group hikes",
    "trail discovery",
    "waterfall hikes",
    "sunset mountain views",
    "safety tips",
    "eco tourism",
  ],
  goals: [
    "increase engagement",
    "get more hike bookings",
    "discover local trends",
    "track hiking competitors",
  ],
  platforms: ["instagram", "facebook", "youtube"],
  primary_platform: "instagram",
  content_formats: ["reels", "carousels", "stories", "event announcements"],
  posting_frequency: "3-4 times per week",
  do: [
    "Mention Lebanon trails and landmarks",
    "Show group participation and safety",
    "Use clear CTAs for joining hikes",
  ],
  dont: [
    "Do not exaggerate trail difficulty",
    "Avoid political references",
    "Avoid generic travel captions",
  ],
  sample_phrases: [
    "Weekend trail reset with the Born2Hike crew.",
    "Save this route for your next Lebanon mountain escape.",
    "Join the group, bring water, and leave only footprints.",
  ],
  default_dialect: "levantine",
};

function cleanString(value, fallback = "") {
  const text = String(value ?? "").trim();
  return text || fallback;
}

function cleanNullableString(value) {
  const text = String(value ?? "").trim();
  return text || null;
}

function cleanHandle(value) {
  return cleanString(value).replace(/^@+/, "").toLowerCase() || null;
}

function cleanList(value, limit = 30) {
  const source = Array.isArray(value)
    ? value
    : String(value || "")
        .split(/[,\n]+/)
        .map((item) => item.trim());

  return [
    ...new Set(
      source
        .map((item) => String(item || "").trim())
        .filter(Boolean),
    ),
  ].slice(0, limit);
}

function cleanHashtags(value) {
  return cleanList(value, 30).map((tag) =>
    tag.replace(/^#/, "").trim().toLowerCase(),
  );
}

function valueOrFallback(source, key, fallback) {
  return Object.prototype.hasOwnProperty.call(source, key)
    ? source[key]
    : fallback;
}

function normalizeDialect(value) {
  return typeof value === "string" && VALID_DIALECTS.has(value)
    ? value
    : "levantine";
}

function normalizeCategory(value) {
  const raw = cleanString(value, "hiking_group").toLowerCase();
  if (/(hiking|hike|trail|outdoor|adventure|eco.?tour)/i.test(raw)) {
    return "hiking_group";
  }
  return raw.replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "") || "business";
}

function normalizeLocation(value) {
  const raw = cleanString(value, "Lebanon");
  if (/^(lb|lebanon)$/i.test(raw)) return "Lebanon";
  if (/^(ae|uae|united arab emirates)$/i.test(raw)) return "UAE";
  if (/^(sa|ksa|saudi arabia)$/i.test(raw)) return "Saudi Arabia";
  return raw;
}

function normalizeCountry(value) {
  const raw = cleanString(value, "LB");
  if (/^(lb|lebanon)$/i.test(raw)) return "LB";
  if (/^(ae|uae|united arab emirates)$/i.test(raw)) return "AE";
  if (/^(sa|ksa|saudi arabia)$/i.test(raw)) return "SA";
  return raw.toUpperCase().slice(0, 2);
}

function normalizeBrandVoice(input = {}) {
  const src = typeof input === "object" && input !== null ? input : {};
  const cleanArray = (val) =>
    Array.isArray(val)
      ? val
          .map((s) => String(s).trim())
          .filter(Boolean)
          .slice(0, 25)
      : [];

  const dialect =
    typeof src.default_dialect === "string" && VALID_DIALECTS.has(src.default_dialect)
      ? src.default_dialect
      : DEFAULT_BRAND_VOICE.default_dialect;

  return {
    tone_keywords: cleanArray(src.tone_keywords),
    do: cleanArray(src.do),
    dont: cleanArray(src.dont),
    sample_phrases: cleanArray(src.sample_phrases),
    default_dialect: dialect,
  };
}

function normalizeBusinessProfile(input = {}, workspace = {}) {
  const src = typeof input === "object" && input !== null ? input : {};
  const isBorn2HikeWorkspace =
    workspace.slug === "demo" || workspace.slug === "born2hike";
  const fallback =
    isBorn2HikeWorkspace
      ? BORN2HIKE_PROFILE
      : {
          ...BORN2HIKE_PROFILE,
          business_name: workspace.name || BORN2HIKE_PROFILE.business_name,
          page_name: workspace.name || BORN2HIKE_PROFILE.page_name,
        };

  const category = normalizeCategory(src.category || fallback.category);
  const country = normalizeCountry(
    src.country ||
      (!isBorn2HikeWorkspace ? workspace.region_default : null) ||
      fallback.country,
  );
  const location = normalizeLocation(
    src.location ||
      (!isBorn2HikeWorkspace
        ? workspace.primary_region || workspace.region_default
        : null) ||
      fallback.location,
  );

  return {
    workspace_id: workspace.id || null,
    onboarding_completed: Boolean(src.onboarding_completed),
    business_name: cleanString(
      src.business_name || (!isBorn2HikeWorkspace ? workspace.name : null),
      fallback.business_name,
    ),
    page_name: cleanString(src.page_name, fallback.page_name),
    instagram_handle: cleanHandle(src.instagram_handle || fallback.instagram_handle),
    category,
    business_type: cleanString(src.business_type, fallback.business_type),
    location,
    country,
    website: cleanNullableString(src.website || fallback.website),
    bio: cleanString(src.bio, fallback.bio),
    about: cleanString(src.about, fallback.about),
    audience: cleanString(src.audience, fallback.audience),
    keywords: cleanList(valueOrFallback(src, "keywords", fallback.keywords), 30),
    hashtags: cleanHashtags(valueOrFallback(src, "hashtags", fallback.hashtags)),
    tone_keywords: cleanList(
      valueOrFallback(src, "tone_keywords", fallback.tone_keywords),
      20,
    ),
    content_pillars: cleanList(
      valueOrFallback(src, "content_pillars", fallback.content_pillars),
      20,
    ),
    goals: cleanList(valueOrFallback(src, "goals", fallback.goals), 20),
    platforms: cleanList(valueOrFallback(src, "platforms", fallback.platforms), 10),
    primary_platform: cleanString(
      src.primary_platform ||
        (Array.isArray(src.platforms) ? src.platforms[0] : null),
      fallback.primary_platform,
    ),
    content_formats: cleanList(
      valueOrFallback(src, "content_formats", fallback.content_formats),
      20,
    ),
    posting_frequency: cleanString(
      src.posting_frequency,
      fallback.posting_frequency,
    ),
    do: cleanList(valueOrFallback(src, "do", fallback.do), 20),
    dont: cleanList(valueOrFallback(src, "dont", fallback.dont), 20),
    sample_phrases: cleanList(
      valueOrFallback(src, "sample_phrases", fallback.sample_phrases),
      20,
    ),
    default_dialect: normalizeDialect(src.default_dialect || fallback.default_dialect),
  };
}

function businessProfileToWorkspaceJson(profile) {
  return {
    onboarding_completed: profile.onboarding_completed,
    business_name: profile.business_name,
    page_name: profile.page_name,
    instagram_handle: profile.instagram_handle,
    category: profile.category,
    business_category: profile.category,
    business_type: profile.business_type,
    location: profile.location,
    country: profile.country,
    website: profile.website,
    bio: profile.bio,
    about: profile.about,
    audience: profile.audience,
    target_audience: profile.audience,
    keywords: profile.keywords,
    hashtags: profile.hashtags,
    tone_keywords: profile.tone_keywords,
    content_pillars: profile.content_pillars,
    goals: profile.goals,
    platforms: profile.platforms,
    primary_platform: profile.primary_platform,
    content_formats: profile.content_formats,
    posting_frequency: profile.posting_frequency,
    do: profile.do,
    dont: profile.dont,
    sample_phrases: profile.sample_phrases,
    default_dialect: profile.default_dialect,
  };
}

async function getBusinessProfile(workspaceId) {
  const row = await db.getById(TABLE, workspaceId, {
    select:
      "id, name, slug, region_default, locale_default, industry, industry_hint, primary_region, brand_voice_json",
  });
  return normalizeBusinessProfile(row.brand_voice_json, row);
}

async function upsertBusinessProfile(workspaceId, payload = {}) {
  const workspace = await db.getById(TABLE, workspaceId, {
    select:
      "id, name, slug, region_default, locale_default, industry, industry_hint, primary_region, brand_voice_json",
  });
  const merged = {
    ...(workspace.brand_voice_json || {}),
    ...payload,
  };
  const profile = normalizeBusinessProfile(merged, workspace);
  const row = await db.update(TABLE, workspaceId, {
    name: profile.business_name,
    region_default: profile.country,
    industry:
      profile.category === "hiking_group" ? "outdoor_travel" : profile.category,
    industry_hint: profile.category,
    primary_region: profile.country,
    brand_voice_json: businessProfileToWorkspaceJson(profile),
  });
  return normalizeBusinessProfile(row.brand_voice_json, row);
}

async function applyBorn2HikeProfile(workspaceId) {
  return upsertBusinessProfile(workspaceId, BORN2HIKE_PROFILE);
}

async function getBrandVoice(workspaceId) {
  const row = await db.getById(TABLE, workspaceId, {
    select: "id, name, industry_hint, primary_region, brand_voice_json",
  });
  return {
    workspace_id: row.id,
    name: row.name,
    industry_hint: row.industry_hint || null,
    primary_region: row.primary_region || null,
    brand_voice: normalizeBrandVoice(row.brand_voice_json),
  };
}

async function upsertBrandVoice(workspaceId, payload = {}) {
  // Ensure the workspace exists for a clean 404.
  await db.getById(TABLE, workspaceId);

  const update = {};
  if (payload.industry_hint !== undefined)
    update.industry_hint = payload.industry_hint || null;
  if (payload.primary_region !== undefined)
    update.primary_region = payload.primary_region || null;
  if (payload.brand_voice !== undefined) {
    update.brand_voice_json = normalizeBrandVoice(payload.brand_voice);
  }

  if (Object.keys(update).length === 0) {
    // Nothing to change, just return the current state.
    return getBrandVoice(workspaceId);
  }

  const row = await db.update(TABLE, workspaceId, update);
  return {
    workspace_id: row.id,
    name: row.name,
    industry_hint: row.industry_hint || null,
    primary_region: row.primary_region || null,
    brand_voice: normalizeBrandVoice(row.brand_voice_json),
  };
}

module.exports = {
  TABLE,
  DEMO_SLUG,
  DEFAULT_BRAND_VOICE,
  BORN2HIKE_PROFILE,
  VALID_DIALECTS,
  listWorkspaces,
  getWorkspaceById,
  findWorkspaceBySlug,
  createWorkspace,
  getOrCreateDemoWorkspace,
  listSocialAccountsForWorkspace,
  listSyncJobsForWorkspace,
  normalizeSlug,
  normalizeBrandVoice,
  normalizeBusinessProfile,
  getBusinessProfile,
  upsertBusinessProfile,
  applyBorn2HikeProfile,
  getBrandVoice,
  upsertBrandVoice,
};
