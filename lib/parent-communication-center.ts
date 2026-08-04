import crypto from "crypto";
import { Prisma } from "@prisma/client";
import { formatBusinessDateOnly, formatBusinessDateTime, formatBusinessDateWithWeekday, formatBusinessTimeOnly, parseBusinessDateStart } from "@/lib/date-only";
import { logAudit } from "@/lib/audit-log";
import { queueFirstPublishedFeedback } from "@/lib/miniapp-feedback-notification";
import { getMissingParentFeedbackSections, parseParentFeedbackSections } from "@/lib/parent-feedback-format";
import { prisma } from "@/lib/prisma";
import { feedbackAttachmentDto } from "@/lib/feedback-attachments";
import { getVisibleSessionStudents } from "@/lib/session-students";
import { renderPublishedCommunicationTemplate } from "@/lib/parent-communication-templates";

export type CommunicationActor = {
  id: string;
  email: string;
  name: string;
  role: string;
};

const OPEN_STATUSES = ["PENDING_REVIEW", "READY_TO_SEND", "CLAIMED", "RETURNED", "ATTENTION"];

function fingerprint(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function reminderScheduleLines(value: string) {
  return String(value ?? "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^(?:【[^】]+】)?\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\b/.test(line));
}

type CourseChangeType = "CANCELLED" | "TIME_CHANGED" | "TEACHER_CHANGED" | "LOCATION_CHANGED" | "STUDENTS_CHANGED" | "MULTIPLE_CHANGED" | "UPDATED";

const courseChangeLabels: Record<CourseChangeType, string> = {
  CANCELLED: "课程取消",
  TIME_CHANGED: "上课时间变更",
  TEACHER_CHANGED: "授课老师变更",
  LOCATION_CHANGED: "上课地点变更",
  STUDENTS_CHANGED: "上课学生变更",
  MULTIPLE_CHANGED: "多项安排变更",
  UPDATED: "课程安排变更",
};

function parseScheduleLine(line: string) {
  const match = line.match(/^(?:【([^】]+)】)?(\d{1,2}:\d{2})\s*[–-]\s*(\d{1,2}:\d{2})\s+(.+)$/);
  if (!match) return null;
  const parts = match[4].split(/\s+·\s+/).map((part) => part.trim());
  return {
    student: match[1] ?? "",
    time: `${match[2]}–${match[3]}`,
    subject: parts[0] ?? "",
    person: parts[1] ?? "",
    location: parts.slice(2).join(" · "),
  };
}

function detectCourseChangeType(kind: string, previousLines: string[], currentLines: string[]): CourseChangeType {
  if (!currentLines.length) return "CANCELLED";
  if (previousLines.length !== currentLines.length) return kind === "COURSE_REMINDER_TEACHER" ? "STUDENTS_CHANGED" : "MULTIPLE_CHANGED";
  const changes = new Set<CourseChangeType>();
  for (let index = 0; index < previousLines.length; index += 1) {
    const previous = parseScheduleLine(previousLines[index]);
    const current = parseScheduleLine(currentLines[index]);
    if (!previous || !current) return "UPDATED";
    if (previous.student !== current.student) changes.add("STUDENTS_CHANGED");
    if (previous.time !== current.time) changes.add("TIME_CHANGED");
    if (previous.subject !== current.subject) changes.add("UPDATED");
    if (previous.person !== current.person) changes.add(kind === "COURSE_REMINDER_PARENT" ? "TEACHER_CHANGED" : "STUDENTS_CHANGED");
    if (previous.location !== current.location) changes.add("LOCATION_CHANGED");
  }
  if (changes.size === 0) return "UPDATED";
  if (changes.size > 1 || changes.has("UPDATED")) return "MULTIPLE_CHANGED";
  return Array.from(changes)[0];
}

function recipientGreeting(messageText: string, kind: string) {
  const firstLine = String(messageText ?? "").split(/\r?\n/)[0]?.trim() ?? "";
  const greeting = firstLine.match(/^(.{1,40}?您好)[，,]/)?.[1];
  if (greeting) return `${greeting}，`;
  return kind === "COURSE_REMINDER_TEACHER" ? "老师您好，" : "家长您好，";
}

export function buildCourseChangeMessage(input: {
  kind: string;
  previousMessageText: string;
  currentMessageText?: string | null;
  forceCancelled?: boolean;
}) {
  const previousLines = reminderScheduleLines(input.previousMessageText);
  const currentLines = input.forceCancelled ? [] : reminderScheduleLines(input.currentMessageText ?? "");
  const type = detectCourseChangeType(input.kind, previousLines, currentLines);
  const label = courseChangeLabels[type];
  const audience = input.kind === "COURSE_REMINDER_TEACHER" ? "老师" : "家长";
  const greeting = recipientGreeting(input.currentMessageText || input.previousMessageText, input.kind);
  const currentBlock = currentLines.length
    ? currentLines.map((line) => `• ${line}`).join("\n")
    : "• 该课程已取消，暂无替代课程。 / This class has been cancelled. No replacement class is currently scheduled.";
  const messageText = [
    `【课程变更补发｜${label}｜请以本条为准】`,
    greeting,
    `此前发出的${audience}课程提醒已发生变化，请忽略上一条提醒。`,
    "",
    "原安排 / Previous",
    ...(previousLines.length ? previousLines.map((line) => `• ${line}`) : ["• 原安排详情请查看上一条提醒"]),
    "",
    "当前安排 / Current",
    currentBlock,
    "",
    currentLines.length
      ? "请以本条及小程序最新课表为准；如有疑问，请联系教务。 / Please follow this update and the latest miniapp schedule."
      : "目前无需按原时间上课；如后续安排补课，教务会另行通知。 / No class is required at the original time. Any replacement will be announced separately.",
  ].join("\n");
  return { type, label, previousLines, currentLines, messageText };
}

function extractCourseChangeType(messageText: string): CourseChangeType | null {
  const label = messageText.match(/^【课程变更补发｜([^｜]+)｜/m)?.[1];
  if (!label) return null;
  return (Object.keys(courseChangeLabels) as CourseChangeType[]).find((key) => courseChangeLabels[key] === label) ?? null;
}

function extractCurrentScheduleLines(messageText: string) {
  const block = messageText.split("当前安排 / Current")[1]?.split(/\n\s*\n/)[0] ?? "";
  return block.split(/\r?\n/).map((line) => line.replace(/^•\s*/, "").trim()).filter((line) => /^\d{1,2}:\d{2}\s*[–-]\s*\d{1,2}:\d{2}\b/.test(line));
}

function hasSameReminderSchedule(existingText: string, nextText: string) {
  const existingLines = reminderScheduleLines(existingText);
  const nextLines = reminderScheduleLines(nextText);
  return existingLines.length > 0 && JSON.stringify(existingLines) === JSON.stringify(nextLines);
}

function compact(value: string, max = 260) {
  const text = String(value ?? "").replace(/\s+/g, " ").trim();
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

function courseLabel(session: any) {
  return [session.class.course?.name, session.class.subject?.name, session.class.level?.name].filter(Boolean).join(" / ");
}

function teacherSalutation(name: string) {
  const value = name.trim();
  return value.endsWith("老师") ? value : `${value}老师`;
}

function locationLabel(session: any) {
  if (session.class.campus?.isOnline) return "线上课程 / Online";
  return [session.class.campus?.name, session.class.room?.name].filter(Boolean).join(" · ") || "待确认 / To confirm";
}

async function primaryParentLink(studentId: string) {
  return prisma.parentStudentLink.findFirst({
    where: { studentId, parent: { status: "ACTIVE" } },
    include: { parent: { select: { id: true, name: true, phone: true } } },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

async function upsertCommunicationTask(input: {
  taskKey: string;
  kind: string;
  status: string;
  priority?: string;
  studentId?: string | null;
  sessionId?: string | null;
  feedbackId?: string | null;
  teacherId?: string | null;
  parentId?: string | null;
  title: string;
  messageText: string;
  templateCode?: string | null;
  templateVersion?: number | null;
  templateVariables?: Prisma.InputJsonValue;
  dueAt?: Date | null;
  ownerName?: string | null;
  wechatGroupName?: string | null;
  presentationOnlyIfBodyUnchanged?: boolean;
  forceCourseCancelled?: boolean;
}) {
  const { presentationOnlyIfBodyUnchanged = false, forceCourseCancelled = false, ...taskData } = input;
  const contentFingerprint = fingerprint(input.messageText);
  const existing = await prisma.parentCommunicationTask.findUnique({ where: { taskKey: input.taskKey } });
  if (!existing) {
    return prisma.parentCommunicationTask.create({
      data: { ...taskData, priority: input.priority ?? "NORMAL", contentFingerprint },
    });
  }
  if (existing.contentFingerprint === contentFingerprint) {
    if (!existing.manualSentAt && existing.status !== input.status) {
      return prisma.parentCommunicationTask.update({ where: { id: existing.id }, data: { status: input.status, note: input.status === "PENDING_REVIEW" ? null : existing.note } });
    }
    return existing;
  }

  if (
    presentationOnlyIfBodyUnchanged &&
    hasSameReminderSchedule(existing.messageText, input.messageText)
  ) {
    return prisma.parentCommunicationTask.update({
      where: { id: existing.id },
      data: { title: input.title, messageText: input.messageText, contentFingerprint, dueAt: input.dueAt ?? existing.dueAt, templateCode: input.templateCode, templateVersion: input.templateVersion, templateVariables: input.templateVariables ?? undefined },
    });
  }

  if (existing.manualSentAt || existing.status === "COMPLETED") {
    const correctionKey = `${input.taskKey}:correction:${contentFingerprint.slice(0, 12)}`;
    const feedbackRevision = input.kind === "FEEDBACK";
    const existingCorrection = await prisma.parentCommunicationTask.findUnique({ where: { taskKey: correctionKey } });
    const courseChange = feedbackRevision ? null : buildCourseChangeMessage({
      kind: input.kind,
      previousMessageText: existing.messageText,
      currentMessageText: input.messageText,
      forceCancelled: forceCourseCancelled,
    });
    const renderedCourseChange = courseChange && input.kind === "COURSE_REMINDER_PARENT"
      ? await renderPublishedCommunicationTemplate("COURSE_CHANGE", {
          changeLabel: courseChange.label,
          parentName: recipientGreeting(input.messageText || existing.messageText, input.kind).replace(/[，,]$/, ""),
          previousSchedule: courseChange.previousLines.length ? courseChange.previousLines.map((line) => `• ${line}`).join("\n") : "• 原安排详情请查看上一条提醒",
          currentSchedule: courseChange.currentLines.length ? courseChange.currentLines.map((line) => `• ${line}`).join("\n") : "• 该课程已取消，暂无替代课程。 / This class has been cancelled.",
        })
      : null;
    await prisma.parentCommunicationTask.update({
      where: { id: existing.id },
      data: { supersededAt: existing.supersededAt ?? new Date() },
    });
    return prisma.parentCommunicationTask.upsert({
      where: { taskKey: correctionKey },
      create: {
        ...taskData,
        taskKey: correctionKey,
        kind: feedbackRevision ? "FEEDBACK" : "COURSE_CHANGE",
        status: feedbackRevision ? input.status : "ATTENTION",
        priority: "HIGH",
        title: feedbackRevision ? `【反馈修订】${input.title}` : `【${courseChange!.label}】${input.title}`,
        messageText: feedbackRevision ? input.messageText : renderedCourseChange?.messageText ?? courseChange!.messageText,
        contentFingerprint,
        correctionOfTaskId: existing.id,
        templateCode: feedbackRevision ? input.templateCode : renderedCourseChange?.template.code,
        templateVersion: feedbackRevision ? input.templateVersion : renderedCourseChange?.template.version,
        templateVariables: feedbackRevision ? input.templateVariables : renderedCourseChange?.variables as Prisma.InputJsonValue | undefined,
      },
      update: {
        title: feedbackRevision ? `【反馈修订】${input.title}` : `【${courseChange!.label}】${input.title}`,
        messageText: feedbackRevision ? input.messageText : renderedCourseChange?.messageText ?? courseChange!.messageText,
        contentFingerprint,
        status: existingCorrection?.manualSentAt || existingCorrection?.status === "COMPLETED" ? "COMPLETED" : feedbackRevision ? input.status : "ATTENTION",
        priority: "HIGH",
        templateCode: feedbackRevision ? input.templateCode : renderedCourseChange?.template.code,
        templateVersion: feedbackRevision ? input.templateVersion : renderedCourseChange?.template.version,
        templateVariables: feedbackRevision ? input.templateVariables : renderedCourseChange?.variables as Prisma.InputJsonValue | undefined,
      },
    });
  }

  return prisma.parentCommunicationTask.update({
    where: { id: existing.id },
    data: {
      title: input.title,
      messageText: input.messageText,
      contentFingerprint,
      templateCode: input.templateCode,
      templateVersion: input.templateVersion,
      templateVariables: input.templateVariables ?? undefined,
      dueAt: input.dueAt ?? existing.dueAt,
      parentId: input.parentId ?? existing.parentId,
      wechatGroupName: input.wechatGroupName ?? existing.wechatGroupName,
      ownerName: existing.ownerName ?? input.ownerName ?? null,
      status: existing.status === "RETURNED" && input.status === "RETURNED" ? existing.status : input.status,
    },
  });
}

export async function ensureFeedbackCommunicationTasks(feedbackId: string) {
  const feedback = await prisma.sessionFeedback.findUnique({
    where: { id: feedbackId },
    include: {
      teacher: { select: { name: true } },
      session: {
        include: {
          student: true,
          attendances: { select: { studentId: true, status: true } },
          class: {
            include: {
              course: true,
              subject: true,
              level: true,
              campus: true,
              room: true,
              oneOnOneStudent: true,
              enrollments: { include: { student: true } },
            },
          },
        },
      },
    },
  });
  if (!feedback || feedback.isProxyDraft || feedback.status === "PROXY_DRAFT") return [];

  const students = getVisibleSessionStudents(feedback.session);
  const messageContent = feedback.reviewStatus === "PENDING_REVIEW" ? feedback.content : feedback.parentContent || feedback.content;
  return Promise.all(students.map(async (student) => {
    const link = await primaryParentLink(student.id);
    const rendered = await renderPublishedCommunicationTemplate("FEEDBACK_PUBLISHED", {
      parentName: link?.parent.name || "家长", studentName: student.name || "孩子", courseName: courseLabel(feedback.session),
      sessionTime: formatBusinessDateTime(feedback.session.startAt), teacherName: feedback.teacher.name, feedbackSummary: compact(messageContent),
    });
    return upsertCommunicationTask({
      taskKey: `FEEDBACK:${feedback.id}:${student.id}`,
      kind: "FEEDBACK",
      status: feedback.reviewStatus === "RETURNED" ? "RETURNED" : feedback.reviewStatus === "PUBLISHED" && feedback.publishedAt ? "READY_TO_SEND" : "PENDING_REVIEW",
      studentId: student.id,
      sessionId: feedback.sessionId,
      feedbackId: feedback.id,
      teacherId: feedback.teacherId,
      parentId: link?.parentId ?? null,
      title: `${student.name || "学员"} · ${courseLabel(feedback.session)}课后反馈`,
      messageText: rendered.messageText,
      templateCode: rendered.template.code,
      templateVersion: rendered.template.version,
      templateVariables: rendered.variables as Prisma.InputJsonValue,
      dueAt: new Date(feedback.submittedAt.getTime() + 24 * 60 * 60 * 1000),
      ownerName: link?.communicationOwner ?? null,
      wechatGroupName: link?.wechatGroupName ?? null,
    });
  }));
}

async function syncFeedbackTasks() {
  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const rows = await prisma.sessionFeedback.findMany({
    where: { submittedAt: { gte: since }, isProxyDraft: false, status: { not: "PROXY_DRAFT" }, reviewStatus: { in: ["PENDING_REVIEW", "RETURNED"] } },
    select: { id: true },
    orderBy: { submittedAt: "desc" },
    take: 1000,
  });
  for (const row of rows) await ensureFeedbackCommunicationTasks(row.id);
  return rows.length;
}

type CommunicationReminderRange = {
  start: Date;
  end: Date;
  date: string;
  isToday: boolean;
};

export function communicationReminderRanges(now = new Date()): CommunicationReminderRange[] {
  const today = formatBusinessDateOnly(now);
  const startToday = parseBusinessDateStart(today)!;
  const endToday = new Date(startToday.getTime() + 24 * 60 * 60 * 1000 - 1);
  const startTomorrow = new Date(endToday.getTime() + 1);
  return [
    { start: startToday, end: endToday, date: today, isToday: true },
    {
      start: startTomorrow,
      end: new Date(startTomorrow.getTime() + 24 * 60 * 60 * 1000 - 1),
      date: formatBusinessDateOnly(startTomorrow),
      isToday: false,
    },
  ];
}

export function buildParentCourseReminderMessage(input: {
  parentName?: string | null;
  dateLabel: string;
  students: Array<{ name: string | null; lines: string[] }>;
}) {
  const multipleStudents = input.students.length > 1;
  const lines = input.students.flatMap((student) =>
    student.lines.map((line) => multipleStudents ? `【${student.name || "学员"}】${line}` : line)
  );
  const subject = multipleStudents
    ? "您家孩子"
    : input.students[0]?.name || "孩子";
  return [
    `${input.parentName || "家长"}您好，温馨提醒，${subject}在${input.dateLabel}的课程如下，请进入家长小程序查看完整课表：`,
    ...lines,
    "如时间或安排有变化，请及时联系我们。 / Please contact us promptly if anything changes.",
  ].join("\n");
}

async function syncReminderRange(range: CommunicationReminderRange, now: Date) {
  const sessions = await prisma.session.findMany({
    where: { startAt: { gte: range.start, lte: range.end } },
    include: {
      teacher: { select: { id: true, name: true } },
      student: true,
      attendances: { select: { studentId: true, status: true } },
      class: {
        include: {
          teacher: { select: { id: true, name: true } }, course: true, subject: true, level: true,
          campus: true, room: true, oneOnOneStudent: true, enrollments: { include: { student: true } },
        },
      },
    },
    orderBy: { startAt: "asc" },
    take: 1500,
  });

  const byStudent = new Map<string, { student: { id: string; name: string | null }; sessions: any[] }>();
  const byTeacher = new Map<string, { teacher: { id: string; name: string }; sessions: any[] }>();
  for (const session of sessions) {
    for (const student of getVisibleSessionStudents(session)) {
      const entry = byStudent.get(student.id) ?? { student, sessions: [] };
      entry.sessions.push(session);
      byStudent.set(student.id, entry);
    }
    const teacher = session.teacher ?? session.class.teacher;
    const teacherEntry = byTeacher.get(teacher.id) ?? { teacher, sessions: [] };
    teacherEntry.sessions.push(session);
    byTeacher.set(teacher.id, teacherEntry);
  }

  const priorTasks = await prisma.parentCommunicationTask.findMany({
    where: {
      OR: [
        { taskKey: { startsWith: `COURSE_PARENT:${range.date}:` } },
        { taskKey: { startsWith: `COURSE_TEACHER:${range.date}:` } },
      ],
      correctionOfTaskId: null,
    },
  });
  const priorParentTasks = priorTasks.filter((task) => task.kind === "COURSE_REMINDER_PARENT");
  const priorTeacherTasks = priorTasks.filter((task) => task.kind === "COURSE_REMINDER_TEACHER");

  const studentIds = Array.from(byStudent.keys());
  const links = studentIds.length
    ? await prisma.parentStudentLink.findMany({
        where: { studentId: { in: studentIds }, parent: { status: "ACTIVE" } },
        include: { parent: { select: { id: true, name: true, phone: true } } },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
      })
    : [];
  const linkByStudent = new Map<string, (typeof links)[number]>();
  for (const link of links) {
    if (!linkByStudent.has(link.studentId)) linkByStudent.set(link.studentId, link);
  }

  type StudentBundle = { student: { id: string; name: string | null }; sessions: any[]; link: (typeof links)[number] | null };
  type ParentBundle = {
    parentId: string | null;
    parentName: string | null;
    ownerName: string | null;
    wechatGroupName: string | null;
    students: StudentBundle[];
  };
  const grouped = new Map<string, ParentBundle>();
  for (const entry of byStudent.values()) {
    const link = linkByStudent.get(entry.student.id) ?? null;
    if (link?.manualReminderEnabled === false) continue;
    const groupKey = link ? `PARENT:${link.parentId}` : `STUDENT:${entry.student.id}`;
    const group = grouped.get(groupKey) ?? {
      parentId: link?.parentId ?? null,
      parentName: link?.parent.name ?? null,
      ownerName: link?.communicationOwner ?? null,
      wechatGroupName: link?.wechatGroupName ?? null,
      students: [],
    };
    group.ownerName ||= link?.communicationOwner ?? null;
    group.wechatGroupName ||= link?.wechatGroupName ?? null;
    group.students.push({ ...entry, link });
    grouped.set(groupKey, group);
  }

  let count = 0;
  const activeParentKeys = new Set<string>();
  for (const group of grouped.values()) {
    const familyKey = group.parentId ? `COURSE_PARENT:${range.date}:PARENT:${group.parentId}` : null;
    const existingFamilyTask = familyKey ? priorParentTasks.find((task) => task.taskKey === familyKey) : null;
    const legacySent = group.students.some(({ student }) =>
      priorParentTasks.some((task) => task.studentId === student.id && task.manualSentAt && task.taskKey !== familyKey)
    );
    const entries = group.students.length > 1 && (existingFamilyTask || !legacySent)
      ? [{ students: group.students, taskKey: familyKey! }]
      : group.students.map((student) => ({ students: [student], taskKey: `COURSE_PARENT:${range.date}:${student.student.id}` }));

    for (const entry of entries) {
      const existing = priorParentTasks.find((task) => task.taskKey === entry.taskKey) ?? null;
      const allSessions = entry.students.flatMap((student) => student.sessions);
      const futureSessions = allSessions.filter((session) => session.startAt.getTime() > now.getTime());
      const sessionsForMessage = range.isToday && !existing ? futureSessions : allSessions;
      if (!sessionsForMessage.length) {
        if (existing) activeParentKeys.add(existing.taskKey);
        continue;
      }
      const firstSession = sessionsForMessage.slice().sort((a, b) => a.startAt.getTime() - b.startAt.getTime())[0];
      const fullDateLabel = formatBusinessDateWithWeekday(firstSession.startAt);
      const shortDateLabel = formatBusinessDateWithWeekday(firstSession.startAt, { short: true });
      const reminderStudents = entry.students
        .map(({ student, sessions: studentSessions }) => ({
          name: student.name,
          lines: (range.isToday && !existing ? studentSessions.filter((session) => session.startAt.getTime() > now.getTime()) : studentSessions)
            .sort((a, b) => a.startAt.getTime() - b.startAt.getTime())
            .map((session) => `${formatBusinessTimeOnly(session.startAt)}–${formatBusinessTimeOnly(session.endAt)} ${courseLabel(session)} · ${session.teacher?.name || session.class.teacher.name} · ${locationLabel(session)}`),
        }))
        .filter((student) => student.lines.length > 0);
      if (!reminderStudents.length) continue;
      const names = reminderStudents.map((student) => student.name || "学员").join("、");
      activeParentKeys.add(entry.taskKey);
      const rendered = await renderPublishedCommunicationTemplate("COURSE_REMINDER", {
        parentName: group.parentName || "家长",
        subjectName: reminderStudents.length > 1 ? "您家孩子" : reminderStudents[0]?.name || "孩子",
        dateLabel: fullDateLabel,
        scheduleLines: reminderStudents.flatMap((student) => student.lines.map((line) => reminderStudents.length > 1 ? `【${student.name || "学员"}】${line}` : line)).join("\n"),
      });
      await upsertCommunicationTask({
        taskKey: entry.taskKey,
        kind: "COURSE_REMINDER_PARENT",
        status: "READY_TO_SEND",
        priority: range.isToday ? "HIGH" : "NORMAL",
        studentId: entry.students[0]?.student.id ?? null,
        sessionId: sessionsForMessage.length === 1 ? sessionsForMessage[0].id : null,
        parentId: group.parentId,
        title: `${names} · ${shortDateLabel}家长课程提醒`,
        messageText: rendered.messageText,
        templateCode: rendered.template.code,
        templateVersion: rendered.template.version,
        templateVariables: rendered.variables as Prisma.InputJsonValue,
        dueAt: range.isToday ? now : range.start,
        ownerName: group.ownerName,
        wechatGroupName: group.wechatGroupName,
        presentationOnlyIfBodyUnchanged: true,
      });
      count += 1;

      if (entry.students.length > 1) {
        const absorbedIds = new Set(entry.students.map((student) => student.student.id));
        for (const legacy of priorParentTasks) {
          if (legacy.taskKey === entry.taskKey || !legacy.studentId || !absorbedIds.has(legacy.studentId)) continue;
          activeParentKeys.add(legacy.taskKey);
          if (!legacy.manualSentAt && legacy.status !== "COMPLETED" && legacy.status !== "WAIVED") {
            await prisma.parentCommunicationTask.update({
              where: { id: legacy.id },
              data: { status: "WAIVED", note: "已合并到同一家长的家庭课程提醒。", completedAt: now, supersededAt: now },
            });
          }
        }
      }
    }
  }

  const activeTeacherKeys = new Set<string>();
  for (const { teacher, sessions: teacherSessions } of byTeacher.values()) {
    const taskKey = `COURSE_TEACHER:${range.date}:${teacher.id}`;
    const existing = priorTeacherTasks.find((task) => task.taskKey === taskKey) ?? null;
    const sessionsForMessage = range.isToday && !existing
      ? teacherSessions.filter((session) => session.startAt.getTime() > now.getTime())
      : teacherSessions;
    if (!sessionsForMessage.length) {
      if (existing) activeTeacherKeys.add(taskKey);
      continue;
    }
    const fullDateLabel = formatBusinessDateWithWeekday(sessionsForMessage[0].startAt);
    const shortDateLabel = formatBusinessDateWithWeekday(sessionsForMessage[0].startAt, { short: true });
    const lines = sessionsForMessage.map((session) => {
      const names = getVisibleSessionStudents(session).map((item) => item.name).filter(Boolean).join("、") || "待确认学生";
      return `${formatBusinessTimeOnly(session.startAt)}–${formatBusinessTimeOnly(session.endAt)} ${courseLabel(session)} · ${names} · ${locationLabel(session)}`;
    });
    activeTeacherKeys.add(taskKey);
    await upsertCommunicationTask({
      taskKey,
      kind: "COURSE_REMINDER_TEACHER",
      status: "READY_TO_SEND",
      teacherId: teacher.id,
      title: `${teacher.name} · ${shortDateLabel}课程确认`,
      messageText: [
        `${teacherSalutation(teacher.name)}您好，${fullDateLabel}的课程如下，请进入员工小程序或网页版老师端核对并确认：`,
        "https://sgtmanage.com/teacher",
        ...lines,
        "如有时间、学生或地点问题，请立即联系教务。 / Please contact Academic Operations immediately if any detail is incorrect.",
      ].join("\n"),
      dueAt: range.isToday ? now : range.start,
      priority: range.isToday ? "HIGH" : "NORMAL",
      presentationOnlyIfBodyUnchanged: true,
    });
    count += 1;
  }

  for (const prior of priorTasks) {
    const active = prior.kind === "COURSE_REMINDER_PARENT" ? activeParentKeys.has(prior.taskKey) : activeTeacherKeys.has(prior.taskKey);
    if (active) continue;
    if (prior.manualSentAt) {
      await upsertCommunicationTask({
        taskKey: prior.taskKey,
        kind: prior.kind,
        status: "ATTENTION",
        priority: "HIGH",
        studentId: prior.studentId,
        teacherId: prior.teacherId,
        parentId: prior.parentId,
        title: prior.title,
        messageText: "原定课程已经取消、改期或不再适用，请忽略上一条提醒。新的课程安排请以家长/员工小程序为准。 / The previous reminder is no longer valid. Please refer to the latest schedule in the miniapp.",
        dueAt: prior.dueAt,
        ownerName: prior.ownerName,
        wechatGroupName: prior.wechatGroupName,
        forceCourseCancelled: true,
      });
    } else {
      await prisma.parentCommunicationTask.update({ where: { id: prior.id }, data: { status: "WAIVED", note: "原课程已取消、改期或不再属于当前提醒范围。", completedAt: now, supersededAt: now } });
    }
  }
  return count;
}

async function syncCourseReminderTasks() {
  const now = new Date();
  let count = 0;
  for (const range of communicationReminderRanges(now)) count += await syncReminderRange(range, now);
  return count;
}

async function refreshLegacyCourseChangeTasks() {
  const legacyRows = await prisma.parentCommunicationTask.findMany({
    where: { kind: "COURSE_CHANGE", status: { in: OPEN_STATUSES }, correctionOfTaskId: { not: null } },
    orderBy: { createdAt: "asc" },
    take: 500,
  });
  let count = 0;
  for (const row of legacyRows) {
    if (extractCourseChangeType(row.messageText)) continue;
    const source = await prisma.parentCommunicationTask.findUnique({ where: { id: row.correctionOfTaskId! } });
    if (!source) continue;
    const courseChange = buildCourseChangeMessage({
      kind: source.kind,
      previousMessageText: source.messageText,
      currentMessageText: row.messageText,
      forceCancelled: true,
    });
    await prisma.parentCommunicationTask.update({
      where: { id: row.id },
      data: {
        title: row.title.replace(/^【更正通知】/, `【${courseChange.label}】`),
        messageText: courseChange.messageText,
      },
    });
    count += 1;
  }
  return count;
}

export async function syncParentCommunicationCenter(actor?: CommunicationActor) {
  const [feedbackCount, reminderCount] = await Promise.all([syncFeedbackTasks(), syncCourseReminderTasks()]);
  const legacyCourseChangeCount = await refreshLegacyCourseChangeTasks();
  if (actor) {
    await logAudit({
      actor,
      module: "COMMUNICATION",
      action: "SYNC_COMMUNICATION_TASKS",
      entityType: "ParentCommunicationTask",
      meta: { feedbackCount, reminderCount, legacyCourseChangeCount },
    });
  }
  return { feedbackCount, reminderCount, legacyCourseChangeCount };
}

export async function listParentCommunicationTasks(input: { status?: string; kind?: string; limit?: number }) {
  const where: Prisma.ParentCommunicationTaskWhereInput = {};
  if (input.status && input.status !== "ALL") {
    where.status = input.status === "OPEN" ? { in: OPEN_STATUSES } : input.status;
  }
  if (input.kind && input.kind !== "ALL") where.kind = input.kind;
  const limit = Math.min(Math.max(input.limit ?? 200, 1), 500);
  const [rows, summaryRows, kindStatusRows, staff] = await Promise.all([
    prisma.parentCommunicationTask.findMany({ where, orderBy: [{ priority: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }], take: limit }),
    prisma.parentCommunicationTask.groupBy({ by: ["status"], _count: { _all: true } }),
    prisma.parentCommunicationTask.groupBy({ by: ["kind", "status"], _count: { _all: true } }),
    prisma.user.findMany({
      where: { role: { in: ["ADMIN", "CS"] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);
  const studentIds = Array.from(new Set(rows.map((row) => row.studentId).filter((id): id is string => Boolean(id))));
  const teacherIds = Array.from(new Set(rows.map((row) => row.teacherId).filter((id): id is string => Boolean(id))));
  const feedbackIds = Array.from(new Set(rows.map((row) => row.feedbackId).filter((id): id is string => Boolean(id))));
  const sessionIds = Array.from(new Set(rows.map((row) => row.sessionId).filter((id): id is string => Boolean(id))));
  const correctionSourceIds = Array.from(new Set(rows.map((row) => row.correctionOfTaskId).filter((id): id is string => Boolean(id))));
  const [students, teachers, sessions, feedbacks, auditRows, notificationRows] = await Promise.all([
    prisma.student.findMany({ where: { id: { in: studentIds } }, select: { id: true, name: true, school: true, grade: true } }),
    prisma.teacher.findMany({ where: { id: { in: teacherIds } }, select: { id: true, name: true } }),
    prisma.session.findMany({ where: { id: { in: sessionIds } }, select: { id: true, startAt: true, endAt: true } }),
    prisma.sessionFeedback.findMany({ where: { id: { in: feedbackIds } }, select: { id: true, sessionId: true, content: true, parentContent: true, classPerformance: true, homework: true, previousHomeworkDone: true, actualStartAt: true, actualEndAt: true, reviewStatus: true, reviewNote: true, publishedAt: true, submittedAt: true, attachments: { orderBy: { createdAt: "asc" } } } }),
    prisma.auditLog.findMany({ where: { entityType: "ParentCommunicationTask", entityId: { in: rows.map((row) => row.id) } }, select: { entityId: true, action: true, actorName: true, actorEmail: true, actorRole: true, createdAt: true, meta: true }, orderBy: { createdAt: "desc" }, take: 1500 }),
    prisma.miniappNotificationOutbox.findMany({
      where: {
        createdAt: { gte: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000) },
        OR: [{ targetType: "SessionFeedback", studentId: { in: studentIds } }, { studentId: { in: studentIds }, templateKey: "course_reminder_24h" }],
      },
      select: { id: true, studentId: true, targetId: true, templateKey: true, status: true, scheduledAt: true, sentAt: true, error: true, payloadJson: true },
      take: 3000,
    }),
  ]);
  const correctionSources = correctionSourceIds.length
    ? await prisma.parentCommunicationTask.findMany({ where: { id: { in: correctionSourceIds } } })
    : [];
  const correctionSourceMap = new Map(correctionSources.map((row) => [row.id, row]));
  const correctionSessionIds = Array.from(new Set(correctionSources.map((row) => row.sessionId).filter((id): id is string => Boolean(id))));
  const correctionSourceAudits = correctionSessionIds.length
    ? await prisma.auditLog.findMany({
      where: { entityType: "Session", entityId: { in: correctionSessionIds } },
      select: { entityId: true, action: true, actorName: true, actorEmail: true, createdAt: true },
      orderBy: { createdAt: "desc" },
      take: 1000,
    })
    : [];
  const correctionSourceAuditMap = new Map<string, (typeof correctionSourceAudits)[number]>();
  for (const audit of correctionSourceAudits) {
    if (audit.entityId && !correctionSourceAuditMap.has(audit.entityId)) correctionSourceAuditMap.set(audit.entityId, audit);
  }
  const studentMap = new Map(students.map((row) => [row.id, row]));
  const teacherMap = new Map(teachers.map((row) => [row.id, row]));
  const sessionMap = new Map(sessions.map((row) => [row.id, row]));
  const feedbackMap = new Map(feedbacks.map((row) => [row.id, row]));
  const historyMap = new Map<string, typeof auditRows>();
  for (const audit of auditRows) {
    if (!audit.entityId) continue;
    const list = historyMap.get(audit.entityId) ?? [];
    if (list.length < 20) list.push(audit);
    historyMap.set(audit.entityId, list);
  }
  function automaticSummary(row: (typeof rows)[number]) {
    const matches = notificationRows.filter((notification) => {
      if (row.feedbackId) return notification.targetId === row.feedbackId || notification.targetId?.startsWith(`${row.feedbackId}:revision:`) === true;
      if (row.kind !== "COURSE_REMINDER_PARENT" || !row.studentId || notification.studentId !== row.studentId || !row.dueAt) return false;
      const payload = notification.payloadJson && typeof notification.payloadJson === "object" ? notification.payloadJson as any : {};
      const startAt = payload.startAt ? new Date(String(payload.startAt)) : null;
      return Boolean(startAt && !Number.isNaN(startAt.getTime()) && formatBusinessDateOnly(startAt) === formatBusinessDateOnly(row.dueAt));
    });
    const counts = matches.reduce<Record<string, number>>((acc, notification) => { acc[notification.status] = (acc[notification.status] || 0) + 1; return acc; }, {});
    const status = counts.FAILED ? "FAILED" : counts.SENT ? "SENT" : counts.PENDING ? "PENDING" : counts.PROCESSING ? "PROCESSING" : counts.SKIPPED ? "SKIPPED" : "NOT_QUEUED";
    return { status, counts, total: matches.length };
  }
  return {
    tasks: rows.map((row) => {
      const session = row.sessionId ? sessionMap.get(row.sessionId) ?? null : null;
      const taskDate = session?.startAt ?? row.dueAt;
      const feedback = row.feedbackId ? feedbackMap.get(row.feedbackId) ?? null : null;
      const sections = feedback ? parseParentFeedbackSections(feedback.classPerformance || feedback.content) : null;
      const missingSections = feedback ? getMissingParentFeedbackSections(feedback.parentContent || feedback.content) : [];
      const homeworkMissing = Boolean(feedback && !String(feedback.homework ?? "").trim());
      const previousHomeworkMissing = Boolean(feedback && feedback.previousHomeworkDone === null);
      const correctionSource = row.correctionOfTaskId ? correctionSourceMap.get(row.correctionOfTaskId) ?? null : null;
      const parsedChangeType = row.kind === "COURSE_CHANGE" ? extractCourseChangeType(row.messageText) : null;
      const correctionAudit = correctionSource?.sessionId ? correctionSourceAuditMap.get(correctionSource.sessionId) ?? null : null;
      const correction = correctionSource && row.kind === "COURSE_CHANGE" ? {
        type: parsedChangeType ?? "CANCELLED",
        typeLabel: courseChangeLabels[parsedChangeType ?? "CANCELLED"],
        previousLines: reminderScheduleLines(correctionSource.messageText),
        currentLines: parsedChangeType ? extractCurrentScheduleLines(row.messageText) : [],
        noReplacement: !parsedChangeType || extractCurrentScheduleLines(row.messageText).length === 0,
        reason: correctionSource.manualSentAt
          ? "上一条课程提醒已经人工发出，之后课程安排发生变化，所以必须补发本条，避免家长或老师继续按旧安排上课。"
          : "上一条课程提醒已经完成发送，之后课程安排发生变化，所以必须补发本条。",
        originalSentAt: correctionSource.manualSentAt?.toISOString() ?? null,
        originalSentByName: correctionSource.manualSentByName,
        originalChannel: correctionSource.manualChannel,
        originalGroupName: correctionSource.wechatGroupName,
        changedAt: correctionAudit?.createdAt.toISOString() ?? row.createdAt.toISOString(),
        changedByName: correctionAudit?.actorName || correctionAudit?.actorEmail || null,
        changeAction: correctionAudit?.action || null,
      } : null;
      return ({
      ...row,
      dateLabel: taskDate ? formatBusinessDateWithWeekday(taskDate) : null,
      shortDateLabel: taskDate ? formatBusinessDateWithWeekday(taskDate, { short: true }) : null,
      dueAt: row.dueAt?.toISOString() ?? null,
      claimedAt: row.claimedAt?.toISOString() ?? null,
      publishedAt: row.publishedAt?.toISOString() ?? null,
      copiedAt: row.copiedAt?.toISOString() ?? null,
      manualSentAt: row.manualSentAt?.toISOString() ?? null,
      completedAt: row.completedAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      student: row.studentId ? studentMap.get(row.studentId) ?? null : null,
      teacher: row.teacherId ? teacherMap.get(row.teacherId) ?? null : null,
      feedback: feedback ? {
        ...feedback,
        actualStartAt: feedback.actualStartAt?.toISOString() ?? null,
        actualEndAt: feedback.actualEndAt?.toISOString() ?? null,
        sections,
        attachments: feedback.attachments.map((attachment) => feedbackAttachmentDto(
          attachment,
          `/api/miniapp/staff/schedule/${encodeURIComponent(feedback.sessionId)}/feedback/attachments/${encodeURIComponent(attachment.id)}`,
        )),
        completeness: {
          complete: missingSections.length === 0 && !homeworkMissing && !previousHomeworkMissing,
          completed: 7 - missingSections.length - (homeworkMissing ? 1 : 0) - (previousHomeworkMissing ? 1 : 0),
          total: 7,
          missing: [...missingSections, ...(homeworkMissing ? ["课后作业 / Homework"] : []), ...(previousHomeworkMissing ? ["上次作业完成情况 / Previous homework"] : [])],
        },
      } : null,
      history: (historyMap.get(row.id) ?? []).map((audit) => ({ ...audit, createdAt: audit.createdAt.toISOString() })),
      automaticNotification: automaticSummary(row),
      correction,
    });}),
    summary: summaryRows.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all;
      return acc;
    }, {}),
    kindSummary: kindStatusRows.reduce<Record<string, number>>((acc, row) => {
      if (OPEN_STATUSES.includes(row.status)) acc[row.kind] = (acc[row.kind] || 0) + row._count._all;
      return acc;
    }, {}),
    kindStatusSummary: kindStatusRows.reduce<Record<string, Record<string, number>>>((acc, row) => {
      acc[row.kind] = acc[row.kind] || {};
      acc[row.kind][row.status] = row._count._all;
      return acc;
    }, {}),
    staff,
  };
}

async function auditTask(actor: CommunicationActor, action: string, taskId: string, meta?: Prisma.JsonValue) {
  await logAudit({ actor, module: "COMMUNICATION", action, entityType: "ParentCommunicationTask", entityId: taskId, meta });
}

export async function updateParentCommunicationTask(input: {
  id: string;
  action: string;
  actor: CommunicationActor;
  data?: Record<string, unknown>;
}) {
  const task = await prisma.parentCommunicationTask.findUnique({ where: { id: input.id } });
  if (!task) throw new Error("Communication task not found");
  const now = new Date();
  const data = input.data ?? {};

  if (input.action === "claim") {
    const updated = await prisma.parentCommunicationTask.update({
      where: { id: task.id },
      data: { ownerUserId: input.actor.id, ownerName: input.actor.name, claimedAt: now, status: task.status === "PENDING_REVIEW" ? task.status : "CLAIMED" },
    });
    await auditTask(input.actor, "CLAIM_TASK", task.id, { previousOwner: task.ownerName });
    return updated;
  }

  if (input.action === "share_card") {
    await auditTask(input.actor, "SHARE_MINIAPP_CARD", task.id, {
      kind: task.kind,
      feedbackId: task.feedbackId,
      sessionId: task.sessionId,
      studentId: task.studentId,
      destination: String(data.destination ?? "WECHAT").slice(0, 60),
    });
    return task;
  }

  if (input.action === "transfer") {
    const ownerUserId = String(data.ownerUserId ?? "").trim();
    const owner = await prisma.user.findFirst({ where: { id: ownerUserId, role: { in: ["ADMIN", "CS"] } }, select: { id: true, name: true } });
    if (!owner) throw new Error("Invalid communication owner");
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { ownerUserId: owner.id, ownerName: owner.name, claimedAt: now } });
    await auditTask(input.actor, "TRANSFER_TASK", task.id, { from: task.ownerName, to: owner.name, note: String(data.note ?? "").slice(0, 500) });
    return updated;
  }

  if (input.action === "return_feedback") {
    if (!task.feedbackId) throw new Error("Feedback task required");
    const note = String(data.note ?? "").trim();
    if (!note) throw new Error("Return reason is required");
    await prisma.$transaction([
      prisma.sessionFeedback.update({ where: { id: task.feedbackId }, data: { reviewStatus: "RETURNED", reviewNote: note, reviewedAt: now, reviewedByUserId: input.actor.id, reviewedByName: input.actor.name } }),
      prisma.parentCommunicationTask.updateMany({ where: { feedbackId: task.feedbackId, manualSentAt: null }, data: { status: "RETURNED", note } }),
    ]);
    await auditTask(input.actor, "RETURN_FEEDBACK", task.id, { note });
    return prisma.parentCommunicationTask.findUnique({ where: { id: task.id } });
  }

  if (input.action === "publish_feedback") {
    if (!task.feedbackId) throw new Error("Feedback task required");
    const feedback = await prisma.sessionFeedback.findUnique({ where: { id: task.feedbackId } });
    if (!feedback) throw new Error("Feedback not found");
    const parentContent = String(data.parentContent ?? feedback.parentContent ?? feedback.content).trim();
    if (!parentContent) throw new Error("Parent-facing feedback is required");
    const missingSections = getMissingParentFeedbackSections(parentContent);
    if (missingSections.length) throw new Error(`家长展示版还缺少：${missingSections.join("、")}`);
    if (!String(feedback.homework ?? "").trim()) throw new Error("家长展示版还缺少：课后作业 / Homework");
    if (feedback.previousHomeworkDone === null) throw new Error("家长展示版还缺少：上次作业完成情况 / Previous homework");
    await prisma.$transaction([
      prisma.sessionFeedback.update({
        where: { id: feedback.id },
        data: {
          parentContent, reviewStatus: "PUBLISHED", reviewNote: null,
          reviewedAt: now, reviewedByUserId: input.actor.id, reviewedByName: input.actor.name,
          publishedAt: feedback.publishedAt ?? now, publishedByUserId: input.actor.id, publishedByName: input.actor.name,
        },
      }),
      prisma.parentCommunicationTask.updateMany({
        where: { feedbackId: feedback.id, manualSentAt: null },
        data: { status: "READY_TO_SEND", publishedAt: now, publishedByUserId: input.actor.id, publishedByName: input.actor.name },
      }),
    ]);
    if (feedback.reviewStatus !== "PUBLISHED") {
      await queueFirstPublishedFeedback({
        sessionId: feedback.sessionId,
        feedbackId: feedback.id,
        submittedAt: feedback.submittedAt,
        notificationTargetId: feedback.publishedAt ? `${feedback.id}:revision:${now.getTime()}` : feedback.id,
      }).catch(() => null);
    }
    await ensureFeedbackCommunicationTasks(feedback.id);
    await auditTask(input.actor, "PUBLISH_FEEDBACK", task.id, { before: feedback.parentContent, after: parentContent });
    return prisma.parentCommunicationTask.findUnique({ where: { id: task.id } });
  }

  if (input.action === "copy") {
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { copiedAt: now, copiedByUserId: input.actor.id, copiedByName: input.actor.name } });
    await auditTask(input.actor, "COPY_WECHAT_MESSAGE", task.id, { group: task.wechatGroupName });
    return updated;
  }

  if (input.action === "manual_sent") {
    if (task.kind === "COURSE_CHANGE" && !task.evidenceUrl) {
      throw new Error("课程变更补发必须先上传微信发送截图，再确认已发送");
    }
    const groupName = String(data.wechatGroupName ?? task.wechatGroupName ?? "").trim();
    const note = String(data.note ?? "").trim().slice(0, 1000);
    const channel = String(data.channel ?? (task.kind === "COURSE_REMINDER_TEACHER" ? "WECHAT_DIRECT" : "WECHAT_GROUP")).trim();
    const updated = await prisma.parentCommunicationTask.update({
      where: { id: task.id },
      data: {
        status: "COMPLETED", manualSentAt: now, manualSentByUserId: input.actor.id, manualSentByName: input.actor.name,
        manualChannel: channel, wechatGroupName: groupName || null, note: note || task.note, completedAt: now,
      },
    });
    if (task.studentId && task.parentId && groupName) {
      await prisma.parentStudentLink.updateMany({ where: { studentId: task.studentId, parentId: task.parentId }, data: { wechatGroupName: groupName, communicationOwner: input.actor.name } });
    }
    if (task.kind === "COURSE_REMINDER_PARENT" && task.studentId && task.dueAt) {
      await prisma.todoReminderConfirm.createMany({ data: [{ type: "STUDENT_TOMORROW", targetId: task.studentId, date: task.dueAt }], skipDuplicates: true });
    }
    if (task.kind === "COURSE_REMINDER_TEACHER" && task.teacherId && task.dueAt) {
      await prisma.todoReminderConfirm.createMany({ data: [{ type: "TEACHER_TOMORROW", targetId: task.teacherId, date: task.dueAt }], skipDuplicates: true });
    }
    if (task.feedbackId) {
      const remaining = await prisma.parentCommunicationTask.count({ where: { feedbackId: task.feedbackId, manualSentAt: null, status: { not: "WAIVED" } } });
      if (remaining === 0) {
        await prisma.sessionFeedback.update({ where: { id: task.feedbackId }, data: { forwardedAt: now, forwardedBy: input.actor.name, forwardChannel: channel, forwardNote: note || null } });
      }
    }
    await auditTask(input.actor, "MARK_MANUAL_SENT", task.id, { channel, groupName, note });
    return updated;
  }

  if (input.action === "waive") {
    const note = String(data.note ?? "").trim();
    if (!note) throw new Error("Waive reason is required");
    const updated = await prisma.parentCommunicationTask.update({ where: { id: task.id }, data: { status: "WAIVED", note, completedAt: now } });
    await auditTask(input.actor, "WAIVE_COMMUNICATION_TASK", task.id, { note });
    return updated;
  }

  if (input.action === "retry_auto") {
    const where: Prisma.MiniappNotificationOutboxWhereInput = task.feedbackId
      ? { targetType: "SessionFeedback", targetId: task.feedbackId, status: { in: ["FAILED", "SKIPPED"] } }
      : task.sessionId
        ? { targetType: "Session", targetId: { startsWith: `${task.sessionId}:` }, status: { in: ["FAILED", "SKIPPED"] } }
        : { id: "__none__" };
    const result = await prisma.miniappNotificationOutbox.updateMany({ where, data: { status: "PENDING", scheduledAt: now, sentAt: null, error: null } });
    await auditTask(input.actor, "RETRY_AUTOMATIC_NOTIFICATION", task.id, { count: result.count });
    return { ...task, retryCount: result.count };
  }

  throw new Error("Unsupported communication action");
}

export function communicationTaskStatusLabel(status: string) {
  return ({
    PENDING_REVIEW: "待审核 / Review",
    READY_TO_SEND: "待发微信群 / Send",
    CLAIMED: "处理中 / In progress",
    RETURNED: "已退回老师 / Returned",
    ATTENTION: "需更正 / Correction",
    COMPLETED: "已人工发送 / Sent manually",
    WAIVED: "无需发送 / Waived",
  } as Record<string, string>)[status] || status;
}
