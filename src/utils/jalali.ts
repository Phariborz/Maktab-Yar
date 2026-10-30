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

export function sanitizeTimeStr(raw: unknown, fallback = '17:00'): string {
  const str = toEnglishDigits(String(raw || '')).trim();
  if (/^[0-2][0-9]:[0-5][0-9]$/.test(str)) {
    return str;
  }
  const fb = toEnglishDigits(fallback).trim();
  return /^[0-2][0-9]:[0-5][0-9]$/.test(fb) ? fb : '17:00';
}

export function sanitizeDayTimes(
  rawDayTimes: unknown,
  selectedDays: number[],
  fallbackTime = '17:00'
): Record<string, string> {
  const cleanDays = sanitizeSelectedDays(selectedDays);
  const cleanFallback = sanitizeTimeStr(fallbackTime, '17:00');
  const source =
    rawDayTimes && typeof rawDayTimes === 'object'
      ? (rawDayTimes as Record<string, unknown>)
      : {};
  const result: Record<string, string> = {};
  for (const dayIdx of cleanDays) {
    const key = String(dayIdx);
    result[key] = sanitizeTimeStr(source[key], cleanFallback);
  }
  return result;
}

export function hasDistinctDayTimes(
  selectedDays: number[],
  dayTimes?: Record<string, string>,
  fallbackTime = '17:00'
): boolean {
  const cleanDays = sanitizeSelectedDays(selectedDays);
  if (!dayTimes || cleanDays.length <= 1) return false;
  const times = cleanDays.map((d) =>
    sanitizeTimeStr(dayTimes[String(d)], fallbackTime)
  );
  return new Set(times).size > 1;
}

export function formatWeekdaysLabel(
  selectedDays: number[],
  dayTimes?: Record<string, string>,
  fallbackTime?: string
): string {
  const clean = sanitizeSelectedDays(selectedDays);
  const fb = sanitizeTimeStr(fallbackTime || '17:00', '17:00');

  if (dayTimes && hasDistinctDayTimes(clean, dayTimes, fb)) {
    const parts = clean.map((d) => {
      const t = sanitizeTimeStr(dayTimes[String(d)], fb);
      return `${JALALI_WEEKDAYS[d]} (${toPersianDigits(t)})`;
    });
    return parts.join('، ');
  }

  const dayNames = clean.map((d) => JALALI_WEEKDAYS[d]);
  if (clean.length === 7) {
    return 'همه روزهای هفته (۷ روز)';
  }
  return `${dayNames.join('، ')} (${toPersianDigits(clean.length)} روز در هفته)`;
}

export function formatStudentScheduleSummary(
  selectedDays: number[],
  classTime: string,
  dayTimes?: Record<string, string>
): string {
  const clean = sanitizeSelectedDays(selectedDays);
  const fb = sanitizeTimeStr(classTime, '17:00');
  if (dayTimes && hasDistinctDayTimes(clean, dayTimes, fb)) {
    return clean
      .map(
        (d) =>
          `${JALALI_WEEKDAYS[d]} ساعت ${toPersianDigits(
            sanitizeTimeStr(dayTimes[String(d)], fb)
          )}`
      )
      .join(' · ');
  }
  const dayNames = clean.map((d) => JALALI_WEEKDAYS[d]).join('، ');
  return `${dayNames} · ساعت ${toPersianDigits(fb)}`;
}

export function getTimeForJalaliDate(
  jalaliStr: string,
  selectedDays: number[],
  fallbackTime: string,
  dayTimes?: Record<string, string>
): string {
  const fb = sanitizeTimeStr(fallbackTime, '17:00');
  if (!dayTimes) return fb;
  const [jy, jm, jd] = parseJalaliString(jalaliStr);
  const dow = getJalaliDayOfWeek(jy, jm, jd);
  const cleanDays = sanitizeSelectedDays(selectedDays);
  if (dayTimes[String(dow)]) {
    return sanitizeTimeStr(dayTimes[String(dow)], fb);
  }
  if (cleanDays.length > 0 && dayTimes[String(cleanDays[0])]) {
    return sanitizeTimeStr(dayTimes[String(cleanDays[0])], fb);
  }
  return fb;
}

export const POSTPAID_CYCLE_OPTIONS: Array<{
  id: 'per_session' | 'weekly' | 'biweekly' | 'monthly';
  label: string;
}> = [
  { id: 'per_session', label: 'هر جلسه' },
  { id: 'weekly', label: 'هفتگی' },
  { id: 'biweekly', label: 'دو هفتگی' },
  { id: 'monthly', label: 'ماهانه' },
];

