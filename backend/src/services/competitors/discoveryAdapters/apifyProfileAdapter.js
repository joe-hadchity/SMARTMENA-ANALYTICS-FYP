const axios = require("axios");
const env = require("../../../config/env");

const APIFY_BASE = "https://api.apify.com/v2";

async function fetchProfileInfo({ handle, platform = "meta_instagram" }) {
  if (!env.APIFY_API_TOKEN) {
    return {
      profile: null,
      warnings: ["apify_skipped:missing_api_token"],
      provider: "apify",
    };
  }

  if (platform !== "meta_instagram") {
    return {
      profile: null,
      warnings: [`apify_skipped:unsupported_platform:${platform}`],
      provider: "apify",
    };
  }

  const warnings = [];
  const actorId = "apify~instagram-profile-scraper";
  const profileUrl = `https://www.instagram.com/${handle.replace(/^@/, "")}/`;

  try {
    const runRes = await axios.post(
      `${APIFY_BASE}/acts/${encodeURIComponent(actorId)}/runs`,
      {
        usernames: [handle.replace(/^@/, "")],
        resultsType: "details",
      },
      {
        timeout: 180_000,
        params: {
          token: env.APIFY_API_TOKEN,
          waitForFinish: 180,
        },
      },
    );

    const run = runRes.data?.data || runRes.data || {};
    if (!["SUCCEEDED", "READY"].includes(run.status)) {
      warnings.push(`apify_profile_run_status:${run.status || "unknown"}`);
    }

    if (!run.defaultDatasetId) {
      return {
        profile: null,
        warnings: [...warnings, "apify_profile_missing_dataset"],
        provider: "apify",
      };
    }

    const itemsRes = await axios.get(
      `${APIFY_BASE}/datasets/${run.defaultDatasetId}/items`,
      {
        timeout: 60_000,
        params: {
          token: env.APIFY_API_TOKEN,
          clean: true,
          format: "json",
          limit: 1,
        },
      },
    );

    const items = Array.isArray(itemsRes.data) ? itemsRes.data : [];
    const profileData = items[0];

    if (!profileData) {
      return {
        profile: null,
        warnings: [...warnings, "apify_profile_no_data"],
        provider: "apify",
      };
    }

    return {
      profile: normalizeProfile(profileData),
      warnings,
      provider: "apify",
      actor_id: actorId,
      run_id: run.id || null,
      dataset_id: run.defaultDatasetId || null,
    };
  } catch (err) {
    const status = err.response?.status;
    const message = err.response?.data?.error?.message || err.message;
    return {
      profile: null,
      warnings: [`apify_profile_failed:${status || err.code || message}`],
      provider: "apify",
      actor_id: actorId,
    };
  }
}

function normalizeProfile(item = {}) {
  const username = String(item.username || item.handle || "").trim();
  const followersCount = Number(item.followersCount || item.followers || 0);
  const followingCount = Number(item.followingCount || item.following || 0);
  const postsCount = Number(item.postsCount || item.posts || 0);
  const bio = String(item.biography || item.bio || "").trim();
  const verified = Boolean(item.isPrivate === false && item.verified);
  const private_ = Boolean(item.isPrivate === true);
  const profileUrl = item.url || `https://www.instagram.com/${username}/`;

  return {
    username,
    followers_count: followersCount || null,
    following_count: followingCount || null,
    posts_count: postsCount || null,
    bio,
    verified,
    private: private_,
    profile_url: profileUrl,
    raw_payload: {
      ...item,
      provider: "apify",
      source: "apify_profile",
    },
  };
}

module.exports = {
  fetchProfileInfo,
};
