"use client";

import { Clock } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";

const PEAK_SLOTS = ["6 PM", "7 PM", "8 PM", "9 PM", "10 PM"];

export default function BestTimeStrip({ primary = "oklch(46% 0.108 320)" }: { primary?: string }) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "8px 14px",
        borderRadius: 8,
        background: "white",
        border: "1px solid oklch(88% 0.022 320)",
        boxShadow: "0 1px 3px rgba(30,22,12,0.06)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
        <Clock style={{ width: 13, height: 13, color: primary }} />
        <span
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "oklch(40% 0.040 320)",
          }}
        >
          {ar ? "أفضل وقت للنشر" : "Best time to post"}
        </span>
      </div>

      <div style={{ width: 1, height: 16, background: "oklch(88% 0.022 320)", flexShrink: 0 }} />

      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
        {PEAK_SLOTS.map((slot) => (
          <span
            key={slot}
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: 10.5,
              fontWeight: 700,
              color: "white",
              background: primary,
              padding: "2px 8px",
              borderRadius: 4,
              letterSpacing: "0.04em",
            }}
          >
            {slot}
          </span>
        ))}
      </div>

      <span
        style={{
          marginLeft: "auto",
          fontFamily: "'IBM Plex Sans', sans-serif",
          fontSize: 10,
          color: "oklch(52% 0.050 320)",
          flexShrink: 0,
        }}
      >
        {ar ? "GST · أقصى تفاعل" : "GST · peak engagement"}
      </span>
    </div>
  );
}
