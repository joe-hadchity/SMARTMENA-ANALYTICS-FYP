"use client";

import { Clock } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const HOUR_DATA = [
  { hour: "12 AM", value: 12 },
  { hour: "3 AM", value: 8 },
  { hour: "6 AM", value: 15 },
  { hour: "9 AM", value: 45 },
  { hour: "12 PM", value: 62 },
  { hour: "3 PM", value: 78 },
  { hour: "6 PM", value: 95 },
  { hour: "9 PM", value: 100 },
];

export default function BestTimeStrip({ primary = "oklch(46% 0.108 320)" }: { primary?: string }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: "white",
        border: "1px solid oklch(88% 0.022 320)",
        boxShadow: "0 1px 3px rgba(30,22,12,0.06)",
      }}
    >
      <div className="flex items-center gap-3 mb-4">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center"
          style={{ background: "oklch(92% 0.050 60)", color: primary }}
        >
          <Clock className="w-4 h-4" />
        </div>
        <div>
          <h3
            className="text-sm font-semibold"
            style={{
              fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
              color: "oklch(22% 0.050 320)",
            }}
          >
            {t("overview.bestTime.title", "Best Time to Post")}
          </h3>
          <p
            className="text-[11px]"
            style={{
              fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
              color: "oklch(52% 0.050 320)",
            }}
          >
            {t("overview.bestTime.subtitle", "Based on your audience engagement patterns")}
          </p>
        </div>
      </div>

      <div className="flex items-end justify-between gap-2 h-32">
        {HOUR_DATA.map((item) => {
          const heightPercent = item.value;
          const isPeak = item.value > 90;

          return (
            <div key={item.hour} className="flex-1 flex flex-col items-center gap-2">
              <div className="w-full flex items-end justify-center" style={{ height: "100px" }}>
                <div
                  className="w-full rounded-t transition-all hover:opacity-80"
                  style={{
                    height: `${heightPercent}%`,
                    background: isPeak
                      ? primary
                      : `linear-gradient(to top, oklch(88% 0.022 320), oklch(94% 0.015 320))`,
                  }}
                />
              </div>
              <span
                className="text-[9px] font-semibold"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: isPeak ? primary : "oklch(52% 0.050 320)",
                }}
              >
                {item.hour}
              </span>
            </div>
          );
        })}
      </div>

      <div
        className="mt-4 pt-3 border-t text-center text-[11px] leading-relaxed"
        style={{
          borderColor: "oklch(88% 0.022 320)",
          fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
          color: "oklch(40% 0.040 320)",
        }}
      >
        {t("overview.bestTime.insight", "Peak engagement: 7-10 PM GST · Schedule your content during these hours for maximum reach")}
      </div>
    </div>
  );
}
