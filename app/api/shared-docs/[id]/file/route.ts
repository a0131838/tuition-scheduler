import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessSharedDocs } from '@/lib/shared-docs';
import { signSharedDocS3DownloadUrl } from '@/lib/shared-doc-storage';
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from '@/lib/business-file-storage';
import path from 'path';

export const runtime = 'nodejs';

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

  return buildStoredBusinessFileResponse(req, {
    allowedPrefix: BUSINESS_UPLOAD_PREFIX.sharedDocs,
    relativePath: row.filePath,
    originalFileName: path.basename(row.originalFileName || 'document'),
    fallbackFileName: 'document',
    contentType: row.mimeType,
  });
}
