import { parsePackageLedgerReferences } from "./package-ledger-detail";
import { packageModeFromNote } from "./package-mode";

type Row = { id: string; studentId: string; status: string; packageId: string | null; deductedMinutes: number; deductedCount: number; waiveDeduction: boolean; excusedCharge: boolean; package: { type: string; note: string | null } | null };
type Txn = { packageId: string; kind: string; deltaMinutes: number; note: string | null };
/** Attendance facts never authorize a debit or refund. This is a read-only comparison. */
export function attendanceLedgerImpact(input: { studentId: string; exclusiveStudentId: string | null; rows: Row[]; transactions: Txn[] }) {
  const row = input.rows.find(r => r.studentId === input.studentId);
  if (!row) return { needsReview: true, reason: "MISSING_ATTENDANCE" };
  const byAttendance = new Map(input.rows.map(r => [r.id,r.studentId]));
  const nets = new Map<string,number>();
  for(const txn of input.transactions) {
    if (!txn.deltaMinutes) continue;
    const refs = parsePackageLedgerReferences(txn.note);
    const ownerByAttendance = refs.attendanceId ? byAttendance.get(refs.attendanceId) : null;
    if ((refs.attendanceId && !ownerByAttendance) || (refs.studentId && ownerByAttendance && refs.studentId !== ownerByAttendance)) return { needsReview:true, reason:"UNCERTAIN_OWNERSHIP" };
    const owner = refs.studentId ?? ownerByAttendance ?? input.exclusiveStudentId;
    if (!owner) return { needsReview:true, reason:"UNCERTAIN_OWNERSHIP" };
    if (owner !== input.studentId) continue;
    if (!['DEDUCT','ROLLBACK'].includes(txn.kind) || (txn.kind==='DEDUCT' && txn.deltaMinutes>0) || (txn.kind==='ROLLBACK' && txn.deltaMinutes<0)) return {needsReview:true,reason:"UNVERIFIED_LEDGER"};
    nets.set(txn.packageId,(nets.get(txn.packageId)??0)+txn.deltaMinutes);
  }
  const charged = !row.waiveDeduction && (row.status === 'EXCUSED' ? row.excusedCharge : ['PRESENT','LATE','ABSENT'].includes(row.status));
  const monthly = row.package?.type === 'MONTHLY';
  const count = !monthly && packageModeFromNote(row.package?.note) === 'GROUP_COUNT';
  const units = monthly ? 0 : count ? row.deductedCount : row.deductedMinutes;
  const wrongUnit = monthly ? row.deductedCount!==0 || row.deductedMinutes!==0 : count ? row.deductedMinutes!==0 : row.deductedCount!==0;
  if (wrongUnit || row.deductedMinutes<0 || row.deductedCount<0 || (!charged && (row.deductedMinutes!==0 || row.deductedCount!==0))) return {needsReview:true,reason:"CHARGE_DECISION_MISMATCH"};
  if (charged && (!row.packageId || !row.package || (!monthly && units<=0))) return {needsReview:true,reason:"DEDUCTION_NOT_VERIFIED"};
  if (charged && units>0) nets.set(row.packageId!,nets.get(row.packageId!)??0);
  for(const [packageId,net] of nets) if(net !== (charged && packageId===row.packageId ? -units : 0)) return {needsReview:true,reason:"NET_LEDGER_MISMATCH"};
  return {needsReview:false,reason:"MATCHED"};
}
