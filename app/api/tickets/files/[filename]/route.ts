import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from "@/lib/business-file-storage";

export const runtime = "nodejs";

function safeFilename(raw: string) {
  const decoded = decodeURIComponent(raw).trim();
  if (!decoded) return null;
  if (decoded.includes("/") || decoded.includes("\\") || decoded.includes("..")) return null;
  if (!/^[a-zA-Z0-9._-]+$/.test(decoded)) return null;
  return decoded;
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ filename: string }> }
) {
  const { filename } = await params;
  const safe = safeFilename(filename);
  if (!safe) return new Response("Not Found", { status: 404 });

  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.tickets,
    relativePath: `${BUSINESS_UPLOAD_PREFIX.tickets}${safe}`,
    originalFileName: safe,
    fallbackFileName: "ticket-file",
    inlineFileName: safe,
  });
}
