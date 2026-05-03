"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";
import { useEffect, useState, type KeyboardEvent, type ReactNode } from "react";
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
import { workspacesApi } from "@/lib/api";
import type { BusinessProfile, Dialect } from "@/lib/types";

const COUNTRIES = ["LB", "AE", "SA", "EG", "JO", "QA", "KW", "OM", "BH", "MA"];
const DIALECTS: Dialect[] = ["levantine", "msa", "khaleeji", "egyptian", "maghrebi"];
const PLATFORMS = ["instagram", "facebook", "tiktok", "youtube", "x"];

const CATEGORY_OPTIONS = [
  { value: "hiking_group", label: "Hiking group" },
  { value: "outdoor_travel", label: "Outdoor travel" },
  { value: "eco_tourism", label: "Eco tourism" },
  { value: "adventure_experiences", label: "Adventure experiences" },
  { value: "fitness_community", label: "Fitness community" },
];

type Props = {
  workspaceId: string;
};

type EditableProfile = Omit<BusinessProfile, "workspace_id">;

const emptyProfile: EditableProfile = {
  onboarding_completed: false,
  business_name: "Born2Hike",
  page_name: "Born2Hike",
  instagram_handle: "born2hike",
  category: "hiking_group",
  business_type: "community_group",
  location: "Lebanon",
  country: "LB",
  website: null,
  bio: "",
  about: "",
  audience: "",
  keywords: [],
  hashtags: [],
  tone_keywords: [],
  content_pillars: [],
  goals: [],
  platforms: ["instagram"],
  primary_platform: "instagram",
  content_formats: [],
  posting_frequency: "3-4 times per week",
  do: [],
  dont: [],
  sample_phrases: [],
  default_dialect: "levantine",
};

