import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import { acceptRenewalOrder } from '@/lib/renewal-order';
import { renewalHash } from '@/lib/renewal-order-policy';
import { formatBusinessDateOnly } from '@/lib/date-only';
import OrderForm from '@/app/admin/renewals/orders/OrderForm';
export const dynamic = 'force-dynamic';
export const metadata = { robots: { index: false, follow: false }, referrer: 'no-referrer' };
async function confirm(f: FormData) {
  'use server';
  const token = String(f.get('token') || ''); if (!/^[a-f0-9]{64}$/.test(token)) return '/';
  try { if (f.get('accepted') !== 'yes') throw Error('Please review and accept / 请先阅读并确认'); const h = await headers(); await acceptRenewalOrder(token, String(f.get('name') || ''), h.get('x-forwarded-for')?.split(',')[0]?.trim() || null); return `/renewal-confirm/${token}?ok=1`; } catch (e) { return `/renewal-confirm/${token}?${new URLSearchParams({ keep: '1', err: e instanceof Error ? e.message : 'Unable to confirm / 未能确认' })}`; }
}
export default async function ParentRenewalConfirmation({ params, searchParams }: { params: Promise<{ token: string }>; searchParams: Promise<{ err?: string; ok?: string }> }) {
  const { token } = await params; const sp = await searchParams; if (!/^[a-f0-9]{64}$/.test(token)) notFound();
  const o = await prisma.renewalOrder.findUnique({ where: { parentToken: token }, include: { contract: true } }); if (!o || !o.managerAt || o.cancelledAt) notFound();
  const base = await prisma.studentContract.findUnique({ where: { id: o.baseContractId } }); if (!base?.signedAt || base.voidedAt || renewalHash(base.contractSnapshotJson) !== o.baseHash || renewalHash(o.contract.contractSnapshotJson) !== o.sourceHash) notFound();
  const s = o.contract.contractSnapshotJson as any; const terms = String((base.contractSnapshotJson as any)?.agreementHtml || '').replace(/<\/(p|h[1-6]|li)>/gi, '\n\n').replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').trim();
  return <main style={{ maxWidth: 720, margin: '24px auto', padding: 20, fontFamily: 'system-ui', lineHeight: 1.7, overflowWrap: 'anywhere' }}><h1>Renewal confirmation / 续费确认单</h1><p>{s.company?.legalName}</p><h2>{s.student?.name} · {s.package?.courseName}</h2><p><strong>{o.topUpMinutes / 60} hours / 小时 · SGD {(o.feeCents / 100).toFixed(2)}</strong></p><p>Service period / 服务期：{formatBusinessDateOnly(o.serviceFrom)} – {formatBusinessDateOnly(o.serviceTo)}</p><p>Payment due / 付款期限：{formatBusinessDateOnly(o.paymentDueAt)}</p><p>Lesson mode / 授课方式：{s.package?.lessonMode || 'As agreed / 按约定'}</p><p>This confirmation renews the same package under your signed agreement dated {formatBusinessDateOnly(base.signedAt)}. It does not authorise automatic renewals or charges. Lessons and payment follow the confirmed dates and the agreement. / 本确认单依据您于 {formatBusinessDateOnly(base.signedAt)} 签署的协议续购同条件课包，不授权自动续费或自动扣款。课程及付款按约定日期和原协议执行。</p><details><summary>Read the signed agreement / 查看原已签协议正文</summary><div style={{ whiteSpace: 'pre-wrap', fontSize: 14 }}>{terms}</div></details>
    {sp.err ? <p role="alert" style={{ color: '#b91c1c' }}>{sp.err}</p> : null}
    {o.parentAcceptedAt ? <p role="status" style={{ padding: 16, background: '#ecfdf5' }}>Confirmed by {o.parentName} / 家长已确认。Finance will verify payment and arrange activation. / 财务将核验付款并处理开通。</p> : o.parentExpiresAt < new Date() ? <p>Confirmation link expired. Please contact the school. / 确认链接已过期，请联系校方。</p> : <OrderForm action={confirm}><input type="hidden" name="token" value={token} /><label>Original contracting parent’s full name / 原签约家长完整姓名<br /><input name="name" autoComplete="name" required maxLength={150} style={{ padding: 10, maxWidth: '100%' }} /></label><label><input name="accepted" type="checkbox" value="yes" required /> I have read and accept this renewal and the referenced signed agreement. My name and confirmation constitute my electronic acceptance of this renewal. / 我已阅读并同意本次续费及引用的原协议，填写姓名并确认即表示我对本次续费的电子接受。</label><button style={{ padding: 12 }}>Confirm renewal / 确认本次续费</button></OrderForm>}
  </main>;
}
