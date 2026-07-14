import crypto from "crypto";
import path from "path";
import { mkdir, readFile, stat, unlink, writeFile } from "fs/promises";
import {
  deleteSharedDocFromS3,
  getSharedDocStorageDriver,
  signSharedDocS3DownloadUrl,
  uploadSharedDocToS3,
} from "@/lib/shared-doc-storage";

export const CARE_EVIDENCE_MAX_BYTES = 25 * 1024 * 1024;
export const CARE_EVIDENCE_ACCEPT = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-powerpoint",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.ms-outlook",
  "message/rfc822",
  "text/plain",
  "text/csv",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
] as const;

const ACCEPTED_MIME_TYPES = new Set<string>(CARE_EVIDENCE_ACCEPT);
const LOCAL_PREFIX = "care-local://";

function safeSegment(value: string, label: string) {
  const normalized = String(value || "").trim();
  if (!normalized || !/^[A-Za-z0-9_-]+$/.test(normalized)) throw new Error(`Invalid ${label}`);
  return normalized;
}

function safeExtension(fileName: string) {
  const ext = path.extname(fileName || "").slice(0, 12) || ".bin";
  return /^[.A-Za-z0-9]+$/.test(ext) ? ext : ".bin";
}

function localRoot() {
  return path.join(process.cwd(), ".data", "care-evidence");
}

function parseLocalPath(filePath: string) {
  if (!filePath.startsWith(LOCAL_PREFIX)) return null;
  const relative = filePath.slice(LOCAL_PREFIX.length);
  const segments = relative.split("/").filter(Boolean);
  if (segments.length !== 3 || segments.some((item) => !/^[A-Za-z0-9_.-]+$/.test(item) || item.includes(".."))) return null;
  return { relative, absolute: path.join(localRoot(), ...segments) };
}

export function validateCareEvidenceFile(file: File | null | undefined) {
  if (!(file instanceof File) || !file.size) throw new Error("Evidence file is required");
  if (file.size > CARE_EVIDENCE_MAX_BYTES) throw new Error("File too large (max 25MB)");
  const mimeType = String(file.type || "").toLowerCase().trim();
  if (mimeType && !ACCEPTED_MIME_TYPES.has(mimeType)) throw new Error("Unsupported file type");
}

export async function storeCareEvidenceFile(file: File, engagementId: string) {
  validateCareEvidenceFile(file);
  const safeEngagementId = safeSegment(engagementId, "care project");
  const now = new Date();
  const month = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const storedName = `${Date.now()}_${crypto.randomBytes(5).toString("hex")}${safeExtension(file.name)}`;
  const content = Buffer.from(await file.arrayBuffer());
  const mimeType = String(file.type || "").trim() || null;

  let filePath: string;
  if (getSharedDocStorageDriver() === "s3") {
    filePath = await uploadSharedDocToS3({
      objectKey: path.posix.join("care-evidence", safeEngagementId, month, storedName),
      content,
      contentType: mimeType,
    });
  } else {
    const directory = path.join(localRoot(), safeEngagementId, month);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, storedName), content);
    filePath = `${LOCAL_PREFIX}${safeEngagementId}/${month}/${storedName}`;
  }

  return {
    filePath,
    originalFileName: path.basename(file.name || "evidence-file"),
    fileSizeBytes: content.byteLength,
    mimeType,
  };
}

export async function deleteCareEvidenceFile(filePath: string) {
  if (filePath.startsWith("s3://")) return deleteSharedDocFromS3(filePath);
  const local = parseLocalPath(filePath);
  if (!local) return false;
  try {
    await unlink(local.absolute);
    return true;
  } catch {
    return false;
  }
}

export async function buildCareEvidenceFileResponse(
  req: Request,
  row: { filePath: string; originalFileName: string; mimeType: string | null },
) {
  const download = new URL(req.url).searchParams.get("download") === "1";
  const originalFileName = path.basename(row.originalFileName || "evidence-file");
  const signedUrl = await signSharedDocS3DownloadUrl({
    filePath: row.filePath,
    contentType: row.mimeType,
    originalFileName,
    download,
  });
  if (signedUrl) return Response.redirect(signedUrl, 302);

  const local = parseLocalPath(row.filePath);
  if (!local) return new Response("Not Found", { status: 404 });
  try {
    const fileStat = await stat(local.absolute);
    if (!fileStat.isFile()) return new Response("Not Found", { status: 404 });
    const body = await readFile(local.absolute);
    const headers = new Headers({
      "content-type": row.mimeType || "application/octet-stream",
      "content-length": String(body.byteLength),
      "cache-control": "private, max-age=300",
      "content-disposition": `${download ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(originalFileName)}`,
    });
    return new Response(body, { status: 200, headers });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}
