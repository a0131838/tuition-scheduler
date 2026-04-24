import path from "path";
import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  BUSINESS_UPLOAD_PREFIX,
  buildStoredBusinessFileResponse,
  storedBusinessFileExists,
} from "@/lib/business-file-storage";
import {
  coerceSnapshot,
  generateUnsignedStudentContractBuffer,
} from "@/lib/student-contract";
import {
  generateSignedStudentContractPdfBuffer,
} from "@/lib/student-contract-pdf";

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
      contractSnapshotJson: true,
      signerName: true,
      signerIp: true,
      signatureImagePath: true,
      signedAt: true,
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

  if (contract.status === "SIGNED" || contract.status === "INVOICE_CREATED") {
    const canServeStored =
      Boolean(contract.signedPdfPath) &&
      Boolean(contract.signatureImagePath) &&
      (await storedBusinessFileExists(contract.signedPdfPath, BUSINESS_UPLOAD_PREFIX.contracts));
    if (canServeStored && contract.signedPdfPath) {
      return buildStoredBusinessFileResponse(req, {
        allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts,
        relativePath: contract.signedPdfPath,
        originalFileName: path.basename(safeName),
        fallbackFileName: "student-contract-signed.pdf",
        contentType: "application/pdf",
        inlineFileName: safeName,
      });
    }

    const snapshot = coerceSnapshot(contract.contractSnapshotJson);
    if (!snapshot) {
      return new Response("Contract snapshot not found", { status: 409 });
    }
    const signedAtLabel = contract.signedAt
      ? new Intl.DateTimeFormat("en-SG", {
          year: "numeric",
          month: "short",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
          timeZone: "Asia/Singapore",
        }).format(contract.signedAt)
      : "-";
    const buffer = await generateSignedStudentContractPdfBuffer({
      snapshot,
      signerName: contract.signerName || snapshot.parent.parentFullNameEn,
      signedAtLabel,
      signerIp: contract.signerIp,
      signatureImagePath: contract.signatureImagePath,
    });
    const headers = new Headers({
      "content-type": "application/pdf",
      "cache-control": "private, max-age=300",
    });
    if (req.nextUrl.searchParams.get("download") === "1") {
      headers.set("content-disposition", `attachment; filename="${safeName.replace(/"/g, "")}"`);
    } else {
      headers.set("content-disposition", `inline; filename="${safeName.replace(/"/g, "")}"`);
    }
    return new Response(new Uint8Array(buffer), { status: 200, headers });
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
