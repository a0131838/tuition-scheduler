import { AttendanceStatus } from "@prisma/client";
import { logAudit } from "@/lib/audit-log";
import { loadJsonAppSettingForDb, mutateJsonAppSetting } from "@/lib/app-setting-lock";
import {
  formatBusinessDateOnly,
  formatBusinessDateTime,
  formatBusinessTimeOnly,
  formatDateOnly,
  normalizeDateOnly,
  parseBusinessDateStart,
} from "@/lib/date-only";
import { assertGlobalInvoiceNoAvailable, getNextGlobalInvoiceNo } from "@/lib/global-invoice-sequence";
import { prisma } from "@/lib/prisma";
import { createParentInvoice } from "@/lib/student-parent-billing";

const TRANSPORT_BILLING_KEY = "transport_billing_v1";
const DEFAULT_TRANSPORT_AMOUNT = 20;

export type TransportBillingEntry = {
  sessionId: string;
  studentId: string;
  amount: number;
  billable: boolean;
  note: string | null;
  invoiceId: string | null;
  invoiceNo: string | null;
  markedBy: string;
  markedAt: string;
  updatedAt: string;
};

type TransportBillingStore = {
  entries: TransportBillingEntry[];
};

const EMPTY_TRANSPORT_BILLING_STORE: TransportBillingStore = { entries: [] };

export type TransportBillingRow = {
  key: string;
  sessionId: string;
  attendanceId: string;
  studentId: string;
  studentName: string;
  teacherName: string;
  courseName: string;
  subjectName: string;
  campusName: string;
  roomName: string;
  startAt: Date;
  endAt: Date;
  dateText: string;
  timeText: string;
  attendanceStatus: AttendanceStatus;
  amount: number;
  billable: boolean;
  note: string;
  invoiceId: string | null;
  invoiceNo: string | null;
};

function clean(value: unknown, max = 1000) {
  return String(value ?? "").trim().slice(0, max);
}

function entryKey(sessionId: string, studentId: string) {
  return `${sessionId}|${studentId}`;
}

function roundMoney(value: unknown, fallback = 0) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function sanitizeStore(input: unknown): TransportBillingStore {
  if (!input || typeof input !== "object") return EMPTY_TRANSPORT_BILLING_STORE;
  const root = input as Record<string, unknown>;
  const rawEntries = Array.isArray(root.entries) ? root.entries : [];
  const entries: TransportBillingEntry[] = [];
  const seen = new Set<string>();
  for (const row of rawEntries) {
    if (!row || typeof row !== "object") continue;
    const x = row as Record<string, unknown>;
    const sessionId = clean(x.sessionId);
    const studentId = clean(x.studentId);
    if (!sessionId || !studentId) continue;
    const key = entryKey(sessionId, studentId);
    if (seen.has(key)) continue;
    seen.add(key);
    entries.push({
      sessionId,
      studentId,
      amount: Math.max(0, roundMoney(x.amount, DEFAULT_TRANSPORT_AMOUNT)),
      billable: Boolean(x.billable),
      note: clean(x.note) || null,
      invoiceId: clean(x.invoiceId) || null,
      invoiceNo: clean(x.invoiceNo) || null,
      markedBy: clean(x.markedBy, 200),
      markedAt: clean(x.markedAt, 40) || new Date().toISOString(),
      updatedAt: clean(x.updatedAt, 40) || new Date().toISOString(),
    });
  }
  return { entries };
}

async function loadStore() {
  const { store } = await loadJsonAppSettingForDb(prisma, TRANSPORT_BILLING_KEY, EMPTY_TRANSPORT_BILLING_STORE, sanitizeStore);
  return store;
}

function monthBounds(month: string) {
  const normalized = /^\d{4}-\d{2}$/.test(month) ? month : formatDateOnly(new Date()).slice(0, 7);
  const start = parseBusinessDateStart(`${normalized}-01`) ?? new Date();
  const nextMonth = new Date(Date.UTC(Number(normalized.slice(0, 4)), Number(normalized.slice(5, 7)), 1, 0, 0, 0, 0) - 8 * 60 * 60 * 1000);
  return { month: normalized, start, end: nextMonth };
}