export function sanitizePostpaidCycleType(
  raw: unknown
): 'per_session' | 'weekly' | 'biweekly' | 'monthly' {
  if (
    raw === 'per_session' ||
    raw === 'weekly' ||
    raw === 'biweekly' ||
    raw === 'monthly'
  ) {
    return raw;
  }
  return 'monthly';
}

export interface JalaliMonthWeekdayStat {
  dayIndex: number;
  dayName: string;
  count: number;
  dates: string[];
}

export interface JalaliMonthMatchingResult {
  year: number;
  month: number;
  monthName: string;
  monthTitle: string;
  daysInMonth: number;
  totalSessions: number;
  dates: string[];
  perWeekdayCounts: JalaliMonthWeekdayStat[];
}

/**
 * Counts exact occurrences of `selectedDays` (0=Saturday .. 6=Friday) in a specific
 * Jalali calendar month (`jy`, `jm`), accurately handling 31-day, 30-day, and 29-day
 * months where certain weekdays occur 5 times (e.g., Mehr 1405 having 5 Wednesdays and 5 Thursdays).
 */
export function getJalaliMonthMatchingDates(
  jy: number,
  jm: number,
  selectedDays: number[]
): JalaliMonthMatchingResult {
  const cleanDays = sanitizeSelectedDays(selectedDays);
  const validMonth = Math.max(1, Math.min(12, jm || 1));
  const validYear = jy > 1300 && jy < 1500 ? jy : getCurrentJalaliDate().year;
  const daysInMonth = getJalaliMonthDays(validYear, validMonth);
  const monthName = JALALI_MONTH_NAMES[validMonth - 1] || '';
  const monthTitle = `${monthName} ${toPersianDigits(validYear)}`;

  const datesByDay = new Map<number, string[]>();
  cleanDays.forEach((d) => datesByDay.set(d, []));
  const allDates: string[] = [];

  for (let d = 1; d <= daysInMonth; d++) {
    const dow = getJalaliDayOfWeek(validYear, validMonth, d);
    if (cleanDays.includes(dow)) {
      const formatted = formatJalaliString(validYear, validMonth, d);
      allDates.push(formatted);
      datesByDay.get(dow)?.push(formatted);
    }
  }

  const perWeekdayCounts: JalaliMonthWeekdayStat[] = cleanDays.map((dayIdx) => {
    const dList = datesByDay.get(dayIdx) || [];
    return {
      dayIndex: dayIdx,
      dayName: JALALI_WEEKDAYS[dayIdx],
      count: dList.length,
      dates: dList,
    };
  });

  return {
    year: validYear,
    month: validMonth,
    monthName,
    monthTitle,
    daysInMonth,
    totalSessions: allDates.length,
    dates: allDates,
    perWeekdayCounts,
  };
}

export interface PostpaidCycleCalendarDetails {
  cycleType: 'per_session' | 'weekly' | 'biweekly' | 'monthly';
  sessionsCount: number;
  dates: string[];
  referenceMonthTitle: string;
  daysInReferenceMonth: number;
  perWeekdayCounts: JalaliMonthWeekdayStat[];
  remainingInMonthFromStart: number;
  breakdownSummary: string;
}

/**
 * Computes exact postpaid cycle session counts and dates directly from the Jalali calendar.
 */
