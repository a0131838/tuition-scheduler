import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { composePackageNote, GROUP_PACK_TAG } from "@/lib/package-mode";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

function parseDateStart(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}
function parseDateEnd(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 23, 59, 59, 999);
}

type PackageModeKey = "HOURS_MINUTES" | "GROUP_COUNT" | "MONTHLY";

function modeKeyFromCreateType(typeRaw: string, type: string): PackageModeKey {
  if (type === "MONTHLY") return "MONTHLY";
  return typeRaw === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES";
}

function sameModeWhere(mode: PackageModeKey) {
  if (mode === "MONTHLY") return { type: "MONTHLY" as const };
  if (mode === "GROUP_COUNT") {
    return { type: "HOURS" as const, note: { startsWith: GROUP_PACK_TAG } };
  }
  return {
    type: "HOURS" as const,
    OR: [{ note: null }, { NOT: { note: { startsWith: GROUP_PACK_TAG } } }],
  };
}

export async function POST(req: Request) {
  await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const studentId = String(body?.studentId ?? "");
  const courseId = String(body?.courseId ?? "");
  const typeRaw = String(body?.type ?? "HOURS");
  const type = typeRaw === "GROUP_COUNT" ? "HOURS" : typeRaw;
  const status = String(body?.status ?? "PAUSED");

  const validFromStr = String(body?.validFrom ?? "");
  const validToStr = String(body?.validTo ?? "");
  const noteRaw = String(body?.note ?? "");
  const paid = !!body?.paid;
  const paidAtStr = String(body?.paidAt ?? "");
  const paidAmountRaw = body?.paidAmount;
  const paidNote = String(body?.paidNote ?? "");
  const sharedStudentIdsRaw: string[] = Array.isArray(body?.sharedStudentIds)
    ? (body.sharedStudentIds as any[]).map((v) => String(v)).filter(Boolean)
    : [];
  const sharedStudentIds = Array.from(new Set(sharedStudentIdsRaw)).filter((id) => id !== studentId);

  const totalMinutes = Number(body?.totalMinutes ?? 0);

  if (!studentId || !courseId || !validFromStr) {
    return bad("Missing studentId/courseId/validFrom", 409);
  }

  if (sharedStudentIds.length > 0) {
    const rows = await prisma.student.findMany({
      where: { id: { in: sharedStudentIds } },
      select: { id: true },
    });
    if (rows.length !== sharedStudentIds.length) {
      return bad("Invalid sharedStudentIds", 409);
    }
  }

  const validFrom = parseDateStart(validFromStr);
  const validTo = validToStr ? parseDateEnd(validToStr) : null;

  const paidAt = paidAtStr ? new Date(paidAtStr) : paid ? new Date() : null;
  if (paidAtStr && (Number.isNaN(paidAt!.getTime()) || !paidAt)) return bad("Invalid paidAt", 409);

  let paidAmount: number | null = null;
  if (paidAmountRaw !== "" && paidAmountRaw != null) {
    const n = Number(paidAmountRaw);
    if (!Number.isFinite(n)) return bad("Invalid paidAmount", 409);
    paidAmount = n;
  }
  if (paid && !paidAtStr && paidAmount == null) {
    return bad("Paid requires paidAt or paidAmount", 409);
  }

  const overlapCheckTo = validTo ?? new Date(2999, 0, 1);
  const createMode = modeKeyFromCreateType(typeRaw, type);
  // MONTHLY packages must not overlap in active period.
  // HOURS/GROUP packages are allowed to coexist (staff can sell a new package or top-up).
  if (createMode === "MONTHLY") {
    const overlap = await prisma.coursePackage.findFirst({
      where: {
        studentId,
        courseId,
        ...sameModeWhere(createMode),
        status: "ACTIVE",
        validFrom: { lte: overlapCheckTo },
        OR: [{ validTo: null }, { validTo: { gte: validFrom } }],
      },
      select: { id: true },
    });
    if (overlap) return bad("Overlapping ACTIVE package exists", 409);
  }

  const packageNote = composePackageNote(typeRaw === "GROUP_COUNT" ? "GROUP_COUNT" : "HOURS_MINUTES", noteRaw);

  if (type === "HOURS") {
    if (!Number.isFinite(totalMinutes) || totalMinutes <= 0) return bad("HOURS package needs totalMinutes", 409);

    const created = await prisma.coursePackage.create({
      data: {
        studentId,
        courseId,
        type: "HOURS",
        status: (status as any) || "PAUSED",
        totalMinutes,
        remainingMinutes: totalMinutes,
        validFrom,
        validTo,
        paid,
        paidAt,
        paidAmount,
        paidNote: paidNote || null,
        note: packageNote || null,
        sharedStudents: sharedStudentIds.length
          ? { createMany: { data: sharedStudentIds.map((sharedStudentId) => ({ studentId: sharedStudentId })) } }
          : undefined,
        txns: {
          create: { kind: "PURCHASE", deltaMinutes: totalMinutes, note: packageNote || null },
        },
      },
      select: { id: true },
    });
    return Response.json({ ok: true, id: created.id }, { status: 201 });
  }

  if (type !== "MONTHLY") return bad("Invalid type", 409);

  const created = await prisma.coursePackage.create({
    data: {
      studentId,
      courseId,
      type: "MONTHLY",
      status: (status as any) || "PAUSED",
      validFrom,
      validTo,
      paid,
      paidAt,
      paidAmount,
      paidNote: paidNote || null,
      note: packageNote || null,
      sharedStudents: sharedStudentIds.length
        ? { createMany: { data: sharedStudentIds.map((sharedStudentId) => ({ studentId: sharedStudentId })) } }
        : undefined,
      txns: {
        create: { kind: "PURCHASE", deltaMinutes: 0, note: packageNote || null },
      },
    },
    select: { id: true },
  });
  return Response.json({ ok: true, id: created.id }, { status: 201 });
}
