'use server';
import { requireAdminAreaUser } from '@/lib/auth';
import { createRenewalOrder, updateRenewalOrder } from '@/lib/renewal-order';
import { revalidatePath } from 'next/cache';
export async function orderAction(f: FormData) {
    const actor = await requireAdminAreaUser();
    const id = String(f.get('id') || '');
    let target = id;
    try {
        if (f.get('action') === 'CREATE') {
            const o = await createRenewalOrder({ contractId: String(f.get('contractId') || ''), baseContractId: String(f.get('baseContractId') || ''), academicNote: String(f.get('note') || ''), serviceFrom: new Date(String(f.get('serviceFrom')) + 'T00:00:00+08:00'), serviceTo: new Date(String(f.get('serviceTo')) + 'T23:59:59+08:00'), paymentDueAt: new Date(String(f.get('paymentDue')) + 'T23:59:59+08:00'), actor });
            target = o.id;
        }
        else {
            const data: Record<string, string> = {};
            for (const key of ['note', 'invoiceId', 'minutes', 'limit', 'due', 'owner'])
                data[key] = String(f.get(key) || '');
            if (data.due)
                data.due += 'T23:59:59+08:00';
            await updateRenewalOrder(id, String(f.get('action')), data, actor);
        }
        for (const path of ['/admin/approvals', '/admin/todos', '/admin/renewals/orders', '/admin/finance/renewal-signature-exceptions'])
            revalidatePath(path);
        return `/admin/renewals/orders?id=${encodeURIComponent(target)}&ok=1`;
    }
    catch (e) {
        return `/admin/renewals/orders?${new URLSearchParams({ ...(target ? { id: target } : {}), err: e instanceof Error ? e.message : 'Unable to save / 未能保存' })}`;
    }
}
