import { prisma } from "@/lib/prisma";

export type PackageBalanceMismatchRow = {
  packageId: string;
  studentName: string;
  courseName: string;
  status: string;
  currentRemainingMinutes: number;
  ledgerRemainingMinutes: number;
  diffMinutes: number;
  txnCount: number;
};

export type PackageRollbackReviewRow = {
  txnId: string;
  packageId: string;
  studentName: string;
  courseName: string;
  kind: string;
  deltaMinutes: number;
  createdAt: Date;
  sessionId: string | null;
  sessionExists: boolean;
  sessionStartAt: Date | null;
  sessionEndAt: Date | null;
  teacherName: string;
  subjectName: string;
  note: string;
  riskLevel: "HIGH" | "MEDIUM" | "LOW";
  riskReason: string;
};

export type PackageBalanceAuditResult = {
  generatedAt: Date;
  mismatchRows: PackageBalanceMismatchRow[];
  rollbackReviewRows: PackageRollbackReviewRow[];
};

function clean(v: unknown) {
  return String(v ?? "").trim();
}

function hasStructuredAbnormalNote(note: string | null | undefined) {
  return clean(note).startsWith("[ABNORMAL_TXN]");
}

function riskForAbnormalTxn(input: {
  kind: string;
  note: string | null;
  sessionId: string | null;
  sessionExists: boolean;
}) {
  const note = clean(input.note).toLowerCase();
  if (!input.sessionId) {
    return {
      riskLevel: "HIGH" as const,
      riskReason: "No linked session / 未绑定具体课次",
    };
  }
  if (!input.sessionExists) {
    return {
      riskLevel: "HIGH" as const,
      riskReason: "Linked session is missing / 绑定课次不存在",
    };
  }
  if (note.includes("manual_reconcile_") || note.includes("orphan")) {
    return {
      riskLevel: "HIGH" as const,
      riskReason: "Historical orphan/manual reconcile needs academic confirmation / 历史孤儿流水或手工对账需教务确认",
    };
  }
  if (!hasStructuredAbnormalNote(input.note)) {
    return {
      riskLevel: "MEDIUM" as const,
      riskReason: "Missing structured reason, approver, or evidence / 缺少标准原因、审批人或证据备注",
    };
  }
  if (input.kind === "ADJUST") {
    return {
      riskLevel: "MEDIUM" as const,
      riskReason: "Manual adjustment should be reviewed / 手动调整需复核",
    };
  }
  return {
    riskLevel: "LOW" as const,
    riskReason: "Structured abnormal transaction / 已有标准异常说明",
  };
}

export async function getPackageBalanceAudit(days = 120): Promise<PackageBalanceAuditResult> {
  const since = new Date();
  since.setDate(since.getDate() - Math.max(1, Math.min(days, 365)));

  const packages = await prisma.coursePackage.findMany({
    where: { type: "HOURS" },
    orderBy: { updatedAt: "desc" },
    select: {
      id: true,
      remainingMinutes: true,
      status: true,
      student: { select: { name: true } },
      course: { select: { name: true } },
      txns: { select: { deltaMinutes: true } },
    },
  });

  const mismatchRows = packages
    .map((pkg) => {
      const ledgerRemainingMinutes = pkg.txns.reduce((sum, txn) => sum + (txn.deltaMinutes ?? 0), 0);
      const currentRemainingMinutes = pkg.remainingMinutes ?? 0;
      return {
        packageId: pkg.id,
        studentName: pkg.student?.name ?? "-",
        courseName: pkg.course?.name ?? "-",
        status: pkg.status,
        currentRemainingMinutes,
        ledgerRemainingMinutes,
        diffMinutes: currentRemainingMinutes - ledgerRemainingMinutes,
        txnCount: pkg.txns.length,
      };
    })
    .filter((row) => row.diffMinutes !== 0)
    .sort((a, b) => Math.abs(b.diffMinutes) - Math.abs(a.diffMinutes));

  const abnormalTxns = await prisma.packageTxn.findMany({
    where: {
      kind: { in: ["ROLLBACK", "ADJUST"] },
      createdAt: { gte: since },
    },
    orderBy: { createdAt: "desc" },
    take: 300,
    select: {
      id: true,
      packageId: true,
      kind: true,
      deltaMinutes: true,
      sessionId: true,
      note: true,
      createdAt: true,
      package: {
        select: {
          student: { select: { name: true } },
          course: { select: { name: true } },
        },
      },
    },
  });

  const sessionIds = Array.from(new Set(abnormalTxns.map((txn) => txn.sessionId).filter(Boolean))) as string[];
  const sessions = sessionIds.length
    ? await prisma.session.findMany({
        where: { id: { in: sessionIds } },
        select: {
          id: true,
          startAt: true,
          endAt: true,
          teacher: { select: { name: true } },
          class: {
            select: {
              subject: { select: { name: true } },
              teacher: { select: { name: true } },
            },
          },
        },
      })
    : [];
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));

  const rollbackReviewRows = abnormalTxns
    .map((txn) => {
      const session = txn.sessionId ? sessionMap.get(txn.sessionId) : null;
      const risk = riskForAbnormalTxn({
        kind: txn.kind,
        note: txn.note,
        sessionId: txn.sessionId,
        sessionExists: Boolean(session),
      });
      return {
        txnId: txn.id,
        packageId: txn.packageId,
        studentName: txn.package?.student?.name ?? "-",
        courseName: txn.package?.course?.name ?? "-",
        kind: txn.kind,
        deltaMinutes: txn.deltaMinutes,
        createdAt: txn.createdAt,
        sessionId: txn.sessionId,
        sessionExists: Boolean(session),
        sessionStartAt: session?.startAt ?? null,
        sessionEndAt: session?.endAt ?? null,
        teacherName: session?.teacher?.name ?? session?.class?.teacher?.name ?? "-",
        subjectName: session?.class?.subject?.name ?? "-",
        note: txn.note ?? "",
        ...risk,
      };
    })
    .filter((row) => row.riskLevel !== "LOW")
    .sort((a, b) => {
      const rank = { HIGH: 0, MEDIUM: 1, LOW: 2 };
      return rank[a.riskLevel] - rank[b.riskLevel] || b.createdAt.getTime() - a.createdAt.getTime();
    });

  return {
    generatedAt: new Date(),
    mismatchRows,
    rollbackReviewRows,
  };
}
