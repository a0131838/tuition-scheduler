import { NextResponse } from "next/server";
import { generateSchoolApplicationPdfBuffer, getSchoolApplicationById } from "@/lib/school-application";

function safeName(value: string) {
  return value.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "school-application";
}

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const app = await getSchoolApplicationById(id);
  if (!app) return new NextResponse("Not found", { status: 404 });
  const url = new URL(req.url);
  const withSeal = url.searchParams.get("seal") === "1";
  let buffer: Buffer;
  try {
    buffer = await generateSchoolApplicationPdfBuffer(id, { companySeal: withSeal });
  } catch (error) {
    const message = error instanceof Error ? error.message : "School application agreement PDF is not ready";
    return new NextResponse(`Agreement PDF is not ready: ${message}`, { status: 400 });
  }
  const download = url.searchParams.get("download") === "1";
  const name = `${safeName(app.studentName)}-school-application-${app.id.slice(0, 8)}${withSeal ? "-sealed" : ""}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(buffer.byteLength),
      "cache-control": "private, max-age=300",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
    },
  });
}
