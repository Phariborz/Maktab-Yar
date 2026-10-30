import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Bell, X, LogIn, LogOut, ShieldCheck, Smartphone } from 'lucide-react';
import {
  auth,
  googleProvider,
  syncStudentToFirestore,
  deleteStudentFromFirestore,
  syncSessionToFirestore,
  syncRechargeToFirestore,
  syncMessageToFirestore,
  syncNotificationToFirestore,
} from './firebase';
import { getCurrentJalaliDate } from './utils/jalali';
import { TeacherDashboard, type TeacherTab } from './components/TeacherDashboard';
import {
  TeacherLoginView,
  type TeacherProfile,
} from './components/TeacherLoginView';
import { StudentPortalView } from './components/StudentPortalView';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
  ServerStateSnapshot,
  WsEventMessage,
  IntervalType,
  AttendanceStatus,
} from './types';

export default function App() {
  const today = getCurrentJalaliDate();

  // Portal Mode: 'student' or 'teacher'
  const [portalMode, setPortalMode] = useState<'teacher' | 'student'>('student');
  const [teacherTab, setTeacherTab] = useState<TeacherTab>('dashboard');

  // Strict Role Authentication Tokens & Profiles
  const [teacherToken, setTeacherToken] = useState<string | null>(null);
  const [loggedInTeacher, setLoggedInTeacher] = useState<TeacherProfile | null>(
    null
  );

  const [studentToken, setStudentToken] = useState<string | null>(null);
  const [loggedInStudent, setLoggedInStudent] = useState<Student | null>(null);

  // Firebase Auth state for Teacher cloud backup
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);

  // Scoped state (Empty until authenticated as either a specific Teacher or a specific Student)
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [rechargeRequests, setRechargeRequests] = useState<RechargeRequest[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  // Live Real-Time Toast Notification Banner
  const [liveToast, setLiveToast] = useState<AppNotification | null>(null);

  // PWA Home Screen Installation State (Android & iPhone)
  const pwa = usePWAInstall();

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (usr) => {
      setFirebaseUser(usr);
      setAuthReady(true);
    });
    return () => unsub();
  }, []);

  const clearScopedData = useCallback(() => {
    setStudents([]);
    setSessions([]);
    setRechargeRequests([]);
    setMessages([]);
    setNotifications([]);
    setLiveToast(null);
  }, []);

  const applySnapshot = useCallback((snap: ServerStateSnapshot) => {
    setStudents(snap.students || []);
    setSessions(snap.sessions || []);
    setRechargeRequests(snap.rechargeRequests || []);
    setMessages(snap.messages || []);
    setNotifications(snap.notifications || []);
  }, []);

  // Active token based on current portal mode
  const activeToken =
    portalMode === 'teacher' ? teacherToken : studentToken;

  // Connect WebSocket ONLY when authenticated with a valid teacherToken or studentToken
  useEffect(() => {
    if (!activeToken) return;

    const handleStaticSync = (e: Event) => {
      const customEvent = e as CustomEvent<ServerStateSnapshot>;
      if (customEvent.detail) {
        applySnapshot(customEvent.detail);
      }
    };
    window.addEventListener('maktabyar:static-sync', handleStaticSync);

    if (window.location.hostname.endsWith('.github.io')) {
      return () => {
        window.removeEventListener('maktabyar:static-sync', handleStaticSync);
      };
    }

    let ws: WebSocket | null = null;
    let reconnectTimer: number | null = null;
    let isUnmounted = false;

    function connectWs() {
      if (isUnmounted || !activeToken) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      ws = new WebSocket(
        `${protocol}//${window.location.host}/ws?token=${encodeURIComponent(
          activeToken
        )}`
      );

      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WsEventMessage;
          switch (msg.type) {
            case 'init':
              applySnapshot(msg.payload);
              if (
                portalMode === 'student' &&
                msg.payload.students &&
                msg.payload.students.length === 1
              ) {
                setLoggedInStudent(msg.payload.students[0]);
              }
              break;
            case 'student:created':
              setStudents((prev) =>
                prev.some((s) => s.id === msg.payload.id)
                  ? prev
                  : [msg.payload, ...prev]
              );
              break;
            case 'student:updated':
              setStudents((prev) =>
                prev.map((s) => (s.id === msg.payload.id ? msg.payload : s))
              );
              setLoggedInStudent((prev) =>
                prev && prev.id === msg.payload.id ? msg.payload : prev
              );
              break;
            case 'student:deleted':
              setStudents((prev) => prev.filter((s) => s.id !== msg.payload.id));
              setSessions((prev) =>
                prev.filter((sess) => sess.studentId !== msg.payload.id)
              );
              break;
            case 'session:created':
              setSessions((prev) =>
                prev.some((s) => s.id === msg.payload.id)
                  ? prev
                  : [...prev, msg.payload]
              );
              break;
            case 'session:updated':
              setSessions((prev) =>
                prev.map((s) => (s.id === msg.payload.id ? msg.payload : s))
              );
              break;
            case 'session:deleted':
              setSessions((prev) => prev.filter((s) => s.id !== msg.payload.id));
              break;
            case 'recharge:created':
              setRechargeRequests((prev) =>
                prev.some((r) => r.id === msg.payload.id)
                  ? prev
                  : [msg.payload, ...prev]
              );
              break;
            case 'recharge:updated':
              setRechargeRequests((prev) =>
                prev.map((r) => (r.id === msg.payload.id ? msg.payload : r))
              );
              break;
            case 'message:created':
              setMessages((prev) =>
                prev.some((m) => m.id === msg.payload.id)
                  ? prev
                  : [...prev, msg.payload]
              );
              break;
            case 'notification:created':
              setNotifications((prev) => {
                if (prev.some((n) => n.id === msg.payload.id)) return prev;
                return [msg.payload, ...prev];
              });
              setLiveToast(msg.payload);
              break;
            case 'notification:updated':
              setNotifications((prev) =>
                prev.map((n) => (n.id === msg.payload.id ? msg.payload : n))
              );
              break;
          }
        } catch {
          // ignore parse error
        }
      };

      ws.onclose = () => {
        if (!isUnmounted) {
          reconnectTimer = window.setTimeout(connectWs, 2500);
        }
      };
    }

    connectWs();

    return () => {
      window.removeEventListener('maktabyar:static-sync', handleStaticSync);
      isUnmounted = true;
      if (reconnectTimer) window.clearTimeout(reconnectTimer);
      if (ws) {
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN) {
          ws.close();
        } else if (ws.readyState === WebSocket.CONNECTING) {
          const pendingWs = ws;
          pendingWs.addEventListener(
            'open',
            () => {
              pendingWs.close();
            },
            { once: true }
          );
        }
      }
    };
  }, [activeToken, portalMode, applySnapshot]);

  // Auto-dismiss live toast after 5 seconds
  useEffect(() => {
    if (!liveToast) return;
    const t = window.setTimeout(() => setLiveToast(null), 5000);
    return () => window.clearTimeout(t);
  }, [liveToast]);

  // =========================================================================
  // Auth Login / Logout Handlers
  // =========================================================================

  const handleTeacherLoginSuccess = (
    token: string,
    teacher: TeacherProfile,
    initialState: ServerStateSnapshot
  ) => {
    setStudentToken(null);
    setLoggedInStudent(null);
    setTeacherToken(token);
    setLoggedInTeacher(teacher);
    applySnapshot(initialState);
  };

  const handleTeacherLogout = async () => {
    if (teacherToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${teacherToken}` },
      }).catch(() => {});
    }
    setTeacherToken(null);
    setLoggedInTeacher(null);
    clearScopedData();
  };

  const handleStudentLoginSuccess = (
    token: string,
    student: Student,
    isolatedState: ServerStateSnapshot
  ) => {
    setTeacherToken(null);
    setLoggedInTeacher(null);
    setStudentToken(token);
    setLoggedInStudent(student);
    applySnapshot(isolatedState);
  };

  const handleStudentLogout = async () => {
    if (studentToken) {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      }).catch(() => {});
    }
    setStudentToken(null);
    setLoggedInStudent(null);
    clearScopedData();
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error('Google Sign-In error:', err);
    }
  };

  const handleGoogleSignOut = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('Sign-Out error:', err);
    }
  };

  // =========================================================================
  // Action Handlers (Protected with Bearer Token + Firestore Sync)
  // =========================================================================

  const handleAddStudent = async (payload: {
    name: string;
    phone: string;
    password: string;
    subject: string;
    startDate: string;
    classTime: string;
    selectedDays: number[];
    intervalType: IntervalType;
    intervalLabel: string;
    tuitionPerSession: number;
    sessionsLeft: number;
  }) => {
    if (!teacherToken) throw new Error('عدم دسترسی استاد.');
    const res = await fetch('/api/students', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        ...payload,
        teacherId: loggedInTeacher?.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ثبت دانش‌آموز');
    }

    if (data.student) {
      setStudents((prev) =>
        prev.some((s) => s.id === data.student.id)
          ? prev.map((s) => (s.id === data.student.id ? data.student : s))
          : [data.student, ...prev]
      );
    }
    if (Array.isArray(data.createdSessions) && data.createdSessions.length > 0) {
      setSessions((prev) => {
        const existingIds = new Set(prev.map((s) => s.id));
        const newOnes = data.createdSessions.filter(
          (s: ClassSession) => !existingIds.has(s.id)
        );
        return [...prev, ...newOnes];
      });
    }

    if (authReady && firebaseUser) {
      try {
        const firestoreStu = { ...data.student, teacherId: firebaseUser.uid };
        await syncStudentToFirestore(firestoreStu, true);
        if (Array.isArray(data.createdSessions)) {
          for (const sess of data.createdSessions) {
            await syncSessionToFirestore(
              { ...sess, teacherId: firebaseUser.uid },
              true
            );
          }
        }
        if (data.notification) {
          await syncNotificationToFirestore(
            { ...data.notification, teacherId: firebaseUser.uid },
            true
          );
        }
      } catch {
        // Ignore cloud backup error when document or network is unavailable
      }
    }
  };

  const handleEditStudent = async (
    studentId: string,
    payload: {
      name: string;
      phone: string;
      password: string;
      subject: string;
      startDate: string;
      classTime: string;
      selectedDays: number[];
      tuitionPerSession: number;
      sessionsLeft: number;
      totalSessionsPaid?: number;
      totalAttended?: number;
    }
  ) => {
    if (!teacherToken) throw new Error('عدم دسترسی استاد.');
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'خطا در ویرایش اطلاعات دانش‌آموز');
    }

    if (data.student) {
      setStudents((prev) =>
        prev.map((s) => (s.id === data.student.id ? data.student : s))
      );
    }

    if (authReady && firebaseUser && data.student) {
      try {
        await syncStudentToFirestore(
          { ...data.student, teacherId: firebaseUser.uid },
          false
        );
      } catch {
        // Ignore cloud backup error
      }
    }
  };

  const handleDirectRechargeStudent = async (
    studentId: string,
    addedSessions: number,
    tuitionPerSession: number,
    paymentNote: string
  ) => {
    if (!teacherToken) return;
    const res = await fetch(`/api/students/${studentId}/recharge`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({
        addedSessions,
        tuitionPerSession,
        paymentNote,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.student) {
        setStudents((prev) =>
          prev.map((s) => (s.id === data.student.id ? data.student : s))
        );
      }
      if (data.rechargeRecord) {
        setRechargeRequests((prev) =>
          prev.some((r) => r.id === data.rechargeRecord.id)
            ? prev
            : [data.rechargeRecord, ...prev]
        );
      }
      if (authReady && firebaseUser) {
        try {
          if (data.student) {
            await syncStudentToFirestore(
              { ...data.student, teacherId: firebaseUser.uid },
              false
            );
          }
          if (data.rechargeRecord) {
            await syncRechargeToFirestore(
              { ...data.rechargeRecord, teacherId: firebaseUser.uid },
              true
            );
          }
          if (data.notification) {
            await syncNotificationToFirestore(
              { ...data.notification, teacherId: firebaseUser.uid },
              true
            );
          }
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleDeleteStudent = async (studentId: string) => {
    if (!teacherToken) return;
    const res = await fetch(`/api/students/${studentId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${teacherToken}`,
      },
    });
    if (res.ok) {
      setStudents((prev) => prev.filter((s) => s.id !== studentId));
      setSessions((prev) => prev.filter((sess) => sess.studentId !== studentId));
      if (authReady && firebaseUser) {
        try {
          await deleteStudentFromFirestore(studentId);
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleAddSession = async (payload: {
    studentId: string;
    jalaliDate: string;
    time: string;
    topic: string;
    teacherNote: string;
    attendanceStatus?: AttendanceStatus;
    grade?: number;
  }) => {
    if (!teacherToken) return;
    const res = await fetch('/api/sessions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.session) {
        setSessions((prev) =>
          prev.some((s) => s.id === data.session.id)
            ? prev
            : [...prev, data.session]
        );
      }
      if (data.student) {
        setStudents((prev) =>
          prev.map((s) => (s.id === data.student.id ? data.student : s))
        );
      }
      if (authReady && firebaseUser) {
        try {
          if (data.student) {
            await syncStudentToFirestore(
              { ...data.student, teacherId: firebaseUser.uid },
              false
            );
          }
          if (data.session) {
            await syncSessionToFirestore(
              { ...data.session, teacherId: firebaseUser.uid },
              true
            );
          }
          if (data.notification) {
            await syncNotificationToFirestore(
              { ...data.notification, teacherId: firebaseUser.uid },
              true
            );
          }
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleUpdateSession = async (
    sessionId: string,
    payload: {
      attendanceStatus: AttendanceStatus;
      grade: number;
      topic: string;
      teacherNote: string;
    }
  ) => {
    if (!teacherToken) return;
    const res = await fetch(`/api/sessions/${sessionId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.session) {
        setSessions((prev) =>
          prev.map((s) => (s.id === data.session.id ? data.session : s))
        );
      }
      if (data.autoCreatedSession) {
        setSessions((prev) =>
          prev.some((s) => s.id === data.autoCreatedSession.id)
            ? prev
            : [...prev, data.autoCreatedSession]
        );
      }
      if (data.student) {
        setStudents((prev) =>
          prev.map((s) => (s.id === data.student.id ? data.student : s))
        );
      }
      if (authReady && firebaseUser) {
        try {
          if (data.student) {
            await syncStudentToFirestore(
              { ...data.student, teacherId: firebaseUser.uid },
              false
            );
          }
          if (data.session) {
            await syncSessionToFirestore(
              { ...data.session, teacherId: firebaseUser.uid },
              false
            );
          }
          if (data.notification) {
            await syncNotificationToFirestore(
              { ...data.notification, teacherId: firebaseUser.uid },
              true
            );
          }
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleSubmitRechargeRequest = async (
    studentId: string,
    requestedSessions: number,
    paymentNote: string
  ) => {
    const token = studentToken || teacherToken;
    if (!token) return;
    const res = await fetch('/api/recharge-requests', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        requestedSessions,
        paymentNote,
      }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.rechargeRequest) {
        setRechargeRequests((prev) =>
          prev.some((r) => r.id === data.rechargeRequest.id)
            ? prev
            : [data.rechargeRequest, ...prev]
        );
      }
      if (authReady && firebaseUser) {
        try {
          await syncRechargeToFirestore(
            { ...data.rechargeRequest, teacherId: firebaseUser.uid },
            true
          );
          if (data.notification) {
            await syncNotificationToFirestore(
              { ...data.notification, teacherId: firebaseUser.uid },
              true
            );
          }
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleResolveRechargeRequest = async (
    requestId: string,
    status: 'approved' | 'rejected'
  ) => {
    if (!teacherToken) return;
    const res = await fetch(`/api/recharge-requests/${requestId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({ status }),
    });
    const data = await res.json();
    if (res.ok) {
      if (data.rechargeRequest) {
        setRechargeRequests((prev) =>
          prev.map((r) =>
            r.id === data.rechargeRequest.id ? data.rechargeRequest : r
          )
        );
      }
      if (data.student) {
        setStudents((prev) =>
          prev.map((s) => (s.id === data.student.id ? data.student : s))
        );
      }
      if (authReady && firebaseUser) {
        try {
          await syncRechargeToFirestore(
            { ...data.rechargeRequest, teacherId: firebaseUser.uid },
            false
          );
          if (data.student) {
            await syncStudentToFirestore(
              { ...data.student, teacherId: firebaseUser.uid },
              false
            );
          }
          if (data.notification) {
            await syncNotificationToFirestore(
              { ...data.notification, teacherId: firebaseUser.uid },
              true
            );
          }
        } catch {
          // Ignore cloud backup error
        }
      }
    }
  };

  const handleSendMessage = async (
    studentId: string,
    senderRole: 'teacher' | 'student',
    senderName: string,
    text: string
  ) => {
    const token = senderRole === 'teacher' ? teacherToken : studentToken;
    if (!token) return;
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        studentId,
        senderRole,
        senderName,
        text,
      }),
    });
    const data = await res.json();
    if (res.ok && authReady && firebaseUser) {
      await syncMessageToFirestore({
        ...data.message,
        teacherId: firebaseUser.uid,
      });
      if (data.notification) {
        await syncNotificationToFirestore(
          { ...data.notification, teacherId: firebaseUser.uid },
          true
        );
      }
    }
  };

  const handleSendSessionReminder = async (sessionId: string) => {
    if (!teacherToken) return;
    const res = await fetch('/api/notifications/reminder', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${teacherToken}`,
      },
      body: JSON.stringify({ sessionId }),
    });
    const data = await res.json();
    if (res.ok && authReady && firebaseUser && data.notification) {
      await syncNotificationToFirestore(
        { ...data.notification, teacherId: firebaseUser.uid },
        true
      );
    }
  };

  const handleMarkNotificationRead = async (notificationId: string) => {
    const token = portalMode === 'teacher' ? teacherToken : studentToken;
    if (!token) return;
    const res = await fetch(`/api/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    const data = await res.json();
    if (res.ok && authReady && firebaseUser && data.notification) {
      await syncNotificationToFirestore(
        { ...data.notification, teacherId: firebaseUser.uid },
        false
      );
    }
  };

  const isTeacherAuthenticated = Boolean(
    portalMode === 'teacher' && loggedInTeacher && teacherToken
  );

  return (
    <div className="min-h-screen flex flex-col bg-[#f7f7f4] text-[#26251e]" dir="rtl">
      {/* Strict 3-Zone Top Bar Contract (`top-nav` from DESIGN.md: compact 52px on mobile, 64px on desktop) */}
      <header className="h-[52px] md:h-[64px] flex items-center justify-between gap-4 md:gap-8 px-4 sm:px-6 bg-[#f7f7f4]/95 backdrop-blur-md border-b border-[#e6e5e0] sticky top-0 z-30">
        {/* Zone 1: Brand Title (Single text element wordmark in Cursor Orange #f54e00) */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            if (loggedInTeacher) {
              setPortalMode('teacher');
              setTeacherTab('dashboard');
            } else {
              setPortalMode('student');
            }
          }}
          className="text-[18px] md:text-[20px] font-semibold tracking-tight text-[#f54e00] whitespace-nowrap shrink-0"
        >
          مکتب‌یار
        </a>

        {/* Zone 2: Role-Gated Navigation Links (Desktop Only — Mobile uses Fixed Bottom Tab Bar) */}
        <nav className="hidden md:flex items-center gap-6 text-[14px] font-medium text-[#5a5852]">
          {isTeacherAuthenticated ? (
            <>
              <a
                href="#calendar"
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherTab('dashboard');
                }}
                className={`hover:text-[#26251e] transition-colors whitespace-nowrap shrink-0 ${
                  teacherTab === 'dashboard'
                    ? 'text-[#26251e] underline underline-offset-8 decoration-[#f54e00]'
                    : ''
                }`}
              >
                تقویم و جلسات
              </a>
              <a
                href="#students"
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherTab('students');
                }}
                className={`hover:text-[#26251e] transition-colors whitespace-nowrap shrink-0 ${
                  teacherTab === 'students'
                    ? 'text-[#26251e] underline underline-offset-8 decoration-[#f54e00]'
                    : ''
                }`}
              >
                دانش‌آموزان و شهریه
              </a>
              <a
                href="#attendance"
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherTab('attendance');
                }}
                className={`hover:text-[#26251e] transition-colors whitespace-nowrap shrink-0 ${
                  teacherTab === 'attendance'
                    ? 'text-[#26251e] underline underline-offset-8 decoration-[#f54e00]'
                    : ''
                }`}
              >
                حضور و نمرات
              </a>
              <a
                href="#finance"
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherTab('finance');
                }}
                className={`hover:text-[#26251e] transition-colors whitespace-nowrap shrink-0 ${
                  teacherTab === 'finance'
                    ? 'text-[#26251e] underline underline-offset-8 decoration-[#f54e00]'
                    : ''
                }`}
              >
                گزارش سود ماهانه
              </a>
              <a
                href="#chat"
                onClick={(e) => {
                  e.preventDefault();
                  setTeacherTab('chat');
                }}
                className={`hover:text-[#26251e] transition-colors whitespace-nowrap shrink-0 ${
                  teacherTab === 'chat'
                    ? 'text-[#26251e] underline underline-offset-8 decoration-[#f54e00]'
                    : ''
                }`}
              >
                گفتگو و اعلان‌ها
              </a>
            </>
          ) : (
            <span className="text-[13px] text-[#807d72] whitespace-nowrap shrink-0">
              سامانه مدیریت کلاس‌های خصوصی · تقویم رسمی هجری شمسی
            </span>
          )}
        </nav>

        {/* Zone 3: 1 Primary Action Button (44px touch hitbox on mobile) */}
        <div className="flex items-center shrink-0">
          <button
            type="button"
            onClick={() =>
              setPortalMode((prev) => (prev === 'teacher' ? 'student' : 'teacher'))
            }
            className="min-h-[40px] px-3.5 sm:px-[18px] py-2 text-[13px] sm:text-[14px] font-medium text-[#ffffff] bg-[#f54e00] hover:bg-[#d04200] active:bg-[#d04200] rounded-[8px] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {portalMode === 'teacher'
              ? 'ورود دانش‌آموز'
              : 'ورود استاد'}
          </button>
        </div>
      </header>

      {/* Real-Time Notification Toast Banner */}
      {liveToast && (
        <div className="max-w-[1200px] w-full mx-auto px-3 sm:px-6 pt-3">
          <div className="border border-[#cfcdc4] bg-[#ffffff] text-[#26251e] rounded-[12px] px-3.5 py-2.5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Bell className="w-4 h-4 text-[#f54e00] shrink-0" />
              <div className="text-[13px] truncate">
                <span className="font-semibold">{liveToast.title}: </span>
                <span className="text-[#5a5852]">{liveToast.body}</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLiveToast(null)}
              className="min-h-[36px] min-w-[36px] flex items-center justify-center text-[#807d72] hover:text-[#26251e] rounded cursor-pointer shrink-0"
              aria-label="بستن اعلان"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Main Content Container (pb-24 on mobile for Fixed Bottom Tab Bar clearance) */}
      <main className="flex-1 max-w-[1200px] w-full mx-auto px-3 sm:px-6 pt-3 sm:pt-6 pb-24 md:pb-10">
        {/* Compact Contextual Workspace Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-4 mb-4 sm:mb-6 pb-3 border-b border-[#e6e5e0]">
          <div className="text-[12px] sm:text-[13px] text-[#807d72] truncate">
            <span>{today.fullReadable}</span>
            <span className="hidden sm:inline">
              {' '}
              ·{' '}
              {portalMode === 'teacher'
                ? loggedInTeacher
                  ? `میز کار ${loggedInTeacher.name}`
                  : 'درگاه احراز هویت اساتید'
                : loggedInStudent
                ? `پنل شخصی ${loggedInStudent.name}`
                : 'درگاه ورود امن دانش‌آموز'}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!pwa.isInstalled && (
              <button
                type="button"
                onClick={pwa.openPrompt}
                className="min-h-[38px] px-3 py-1.5 border border-[#cfcdc4] bg-[#ffffff] hover:bg-[#fafaf7] text-[#26251e] text-[12px] font-semibold rounded-[8px] transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                title="راهنمای افزودن وب‌اپلیکیشن به صفحه اصلی موبایل (اندروید و آیفون)"
              >
                <Smartphone className="w-3.5 h-3.5 text-[#f54e00] shrink-0" />
                <span>نصب وب‌اپ (اندروید / آیفون)</span>
              </button>
            )}

            {isTeacherAuthenticated && loggedInTeacher && (
              <>
                <div className="hidden sm:flex items-center gap-1.5 text-[12px] sm:text-[13px] font-semibold text-[#26251e]">
                  <ShieldCheck className="w-4 h-4 text-[#f54e00] shrink-0" />
                  <span>{loggedInTeacher.name}</span>
                </div>

                {firebaseUser ? (
                  <button
                    type="button"
                    onClick={handleGoogleSignOut}
                    className="hidden sm:inline-flex min-h-[36px] px-3 py-1.5 border border-[#cfcdc4] bg-[#ffffff] hover:bg-[#fafaf7] rounded-[8px] text-[12px] text-[#26251e] font-medium items-center gap-1 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>قطع همگام‌سازی ابری</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleGoogleSignIn}
                    className="hidden sm:inline-flex min-h-[36px] px-3 py-1.5 text-[12px] font-medium text-[#26251e] bg-[#ffffff] border border-[#cfcdc4] hover:bg-[#fafaf7] rounded-[8px] transition-colors items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <LogIn className="w-3.5 h-3.5 text-[#f54e00]" />
                    <span>پشتیبان ابری</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleTeacherLogout}
                  className="min-h-[38px] px-3 py-1.5 bg-[#26251e] hover:bg-[#5a5852] text-[#f7f7f4] text-[12px] sm:text-[13px] font-medium rounded-[8px] transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>خروج</span>
                </button>
              </>
            )}
          </div>
        </div>

        {portalMode === 'teacher' ? (
          loggedInTeacher && teacherToken ? (
            <TeacherDashboard
              teacherName={loggedInTeacher.name}
              activeTab={teacherTab}
              onSelectTab={setTeacherTab}
              students={students}
              sessions={sessions}
              rechargeRequests={rechargeRequests}
              messages={messages}
              notifications={notifications}
              onAddStudent={handleAddStudent}
              onEditStudent={handleEditStudent}
              onDirectRechargeStudent={handleDirectRechargeStudent}
              onDeleteStudent={handleDeleteStudent}
              onAddSession={handleAddSession}
              onUpdateSession={handleUpdateSession}
              onResolveRechargeRequest={handleResolveRechargeRequest}
              onSendMessage={handleSendMessage}
              onSendSessionReminder={handleSendSessionReminder}
              onMarkNotificationRead={handleMarkNotificationRead}
            />
          ) : (
            <TeacherLoginView
              onLoginSuccess={handleTeacherLoginSuccess}
              onSwitchToStudentPortal={() => setPortalMode('student')}
            />
          )
        ) : (
          <StudentPortalView
            sessions={sessions}
            rechargeRequests={rechargeRequests}
            messages={messages}
            notifications={notifications}
            loggedInStudent={loggedInStudent}
            onLoginSuccess={handleStudentLoginSuccess}
            onLogoutStudent={handleStudentLogout}
            onSubmitRechargeRequest={handleSubmitRechargeRequest}
            onSendMessage={handleSendMessage}
            onMarkNotificationRead={handleMarkNotificationRead}
          />
        )}
      </main>

      {/* Clean Quiet Editorial Footer (Hidden on mobile when bottom tab bar is active to prevent clutter) */}
      <footer className="hidden md:block border-t border-[#e6e5e0] bg-[#f7f7f4] px-6 py-6 text-[13px] text-[#5a5852]">
        <div className="max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-4">
          <span>مکتب‌یار — سامانه مدیریت کلاس‌های خصوصی و تقویم آموزشی هجری شمسی</span>
          <span dir="ltr" className="font-mono-code text-[#807d72]">
            {loggedInTeacher?.phone || '+98 9373796964'}
          </span>
        </div>
      </footer>

      {/* Customized Android & iPhone (iOS) Add-to-Home-Screen Popup */}
      <PWAInstallPrompt
        isOpen={pwa.isOpen}
        isInstallable={pwa.isInstallable}
        isInstalled={pwa.isInstalled}
        detectedPlatform={pwa.detectedPlatform}
        onInstallNative={pwa.install}
        onDismiss={pwa.dismissPrompt}
      />
    </div>
  );
}
