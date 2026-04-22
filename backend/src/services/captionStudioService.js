/**
 * captionStudioService -- ranked, brand-voice-aware caption generator.
 *
 * Pipeline
 *   1. Load the workspace brand voice (tone keywords, do/dont, sample phrases).
 *   2. Ask Azure OpenAI for N variants with a strict JSON response format
 *      (see systemPrompts.captionStudio). If the LLM is disabled, fall back
 *      to a deterministic, template-based generator so the endpoint still
 *      returns useful output.
 *   3. Score every variant with the existing contentScoreService -> real
 *      sentiment (Arabic-aware BERT) + ROI + MENA tips. This is the key
 *      differentiator: each variant is grounded in our ML + MENA engine,
 *      not just "because the LLM said so".
 *   4. Rank variants by a simple composite score (sentiment confidence +
 *      normalized ROI) and return the ranked list.
 *
 * Every LLM call is metered via `withUsageMeter` so /api/health can show
 * per-workspace consumption.
 */

const workspaceService = require("./workspaceService");
const contentScoreService = require("./contentScoreService");
const menaEngine = require("./menaRecommendationEngine");
const logger = require("../utils/logger");

const {
  chat: llmChat,
  isEnabled: isLLMEnabled,
  LLMDisabledError,
} = require("./llm/azureOpenAIClient");
const systemPrompts = require("./llm/systemPrompts");
const { withUsageMeter, assertBudget } = require("./llm/usageMeter");

const DEFAULT_VARIANT_COUNT = 3;
const MAX_VARIANT_COUNT = 5;
const DEFAULT_LOCALE = "en";

// Supported content formats. `post` keeps the original behaviour.
const ALLOWED_FORMATS = new Set([
  "post",
  "story",
  "reel_script",
  "thread",
  "tweet",
  "facebook_post",
  "ad",
]);

function ensureFormat(format, platform) {
  const v = String(format || "").toLowerCase();
  if (ALLOWED_FORMATS.has(v)) return v;
  // Platform-sensible defaults when no explicit format is requested.
  if (platform === "x") return "tweet";
  if (platform === "meta_facebook") return "facebook_post";
  return "post";
}

