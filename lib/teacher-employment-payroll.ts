import { prisma } from "@/lib/prisma";

export const TEACHER_EMPLOYMENT_TYPES = ["FULL_TIME", "PART_TIME", "CONTRACT"] as const;
export type TeacherEmploymentType = (typeof TEACHER_EMPLOYMENT_TYPES)[number];

export const TEACHER_LESSON_PAY_MODES = ["INCLUDED_IN_SALARY", "SEPARATELY_PAYABLE"] as const;
export type TeacherLessonPayMode = (typeof TEACHER_LESSON_PAY_MODES)[number];

export type PayrollEmploymentTerm = {
  id: string;
  teacherId: string;
  employmentType: string;
  lessonPayMode: string;
  effectiveFrom: Date;
  effectiveTo: Date | null;
  note: string | null;
  createdBy: string;
};

export type PayrollSessionOverride = {
  id: string;
  sessionId: string;
  teacherId: string;
  payMode: string;
  reason: string;
  createdBy: string;
};

export type PayrollPaymentTreatment = {
  payMode: TeacherLessonPayMode;
  employmentType: TeacherEmploymentType | null;
  employmentTermId: string | null;
  overrideId: string | null;
  reason: string | null;
  source: "DEFAULT_HOURLY" | "EMPLOYMENT_TERM" | "SESSION_OVERRIDE";
};

export type PayrollEmploymentContext = {
  termsByTeacher: Map<string, PayrollEmploymentTerm[]>;
  overridesBySession: Map<string, PayrollSessionOverride>;
};

export function normalizeTeacherEmploymentType(value: string): TeacherEmploymentType {
  return TEACHER_EMPLOYMENT_TYPES.includes(value as TeacherEmploymentType)
    ? (value as TeacherEmploymentType)
    : "PART_TIME";
}

export function normalizeTeacherLessonPayMode(value: string): TeacherLessonPayMode {
  return TEACHER_LESSON_PAY_MODES.includes(value as TeacherLessonPayMode)
    ? (value as TeacherLessonPayMode)
    : "SEPARATELY_PAYABLE";
}

export function resolvePayrollPaymentTreatment(input: {
  teacherId: string;
  sessionId: string;
  startAt: Date;
  context: PayrollEmploymentContext;
}): PayrollPaymentTreatment {
  const override = input.context.overridesBySession.get(input.sessionId) ?? null;
  const activeTerm = (input.context.termsByTeacher.get(input.teacherId) ?? []).find(
    (term) => term.effectiveFrom <= input.startAt && (!term.effectiveTo || input.startAt < term.effectiveTo),
  ) ?? null;

  if (override) {
    return {
      payMode: normalizeTeacherLessonPayMode(override.payMode),
      employmentType: activeTerm ? normalizeTeacherEmploymentType(activeTerm.employmentType) : null,
      employmentTermId: activeTerm?.id ?? null,
      overrideId: override.id,
      reason: override.reason,
      source: "SESSION_OVERRIDE",
    };
  }

  if (activeTerm) {
    return {
      payMode: normalizeTeacherLessonPayMode(activeTerm.lessonPayMode),
      employmentType: normalizeTeacherEmploymentType(activeTerm.employmentType),
      employmentTermId: activeTerm.id,
      overrideId: null,
      reason: activeTerm.note,
      source: "EMPLOYMENT_TERM",
    };
  }

  return {
    payMode: "SEPARATELY_PAYABLE",
    employmentType: null,
    employmentTermId: null,
    overrideId: null,
    reason: null,
    source: "DEFAULT_HOURLY",
  };
}

export async function loadPayrollEmploymentContext(input: {
  teacherIds: string[];
  range: { start: Date; end: Date };
}): Promise<PayrollEmploymentContext> {
  const teacherIds = Array.from(new Set(input.teacherIds.filter(Boolean)));
  if (teacherIds.length === 0) {
    return { termsByTeacher: new Map(), overridesBySession: new Map() };
  }

  const [terms, overrides] = await Promise.all([
    prisma.teacherEmploymentTerm.findMany({
      where: {
        teacherId: { in: teacherIds },
        effectiveFrom: { lt: input.range.end },
        OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.range.start } }],
      },
      orderBy: [{ teacherId: "asc" }, { effectiveFrom: "desc" }],
    }),
    prisma.teacherPayrollSessionOverride.findMany({
      where: {
        teacherId: { in: teacherIds },
        session: { startAt: { gte: input.range.start, lt: input.range.end } },
      },
    }),
  ]);

  const termsByTeacher = new Map<string, PayrollEmploymentTerm[]>();
  for (const term of terms) {
    const rows = termsByTeacher.get(term.teacherId) ?? [];
    rows.push(term);
    termsByTeacher.set(term.teacherId, rows);
  }

  return {
    termsByTeacher,
    overridesBySession: new Map(overrides.map((override) => [override.sessionId, override])),
  };
}

