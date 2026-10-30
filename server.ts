import express from 'express';
import http from 'http';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { createServer as createViteServer } from 'vite';
import {
  getCurrentJalaliDate,
  addJalaliDays,
  toEnglishDigits,
  toPersianDigits,
  formatSignedPersianNumber,
  formatReadableJalali,
  sanitizeSelectedDays,
  sanitizeDayTimes,
  getTimeForJalaliDate,
  formatWeekdaysLabel,
  generateSessionDatesByWeekdays,
  sanitizePostpaidCycleType,
  calculatePostpaidCycleSessions,
  formatPostpaidCycleLabel,
} from './src/utils/jalali.ts';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
  ServerStateSnapshot,
  WsEventMessage,
  IntervalType,
  PaymentSystemType,
  PostpaidCycleType,
} from './src/types.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_FILE = path.join(__dirname, 'server-data.json');

export interface TeacherAccountConfig {
  id: string;
  name: string;
  username: string;
  passwordSha256: string;
  envPasswordKey: string;
  phoneDisplay: string;
  phoneNormalized: string;
}

const PASSWORD_HASH_SALT = 'maktabyar_salt_v1:';

function hashPasswordWithSalt(plain: string): string {
  return crypto
    .createHash('sha256')
    .update(`${PASSWORD_HASH_SALT}${plain}`)
    .digest('hex');
}

function verifyTeacherPassword(
  teacher: TeacherAccountConfig,
  candidatePassword: string
): boolean {
  const envOverride = process.env[teacher.envPasswordKey];
  if (envOverride && envOverride.trim().length > 0) {
    return candidatePassword === envOverride.trim();
  }
  const candidateHash = hashPasswordWithSalt(candidatePassword);
  return candidateHash === teacher.passwordSha256;
}

// Multi-Teacher Configuration (Salted SHA-256 hashes — no plaintext passwords in source code)
const TEACHERS_CONFIG: TeacherAccountConfig[] = [
  {
    id: 'teacher_admin_fariborz_farzad',
    name: 'استاد فریبرز فرزاد',
    username: 'fariborz_farzad',
    passwordSha256:
      'ab74dac946b537ba056c0021ef259da5eac4d8dd141a2ab9b70e5d7289f2da65',
    envPasswordKey: 'TEACHER_FARIBORZ_PASSWORD',
    phoneDisplay: '+98 9373796964',
    phoneNormalized: '09373796964',
  },
  {
    id: 'teacher_ramy',
    name: 'استاد رمی',
    username: 'Ramy',
    passwordSha256:
      'b9d8bc1aebe72faa735f3452d4a0fe6e81b96592d7961ad4737732337aab168c',
    envPasswordKey: 'TEACHER_RAMY_PASSWORD',
    phoneDisplay: '+98 9124567000',
    phoneNormalized: '09124567000',
  },
];

function getTeacherById(teacherId?: string): TeacherAccountConfig {
  return (
    TEACHERS_CONFIG.find((t) => t.id === teacherId) || TEACHERS_CONFIG[0]
  );
}