export default function BusinessProfileSettings({ workspaceId }: Props) {
  const qc = useQueryClient();
  const [profile, setProfile] = useState<EditableProfile>(emptyProfile);

  const q = useQuery({
    queryKey: ["workspace", workspaceId, "business-profile"],
    queryFn: () => workspacesApi.businessProfile(workspaceId),
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (!q.data) return;
    setProfile(toEditable(q.data));
  }, [q.data]);

  const save = useMutation({
    mutationFn: () => workspacesApi.updateBusinessProfile(workspaceId, profile),
    onSuccess: (saved) => {
      setProfile(toEditable(saved));
      toast.success("Business profile saved.");
      qc.invalidateQueries();
    },
    onError: (err: unknown) => {
      toast.error(errorMessage(err, "Could not save business profile."));
    },
  });

  function setField<K extends keyof EditableProfile>(
    key: K,
    value: EditableProfile[K],
  ) {
    setProfile((current) => ({ ...current, [key]: value }));
  }

  const loading = q.isLoading || q.isFetching;

  return (
    <div className="space-y-5">
      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle>Business identity</CardTitle>
            <CardDescription>
              Public-facing brand and social profile.
            </CardDescription>
          </div>
          <Badge tone="brand">Born2Hike demo</Badge>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Field label="Business name">
              <Input
                value={profile.business_name}
                onChange={(e) => setField("business_name", e.target.value)}
                placeholder="Born2Hike"
                disabled={loading}
              />
            </Field>
            <Field label="Page name">
              <Input
                value={profile.page_name}
                onChange={(e) => setField("page_name", e.target.value)}
                placeholder="Born2Hike"
                disabled={loading}
              />
            </Field>
            <Field label="Instagram handle">
              <Input
                leftAddon="@"
                value={profile.instagram_handle || ""}
                onChange={(e) => setField("instagram_handle", e.target.value)}
                placeholder="born2hike"
                disabled={loading}
              />
            </Field>
            <Field label="Website">
              <Input
                value={profile.website || ""}
                onChange={(e) => setField("website", e.target.value || null)}
                placeholder="https://example.com"
                disabled={loading}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle>Market context</CardTitle>
            <CardDescription>
              Category, geography, audience, and positioning.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Field label="Category">
              <Select
                value={profile.category}
                onChange={(e) => setField("category", e.target.value)}
                disabled={loading}
              >
                {CATEGORY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Business type">
              <Input
                value={profile.business_type}
                onChange={(e) => setField("business_type", e.target.value)}
                placeholder="community_group"
                disabled={loading}
              />
            </Field>
            <Field label="Location">
              <Input
                value={profile.location}
                onChange={(e) => setField("location", e.target.value)}
                placeholder="Lebanon"
                disabled={loading}
              />
            </Field>
            <Field label="Country">
              <Select
                value={profile.country}
                onChange={(e) => setField("country", e.target.value)}
                disabled={loading}
              >
                {COUNTRIES.map((country) => (
                  <option key={country} value={country}>
                    {country}
                  </option>
                ))}
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Field label="Bio / short description">
              <Textarea
                value={profile.bio}
                onChange={(e) => setField("bio", e.target.value)}
                className="min-h-[118px]"
                placeholder="Lebanon-based hiking community organizing weekend group hikes."
                disabled={loading}
              />
            </Field>
            <Field label="About / positioning">
              <Textarea
                value={profile.about}
                onChange={(e) => setField("about", e.target.value)}
                className="min-h-[118px]"
                placeholder="Focus on safe group hikes, trails, waterfalls, mountain views, and eco tourism."
                disabled={loading}
              />
            </Field>
          </div>

          <Field label="Target audience">
            <Textarea
              value={profile.audience}
              onChange={(e) => setField("audience", e.target.value)}
              className="min-h-[86px]"
              placeholder="Local hikers, outdoor travelers, and weekend adventure groups in Lebanon."
              disabled={loading}
            />
          </Field>
        </CardContent>
      </Card>

      <Card padded={false}>
        <CardHeader>
          <div>
            <CardTitle>Discovery seeds</CardTitle>
            <CardDescription>
              Search terms, hashtags, pillars, and tone.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <TagEditor
            label="Keywords"
            placeholder="hiking Lebanon"
            values={profile.keywords}
            onChange={(values) => setField("keywords", values)}
            disabled={loading}
          />
          <TagEditor
            label="Hashtags"
            placeholder="#hikinglebanon"
            values={profile.hashtags}
            onChange={(values) => setField("hashtags", values)}
            normalize={(value) => value.replace(/^#/, "").toLowerCase()}
            disabled={loading}
          />
          <TagEditor
            label="Content pillars"
            placeholder="waterfall hikes"
            values={profile.content_pillars}
            onChange={(values) => setField("content_pillars", values)}
            disabled={loading}
          />
          <TagEditor
            label="Tone keywords"
            placeholder="adventurous"
            values={profile.tone_keywords}
            onChange={(values) => setField("tone_keywords", values)}
            disabled={loading}
          />
          <TagEditor
            label="Goals"
            placeholder="increase engagement"
            values={profile.goals}
            onChange={(values) => setField("goals", values)}
            disabled={loading}
          />
          <TagEditor
            label="Content formats"
            placeholder="reels"
            values={profile.content_formats}
            onChange={(values) => setField("content_formats", values)}
            disabled={loading}
          />
          <TagEditor
            label="Platforms"
            placeholder="instagram"
            values={profile.platforms}
            onChange={(values) => setField("platforms", values)}
            normalize={(value) => value.toLowerCase()}
            disabled={loading}
          />
          <Field label="Primary platform">
            <Select
              value={profile.primary_platform}
              onChange={(e) => setField("primary_platform", e.target.value)}
              disabled={loading}
            >
              {PLATFORMS.map((platform) => (
                <option key={platform} value={platform}>
                  {labelize(platform)}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Posting frequency">
            <Input
              value={profile.posting_frequency}
              onChange={(e) => setField("posting_frequency", e.target.value)}
              placeholder="3-4 times per week"
              disabled={loading}
            />
          </Field>
          <Field label="Default Arabic dialect">
            <Select
              value={profile.default_dialect}
              onChange={(e) =>
                setField("default_dialect", e.target.value as Dialect)
              }
              disabled={loading}
            >
              {DIALECTS.map((dialect) => (
                <option key={dialect} value={dialect}>
                  {labelize(dialect)}
                </option>
              ))}
            </Select>
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row justify-end gap-2">
        <Button
          type="button"
          onClick={() => save.mutate()}
          loading={save.isPending}
          leftIcon={<Save className="h-4 w-4" />}
        >
          Save settings
        </Button>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="mt-1">{children}</div>
    </label>
  );
}

function TagEditor({
  label,
  placeholder,
  values,
  onChange,
  normalize = (value) => value,
  disabled,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  normalize?: (value: string) => string;
  disabled?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function addCurrent() {
    const value = normalize(draft.trim().replace(/,+$/, ""));
    if (!value || values.includes(value) || values.length >= 30) {
      setDraft("");
      return;
    }
    onChange([...values, value]);
    setDraft("");
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addCurrent();
    } else if (e.key === "Backspace" && !draft && values.length) {
      onChange(values.slice(0, -1));
    }
  }

  return (
    <div>
      <div className="label">{label}</div>
      <div className="mt-1 rounded-lg border border-border bg-surface px-2 py-2 flex items-center gap-1 flex-wrap min-h-[42px]">
        {values.map((value) => (
          <Badge key={value} tone="brand" size="md" className="gap-1.5">
            {label === "Hashtags" ? `#${value.replace(/^#/, "")}` : value}
            <button
              type="button"
              aria-label={`Remove ${value}`}
              className="opacity-70 hover:opacity-100"
              onClick={() => onChange(values.filter((item) => item !== value))}
              disabled={disabled}
            >
              <X className="h-3 w-3" />
            </button>
          </Badge>
        ))}
        <input
          className="flex-1 min-w-[140px] bg-transparent border-0 px-1 py-1 text-sm focus:outline-none disabled:opacity-60"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addCurrent}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

function toEditable(profile: BusinessProfile): EditableProfile {
  const { workspace_id: _workspaceId, ...rest } = profile;
  return {
    ...emptyProfile,
    ...rest,
    keywords: profile.keywords || [],
    hashtags: profile.hashtags || [],
    tone_keywords: profile.tone_keywords || [],
    content_pillars: profile.content_pillars || [],
    goals: profile.goals || [],
    platforms: profile.platforms || [],
    primary_platform: profile.primary_platform || "instagram",
    content_formats: profile.content_formats || [],
    posting_frequency: profile.posting_frequency || "3-4 times per week",
    default_dialect: profile.default_dialect || "levantine",
  };
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function errorMessage(err: unknown, fallback: string) {
  return err instanceof Error && err.message ? err.message : fallback;
}
