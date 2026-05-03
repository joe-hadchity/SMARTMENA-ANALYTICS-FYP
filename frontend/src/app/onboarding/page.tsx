"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Compass,
  Hash,
  MapPin,
  Mountain,
  Target,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { setStoredWorkspaceId, workspacesApi } from "@/lib/api";
import type { BusinessProfile, Dialect } from "@/lib/types";

type Draft = Omit<BusinessProfile, "workspace_id">;

const steps = [
  { title: "Business", icon: Mountain },
  { title: "Market", icon: MapPin },
  { title: "Audience", icon: Users },
  { title: "Channels", icon: Target },
  { title: "Discovery", icon: Hash },
];

const countries = ["LB", "AE", "SA", "EG", "JO", "QA", "KW", "OM", "BH", "MA"];
const platforms = ["instagram", "facebook", "tiktok", "youtube", "x"];
const categories = [
  "hiking_group",
  "outdoor_travel",
  "eco_tourism",
  "adventure_experiences",
  "fitness_community",
];
const dialects: Dialect[] = ["levantine", "msa", "khaleeji", "egyptian", "maghrebi"];

const defaultDraft: Draft = {
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
    "Lebanon-based hiking community organizing safe weekend hikes and outdoor adventures.",
  about:
    "Group hikes, Lebanese trails, mountain escapes, waterfalls, safety, and eco tourism.",
  audience:
    "Local hikers, outdoor travelers, students, young professionals, and weekend adventure groups in Lebanon.",
  keywords: [
    "hiking Lebanon",
    "Lebanon trails",
    "group hikes",
    "outdoor adventure Lebanon",
  ],
  hashtags: ["hikinglebanon", "lebanontrails", "hiking", "outdoorlebanon"],
  tone_keywords: ["adventurous", "community", "safe", "local"],
  content_pillars: ["group hikes", "trail discovery", "waterfall hikes"],
  goals: ["increase engagement", "get more hike bookings", "discover local trends"],
  platforms: ["instagram", "facebook"],
  primary_platform: "instagram",
  content_formats: ["reels", "carousels", "stories", "event announcements"],
  posting_frequency: "3-4 times per week",
  do: [],
  dont: [],
  sample_phrases: [],
  default_dialect: "levantine",
};

