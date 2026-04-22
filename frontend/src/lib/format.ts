import type { Locale } from "./types";

export function formatNumber(value: number | null | undefined, locale: Locale = "en") {
  if (value == null) return "—";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US").format(
      value,
    );
  } catch {
    return String(value);
  }
}

export function formatPercent(value: number | null | undefined, digits = 1, locale: Locale = "en") {
  if (value == null || Number.isNaN(value)) return "—";
  try {
    return new Intl.NumberFormat(locale === "ar" ? "ar-EG" : "en-US", {
      style: "percent",
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    }).format(value);
  } catch {
    return `${(value * 100).toFixed(digits)}%`;
  }
}

export function formatDate(input: string | null | undefined, locale: Locale = "en") {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  try {
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-EG" : "en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(d);
  } catch {
    return d.toISOString();
  }
}

export function relativeDate(input: string | null | undefined, locale: Locale = "en") {
  if (!input) return "—";
  const d = new Date(input);
  const diffMs = Date.now() - d.getTime();
  const diffSec = Math.round(diffMs / 1000);
  const absSec = Math.abs(diffSec);

  const rtf = new Intl.RelativeTimeFormat(
    locale === "ar" ? "ar-EG" : "en-US",
    { numeric: "auto" },
  );

  if (absSec < 60) return rtf.format(-Math.round(diffSec), "second");
  if (absSec < 3600) return rtf.format(-Math.round(diffSec / 60), "minute");
  if (absSec < 86400) return rtf.format(-Math.round(diffSec / 3600), "hour");
  return rtf.format(-Math.round(diffSec / 86400), "day");
}
