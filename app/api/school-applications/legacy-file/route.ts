import { prisma } from '@/lib/prisma';
import { getSchoolApplicationById } from '@/lib/school-application';
import { canReadSchoolApplicationDocument } from '@/lib/school-application-document-access';
import { isSchoolApplicationStoredPath } from '@/lib/school-application-document-policy';
import { BUSINESS_UPLOAD_PREFIX, buildStoredBusinessFileResponse, resolveStoredBusinessFilePath } from '@/lib/business-file-storage';

export async function GET(req: Request) {
  const url = new URL(req.url);
  let pathname: string;
  try { pathname = decodeURIComponent(url.pathname); } catch { return new Response('Not Found', { status: 404 }); }
  const filePath = isSchoolApplicationStoredPath(pathname) ? pathname : url.searchParams.get('path') || '';
  const signature = filePath.startsWith(BUSINESS_UPLOAD_PREFIX.contractSignatures);
  const prefix = signature ? BUSINESS_UPLOAD_PREFIX.contractSignatures : BUSINESS_UPLOAD_PREFIX.contracts;
  if (!isSchoolApplicationStoredPath(filePath) || !resolveStoredBusinessFilePath(filePath, prefix)) return new Response('Not Found', { status: 404 });
  const rows = await prisma.schoolApplicationService.findMany({ where: { OR: [{ signedPdfPath: filePath }, { signatureImagePath: filePath }] }, select: { id: true }, take: 2 });
  if (rows.length !== 1) return new Response('Not Found', { status: 404 });
  const app = await getSchoolApplicationById(rows[0].id);
  if (!app || !await canReadSchoolApplicationDocument(req, app)) return new Response('Forbidden / 无权访问', { status: 403 });
  const name = signature ? 'signature.png' : 'school-application.pdf';
  const response = await buildStoredBusinessFileResponse(req, { allowedPrefix: prefix, relativePath: filePath, originalFileName: name, fallbackFileName: name, contentType: signature ? 'image/png' : 'application/pdf' });
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
