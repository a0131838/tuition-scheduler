import { isManagerUser, requireAdminAreaUser } from "@/lib/auth";
import { logAudit } from "@/lib/audit-log";
import {
  COMMUNICATION_REMINDER_ENTITY,
  COMMUNICATION_REMINDER_MODULE,
  communicationReminderSummary,
  listCommunicationReminders,
  normalizeCommunicationReminderStatus,
} from "@/lib/communication-reminders";

export async function GET() {
  const user = await requireAdminAreaUser();
  if (!(user.role === "ADMIN" || user.role === "CS" || user.workspaces.includes("CS") || await isManagerUser(user))) {
    return Response.json({ ok: false, message: "Communication reminder permission required" }, { status: 403 });
  }
  const items = await listCommunicationReminders();
  return Response.json({ ok: true, items, summary: communicationReminderSummary(items) });
}

export async function POST(req: Request) {
  const user = await requireAdminAreaUser();
  if (!(user.role === "ADMIN" || user.role === "CS" || user.workspaces.includes("CS") || await isManagerUser(user))) {
    return Response.json({ ok: false, message: "Communication reminder permission required" }, { status: 403 });
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, message: "Invalid JSON body" }, { status: 400 });
  }
  const key = String(body?.key ?? "").trim();
  const status = normalizeCommunicationReminderStatus(body?.status);
  if (!key || key.length > 240 || !/^[A-Z0-9_:-]+$/i.test(key) || !status) {
    return Response.json({ ok: false, message: "Invalid reminder action" }, { status: 409 });
  }
  const snoozedUntil = status === "SNOOZED"
    ? String(body?.snoozedUntil ?? new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()).trim()
    : "";
  if (snoozedUntil && Number.isNaN(new Date(snoozedUntil).getTime())) {
    return Response.json({ ok: false, message: "Invalid snooze time" }, { status: 409 });
  }
  await logAudit({
    actor: user,
    module: COMMUNICATION_REMINDER_MODULE,
    action: `REMINDER_${status}`,
    entityType: COMMUNICATION_REMINDER_ENTITY,
    entityId: key,
    meta: {
      status,
      language: String(body?.language ?? ""),
      note: String(body?.note ?? "").trim().slice(0, 500),
      snoozedUntil: snoozedUntil || undefined,
    },
  });
  return Response.json({ ok: true, key, status });
}
