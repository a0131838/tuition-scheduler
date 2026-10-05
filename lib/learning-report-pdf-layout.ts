import PDFDocument from "pdfkit";
import { setPdfBoldFont, setPdfFont } from "./pdf-font";

export type ReportPdfLang = "ZH" | "EN" | "BILINGUAL";
export type ReportPdfField = { label: string; value: string };
export type ReportPdfSection = { title: string; fields: ReportPdfField[]; table?: boolean };
export function reportPdfLabel(lang: ReportPdfLang, en: string, zh: string) {
  return lang === "ZH" ? zh : lang === "EN" ? en : `${en} / ${zh}`;
}
const text = (value: string) => String(value ?? "").replace(/\r\n?/g, "\n").trim() || "-";

/** Flow text without a height limit. PDFKit carries even a single long field across pages. */
export async function renderLearningReportPdf(title: string, sections: ReportPdfSection[], lang: ReportPdfLang): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margins: { top: 76, bottom: 48, left: 36, right: 36 }, bufferPages: true });
  const chunks: Buffer[] = [];
  const completed = new Promise<Buffer>((resolve, reject) => {
    doc.on("data", chunk => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
  });
  const left = 36;
  const width = doc.page.width - 72;
  const bottom = () => doc.page.height - doc.page.margins.bottom;
  const body = () => { setPdfFont(doc); doc.fontSize(10.5).fillColor("#1F2937"); };
  const measure = (value: string, w = width) => doc.heightOfString(text(value), { width: w, lineGap: 2 });
  const ensure = (height: number) => {
    if (doc.y + height > bottom() && doc.y > doc.page.margins.top) doc.addPage();
  };
  const field = (item: ReportPdfField) => {
    body();
    const bodyHeight = measure(item.value);
    setPdfBoldFont(doc); doc.fontSize(10.5);
    const labelHeight = item.label ? measure(item.label) + 4 : 0;
    const fullHeight = labelHeight + bodyHeight + 12;
    // Keep a short field together; a long field flows naturally across pages.
    ensure(fullHeight <= bottom() - doc.page.margins.top ? fullHeight : labelHeight + 40);
    if (item.label) {
      setPdfBoldFont(doc); doc.fontSize(10.5).fillColor("#334155").text(item.label, left, doc.y, { width, lineGap: 2 });
      doc.y += 4;
    }
    body();
    doc.text(text(item.value), left, doc.y, { width, lineGap: 2 });
    doc.y += 12;
  };
  let currentSection = "";
  const pageSections = new Map<number, string>();
  doc.on("pageAdded", () => { const pages = doc.bufferedPageRange(); pageSections.set(pages.start + pages.count - 1, currentSection); });
  for (const section of sections) {
    currentSection = section.title;
    setPdfBoldFont(doc); doc.fontSize(12);
    const headingHeight = measure(section.title, width - 16) + 14;
    body();
    const first = section.fields[0];
    const firstHeight = first ? (section.table
      ? Math.max(measure(first.label, width * 0.38 - 16), measure(first.value, width * 0.62 - 24)) + 16
      : measure(first.value) + (first.label ? measure(first.label) + 4 : 0) + 12) : 0;
    const firstReserve = firstHeight + headingHeight + 10 <= bottom() - doc.page.margins.top ? firstHeight : 85;
    ensure(headingHeight + 10 + firstReserve);
    setPdfBoldFont(doc); doc.fontSize(12);
    const y = doc.y;
    doc.save().roundedRect(left, y, width, headingHeight, 4).fill("#EDF4F2").restore();
    doc.fillColor("#205C43").text(section.title, left + 8, y + 6, { width: width - 16, lineGap: 2 });
    doc.y = y + headingHeight + 10;
    for (const item of section.fields) {
      if (!section.table) { field(item); continue; }
      body();
      const labelW = width * 0.38;
      const valueW = width - labelW - 24;
      const rowHeight = Math.max(measure(item.label, labelW - 16), measure(item.value, valueW)) + 16;
      if (rowHeight > bottom() - doc.page.margins.top - 30) { field(item); continue; }
      ensure(rowHeight);
      const rowY = doc.y;
      doc.save().rect(left, rowY, width, rowHeight).fill("#F8FAFC").restore();
      body();
      doc.text(text(item.label), left + 8, rowY + 8, { width: labelW - 16, lineGap: 2 });
      doc.text(text(item.value), left + labelW + 8, rowY + 8, { width: valueW, lineGap: 2 });
      doc.save().strokeColor("#E2E8F0").lineWidth(0.5).moveTo(left, rowY + rowHeight).lineTo(left + width, rowY + rowHeight).stroke().restore();
      doc.y = rowY + rowHeight;
    }
    doc.y += 12;
  }
  // Decorate buffered pages after text has flowed, so headers cannot disrupt continuation.
  const range = doc.bufferedPageRange();
  for (let page = range.start; page < range.start + range.count; page++) {
    doc.switchToPage(page);
    setPdfBoldFont(doc); doc.fontSize(14).fillColor("#0F172A").text(title, left, 24, { width, lineGap: 1 });
    if (page > 0 && pageSections.has(page)) {
      setPdfFont(doc); doc.fontSize(8).fillColor("#64748B").text(pageSections.get(page)!, left, 48, { width, lineBreak: false });
    }
    doc.save().strokeColor("#CBD5E1").moveTo(left, 62).lineTo(left + width, 62).stroke().restore();
    const savedBottom = doc.page.margins.bottom;
    doc.page.margins.bottom = 0;
    setPdfFont(doc); doc.fontSize(8).fillColor("#64748B").text(
      reportPdfLabel(lang, `Page ${page + 1} of ${range.count}`, `第 ${page + 1} 页 / 共 ${range.count} 页`),
      left, doc.page.height - 30, { width, align: "right", lineBreak: false },
    );
    doc.page.margins.bottom = savedBottom;
  }
  doc.end();
  return completed;
}
