import { prisma } from "@/lib/prisma";
import { AttendanceStatus, PackageStatus, PackageType, Prisma } from "@prisma/client";
import { packageModeFromNote, type PackageMode } from "@/lib/package-mode";
import { coursePackageAccessibleByStudent, coursePackageMatchesCourse } from "@/lib/package-sharing";
import { attendanceLedgerImpact } from "./attendance-ledger-impact";

const DEDUCTABLE_STATUS = new Set<AttendanceStatus>([
  AttendanceStatus.PRESENT,
  AttendanceStatus.LATE,
  AttendanceStatus.ABSENT,
  AttendanceStatus.EXCUSED,
]);

function durationMinutes(startAt: Date, endAt: Date) {
  return Math.max(0, Math.round((endAt.getTime() - startAt.getTime()) / 60000));
}

async function pickHoursPackageId(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needMinutes: number }
) {
  const { studentId, courseId, at, needMinutes } = opts;

  const pkgMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needMinutes) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const picked = pkgMatches.find((p) => packageModeFromNote(p.note) === "HOURS_MINUTES");
  return picked?.id ?? null;
}

async function pickGroupPackPackage(
  tx: Prisma.TransactionClient,
  opts: { studentId: string; courseId: string; at: Date; needMinutes: number; needCount: number }
) {
  const { studentId, courseId, at, needMinutes, needCount } = opts;

  const minuteMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needMinutes) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const minutesPicked = minuteMatches.find((p) => packageModeFromNote(p.note) === "GROUP_MINUTES");
  if (minutesPicked) return { id: minutesPicked.id, mode: "GROUP_MINUTES" as const };

  const countMatches = await tx.coursePackage.findMany({
    where: {
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { type: PackageType.HOURS },
        { status: PackageStatus.ACTIVE },
        { remainingMinutes: { gte: Math.max(1, needCount) } },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    orderBy: [{ createdAt: "asc" }],
    select: { id: true, note: true },
  });
  const countPicked = countMatches.find((p) => packageModeFromNote(p.note) === "GROUP_COUNT");
  return countPicked ? { id: countPicked.id, mode: "GROUP_COUNT" as const } : null;
}

async function loadAttendancePackage(
  tx: Prisma.TransactionClient,
  opts: { packageId: string; studentId: string; courseId: string; at: Date }
) {
  const { packageId, studentId, courseId, at } = opts;
  const pkg = await tx.coursePackage.findFirst({
    where: {
      id: packageId,
      AND: [
        coursePackageAccessibleByStudent(studentId),
        coursePackageMatchesCourse(courseId),
        { status: PackageStatus.ACTIVE },
        { validFrom: { lte: at } },
        { OR: [{ validTo: null }, { validTo: { gte: at } }] },
      ],
    },
    select: { id: true, type: true, status: true, remainingMinutes: true, note: true },
  });

  if (!pkg) throw new Error(`Package not found: ${packageId}`);
  if (pkg.type !== PackageType.HOURS) throw new Error(`Selected package is not HOURS: ${packageId}`);
  if (pkg.status !== PackageStatus.ACTIVE) throw new Error(`Package is not ACTIVE: ${packageId}`);
  if (pkg.remainingMinutes == null) throw new Error(`Package remainingMinutes is null (please set it): ${packageId}`);

  const remainingMinutes = pkg.remainingMinutes;
  return { ...pkg, remainingMinutes, mode: packageModeFromNote(pkg.note) };
}

function assertPackageModeMatchesClass(mode: PackageMode, isGroupClass: boolean, packageId: string) {
  if (isGroupClass && mode === "HOURS_MINUTES") {
    throw new Error(`Selected package is not GROUP package: ${packageId}`);
  }
  if (!isGroupClass && mode !== "HOURS_MINUTES") {
    throw new Error(`Selected package is GROUP package and cannot be used for 1-on-1: ${packageId}`);
  }
}

