import { bad, ok } from "@/app/api/miniapp/_lib";
import { requireMiniappTeacher } from "@/app/api/miniapp/staff/teacher/_lib";
import { prisma } from "@/lib/prisma";

export async function DELETE(req: Request, ctx: { params: Promise<{ slotId: string }> }) {
  const access = await requireMiniappTeacher(req);
  if (!access.ok) return access.response;
  const { slotId } = await ctx.params;
  const deleted = await prisma.teacherAvailabilityDate.deleteMany({ where: { id: slotId, teacherId: access.teacherId } });
  if (!deleted.count) return bad("可用时段不存在", 404);
  return ok({ message: "可用时段已删除" });
}
