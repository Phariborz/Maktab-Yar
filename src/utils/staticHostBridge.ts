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
} from './jalali';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
  ServerStateSnapshot,
  IntervalType,
  PaymentSystemType,
  PostpaidCycleType,
} from '../types';

const STORAGE_KEY = 'maktabyar_static_state_v2';
const PASSWORD_HASH_SALT = 'maktabyar_salt_v1:';

interface StaticTeacherAccount {
  id: string;
  name: string;
  username: string;
  passwordSha256: string;
  phoneDisplay: string;
  phoneNormalized: string;
}

// Salted SHA-256 hashes only — zero plaintext passwords in client bundle
const STATIC_TEACHERS: StaticTeacherAccount[] = [
  {
    id: 'teacher_admin_fariborz_farzad',
    name: 'استاد فریبرز فرزاد',
    username: 'fariborz_farzad',
    passwordSha256:
      'ab74dac946b537ba056c0021ef259da5eac4d8dd141a2ab9b70e5d7289f2da65',
    phoneDisplay: '+98 9373796964',
    phoneNormalized: '09373796964',
  },
  {
    id: 'teacher_ramy',
    name: 'استاد رمی',
    username: 'Ramy',
    passwordSha256:
      'b9d8bc1aebe72faa735f3452d4a0fe6e81b96592d7961ad4737732337aab168c',
    phoneDisplay: '+98 9124567000',
    phoneNormalized: '09124567000',
  },
];