function resolveDeductionByMode(
  mode: PackageMode,
  desired: DesiredAttendance,
  sessionDurationMinutes: number
) {
  if (mode === "GROUP_COUNT") {
    return {
      deductedMinutes: 0,
      deductedCount: Math.max(1, Number(desired.deductedCount ?? 0) || 0),
    };
  }

  const fallbackMinutes = mode === "GROUP_MINUTES" ? sessionDurationMinutes : 0;
  const deductedMinutes = Math.max(0, Number(desired.deductedMinutes ?? 0) || 0) || fallbackMinutes;
  if (deductedMinutes <= 0) {
    throw new Error("Deducted minutes must be > 0 for deductible attendance unless waived.");
  }

  return {
    deductedMinutes,
    deductedCount: 0,
  };
}

function unitsForMode(mode: PackageMode, deductedMinutes: number, deductedCount: number) {
  return mode === "GROUP_COUNT" ? deductedCount : deductedMinutes;
}

function ledgerModeLabel(mode: PackageMode) {
  if (mode === "GROUP_COUNT") return "group count";
  if (mode === "GROUP_MINUTES") return "group minutes";
  return "minutes";
}

async function assertAttendanceLedger(tx: Prisma.TransactionClient, sessionId: string, studentIds: string[], storedOnly = false) {
  const session = await tx.session.findUniqueOrThrow({where:{id:sessionId},select:{studentId:true,class:{select:{capacity:true}}}});
  const rows=await tx.attendance.findMany({where:{sessionId},include:{package:{select:{type:true,note:true}}}});
  const transactions=await tx.packageTxn.findMany({where:{sessionId},select:{packageId:true,kind:true,deltaMinutes:true,note:true}});
  for(const studentId of studentIds) {
    let target=rows.find(r=>r.studentId===studentId);
    if(!target) target={id:"new-attendance",studentId,status:AttendanceStatus.UNMARKED,packageId:null,deductedMinutes:0,deductedCount:0,waiveDeduction:false,excusedCharge:false,package:null} as typeof rows[number];
    // Before a change, verify stored financial fields independently of attendance facts.
    const evidenceRow=storedOnly ? {...target,status:target.deductedMinutes>0 || target.deductedCount>0 ? AttendanceStatus.PRESENT : AttendanceStatus.UNMARKED,waiveDeduction:false,excusedCharge:false} : target;
    const impact=attendanceLedgerImpact({studentId,exclusiveStudentId:session.class.capacity===1?session.studentId:null,rows:[...rows.filter(r=>r.studentId!==studentId),evidenceRow],transactions});
    if(impact.needsReview) throw new Error(`Attendance ledger needs review (${impact.reason}); no changes saved / 出勤与实际课时流水需先核对，本次未保存`);
  }
}

async function applyPackageChange(
  tx: Prisma.TransactionClient,
  opts: {
    packageId: string;
    remainingMinutes: number;
    amount: number;
    kind: "DEDUCT" | "ROLLBACK";
    sessionId: string;
    studentId: string;
    mode: PackageMode;
    reason: string;
  }
) {
  const { packageId, remainingMinutes, amount, kind, sessionId, studentId, mode, reason } = opts;
  if (amount <= 0) return;

  if (kind === "DEDUCT" && remainingMinutes < amount) {
    throw new Error(`Not enough balance. package=${packageId}, remaining=${remainingMinutes}, need=${amount}`);
  }

  const changed = await tx.coursePackage.updateMany({
    where: { id: packageId, ...(kind === "DEDUCT" ? { remainingMinutes: { gte: amount } } : {}) },
    data: { remainingMinutes: kind === "DEDUCT" ? { decrement: amount } : { increment: amount } },
  });
  if (changed.count !== 1) throw new Error("Package balance changed; reload before retrying / 课包余额已变化，请刷新后重试");

  await tx.packageTxn.create({
    data: {
      packageId,
      kind,
      deltaMinutes: kind === "DEDUCT" ? -amount : amount,
      sessionId,
      note: `Auto ${kind === "DEDUCT" ? "deduct" : "rollback"} by ${reason} (${ledgerModeLabel(mode)}). studentId=${studentId}`,
    },
  });
}

