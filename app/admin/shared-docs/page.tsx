import { prisma } from '@/lib/prisma';
import { getLang, t } from '@/lib/i18n';
import { canAccessSharedDocs, ensureDefaultDocumentCategories, toSharedDocCategoryFolderName } from '@/lib/shared-docs';
import { requireAdmin } from '@/lib/auth';
import { storeSharedDocFile } from '@/lib/shared-doc-files';
import { deleteSharedDocFromS3, parseSharedDocS3Path } from '@/lib/shared-doc-storage';
import { formatBusinessDateTime } from '@/lib/date-only';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { BUSINESS_UPLOAD_PREFIX, deleteStoredBusinessFile } from '@/lib/business-file-storage';

function text(v: FormDataEntryValue | null | undefined) {
  return String(v ?? '').trim();
}

function enc(v: string) {
  return encodeURIComponent(v);
}

async function requireSharedDocsOperator() {
  const user = await requireAdmin();
  if (!(await canAccessSharedDocs(user))) {
    redirect('/admin?err=shared-docs-forbidden');
  }
  return user;
}

async function addCategoryAction(formData: FormData) {
  'use server';
  await requireSharedDocsOperator();

  const name = text(formData.get('name')).slice(0, 40);
  if (!name) redirect('/admin/shared-docs?err=category-required');

  try {
    await prisma.documentCategory.create({ data: { name } });
  } catch {
    redirect('/admin/shared-docs?err=category-exists');
  }

  revalidatePath('/admin/shared-docs');
  redirect('/admin/shared-docs?msg=category-created');
}

async function uploadDocumentAction(formData: FormData) {
  'use server';
  const user = await requireSharedDocsOperator();

  await ensureDefaultDocumentCategories();

  const categoryId = text(formData.get('categoryId'));
  const remarks = text(formData.get('remarks')).slice(0, 500);
  const file = formData.get('file');

  if (!categoryId) redirect('/admin/shared-docs?err=category-required');
  if (!(file instanceof File) || !file.size) redirect('/admin/shared-docs?err=file-required');

  const category = await prisma.documentCategory.findFirst({ where: { id: categoryId, isActive: true } });
  if (!category) redirect('/admin/shared-docs?err=category-not-found');

  let stored: {
    relativePath: string;
    originalName: string;
    sizeBytes: number;
    mimeType: string | null;
  };

  try {
    stored = await storeSharedDocFile(file, { categoryName: category.name });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Upload failed';
    redirect(`/admin/shared-docs?err=${enc(message)}`);
  }

  const titleRaw = text(formData.get('title'));
  const title = (titleRaw || stored.originalName).slice(0, 120);
  if (!title) redirect('/admin/shared-docs?err=title-required');

  await prisma.$transaction(async (tx) => {
    const created = await tx.sharedDocument.create({
      data: {
        title,
        categoryId,
        filePath: stored.relativePath,
        originalFileName: stored.originalName,
        fileSizeBytes: stored.sizeBytes,
        mimeType: stored.mimeType,
        remarks: remarks || null,
        uploadedByUserId: user.id,
      },
    });

    await tx.sharedDocumentAudit.create({
      data: {
        documentId: created.id,
        actorUserId: user.id,
        action: 'UPLOAD',
        note: remarks || null,
      },
    });
  });

  revalidatePath('/admin/shared-docs');
  redirect('/admin/shared-docs?msg=uploaded');
}

async function updateDocumentStatusAction(formData: FormData) {
  'use server';
  const user = await requireSharedDocsOperator();

  const id = text(formData.get('id'));
  const nextStatus = text(formData.get('nextStatus')).toUpperCase();
  if (!id || (nextStatus !== 'ACTIVE' && nextStatus !== 'ARCHIVED')) {
    redirect('/admin/shared-docs?err=invalid-operation');
  }

  const row = await prisma.sharedDocument.findUnique({ where: { id }, select: { id: true, status: true } });
  if (!row) redirect('/admin/shared-docs?err=not-found');
  if (row.status === nextStatus) redirect('/admin/shared-docs?err=status-unchanged');

  await prisma.$transaction(async (tx) => {
    await tx.sharedDocument.update({
      where: { id },
      data:
        nextStatus === 'ARCHIVED'
          ? { status: 'ARCHIVED', archivedAt: new Date(), archivedByEmail: user.email }
          : { status: 'ACTIVE', archivedAt: null, archivedByEmail: null },
    });

    await tx.sharedDocumentAudit.create({
      data: {
        documentId: id,
        actorUserId: user.id,
        action: nextStatus === 'ARCHIVED' ? 'ARCHIVE' : 'UNARCHIVE',
      },
    });
  });

  revalidatePath('/admin/shared-docs');
  redirect(`/admin/shared-docs?msg=${nextStatus === 'ARCHIVED' ? 'archived' : 'unarchived'}`);
}

