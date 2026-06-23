"use client";

import { Facebook, Instagram, LayoutGrid } from "lucide-react";

import { useI18n } from "@/i18n/I18nProvider";
import { cn } from "@/lib/utils";

const PLATFORMS = [
  {
    id: "all",
    label: "All Platforms",
    labelAr: "الكل",
    icon: LayoutGrid,
    color: "oklch(46% 0.108 320)",
  },
  {
    id: "meta_instagram",
    label: "Instagram",
    labelAr: "انستغرام",
    icon: Instagram,
    color: "#E1306C",
  },
  {
    id: "meta_facebook",
    label: "Facebook",
    labelAr: "فيسبوك",
    icon: Facebook,
    color: "#1877F2",
  },
];

interface PlatformFilterStripProps {
  active: string[];
  onChange: (platformId: string) => void;
}

export function PlatformFilterStrip({
  active,
  onChange,
}: PlatformFilterStripProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  return (
    <div className={`flex gap-2 flex-wrap ${ar ? "flex-row-reverse" : ""}`}>
      {PLATFORMS.map((platform) => {
        const Icon = platform.icon;
        const isActive =
          platform.id === "all" ? active.length === 0 : active.includes(platform.id);

        return (
          <button
            key={platform.id}
            onClick={() => onChange(platform.id)}
            className={cn(
              "px-3 py-1.5 rounded-full text-xs font-medium",
              "flex items-center gap-1.5 transition-all duration-150",
              "border",
              isActive ? "border-transparent text-white" : ""
            )}
            style={
              isActive
                ? { backgroundColor: platform.color }
                : {
                    borderColor: "oklch(var(--border))",
                    color: "oklch(var(--fg-muted))",
                  }
            }
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = platform.color;
                e.currentTarget.style.color = "oklch(var(--fg))";
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.borderColor = "oklch(var(--border))";
                e.currentTarget.style.color = "oklch(var(--fg-muted))";
              }
            }}
          >
            <Icon className="w-3.5 h-3.5" />
            {ar ? platform.labelAr : platform.label}
          </button>
        );
      })}
    </div>
  );
}
