import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const teachers = await prisma.teacher.findMany();
  return NextResponse.json(teachers);
}