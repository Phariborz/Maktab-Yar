import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import {
  initializeFirestore,
  setLogLevel,
  doc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';
import { toEnglishDigits, sanitizeSelectedDays } from './utils/jalali';
import type {
  Student,
  ClassSession,
  RechargeRequest,
  ChatMessage,
  AppNotification,
} from './types';

// Silence internal @firebase/firestore console.error spam when client networks
// (e.g., restricted ISPs or proxies) cannot reach firestore.googleapis.com within 10s
setLogLevel('silent');

const app = initializeApp(firebaseConfig);
export const db = initializeFirestore(
  app,
  {
    experimentalAutoDetectLongPolling: true,
  },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Validate connection to Firestore when authenticated without triggering false console.error alerts on restricted networks
async function testConnection() {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return;
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (
      error instanceof Error &&
      error.message.includes('the client is offline')
    ) {
      console.info(
        'Firestore is operating in offline/local mode on this network connection.'
      );
    }
  }
}
void testConnection();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// ============================================================================
// Defensive Payload Validation & Blueprint Synchronicity Constants
// Directly mirroring firebase-blueprint.json & firestore.rules
// ============================================================================
export const VALIDATION_PATTERNS = {
  ID: /^[a-zA-Z0-9_\-]+$/,
  PHONE: /^09[0-9]{9}$/,
  TIME: /^[0-2][0-9]:[0-5][0-9]$/,
};

export const MAX_LENGTHS = {
  ID: 128,
  NAME: 100,
  PHONE: 15,
  PASSWORD: 100,
  SUBJECT: 100,
  DATE: 20,
  TIME: 10,
  INTERVAL_LABEL: 80,
  TOPIC: 300,
  TEACHER_NOTE: 500,
  PAYMENT_NOTE: 300,
  MESSAGE_TEXT: 1000,
  NOTIFICATION_TITLE: 150,
  NOTIFICATION_BODY: 400,
  JALALI_TIME: 40,
};

export function sanitizeId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_\-]/g, '').slice(0, MAX_LENGTHS.ID);
  return cleaned || `doc_${Date.now()}`;
}

export function normalizeIranianPhone(phone: string): string {
  const digits = toEnglishDigits(phone).replace(/\D/g, '');
  if (digits.startsWith('989') && digits.length === 12) {
    return '0' + digits.slice(2);
  }
  if (digits.startsWith('9') && digits.length === 10) {
    return '0' + digits;
  }
  return digits.slice(0, MAX_LENGTHS.PHONE);
}

/**
 * Syncs student creations and updates (including password, selectedDays, and negative sessionsLeft)
 * to Firestore whenever the teacher is signed in with verified Firebase Auth.
 */
