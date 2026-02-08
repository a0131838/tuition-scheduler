import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const courses = await prisma.course.findMany();
  return NextResponse.json(courses);
}
