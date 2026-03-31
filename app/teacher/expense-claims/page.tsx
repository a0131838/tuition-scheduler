import { requireTeacher } from '@/lib/auth';
import { getLang, t } from '@/lib/i18n';
import { EXPENSE_CURRENCY_CODES, EXPENSE_TYPE_OPTIONS, formatExpenseMoney, formatExpensePaymentMethod, getExpenseTypeOption, listExpenseClaims } from '@/lib/expense-claims';
import ExpenseClaimForm from '@/app/_components/ExpenseClaimForm';
import ExpenseClaimSubmitButton from '@/app/_components/ExpenseClaimSubmitButton';
import { access } from 'fs/promises';
import path from 'path';
import { ExpenseClaimStatus } from '@prisma/client';
import { formatDateOnly, formatMonthKey, formatUTCDateOnly } from '@/lib/date-only';

function isPreviewableImage(name: string | null | undefined) {
  const ext = path.extname(String(name ?? '')).toLowerCase();
  return ['.png', '.jpg', '.jpeg', '.webp', '.gif'].includes(ext);
}

function shiftMonth(base: Date, delta: number) {
  return formatMonthKey(new Date(base.getFullYear(), base.getMonth() + delta, 1));
}

function buildFilterQuery(input: Record<string, string | null | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) {
    const normalized = String(value ?? '').trim();
    if (normalized) params.set(key, normalized);
  }
  return params.toString();
}

