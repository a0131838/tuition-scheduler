import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? undefined;
  const studentId = url.searchParams.get("studentId") ?? undefined;

  const rows = await prisma.enrollment.findMany({
    where: {
      ...(classId ? { classId } : {}),
      ...(studentId ? { studentId } : {}),
    },
    include: {
      student: true,
      class: { include: { course: true, teacher: true, campus: true, room: true } },
    },
  });

  return NextResponse.json(rows);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const classId = body?.classId as string | undefined;
  const studentId = body?.studentId as string | undefined;

  if (!classId || !studentId) {
    return NextResponse.json({ error: "Missing classId or studentId" }, { status: 400 });
  }

  const exists = await prisma.enrollment.findFirst({
    where: { classId, studentId },
    select: { classId: true, studentId: true },
  });
  if (exists) {
    return NextResponse.json({ error: "Already enrolled" }, { status: 409 });
  }

  const created = await prisma.enrollment.create({
    data: { classId, studentId },
  });

  return NextResponse.json(created, { status: 201 });
}

export async function DELETE(req: Request) {
  const url = new URL(req.url);
  const classId = url.searchParams.get("classId") ?? "";
  const studentId = url.searchParams.get("studentId") ?? "";

  if (!classId || !studentId) {
    return NextResponse.json({ error: "Missing classId or studentId" }, { status: 400 });
  }

  const result = await prisma.enrollment.deleteMany({
    where: { classId, studentId },
  });

  return NextResponse.json({ deleted: result.count });
}