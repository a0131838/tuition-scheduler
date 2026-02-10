import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";
import { getLang, t } from "@/lib/i18n";
import TeacherAvailabilityClient from "./TeacherAvailabilityClient";

function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

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
      teacherId={teacher.id}
      initialSlots={slots.map((s) => ({ id: s.id, date: s.date.toISOString(), startMin: s.startMin, endMin: s.endMin }))}
      initialUndoPayload={undoPayload}
      labels={{
        title: t(lang, "My Availability", "我的可上课时间"),
        errPrefix: "",
        msgPrefix: "",
        undoAvailable: t(lang, "Undo available for last clear-day action", "有可撤回的最近清空操作"),
        undo: t(lang, "Undo last clear-day", "撤回上次清空当天"),
        quickAdd: t(lang, "Quick Add (Single Day)", "快速添加（单日）"),
        bulkAdd: t(lang, "Bulk Add by Date Range", "批量添加（日期区间）"),
        from: t(lang, "From", "从"),
        to: t(lang, "To", "到"),
        start: t(lang, "Start", "开始"),
        end: t(lang, "End", "结束"),
        add: t(lang, "Add", "添加"),
        save: t(lang, "Save", "保存"),
        del: t(lang, "Del", "删"),
        availabilityCalendar: t(lang, "Availability Calendar (Next 30 days)", "未来30天可上课日历"),
        clearDay: t(lang, "Clear day", "清空当天"),
        clearDayConfirmPrefix: t(lang, "Clear all availability slots on", "确定清空当天全部时段"),
        manageRaw: t(lang, "Manage raw slots", "管理原始时段"),
        edit: t(lang, "Edit", "编辑"),
        addSlot: t(lang, "Add slot", "添加时段"),
        noSlots: t(lang, "No slots", "无时段"),
        outOfRange: t(lang, "Out of range", "范围外"),
        days: [
          t(lang, "Sun", "周日"),
          t(lang, "Mon", "周一"),
          t(lang, "Tue", "周二"),
          t(lang, "Wed", "周三"),
          t(lang, "Thu", "周四"),
          t(lang, "Fri", "周五"),
          t(lang, "Sat", "周六"),
        ],
        weekdayLabel: (en: string, zh: string) => t(lang, en, zh),
        bulkAdded: (n: number) => t(lang, `Bulk added ${n}`, `批量添加 ${n}`),
        added1: t(lang, "Added 1", "已添加 1"),
        updated1: t(lang, "Updated 1", "已更新 1"),
        deleted1: t(lang, "Deleted 1", "已删除 1"),
        clearedDay: (date: string) => t(lang, `Cleared ${date}`, `已清空 ${date}`),
        undoDone: (n: number) => t(lang, `Undo done, restored ${n} slots`, `撤回完成，恢复 ${n} 条时段`),
      }}
    />
  );
}

