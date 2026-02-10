import { prisma } from "@/lib/prisma";
import { requireTeacherProfile } from "@/lib/auth";

export const AVAIL_MIN_TIME = "08:00";
export const AVAIL_MAX_TIME = "22:50";
export const AVAIL_MIN_MIN = 8 * 60;
export const AVAIL_MAX_MIN = 22 * 60 + 50;
export const AVAILABILITY_UNDO_KEY_PREFIX = "teacher_availability_last_undo:";

export function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

export function fromMin(min: number) {
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function parseYMD(s: string) {
  const [Y, M, D] = s.split("-").map(Number);
  return new Date(Y, M - 1, D, 0, 0, 0, 0);
}

export function ymd(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

export function inAllowedWindow(startMin: number, endMin: number) {
  return startMin >= AVAIL_MIN_MIN && endMin <= AVAIL_MAX_MIN;
}

export function undoKey(teacherId: string) {
  return `${AVAILABILITY_UNDO_KEY_PREFIX}${teacherId}`;
}

export type AvailabilityUndoPayload = {
  type: "CLEAR_DAY";
  teacherId: string;
  date: string;
  createdAt: string;
  slots: Array<{ date: string; startMin: number; endMin: number }>;
};

export function parseUndoPayload(raw: string | null | undefined): AvailabilityUndoPayload | null {
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw) as AvailabilityUndoPayload;
    if (!obj || obj.type !== "CLEAR_DAY" || !Array.isArray(obj.slots)) return null;
    return obj;
  } catch {
    return null;
  }
}

export async function getTeacherIdOrThrow() {
  const { teacher } = await requireTeacherProfile();
  if (!teacher?.id) {
    return { ok: false as const, status: 403, message: "Teacher profile not linked." };
  }
  return { ok: true as const, teacherId: teacher.id };
}

export async function loadUndoPayload(teacherId: string) {
  const row = await prisma.appSetting.findUnique({
    where: { key: undoKey(teacherId) },
    select: { value: true },
  });
  return parseUndoPayload(row?.value);
}

