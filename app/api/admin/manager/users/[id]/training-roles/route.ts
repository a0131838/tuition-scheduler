import { requireOwnerManager } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TRAINING_ASSIGNABLE_ROLES, type TrainingAssignableRole } from "@/lib/training-center";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function pickTrainingRoles(values: unknown): TrainingAssignableRole[] {
  const input = Array.isArray(values) ? values : [];
  const selected = new Set(input.map((value) => String(value ?? "").trim().toUpperCase()));
  return TRAINING_ASSIGNABLE_ROLES.filter((role) => selected.has(role));
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireOwnerManager();
  const { id } = await params;
  if (!id) return bad("Missing user id");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return bad("Invalid JSON body");
  }

  const target = await prisma.user.findUnique({ where: { id }, select: { id: true, role: true } });
  if (!target) return bad("User not found", 404);
  if (target.role === "STUDENT") return bad("Student accounts cannot receive staff training roles");

  const selected = pickTrainingRoles((body as { roles?: unknown } | null)?.roles);
  await prisma.$transaction(async (tx) => {
    for (const role of TRAINING_ASSIGNABLE_ROLES) {
      const isActive = selected.includes(role) && role !== target.role;
      await tx.staffTrainingRole.upsert({
        where: { userId_role: { userId: id, role } },
        update: { isActive, note: "Managed from System User Admin" },
        create: { userId: id, role, isActive, note: "Managed from System User Admin" },
      });
    }
  });

  return Response.json({
    ok: true,
    message: "Training roles updated",
    primaryRole: target.role,
    additionalRoles: selected.filter((role) => role !== target.role),
  });
}
