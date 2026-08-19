import crypto from "crypto";
import path from "path";
import { copyFile, mkdir, readFile, stat, writeFile } from "fs/promises";

const MAX_BYTES = 12 * 1024 * 1024;
const ALLOWED_EXTENSIONS = new Set([".pdf", ".png", ".jpg", ".jpeg", ".webp", ".heic", ".doc", ".docx", ".xls", ".xlsx"]);

function storageRoot() {
  return path.resolve(process.env.HR_PRIVATE_STORAGE_DIR || path.join(process.cwd(), "storage", "hr"));
}

function safeSegment(value: string) {
  const normalized = value.trim().replace(/[^A-Za-z0-9._-]+/g, "_");
  if (!normalized || normalized.includes("..")) throw new Error("Unsafe HR file path");
  return normalized;
}

export async function storePrivateHrFile(file: File, employeeId: string, category: string) {
  if (!(file instanceof File) || file.size <= 0) throw new Error("HR document is required");
  if (file.size > MAX_BYTES) throw new Error("HR document is too large (max 12MB)");
  const ext = path.extname(file.name || "").toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error("Unsupported HR document type");
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const relativePath = path.join(safeSegment(employeeId), safeSegment(category), `${Date.now()}_${fileHash.slice(0, 12)}${ext}`);
  const absolutePath = path.join(storageRoot(), relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await writeFile(absolutePath, buffer, { flag: "wx" }).catch(async (error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  return { privatePath: relativePath, originalName: path.basename(file.name), mimeType: file.type || null, sizeBytes: buffer.byteLength, fileHash };
}

export async function importPrivateHrFile(sourcePath: string, employeeId: string, category: string) {
  const info = await stat(sourcePath);
  if (!info.isFile() || info.size <= 0) throw new Error("HR import source must be a non-empty file");
  if (info.size > MAX_BYTES) throw new Error(`HR import file is too large: ${path.basename(sourcePath)}`);
  const ext = path.extname(sourcePath).toLowerCase();
  if (!ALLOWED_EXTENSIONS.has(ext)) throw new Error(`Unsupported HR document type: ${ext || "unknown"}`);
  const buffer = await readFile(sourcePath);
  const fileHash = crypto.createHash("sha256").update(buffer).digest("hex");
  const relativePath = path.join(safeSegment(employeeId), safeSegment(category), `legacy_${fileHash.slice(0, 16)}${ext}`);
  const absolutePath = path.join(storageRoot(), relativePath);
  await mkdir(path.dirname(absolutePath), { recursive: true });
  await copyFile(sourcePath, absolutePath, 1).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "EEXIST") throw error;
  });
  return {
    privatePath: relativePath,
    originalName: path.basename(sourcePath),
    mimeType: mimeTypeForExtension(ext),
    sizeBytes: info.size,
    fileHash,
  };
}

function mimeTypeForExtension(ext: string) {
  const types: Record<string, string> = {
    ".pdf": "application/pdf",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".webp": "image/webp",
    ".heic": "image/heic",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
  return types[ext] || "application/octet-stream";
}

export async function readPrivateHrFile(relativePath: string) {
  const root = storageRoot();
  const absolutePath = path.resolve(root, relativePath);
  if (!absolutePath.startsWith(`${root}${path.sep}`)) throw new Error("Unsafe HR file path");
  const info = await stat(absolutePath);
  if (!info.isFile()) throw new Error("HR document not found");
  return readFile(absolutePath);
}