export async function listTransportBillingRows(input: { month: string; studentId?: string | null }) {
  const { month, start, end } = monthBounds(input.month);
  const studentId = clean(input.studentId);
  const [store, attendances] = await Promise.all([
    loadStore(),
    prisma.attendance.findMany({
      where: {
        status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
        ...(studentId ? { studentId } : {}),
        session: { startAt: { gte: start, lt: end } },
      },
      select: {
        id: true,
        status: true,
        studentId: true,
        student: { select: { name: true } },
        session: {
          select: {
            id: true,
            startAt: true,
            endAt: true,
            teacher: { select: { name: true } },
            class: {
              select: {
                course: { select: { name: true } },
                subject: { select: { name: true } },
                teacher: { select: { name: true } },
                campus: { select: { name: true } },
                room: { select: { name: true } },
              },
            },
          },
        },
      },
      orderBy: [{ session: { startAt: "asc" } }, { student: { name: "asc" } }],
    }),
  ]);

  const entryMap = new Map(store.entries.map((entry) => [entryKey(entry.sessionId, entry.studentId), entry]));
  const rows: TransportBillingRow[] = attendances.map((attendance) => {
    const session = attendance.session;
    const key = entryKey(session.id, attendance.studentId);
    const entry = entryMap.get(key);
    return {
      key,
      sessionId: session.id,
      attendanceId: attendance.id,
      studentId: attendance.studentId,
      studentName: attendance.student.name,
      teacherName: session.teacher?.name ?? session.class.teacher.name,
      courseName: session.class.course.name,
      subjectName: session.class.subject?.name ?? "-",
      campusName: session.class.campus.name,
      roomName: session.class.room?.name ?? "-",
      startAt: session.startAt,
      endAt: session.endAt,
      dateText: formatBusinessDateOnly(session.startAt),
      timeText: `${formatBusinessTimeOnly(session.startAt)}-${formatBusinessTimeOnly(session.endAt)}`,
      attendanceStatus: attendance.status,
      amount: entry?.amount ?? DEFAULT_TRANSPORT_AMOUNT,
      billable: Boolean(entry?.billable),
      note: entry?.note ?? "",
      invoiceId: entry?.invoiceId ?? null,
      invoiceNo: entry?.invoiceNo ?? null,
    };
  });

  return { month, rows };
}

export async function listTransportBillingStudentOptions(month: string) {
  const { start, end } = monthBounds(month);
  const attendances = await prisma.attendance.findMany({
    where: {
      status: { in: [AttendanceStatus.PRESENT, AttendanceStatus.LATE] },
      session: { startAt: { gte: start, lt: end } },
    },
    select: { studentId: true, student: { select: { name: true } } },
    orderBy: { student: { name: "asc" } },
  });
  const map = new Map<string, string>();
  for (const attendance of attendances) map.set(attendance.studentId, attendance.student.name);
  return Array.from(map.entries()).map(([id, name]) => ({ id, name }));
}

export async function saveTransportBillingEntry(input: {
  sessionId: string;
  studentId: string;
  amount: number;
  billable: boolean;
  note?: string | null;
  actorEmail: string;
}) {
  const sessionId = clean(input.sessionId);
  const studentId = clean(input.studentId);
  if (!sessionId || !studentId) throw new Error("Missing session or student");
  const now = new Date().toISOString();
  const amount = Math.max(0, roundMoney(input.amount, DEFAULT_TRANSPORT_AMOUNT));
  await mutateJsonAppSetting({
    key: TRANSPORT_BILLING_KEY,
    fallback: EMPTY_TRANSPORT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const key = entryKey(sessionId, studentId);
      const existing = store.entries.find((entry) => entryKey(entry.sessionId, entry.studentId) === key);
      if (existing?.invoiceId) throw new Error("Already invoiced. Cannot edit this transport row.");
      if (existing) {
        existing.amount = amount;
        existing.billable = input.billable;
        existing.note = clean(input.note) || null;
        existing.markedBy = clean(input.actorEmail, 200);
        existing.updatedAt = now;
      } else {
        store.entries.push({
          sessionId,
          studentId,
          amount,
          billable: input.billable,
          note: clean(input.note) || null,
          invoiceId: null,
          invoiceNo: null,
          markedBy: clean(input.actorEmail, 200),
          markedAt: now,
          updatedAt: now,
        });
      }
    },
  });
}

