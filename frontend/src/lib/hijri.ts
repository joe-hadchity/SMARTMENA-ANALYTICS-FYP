// Hijri date conversion helper
// Simple Umm al-Qura approximation via Julian day arithmetic

export interface HijriDate {
  year: number;
  month: number;
  day: number;
}

export function gregorianToHijri(date: Date): HijriDate {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  const d = date.getDate();

  let jd: number;

  if ((y < 1582) || (y === 1582 && m < 10) || (y === 1582 && m === 10 && d < 15)) {
    jd = (367 * y) - Math.floor((7 * (y + 5001 + Math.floor((m - 9) / 7))) / 4) +
         Math.floor((275 * m) / 9) + d + 1729777;
  } else {
    jd = Math.floor((1461 * (y + 4800 + Math.floor((m - 14) / 12))) / 4) +
         Math.floor((367 * (m - 2 - 12 * Math.floor((m - 14) / 12))) / 12) -
         Math.floor((3 * Math.floor((y + 4900 + Math.floor((m - 14) / 12)) / 100)) / 4) +
         d - 32075;
  }

  jd = jd - 1948440 + 10632;
  const n = Math.floor((jd - 1) / 10631);
  jd = jd - 10631 * n + 354;
  const j = (Math.floor((10985 - jd) / 5316)) * (Math.floor((50 * jd) / 17719)) +
            (Math.floor(jd / 5670)) * (Math.floor((43 * jd) / 15238));
  jd = jd - (Math.floor((30 - j) / 15)) * (Math.floor((17719 * j) / 50)) -
       (Math.floor(j / 16)) * (Math.floor((15238 * j) / 43)) + 29;
  const month = Math.floor((24 * jd) / 709);
  const day = jd - Math.floor((709 * month) / 24);
  const year = 30 * n + j - 30;

  return { year, month, day };
}

export const HIJRI_MONTHS_EN = [
  'Muḥarram', 'Ṣafar', 'Rabīʿ al-Awwal', 'Rabīʿ al-Thānī',
  'Jumādā al-Ūlā', 'Jumādā al-Thāniya', 'Rajab', 'Shaʿbān',
  'Ramaḍān', 'Shawwāl', 'Dhū al-Qiʿdah', 'Dhū al-Ḥijjah'
];

export const HIJRI_MONTHS_AR = [
  'محرّم', 'صفر', 'ربيع الأول', 'ربيع الثاني',
  'جمادى الأولى', 'جمادى الآخرة', 'رجب', 'شعبان',
  'رمضان', 'شوال', 'ذو القعدة', 'ذو الحجة'
];
