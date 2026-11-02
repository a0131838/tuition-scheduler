import { isParentReportSameOrigin } from "@/lib/learning-report-parent-content";
import { NextResponse, after } from "next/server";
import {
  requireParentReportActor,
  parseParentReportKind,
} from "@/lib/learning-report-parent-access";
import {
  currentParentEdition,
  generateParentEdition,
  reviewParentEdition,
  ParentReportError,
} from "@/lib/learning-report-parent-editions";
import { reportAiConfig } from "@/lib/learning-report-parent-ai";
export const maxDuration = 150;
type Params = { params: Promise<{ kind: string; id: string }> };
const response = (edition: any) =>
  edition
    ? {
        id: edition.id,
        status: edition.status,
        reviewedAt: edition.reviewedAt,
        updatedAt: edition.updatedAt,
        errorCode: edition.errorCode,
        content: edition.contentJson,
      }
    : null;
function failure(error: unknown) {
  const known = error instanceof ParentReportError;
  return NextResponse.json(
    { ok: false, code: known ? error.code : "REQUEST_FAILED" },
    {
      status: known ? error.status : 500,
      headers: { "Cache-Control": "no-store" },
    },
  );
}
export async function GET(_: Request, { params }: Params) {
  try {
    const { kind: raw, id } = await params;
    const kind = parseParentReportKind(raw);
    const { source } = await requireParentReportActor(kind, id);
    const { edition } = await currentParentEdition(kind, id);
    let configured = true;
    try {
      reportAiConfig();
    } catch {
      configured = false;
    }
    return NextResponse.json(
      { ok: true, source, edition: response(edition), configured },
      { headers: { "Cache-Control": "private, no-store" } },
    );
  } catch (e) {
    return failure(e);
  }
}
export async function POST(req: Request, { params }: Params) {
  try {
    if (!isParentReportSameOrigin(req, process.env.NEXT_PUBLIC_APP_URL))
      throw new ParentReportError("NOT_ALLOWED", 403);
    const text = await req.text();
    if (text.length > 1000) throw new ParentReportError("INVALID_REQUEST", 400);
    let input;
    try {
      input = JSON.parse(text);
    } catch {
      throw new ParentReportError("INVALID_REQUEST", 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      throw new ParentReportError("INVALID_REQUEST", 400);
    const { kind: raw, id } = await params;
    const kind = parseParentReportKind(raw);
    const { user } = await requireParentReportActor(kind, id, true);
    if (
      input.action !== "generate" &&
      input.action !== "regenerate" &&
      input.action !== "review"
    )
      throw new ParentReportError("INVALID_REQUEST", 400);
    if (input.action === "review" && input.acknowledged !== true)
      throw new ParentReportError("CONFIRM_TRANSLATION_FIRST");
    const edition =
      input.action === "review"
        ? await reviewParentEdition(
            kind,
            id,
            String(input.editionId || ""),
            user.email,
          )
        : await generateParentEdition(kind, id, user.email, {
            regenerate: input.action === "regenerate",
            defer: (work) => after(work),
          });
    return NextResponse.json(
      { ok: true, edition: response(edition) },
      {
        status: edition.status === "GENERATING" ? 202 : 200,
        headers: { "Cache-Control": "no-store" },
      },
    );
  } catch (e) {
    return failure(e);
  }
}
