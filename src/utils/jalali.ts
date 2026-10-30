/**
 * Iranian Jalali (Shamsi) Calendar & Persian Number Formatting Utilities
 */

export const JALALI_MONTH_NAMES = [
  'فروردین',
  'اردیبهشت',
  'خرداد',
  'تیر',
  'مرداد',
  'شهریور',
  'مهر',
  'آبان',
  'آذر',
  'دی',
  'بهمن',
  'اسفند',
];

// Weekdays starting from Shanbeh (Saturday = index 0 in Iranian calendar)
export const JALALI_WEEKDAYS = [
  'شنبه',
  'یکشنبه',
  'دوشنبه',
  'سه‌شنبه',
  'چهارشنبه',
  'پنجشنبه',
  'جمعه',
];

export const JALALI_WEEKDAYS_SHORT = [
  'ش',
  'ی',
  'د',
  'س',
  'چ',
  'پ',
  'ج',
];

const PERSIAN_DIGITS = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];

export function toPersianDigits(value: string | number | undefined | null): string {
  if (value === undefined || value === null) return '';
  const str = String(value);
  // Format negative numbers cleanly for RTL display if needed
  return str.replace(/\d/g, (d) => PERSIAN_DIGITS[Number(d)]);
}

export function formatSignedPersianNumber(num: number): string {
  if (num < 0) {
    return `${toPersianDigits(Math.abs(num))}-`;
  }
  return toPersianDigits(num);
}

export function toEnglishDigits(value: string): string {
  if (!value) return '';
  return value
    .replace(/[۰-۹]/g, (d) => String(PERSIAN_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));
}

export function formatToman(amount: number): string {
  const absFormatted = Math.round(Math.abs(amount)).toLocaleString('en-US');
  if (amount < 0) {
    return `${toPersianDigits(absFormatted)}- تومان`;
  }
  return `${toPersianDigits(absFormatted)} تومان`;
}

export function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
  const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
  let jy = gy <= 1600 ? 0 : 979;
  gy -= gy <= 1600 ? 621 : 1600;
  const gy2 = gm > 2 ? gy + 1 : gy;
  let days =
    365 * gy +
    Math.floor((gy2 + 3) / 4) -
    Math.floor((gy2 + 99) / 100) +
    Math.floor((gy2 + 399) / 400) -
    80 +
    gd +
    g_d_m[gm - 1];
  jy += 33 * Math.floor(days / 12053);
  days %= 12053;
  jy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    jy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  const jm = days < 186 ? 1 + Math.floor(days / 31) : 7 + Math.floor((days - 186) / 30);
  const jd = 1 + (days < 186 ? days % 31 : (days - 186) % 30);
  return [jy, jm, jd];
}

export function jalaliToGregorian(jy: number, jm: number, jd: number): [number, number, number] {
  let gy = jy <= 979 ? 621 : 1600;
  jy -= jy <= 979 ? 0 : 979;
  let days =
    365 * jy +
    Math.floor(jy / 33) * 8 +
    Math.floor(((jy % 33) + 3) / 4) +
    78 +
    jd +
    (jm < 7 ? (jm - 1) * 31 : (jm - 7) * 30 + 186);
  gy += 400 * Math.floor(days / 146097);
  days %= 146097;
  if (days > 36524) {
    gy += 100 * Math.floor(--days / 36524);
    days %= 36524;
    if (days >= 365) days++;
  }
  gy += 4 * Math.floor(days / 1461);
  days %= 1461;
  if (days > 365) {
    gy += Math.floor((days - 1) / 365);
    days = (days - 1) % 365;
  }
  let gd = days + 1;
  const sal_a = [
    0,
    31,
    (gy % 4 === 0 && gy % 100 !== 0) || gy % 400 === 0 ? 29 : 28,
    31,
    30,
    31,
    30,
    31,
    31,
    30,
    31,
    30,
    31,
  ];
  let gm = 0;
  for (gm = 0; gm < 13; gm++) {
    const v = sal_a[gm];
    if (gd <= v) break;
    gd -= v;
  }
  return [gy, gm, gd];
}

export function isJalaliLeapYear(jy: number): boolean {
  const r = jy % 33;
  return [1, 5, 9, 13, 17, 22, 26, 30].includes(r);
}

export function getJalaliMonthDays(jy: number, jm: number): number {
  if (jm >= 1 && jm <= 6) return 31;
  if (jm >= 7 && jm <= 11) return 30;
  return isJalaliLeapYear(jy) ? 30 : 29;
}

export function formatJalaliString(jy: number, jm: number, jd: number): string {
  const m = String(jm).padStart(2, '0');
  const d = String(jd).padStart(2, '0');
  return `${jy}/${m}/${d}`;
}

