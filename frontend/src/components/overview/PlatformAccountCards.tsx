"use client";

import { Instagram, Facebook } from "lucide-react";
import { useI18n } from "@/i18n/I18nProvider";
import { formatNumber } from "@/lib/format";

interface PlatformAccount {
  platform: "instagram" | "facebook";
  handle: string;
  followers: number;
  posts: number;
  engagement: number;
  delta: number;
  color: string;
  borderColor: string;
}

const DEMO_ACCOUNTS: PlatformAccount[] = [
  {
    platform: "instagram",
    handle: "@levantgroup",
    followers: 142300,
    posts: 31,
    engagement: 6.47,
    delta: 6.2,
    color: "oklch(50% 0.180 340)",
    borderColor: "oklch(50% 0.180 340)",
  },
  {
    platform: "facebook",
    handle: "Levant Group",
    followers: 42100,
    posts: 16,
    engagement: 5.71,
    delta: 3.4,
    color: "oklch(45% 0.130 240)",
    borderColor: "oklch(45% 0.130 240)",
  },
];

export default function PlatformAccountCards() {
  const { locale } = useI18n();
  const ar = locale === "ar";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {DEMO_ACCOUNTS.map((account) => (
        <div
          key={account.platform}
          className="relative overflow-hidden rounded-xl p-5"
          style={{
            background: "white",
            border: `1px solid oklch(88% 0.022 320)`,
            boxShadow: "0 1px 3px rgba(30,22,12,0.06)",
          }}
        >
          {/* Top border accent */}
          <div
            className="absolute top-0 left-0 right-0 h-1"
            style={{ background: account.borderColor }}
          />

          {/* Header with platform icon and handle */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center"
                style={{ background: account.color, color: "white" }}
              >
                {account.platform === "instagram" ? (
                  <Instagram className="w-5 h-5" />
                ) : (
                  <Facebook className="w-5 h-5" />
                )}
              </div>
              <div>
                <div
                  className="text-sm font-semibold"
                  style={{
                    fontFamily: ar ? "'IBM Plex Sans Arabic', sans-serif" : "'IBM Plex Sans', sans-serif",
                    color: "oklch(22% 0.050 320)",
                  }}
                >
                  {account.platform.charAt(0).toUpperCase() + account.platform.slice(1)}
                </div>
                <div
                  className="text-[11px]"
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    color: "oklch(52% 0.050 320)",
                  }}
                >
                  {account.handle}
                </div>
              </div>
            </div>

            {/* Delta badge */}
            <div
              className="flex items-center gap-1 px-2 py-1 rounded"
              style={{
                background: "oklch(97% 0.015 150)",
                color: "oklch(40% 0.090 150)",
              }}
            >
              <span className="text-[10px]">▲</span>
              <span
                className="text-xs font-semibold"
                style={{ fontFamily: "'IBM Plex Mono', monospace" }}
              >
                +{account.delta}%
              </span>
            </div>
          </div>

          {/* Metrics row */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div
                className="text-2xl font-bold"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: "oklch(22% 0.050 320)",
                }}
              >
                {formatNumber(account.followers, locale, "compact")}
              </div>
              <div
                className="text-[10px] uppercase tracking-wider mt-0.5"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "oklch(52% 0.050 320)",
                }}
              >
                Followers
              </div>
            </div>

            <div>
              <div
                className="text-2xl font-bold"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: "oklch(22% 0.050 320)",
                }}
              >
                {account.posts}
              </div>
              <div
                className="text-[10px] uppercase tracking-wider mt-0.5"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "oklch(52% 0.050 320)",
                }}
              >
                Posts
              </div>
            </div>

            <div>
              <div
                className="text-2xl font-bold"
                style={{
                  fontFamily: "'IBM Plex Sans', sans-serif",
                  color: "oklch(22% 0.050 320)",
                }}
              >
                {account.engagement}%
              </div>
              <div
                className="text-[10px] uppercase tracking-wider mt-0.5"
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  color: "oklch(52% 0.050 320)",
                }}
              >
                Engagement
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-4 h-1.5 rounded-full overflow-hidden" style={{ background: "oklch(94% 0.010 320)" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${account.engagement * 10}%`,
                background: `linear-gradient(90deg, ${account.color}, ${account.borderColor})`,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