export default function OnboardingPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<Draft>(defaultDraft);

  const workspaceQ = useQuery({
    queryKey: ["workspace", "current"],
    queryFn: workspacesApi.current,
  });
  const workspaceId = workspaceQ.data?.id;

  const profileQ = useQuery({
    queryKey: ["workspace", workspaceId, "business-profile"],
    queryFn: () => workspacesApi.businessProfile(workspaceId as string),
    enabled: Boolean(workspaceId),
  });

  useEffect(() => {
    if (!profileQ.data) return;
    setDraft(toDraft(profileQ.data));
  }, [profileQ.data]);

  const save = useMutation({
    mutationFn: async () => {
      if (!workspaceId) throw new Error("Workspace is still loading.");
      return workspacesApi.updateBusinessProfile(workspaceId, {
        ...draft,
        onboarding_completed: true,
      });
    },
    onSuccess: () => {
      if (workspaceId) setStoredWorkspaceId(workspaceId);
      toast.success("Profile ready. SmartMENA is customized for your business.");
      qc.invalidateQueries();
      router.replace("/");
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not finish onboarding.");
    },
  });

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;
  const loading = workspaceQ.isLoading || profileQ.isLoading;

  const summary = useMemo(
    () => [
      draft.category.replace(/_/g, " "),
      draft.location,
      draft.primary_platform,
    ].filter(Boolean).join(" / "),
    [draft.category, draft.location, draft.primary_platform],
  );

  function setField<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function next() {
    if (step < steps.length - 1) setStep((value) => value + 1);
    else save.mutate();
  }

  return (
    <main className="min-h-screen bg-bg text-fg">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-6 md:px-8">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-lg bg-primary text-primary-fg">
              <Compass className="h-5 w-5" />
            </div>
            <div>
              <div className="text-sm font-semibold">SmartMENA setup</div>
              <div className="text-xs text-fg-muted">Business intelligence profile</div>
            </div>
          </div>
          <Badge tone="brand">{summary || "Born2Hike demo"}</Badge>
        </header>

        <section className="grid flex-1 grid-cols-1 gap-6 py-8 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4">
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">
                Let SmartMENA learn your business.
              </h1>
              <p className="mt-2 text-sm text-fg-muted">
                These answers customize competitors, trends, recommendations,
                reports, and the assistant.
              </p>
            </div>
            <div className="h-2 rounded-full bg-surface-muted">
              <div
                className="h-full rounded-full bg-primary transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <nav className="space-y-2">
              {steps.map((item, index) => {
                const Icon = item.icon;
                const active = index === step;
                const done = index < step;
                return (
                  <button
                    key={item.title}
                    type="button"
                    onClick={() => setStep(index)}
                    className={`flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left text-sm transition ${
                      active
                        ? "border-primary bg-primary-soft text-primary"
                        : "border-border bg-surface text-fg hover:bg-surface-muted"
                    }`}
                  >
                    <span className="grid h-7 w-7 place-items-center rounded-md bg-surface">
                      {done ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                    </span>
                    {item.title}
                  </button>
                );
              })}
            </nav>
          </aside>

          <Card padded={false} className="self-start">
            <CardHeader>
              <CardTitle>{currentStep.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {loading ? (
                <div className="text-sm text-fg-muted">Loading workspace...</div>
              ) : null}

              {step === 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Business name">
                    <Input
                      value={draft.business_name}
                      onChange={(e) => setField("business_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Page name">
                    <Input
                      value={draft.page_name}
                      onChange={(e) => setField("page_name", e.target.value)}
                    />
                  </Field>
                  <Field label="Instagram handle">
                    <Input
                      leftAddon="@"
                      value={draft.instagram_handle || ""}
                      onChange={(e) => setField("instagram_handle", e.target.value)}
                    />
                  </Field>
                  <Field label="Website">
                    <Input
                      value={draft.website || ""}
                      onChange={(e) => setField("website", e.target.value || null)}
                      placeholder="https://example.com"
                    />
                  </Field>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Field label="Category">
                    <Select
                      value={draft.category}
                      onChange={(e) => setField("category", e.target.value)}
                    >
                      {categories.map((category) => (
                        <option key={category} value={category}>
                          {labelize(category)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Business type">
                    <Input
                      value={draft.business_type}
                      onChange={(e) => setField("business_type", e.target.value)}
                    />
                  </Field>
                  <Field label="Location">
                    <Input
                      value={draft.location}
                      onChange={(e) => setField("location", e.target.value)}
                    />
                  </Field>
                  <Field label="Country">
                    <Select
                      value={draft.country}
                      onChange={(e) => setField("country", e.target.value)}
                    >
                      {countries.map((country) => (
                        <option key={country} value={country}>
                          {country}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <Field label="Bio">
                    <Textarea
                      value={draft.bio}
                      onChange={(e) => setField("bio", e.target.value)}
                      className="min-h-[120px]"
                    />
                  </Field>
                  <Field label="About">
                    <Textarea
                      value={draft.about}
                      onChange={(e) => setField("about", e.target.value)}
                      className="min-h-[120px]"
                    />
                  </Field>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="space-y-4">
                  <Field label="Target audience">
                    <Textarea
                      value={draft.audience}
                      onChange={(e) => setField("audience", e.target.value)}
                      className="min-h-[120px]"
                    />
                  </Field>
                  <TagEditor
                    label="Business goals"
                    placeholder="get more bookings"
                    values={draft.goals}
                    onChange={(values) => setField("goals", values)}
                  />
                  <TagEditor
                    label="Tone keywords"
                    placeholder="adventurous"
                    values={draft.tone_keywords}
                    onChange={(values) => setField("tone_keywords", values)}
                  />
                </div>
              ) : null}

              {step === 3 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <TagEditor
                    label="Platforms"
                    placeholder="instagram"
                    values={draft.platforms}
                    onChange={(values) => setField("platforms", values)}
                    normalize={(value) => value.toLowerCase()}
                  />
                  <Field label="Primary platform">
                    <Select
                      value={draft.primary_platform}
                      onChange={(e) => setField("primary_platform", e.target.value)}
                    >
                      {platforms.map((platform) => (
                        <option key={platform} value={platform}>
                          {labelize(platform)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                  <TagEditor
                    label="Content formats"
                    placeholder="reels"
                    values={draft.content_formats}
                    onChange={(values) => setField("content_formats", values)}
                  />
                  <Field label="Posting frequency">
                    <Input
                      value={draft.posting_frequency}
                      onChange={(e) => setField("posting_frequency", e.target.value)}
                    />
                  </Field>
                  <Field label="Default Arabic dialect">
                    <Select
                      value={draft.default_dialect}
                      onChange={(e) =>
                        setField("default_dialect", e.target.value as Dialect)
                      }
                    >
                      {dialects.map((dialect) => (
                        <option key={dialect} value={dialect}>
                          {labelize(dialect)}
                        </option>
                      ))}
                    </Select>
                  </Field>
                </div>
              ) : null}

              {step === 4 ? (
                <div className="space-y-4">
                  <TagEditor
                    label="Search keywords"
                    placeholder="hiking Lebanon"
                    values={draft.keywords}
                    onChange={(values) => setField("keywords", values)}
                  />
                  <TagEditor
                    label="Hashtags"
                    placeholder="#hikinglebanon"
                    values={draft.hashtags}
                    onChange={(values) => setField("hashtags", values)}
                    normalize={(value) => value.replace(/^#/, "").toLowerCase()}
                    hashtag
                  />
                  <TagEditor
                    label="Content pillars"
                    placeholder="waterfall hikes"
                    values={draft.content_pillars}
                    onChange={(values) => setField("content_pillars", values)}
                  />
                  <div className="rounded-lg border border-border bg-surface-muted p-3 text-sm text-fg-muted">
                    After this, SmartMENA will use these answers to search for
                    real competitors, rank trend evidence, and customize your
                    dashboard.
                  </div>
                </div>
              ) : null}

              <div className="flex items-center justify-between border-t border-border pt-4">
                <Button
                  variant="ghost"
                  onClick={() => setStep((value) => Math.max(0, value - 1))}
                  disabled={step === 0 || save.isPending}
                  leftIcon={<ArrowLeft className="h-4 w-4" />}
                >
                  Back
                </Button>
                <Button
                  onClick={next}
                  loading={save.isPending}
                  rightIcon={
                    step === steps.length - 1 ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      <ArrowRight className="h-4 w-4" />
                    )
                  }
                >
                  {step === steps.length - 1 ? "Finish setup" : "Continue"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </main>
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
  hashtag = false,
}: {
  label: string;
  placeholder: string;
  values: string[];
  onChange: (values: string[]) => void;
  normalize?: (value: string) => string;
  hashtag?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function addCurrent() {
    const value = normalize(draft.trim().replace(/,+$/, ""));
    if (!value || values.includes(value)) {
      setDraft("");
      return;
    }
    onChange([...values, value].slice(0, 30));
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
      <div className="mt-1 flex min-h-[42px] flex-wrap items-center gap-1 rounded-lg border border-border bg-surface px-2 py-2">
        {values.map((value) => (
          <Badge key={value} tone="brand" size="md">
            {hashtag ? `#${value.replace(/^#/, "")}` : value}
          </Badge>
        ))}
        <input
          className="min-w-[140px] flex-1 bg-transparent px-1 py-1 text-sm outline-none placeholder:text-fg-subtle"
          placeholder={placeholder}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKeyDown}
          onBlur={addCurrent}
        />
      </div>
    </div>
  );
}

function toDraft(profile: BusinessProfile): Draft {
  const { workspace_id: _workspaceId, ...rest } = profile;
  return {
    ...defaultDraft,
    ...rest,
    onboarding_completed: Boolean(profile.onboarding_completed),
    goals: profile.goals || [],
    platforms: profile.platforms || [],
    content_formats: profile.content_formats || [],
    keywords: profile.keywords || [],
    hashtags: profile.hashtags || [],
    tone_keywords: profile.tone_keywords || [],
    content_pillars: profile.content_pillars || [],
  };
}

function labelize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
