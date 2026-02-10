import fs from "node:fs";
import path from "node:path";

// This script generates a Word .docx from a limited subset of Markdown:
// - # / ## / ### headings
// - unordered lists: "- ..."
// - ordered lists: "1. ..."
// - fenced code blocks ```...```
//
// It intentionally avoids adding build-time dependencies to the app runtime.

function usage() {
  // eslint-disable-next-line no-console
  console.error("Usage: node scripts/generate_docx_from_markdown.mjs <input.md> <output.docx>");
  process.exit(2);
}

const inFile = process.argv[2];
const outFile = process.argv[3];
if (!inFile || !outFile) usage();

let docx;
try {
  // `docx` is an optional dependency. Install for one-off generation:
  //   npm i --no-save --no-package-lock docx
  docx = await import("docx");
} catch (e) {
  // eslint-disable-next-line no-console
  console.error("Missing dependency: docx");
  // eslint-disable-next-line no-console
  console.error("Install it for generation only:");
  // eslint-disable-next-line no-console
  console.error("  npm i --no-save --no-package-lock docx");
  process.exit(1);
}

const {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} = docx;

const md = fs.readFileSync(inFile, "utf8");
const lines = md.replace(/\r\n/g, "\n").split("\n");

function textRun(t, opts = {}) {
  return new TextRun({
    text: t,
    font: "Microsoft YaHei",
    ...opts,
  });
}

function para(text, { heading, bullet, numbering, spacingBefore, spacingAfter, code } = {}) {
  if (code) {
    return new Paragraph({
      children: [
        new TextRun({
          text,
          font: "Consolas",
          size: 20,
        }),
      ],
      spacing: { before: 60, after: 60 },
    });
  }

  const children = [textRun(text)];
  const p = new Paragraph({
    children,
    heading,
    bullet,
    numbering,
    spacing: {
      before: spacingBefore ?? (heading ? 160 : 40),
      after: spacingAfter ?? (heading ? 80 : 40),
    },
  });
  return p;
}

const children = [];
children.push(
  new Paragraph({
    children: [new TextRun({ text: path.basename(inFile), bold: true, font: "Microsoft YaHei" })],
    alignment: AlignmentType.CENTER,
    spacing: { after: 200 },
  }),
);

let inCode = false;
let codeLang = "";
let codeBuf = [];
let orderedIndex = 0;

function flushCode() {
  if (codeBuf.length === 0) return;
  const header = codeLang ? `[${
    codeLang.trim()
  }]` : "";
  if (header) children.push(para(header, { code: true }));
  for (const l of codeBuf) children.push(para(l.length ? l : " ", { code: true }));
  codeBuf = [];
  codeLang = "";
}

for (let i = 0; i < lines.length; i++) {
  const raw = lines[i];
  const line = raw.trimEnd();

  if (line.startsWith("```")) {
    if (!inCode) {
      inCode = true;
      codeLang = line.slice(3);
      codeBuf = [];
    } else {
      inCode = false;
      flushCode();
    }
    continue;
  }

  if (inCode) {
    codeBuf.push(raw.replace(/\t/g, "  "));
    continue;
  }

  if (!line.trim()) {
    orderedIndex = 0;
    children.push(new Paragraph({ text: "", spacing: { after: 60 } }));
    continue;
  }

  const h1 = line.match(/^#\s+(.*)$/);
  if (h1) {
    orderedIndex = 0;
    children.push(para(h1[1], { heading: HeadingLevel.HEADING_1, spacingBefore: 220, spacingAfter: 120 }));
    continue;
  }
  const h2 = line.match(/^##\s+(.*)$/);
  if (h2) {
    orderedIndex = 0;
    children.push(para(h2[1], { heading: HeadingLevel.HEADING_2, spacingBefore: 180, spacingAfter: 90 }));
    continue;
  }
  const h3 = line.match(/^###\s+(.*)$/);
  if (h3) {
    orderedIndex = 0;
    children.push(para(h3[1], { heading: HeadingLevel.HEADING_3, spacingBefore: 140, spacingAfter: 80 }));
    continue;
  }

  const ul = line.match(/^\-\s+(.*)$/);
  if (ul) {
    orderedIndex = 0;
    children.push(
      new Paragraph({
        children: [textRun(ul[1])],
        bullet: { level: 0 },
        spacing: { before: 20, after: 20 },
      }),
    );
    continue;
  }

  const ol = line.match(/^(\d+)\.\s+(.*)$/);
  if (ol) {
    orderedIndex++;
    children.push(
      new Paragraph({
        children: [textRun(ol[2])],
        numbering: { reference: "num", level: 0 },
        spacing: { before: 20, after: 20 },
      }),
    );
    continue;
  }

  // Default paragraph.
  orderedIndex = 0;
  children.push(para(line));
}

const doc = new Document({
  styles: {
    default: {
      document: {
        run: {
          font: "Microsoft YaHei",
          size: 22,
        },
        paragraph: {
          spacing: { line: 276 },
        },
      },
    },
  },
  numbering: {
    config: [
      {
        reference: "num",
        levels: [
          {
            level: 0,
            format: "decimal",
            text: "%1.",
            alignment: AlignmentType.START,
          },
        ],
      },
    ],
  },
  sections: [
    {
      properties: {},
      children,
    },
  ],
});

const buf = await Packer.toBuffer(doc);
fs.mkdirSync(path.dirname(outFile), { recursive: true });
fs.writeFileSync(outFile, buf);
// eslint-disable-next-line no-console
console.log(`Wrote ${outFile}`);