function toStoredFileAbsolutePath(relativePath: string) {
  return path.join(process.cwd(), 'public', relativePath.replace(/^\//, '').replace(/\//g, path.sep));
}

async function fileExists(relativePath: string | null | undefined) {
  if (!relativePath) return false;
  try {
    await access(toStoredFileAbsolutePath(relativePath));
    return true;
  } catch {
    return false;
  }
}

function formatExpenseClaimStatusLabel(lang: 'BILINGUAL' | 'ZH' | 'EN', status: ExpenseClaimStatus) {
  switch (status) {
    case ExpenseClaimStatus.SUBMITTED:
      return t(lang, 'Submitted, waiting for approval', '已提交，等待审批');
    case ExpenseClaimStatus.APPROVED:
      return t(lang, 'Approved, waiting for payment', '已批准，等待付款');
    case ExpenseClaimStatus.REJECTED:
      return t(lang, 'Rejected, action needed', '已驳回，需要处理');
    case ExpenseClaimStatus.PAID:
      return t(lang, 'Paid', '已付款');
    case ExpenseClaimStatus.WITHDRAWN:
      return t(lang, 'Withdrawn', '已撤回');
    default:
      return status;
  }
}

function expenseClaimStatusTone(status: ExpenseClaimStatus) {
  switch (status) {
    case ExpenseClaimStatus.APPROVED:
      return { color: '#166534', background: '#ecfdf5', border: '#bbf7d0' };
    case ExpenseClaimStatus.REJECTED:
      return { color: '#b91c1c', background: '#fef2f2', border: '#fecaca' };
    case ExpenseClaimStatus.PAID:
      return { color: '#1d4ed8', background: '#eff6ff', border: '#bfdbfe' };
    case ExpenseClaimStatus.WITHDRAWN:
      return { color: '#475569', background: '#f8fafc', border: '#cbd5e1' };
    default:
      return { color: '#92400e', background: '#fffbeb', border: '#fde68a' };
  }
}

function formatAttachmentHealthLabel(lang: 'BILINGUAL' | 'ZH' | 'EN', exists: boolean, previewable: boolean) {
  if (!exists) return t(lang, 'Attachment missing', '附件缺失');
  if (previewable) return t(lang, 'Attachment OK (preview available)', '附件正常（可预览）');
  return t(lang, 'Attachment OK (download file)', '附件正常（可下载文件）');
}

function attachmentHealthTone(exists: boolean) {
  if (exists) return { color: '#166534', background: '#ecfdf5', border: '#bbf7d0' };
  return { color: '#b91c1c', background: '#fef2f2', border: '#fecaca' };
}

export default async function TeacherExpenseClaimsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireTeacher();
  const lang = await getLang();
  const params = (await searchParams) ?? {};
  const msg = typeof params.msg === 'string' ? params.msg : '';
  const err = typeof params.err === 'string' ? params.err : '';
  const statusFilter = typeof params.status === 'string' ? params.status : 'ALL';
  const monthFilter = typeof params.month === 'string' ? params.month : '';
  const paymentBatchMonthFilter = typeof params.paymentBatchMonth === 'string' ? params.paymentBatchMonth : '';
  const currentMonth = formatMonthKey(new Date());
  const previousMonth = shiftMonth(new Date(), -1);
  const quickThisMonthHref = `/teacher/expense-claims?${buildFilterQuery({ status: statusFilter !== 'ALL' ? statusFilter : '', month: currentMonth, paymentBatchMonth: paymentBatchMonthFilter })}`;
  const quickLastMonthHref = `/teacher/expense-claims?${buildFilterQuery({ status: statusFilter !== 'ALL' ? statusFilter : '', month: previousMonth, paymentBatchMonth: paymentBatchMonthFilter })}`;
  const quickPaidThisMonthHref = `/teacher/expense-claims?${buildFilterQuery({ status: ExpenseClaimStatus.PAID, month: '', paymentBatchMonth: currentMonth })}`;
  const quickClearHref = '/teacher/expense-claims';

  const claims = await listExpenseClaims({
    submitterUserId: user.id,
    status: statusFilter as ExpenseClaimStatus | 'ALL',
    month: monthFilter || null,
    paymentBatchMonth: paymentBatchMonthFilter || null,
  });
  const claimsWithAttachmentState = await Promise.all(
    claims
      .filter((claim) => statusFilter !== 'ALL' || claim.status !== ExpenseClaimStatus.WITHDRAWN)
      .map(async (claim) => ({
      ...claim,
      attachmentExists: await fileExists(claim.receiptPath),
      })),
  );

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <h1 style={{ margin: 0 }}>{t(lang, 'My Expense Claims', '我的报销')}</h1>
      {msg ? <div style={{ padding: 10, borderRadius: 8, background: '#ecfdf5', color: '#166534' }}>{msg}</div> : null}
      {err ? <div style={{ padding: 10, borderRadius: 8, background: '#fef2f2', color: '#b91c1c' }}>{err}</div> : null}
      <ExpenseClaimForm lang={lang} action="/api/teacher/expense-claims" submitLabel={t(lang, 'Submit expense claim', '提交报销单')} />
      <section style={{ display: 'grid', gap: 12 }}>
        <h2 style={{ margin: 0 }}>{t(lang, 'My submitted claims', '我提交的报销单')}</h2>
        <section style={{ border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, display: 'grid', gap: 14 }}>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <a href={quickThisMonthHref}>{t(lang, 'This month expenses', '本月消费')}</a>
            <a href={quickLastMonthHref}>{t(lang, 'Last month expenses', '上月消费')}</a>
            <a href={quickPaidThisMonthHref}>{t(lang, 'Paid this month', '本月已付款')}</a>
            <a href={quickClearHref}>{t(lang, 'Clear filters', '清空筛选')}</a>
          </div>
          <form style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600, color: '#334155' }}>{t(lang, 'Expense filters', '消费筛选')}</div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>{t(lang, 'Status', '状态')}</span>
                  <select name="status" defaultValue={statusFilter}>
                    <option value="ALL">{t(lang, 'All active claims', '全部有效报销单')}</option>
                    {Object.values(ExpenseClaimStatus).map((status) => (
                      <option key={status} value={status}>{status}</option>
                    ))}
                  </select>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {t(lang, 'Withdrawn claims are hidden by default. Select WITHDRAWN to review them.', '已撤回报销单默认隐藏；如需查看，请在状态里选择 WITHDRAWN。')}
                  </div>
                </label>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>{t(lang, 'Expense month', '消费月份')}</span>
                  <input type="month" name="month" defaultValue={monthFilter} />
                </label>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <div style={{ fontWeight: 600, color: '#334155' }}>{t(lang, 'Payment filters', '付款筛选')}</div>
              <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
                <label style={{ display: 'grid', gap: 6 }}>
                  <span>{t(lang, 'Payment batch month', '付款批次月份')}</span>
                  <input type="month" name="paymentBatchMonth" defaultValue={paymentBatchMonthFilter} />
                </label>
              </div>
            </div>
            <div>
              <button type="submit">{t(lang, 'Apply', '应用')}</button>
            </div>
          </form>
        </section>
        {claims.length ? (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {[
                    t(lang, 'Ref', '编号'),
                    t(lang, 'Date', '日期'),
                    t(lang, 'Type', '类型'),
                    t(lang, 'Amount', '金额'),
                    t(lang, 'Status', '状态'),
                    t(lang, 'Receipt', '附件'),
                    t(lang, 'Remarks', '备注'),
                  ].map((head) => (
                    <th key={head} style={{ textAlign: 'left', borderBottom: '1px solid #e5e7eb', padding: '8px 6px' }}>{head}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {claimsWithAttachmentState.map((claim) => {
                  const statusTone = expenseClaimStatusTone(claim.status);
                  const previewable = isPreviewableImage(claim.receiptOriginalName);
                  const attachmentTone = attachmentHealthTone(claim.attachmentExists);
                  return (
                  <tr key={claim.id}>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{claim.claimRefNo}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{formatUTCDateOnly(claim.expenseDate)}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{getExpenseTypeOption(claim.expenseTypeCode)?.label ?? claim.expenseTypeCode}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>{formatExpenseMoney(claim.amountCents + (claim.gstAmountCents ?? 0), claim.currencyCode)}</td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <div
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: 999,
                          border: `1px solid ${statusTone.border}`,
                          background: statusTone.background,
                          color: statusTone.color,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {formatExpenseClaimStatusLabel(lang, claim.status)}
                      </div>
                      {claim.approverEmail ? <div style={{ color: '#64748b', fontSize: 12 }}>{claim.approverEmail}</div> : null}
                      {claim.paidAt ? <div style={{ color: '#166534', fontSize: 12 }}>{formatDateOnly(claim.paidAt)}</div> : null}
                      {claim.paymentMethod ? <div style={{ color: '#334155', fontSize: 12 }}>{formatExpensePaymentMethod(claim.paymentMethod)}</div> : null}
                      {claim.paymentReference ? <div style={{ color: '#64748b', fontSize: 12 }}>{claim.paymentReference}</div> : null}
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div
                          style={{
                            maxWidth: 260,
                            display: 'grid',
                            gap: 4,
                            padding: '8px 10px',
                            borderRadius: 10,
                            border: '1px solid #dbeafe',
                            background: '#f8fbff',
                          }}
                        >
                          <div style={{ fontSize: 11, fontWeight: 700, color: '#1d4ed8' }}>
                            {t(lang, 'Attachment note', '附件说明')}
                          </div>
                          <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                            {claim.description}
                          </div>
                        </div>
                        <div style={{ fontSize: 12, color: '#64748b', maxWidth: 220, wordBreak: 'break-all' }}>
                          {claim.receiptOriginalName}
                        </div>
                        <div
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            width: 'fit-content',
                            padding: '4px 8px',
                            borderRadius: 999,
                            border: `1px solid ${attachmentTone.border}`,
                            background: attachmentTone.background,
                            color: attachmentTone.color,
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          {formatAttachmentHealthLabel(lang, claim.attachmentExists, previewable)}
                        </div>
                        {claim.attachmentExists && previewable ? (
                          <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`}
                              alt={claim.receiptOriginalName || 'receipt'}
                              style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff' }}
                            />
                          </a>
                        ) : null}
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          {claim.attachmentExists ? (
                            <>
                              <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt`} target="_blank" rel="noreferrer">{t(lang, 'View', '查看')}</a>
                              <a href={`/api/expense-claims/${encodeURIComponent(claim.id)}/receipt?download=1`} target="_blank" rel="noreferrer">{t(lang, 'Download', '下载')}</a>
                            </>
                          ) : (
                            <span style={{ fontSize: 12, color: '#b91c1c' }}>
                              {t(lang, 'This attachment is currently unavailable. Please re-upload before resubmitting.', '当前附件不可用，请补传后再重新提交。')}
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ padding: '8px 6px', borderBottom: '1px solid #f1f5f9' }}>
                      <div style={{ display: 'grid', gap: 8 }}>
                        <div>{claim.rejectReason || claim.financeRemarks || claim.remarks || '-'}</div>
                        {claim.status === ExpenseClaimStatus.SUBMITTED ? (
                          <form
                            action="/api/teacher/expense-claims/withdraw"
                            method="post"
                            style={{
                              display: 'grid',
                              gap: 8,
                              minWidth: 240,
                              padding: 10,
                              borderRadius: 10,
                              border: '1px solid #cbd5e1',
                              background: '#f8fafc',
                            }}
                          >
                            <input type="hidden" name="claimId" value={claim.id} />
                            <div style={{ fontSize: 12, color: '#475569', lineHeight: 1.5 }}>
                              {t(
                                lang,
                                'Uploaded the wrong file or details? You can withdraw this submitted claim before it is reviewed.',
                                '如果上传错了附件或内容，可在审批前先撤回这张已提交报销单。',
                              )}
                            </div>
                            <button type="submit" style={{ width: 'fit-content' }}>
                              {t(lang, 'Withdraw claim', '撤回报销单')}
                            </button>
                          </form>
                        ) : null}
                        {claim.status === ExpenseClaimStatus.REJECTED ? (
                          <form
                            action="/api/teacher/expense-claims/resubmit"
                            method="post"
                            encType="multipart/form-data"
                            style={{
                              display: 'grid',
                              gap: 8,
                              minWidth: 280,
                              padding: 10,
                              borderRadius: 10,
                              border: '1px solid #fecaca',
                              background: '#fff7f7',
                            }}
                          >
                            <input type="hidden" name="claimId" value={claim.id} />
                            <div style={{ display: 'grid', gap: 4 }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c' }}>
                                {t(lang, 'Rejected claim: fix the issue below and resubmit', '这张报销单已驳回：请根据下方要求修正后重新提交')}
                              </div>
                              <div style={{ fontSize: 12, color: '#7f1d1d', lineHeight: 1.5 }}>
                                {t(
                                  lang,
                                  'Next step: update the receipt details, replace the attachment if needed, then submit the same claim again.',
                                  '下一步：更新收据信息，如有需要请更换附件，然后把同一张报销单重新提交。',
                                )}
                              </div>
                            </div>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Date of expense', '消费日期')}*</span>
                              <input name="expenseDate" type="date" defaultValue={formatUTCDateOnly(claim.expenseDate)} required />
                            </label>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Expense type', '报销类型')}*</span>
                              <select name="expenseTypeCode" defaultValue={claim.expenseTypeCode} required>
                                {EXPENSE_TYPE_OPTIONS.map((item) => (
                                  <option key={item.code} value={item.code}>
                                    {item.label}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <div style={{ display: 'grid', gap: 8, gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))' }}>
                              <label style={{ display: 'grid', gap: 4 }}>
                                <span style={{ fontSize: 12 }}>{t(lang, 'Currency', '货币')}*</span>
                                <select name="currencyCode" defaultValue={claim.currencyCode} required>
                                  {EXPENSE_CURRENCY_CODES.map((code) => (
                                    <option key={code} value={code}>{code}</option>
                                  ))}
                                </select>
                              </label>
                              <label style={{ display: 'grid', gap: 4 }}>
                                <span style={{ fontSize: 12 }}>{t(lang, 'Amount spent', '报销金额')}*</span>
                                <input name="amount" type="number" step="0.01" min="0" defaultValue={(claim.amountCents / 100).toFixed(2)} required />
                              </label>
                              <label style={{ display: 'grid', gap: 4 }}>
                                <span style={{ fontSize: 12 }}>{t(lang, 'GST amount', 'GST金额')}</span>
                                <input
                                  name="gstAmount"
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  defaultValue={claim.gstAmountCents === null ? '' : (claim.gstAmountCents / 100).toFixed(2)}
                                />
                              </label>
                            </div>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Student name', '学生姓名')}</span>
                              <input name="studentName" defaultValue={claim.studentName ?? ''} />
                            </label>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Location', '地点')}</span>
                              <input name="location" defaultValue={claim.location ?? ''} />
                            </label>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Attachment description / purpose', '附件说明 / 报销用途')}*</span>
                              <textarea name="description" rows={3} defaultValue={claim.description} required />
                            </label>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Remarks', '备注')}</span>
                              <textarea name="remarks" rows={2} defaultValue={claim.remarks ?? ''} />
                            </label>
                            <label style={{ display: 'grid', gap: 4 }}>
                              <span style={{ fontSize: 12 }}>{t(lang, 'Replace receipt / invoice (optional)', '更换收据/发票（可选）')}</span>
                              <input name="receiptFile" type="file" />
                            </label>
                            {!claim.attachmentExists ? (
                              <div style={{ fontSize: 12, color: '#b91c1c' }}>
                                {t(lang, 'Current attachment is missing on the server. Please upload a replacement file before resubmitting.', '当前附件在服务器上已缺失，请先上传替换文件再重新提交。')}
                              </div>
                            ) : null}
                            <ExpenseClaimSubmitButton
                              label={t(lang, 'Resubmit claim', '重新提交报销单')}
                              pendingLabel={t(lang, 'Resubmitting...', '重新提交中...')}
                            />
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ color: '#64748b' }}>{t(lang, 'No expense claims yet.', '暂无报销单。')}</div>
        )}
      </section>
    </div>
  );
}