function buildRamySeedData(
  today: ReturnType<typeof getCurrentJalaliDate>,
  nowIso: string
): ServerStateSnapshot {
  const teacherId = 'teacher_ramy';
  const teacherName = 'استاد رمی';

  const students: Student[] = [
    {
      id: 'stu_ramy_arman_1',
      name: 'آرمان شمس',
      phone: '09125551020',
      password: '123456',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      startDate: addJalaliDays(today.formatted, -12),
      classTime: '17:00',
      selectedDays: [2, 4], // دوشنبه، چهارشنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([2, 4]),
      tuitionPerSession: 590000,
      sessionsLeft: 4,
      totalSessionsPaid: 8,
      totalAttended: 4,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_ramy_sara_2',
      name: 'سارا بهرامی',
      phone: '09125553040',
      password: '123456',
      subject: 'طراحی رابط کاربری و فرانت‌اند (React)',
      startDate: addJalaliDays(today.formatted, -18),
      classTime: '18:30',
      selectedDays: [0, 3], // شنبه، سه‌شنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([0, 3]),
      tuitionPerSession: 680000,
      sessionsLeft: -1, // 1 session negative credit
      totalSessionsPaid: 4,
      totalAttended: 5,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_ramy_nima_3',
      name: 'نیما فرهمند',
      phone: '09365557080',
      password: '123456',
      subject: 'ریاضیات مهندسی و معادلات دیفرانسیل',
      startDate: addJalaliDays(today.formatted, -9),
      classTime: '16:00',
      selectedDays: [1, 5], // یکشنبه، پنجشنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([1, 5]),
      tuitionPerSession: 620000,
      sessionsLeft: 5,
      totalSessionsPaid: 6,
      totalAttended: 1,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const sessions: ClassSession[] = [
    {
      id: 'sess_ramy_101',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      studentPhone: '09125551020',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      jalaliDate: addJalaliDays(today.formatted, -5),
      time: '17:00',
      attendanceStatus: 'present',
      grade: 19.5,
      topic: 'Speaking Part 2 Cue Cards & Fluency Strategies',
      teacherNote: 'دامنه لغات آکادمیک پیشرفت محسوسی داشته است.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_102',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      studentPhone: '09125551020',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      jalaliDate: today.formatted,
      time: '17:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'Writing Task 2 Argumentative Essay Review',
      teacherNote: 'تحویل انشای ۲۵۰ کلمه‌ای پیش از شروع جلسه.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_103',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      studentPhone: '09125551020',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      jalaliDate: addJalaliDays(today.formatted, 3),
      time: '17:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'Full Mock Speaking Test & Feedback',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_201',
      studentId: 'stu_ramy_sara_2',
      studentName: 'سارا بهرامی',
      studentPhone: '09125553040',
      subject: 'طراحی رابط کاربری و فرانت‌اند (React)',
      jalaliDate: addJalaliDays(today.formatted, -4),
      time: '18:30',
      attendanceStatus: 'present',
      grade: 20,
      topic: 'مدیریت وضعیت با React Hooks و بهینه‌سازی موبایل',
      teacherNote: 'پیاده‌سازی کامپوننت‌های واکنش‌گرا عالی بود.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_202',
      studentId: 'stu_ramy_sara_2',
      studentName: 'سارا بهرامی',
      studentPhone: '09125553040',
      subject: 'طراحی رابط کاربری و فرانت‌اند (React)',
      jalaliDate: today.formatted,
      time: '18:30',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'معماری سیستم‌های طراحی و عملکرد در موبایل',
      teacherNote: 'بررسی پروژه عملی جلسه قبل.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_301',
      studentId: 'stu_ramy_nima_3',
      studentName: 'نیما فرهمند',
      studentPhone: '09365557080',
      subject: 'ریاضیات مهندسی و معادلات دیفرانسیل',
      jalaliDate: addJalaliDays(today.formatted, -3),
      time: '16:00',
      attendanceStatus: 'present',
      grade: 18.75,
      topic: 'سری‌های فوریه و شرایط دیریکله',
      teacherNote: 'حل تمرین‌های انتگرال فوریه کامل انجام شود.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_ramy_302',
      studentId: 'stu_ramy_nima_3',
      studentName: 'نیما فرهمند',
      studentPhone: '09365557080',
      subject: 'ریاضیات مهندسی و معادلات دیفرانسیل',
      jalaliDate: addJalaliDays(today.formatted, 2),
      time: '16:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'تبدیل لاپلاس و کاربرد در حل معادلات دیفرانسیل',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const rechargeRequests: RechargeRequest[] = [
    {
      id: 'req_ramy_sara_1',
      studentId: 'stu_ramy_sara_2',
      studentName: 'سارا بهرامی',
      studentPhone: '09125553040',
      requestedSessions: 6,
      totalAmount: 4080000,
      paymentNote: 'واریز اینترنتی — کد پیگیری ۹۱۲۸۴۵ (تسویه ۱ جلسه بدهی + ۵ جلسه جدید)',
      status: 'pending',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'req_ramy_arman_0',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      studentPhone: '09125551020',
      requestedSessions: 4,
      totalAmount: 2360000,
      paymentNote: 'تمدید ۴ جلسه دوره مکالمه آیلتس',
      status: 'approved',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const messages: ChatMessage[] = [
    {
      id: 'msg_ramy_1',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      senderRole: 'teacher',
      senderName: teacherName,
      text: 'سلام آرمان جان، موضوعات Speaking Part 2 برای تمرین امروز ساعت ۱۷:۰۰ ارسال شد.',
      jalaliTime: `${today.weekdayName} ۱۳:۳۰`,
      teacherId,
      createdAt: nowIso,
    },
    {
      id: 'msg_ramy_2',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      senderRole: 'student',
      senderName: 'آرمان شمس',
      text: 'سلام استاد رمی عزیز، ممنونم. فایل صوتی تمرین‌ها رو هم آماده کردم.',
      jalaliTime: `${today.weekdayName} ۱۳:۴۵`,
      teacherId,
      createdAt: nowIso,
    },
    {
      id: 'msg_ramy_3',
      studentId: 'stu_ramy_sara_2',
      studentName: 'سارا بهرامی',
      senderRole: 'student',
      senderName: 'سارا بهرامی',
      text: 'سلام استاد رمی، درخواست شارژ ۶ جلسه رو ثبت کردم. لطفاً بررسی بفرمایید.',
      jalaliTime: `${today.weekdayName} ۱۲:۱۰`,
      teacherId,
      createdAt: nowIso,
    },
  ];

  const notifications: AppNotification[] = [
    {
      id: 'notif_ramy_1',
      targetRole: 'teacher',
      targetStudentId: 'stu_ramy_sara_2',
      type: 'recharge_requested',
      title: 'درخواست شارژ جلسات جدید — سارا بهرامی',
      body: 'سارا بهرامی درخواست شارژ ۶ جلسه (۴,۰۸۰,۰۰۰ تومان) را ثبت کرده است.',
      jalaliTime: `${today.weekdayName} ۱۲:۱۰`,
      isRead: false,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'notif_ramy_2',
      targetRole: 'student',
      targetStudentId: 'stu_ramy_arman_1',
      type: 'session_reminder',
      title: 'یادآوری جلسه امروز ساعت ۱۷:۰۰ با استاد رمی',
      body: 'جلسه مکالمه پیشرفته و آیلتس امروز ساعت ۱۷:۰۰ برگزار می‌شود.',
      jalaliTime: `${today.weekdayName} ۱۰:۰۰`,
      isRead: false,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    students,
    sessions,
    rechargeRequests,
    messages,
    notifications,
  };
}

function buildInitialSeedState(): ServerStateSnapshot {
  const today = getCurrentJalaliDate();
  const nowIso = new Date().toISOString();
  const teacherId = 'teacher_admin_fariborz_farzad';
  const teacherName = 'استاد فریبرز فرزاد';

  const fariborzStudents: Student[] = [
    {
      id: 'stu_kiarash_1',
      name: 'کیارش رضایی',
      phone: '09123456789',
      password: '123456',
      subject: 'ریاضیات گسسته و حسابان',
      startDate: addJalaliDays(today.formatted, -14),
      classTime: '16:30',
      selectedDays: [0, 3], // شنبه، سه‌شنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([0, 3]),
      tuitionPerSession: 650000,
      sessionsLeft: 3,
      totalSessionsPaid: 8,
      totalAttended: 5,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_parinaz_2',
      name: 'پریناز محمدی',
      phone: '09121122334',
      password: '123456',
      subject: 'فیزیک پایه دوازدهم و کنکور',
      startDate: addJalaliDays(today.formatted, -21),
      classTime: '18:00',
      selectedDays: [2, 6], // دوشنبه، جمعه (ساعت‌های متفاوت)
      dayTimes: { '2': '16:00', '6': '10:00' },
      paymentType: 'postpaid',
      postpaidCycleType: 'biweekly',
      postpaidCycleSessions: 4,
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([2, 6], { '2': '16:00', '6': '10:00' }, '18:00'),
      tuitionPerSession: 580000,
      sessionsLeft: -2,
      totalSessionsPaid: 3,
      totalAttended: 5,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_amirhossein_3',
      name: 'امیرحسین کاظمی',
      phone: '09354455667',
      password: '123456',
      subject: 'برنامه‌نویسی پایتون و الگوریتم',
      startDate: addJalaliDays(today.formatted, -7),
      classTime: '19:30',
      selectedDays: [2, 5], // دوشنبه، پنجشنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([2, 5]),
      tuitionPerSession: 720000,
      sessionsLeft: 6,
      totalSessionsPaid: 8,
      totalAttended: 2,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_ghazal_4',
      name: 'غزل نادری',
      phone: '09198877665',
      password: '123456',
      subject: 'زبان انگلیسی آیلتس (IELTS)',
      startDate: addJalaliDays(today.formatted, -10),
      classTime: '15:00',
      selectedDays: [0, 2, 4], // شنبه، دوشنبه، چهارشنبه
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([0, 2, 4]),
      tuitionPerSession: 520000,
      sessionsLeft: 4,
      totalSessionsPaid: 6,
      totalAttended: 2,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const fariborzSessions: ClassSession[] = [
    {
      id: 'sess_101',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      studentPhone: '09123456789',
      subject: 'ریاضیات گسسته و حسابان',
      jalaliDate: addJalaliDays(today.formatted, -6),
      time: '16:30',
      attendanceStatus: 'present',
      grade: 19.25,
      topic: 'نظریه اعداد و همنهشتی پیمانه‌ای',
      teacherNote: 'حل تمرین‌های سری سوم بسیار دقیق انجام شده بود.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_102',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      studentPhone: '09123456789',
      subject: 'ریاضیات گسسته و حسابان',
      jalaliDate: addJalaliDays(today.formatted, -3),
      time: '16:30',
      attendanceStatus: 'present',
      grade: 19.75,
      topic: 'گراف‌های اویلری و همیلتونی',
      teacherNote: 'تسلط عالی بر اثبات قضایای گراف.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_103',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      studentPhone: '09123456789',
      subject: 'ریاضیات گسسته و حسابان',
      jalaliDate: today.formatted,
      time: '16:30',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'مشتق توابع ضمنی و کاربردهای اکسترمم',
      teacherNote: 'مرور سوالات کنکور سال گذشته پیش از کلاس.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_104',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      studentPhone: '09123456789',
      subject: 'ریاضیات گسسته و حسابان',
      jalaliDate: addJalaliDays(today.formatted, 3),
      time: '16:30',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'آزمون جامع فصل اول و دوم حسابان',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_201',
      studentId: 'stu_parinaz_2',
      studentName: 'پریناز محمدی',
      studentPhone: '09121122334',
      subject: 'فیزیک پایه دوازدهم و کنکور',
      jalaliDate: addJalaliDays(today.formatted, -7),
      time: '18:00',
      attendanceStatus: 'present',
      grade: 18.5,
      topic: 'سینماتیک و حرکت با شتاب ثابت',
      teacherNote: 'نیاز به تمرین بیشتر در نمودارهای سرعت-زمان.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_202',
      studentId: 'stu_parinaz_2',
      studentName: 'پریناز محمدی',
      studentPhone: '09121122334',
      subject: 'فیزیک پایه دوازدهم و کنکور',
      jalaliDate: today.formatted,
      time: '18:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'دینامیک و قوانین نیوتن در دستگاه‌های مقید',
      teacherNote: 'تحویل تکالیف فصل دوم.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_203',
      studentId: 'stu_parinaz_2',
      studentName: 'پریناز محمدی',
      studentPhone: '09121122334',
      subject: 'فیزیک پایه دوازدهم و کنکور',
      jalaliDate: addJalaliDays(today.formatted, 7),
      time: '18:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'نوسان و امواج مکانیکی',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_301',
      studentId: 'stu_amirhossein_3',
      studentName: 'امیرحسین کاظمی',
      studentPhone: '09354455667',
      subject: 'برنامه‌نویسی پایتون و الگوریتم',
      jalaliDate: addJalaliDays(today.formatted, -4),
      time: '19:30',
      attendanceStatus: 'present',
      grade: 20,
      topic: 'ساختمان داده‌ها، درخت دودویی و پیمایش بازگشتی',
      teacherNote: 'پیاده‌سازی پروژه الگوریتم مسیریابی بدون خطا بود.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_302',
      studentId: 'stu_amirhossein_3',
      studentName: 'امیرحسین کاظمی',
      studentPhone: '09354455667',
      subject: 'برنامه‌نویسی پایتون و الگوریتم',
      jalaliDate: addJalaliDays(today.formatted, 2),
      time: '19:30',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'برنامه‌نویسی پویا (Dynamic Programming)',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_401',
      studentId: 'stu_ghazal_4',
      studentName: 'غزل نادری',
      studentPhone: '09198877665',
      subject: 'زبان انگلیسی آیلتس (IELTS)',
      jalaliDate: addJalaliDays(today.formatted, -2),
      time: '15:00',
      attendanceStatus: 'absent',
      grade: -1,
      topic: 'تصحیح رایتینگ تسک ۲ و شبیه‌سازی اسپیکینگ',
      teacherNote: 'غیبت با اطلاع قبلی — جلسه جبرانی هماهنگ شد.',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_402',
      studentId: 'stu_ghazal_4',
      studentName: 'غزل نادری',
      studentPhone: '09198877665',
      subject: 'زبان انگلیسی آیلتس (IELTS)',
      jalaliDate: addJalaliDays(today.formatted, 4),
      time: '15:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'شبیه‌سازی کامل آزمون Speaking Part 2 & 3',
      teacherNote: '',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const fariborzRecharges: RechargeRequest[] = [
    {
      id: 'req_parinaz_1',
      studentId: 'stu_parinaz_2',
      studentName: 'پریناز محمدی',
      studentPhone: '09121122334',
      requestedSessions: 6,
      totalAmount: 3480000,
      paymentNote: 'واریز کارت به کارت — کد پیگیری ۴۸۲۹۱۰ (شامل تسویه ۱ جلسه بدهی قبلی)',
      status: 'pending',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'req_kiarash_0',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      studentPhone: '09123456789',
      requestedSessions: 4,
      totalAmount: 2600000,
      paymentNote: 'تمدید دوره آبان‌ماه — فیش بانکی ثبت شد',
      status: 'approved',
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const fariborzMessages: ChatMessage[] = [
    {
      id: 'msg_1',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      senderRole: 'teacher',
      senderName: teacherName,
      text: 'سلام کیارش جان، جزوه مبحث مشتق ضمنی و سوالات تکمیلی برای جلسه امروز ارسال شد. حتماً قبل از ساعت ۱۶:۳۰ مرور کن.',
      jalaliTime: `${today.weekdayName} ۱۴:۱۰`,
      teacherId,
      createdAt: nowIso,
    },
    {
      id: 'msg_2',
      studentId: 'stu_kiarash_1',
      studentName: 'کیارش رضایی',
      senderRole: 'student',
      senderName: 'کیارش رضایی',
      text: 'سلام استاد وقتتون بخیر، چشم حتماً. تمرین‌های گراف هم کامل حل کردم و آماده تحویل هست.',
      jalaliTime: `${today.weekdayName} ۱۴:۲۵`,
      teacherId,
      createdAt: nowIso,
    },
    {
      id: 'msg_3',
      studentId: 'stu_parinaz_2',
      studentName: 'پریناز محمدی',
      senderRole: 'student',
      senderName: 'پریناز محمدی',
      text: 'سلام استاد، درخواست شارژ ۶ جلسه جدید رو در سامانه ثبت کردم تا ۱ جلسه معوق قبلی هم تسویه بشه. ممنون میشم بررسی بفرمایید.',
      jalaliTime: `${today.weekdayName} ۱۱:۴۰`,
      teacherId,
      createdAt: nowIso,
    },
  ];

  const fariborzNotifications: AppNotification[] = [
    {
      id: 'notif_1',
      targetRole: 'teacher',
      targetStudentId: 'stu_parinaz_2',
      type: 'recharge_requested',
      title: 'درخواست شارژ جلسات جدید',
      body: 'پریناز محمدی درخواست شارژ ۶ جلسه (۳,۴۸۰,۰۰۰ تومان) را ثبت کرده است.',
      jalaliTime: `${today.weekdayName} ۱۱:۴۰`,
      isRead: false,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'notif_2',
      targetRole: 'student',
      targetStudentId: 'stu_kiarash_1',
      type: 'session_reminder',
      title: 'یادآوری جلسه امروز ساعت ۱۶:۳۰',
      body: 'جلسه ریاضیات گسسته و حسابان امروز برگزار می‌شود. مبحث: مشتق توابع ضمنی.',
      jalaliTime: `${today.weekdayName} ۰۹:۰۰`,
      isRead: false,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'notif_3',
      targetRole: 'student',
      targetStudentId: 'stu_parinaz_2',
      type: 'session_reminder',
      title: 'یادآوری جلسه امروز ساعت ۱۸:۰۰',
      body: 'جلسه فیزیک پایه دوازدهم امروز راس ساعت ۱۸:۰۰ برگزار خواهد شد.',
      jalaliTime: `${today.weekdayName} ۰۹:۱۵`,
      isRead: false,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'notif_4',
      targetRole: 'student',
      targetStudentId: 'stu_kiarash_1',
      type: 'payment_approved',
      title: 'تایید پرداخت و شارژ ۴ جلسه',
      body: 'پرداخت شهریه شما به مبلغ ۲,۶۰۰,۰۰۰ تومان توسط استاد تایید و ۴ جلسه به اعتبار شما افزوده شد.',
      jalaliTime: '۲ روز پیش',
      isRead: true,
      teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const ramySeed = buildRamySeedData(today, nowIso);

  return {
    students: [...fariborzStudents, ...ramySeed.students],
    sessions: [...fariborzSessions, ...ramySeed.sessions],
    rechargeRequests: [...fariborzRecharges, ...ramySeed.rechargeRequests],
    messages: [...fariborzMessages, ...ramySeed.messages],
    notifications: [...fariborzNotifications, ...ramySeed.notifications],
  };
}

function loadState(): ServerStateSnapshot {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const raw = fs.readFileSync(DATA_FILE, 'utf-8');
      const parsed = JSON.parse(raw) as ServerStateSnapshot;
      if (parsed && Array.isArray(parsed.students)) {
        let needsSave = false;
        parsed.students = parsed.students.map((stu, idx) => {
          const defaultDays =
            idx === 0
              ? [0, 3]
              : idx === 1
              ? [1, 4]
              : idx === 2
              ? [2, 5]
              : [0, 2, 4];
          const hasPassword =
            typeof stu.password === 'string' && stu.password.trim().length > 0;
          const hasSelectedDays =
            Array.isArray(stu.selectedDays) && stu.selectedDays.length > 0;

          if (!hasPassword || !hasSelectedDays) {
            needsSave = true;
          }

          const cleanDays = hasSelectedDays
            ? sanitizeSelectedDays(stu.selectedDays)
            : defaultDays;

          return {
            ...stu,
            password: hasPassword ? stu.password : '123456',
            selectedDays: cleanDays,
            intervalType: stu.intervalType || 'custom_days',
            intervalLabel: hasSelectedDays
              ? stu.intervalLabel || formatWeekdaysLabel(cleanDays)
              : formatWeekdaysLabel(cleanDays),
          };
        });

        // Ensure Teacher Ramy ('teacher_ramy') has his seeded classes & students if migrating from earlier state
        const hasRamyStudents = parsed.students.some(
          (s) => s.teacherId === 'teacher_ramy'
        );
        if (!hasRamyStudents) {
          const today = getCurrentJalaliDate();
          const nowIso = new Date().toISOString();
          const ramySeed = buildRamySeedData(today, nowIso);
          parsed.students.push(...ramySeed.students);
          parsed.sessions.push(...ramySeed.sessions);
          parsed.rechargeRequests.push(...ramySeed.rechargeRequests);
          parsed.messages.push(...ramySeed.messages);
          parsed.notifications.push(...ramySeed.notifications);
          needsSave = true;
        }

        if (needsSave) {
          saveState(parsed);
        }
        return parsed;
      }
    }
  } catch (err) {
    console.error('Failed to read server-data.json, re-seeding:', err);
  }
  const initial = buildInitialSeedState();
  saveState(initial);
  return initial;
}

function saveState(state: ServerStateSnapshot): void {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to persist server-data.json:', err);
  }
}

function normalizePhone(input: string): string {
  const digits = toEnglishDigits(input || '').replace(/\D/g, '');
  if (digits.startsWith('989') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '0' + digits;
  }
  return digits;
}

/**
 * Filters the full server state so a teacher ONLY receives their own isolated classes, students,
 * sessions, recharge requests, messages, and notifications.
 */
function buildTeacherIsolatedSnapshot(
  fullState: ServerStateSnapshot,
  teacherId: string
): ServerStateSnapshot {
  const teacherStudentIds = new Set(
    fullState.students
      .filter((s) => s.teacherId === teacherId)
      .map((s) => s.id)
  );
  return {
    students: fullState.students.filter((s) => s.teacherId === teacherId),
    sessions: fullState.sessions.filter(
      (s) => s.teacherId === teacherId || teacherStudentIds.has(s.studentId)
    ),
    rechargeRequests: fullState.rechargeRequests.filter(
      (r) => r.teacherId === teacherId || teacherStudentIds.has(r.studentId)
    ),
    messages: fullState.messages.filter(
      (m) => m.teacherId === teacherId || teacherStudentIds.has(m.studentId)
    ),
    notifications: fullState.notifications.filter(
      (n) => n.teacherId === teacherId || teacherStudentIds.has(n.targetStudentId)
    ),
  };
}

/**
 * Filters the full server state so a student ONLY receives their own isolated records.
 * Never exposes any other student's profile, sessions, recharges, messages, or notifications.
 */
function buildStudentIsolatedSnapshot(
  fullState: ServerStateSnapshot,
  studentId: string
): ServerStateSnapshot {
  return {
    students: fullState.students.filter((s) => s.id === studentId),
    sessions: fullState.sessions.filter((s) => s.studentId === studentId),
    rechargeRequests: fullState.rechargeRequests.filter(
      (r) => r.studentId === studentId
    ),
    messages: fullState.messages.filter((m) => m.studentId === studentId),
    notifications: fullState.notifications.filter(
      (n) => n.targetRole === 'student' && n.targetStudentId === studentId
    ),
  };
}

interface OtpEntry {
  code: string;
  studentId: string;
  expiresAt: number;
}

interface AuthSession {
  role: 'teacher' | 'student';
  teacherId?: string;
  studentId?: string;
  createdAt: number;
}

async function startServer() {
  const app = express();
  const server = http.createServer(app);
  const wss = new WebSocketServer({ noServer: true });

  server.on('upgrade', (req, socket, head) => {
    try {
      const urlObj = new URL(req.url || '/', 'http://localhost:3000');
      if (urlObj.pathname === '/ws') {
        wss.handleUpgrade(req, socket, head, (ws) => {
          wss.emit('connection', ws, req);
        });
      }
    } catch {
      socket.destroy();
    }
  });

  app.use(express.json());

  let state: ServerStateSnapshot = loadState();
  const otpStore = new Map<string, OtpEntry>();
  const sessionTokens = new Map<string, AuthSession>();
  const revokedTokens = new Set<string>();
  const wsClientAuth = new WeakMap<WebSocket, AuthSession>();
  const TOKEN_HMAC_SECRET = 'maktabyar_session_hmac_v1_secret';

  function createSignedToken(
    role: 'teacher' | 'student',
    subjectId: string
  ): string {
    const nonce = crypto.randomBytes(8).toString('hex');
    const payload = `${role}.${subjectId}.${nonce}`;
    const sig = crypto
      .createHmac('sha256', TOKEN_HMAC_SECRET)
      .update(payload)
      .digest('hex')
      .slice(0, 32);
    return `${payload}.${sig}`;
  }

  function resolveSessionFromToken(token: string): AuthSession | null {
    if (!token || revokedTokens.has(token)) return null;
    const existing = sessionTokens.get(token);
    if (existing) return existing;

    const parts = token.split('.');
    if (parts.length === 4) {
      const [role, subjectId, nonce, sig] = parts;
      const payload = `${role}.${subjectId}.${nonce}`;
      const expectedSig = crypto
        .createHmac('sha256', TOKEN_HMAC_SECRET)
        .update(payload)
        .digest('hex')
        .slice(0, 32);
      if (sig === expectedSig) {
        if (role === 'teacher') {
          const teacher = TEACHERS_CONFIG.find((t) => t.id === subjectId);
          if (teacher) {
            const restored: AuthSession = {
              role: 'teacher',
              teacherId: teacher.id,
              createdAt: Date.now(),
            };
            sessionTokens.set(token, restored);
            return restored;
          }
        } else if (role === 'student') {
          const student = state.students.find((s) => s.id === subjectId);
          if (student) {
            const restored: AuthSession = {
              role: 'student',
              studentId: student.id,
              teacherId: student.teacherId,
              createdAt: Date.now(),
            };
            sessionTokens.set(token, restored);
            return restored;
          }
        }
      }
    }
    return null;
  }

  function getAuthSessionFromRequest(req: express.Request): AuthSession | null {
    const authHeader = req.headers.authorization || '';
    if (!authHeader.startsWith('Bearer ')) return null;
    const token = authHeader.slice(7).trim();
    return resolveSessionFromToken(token);
  }

  function requireTeacherAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const authSess = getAuthSessionFromRequest(req);
    if (!authSess || authSess.role !== 'teacher' || !authSess.teacherId) {
      res.status(401).json({
        error: 'دسترسی غیرمجاز: فقط اساتید سامانه مجاز به انجام این عملیات هستند.',
      });
      return;
    }
    (req as express.Request & { authSession?: AuthSession }).authSession = authSess;
    next();
  }

  function requireStudentOrTeacherAuth(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) {
    const authSess = getAuthSessionFromRequest(req);
    if (!authSess) {
      res.status(401).json({
        error: 'لطفاً ابتدا وارد حساب کاربری خود شوید.',
      });
      return;
    }
    (req as express.Request & { authSession?: AuthSession }).authSession = authSess;
    next();
  }

  /**
   * Broadcasts an event ONLY to authorized WebSocket clients:
   * - Teacher clients ONLY receive events belonging to their `teacherId`.
   * - Student clients ONLY receive events strictly belonging to their own `studentId`.
   */
  function broadcastScoped(
    event: WsEventMessage,
    targetStudentId?: string,
    targetTeacherId?: string
  ) {
    const serialized = JSON.stringify(event);
    for (const client of wss.clients) {
      if (client.readyState !== WebSocket.OPEN) continue;
      const clientAuth = wsClientAuth.get(client);
      if (!clientAuth) continue;

      if (clientAuth.role === 'teacher') {
        if (!targetTeacherId || clientAuth.teacherId === targetTeacherId) {
          client.send(serialized);
        }
      } else if (
        clientAuth.role === 'student' &&
        clientAuth.studentId &&
        targetStudentId &&
        clientAuth.studentId === targetStudentId
      ) {
        if (
          event.type === 'notification:created' &&
          event.payload.targetRole !== 'student'
        ) {
          continue;
        }
        client.send(serialized);
      }
    }
  }

  wss.on('connection', (ws, req) => {
    try {
      const urlObj = new URL(req.url || '/ws', 'http://localhost:3000');
      const token = urlObj.searchParams.get('token') || '';
      const authSess = resolveSessionFromToken(token);

      if (authSess) {
        wsClientAuth.set(ws, authSess);
        if (authSess.role === 'teacher' && authSess.teacherId) {
          ws.send(
            JSON.stringify({
              type: 'init',
              payload: buildTeacherIsolatedSnapshot(state, authSess.teacherId),
            })
          );
        } else if (authSess.role === 'student' && authSess.studentId) {
          ws.send(
            JSON.stringify({
              type: 'init',
              payload: buildStudentIsolatedSnapshot(state, authSess.studentId),
            })
          );
        }
      }
    } catch {
      // ignore URL parse error
    }

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(String(raw));
        if (msg && msg.type === 'auth' && typeof msg.token === 'string') {
          const authSess = resolveSessionFromToken(msg.token);
          if (authSess) {
            wsClientAuth.set(ws, authSess);
            if (authSess.role === 'teacher' && authSess.teacherId) {
              ws.send(
                JSON.stringify({
                  type: 'init',
                  payload: buildTeacherIsolatedSnapshot(state, authSess.teacherId),
                })
              );
            } else if (authSess.role === 'student' && authSess.studentId) {
              ws.send(
                JSON.stringify({
                  type: 'init',
                  payload: buildStudentIsolatedSnapshot(state, authSess.studentId),
                })
              );
            }
          }
        } else if (msg && msg.type === 'ping') {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      } catch {
        // ignore malformed client messages
      }
    });
  });

  // =========================================================================
  // 1. Multi-Teacher Login (fariborz_farzad & Ramy)
  // =========================================================================
  app.post('/api/auth/teacher-login', (req, res) => {
    const username = String(req.body?.username || '').trim();
    const password = String(req.body?.password || '');

    const matchedTeacher = TEACHERS_CONFIG.find(
      (t) =>
        (t.username === username ||
          t.username.toLowerCase() === username.toLowerCase()) &&
        verifyTeacherPassword(t, password)
    );

    if (!matchedTeacher) {
      res.status(401).json({
        error: 'نام کاربری یا رمز عبور استاد نادرست است.',
      });
      return;
    }

    const token = createSignedToken('teacher', matchedTeacher.id);
    sessionTokens.set(token, {
      role: 'teacher',
      teacherId: matchedTeacher.id,
      createdAt: Date.now(),
    });

    res.json({
      ok: true,
      token,
      teacher: {
        id: matchedTeacher.id,
        name: matchedTeacher.name,
        username: matchedTeacher.username,
        phone: matchedTeacher.phoneDisplay,
      },
      state: buildTeacherIsolatedSnapshot(state, matchedTeacher.id),
    });
  });

  app.get('/api/auth/session', (req, res) => {
    const authSess = getAuthSessionFromRequest(req);
    if (!authSess) {
      res.status(401).json({ error: 'نشست کاربری معتبر نیست.' });
      return;
    }
    if (authSess.role === 'teacher' && authSess.teacherId) {
      const teacher = getTeacherById(authSess.teacherId);
      res.json({
        ok: true,
        role: 'teacher',
        teacher: {
          id: teacher.id,
          name: teacher.name,
          username: teacher.username,
          phone: teacher.phoneDisplay,
        },
        state: buildTeacherIsolatedSnapshot(state, teacher.id),
      });
      return;
    }
    if (authSess.role === 'student' && authSess.studentId) {
      const student = state.students.find((s) => s.id === authSess.studentId);
      if (!student) {
        res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
        return;
      }
      res.json({
        ok: true,
        role: 'student',
        student,
        isolatedState: buildStudentIsolatedSnapshot(state, student.id),
      });
      return;
    }
    res.status(401).json({ error: 'نشست نامعتبر.' });
  });

  app.post('/api/auth/logout', (req, res) => {
    const authHeader = req.headers.authorization || '';
    if (authHeader.startsWith('Bearer ')) {
      const token = authHeader.slice(7).trim();
      sessionTokens.delete(token);
      revokedTokens.add(token);
    }
    res.json({ ok: true });
  });

  // =========================================================================
  // 2A. Student Login with Phone Number + Password (Preset/Editable by Teacher)
  // =========================================================================
  app.post('/api/auth/student-login', (req, res) => {
    const rawPhone = String(req.body?.phone || '');
    const rawPassword = toEnglishDigits(String(req.body?.password || '')).trim();
    const originalPassword = String(req.body?.password || '').trim();
    const phone = normalizePhone(rawPhone);

    const matchedTeacherPhone = TEACHERS_CONFIG.find(
      (t) => t.phoneNormalized === phone
    );
    if (matchedTeacherPhone) {
      res.status(400).json({
        error: `این شماره متعلق به ${matchedTeacherPhone.name} است. لطفاً از بخش «ورود استاد» با نام کاربری و رمز عبور وارد شوید.`,
      });
      return;
    }

    if (!/^09[0-9]{9}$/.test(phone)) {
      res.status(400).json({
        error: 'شماره موبایل وارد شده معتبر نیست. لطفاً شماره‌ای ۱۱ رقمی با پیش‌شماره ۰۹ وارد کنید.',
      });
      return;
    }

    if (!originalPassword) {
      res.status(400).json({
        error: 'لطفاً رمز عبور خود را وارد نمایید.',
      });
      return;
    }

    const student = state.students.find((s) => normalizePhone(s.phone) === phone);
    if (!student) {
      res.status(404).json({
        error: 'دانش‌آموزی با این شماره موبایل در سامانه ثبت نشده است. استاد باید ابتدا شماره شما را ثبت کند.',
      });
      return;
    }

    const expectedPassword = String(student.password || '123456').trim();
    const expectedNormalized = toEnglishDigits(expectedPassword);

    if (
      originalPassword !== expectedPassword &&
      rawPassword !== expectedNormalized
    ) {
      res.status(401).json({
        error: 'رمز عبور وارد شده نادرست است. رمز عبور توسط استاد هنگام ثبت‌نام تعیین شده است.',
      });
      return;
    }

    const token = createSignedToken('student', student.id);
    sessionTokens.set(token, {
      role: 'student',
      studentId: student.id,
      teacherId: student.teacherId,
      createdAt: Date.now(),
    });

    res.json({
      ok: true,
      token,
      student,
      isolatedState: buildStudentIsolatedSnapshot(state, student.id),
    });
  });

  // =========================================================================
  // 2B. Student Phone + OTP Authentication (Strict Isolation)
  // =========================================================================
  app.post('/api/auth/request-otp', (req, res) => {
    const rawPhone = String(req.body?.phone || '');
    const phone = normalizePhone(rawPhone);

    const matchedTeacherPhone = TEACHERS_CONFIG.find(
      (t) => t.phoneNormalized === phone
    );
    if (matchedTeacherPhone) {
      res.status(400).json({
        error: `این شماره متعلق به ${matchedTeacherPhone.name} است. لطفاً از بخش «ورود استاد» با نام کاربری و رمز عبور وارد شوید.`,
      });
      return;
    }

    if (!/^09[0-9]{9}$/.test(phone)) {
      res.status(400).json({
        error: 'شماره موبایل وارد شده معتبر نیست. لطفاً شماره‌ای ۱۱ رقمی با پیش‌شماره ۰۹ وارد کنید.',
      });
      return;
    }

    const student = state.students.find((s) => normalizePhone(s.phone) === phone);
    if (!student) {
      res.status(404).json({
        error: 'دانش‌آموزی با این شماره موبایل در سامانه ثبت نشده است. استاد باید ابتدا شماره شما را ثبت کند.',
      });
      return;
    }

    const code = String(Math.floor(100000 + Math.random() * 900000));
    otpStore.set(phone, {
      code,
      studentId: student.id,
      expiresAt: Date.now() + 2 * 60 * 1000,
    });

    res.json({
      ok: true,
      phone,
      expiresIn: 120,
      otpPreview: code,
    });
  });

  app.post('/api/auth/verify-otp', (req, res) => {
    const phone = normalizePhone(String(req.body?.phone || ''));
    const code = toEnglishDigits(String(req.body?.code || '')).trim();

    const entry = otpStore.get(phone);
    if (!entry) {
      res.status(400).json({
        error: 'کد تایید برای این شماره درخواست نشده یا منقضی شده است. مجدداً درخواست کد دهید.',
      });
      return;
    }

    if (Date.now() > entry.expiresAt) {
      otpStore.delete(phone);
      res.status(400).json({
        error: 'مهلت زمانی کد تایید به پایان رسیده است. لطفاً کد جدید دریافت کنید.',
      });
      return;
    }

    if (entry.code !== code) {
      res.status(401).json({
        error: 'کد تایید وارد شده اشتباه است. لطفاً کد ۶ رقمی پیامک‌شده را با دقت وارد کنید.',
      });
      return;
    }

    otpStore.delete(phone);
    const student = state.students.find((s) => s.id === entry.studentId);
    if (!student) {
      res.status(404).json({ error: 'اطلاعات دانش‌آموز یافت نشد.' });
      return;
    }

    const token = createSignedToken('student', student.id);
    sessionTokens.set(token, {
      role: 'student',
      studentId: student.id,
      teacherId: student.teacherId,
      createdAt: Date.now(),
    });

    res.json({
      ok: true,
      token,
      student,
      isolatedState: buildStudentIsolatedSnapshot(state, student.id),
    });
  });

  // =========================================================================
  // 3. State Endpoints (Strictly Scoped by Role & Teacher)
  // =========================================================================

  app.get('/api/state', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const teacherId = authSess?.teacherId || TEACHERS_CONFIG[0].id;
    res.json(buildTeacherIsolatedSnapshot(state, teacherId));
  });

  app.get('/api/student/me', requireStudentOrTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    if (!authSess || authSess.role !== 'student' || !authSess.studentId) {
      res.status(403).json({ error: 'نشست دانش‌آموز معتبر نیست.' });
      return;
    }
    const student = state.students.find((s) => s.id === authSess.studentId);
    if (!student) {
      res.status(404).json({ error: 'حساب دانش‌آموز یافت نشد.' });
      return;
    }
    res.json({
      student,
      isolatedState: buildStudentIsolatedSnapshot(state, student.id),
    });
  });

  // =========================================================================
  // 4. Teacher-Only Protected Mutation Routes (Scoped per Teacher)
  // =========================================================================

  app.post('/api/students', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const activeTeacher = getTeacherById(authSess?.teacherId);

    const {
      name,
      phone: rawPhone,
      password: rawPassword,
      subject,
      startDate,
      classTime,
      selectedDays: rawSelectedDays,
      dayTimes: rawDayTimes,
      paymentType: rawPaymentType,
      postpaidCycleType: rawPostpaidCycleType,
      postpaidCycleSessions: rawPostpaidCycle,
      intervalType,
      intervalLabel,
      tuitionPerSession,
      sessionsLeft,
    } = req.body;

    const phone = normalizePhone(String(rawPhone || ''));
    const password = String(rawPassword || '').trim();

    if (!name || !/^09[0-9]{9}$/.test(phone) || !subject) {
      res.status(400).json({
        error: 'نام دانش‌آموز، عنوان درس و شماره موبایل معتبر الزامی است.',
      });
      return;
    }

    if (password.length < 3) {
      res.status(400).json({
        error: 'لطفاً رمز عبور ورود دانش‌آموز را حداقل ۳ کاراکتر تعیین کنید.',
      });
      return;
    }

    const existingPhone = state.students.find((s) => normalizePhone(s.phone) === phone);
    if (existingPhone) {
      res.status(400).json({
        error: 'دانش‌آموزی با این شماره موبایل قبلاً در سامانه ثبت شده است.',
      });
      return;
    }

    const today = getCurrentJalaliDate();
    const nowIso = new Date().toISOString();
    const cleanStart = toEnglishDigits(String(startDate || today.formatted)).trim();
    const cleanSelectedDays = sanitizeSelectedDays(rawSelectedDays);
    const cleanTime = toEnglishDigits(String(classTime || '17:00')).trim();
    const cleanDayTimes = sanitizeDayTimes(
      rawDayTimes,
      cleanSelectedDays,
      cleanTime
    );
    const primaryTime =
      cleanDayTimes[String(cleanSelectedDays[0])] || cleanTime;

    const computedIntervalLabel =
      formatWeekdaysLabel(cleanSelectedDays, cleanDayTimes, primaryTime) ||
      String(intervalLabel || 'هفتگی').slice(0, 80);

    const paymentType: PaymentSystemType =
      rawPaymentType === 'postpaid' ? 'postpaid' : 'prepaid';
    const postpaidCycleType: PostpaidCycleType = sanitizePostpaidCycleType(
      rawPostpaidCycleType
    );
    const postpaidCycleSessions = rawPostpaidCycleType
      ? calculatePostpaidCycleSessions(
          postpaidCycleType,
          cleanSelectedDays,
          cleanStart
        )
      : Math.max(
          1,
          Math.min(
            50,
            Number(rawPostpaidCycle) ||
              calculatePostpaidCycleSessions(
                postpaidCycleType,
                cleanSelectedDays,
                cleanStart
              )
          )
        );

    const initialSessionsLeft =
      sessionsLeft !== undefined && !isNaN(Number(sessionsLeft))
        ? Math.max(-500, Math.min(1000, Number(sessionsLeft)))
        : paymentType === 'postpaid'
        ? 0
        : 5;
    const totalPaid = Math.max(0, initialSessionsLeft);
    const tuition = Math.max(0, Number(tuitionPerSession) || 500000);

    const newStudent: Student = {
      id: `stu_${Date.now()}`,
      name: String(name).trim().slice(0, 100),
      phone,
      password: password.slice(0, 100),
      subject: String(subject).trim().slice(0, 100),
      startDate: cleanStart,
      classTime: primaryTime,
      selectedDays: cleanSelectedDays,
      dayTimes: cleanDayTimes,
      paymentType,
      postpaidCycleType,
      postpaidCycleSessions,
      intervalType: (intervalType as IntervalType) || 'custom_days',
      intervalLabel: computedIntervalLabel.slice(0, 120),
      tuitionPerSession: tuition,
      sessionsLeft: initialSessionsLeft,
      totalSessionsPaid: totalPaid,
      totalAttended: 0,
      teacherId: activeTeacher.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    state.students.unshift(newStudent);
    broadcastScoped(
      { type: 'student:created', payload: newStudent },
      newStudent.id,
      activeTeacher.id
    );

    const targetGenCount =
      initialSessionsLeft > 0
        ? initialSessionsLeft
        : paymentType === 'postpaid'
        ? postpaidCycleSessions
        : 3;
    const sessionsToGenerate = Math.min(Math.max(targetGenCount, 2), 8);
    const scheduledDates = generateSessionDatesByWeekdays(
      cleanStart,
      cleanSelectedDays,
      sessionsToGenerate
    );
    const createdSessions: ClassSession[] = [];

    scheduledDates.forEach((sessionDate, i) => {
      const resolvedTime = getTimeForJalaliDate(
        sessionDate,
        cleanSelectedDays,
        primaryTime,
        cleanDayTimes
      );
      const sess: ClassSession = {
        id: `sess_${Date.now()}_${i}`,
        studentId: newStudent.id,
        studentName: newStudent.name,
        studentPhone: newStudent.phone,
        subject: newStudent.subject,
        jalaliDate: sessionDate,
        time: resolvedTime,
        attendanceStatus: 'scheduled',
        grade: -1,
        topic: `جلسه ${toPersianDigits(i + 1)} — ${newStudent.subject}`,
        teacherNote: '',
        teacherId: activeTeacher.id,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      state.sessions.push(sess);
      createdSessions.push(sess);
      broadcastScoped(
        { type: 'session:created', payload: sess },
        newStudent.id,
        activeTeacher.id
      );
    });

    const paymentTypeLabel =
      paymentType === 'postpaid'
        ? `پس‌پرداخت (${formatPostpaidCycleLabel(
            postpaidCycleType,
            cleanSelectedDays,
            postpaidCycleSessions,
            cleanStart
          )})`
        : `پیش‌پرداخت (اعتبار ${formatSignedPersianNumber(initialSessionsLeft)} جلسه)`;

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: newStudent.id,
      type: 'session_reminder',
      title: `خوش آمدید به کلاس ${newStudent.subject}`,
      body: `برنامه کلاسی شما توسط ${activeTeacher.name} در روزهای (${newStudent.intervalLabel}) به صورت ${paymentTypeLabel} ثبت شد.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: activeTeacher.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(notif);
    broadcastScoped(
      { type: 'notification:created', payload: notif },
      newStudent.id,
      activeTeacher.id
    );

    saveState(state);
    res.json({ student: newStudent, createdSessions, notification: notif });
  });

  // Edit Student
  app.patch('/api/students/:id', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const student = state.students.find(
      (s) => s.id === req.params.id && s.teacherId === authSess?.teacherId
    );
    if (!student) {
      res.status(404).json({ error: 'دانش‌آموز مورد نظر یافت نشد.' });
      return;
    }

    const {
      name,
      phone: rawPhone,
      password: rawPassword,
      subject,
      startDate,
      classTime,
      selectedDays: rawSelectedDays,
      dayTimes: rawDayTimes,
      paymentType: rawPaymentType,
      postpaidCycleType: rawPostpaidCycleType,
      postpaidCycleSessions: rawPostpaidCycle,
      tuitionPerSession,
      sessionsLeft,
      totalSessionsPaid,
      totalAttended,
    } = req.body;

    if (rawPhone !== undefined) {
      const normalized = normalizePhone(String(rawPhone));
      if (!/^09[0-9]{9}$/.test(normalized)) {
        res.status(400).json({
          error: 'شماره موبایل وارد شده معتبر نیست (۱۱ رقم با پیش‌شماره ۰۹).',
        });
        return;
      }
      const duplicate = state.students.find(
        (s) => s.id !== student.id && normalizePhone(s.phone) === normalized
      );
      if (duplicate) {
        res.status(400).json({
          error: 'این شماره موبایل برای دانش‌آموز دیگری ثبت شده است.',
        });
        return;
      }
      student.phone = normalized;
    }

    if (rawPassword !== undefined) {
      const trimmedPass = String(rawPassword).trim();
      if (trimmedPass.length < 3) {
        res.status(400).json({
          error: 'رمز عبور دانش‌آموز باید حداقل ۳ کاراکتر باشد.',
        });
        return;
      }
      student.password = trimmedPass.slice(0, 100);
    }

    if (name !== undefined && String(name).trim()) {
      student.name = String(name).trim().slice(0, 100);
    }
    if (subject !== undefined && String(subject).trim()) {
      student.subject = String(subject).trim().slice(0, 100);
    }
    if (startDate !== undefined && String(startDate).trim()) {
      student.startDate = toEnglishDigits(String(startDate)).trim();
    }
    if (classTime !== undefined && String(classTime).trim()) {
      student.classTime = toEnglishDigits(String(classTime)).trim();
    }
    if (rawSelectedDays !== undefined) {
      student.selectedDays = sanitizeSelectedDays(rawSelectedDays);
      student.intervalType = 'custom_days';
    }
    if (rawDayTimes !== undefined || rawSelectedDays !== undefined || classTime !== undefined) {
      const updatedDayTimes = sanitizeDayTimes(
        rawDayTimes !== undefined ? rawDayTimes : student.dayTimes,
        student.selectedDays,
        student.classTime
      );
      student.dayTimes = updatedDayTimes;
      const firstDayKey = String(student.selectedDays[0] ?? 0);
      if (updatedDayTimes[firstDayKey]) {
        student.classTime = updatedDayTimes[firstDayKey];
      }
      student.intervalLabel = formatWeekdaysLabel(
        student.selectedDays,
        student.dayTimes,
        student.classTime
      ).slice(0, 120);
    }
    if (rawPaymentType === 'prepaid' || rawPaymentType === 'postpaid') {
      student.paymentType = rawPaymentType;
    }
    if (rawPostpaidCycleType !== undefined) {
      student.postpaidCycleType = sanitizePostpaidCycleType(rawPostpaidCycleType);
      student.postpaidCycleSessions = calculatePostpaidCycleSessions(
        student.postpaidCycleType,
        student.selectedDays,
        student.startDate
      );
    } else if (
      (rawSelectedDays !== undefined || startDate !== undefined) &&
      student.postpaidCycleType
    ) {
      student.postpaidCycleSessions = calculatePostpaidCycleSessions(
        student.postpaidCycleType,
        student.selectedDays,
        student.startDate
      );
    } else if (rawPostpaidCycle !== undefined && !isNaN(Number(rawPostpaidCycle))) {
      student.postpaidCycleSessions = Math.max(
        1,
        Math.min(50, Number(rawPostpaidCycle))
      );
    }
    if (tuitionPerSession !== undefined) {
      student.tuitionPerSession = Math.max(0, Number(tuitionPerSession) || 0);
    }
    if (totalSessionsPaid !== undefined && !isNaN(Number(totalSessionsPaid))) {
      student.totalSessionsPaid = Math.max(
        0,
        Math.min(5000, Number(totalSessionsPaid))
      );
    }
    if (totalAttended !== undefined && !isNaN(Number(totalAttended))) {
      student.totalAttended = Math.max(
        0,
        Math.min(5000, Number(totalAttended))
      );
    }
    if (sessionsLeft !== undefined && !isNaN(Number(sessionsLeft))) {
      student.sessionsLeft = Math.max(
        -500,
        Math.min(1000, Number(sessionsLeft))
      );
    } else if (
      totalSessionsPaid !== undefined ||
      totalAttended !== undefined
    ) {
      student.sessionsLeft = Math.max(
        -500,
        Math.min(1000, student.totalSessionsPaid - student.totalAttended)
      );
    }

    student.updatedAt = new Date().toISOString();

    for (const sess of state.sessions) {
      if (sess.studentId === student.id) {
        sess.studentName = student.name;
        sess.studentPhone = student.phone;
        sess.subject = student.subject;
        // Also update upcoming scheduled session times when per-weekday times change
        if (sess.attendanceStatus === 'scheduled') {
          sess.time = getTimeForJalaliDate(
            sess.jalaliDate,
            student.selectedDays,
            student.classTime,
            student.dayTimes
          );
        }
        broadcastScoped(
          { type: 'session:updated', payload: sess },
          student.id,
          student.teacherId
        );
      }
    }
    for (const reqItem of state.rechargeRequests) {
      if (reqItem.studentId === student.id) {
        reqItem.studentName = student.name;
        reqItem.studentPhone = student.phone;
      }
    }
    for (const msg of state.messages) {
      if (msg.studentId === student.id) {
        msg.studentName = student.name;
        if (msg.senderRole === 'student') {
          msg.senderName = student.name;
        }
      }
    }

    saveState(state);
    broadcastScoped(
      { type: 'student:updated', payload: student },
      student.id,
      student.teacherId
    );

    res.json({ student });
  });

  app.post('/api/students/:id/recharge', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const student = state.students.find(
      (s) => s.id === req.params.id && s.teacherId === authSess?.teacherId
    );
    if (!student) {
      res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
      return;
    }

    const addedSessions = Math.max(1, Math.min(100, Number(req.body?.addedSessions) || 1));
    const customTuition =
      req.body?.tuitionPerSession !== undefined
        ? Math.max(0, Number(req.body.tuitionPerSession))
        : student.tuitionPerSession;
    const paymentNote = String(req.body?.paymentNote || 'شارژ مستقیم توسط استاد').slice(0, 300);

    const nowIso = new Date().toISOString();
    const today = getCurrentJalaliDate();

    const previousBalance = student.sessionsLeft;
    student.tuitionPerSession = customTuition;
    student.sessionsLeft = previousBalance + addedSessions;
    student.totalSessionsPaid += addedSessions;
    student.updatedAt = nowIso;

    const rechargeRecord: RechargeRequest = {
      id: `req_direct_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      requestedSessions: addedSessions,
      totalAmount: addedSessions * customTuition,
      paymentNote,
      status: 'approved',
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.rechargeRequests.unshift(rechargeRecord);

    const debtNote =
      previousBalance < 0
        ? ` (با کسر ${toPersianDigits(Math.abs(previousBalance))} جلسه بدهی معوق قبلی، اعتبار خالص فعلی: ${formatSignedPersianNumber(student.sessionsLeft)} جلسه)`
        : ` (اعتبار فعلی: ${formatSignedPersianNumber(student.sessionsLeft)} جلسه)`;

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: student.id,
      type: 'payment_approved',
      title: `شارژ ${toPersianDigits(addedSessions)} جلسه جدید توسط استاد`,
      body: `تعداد ${toPersianDigits(addedSessions)} جلسه به حساب کلاس ${student.subject} افزوده شد${debtNote}.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(notif);

    saveState(state);
    broadcastScoped(
      { type: 'student:updated', payload: student },
      student.id,
      student.teacherId
    );
    broadcastScoped(
      { type: 'recharge:created', payload: rechargeRecord },
      student.id,
      student.teacherId
    );
    broadcastScoped(
      { type: 'notification:created', payload: notif },
      student.id,
      student.teacherId
    );

    res.json({ student, rechargeRecord, notification: notif });
  });

  app.delete('/api/students/:id', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const id = req.params.id;
    const student = state.students.find(
      (s) => s.id === id && s.teacherId === authSess?.teacherId
    );
    if (!student) {
      res.status(404).json({ error: 'دانش‌آموز یافت نشد.' });
      return;
    }
    state.students = state.students.filter((s) => s.id !== id);
    state.sessions = state.sessions.filter((sess) => sess.studentId !== id);
    saveState(state);
    broadcastScoped(
      { type: 'student:deleted', payload: { id } },
      id,
      student.teacherId
    );
    res.json({ ok: true });
  });

  app.post('/api/sessions', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const {
      studentId,
      jalaliDate,
      time,
      topic,
      teacherNote,
      attendanceStatus: rawStatus,
      grade: rawGrade,
    } = req.body;
    const student = state.students.find(
      (s) => s.id === studentId && s.teacherId === authSess?.teacherId
    );
    if (!student) {
      res.status(404).json({ error: 'دانش‌آموز انتخاب‌شده یافت نشد.' });
      return;
    }

    const nowIso = new Date().toISOString();
    const today = getCurrentJalaliDate();
    const cleanDate = toEnglishDigits(String(jalaliDate || today.formatted)).trim();
    const cleanTime = toEnglishDigits(String(time || student.classTime)).trim();
    const initialStatus =
      rawStatus === 'present' ||
      rawStatus === 'absent_charged' ||
      rawStatus === 'absent' ||
      rawStatus === 'excused'
        ? rawStatus
        : 'scheduled';
    const parsedGrade =
      rawGrade !== undefined && !isNaN(Number(rawGrade))
        ? Math.max(-1, Math.min(20, Number(rawGrade)))
        : -1;

    const newSession: ClassSession = {
      id: `sess_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      subject: student.subject,
      jalaliDate: cleanDate,
      time: cleanTime,
      attendanceStatus: initialStatus,
      grade: initialStatus === 'present' ? parsedGrade : -1,
      topic: String(topic || `جلسه آموزشی ${student.subject}`).slice(0, 300),
      teacherNote: String(teacherNote || '').slice(0, 500),
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    state.sessions.push(newSession);

    if (initialStatus === 'present' || initialStatus === 'absent_charged') {
      student.sessionsLeft = student.sessionsLeft - 1;
      if (initialStatus === 'present') {
        student.totalAttended += 1;
      }
      student.updatedAt = nowIso;
      broadcastScoped(
        { type: 'student:updated', payload: student },
        student.id,
        student.teacherId
      );
    }

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: student.id,
      type: 'session_reminder',
      title:
        initialStatus === 'present'
          ? `ثبت حضور جلسه جدید (${formatReadableJalali(cleanDate)})`
          : initialStatus === 'absent_charged'
          ? `ثبت غیبت با کسر جلسه (${formatReadableJalali(cleanDate)})`
          : `جلسه جدید در تاریخ ${formatReadableJalali(cleanDate)}`,
      body:
        initialStatus === 'present' || initialStatus === 'absent_charged'
          ? `جلسه کلاس ${student.subject} در تاریخ ${toPersianDigits(cleanDate)} ثبت و ۱ جلسه از اعتبار کسر شد. تراز فعلی: ${formatSignedPersianNumber(student.sessionsLeft)} جلسه.`
          : `جلسه کلاس ${student.subject} برای ساعت ${toPersianDigits(cleanTime)} با موضوع «${newSession.topic}» تنظیم شد.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(notif);

    saveState(state);
    broadcastScoped(
      { type: 'session:created', payload: newSession },
      student.id,
      student.teacherId
    );
    broadcastScoped(
      { type: 'notification:created', payload: notif },
      student.id,
      student.teacherId
    );

    res.json({ session: newSession, student, notification: notif });
  });

  app.patch('/api/sessions/:id', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const session = state.sessions.find(
      (s) => s.id === req.params.id && s.teacherId === authSess?.teacherId
    );
    if (!session) {
      res.status(404).json({ error: 'جلسه مورد نظر یافت نشد.' });
      return;
    }

    const prevStatus = session.attendanceStatus;
    const prevGrade = session.grade;
    const nextStatus = req.body?.attendanceStatus || session.attendanceStatus;
    const nextGrade =
      req.body?.grade !== undefined ? Number(req.body.grade) : session.grade;

    const nowIso = new Date().toISOString();
    const today = getCurrentJalaliDate();

    session.attendanceStatus = nextStatus;
    session.grade = isNaN(nextGrade) ? -1 : Math.max(-1, Math.min(20, nextGrade));
    if (req.body?.topic !== undefined) {
      session.topic = String(req.body.topic).slice(0, 300);
    }
    if (req.body?.teacherNote !== undefined) {
      session.teacherNote = String(req.body.teacherNote).slice(0, 500);
    }
    session.updatedAt = nowIso;

    const student = state.students.find((s) => s.id === session.studentId);
    let autoCreatedSession: ClassSession | null = null;

    if (student) {
      const wasConsumed =
        prevStatus === 'present' || prevStatus === 'absent_charged';
      const isNowConsumed =
        nextStatus === 'present' || nextStatus === 'absent_charged';

      const wasPresent = prevStatus === 'present';
      const isNowPresent = nextStatus === 'present';

      let studentModified = false;

      if (!wasConsumed && isNowConsumed) {
        student.sessionsLeft = student.sessionsLeft - 1;
        studentModified = true;
      } else if (wasConsumed && !isNowConsumed) {
        student.sessionsLeft = student.sessionsLeft + 1;
        studentModified = true;
      }

      if (!wasPresent && isNowPresent) {
        student.totalAttended += 1;
        studentModified = true;
      } else if (wasPresent && !isNowPresent) {
        student.totalAttended = Math.max(0, student.totalAttended - 1);
        studentModified = true;
      }

      if (studentModified) {
        student.updatedAt = nowIso;
        broadcastScoped(
          { type: 'student:updated', payload: student },
          student.id,
          student.teacherId
        );
      }

      // If all scheduled sessions for this student have now been marked (0 scheduled left),
      // automatically schedule their next upcoming session on their selected weekdays so the
      // teacher can seamlessly mark the 6th, 7th, etc. session (even into negative credit).
      const remainingScheduled = state.sessions.filter(
        (s) => s.studentId === student.id && s.attendanceStatus === 'scheduled'
      );
      if (remainingScheduled.length === 0) {
        const studentSessions = state.sessions
          .filter((s) => s.studentId === student.id)
          .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));
        const lastDate = studentSessions[0]?.jalaliDate || today.formatted;
        const nextStartCandidate = addJalaliDays(lastDate, 1);
        const nextDates = generateSessionDatesByWeekdays(
          nextStartCandidate,
          sanitizeSelectedDays(student.selectedDays),
          1
        );
        const nextDate = nextDates[0] || addJalaliDays(lastDate, 3);
        const nextSessionNumber = studentSessions.length + 1;
        const nextSessionTime = getTimeForJalaliDate(
          nextDate,
          student.selectedDays,
          student.classTime,
          student.dayTimes
        );
        autoCreatedSession = {
          id: `sess_${Date.now()}_auto`,
          studentId: student.id,
          studentName: student.name,
          studentPhone: student.phone,
          subject: student.subject,
          jalaliDate: nextDate,
          time: nextSessionTime,
          attendanceStatus: 'scheduled',
          grade: -1,
          topic: `جلسه ${toPersianDigits(nextSessionNumber)} — ${student.subject}`,
          teacherNote: '',
          teacherId: student.teacherId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        state.sessions.push(autoCreatedSession);
        broadcastScoped(
          { type: 'session:created', payload: autoCreatedSession },
          student.id,
          student.teacherId
        );
      }
    }

    let createdNotif: AppNotification | null = null;
    if (nextStatus === 'absent_charged' && prevStatus !== 'absent_charged') {
      createdNotif = {
        id: `notif_${Date.now()}`,
        targetRole: 'student',
        targetStudentId: session.studentId,
        type: 'session_reminder',
        title: `ثبت غیبت با کسر ۱ جلسه (${toPersianDigits(session.jalaliDate)})`,
        body: `غیبت شما در جلسه کلاس «${session.subject}» مورخ ${toPersianDigits(session.jalaliDate)} با کسر ۱ جلسه ثبت شد. تراز فعلی جلسات: ${formatSignedPersianNumber(student?.sessionsLeft ?? 0)} جلسه.`,
        jalaliTime: `${today.weekdayName} — اکنون`,
        isRead: false,
        teacherId: session.teacherId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      state.notifications.unshift(createdNotif);
      broadcastScoped(
        { type: 'notification:created', payload: createdNotif },
        session.studentId,
        session.teacherId
      );
    } else if (session.grade >= 0 && session.grade !== prevGrade) {
      createdNotif = {
        id: `notif_${Date.now()}`,
        targetRole: 'student',
        targetStudentId: session.studentId,
        type: 'grade_posted',
        title: `ثبت نمره جلسه (${toPersianDigits(session.grade)} از ۲۰)`,
        body: `نمره جلسه «${session.topic || session.subject}» در تاریخ ${toPersianDigits(session.jalaliDate)}، ${toPersianDigits(session.grade)} از ۲۰ ثبت شد.`,
        jalaliTime: `${today.weekdayName} — اکنون`,
        isRead: false,
        teacherId: session.teacherId,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      state.notifications.unshift(createdNotif);
      broadcastScoped(
        { type: 'notification:created', payload: createdNotif },
        session.studentId,
        session.teacherId
      );
    }

    saveState(state);
    broadcastScoped(
      { type: 'session:updated', payload: session },
      session.studentId,
      session.teacherId
    );

    res.json({
      session,
      student,
      autoCreatedSession,
      notification: createdNotif,
    });
  });

  app.patch('/api/recharge-requests/:id', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const requestItem = state.rechargeRequests.find(
      (r) => r.id === req.params.id && r.teacherId === authSess?.teacherId
    );
    if (!requestItem) {
      res.status(404).json({ error: 'درخواست شارژ یافت نشد.' });
      return;
    }

    if (requestItem.status !== 'pending') {
      res.status(400).json({ error: 'این درخواست قبلاً تعیین وضعیت شده است.' });
      return;
    }

    const decision = req.body?.status === 'approved' ? 'approved' : 'rejected';
    const nowIso = new Date().toISOString();
    const today = getCurrentJalaliDate();

    requestItem.status = decision;
    if (req.body?.paymentNote) {
      requestItem.paymentNote = String(req.body.paymentNote).slice(0, 300);
    }
    requestItem.updatedAt = nowIso;

    const student = state.students.find((s) => s.id === requestItem.studentId);
    let previousBalance = 0;
    if (student && decision === 'approved') {
      previousBalance = student.sessionsLeft;
      student.sessionsLeft = previousBalance + requestItem.requestedSessions;
      student.totalSessionsPaid += requestItem.requestedSessions;
      student.updatedAt = nowIso;
      broadcastScoped(
        { type: 'student:updated', payload: student },
        student.id,
        student.teacherId
      );
    }

    const debtDeductedText =
      previousBalance < 0
        ? ` (با کسر ${toPersianDigits(Math.abs(previousBalance))} جلسه بدهی قبلی، اعتبار خالص شما اکنون ${formatSignedPersianNumber(student?.sessionsLeft ?? 0)} جلسه است)`
        : ` (اعتبار فعلی: ${formatSignedPersianNumber(student?.sessionsLeft ?? 0)} جلسه)`;

    const studentNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: requestItem.studentId,
      type: decision === 'approved' ? 'payment_approved' : 'payment_rejected',
      title:
        decision === 'approved'
          ? `تایید درخواست شارژ (${toPersianDigits(requestItem.requestedSessions)} جلسه)`
          : 'عدم تایید درخواست شارژ جلسات',
      body:
        decision === 'approved'
          ? `درخواست شارژ ${toPersianDigits(requestItem.requestedSessions)} جلسه شما توسط استاد تایید شد${debtDeductedText}.`
          : 'درخواست شارژ شما تایید نشد. لطفاً جزئیات پرداخت را در گفتگوی مستقیم با استاد بررسی کنید.',
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: requestItem.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(studentNotif);

    saveState(state);
    broadcastScoped(
      { type: 'recharge:updated', payload: requestItem },
      requestItem.studentId,
      requestItem.teacherId
    );
    broadcastScoped(
      { type: 'notification:created', payload: studentNotif },
      requestItem.studentId,
      requestItem.teacherId
    );

    res.json({ rechargeRequest: requestItem, student, notification: studentNotif });
  });

  app.post('/api/notifications/reminder', requireTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const { sessionId } = req.body;
    const session = state.sessions.find(
      (s) => s.id === sessionId && s.teacherId === authSess?.teacherId
    );
    if (!session) {
      res.status(404).json({ error: 'جلسه یافت نشد.' });
      return;
    }

    const today = getCurrentJalaliDate();
    const nowIso = new Date().toISOString();

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: session.studentId,
      type: 'session_reminder',
      title: `یادآوری جلسه کلاس ${session.subject}`,
      body: `یادآوری استاد: جلسه شما در تاریخ ${formatReadableJalali(session.jalaliDate)} ساعت ${toPersianDigits(session.time)} برگزار می‌شود.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: session.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    state.notifications.unshift(notif);
    saveState(state);
    broadcastScoped(
      { type: 'notification:created', payload: notif },
      session.studentId,
      session.teacherId
    );

    res.json({ notification: notif });
  });

  // =========================================================================
  // 5. Shared / Student-Scoped Routes (Strict Student Ownership Enforcement)
  // =========================================================================

  app.post('/api/recharge-requests', requireStudentOrTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const { studentId, requestedSessions, paymentNote } = req.body;

    const effectiveStudentId =
      authSess?.role === 'student' ? authSess.studentId : studentId;

    const student = state.students.find((s) => s.id === effectiveStudentId);
    if (!student) {
      res.status(404).json({ error: 'اطلاعات دانش‌آموز یافت نشد.' });
      return;
    }

    const count = Math.max(1, Math.min(50, Number(requestedSessions) || 4));
    const totalAmount = count * student.tuitionPerSession;
    const nowIso = new Date().toISOString();
    const today = getCurrentJalaliDate();

    const newReq: RechargeRequest = {
      id: `req_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      studentPhone: student.phone,
      requestedSessions: count,
      totalAmount,
      paymentNote: String(paymentNote || 'درخواست تمدید جلسات از پنل دانش‌آموز').slice(0, 300),
      status: 'pending',
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    state.rechargeRequests.unshift(newReq);

    const teacherNotif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'teacher',
      targetStudentId: student.id,
      type: 'recharge_requested',
      title: `درخواست شارژ ${toPersianDigits(count)} جلسه — ${student.name}`,
      body: `${student.name} درخواست تمدید ${toPersianDigits(count)} جلسه به مبلغ ${toPersianDigits(totalAmount.toLocaleString('en-US'))} تومان ثبت کرد.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(teacherNotif);

    saveState(state);
    broadcastScoped(
      { type: 'recharge:created', payload: newReq },
      student.id,
      student.teacherId
    );
    broadcastScoped(
      { type: 'notification:created', payload: teacherNotif },
      undefined,
      student.teacherId
    );

    res.json({ rechargeRequest: newReq, notification: teacherNotif });
  });

  app.post('/api/messages', requireStudentOrTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const { studentId, text } = req.body;

    const effectiveStudentId =
      authSess?.role === 'student' ? authSess.studentId : studentId;

    const student = state.students.find((s) => s.id === effectiveStudentId);
    if (!student || !text || !String(text).trim()) {
      res.status(400).json({ error: 'متن پیام و مخاطب معتبر الزامی است.' });
      return;
    }

    const teacherObj = getTeacherById(student.teacherId);
    const senderRole = authSess?.role === 'student' ? 'student' : 'teacher';
    const senderName =
      senderRole === 'student' ? student.name : teacherObj.name;

    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    const today = getCurrentJalaliDate();
    const nowIso = now.toISOString();

    const message: ChatMessage = {
      id: `msg_${Date.now()}`,
      studentId: student.id,
      studentName: student.name,
      senderRole,
      senderName,
      text: String(text).trim().slice(0, 1000),
      jalaliTime: `${today.weekdayName} ${toPersianDigits(hh)}:${toPersianDigits(mm)}`,
      teacherId: student.teacherId,
      createdAt: nowIso,
    };

    state.messages.push(message);

    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: senderRole === 'teacher' ? 'student' : 'teacher',
      targetStudentId: student.id,
      type: 'new_message',
      title: `پیام جدید از ${message.senderName}`,
      body: message.text.slice(0, 140),
      jalaliTime: message.jalaliTime,
      isRead: false,
      teacherId: student.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(notif);

    saveState(state);
    broadcastScoped(
      { type: 'message:created', payload: message },
      student.id,
      student.teacherId
    );
    broadcastScoped(
      { type: 'notification:created', payload: notif },
      senderRole === 'teacher' ? student.id : undefined,
      student.teacherId
    );

    res.json({ message, notification: notif });
  });

  app.patch('/api/notifications/:id/read', requireStudentOrTeacherAuth, (req, res) => {
    const authSess = (req as express.Request & { authSession?: AuthSession })
      .authSession;
    const notif = state.notifications.find((n) => n.id === req.params.id);
    if (!notif) {
      res.status(404).json({ error: 'اعلان یافت نشد.' });
      return;
    }

    if (
      authSess?.role === 'student' &&
      notif.targetStudentId !== authSess.studentId
    ) {
      res.status(403).json({ error: 'عدم دسترسی به این اعلان.' });
      return;
    }

    notif.isRead = true;
    notif.updatedAt = new Date().toISOString();
    saveState(state);
    broadcastScoped(
      { type: 'notification:updated', payload: notif },
      notif.targetStudentId,
      notif.teacherId
    );
    res.json({ notification: notif });
  });

  app.get('/manifest.webmanifest', (_req, res) => {
    res.setHeader('Content-Type', 'application/manifest+json');
    res.json({
      id: '/',
      name: 'مکتب‌یار — سامانه مدیریت کلاس‌های خصوصی',
      short_name: 'مکتب‌یار',
      description:
        'سامانه جامع مدیریت کلاس‌های خصوصی با تقویم شمسی، حضور و غیاب، ثبت نمرات، مدیریت شهریه و شارژ جلسات',
      theme_color: '#f7f7f4',
      background_color: '#f7f7f4',
      display: 'standalone',
      dir: 'rtl',
      lang: 'fa',
      start_url: '/',
      scope: '/',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'any',
        },
        {
          src: '/pwa-maskable-512x512.png',
          sizes: '512x512',
          type: 'image/png',
          purpose: 'maskable',
        },
      ],
    });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      base: '/',
      server: {
        middlewareMode: true,
        allowedHosts: true,
        ws: { server },
      },
      appType: 'spa',
    });
    app.use('/Maktab-Yar', vite.middlewares);
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use('/Maktab-Yar', express.static(distPath));
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const PORT = 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`MaktabYar Full-Stack Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