async function sha256Salted(plain: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(`${PASSWORD_HASH_SALT}${plain}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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

function buildStaticInitialSeed(): ServerStateSnapshot {
  const today = getCurrentJalaliDate();
  const nowIso = new Date().toISOString();
  const fariborzId = 'teacher_admin_fariborz_farzad';
  const ramyId = 'teacher_ramy';

  const students: Student[] = [
    {
      id: 'stu_kian_1',
      name: 'کیانوش رضایی',
      phone: '09123456789',
      password: '123456',
      subject: 'ریاضیات گسسته و حسابان پیشرفته',
      startDate: addJalaliDays(today.formatted, -14),
      classTime: '17:30',
      selectedDays: [0, 3],
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([0, 3]),
      tuitionPerSession: 650000,
      sessionsLeft: 3,
      totalSessionsPaid: 8,
      totalAttended: 5,
      teacherId: fariborzId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_parisa_2',
      name: 'پریسا محمدی',
      phone: '09129876543',
      password: '123456',
      subject: 'فیزیک پایه دوازدهم و کنکور',
      startDate: addJalaliDays(today.formatted, -10),
      classTime: '19:00',
      selectedDays: [1, 4],
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([1, 4]),
      tuitionPerSession: 580000,
      sessionsLeft: 1,
      totalSessionsPaid: 4,
      totalAttended: 3,
      teacherId: fariborzId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_ramy_arman_1',
      name: 'آرمان شمس',
      phone: '09125551020',
      password: '123456',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      startDate: addJalaliDays(today.formatted, -12),
      classTime: '17:00',
      selectedDays: [2, 4],
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([2, 4]),
      tuitionPerSession: 590000,
      sessionsLeft: 4,
      totalSessionsPaid: 8,
      totalAttended: 4,
      teacherId: ramyId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'stu_ramy_sara_2',
      name: 'سارا بهرامی',
      phone: '09354442030',
      password: '123456',
      subject: 'زبان انگلیسی تخصصی و گرامر',
      startDate: addJalaliDays(today.formatted, -10),
      classTime: '18:30',
      selectedDays: [0, 3],
      intervalType: 'custom_days',
      intervalLabel: formatWeekdaysLabel([0, 3]),
      tuitionPerSession: 520000,
      sessionsLeft: 2,
      totalSessionsPaid: 6,
      totalAttended: 4,
      teacherId: ramyId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const sessions: ClassSession[] = [
    {
      id: 'sess_static_1',
      studentId: 'stu_kian_1',
      studentName: 'کیانوش رضایی',
      studentPhone: '09123456789',
      subject: 'ریاضیات گسسته و حسابان پیشرفته',
      jalaliDate: today.formatted,
      time: '17:30',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'مشتق‌پذیری و کاربرد مشتق در بهینه‌سازی',
      teacherNote: 'تمرین‌های فصل سوم بررسی شود.',
      teacherId: fariborzId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'sess_static_ramy_1',
      studentId: 'stu_ramy_arman_1',
      studentName: 'آرمان شمس',
      studentPhone: '09125551020',
      subject: 'مکالمه پیشرفته و آیلتس (IELTS)',
      jalaliDate: today.formatted,
      time: '17:00',
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: 'تکنیک‌های بسط ایده در Speaking Part 3',
      teacherNote: '',
      teacherId: ramyId,
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  return {
    students,
    sessions,
    rechargeRequests: [],
    messages: [],
    notifications: [],
  };
}

function loadStaticState(): ServerStateSnapshot {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ServerStateSnapshot;
      if (parsed && Array.isArray(parsed.students)) {
        return parsed;
      }
    }
  } catch {
    // ignore
  }
  const seed = buildStaticInitialSeed();
  saveStaticState(seed);
  return seed;
}

function saveStaticState(state: ServerStateSnapshot): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
}

function filterTeacherSnapshot(
  state: ServerStateSnapshot,
  teacherId: string
): ServerStateSnapshot {
  const stuIds = new Set(
    state.students.filter((s) => s.teacherId === teacherId).map((s) => s.id)
  );
  return {
    students: state.students.filter((s) => s.teacherId === teacherId),
    sessions: state.sessions.filter(
      (s) => s.teacherId === teacherId || stuIds.has(s.studentId)
    ),
    rechargeRequests: state.rechargeRequests.filter(
      (r) => r.teacherId === teacherId || stuIds.has(r.studentId)
    ),
    messages: state.messages.filter(
      (m) => m.teacherId === teacherId || stuIds.has(m.studentId)
    ),
    notifications: state.notifications.filter(
      (n) => n.teacherId === teacherId || stuIds.has(n.targetStudentId)
    ),
  };
}

function filterStudentSnapshot(
  state: ServerStateSnapshot,
  studentId: string
): ServerStateSnapshot {
  return {
    students: state.students.filter((s) => s.id === studentId),
    sessions: state.sessions.filter((s) => s.studentId === studentId),
    rechargeRequests: state.rechargeRequests.filter(
      (r) => r.studentId === studentId
    ),
    messages: state.messages.filter((m) => m.studentId === studentId),
    notifications: state.notifications.filter(
      (n) => n.targetRole === 'student' && n.targetStudentId === studentId
    ),
  };
}

const staticTokenMap = new Map<
  string,
  { role: 'teacher' | 'student'; teacherId?: string; studentId?: string }
>();
const staticRevokedTokens = new Set<string>();
const staticOtpMap = new Map<string, { code: string; studentId: string }>();

function resolveStaticAuthSession(
  token: string,
  state: ServerStateSnapshot
): { role: 'teacher' | 'student'; teacherId?: string; studentId?: string } | undefined {
  if (!token || staticRevokedTokens.has(token)) return undefined;
  const cached = staticTokenMap.get(token);
  if (cached) return cached;

  if (token.startsWith('static_tchr__')) {
    const parts = token.split('__');
    const teacherId = parts[1];
    const matched = STATIC_TEACHERS.find((t) => t.id === teacherId);
    if (matched) {
      const sess = { role: 'teacher' as const, teacherId: matched.id };
      staticTokenMap.set(token, sess);
      return sess;
    }
  } else if (token.startsWith('static_stu__')) {
    const parts = token.split('__');
    const studentId = parts[1];
    const student = state.students.find((s) => s.id === studentId);
    if (student) {
      const sess = {
        role: 'student' as const,
        studentId: student.id,
        teacherId: student.teacherId,
      };
      staticTokenMap.set(token, sess);
      return sess;
    }
  }
  return undefined;
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

async function handleStaticApiRequest(
  path: string,
  method: string,
  bodyObj: Record<string, any>,
  authHeader: string
): Promise<Response> {
  const state = loadStaticState();
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : '';
  const authSess = resolveStaticAuthSession(token, state);

  // 1. Teacher Login
  if (path === '/api/auth/teacher-login' && method === 'POST') {
    const username = String(bodyObj.username || '').trim();
    const password = String(bodyObj.password || '');
    const candidateHash = await sha256Salted(password);

    const matched = STATIC_TEACHERS.find(
      (t) =>
        (t.username === username ||
          t.username.toLowerCase() === username.toLowerCase()) &&
        t.passwordSha256 === candidateHash
    );

    if (!matched) {
      return jsonResponse(
        { error: 'نام کاربری یا رمز عبور استاد نادرست است.' },
        401
      );
    }

    const newToken = `static_tchr__${matched.id}__${Date.now()}`;
    staticTokenMap.set(newToken, { role: 'teacher', teacherId: matched.id });
    return jsonResponse({
      ok: true,
      token: newToken,
      teacher: {
        id: matched.id,
        name: matched.name,
        username: matched.username,
        phone: matched.phoneDisplay,
      },
      state: filterTeacherSnapshot(state, matched.id),
    });
  }

  // 2. Student Password Login
  if (path === '/api/auth/student-login' && method === 'POST') {
    const phone = normalizePhone(String(bodyObj.phone || ''));
    const rawPass = String(bodyObj.password || '').trim();
    const normPass = toEnglishDigits(rawPass);

    const student = state.students.find((s) => normalizePhone(s.phone) === phone);
    if (!student) {
      return jsonResponse(
        {
          error:
            'دانش‌آموزی با این شماره موبایل در سامانه ثبت نشده است. استاد باید ابتدا شماره شما را ثبت کند.',
        },
        404
      );
    }
    const expected = String(student.password || '123456').trim();
    if (rawPass !== expected && normPass !== toEnglishDigits(expected)) {
      return jsonResponse({ error: 'رمز عبور وارد شده نادرست است.' }, 401);
    }

    const newToken = `static_stu__${student.id}__${Date.now()}`;
    staticTokenMap.set(newToken, {
      role: 'student',
      studentId: student.id,
      teacherId: student.teacherId,
    });
    return jsonResponse({
      ok: true,
      token: newToken,
      student,
      isolatedState: filterStudentSnapshot(state, student.id),
    });
  }

  // 3. Student OTP Request & Verify
  if (path === '/api/auth/request-otp' && method === 'POST') {
    const phone = normalizePhone(String(bodyObj.phone || ''));
    const student = state.students.find((s) => normalizePhone(s.phone) === phone);
    if (!student) {
      return jsonResponse(
        { error: 'دانش‌آموزی با این شماره موبایل یافت نشد.' },
        404
      );
    }
    const code = String(Math.floor(100000 + Math.random() * 900000));
    staticOtpMap.set(phone, { code, studentId: student.id });
    return jsonResponse({ ok: true, phone, expiresIn: 120, otpPreview: code });
  }

  if (path === '/api/auth/verify-otp' && method === 'POST') {
    const phone = normalizePhone(String(bodyObj.phone || ''));
    const code = toEnglishDigits(String(bodyObj.code || '')).trim();
    const entry = staticOtpMap.get(phone);
    if (!entry || entry.code !== code) {
      return jsonResponse({ error: 'کد تایید نامعتبر است.' }, 401);
    }
    staticOtpMap.delete(phone);
    const student = state.students.find((s) => s.id === entry.studentId);
    if (!student) {
      return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    }
    const newToken = `static_stu__${student.id}__${Date.now()}`;
    staticTokenMap.set(newToken, {
      role: 'student',
      studentId: student.id,
      teacherId: student.teacherId,
    });
    return jsonResponse({
      ok: true,
      token: newToken,
      student,
      isolatedState: filterStudentSnapshot(state, student.id),
    });
  }

  if (path === '/api/auth/session' && method === 'GET') {
    if (!authSess) {
      return jsonResponse({ error: 'نشست کاربری معتبر نیست.' }, 401);
    }
    if (authSess.role === 'teacher' && authSess.teacherId) {
      const matched =
        STATIC_TEACHERS.find((t) => t.id === authSess.teacherId) ||
        STATIC_TEACHERS[0];
      return jsonResponse({
        ok: true,
        role: 'teacher',
        teacher: {
          id: matched.id,
          name: matched.name,
          username: matched.username,
          phone: matched.phoneDisplay,
        },
        state: filterTeacherSnapshot(state, matched.id),
      });
    }
    if (authSess.role === 'student' && authSess.studentId) {
      const student = state.students.find((s) => s.id === authSess.studentId);
      if (!student) {
        return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
      }
      return jsonResponse({
        ok: true,
        role: 'student',
        student,
        isolatedState: filterStudentSnapshot(state, student.id),
      });
    }
    return jsonResponse({ error: 'نشست نامعتبر.' }, 401);
  }

  if (path === '/api/auth/logout' && method === 'POST') {
    staticTokenMap.delete(token);
    if (token) staticRevokedTokens.add(token);
    return jsonResponse({ ok: true });
  }

  const activeTeacherId =
    authSess?.teacherId || STATIC_TEACHERS[0].id;
  const activeTeacher =
    STATIC_TEACHERS.find((t) => t.id === activeTeacherId) || STATIC_TEACHERS[0];
  const today = getCurrentJalaliDate();
  const nowIso = new Date().toISOString();

  // 4. Add Student
  if (path === '/api/students' && method === 'POST') {
    const phone = normalizePhone(String(bodyObj.phone || ''));
    const cleanDays = sanitizeSelectedDays(bodyObj.selectedDays);
    const cleanTime = toEnglishDigits(String(bodyObj.classTime || '17:00'));
    const cleanDayTimes = sanitizeDayTimes(
      bodyObj.dayTimes,
      cleanDays,
      cleanTime
    );
    const primaryTime = cleanDayTimes[String(cleanDays[0])] || cleanTime;
    const cleanStart = toEnglishDigits(
      String(bodyObj.startDate || today.formatted)
    );
    const paymentType: PaymentSystemType =
      bodyObj.paymentType === 'postpaid' ? 'postpaid' : 'prepaid';
    const postpaidCycleType: PostpaidCycleType = sanitizePostpaidCycleType(
      bodyObj.postpaidCycleType
    );
    const postpaidCycleSessions = bodyObj.postpaidCycleType
      ? calculatePostpaidCycleSessions(
          postpaidCycleType,
          cleanDays,
          cleanStart
        )
      : Math.max(
          1,
          Math.min(
            50,
            Number(bodyObj.postpaidCycleSessions) ||
              calculatePostpaidCycleSessions(
                postpaidCycleType,
                cleanDays,
                cleanStart
              )
          )
        );
    const initialSessionsLeft =
      bodyObj.sessionsLeft !== undefined && !isNaN(Number(bodyObj.sessionsLeft))
        ? Number(bodyObj.sessionsLeft)
        : paymentType === 'postpaid'
        ? 0
        : 5;

    const newStudent: Student = {
      id: `stu_${Date.now()}`,
      name: String(bodyObj.name || '').trim(),
      phone,
      password: String(bodyObj.password || '123456').trim(),
      subject: String(bodyObj.subject || '').trim(),
      startDate: cleanStart,
      classTime: primaryTime,
      selectedDays: cleanDays,
      dayTimes: cleanDayTimes,
      paymentType,
      postpaidCycleType,
      postpaidCycleSessions,
      intervalType: (bodyObj.intervalType as IntervalType) || 'custom_days',
      intervalLabel: formatWeekdaysLabel(cleanDays, cleanDayTimes, primaryTime),
      tuitionPerSession: Number(bodyObj.tuitionPerSession) || 500000,
      sessionsLeft: initialSessionsLeft,
      totalSessionsPaid: Math.max(0, initialSessionsLeft),
      totalAttended: 0,
      teacherId: activeTeacher.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.students.unshift(newStudent);

    const targetGenCount =
      initialSessionsLeft > 0
        ? initialSessionsLeft
        : paymentType === 'postpaid'
        ? postpaidCycleSessions
        : 3;
    const dates = generateSessionDatesByWeekdays(
      newStudent.startDate,
      cleanDays,
      Math.min(Math.max(targetGenCount, 2), 8)
    );
    const createdSessions: ClassSession[] = dates.map((d, i) => ({
      id: `sess_${Date.now()}_${i}`,
      studentId: newStudent.id,
      studentName: newStudent.name,
      studentPhone: newStudent.phone,
      subject: newStudent.subject,
      jalaliDate: d,
      time: getTimeForJalaliDate(d, cleanDays, primaryTime, cleanDayTimes),
      attendanceStatus: 'scheduled',
      grade: -1,
      topic: `جلسه ${toPersianDigits(i + 1)} — ${newStudent.subject}`,
      teacherNote: '',
      teacherId: activeTeacher.id,
      createdAt: nowIso,
      updatedAt: nowIso,
    }));
    state.sessions.push(...createdSessions);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, activeTeacher.id),
      })
    );
    return jsonResponse({ student: newStudent, createdSessions });
  }

  // 5. Edit Student / Recharge / Delete Student
  const studentPatchMatch = path.match(/^\/api\/students\/([^/]+)$/);
  if (studentPatchMatch && method === 'PATCH') {
    const stu = state.students.find((s) => s.id === studentPatchMatch[1]);
    if (!stu) return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    if (bodyObj.name) stu.name = String(bodyObj.name).trim();
    if (bodyObj.phone) stu.phone = normalizePhone(String(bodyObj.phone));
    if (bodyObj.password) stu.password = String(bodyObj.password).trim();
    if (bodyObj.subject) stu.subject = String(bodyObj.subject).trim();
    if (bodyObj.startDate)
      stu.startDate = toEnglishDigits(String(bodyObj.startDate));
    if (bodyObj.classTime)
      stu.classTime = toEnglishDigits(String(bodyObj.classTime));
    if (bodyObj.selectedDays) {
      stu.selectedDays = sanitizeSelectedDays(bodyObj.selectedDays);
    }
    if (bodyObj.dayTimes || bodyObj.selectedDays || bodyObj.classTime) {
      stu.dayTimes = sanitizeDayTimes(
        bodyObj.dayTimes || stu.dayTimes,
        stu.selectedDays,
        stu.classTime
      );
      const firstKey = String(stu.selectedDays[0] ?? 0);
      if (stu.dayTimes[firstKey]) {
        stu.classTime = stu.dayTimes[firstKey];
      }
      stu.intervalLabel = formatWeekdaysLabel(
        stu.selectedDays,
        stu.dayTimes,
        stu.classTime
      );
    }
    if (bodyObj.paymentType === 'prepaid' || bodyObj.paymentType === 'postpaid') {
      stu.paymentType = bodyObj.paymentType;
    }
    if (bodyObj.postpaidCycleType !== undefined) {
      stu.postpaidCycleType = sanitizePostpaidCycleType(bodyObj.postpaidCycleType);
      stu.postpaidCycleSessions = calculatePostpaidCycleSessions(
        stu.postpaidCycleType,
        stu.selectedDays,
        stu.startDate
      );
    } else if (
      (bodyObj.selectedDays !== undefined || bodyObj.startDate !== undefined) &&
      stu.postpaidCycleType
    ) {
      stu.postpaidCycleSessions = calculatePostpaidCycleSessions(
        stu.postpaidCycleType,
        stu.selectedDays,
        stu.startDate
      );
    } else if (bodyObj.postpaidCycleSessions !== undefined) {
      stu.postpaidCycleSessions = Math.max(
        1,
        Math.min(50, Number(bodyObj.postpaidCycleSessions) || 4)
      );
    }
    if (bodyObj.tuitionPerSession !== undefined)
      stu.tuitionPerSession = Number(bodyObj.tuitionPerSession);
    if (bodyObj.totalSessionsPaid !== undefined)
      stu.totalSessionsPaid = Math.max(0, Number(bodyObj.totalSessionsPaid));
    if (bodyObj.totalAttended !== undefined)
      stu.totalAttended = Math.max(0, Number(bodyObj.totalAttended));
    if (bodyObj.sessionsLeft !== undefined) {
      stu.sessionsLeft = Number(bodyObj.sessionsLeft);
    } else if (
      bodyObj.totalSessionsPaid !== undefined ||
      bodyObj.totalAttended !== undefined
    ) {
      stu.sessionsLeft = stu.totalSessionsPaid - stu.totalAttended;
    }
    stu.updatedAt = nowIso;
    for (const sess of state.sessions) {
      if (sess.studentId === stu.id && sess.attendanceStatus === 'scheduled') {
        sess.time = getTimeForJalaliDate(
          sess.jalaliDate,
          stu.selectedDays,
          stu.classTime,
          stu.dayTimes
        );
      }
    }
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, stu.teacherId),
      })
    );
    return jsonResponse({ student: stu });
  }

  if (studentPatchMatch && method === 'DELETE') {
    const id = studentPatchMatch[1];
    state.students = state.students.filter((s) => s.id !== id);
    state.sessions = state.sessions.filter((s) => s.studentId !== id);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, activeTeacher.id),
      })
    );
    return jsonResponse({ ok: true });
  }

  const rechargeDirectMatch = path.match(
    /^\/api\/students\/([^/]+)\/recharge$/
  );
  if (rechargeDirectMatch && method === 'POST') {
    const stu = state.students.find((s) => s.id === rechargeDirectMatch[1]);
    if (!stu) return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    const added = Math.max(1, Number(bodyObj.addedSessions) || 1);
    const tuition =
      bodyObj.tuitionPerSession !== undefined
        ? Number(bodyObj.tuitionPerSession)
        : stu.tuitionPerSession;
    stu.tuitionPerSession = tuition;
    stu.sessionsLeft += added;
    stu.totalSessionsPaid += added;
    stu.updatedAt = nowIso;
    const rechargeRecord: RechargeRequest = {
      id: `req_direct_${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      studentPhone: stu.phone,
      requestedSessions: added,
      totalAmount: added * tuition,
      paymentNote: String(bodyObj.paymentNote || 'شارژ مستقیم توسط استاد'),
      status: 'approved',
      teacherId: stu.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.rechargeRequests.unshift(rechargeRecord);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, stu.teacherId),
      })
    );
    return jsonResponse({ student: stu, rechargeRecord });
  }

  // 6. Sessions Create & Update
  if (path === '/api/sessions' && method === 'POST') {
    const stu = state.students.find((s) => s.id === bodyObj.studentId);
    if (!stu) return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    const initialStatus =
      bodyObj.attendanceStatus === 'present' ||
      bodyObj.attendanceStatus === 'absent_charged' ||
      bodyObj.attendanceStatus === 'absent' ||
      bodyObj.attendanceStatus === 'excused'
        ? bodyObj.attendanceStatus
        : 'scheduled';
    const parsedGrade =
      bodyObj.grade !== undefined && !isNaN(Number(bodyObj.grade))
        ? Math.max(-1, Math.min(20, Number(bodyObj.grade)))
        : -1;

    const sess: ClassSession = {
      id: `sess_${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      studentPhone: stu.phone,
      subject: stu.subject,
      jalaliDate: toEnglishDigits(String(bodyObj.jalaliDate || today.formatted)),
      time: toEnglishDigits(String(bodyObj.time || stu.classTime)),
      attendanceStatus: initialStatus,
      grade: initialStatus === 'present' ? parsedGrade : -1,
      topic: String(bodyObj.topic || `جلسه آموزشی ${stu.subject}`),
      teacherNote: String(bodyObj.teacherNote || ''),
      teacherId: stu.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.sessions.push(sess);

    if (initialStatus === 'present' || initialStatus === 'absent_charged') {
      stu.sessionsLeft -= 1;
      if (initialStatus === 'present') {
        stu.totalAttended += 1;
      }
      stu.updatedAt = nowIso;
    }

    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, stu.teacherId),
      })
    );
    return jsonResponse({ session: sess, student: stu });
  }

  const sessMatch = path.match(/^\/api\/sessions\/([^/]+)$/);
  if (sessMatch && method === 'PATCH') {
    const sess = state.sessions.find((s) => s.id === sessMatch[1]);
    if (!sess) return jsonResponse({ error: 'جلسه یافت نشد.' }, 404);
    const prevStatus = sess.attendanceStatus;
    const nextStatus = bodyObj.attendanceStatus || sess.attendanceStatus;
    sess.attendanceStatus = nextStatus;
    if (bodyObj.grade !== undefined) sess.grade = Number(bodyObj.grade);
    if (bodyObj.topic !== undefined) sess.topic = String(bodyObj.topic);
    if (bodyObj.teacherNote !== undefined)
      sess.teacherNote = String(bodyObj.teacherNote);
    sess.updatedAt = nowIso;

    const stu = state.students.find((s) => s.id === sess.studentId);
    let autoCreatedSession: ClassSession | null = null;

    if (stu) {
      const wasConsumed =
        prevStatus === 'present' || prevStatus === 'absent_charged';
      const isNowConsumed =
        nextStatus === 'present' || nextStatus === 'absent_charged';
      if (!wasConsumed && isNowConsumed) stu.sessionsLeft -= 1;
      else if (wasConsumed && !isNowConsumed) stu.sessionsLeft += 1;
      if (prevStatus !== 'present' && nextStatus === 'present')
        stu.totalAttended += 1;
      else if (prevStatus === 'present' && nextStatus !== 'present')
        stu.totalAttended = Math.max(0, stu.totalAttended - 1);
      stu.updatedAt = nowIso;

      // Auto-schedule next session when 0 scheduled sessions remain
      const remainingScheduled = state.sessions.filter(
        (s) => s.studentId === stu.id && s.attendanceStatus === 'scheduled'
      );
      if (remainingScheduled.length === 0) {
        const stuSessions = state.sessions
          .filter((s) => s.studentId === stu.id)
          .sort((a, b) => b.jalaliDate.localeCompare(a.jalaliDate));
        const lastDate = stuSessions[0]?.jalaliDate || today.formatted;
        const nextDates = generateSessionDatesByWeekdays(
          addJalaliDays(lastDate, 1),
          sanitizeSelectedDays(stu.selectedDays),
          1
        );
        const nextDate = nextDates[0] || addJalaliDays(lastDate, 3);
        autoCreatedSession = {
          id: `sess_${Date.now()}_auto`,
          studentId: stu.id,
          studentName: stu.name,
          studentPhone: stu.phone,
          subject: stu.subject,
          jalaliDate: nextDate,
          time: getTimeForJalaliDate(
            nextDate,
            stu.selectedDays,
            stu.classTime,
            stu.dayTimes
          ),
          attendanceStatus: 'scheduled',
          grade: -1,
          topic: `جلسه ${toPersianDigits(stuSessions.length + 1)} — ${stu.subject}`,
          teacherNote: '',
          teacherId: stu.teacherId,
          createdAt: nowIso,
          updatedAt: nowIso,
        };
        state.sessions.push(autoCreatedSession);
      }
    }
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, sess.teacherId),
      })
    );
    return jsonResponse({ session: sess, student: stu, autoCreatedSession });
  }

  // 7. Recharge Requests
  if (path === '/api/recharge-requests' && method === 'POST') {
    const stu = state.students.find((s) => s.id === bodyObj.studentId);
    if (!stu) return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    const count = Math.max(1, Number(bodyObj.requestedSessions) || 4);
    const reqItem: RechargeRequest = {
      id: `req_${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      studentPhone: stu.phone,
      requestedSessions: count,
      totalAmount: count * stu.tuitionPerSession,
      paymentNote: String(bodyObj.paymentNote || 'درخواست شارژ از پنل دانش‌آموز'),
      status: 'pending',
      teacherId: stu.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.rechargeRequests.unshift(reqItem);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail:
          authSess?.role === 'student'
            ? filterStudentSnapshot(state, stu.id)
            : filterTeacherSnapshot(state, stu.teacherId),
      })
    );
    return jsonResponse({ rechargeRequest: reqItem });
  }

  const reqMatch = path.match(/^\/api\/recharge-requests\/([^/]+)$/);
  if (reqMatch && method === 'PATCH') {
    const reqItem = state.rechargeRequests.find((r) => r.id === reqMatch[1]);
    if (!reqItem) return jsonResponse({ error: 'درخواست یافت نشد.' }, 404);
    reqItem.status = bodyObj.status === 'approved' ? 'approved' : 'rejected';
    reqItem.updatedAt = nowIso;
    const stu = state.students.find((s) => s.id === reqItem.studentId);
    if (stu && reqItem.status === 'approved') {
      stu.sessionsLeft += reqItem.requestedSessions;
      stu.totalSessionsPaid += reqItem.requestedSessions;
      stu.updatedAt = nowIso;
    }
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, reqItem.teacherId),
      })
    );
    return jsonResponse({ rechargeRequest: reqItem, student: stu });
  }

  // 8. Messages & Reminders
  if (path === '/api/messages' && method === 'POST') {
    const stu = state.students.find((s) => s.id === bodyObj.studentId);
    if (!stu) return jsonResponse({ error: 'دانش‌آموز یافت نشد.' }, 404);
    const senderRole = authSess?.role === 'student' ? 'student' : 'teacher';
    const msg: ChatMessage = {
      id: `msg_${Date.now()}`,
      studentId: stu.id,
      studentName: stu.name,
      senderRole,
      senderName: senderRole === 'student' ? stu.name : activeTeacher.name,
      text: String(bodyObj.text || '').trim(),
      jalaliTime: `${today.weekdayName} — اکنون`,
      teacherId: stu.teacherId,
      createdAt: nowIso,
    };
    state.messages.push(msg);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail:
          senderRole === 'student'
            ? filterStudentSnapshot(state, stu.id)
            : filterTeacherSnapshot(state, stu.teacherId),
      })
    );
    return jsonResponse({ message: msg });
  }

  if (path === '/api/notifications/reminder' && method === 'POST') {
    const sess = state.sessions.find((s) => s.id === bodyObj.sessionId);
    if (!sess) return jsonResponse({ error: 'جلسه یافت نشد.' }, 404);
    const notif: AppNotification = {
      id: `notif_${Date.now()}`,
      targetRole: 'student',
      targetStudentId: sess.studentId,
      type: 'session_reminder',
      title: `یادآوری جلسه کلاس ${sess.subject}`,
      body: `یادآوری استاد: جلسه شما در تاریخ ${formatReadableJalali(sess.jalaliDate)} ساعت ${toPersianDigits(sess.time)} برگزار می‌شود.`,
      jalaliTime: `${today.weekdayName} — اکنون`,
      isRead: false,
      teacherId: sess.teacherId,
      createdAt: nowIso,
      updatedAt: nowIso,
    };
    state.notifications.unshift(notif);
    saveStaticState(state);
    window.dispatchEvent(
      new CustomEvent('maktabyar:static-sync', {
        detail: filterTeacherSnapshot(state, sess.teacherId),
      })
    );
    return jsonResponse({ notification: notif });
  }

  const notifReadMatch = path.match(/^\/api\/notifications\/([^/]+)\/read$/);
  if (notifReadMatch && method === 'PATCH') {
    const notif = state.notifications.find((n) => n.id === notifReadMatch[1]);
    if (notif) {
      notif.isRead = true;
      saveStaticState(state);
    }
    return jsonResponse({ notification: notif });
  }

  return jsonResponse({ ok: true });
}

