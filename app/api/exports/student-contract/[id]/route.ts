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
import { StudentContractFlowType, StudentContractStatus } from "@prisma/client";

function compactDateLabel(input: Date | string | null | undefined) {
  if (!input) return "";
  const date = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, "0")}${String(date.getDate()).padStart(2, "0")}`;
}

function cleanFileNamePart(value: string | null | undefined, fallback: string) {
  const normalized = String(value ?? "")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/_+/g, "_")
    .trim();
  return normalized || fallback;
}

function buildStudentContractDownloadName(input: {
  studentName: string;
  courseName: string | null;
  flowType: StudentContractFlowType;
  status: StudentContractStatus;
  signedAt?: Date | null;
  generatedAtIso?: string | null;
}) {
  const typeLabel = input.flowType === StudentContractFlowType.RENEWAL ? "续费合同" : "首购合同";
  const statusLabel =
    input.status === "SIGNED" || input.status === "INVOICE_CREATED" ? "已签" : "草稿";
  const dateLabel =
    compactDateLabel(input.signedAt) ||
    compactDateLabel(input.generatedAtIso) ||
    compactDateLabel(new Date());
  const parts = [
    cleanFileNamePart(input.studentName, "学生"),
    cleanFileNamePart(input.courseName, "课程"),
    typeLabel,
    statusLabel,
    dateLabel,
  ].filter(Boolean);
  return `${parts.join("_")}.pdf`;
}

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
      flowType: true,
      student: { select: { name: true } },
      package: { select: { type: true, course: { select: { name: true } } } },
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

  const snapshot = coerceSnapshot(contract.contractSnapshotJson);
  const downloadName = buildStudentContractDownloadName({
    studentName: contract.student.name,
    courseName: contract.package.course?.name ?? snapshot?.package.courseName ?? null,
    flowType: contract.flowType,
    status: contract.status,
    signedAt: contract.signedAt,
    generatedAtIso: snapshot?.generatedAtIso ?? null,
  });
  const asciiFallbackName =
    downloadName
      .replace(/[^\x20-\x7E]+/g, "_")
      .replace(/[\\/:*?"<>|]+/g, "_")
      .replace(/\s+/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_+|_+$/g, "") || "student-contract.pdf";
  const encodedDownloadName = encodeURIComponent(downloadName);

  if (contract.status === "SIGNED" || contract.status === "INVOICE_CREATED") {
    const canServeStored =
      Boolean(contract.signedPdfPath) &&
      Boolean(contract.signatureImagePath) &&
      (await storedBusinessFileExists(contract.signedPdfPath, BUSINESS_UPLOAD_PREFIX.contracts));
    if (canServeStored && contract.signedPdfPath) {
      return buildStoredBusinessFileResponse(req, {
        allowedPrefix: BUSINESS_UPLOAD_PREFIX.contracts,
        relativePath: contract.signedPdfPath,
        originalFileName: downloadName,
        fallbackFileName: "student-contract-signed.pdf",
        contentType: "application/pdf",
        inlineFileName: downloadName,
      });
    }

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
      headers.set(
        "content-disposition",
        `attachment; filename="${asciiFallbackName.replace(/"/g, "")}"; filename*=UTF-8''${encodedDownloadName}`
      );
    } else {
      headers.set(
        "content-disposition",
        `inline; filename="${asciiFallbackName.replace(/"/g, "")}"; filename*=UTF-8''${encodedDownloadName}`
      );
    }
    return new Response(new Uint8Array(buffer), { status: 200, headers });
  }

  const buffer = await generateUnsignedStudentContractBuffer(id);
  const headers = new Headers({
    "content-type": "application/pdf",
    "cache-control": "private, max-age=300",
  });
  if (req.nextUrl.searchParams.get("download") === "1") {
    headers.set(
      "content-disposition",
      `attachment; filename="${asciiFallbackName.replace(/"/g, "")}"; filename*=UTF-8''${encodedDownloadName}`
    );
  } else {
    headers.set(
      "content-disposition",
      `inline; filename="${asciiFallbackName.replace(/"/g, "")}"; filename*=UTF-8''${encodedDownloadName}`
    );
  }
  return new Response(new Uint8Array(buffer), { status: 200, headers });
}
