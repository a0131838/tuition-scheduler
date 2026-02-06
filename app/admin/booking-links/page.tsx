import crypto from "crypto";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import BookingLinkCreateForm from "./_components/BookingLinkCreateForm";
import SimpleModal from "../_components/SimpleModal";

function appBaseUrl() {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") ?? "";
}

async function createBookingLink(formData: FormData) {
  "use server";
  await requireAdmin();
  const studentId = String(formData.get("studentId") ?? "");
  const startDate = String(formData.get("startDate") ?? "");
  const endDate = String(formData.get("endDate") ?? "");
  const durationMin = Number(String(formData.get("durationMin") ?? "60"));
  const slotStepMin = Number(String(formData.get("slotStepMin") ?? "15"));
  const title = String(formData.get("title") ?? "").trim() || null;
  const note = String(formData.get("note") ?? "").trim() || null;
  const expiresAtRaw = String(formData.get("expiresAt") ?? "").trim();
  const teacherIds = Array.from(new Set(formData.getAll("teacherIds").map((v) => String(v)).filter(Boolean)));

  if (!studentId || !startDate || !endDate || teacherIds.length === 0) {
    redirect("/admin/booking-links?err=Missing+required+fields");
  }
  if (!Number.isFinite(durationMin) || durationMin < 15 || durationMin > 240) {
    redirect("/admin/booking-links?err=Invalid+duration");
  }
  if (!Number.isFinite(slotStepMin) || slotStepMin < 5 || slotStepMin > 120) {
    redirect("/admin/booking-links?err=Invalid+slot+step");
  }

  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) {
    redirect("/admin/booking-links?err=Invalid+date+range");
  }

  let expiresAt: Date | null = null;
  if (expiresAtRaw) {
    const d = new Date(expiresAtRaw);
    if (!Number.isNaN(d.getTime())) expiresAt = d;
  }

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: {
      id: true,
      packages: {
        where: { status: "ACTIVE" },
        select: { courseId: true },
      },
    },
  });
  if (!student) {
    redirect("/admin/booking-links?err=Student+not+found");
  }
  const studentCourseIds = Array.from(new Set(student.packages.map((p) => p.courseId)));
  if (studentCourseIds.length === 0) {
    redirect("/admin/booking-links?err=Student+has+no+active+course+package");
  }

  const selectedTeachers = await prisma.teacher.findMany({
    where: { id: { in: teacherIds } },
    select: {
      id: true,
      subjectCourse: { select: { courseId: true } },
      subjects: { select: { courseId: true } },
    },
  });
  const studentCourseSet = new Set(studentCourseIds);
  const validTeacherIds = selectedTeachers
    .filter((teacher) => {
      const courseIds = new Set<string>();
      if (teacher.subjectCourse?.courseId) courseIds.add(teacher.subjectCourse.courseId);
      for (const subject of teacher.subjects) courseIds.add(subject.courseId);
      for (const courseId of courseIds) {
        if (studentCourseSet.has(courseId)) return true;
      }
      return false;
    })
    .map((teacher) => teacher.id);

  if (validTeacherIds.length !== teacherIds.length || validTeacherIds.length === 0) {
    redirect("/admin/booking-links?err=Some+selected+teachers+cannot+teach+this+student+courses");
  }

  const token = crypto.randomBytes(20).toString("hex");
  const created = await prisma.studentBookingLink.create({
    data: {
      token,
      studentId,
      title,
      note,
      startDate: start,
      endDate: end,
      durationMin,
      slotStepMin,
      onlySelectedSlots: true,
      expiresAt,
      teachers: {
        create: validTeacherIds.map((teacherId) => ({ teacherId })),
      },
    },
  });
  redirect(`/admin/booking-links/${created.id}?msg=Link+created`);
}