/**
 * Installs a transparent fetch interceptor that ONLY activates when the app is deployed
 * on a static host (like GitHub Pages `*.github.io`) where Express `/api/*` is not running.
 */
export function installStaticHostBridge(): void {
  if (typeof window === 'undefined') return;
  const isGitHubPages = window.location.hostname.endsWith('.github.io');

  // When running on the full-stack server (AI Studio / Cloud Run / localhost),
  // use the real Express backend directly and never touch window.fetch.
  if (!isGitHubPages) return;

  const nativeFetch = window.fetch.bind(window);

  const customFetch = async (
    input: RequestInfo | URL,
    init?: RequestInit
  ): Promise<Response> => {
    const urlStr =
      typeof input === 'string'
        ? input
        : input instanceof URL
        ? input.pathname
        : input.url;

    const apiIndex = urlStr.indexOf('/api/');
    if (apiIndex === -1) {
      return nativeFetch(input, init);
    }

    const apiPath = urlStr.slice(apiIndex);
    const method = (init?.method || 'GET').toUpperCase();
    const headersObj = new Headers(init?.headers || {});
    const authHeader = headersObj.get('Authorization') || '';
    let bodyObj: Record<string, any> = {};
    if (typeof init?.body === 'string') {
      try {
        bodyObj = JSON.parse(init.body);
      } catch {
        // ignore
      }
    }

    return handleStaticApiRequest(apiPath, method, bodyObj, authHeader);
  };

  try {
    Object.defineProperty(window, 'fetch', {
      value: customFetch,
      configurable: true,
      writable: true,
    });
  } catch {
    // Fallback if window.fetch is non-configurable in a custom environment
  }
}
