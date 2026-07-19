import sharp from "sharp";

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] || char));
}

function displayUnits(value: string) {
  return Array.from(value).reduce((total, char) => {
    if (/\s/u.test(char)) return total + 0.55;
    if (/^[\x00-\x7F]$/u.test(char)) return total + 1;
    return total + 2;
  }, 0);
}

function splitOversizedToken(token: string, maxUnits: number) {
  const chunks: string[] = [];
  let current = "";
  for (const char of token) {
    if (current && displayUnits(current + char) > maxUnits) {
      chunks.push(current);
      current = char;
    } else {
      current += char;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

export function wrapCommunicationLine(value: string, maxUnits = 58) {
  const text = String(value ?? "").trim();
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";
  const tokens = text.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]|\s+|[^\s\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]+/gu) ?? [text];
  for (const rawToken of tokens) {
    const tokenParts = displayUnits(rawToken) > maxUnits ? splitOversizedToken(rawToken, maxUnits) : [rawToken];
    for (const token of tokenParts) {
      const candidate = current + token;
      if (current && displayUnits(candidate) > maxUnits) {
        lines.push(current.trimEnd());
        current = token.trimStart();
      } else {
        current = candidate;
      }
    }
  }
  if (current.trim()) lines.push(current.trimEnd());
  return lines;
}

export async function buildCommunicationShareImage(input: { title: string; messageText: string }) {
  const titleLines = wrapCommunicationLine(input.title, 39).slice(0, 2);
  const titleTspans = titleLines.map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 52}">${escapeXml(line || " ")}</tspan>`).join("");
  const separatorY = titleLines.length > 1 ? 298 : 248;
  const bodyY = separatorY + 62;
  const lines = input.messageText.split(/\r?\n/).flatMap((line) => wrapCommunicationLine(line));
  const maxBodyLines = Math.max(1, Math.floor((1220 - bodyY) / 48) + 1);
  const shown = lines.slice(0, maxBodyLines);
  const tspans = shown.map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 48}">${escapeXml(line || " ")}</tspan>`).join("");
  const svg = `
  <svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1440" fill="#f7f8f5"/>
    <rect x="48" y="48" width="984" height="1344" rx="38" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
    <rect x="48" y="48" width="984" height="18" rx="9" fill="#ea580c"/>
    <text x="88" y="132" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif" font-size="27" font-weight="700" fill="#c2410c">BOSS EDUCATION · 家长沟通</text>
    <text x="88" y="206" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif" font-size="43" font-weight="800" fill="#0f172a">${titleTspans}</text>
    <line x1="88" y1="${separatorY}" x2="992" y2="${separatorY}" stroke="#e2e8f0" stroke-width="2"/>
    <text x="88" y="${bodyY}" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif" font-size="30" fill="#334155">${tspans}</text>
    <rect x="88" y="1280" width="904" height="70" rx="18" fill="#fff7ed"/>
    <text x="540" y="1325" text-anchor="middle" font-family="Noto Sans CJK SC, Noto Sans SC, sans-serif" font-size="25" font-weight="700" fill="#9a3412">详细记录请进入家长小程序查看 / View full details in the parent miniapp</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}
