"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Building2, Globe, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { setStoredWorkspaceId, workspacesApi } from "@/lib/api";
import { cn } from "@/lib/utils";

const REGIONS = [
  { value: "LB", label: "Lebanon" },
  { value: "AE", label: "United Arab Emirates" },
  { value: "SA", label: "Saudi Arabia" },
  { value: "EG", label: "Egypt" },
  { value: "JO", label: "Jordan" },
  { value: "QA", label: "Qatar" },
  { value: "KW", label: "Kuwait" },
  { value: "BH", label: "Bahrain" },
  { value: "OM", label: "Oman" },
  { value: "MA", label: "Morocco" },
  { value: "TN", label: "Tunisia" },
  { value: "DZ", label: "Algeria" },
  { value: "IQ", label: "Iraq" },
  { value: "PS", label: "Palestine" },
  { value: "SY", label: "Syria" },
  { value: "YE", label: "Yemen" },
  { value: "OTHER", label: "Other" },
];

const INDUSTRIES = [
  "Food & Beverage",
  "Fashion & Apparel",
  "Hospitality & Travel",
  "Beauty & Wellness",
  "Outdoor & Hiking",
  "Real Estate",
  "Education",
  "Healthcare",
  "Retail & E-commerce",
  "Technology & SaaS",
  "Finance",
  "Media & Entertainment",
  "Non-profit",
  "Other",
];

function slugify(s: string): string {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 40);
}

export default function NewWorkspacePage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [slugDirty, setSlugDirty] = useState(false);
  const [slug, setSlug] = useState("");
  const [region, setRegion] = useState("LB");
  const [locale, setLocale] = useState<"ar" | "en">("en");
  const [industry, setIndustry] = useState("");

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugDirty) setSlug(slugify(value));
  };

  const create = useMutation({
    mutationFn: () =>
      workspacesApi.create({
        name: name.trim(),
        slug: slug || slugify(name),
        region_default: region === "OTHER" ? undefined : region,
        locale_default: locale,
        industry: industry || undefined,
      }),
    onSuccess: (ws) => {
      setStoredWorkspaceId(ws.id);
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["workspace", "current"] });
      toast.success("Workspace created", {
        description: `${ws.name} is ready. Connect Instagram next.`,
      });
      router.push("/onboarding");
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : "Could not create workspace");
    },
  });

  const nameValid = name.trim().length >= 2;

  return (
    <div className="min-h-screen bg-bg">
      {/* Slim header */}
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex h-14 max-w-3xl items-center justify-between px-6">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-fg-muted hover:text-fg"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Link>
          <span className="text-xs text-fg-subtle">Step 1 of 2</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <div className="mb-10 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Building2 className="h-6 w-6" />
          </span>
          <h1 className="mt-4 text-2xl font-semibold tracking-tight">
            Create a new workspace
          </h1>
          <p className="mt-2 text-sm text-fg-muted">
            A workspace groups one brand&apos;s social accounts, posts, and analytics.
            You can switch between workspaces anytime from the sidebar.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!create.isPending && nameValid) create.mutate();
          }}
          className="space-y-6 rounded-2xl border border-border bg-surface p-7"
        >
          {/* Name */}
          <Field
            label="Workspace name"
            required
            hint="Usually your brand or company name."
          >
            <input
              type="text"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Born2Hike"
              autoFocus
              maxLength={60}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none ring-primary/20 transition focus:border-primary focus:ring-2"
            />
          </Field>

          {/* Slug */}
          <Field
            label="URL slug"
            hint="Used in links — letters, numbers, dashes only."
          >
            <div className="flex items-center gap-2">
              <span className="rounded-md border border-border bg-surface-muted px-2.5 py-2 text-xs text-fg-muted">
                smartmena.app/
              </span>
              <input
                type="text"
                value={slug}
                onChange={(e) => {
                  setSlugDirty(true);
                  setSlug(slugify(e.target.value));
                }}
                placeholder="born2hike"
                maxLength={40}
                className="flex-1 rounded-md border border-border bg-bg px-3 py-2 font-mono text-sm text-fg outline-none ring-primary/20 transition focus:border-primary focus:ring-2"
              />
            </div>
          </Field>

          {/* Region + locale */}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Primary region" required>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none ring-primary/20 transition focus:border-primary focus:ring-2"
              >
                {REGIONS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Default language" required>
              <div className="grid grid-cols-2 gap-2">
                {(["en", "ar"] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setLocale(opt)}
                    className={cn(
                      "inline-flex items-center justify-center gap-2 rounded-md border px-3 py-2 text-sm transition",
                      locale === opt
                        ? "border-primary bg-primary/10 text-primary font-medium"
                        : "border-border bg-bg text-fg-muted hover:border-primary/30 hover:text-fg",
                    )}
                  >
                    <Globe className="h-3.5 w-3.5" />
                    {opt === "en" ? "English" : "العربية"}
                  </button>
                ))}
              </div>
            </Field>
          </div>

          {/* Industry */}
          <Field label="Industry" hint="Optional — helps tailor recommendations.">
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="w-full rounded-md border border-border bg-bg px-3 py-2 text-sm text-fg outline-none ring-primary/20 transition focus:border-primary focus:ring-2"
            >
              <option value="">Select an industry…</option>
              {INDUSTRIES.map((i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              ))}
            </select>
          </Field>

          {/* Actions */}
          <div className="flex items-center justify-between border-t border-border pt-5">
            <Link
              href="/"
              className="text-sm text-fg-muted hover:text-fg"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!nameValid || create.isPending}
              className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-fg shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {create.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating…
                </>
              ) : (
                <>
                  Create workspace
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-center text-xs text-fg-subtle">
          After creating, you&apos;ll be guided to connect Instagram and import your first
          posts.
        </p>
      </main>
    </div>
  );
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-fg">
        {label}
        {required ? <span className="text-primary">*</span> : null}
      </span>
      {children}
      {hint ? <span className="mt-1 block text-[11px] text-fg-subtle">{hint}</span> : null}
    </label>
  );
}