type ExistingAttendance = {
  studentId: string;
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  packageId: string | null;
  excusedCharge?: boolean;
  waiveDeduction?: boolean;
  waiveReason?: string | null;
};

type DesiredAttendance = {
  status: AttendanceStatus;
  deductedMinutes: number;
  deductedCount: number;
  note: string | null;
  packageId: string | null;
  excusedCharge: boolean;
  waiveDeduction: boolean;
  waiveReason: string | null;
};

async function applyOneStudentAttendanceAndDeduct(
  tx: Prisma.TransactionClient,
  opts: {
    sessionId: string;
    courseId: string;
    at: Date;
    studentId: string;
    desired: DesiredAttendance;
    existing?: ExistingAttendance;
    isGroupClass: boolean;
    sessionDurationMinutes: number;
  }
) {
  const { sessionId, courseId, at, studentId, desired, existing, isGroupClass, sessionDurationMinutes } = opts;

  const excusedCharge = desired.status === AttendanceStatus.EXCUSED ? desired.excusedCharge : false;
  const waiveDeduction = Boolean(desired.waiveDeduction);
  const canDeduct =
    !waiveDeduction && (desired.status === AttendanceStatus.EXCUSED ? excusedCharge : DEDUCTABLE_STATUS.has(desired.status));

  let previousPackage:
    | (Awaited<ReturnType<typeof loadAttendancePackage>> & { mode: PackageMode })
    | null = null;
  let previousUnits = 0;


  if (existing?.packageId && ((existing.deductedMinutes ?? 0) > 0 || (existing.deductedCount ?? 0) > 0)) {
    previousPackage = await loadAttendancePackage(tx, {
      packageId: existing.packageId,
      studentId,
      courseId,
      at,
    });
    assertPackageModeMatchesClass(previousPackage.mode, isGroupClass, previousPackage.id);
    previousUnits = unitsForMode(
      previousPackage.mode,
      Math.max(0, existing.deductedMinutes ?? 0),
      Math.max(0, existing.deductedCount ?? 0)
    );
  }

  let nextPackage:
    | (Awaited<ReturnType<typeof loadAttendancePackage>> & { mode: PackageMode })
    | null = null;
  let finalDeductedMinutes = 0;
  let finalDeductedCount = 0;

  if (canDeduct) {
    if (desired.packageId) {
      nextPackage = await loadAttendancePackage(tx, {
        packageId: desired.packageId,
        studentId,
        courseId,
        at,
      });
    } else if (previousPackage) {
      nextPackage = previousPackage;
    } else if (isGroupClass) {
      const picked = await pickGroupPackPackage(tx, {
        studentId,
        courseId,
        at,
        needMinutes: Math.max(1, Number(desired.deductedMinutes ?? 0) || sessionDurationMinutes),
        needCount: Math.max(1, Number(desired.deductedCount ?? 0) || 1),
      });
      if (picked) {
        nextPackage = await loadAttendancePackage(tx, {
          packageId: picked.id,
          studentId,
          courseId,
          at,
        });
      }
    } else {
      const pickedId = await pickHoursPackageId(tx, {
        studentId,
        courseId,
        at,
        needMinutes: Math.max(1, Number(desired.deductedMinutes ?? 0)),
      });
      if (pickedId) {
        nextPackage = await loadAttendancePackage(tx, {
          packageId: pickedId,
          studentId,
          courseId,
          at,
        });
      }
    }

    if (!nextPackage) {
      throw new Error(
        isGroupClass
          ? `Student ${studentId} has no active GROUP package for this course.`
          : `Student ${studentId} has no active HOURS package to deduct minutes.`
      );
    }

    assertPackageModeMatchesClass(nextPackage.mode, isGroupClass, nextPackage.id);
    const resolved = resolveDeductionByMode(nextPackage.mode, desired, sessionDurationMinutes);
    finalDeductedMinutes = resolved.deductedMinutes;
    finalDeductedCount = resolved.deductedCount;
  }

  const nextUnits = nextPackage ? unitsForMode(nextPackage.mode, finalDeductedMinutes, finalDeductedCount) : 0;
  const sameBinding =
    previousPackage != null &&
    nextPackage != null &&
    previousPackage.id === nextPackage.id &&
    previousPackage.mode === nextPackage.mode;
  const shouldReapply = !sameBinding || previousUnits !== nextUnits;

  if (previousPackage && previousUnits > 0 && shouldReapply) {
    await applyPackageChange(tx, {
      packageId: previousPackage.id,
      remainingMinutes: previousPackage.remainingMinutes,
      amount: previousUnits,
      kind: "ROLLBACK",
      sessionId,
      studentId,
      mode: previousPackage.mode,
      reason: "attendance change",
    });
  }

  if (nextPackage && nextUnits > 0 && shouldReapply) {
    const availableMinutes =
      sameBinding && previousPackage ? previousPackage.remainingMinutes + previousUnits : nextPackage.remainingMinutes;
    await applyPackageChange(tx, {
      packageId: nextPackage.id,
      remainingMinutes: availableMinutes,
      amount: nextUnits,
      kind: "DEDUCT",
      sessionId,
      studentId,
      mode: nextPackage.mode,
      reason: "attendance save",
    });
  }

  const finalPackageId = canDeduct && nextUnits > 0 ? nextPackage?.id ?? null : null;
  if (canDeduct && nextUnits > 0 && !finalPackageId) {
    throw new Error("Package binding is required for deductible attendance unless waived.");
  }

  await tx.attendance.upsert({
    where: { sessionId_studentId: { sessionId, studentId } },
    create: {
      sessionId,
      studentId,
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
      waiveDeduction: waiveDeduction && !canDeduct,
      waiveReason: waiveDeduction && !canDeduct ? desired.waiveReason : null,
    },
    update: {
      status: desired.status,
      deductedCount: finalDeductedCount,
      deductedMinutes: finalDeductedMinutes,
      packageId: finalPackageId,
      note: desired.note,
      excusedCharge,
      waiveDeduction: waiveDeduction && !canDeduct,
      waiveReason: waiveDeduction && !canDeduct ? desired.waiveReason : null,
    },
  });

  return {
    studentId,
    status: desired.status,
    packageId: finalPackageId,
    deductedMinutes: finalDeductedMinutes,
    deductedCount: finalDeductedCount,
    finalUnits: nextUnits,
  };
}

