import { getCurrentUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { BUSINESS_UPLOAD_PREFIX, resolveStoredBusinessFilePath } from '@/lib/business-file-storage';
import { TEACHER_TRAINING_CATEGORY } from '@/lib/teacher-training-materials';
import { GET as sharedFile } from '../[id]/file/route';
import { GET as trainingFile } from '@/app/api/training/materials/[id]/file/route';

export const runtime = 'nodejs';

// Legacy storage links use the same document permissions as current library links.
export async function GET(req: Request) {
  if (!(await getCurrentUser())) return new Response('Unauthorized', { status: 401 });
  const url = new URL(req.url);
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); }
  catch { return new Response('Not Found', { status: 404 }); }
  // Rewritten requests retain the public URL on some Next deployments.
  const filePath = pathname.startsWith(BUSINESS_UPLOAD_PREFIX.sharedDocs) ? pathname : url.searchParams.get('path') || '';
  if (!resolveStoredBusinessFilePath(filePath, BUSINESS_UPLOAD_PREFIX.sharedDocs)) return new Response('Not Found', { status: 404 });
  const matches = await prisma.sharedDocument.findMany({
    where: { filePath }, select: { id: true, category: { select: { name: true } } }, take: 2,
  });
  // Unknown or multiply-owned history cannot acquire permissions by guessing.
  if (matches.length !== 1) return new Response('Not Found', { status: 404 });
  const row = matches[0];
  const handler = row.category.name === TEACHER_TRAINING_CATEGORY ? trainingFile : sharedFile;
  return handler(req, { params: Promise.resolve({ id: row.id }) });
}