async function findInvoicePackageForStudent(studentId: string) {
  return prisma.coursePackage.findFirst({
    where: { studentId },
    include: { student: true, course: true },
    orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
  });
}

export async function createTransportInvoice(input: {
  month: string;
  studentId: string;
  issueDate?: string | null;
  dueDate?: string | null;
  actorEmail: string;
}) {
  const studentId = clean(input.studentId);
  if (!studentId) throw new Error("Please select one student before creating a transport invoice.");
  const { month } = monthBounds(input.month);
  const workbench = await listTransportBillingRows({ month, studentId });
  const rows = workbench.rows.filter((row) => row.billable && !row.invoiceId && row.amount > 0);
  if (rows.length === 0) throw new Error("No uninvoiced billable transport sessions for this student and month.");

  const pkg = await findInvoicePackageForStudent(studentId);
  if (!pkg) throw new Error("No student package found for invoice context.");

  const issueDate = normalizeDateOnly(input.issueDate ?? "", new Date()) ?? formatDateOnly(new Date());
  const dueDate = normalizeDateOnly(input.dueDate ?? "", new Date()) ?? issueDate;
  const invoiceNo = await getNextGlobalInvoiceNo(issueDate);
  await assertGlobalInvoiceNoAvailable(invoiceNo);
  const total = rows.reduce((sum, row) => sum + row.amount, 0);
  const dateList = rows.map((row) => row.dateText).join(", ");
  const sameAmount = rows.every((row) => row.amount === rows[0].amount);
  const unitText = sameAmount ? ` at SGD ${rows[0].amount.toFixed(2)} per session` : "";
  const description = `Transport reimbursement for home lessons in ${month}${unitText}: ${dateList} (${rows.length} session${rows.length === 1 ? "" : "s"})`;

  const invoice = await createParentInvoice({
    packageId: pkg.id,
    studentId,
    invoiceNo,
    issueDate,
    dueDate,
    courseStartDate: rows[0]?.dateText ?? null,
    courseEndDate: rows[rows.length - 1]?.dateText ?? null,
    billTo: pkg.student.name,
    quantity: rows.length,
    description,
    amount: total,
    gstAmount: 0,
    totalAmount: total,
    paymentTerms: "Immediate",
    note: `Transport reimbursement billing generated from SGT Manage for ${month}.`,
    createdBy: input.actorEmail,
  });

  await mutateJsonAppSetting({
    key: TRANSPORT_BILLING_KEY,
    fallback: EMPTY_TRANSPORT_BILLING_STORE,
    sanitize: sanitizeStore,
    mutate(store) {
      const targetKeys = new Set(rows.map((row) => row.key));
      for (const entry of store.entries) {
        if (!targetKeys.has(entryKey(entry.sessionId, entry.studentId))) continue;
        entry.invoiceId = invoice.id;
        entry.invoiceNo = invoice.invoiceNo;
        entry.updatedAt = new Date().toISOString();
      }
    },
  });

  await logAudit({
    actor: { email: input.actorEmail, role: "ADMIN" },
    module: "PARENT_BILLING",
    action: "CREATE_TRANSPORT_INVOICE",
    entityType: "ParentInvoice",
    entityId: invoice.id,
    meta: { studentId, invoiceNo: invoice.invoiceNo, month, sessions: rows.length, total },
  });

  return invoice;
}
