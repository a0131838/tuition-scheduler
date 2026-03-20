import { readFile, stat } from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessSharedDocs } from '@/lib/shared-docs';
import { signSharedDocS3DownloadUrl } from '@/lib/shared-doc-storage';

export const runtime = 'nodejs';

const MIME_BY_EXT: Record<string, string> = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt': 'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.txt': 'text/plain; charset=utf-8',
  '.csv': 'text/csv; charset=utf-8',
  '.zip': 'application/zip',
};

function toAsciiFilename(name: string) {
  const ext = path.extname(name);
  const base = path
    .basename(name, ext)
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  return `${base || 'document'}${ext}`;
}

function buildSharedDocFilePath(filePath: string) {
  const normalized = String(filePath || '').trim();
  if (!normalized.startsWith('/uploads/shared-docs/')) return null;
  const rel = normalized.replace(/^\//, '');
  if (rel.includes('..')) return null;
  return path.join(process.cwd(), 'public', ...rel.split('/'));
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  if (!(await canAccessSharedDocs(user))) return new Response('Forbidden', { status: 403 });

  const { id } = await params;
  const row = await prisma.sharedDocument.findUnique({
    where: { id },
    select: {
      filePath: true,
      originalFileName: true,
      mimeType: true,
    },
  });
  if (!row) return new Response('Not Found', { status: 404 });

  const url = new URL(req.url);
  const download = url.searchParams.get('download') === '1';

  const signedUrl = await signSharedDocS3DownloadUrl({
    filePath: row.filePath,
    contentType: row.mimeType,
    originalFileName: path.basename(row.originalFileName || 'document'),
    download,
  });
  if (signedUrl) {
    return Response.redirect(signedUrl, 302);
  }

  const absPath = buildSharedDocFilePath(row.filePath);
  if (!absPath) return new Response('Not Found', { status: 404 });

  try {
    const st = await stat(absPath);
    if (!st.isFile()) return new Response('Not Found', { status: 404 });
  } catch {
    return new Response('Not Found', { status: 404 });
  }

  const safeName = path.basename(row.originalFileName || 'document');
  const ext = path.extname(safeName).toLowerCase();
  const contentType = row.mimeType || MIME_BY_EXT[ext] || 'application/octet-stream';
  const body = await readFile(absPath);

  const asciiName = toAsciiFilename(safeName);
  const encodedName = encodeURIComponent(safeName);

  const headers = new Headers({
    'content-type': contentType,
    'cache-control': 'private, max-age=3600',
    'content-length': String(body.byteLength),
  });

  if (download) {
    headers.set(
      'content-disposition',
      `attachment; filename="${asciiName.replace(/"/g, '')}"; filename*=UTF-8''${encodedName}`
    );
  }

  return new Response(body, { status: 200, headers });
}
