"use client";

import { Filter, X } from "lucide-react";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";
import type { CaptionLang, Provider } from "@/lib/types";

export type Range = "7d" | "30d" | "90d";
export type LangFilter = "all" | CaptionLang;

type PlatformOption = { value: Provider; label: string };

const PLATFORM_OPTIONS: PlatformOption[] = [
  { value: "meta_instagram", label: "Instagram" },
  { value: "meta_facebook", label: "Facebook" },
  { value: "tiktok", label: "TikTok" },
  { value: "x", label: "X" },
];

export type DashboardFiltersProps = {
  platforms: Provider[];
  onPlatformsChange: (next: Provider[]) => void;
  lang: LangFilter;
  onLangChange: (l: LangFilter) => void;
  range: Range;
  onRangeChange: (r: Range) => void;
  onClear: () => void;
};

export default function DashboardFilters({
  platforms,
  onPlatformsChange,
  lang,
  onLangChange,
  range,
  onRangeChange,
  onClear,
}: DashboardFiltersProps) {
  const { t } = useI18n();

  const togglePlatform = (p: Provider) => {
    onPlatformsChange(
      platforms.includes(p)
        ? platforms.filter((x) => x !== p)
        : [...platforms, p],
    );
  };

  const activeCount =
    platforms.length + (lang !== "all" ? 1 : 0) + (range !== "30d" ? 1 : 0);

  return (
    <div className="sticky top-[56px] z-10 -mx-1 px-1 py-2 bg-bg/90 supports-[backdrop-filter]:backdrop-blur-md border-b border-border/60">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-fg-muted shrink-0">
          <Filter className="h-3.5 w-3.5" />
          <span className="font-medium text-fg">
            {t("hub.filters.title", "Filters")}
          </span>
          {activeCount > 0 ? (
            <Badge tone="brand" size="sm">
              {activeCount}
            </Badge>
          ) : null}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Platform chips */}
        <div className="flex items-center gap-1 flex-wrap">
          {PLATFORM_OPTIONS.map((p) => {
            const active = platforms.includes(p.value);
            return (
              <button
                key={p.value}
                type="button"
                onClick={() => togglePlatform(p.value)}
                className={cn(
                  "h-7 px-2.5 rounded-full text-xs font-medium border transition-colors",
                  active
                    ? "bg-primary text-primary-fg border-primary"
                    : "bg-surface text-fg-muted border-border hover:bg-surface-muted hover:text-fg",
                )}
                aria-pressed={active}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div className="h-5 w-px bg-border mx-1" />

        {/* Language */}
        <SegmentedControl<LangFilter>
          value={lang}
          onChange={onLangChange}
          size="sm"
          options={[
            { value: "all", label: t("hub.lang.all", "All") },
            { value: "ar", label: "AR" },
            { value: "en", label: "EN" },
            { value: "mixed", label: t("hub.lang.mixed", "Mixed") },
          ]}
        />

        <div className="h-5 w-px bg-border mx-1" />

        {/* Range */}
        <SegmentedControl<Range>
          value={range}
          onChange={onRangeChange}
          size="sm"
          options={[
            { value: "7d", label: t("overview.range.7d", "7d") },
            { value: "30d", label: t("overview.range.30d", "30d") },
            { value: "90d", label: t("overview.range.90d", "90d") },
          ]}
        />

        <div className="ms-auto">
          {activeCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={onClear}
              leftIcon={<X className="h-3 w-3" />}
            >
              {t("hub.filters.clear", "Clear")}
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
