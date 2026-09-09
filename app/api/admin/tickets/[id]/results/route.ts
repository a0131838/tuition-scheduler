import { requireAdmin } from "@/lib/auth";
import { ticketResultCandidates } from "@/lib/ticket-existing-results";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const sp = new URL(req.url).searchParams;
  try {
    return Response.json({ ok: true, ...await ticketResultCandidates(id, sp.get("actionId"), sp.get("date"), Number(sp.get("page") ?? 0)) });
  } catch (error) {
    return Response.json({ ok: false, message: error instanceof Error ? error.message : "课程读取失败" }, { status: 400 });
  }
}
