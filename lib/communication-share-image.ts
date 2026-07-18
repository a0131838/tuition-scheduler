import sharp from "sharp";

function escapeXml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" }[char] || char));
}

function wrapLine(value: string, max = 29) {
  const text = String(value ?? "").trim();
  if (!text) return [""];
  const lines: string[] = [];
  let current = "";
  for (const char of text) {
    current += char;
    if (current.length >= max) { lines.push(current); current = ""; }
  }
  if (current) lines.push(current);
  return lines;
}

export async function buildCommunicationShareImage(input: { title: string; messageText: string }) {
  const lines = input.messageText.split(/\r?\n/).flatMap((line) => wrapLine(line));
  const shown = lines.slice(0, 24);
  const tspans = shown.map((line, index) => `<tspan x="88" dy="${index === 0 ? 0 : 48}">${escapeXml(line || " ")}</tspan>`).join("");
  const svg = `
  <svg width="1080" height="1440" xmlns="http://www.w3.org/2000/svg">
    <rect width="1080" height="1440" fill="#f7f8f5"/>
    <rect x="48" y="48" width="984" height="1344" rx="38" fill="#ffffff" stroke="#e2e8f0" stroke-width="3"/>
    <rect x="48" y="48" width="984" height="18" rx="9" fill="#ea580c"/>
    <text x="88" y="132" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="27" font-weight="700" fill="#c2410c">BOSS EDUCATION · 家长沟通</text>
    <text x="88" y="206" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="43" font-weight="800" fill="#0f172a">${escapeXml(input.title)}</text>
    <line x1="88" y1="248" x2="992" y2="248" stroke="#e2e8f0" stroke-width="2"/>
    <text x="88" y="310" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="30" fill="#334155">${tspans}</text>
    <rect x="88" y="1280" width="904" height="70" rx="18" fill="#fff7ed"/>
    <text x="540" y="1325" text-anchor="middle" font-family="PingFang SC, Noto Sans CJK SC, sans-serif" font-size="25" font-weight="700" fill="#9a3412">详细记录请进入家长小程序查看 / View full details in the parent miniapp</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png({ quality: 92 }).toBuffer();
}
