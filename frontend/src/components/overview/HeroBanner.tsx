"use client";

import { useI18n } from "@/i18n/I18nProvider";
import { TOKENS } from "@/lib/design-tokens";
import { gregorianToHijri, HIJRI_MONTHS_EN, HIJRI_MONTHS_AR } from "@/lib/hijri";

const MONTHS_EN = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'];

interface HeroBannerProps {
  primary?: string;
  workspaceName?: string;
  accountHandle?: string | null;
  accountBio?: string | null;
}

export default function HeroBanner({
  primary = "oklch(46% 0.108 320)",
  workspaceName = "SmartMENA",
  accountHandle = null,
  accountBio = null
}: HeroBannerProps) {
  const { t, locale } = useI18n();
  const ar = locale === "ar";

  const today = new Date();
  const months = ar ? MONTHS_AR : MONTHS_EN;
  const greg = `${today.getDate()} ${months[today.getMonth()]} ${today.getFullYear()}`;

  const hijri = gregorianToHijri(today);
  const hijriMonths = ar ? HIJRI_MONTHS_AR : HIJRI_MONTHS_EN;
  const hijriStr = `${hijri.day} ${hijriMonths[hijri.month - 1]} ${hijri.year}`;

  const title = accountHandle || t("overview.title", "Performance Overview");
  const tagline = accountBio || (ar ? "نبض علامتك اليوم، بلطف." : "today's brand pulse, kindly.");
  const handFont = ar ? "'Kalam', cursive" : "'Caveat', cursive";

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 14,
        padding: '22px 26px',
        background: ar
          ? `linear-gradient(270deg, oklch(94% 0.040 320) 0%, oklch(96% 0.024 330) 55%, oklch(98% 0.014 80) 100%)`
          : `linear-gradient(90deg, oklch(94% 0.040 320) 0%, oklch(96% 0.024 330) 55%, oklch(98% 0.014 80) 100%)`,
        borderLeft: ar ? 'none' : `3px solid ${primary}`,
        borderRight: ar ? `3px solid ${primary}` : 'none',
        boxShadow: '0 2px 8px rgba(120,70,110,0.06)',
        display: 'flex',
        flexDirection: ar ? 'row-reverse' : 'row',
        alignItems: 'center',
        gap: 18,
      }}
    >
      {/* Decorative dashed circle */}
      <div
        style={{
          position: 'absolute',
          [ar ? 'left' : 'right']: -30,
          top: -30,
          width: 120,
          height: 120,
          borderRadius: '50%',
          border: `1.5px dashed ${primary}`,
          opacity: 0.18,
        }}
      />
      <div
        style={{
          position: 'absolute',
          [ar ? 'left' : 'right']: 50,
          top: 30,
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: primary,
          opacity: 0.35,
        }}
      />

      <div
        style={{
          flex: 1,
          textAlign: ar ? 'right' : 'left',
          minWidth: 0,
          position: 'relative',
        }}
      >
        <div
          style={{
            fontFamily: "'IBM Plex Mono', monospace",
            fontSize: 10.5,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            color: 'oklch(38% 0.060 320)',
            marginBottom: 6,
          }}
        >
          {ar ? 'لوحة الأداء' : 'performance overview'}
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            gap: 14,
            flexDirection: ar ? 'row-reverse' : 'row',
            flexWrap: 'wrap',
          }}
        >
          <h1
            style={{
              fontFamily: ar
                ? "'IBM Plex Sans Arabic', sans-serif"
                : 'Newsreader, serif',
              fontWeight: 500,
              fontSize: 30,
              letterSpacing: '-0.01em',
              color: TOKENS.ink[900],
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          <span
            style={{
              fontFamily: handFont,
              fontSize: 22,
              fontWeight: 500,
              color: 'oklch(46% 0.108 320)',
              lineHeight: 1,
            }}
          >
            — {tagline}
          </span>
        </div>
      </div>

      {/* Date display - Gregorian only */}
      <div
        style={{
          flexShrink: 0,
          textAlign: ar ? 'left' : 'right',
          padding: ar ? '0 14px 0 0' : '0 0 0 14px',
          borderLeft: ar ? 'none' : `1px dashed oklch(60% 0.06 320 / 0.5)`,
          borderRight: ar ? `1px dashed oklch(60% 0.06 320 / 0.5)` : 'none',
        }}
      >
        <div
          style={{
            fontFamily: ar
              ? "'IBM Plex Sans Arabic', sans-serif"
              : "'IBM Plex Mono', monospace",
            fontSize: 12,
            color: TOKENS.ink[800],
            fontWeight: 600,
          }}
        >
          {greg}
        </div>
      </div>
    </div>
  );
}
