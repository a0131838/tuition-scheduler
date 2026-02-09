import fs from "fs";
import path from "path";

type PdfDocLike = {
  font: (name: string) => unknown;
};

const REGULAR_CANDIDATES = [
  path.join(process.cwd(), "fonts", "NotoSansCJKsc-Regular.otf"),
  "C:\\Windows\\Fonts\\msyh.ttf",
  "C:\\Windows\\Fonts\\msyhbd.ttf",
  "C:\\Windows\\Fonts\\simhei.ttf",
  "C:\\Windows\\Fonts\\simsun.ttf",
  "C:\\Windows\\Fonts\\arial.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Regular.otf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Regular.otf",
  "/System/Library/Fonts/STHeiti Medium.ttc",
  "/System/Library/Fonts/PingFang.ttc",
  "/Library/Fonts/Arial Unicode.ttf",
];

const BOLD_CANDIDATES = [
  path.join(process.cwd(), "fonts", "NotoSansCJKsc-Bold.otf"),
  "C:\\Windows\\Fonts\\msyhbd.ttf",
  "C:\\Windows\\Fonts\\arialbd.ttf",
  "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/opentype/noto/NotoSansCJKsc-Bold.otf",
  "/usr/share/fonts/truetype/noto/NotoSansCJK-Bold.ttc",
  "/usr/share/fonts/truetype/noto/NotoSansCJKsc-Bold.otf",
  "/System/Library/Fonts/PingFang.ttc",
];

let cachedRegular: string | null | undefined;
let cachedBold: string | null | undefined;
const warnedKeys = new Set<string>();

function warnOnce(key: string, message: string) {
  if (warnedKeys.has(key)) return;
  warnedKeys.add(key);
  console.warn(message);
}

function resolveFirstUsable(candidates: string[], cache: string | null | undefined) {
  if (cache !== undefined) return cache;
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    return p;
  }
  return null;
}

function trySetFont(doc: PdfDocLike, candidates: string[], fallback = "Helvetica") {
  const existing: string[] = [];
  for (const p of candidates) {
    if (!fs.existsSync(p)) continue;
    existing.push(p);
    try {
      doc.font(p);
      return { used: p, usedFallback: false as const };
    } catch {
      // Try next candidate.
    }
  }
  doc.font(fallback);
  return { used: fallback, usedFallback: true as const, existing };
}

export function setPdfFont(doc: PdfDocLike) {
  cachedRegular = resolveFirstUsable(REGULAR_CANDIDATES, cachedRegular);
  if (cachedRegular) {
    try {
      doc.font(cachedRegular);
      return;
    } catch {
      // If cached font fails, retry full candidate list.
      cachedRegular = null;
    }
  }
  const result = trySetFont(doc, REGULAR_CANDIDATES);
  if (result.usedFallback) {
    warnOnce(
      "pdf-font-regular-fallback",
      `[pdf-font] Falling back to "${result.used}" for regular text; Chinese may render as tofu/garbled. Checked existing candidates: ${result.existing.join(", ") || "(none)"}`
    );
  }
}

export function setPdfBoldFont(doc: PdfDocLike) {
  cachedBold = resolveFirstUsable(BOLD_CANDIDATES, cachedBold);
  if (cachedBold) {
    try {
      doc.font(cachedBold);
      return;
    } catch {
      cachedBold = null;
    }
  }
  const result = trySetFont(doc, BOLD_CANDIDATES);
  if (result.usedFallback) {
    warnOnce(
      "pdf-font-bold-fallback",
      `[pdf-font] Falling back to "${result.used}" for bold text; Chinese may render as tofu/garbled. Checked existing candidates: ${result.existing.join(", ") || "(none)"}`
    );
  }
}
