import { EXPENSE_CURRENCY_CODES, EXPENSE_TYPE_OPTIONS } from '@/lib/expense-claims';
import { t } from '@/lib/i18n';
import ExpenseClaimSubmitButton from '@/app/_components/ExpenseClaimSubmitButton';

export default function ExpenseClaimForm({
  lang,
  action,
  submitLabel,
}: {
  lang: 'BILINGUAL' | 'ZH' | 'EN';
  action: (formData: FormData) => Promise<void>;
  submitLabel?: string;
}) {
  return (
    <form action={action} style={{ display: 'grid', gap: 12, padding: 16, border: '1px solid #dbeafe', borderRadius: 12, background: '#f8fbff' }}>
      <div style={{ fontWeight: 700 }}>{t(lang, 'New Expense Claim', '新建报销单')}</div>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
        <label>
          {t(lang, 'Date of expense', '消费日期')}*
          <input name="expenseDate" type="date" required style={{ width: '100%' }} />
        </label>
        <label>
          {t(lang, 'Currency', '货币')}*
          <select name="currencyCode" defaultValue="SGD" required style={{ width: '100%' }}>
            {EXPENSE_CURRENCY_CODES.map((code) => (
              <option key={code} value={code}>{code}</option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, 'Expense type', '报销类型')}*
          <select name="expenseTypeCode" defaultValue="REIMBURSEMENT" required style={{ width: '100%' }}>
            {EXPENSE_TYPE_OPTIONS.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>
        <label>
          {t(lang, 'Amount spent', '报销金额')}*
          <input name="amount" type="number" step="0.01" min="0" required style={{ width: '100%' }} />
        </label>
        <label>
          {t(lang, 'GST amount', 'GST金额')} ({t(lang, 'optional', '可选')})
          <input name="gstAmount" type="number" step="0.01" min="0" style={{ width: '100%' }} />
        </label>
        <label>
          {t(lang, 'Student name', '学生姓名')}
          <input name="studentName" placeholder={t(lang, 'Required for teaching-related claims', '教学相关报销请填写学生姓名')} style={{ width: '100%' }} />
        </label>
        <label>
          {t(lang, 'Location', '地点')}
          <input name="location" placeholder={t(lang, 'Required for transport claims', '交通报销请填写地点')} style={{ width: '100%' }} />
        </label>
        <label>
          {t(lang, 'Receipt / invoice', '收据/发票')}*
          <input name="receiptFile" type="file" required style={{ width: '100%' }} />
        </label>
      </div>
      <label>
        {t(lang, 'Attachment description / purpose', '附件说明 / 报销用途')}*
        <textarea
          name="description"
          required
          rows={4}
          placeholder={t(
            lang,
            'Describe what the attachment is for and why this expense is needed. Include student name if relevant.',
            '请写清附件对应内容和报销用途；若与教学相关，请写明学生姓名。',
          )}
          style={{ width: '100%' }}
        />
      </label>
      <label>
        {t(lang, 'Remarks', '备注')}
        <textarea name="remarks" rows={3} style={{ width: '100%' }} />
      </label>
      <div style={{ fontSize: 13, color: '#475569' }}>
        {t(
          lang,
          'Claims are submitted first, then approved, exported by finance, and finally marked as paid.',
          '报销单先提交，再审批，财务导出付款，最后标记为已付款。',
        )}
      </div>
      <ExpenseClaimSubmitButton
        label={submitLabel ?? t(lang, 'Submit claim', '提交报销单')}
        pendingLabel={t(lang, 'Submitting...', '提交中...')}
      />
    </form>
  );
}
