// SmartMENA Design Tokens — from Claude Design
// Warm Desert Modernism · Bilingual Arabic/English

export const TOKENS = {
  // Brand (plum)
  teal: {
    50:  'oklch(97% 0.014 320)',
    100: 'oklch(94% 0.028 320)',
    200: 'oklch(88% 0.048 320)',
    300: 'oklch(78% 0.070 320)',
    400: 'oklch(64% 0.092 320)',
    500: 'oklch(54% 0.105 320)',
    600: 'oklch(46% 0.108 320)',
    700: 'oklch(38% 0.094 320)',
    800: 'oklch(30% 0.072 320)',
    900: 'oklch(22% 0.050 320)',
  },
  amber: {
    50:  'oklch(97% 0.018 60)',
    100: 'oklch(94% 0.040 60)',
    200: 'oklch(88% 0.070 60)',
    300: 'oklch(80% 0.100 60)',
    400: 'oklch(72% 0.120 60)',
    500: 'oklch(64% 0.135 60)',
    600: 'oklch(54% 0.130 60)',
    700: 'oklch(44% 0.110 60)',
    800: 'oklch(34% 0.084 60)',
    900: 'oklch(26% 0.060 60)',
  },
  terra: {
    50:  'oklch(97% 0.014 30)',
    100: 'oklch(93% 0.034 30)',
    200: 'oklch(86% 0.060 30)',
    300: 'oklch(76% 0.090 30)',
    400: 'oklch(66% 0.118 30)',
    500: 'oklch(58% 0.135 30)',
    600: 'oklch(50% 0.130 30)',
    700: 'oklch(40% 0.108 30)',
    800: 'oklch(30% 0.080 30)',
    900: 'oklch(22% 0.054 30)',
  },
  ink: {
    50:  'oklch(97% 0.005 50)',
    100: 'oklch(93% 0.007 50)',
    200: 'oklch(86% 0.009 50)',
    300: 'oklch(76% 0.010 50)',
    400: 'oklch(64% 0.012 50)',
    500: 'oklch(50% 0.013 50)',
    600: 'oklch(40% 0.014 50)',
    700: 'oklch(30% 0.014 50)',
    800: 'oklch(22% 0.014 50)',
    900: 'oklch(15% 0.014 50)',
  },
  sage: {
    300: 'oklch(80% 0.060 150)',
    500: 'oklch(58% 0.090 150)',
    600: 'oklch(48% 0.085 150)',
  },
  // Surfaces
  bg:       'oklch(97.8% 0.007 72)',
  surface:  '#ffffff',
  sidebar:  'oklch(15% 0.014 48)',
  hairline: 'oklch(90% 0.008 50)',
  // Platform brand colors
  ig: '#E1306C',
  fb: '#1877F2',
  // Sticky-note pastels
  pastel: {
    blush:    'oklch(94% 0.028 20)',
    lavender: 'oklch(93% 0.030 290)',
    babyblue: 'oklch(94% 0.028 230)',
    mint:     'oklch(94% 0.030 160)',
    cream:    'oklch(95% 0.024 80)',
  },
} as const;

export type PastelColor = keyof typeof TOKENS.pastel;
