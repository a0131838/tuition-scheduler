import { getRenewalActions } from '@/lib/renewal-action-queue';
export default async function RenewalActionsPanel({ actor }: { actor: { email: string; role: string } }) {
  const actions = await getRenewalActions(actor);
  if (!actions.length) return null;
  return <section aria-label="Renewal actions / 续费待办" style={{ border: '2px solid #f59e0b', borderRadius: 12, padding: 16, background: '#fffbeb', overflowWrap: 'anywhere' }}>
    <h2 style={{ margin: '0 0 12px' }}>Renewal actions / 续费待办 · {actions.length}</h2>
    {actions.slice(0, 6).map(a => <div key={a.key} style={{ padding: '10px 0', borderTop: '1px solid #fde68a' }}><strong>{a.title}</strong> · SGD {a.amount.toFixed(2)}<p>{a.status}{a.overdue ? ' · Overdue / 已超时' : ''}</p><a href={a.href}>Open task / 打开处理 →</a></div>)}
    <a href="/admin/approvals">All approval tasks / 全部审批待办 →</a>
  </section>;
}
