import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t, type Lang } from "@/lib/i18n";
import TeacherAvailabilityClient from "./TeacherAvailabilityClient";

function undoKey(teacherId: string) {
  return `teacher_availability_last_undo:${teacherId}`;
}

type AvailabilityUndoPayload = {
  type: "CLEAR_DAY";
  teacherId: string;
  date: string;
  createdAt: string;
  slots: Array<{ date: string; startMin: number; endMin: number }>;
};

function parseUndoPayload(raw: string | null | undefined): AvailabilityUndoPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as AvailabilityUndoPayload;
    if (!obj || obj.type !== "CLEAR_DAY" || !Array.isArray(obj.slots)) return null;
    return obj;
  } catch {
    return null;
  }
}

export default async function TeacherAvailabilityPage() {
  const lang = await getLang();
  const { teacher } = await requireTeacherProfile();
  if (!teacher) {
    return <div style={{ color: "#b00" }}>{t(lang, "Teacher profile not linked.", "老师资料未关联。")}</div>;
  }

  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 30);

  const slots = await prisma.teacherAvailabilityDate.findMany({
    where: { teacherId: teacher.id, date: { gte: start, lte: end } },
    orderBy: [{ date: "asc" }, { startMin: "asc" }],
  });

  const undoRow = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacher.id) },
    select: { value: true },
  });
  const undoPayload = parseUndoPayload(undoRow?.value);

  return (
    <TeacherAvailabilityClient
      lang={lang as Lang}
      teacherId={teacher.id}
      initialSlots={slots.map((s) => ({ id: s.id, date: s.date.toISOString(), startMin: s.startMin, endMin: s.endMin }))}
      initialUndoPayload={undoPayload}
    />
  );
}
