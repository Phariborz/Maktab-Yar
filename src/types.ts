export type IntervalType = 'weekly' | 'twice_weekly' | 'biweekly' | 'custom_days';

export type PaymentSystemType = 'prepaid' | 'postpaid';

export type PostpaidCycleType =
  | 'per_session'
  | 'weekly'
  | 'biweekly'
  | 'monthly';

export type AttendanceStatus =
  | 'scheduled'
  | 'present'
  | 'absent_charged'
  | 'absent'
  | 'excused';

export type RechargeStatus = 'pending' | 'approved' | 'rejected';

export type NotificationType =
  | 'session_reminder'
  | 'payment_approved'
  | 'payment_rejected'
  | 'recharge_requested'
  | 'grade_posted'
  | 'new_message';

export interface Student {
  id: string;
  name: string;
  phone: string;
  password: string; // Preset by teacher on creation, editable by teacher
  subject: string;
  startDate: string; // Jalali YYYY/MM/DD
  classTime: string; // Default/fallback HH:MM
  selectedDays: number[]; // 0..6 (0 = شنبه ... 6 = جمعه) selectable in any combination
  dayTimes?: Record<string, string>; // Per-weekday HH:MM map, e.g. { "2": "16:00", "6": "10:00" }
  paymentType?: PaymentSystemType; // 'prepaid' (پیش‌پرداخت) | 'postpaid' (پس‌پرداخت)
  postpaidCycleType?: PostpaidCycleType; // 'per_session' | 'weekly' | 'biweekly' | 'monthly'
  postpaidCycleSessions?: number; // Calculated sessions per settlement cycle from selectedDays
  intervalType: IntervalType;
  intervalLabel: string;
  tuitionPerSession: number;
  sessionsLeft: number; // Positive = remaining prepaid credit; Negative = owed/unsettled attended sessions
  totalSessionsPaid: number;
  totalAttended: number;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSession {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  subject: string;
  jalaliDate: string; // YYYY/MM/DD
  time: string; // HH:MM
  attendanceStatus: AttendanceStatus;
  grade: number; // -1 if ungraded, 0..20 otherwise
  topic: string;
  teacherNote: string;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface RechargeRequest {
  id: string;
  studentId: string;
  studentName: string;
  studentPhone: string;
  requestedSessions: number;
  totalAmount: number;
  paymentNote: string;
  status: RechargeStatus;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  studentId: string;
  studentName: string;
  senderRole: 'teacher' | 'student';
  senderName: string;
  text: string;
  jalaliTime: string;
  teacherId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  targetRole: 'teacher' | 'student';
  targetStudentId: string;
  type: NotificationType;
  title: string;
  body: string;
  jalaliTime: string;
  isRead: boolean;
  teacherId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ServerStateSnapshot {
  students: Student[];
  sessions: ClassSession[];
  rechargeRequests: RechargeRequest[];
  messages: ChatMessage[];
  notifications: AppNotification[];
}

export type WsEventMessage =
  | { type: 'init'; payload: ServerStateSnapshot }
  | { type: 'student:created'; payload: Student }
  | { type: 'student:updated'; payload: Student }
  | { type: 'student:deleted'; payload: { id: string } }
  | { type: 'session:created'; payload: ClassSession }
  | { type: 'session:updated'; payload: ClassSession }
  | { type: 'session:deleted'; payload: { id: string } }
  | { type: 'recharge:created'; payload: RechargeRequest }
  | { type: 'recharge:updated'; payload: RechargeRequest }
  | { type: 'message:created'; payload: ChatMessage }
  | { type: 'notification:created'; payload: AppNotification }
  | { type: 'notification:updated'; payload: AppNotification };