export async function syncStudentToFirestore(
  student: Student,
  isNew: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(student.id);
  const path = `students/${docId}`;
  const phone = normalizeIranianPhone(student.phone);
  if (!VALIDATION_PATTERNS.PHONE.test(phone)) return;

  const cleanPassword = (student.password || '123456')
    .trim()
    .slice(0, MAX_LENGTHS.PASSWORD);
  const ensuredPassword =
    cleanPassword.length >= 3 ? cleanPassword : cleanPassword.padEnd(3, '0');
  const selectedDays = sanitizeSelectedDays(student.selectedDays);

  try {
    if (isNew) {
      await setDoc(doc(db, 'students', docId), {
        name: student.name.trim().slice(0, MAX_LENGTHS.NAME),
        phone,
        password: ensuredPassword,
        subject: student.subject.trim().slice(0, MAX_LENGTHS.SUBJECT),
        startDate: toEnglishDigits(student.startDate).slice(0, MAX_LENGTHS.DATE),
        classTime: toEnglishDigits(student.classTime).slice(0, MAX_LENGTHS.TIME),
        selectedDays,
        intervalType: student.intervalType,
        intervalLabel: student.intervalLabel.slice(0, MAX_LENGTHS.INTERVAL_LABEL),
        tuitionPerSession: Math.max(0, Math.min(100000000, Number(student.tuitionPerSession))),
        sessionsLeft: Math.max(-500, Math.min(1000, Number(student.sessionsLeft))),
        totalSessionsPaid: Math.max(0, Math.min(5000, Number(student.totalSessionsPaid))),
        totalAttended: Math.max(0, Math.min(5000, Number(student.totalAttended))),
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'students', docId), {
        name: student.name.trim().slice(0, MAX_LENGTHS.NAME),
        phone,
        password: ensuredPassword,
        subject: student.subject.trim().slice(0, MAX_LENGTHS.SUBJECT),
        startDate: toEnglishDigits(student.startDate).slice(0, MAX_LENGTHS.DATE),
        classTime: toEnglishDigits(student.classTime).slice(0, MAX_LENGTHS.TIME),
        selectedDays,
        intervalType: student.intervalType,
        intervalLabel: student.intervalLabel.slice(0, MAX_LENGTHS.INTERVAL_LABEL),
        tuitionPerSession: Math.max(0, Math.min(100000000, Number(student.tuitionPerSession))),
        sessionsLeft: Math.max(-500, Math.min(1000, Number(student.sessionsLeft))),
        totalSessionsPaid: Math.max(0, Math.min(5000, Number(student.totalSessionsPaid))),
        totalAttended: Math.max(0, Math.min(5000, Number(student.totalAttended))),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function deleteStudentFromFirestore(studentId: string): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(studentId);
  const path = `students/${docId}`;
  try {
    await deleteDoc(doc(db, 'students', docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function syncSessionToFirestore(
  session: ClassSession,
  isNew: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(session.id);
  const path = `sessions/${docId}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'sessions', docId), {
        studentId: sanitizeId(session.studentId),
        studentName: session.studentName.trim().slice(0, MAX_LENGTHS.NAME),
        studentPhone: normalizeIranianPhone(session.studentPhone),
        subject: session.subject.trim().slice(0, MAX_LENGTHS.SUBJECT),
        jalaliDate: toEnglishDigits(session.jalaliDate).slice(0, MAX_LENGTHS.DATE),
        time: toEnglishDigits(session.time).slice(0, MAX_LENGTHS.TIME),
        attendanceStatus: session.attendanceStatus,
        grade: Math.max(-1, Math.min(20, Number(session.grade))),
        topic: (session.topic || '').slice(0, MAX_LENGTHS.TOPIC),
        teacherNote: (session.teacherNote || '').slice(0, MAX_LENGTHS.TEACHER_NOTE),
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'sessions', docId), {
        attendanceStatus: session.attendanceStatus,
        grade: Math.max(-1, Math.min(20, Number(session.grade))),
        topic: (session.topic || '').slice(0, MAX_LENGTHS.TOPIC),
        teacherNote: (session.teacherNote || '').slice(0, MAX_LENGTHS.TEACHER_NOTE),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function syncRechargeToFirestore(
  req: RechargeRequest,
  isNew: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(req.id);
  const path = `rechargeRequests/${docId}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'rechargeRequests', docId), {
        studentId: sanitizeId(req.studentId),
        studentName: req.studentName.trim().slice(0, MAX_LENGTHS.NAME),
        studentPhone: normalizeIranianPhone(req.studentPhone),
        requestedSessions: Math.max(1, Math.min(100, Number(req.requestedSessions))),
        totalAmount: Math.max(0, Math.min(500000000, Number(req.totalAmount))),
        paymentNote: (req.paymentNote || '').slice(0, MAX_LENGTHS.PAYMENT_NOTE),
        status: 'pending',
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'rechargeRequests', docId), {
        status: req.status,
        paymentNote: (req.paymentNote || '').slice(0, MAX_LENGTHS.PAYMENT_NOTE),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}

export async function syncMessageToFirestore(msg: ChatMessage): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(msg.id);
  const path = `messages/${docId}`;
  try {
    await setDoc(doc(db, 'messages', docId), {
      studentId: sanitizeId(msg.studentId),
      studentName: msg.studentName.trim().slice(0, MAX_LENGTHS.NAME),
      senderRole: msg.senderRole,
      senderName: msg.senderName.trim().slice(0, MAX_LENGTHS.NAME),
      text: msg.text.trim().slice(0, MAX_LENGTHS.MESSAGE_TEXT),
      jalaliTime: msg.jalaliTime.slice(0, MAX_LENGTHS.JALALI_TIME),
      teacherId: auth.currentUser.uid,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function syncNotificationToFirestore(
  notif: AppNotification,
  isNew: boolean
): Promise<void> {
  if (!auth.currentUser || !auth.currentUser.emailVerified) return;
  const docId = sanitizeId(notif.id);
  const path = `notifications/${docId}`;
  try {
    if (isNew) {
      await setDoc(doc(db, 'notifications', docId), {
        targetRole: notif.targetRole,
        targetStudentId: (notif.targetStudentId || '').slice(0, MAX_LENGTHS.ID),
        type: notif.type,
        title: notif.title.slice(0, MAX_LENGTHS.NOTIFICATION_TITLE),
        body: notif.body.slice(0, MAX_LENGTHS.NOTIFICATION_BODY),
        jalaliTime: notif.jalaliTime.slice(0, MAX_LENGTHS.JALALI_TIME),
        isRead: Boolean(notif.isRead),
        teacherId: auth.currentUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      await updateDoc(doc(db, 'notifications', docId), {
        isRead: Boolean(notif.isRead),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(
      error,
      isNew ? OperationType.CREATE : OperationType.UPDATE,
      path
    );
  }
}
