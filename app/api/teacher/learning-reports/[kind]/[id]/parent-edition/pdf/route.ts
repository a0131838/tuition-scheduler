import {
  requireParentReportActor,
  parseParentReportKind,
} from "@/lib/learning-report-parent-access";
import {
  currentParentEdition,
  ParentReportError,
} from "@/lib/learning-report-parent-editions";
import {
  validateParentReportContent,
  type ParentReportContent,
} from "@/lib/learning-report-parent-content";
import {
  renderParentLearningReportPdf,
  parentReportPdfHeaders,
} from "@/lib/learning-report-parent-pdf";
export async function GET(
  req: Request,
  { params }: { params: Promise<{ kind: string; id: string }> },
) {
  try {
    const { kind: raw, id } = await params;
    const kind = parseParentReportKind(raw);
    const { row } = await requireParentReportActor(kind, id);
    if (!["SUBMITTED", "FORWARDED"].includes(row.status))
      throw new ParentReportError("SAVE_AND_SUBMIT_FIRST");
    const { source, edition } = await currentParentEdition(kind, id);
    const url = new URL(req.url);
    const lang = url.searchParams.get("lang") || "BILINGUAL";
    if (!["ZH", "EN", "BILINGUAL"].includes(lang))
      throw new ParentReportError("INVALID_REQUEST", 400);
    const preview = url.searchParams.get("preview") === "1";
    if (
      lang !== "EN" &&
      (!edition ||
        edition.status !== "READY" ||
        (!preview && !edition.reviewedAt))
    )
      throw new ParentReportError("CONFIRM_TRANSLATION_FIRST");
    const content =
      edition?.status === "READY"
        ? validateParentReportContent(edition.contentJson, source.fields)
        : null;
    const cached =
      !preview && edition?.reviewedAt
        ? lang === "ZH"
          ? edition.pdfZh
          : lang === "EN"
            ? edition.pdfEn
            : edition.pdfBilingual
        : null;
    const bytes =
      cached ??
      (await renderParentLearningReportPdf(
        source,
        content,
        lang as "ZH" | "EN" | "BILINGUAL",
        Boolean(edition?.reviewedAt),
      ));
    return new Response(new Uint8Array(bytes), {
      headers: parentReportPdfHeaders(
        source,
        lang as "ZH" | "EN" | "BILINGUAL",
        preview,
      ),
    });
  } catch (e) {
    return Response.json(
      {
        ok: false,
        code: e instanceof ParentReportError ? e.code : "PDF_FAILED",
      },
      {
        status: e instanceof ParentReportError ? e.status : 500,
        headers: { "Cache-Control": "no-store" },
      },
    );
  }
}
