// ── dashboard-data.jsx ───────────────────────────────────────
// SmartMENA — TOKENS, STRINGS, mocked analytics data.

// ── TOKENS ───────────────────────────────────────────────────
// Note: `teal` is named historically; the actual hue is plum 320.
const TOKENS = {
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
  // Platform brand colors (chart strokes only)
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
};

// ── STRINGS (EN / AR) ────────────────────────────────────────
const STRINGS = {
  en: {
    brand: 'SmartMENA',
    overview: 'Performance Overview',
    tagline: "today's brand pulse, kindly.",
    sectionAnalytics: 'Analytics',
    sectionContent: 'Content',
    nav: {
      overview: 'Overview', insights: 'Insights', reports: 'Reports',
      trends: 'Trends', competitors: 'Competitors', playbook: 'Playbook',
      compose: 'Compose', calendar: 'Calendar', connections: 'Connections',
    },
    periods: { '7D': '7D', '30D': '30D', '90D': '90D', 'Custom': 'Custom' },
    platforms: { all: 'All', instagram: 'Instagram', facebook: 'Facebook' },
    kpis: {
      reach: 'Reach', impressions: 'Impressions', engagements: 'Engagements',
      ctr: 'CTR', response: 'Avg. response',
    },
    vsLast: 'vs last period',
    search: 'Search posts, hashtags, campaigns…  ⌘K',
    handle: '@levantgroup',
    brandName: 'Levant Group',
    todo: {
      title: "today's to-do",
      sub: 'analyst desk · ',
      moveTomorrow: '→ tomorrow',
      moved: '↻ moved',
    },
    reminder: {
      title: 'Upcoming Schedule',
      sub: 'next 2 days',
      today: 'Today',
      tomorrow: 'Tomorrow',
      captionReady: '✓ caption ready',
      nothing: 'nothing scheduled yet ✿',
    },
    hashtagsTitle: 'Trending Hashtags',
    hashtagsSub: 'last 24h momentum',
    bestTime: 'best window: Tue 8–10 pm',
    bestTimeLabel: 'When your people are awake',
    lastPostTitle: 'Last Post',
    justPublished: 'Just published',
    likes: 'Likes', comments: 'Comments', saves: 'Saves', shares: 'Shares',
    engOverTime: 'Engagement Over Time',
    channelSummary: 'Connected Channels',
    followers: 'followers', posts: 'posts', eng: 'engagement',
    months: ['January','February','March','April','May','June','July','August','September','October','November','December'],
    weekdays: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
    hijriMonths: [
      'Muḥarram','Ṣafar','Rabīʿ al-Awwal','Rabīʿ al-Thānī','Jumādā al-Ūlā','Jumādā al-Thāniya',
      'Rajab','Shaʿbān','Ramaḍān','Shawwāl','Dhū al-Qiʿdah','Dhū al-Ḥijjah',
    ],
  },
  ar: {
    brand: 'سمارت مينا',
    overview: 'نظرة عامة على الأداء',
    tagline: 'نبض علامتك اليوم، بلطف.',
    sectionAnalytics: 'التحليلات',
    sectionContent: 'المحتوى',
    nav: {
      overview: 'نظرة عامة', insights: 'الرؤى', reports: 'التقارير',
      trends: 'الاتجاهات', competitors: 'المنافسون', playbook: 'الدليل',
      compose: 'تأليف', calendar: 'التقويم', connections: 'الاتصالات',
    },
    periods: { '7D': '٧ أيام', '30D': '٣٠ يوم', '90D': '٩٠ يوم', 'Custom': 'مخصص' },
    platforms: { all: 'الكل', instagram: 'انستغرام', facebook: 'فيسبوك' },
    kpis: {
      reach: 'الوصول', impressions: 'الظهور', engagements: 'التفاعلات',
      ctr: 'نسبة النقر', response: 'متوسط الرد',
    },
    vsLast: 'مقارنة بالفترة السابقة',
    search: 'ابحث في المنشورات والوسوم…  ⌘K',
    handle: '@levantgroup',
    brandName: 'مجموعة الشام',
    todo: {
      title: 'مهام اليوم',
      sub: 'مكتب المحلّل · ',
      moveTomorrow: '→ غداً',
      moved: '↻ تم النقل',
    },
    reminder: {
      title: 'الجدول القادم',
      sub: 'خلال يومين',
      today: 'اليوم',
      tomorrow: 'غداً',
      captionReady: '✓ التعليق جاهز',
      nothing: 'لا شيء بعد ✿',
    },
    hashtagsTitle: 'الوسوم الرائجة',
    hashtagsSub: 'زخم ٢٤ ساعة',
    bestTime: 'أفضل وقت: الثلاثاء ٨–١٠ م',
    bestTimeLabel: 'متى يستيقظ جمهورك',
    lastPostTitle: 'آخر منشور',
    justPublished: 'نُشر للتو',
    likes: 'إعجاب', comments: 'تعليق', saves: 'حفظ', shares: 'مشاركة',
    engOverTime: 'التفاعل بمرور الوقت',
    channelSummary: 'القنوات المتصلة',
    followers: 'متابع', posts: 'منشور', eng: 'تفاعل',
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    weekdays: ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'],
    hijriMonths: [
      'محرّم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الآخرة',
      'رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة',
    ],
  },
};

