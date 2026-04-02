import crypto from "crypto";
import path from "path";
import { access, mkdir, readFile, stat, unlink, writeFile } from "fs/promises";

export const BUSINESS_UPLOAD_PREFIX = {
  expenseClaims: "/uploads/expense-claims/",
  paymentProofs: "/uploads/payment-proofs/",
  partnerPaymentProofs: "/uploads/partner-payment-proofs/",
  sharedDocs: "/uploads/shared-docs/",
  tickets: "/uploads/tickets/",
} as const;

const MIME_BY_EXT: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".bmp": "image/bmp",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xls": "application/vnd.ms-excel",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".txt": "text/plain; charset=utf-8",
};

function normalizeAllowedPrefix(allowedPrefix: string) {
  const normalized = String(allowedPrefix || "").trim();
  if (!normalized.startsWith("/uploads/") || !normalized.endsWith("/")) {
    throw new Error(`Invalid business upload prefix: ${allowedPrefix}`);
  }
  if (normalized.includes("..") || normalized.includes("\\")) {
    throw new Error(`Unsafe business upload prefix: ${allowedPrefix}`);
  }
  return normalized;
}

function sanitizeSubdirSegments(segments: string[]) {
  return segments
    .map((segment) => String(segment || "").trim())
    .filter(Boolean)
    .map((segment) => {
      if (segment.includes("..") || segment.includes("\\") || segment.includes("/")) {
        throw new Error(`Unsafe upload subdirectory segment: ${segment}`);
      }
      return segment;
    });
}

function safeUploadExtension(fileName: string) {
  const ext = path.extname(fileName || "").slice(0, 10) || ".bin";
  return /^[.a-zA-Z0-9]+$/.test(ext) ? ext : ".bin";
}

function toAsciiFilename(name: string, fallbackBaseName: string) {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  return `${base || fallbackBaseName}${ext}`;
}

export function resolveStoredBusinessFilePath(relativePath: string | null | undefined, allowedPrefix: string) {
  if (!relativePath) return null;
  const prefix = normalizeAllowedPrefix(allowedPrefix);
  const normalized = String(relativePath || "").trim();
  if (!normalized.startsWith(prefix)) return null;
  const rel = normalized.replace(/^\//, "");
  if (rel.includes("..") || rel.includes("\\")) return null;
  return path.join(process.cwd(), "public", ...rel.split("/"));
}

export async function storedBusinessFileExists(relativePath: string | null | undefined, allowedPrefix: string) {
  const absPath = resolveStoredBusinessFilePath(relativePath, allowedPrefix);
  if (!absPath) return false;
  try {
    await access(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function deleteStoredBusinessFile(relativePath: string | null | undefined, allowedPrefix: string) {
  const absPath = resolveStoredBusinessFilePath(relativePath, allowedPrefix);
  if (!absPath) return false;
  try {
    await unlink(absPath);
    return true;
  } catch {
    return false;
  }
}

export async function storeBusinessUpload(
  file: File,
  options: {
    allowedPrefix: string;
    subdirSegments?: string[];
    maxBytes?: number;
    fallbackOriginalName?: string;
  }
) {
  if (!(file instanceof File) || !file.size) {
    throw new Error("File is required");
  }
  if (options.maxBytes && file.size > options.maxBytes) {
    throw new Error(`File too large (max ${Math.floor(options.maxBytes / 1024 / 1024)}MB)`);
  }

  const allowedPrefix = normalizeAllowedPrefix(options.allowedPrefix);
  const safeSubdirs = sanitizeSubdirSegments(options.subdirSegments ?? []);
  const originalName = file.name || options.fallbackOriginalName || "file";
  const storeName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${safeUploadExtension(originalName)}`;
  const relativeDir = path.posix.join(allowedPrefix.replace(/^\/+|\/+$/g, ""), ...safeSubdirs);
  const absoluteDir = path.join(process.cwd(), "public", ...relativeDir.split("/"));
  await mkdir(absoluteDir, { recursive: true });
  const absolutePath = path.join(absoluteDir, storeName);
  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(absolutePath, buffer);

  return {
    absolutePath,
    originalName,
    relativePath: `/${path.posix.join(relativeDir, storeName)}`,
    storedFileName: storeName,
  };
}

export async function buildStoredBusinessFileResponse(
  req: Request,
  options: {
    allowedPrefix: string;
    relativePath: string | null | undefined;
    originalFileName: string | null | undefined;
    fallbackFileName: string;
    cacheControl?: string;
    contentType?: string | null;
    inlineFileName?: string | null;
  }
) {
  const absPath = resolveStoredBusinessFilePath(options.relativePath, options.allowedPrefix);
  if (!absPath) return new Response("Not Found", { status: 404 });

  try {
    const fileStat = await stat(absPath);
    if (!fileStat.isFile()) return new Response("Not Found", { status: 404 });
  } catch {
    return new Response("Not Found", { status: 404 });
  }

  const safeName = path.basename(options.originalFileName || options.fallbackFileName);
  const ext = path.extname(safeName).toLowerCase();
  const contentType = options.contentType || MIME_BY_EXT[ext] || "application/octet-stream";
  const body = await readFile(absPath);
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const asciiName = toAsciiFilename(safeName, path.basename(options.fallbackFileName, path.extname(options.fallbackFileName)));
  const encodedName = encodeURIComponent(safeName);

  const headers = new Headers({
    "content-type": contentType,
    "cache-control": options.cacheControl ?? "private, max-age=3600",
    "content-length": String(body.byteLength),
  });

  if (download) {
    headers.set(
      "content-disposition",
      `attachment; filename="${asciiName.replace(/"/g, "")}"; filename*=UTF-8''${encodedName}`
    );
  } else if (options.inlineFileName) {
    headers.set("content-disposition", `inline; filename="${path.basename(options.inlineFileName).replace(/"/g, "")}"`);
  }

  return new Response(body, { status: 200, headers });
}
