const icon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="#EC5E0A"/>
  <path d="M18 20h29v8H28v6h16v8H28v10H18V20Z" fill="#fff"/>
</svg>`;

export const dynamic = "force-static";

export function GET() {
  return new Response(icon, {
    headers: {
      "content-type": "image/svg+xml; charset=utf-8",
      "cache-control": "public, max-age=604800, immutable",
      "content-length": String(Buffer.byteLength(icon)),
      "x-content-type-options": "nosniff",
    },
  });
}