// ── PERIODS / PLATFORMS ──────────────────────────────────────
const PERIOD_OPTIONS = ['7D', '30D', '90D', 'Custom'];
const PLATFORM_FILTERS = [
  { id: 'all',       color: TOKENS.teal[600] },
  { id: 'instagram', color: TOKENS.ig },
  { id: 'facebook',  color: TOKENS.fb },
];

// ── KPI STRIP (5 cells: Reach hero · Impressions · Engagements · CTR · Avg. response) ──
const KPIS = [
  {
    id: 'reach', key: 'reach',
    value: 284700, format: 'compact', delta: +18.4,
    spark: [180,195,210,205,220,235,248,260,255,270,278,285],
    color: TOKENS.teal[600], hero: true,
  },
  {
    id: 'impressions', key: 'impressions',
    value: 1240000, format: 'compact', delta: +22.1,
    spark: [720,780,810,840,880,920,980,1040,1080,1150,1200,1240],
    color: TOKENS.sage[500],
  },
  {
    id: 'engagements', key: 'engagements',
    value: 18340, format: 'compact', delta: +9.7,
    spark: [120,128,134,140,148,152,158,162,170,175,180,183],
    color: TOKENS.amber[600],
  },
  {
    id: 'ctr', key: 'ctr',
    value: 3.42, format: 'percent', delta: +0.6,
    spark: [2.8,2.9,3.0,3.1,3.0,3.2,3.3,3.3,3.4,3.3,3.4,3.42],
    color: TOKENS.terra[600],
  },
  {
    id: 'response', key: 'response',
    value: '1h 12m', format: 'raw', delta: -8.2, deltaGood: true,
    spark: [110,108,102,98,95,92,90,86,82,78,74,72],
    color: TOKENS.ink[700],
  },
];

// ── PER-CHANNEL MINI-CARDS (top platform strip) ──────────────
const PLATFORM_CARDS = [
  { id: 'instagram', handle: '@levantgroup', followers: 142300, posts: 31, engRate: 6.47, bar: 0.78 },
  { id: 'facebook',  handle: 'Levant Group', followers:  42100, posts: 16, engRate: 5.71, bar: 0.42 },
];

// ── ENGAGEMENT TIMELINE (multi-period) ───────────────────────
const ENGAGEMENT_TIMELINE = {
  '7D': [
    { label: 'Mon', instagram: 620, facebook: 380 },
    { label: 'Tue', instagram: 780, facebook: 420 },
    { label: 'Wed', instagram: 640, facebook: 360 },
    { label: 'Thu', instagram: 820, facebook: 480 },
    { label: 'Fri', instagram: 910, facebook: 520 },
    { label: 'Sat', instagram: 760, facebook: 460 },
    { label: 'Sun', instagram: 840, facebook: 500 },
  ],
  '30D': [
    { label: 'Apr 12', instagram: 420, facebook: 280 },
    { label: 'Apr 16', instagram: 540, facebook: 320 },
    { label: 'Apr 20', instagram: 620, facebook: 380 },
    { label: 'Apr 24', instagram: 590, facebook: 360 },
    { label: 'Apr 28', instagram: 710, facebook: 420 },
    { label: 'May 02', instagram: 680, facebook: 410 },
    { label: 'May 06', instagram: 820, facebook: 480 },
    { label: 'May 11', instagram: 910, facebook: 520 },
  ],
  '90D': [
    { label: 'Feb', instagram: 380, facebook: 240 },
    { label: 'Feb', instagram: 460, facebook: 280 },
    { label: 'Mar', instagram: 540, facebook: 320 },
    { label: 'Mar', instagram: 580, facebook: 340 },
    { label: 'Apr', instagram: 640, facebook: 380 },
    { label: 'Apr', instagram: 720, facebook: 420 },
    { label: 'May', instagram: 820, facebook: 480 },
    { label: 'May', instagram: 910, facebook: 520 },
  ],
};

// ── CHANNEL SUMMARY (bottom strip) ───────────────────────────
const CHANNEL_STATS = [
  {
    id: 'instagram', handle: '@levantgroup',
    followers: 142300, posts: 31, engRate: 6.47,
    reach: 218400, impressions: 982000, saves: 1830, profileVisits: 9420,
  },
  {
    id: 'facebook', handle: 'Levant Group',
    followers: 42100, posts: 16, engRate: 5.71,
    reach: 66300, impressions: 258000, saves: 410, profileVisits: 2210,
  },
];

