"use client";

import { useMutation } from "@tanstack/react-query";
import {
  CalendarPlus,
  Check,
  Copy,
  Film,
  Image as ImageIcon,
  Layers,
  Megaphone,
  MessageCircle,
  PenLine,
  Sparkles,
  Star,
  Twitter,
  TrendingUp,
  Video,
  X,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Label } from "@/components/ui/Label";
import PageHeader from "@/components/ui/PageHeader";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useI18n } from "@/i18n/I18nProvider";
import {
  composeApi,
  scheduledPostsApi,
  type ComposeRequest,
  type ComposeResponse,
  type ComposeVariant,
  type ContentFormat,
} from "@/lib/api";
import { formatNumber, formatPercent } from "@/lib/format";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Format catalog -- drives the top-of-page selector. `defaultPlatform` is
// used when the user picks a format that's clearly platform-specific.
// ---------------------------------------------------------------------------
type FormatDef = {
  value: ContentFormat;
  labelKey: string;
  descKey: string;
  Icon: typeof PenLine;
  defaultPlatform?: string;
  defaultLength: NonNullable<ComposeRequest["length"]>;
};

const FORMATS: FormatDef[] = [
  {
    value: "post",
    labelKey: "compose.format.post",
    descKey: "compose.format.post.desc",
    Icon: ImageIcon,
    defaultLength: "medium",
  },
  {
    value: "story",
    labelKey: "compose.format.story",
    descKey: "compose.format.story.desc",
    Icon: Layers,
    defaultLength: "short",
  },
  {
    value: "reel_script",
    labelKey: "compose.format.reel_script",
    descKey: "compose.format.reel_script.desc",
    Icon: Video,
    defaultLength: "medium",
  },
  {
    value: "thread",
    labelKey: "compose.format.thread",
    descKey: "compose.format.thread.desc",
    Icon: MessageCircle,
    defaultPlatform: "x",
    defaultLength: "long",
  },
  {
    value: "tweet",
    labelKey: "compose.format.tweet",
    descKey: "compose.format.tweet.desc",
    Icon: Twitter,
    defaultPlatform: "x",
    defaultLength: "short",
  },
  {
    value: "facebook_post",
    labelKey: "compose.format.facebook_post",
    descKey: "compose.format.facebook_post.desc",
    Icon: Film,
    defaultPlatform: "meta_facebook",
    defaultLength: "long",
  },
  {
    value: "ad",
    labelKey: "compose.format.ad",
    descKey: "compose.format.ad.desc",
    Icon: Megaphone,
    defaultLength: "medium",
  },
];

const PLATFORMS: Array<{ value: string; label: string }> = [
  { value: "meta_instagram", label: "Instagram" },
  { value: "meta_facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X (Twitter)" },
];

const LANGUAGES: Array<{ value: ComposeRequest["language"]; label: string }> = [
  { value: "mix", label: "AR + EN mix" },
  { value: "ar", label: "Arabic" },
  { value: "en", label: "English" },
];

const DIALECTS: Array<{ value: ComposeRequest["dialect"]; label: string }> = [
  { value: "msa", label: "MSA (Standard)" },
  { value: "khaleeji", label: "Khaleeji" },
  { value: "levantine", label: "Levantine" },
  { value: "egyptian", label: "Egyptian" },
  { value: "maghrebi", label: "Maghrebi" },
];

const TONES = [
  "playful",
  "premium",
  "urgent",
  "warm",
  "professional",
  "inspiring",
  "casual",
];

const LENGTHS: Array<{ value: ComposeRequest["length"]; label: string }> = [
  { value: "short", label: "Short" },
  { value: "medium", label: "Medium" },
  { value: "long", label: "Long" },
];

