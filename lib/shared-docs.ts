import { prisma } from '@/lib/prisma';
import { isManagerUser } from '@/lib/auth';

const DEFAULT_DOC_CATEGORIES = ['合同', '财务', '运营', '制度', '其他'];

type SharedDocUser = {
  id: string;
  email: string;
  role: 'ADMIN' | 'FINANCE' | 'TEACHER' | 'STUDENT';
};

export async function canAccessSharedDocs(user: SharedDocUser | null | undefined) {
  if (!user) return false;
  if (user.role !== 'ADMIN') return false;
  return isManagerUser(user);
}

export async function ensureDefaultDocumentCategories() {
  const count = await prisma.documentCategory.count();
  if (count > 0) return;
  await prisma.documentCategory.createMany({
    data: DEFAULT_DOC_CATEGORIES.map((name) => ({ name })),
    skipDuplicates: true,
  });
}
