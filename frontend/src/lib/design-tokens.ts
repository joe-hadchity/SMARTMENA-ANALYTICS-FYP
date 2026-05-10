/**
 * SmartMENA Design Tokens v2
 * OKLCH color system for perceptually uniform color representation
 */

export const TOKENS = {
  // Brand scales — oklch with consistent chroma per scale
  teal: {
    50: 'oklch(97% 0.018 195)',
    100: 'oklch(93% 0.038 195)',
    200: 'oklch(86% 0.072 195)',
    300: 'oklch(76% 0.108 195)',
    400: 'oklch(66% 0.128 195)',
    500: 'oklch(56% 0.130 195)',
    600: 'oklch(46% 0.110 195)',
    700: 'oklch(38% 0.088 195)',
    800: 'oklch(30% 0.066 195)',
    900: 'oklch(22% 0.044 195)',
  },
  amber: {
    50: 'oklch(97% 0.024 60)',
    100: 'oklch(93% 0.052 60)',
    200: 'oklch(87% 0.094 60)',
    300: 'oklch(80% 0.130 60)',
    400: 'oklch(74% 0.150 60)',
    500: 'oklch(68% 0.162 60)',
    600: 'oklch(58% 0.150 60)',
    700: 'oklch(48% 0.124 60)',
    800: 'oklch(38% 0.094 60)',
    900: 'oklch(28% 0.062 60)',
  },
  terra: {
    50: 'oklch(97% 0.014 30)',
    100: 'oklch(92% 0.030 30)',
    200: 'oklch(85% 0.058 30)',
    300: 'oklch(76% 0.090 30)',
    400: 'oklch(66% 0.118 30)',
    500: 'oklch(56% 0.130 30)',
    600: 'oklch(46% 0.118 30)',
    700: 'oklch(38% 0.094 30)',
    800: 'oklch(30% 0.070 30)',
    900: 'oklch(22% 0.046 30)',
  },
  ink: {
    50: 'oklch(98% 0.004 50)',
    100: 'oklch(95% 0.006 50)',
    200: 'oklch(90% 0.008 50)',
    300: 'oklch(82% 0.010 50)',
    400: 'oklch(68% 0.012 50)',
    500: 'oklch(52% 0.012 50)',
    600: 'oklch(40% 0.012 50)',
    700: 'oklch(30% 0.012 50)',
    800: 'oklch(22% 0.012 50)',
    900: 'oklch(15% 0.012 50)',
  },
  // Surfaces
  bg: 'oklch(97.8% 0.007 72)',
  bgDark: 'oklch(14% 0.012 48)',
  surface: 'oklch(100% 0 0)',
  surfaceDark: 'oklch(18% 0.014 48)',
  sidebar: 'oklch(15% 0.014 48)',
  sidebarHi: 'oklch(20% 0.016 48)',
  hairline: 'oklch(90% 0.008 50)',
  hairlineDark: 'oklch(26% 0.014 48)',
  // Platform brand colors (for chart strokes only)
  ig: '#E1306C',
  fb: '#1877F2',
  // Radii
  r: {
    sm: 6,
    md: 10,
    lg: 14,
  },
  // Shadows
  shadow: {
    xs: '0 1px 2px oklch(20% 0.012 50 / 0.06)',
    sm: '0 1px 2px oklch(20% 0.012 50 / 0.05), 0 2px 6px oklch(20% 0.012 50 / 0.04)',
    md: '0 2px 4px oklch(20% 0.012 50 / 0.05), 0 8px 18px oklch(20% 0.012 50 / 0.06)',
    lg: '0 6px 12px oklch(20% 0.012 50 / 0.08), 0 24px 48px oklch(20% 0.012 50 / 0.10)',
  },
} as const;

// Helper functions for formatting
export function formatNumber(n: number, locale: string = 'en'): string {
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
  if (n >= 1000000)
    return (
      new Intl.NumberFormat(loc, { maximumFractionDigits: 1 }).format(n / 1000000) +
      (locale === 'ar' ? 'م' : 'M')
    );
  if (n >= 1000)
    return (
      new Intl.NumberFormat(loc, { maximumFractionDigits: 0 }).format(n / 1000) +
      (locale === 'ar' ? 'ك' : 'K')
    );
  return new Intl.NumberFormat(loc).format(n);
}

export function formatPct(n: number, locale: string = 'en'): string {
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
  return (
    new Intl.NumberFormat(loc, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(n) + '%'
  );
}

export function formatDelta(n: number, isPct: boolean, locale: string = 'en'): string {
  const loc = locale === 'ar' ? 'ar-EG' : 'en-US';
  const sign = n > 0 ? '+' : n < 0 ? '−' : '';
  const v = Math.abs(n);
  return (
    sign +
    new Intl.NumberFormat(loc, {
      minimumFractionDigits: 1,
      maximumFractionDigits: 1,
    }).format(v) +
    '%'
  );
}

// Hijri calendar conversion (simplified)
export function toHijri(date: Date): { day: number; month: number; year: number } {
  // Simplified Hijri conversion (using approximate formula)
  const gregorianYear = date.getFullYear();
  const gregorianMonth = date.getMonth() + 1;
  const gregorianDay = date.getDate();

  // Approximate Hijri date calculation
  const hijriYear = Math.floor((gregorianYear - 622) * 1.030684);
  const hijriMonth = Math.floor((gregorianMonth + 8) % 12) + 1;
  const hijriDay = gregorianDay;

  return {
    day: hijriDay,
    month: hijriMonth,
    year: hijriYear + 1,
  };
}

export const HIJRI_MONTHS_EN = [
  'Muharram',
  'Safar',
  'Rabi al-Awwal',
  'Rabi al-Thani',
  'Jumada al-Awwal',
  'Jumada al-Thani',
  'Rajab',
  'Shaban',
  'Ramadan',
  'Shawwal',
  'Dhu al-Qidah',
  'Dhu al-Hijjah',
];

export const HIJRI_MONTHS_AR = [
  'محرم',
  'صفر',
  'ربيع الأول',
  'ربيع الثاني',
  'جمادى الأولى',
  'جمادى الثانية',
  'رجب',
  'شعبان',
  'رمضان',
  'شوال',
  'ذو القعدة',
  'ذو الحجة',
];
