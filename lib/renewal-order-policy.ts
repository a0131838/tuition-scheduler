import crypto from 'node:crypto';
export const renewalHash = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export function sameRenewalTerms(base: any, current: any) {
    if (!base || !current || base.templateSlug !== 'tuition-agreement' || current.templateSlug !== base.templateSlug || base.templateVersion !== current.templateVersion || base.templateVersion < 2 || base.care?.included || current.care?.included || !current.agreementHtml?.includes('data-renewal-framework="1"') || !base.agreementHtml?.includes('data-renewal-framework="1"'))
        return false;
    const keys = ['courseName', 'packageType', 'totalMinutes', 'feeAmount', 'lessonMode', 'campusName', 'billTo'];
    const clauses = (s: any) => String(s.agreementHtml || '').split('<h3>1.')[1]?.split('<h3>12.')[0];
    if (!clauses(base) || clauses(base) !== clauses(current))
        return false;
    return keys.every(k => base.package?.[k] === current.package?.[k]) &&
        base.parent?.parentFullNameEn && base.parent.parentFullNameEn === current.parent?.parentFullNameEn &&
        base.parent.phone === current.parent.phone && base.parent.email === current.parent.email &&
        base.company?.legalName === current.company?.legalName && base.company?.regNo === current.company?.regNo;
}
export function validateCredit(input: {
    minutes: number;
    limitCents: number;
    due: Date;
    totalMinutes: number;
    feeCents: number;
    serviceTo: Date;
}, now = new Date()) {
    if (!Number.isSafeInteger(input.minutes) || input.minutes <= 0 || input.minutes > input.totalMinutes ||
        !Number.isSafeInteger(input.limitCents) || input.limitCents <= 0 || input.limitCents > input.feeCents ||
        Math.ceil(input.feeCents * input.minutes / input.totalMinutes) > input.limitCents ||
        !Number.isFinite(input.due.getTime()) || input.due <= now || input.due > input.serviceTo || input.due.getTime() > now.getTime() + 30 * 86400000) {
        throw Error('Credit must fit this renewal, its amount cap and a deadline within 30 days / 临时续课须在本次课时及金额额度内，到期日不得超过30天或服务期');
    }
}
