# Security Specification — MaktabYar Private Class Management System

## 1. Data Invariants

1. **Global Default-Deny**: Any path not explicitly matched in `firestore.rules` is unconditionally denied (`allow read, write: if false;`).
2. **Verified Authentication & Role Integrity**: All standard read and write operations require `isSignedIn()` and `isVerified()` (`request.auth.token.email_verified == true`). Admin override (`isAdmin()`) requires either an entry in `/admins/$(request.auth.uid)` or verified runtime email `Fariborz.Fa.1991@gmail.com`.
3. **Path Variable Hardening (`isValidId`)**: Every single-document target operation (`get`, `create`, `update`, `delete`) enforces `isValidId(id)` (`id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\-]+$')`).
4. **Strict Key & Schema Validation (`isValid[Entity]`)**:
   - Every `create` and `update` call validates the complete payload via `isValidStudent`, `isValidClassSession`, `isValidRechargeRequest`, `isValidChatMessage`, or `isValidAppNotification`.
   - Every string field enforces explicit `.size()` min/max bounds and regex patterns (`^09[0-9]{9}$` for Iranian phone numbers, `^[0-2][0-9]:[0-5][0-9]$` for class times) verbatim from `firebase-blueprint.json`.
   - Every `create` operation enforces `data.keys().hasAll([...]) && data.keys().hasOnly([...])` to block shadow/ghost fields.
5. **Relational Ownership & Existence**:
   - A `ClassSession`, `RechargeRequest`, or `ChatMessage` can only be created if the referenced `/students/$(incoming().studentId)` document exists (`exists(...)`) and its `teacherId` matches `incoming().teacherId`.
6. **Action-Based Updates & Terminal State Locking**:
   - All `allow update` blocks begin with `isSignedIn() && isVerified() && isValidId(docId) && isValid[Entity](incoming())`.
   - Updates are partitioned into explicit actions using `incoming().diff(existing()).affectedKeys().hasOnly([...])`.
   - `RechargeRequest` enforces Terminal State Locking: once `existing().status` transitions out of `'pending'` (to `'approved'` or `'rejected'`), no further non-admin updates are permitted.
7. **Temporal & Identity Immutability**:
   - `createdAt == request.time` on `create`, `updatedAt == request.time` on `update`.
   - `teacherId` and `createdAt` are strictly immutable on `update`.
8. **Secure List Queries (Query Enforcer)**:
   - Every `allow list` rule enforces `isSignedIn() && isVerified() && (resource.data.teacherId == request.auth.uid || isAdmin())` without delegating security to client-side filtering or invoking `get()`/`exists()` inside `list`.

---

## 2. The "Dirty Dozen" Payloads

1. **Payload 1 — Shadow Field Injection on Student Create**:
   ```json
   {
     "name": "علی رضایی",
     "phone": "09123456789",
     "subject": "ریاضی پیشرفته",
     "startDate": "1405/08/10",
     "classTime": "16:30",
     "intervalType": "weekly",
     "intervalLabel": "هفتگی (یک جلسه)",
     "tuitionPerSession": 450000,
     "sessionsLeft": 8,
     "totalSessionsPaid": 8,
     "totalAttended": 0,
     "teacherId": "uid_teacher_1",
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP",
     "isSuperAdmin": true
   }
   ```
2. **Payload 2 — Identity Spoofing (`teacherId` mismatch on Student Create)**:
   ```json
   {
     "name": "سارا احمدی",
     "phone": "09121112233",
     "subject": "فیزیک کنکور",
     "startDate": "1405/08/12",
     "classTime": "18:00",
     "intervalType": "twice_weekly",
     "intervalLabel": "دو جلسه در هفته",
     "tuitionPerSession": 500000,
     "sessionsLeft": 4,
     "totalSessionsPaid": 4,
     "totalAttended": 0,
     "teacherId": "uid_victim_teacher",
     "createdAt": "SERVER_TIMESTAMP",
     "updatedAt": "SERVER_TIMESTAMP"
   }
   ```
3. **Payload 3 — Unverified Email Spoof Attack**:
   - Auth token has `email: "Fariborz.Fa.1991@gmail.com"` but `email_verified: false`.
4. **Payload 4 — Invalid Iranian Phone Format on Student Create**:
   ```json
   {
     "phone": "+15551234567"
   }
   ```
5. **Payload 5 — Resource Exhaustion / Oversized String (`name` > 100 chars)**:
   ```json
   {
     "name": "آ... (5000 characters)"
   }
   ```
6. **Payload 6 — ID Poisoning (Document ID with special characters / > 128 chars)**:
   - Target path: `/students/malicious$id!@#`
7. **Payload 7 — Orphaned Session Creation (Non-existent `studentId`)**:
   ```json
   {
     "studentId": "non_existent_student_999",
     "teacherId": "uid_teacher_1"
   }
   ```
8. **Payload 8 — Terminal State Violation on `RechargeRequest`**:
   - Attempting to update a `RechargeRequest` whose `existing().status` is already `'approved'` back to `'pending'` or `'rejected'`.
9. **Payload 9 — Immutable Field Tampering on `Student` Update**:
   - Attempting to modify `createdAt` or `teacherId` during a student tuition/session balance update.
10. **Payload 10 — Forged Client Timestamp (`createdAt != request.time`)**:
    - Supplying a past timestamp `2020-01-01T00:00:00Z` instead of `request.time`.
11. **Payload 11 — Out-of-Bounds Grade Value on `ClassSession`**:
    - Supplying `grade: 95` on a 0–20 Iranian grading scale.
12. **Payload 12 — Unauthorized Blanket List Query on `/students`**:
    - Querying `/students` without `where('teacherId', '==', request.auth.uid)` as a non-admin user.
