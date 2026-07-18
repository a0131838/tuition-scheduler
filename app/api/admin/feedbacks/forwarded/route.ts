import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { updateParentCommunicationTask } from "@/lib/parent-communication-center";

function bad(message: string, status = 400, extra?: Record<string, unknown>) {
  return Response.json({ ok: false, message, ...(extra ?? {}) }, { status });
}

export async function POST(req: Request) {
  const admin = await requireAdmin();

  let body: any;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const id = String(body?.id ?? "");
  const channel = String(body?.channel ?? "").trim();
  const note = String(body?.note ?? "").trim();
  if (!id) return bad("Missing id", 409);

  const feedback = await prisma.sessionFeedback.findUnique({ where: { id }, select: { publishedAt: true } });
  if (!feedback) return bad("Feedback not found", 404);
  if (!feedback.publishedAt) return bad("请先在家长沟通与通知中心完成审核发布。", 409);
  const tasks = await prisma.parentCommunicationTask.findMany({ where: { feedbackId: id, manualSentAt: null }, select: { id: true } });
  if (tasks.length === 0) return bad("没有待发送的家长沟通任务，请先同步沟通中心。", 409);
  for (const task of tasks) {
    await updateParentCommunicationTask({ id: task.id, action: "manual_sent", actor: { id: admin.id, email: admin.email, name: admin.name, role: admin.role }, data: { channel, note } });
  }

  return Response.json({ ok: true, completedTasks: tasks.length });
}
