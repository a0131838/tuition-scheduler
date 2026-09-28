import { packageModeFromNote, packageModeSupportsClass } from "./package-mode";
import { renewalEntitlementUnit } from "./renewal-entitlement-policy";
export type ForecastPackage = {
  id: string; studentId: string; type: string; note: string | null; validFrom: Date; validTo: Date | null;
  courseId: string; sharedStudents: Array<{ studentId: string }>; sharedCourses: Array<{ courseId: string }>;
};
export type ForecastSession = {
  id: string; studentId: string | null; startAt: Date; endAt: Date;
  class: { courseId: string; capacity: number; oneOnOneStudentId: string | null; enrollments: Array<{ studentId: string }> };
  attendances: Array<{ studentId: string; status: string; packageId: string | null; deductedMinutes: number; deductedCount: number; waiveDeduction: boolean; excusedCharge: boolean }>;
};
export function forecastSessionStudents(session: ForecastSession) {
  return session.studentId ? [session.studentId] : session.class.oneOnOneStudentId ? [session.class.oneOnOneStudentId] : [...new Set(session.class.enrollments.map(e => e.studentId))];
}
/** Forecast only. Never reserve, choose or deduct a package on behalf of staff. */
export function renewalScheduledDemand(packages: ForecastPackage[], sessions: ForecastSession[]) {
  const results = new Map(packages.map(p => [p.id, { units: 0, lessonUnits: [] as number[], nextLessonAt: null as Date | null, needsReview: false }]));
  for (const session of sessions) {
    const duration = Math.round((session.endAt.getTime() - session.startAt.getTime()) / 60000);
    for (const studentId of forecastSessionStudents(session)) {
      const attendance = session.attendances.find(a => a.studentId === studentId);
      if (attendance?.waiveDeduction || (attendance?.status === "EXCUSED" && !attendance.excusedCharge)) continue;
      const scope = packages.filter(p => (p.studentId === studentId || p.sharedStudents.some(s => s.studentId === studentId)) &&
        (p.courseId === session.class.courseId || p.sharedCourses.some(c => c.courseId === session.class.courseId)) &&
        (p.type === "MONTHLY" || packageModeSupportsClass(packageModeFromNote(p.note), session.class.capacity !== 1)));
      // Already deducted units are not demanded again. Missing binding is uncertain.
      if (attendance && (attendance.deductedCount > 0 || attendance.deductedMinutes > 0)) {
        if (!attendance.packageId) for (const p of scope) results.get(p.id)!.needsReview = true;
        continue;
      }
      const eligible = scope.filter(p => p.validFrom <= session.startAt && (!p.validTo || p.validTo >= session.startAt));
      const bound = attendance?.packageId;
      const selected = bound ? eligible.filter(p => p.id === bound) : eligible;
      if (selected.length !== 1 || duration <= 0) {
        // Multiple eligible packages are not multiple purchases of this lesson.
        const boundScope = bound ? scope.filter(p => p.id === bound) : scope;
        for (const p of boundScope.length ? boundScope : scope) results.get(p.id)!.needsReview = true;
        continue;
      }
      const p = selected[0], result = results.get(p.id)!;
      const unit = renewalEntitlementUnit(p);
      result.nextLessonAt = !result.nextLessonAt || session.startAt < result.nextLessonAt ? session.startAt : result.nextLessonAt;
      if (unit === "PERIOD") continue;
      const units = unit === "COUNT" ? 1 : duration;
      result.units += units; result.lessonUnits.push(units);
    }
  }
  return results;
}
