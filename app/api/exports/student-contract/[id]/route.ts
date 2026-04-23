import path from "path";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_UPLOAD_PREFIX,
  buildStoredBusinessFileResponse,
} from "@/lib/business-file-storage";
import { generateUnsignedStudentContractBuffer } from "@/lib/student-contract";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const token = req.nextUrl.searchParams.get("token")?.trim() || null;
  const user = await getCurrentUser();
  const contract = await prisma.studentContract.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      intakeToken: true,
      signToken: true,
      signedPdfPath: true,
      student: { select: { name: true } },
      package: { select: { type: true } },
    },
  });
  if (!contract) {
    return new Response("Not Found", { status: 404 });
  }

  const adminAllowed = Boolean(user && (user.role === "ADMIN" || user.role === "FINANCE"));
  const tokenAllowed = Boolean(token && (token === contract.intakeToken || token === contract.signToken));
  if (!adminAllowed && !tokenAllowed) {
    return new Response("Forbidden", { status: 403 });
  }

  const safeName = `${contract.student.name}-${contract.package.type}-contract.pdf`
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_");

  if ((contract.status === "SIGNED" || contract.status === "INVOICE_CREATED") && contract.signedPdfPath) {
    return buildStoredBusinessFileResponse(req, {
      allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts,
      relativePath: contract.signedPdfPath,
      originalFileName: path.basename(safeName),
      fallbackFileName: "student-contract-signed.pdf",
      contentType: "application/pdf",
      inlineFileName: safeName,
    });
  }

  const buffer = await generateUnsignedStudentContractBuffer(id);
  const headers = new Headers({
    "content-type": "application/pdf",
    "cache-control": "private, max-age=300",
  });
  if (req.nextUrl.searchParams.get("download") === "1") {
    headers.set("content-disposition", `attachment; filename="${safeName.replace(/"/g, "")}"`);
  }
  return new Response(new Uint8Array(buffer), { status: 200, headers });
}
