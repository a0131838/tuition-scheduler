import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  buildParentAvailabilityPath,
  hasParentAvailabilityPayloadContent,
  parseParentAvailabilityFormData,
  PARENT_AVAILABILITY_WEEKDAY_OPTIONS,
  summarizeParentAvailabilityPayload,
  type ParentAvailabilityPayload,
} from "@/lib/parent-availability";
import { formatBusinessDateOnly, formatBusinessDateTime } from "@/lib/date-only";
import { composeTicketSituation, parseTicketSituationSummary } from "@/lib/tickets";
import {
  buildSchedulingCoordinationTeacherOptions,
  deriveSchedulingCoordinationParentSubmissionUpdate,
  filterSchedulingSlotsByParentAvailability,
  inferSchedulingCoordinationDurationMin,
  listSchedulingCoordinationCandidateSlots,
} from "@/lib/scheduling-coordination";

function asPayload(value: unknown): ParentAvailabilityPayload {
  const payload = (value ?? {}) as Partial<ParentAvailabilityPayload>;
  return {
    weekdays: Array.isArray(payload.weekdays) ? payload.weekdays.map((item) => String(item)) : [],
    timeRanges: Array.isArray(payload.timeRanges)
      ? payload.timeRanges
          .map((item) => ({
            start: typeof item?.start === "string" ? item.start : "",
            end: typeof item?.end === "string" ? item.end : "",
          }))
          .filter((item) => item.start && item.end)
      : [],
    earliestStartDate: typeof payload.earliestStartDate === "string" ? payload.earliestStartDate : null,
    modePreference: typeof payload.modePreference === "string" ? payload.modePreference : null,
    teacherPreference: typeof payload.teacherPreference === "string" ? payload.teacherPreference : null,
    notes: typeof payload.notes === "string" ? payload.notes : null,
  };
}

async function submitParentAvailability(token: string, formData: FormData) {
  "use server";
  const request = await prisma.parentAvailabilityRequest.findUnique({
    where: { token },
    include: {
      ticket: {
        select: {
          id: true,
          status: true,
          isArchived: true,
          summary: true,
        },
      },
    },
  });
  if (!request || !request.isActive) {
    redirect(`${buildParentAvailabilityPath(token)}?err=unavailable`);
  }
  if (request.expiresAt && request.expiresAt.getTime() < Date.now()) {
    redirect(`${buildParentAvailabilityPath(token)}?err=expired`);
  }
  if (request.ticket.isArchived || ["Completed", "Cancelled"].includes(request.ticket.status)) {
    redirect(`${buildParentAvailabilityPath(token)}?err=closed`);
  }

  const payload = parseParentAvailabilityFormData(formData);
  if (!hasParentAvailabilityPayloadContent(payload)) {
    redirect(`${buildParentAvailabilityPath(token)}?err=empty`);
  }

  const now = new Date();
  const followUpDue = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const [enrollments, teachers] = await Promise.all([
    prisma.enrollment.findMany({
      where: { studentId: request.studentId },
      include: {
        class: {
          include: {
            subject: true,
            level: true,
            teacher: true,
          },
        },
      },
    }),
    prisma.teacher.findMany({ include: { subjects: true }, orderBy: { name: "asc" } }),
  ]);
  const teacherOptions = buildSchedulingCoordinationTeacherOptions({ enrollments, teachers });
  const classIds = enrollments.map((item) => item.classId);
  const futureEnd = new Date(now);
  futureEnd.setDate(futureEnd.getDate() + 60);
  const relevantSessions = classIds.length
    ? await prisma.session.findMany({
        where: {
          classId: { in: classIds },
          startAt: { gte: now, lt: futureEnd },
          OR: [{ studentId: null }, { studentId: request.studentId }],
        },
        select: { startAt: true, endAt: true },
        orderBy: { startAt: "asc" },
      })
    : [];
  const durationMin = inferSchedulingCoordinationDurationMin({
    upcomingSessions: relevantSessions,
    monthlySessions: relevantSessions,
  });
  const searchStart = payload.earliestStartDate ? new Date(`${payload.earliestStartDate}T00:00:00`) : now;
  const availabilitySlots = teacherOptions.length
    ? await listSchedulingCoordinationCandidateSlots({
        studentId: request.studentId,
        teacherOptions,
        startAt: searchStart,
        durationMin,
        maxSlots: 12,
      })
    : [];
  const matchedSlotCount = filterSchedulingSlotsByParentAvailability(availabilitySlots, payload).length;
  const coordinationUpdate = deriveSchedulingCoordinationParentSubmissionUpdate({
    currentStatus: request.ticket.status,
    matchedSlotCount,
  });
  const previousSummary = parseTicketSituationSummary(request.ticket.summary);
  const requiredAction = [
    `Parent availability summary:
${summarizeParentAvailabilityPayload(payload)}`,
    coordinationUpdate.nextAction,
  ]
    .filter(Boolean)
    .join("\n\n");

  await prisma.$transaction([
    prisma.parentAvailabilityRequest.update({
      where: { token },
      data: {
        payloadJson: payload,
        submittedAt: now,
      },
    }),
    prisma.ticket.update({
      where: { id: request.ticketId },
      data: {
        parentAvailability: coordinationUpdate.parentAvailabilitySummary,
        status: coordinationUpdate.status,
        nextAction: coordinationUpdate.nextAction,
        nextActionDue: followUpDue,
        lastUpdateAt: now,
        summary: composeTicketSituation({
          currentIssue:
            previousSummary.currentIssue ||
            "Need to coordinate lesson times with the parent using the teacher's submitted availability as the default scheduling source.",
          requiredAction,
          latestDeadlineText: formatBusinessDateTime(followUpDue),
        }),
      },
    }),
  ]);

  revalidatePath("/admin/tickets");
  revalidatePath(`/admin/tickets/${request.ticketId}`);
  revalidatePath("/admin/students");
  revalidatePath("/admin/todos");
  redirect(`${buildParentAvailabilityPath(token)}?msg=submitted`);
}