export function parseJalaliString(jalaliStr: string): [number, number, number] {
  const normalized = toEnglishDigits((jalaliStr || '').trim()).replace(/-/g, '/');
  const parts = normalized.split('/').map(Number);
  if (parts.length !== 3 || parts.some(isNaN)) {
    const now = new Date();
    return gregorianToJalali(now.getFullYear(), now.getMonth() + 1, now.getDate());
  }
  return [parts[0], parts[1], parts[2]];
}

/**
 * Returns 0 for Shanbeh (Saturday) through 6 for Jomeh (Friday)
 */
export function getJalaliDayOfWeek(jy: number, jm: number, jd: number): number {
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd);
  // JS getDay(): 0 = Sun, 1 = Mon, ..., 6 = Sat
  // Convert so 6 (Sat) -> 0, 0 (Sun) -> 1, ..., 5 (Fri) -> 6
  return (date.getDay() + 1) % 7;
}

export function getCurrentJalaliDate() {
  const now = new Date();
  const [year, month, day] = gregorianToJalali(
    now.getFullYear(),
    now.getMonth() + 1,
    now.getDate()
  );
  const formatted = formatJalaliString(year, month, day);
  const dow = getJalaliDayOfWeek(year, month, day);
  return {
    year,
    month,
    day,
    formatted,
    monthKey: `${year}/${String(month).padStart(2, '0')}`,
    weekdayName: JALALI_WEEKDAYS[dow],
    monthName: JALALI_MONTH_NAMES[month - 1],
    fullReadable: `${JALALI_WEEKDAYS[dow]} ${toPersianDigits(day)} ${JALALI_MONTH_NAMES[month - 1]} ${toPersianDigits(year)}`,
  };
}

export function addJalaliDays(jalaliStr: string, daysToAdd: number): string {
  const [jy, jm, jd] = parseJalaliString(jalaliStr);
  const [gy, gm, gd] = jalaliToGregorian(jy, jm, jd);
  const date = new Date(gy, gm - 1, gd);
  date.setDate(date.getDate() + daysToAdd);
  const [njy, njm, njd] = gregorianToJalali(
    date.getFullYear(),
    date.getMonth() + 1,
    date.getDate()
  );
  return formatJalaliString(njy, njm, njd);
}

export function formatReadableJalali(jalaliStr: string): string {
  const [jy, jm, jd] = parseJalaliString(jalaliStr);
  const dow = getJalaliDayOfWeek(jy, jm, jd);
  const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
  return `${JALALI_WEEKDAYS[dow]} ${toPersianDigits(jd)} ${monthName}`;
}

export function getJalaliMonthKey(jalaliStr: string): string {
  const [jy, jm] = parseJalaliString(jalaliStr);
  return `${jy}/${String(jm).padStart(2, '0')}`;
}

export function formatJalaliMonthTitle(monthKey: string): string {
  const parts = toEnglishDigits(monthKey).split('/').map(Number);
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return monthKey;
  const [jy, jm] = parts;
  const monthName = JALALI_MONTH_NAMES[jm - 1] || '';
  return `${monthName} ${toPersianDigits(jy)}`;
}

export function sanitizeSelectedDays(days: unknown): number[] {
  if (!Array.isArray(days)) return [0];
  const valid = Array.from(
    new Set(
      days
        .map((d) => Number(d))
        .filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
    )
  ).sort((a, b) => a - b);
  return valid.length > 0 ? valid : [0];
}

export function formatWeekdaysLabel(selectedDays: number[]): string {
  const clean = sanitizeSelectedDays(selectedDays);
  const dayNames = clean.map((d) => JALALI_WEEKDAYS[d]);
  if (clean.length === 7) {
    return 'همه روزهای هفته (۷ روز)';
  }
  return `${dayNames.join('، ')} (${toPersianDigits(clean.length)} روز در هفته)`;
}

/**
 * Generates upcoming Jalali dates starting on or after `startDateJalali`
 * that fall on any of the teacher's selected weekdays (`0..6`).
 */
export function generateSessionDatesByWeekdays(
  startDateJalali: string,
  selectedDays: number[],
  count: number
): string[] {
  const cleanDays = sanitizeSelectedDays(selectedDays);
  const targetCount = Math.max(1, Math.min(30, count));
  const results: string[] = [];
  let offset = 0;

  while (results.length < targetCount && offset < 365) {
    const candidate = addJalaliDays(startDateJalali, offset);
    const [jy, jm, jd] = parseJalaliString(candidate);
    const dow = getJalaliDayOfWeek(jy, jm, jd);
    if (cleanDays.includes(dow)) {
      results.push(candidate);
    }
    offset++;
  }

  return results;
}
