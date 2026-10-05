import PDFDocument from "pdfkit";
import { setPdfBoldFont, setPdfFont } from "./pdf-font";
import { reportPdfLabel, type ReportPdfLang } from "./learning-report-pdf-layout";

type PDFDoc = InstanceType<typeof PDFDocument>;
type Overflow = { label: string; value: string };
const states = new WeakMap<PDFDoc, { lang: ReportPdfLang; fields: Overflow[] }>();
const clean = (value: string) => String(value ?? "").replace(/\r\n?/g, "\n").trim() || "-";

export function startCardReport(doc: PDFDoc, lang: ReportPdfLang): Promise<Buffer> {
  states.set(doc, { lang, fields: [] });
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
}

/** Single-line headings preserve the original card grid, including bilingual labels. */
export function cardHeading(doc: PDFDoc, label: string, x: number, y: number, width: number, size: number, color: string) {
  setPdfBoldFont(doc);
  doc.fontSize(size);
  const measured = doc.widthOfString(label);
  if (measured > width) doc.fontSize(size * width * 0.98 / measured);
  doc.fillColor(color).text(label, x, y, { lineBreak: false });
}

export function drawCardText(doc: PDFDoc, options: {
  x: number; y: number; w: number; h: number; text: string; label: string;
  preferredSize?: number; minSize?: number; lineGap?: number; color?: string;
}) {
  const state = states.get(doc)!;
  const value = clean(options.text);
  const gap = options.lineGap ?? 1;
  const min = options.minSize ?? 7;
  let size = options.preferredSize ?? 9;
  setPdfFont(doc);
  const measure = (text: string) => doc.heightOfString(text, { width: options.w, lineGap: gap });
  while (true) {
    doc.fontSize(size);
    if (measure(value) <= options.h) {
      doc.fillColor(options.color ?? "#1F2937").text(value, options.x, options.y, { width: options.w, lineGap: gap });
      return;
    }
    if (size <= min) break;
    size = Math.max(min, size - 0.25);
  }
  // Keep the full value in a numbered appendix; the card is an explicitly labelled preview.
  const ref = state.fields.push({ label: options.label, value });
  const marker = reportPdfLabel(state.lang, `Full text: [${ref}]`, `完整内容见续页 [${ref}]`);
  size = Math.min(options.preferredSize ?? 9, 8);
  doc.fontSize(size);
  while (measure(marker) > options.h && size > 4) { size -= 0.25; doc.fontSize(size); }
  const chars = Array.from(value);
  let lo = 0, hi = chars.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    const preview = `${chars.slice(0, mid).join("").trimEnd()}…\n${marker}`;
    if (measure(preview) <= options.h) lo = mid; else hi = mid - 1;
  }
  const preview = lo ? `${chars.slice(0, lo).join("").trimEnd()}…\n${marker}` : marker;
  doc.fillColor(options.color ?? "#1F2937").text(preview, options.x, options.y, { width: options.w, lineGap: gap });
}

/** Append only overflowing fields, splitting even one very long field without clipping. */
export async function finishCardReport(doc: PDFDoc, completed: Promise<Buffer>, title: string) {
  const state = states.get(doc)!;
  const left = doc.page.margins.left;
  const width = doc.page.width - left - doc.page.margins.right;
  const bottom = doc.page.height - doc.page.margins.bottom;
  let y = bottom;
  const newPage = () => {
    doc.addPage();
    cardHeading(doc, `${title} — ${reportPdfLabel(state.lang, "Continued", "续页")}`, left, doc.page.margins.top, width, 16, "#111827");
    y = doc.page.margins.top + 34;
  };
  state.fields.forEach((field, index) => {
    let remaining = Array.from(field.value);
    let continued = false;
    while (remaining.length) {
      if (bottom - y < 100) newPage();
      const heading = `[${index + 1}] ${field.label}${continued ? reportPdfLabel(state.lang, " (continued)", "（续）") : ""}`;
      const bodyW = width - 24;
      const bodySpace = bottom - y - 44;
      setPdfFont(doc); doc.fontSize(10.2);
      const measure = (value: string) => doc.heightOfString(value, { width: bodyW, lineGap: 2 });
      let lo = 1, hi = remaining.length;
      while (lo < hi) {
        const mid = Math.ceil((lo + hi) / 2);
        if (measure(remaining.slice(0, mid).join("")) <= bodySpace) lo = mid; else hi = mid - 1;
      }
      // Prefer a whitespace boundary so continued words remain searchable in PDF text.
      if (lo < remaining.length) {
        const boundary = remaining.slice(0, lo).join("").search(/\s+\S*$/u);
        if (boundary > lo * 0.75) lo = Array.from(remaining.slice(0, lo).join("").slice(0, boundary + 1)).length;
      }
      const chunk = remaining.slice(0, lo).join("");
      const bodyH = measure(chunk);
      const boxH = bodyH + 38;
      doc.save().lineWidth(0.8).roundedRect(left, y, width, boxH, 6).fill("#FFFFFF").stroke("#E6ECF2").restore();
      cardHeading(doc, heading, left + 12, y + 8, bodyW, 11.2, "#334155");
      setPdfFont(doc);
      doc.fontSize(10.2).fillColor("#111827").text(chunk, left + 12, y + 26, { width: bodyW, lineGap: 2 });
      y += boxH + 10;
      remaining = remaining.slice(lo);
      continued = true;
      if (remaining.length) newPage();
    }
  });
  doc.end();
  states.delete(doc);
  return completed;
}
