import { prisma } from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { canAccessSharedDocs } from '@/lib/shared-docs';
import { activeTeacherNoticeAttachments, getAllTeacherNotices } from '@/lib/teacher-notices';
import { signSharedDocS3DownloadUrl } from '@/lib/shared-doc-storage';
import { buildStoredBusinessFileResponse, BUSINESS_UPLOAD_PREFIX } from '@/lib/business-file-storage';
import path from 'path';

export const runtime = 'nodejs';

async function canAccessTeacherNoticeAttachment(user: Awaited<ReturnType<typeof getCurrentUser>>, documentId: string) {
  if (!user || (user.role !== 'TEACHER' && user.role !== 'ADMIN' && user.role !== 'FINANCE')) return false;
  const { notices } = await getAllTeacherNotices();
  return activeTeacherNoticeAttachments(notices).has(documentId);
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return new Response('Unauthorized', { status: 401 });
  const { id } = await params;
  const canAccessLibrary = await canAccessSharedDocs(user);
  const canAccessNoticeAttachment = await canAccessTeacherNoticeAttachment(user, id);
  if (!canAccessLibrary && !canAccessNoticeAttachment) return new Response('Forbidden', { status: 403 });

  const row = await prisma.sharedDocument.findUnique({
    where: { id },
    select: {
      filePath: true,
      originalFileName: true,
      mimeType: true,
      status: true,
    },
  });
  if (!row) return new Response('Not Found', { status: 404 });
  if (canAccessNoticeAttachment && row.status !== 'ACTIVE') return new Response('Not Found', { status: 404 });

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