export async function loadTeacherPayrollAdministration(teacherId: string, month: string) {
  const [terms, note] = await Promise.all([
    prisma.teacherEmploymentTerm.findMany({
      where: { teacherId },
      orderBy: { effectiveFrom: "desc" },
    }),
    prisma.teacherPayrollNote.findUnique({
      where: { teacherId_month: { teacherId, month } },
    }),
  ]);
  return { terms, note };
}

export async function saveTeacherEmploymentTerm(input: {
  id?: string | null;
  teacherId: string;
  employmentType: string;
  lessonPayMode: string;
  effectiveFrom: Date;
  effectiveTo?: Date | null;
  note?: string | null;
  actorEmail: string;
}) {
  const employmentType = normalizeTeacherEmploymentType(input.employmentType);
  const lessonPayMode = normalizeTeacherLessonPayMode(input.lessonPayMode);
  const effectiveTo = input.effectiveTo ?? null;
  if (effectiveTo && effectiveTo <= input.effectiveFrom) {
    throw new Error("Employment term end must be after its start date.");
  }

  const overlap = await prisma.teacherEmploymentTerm.findFirst({
    where: {
      teacherId: input.teacherId,
      ...(input.id ? { id: { not: input.id } } : {}),
      effectiveFrom: effectiveTo ? { lt: effectiveTo } : undefined,
      OR: [{ effectiveTo: null }, { effectiveTo: { gt: input.effectiveFrom } }],
    },
    select: { id: true },
  });
  if (overlap) throw new Error("Employment terms cannot overlap.");

  const data = {
    teacherId: input.teacherId,
    employmentType,
    lessonPayMode,
    effectiveFrom: input.effectiveFrom,
    effectiveTo,
    note: input.note?.trim() || null,
    createdBy: input.actorEmail.trim().toLowerCase(),
  };
  if (input.id) {
    return prisma.teacherEmploymentTerm.update({ where: { id: input.id }, data });
  }
  return prisma.teacherEmploymentTerm.create({ data });
}

export async function saveTeacherPayrollSessionOverride(input: {
  sessionId: string;
  teacherId: string;
  payMode: string;
  reason: string;
  actorEmail: string;
}) {
  const session = await prisma.session.findUnique({
    where: { id: input.sessionId },
    select: { teacherId: true, class: { select: { teacherId: true } } },
  });
  const effectiveTeacherId = session?.teacherId ?? session?.class.teacherId ?? null;
  if (!session || effectiveTeacherId !== input.teacherId) throw new Error("Session teacher mismatch.");
  const reason = input.reason.trim();
  if (!reason) throw new Error("A payroll override reason is required.");

  return prisma.teacherPayrollSessionOverride.upsert({
    where: { sessionId: input.sessionId },
    update: {
      teacherId: input.teacherId,
      payMode: normalizeTeacherLessonPayMode(input.payMode),
      reason,
      createdBy: input.actorEmail.trim().toLowerCase(),
    },
    create: {
      sessionId: input.sessionId,
      teacherId: input.teacherId,
      payMode: normalizeTeacherLessonPayMode(input.payMode),
      reason,
      createdBy: input.actorEmail.trim().toLowerCase(),
    },
  });
}

export async function clearTeacherPayrollSessionOverride(input: { sessionId: string; teacherId: string }) {
  return prisma.teacherPayrollSessionOverride.deleteMany({
    where: { sessionId: input.sessionId, teacherId: input.teacherId },
  });
}

export async function saveTeacherPayrollNote(input: {
  teacherId: string;
  month: string;
  note: string;
  actorEmail: string;
}) {
  const note = input.note.trim();
  if (!note) {
    await prisma.teacherPayrollNote.deleteMany({ where: { teacherId: input.teacherId, month: input.month } });
    return null;
  }
  return prisma.teacherPayrollNote.upsert({
    where: { teacherId_month: { teacherId: input.teacherId, month: input.month } },
    update: { note, createdBy: input.actorEmail.trim().toLowerCase() },
    create: {
      teacherId: input.teacherId,
      month: input.month,
      note,
      createdBy: input.actorEmail.trim().toLowerCase(),
    },
  });
}