export default async function ParentAvailabilityPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ msg?: string; err?: string }>;
}) {
  const { token } = await params;
  const sp = await searchParams;
  const request = await prisma.parentAvailabilityRequest.findUnique({
    where: { token },
    include: {
      student: { select: { name: true } },
      ticket: {
        select: {
          ticketNo: true,
          status: true,
          isArchived: true,
        },
      },
    },
  });

  const msg = String(sp?.msg ?? "").trim();
  const err = String(sp?.err ?? "").trim();

  if (!request || !request.isActive) {
    return (
      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px", display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Time Form Unavailable / 时间填写链接不可用</h2>
        <div style={{ color: "#475569" }}>
          This temporary form is no longer available. Please contact the school team for a new link.
        </div>
      </div>
    );
  }

  const isExpired = Boolean(request.expiresAt && request.expiresAt.getTime() < Date.now());
  const isClosed = request.ticket.isArchived || ["Completed", "Cancelled"].includes(request.ticket.status);

  if (isExpired || isClosed) {
    return (
      <div style={{ maxWidth: 760, margin: "32px auto", padding: "0 16px", display: "grid", gap: 12 }}>
        <h2 style={{ margin: 0 }}>Time Form Closed / 时间填写链接已关闭</h2>
        <div style={{ color: "#475569" }}>
          {isExpired
            ? "This temporary form has expired. Please ask the school team to send a fresh link."
            : "This scheduling request has already been closed by the school team."}
        </div>
      </div>
    );
  }

  const payload = asPayload(request.payloadJson);

  return (
    <div style={{ maxWidth: 820, margin: "24px auto", padding: "0 16px 40px", display: "grid", gap: 16 }}>
      <div style={{ display: "grid", gap: 8 }}>
        <h1 style={{ margin: 0 }}>Available Lesson Times / 可上课时间收集</h1>
        <div style={{ color: "#475569", lineHeight: 1.6 }}>
          Please share the times that usually work for your family. This form only collects your available times. The school team will confirm the final lesson schedule with you afterwards.
        </div>
      </div>

      <div style={{ border: "1px solid #dbeafe", borderRadius: 12, background: "#f8fbff", padding: 16, display: "grid", gap: 8 }}>
        <div><b>Student / 学生:</b> {request.student.name}</div>
        <div><b>Course / 课程:</b> {request.courseLabel || "-"}</div>
        <div><b>Reference / 参考工单:</b> {request.ticket.ticketNo}</div>
        <div><b>Link expires / 链接有效期:</b> {request.expiresAt ? formatBusinessDateTime(request.expiresAt) : "-"}</div>
      </div>

      <div
        style={{
          border: "1px solid #e2e8f0",
          borderRadius: 12,
          background: "#fff",
          padding: 16,
          display: "grid",
          gap: 10,
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>What to do / 需要填写什么</div>
          <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            Share the days and times that usually work best for your family.
          </div>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>What happens next / 接下来会怎样</div>
          <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            The school team will review your submission and then confirm the final lesson arrangement with you.
          </div>
        </div>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800 }}>Important / 重要说明</div>
          <div style={{ color: "#475569", fontSize: 14, lineHeight: 1.6 }}>
            This form does not confirm the schedule by itself. It only helps us collect your available times.
          </div>
        </div>
      </div>

      {msg === "submitted" ? (
        <div style={{ border: "1px solid #bbf7d0", borderRadius: 12, background: "#f0fdf4", padding: 16, color: "#166534" }}>
          Thank you. We have received your available lesson times. The school team will review them and confirm the final schedule with you.
        </div>
      ) : null}
      {err ? (
        <div style={{ border: "1px solid #fecaca", borderRadius: 12, background: "#fef2f2", padding: 16, color: "#b91c1c" }}>
          {err === "empty"
            ? "Please fill at least one available day, time range, or note before submitting."
            : "This form could not be submitted. Please refresh and try again."}
        </div>
      ) : null}

      <form action={submitParentAvailability.bind(null, token)} style={{ display: "grid", gap: 16 }}>
        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Available weekdays / 可上课星期</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Choose the weekdays that usually work best. You can pick more than one. / 请选择通常方便上课的星期，可以多选。
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {PARENT_AVAILABILITY_WEEKDAY_OPTIONS.map((option) => (
              <label
                key={option.value}
                style={{
                  display: "inline-flex",
                  gap: 8,
                  alignItems: "center",
                  border: "1px solid #cbd5e1",
                  borderRadius: 999,
                  padding: "8px 12px",
                  background: "#fff",
                }}
              >
                <input type="checkbox" name="weekdays" value={option.value} defaultChecked={payload.weekdays.includes(option.value)} />
                <span>{option.zh} / {option.en}</span>
              </label>
            ))}
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12 }}>
          <div style={{ fontWeight: 800 }}>Preferred time ranges / 常用可上课时间段</div>
          <div style={{ fontSize: 13, color: "#64748b" }}>
            Please share the time windows your family usually prefers, for example `18:00-19:30`. / 请填写家里通常方便的时间段，例如 `18:00-19:30`。
          </div>
          <div style={{ display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Range 1 / 时间段一</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="time" name="timeRange1Start" defaultValue={payload.timeRanges[0]?.start ?? ""} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                <input type="time" name="timeRange1End" defaultValue={payload.timeRanges[0]?.end ?? ""} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
              </div>
            </label>
            <label style={{ display: "grid", gap: 6 }}>
              <span>Range 2 / 时间段二</span>
              <div style={{ display: "flex", gap: 8 }}>
                <input type="time" name="timeRange2Start" defaultValue={payload.timeRanges[1]?.start ?? ""} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
                <input type="time" name="timeRange2End" defaultValue={payload.timeRanges[1]?.end ?? ""} style={{ flex: 1, minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
              </div>
            </label>
          </div>
        </div>

        <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "#fff", padding: 16, display: "grid", gap: 12, gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Earliest start date / 最早可开始日期</span>
            <input type="date" name="earliestStartDate" defaultValue={payload.earliestStartDate ?? ""} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Mode preference / 上课形式偏好</span>
            <select name="modePreference" defaultValue={payload.modePreference ?? ""} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }}>
              <option value="">Either / 都可以</option>
              <option value="Online only">Online only / 仅线上</option>
              <option value="Onsite only">Onsite only / 仅线下</option>
              <option value="Prefer online">Prefer online / 更偏向线上</option>
              <option value="Prefer onsite">Prefer onsite / 更偏向线下</option>
            </select>
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>Teacher preference / 老师偏好</span>
            <input type="text" name="teacherPreference" maxLength={120} defaultValue={payload.teacherPreference ?? ""} style={{ minHeight: 42, border: "1px solid #cbd5e1", borderRadius: 10, padding: "8px 10px" }} />
          </label>
        </div>

        <label style={{ display: "grid", gap: 6 }}>
          <span>Notes / 备注</span>
          <textarea
            name="notes"
            rows={5}
            maxLength={1000}
            defaultValue={payload.notes ?? ""}
            placeholder="Share any fixed constraints, exam weeks, travel periods, or special requests."
            style={{ width: "100%", border: "1px solid #cbd5e1", borderRadius: 12, padding: 12 }}
          />
        </label>

        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ fontSize: 12, color: "#64748b" }}>
            Latest submission / 最近提交: {request.submittedAt ? formatBusinessDateOnly(request.submittedAt) : "Not submitted yet / 还未提交"}
          </div>
          <button type="submit">Submit availability / 提交可上课时间</button>
        </div>
      </form>
    </div>
  );
}
