import React, { useState, useMemo, useEffect } from 'react';
import {
  UserPlus,
  Users,
  Calendar,
  ClipboardCheck,
  MessageSquare,
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  Plus,
  Send,
  Trash2,
  Award,
  Search,
  RefreshCw,
  Edit3,
  TrendingUp,
  KeyRound,
  AlertCircle,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  JALALI_WEEKDAYS,
  toPersianDigits,
  formatSignedPersianNumber,
  toEnglishDigits,
  formatToman,
  formatReadableJalali,
  getCurrentJalaliDate,
  getJalaliMonthKey,
  formatJalaliMonthTitle,
  formatWeekdaysLabel,
  sanitizeSelectedDays,
  sanitizeDayTimes,
  formatStudentScheduleSummary,
  getTimeForJalaliDate,
} from '../utils/jalali';
import { JalaliCalendar } from './JalaliCalendar';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
  IntervalType,
  AttendanceStatus,
  PaymentSystemType,
} from '../types';

export type TeacherTab =
  | 'dashboard'
  | 'students'
  | 'attendance'
  | 'finance'
  | 'chat';

interface TeacherDashboardProps {
  teacherName?: string;
  activeTab: TeacherTab;
  onSelectTab: (tab: TeacherTab) => void;
  students: Student[];
  sessions: ClassSession[];
  rechargeRequests: RechargeRequest[];
  messages: ChatMessage[];
  notifications: AppNotification[];
  onAddStudent: (payload: {
    name: string;
    phone: string;
    password: string;
    subject: string;
    startDate: string;
    classTime: string;
    selectedDays: number[];
    dayTimes?: Record<string, string>;
    intervalType: IntervalType;
    intervalLabel: string;
    tuitionPerSession: number;
    sessionsLeft: number;
    paymentType?: PaymentSystemType;
    postpaidCycleSessions?: number;
  }) => Promise<void>;
  onEditStudent: (
    studentId: string,
    payload: {
      name: string;
      phone: string;
      password: string;
      subject: string;
      startDate: string;
      classTime: string;
      selectedDays: number[];
      dayTimes?: Record<string, string>;
      tuitionPerSession: number;
      sessionsLeft: number;
      totalSessionsPaid?: number;
      totalAttended?: number;
      paymentType?: PaymentSystemType;
      postpaidCycleSessions?: number;
    }
  ) => Promise<void>;
  onDirectRechargeStudent: (
    studentId: string,
    addedSessions: number,
    tuitionPerSession: number,
    paymentNote: string
  ) => Promise<void>;
  onDeleteStudent: (studentId: string) => Promise<void>;
  onAddSession: (payload: {
    studentId: string;
    jalaliDate: string;
    time: string;
    topic: string;
    teacherNote: string;
    attendanceStatus?: AttendanceStatus;
    grade?: number;
  }) => Promise<void>;
  onUpdateSession: (
    sessionId: string,
    payload: {
      attendanceStatus: AttendanceStatus;
      grade: number;
      topic: string;
      teacherNote: string;
    }
  ) => Promise<void>;
  onResolveRechargeRequest: (
    requestId: string,
    status: 'approved' | 'rejected'
  ) => Promise<void>;
  onSendMessage: (
    studentId: string,
    senderRole: 'teacher' | 'student',
    senderName: string,
    text: string
  ) => Promise<void>;
  onSendSessionReminder: (sessionId: string) => Promise<void>;
  onMarkNotificationRead: (notificationId: string) => Promise<void>;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({
  teacherName = 'استاد فریبرز فرزاد',
  activeTab,
  onSelectTab,
  students,
  sessions,
  rechargeRequests,
  messages,
  notifications,
  onAddStudent,
  onEditStudent,
  onDirectRechargeStudent,
  onDeleteStudent,
  onAddSession,
  onUpdateSession,
  onResolveRechargeRequest,
  onSendMessage,
  onSendSessionReminder,
  onMarkNotificationRead,
}) => {
  const today = getCurrentJalaliDate();

  // Jalali Calendar state
  const [calYear, setCalYear] = useState(today.year);
  const [calMonth, setCalMonth] = useState(today.month);
  const [selectedDate, setSelectedDate] = useState(today.formatted);

  // Monthly Profit Summary Month Filter ('all' or 'YYYY/MM')
  const [selectedFinanceMonth, setSelectedFinanceMonth] = useState<string>(
    today.monthKey
  );

  // Progressive Disclosure states for Mobile View Optimization
  const [showMobileExtraKpis, setShowMobileExtraKpis] = useState(false);
  const [showMobileAddStudentForm, setShowMobileAddStudentForm] = useState(false);
  const [expandedStudentCardId, setExpandedStudentCardId] = useState<string | null>(
    null
  );
  const [expandedFinanceStudentId, setExpandedFinanceStudentId] = useState<
    string | null
  >(null);
  const [showMobileNotificationsDrawer, setShowMobileNotificationsDrawer] =
    useState(false);
  const [studentSearchQuery, setStudentSearchQuery] = useState('');
  const [studentPaymentFilter, setStudentPaymentFilter] = useState<
    'all' | 'prepaid' | 'postpaid' | 'due'
  >('all');

  // Add Student Form state
  const [stuName, setStuName] = useState('');
  const [stuPhone, setStuPhone] = useState('');
  const [stuPassword, setStuPassword] = useState('123456');
  const [stuSubject, setStuSubject] = useState('');
  const [stuStartDate, setStuStartDate] = useState(today.formatted);
  const [stuTime, setStuTime] = useState('17:00');
  const [stuSelectedDays, setStuSelectedDays] = useState<number[]>([0, 3]); // شنبه و سه‌شنبه
  const [stuDayTimes, setStuDayTimes] = useState<Record<string, string>>({
    '0': '17:00',
    '3': '17:00',
  });
  const [stuPaymentType, setStuPaymentType] =
    useState<PaymentSystemType>('prepaid');
  const [stuPostpaidCycle, setStuPostpaidCycle] = useState<number>(4);
  const [stuTuition, setStuTuition] = useState(600000);
  const [stuInitialSessions, setStuInitialSessions] = useState(5);
  const [studentFormMsg, setStudentFormMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [addingStudent, setAddingStudent] = useState(false);

  // Edit Student Modal/Panel state
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editStuName, setEditStuName] = useState('');
  const [editStuPhone, setEditStuPhone] = useState('');
  const [editStuPassword, setEditStuPassword] = useState('');
  const [editStuSubject, setEditStuSubject] = useState('');
  const [editStuStartDate, setEditStuStartDate] = useState('');
  const [editStuTime, setEditStuTime] = useState('');
  const [editStuSelectedDays, setEditStuSelectedDays] = useState<number[]>([0]);
  const [editStuDayTimes, setEditStuDayTimes] = useState<Record<string, string>>(
    {}
  );
  const [editStuPaymentType, setEditStuPaymentType] =
    useState<PaymentSystemType>('prepaid');
  const [editStuPostpaidCycle, setEditStuPostpaidCycle] = useState<number>(4);
  const [editStuTuition, setEditStuTuition] = useState(600000);
  const [editStuSessionsLeft, setEditStuSessionsLeft] = useState(0);
  const [editStuTotalPaid, setEditStuTotalPaid] = useState(0);
  const [editStuTotalAttended, setEditStuTotalAttended] = useState(0);
  const [editStudentMsg, setEditStudentMsg] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);

  // Direct Recharge Modal state
  const [rechargingStudent, setRechargingStudent] = useState<Student | null>(null);
  const [rechargeAddCount, setRechargeAddCount] = useState(4);
  const [rechargeCustomTuition, setRechargeCustomTuition] = useState(600000);
  const [rechargeNote, setRechargeNote] = useState('');
  const [submittingRecharge, setSubmittingRecharge] = useState(false);

  // New Session Form state
  const [showNewSessionForm, setShowNewSessionForm] = useState(false);
  const [newSessStudentId, setNewSessStudentId] = useState(students[0]?.id || '');
  const [newSessDate, setNewSessDate] = useState(today.formatted);
  const [newSessTime, setNewSessTime] = useState('17:00');
  const [newSessTopic, setNewSessTopic] = useState('');
  const [newSessNote, setNewSessNote] = useState('');
  const [newSessStatus, setNewSessStatus] = useState<AttendanceStatus>('scheduled');

