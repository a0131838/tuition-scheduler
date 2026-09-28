import { parsePackageLedgerReferences } from "./package-ledger-detail";
import { packageModeFromNote } from "./package-mode";

type Package = { id: string; type: string; note: string | null };
type Attendance = { id: string; studentId: string; packageId: string | null; deductedMinutes: number; deductedCount: number; excusedCharge: boolean; package?: Package | null };
type Txn = { id: string; packageId: string; kind: string; deltaMinutes: number; note: string | null };
export type CancellationLedgerEvidence = {
  status: "VERIFIED" | "MISMATCH" | "AMBIGUOUS";
  message: string;
  packageNets: Array<{ packageId: string; netUnits: number }>;
  transactionIds: string[];
};

/** Read-only evidence. Never infer one student's balance from a shared package total. */
export function cancellationLedgerEvidence(input: {
  studentId: string;
  exclusiveStudentId: string | null;
  durationMinutes: number;
  attendances: Attendance[];
  transactions: Txn[];
}): CancellationLedgerEvidence {
  const target = input.attendances.find(a => a.studentId === input.studentId);
  const byAttendance = new Map(input.attendances.map(a => [a.id, a.studentId]));
  const nets = new Map<string, number>();
  const transactionIds: string[] = [];
  const result = (status: CancellationLedgerEvidence["status"], message: string): CancellationLedgerEvidence => ({
    status, message, packageNets: [...nets].map(([packageId, netUnits]) => ({ packageId, netUnits })), transactionIds,
  });
  if (!target) return result("MISMATCH", "Attendance record missing / 缺少该学生的出勤记录");
  for (const txn of input.transactions) {
    if (txn.deltaMinutes === 0) continue;
    const refs = parsePackageLedgerReferences(txn.note);
    const attendanceStudent = refs.attendanceId ? byAttendance.get(refs.attendanceId) : null;
    if ((refs.attendanceId && !attendanceStudent) || (refs.studentId && attendanceStudent && refs.studentId !== attendanceStudent)) {
      return result("AMBIGUOUS", "Ledger references conflict or are missing / 课时流水引用冲突或已缺失，请先对账");
    }
    let owner = refs.studentId ?? attendanceStudent;
    if (!owner) {
      // An explicit session student is stronger evidence than a current class roster.
      if (input.exclusiveStudentId) owner = input.exclusiveStudentId;
      // A current group roster or package binding cannot prove historical ownership.
    }
    if (!owner) return result("AMBIGUOUS", "Shared or historical ledger ownership needs review / 共享或历史流水归属不明，不能自动通过核验");
    if (owner !== input.studentId) continue;
    if (!["DEDUCT", "ROLLBACK", "ADJUST"].includes(txn.kind)) return result("AMBIGUOUS", "Unexpected lesson ledger entry / 课程存在非扣退课流水，请先对账");
    transactionIds.push(txn.id);
    nets.set(txn.packageId, (nets.get(txn.packageId) ?? 0) + txn.deltaMinutes);
  }
  const monthly = target.package?.type === "MONTHLY";
  const count = !monthly && packageModeFromNote(target.package?.note) === "GROUP_COUNT";
  const expectedMinutes = target.excusedCharge && !monthly && !count ? input.durationMinutes : 0;
  const expectedCount = target.excusedCharge && count ? 1 : 0;
  const expectedUnits = expectedMinutes + expectedCount;
  if (target.excusedCharge && (!target.packageId || !target.package)) {
    return result("MISMATCH", "Charged cancellation has no package binding / 收费请假缺少课包关联");
  }
  if (target.deductedMinutes !== expectedMinutes || target.deductedCount !== expectedCount) {
    return result("MISMATCH", "Attendance deduction does not match the charge decision / 出勤扣课记录与收费决定不一致");
  }
  // Check each package independently. A refund to B cannot cancel a deduction from A.
  if (expectedUnits > 0 && !nets.has(target.packageId!)) nets.set(target.packageId!, 0);
  for (const [packageId, net] of nets) {
    const expected = packageId === target.packageId ? -expectedUnits : 0;
    if (net !== expected) return result("MISMATCH", "Net lesson ledger does not match the charge decision / 实际净扣课与收费决定不一致，请先处理扣退课");
  }
  return result("VERIFIED", "Charge decision and net ledger verified / 收费决定与实际净扣课已核验");
}