export type AdminAttendanceInput = {
 sessionId:string; actor:{email:string;name?:string|null;role:string};
 items?:Array<{studentId?:unknown;status?:unknown;deductedCount?:unknown;deductedMinutes?:unknown;note?:unknown;packageId?:unknown;excusedCharge?:unknown;waiveDeduction?:unknown;waiveReason?:unknown}>;
 markAll?:{waiveDeduction:boolean;waiveReason:string|null};
};
export async function saveAdminAttendanceInTransaction(tx: Prisma.TransactionClient, input: AdminAttendanceInput) {
  await tx.$queryRaw`SELECT id FROM "Session" WHERE id = ${input.sessionId} FOR UPDATE`;
  const session=await tx.session.findUnique({where:{id:input.sessionId},include:{class:{include:{enrollments:true}},attendances:true}});
  if(!session) throw new Error('Session not found / 课程不存在');
  const studentIds=session.class.capacity===1 && session.studentId ? [session.studentId] : session.class.enrollments.map(e=>e.studentId);
  const isGroupClass=session.class.capacity!==1, duration=durationMinutes(session.startAt,session.endAt);
  const items: NonNullable<AdminAttendanceInput["items"]> = input.markAll ? studentIds.map(studentId=>({studentId,status:'PRESENT',deductedMinutes:isGroupClass?0:duration,deductedCount:isGroupClass?1:0,waiveDeduction:input.markAll!.waiveDeduction,waiveReason:input.markAll!.waiveReason})) : input.items??[];
  if(!items.length) throw new Error('No items / 没有点名记录');
  const expected=new Set(studentIds),seen=new Set<string>(),desiredMap=new Map<string,DesiredAttendance>();
  const excused=await tx.attendance.groupBy({by:['studentId'],where:{studentId:{in:studentIds},status:AttendanceStatus.EXCUSED,NOT:{sessionId:session.id}},_count:{_all:true}});
  const excusedCount=new Map(excused.map(r=>[r.studentId,r._count._all]));
  for(const item of items) {
   if(!item || typeof item!=='object') throw new Error('Invalid attendance item / 点名记录格式无效');
   const studentId=String(item.studentId??''),status=String(item.status??'UNMARKED');
   if(!expected.has(studentId) || seen.has(studentId)) throw new Error('Roster changed or duplicate student / 名单已变化或学生重复');
   if(!(Object.values(AttendanceStatus) as string[]).includes(status)) throw new Error('Invalid attendance status / 出勤状态无效');
   seen.add(studentId);
   const minutes=Number(item.deductedMinutes??0),count=Number(item.deductedCount??0);
   if(!Number.isSafeInteger(minutes)||!Number.isSafeInteger(count)||minutes<0||count<0) throw new Error('Deduction units must be non-negative integers / 扣课数量必须为非负整数');
   const charged=status==='EXCUSED' && (excusedCount.get(studentId)??0)+1>=4 && Boolean(item.excusedCharge);
   desiredMap.set(studentId,{status:status as AttendanceStatus,deductedMinutes:minutes,deductedCount:status==='EXCUSED'&&!charged?0:count,note:String(item.note??'').trim()||null,packageId:String(item.packageId??'').trim()||null,excusedCharge:charged,waiveDeduction:Boolean(item.waiveDeduction),waiveReason:Boolean(item.waiveDeduction)?String(item.waiveReason??'').trim()||null:null});
  }
  const touched=[...seen];
  await assertAttendanceLedger(tx,session.id,touched,true);
  const receipt=[];let totalDeducted=0;
  for(const studentId of touched) {
   const result=await applyOneStudentAttendanceAndDeduct(tx,{sessionId:session.id,studentId,courseId:session.class.courseId,at:session.startAt,desired:desiredMap.get(studentId)!,existing:session.attendances.find(a=>a.studentId===studentId),isGroupClass,sessionDurationMinutes:duration});
   totalDeducted+=result.finalUnits;receipt.push({studentId:result.studentId,status:result.status,packageId:result.packageId,deductedMinutes:result.deductedMinutes,deductedCount:result.deductedCount});
  }
  await assertAttendanceLedger(tx,session.id,touched);
  await tx.auditLog.create({data:{actorEmail:input.actor.email.trim().toLowerCase(),actorName:input.actor.name??null,actorRole:input.actor.role,module:'ATTENDANCE',action:input.markAll?'ADMIN_MARK_ALL_PRESENT':'ADMIN_SAVE',entityType:'Session',entityId:session.id,meta:{expectedStudentCount:studentIds.length,submittedItemCount:items.length,updatedStudentCount:touched.length,totalDeducted,receipt,before:session.attendances.filter(a=>seen.has(a.studentId)).map(a=>({studentId:a.studentId,status:a.status,packageId:a.packageId,deductedMinutes:a.deductedMinutes,deductedCount:a.deductedCount})),ledgerVerified:true}}});
  return {totalDeducted,receipt,updatedCount:touched.length};
 }
export async function saveAdminAttendance(input: AdminAttendanceInput) {
 try { return await prisma.$transaction(tx=>saveAdminAttendanceInTransaction(tx,input),{isolationLevel:Prisma.TransactionIsolationLevel.Serializable});
 }catch(error){
  if(error instanceof Prisma.PrismaClientKnownRequestError && error.code==='P2034') throw new Error('Attendance or package changed concurrently; reload before retrying / 出勤或课包被同时更新，请刷新后重试');
  throw error;
 }
}
