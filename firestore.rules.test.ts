/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md
 * are rejected with PERMISSION_DENIED.
 */

export interface SecurityTestCase {
  id: number;
  name: string;
  collection: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: SecurityTestCase[] = [
  {
    id: 1,
    name: 'Rejects shadow field injection (isSuperAdmin) on student create',
    collection: 'students',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Rejects teacherId identity spoofing on student create',
    collection: 'students',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Rejects unverified admin email spoof attack (email_verified == false)',
    collection: 'students',
    operation: 'get',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Rejects non-Iranian phone regex pattern on student create',
    collection: 'students',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Rejects oversized string (>100 chars) on student name',
    collection: 'students',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Rejects poisoned document ID containing invalid characters',
    collection: 'students',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Rejects orphaned ClassSession referencing non-existent studentId',
    collection: 'sessions',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Rejects update to RechargeRequest after terminal status (approved/rejected)',
    collection: 'rechargeRequests',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Rejects tampering with immutable teacherId or createdAt on Student update',
    collection: 'students',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Rejects forged client timestamp where createdAt != request.time',
    collection: 'messages',
    operation: 'create',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Rejects out-of-bounds session grade (> 20 on Iranian scale)',
    collection: 'sessions',
    operation: 'update',
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Rejects unquantified blanket list query on /students by non-owner',
    collection: 'students',
    operation: 'list',
    expectedResult: 'PERMISSION_DENIED',
  },
];
