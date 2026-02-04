import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const courses = await prisma.course.findMany();
  return NextResponse.json(courses);
}