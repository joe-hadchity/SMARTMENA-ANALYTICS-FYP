// The backend's campaign platform enum and ROI platform enum do not match.
// These helpers translate from the campaign shape to the ROI shape.

const PLATFORM_MAP = {
  facebook: "facebook",
  instagram: "instagram",
  tiktok: "tiktok",
  x: "twitter",
  google: "instagram",
};

const REGION_MAP = {
  LB: "Lebanon",
  AE: "UAE",
  SA: "Saudi Arabia",
  EG: "Egypt",
  JO: "Jordan",
};

export function platformToRoi(platform) {
  return PLATFORM_MAP[platform] || "instagram";
}

export function regionToRoi(region) {
  return REGION_MAP[region] || "UAE";
}

export function sentimentLabelToScore(label, confidence) {
  const c = typeof confidence === "number" ? confidence : 0;
  if (label === "positive") return clamp(c, -1, 1);
  if (label === "negative") return clamp(-c, -1, 1);
  if (label === "neutral") return 0;
  return 0;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}