// Per-format character targets override `length_target_chars` for formats
// that don't map cleanly to short/medium/long.
function formatCharTarget(format, lengthBucket) {
  if (format === "story") return { min: 40, max: 120 };
  if (format === "tweet") return { min: 60, max: 270 };
  if (format === "thread") return { min: 300, max: 1200 }; // full thread text
  if (format === "reel_script") return { min: 180, max: 600 };
  if (format === "facebook_post") return { min: 150, max: 380 };
  if (format === "ad") return { min: 120, max: 260 };
  // "post" falls back to the generic length bucket
  if (lengthBucket === "short") return { min: 40, max: 90 };
  if (lengthBucket === "long") return { min: 180, max: 260 };
  return { min: 90, max: 180 };
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function ensureLanguage(lang) {
  const v = String(lang || "").toLowerCase();
  if (v === "ar" || v === "arabic") return "ar";
  if (v === "en" || v === "english") return "en";
  if (v === "mix" || v === "mixed" || v === "both") return "mix";
  return "mix"; // safe default for MENA audiences
}

function ensureDialect(dialect) {
  const v = String(dialect || "").toLowerCase();
  const allowed = ["khaleeji", "levantine", "egyptian", "maghrebi", "msa"];
  if (allowed.includes(v)) return v;
  return "msa";
}

function ensureLength(len) {
  const v = String(len || "").toLowerCase();
  if (v === "short") return "short";
  if (v === "long") return "long";
  return "medium";
}

// Template fallback used when the LLM is disabled or produces garbage.
// Branches by format so we always return something sensible even offline.
function fallbackVariants({
  brief,
  platform,
  format,
  language,
  dialect,
  tone,
  hashtags,
  count,
}) {
  const tag = hashtags.length ? ` ${hashtags.join(" ")}` : "";
  const brief1 = brief.length > 80 ? brief.slice(0, 80).trim() + "…" : brief;

  // --- Per-format template banks ---
  const postTemplates = {
    ar: [
      `جربوا ${brief} — تجربة تستحق المشاركة.${tag}`,
      `لكل محبي ${brief}، هذا العرض خصيصاً لكم.${tag}`,
      `${brief}… بأسلوبنا الخاص. الحقوا العرض قبل ما ينتهي.${tag}`,
      `اليوم فقط: ${brief}. لا تفوّتوا الفرصة!${tag}`,
      `المذاق الأصلي لـ ${brief}، بين إيدكم.${tag}`,
    ],
    en: [
      `Try ${brief} — a moment worth sharing.${tag}`,
      `For every ${brief} lover, this one's for you.${tag}`,
      `${brief}, reimagined. Catch it before it's gone.${tag}`,
      `Today only: ${brief}. Don't miss out!${tag}`,
      `The authentic taste of ${brief}, right in your hands.${tag}`,
    ],
    mix: [
      `جربوا ${brief} — your new favourite moment.${tag}`,
      `${brief} لعشاق التفاصيل. Limited drop.${tag}`,
      `Late-night craving? ${brief} هو الحل.${tag}`,
      `${brief} — نفس الجودة، with a modern twist.${tag}`,
      `بدون مبالغة: ${brief} is the vibe tonight.${tag}`,
    ],
  };

  const storyTemplates = {
    ar: [
      `سؤال اليوم 👀 مين جرّب ${brief1}؟`,
      `جديدنا الآن ✨ ${brief1}`,
      `اضغط "تم" لو جربت ${brief1} 👌`,
    ],
    en: [
      `Quick poll 👀 tried ${brief1} yet?`,
      `Just dropped ✨ ${brief1}`,
      `Tap back if ${brief1} hits ✅`,
    ],
    mix: [
      `جربت ${brief1}? tap + if you did ✅`,
      `جديدنا 🔥 ${brief1} — slide to try.`,
      `Vote! ${brief1} — أوافق / ما بعد 🤔`,
    ],
  };

  const tweetTemplates = {
    ar: [
      `${brief1} — هذا كل ما نحتاجه اليوم.${tag}`,
      `الصراحة: ${brief1}. جربوا وقولوا رأيكم.${tag}`,
    ],
    en: [
      `${brief1} — all we needed today.${tag}`,
      `Honestly? ${brief1}. Try it and tell us.${tag}`,
    ],
    mix: [
      `${brief1} — trust us on this one.${tag}`,
      `Hot take: ${brief1}. غيّرت رأيي.${tag}`,
    ],
  };

  const adTemplates = {
    ar: [
      `توقف ثانية 🚨\n${brief} — العرض بس هاي الأسبوع.\nاطلب الآن.${tag}`,
      `ما تفوّت.\n${brief}. جودة حقيقية، سعر ذكي.\nتسوّق الآن.${tag}`,
    ],
    en: [
      `Stop scrolling 🚨\n${brief} — only this week.\nShop now.${tag}`,
      `Don't miss out.\n${brief}. Premium quality, smart price.\nOrder today.${tag}`,
    ],
    mix: [
      `Stop! 🚨 ${brief} — العرض لحد الأحد.\nاطلب هلأ.${tag}`,
      `Premium feel, smart price. ${brief}.\nتسوّق الآن.${tag}`,
    ],
  };

  const facebookTemplates = {
    ar: [
      `يا جماعة 👋\n${brief}. حكينا مع عملاءنا وهذي تجربتهم.\nشو رأيكم؟${tag}`,
      `${brief}.\nمن وراء الكواليس: بدأنا من فكرة بسيطة، وصرنا أكثر.\nاقرأوا القصة الكاملة.${tag}`,
    ],
    en: [
      `Hey friends 👋\n${brief}. We talked to our customers — here's what they said.\nWhat do you think?${tag}`,
      `${brief}.\nBehind the scenes: we started from a simple idea, and we grew into more.\nRead the full story.${tag}`,
    ],
    mix: [
      `Hey 👋\n${brief}. كان في وقت بدأنا من الصفر — اليوم هذي نتيجتنا.\nشاركونا رأيكم.${tag}`,
      `${brief}.\nSmall start, big dreams. احكوا معنا بالتعليقات.${tag}`,
    ],
  };

  const reelScriptTemplates = {
    ar: [
      `HOOK: لحظة — ${brief1} غيّرت كل شي.\nBEAT 1: شو المشكلة اللي كنا نواجهها؟\nBEAT 2: جربنا هذا الحل.\nBEAT 3: النتيجة بـ 7 أيام.\nCTA: اكتب "أبغى" بالتعليقات.${tag}`,
      `HOOK: وقفوا قبل ما تكملوا.\nBEAT 1: ${brief1}.\nBEAT 2: كيف نعمل هذا؟\nBEAT 3: لش هاد يفرق.\nCTA: احفظ الفيديو للنسخة الكاملة.${tag}`,
    ],
    en: [
      `HOOK: Wait — ${brief1} changed everything.\nBEAT 1: The problem we kept hitting.\nBEAT 2: Here's what we tried.\nBEAT 3: Results in 7 days.\nCTA: Comment "Yes" and we'll send the guide.${tag}`,
      `HOOK: Before you scroll, read this.\nBEAT 1: ${brief1}.\nBEAT 2: How we actually do it.\nBEAT 3: Why it matters.\nCTA: Save for later.${tag}`,
    ],
    mix: [
      `HOOK: Wait — ${brief1} غيّرت الطريقة.\nBEAT 1: كان في مشكلة.\nBEAT 2: Tried this fix.\nBEAT 3: النتيجة خلال أسبوع.\nCTA: اكتب "send" بالتعليقات.${tag}`,
    ],
  };

  const threadTemplates = {
    ar: [
      [
        `1/ ${brief1} — لماذا هذا مهم الآن؟`,
        `2/ البداية كانت مشكلة بسيطة لكنها كانت تكبر كل أسبوع.`,
        `3/ جربنا ثلاث طرق. اثنتان فشلتا.`,
        `4/ النجاح جاء لما ركّزنا على شي واحد: الجمهور.`,
        `5/ الخلاصة: ${brief1} ليس ترفاً، هو ضرورة.${tag}`,
      ],
    ],
    en: [
      [
        `1/ ${brief1} — why this matters right now.`,
        `2/ The problem started small but grew week after week.`,
        `3/ We tried three fixes. Two failed.`,
        `4/ The win came when we focused on one thing: the audience.`,
        `5/ Takeaway: ${brief1} isn't nice-to-have, it's essential.${tag}`,
      ],
    ],
    mix: [
      [
        `1/ ${brief1} — ليش مهم هلأ.`,
        `2/ The problem started small لكنها كبرت بسرعة.`,
        `3/ We tried 3 fixes. اثنتان فشلتا.`,
        `4/ الحل كان: نركّز على الجمهور الحقيقي.`,
        `5/ Takeaway: ${brief1} مش ترف.${tag}`,
      ],
    ],
  };

  const pickLang = (bank) => bank[language] || bank.mix || bank.en;

  let source;
  if (format === "story") source = pickLang(storyTemplates);
  else if (format === "tweet") source = pickLang(tweetTemplates);
  else if (format === "ad") source = pickLang(adTemplates);
  else if (format === "facebook_post") source = pickLang(facebookTemplates);
  else if (format === "reel_script") source = pickLang(reelScriptTemplates);
  else if (format === "thread") source = pickLang(threadTemplates);
  else source = pickLang(postTemplates);

  const rationale =
    language === "ar"
      ? "نبرة قريبة من الجمهور مع دعوة واضحة للتفاعل."
      : "Audience-friendly tone with a clear call to action.";

  // Thread templates are arrays-of-arrays (one array per variant).
  if (format === "thread") {
    return source.slice(0, count).map((parts, idx) => ({
      text: parts.join("\n\n---\n\n"),
      language,
      dialect: language === "ar" || language === "mix" ? dialect : "n/a",
      tone: tone || "friendly",
      hashtags,
      length_chars: parts.join("\n\n---\n\n").length,
      rationale,
      format_meta: { parts },
      _source: "fallback",
      _variantIndex: idx,
      platform,
    }));
  }

  return source.slice(0, count).map((text, idx) => {
    const meta = {};
    if (format === "reel_script") {
      // Extract HOOK, BEATs, CTA from the template for format_meta.
      const lines = text.split(/\n+/).filter(Boolean);
      const hook = lines.find((l) => /^HOOK:/i.test(l))?.replace(/^HOOK:\s*/i, "");
      const beats = lines
        .filter((l) => /^BEAT\s*\d+:/i.test(l))
        .map((l) => l.replace(/^BEAT\s*\d+:\s*/i, ""));
      const cta = lines.find((l) => /^CTA:/i.test(l))?.replace(/^CTA:\s*/i, "");
      if (hook) meta.hook = hook;
      if (beats.length) meta.beats = beats;
      if (cta) meta.cta = cta;
    }
    return {
      text,
      language,
      dialect: language === "ar" || language === "mix" ? dialect : "n/a",
      tone: tone || "friendly",
      hashtags,
      length_chars: text.length,
      rationale,
      format_meta: meta,
      _source: "fallback",
      _variantIndex: idx,
      platform,
    };
  });
}

function parseLLMPayload(raw) {
  let parsed;
  try {
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch (err) {
    throw new Error(`LLM returned non-JSON payload: ${err.message}`);
  }
  const variants = Array.isArray(parsed?.variants) ? parsed.variants : null;
  if (!variants || !variants.length) {
    throw new Error("LLM payload is missing 'variants' array");
  }
  return variants;
}

// Composite score used to rank variants. Transparent, startup-friendly:
// - sentiment lift: +0.4 for positive × confidence
// - roi signal:     predicted_roi normalized (0–10 bucket) × confidence
// - penalty:        negative sentiment -> −0.3
// - length bonus:   +0.05 if within the requested target range
function compositeScore(score, target) {
  const s = score || {};
  let total = 0;
  const conf = Number.isFinite(s.sentiment_confidence) ? s.sentiment_confidence : 0.5;

  if (s.predicted_sentiment === "positive") total += 0.4 * conf;
  else if (s.predicted_sentiment === "negative") total -= 0.3 * conf;

  if (Number.isFinite(s.predicted_roi)) {
    const roiNorm = Math.min(1, Math.max(0, s.predicted_roi / 10));
    total += roiNorm * (Number.isFinite(s.confidence_score) ? s.confidence_score : 0.6);
  }

  if (target && Number.isFinite(s.length_chars)) {
    if (s.length_chars >= target.min && s.length_chars <= target.max) total += 0.05;
  }

  return Number(total.toFixed(4));
}

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

/**
 * Compose and rank caption variants.
 *
 * @param {Object}   input
 * @param {string}   input.workspaceId
 * @param {string}   input.brief            - short description of what to say
 * @param {string}   input.platform         - meta_instagram, meta_facebook, tiktok, x
 * @param {string}  [input.language]        - ar | en | mix
 * @param {string}  [input.dialect]         - khaleeji | levantine | egyptian | maghrebi | msa
 * @param {string}  [input.tone]            - adjective, e.g. "playful", "premium"
 * @param {string}  [input.length]          - short | medium | long
 * @param {number}  [input.count]           - 1..5, default 3
 * @param {string}  [input.callToAction]    - optional CTA phrase
 * @param {string[]}[input.hashtags]        - optional pre-chosen hashtags
 * @param {string}  [input.audience]        - free-text audience description
 * @param {string}  [input.locale]          - response locale for rationales
 */
async function composeVariants(input) {
  const {
    workspaceId,
    brief,
    platform,
    callToAction,
    audience,
  } = input;

  if (!workspaceId) {
    const err = new Error("workspaceId is required");
    err.status = 400;
    throw err;
  }
  if (!brief || typeof brief !== "string") {
    const err = new Error("brief is required");
    err.status = 400;
    throw err;
  }
  if (!platform) {
    const err = new Error("platform is required");
    err.status = 400;
    throw err;
  }

  const language = ensureLanguage(input.language);
  const dialect = ensureDialect(input.dialect);
  const length = ensureLength(input.length);
  const format = ensureFormat(input.format, platform);
  const tone = (input.tone || "").trim() || null;
  const count = Math.min(
    MAX_VARIANT_COUNT,
    Math.max(1, Number.parseInt(input.count, 10) || DEFAULT_VARIANT_COUNT),
  );
  const hashtags = Array.isArray(input.hashtags)
    ? input.hashtags.filter((h) => typeof h === "string").slice(0, 8)
    : [];
  const locale = input.locale === "ar" ? "ar" : DEFAULT_LOCALE;
  // Per-format target overrides the generic length bucket for non-post formats.
  const target = formatCharTarget(format, length);

  // 1. Brand voice for the system prompt.
  let brandVoice = null;
  try {
    brandVoice = await workspaceService.getBrandVoice(workspaceId);
  } catch (err) {
    logger.warn(`captionStudio: brand voice lookup failed (${err.message})`);
  }

  const briefContext = {
    brand: brandVoice?.brand_voice || null,
    industry_hint: brandVoice?.industry_hint || null,
    primary_region: brandVoice?.primary_region || null,
    platform,
    format,
    language,
    dialect,
    tone,
    length,
    length_target_chars: target,
    hashtags_suggested: hashtags,
    audience: audience || null,
    call_to_action: callToAction || null,
    brief,
    variants_requested: count,
  };

  // 2. Get raw variants -- LLM first, fallback second.
  let rawVariants = null;
  let source = "fallback";
  let llmError = null;

  if (isLLMEnabled()) {
    try {
      await assertBudget(workspaceId).catch((err) => {
        if (err.code === "LLM_BUDGET_EXCEEDED") throw err;
      });

      const systemPrompt = systemPrompts.captionStudio(briefContext, locale);
      const userPrompt = `Generate ${count} caption variant(s) for the brief above. Return strict JSON.`;

      const completion = await withUsageMeter(
        { workspaceId, feature: "content_studio", metadata: { platform, format, language, dialect, count } },
        () =>
          llmChat({
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.8,
            maxTokens: 900,
            responseFormat: { type: "json_object" },
          }),
      );

      rawVariants = parseLLMPayload(completion.text);
      source = "llm";
    } catch (err) {
      if (err instanceof LLMDisabledError) {
        // shouldn't happen since isLLMEnabled() returned true, but handle it
      } else if (err.code === "LLM_BUDGET_EXCEEDED") {
        const bErr = new Error(err.message);
        bErr.status = 429;
        bErr.code = err.code;
        bErr.details = err.details;
        throw bErr;
      } else {
        logger.warn(`captionStudio: LLM call failed, falling back (${err.message})`);
        llmError = err.message;
      }
    }
  }

  if (!rawVariants) {
    rawVariants = fallbackVariants({
      brief,
      platform,
      format,
      language,
      dialect,
      tone,
      hashtags,
      count,
    });
  }

  // Normalize shape from LLM output.
  const normalized = rawVariants.slice(0, count).map((v, idx) => {
    const text = String(v?.text || v?.caption || "").trim();
    const formatMeta =
      v?.format_meta && typeof v.format_meta === "object" ? v.format_meta : {};
    return {
      index: idx,
      text,
      language: ensureLanguage(v?.language || language),
      dialect: v?.dialect && v.dialect !== "n/a" ? ensureDialect(v.dialect) : dialect,
      tone: v?.tone || tone,
      hashtags: Array.isArray(v?.hashtags) ? v.hashtags.slice(0, 8) : hashtags,
      length_chars: Number.isFinite(v?.length_chars) ? v.length_chars : text.length,
      rationale: typeof v?.rationale === "string" ? v.rationale : null,
      format,
      format_meta: {
        hook: typeof formatMeta.hook === "string" ? formatMeta.hook : null,
        beats: Array.isArray(formatMeta.beats)
          ? formatMeta.beats.filter((b) => typeof b === "string").slice(0, 8)
          : null,
        cta: typeof formatMeta.cta === "string" ? formatMeta.cta : null,
        parts: Array.isArray(formatMeta.parts)
          ? formatMeta.parts.filter((p) => typeof p === "string").slice(0, 10)
          : null,
        emoji_set: Array.isArray(formatMeta.emoji_set)
          ? formatMeta.emoji_set.filter((e) => typeof e === "string").slice(0, 6)
          : null,
      },
    };
  });

  // 3. Score each variant via the existing content scorer. Scoring failures
  //    shouldn't kill the whole compose call -- we keep the variant with a
  //    null score so the user still sees text.
  const scored = await Promise.all(
    normalized.map(async (variant) => {
      if (!variant.text) return { ...variant, score: null };
      try {
        const scoreResult = await contentScoreService.scoreContent({
          workspaceId,
          platform,
          captionText: variant.text,
        });
        const score = {
          predicted_sentiment: scoreResult.predicted_sentiment,
          sentiment_confidence: scoreResult.sentiment_confidence,
          predicted_roi: scoreResult.predicted_roi,
          predicted_engagement: scoreResult.predicted_engagement,
          confidence_score: scoreResult.confidence_score,
          language_mix: scoreResult.language_mix,
          tips: scoreResult.tips,
          recommendation_text: scoreResult.recommendation_text,
          recommendation_ar: scoreResult.recommendation_ar,
          length_chars: variant.length_chars,
        };
        const composite = compositeScore(score, target);
        return { ...variant, score, composite_score: composite };
      } catch (err) {
        logger.warn(
          `captionStudio: variant ${variant.index} scoring failed (${err.message})`,
        );
        return {
          ...variant,
          score: null,
          composite_score: 0,
          score_error: err.message,
        };
      }
    }),
  );

  // 4. Rank by composite score, descending.
  const ranked = [...scored].sort(
    (a, b) => (b.composite_score || 0) - (a.composite_score || 0),
  );

  // Re-number `rank` for convenience and flag the winner.
  const withRank = ranked.map((v, idx) => ({
    ...v,
    rank: idx + 1,
    is_recommended: idx === 0,
  }));

  // 5. A cross-variant MENA tip so the UI can render "why these variants"
  //    once (e.g. "Evening is best for Reels during Ramadan").
  const contentTypeForTips =
    format === "reel_script"
      ? "reel"
      : format === "story"
        ? "story"
        : format === "ad"
          ? "ad"
          : format === "thread" || format === "tweet"
            ? "post"
            : "post";
  const globalTip = menaEngine.generateRecommendations({
    region: brandVoice?.primary_region || null,
    platform,
    languageMix: language === "mix" ? "mixed" : language,
    contentTone:
      withRank[0]?.score?.predicted_sentiment || "neutral",
    toneConfidence: withRank[0]?.score?.sentiment_confidence || 0.6,
    contentType: contentTypeForTips,
    predictedRoi: withRank[0]?.score?.predicted_roi || null,
    roiConfidence: withRank[0]?.score?.confidence_score || null,
    postingHour: 20,
  });

  return {
    workspace_id: workspaceId,
    platform,
    format,
    brief,
    language,
    dialect,
    length,
    tone,
    count: withRank.length,
    source,
    llm_error: llmError,
    variants: withRank,
    shared_tips: menaEngine.toRecommendationText(globalTip, {
      locale,
      max: 3,
    }),
    generated_at: new Date().toISOString(),
  };
}

module.exports = {
  composeVariants,
};