async function deleteDocumentAction(formData: FormData) {
  'use server';
  const user = await requireSharedDocsOperator();

  const id = text(formData.get('id'));
  if (!id) redirect('/admin/shared-docs?err=invalid-operation');

  const row = await prisma.sharedDocument.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      filePath: true,
    },
  });
  if (!row) redirect('/admin/shared-docs?err=not-found');

  try {
    if (parseSharedDocS3Path(row.filePath)) {
      await deleteSharedDocFromS3(row.filePath);
    } else {
      await deleteStoredBusinessFile(row.filePath, BUSINESS_UPLOAD_PREFIX.sharedDocs);
    }
  } catch {
    redirect('/admin/shared-docs?err=delete-file-failed');
  }

  await prisma.$transaction(async (tx) => {
    await tx.sharedDocumentAudit.create({
      data: {
        documentId: row.id,
        actorUserId: user.id,
        action: 'DELETE',
        note: row.title,
      },
    });
    await tx.sharedDocument.delete({ where: { id: row.id } });
  });

  revalidatePath('/admin/shared-docs');
  redirect('/admin/shared-docs?msg=deleted');
}

export default async function SharedDocsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    q?: string;
    status?: string;
    categoryId?: string;
    msg?: string;
    err?: string;
  }>;
}) {
  await requireSharedDocsOperator();
  await ensureDefaultDocumentCategories();
  const lang = await getLang();

  const sp = await searchParams;
  const q = String(sp?.q ?? '').trim();
  const status = String(sp?.status ?? '').trim().toUpperCase();
  const categoryId = String(sp?.categoryId ?? '').trim();

  const where: {
    status?: 'ACTIVE' | 'ARCHIVED';
    categoryId?: string;
    OR?: Array<{ title?: { contains: string; mode: 'insensitive' }; originalFileName?: { contains: string; mode: 'insensitive' }; remarks?: { contains: string; mode: 'insensitive' } }>;
  } = {};

  if (status === 'ACTIVE' || status === 'ARCHIVED') where.status = status;
  if (categoryId) where.categoryId = categoryId;
  if (q) {
    where.OR = [
      { title: { contains: q, mode: 'insensitive' } },
      { originalFileName: { contains: q, mode: 'insensitive' } },
      { remarks: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [categories, docs] = await Promise.all([
    prisma.documentCategory.findMany({ where: { isActive: true }, orderBy: { name: 'asc' } }),
    prisma.sharedDocument.findMany({
      where,
      include: {
        category: true,
        uploader: { select: { name: true, email: true } },
      },
      orderBy: [{ createdAt: 'desc' }],
      take: 200,
    }),
  ]);
  const groupedDocs = categories
    .map((category) => ({
      category,
      docs: docs.filter((doc) => doc.categoryId === category.id),
    }))
    .filter((group) => group.docs.length > 0);

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <h1 style={{ margin: 0 }}>{t(lang, 'Shared Document Library', '共享文档库')}</h1>

      {sp?.msg ? (
        <div style={{ padding: 10, borderRadius: 10, border: '1px solid #86efac', background: '#f0fdf4', color: '#166534' }}>
          {sp.msg}
        </div>
      ) : null}
      {sp?.err ? (
        <div style={{ padding: 10, borderRadius: 10, border: '1px solid #fecaca', background: '#fef2f2', color: '#991b1b' }}>
          {sp.err}
        </div>
      ) : null}

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t(lang, 'Upload a shared document', '上传共享文档')}</div>
        <div
          style={{
            padding: 10,
            borderRadius: 10,
            border: '1px solid #bfdbfe',
            background: '#eff6ff',
            color: '#1d4ed8',
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          {t(
            lang,
            'Each category is stored in its own folder. Example: shared-docs/finance/2026-04/...',
            '每个分类都会进入自己的文件夹。例如：shared-docs/finance/2026-04/...'
          )}
        </div>
        <form action={uploadDocumentAction} encType="multipart/form-data" style={{ display: 'grid', gap: 8 }}>
          <input name="title" placeholder={t(lang, 'Title (optional, defaults to file name)', '标题（可选，默认文件名）')} />
          <select name="categoryId" required defaultValue="">
            <option value="">{t(lang, 'Select category', '选择分类')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="file" type="file" required />
          <textarea
            name="remarks"
            rows={2}
            maxLength={500}
            placeholder={t(lang, 'Remarks (optional)', '备注（可选）')}
            style={{ width: '100%' }}
          />
          <div style={{ color: '#64748b' }}>{t(lang, 'Max file size: 25MB', '最大文件大小：25MB')}</div>
          <button type="submit" style={{ width: 180 }}>
            {t(lang, 'Upload', '上传')}
          </button>
        </form>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t(lang, 'Manage categories', '管理分类')}</div>
        <form action={addCategoryAction} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input name="name" placeholder={t(lang, 'New category name', '新分类名称')} maxLength={40} required />
          <button type="submit">{t(lang, 'Add category', '新增分类')}</button>
        </form>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12, display: 'grid', gap: 10 }}>
        <div style={{ fontWeight: 700 }}>{t(lang, 'Filter documents', '筛选文档')}</div>
        <form method="get" style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input name="q" defaultValue={q} placeholder={t(lang, 'Search title / filename / remarks', '搜索标题 / 文件名 / 备注')} />
          <select name="status" defaultValue={status}>
            <option value="">{t(lang, 'All status', '全部状态')}</option>
            <option value="ACTIVE">{t(lang, 'Active', '在用')}</option>
            <option value="ARCHIVED">{t(lang, 'Archived', '归档')}</option>
          </select>
          <select name="categoryId" defaultValue={categoryId}>
            <option value="">{t(lang, 'All categories', '全部分类')}</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button type="submit">{t(lang, 'Apply', '筛选')}</button>
          <a href="/admin/shared-docs">{t(lang, 'Reset', '重置')}</a>
        </form>
      </section>

      <section style={{ border: '1px solid #e2e8f0', borderRadius: 12, background: '#fff', padding: 12 }}>
        <div style={{ fontWeight: 700, marginBottom: 8 }}>
          {t(lang, 'Document folders', '文档文件夹')} ({docs.length})
        </div>
        {docs.length === 0 ? (
          <div style={{ color: '#64748b' }}>{t(lang, 'No documents found.', '暂无文档。')}</div>
        ) : (
          <div style={{ display: 'grid', gap: 14 }}>
            {groupedDocs.map(({ category, docs: categoryDocs }) => {
              const folderName = toSharedDocCategoryFolderName(category.name);
              return (
                <section key={category.id} style={{ border: '1px solid #dbeafe', borderRadius: 12, overflow: 'hidden' }}>
                  <div
                    style={{
                      padding: '10px 12px',
                      background: '#eff6ff',
                      borderBottom: '1px solid #dbeafe',
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 12,
                      flexWrap: 'wrap',
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700 }}>
                        {category.name} ({categoryDocs.length})
                      </div>
                      <div style={{ color: '#1d4ed8', fontSize: 12 }}>
                        {t(lang, 'Folder', '文件夹')}: shared-docs/{folderName}/
                      </div>
                    </div>
                  </div>
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>
                          <th>{t(lang, 'Title', '标题')}</th>
                          <th>{t(lang, 'Status', '状态')}</th>
                          <th>{t(lang, 'Uploader', '上传人')}</th>
                          <th>{t(lang, 'Uploaded at', '上传时间')}</th>
                          <th>{t(lang, 'File', '文件')}</th>
                          <th>{t(lang, 'Action', '操作')}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {categoryDocs.map((row) => (
                          <tr key={row.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '8px 4px' }}>
                              <div style={{ fontWeight: 700 }}>{row.title}</div>
                              {row.remarks ? <div style={{ color: '#64748b' }}>{row.remarks}</div> : null}
                            </td>
                            <td style={{ padding: '8px 4px' }}>{row.status === 'ACTIVE' ? t(lang, 'Active', '在用') : t(lang, 'Archived', '归档')}</td>
                            <td style={{ padding: '8px 4px' }}>
                              <div>{row.uploader.name}</div>
                              <div style={{ color: '#64748b' }}>{row.uploader.email}</div>
                            </td>
                            <td style={{ padding: '8px 4px' }}>{formatBusinessDateTime(new Date(row.createdAt))}</td>
                            <td style={{ padding: '8px 4px' }}>
                              <a href={`/api/shared-docs/${row.id}/file`} target="_blank" rel="noreferrer">
                                {t(lang, 'Open', '打开')}
                              </a>{' '}
                              |{' '}
                              <a href={`/api/shared-docs/${row.id}/file?download=1`}>{t(lang, 'Download', '下载')}</a>
                            </td>
                            <td style={{ padding: '8px 4px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                              <form action={updateDocumentStatusAction}>
                                <input type="hidden" name="id" value={row.id} />
                                <input type="hidden" name="nextStatus" value={row.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE'} />
                                <button type="submit">{row.status === 'ACTIVE' ? t(lang, 'Archive', '归档') : t(lang, 'Restore', '恢复')}</button>
                              </form>
                              <form action={deleteDocumentAction}>
                                <input type="hidden" name="id" value={row.id} />
                                <button type="submit" style={{ color: '#b91c1c', borderColor: '#fecaca' }}>
                                  {t(lang, 'Delete', '删除')}
                                </button>
                              </form>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}
