import React, { useState, useEffect } from 'react';
import {
  Phone,
  ShieldCheck,
  Calendar,
  BookOpen,
  CreditCard,
  MessageSquare,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  LogOut,
  Award,
  KeyRound,
  Lock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  toPersianDigits,
  formatSignedPersianNumber,
  toEnglishDigits,
  formatToman,
  formatReadableJalali,
  getCurrentJalaliDate,
  formatStudentScheduleSummary,
  formatPostpaidCycleLabel,
} from '../utils/jalali';
import { JalaliCalendar } from './JalaliCalendar';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
  ServerStateSnapshot,
} from '../types';

interface StudentPortalViewProps {
  sessions: ClassSession[];
  rechargeRequests: RechargeRequest[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  loggedInStudent: Student | null;
  onLoginSuccess: (
    token: string,
    student: Student,
    isolatedState: ServerStateSnapshot,
    rememberMe?: boolean
  ) => void;
  onLogoutStudent: () => void;
  onSubmitRechargeRequest: (
    studentId: string,
    requestedSessions: number,
    paymentNote: string
  ) => Promise<void>;
  onSendMessage: (
    studentId: string,
    senderRole: 'teacher' | 'student',
    senderName: string,
    text: string
  ) => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
}

export const StudentPortalView: React.FC<StudentPortalViewProps> = ({
  sessions,
  rechargeRequests,
  messages,
  notifications,
  loggedInStudent,
  onLoginSuccess,
  onLogoutStudent,
  onSubmitRechargeRequest,
  onSendMessage,
  onMarkNotificationRead,
}) => {
  const today = getCurrentJalaliDate();

  // Login Mode: 'password' (Phone + Password preset by teacher) or 'otp' (Phone + OTP)
  const [loginMethod, setLoginMethod] = useState<'password' | 'otp'>('password');
  const [phoneInput, setPhoneInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // OTP state
  const [otpStep, setOtpStep] = useState<'phone' | 'verify'>('phone');
  const [otpCodeInput, setOtpCodeInput] = useState('');
  const [dispatchedOtp, setDispatchedOtp] = useState<{
    phone: string;
    otpPreview: string;
    secondsLeft: number;
  } | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Student Dashboard states
  const [activeSubTab, setActiveSubTab] = useState<
    'overview' | 'calendar' | 'recharge' | 'chat'
  >('overview');
  const [calYear, setCalYear] = useState(today.year);
  const [calMonth, setCalMonth] = useState(today.month);
  const [selectedCalDate, setSelectedCalDate] = useState(today.formatted);

  // Progressive disclosure states for mobile
  const [showMobileCourseDetails, setShowMobileCourseDetails] = useState(false);
  const [expandedSessionId, setExpandedSessionId] = useState<string | null>(null);

  // Recharge form states
  const [requestedSessionsCount, setRequestedSessionsCount] = useState(4);
  const [paymentNote, setPaymentNote] = useState('');
  const [rechargeSuccessMsg, setRechargeSuccessMsg] = useState<string | null>(null);
  const [submittingRecharge, setSubmittingRecharge] = useState(false);

  // Chat input state
  const [chatText, setChatText] = useState('');
  const [sendingChat, setSendingChat] = useState(false);

  // Countdown timer for OTP expiration
  useEffect(() => {
    if (!dispatchedOtp || dispatchedOtp.secondsLeft <= 0) return;
    const timer = window.setInterval(() => {
      setDispatchedOtp((prev) =>
        prev && prev.secondsLeft > 0
          ? { ...prev, secondsLeft: prev.secondsLeft - 1 }
          : prev
      );
    }, 1000);
    return () => window.clearInterval(timer);
  }, [dispatchedOtp]);

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/student-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: toEnglishDigits(phoneInput).trim(),
          password: passwordInput.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'شماره موبایل یا رمز عبور نادرست است.');
      } else if (data.student && data.token && data.isolatedState) {
        onLoginSuccess(data.token, data.student, data.isolatedState, rememberMe);
        setPasswordInput('');
      }
    } catch {
      setAuthError('خطا در برقراری ارتباط با سرور احراز هویت.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleRequestOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    const targetPhone = toEnglishDigits(phoneInput).trim();
    try {
      const res = await fetch('/api/auth/request-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: targetPhone }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'خطا در ارسال کد تایید.');
      } else {
        setPhoneInput(data.phone);
        setDispatchedOtp({
          phone: data.phone,
          otpPreview: data.otpPreview,
          secondsLeft: data.expiresIn || 120,
        });
        setOtpCodeInput(data.otpPreview || '');
        setOtpStep('verify');
      }
    } catch {
      setAuthError('خطا در برقراری ارتباط با سرور احراز هویت.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: dispatchedOtp?.phone || phoneInput,
          code: toEnglishDigits(otpCodeInput).trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.error || 'کد تایید نامعتبر است.');
      } else if (data.student && data.token && data.isolatedState) {
        onLoginSuccess(data.token, data.student, data.isolatedState, rememberMe);
        setOtpStep('phone');
        setDispatchedOtp(null);
        setOtpCodeInput('');
      }
    } catch {
      setAuthError('خطا در تایید کد یک‌بارمصرف.');
    } finally {
      setAuthLoading(false);
    }
  };

  if (!loggedInStudent) {
    return (
      <div className="max-w-[480px] mx-auto py-4 sm:py-10 px-2 sm:px-4">
        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5 sm:p-8">
          <div className="flex items-center gap-2 text-[#807d72] mb-2.5">
            <ShieldCheck className="w-4 h-4 text-[#f54e00] shrink-0" />
            <span className="text-[13px] font-normal">
              درگاه ورود اختصاصی دانش‌آموز
            </span>
          </div>

          <h1 className="text-[22px] sm:text-[26px] font-semibold sm:font-normal tracking-[-0.325px] leading-[1.25] text-[#26251e] mb-2">
            ورود به پنل شخصی دانش‌آموز
          </h1>
          <p className="text-[14px] text-[#5a5852] leading-[1.6] mb-4">
            با شماره موبایل و رمز عبور اختصاصی که استاد برایتان تعیین کرده است (یا کد یک‌بارمصرف پیامکی) وارد شوید.
          </p>

          {/* Touch-Friendly Segmented Login Method Switcher (>=44px height) */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-[#e6e5e0]/70 rounded-[8px] mb-5">
            <button
              type="button"
              onClick={() => {
                setLoginMethod('password');
                setAuthError(null);
              }}
              className={`min-h-[44px] py-2 px-2.5 text-[13px] font-semibold rounded-[6px] transition-colors cursor-pointer ${
                loginMethod === 'password'
                  ? 'bg-[#ffffff] text-[#26251e]'
                  : 'text-[#5a5852] hover:text-[#26251e]'
              }`}
            >
              موبایل + رمز عبور
            </button>
            <button
              type="button"
              onClick={() => {
                setLoginMethod('otp');
                setAuthError(null);
              }}
              className={`min-h-[44px] py-2 px-2.5 text-[13px] font-semibold rounded-[6px] transition-colors cursor-pointer ${
                loginMethod === 'otp'
                  ? 'bg-[#ffffff] text-[#26251e]'
                  : 'text-[#5a5852] hover:text-[#26251e]'
              }`}
            >
              کد تایید پیامکی (OTP)
            </button>
          </div>

          {authError && (
            <div className="mb-4 p-3.5 rounded-[8px] border border-[#cf2d56]/30 bg-[#cf2d56]/5 text-[#cf2d56] text-[13px] font-medium flex items-center gap-2">
              <XCircle className="w-4 h-4 shrink-0 text-[#cf2d56]" />
              <span>{authError}</span>
            </div>
          )}

          {loginMethod === 'password' ? (
            <form onSubmit={handlePasswordLogin} className="space-y-4">
              <div>
                <label
                  htmlFor="student-phone-pass-input"
                  className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
                >
                  شماره موبایل دانش‌آموز
                </label>
                <div className="relative">
                  <input
                    id="student-phone-pass-input"
                    type="tel"
                    dir="ltr"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full min-h-[48px] px-4 py-3 text-left text-[16px] sm:text-[14px] font-mono-code text-[#26251e] placeholder:text-[#a09c92] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                    required
                  />
                  <Phone className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
                </div>
              </div>

              <div>
                <label
                  htmlFor="student-password-input"
                  className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
                >
                  رمز عبور (تعیین‌شده توسط استاد)
                </label>
                <div className="relative">
                  <input
                    id="student-password-input"
                    type="password"
                    dir="ltr"
                    value={passwordInput}
                    onChange={(e) => setPasswordInput(e.target.value)}
                    placeholder="••••••••"
                    className="w-full min-h-[48px] px-4 py-3 text-left text-[16px] sm:text-[14px] font-mono-code text-[#26251e] placeholder:text-[#a09c92] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#f54e00] rounded cursor-pointer"
                />
                <span className="text-[13px] font-medium text-[#26251e]">
                  مرا به خاطر بسپار (حفظ ورود پس از رفرش صفحه)
                </span>
              </label>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
              >
                {authLoading
                  ? 'در حال بررسی اطلاعات ورود...'
                  : 'ورود به پنل شخصی دانش‌آموز'}
              </button>
            </form>
          ) : otpStep === 'phone' ? (
            <form onSubmit={handleRequestOtp} className="space-y-4">
              <div>
                <label
                  htmlFor="student-phone-input"
                  className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
                >
                  شماره موبایل دانش‌آموز
                </label>
                <div className="relative">
                  <input
                    id="student-phone-input"
                    type="tel"
                    dir="ltr"
                    value={phoneInput}
                    onChange={(e) => setPhoneInput(e.target.value)}
                    placeholder="09xxxxxxxxx"
                    className="w-full min-h-[48px] px-4 py-3 text-left text-[16px] sm:text-[14px] font-mono-code text-[#26251e] placeholder:text-[#a09c92] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                    required
                  />
                  <Phone className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#f54e00] rounded cursor-pointer"
                />
                <span className="text-[13px] font-medium text-[#26251e]">
                  مرا به خاطر بسپار (حفظ ورود پس از رفرش صفحه)
                </span>
              </label>

              <button
                type="submit"
                disabled={authLoading}
                className="w-full min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
              >
                {authLoading
                  ? 'در حال ارسال پیامک کد تایید...'
                  : 'دریافت کد تایید یک‌بارمصرف (OTP)'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              {dispatchedOtp && (
                <div className="p-4 rounded-[8px] border border-[#e6e5e0] bg-[#fafaf7] text-[#26251e] space-y-1.5">
                  <div className="flex items-center justify-between text-[13px] font-semibold text-[#26251e]">
                    <span>پیامک کد تایید ارسال شد</span>
                    <span className="font-mono-code text-[#f54e00]">
                      {toPersianDigits(
                        `${String(Math.floor(dispatchedOtp.secondsLeft / 60)).padStart(
                          2,
                          '0'
                        )}:${String(dispatchedOtp.secondsLeft % 60).padStart(2, '0')}`
                      )}
                    </span>
                  </div>
                  <p className="text-[13px] text-[#5a5852]">
                    کد تایید ۶ رقمی ارسال‌شده به شماره{' '}
                    <span className="font-mono-code text-[#26251e]">
                      {toPersianDigits(dispatchedOtp.phone)}
                    </span>
                    :{' '}
                    <span className="font-mono-code font-semibold text-[#f54e00] underline">
                      {toPersianDigits(dispatchedOtp.otpPreview)}
                    </span>
                  </p>
                </div>
              )}

              <div>
                <label
                  htmlFor="otp-code-input"
                  className="block text-[14px] font-semibold text-[#26251e] mb-1.5"
                >
                  کد تایید ۶ رقمی (OTP)
                </label>
                <div className="relative">
                  <input
                    id="otp-code-input"
                    type="text"
                    dir="ltr"
                    maxLength={6}
                    value={otpCodeInput}
                    onChange={(e) => setOtpCodeInput(e.target.value)}
                    placeholder="------"
                    className="w-full min-h-[48px] px-4 py-3 text-center tracking-widest font-mono-code text-[18px] font-semibold text-[#26251e] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                    required
                  />
                  <KeyRound className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4" />
                </div>
              </div>

              <label className="flex items-center gap-2.5 py-1 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 accent-[#f54e00] rounded cursor-pointer"
                />
                <span className="text-[13px] font-medium text-[#26251e]">
                  مرا به خاطر بسپار (حفظ ورود پس از رفرش صفحه)
                </span>
              </label>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={authLoading}
                  className="flex-1 min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                >
                  {authLoading
                    ? 'در حال بررسی کد...'
                    : 'تایید کد و ورود'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOtpStep('phone');
                    setAuthError(null);
                  }}
                  className="min-h-[48px] px-4 border border-[#cfcdc4] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-[14px] font-medium rounded-[8px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  تغییر شماره
                </button>
              </div>
            </form>
          )}

          <div className="mt-5 pt-4 border-t border-[#e6e5e0] flex items-start gap-2 text-[12px] sm:text-[13px] text-[#807d72] leading-[1.5]">
            <Lock className="w-4 h-4 text-[#807d72] shrink-0 mt-0.5" />
            <span>
              حریم خصوصی کامل: هر دانش‌آموز پس از ورود، منحصراً به اطلاعات، جلسات و کارنامه شخصی خود دسترسی دارد.
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Strictly isolated data for this logged-in student only
  const currentStudent = loggedInStudent;
  const isNegativeCredit = currentStudent.sessionsLeft < 0;
  const isPostpaid = currentStudent.paymentType === 'postpaid';
  const postpaidCycleLabel = formatPostpaidCycleLabel(
    currentStudent.postpaidCycleType,
    currentStudent.selectedDays,
    currentStudent.postpaidCycleSessions,
    currentStudent.startDate
  );
  const scheduleSummary = formatStudentScheduleSummary(
    currentStudent.selectedDays,
    currentStudent.classTime,
    currentStudent.dayTimes
  );
  const teacherDisplayName =
    currentStudent.teacherId === 'teacher_ramy'
      ? 'استاد رمی'
      : 'استاد فریبرز فرزاد';

  const studentSessions = sessions
    .filter((s) => s.studentId === currentStudent.id)
    .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));

  const upcomingSessions = studentSessions.filter(
    (s) => s.attendanceStatus === 'scheduled'
  );
  const gradedSessions = studentSessions.filter((s) => s.grade >= 0);
  const averageGrade =
    gradedSessions.length > 0
      ? (
          gradedSessions.reduce((acc, s) => acc + s.grade, 0) / gradedSessions.length
        ).toFixed(2)
      : '—';

  const studentRecharges = rechargeRequests.filter(
    (r) => r.studentId === currentStudent.id
  );
  const studentMessages = messages.filter((m) => m.studentId === currentStudent.id);
  const studentNotifications = notifications.filter(
    (n) => n.targetRole === 'student' && n.targetStudentId === currentStudent.id
  );
  const unreadNotifCount = studentNotifications.filter((n) => !n.isRead).length;

  const progressPercentage =
    currentStudent.totalSessionsPaid > 0
      ? Math.min(
          100,
          Math.round(
            (currentStudent.totalAttended / currentStudent.totalSessionsPaid) * 100
          )
        )
      : 0;

  const handleRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingRecharge(true);
    setRechargeSuccessMsg(null);
    try {
      await onSubmitRechargeRequest(
        currentStudent.id,
        requestedSessionsCount,
        paymentNote
      );
      setPaymentNote('');
      setRechargeSuccessMsg(
        isPostpaid
          ? `درخواست تسویه پس‌پرداخت ${toPersianDigits(requestedSessionsCount)} جلسه با موفقیت ثبت و برای تایید ${teacherDisplayName} ارسال شد.`
          : `درخواست شارژ ${toPersianDigits(requestedSessionsCount)} جلسه با موفقیت ثبت و برای تایید ${teacherDisplayName} ارسال شد.`
      );
    } finally {
      setSubmittingRecharge(false);
    }
  };

  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatText.trim()) return;
    setSendingChat(true);
    try {
      await onSendMessage(
        currentStudent.id,
        'student',
        currentStudent.name,
        chatText.trim()
      );
      setChatText('');
    } finally {
      setSendingChat(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Negative Session Credit / Postpaid Settlement Alert Banner */}
      {isNegativeCredit && (
        <div className="border border-[#cf2d56]/40 bg-[#cf2d56]/5 rounded-[12px] p-3.5 sm:p-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start sm:items-center gap-2.5 text-[13px] text-[#cf2d56]">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <span className="font-semibold">
                {isPostpaid
                  ? `حساب پس‌پرداخت: ${toPersianDigits(
                      Math.abs(currentStudent.sessionsLeft)
                    )} جلسه برگزارشده در انتظار تسویه (${formatToman(
                      Math.abs(currentStudent.sessionsLeft) *
                        currentStudent.tuitionPerSession
                    )}): `
                  : `تراز جلسات شما منفی است (${formatSignedPersianNumber(
                      currentStudent.sessionsLeft
                    )} جلسه — بدهی: ${formatToman(
                      Math.abs(currentStudent.sessionsLeft) *
                        currentStudent.tuitionPerSession
                    )}): `}
              </span>
              <span className="hidden sm:inline">
                {isPostpaid
                  ? `سیکل تسویه شما ${postpaidCycleLabel} است. از دکمه مقابل می‌توانید ثبت واریز تسویه را ارسال کنید.`
                  : 'در صورت شارژ مجدد حساب، تعداد جلسات معوق به صورت خودکار از شارژ جدید شما کسر خواهد شد.'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setRequestedSessionsCount(Math.abs(currentStudent.sessionsLeft));
              setActiveSubTab('recharge');
            }}
            className="min-h-[44px] px-4 bg-[#cf2d56] text-white text-[13px] font-semibold rounded-[8px] cursor-pointer shrink-0 w-full sm:w-auto"
          >
            {isPostpaid ? 'ثبت تسویه پس‌پرداخت' : 'شارژ حساب و تسویه'}
          </button>
        </div>
      )}

      {/* Student Profile Header Card — Content Prioritization + Progressive Disclosure on Mobile */}
      <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
              {teacherDisplayName} · {scheduleSummary} ·{' '}
              <span className="font-semibold text-[#26251e]">
                {isPostpaid
                  ? `حساب پس‌پرداخت (${postpaidCycleLabel})`
                  : 'حساب پیش‌پرداخت'}
              </span>
            </div>
            <h1 className="text-[20px] sm:text-[26px] font-semibold sm:font-normal tracking-[-0.325px] text-[#26251e] truncate">
              {currentStudent.name} — {currentStudent.subject}
            </h1>
            <div className="hidden sm:block text-[13px] text-[#5a5852] mt-1 font-mono-code">
              شماره: {toPersianDigits(currentStudent.phone)} · شروع دوره:{' '}
              {toPersianDigits(currentStudent.startDate)} · شهریه هر جلسه:{' '}
              {formatToman(currentStudent.tuitionPerSession)}
            </div>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                if (isPostpaid && currentStudent.sessionsLeft < 0) {
                  setRequestedSessionsCount(Math.abs(currentStudent.sessionsLeft));
                }
                setActiveSubTab('recharge');
              }}
              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2.5 bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] text-[#ffffff] text-[14px] font-semibold rounded-[8px] transition-colors whitespace-nowrap cursor-pointer"
            >
              {isPostpaid ? 'تسویه حساب پس‌پرداخت' : '+ شارژ اعتبار جلسات'}
            </button>
            <button
              type="button"
              onClick={onLogoutStudent}
              className="min-h-[44px] px-3.5 py-2.5 border border-[#cfcdc4] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-[13px] sm:text-[14px] font-medium rounded-[8px] transition-colors flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>خروج</span>
            </button>
          </div>
        </div>

        {/* Mobile Progressive Disclosure for Secondary Profile Info */}
        <div className="sm:hidden mt-3 pt-3 border-t border-[#efeee8]">
          <button
            type="button"
            onClick={() => setShowMobileCourseDetails((prev) => !prev)}
            className="w-full min-h-[40px] flex items-center justify-between text-[13px] font-medium text-[#5a5852] cursor-pointer"
          >
            <span>مشاهده مشخصات دوره و شهریه</span>
            {showMobileCourseDetails ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </button>
          {showMobileCourseDetails && (
            <div className="mt-2 pt-2 border-t border-[#efeee8] space-y-1.5 text-[13px] text-[#5a5852] font-mono-code">
              <div className="flex justify-between">
                <span>شماره موبایل:</span>
                <span className="text-[#26251e]">
                  {toPersianDigits(currentStudent.phone)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>برنامه ساعات هفته:</span>
                <span className="text-[#26251e]">{scheduleSummary}</span>
              </div>
              <div className="flex justify-between">
                <span>تاریخ شروع:</span>
                <span className="text-[#26251e]">
                  {toPersianDigits(currentStudent.startDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>شهریه هر جلسه:</span>
                <span className="text-[#26251e]">
                  {formatToman(currentStudent.tuitionPerSession)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Responsive KPI Strip: 2x2 Compact Grid on Mobile, 4 Columns on Desktop */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
            {isPostpaid ? 'وضعیت حساب پس‌پرداخت' : 'تراز جلسات (اعتبار)'}
          </div>
          <div
            className={`text-[20px] sm:text-[26px] font-semibold sm:font-normal font-mono-code ${
              currentStudent.sessionsLeft < 0
                ? 'text-[#cf2d56]'
                : currentStudent.sessionsLeft === 0 && isPostpaid
                ? 'text-[#1f8a65]'
                : currentStudent.sessionsLeft <= 1
                ? 'text-[#c08532]'
                : 'text-[#26251e]'
            }`}
          >
            {isPostpaid && currentStudent.sessionsLeft < 0
              ? `${toPersianDigits(Math.abs(currentStudent.sessionsLeft))} جلسه معوق`
              : isPostpaid && currentStudent.sessionsLeft === 0
              ? 'تسویه کامل'
              : `${formatSignedPersianNumber(currentStudent.sessionsLeft)} جلسه${
                  currentStudent.sessionsLeft < 0 ? ' (بدهکار)' : ''
                }`}
          </div>
          <div className="text-[11px] sm:text-[13px] text-[#807d72] mt-1 font-mono-code truncate">
            {currentStudent.sessionsLeft < 0
              ? `قابل تسویه: ${formatToman(
                  Math.abs(currentStudent.sessionsLeft) *
                    currentStudent.tuitionPerSession
                )}`
              : `پرداخت‌شده: ${toPersianDigits(currentStudent.totalSessionsPaid)} جلسه`}
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
            جلسات حضوریافته
          </div>
          <div className="text-[20px] sm:text-[26px] font-semibold sm:font-normal text-[#26251e] font-mono-code">
            {toPersianDigits(currentStudent.totalAttended)} جلسه
          </div>
          <div className="text-[11px] sm:text-[13px] text-[#807d72] mt-1 font-mono-code">
            پیشرفت دوره: {toPersianDigits(progressPercentage)}٪
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
            میانگین نمرات (از ۲۰)
          </div>
          <div className="text-[20px] sm:text-[26px] font-semibold sm:font-normal text-[#1f8a65] font-mono-code">
            {toPersianDigits(averageGrade)}
          </div>
          <div className="text-[11px] sm:text-[13px] text-[#807d72] mt-1 font-mono-code">
            {toPersianDigits(gradedSessions.length)} جلسه نمره‌دار
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
          <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
            جلسه پیش‌رو
          </div>
          <div className="text-[14px] sm:text-[16px] font-semibold text-[#26251e] font-mono-code truncate">
            {upcomingSessions[0]
              ? `${formatReadableJalali(upcomingSessions[0].jalaliDate)} · ${toPersianDigits(
                  upcomingSessions[0].time
                )}`
              : 'بدون جلسه رزرو'}
          </div>
          <div className="text-[11px] sm:text-[13px] text-[#807d72] mt-1 truncate">
            {upcomingSessions[0]?.topic || 'هماهنگی با استاد'}
          </div>
        </div>
      </div>

      {/* Desktop Sub-navigation Segmented Controls (Hidden on mobile because Fixed Bottom Tab Bar handles mobile navigation) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e5e0] pb-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#e6e5e0]/70 rounded-[8px]">
          <button
            type="button"
            onClick={() => setActiveSubTab('overview')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'overview'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>پیشرفت تحصیلی و جلسات من</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('calendar')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'calendar'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>تقویم شمسی من</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('recharge')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'recharge'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>درخواست شارژ جلسات</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSubTab('chat')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeSubTab === 'chat'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>گفتگو با استاد ({toPersianDigits(unreadNotifCount)})</span>
          </button>
        </div>
      </div>

      {/* Sub-Tab 1: Overview (Progress, Grades, Upcoming Sessions, Live Notifications) */}
      {activeSubTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-8 space-y-5 sm:space-y-6">
            {/* Session Schedule & Grade History — Mobile Cards + Desktop Table */}
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
              <div className="px-4 sm:px-6 py-4 border-b border-[#e6e5e0] flex items-center justify-between">
                <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                  برنامه جلسات، حضور و کارنامه نمرات
                </h2>
                <span className="font-mono-code text-[13px] text-[#807d72]">
                  {toPersianDigits(studentSessions.length)} جلسه
                </span>
              </div>

              {/* Mobile Progressive Disclosure Session Cards (< md) */}
              <div className="md:hidden divide-y divide-[#efeee8]">
                {studentSessions.map((sess) => {
                  const isExpanded = expandedSessionId === sess.id;
                  return (
                    <div key={sess.id} className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-[15px] font-semibold text-[#26251e]">
                            {formatReadableJalali(sess.jalaliDate)}
                          </div>
                          <div className="text-[13px] font-mono-code text-[#807d72]">
                            {toPersianDigits(sess.jalaliDate)} · ساعت{' '}
                            {toPersianDigits(sess.time)}
                          </div>
                        </div>

                        <div className="text-left">
                          <div className="text-[13px] font-semibold">
                            {sess.attendanceStatus === 'present' && (
                              <span className="text-[#1f8a65] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>حاضر</span>
                              </span>
                            )}
                            {sess.attendanceStatus === 'absent_charged' && (
                              <span className="text-[#cf2d56] flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>غیبت با کسر جلسه</span>
                              </span>
                            )}
                            {sess.attendanceStatus === 'absent' && (
                              <span className="text-[#c08532] flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>غیبت بدون کسر</span>
                              </span>
                            )}
                            {sess.attendanceStatus === 'excused' && (
                              <span className="text-[#c08532] flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>غیبت موجه</span>
                              </span>
                            )}
                            {sess.attendanceStatus === 'scheduled' && (
                              <span className="text-[#5a5852] flex items-center gap-1">
                                <Clock className="w-3.5 h-3.5" />
                                <span>در برنامه</span>
                              </span>
                            )}
                          </div>
                          {sess.grade >= 0 && (
                            <div className="text-[13px] font-mono-code font-semibold text-[#1f8a65] mt-0.5">
                              نمره: {toPersianDigits(sess.grade)} از ۲۰
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-1">
                        <span className="text-[13px] text-[#5a5852] truncate max-w-[70%]">
                          {sess.topic || sess.subject}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedSessionId(isExpanded ? null : sess.id)
                          }
                          className="min-h-[40px] px-2.5 text-[12px] font-semibold text-[#f54e00] flex items-center gap-1 cursor-pointer shrink-0"
                        >
                          <span>{isExpanded ? 'بستن جزئیات' : 'مبحث و یادداشت'}</span>
                          {isExpanded ? (
                            <ChevronUp className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>

                      {isExpanded && (
                        <div className="p-3 rounded-[8px] bg-[#fafaf7] border border-[#efeee8] text-[13px] text-[#5a5852] space-y-1">
                          <div>
                            <span className="font-semibold text-[#26251e]">
                              مبحث جلسه:{' '}
                            </span>
                            <span>{sess.topic || sess.subject}</span>
                          </div>
                          <div>
                            <span className="font-semibold text-[#26251e]">
                              یادداشت استاد:{' '}
                            </span>
                            <span>{sess.teacherNote || 'ثبت نشده'}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right border-collapse">
                  <thead>
                    <tr className="border-b border-[#e6e5e0] bg-[#fafaf7] text-[13px] font-semibold text-[#5a5852]">
                      <th className="py-3 px-4">تاریخ شمسی و ساعت</th>
                      <th className="py-3 px-4">مبحث جلسه و تکلیف</th>
                      <th className="py-3 px-4">وضعیت حضور</th>
                      <th className="py-3 px-4">نمره (از ۲۰)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#efeee8] text-[14px]">
                    {studentSessions.map((sess) => (
                      <tr key={sess.id} className="hover:bg-[#fafaf7] transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#26251e]">
                            {formatReadableJalali(sess.jalaliDate)}
                          </div>
                          <div className="font-mono-code text-[#807d72]">
                            {toPersianDigits(sess.jalaliDate)} · ساعت {toPersianDigits(sess.time)}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#26251e]">
                            {sess.topic || sess.subject}
                          </div>
                          {sess.teacherNote && (
                            <div className="text-[13px] text-[#5a5852] mt-0.5">
                              یادداشت استاد: {sess.teacherNote}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap text-[13px] font-semibold">
                          {sess.attendanceStatus === 'present' && (
                            <span className="text-[#1f8a65] flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              <span>حاضر (برگزارشده)</span>
                            </span>
                          )}
                          {sess.attendanceStatus === 'absent_charged' && (
                            <span className="text-[#cf2d56] flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>غیبت (با کسر ۱ جلسه از اعتبار)</span>
                            </span>
                          )}
                          {sess.attendanceStatus === 'absent' && (
                            <span className="text-[#c08532] flex items-center gap-1">
                              <XCircle className="w-3.5 h-3.5" />
                              <span>غیبت (بدون کسر جلسه)</span>
                            </span>
                          )}
                          {sess.attendanceStatus === 'excused' && (
                            <span className="text-[#c08532] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>غیبت موجه</span>
                            </span>
                          )}
                          {sess.attendanceStatus === 'scheduled' && (
                            <span className="text-[#5a5852] flex items-center gap-1">
                              <Clock className="w-3.5 h-3.5" />
                              <span>در برنامه (پیش‌رو)</span>
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono-code font-semibold">
                          {sess.grade >= 0 ? (
                            <span className="text-[#1f8a65] flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>{toPersianDigits(sess.grade)} از ۲۰</span>
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#a09c92] font-normal">
                              ثبت نشده
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="lg:col-span-4 space-y-5 sm:space-y-6">
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e6e5e0]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#f54e00]" />
                  <h3 className="text-[16px] font-semibold text-[#26251e]">
                    اعلان‌های اختصاصی من
                  </h3>
                </div>
                <span className="font-mono-code text-[13px] text-[#807d72]">
                  {toPersianDigits(unreadNotifCount)} خوانده‌نشده
                </span>
              </div>

              <div className="divide-y divide-[#efeee8] max-h-[360px] overflow-y-auto">
                {studentNotifications.length === 0 ? (
                  <p className="py-6 text-center text-[13px] text-[#807d72]">
                    اعلان جدیدی وجود ندارد.
                  </p>
                ) : (
                  studentNotifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`py-3 transition-colors ${
                        notif.isRead ? 'opacity-70' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-semibold text-[#26251e]">
                          {notif.title}
                        </div>
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="min-h-[36px] px-2 text-[12px] font-semibold text-[#f54e00] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            متوجه شدم ✓
                          </button>
                        )}
                      </div>
                      <p className="text-[13px] text-[#5a5852] mt-1 leading-relaxed">
                        {notif.body}
                      </p>
                      <div className="text-[11px] text-[#807d72] mt-1 font-mono-code">
                        {notif.jalaliTime}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Student Iranian Jalali Calendar */}
      {activeSubTab === 'calendar' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-8">
            <JalaliCalendar
              year={calYear}
              month={calMonth}
              selectedDate={selectedCalDate}
              sessions={studentSessions}
              onChangeMonth={(y, m) => {
                setCalYear(y);
                setCalMonth(m);
              }}
              onSelectDate={setSelectedCalDate}
            />
          </div>
          <div className="lg:col-span-4 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
            <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e] pb-3 mb-3 border-b border-[#e6e5e0]">
              جلسات {formatReadableJalali(selectedCalDate)} ({toPersianDigits(selectedCalDate)})
            </h3>
            {studentSessions.filter((s) => s.jalaliDate === selectedCalDate).length ===
            0 ? (
              <p className="text-[13px] text-[#807d72] py-6 text-center">
                در این تاریخ جلسه‌ای برای شما ثبت نشده است.
              </p>
            ) : (
              <div className="divide-y divide-[#efeee8]">
                {studentSessions
                  .filter((s) => s.jalaliDate === selectedCalDate)
                  .map((sess) => (
                    <div key={sess.id} className="py-3 space-y-1">
                      <div className="text-[14px] font-semibold text-[#26251e]">
                        {sess.subject} · ساعت{' '}
                        <span className="font-mono-code">{toPersianDigits(sess.time)}</span>
                      </div>
                      <div className="text-[13px] text-[#5a5852]">
                        مبحث: {sess.topic || 'اعلام در جلسه'}
                      </div>
                      {sess.teacherNote && (
                        <div className="text-[13px] text-[#807d72]">
                          یادداشت استاد: {sess.teacherNote}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Request Session Recharge & Payment Approval History */}
      {activeSubTab === 'recharge' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-6 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#26251e] mb-1.5">
              ثبت درخواست شارژ مجدد جلسات
            </h2>
            <p className="text-[13px] sm:text-[14px] text-[#5a5852] mb-5 leading-relaxed">
              تعداد جلسات مورد نظر برای تمدید را انتخاب کنید. پس از تایید پرداخت توسط {teacherDisplayName}، جلسات به تراز حساب شما افزوده می‌شود.
            </p>

            {rechargeSuccessMsg && (
              <div className="mb-4 p-3.5 rounded-[8px] border border-[#1f8a65]/30 bg-[#1f8a65]/5 text-[#1f8a65] text-[13px] font-medium flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#1f8a65] shrink-0" />
                <span>{rechargeSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleRechargeSubmit} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#26251e] mb-2">
                  تعداد جلسات درخواستی جهت شارژ
                </label>
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {[2, 4, 6, 8].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setRequestedSessionsCount(count)}
                      className={`min-h-[44px] px-3 text-[13px] font-semibold rounded-[8px] border transition-colors cursor-pointer font-mono-code ${
                        requestedSessionsCount === count
                          ? 'border-[#26251e] bg-[#26251e] text-[#f7f7f4]'
                          : 'border-[#cfcdc4] bg-[#fafaf7] text-[#26251e] hover:bg-[#e6e5e0]/60'
                      }`}
                    >
                      {toPersianDigits(count)} جلسه
                    </button>
                  ))}
                </div>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={requestedSessionsCount}
                  onChange={(e) =>
                    setRequestedSessionsCount(Math.max(1, Number(e.target.value) || 1))
                  }
                  className="w-full min-h-[48px] px-4 py-3 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                />
              </div>

              <div className="p-4 rounded-[8px] bg-[#fafaf7] border border-[#e6e5e0] space-y-1.5 text-[13px]">
                <div className="flex items-center justify-between text-[#5a5852]">
                  <span>شهریه هر جلسه:</span>
                  <span className="font-mono-code text-[#26251e]">
                    {formatToman(currentStudent.tuitionPerSession)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5a5852]">
                  <span>تراز فعلی جلسات:</span>
                  <span
                    className={`font-mono-code font-semibold ${
                      currentStudent.sessionsLeft < 0
                        ? 'text-[#cf2d56]'
                        : 'text-[#26251e]'
                    }`}
                  >
                    {formatSignedPersianNumber(currentStudent.sessionsLeft)} جلسه
                    {currentStudent.sessionsLeft < 0 ? ' (بدهکار)' : ''}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#5a5852]">
                  <span>تراز خالص پس از شارژ:</span>
                  <span className="font-mono-code font-semibold text-[#1f8a65]">
                    {formatSignedPersianNumber(
                      currentStudent.sessionsLeft + requestedSessionsCount
                    )}{' '}
                    جلسه
                  </span>
                </div>
                <div className="flex items-center justify-between text-[#26251e] font-semibold text-[14px] pt-2 border-t border-[#e6e5e0]">
                  <span>مبلغ قابل پرداخت ({toPersianDigits(requestedSessionsCount)} جلسه):</span>
                  <span className="text-[#f54e00] font-mono-code">
                    {formatToman(
                      requestedSessionsCount * currentStudent.tuitionPerSession
                    )}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                  شماره پیگیری واریز یا توضیحات پرداخت
                </label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  placeholder="مثال: واریز کارت به کارت — کد پیگیری ۷۴۸۲۹۱"
                  className="w-full min-h-[48px] px-4 py-3 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submittingRecharge}
                className="w-full min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
              >
                {submittingRecharge
                  ? 'در حال ارسال درخواست...'
                  : 'ارسال درخواست شارژ برای تایید استاد'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
            <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#26251e] mb-4">
              سوابق درخواست‌های شارژ و تاییدیه‌های پرداخت
            </h2>

            {studentRecharges.length === 0 ? (
              <p className="text-[13px] text-[#807d72] py-8 text-center">
                هنوز درخواست شارژی ثبت نشده است.
              </p>
            ) : (
              <div className="divide-y divide-[#efeee8]">
                {studentRecharges.map((req) => (
                  <div key={req.id} className="py-3.5 flex items-start justify-between gap-4">
                    <div>
                      <div className="text-[14px] font-semibold text-[#26251e] font-mono-code">
                        شارژ {toPersianDigits(req.requestedSessions)} جلسه ·{' '}
                        {formatToman(req.totalAmount)}
                      </div>
                      <div className="text-[13px] text-[#5a5852] mt-0.5">
                        {req.paymentNote}
                      </div>
                    </div>

                    <div className="text-[13px] font-semibold whitespace-nowrap shrink-0">
                      {req.status === 'pending' && (
                        <span className="text-[#c08532] flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" />
                          <span>در انتظار تایید</span>
                        </span>
                      )}
                      {req.status === 'approved' && (
                        <span className="text-[#1f8a65] flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تایید شده</span>
                        </span>
                      )}
                      {req.status === 'rejected' && (
                        <span className="text-[#cf2d56] flex items-center gap-1">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رد شده</span>
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Direct Integrated Chat with Teacher */}
      {activeSubTab === 'chat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
          <div className="lg:col-span-8 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] flex flex-col h-[460px] sm:h-[500px]">
            <div className="px-4 sm:px-6 py-3.5 border-b border-[#e6e5e0] flex items-center justify-between">
              <div>
                <h2 className="text-[15px] sm:text-[16px] font-semibold text-[#26251e]">
                  گفتگوی مستقیم با {teacherDisplayName} ({currentStudent.subject})
                </h2>
                <p className="text-[12px] sm:text-[13px] text-[#807d72]">
                  پیام‌ها به صورت خصوصی و آنی بین شما و استاد رد و بدل می‌شود
                </p>
              </div>
            </div>

            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#fafaf7]">
              {studentMessages.length === 0 ? (
                <p className="text-[13px] text-[#807d72] text-center py-12">
                  هنوز پیامی ارسال نشده است. اولین پیام را برای {teacherDisplayName} بنویسید.
                </p>
              ) : (
                studentMessages.map((msg) => {
                  const isMe = msg.senderRole === 'student';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${
                        isMe ? 'mr-0 ml-auto items-start' : 'ml-0 mr-auto items-end'
                      }`}
                    >
                      <div className="text-[11px] text-[#807d72] mb-1 font-mono-code">
                        {msg.senderName} · {msg.jalaliTime}
                      </div>
                      <div
                        className={`px-3.5 sm:px-4 py-2.5 rounded-[12px] text-[14px] leading-relaxed ${
                          isMe
                            ? 'bg-[#26251e] text-[#f7f7f4]'
                            : 'bg-[#ffffff] border border-[#e6e5e0] text-[#26251e]'
                        }`}
                      >
                        {msg.text}
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <form
              onSubmit={handleChatSubmit}
              className="p-3 sm:p-4 border-t border-[#e6e5e0] bg-[#ffffff] flex items-center gap-2"
            >
              <input
                type="text"
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={`پیام به ${teacherDisplayName}...`}
                className="flex-1 min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e] bg-[#ffffff]"
              />
              <button
                type="submit"
                disabled={sendingChat || !chatText.trim()}
                className="min-h-[44px] px-4 bg-[#f54e00] hover:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[14px] font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>ارسال</span>
              </button>
            </form>
          </div>

          <div className="hidden lg:block lg:col-span-4 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-6 space-y-4">
            <h3 className="text-[16px] font-semibold text-[#26251e] pb-3 border-b border-[#e6e5e0]">
              مشخصات کلاس اختصاصی شما
            </h3>
            <div className="space-y-3 text-[13px] text-[#5a5852]">
              <div className="flex justify-between">
                <span>نام دانش‌آموز:</span>
                <span className="font-semibold text-[#26251e]">
                  {currentStudent.name}
                </span>
              </div>
              <div className="flex justify-between">
                <span>استاد راهنما:</span>
                <span className="font-semibold text-[#26251e]">
                  {teacherDisplayName}
                </span>
              </div>
              <div className="flex justify-between">
                <span>درس:</span>
                <span className="font-semibold text-[#26251e]">
                  {currentStudent.subject}
                </span>
              </div>
              <div className="flex justify-between">
                <span>روزهای هفته:</span>
                <span className="font-semibold text-[#26251e]">
                  {currentStudent.intervalLabel}
                </span>
              </div>
              <div className="flex justify-between">
                <span>ساعت کلاس:</span>
                <span className="font-mono-code text-[#26251e]">
                  {toPersianDigits(currentStudent.classTime)}
                </span>
              </div>
              <div className="flex justify-between">
                <span>تراز جلسات فعلی:</span>
                <span
                  className={`font-mono-code font-semibold ${
                    currentStudent.sessionsLeft < 0
                      ? 'text-[#cf2d56]'
                      : 'text-[#1f8a65]'
                  }`}
                >
                  {formatSignedPersianNumber(currentStudent.sessionsLeft)} جلسه
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Fixed Bottom Tab Bar for Student Portal (< md) — Natural Thumb Zone */}
      <nav
        aria-label="ناوبری موبایل دانش‌آموز"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e6e5e0] grid grid-cols-4 items-center px-1"
      >
        <button
          type="button"
          onClick={() => setActiveSubTab('overview')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeSubTab === 'overview'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <BookOpen className="w-5 h-5" />
          <span className="text-[11px] leading-none">جلسات من</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('calendar')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeSubTab === 'calendar'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[11px] leading-none">تقویم</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('recharge')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeSubTab === 'recharge'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <CreditCard className="w-5 h-5" />
          <span className="text-[11px] leading-none">شارژ جلسات</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('chat')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer relative ${
            activeSubTab === 'chat'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[11px] leading-none">
            گفتگو {unreadNotifCount > 0 ? `(${toPersianDigits(unreadNotifCount)})` : ''}
          </span>
        </button>
      </nav>
    </div>
  );
};