  // Attendance & Grade editing state
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<AttendanceStatus>('present');
  const [editGrade, setEditGrade] = useState<string>('19');
  const [editTopic, setEditTopic] = useState('');
  const [editNote, setEditNote] = useState('');
  const [filterStudentId, setFilterStudentId] = useState<string>('all');
  const [filterAttendance, setFilterAttendance] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reminderSentSessionId, setReminderSentSessionId] = useState<string | null>(
    null
  );

  // Direct Chat state
  const [activeChatStudentId, setActiveChatStudentId] = useState<string>(
    students[0]?.id || ''
  );
  const [teacherChatInput, setTeacherChatInput] = useState('');

  // Sync activeChatStudentId when teacher switches accounts
  useEffect(() => {
    if (
      students.length > 0 &&
      !students.some((s) => s.id === activeChatStudentId)
    ) {
      setActiveChatStudentId(students[0].id);
    }
  }, [students, activeChatStudentId]);

  // Toggle weekday helper (ensures at least 1 day remains selected or toggles freely)
  const toggleWeekday = (
    dayIndex: number,
    currentDays: number[],
    setter: React.Dispatch<React.SetStateAction<number[]>>
  ) => {
    if (currentDays.includes(dayIndex)) {
      if (currentDays.length <= 1) return;
      setter(currentDays.filter((d) => d !== dayIndex).sort((a, b) => a - b));
    } else {
      setter([...currentDays, dayIndex].sort((a, b) => a - b));
    }
  };

  // Computed metrics
  const upcomingSessions = sessions
    .filter((s) => s.attendanceStatus === 'scheduled')
    .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate));

  const gradedSessions = sessions.filter((s) => s.grade >= 0);
  const overallAvgGrade =
    gradedSessions.length > 0
      ? (
          gradedSessions.reduce((sum, s) => sum + s.grade, 0) / gradedSessions.length
        ).toFixed(2)
      : '—';

  const pendingRecharges = rechargeRequests.filter((r) => r.status === 'pending');
  const teacherNotifications = notifications.filter(
    (n) => n.targetRole === 'teacher'
  );
  const unreadTeacherNotifs = teacherNotifications.filter((n) => !n.isRead).length;

  const selectedDateSessions = sessions.filter(
    (s) => s.jalaliDate === selectedDate
  );

  // Filtered students for quick mobile/desktop search + payment system filter
  const filteredStudentsList = useMemo(() => {
    let base = students;
    if (studentPaymentFilter === 'prepaid') {
      base = base.filter((s) => (s.paymentType || 'prepaid') === 'prepaid');
    } else if (studentPaymentFilter === 'postpaid') {
      base = base.filter((s) => s.paymentType === 'postpaid');
    } else if (studentPaymentFilter === 'due') {
      base = base.filter(
        (s) =>
          s.sessionsLeft < 0 ||
          ((s.paymentType || 'prepaid') === 'prepaid' && s.sessionsLeft === 0)
      );
    }

    if (!studentSearchQuery.trim()) return base;
    const q = studentSearchQuery.trim();
    const qEn = toEnglishDigits(q);
    return base.filter(
      (s) =>
        s.name.includes(q) ||
        s.subject.includes(q) ||
        s.phone.includes(qEn) ||
        s.intervalLabel.includes(q)
    );
  }, [students, studentSearchQuery, studentPaymentFilter]);

  // Available Jalali months for Monthly Profit Summary
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>([today.monthKey]);
    sessions.forEach((s) => {
      if (s.jalaliDate) {
        monthSet.add(getJalaliMonthKey(s.jalaliDate));
      }
    });
    const prevMonth =
      today.month > 1
        ? `${today.year}/${String(today.month - 1).padStart(2, '0')}`
        : `${today.year - 1}/12`;
    const nextMonth =
      today.month < 12
        ? `${today.year}/${String(today.month + 1).padStart(2, '0')}`
        : `${today.year + 1}/01`;
    monthSet.add(prevMonth);
    monthSet.add(nextMonth);

    return Array.from(monthSet).sort((a, b) => b.localeCompare(a));
  }, [sessions, today.monthKey, today.year, today.month]);

  // Monthly Profit & Financial Summary Calculations
  const monthlyFinanceStats = useMemo(() => {
    const studentMap = new Map<string, Student>();
    students.forEach((s) => studentMap.set(s.id, s));

    const sessionsInScope =
      selectedFinanceMonth === 'all'
        ? sessions
        : sessions.filter(
            (s) => getJalaliMonthKey(s.jalaliDate) === selectedFinanceMonth
          );

    const presentSessions = sessionsInScope.filter(
      (s) =>
        s.attendanceStatus === 'present' ||
        s.attendanceStatus === 'absent_charged'
    );
    const scheduledSessions = sessionsInScope.filter(
      (s) => s.attendanceStatus === 'scheduled'
    );

    const earnedRevenue = presentSessions.reduce((sum, sess) => {
      const stu = studentMap.get(sess.studentId);
      return sum + (stu ? stu.tuitionPerSession : 0);
    }, 0);

    const projectedScheduledRevenue = scheduledSessions.reduce((sum, sess) => {
      const stu = studentMap.get(sess.studentId);
      return sum + (stu ? stu.tuitionPerSession : 0);
    }, 0);

    // Current Month Earned Revenue (specifically for top KPI card)
    const currentMonthPresentSessions = sessions.filter(
      (s) =>
        getJalaliMonthKey(s.jalaliDate) === today.monthKey &&
        (s.attendanceStatus === 'present' ||
          s.attendanceStatus === 'absent_charged')
    );
    const currentMonthEarnedRevenue = currentMonthPresentSessions.reduce(
      (sum, sess) => {
        const stu = studentMap.get(sess.studentId);
        return sum + (stu ? stu.tuitionPerSession : 0);
      },
      0
    );

    // Approved recharge payments
    const approvedRechargesTotal = rechargeRequests
      .filter((r) => r.status === 'approved')
      .reduce((sum, r) => sum + r.totalAmount, 0);

    // Negative credit (delayed payment) students and owed receivables
    const negativeCreditStudents = students.filter((s) => s.sessionsLeft < 0);
    const totalNegativeSessionsCount = negativeCreditStudents.reduce(
      (sum, s) => sum + Math.abs(s.sessionsLeft),
      0
    );
    const totalDelayedPaymentReceivables = negativeCreditStudents.reduce(
      (sum, s) => sum + Math.abs(s.sessionsLeft) * s.tuitionPerSession,
      0
    );

    // Per-student breakdown for the selected month
    const studentBreakdown = students.map((stu) => {
      const stuPresentInMonth = presentSessions.filter(
        (s) => s.studentId === stu.id
      ).length;
      const stuScheduledInMonth = scheduledSessions.filter(
        (s) => s.studentId === stu.id
      ).length;
      const stuEarnedInMonth = stuPresentInMonth * stu.tuitionPerSession;
      const stuProjectedInMonth = stuScheduledInMonth * stu.tuitionPerSession;
      const owedAmount =
        stu.sessionsLeft < 0
          ? Math.abs(stu.sessionsLeft) * stu.tuitionPerSession
          : 0;

      return {
        student: stu,
        presentCount: stuPresentInMonth,
        scheduledCount: stuScheduledInMonth,
        earnedAmount: stuEarnedInMonth,
        projectedAmount: stuProjectedInMonth,
        owedAmount,
      };
    });

    return {
      presentSessionsCount: presentSessions.length,
      scheduledSessionsCount: scheduledSessions.length,
      earnedRevenue,
      projectedScheduledRevenue,
      currentMonthEarnedRevenue,
      currentMonthPresentCount: currentMonthPresentSessions.length,
      approvedRechargesTotal,
      negativeCreditStudentsCount: negativeCreditStudents.length,
      totalNegativeSessionsCount,
      totalDelayedPaymentReceivables,
      studentBreakdown,
    };
  }, [students, sessions, rechargeRequests, selectedFinanceMonth, today.monthKey]);

  // Handlers
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStudentFormMsg(null);
    setAddingStudent(true);
    const cleanDays = sanitizeSelectedDays(stuSelectedDays);
    const cleanDefaultTime = toEnglishDigits(stuTime).trim() || '17:00';
    const cleanDayTimes = sanitizeDayTimes(
      stuDayTimes,
      cleanDays,
      cleanDefaultTime
    );
    const primaryTime = cleanDayTimes[String(cleanDays[0])] || cleanDefaultTime;
    const intervalLabel = formatWeekdaysLabel(
      cleanDays,
      cleanDayTimes,
      primaryTime
    );
    const initialSessionsValue =
      stuPaymentType === 'postpaid' ? Number(stuInitialSessions) || 0 : Number(stuInitialSessions) || 0;
    try {
      await onAddStudent({
        name: stuName.trim(),
        phone: toEnglishDigits(stuPhone).trim(),
        password: toEnglishDigits(stuPassword).trim() || '123456',
        subject: stuSubject.trim(),
        startDate: toEnglishDigits(stuStartDate).trim(),
        classTime: primaryTime,
        selectedDays: cleanDays,
        dayTimes: cleanDayTimes,
        intervalType: 'custom_days',
        intervalLabel,
        tuitionPerSession: Number(stuTuition) || 500000,
        sessionsLeft: initialSessionsValue,
        paymentType: stuPaymentType,
        postpaidCycleSessions: Math.max(1, Number(stuPostpaidCycle) || 4),
      });
      setStudentFormMsg({
        type: 'success',
        text: `دانش‌آموز «${stuName}» (${
          stuPaymentType === 'postpaid' ? 'پس‌پرداخت' : 'پیش‌پرداخت'
        }) با برنامه کلاسی (${intervalLabel}) ثبت شد.`,
      });
      setStuName('');
      setStuPhone('');
      setStuPassword('123456');
      setStuSubject('');
    } catch (err) {
      setStudentFormMsg({
        type: 'error',
        text: err instanceof Error ? err.message : 'خطا در ثبت دانش‌آموز جدید.',
      });
    } finally {
      setAddingStudent(false);
    }
  };

  const handleOpenEditStudentModal = (stu: Student) => {
    const cleanDays =
      Array.isArray(stu.selectedDays) && stu.selectedDays.length > 0
        ? sanitizeSelectedDays(stu.selectedDays)
        : [0, 3];
    const cleanDayTimes = sanitizeDayTimes(
      stu.dayTimes,
      cleanDays,
      stu.classTime || '17:00'
    );
    setEditingStudent(stu);
    setEditStuName(stu.name);
    setEditStuPhone(stu.phone);
    setEditStuPassword(stu.password || '123456');
    setEditStuSubject(stu.subject);
    setEditStuStartDate(stu.startDate);
    setEditStuTime(stu.classTime || '17:00');
    setEditStuSelectedDays(cleanDays);
    setEditStuDayTimes(cleanDayTimes);
    setEditStuPaymentType(stu.paymentType || 'prepaid');
    setEditStuPostpaidCycle(stu.postpaidCycleSessions || 4);
    setEditStuTuition(stu.tuitionPerSession);
    setEditStuSessionsLeft(stu.sessionsLeft);
    setEditStuTotalPaid(
      stu.totalSessionsPaid !== undefined
        ? stu.totalSessionsPaid
        : stu.totalAttended + stu.sessionsLeft
    );
    setEditStuTotalAttended(stu.totalAttended);
    setEditStudentMsg(null);
  };

  const handleSaveStudentEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setEditStudentMsg(null);
    setSavingStudentEdit(true);
    const cleanDays = sanitizeSelectedDays(editStuSelectedDays);
    const cleanDefaultTime = toEnglishDigits(editStuTime).trim() || '17:00';
    const cleanDayTimes = sanitizeDayTimes(
      editStuDayTimes,
      cleanDays,
      cleanDefaultTime
    );
    const primaryTime = cleanDayTimes[String(cleanDays[0])] || cleanDefaultTime;
    try {
      await onEditStudent(editingStudent.id, {
        name: editStuName.trim(),
        phone: toEnglishDigits(editStuPhone).trim(),
        password: editStuPassword.trim(),
        subject: editStuSubject.trim(),
        startDate: toEnglishDigits(editStuStartDate).trim(),
        classTime: primaryTime,
        selectedDays: cleanDays,
        dayTimes: cleanDayTimes,
        tuitionPerSession: Number(editStuTuition) || 0,
        sessionsLeft: Number(editStuSessionsLeft),
        totalSessionsPaid: Number(editStuTotalPaid),
        totalAttended: Number(editStuTotalAttended),
        paymentType: editStuPaymentType,
        postpaidCycleSessions: Math.max(1, Number(editStuPostpaidCycle) || 4),
      });
      setEditingStudent(null);
    } catch (err) {
      setEditStudentMsg({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'خطا در ذخیره ویرایش اطلاعات دانش‌آموز.',
      });
    } finally {
      setSavingStudentEdit(false);
    }
  };

  const handleQuickRecordPresentSession = async (stu: Student) => {
    // Check if there is an existing scheduled session for this student; if so, mark the earliest one present.
    // Otherwise, create a new 'present' session on today's date, immediately deducting 1 session (going negative if <= 0).
    const nextScheduled = sessions
      .filter((s) => s.studentId === stu.id && s.attendanceStatus === 'scheduled')
      .sort((a, b) => a.jalaliDate.localeCompare(b.jalaliDate))[0];

    if (nextScheduled) {
      await onUpdateSession(nextScheduled.id, {
        attendanceStatus: 'present',
        grade: nextScheduled.grade >= 0 ? nextScheduled.grade : -1,
        topic: nextScheduled.topic || `جلسه آموزشی ${stu.subject}`,
        teacherNote: nextScheduled.teacherNote || 'ثبت حضور جلسه',
      });
    } else {
      const resolvedTime = getTimeForJalaliDate(
        today.formatted,
        stu.selectedDays,
        stu.classTime || '17:00',
        stu.dayTimes
      );
      await onAddSession({
        studentId: stu.id,
        jalaliDate: today.formatted,
        time: resolvedTime,
        topic: `جلسه شماره ${toPersianDigits(stu.totalAttended + 1)} — ${stu.subject}`,
        teacherNote: 'ثبت حضور جلسه جدید',
        attendanceStatus: 'present',
        grade: -1,
      });
    }
  };

  const handleDirectRechargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rechargingStudent) return;
    setSubmittingRecharge(true);
    try {
      await onDirectRechargeStudent(
        rechargingStudent.id,
        rechargeAddCount,
        rechargeCustomTuition,
        rechargeNote ||
          `شارژ مستقیم ${toPersianDigits(rechargeAddCount)} جلسه توسط استاد`
      );
      setRechargingStudent(null);
      setRechargeNote('');
    } finally {
      setSubmittingRecharge(false);
    }
  };

  const handleOpenEditSession = (sess: ClassSession) => {
    setEditingSessionId(sess.id);
    setEditStatus(
      sess.attendanceStatus === 'scheduled' ? 'present' : sess.attendanceStatus
    );
    setEditGrade(sess.grade >= 0 ? String(sess.grade) : '19');
    setEditTopic(sess.topic);
    setEditNote(sess.teacherNote);
  };

  const handleSaveSessionEdit = async (sessionId: string) => {
    const parsedGrade =
      editGrade.trim() === '' ? -1 : Number(toEnglishDigits(editGrade));
    await onUpdateSession(sessionId, {
      attendanceStatus: editStatus,
      grade: isNaN(parsedGrade) ? -1 : parsedGrade,
      topic: editTopic,
      teacherNote: editNote,
    });
    setEditingSessionId(null);
  };

  const handleCreateCustomSession = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStuId = newSessStudentId || students[0]?.id;
    if (!targetStuId) return;
    await onAddSession({
      studentId: targetStuId,
      jalaliDate: toEnglishDigits(newSessDate).trim(),
      time: toEnglishDigits(newSessTime).trim(),
      topic: newSessTopic.trim(),
      teacherNote: newSessNote.trim(),
      attendanceStatus: newSessStatus,
    });
    setShowNewSessionForm(false);
    setNewSessTopic('');
    setNewSessNote('');
    setNewSessStatus('scheduled');
  };

  const handleSendTeacherChat = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetStuId = activeChatStudentId || students[0]?.id;
    if (!targetStuId || !teacherChatInput.trim()) return;
    await onSendMessage(
      targetStuId,
      'teacher',
      teacherName,
      teacherChatInput.trim()
    );
    setTeacherChatInput('');
  };

  const handleTriggerReminder = async (sessionId: string) => {
    await onSendSessionReminder(sessionId);
    setReminderSentSessionId(sessionId);
    window.setTimeout(() => {
      setReminderSentSessionId((prev) => (prev === sessionId ? null : prev));
    }, 2500);
  };

  // Filtered sessions for the attendance & grade sheet
  const filteredSessions = sessions
    .filter((s) => {
      if (filterStudentId !== 'all' && s.studentId !== filterStudentId) return false;
      if (filterAttendance !== 'all' && s.attendanceStatus !== filterAttendance)
        return false;
      if (searchQuery.trim()) {
        const q = searchQuery.trim();
        return (
          s.studentName.includes(q) ||
          s.subject.includes(q) ||
          s.topic.includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));

  const currentChatStudent =
    students.find((s) => s.id === activeChatStudentId) || students[0] || null;
  const activeThreadMessages = currentChatStudent
    ? messages.filter((m) => m.studentId === currentChatStudent.id)
    : [];

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* =====================================================================
          Mobile-Optimized KPI Summary (Progressive Disclosure on Mobile < md)
         ===================================================================== */}
      <div className="md:hidden space-y-2.5">
        <div className="grid grid-cols-2 gap-2.5">
          <div
            onClick={() => onSelectTab('finance')}
            className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-3.5 cursor-pointer"
          >
            <div className="flex items-center justify-between text-[12px] text-[#807d72] mb-1">
              <span>سود {today.monthName}</span>
              <TrendingUp className="w-3.5 h-3.5 text-[#1f8a65]" />
            </div>
            <div className="text-[18px] font-semibold text-[#1f8a65] font-mono-code truncate">
              {formatToman(monthlyFinanceStats.currentMonthEarnedRevenue)}
            </div>
            <div className="text-[11px] text-[#807d72] mt-0.5 font-mono-code">
              {toPersianDigits(monthlyFinanceStats.currentMonthPresentCount)} جلسه برگزارشده
            </div>
          </div>

          <div
            onClick={() => onSelectTab('students')}
            className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-3.5 cursor-pointer"
          >
            <div className="text-[12px] text-[#807d72] mb-1">دانش‌آموزان فعال</div>
            <div className="text-[18px] font-semibold text-[#26251e] font-mono-code">
              {toPersianDigits(students.length)} دانش‌آموز
            </div>
            <div className="text-[11px] text-[#807d72] mt-0.5 font-mono-code">
              تراز کل:{' '}
              {formatSignedPersianNumber(
                students.reduce((sum, s) => sum + s.sessionsLeft, 0)
              )}{' '}
              جلسه
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowMobileExtraKpis((prev) => !prev)}
          className="w-full min-h-[40px] px-3.5 py-2 border border-[#e6e5e0] bg-[#ffffff] rounded-[10px] text-[12px] font-medium text-[#5a5852] flex items-center justify-between cursor-pointer"
        >
          <span>
            مطالبات معوق ({toPersianDigits(monthlyFinanceStats.negativeCreditStudentsCount)} بدهکار) · شارژ در انتظار ({toPersianDigits(pendingRecharges.length)})
          </span>
          {showMobileExtraKpis ? (
            <ChevronUp className="w-4 h-4 shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 shrink-0" />
          )}
        </button>

        {showMobileExtraKpis && (
          <div className="grid grid-cols-1 gap-2.5 pt-0.5">
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[10px] p-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#5a5852]">
                مطالبات جلسات معوق ({toPersianDigits(monthlyFinanceStats.totalNegativeSessionsCount)} جلسه):
              </span>
              <span className="text-[14px] font-semibold font-mono-code text-[#cf2d56]">
                {formatToman(monthlyFinanceStats.totalDelayedPaymentReceivables)}
              </span>
            </div>
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[10px] p-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#5a5852]">
                جلسات در برنامه · میانگین نمرات:
              </span>
              <span className="text-[14px] font-semibold font-mono-code text-[#26251e]">
                {toPersianDigits(upcomingSessions.length)} جلسه · {toPersianDigits(overallAvgGrade)}
              </span>
            </div>
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[10px] p-3.5 flex items-center justify-between">
              <span className="text-[13px] text-[#5a5852]">
                درخواست‌های شارژ در انتظار تایید:
              </span>
              <span className="text-[14px] font-semibold font-mono-code text-[#f54e00]">
                {toPersianDigits(pendingRecharges.length)} درخواست
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Desktop 5-Column Teacher KPI Strip (Hidden on Mobile) */}
      <div className="hidden md:grid md:grid-cols-3 lg:grid-cols-5 gap-4">
        <div
          onClick={() => onSelectTab('finance')}
          className="border border-[#e6e5e0] hover:border-[#cfcdc4] bg-[#ffffff] rounded-[12px] p-5 cursor-pointer transition-colors"
        >
          <div className="flex items-center justify-between text-[13px] text-[#807d72] mb-1">
            <span>سود ماه جاری ({today.monthName})</span>
            <TrendingUp className="w-4 h-4 text-[#1f8a65]" />
          </div>
          <div className="text-[22px] font-normal text-[#1f8a65] font-mono-code">
            {formatToman(monthlyFinanceStats.currentMonthEarnedRevenue)}
          </div>
          <div className="text-[12px] text-[#807d72] mt-1 font-mono-code">
            از {toPersianDigits(monthlyFinanceStats.currentMonthPresentCount)} جلسه برگزارشده · مشاهده گزارش
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5">
          <div className="text-[13px] text-[#807d72] mb-1">دانش‌آموزان فعال</div>
          <div className="text-[24px] font-normal text-[#26251e] font-mono-code">
            {toPersianDigits(students.length)} دانش‌آموز
          </div>
          <div className="text-[12px] text-[#807d72] mt-1 font-mono-code">
            تراز کل جلسات:{' '}
            {formatSignedPersianNumber(
              students.reduce((sum, s) => sum + s.sessionsLeft, 0)
            )}{' '}
            جلسه
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5">
          <div className="text-[13px] text-[#807d72] mb-1">مطالبات جلسات معوق (اعتبار منفی)</div>
          <div
            className={`text-[22px] font-normal font-mono-code ${
              monthlyFinanceStats.totalDelayedPaymentReceivables > 0
                ? 'text-[#cf2d56]'
                : 'text-[#26251e]'
            }`}
          >
            {formatToman(monthlyFinanceStats.totalDelayedPaymentReceivables)}
          </div>
          <div className="text-[12px] text-[#807d72] mt-1 font-mono-code">
            {toPersianDigits(monthlyFinanceStats.negativeCreditStudentsCount)} دانش‌آموز بدهکار ({toPersianDigits(monthlyFinanceStats.totalNegativeSessionsCount)} جلسه)
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5">
          <div className="text-[13px] text-[#807d72] mb-1">جلسات برنامه‌ریزی‌شده پیش‌رو</div>
          <div className="text-[24px] font-normal text-[#26251e] font-mono-code">
            {toPersianDigits(upcomingSessions.length)} جلسه
          </div>
          <div className="text-[12px] text-[#807d72] mt-1 font-mono-code">
            میانگین کل نمرات: {toPersianDigits(overallAvgGrade)} از ۲۰
          </div>
        </div>

        <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-5">
          <div className="text-[13px] text-[#807d72] mb-1">درخواست‌های شارژ در انتظار</div>
          <div
            className={`text-[24px] font-normal font-mono-code ${
              pendingRecharges.length > 0 ? 'text-[#f54e00]' : 'text-[#26251e]'
            }`}
          >
            {toPersianDigits(pendingRecharges.length)} درخواست
          </div>
          <div className="text-[12px] text-[#807d72] mt-1 font-mono-code">
            مبلغ:{' '}
            {formatToman(
              pendingRecharges.reduce((sum, r) => sum + r.totalAmount, 0)
            )}
          </div>
        </div>
      </div>

      {/* Desktop Workspace Segmented Toolbar (Hidden on Mobile — Replaced by Fixed Bottom Tab Bar) */}
      <div className="hidden md:flex flex-wrap items-center justify-between gap-4 border-b border-[#e6e5e0] pb-4">
        <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#e6e5e0]/70 rounded-[8px]">
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'dashboard'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>تقویم شمسی و جلسات پیش‌رو</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('students')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'students'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>
              دانش‌آموزان، ویرایش و شارژ ({toPersianDigits(pendingRecharges.length)})
            </span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('attendance')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'attendance'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>حضور و غیاب و ثبت نمرات</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('finance')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'finance'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>گزارش سود و درآمد ماهانه</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectTab('chat')}
            className={`px-3.5 py-2 text-[14px] font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'chat'
                ? 'bg-[#ffffff] text-[#26251e]'
                : 'text-[#5a5852] hover:text-[#26251e]'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>گفتگو و اعلان‌ها ({toPersianDigits(unreadTeacherNotifs)})</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNewSessDate(selectedDate);
              setNewSessStudentId(students[0]?.id || '');
              setShowNewSessionForm(true);
            }}
            className="h-[40px] px-[18px] py-[10px] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] text-[#ffffff] text-[14px] font-medium rounded-[8px] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت جلسه جدید در تقویم</span>
          </button>
        </div>
      </div>

      {/* Optional Inline Form to Schedule a New Session on the Selected Jalali Date */}
      {showNewSessionForm && (
        <div className="border border-[#cfcdc4] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e6e5e0]">
            <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#26251e]">
              افزودن جلسه آموزشی جدید در تقویم شمسی
            </h3>
            <button
              type="button"
              onClick={() => setShowNewSessionForm(false)}
              className="min-h-[40px] px-2 text-[13px] font-semibold text-[#807d72] hover:text-[#26251e] cursor-pointer"
            >
              بستن ✕
            </button>
          </div>
          <form
            onSubmit={handleCreateCustomSession}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3.5 sm:gap-4 items-end"
          >
            <div>
              <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                انتخاب دانش‌آموز
              </label>
              <select
                value={newSessStudentId}
                onChange={(e) => setNewSessStudentId(e.target.value)}
                className="w-full min-h-[44px] px-3 text-[15px] sm:text-[13px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff] text-[#26251e]"
              >
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {s.subject}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                تاریخ شمسی (YYYY/MM/DD)
              </label>
              <input
                type="text"
                dir="ltr"
                value={newSessDate}
                onChange={(e) => setNewSessDate(e.target.value)}
                placeholder="1405/08/07"
                className="w-full min-h-[44px] px-3 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                ساعت برگزاری
              </label>
              <input
                type="time"
                value={newSessTime}
                onChange={(e) => setNewSessTime(e.target.value)}
                className="w-full min-h-[44px] px-3 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                required
              />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                وضعیت حضور جلسه
              </label>
              <select
                value={newSessStatus}
                onChange={(e) => setNewSessStatus(e.target.value as AttendanceStatus)}
                className="w-full min-h-[44px] px-3 text-[14px] sm:text-[13px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff] text-[#26251e]"
              >
                <option value="scheduled">در انتظار برگزاری</option>
                <option value="present">حاضر — برگزارشده (کسر ۱ جلسه)</option>
                <option value="absent_charged">غیبت با کسر جلسه (-۱)</option>
                <option value="excused">غیبت موجه (بدون کسر)</option>
              </select>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                مبحث آموزشی جلسه
              </label>
              <input
                type="text"
                value={newSessTopic}
                onChange={(e) => setNewSessTopic(e.target.value)}
                placeholder="مثال: حل تمرین فصل سوم"
                className="w-full min-h-[44px] px-3 text-[16px] sm:text-[13px] border border-[#cfcdc4] rounded-[8px]"
                required
              />
            </div>
            <div>
              <button
                type="submit"
                className="w-full min-h-[44px] px-4 bg-[#f54e00] hover:bg-[#d04200] text-[#ffffff] text-[14px] font-semibold rounded-[8px] transition-colors cursor-pointer"
              >
                ثبت جلسه و اعمال تراز
              </button>
            </div>
          </form>
        </div>
      )}

      {/* =====================================================================
          TAB 1: Iranian Jalali Calendar, Selected Day Sessions & Upcoming Queue
         ===================================================================== */}
      {activeTab === 'dashboard' && (
        <div className="space-y-5">
          {/* Mobile Primary CTA right at top of Calendar View */}
          <div className="md:hidden">
            <button
              type="button"
              onClick={() => {
                setNewSessDate(selectedDate);
                setNewSessStudentId(students[0]?.id || '');
                setShowNewSessionForm((prev) => !prev);
              }}
              className="w-full min-h-[48px] px-4 bg-[#f54e00] hover:bg-[#d04200] text-[#ffffff] text-[15px] font-semibold rounded-[10px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <Plus className="w-5 h-5" />
              <span>ثبت جلسه جدید در تقویم ({toPersianDigits(selectedDate)})</span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Left 8 Columns: Jalali Calendar + Upcoming Sessions */}
            <div className="lg:col-span-8 space-y-5 sm:space-y-6">
              <JalaliCalendar
                year={calYear}
                month={calMonth}
                selectedDate={selectedDate}
                sessions={sessions}
                onChangeMonth={(y, m) => {
                  setCalYear(y);
                  setCalMonth(m);
                }}
                onSelectDate={setSelectedDate}
                onAddSessionOnDate={(dateStr) => {
                  setSelectedDate(dateStr);
                  setNewSessDate(dateStr);
                  setShowNewSessionForm(true);
                }}
              />

              {/* Upcoming Sessions Queue (Mobile Cards + Desktop Table) */}
              <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[#e6e5e0] flex items-center justify-between">
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                    فهرست جلسات پیش‌رو
                  </h2>
                  <span className="font-mono-code text-[13px] text-[#807d72]">
                    {toPersianDigits(upcomingSessions.length)} جلسه در برنامه
                  </span>
                </div>

                {/* Mobile Card List (< md) */}
                <div className="md:hidden divide-y divide-[#efeee8]">
                  {upcomingSessions.length === 0 ? (
                    <p className="py-8 text-center text-[13px] text-[#807d72]">
                      جلسه پیش‌رویی در تقویم ثبت نشده است.
                    </p>
                  ) : (
                    upcomingSessions.map((sess) => (
                      <div key={sess.id} className="p-4 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[15px] font-semibold text-[#26251e]">
                              {sess.studentName}
                            </div>
                            <div className="text-[13px] text-[#807d72]">
                              {sess.subject}
                            </div>
                          </div>
                          <div className="text-left">
                            <div className="text-[13px] font-semibold text-[#26251e]">
                              {formatReadableJalali(sess.jalaliDate)}
                            </div>
                            <div className="text-[12px] font-mono-code text-[#807d72]">
                              ساعت {toPersianDigits(sess.time)}
                            </div>
                          </div>
                        </div>

                        <div className="text-[13px] text-[#5a5852]">
                          مبحث: {sess.topic || 'مبحث عمومی دوره'}
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              handleOpenEditSession(sess);
                              onSelectTab('attendance');
                            }}
                            className="min-h-[44px] px-3 text-[13px] font-semibold text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] rounded-[8px] cursor-pointer"
                          >
                            ثبت حضور و نمره
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerReminder(sess.id)}
                            className="min-h-[44px] px-3 text-[13px] font-medium text-[#5a5852] border border-[#e6e5e0] rounded-[8px] cursor-pointer"
                          >
                            {reminderSentSessionId === sess.id
                              ? 'یادآوری ارسال شد ✓'
                              : 'ارسال یادآوری'}
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Desktop Table (>= md) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse">
                    <thead>
                      <tr className="border-b border-[#e6e5e0] bg-[#fafaf7] text-[13px] font-semibold text-[#5a5852]">
                        <th className="py-3 px-4">دانش‌آموز و درس</th>
                        <th className="py-3 px-4">تاریخ شمسی و ساعت</th>
                        <th className="py-3 px-4">مبحث جلسه</th>
                        <th className="py-3 px-4">عملیات سریع</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#efeee8] text-[14px]">
                      {upcomingSessions.length === 0 ? (
                        <tr>
                          <td
                            colSpan={4}
                            className="py-8 text-center text-[13px] text-[#807d72]"
                          >
                            جلسه پیش‌رویی در تقویم ثبت نشده است.
                          </td>
                        </tr>
                      ) : (
                        upcomingSessions.map((sess) => (
                          <tr
                            key={sess.id}
                            className="hover:bg-[#fafaf7] transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#26251e]">
                                {sess.studentName}
                              </div>
                              <div className="text-[13px] text-[#807d72]">
                                {sess.subject}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-semibold text-[#26251e]">
                                {formatReadableJalali(sess.jalaliDate)}
                              </div>
                              <div className="font-mono-code text-[#807d72]">
                                {toPersianDigits(sess.jalaliDate)} · ساعت{' '}
                                {toPersianDigits(sess.time)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[13px] text-[#5a5852]">
                              {sess.topic || 'مبحث عمومی دوره'}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleOpenEditSession(sess);
                                    onSelectTab('attendance');
                                  }}
                                  className="px-3 py-1.5 text-[12px] font-medium text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] hover:bg-[#e6e5e0]/60 rounded-[6px] transition-colors cursor-pointer"
                                >
                                  ثبت حضور و نمره
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleTriggerReminder(sess.id)}
                                  className="px-3 py-1.5 text-[12px] font-medium text-[#5a5852] border border-[#e6e5e0] hover:border-[#cfcdc4] hover:text-[#26251e] rounded-[6px] transition-colors cursor-pointer"
                                >
                                  {reminderSentSessionId === sess.id
                                    ? 'یادآوری ارسال شد ✓'
                                    : 'ارسال یادآوری'}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right 4 Columns: Selected Date Sessions Inspector + Pending Recharges */}
            <div className="lg:col-span-4 space-y-5 sm:space-y-6">
              {/* Selected Day Details */}
              <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e6e5e0]">
                  <div>
                    <h3 className="text-[16px] font-semibold text-[#26251e]">
                      جلسات روز {formatReadableJalali(selectedDate)}
                    </h3>
                    <div className="font-mono-code text-[12px] sm:text-[13px] text-[#807d72] mt-0.5">
                      تاریخ شمسی: {toPersianDigits(selectedDate)}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setNewSessDate(selectedDate);
                      setShowNewSessionForm(true);
                    }}
                    className="min-h-[40px] px-3 py-1.5 text-[12px] font-semibold text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] hover:bg-[#e6e5e0]/60 rounded-[8px] transition-colors cursor-pointer"
                  >
                    + جلسه جدید
                  </button>
                </div>

                {selectedDateSessions.length === 0 ? (
                  <div className="py-6 sm:py-8 text-center">
                    <p className="text-[13px] text-[#807d72] mb-3">
                      در تاریخ {toPersianDigits(selectedDate)} هیچ جلسه‌ای ثبت نشده است.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setNewSessDate(selectedDate);
                        setShowNewSessionForm(true);
                      }}
                      className="min-h-[44px] px-4 py-2 text-[13px] font-semibold text-[#26251e] border border-[#cfcdc4] rounded-[8px] hover:bg-[#fafaf7] cursor-pointer"
                    >
                      برنامه‌ریزی جلسه در این تاریخ
                    </button>
                  </div>
                ) : (
                  <div className="divide-y divide-[#efeee8]">
                    {selectedDateSessions.map((sess) => (
                      <div key={sess.id} className="py-3.5 space-y-2.5">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="text-[15px] sm:text-[14px] font-semibold text-[#26251e]">
                              {sess.studentName}
                            </div>
                            <div className="text-[13px] text-[#807d72]">
                              {sess.subject} · ساعت{' '}
                              <span className="font-mono-code">
                                {toPersianDigits(sess.time)}
                              </span>
                            </div>
                          </div>
                          <span className="text-[12px] font-semibold text-[#26251e]">
                            {sess.attendanceStatus === 'present'
                              ? `حاضر · نمره: ${
                                  sess.grade >= 0 ? toPersianDigits(sess.grade) : '—'
                                }`
                              : sess.attendanceStatus === 'absent_charged'
                              ? 'غیبت با کسر جلسه'
                              : sess.attendanceStatus === 'absent'
                              ? 'غیبت بدون کسر'
                              : sess.attendanceStatus === 'excused'
                              ? 'غیبت موجه'
                              : 'در انتظار برگزاری'}
                          </span>
                        </div>
                        <div className="text-[13px] text-[#5a5852]">
                          مبحث: {sess.topic || 'ثبت نشده'}
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSession(sess.id, {
                                attendanceStatus: 'present',
                                grade: sess.grade >= 0 ? sess.grade : 19,
                                topic: sess.topic,
                                teacherNote: sess.teacherNote,
                              })
                            }
                            className={`min-h-[40px] px-3 py-1.5 text-[12px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                              sess.attendanceStatus === 'present'
                                ? 'bg-[#1f8a65] text-white'
                                : 'bg-[#fafaf7] border border-[#e6e5e0] text-[#26251e] hover:border-[#1f8a65]'
                            }`}
                          >
                            ثبت حضور
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSession(sess.id, {
                                attendanceStatus: 'absent_charged',
                                grade: -1,
                                topic: sess.topic,
                                teacherNote: sess.teacherNote,
                              })
                            }
                            className={`min-h-[40px] px-3 py-1.5 text-[12px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                              sess.attendanceStatus === 'absent_charged'
                                ? 'bg-[#cf2d56] text-white'
                                : 'bg-[#fafaf7] border border-[#e6e5e0] text-[#26251e] hover:border-[#cf2d56]'
                            }`}
                          >
                            ثبت غیبت با کسر جلسه
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateSession(sess.id, {
                                attendanceStatus: 'absent',
                                grade: -1,
                                topic: sess.topic,
                                teacherNote: sess.teacherNote,
                              })
                            }
                            className={`min-h-[40px] px-3 py-1.5 text-[12px] font-semibold rounded-[8px] transition-colors cursor-pointer ${
                              sess.attendanceStatus === 'absent'
                                ? 'bg-[#c08532] text-white'
                                : 'bg-[#fafaf7] border border-[#e6e5e0] text-[#26251e] hover:border-[#c08532]'
                            }`}
                          >
                            غیبت بدون کسر
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerReminder(sess.id)}
                            className="min-h-[40px] px-2.5 py-1.5 text-[12px] text-[#807d72] hover:text-[#26251e] mr-auto cursor-pointer"
                          >
                            {reminderSentSessionId === sess.id ? 'ارسال شد ✓' : 'یادآوری'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Pending Recharge Requests Approval Widget */}
              {pendingRecharges.length > 0 && (
                <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
                  <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e6e5e0]">
                    <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#26251e]">
                      تایید شارژ جلسات دانش‌آموزان ({toPersianDigits(pendingRecharges.length)})
                    </h3>
                  </div>

                  <div className="divide-y divide-[#efeee8]">
                    {pendingRecharges.map((req) => {
                      const stu = students.find((s) => s.id === req.studentId);
                      const curLeft = stu?.sessionsLeft ?? 0;
                      return (
                        <div key={req.id} className="py-3.5 space-y-2.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[14px] font-semibold text-[#26251e]">
                              {req.studentName}
                            </span>
                            <span className="font-mono-code font-semibold text-[#f54e00]">
                              + {toPersianDigits(req.requestedSessions)} جلسه
                            </span>
                          </div>
                          {curLeft < 0 && (
                            <div className="text-[12px] text-[#cf2d56] font-mono-code">
                              تراز فعلی: {formatSignedPersianNumber(curLeft)} جلسه (پس از تایید:{' '}
                              {formatSignedPersianNumber(
                                curLeft + req.requestedSessions
                              )}{' '}
                              جلسه)
                            </div>
                          )}
                          <div className="text-[13px] text-[#5a5852] font-mono-code">
                            مبلغ: {formatToman(req.totalAmount)}
                          </div>
                          <div className="text-[12px] text-[#807d72]">
                            {req.paymentNote}
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <button
                              type="button"
                              onClick={() =>
                                onResolveRechargeRequest(req.id, 'approved')
                              }
                              className="min-h-[44px] px-3 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-[13px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                            >
                              تایید و شارژ
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onResolveRechargeRequest(req.id, 'rejected')
                              }
                              className="min-h-[44px] px-3 py-2 border border-[#cfcdc4] hover:border-[#cf2d56] text-[#5a5852] hover:text-[#cf2d56] text-[13px] font-medium rounded-[8px] transition-colors cursor-pointer"
                            >
                              رد درخواست
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 2: Students Management, Edit Student Modal & Direct Recharge
         ===================================================================== */}
      {activeTab === 'students' && (
        <div className="space-y-5">
          {/* Edit Student Inline Panel (when teacher clicks "ویرایش") */}
          {editingStudent && (
            <div className="border-2 border-[#26251e] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e6e5e0]">
                <div className="flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-[#f54e00]" />
                  <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                    ویرایش اطلاعات و رمز عبور: {editingStudent.name}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingStudent(null)}
                  className="min-h-[40px] px-2 text-[13px] font-semibold text-[#807d72] hover:text-[#26251e] cursor-pointer"
                >
                  انصراف ✕
                </button>
              </div>

              {editStudentMsg && (
                <div className="mb-4 p-3.5 rounded-[8px] border border-[#cf2d56]/30 bg-[#cf2d56]/5 text-[#cf2d56] text-[13px] font-medium">
                  {editStudentMsg.text}
                </div>
              )}

              <form onSubmit={handleSaveStudentEdit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      نام و نام خانوادگی
                    </label>
                    <input
                      type="text"
                      value={editStuName}
                      onChange={(e) => setEditStuName(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      شماره موبایل (نام کاربری ورود)
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={editStuPhone}
                      onChange={(e) => setEditStuPhone(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      رمز عبور ورود دانش‌آموز
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={editStuPassword}
                        onChange={(e) => setEditStuPassword(e.target.value)}
                        placeholder="رمز عبور دانش‌آموز"
                        className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px]"
                        required
                      />
                      <KeyRound className="w-4 h-4 text-[#f54e00] absolute right-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      عنوان درس یا دوره
                    </label>
                    <input
                      type="text"
                      value={editStuSubject}
                      onChange={(e) => setEditStuSubject(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      تاریخ شروع کلاس (شمسی)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={editStuStartDate}
                      onChange={(e) => setEditStuStartDate(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      ساعت کلاس
                    </label>
                    <input
                      type="time"
                      value={editStuTime}
                      onChange={(e) => setEditStuTime(e.target.value)}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      شهریه هر جلسه (تومان)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={25000}
                      value={editStuTuition}
                      onChange={(e) => setEditStuTuition(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                      required
                    />
                  </div>
                </div>

                {/* Payment System Type (Prepaid vs Postpaid) in Edit Modal */}
                <div className="p-3.5 sm:p-4 rounded-[10px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[13px] font-semibold text-[#26251e]">
                      سیستم پرداخت شهریه دانش‌آموز
                    </label>
                    <span className="text-[12px] text-[#5a5852]">
                      {editStuPaymentType === 'postpaid'
                        ? 'پس‌پرداخت: ابتدا جلسات برگزار می‌شود و در پایان دوره تسویه می‌گردد'
                        : 'پیش‌پرداخت: شهریه ابتدای دوره دریافت و با هر حضور کسر می‌شود'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setEditStuPaymentType('prepaid')}
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-[8px] border text-right transition-colors cursor-pointer flex items-center justify-between ${
                        editStuPaymentType === 'prepaid'
                          ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                          : 'bg-[#ffffff] text-[#26251e] border-[#cfcdc4]'
                      }`}
                    >
                      <span className="text-[13px] font-semibold">
                        پیش‌پرداخت (شارژ قبل از کلاس)
                      </span>
                      <span className="text-[11px] opacity-80">اعتبار اولیه مثبت</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditStuPaymentType('postpaid')}
                      className={`min-h-[44px] px-3.5 py-2.5 rounded-[8px] border text-right transition-colors cursor-pointer flex items-center justify-between ${
                        editStuPaymentType === 'postpaid'
                          ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                          : 'bg-[#ffffff] text-[#26251e] border-[#cfcdc4]'
                      }`}
                    >
                      <span className="text-[13px] font-semibold">
                        پس‌پرداخت (تسویه پس از برگزاری)
                      </span>
                      <span className="text-[11px] opacity-80">تسویه دوره‌ای</span>
                    </button>
                  </div>

                  {editStuPaymentType === 'postpaid' && (
                    <div className="pt-2 border-t border-[#e6e5e0] flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <span className="text-[12px] font-semibold text-[#26251e] block">
                          سیکل تسویه پس‌پرداخت (هر چند جلسه یک‌بار تسویه شود؟)
                        </span>
                        <span className="text-[11px] text-[#807d72]">
                          پس از رسیدن جلسات برگزارشده به این عدد، هشدار «موعد تسویه پس‌پرداخت» نمایش داده می‌شود.
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        {[1, 4, 5, 8, 10].map((cycle) => (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setEditStuPostpaidCycle(cycle)}
                            className={`min-h-[38px] px-3 rounded-[6px] text-[12px] font-mono-code font-semibold border cursor-pointer ${
                              editStuPostpaidCycle === cycle
                                ? 'bg-[#f54e00] text-white border-[#f54e00]'
                                : 'bg-[#ffffff] text-[#26251e] border-[#cfcdc4]'
                            }`}
                          >
                            هر {toPersianDigits(cycle)} جلسه
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Accounting & Session Balance Reconciliation Box */}
                <div className="p-3.5 sm:p-4 rounded-[10px] bg-[#fafaf7] border border-[#cfcdc4] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[13px] font-semibold text-[#26251e]">
                      تنظیم دقیق جلسات پرداخت‌شده، برگزارشده و بدهی دانش‌آموز
                    </span>
                    <span
                      className={`text-[12px] font-mono-code font-semibold px-2.5 py-1 rounded-[6px] ${
                        editStuSessionsLeft < 0
                          ? 'bg-[#cf2d56]/10 text-[#cf2d56] border border-[#cf2d56]/30'
                          : editStuSessionsLeft === 0
                          ? 'bg-[#c08532]/10 text-[#c08532] border border-[#c08532]/30'
                          : 'bg-[#1f8a65]/10 text-[#1f8a65] border border-[#1f8a65]/30'
                      }`}
                    >
                      {editStuSessionsLeft < 0
                        ? editStuPaymentType === 'postpaid'
                          ? `پس‌پرداخت: ${toPersianDigits(Math.abs(editStuSessionsLeft))} جلسه برگزارشده در انتظار تسویه (${formatToman(Math.abs(editStuSessionsLeft) * editStuTuition)})`
                          : `وضعیت: ${formatSignedPersianNumber(editStuSessionsLeft)} جلسه (بدهکار — ${formatToman(Math.abs(editStuSessionsLeft) * editStuTuition)})`
                        : editStuSessionsLeft === 0
                        ? editStuPaymentType === 'postpaid'
                          ? 'وضعیت پس‌پرداخت: تسویه کامل (۰ جلسه معوق)'
                          : 'وضعیت: ۰ جلسه باقی‌مانده (اتمام اعتبار)'
                        : `وضعیت: ${toPersianDigits(editStuSessionsLeft)} جلسه اعتبار باقی‌مانده`}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                        کل جلسات پرداخت‌شده / تسویه‌شده
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={editStuTotalPaid}
                        onChange={(e) => {
                          const newPaid = Number(e.target.value);
                          setEditStuTotalPaid(newPaid);
                          setEditStuSessionsLeft(newPaid - editStuTotalAttended);
                        }}
                        className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code bg-[#ffffff] border border-[#cfcdc4] rounded-[8px]"
                        required
                      />
                      <span className="block text-[11px] text-[#807d72] mt-1">
                        مثال: اگر ۵ جلسه پرداخت کرده و ۶ جلسه آمده، تراز ۱- می‌شود.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                        جلسات برگزارشده (حاضر)
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={1000}
                        value={editStuTotalAttended}
                        onChange={(e) => {
                          const newAttended = Number(e.target.value);
                          setEditStuTotalAttended(newAttended);
                          setEditStuSessionsLeft(editStuTotalPaid - newAttended);
                        }}
                        className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code bg-[#ffffff] border border-[#cfcdc4] rounded-[8px]"
                        required
                      />
                      <span className="block text-[11px] text-[#807d72] mt-1">
                        تعداد کل جلساتی که دانش‌آموز تا امروز شرکت کرده است.
                      </span>
                    </div>

                    <div>
                      <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                        تراز جلسات فعلی (مثبت یا منفی)
                      </label>
                      <input
                        type="number"
                        min={-500}
                        max={1000}
                        value={editStuSessionsLeft}
                        onChange={(e) => {
                          const newLeft = Number(e.target.value);
                          setEditStuSessionsLeft(newLeft);
                          setEditStuTotalPaid(editStuTotalAttended + newLeft);
                        }}
                        className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code bg-[#ffffff] border border-[#cfcdc4] rounded-[8px]"
                        required
                      />
                      <span className="block text-[11px] text-[#807d72] mt-1">
                        عدد منفی (مثلاً -1) یعنی جلسه برگزار شده ولی هنوز تسویه نشده است.
                      </span>
                    </div>
                  </div>
                </div>

                {/* Weekday Multi-Select + Per-Weekday Class Hours in Edit Modal */}
                <div className="p-3.5 sm:p-4 rounded-[10px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label className="block text-[13px] font-semibold text-[#26251e]">
                      روزهای هفته و ساعت اختصاصی هر روز
                    </label>
                    <span className="text-[12px] font-semibold text-[#f54e00]">
                      {formatWeekdaysLabel(
                        editStuSelectedDays,
                        editStuDayTimes,
                        editStuTime
                      )}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                    {JALALI_WEEKDAYS.map((dayName, idx) => {
                      const isSelected = editStuSelectedDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            toggleWeekday(
                              idx,
                              editStuSelectedDays,
                              setEditStuSelectedDays
                            );
                            setEditStuDayTimes((prev) => ({
                              ...prev,
                              [String(idx)]:
                                prev[String(idx)] || editStuTime || '17:00',
                            }));
                          }}
                          className={`min-h-[44px] px-2 text-[13px] font-semibold rounded-[8px] border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                              : 'bg-[#ffffff] text-[#5a5852] border-[#cfcdc4] hover:text-[#26251e]'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-Weekday Distinct Time Inputs */}
                  <div className="pt-2 border-t border-[#e6e5e0] space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#26251e]">
                        تنظیم ساعت مجزا برای هر روز انتخاب‌شده (مثال: دوشنبه ۱۶:۰۰ و جمعه ۱۰:۰۰):
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const unified: Record<string, string> = {};
                          editStuSelectedDays.forEach((d) => {
                            unified[String(d)] = editStuTime || '17:00';
                          });
                          setEditStuDayTimes(unified);
                        }}
                        className="text-[11px] font-medium text-[#f54e00] hover:underline cursor-pointer"
                      >
                        اعمال ساعت پیش‌فرض ({toPersianDigits(editStuTime || '17:00')}) برای همه روزها
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                      {editStuSelectedDays.map((dayIdx) => {
                        const dayKey = String(dayIdx);
                        const dayVal =
                          editStuDayTimes[dayKey] || editStuTime || '17:00';
                        return (
                          <div
                            key={dayKey}
                            className="flex items-center justify-between gap-2 p-2.5 rounded-[8px] bg-[#ffffff] border border-[#cfcdc4]"
                          >
                            <span className="text-[13px] font-semibold text-[#26251e]">
                              ساعت {JALALI_WEEKDAYS[dayIdx]}:
                            </span>
                            <input
                              type="time"
                              value={dayVal}
                              onChange={(e) => {
                                const newTime = e.target.value;
                                setEditStuDayTimes((prev) => ({
                                  ...prev,
                                  [dayKey]: newTime,
                                }));
                                if (dayIdx === editStuSelectedDays[0]) {
                                  setEditStuTime(newTime);
                                }
                              }}
                              className="min-h-[38px] px-2.5 text-[14px] font-mono-code border border-[#cfcdc4] rounded-[6px] bg-[#fafaf7]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingStudent(null)}
                    className="min-h-[44px] px-4 border border-[#cfcdc4] rounded-[8px] text-[13px] font-medium text-[#5a5852] cursor-pointer"
                  >
                    لغو
                  </button>
                  <button
                    type="submit"
                    disabled={savingStudentEdit}
                    className="min-h-[44px] px-5 bg-[#f54e00] hover:bg-[#d04200] text-white text-[14px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                  >
                    {savingStudentEdit
                      ? 'در حال ذخیره...'
                      : 'ذخیره تغییرات دانش‌آموز'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Direct Teacher Recharge / Postpaid Settlement Panel */}
          {rechargingStudent && (
            <div className="border-2 border-[#f54e00] bg-[#ffffff] rounded-[12px] p-4 sm:p-6">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#e6e5e0]">
                <div>
                  <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                    {rechargingStudent.paymentType === 'postpaid'
                      ? `تسویه حساب دوره پس‌پرداخت: ${rechargingStudent.name} (${rechargingStudent.subject})`
                      : `شارژ مستقیم جلسات پیش‌پرداخت: ${rechargingStudent.name} (${rechargingStudent.subject})`}
                  </h3>
                  <p className="text-[13px] text-[#5a5852] mt-0.5 font-mono-code">
                    نوع حساب:{' '}
                    <span className="font-semibold text-[#26251e]">
                      {rechargingStudent.paymentType === 'postpaid'
                        ? `پس‌پرداخت (سیکل تسویه هر ${toPersianDigits(
                            rechargingStudent.postpaidCycleSessions || 4
                          )} جلسه)`
                        : 'پیش‌پرداخت'}
                    </span>{' '}
                    · تراز فعلی:{' '}
                    <span
                      className={
                        rechargingStudent.sessionsLeft < 0
                          ? 'text-[#cf2d56] font-semibold'
                          : 'text-[#26251e] font-semibold'
                      }
                    >
                      {formatSignedPersianNumber(rechargingStudent.sessionsLeft)} جلسه
                    </span>
                    {rechargingStudent.sessionsLeft < 0
                      ? ` (با ثبت پرداخت ${toPersianDigits(
                          rechargeAddCount
                        )} جلسه، تراز جدید ${formatSignedPersianNumber(
                          rechargingStudent.sessionsLeft + rechargeAddCount
                        )} جلسه خواهد شد)`
                      : ''}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setRechargingStudent(null)}
                  className="min-h-[40px] px-2 text-[13px] font-semibold text-[#807d72] hover:text-[#26251e] cursor-pointer"
                >
                  بستن ✕
                </button>
              </div>

              {rechargingStudent.sessionsLeft < 0 && (
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="text-[12px] text-[#5a5852]">انتخاب سریع تعداد جلسات:</span>
                  <button
                    type="button"
                    onClick={() =>
                      setRechargeAddCount(Math.abs(rechargingStudent.sessionsLeft))
                    }
                    className="min-h-[36px] px-3 rounded-[6px] bg-[#fafaf7] border border-[#cfcdc4] text-[12px] font-semibold text-[#26251e] hover:border-[#26251e] cursor-pointer"
                  >
                    تسویه کامل جلسات برگزارشده ({toPersianDigits(Math.abs(rechargingStudent.sessionsLeft))} جلسه = تراز ۰)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setRechargeAddCount(
                        Math.abs(rechargingStudent.sessionsLeft) +
                          (rechargingStudent.postpaidCycleSessions || 4)
                      )
                    }
                    className="min-h-[36px] px-3 rounded-[6px] bg-[#fafaf7] border border-[#cfcdc4] text-[12px] font-semibold text-[#26251e] hover:border-[#26251e] cursor-pointer"
                  >
                    تسویه بدهی + شارژ {toPersianDigits(rechargingStudent.postpaidCycleSessions || 4)} جلسه آینده
                  </button>
                </div>
              )}

              <form
                onSubmit={handleDirectRechargeSubmit}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4 items-end"
              >
                <div>
                  <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                    {rechargingStudent.paymentType === 'postpaid'
                      ? 'تعداد جلسات تسویه‌شده'
                      : 'تعداد جلسات شارژ جدید'}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={rechargeAddCount}
                    onChange={(e) =>
                      setRechargeAddCount(Math.max(1, Number(e.target.value) || 1))
                    }
                    className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                    شهریه هر جلسه (تومان)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={rechargeCustomTuition}
                    onChange={(e) =>
                      setRechargeCustomTuition(Math.max(0, Number(e.target.value) || 0))
                    }
                    className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px]"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[13px] font-semibold text-[#26251e] mb-1.5">
                    توضیحات پرداخت ({formatToman(rechargeAddCount * rechargeCustomTuition)})
                  </label>
                  <input
                    type="text"
                    value={rechargeNote}
                    onChange={(e) => setRechargeNote(e.target.value)}
                    placeholder={
                      rechargingStudent.paymentType === 'postpaid'
                        ? 'مثال: تسویه پس‌پرداخت جلسات برگزارشده'
                        : 'مثال: پرداخت نقدی / کارت به کارت'
                    }
                    className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px]"
                  />
                </div>

                <div>
                  <button
                    type="submit"
                    disabled={submittingRecharge}
                    className="w-full min-h-[44px] px-4 bg-[#f54e00] hover:bg-[#d04200] text-white text-[14px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                  >
                    {submittingRecharge
                      ? 'در حال ثبت...'
                      : rechargingStudent.paymentType === 'postpaid'
                      ? `ثبت تسویه پس‌پرداخت (تراز جدید: ${formatSignedPersianNumber(
                          rechargingStudent.sessionsLeft + rechargeAddCount
                        )} جلسه)`
                      : `ثبت شارژ (تراز جدید: ${formatSignedPersianNumber(
                          rechargingStudent.sessionsLeft + rechargeAddCount
                        )} جلسه)`}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mobile Content Prioritization Bar: Search + Toggle Add Student Form */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <input
                type="text"
                value={studentSearchQuery}
                onChange={(e) => setStudentSearchQuery(e.target.value)}
                placeholder="جستجوی سریع نام دانش‌آموز، درس یا شماره موبایل..."
                className="w-full min-h-[48px] sm:min-h-[42px] pr-10 pl-4 text-[16px] sm:text-[14px] bg-[#ffffff] border border-[#cfcdc4] rounded-[10px] focus:outline-none focus:border-[#26251e]"
              />
              <Search className="w-4 h-4 text-[#807d72] absolute right-3.5 top-4 sm:top-3" />
            </div>

            <button
              type="button"
              onClick={() => setShowMobileAddStudentForm((prev) => !prev)}
              className="lg:hidden min-h-[48px] px-4 bg-[#f54e00] hover:bg-[#d04200] text-[#ffffff] text-[15px] font-semibold rounded-[10px] transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <UserPlus className="w-5 h-5" />
              <span>
                {showMobileAddStudentForm
                  ? 'بستن فرم افزودن دانش‌آموز ▴'
                  : '+ افزودن دانش‌آموز جدید'}
              </span>
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Add New Student Form (Collapsible on Mobile via Progressive Disclosure, Always Visible on Desktop lg:block) */}
            <div
              className={`${
                showMobileAddStudentForm ? 'block' : 'hidden lg:block'
              } lg:col-span-5 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6`}
            >
              <div className="flex items-center gap-2 mb-1.5">
                <UserPlus className="w-5 h-5 text-[#f54e00]" />
                <h2 className="text-[17px] sm:text-[18px] font-semibold text-[#26251e]">
                  افزودن دانش‌آموز جدید به کلاس خصوصی
                </h2>
              </div>
              <p className="text-[13px] text-[#5a5852] mb-4 leading-relaxed">
                شماره موبایل، رمز عبور ورود دانش‌آموز و روزهای دلخواه هفته را مشخص کنید.
              </p>

              {studentFormMsg && (
                <div
                  className={`mb-4 p-3.5 rounded-[8px] border text-[13px] font-medium ${
                    studentFormMsg.type === 'success'
                      ? 'border-[#1f8a65]/30 bg-[#1f8a65]/5 text-[#1f8a65]'
                      : 'border-[#cf2d56]/30 bg-[#cf2d56]/5 text-[#cf2d56]'
                  }`}
                >
                  {studentFormMsg.text}
                </div>
              )}

              <form onSubmit={handleCreateStudent} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      نام و نام خانوادگی دانش‌آموز
                    </label>
                    <input
                      type="text"
                      value={stuName}
                      onChange={(e) => setStuName(e.target.value)}
                      placeholder="نام کامل دانش‌آموز"
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      شماره موبایل دانش‌آموز
                    </label>
                    <input
                      type="tel"
                      dir="ltr"
                      value={stuPhone}
                      onChange={(e) => setStuPhone(e.target.value)}
                      placeholder="09xxxxxxxxx"
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      رمز عبور پیش‌فرض ورود دانش‌آموز
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        dir="ltr"
                        value={stuPassword}
                        onChange={(e) => setStuPassword(e.target.value)}
                        placeholder="مثال: 123456"
                        className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                        required
                      />
                      <KeyRound className="w-3.5 h-3.5 text-[#807d72] absolute right-3 top-3.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      عنوان درس یا دوره خصوصی
                    </label>
                    <input
                      type="text"
                      value={stuSubject}
                      onChange={(e) => setStuSubject(e.target.value)}
                      placeholder="مثال: ریاضیات / آیلتس"
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      تاریخ شروع کلاس (شمسی)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={stuStartDate}
                      onChange={(e) => setStuStartDate(e.target.value)}
                      placeholder="1405/08/07"
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code text-left border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      ساعت پیش‌فرض کلاس
                    </label>
                    <input
                      type="time"
                      value={stuTime}
                      onChange={(e) => {
                        const newDefault = e.target.value;
                        setStuTime(newDefault);
                        setStuDayTimes((prev) => {
                          const next = { ...prev };
                          stuSelectedDays.forEach((d) => {
                            if (!next[String(d)]) next[String(d)] = newDefault;
                          });
                          return next;
                        });
                      }}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>
                </div>

                {/* Selectable Days of the Week + Distinct Time per Day */}
                <div className="p-3.5 rounded-[8px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-[13px] font-semibold text-[#26251e]">
                      روزهای هفته و ساعت اختصاصی هر روز
                    </label>
                    <span className="text-[11px] font-semibold text-[#f54e00]">
                      {formatWeekdaysLabel(stuSelectedDays, stuDayTimes, stuTime)}
                    </span>
                  </div>

                  <div className="grid grid-cols-4 sm:grid-cols-7 gap-1.5">
                    {JALALI_WEEKDAYS.map((dayName, idx) => {
                      const active = stuSelectedDays.includes(idx);
                      return (
                        <button
                          key={dayName}
                          type="button"
                          onClick={() => {
                            toggleWeekday(idx, stuSelectedDays, setStuSelectedDays);
                            setStuDayTimes((prev) => ({
                              ...prev,
                              [String(idx)]: prev[String(idx)] || stuTime || '17:00',
                            }));
                          }}
                          className={`min-h-[44px] py-2 px-1 text-[12px] font-semibold rounded-[8px] border transition-colors cursor-pointer text-center ${
                            active
                              ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                              : 'bg-[#ffffff] text-[#5a5852] border-[#cfcdc4] hover:text-[#26251e]'
                          }`}
                        >
                          {dayName}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#807d72]">انتخاب سریع:</span>
                    <button
                      type="button"
                      onClick={() => setStuSelectedDays([0, 2, 4])}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] bg-[#ffffff] border border-[#cfcdc4] rounded-[6px] text-[#5a5852] hover:text-[#26251e] cursor-pointer"
                    >
                      روزهای زوج
                    </button>
                    <button
                      type="button"
                      onClick={() => setStuSelectedDays([1, 3, 5])}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] bg-[#ffffff] border border-[#cfcdc4] rounded-[6px] text-[#5a5852] hover:text-[#26251e] cursor-pointer"
                    >
                      روزهای فرد
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStuSelectedDays([2, 6]);
                        setStuDayTimes((prev) => ({
                          ...prev,
                          '2': '16:00',
                          '6': '10:00',
                        }));
                      }}
                      className="min-h-[34px] px-2.5 py-1 text-[11px] bg-[#ffffff] border border-[#cfcdc4] rounded-[6px] text-[#5a5852] hover:text-[#26251e] cursor-pointer"
                    >
                      دوشنبه (۱۶:۰۰) و جمعه (۱۰:۰۰)
                    </button>
                  </div>

                  {/* Per-Weekday Time Inputs */}
                  <div className="pt-2.5 border-t border-[#e6e5e0] space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[12px] font-semibold text-[#26251e]">
                        ساعت کلاس به تفکیک هر روز انتخاب‌شده:
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next: Record<string, string> = {};
                          stuSelectedDays.forEach((d) => {
                            next[String(d)] = stuTime || '17:00';
                          });
                          setStuDayTimes(next);
                        }}
                        className="text-[11px] text-[#f54e00] font-medium hover:underline cursor-pointer"
                      >
                        یکسان‌سازی با ساعت پیش‌فرض
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {stuSelectedDays.map((dayIdx) => {
                        const dayKey = String(dayIdx);
                        const dayTimeVal = stuDayTimes[dayKey] || stuTime || '17:00';
                        return (
                          <div
                            key={dayKey}
                            className="flex items-center justify-between gap-2 px-3 py-2 rounded-[8px] bg-[#ffffff] border border-[#cfcdc4]"
                          >
                            <span className="text-[12px] font-semibold text-[#26251e]">
                              {JALALI_WEEKDAYS[dayIdx]}:
                            </span>
                            <input
                              type="time"
                              value={dayTimeVal}
                              onChange={(e) => {
                                const val = e.target.value;
                                setStuDayTimes((prev) => ({
                                  ...prev,
                                  [dayKey]: val,
                                }));
                                if (dayIdx === stuSelectedDays[0]) {
                                  setStuTime(val);
                                }
                              }}
                              className="min-h-[36px] px-2 text-[13px] font-mono-code border border-[#cfcdc4] rounded-[6px] bg-[#fafaf7]"
                            />
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Payment System Type Selector: Prepaid vs Postpaid */}
                <div className="p-3.5 rounded-[8px] bg-[#fafaf7] border border-[#e6e5e0] space-y-3">
                  <label className="block text-[13px] font-semibold text-[#26251e]">
                    نوع سیستم پرداخت شهریه (پیش‌پرداخت / پس‌پرداخت)
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setStuPaymentType('prepaid');
                        if (stuInitialSessions === 0) setStuInitialSessions(5);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-[8px] border text-center transition-colors cursor-pointer ${
                        stuPaymentType === 'prepaid'
                          ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e] font-semibold'
                          : 'bg-[#ffffff] text-[#5a5852] border-[#cfcdc4]'
                      }`}
                    >
                      <span className="text-[13px] block">پیش‌پرداخت</span>
                      <span className="text-[10px] opacity-80 block">
                        دریافت شهریه قبل از کلاس
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStuPaymentType('postpaid');
                        setStuInitialSessions(0);
                      }}
                      className={`min-h-[44px] px-3 py-2 rounded-[8px] border text-center transition-colors cursor-pointer ${
                        stuPaymentType === 'postpaid'
                          ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e] font-semibold'
                          : 'bg-[#ffffff] text-[#5a5852] border-[#cfcdc4]'
                      }`}
                    >
                      <span className="text-[13px] block">پس‌پرداخت</span>
                      <span className="text-[10px] opacity-80 block">
                        تسویه پس از برگزاری جلسات
                      </span>
                    </button>
                  </div>

                  {stuPaymentType === 'postpaid' && (
                    <div className="pt-2 border-t border-[#e6e5e0] space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[12px] font-semibold text-[#26251e]">
                          سیکل تسویه دوره پس‌پرداخت:
                        </span>
                        <span className="text-[11px] font-mono-code text-[#f54e00] font-semibold">
                          هر {toPersianDigits(stuPostpaidCycle)} جلسه
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-1.5">
                        {[1, 4, 5, 8].map((cycle) => (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setStuPostpaidCycle(cycle)}
                            className={`min-h-[36px] text-[12px] font-mono-code font-semibold rounded-[6px] border cursor-pointer ${
                              stuPostpaidCycle === cycle
                                ? 'bg-[#f54e00] text-white border-[#f54e00]'
                                : 'bg-[#ffffff] text-[#26251e] border-[#cfcdc4]'
                            }`}
                          >
                            {toPersianDigits(cycle)} جلسه
                          </button>
                        ))}
                      </div>
                      <p className="text-[11px] text-[#5a5852] leading-relaxed">
                        در حالت پس‌پرداخت، تراز اولیه از ۰ شروع می‌شود و با هر جلسه حضور، تعداد جلسات برگزارشده برای تسویه پایان دوره محاسبه می‌گردد.
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      شهریه اختصاصی هر جلسه (تومان)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={25000}
                      value={stuTuition}
                      onChange={(e) => setStuTuition(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[13px] font-semibold text-[#26251e] mb-1">
                      {stuPaymentType === 'postpaid'
                        ? 'تراز اولیه (۰ برای شروع دوره پس‌پرداخت)'
                        : 'تراز اولیه جلسات پیش‌پرداخت'}
                    </label>
                    <input
                      type="number"
                      min={-100}
                      max={200}
                      value={stuInitialSessions}
                      onChange={(e) => setStuInitialSessions(Number(e.target.value))}
                      className="w-full min-h-[44px] px-3.5 text-[16px] sm:text-[14px] font-mono-code border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                      required
                    />
                  </div>
                </div>

                <div className="p-3.5 rounded-[8px] bg-[#fafaf7] border border-[#e6e5e0] text-[13px] text-[#5a5852] flex items-center justify-between">
                  <span>
                    {stuPaymentType === 'postpaid'
                      ? `مبلغ هر سیکل تسویه پس‌پرداخت (${toPersianDigits(stuPostpaidCycle)} جلسه):`
                      : stuInitialSessions < 0
                      ? `بدهی اولیه (${toPersianDigits(Math.abs(stuInitialSessions))} جلسه معوق):`
                      : `مجموع شهریه دوره اولیه (${toPersianDigits(stuInitialSessions)} جلسه):`}
                  </span>
                  <span
                    className={`font-semibold font-mono-code ${
                      stuInitialSessions < 0 ? 'text-[#cf2d56]' : 'text-[#26251e]'
                    }`}
                  >
                    {stuPaymentType === 'postpaid'
                      ? formatToman(stuTuition * stuPostpaidCycle)
                      : formatToman(stuTuition * stuInitialSessions)}
                  </span>
                </div>

                <button
                  type="submit"
                  disabled={addingStudent}
                  className="w-full min-h-[48px] px-[18px] py-[12px] bg-[#f54e00] hover:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[15px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                >
                  {addingStudent
                    ? 'در حال ثبت دانش‌آموز...'
                    : 'ثبت دانش‌آموز و ایجاد برنامه در تقویم شمسی'}
                </button>
              </form>
            </div>

            {/* Student Roster & Session Recharge / Postpaid Settlement Balance */}
            <div className="lg:col-span-7 space-y-5 sm:space-y-6">
              <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[#e6e5e0] space-y-3">
                  <div className="flex items-center justify-between">
                    <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                      فهرست دانش‌آموزان، ساعات کلاسی و وضعیت تسویه
                    </h2>
                    <span className="font-mono-code text-[13px] text-[#807d72]">
                      {toPersianDigits(filteredStudentsList.length)} دانش‌آموز
                    </span>
                  </div>

                  {/* Filter Bar for Prepaid / Postpaid / Needs Settlement */}
                  <div className="flex flex-wrap items-center gap-1.5 p-1 bg-[#e6e5e0]/70 rounded-[8px]">
                    {[
                      { id: 'all', label: `همه (${toPersianDigits(students.length)})` },
                      {
                        id: 'prepaid',
                        label: `پیش‌پرداخت (${toPersianDigits(
                          students.filter((s) => (s.paymentType || 'prepaid') === 'prepaid')
                            .length
                        )})`,
                      },
                      {
                        id: 'postpaid',
                        label: `پس‌پرداخت (${toPersianDigits(
                          students.filter((s) => s.paymentType === 'postpaid').length
                        )})`,
                      },
                      {
                        id: 'due',
                        label: `نیازمند تسویه / شارژ (${toPersianDigits(
                          students.filter(
                            (s) =>
                              s.sessionsLeft < 0 ||
                              ((s.paymentType || 'prepaid') === 'prepaid' &&
                                s.sessionsLeft === 0)
                          ).length
                        )})`,
                      },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setStudentPaymentFilter(
                            tab.id as 'all' | 'prepaid' | 'postpaid' | 'due'
                          )
                        }
                        className={`min-h-[36px] px-3 py-1 text-[12px] font-semibold rounded-[6px] transition-colors cursor-pointer ${
                          studentPaymentFilter === tab.id
                            ? 'bg-[#ffffff] text-[#26251e]'
                            : 'text-[#5a5852] hover:text-[#26251e]'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mobile Progressive Disclosure Student Cards (< md) */}
                <div className="md:hidden divide-y divide-[#efeee8]">
                  {filteredStudentsList.map((stu) => {
                    const isNegative = stu.sessionsLeft < 0;
                    const isPostpaid = stu.paymentType === 'postpaid';
                    const postpaidCycle = stu.postpaidCycleSessions || 4;
                    const isPostpaidCycleReached =
                      isPostpaid && Math.abs(stu.sessionsLeft) >= postpaidCycle && stu.sessionsLeft < 0;
                    const isExpanded = expandedStudentCardId === stu.id;
                    const totalPaidCount =
                      stu.totalSessionsPaid !== undefined
                        ? stu.totalSessionsPaid
                        : stu.totalAttended + stu.sessionsLeft;
                    const scheduleSummary = formatStudentScheduleSummary(
                      stu.selectedDays,
                      stu.classTime,
                      stu.dayTimes
                    );
                    return (
                      <div key={stu.id} className="p-4 space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-[16px] font-semibold text-[#26251e]">
                                {stu.name}
                              </span>
                              <span className="text-[11px] font-medium px-2 py-0.5 rounded-[6px] bg-[#fafaf7] border border-[#e6e5e0] text-[#5a5852]">
                                {isPostpaid
                                  ? `پس‌پرداخت (هر ${toPersianDigits(postpaidCycle)} جلسه)`
                                  : 'پیش‌پرداخت'}
                              </span>
                            </div>
                            <div className="text-[13px] text-[#807d72] mt-0.5">
                              {stu.subject} · {scheduleSummary}
                            </div>
                          </div>

                          <div className="text-left font-mono-code">
                            {isNegative ? (
                              <div>
                                <span className="text-[14px] font-semibold text-[#cf2d56] block">
                                  {isPostpaid
                                    ? `${toPersianDigits(Math.abs(stu.sessionsLeft))} جلسه در انتظار تسویه`
                                    : `${formatSignedPersianNumber(stu.sessionsLeft)} جلسه (بدهکار)`}
                                </span>
                                <span className="text-[11px] text-[#cf2d56] block">
                                  قابل تسویه:{' '}
                                  {formatToman(
                                    Math.abs(stu.sessionsLeft) * stu.tuitionPerSession
                                  )}
                                </span>
                                {isPostpaidCycleReached && (
                                  <span className="text-[11px] font-semibold text-[#f54e00] block">
                                    موعد تسویه دوره رسیده است
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div>
                                <span
                                  className={`text-[14px] font-semibold block ${
                                    stu.sessionsLeft === 0 && isPostpaid
                                      ? 'text-[#1f8a65]'
                                      : stu.sessionsLeft <= 1
                                      ? 'text-[#c08532]'
                                      : 'text-[#1f8a65]'
                                  }`}
                                >
                                  {stu.sessionsLeft === 0 && isPostpaid
                                    ? 'تسویه کامل (۰ معوق)'
                                    : `${toPersianDigits(stu.sessionsLeft)} جلسه باقی‌مانده`}
                                </span>
                              </div>
                            )}
                            <span className="text-[11px] text-[#807d72] block mt-0.5">
                              پرداخت‌شده: {toPersianDigits(totalPaidCount)} · برگزارشده: {toPersianDigits(stu.totalAttended)}
                            </span>
                          </div>
                        </div>

                        {/* Primary Touch Actions in Thumb Zone */}
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleQuickRecordPresentSession(stu)}
                            className="flex-1 min-h-[44px] px-2.5 bg-[#1f8a65] hover:bg-[#176e4f] text-[#ffffff] text-[12px] font-semibold rounded-[8px] flex items-center justify-center gap-1 cursor-pointer"
                            title="ثبت حضور یک جلسه جدید و کسر ۱ جلسه از تراز"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>ثبت حضور جلسه (-۱)</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setRechargingStudent(stu);
                              setRechargeCustomTuition(stu.tuitionPerSession);
                              setRechargeAddCount(
                                isPostpaid
                                  ? stu.sessionsLeft < 0
                                    ? Math.abs(stu.sessionsLeft)
                                    : postpaidCycle
                                  : stu.sessionsLeft < 0
                                  ? Math.abs(stu.sessionsLeft) + 4
                                  : 4
                              );
                            }}
                            className="min-h-[44px] px-3 bg-[#26251e] text-[#f7f7f4] text-[12px] font-semibold rounded-[8px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            <span>{isPostpaid ? 'تسویه پس‌پرداخت' : 'شارژ'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditStudentModal(stu)}
                            className="min-h-[44px] px-3 bg-[#fafaf7] border border-[#cfcdc4] text-[#26251e] text-[12px] font-semibold rounded-[8px] flex items-center justify-center gap-1 cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-[#f54e00]" />
                            <span>ویرایش</span>
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedStudentCardId(isExpanded ? null : stu.id)
                            }
                            className="min-h-[44px] px-2.5 border border-[#e6e5e0] text-[#5a5852] text-[12px] font-medium rounded-[8px] flex items-center gap-1 cursor-pointer"
                          >
                            <span>جزئیات</span>
                            {isExpanded ? (
                              <ChevronUp className="w-4 h-4" />
                            ) : (
                              <ChevronDown className="w-4 h-4" />
                            )}
                          </button>
                        </div>

                        {/* Progressive Disclosure Accordion Content */}
                        {isExpanded && (
                          <div className="p-3.5 rounded-[10px] bg-[#fafaf7] border border-[#efeee8] space-y-2 text-[13px] text-[#5a5852]">
                            <div className="flex justify-between font-mono-code">
                              <span>شماره موبایل:</span>
                              <span className="text-[#26251e] font-semibold">
                                {toPersianDigits(stu.phone)}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono-code">
                              <span>رمز عبور ورود دانش‌آموز:</span>
                              <span className="text-[#f54e00] font-semibold">
                                {stu.password || '123456'}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono-code">
                              <span>برنامه ساعات هفته:</span>
                              <span className="text-[#26251e]">
                                {scheduleSummary}
                              </span>
                            </div>
                            <div className="flex justify-between font-mono-code">
                              <span>شهریه هر جلسه:</span>
                              <span className="text-[#26251e] font-semibold">
                                {formatToman(stu.tuitionPerSession)}
                              </span>
                            </div>
                            <div className="pt-2 border-t border-[#e6e5e0] flex justify-end">
                              <button
                                type="button"
                                onClick={() => onDeleteStudent(stu.id)}
                                className="min-h-[40px] px-3 text-[12px] font-semibold text-[#cf2d56] flex items-center gap-1 cursor-pointer"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>حذف دانش‌آموز</span>
                              </button>
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
                        <th className="py-3 px-4">دانش‌آموز، موبایل و رمز عبور</th>
                        <th className="py-3 px-4">روزهای هفته و ساعت هر روز</th>
                        <th className="py-3 px-4">سیستم پرداخت و شهریه</th>
                        <th className="py-3 px-4">تراز جلسات و وضعیت تسویه</th>
                        <th className="py-3 px-4">عملیات مدیریت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#efeee8] text-[14px]">
                      {filteredStudentsList.map((stu) => {
                        const isNegative = stu.sessionsLeft < 0;
                        const isPostpaid = stu.paymentType === 'postpaid';
                        const postpaidCycle = stu.postpaidCycleSessions || 4;
                        const isPostpaidCycleReached =
                          isPostpaid &&
                          stu.sessionsLeft < 0 &&
                          Math.abs(stu.sessionsLeft) >= postpaidCycle;
                        const totalPaidCount =
                          stu.totalSessionsPaid !== undefined
                            ? stu.totalSessionsPaid
                            : stu.totalAttended + stu.sessionsLeft;
                        const scheduleSummary = formatStudentScheduleSummary(
                          stu.selectedDays,
                          stu.classTime,
                          stu.dayTimes
                        );
                        return (
                          <tr
                            key={stu.id}
                            className="hover:bg-[#fafaf7] transition-colors"
                          >
                            <td className="py-3.5 px-4">
                              <div className="font-semibold text-[#26251e]">
                                {stu.name}
                              </div>
                              <div className="text-[13px] text-[#807d72] mt-0.5">
                                {stu.subject} ·{' '}
                                <span className="font-mono-code">
                                  {toPersianDigits(stu.phone)}
                                </span>
                              </div>
                              <div className="text-[12px] text-[#5a5852] mt-1 flex items-center gap-1 font-mono-code">
                                <KeyRound className="w-3 h-3 text-[#f54e00]" />
                                <span>رمز ورود: {stu.password || '123456'}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 text-[13px] text-[#5a5852]">
                              <div className="font-medium text-[#26251e]">
                                {scheduleSummary}
                              </div>
                              <div className="text-[#807d72] font-mono-code mt-0.5">
                                شروع دوره: {toPersianDigits(stu.startDate)}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-mono-code font-semibold text-[#26251e]">
                                {formatToman(stu.tuitionPerSession)}
                              </div>
                              <div className="text-[12px] text-[#5a5852] mt-0.5">
                                {isPostpaid
                                  ? `پس‌پرداخت (سیکل ${toPersianDigits(postpaidCycle)} جلسه)`
                                  : 'پیش‌پرداخت (شارژ قبل از کلاس)'}
                              </div>
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap font-mono-code">
                              {isNegative ? (
                                <div>
                                  <div className="text-[14px] font-semibold text-[#cf2d56] flex items-center gap-1">
                                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                    <span>
                                      {isPostpaid
                                        ? `${toPersianDigits(
                                            Math.abs(stu.sessionsLeft)
                                          )} جلسه در انتظار تسویه پس‌پرداخت`
                                        : `${formatSignedPersianNumber(
                                            stu.sessionsLeft
                                          )} جلسه (بدهکار)`}
                                    </span>
                                  </div>
                                  <div className="text-[12px] text-[#cf2d56]">
                                    مبلغ قابل تسویه:{' '}
                                    {formatToman(
                                      Math.abs(stu.sessionsLeft) *
                                        stu.tuitionPerSession
                                    )}
                                  </div>
                                  {isPostpaidCycleReached && (
                                    <div className="text-[11px] font-semibold text-[#f54e00] mt-0.5">
                                      موعد تسویه سیکل ({toPersianDigits(postpaidCycle)} جلسه) فرا رسیده است
                                    </div>
                                  )}
                                  <div className="text-[11px] text-[#807d72] mt-0.5">
                                    تسویه‌شده: {toPersianDigits(totalPaidCount)} جلسه · برگزارشده: {toPersianDigits(stu.totalAttended)} جلسه
                                  </div>
                                </div>
                              ) : (
                                <div>
                                  <div
                                    className={`text-[14px] font-semibold ${
                                      stu.sessionsLeft === 0 && isPostpaid
                                        ? 'text-[#1f8a65]'
                                        : stu.sessionsLeft <= 1
                                        ? 'text-[#c08532]'
                                        : 'text-[#1f8a65]'
                                    }`}
                                  >
                                    {stu.sessionsLeft === 0 && isPostpaid
                                      ? 'تسویه کامل (۰ جلسه معوق)'
                                      : `${toPersianDigits(stu.sessionsLeft)} جلسه باقی‌مانده`}
                                  </div>
                                  <div className="text-[12px] text-[#807d72]">
                                    پرداخت‌شده: {toPersianDigits(totalPaidCount)} جلسه · برگزارشده: {toPersianDigits(stu.totalAttended)} جلسه
                                  </div>
                                </div>
                              )}
                            </td>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleQuickRecordPresentSession(stu)}
                                  className="px-2.5 py-1.5 bg-[#1f8a65] hover:bg-[#176e4f] text-[#ffffff] text-[12px] font-medium rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
                                  title="ثبت حضور یک جلسه جدید و کسر ۱ جلسه از اعتبار"
                                >
                                  <CheckCircle2 className="w-3 h-3" />
                                  <span>+ ثبت حضور (-۱)</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStudentModal(stu)}
                                  className="px-2.5 py-1.5 bg-[#fafaf7] border border-[#cfcdc4] hover:bg-[#e6e5e0]/70 text-[#26251e] text-[12px] font-medium rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3 text-[#f54e00]" />
                                  <span>ویرایش</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRechargingStudent(stu);
                                    setRechargeCustomTuition(stu.tuitionPerSession);
                                    setRechargeAddCount(
                                      isPostpaid
                                        ? stu.sessionsLeft < 0
                                          ? Math.abs(stu.sessionsLeft)
                                          : postpaidCycle
                                        : stu.sessionsLeft < 0
                                        ? Math.abs(stu.sessionsLeft) + 4
                                        : 4
                                    );
                                  }}
                                  className="px-2.5 py-1.5 bg-[#26251e] hover:bg-[#5a5852] text-[#f7f7f4] text-[12px] font-medium rounded-[6px] transition-colors flex items-center gap-1 cursor-pointer"
                                >
                                  <RefreshCw className="w-3 h-3" />
                                  <span>
                                    {isPostpaid ? 'تسویه پس‌پرداخت' : 'شارژ'}
                                  </span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => onDeleteStudent(stu.id)}
                                  className="p-1.5 text-[#807d72] hover:text-[#cf2d56] rounded-[6px] transition-colors cursor-pointer"
                                  title="حذف دانش‌آموز"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* All Recharge Requests History & Pending Approvals */}
              <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
                <div className="px-4 sm:px-6 py-4 border-b border-[#e6e5e0] flex items-center justify-between">
                  <h2 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                    درخواست‌های شارژ و سوابق پرداخت شهریه
                  </h2>
                </div>

                <div className="divide-y divide-[#efeee8]">
                  {rechargeRequests.map((req) => {
                    const stu = students.find((s) => s.id === req.studentId);
                    const curLeft = stu?.sessionsLeft ?? 0;
                    return (
                      <div
                        key={req.id}
                        className="p-4 flex flex-wrap items-center justify-between gap-3"
                      >
                        <div>
                          <div className="text-[14px] font-semibold text-[#26251e] font-mono-code">
                            {req.studentName} · شارژ{' '}
                            {toPersianDigits(req.requestedSessions)} جلسه (
                            {formatToman(req.totalAmount)})
                          </div>
                          {req.status === 'pending' && curLeft < 0 && (
                            <div className="text-[12px] text-[#cf2d56] font-mono-code mt-0.5">
                              دارای {toPersianDigits(Math.abs(curLeft))} جلسه اعتبار منفی — پس از تایید، تراز خالص {formatSignedPersianNumber(curLeft + req.requestedSessions)} جلسه خواهد شد.
                            </div>
                          )}
                          <div className="text-[13px] text-[#807d72] mt-0.5">
                            {req.paymentNote}
                          </div>
                        </div>

                        {req.status === 'pending' ? (
                          <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                              type="button"
                              onClick={() =>
                                onResolveRechargeRequest(req.id, 'approved')
                              }
                              className="flex-1 sm:flex-initial min-h-[44px] px-4 py-2 bg-[#f54e00] hover:bg-[#d04200] text-white text-[13px] font-semibold rounded-[8px] transition-colors cursor-pointer"
                            >
                              تایید و شارژ
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onResolveRechargeRequest(req.id, 'rejected')
                              }
                              className="min-h-[44px] px-3.5 py-2 border border-[#cf2d56]/40 text-[#cf2d56] hover:bg-[#cf2d56]/5 text-[13px] font-medium rounded-[8px] transition-colors cursor-pointer"
                            >
                              رد درخواست
                            </button>
                          </div>
                        ) : (
                          <div className="text-[13px] font-semibold">
                            {req.status === 'approved' ? (
                              <span className="text-[#1f8a65] flex items-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>تایید شده</span>
                              </span>
                            ) : (
                              <span className="text-[#cf2d56] flex items-center gap-1">
                                <XCircle className="w-3.5 h-3.5" />
                                <span>رد شده</span>
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 3: Student Attendance & Grade Tracking Ledger
         ===================================================================== */}
      {activeTab === 'attendance' && (
        <div className="space-y-4 sm:space-y-5">
          {/* Touch-Friendly Filter Bar */}
          <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-3.5 sm:p-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="جستجوی نام دانش‌آموز یا مبحث..."
                  className="w-full min-h-[44px] pr-9 pl-3.5 text-[16px] sm:text-[13px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                />
                <Search className="w-4 h-4 text-[#807d72] absolute right-3 top-3.5" />
              </div>

              <select
                value={filterStudentId}
                onChange={(e) => setFilterStudentId(e.target.value)}
                className="min-h-[44px] px-3 text-[15px] sm:text-[13px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff] text-[#26251e]"
              >
                <option value="all">همه دانش‌آموزان</option>
                {students.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.subject})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#e6e5e0]/70 rounded-[8px] w-full sm:w-auto">
                {[
                  { id: 'all', label: 'همه' },
                  { id: 'scheduled', label: 'در برنامه' },
                  { id: 'present', label: 'حاضر' },
                  { id: 'absent_charged', label: 'غیبت با کسر جلسه' },
                  { id: 'absent', label: 'غیبت بدون کسر' },
                ].map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFilterAttendance(tab.id)}
                    className={`min-h-[38px] px-2.5 py-1 text-[12px] font-semibold rounded-[6px] transition-colors cursor-pointer ${
                      filterAttendance === tab.id
                        ? 'bg-[#ffffff] text-[#26251e]'
                        : 'text-[#5a5852] hover:text-[#26251e]'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              <span className="font-mono-code text-[12px] text-[#807d72]">
                نمایش {toPersianDigits(filteredSessions.length)} جلسه
              </span>
            </div>
          </div>

          {/* Mobile Touch Cards for Attendance & Grades (< md) */}
          <div className="md:hidden space-y-3">
            {filteredSessions.map((sess) => {
              const isEditing = editingSessionId === sess.id;
              return (
                <div
                  key={sess.id}
                  className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[16px] font-semibold text-[#26251e]">
                        {sess.studentName}
                      </div>
                      <div className="text-[13px] text-[#807d72]">
                        {sess.subject}
                      </div>
                    </div>

                    <div className="text-left">
                      <div className="text-[13px] font-semibold text-[#26251e]">
                        {formatReadableJalali(sess.jalaliDate)}
                      </div>
                      <div className="text-[12px] font-mono-code text-[#807d72]">
                        ساعت {toPersianDigits(sess.time)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[13px] pt-1 border-t border-[#efeee8]">
                    <div className="font-semibold">
                      {sess.attendanceStatus === 'present' && (
                        <span className="text-[#1f8a65] flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4" />
                          <span>حاضر (کسر جلسه)</span>
                        </span>
                      )}
                      {sess.attendanceStatus === 'absent_charged' && (
                        <span className="text-[#cf2d56] flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>غیبت با کسر جلسه</span>
                        </span>
                      )}
                      {sess.attendanceStatus === 'absent' && (
                        <span className="text-[#c08532] flex items-center gap-1">
                          <XCircle className="w-4 h-4" />
                          <span>غیبت بدون کسر</span>
                        </span>
                      )}
                      {sess.attendanceStatus === 'excused' && (
                        <span className="text-[#c08532] flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>غیبت موجه</span>
                        </span>
                      )}
                      {sess.attendanceStatus === 'scheduled' && (
                        <span className="text-[#5a5852] flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          <span>در برنامه</span>
                        </span>
                      )}
                    </div>

                    <div className="font-mono-code font-semibold">
                      {sess.grade >= 0 ? (
                        <span className="text-[#1f8a65]">
                          نمره: {toPersianDigits(sess.grade)} از ۲۰
                        </span>
                      ) : (
                        <span className="text-[#a09c92] font-normal">بدون نمره</span>
                      )}
                    </div>
                  </div>

                  {!isEditing ? (
                    <div className="space-y-2">
                      <div className="text-[13px] text-[#5a5852]">
                        مبحث: {sess.topic || '—'}
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditSession(sess)}
                          className="min-h-[44px] px-3 text-[13px] font-semibold text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] rounded-[8px] cursor-pointer"
                        >
                          ثبت حضور / نمره
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onUpdateSession(sess.id, {
                              attendanceStatus: 'absent_charged',
                              grade: -1,
                              topic: sess.topic,
                              teacherNote: sess.teacherNote,
                            })
                          }
                          className="min-h-[44px] px-3 text-[13px] font-semibold text-[#cf2d56] bg-[#fafaf7] border border-[#cfcdc4] rounded-[8px] cursor-pointer"
                        >
                          ثبت غیبت با کسر جلسه
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3.5 rounded-[10px] bg-[#fafaf7] border border-[#cfcdc4] space-y-3">
                      <div>
                        <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                          وضعیت حضور و غیاب
                        </label>
                        <select
                          value={editStatus}
                          onChange={(e) =>
                            setEditStatus(e.target.value as AttendanceStatus)
                          }
                          className="w-full min-h-[44px] px-3 text-[15px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff]"
                        >
                          <option value="present">
                            حاضر (کسر ۱ جلسه — حتی در صورت منفی شدن تراز)
                          </option>
                          <option value="absent_charged">
                            ثبت غیبت با کسر جلسه (کسر ۱ جلسه از اعتبار)
                          </option>
                          <option value="absent">غیبت بدون کسر جلسه</option>
                          <option value="excused">غیبت موجه (بدون کسر)</option>
                          <option value="scheduled">در برنامه</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                          نمره جلسه (از ۲۰)
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={20}
                          step={0.25}
                          value={editGrade}
                          onChange={(e) => setEditGrade(e.target.value)}
                          placeholder="0 تا 20"
                          className="w-full min-h-[44px] px-3 text-[16px] font-mono-code border border-[#cfcdc4] rounded-[8px] bg-[#ffffff]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                          مبحث جلسه
                        </label>
                        <input
                          type="text"
                          value={editTopic}
                          onChange={(e) => setEditTopic(e.target.value)}
                          className="w-full min-h-[44px] px-3 text-[15px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff]"
                        />
                      </div>

                      <div>
                        <label className="block text-[12px] font-semibold text-[#26251e] mb-1">
                          یادداشت استاد
                        </label>
                        <input
                          type="text"
                          value={editNote}
                          onChange={(e) => setEditNote(e.target.value)}
                          className="w-full min-h-[44px] px-3 text-[15px] border border-[#cfcdc4] rounded-[8px] bg-[#ffffff]"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => handleSaveSessionEdit(sess.id)}
                          className="min-h-[44px] bg-[#f54e00] text-white text-[14px] font-semibold rounded-[8px] cursor-pointer"
                        >
                          ذخیره
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingSessionId(null)}
                          className="min-h-[44px] border border-[#cfcdc4] bg-[#ffffff] text-[#5a5852] text-[14px] font-medium rounded-[8px] cursor-pointer"
                        >
                          لغو
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Desktop High-Density Attendance & Grade Table (>= md) */}
          <div className="hidden md:block border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="border-b border-[#e6e5e0] bg-[#fafaf7] text-[13px] font-semibold text-[#5a5852]">
                    <th className="py-3 px-4">دانش‌آموز و درس</th>
                    <th className="py-3 px-4">تاریخ شمسی و ساعت</th>
                    <th className="py-3 px-4">مبحث جلسه و بازخورد استاد</th>
                    <th className="py-3 px-4">وضعیت حضور و غیاب</th>
                    <th className="py-3 px-4">نمره جلسه (از ۲۰)</th>
                    <th className="py-3 px-4">ثبت / ویرایش</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeee8] text-[14px]">
                  {filteredSessions.map((sess) => {
                    const isEditing = editingSessionId === sess.id;
                    return (
                      <tr
                        key={sess.id}
                        className="hover:bg-[#fafaf7] transition-colors align-top"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#26251e]">
                            {sess.studentName}
                          </div>
                          <div className="text-[13px] text-[#807d72]">
                            {sess.subject}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-[#26251e]">
                            {formatReadableJalali(sess.jalaliDate)}
                          </div>
                          <div className="font-mono-code text-[#807d72]">
                            {toPersianDigits(sess.jalaliDate)} · ساعت{' '}
                            {toPersianDigits(sess.time)}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isEditing ? (
                            <div className="space-y-2 min-w-[220px]">
                              <input
                                type="text"
                                value={editTopic}
                                onChange={(e) => setEditTopic(e.target.value)}
                                placeholder="مبحث تدریس‌شده..."
                                className="w-full px-2.5 py-1.5 text-[13px] border border-[#cfcdc4] rounded-[6px]"
                              />
                              <input
                                type="text"
                                value={editNote}
                                onChange={(e) => setEditNote(e.target.value)}
                                placeholder="یادداشت استاد یا تکلیف جلسه بعد..."
                                className="w-full px-2.5 py-1.5 text-[13px] border border-[#cfcdc4] rounded-[6px]"
                              />
                            </div>
                          ) : (
                            <div>
                              <div className="font-medium text-[#26251e]">
                                {sess.topic || '—'}
                              </div>
                              {sess.teacherNote && (
                                <div className="text-[13px] text-[#807d72] mt-0.5">
                                  یادداشت: {sess.teacherNote}
                                </div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isEditing ? (
                            <select
                              value={editStatus}
                              onChange={(e) =>
                                setEditStatus(e.target.value as AttendanceStatus)
                              }
                              className="px-2.5 py-1.5 text-[13px] border border-[#cfcdc4] rounded-[6px] bg-[#ffffff]"
                            >
                              <option value="present">
                                حاضر (کسر ۱ جلسه — حتی در صورت منفی شدن تراز)
                              </option>
                              <option value="absent_charged">
                                ثبت غیبت با کسر جلسه (کسر ۱ جلسه از اعتبار)
                              </option>
                              <option value="absent">
                                غیبت بدون کسر جلسه
                              </option>
                              <option value="excused">
                                غیبت موجه (بدون کسر جلسه)
                              </option>
                              <option value="scheduled">در برنامه</option>
                            </select>
                          ) : (
                            <div className="text-[13px] font-semibold">
                              {sess.attendanceStatus === 'present' && (
                                <span className="text-[#1f8a65] flex items-center gap-1">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>حاضر (کسر جلسه)</span>
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
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono-code">
                          {isEditing ? (
                            <input
                              type="number"
                              min={0}
                              max={20}
                              step={0.25}
                              value={editGrade}
                              onChange={(e) => setEditGrade(e.target.value)}
                              placeholder="0 تا 20"
                              className="w-20 px-2.5 py-1.5 font-mono-code border border-[#cfcdc4] rounded-[6px]"
                            />
                          ) : sess.grade >= 0 ? (
                            <span className="font-mono-code font-semibold text-[#1f8a65] flex items-center gap-1">
                              <Award className="w-3.5 h-3.5" />
                              <span>{toPersianDigits(sess.grade)} از ۲۰</span>
                            </span>
                          ) : (
                            <span className="text-[13px] text-[#a09c92]">ثبت نشده</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleSaveSessionEdit(sess.id)}
                                className="px-3 py-1.5 bg-[#f54e00] hover:bg-[#d04200] text-white text-[12px] font-medium rounded-[6px] cursor-pointer"
                              >
                                ذخیره
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingSessionId(null)}
                                className="px-2.5 py-1.5 border border-[#cfcdc4] text-[#5a5852] text-[12px] rounded-[6px] cursor-pointer"
                              >
                                لغو
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditSession(sess)}
                                className="px-3 py-1.5 text-[12px] font-medium text-[#26251e] bg-[#fafaf7] border border-[#cfcdc4] hover:bg-[#e6e5e0]/60 rounded-[6px] transition-colors cursor-pointer"
                              >
                                ثبت حضور / نمره
                              </button>
                              {sess.attendanceStatus !== 'absent_charged' && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    onUpdateSession(sess.id, {
                                      attendanceStatus: 'absent_charged',
                                      grade: -1,
                                      topic: sess.topic,
                                      teacherNote: sess.teacherNote,
                                    })
                                  }
                                  className="px-2.5 py-1.5 text-[12px] font-medium text-[#cf2d56] bg-[#fafaf7] border border-[#cfcdc4] hover:border-[#cf2d56] rounded-[6px] transition-colors cursor-pointer"
                                >
                                  ثبت غیبت با کسر جلسه
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 4: Monthly Profit & Financial Summary (`گزارش سود و درآمد ماهانه`)
         ===================================================================== */}
      {activeTab === 'finance' && (
        <div className="space-y-5 sm:space-y-6">
          {/* Header & Jalali Month Filter */}
          <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp className="w-5 h-5 text-[#1f8a65]" />
                <h2 className="text-[18px] sm:text-[20px] font-semibold text-[#26251e]">
                  گزارش سود و درآمد ماهانه ({teacherName})
                </h2>
              </div>
              <p className="text-[13px] text-[#5a5852]">
                محاسبه درآمد جلسات برگزارشده، جلسات پیش‌رو و مطالبات اعتبار منفی به تفکیک ماه شمسی
              </p>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={selectedFinanceMonth}
                onChange={(e) => setSelectedFinanceMonth(e.target.value)}
                className="w-full sm:w-auto min-h-[44px] px-3.5 text-[15px] sm:text-[14px] font-medium border border-[#cfcdc4] rounded-[8px] bg-[#ffffff] text-[#26251e]"
              >
                {availableMonths.map((mKey) => (
                  <option key={mKey} value={mKey}>
                    {formatJalaliMonthTitle(mKey)} ({toPersianDigits(mKey)})
                  </option>
                ))}
                <option value="all">تمامی ماه‌ها (گزارش کل دوره)</option>
              </select>
            </div>
          </div>

          {/* 4-Card Monthly Financial Breakdown (2x2 on mobile) */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
              <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
                سود قطعی جلسات برگزارشده
              </div>
              <div className="text-[18px] sm:text-[24px] font-semibold sm:font-normal text-[#1f8a65] font-mono-code">
                {formatToman(monthlyFinanceStats.earnedRevenue)}
              </div>
              <div className="text-[11px] sm:text-[12px] text-[#807d72] mt-1 font-mono-code">
                {toPersianDigits(monthlyFinanceStats.presentSessionsCount)} جلسه کسرشده
              </div>
            </div>

            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
              <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
                درآمد پیش‌بینی‌شده در برنامه
              </div>
              <div className="text-[18px] sm:text-[24px] font-semibold sm:font-normal text-[#26251e] font-mono-code">
                {formatToman(monthlyFinanceStats.projectedScheduledRevenue)}
              </div>
              <div className="text-[11px] sm:text-[12px] text-[#807d72] mt-1 font-mono-code">
                {toPersianDigits(monthlyFinanceStats.scheduledSessionsCount)} جلسه پیش‌رو
              </div>
            </div>

            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
              <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
                شارژهای تاییدشده
              </div>
              <div className="text-[18px] sm:text-[24px] font-semibold sm:font-normal text-[#26251e] font-mono-code">
                {formatToman(monthlyFinanceStats.approvedRechargesTotal)}
              </div>
              <div className="text-[11px] sm:text-[12px] text-[#807d72] mt-1 font-mono-code">
                کل واریزی‌های تاییدشده
              </div>
            </div>

            <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 sm:p-5">
              <div className="text-[12px] sm:text-[13px] text-[#807d72] mb-1">
                مطالبات معوق (اعتبار منفی)
              </div>
              <div className="text-[18px] sm:text-[24px] font-semibold sm:font-normal text-[#cf2d56] font-mono-code">
                {formatToman(monthlyFinanceStats.totalDelayedPaymentReceivables)}
              </div>
              <div className="text-[11px] sm:text-[12px] text-[#807d72] mt-1 font-mono-code">
                {toPersianDigits(monthlyFinanceStats.totalNegativeSessionsCount)} جلسه بدهکار
              </div>
            </div>
          </div>

          {/* Per-Student Monthly Profit & Credit Balance */}
          <div className="border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden">
            <div className="px-4 sm:px-6 py-4 border-b border-[#e6e5e0] flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[16px] sm:text-[18px] font-semibold text-[#26251e]">
                تفکیک سود و تراز به ازای هر دانش‌آموز
              </h3>
              <span className="font-mono-code text-[13px] text-[#1f8a65] font-semibold">
                جمع سود قطعی: {formatToman(monthlyFinanceStats.earnedRevenue)}
              </span>
            </div>

            {/* Mobile Progressive Disclosure Finance Cards (< md) */}
            <div className="md:hidden divide-y divide-[#efeee8]">
              {monthlyFinanceStats.studentBreakdown.map((row) => {
                const stu = row.student;
                const isNeg = stu.sessionsLeft < 0;
                const isExp = expandedFinanceStudentId === stu.id;
                return (
                  <div key={stu.id} className="p-4 space-y-2">
                    <div
                      onClick={() =>
                        setExpandedFinanceStudentId(isExp ? null : stu.id)
                      }
                      className="flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <div className="text-[15px] font-semibold text-[#26251e]">
                          {stu.name}
                        </div>
                        <div className="text-[12px] text-[#807d72]">
                          {stu.subject} · {toPersianDigits(row.presentCount)} جلسه در این ماه
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-left font-mono-code">
                          <div className="text-[14px] font-semibold text-[#1f8a65]">
                            {formatToman(row.earnedAmount)}
                          </div>
                          <div
                            className={`text-[11px] ${
                              isNeg ? 'text-[#cf2d56]' : 'text-[#807d72]'
                            }`}
                          >
                            تراز: {formatSignedPersianNumber(stu.sessionsLeft)} جلسه
                          </div>
                        </div>
                        {isExp ? (
                          <ChevronUp className="w-4 h-4 text-[#807d72]" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-[#807d72]" />
                        )}
                      </div>
                    </div>

                    {isExp && (
                      <div className="p-3 rounded-[8px] bg-[#fafaf7] border border-[#efeee8] space-y-1.5 text-[12px] text-[#5a5852] font-mono-code">
                        <div className="flex justify-between">
                          <span>روزهای کلاس:</span>
                          <span className="text-[#26251e]">{stu.intervalLabel}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>شهریه هر جلسه:</span>
                          <span className="text-[#26251e]">
                            {formatToman(stu.tuitionPerSession)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>جلسات پیش‌رو در این ماه:</span>
                          <span className="text-[#26251e]">
                            {toPersianDigits(row.scheduledCount)} جلسه (
                            {formatToman(row.projectedAmount)})
                          </span>
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
                    <th className="py-3 px-4">نام دانش‌آموز و سیستم پرداخت</th>
                    <th className="py-3 px-4">روزها و ساعات کلاس</th>
                    <th className="py-3 px-4">شهریه هر جلسه</th>
                    <th className="py-3 px-4">جلسات کسرشده در این ماه</th>
                    <th className="py-3 px-4">سود قطعی کسب‌شده در این ماه</th>
                    <th className="py-3 px-4">تراز فعلی جلسات (اعتبار / تسویه)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#efeee8] text-[14px]">
                  {monthlyFinanceStats.studentBreakdown.map((row) => {
                    const stu = row.student;
                    const isNeg = stu.sessionsLeft < 0;
                    const isPostpaid = stu.paymentType === 'postpaid';
                    return (
                      <tr
                        key={stu.id}
                        className="hover:bg-[#fafaf7] transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#26251e]">
                            {stu.name}
                          </div>
                          <div className="text-[12px] text-[#807d72]">
                            {stu.subject} ·{' '}
                            {isPostpaid
                              ? `پس‌پرداخت (هر ${toPersianDigits(
                                  stu.postpaidCycleSessions || 4
                                )} جلسه)`
                              : 'پیش‌پرداخت'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-[13px] text-[#5a5852]">
                          {formatStudentScheduleSummary(
                            stu.selectedDays,
                            stu.classTime,
                            stu.dayTimes
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono-code text-[#26251e]">
                          {formatToman(stu.tuitionPerSession)}
                        </td>
                        <td className="py-3.5 px-4 font-mono-code">
                          <span className="font-semibold text-[#26251e]">
                            {toPersianDigits(row.presentCount)} جلسه
                          </span>
                          {row.scheduledCount > 0 && (
                            <span className="text-[12px] text-[#807d72] mr-2">
                              ({toPersianDigits(row.scheduledCount)} در برنامه)
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 font-mono-code font-semibold text-[#1f8a65]">
                          {formatToman(row.earnedAmount)}
                        </td>
                        <td className="py-3.5 px-4 font-mono-code">
                          {isNeg ? (
                            <span className="text-[#cf2d56] font-semibold">
                              {isPostpaid
                                ? `${toPersianDigits(
                                    Math.abs(stu.sessionsLeft)
                                  )} جلسه پس‌پرداخت (${formatToman(row.owedAmount)})`
                                : `${formatSignedPersianNumber(
                                    stu.sessionsLeft
                                  )} جلسه (بدهکار: ${formatToman(row.owedAmount)})`}
                            </span>
                          ) : (
                            <span className="text-[#1f8a65] font-semibold">
                              {stu.sessionsLeft === 0 && isPostpaid
                                ? 'تسویه کامل (۰ معوق)'
                                : `${toPersianDigits(stu.sessionsLeft)} جلسه بستانکار`}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================================
          TAB 5: Integrated Teacher-Student Direct Chat & Notifications
         ===================================================================== */}
      {activeTab === 'chat' && (
        <div className="space-y-4">
          {/* Mobile Horizontal Student Selector & Collapsible Notifications Toggle */}
          <div className="lg:hidden space-y-2.5">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {students.map((stu) => {
                const isSelected = currentChatStudent?.id === stu.id;
                return (
                  <button
                    key={stu.id}
                    type="button"
                    onClick={() => setActiveChatStudentId(stu.id)}
                    className={`min-h-[44px] px-3.5 py-2 rounded-[10px] text-[13px] font-semibold whitespace-nowrap shrink-0 border transition-colors cursor-pointer ${
                      isSelected
                        ? 'bg-[#26251e] text-[#f7f7f4] border-[#26251e]'
                        : 'bg-[#ffffff] text-[#5a5852] border-[#cfcdc4]'
                    }`}
                  >
                    {stu.name}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowMobileNotificationsDrawer((prev) => !prev)}
              className="w-full min-h-[42px] px-3.5 py-2 border border-[#e6e5e0] bg-[#ffffff] rounded-[10px] text-[13px] font-medium text-[#26251e] flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-[#f54e00]" />
                <span>اعلان‌های سامانه ({toPersianDigits(unreadTeacherNotifs)} جدید)</span>
              </span>
              {showMobileNotificationsDrawer ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
            {/* Desktop Student Conversation Threads Sidebar */}
            <div className="hidden lg:flex lg:col-span-3 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] overflow-hidden flex-col h-[520px]">
              <div className="p-4 border-b border-[#e6e5e0]">
                <h2 className="text-[16px] font-semibold text-[#26251e]">
                  فهرست گفتگوی دانش‌آموزان
                </h2>
              </div>
              <div className="divide-y divide-[#efeee8] overflow-y-auto flex-1">
                {students.map((stu) => {
                  const isSelected = currentChatStudent?.id === stu.id;
                  const lastMsg = messages
                    .filter((m) => m.studentId === stu.id)
                    .slice(-1)[0];
                  return (
                    <button
                      key={stu.id}
                      type="button"
                      onClick={() => setActiveChatStudentId(stu.id)}
                      className={`w-full text-right p-3.5 transition-colors cursor-pointer ${
                        isSelected ? 'bg-[#fafaf7]' : 'hover:bg-[#fafaf7]/60'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-[14px] font-semibold ${
                            isSelected ? 'text-[#f54e00]' : 'text-[#26251e]'
                          }`}
                        >
                          {stu.name}
                        </span>
                        <span className="font-mono-code text-[11px] text-[#807d72]">
                          {toPersianDigits(stu.phone)}
                        </span>
                      </div>
                      <div className="text-[13px] text-[#807d72] truncate mt-0.5">
                        {lastMsg ? lastMsg.text : stu.subject}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Active Chat Conversation Box */}
            <div className="lg:col-span-6 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] flex flex-col h-[440px] sm:h-[520px]">
              {currentChatStudent ? (
                <>
                  <div className="px-4 sm:px-5 py-3.5 border-b border-[#e6e5e0] flex items-center justify-between">
                    <div>
                      <h3 className="text-[15px] sm:text-[16px] font-semibold text-[#26251e]">
                        گفتگوی مستقیم با {currentChatStudent.name}
                      </h3>
                      <div className="text-[12px] sm:text-[13px] text-[#807d72]">
                        {currentChatStudent.subject} · تراز فعلی:{' '}
                        <span className="font-mono-code">
                          {formatSignedPersianNumber(currentChatStudent.sessionsLeft)}
                        </span>{' '}
                        جلسه
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3 bg-[#fafaf7]">
                    {activeThreadMessages.length === 0 ? (
                      <p className="text-[13px] text-[#807d72] text-center py-12">
                        هنوز پیامی در این گفتگو ثبت نشده است.
                      </p>
                    ) : (
                      activeThreadMessages.map((msg) => {
                        const isTeacher = msg.senderRole === 'teacher';
                        return (
                          <div
                            key={msg.id}
                            className={`flex flex-col max-w-[85%] sm:max-w-[80%] ${
                              isTeacher
                                ? 'mr-0 ml-auto items-start'
                                : 'ml-0 mr-auto items-end'
                            }`}
                          >
                            <div className="text-[11px] text-[#807d72] mb-1 font-mono-code">
                              {msg.senderName} · {msg.jalaliTime}
                            </div>
                            <div
                              className={`px-3.5 sm:px-4 py-2.5 rounded-[12px] text-[14px] leading-relaxed ${
                                isTeacher
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
                    onSubmit={handleSendTeacherChat}
                    className="p-3 sm:p-4 border-t border-[#e6e5e0] bg-[#ffffff] flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={teacherChatInput}
                      onChange={(e) => setTeacherChatInput(e.target.value)}
                      placeholder={`پیام به ${currentChatStudent.name}...`}
                      className="flex-1 min-h-[44px] px-3.5 text-[16px] sm:text-[14px] border border-[#cfcdc4] rounded-[8px] focus:outline-none focus:border-[#26251e]"
                    />
                    <button
                      type="submit"
                      disabled={!teacherChatInput.trim()}
                      className="min-h-[44px] px-4 bg-[#f54e00] hover:bg-[#d04200] disabled:opacity-50 text-[#ffffff] text-[14px] font-semibold rounded-[8px] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Send className="w-4 h-4" />
                      <span>ارسال</span>
                    </button>
                  </form>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-[13px] text-[#807d72]">
                  یک دانش‌آموز را برای گفتگو انتخاب کنید.
                </div>
              )}
            </div>

            {/* Real-Time Teacher Notifications Feed (Collapsible on Mobile, Visible on Desktop) */}
            <div
              className={`${
                showMobileNotificationsDrawer ? 'flex' : 'hidden lg:flex'
              } lg:col-span-3 border border-[#e6e5e0] bg-[#ffffff] rounded-[12px] p-4 flex-col h-[420px] lg:h-[520px]`}
            >
              <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#e6e5e0]">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#f54e00]" />
                  <h2 className="text-[16px] font-semibold text-[#26251e]">
                    اعلان‌های استاد
                  </h2>
                </div>
                <span className="font-mono-code text-[13px] text-[#807d72]">
                  {toPersianDigits(unreadTeacherNotifs)} جدید
                </span>
              </div>

              <div className="divide-y divide-[#efeee8] overflow-y-auto flex-1">
                {notifications.length === 0 ? (
                  <p className="text-[13px] text-[#807d72] text-center py-8">
                    اعلانی ثبت نشده است.
                  </p>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`py-3 ${notif.isRead ? 'opacity-65' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-[13px] font-semibold text-[#26251e]">
                          {notif.title}
                        </div>
                        {!notif.isRead && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(notif.id)}
                            className="min-h-[34px] px-2 text-[11px] font-semibold text-[#f54e00] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
                          >
                            خوانده شد
                          </button>
                        )}
                      </div>
                      <p className="text-[12px] text-[#5a5852] mt-1 leading-relaxed">
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

      {/* =====================================================================
          Mobile Fixed Bottom Tab Bar for Teacher Dashboard (< md) — Thumb Zone
         ===================================================================== */}
      <nav
        aria-label="ناوبری موبایل استاد"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 h-[60px] bg-[#ffffff]/95 backdrop-blur-md border-t border-[#e6e5e0] grid grid-cols-5 items-center px-1"
      >
        <button
          type="button"
          onClick={() => onSelectTab('dashboard')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <Calendar className="w-5 h-5" />
          <span className="text-[10px] leading-none">تقویم</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('students')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'students'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <Users className="w-5 h-5" />
          <span className="text-[10px] leading-none">
            دانش‌آموزان{pendingRecharges.length > 0 ? ` (${toPersianDigits(pendingRecharges.length)})` : ''}
          </span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('attendance')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'attendance'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <ClipboardCheck className="w-5 h-5" />
          <span className="text-[10px] leading-none">حضور و نمره</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('finance')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'finance'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <TrendingUp className="w-5 h-5" />
          <span className="text-[10px] leading-none">سود ماهانه</span>
        </button>

        <button
          type="button"
          onClick={() => onSelectTab('chat')}
          className={`min-h-[48px] flex flex-col items-center justify-center gap-0.5 rounded-[8px] transition-colors cursor-pointer ${
            activeTab === 'chat'
              ? 'text-[#f54e00] font-semibold'
              : 'text-[#5a5852]'
          }`}
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-[10px] leading-none">
            گفتگو{unreadTeacherNotifs > 0 ? ` (${toPersianDigits(unreadTeacherNotifs)})` : ''}
          </span>
        </button>
      </nav>
    </div>
  );
};
