import { requireAdmin } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

function bad(message: string, status = 400) {
  return Response.json({ ok: false, message }, { status });
}

function linkDto(link: {
  id: string;
  parentId: string;
  studentId: string;
  relationship: string | null;
  isPrimary: boolean;
  canViewSchedule: boolean;
  canViewFeedback: boolean;
  canViewFinance: boolean;
  canViewReports: boolean;
  canCreateRequests: boolean;
  createdAt: Date;
  updatedAt: Date;
  parent: {
    id: string;
    name: string | null;
    phone: string | null;
    phoneCountry: string | null;
    wechatOpenId: string | null;
    status: string;
  };
}) {
  return {
    id: link.id,
    parentId: link.parentId,
    studentId: link.studentId,
    relationship: link.relationship,
    isPrimary: link.isPrimary,
    permissions: {
      canViewSchedule: link.canViewSchedule,
      canViewFeedback: link.canViewFeedback,
      canViewFinance: link.canViewFinance,
      canViewReports: link.canViewReports,
      canCreateRequests: link.canCreateRequests,
    },
    parent: link.parent,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
  };
}

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id: studentId } = await params;

  const student = await prisma.student.findUnique({
    where: { id: studentId },
    select: { id: true },
  });
  if (!student) return bad("Student not found", 404);

  const links = await prisma.parentStudentLink.findMany({
    where: { studentId },
    include: {
      parent: {
        select: {
          id: true,
          name: true,
          phone: true,
          phoneCountry: true,
          wechatOpenId: true,
          status: true,
        },
      },
    },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "desc" }],
  });

  return Response.json({ ok: true, links: links.map(linkDto) });
}