export function calculatePostpaidCycleDetails(
  cycleType: 'per_session' | 'weekly' | 'biweekly' | 'monthly' | undefined,
  selectedDays: number[],
  referenceJalaliDate?: string
): PostpaidCycleCalendarDetails {
  const cleanType = sanitizePostpaidCycleType(cycleType);
  const cleanDays = sanitizeSelectedDays(selectedDays);
  const refStr =
    referenceJalaliDate && referenceJalaliDate.trim()
      ? referenceJalaliDate.trim()
      : getCurrentJalaliDate().formatted;
  const [jy, jm, jd] = parseJalaliString(refStr);
  const monthResult = getJalaliMonthMatchingDates(jy, jm, cleanDays);

  const remainingInMonthFromStart = monthResult.dates.filter((dStr) => {
    const [, , dayNum] = parseJalaliString(dStr);
    return dayNum >= jd;
  }).length;

  if (cleanType === 'per_session') {
    const nextDates = generateSessionDatesByWeekdays(refStr, cleanDays, 1);
    return {
      cycleType: cleanType,
      sessionsCount: 1,
      dates: nextDates,
      referenceMonthTitle: monthResult.monthTitle,
      daysInReferenceMonth: monthResult.daysInMonth,
      perWeekdayCounts: monthResult.perWeekdayCounts,
      remainingInMonthFromStart,
      breakdownSummary: 'تسویه در پایان هر ۱ جلسه کلاسی',
    };
  }

  if (cleanType === 'weekly' || cleanType === 'biweekly') {
    const windowDays = cleanType === 'weekly' ? 7 : 14;
    const matchedDates: string[] = [];
    for (let offset = 0; offset < windowDays; offset++) {
      const candidate = addJalaliDays(refStr, offset);
      const [cy, cm, cd] = parseJalaliString(candidate);
      const dow = getJalaliDayOfWeek(cy, cm, cd);
      if (cleanDays.includes(dow)) {
        matchedDates.push(candidate);
      }
    }
    const endWindowDate = addJalaliDays(refStr, windowDays - 1);
    return {
      cycleType: cleanType,
      sessionsCount: Math.max(1, matchedDates.length),
      dates: matchedDates,
      referenceMonthTitle: monthResult.monthTitle,
      daysInReferenceMonth: monthResult.daysInMonth,
      perWeekdayCounts: monthResult.perWeekdayCounts,
      remainingInMonthFromStart,
      breakdownSummary: `بازه ${toPersianDigits(windowDays)} روزه تقویم (${toPersianDigits(
        refStr
      )} تا ${toPersianDigits(endWindowDate)}): ${toPersianDigits(
        matchedDates.length
      )} جلسه`,
    };
  }

  // Monthly: exact count from the Jalali calendar month (accounting for 4 vs 5 occurrences of each weekday)
  const weekdayParts = monthResult.perWeekdayCounts
    .map((w) => `${w.dayName} (${toPersianDigits(w.count)} جلسه)`)
    .join(' + ');

  return {
    cycleType: 'monthly',
    sessionsCount: Math.max(1, monthResult.totalSessions),
    dates: monthResult.dates,
    referenceMonthTitle: monthResult.monthTitle,
    daysInReferenceMonth: monthResult.daysInMonth,
    perWeekdayCounts: monthResult.perWeekdayCounts,
    remainingInMonthFromStart,
    breakdownSummary: `تقویم ${monthResult.monthTitle} (${toPersianDigits(
      monthResult.daysInMonth
    )} روزه): ${weekdayParts} = ${toPersianDigits(monthResult.totalSessions)} جلسه`,
  };
}

/**
 * Dynamically calculates the number of sessions in a postpaid settlement cycle
 * directly from the Iranian Jalali calendar (accounting for 5-occurrence weekdays in a month).
 */
export function calculatePostpaidCycleSessions(
  cycleType: 'per_session' | 'weekly' | 'biweekly' | 'monthly' | undefined,
  selectedDays: number[],
  referenceJalaliDate?: string
): number {
  return calculatePostpaidCycleDetails(
    cycleType,
    selectedDays,
    referenceJalaliDate
  ).sessionsCount;
}

export function formatPostpaidCycleLabel(
  cycleType: 'per_session' | 'weekly' | 'biweekly' | 'monthly' | undefined,
  selectedDays: number[],
  fallbackCycleSessions?: number,
  referenceJalaliDate?: string
): string {
  const cleanType = cycleType
    ? sanitizePostpaidCycleType(cycleType)
    : undefined;
  const details = cleanType
    ? calculatePostpaidCycleDetails(cleanType, selectedDays, referenceJalaliDate)
    : undefined;
  const sessionsCount = details
    ? details.sessionsCount
    : fallbackCycleSessions ||
      calculatePostpaidCycleSessions('monthly', selectedDays, referenceJalaliDate);

  const labelMap: Record<
    'per_session' | 'weekly' | 'biweekly' | 'monthly',
    string
  > = {
    per_session: 'هر جلسه',
    weekly: 'هفتگی',
    biweekly: 'دو هفتگی',
    monthly: details ? `ماهانه — ${details.referenceMonthTitle}` : 'ماهانه',
  };

  const title = cleanType ? labelMap[cleanType] : 'دوره‌ای';
  return `${title} (${toPersianDigits(sessionsCount)} جلسه)`;
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
