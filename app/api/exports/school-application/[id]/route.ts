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
  const buffer = await generateSchoolApplicationPdfBuffer(id);
  const url = new URL(req.url);
  const download = url.searchParams.get("download") === "1";
  const name = `${safeName(app.studentName)}-school-application-${app.id.slice(0, 8)}.pdf`;
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "content-type": "application/pdf",
      "content-length": String(buffer.byteLength),
      "cache-control": "private, max-age=300",
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${name}"`,
    },
  });
}
