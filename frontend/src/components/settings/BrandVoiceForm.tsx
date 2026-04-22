"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent } from "react";
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
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { useI18n } from "@/i18n/I18nProvider";
import { workspacesApi } from "@/lib/api";
import type { BrandVoice, Dialect } from "@/lib/types";

const DIALECTS: Dialect[] = [
  "msa",
  "khaleeji",
  "levantine",
  "egyptian",
  "maghrebi",
];

const REGIONS = [
  "AE",
  "SA",
  "EG",
  "LB",
  "JO",
  "QA",
  "KW",
  "OM",
  "BH",
  "MA",
] as const;

type Props = { workspaceId: string };

export default function BrandVoiceForm({ workspaceId }: Props) {
  const { t } = useI18n();
  const qc = useQueryClient();

  const q = useQuery({
    queryKey: ["workspace", workspaceId, "brand-voice"],
    queryFn: () => workspacesApi.brandVoice(workspaceId),
    enabled: Boolean(workspaceId),
  });

  const [industry, setIndustry] = useState("");
  const [region, setRegion] = useState<string>("");
  const [dialect, setDialect] = useState<Dialect>("msa");
  const [tones, setTones] = useState<string[]>([]);
  const [toneDraft, setToneDraft] = useState("");
  const [doText, setDoText] = useState("");
  const [dontText, setDontText] = useState("");
  const [samplesText, setSamplesText] = useState("");

  // Hydrate from server
  useEffect(() => {
    if (!q.data) return;
    setIndustry(q.data.industry_hint ?? "");
    setRegion(q.data.primary_region ?? "");
    const bv = q.data.brand_voice || ({} as Partial<BrandVoice>);
    setDialect(bv.default_dialect ?? "msa");
    setTones(bv.tone_keywords ?? []);
    setDoText((bv.do ?? []).join("\n"));
    setDontText((bv.dont ?? []).join("\n"));
    setSamplesText((bv.sample_phrases ?? []).join("\n"));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () =>
      workspacesApi.updateBrandVoice(workspaceId, {
        industry_hint: industry.trim() || null,
        primary_region: region || null,
        brand_voice: {
          tone_keywords: tones,
          do: doText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          dont: dontText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          sample_phrases: samplesText
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
          default_dialect: dialect,
        },
      }),
    onSuccess: () => {
      toast.success(t("settings.brand.saved"));
      qc.invalidateQueries({ queryKey: ["workspace", workspaceId, "brand-voice"] });
    },
    onError: (err: unknown) => {
      const msg =
        err instanceof Error ? err.message : t("settings.brand.saveError");
      toast.error(`${t("settings.brand.saveError")} ${msg ? `· ${msg}` : ""}`);
    },
  });

  function handleToneKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const v = toneDraft.trim().replace(/,+$/, "");
      if (v && !tones.includes(v) && tones.length < 25) {
        setTones([...tones, v]);
      }
      setToneDraft("");
    } else if (e.key === "Backspace" && !toneDraft && tones.length > 0) {
      setTones(tones.slice(0, -1));
    }
  }

  return (
    <Card padded={false}>
      <CardHeader>
        <div className="flex-1">
          <CardTitle>{t("settings.brand.title")}</CardTitle>
          <CardDescription>{t("settings.brand.subtitle")}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">{t("settings.brand.industry")}</label>
            <Input
              className="mt-1"
              placeholder={t("settings.brand.industryPh")}
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
            />
          </div>
          <div>
            <label className="label">{t("settings.brand.region")}</label>
            <Select
              className="mt-1"
              value={region}
              onChange={(e) => setRegion(e.target.value)}
            >
              <option value="">—</option>
              {REGIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <label className="label">{t("settings.brand.dialect")}</label>
            <Select
              className="mt-1"
              value={dialect}
              onChange={(e) => setDialect(e.target.value as Dialect)}
            >
              {DIALECTS.map((d) => (
                <option key={d} value={d}>
                  {t(`dialect.${d}`)}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label className="label">{t("settings.brand.tone")}</label>
          <div className="mt-1 rounded-lg border border-border bg-surface px-2 py-2 flex items-center gap-1 flex-wrap">
            {tones.map((tag) => (
              <Badge key={tag} tone="brand" size="md" className="gap-1.5">
                {tag}
                <button
                  type="button"
                  aria-label={t("settings.brand.remove")}
                  className="opacity-70 hover:opacity-100"
                  onClick={() => setTones(tones.filter((x) => x !== tag))}
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
            <input
              className="flex-1 min-w-[120px] bg-transparent border-0 px-1 py-1 text-sm focus:outline-none"
              placeholder={t("settings.brand.tonePh")}
              value={toneDraft}
              onChange={(e) => setToneDraft(e.target.value)}
              onKeyDown={handleToneKey}
            />
          </div>
          <p className="text-xs text-fg-muted mt-1">
            {t("settings.brand.toneHint")}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="label">{t("settings.brand.do")}</label>
            <Textarea
              className="mt-1 min-h-[120px]"
              placeholder={"Speak simply\nMention local landmarks"}
              value={doText}
              onChange={(e) => setDoText(e.target.value)}
            />
            <p className="text-xs text-fg-muted mt-1">
              {t("settings.brand.doHint")}
            </p>
          </div>
          <div>
            <label className="label">{t("settings.brand.dont")}</label>
            <Textarea
              className="mt-1 min-h-[120px]"
              placeholder={"No slang\nNo political topics"}
              value={dontText}
              onChange={(e) => setDontText(e.target.value)}
            />
            <p className="text-xs text-fg-muted mt-1">
              {t("settings.brand.dontHint")}
            </p>
          </div>
        </div>

        <div>
          <label className="label">{t("settings.brand.samples")}</label>
          <Textarea
            className="mt-1 min-h-[100px]"
            placeholder={"مذاقنا... من قلب دبي.\nTreat yourself today."}
            value={samplesText}
            onChange={(e) => setSamplesText(e.target.value)}
          />
          <p className="text-xs text-fg-muted mt-1">
            {t("settings.brand.samplesHint")}
          </p>
        </div>

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} loading={save.isPending}>
            {t("settings.brand.save")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