export default async function AdminBookingLinksPage({
  searchParams,
}: {
  searchParams?: { err?: string };
}) {
  const lang = await getLang();
  await requireAdmin();
  const err = searchParams?.err ? decodeURIComponent(searchParams.err) : "";

  const [students, teachers, links] = await Promise.all([
    prisma.student.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        packages: {
          where: { status: "ACTIVE" },
          select: { courseId: true, course: { select: { name: true } } },
        },
      },
    }),
    prisma.teacher.findMany({
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        subjectCourse: { select: { courseId: true, course: { select: { name: true } } } },
        subjects: { select: { courseId: true, course: { select: { name: true } } } },
      },
    }),
    prisma.studentBookingLink.findMany({
      orderBy: { createdAt: "desc" },
      take: 80,
      include: {
        student: { select: { name: true } },
        teachers: { include: { teacher: { select: { name: true } } } },
        _count: { select: { requests: true } },
      },
    }),
  ]);
  const studentOptions = students.map((student) => {
    const courseMap = new Map(student.packages.map((pkg) => [pkg.courseId, pkg.course.name]));
    return {
      id: student.id,
      name: student.name,
      courseIds: Array.from(courseMap.keys()),
      courseNames: Array.from(courseMap.values()),
    };
  });
  const teacherOptions = teachers.map((teacher) => {
    const courseMap = new Map<string, string>();
    if (teacher.subjectCourse) {
      courseMap.set(teacher.subjectCourse.courseId, teacher.subjectCourse.course.name);
    }
    for (const subject of teacher.subjects) {
      courseMap.set(subject.courseId, subject.course.name);
    }
    return {
      id: teacher.id,
      name: teacher.name,
      courseIds: Array.from(courseMap.keys()),
      courseNames: Array.from(courseMap.values()),
    };
  });

  const base = appBaseUrl();
  return (
    <div>
      <h2>{t(lang, "Student Booking Links", "学生选课链接")}</h2>
      {err ? <div style={{ color: "#b00", marginBottom: 10 }}>{err}</div> : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
        <SimpleModal buttonLabel={t(lang, "Create Link", "创建链接")} title={t(lang, "Create Link", "创建链接")} closeOnSubmit>
          <BookingLinkCreateForm action={createBookingLink} students={studentOptions} teachers={teacherOptions} />
        </SimpleModal>
      </div>

      <h3>{t(lang, "Recent Links", "最近链接")}</h3>
      <table cellPadding={8} style={{ borderCollapse: "collapse", width: "100%" }}>
        <thead>
          <tr style={{ background: "#f5f5f5" }}>
            <th align="left">{t(lang, "Created", "创建时间")}</th>
            <th align="left">{t(lang, "Student", "学生")}</th>
            <th align="left">{t(lang, "Window", "范围")}</th>
            <th align="left">{t(lang, "Teachers", "老师")}</th>
            <th align="left">{t(lang, "Requests", "请求数")}</th>
            <th align="left">{t(lang, "Link", "链接")}</th>
            <th align="left">{t(lang, "Action", "操作")}</th>
          </tr>
        </thead>
        <tbody>
          {links.map((l) => {
            const url = `${base}/booking/${l.token}`;
            return (
              <tr key={l.id} style={{ borderTop: "1px solid #eee" }}>
                <td>{new Date(l.createdAt).toLocaleString()}</td>
                <td>{l.student.name}</td>
                <td>
                  {new Date(l.startDate).toLocaleDateString()} - {new Date(l.endDate).toLocaleDateString()}
                  {!l.isActive ? <span style={{ color: "#b00" }}> ({t(lang, "Inactive", "已停用")})</span> : null}
                </td>
                <td>{l.teachers.map((x) => x.teacher.name).join(", ")}</td>
                <td>{l._count.requests}</td>
                <td style={{ maxWidth: 300, wordBreak: "break-all" }}>
                  <a href={`/booking/${l.token}`} target="_blank" rel="noreferrer">{url}</a>
                </td>
                <td>
                  <a href={`/admin/booking-links/${l.id}`}>{t(lang, "Manage", "管理")}</a>
                </td>
              </tr>
            );
          })}
          {links.length === 0 ? (
            <tr>
              <td colSpan={7}>{t(lang, "No links yet.", "暂无链接")}</td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}


