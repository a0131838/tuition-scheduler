import { getSchoolApplicationById } from '@/lib/school-application';
import { canReadSchoolApplicationDocument } from '@/lib/school-application-document-access';
import { BUSINESS_UPLOAD_PREFIX, buildStoredBusinessFileResponse } from '@/lib/business-file-storage';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const app = await getSchoolApplicationById((await params).id);
  if (!app || !await canReadSchoolApplicationDocument(req, app)) return new Response('Forbidden / 无权访问', { status: 403 });
  if (!app.signatureImagePath) return new Response('Not Found', { status: 404 });
  const response = await buildStoredBusinessFileResponse(req, { allowedPrefix: BUSINESS_UPLOAD_PREFIX.contractSignatures, relativePath: app.signatureImagePath, originalFileName: 'signature.png', fallbackFileName: 'signature.png', contentType: 'image/png' });
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  return response;
}