export default function ContentStudioPage() {
  const { t, locale } = useI18n();

  const [format, setFormat] = useState<ContentFormat>("post");
  const [brief, setBrief] = useState("");
  const [platform, setPlatform] = useState<string>("meta_instagram");
  const [language, setLanguage] =
    useState<NonNullable<ComposeRequest["language"]>>("mix");
  const [dialect, setDialect] =
    useState<NonNullable<ComposeRequest["dialect"]>>("khaleeji");
  const [tone, setTone] = useState<string>("playful");
  const [length, setLength] =
    useState<NonNullable<ComposeRequest["length"]>>("medium");
  const [count, setCount] = useState<number>(3);
  const [cta, setCta] = useState("");
  const [hashtagsText, setHashtagsText] = useState("");
  const [audience, setAudience] = useState("");

  const searchParams = useSearchParams();
  useEffect(() => {
    const initialBrief = searchParams.get("brief");
    const initialTag = searchParams.get("tag");
    const initialFormat = searchParams.get("format");
    if (initialBrief) setBrief(initialBrief);
    if (initialTag) setHashtagsText((prev) => (prev ? prev : `#${initialTag}`));
    if (initialFormat && FORMATS.some((f) => f.value === initialFormat)) {
      pickFormat(initialFormat as ContentFormat);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Selecting a format nudges the dependent defaults (platform + length)
  // but keeps whatever the user already picked explicitly.
  const pickFormat = (next: ContentFormat) => {
    setFormat(next);
    const def = FORMATS.find((f) => f.value === next);
    if (!def) return;
    if (def.defaultPlatform) setPlatform(def.defaultPlatform);
    setLength(def.defaultLength);
    if (next === "thread" || next === "tweet") {
      setCount((c) => Math.min(c, 2));
    }
  };

  const compose = useMutation<ComposeResponse, Error, ComposeRequest>({
    mutationFn: composeApi.compose,
    onError: (err) => {
      toast.error(err?.message || "Content Studio failed");
    },
  });

  const activeFormat = useMemo(
    () => FORMATS.find((f) => f.value === format) || FORMATS[0],
    [format],
  );

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!brief.trim()) {
      toast.error(t("compose.err.briefRequired", "Please describe the post briefly."));
      return;
    }
    const hashtags = hashtagsText
      .split(/[,\n\s]+/)
      .map((h) => h.trim())
      .filter(Boolean)
      .map((h) => (h.startsWith("#") ? h : `#${h}`));

    compose.mutate({
      brief: brief.trim(),
      platform,
      format,
      language,
      dialect: language === "en" ? undefined : dialect,
      tone: tone || undefined,
      length,
      count,
      callToAction: cta.trim() || undefined,
      hashtags: hashtags.length ? hashtags : undefined,
      audience: audience.trim() || undefined,
      locale,
    });
  };

  const result = compose.data;

  return (
    <div className="space-y-6 pb-24">
      <PageHeader
        eyebrow={t("nav.section.grow", "Grow")}
        title={t("compose.title", "Content Studio")}
        subtitle={t(
          "compose.subtitle",
          "Generate full-format content — posts, stories, Reels scripts, threads, Facebook posts, or ads — scored by our ML + MENA engine.",
        )}
      />

      {/* Format picker */}
      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle>{t("compose.format", "Content format")}</CardTitle>
            <CardDescription>
              {t(
                "compose.format.hint",
                "Pick a format — we'll tune the prompt, length, and output shape.",
              )}
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2">
            {FORMATS.map((f) => {
              const active = f.value === format;
              const Icon = f.Icon;
              return (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => pickFormat(f.value)}
                  className={cn(
                    "group relative flex flex-col items-start gap-2 rounded-xl border p-3 text-left transition-all",
                    active
                      ? "border-primary bg-primary-soft/60 shadow-sm"
                      : "border-border bg-surface hover:bg-surface-muted",
                  )}
                >
                  <span
                    className={cn(
                      "grid h-8 w-8 place-items-center rounded-lg",
                      active
                        ? "bg-primary text-primary-fg"
                        : "bg-surface-muted text-fg-muted group-hover:text-fg",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div
                      className={cn(
                        "text-xs font-semibold truncate",
                        active ? "text-fg" : "text-fg",
                      )}
                    >
                      {t(f.labelKey, f.value)}
                    </div>
                    <div className="text-[10px] text-fg-subtle leading-tight line-clamp-2">
                      {t(f.descKey, "")}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Brief form */}
        <form onSubmit={onSubmit} className="lg:col-span-1 space-y-4">
          <Card padded={false}>
            <CardHeader>
              <div>
                <CardTitle>{t("compose.brief.title", "Brief")}</CardTitle>
                <CardDescription>
                  {t(
                    "compose.brief.subtitle",
                    "Describe the product, promo, or idea. Keep it to 2–3 sentences.",
                  )}
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>
                  {t("compose.brief.label", "What should the post be about?")}
                </Label>
                <Textarea
                  rows={4}
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder={t(
                    "compose.brief.placeholder",
                    "E.g. Launch of our weekend brunch at Palm Jumeirah, 20% off for early bookings.",
                  )}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("compose.platform", "Platform")}</Label>
                  <Select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value)}
                  >
                    {PLATFORMS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{t("compose.count", "Variants")}</Label>
                  <Select
                    value={String(count)}
                    onChange={(e) => setCount(Number(e.target.value))}
                  >
                    {[1, 2, 3, 4, 5].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("compose.language", "Language")}</Label>
                  <Select
                    value={language}
                    onChange={(e) =>
                      setLanguage(
                        e.target.value as NonNullable<ComposeRequest["language"]>,
                      )
                    }
                  >
                    {LANGUAGES.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{t("compose.dialect", "Arabic dialect")}</Label>
                  <Select
                    disabled={language === "en"}
                    value={dialect}
                    onChange={(e) =>
                      setDialect(
                        e.target.value as NonNullable<ComposeRequest["dialect"]>,
                      )
                    }
                  >
                    {DIALECTS.map((d) => (
                      <option key={d.value} value={d.value}>
                        {d.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>{t("compose.tone", "Tone")}</Label>
                  <Select
                    value={tone}
                    onChange={(e) => setTone(e.target.value)}
                  >
                    <option value="">—</option>
                    {TONES.map((t2) => (
                      <option key={t2} value={t2}>
                        {t2}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <Label>{t("compose.length", "Length")}</Label>
                  <Select
                    value={length}
                    onChange={(e) =>
                      setLength(
                        e.target.value as NonNullable<ComposeRequest["length"]>,
                      )
                    }
                  >
                    {LENGTHS.map((l) => (
                      <option key={l.value} value={l.value}>
                        {l.label}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              <div>
                <Label>{t("compose.cta", "Call to action (optional)")}</Label>
                <Input
                  value={cta}
                  onChange={(e) => setCta(e.target.value)}
                  placeholder={t(
                    "compose.cta.placeholder",
                    "E.g. Book your table today",
                  )}
                />
              </div>

              <div>
                <Label>{t("compose.hashtags", "Hashtags (optional)")}</Label>
                <Input
                  value={hashtagsText}
                  onChange={(e) => setHashtagsText(e.target.value)}
                  placeholder="#Dubai #Brunch #WeekendVibes"
                />
                <p className="mt-1 text-[11px] text-fg-subtle">
                  {t(
                    "compose.hashtags.hint",
                    "Comma or space separated. '#' is optional.",
                  )}
                </p>
              </div>

              <div>
                <Label>{t("compose.audience", "Audience (optional)")}</Label>
                <Input
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder={t(
                    "compose.audience.placeholder",
                    "E.g. Young professionals in UAE, weekend dining crowd.",
                  )}
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                loading={compose.isPending}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                {compose.isPending
                  ? t("compose.generating", "Generating variants…")
                  : t("compose.generate", "Generate variants")}
              </Button>
            </CardContent>
          </Card>
        </form>

        {/* Results column */}
        <div className="lg:col-span-2 space-y-4">
          {result ? (
            <ResultsHeader result={result} activeFormat={activeFormat} />
          ) : null}

          {compose.isPending ? (
            <div className="space-y-3">
              {Array.from({ length: count }).map((_, i) => (
                <div
                  key={i}
                  className="h-36 rounded-xl border border-border bg-surface animate-pulse"
                />
              ))}
            </div>
          ) : null}

          {!compose.isPending && !result ? (
            <Card>
              <div className="p-10 text-center">
                <div className="mx-auto h-12 w-12 rounded-xl bg-primary-soft text-primary grid place-items-center">
                  <PenLine className="h-6 w-6" />
                </div>
                <h3 className="mt-3 text-base font-semibold text-fg">
                  {t("compose.empty.title", "Ready when you are")}
                </h3>
                <p className="mt-1 text-sm text-fg-muted max-w-md mx-auto">
                  {t(
                    "compose.empty.desc",
                    "Pick a format, fill in a brief, and we'll generate ranked variants scored by our ML + MENA engine.",
                  )}
                </p>
              </div>
            </Card>
          ) : null}

          {result?.variants.map((v) => (
            <VariantCard
              key={v.index}
              variant={v}
              platform={result.platform}
              format={result.format || format}
            />
          ))}

          {result?.shared_tips ? (
            <Card>
              <CardHeader>
                <CardTitle>
                  {t("compose.sharedTips", "MENA playbook for this brief")}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-fg-muted whitespace-pre-wrap">
                  {result.shared_tips}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function ResultsHeader({
  result,
  activeFormat,
}: {
  result: ComposeResponse;
  activeFormat: FormatDef;
}) {
  const { t } = useI18n();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge tone={result.source === "llm" ? "success" : "neutral"}>
        {result.source === "llm"
          ? t("compose.source.llm", "Azure OpenAI")
          : t("compose.source.fallback", "Local fallback")}
      </Badge>
      <Badge tone="info">
        {result.count} {t("compose.variants", "variants")}
      </Badge>
      <Badge tone="neutral">{result.platform}</Badge>
      <Badge tone="neutral">
        {t(activeFormat.labelKey, activeFormat.value)}
      </Badge>
      {result.llm_error ? (
        <Badge tone="warning" title={result.llm_error}>
          {t("compose.source.fallbackWarn", "LLM fell back to local engine")}
        </Badge>
      ) : null}
    </div>
  );
}

function VariantCard({
  variant,
  platform,
  format,
}: {
  variant: ComposeVariant;
  platform: string;
  format: ContentFormat;
}) {
  const { t, locale } = useI18n();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [scheduling, setScheduling] = useState(false);
  const score = variant.score;

  const scheduleVariant = async () => {
    try {
      setScheduling(true);
      const scheduledAt = new Date();
      scheduledAt.setHours(scheduledAt.getHours() + 2);
      scheduledAt.setMinutes(0, 0, 0);
      const post = await scheduledPostsApi.create({
        platform,
        caption: variant.text,
        language: variant.language as "ar" | "en" | "mix",
        hashtags: variant.hashtags || [],
        scheduled_at: scheduledAt.toISOString(),
        status: "draft",
        content_score_json: {
          sentiment: variant.score?.predicted_sentiment,
          roi: variant.score?.predicted_roi,
          composite: variant.composite_score,
          format,
        },
      });
      toast.success(
        t("compose.scheduleCta", "Schedule this variant") + " ✓",
        {
          description: `${post.platform} · ${new Date(post.scheduled_at).toLocaleString()}`,
        },
      );
      router.push("/calendar");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error";
      toast.error(msg);
    } finally {
      setScheduling(false);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(variant.text);
      setCopied(true);
      toast.success(t("compose.copied", "Copied to clipboard"));
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t("compose.copyFailed", "Could not copy."));
    }
  };

  const roi = score?.predicted_roi;
  const sentimentTone: "success" | "warning" | "neutral" =
    score?.predicted_sentiment === "positive"
      ? "success"
      : score?.predicted_sentiment === "negative"
        ? "warning"
        : "neutral";

  const meta = variant.format_meta;
  const effectiveFormat = variant.format || format;
  const isRtl = variant.language === "ar";

  return (
    <Card
      className={cn(
        "transition-shadow",
        variant.is_recommended ? "ring-1 ring-primary/40 shadow-md" : "",
      )}
    >
      <CardHeader>
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className={cn(
              "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold",
              variant.is_recommended
                ? "bg-primary text-primary-fg"
                : "bg-surface-muted text-fg-muted",
            )}
          >
            #{variant.rank}
          </span>
          {variant.is_recommended ? (
            <Badge tone="success" size="sm">
              <Star className="h-3 w-3" />
              {t("compose.recommended", "Recommended")}
            </Badge>
          ) : null}
          <Badge tone="neutral" size="sm">
            {variant.language.toUpperCase()}
          </Badge>
          {variant.dialect && variant.dialect !== "n/a" ? (
            <Badge tone="neutral" size="sm">
              {variant.dialect}
            </Badge>
          ) : null}
          {variant.tone ? (
            <Badge tone="info" size="sm">
              {variant.tone}
            </Badge>
          ) : null}
          <Badge tone="neutral" size="sm">
            {t(`compose.format.${effectiveFormat}`, effectiveFormat)}
          </Badge>
          <span className="ms-auto text-[11px] text-fg-subtle">
            {variant.length_chars} {t("compose.chars", "chars")}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {/* Format-specific body rendering */}
        {effectiveFormat === "thread" && meta?.parts?.length ? (
          <ThreadBody parts={meta.parts} isRtl={isRtl} />
        ) : effectiveFormat === "reel_script" &&
          (meta?.hook || meta?.beats?.length || meta?.cta) ? (
          <ReelScriptBody
            hook={meta?.hook || null}
            beats={meta?.beats || null}
            cta={meta?.cta || null}
            fallbackText={variant.text}
            isRtl={isRtl}
          />
        ) : (
          <p
            className={cn(
              "whitespace-pre-wrap text-[15px] leading-relaxed text-fg",
              isRtl ? "text-right" : "",
            )}
            dir={isRtl ? "rtl" : undefined}
          >
            {variant.text}
          </p>
        )}

        {variant.hashtags?.length ? (
          <div className="flex flex-wrap gap-1">
            {variant.hashtags.map((h) => (
              <span
                key={h}
                className="text-[11px] px-2 py-0.5 rounded-full bg-surface-muted text-fg-muted"
              >
                {h}
              </span>
            ))}
          </div>
        ) : null}

        {variant.rationale ? (
          <p className="text-xs text-fg-muted italic border-s-2 border-primary/30 ps-3">
            {variant.rationale}
          </p>
        ) : null}

        {/* Score panel */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-border">
          <Metric
            label={t("compose.score.sentiment", "Sentiment")}
            value={
              score?.predicted_sentiment
                ? t(
                    `insights.sentiment.${score.predicted_sentiment}`,
                    score.predicted_sentiment,
                  )
                : "—"
            }
            hint={
              score?.sentiment_confidence != null
                ? formatPercent(score.sentiment_confidence, 0, locale)
                : undefined
            }
            tone={sentimentTone}
          />
          <Metric
            label={t("compose.score.roi", "Predicted ROI")}
            value={roi != null ? `${roi.toFixed(2)}×` : "—"}
            hint={
              score?.confidence_score != null
                ? formatPercent(score.confidence_score, 0, locale)
                : undefined
            }
            icon={<TrendingUp className="h-3 w-3" />}
          />
          <Metric
            label={t("compose.score.engagement", "Est. engagement")}
            value={
              score?.predicted_engagement != null
                ? formatNumber(score.predicted_engagement, locale)
                : "—"
            }
          />
          <Metric
            label={t("compose.score.composite", "Overall score")}
            value={variant.composite_score.toFixed(2)}
            tone="info"
          />
        </div>

        {score?.recommendation_text ? (
          <p className="text-xs text-fg-muted">
            <span className="font-medium text-fg">
              {t("compose.whyItWorks", "Why it works:")}{" "}
            </span>
            {locale === "ar" && score.recommendation_ar
              ? score.recommendation_ar
              : score.recommendation_text}
          </p>
        ) : null}

        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={scheduleVariant}
            loading={scheduling}
            leftIcon={<CalendarPlus className="h-3.5 w-3.5" />}
          >
            {t("compose.scheduleCta", "Schedule this variant")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={copy}
            leftIcon={
              copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )
            }
          >
            {copied
              ? t("compose.copied", "Copied")
              : t("compose.copy", "Copy caption")}
          </Button>
        </div>
        <input type="hidden" value={platform} readOnly />
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Format-specific body renderers
// ---------------------------------------------------------------------------

function ThreadBody({ parts, isRtl }: { parts: string[]; isRtl: boolean }) {
  const { t } = useI18n();
  return (
    <div className="space-y-2">
      <div className="text-[11px] uppercase tracking-wider text-fg-subtle">
        {parts.length} {t("compose.thread.parts", "parts")}
      </div>
      <ol className="space-y-2">
        {parts.map((p, i) => (
          <li
            key={i}
            className={cn(
              "rounded-md border border-border bg-surface-muted/40 p-3 text-[14px] leading-relaxed text-fg",
              isRtl ? "text-right" : "",
            )}
            dir={isRtl ? "rtl" : undefined}
          >
            <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-primary">
              {t("compose.thread.part", "Part")} {i + 1}
            </span>
            <span className="whitespace-pre-wrap">{p}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function ReelScriptBody({
  hook,
  beats,
  cta,
  fallbackText,
  isRtl,
}: {
  hook: string | null;
  beats: string[] | null;
  cta: string | null;
  fallbackText: string;
  isRtl: boolean;
}) {
  const { t } = useI18n();
  const hasStructured = Boolean(hook || beats?.length || cta);
  if (!hasStructured) {
    return (
      <p
        className={cn(
          "whitespace-pre-wrap text-[15px] leading-relaxed text-fg",
          isRtl ? "text-right" : "",
        )}
        dir={isRtl ? "rtl" : undefined}
      >
        {fallbackText}
      </p>
    );
  }
  return (
    <div className="space-y-2" dir={isRtl ? "rtl" : undefined}>
      {hook ? (
        <ScriptRow
          label={t("compose.reel.hook", "Hook")}
          body={hook}
          tone="primary"
        />
      ) : null}
      {beats?.map((b, i) => (
        <ScriptRow
          key={i}
          label={`${t("compose.reel.beats", "Beats")} ${i + 1}`}
          body={b}
        />
      ))}
      {cta ? (
        <ScriptRow
          label={t("compose.reel.cta", "CTA")}
          body={cta}
          tone="success"
        />
      ) : null}
    </div>
  );
}

function ScriptRow({
  label,
  body,
  tone,
}: {
  label: string;
  body: string;
  tone?: "primary" | "success";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
        ? "text-success"
        : "text-fg-muted";
  return (
    <div className="rounded-md border border-border bg-surface-muted/40 p-3">
      <div
        className={cn(
          "mb-1 text-[10px] font-semibold uppercase tracking-wider",
          toneCls,
        )}
      >
        {label}
      </div>
      <div className="text-[14px] leading-relaxed text-fg whitespace-pre-wrap">
        {body}
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  tone,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "info" | "neutral";
  icon?: React.ReactNode;
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "warning"
        ? "text-warning"
        : tone === "info"
          ? "text-primary"
          : "text-fg";
  return (
    <div className="rounded-md bg-surface-muted/60 px-2.5 py-1.5">
      <div className="text-[10px] uppercase tracking-wider text-fg-subtle">
        {label}
      </div>
      <div className={cn("text-sm font-semibold flex items-center gap-1", toneClass)}>
        {icon}
        {value}
      </div>
      {hint ? (
        <div className="text-[10px] text-fg-subtle">±{hint}</div>
      ) : null}
    </div>
  );
}

void X;
