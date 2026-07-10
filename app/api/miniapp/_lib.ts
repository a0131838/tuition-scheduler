import { prisma } from "@/lib/prisma";
import { getParentPortalSession, type ParentPortalPermission } from "@/lib/parent-portal";
import { formatBusinessDateTime } from "@/lib/date-only";

export function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export function ok<T extends Record<string, unknown>>(data: T) {
  return Response.json({ ok: true, ...data });
}

export function bearerToken(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  return "";
}

export async function requireMiniappParent(req: Request) {
  const token = bearerToken(req);
  if (!token) return { ok: false as const, response: bad("Unauthorized", 401) };
  const session = await getParentPortalSession(token);
  if (!session) return { ok: false as const, response: bad("Unauthorized", 401) };
  return { ok: true as const, session, parent: session.parent };
}

export async function requireMiniappStudentAccess(
  req: Request,
  studentId: string,
  permission?: ParentPortalPermission
) {
  const auth = await requireMiniappParent(req);
  if (!auth.ok) return auth;

  const link = await prisma.parentStudentLink.findUnique({
    where: {
      parentId_studentId: {
        parentId: auth.parent.id,
        studentId,
      },
    },
  });
  if (!link) return { ok: false as const, response: bad("Forbidden", 403) };
  if (permission && !link[permission]) return { ok: false as const, response: bad("Forbidden", 403) };
  return { ok: true as const, session: auth.session, parent: auth.parent, link };
}

export function parseDateRange(url: URL, fallbackPastDays = 30, fallbackFutureDays = 60) {
  const fromRaw = url.searchParams.get("from") ?? "";
  const toRaw = url.searchParams.get("to") ?? "";
  const now = new Date();
  const fallbackFrom = new Date(now.getTime() - fallbackPastDays * 24 * 60 * 60 * 1000);
  const fallbackTo = new Date(now.getTime() + fallbackFutureDays * 24 * 60 * 60 * 1000);
  const from = fromRaw ? new Date(`${fromRaw}T00:00:00+08:00`) : fallbackFrom;
  const to = toRaw ? new Date(`${toRaw}T23:59:59+08:00`) : fallbackTo;
  return {
    from: Number.isNaN(from.getTime()) ? fallbackFrom : from,
    to: Number.isNaN(to.getTime()) ? fallbackTo : to,
  };
}

export function courseLabel(cls: any) {
  const parts = [cls?.course?.name, cls?.subject?.name, cls?.level?.name].filter(Boolean);
  return parts.length ? parts.join(" / ") : "-";
}

export function sessionTeacherName(session: any) {
  return session?.teacher?.name ?? session?.class?.teacher?.name ?? null;
}

export function sessionDto(session: any, attendance?: any) {
  return {
    id: session.id,
    startAt: session.startAt.toISOString(),
    endAt: session.endAt.toISOString(),
    startText: formatBusinessDateTime(session.startAt),
    endText: formatBusinessDateTime(session.endAt),
    courseLabel: courseLabel(session.class),
    teacherName: sessionTeacherName(session),
    mode: session.class?.campus?.isOnline ? "ONLINE" : "OFFLINE",
    campusName: session.class?.campus?.name ?? null,
    roomName: session.class?.room?.name ?? null,
    attendanceStatus: attendance?.status ?? null,
  };
}