// ── HASHTAGS (radar) ─────────────────────────────────────────
const HASHTAGS = [
  { tag: '#رمضان',         momentum: 92, posts: 184 },
  { tag: '#riyadhseason',  momentum: 78, posts: 142 },
  { tag: '#قهوة_حجاز',     momentum: 71, posts: 96  },
  { tag: '#mena_brands',   momentum: 58, posts: 64  },
  { tag: '#levantgroup',   momentum: 44, posts: 48  },
  { tag: '#iftar2026',     momentum: 36, posts: 31  },
];

// ── BEST TIME 7×4 HEATMAP ────────────────────────────────────
// rows = weekdays (Sun..Sat); cols = morning / midday / evening / night
const BEST_TIME = {
  cols: ['morning', 'midday', 'evening', 'night'],
  colsAr: ['صباح', 'ظهر', 'مساء', 'ليل'],
  rows: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'],
  rowsAr: ['أحد','إثن','ثلا','أرب','خمي','جمع','سبت'],
  // 0..1 intensity
  data: [
    [0.20, 0.40, 0.55, 0.30], // Sun
    [0.25, 0.50, 0.65, 0.35], // Mon
    [0.30, 0.55, 0.95, 0.85], // Tue  ← peak
    [0.25, 0.45, 0.70, 0.50], // Wed
    [0.30, 0.55, 0.78, 0.62], // Thu
    [0.15, 0.30, 0.45, 0.35], // Fri
    [0.20, 0.35, 0.50, 0.30], // Sat
  ],
  peak: { row: 2, col: 2 }, // Tue evening
};

// ── TODO LIST (kawaii torn-paper) ────────────────────────────
const TODOS = [
  { id: 't1', text: 'Approve Hijaz blend reel caption', done: true,  pastel: 'blush' },
  { id: 't2', text: 'Schedule Tuesday 8 pm IG carousel', done: false, pastel: 'lavender' },
  { id: 't3', text: 'Reply to Riyadh Season DMs (12)',    done: false, pastel: 'babyblue' },
  { id: 't4', text: 'Brief design on #رمضان banner v2',   done: false, pastel: 'mint' },
  { id: 't5', text: 'Pull last-week competitor screencaps', done: false, pastel: 'cream' },
  { id: 't6', text: 'Hand off iftar reel to Salma ✿',     done: false, pastel: 'blush' },
];
const TODOS_AR = {
  t1: 'الموافقة على تعليق ريل قهوة الحجاز',
  t2: 'جدولة كاروسيل انستغرام الثلاثاء ٨ م',
  t3: 'الردّ على رسائل موسم الرياض (١٢)',
  t4: 'إفادة التصميم ببنر #رمضان النسخة ٢',
  t5: 'سحب لقطات المنافسين للأسبوع الماضي',
  t6: 'تسليم ريل الإفطار إلى سلمى ✿',
};

// ── LAST POST ────────────────────────────────────────────────
const LAST_POST = {
  platform: 'instagram',
  handle: '@levantgroup',
  timeAgo: '2 h ago',
  timeAgoAr: 'منذ ٢ س',
  body: 'first sip of the Hijaz blend, slow-roasted in Riyadh. ✿ pull up to the flagship before iftar — caption in carousel ⤵',
  bodyAr: 'أول رشفة من قهوة الحجاز، محمصة ببطء في الرياض. ✿ مرّوا على الفرع قبل الإفطار — التعليق في الكاروسيل ⤵',
  stats: { likes: 4820, comments: 312, saves: 894, shares: 218 },
};

// ── REMINDERS (Upcoming Schedule) ────────────────────────────
const REMINDERS = [
  {
    id: 'r1', when: 'today', time: '7:00 pm', timeAr: '٧:٠٠ م',
    platform: 'instagram',
    title: 'Hijaz coffee reel',
    titleAr: 'ريل قهوة الحجاز',
    captionReady: true,
  },
  {
    id: 'r2', when: 'tomorrow', empty: true,
  },
];

// ── TWEAK PRESETS (primary color swatches) ───────────────────
const PRIMARY_PRESETS = [
  { id: 'plum',  label: 'plum',  hue: 320, swatch: 'oklch(46% 0.108 320)' },
  { id: 'iris',  label: 'iris',  hue: 280, swatch: 'oklch(46% 0.108 280)' },
  { id: 'ocean', label: 'ocean', hue: 230, swatch: 'oklch(46% 0.108 230)' },
  { id: 'sage',  label: 'sage',  hue: 155, swatch: 'oklch(46% 0.090 155)' },
];

Object.assign(window, {
  TOKENS, STRINGS,
  PERIOD_OPTIONS, PLATFORM_FILTERS,
  KPIS, PLATFORM_CARDS,
  ENGAGEMENT_TIMELINE, CHANNEL_STATS,
  HASHTAGS, BEST_TIME, TODOS, TODOS_AR,
  LAST_POST, REMINDERS,
  PRIMARY_PRESETS,
});
