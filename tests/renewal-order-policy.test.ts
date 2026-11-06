import test from 'node:test';
import assert from 'node:assert/strict';
import { sameRenewalTerms, validateCredit } from '../lib/renewal-order-policy';
import { buildStudentContractSnapshot } from '../lib/student-contract-template';
const snapshot = () => buildStudentContractSnapshot({ studentId: 's', studentName: 'Test student', packageId: 'p', businessInfo: { courseName: 'English', packageType: 'HOURS', totalMinutes: 3000, feeAmount: 5500, billTo: 'Test parent', agreementDateIso: '2026-11-06' }, parentInfo: { parentFullNameEn: 'Test parent', phone: '123', email: 'test@example.com', relationshipToStudent: 'Parent', isLegalGuardian: true } }).snapshot;
test('same-term renewal requires signed-framework version and exact commercial and guardian terms', () => {
    const s = snapshot();
    assert.equal(sameRenewalTerms(s, s), true);
    for (const patch of [{ templateVersion: 1 }, { templateSlug: 'ssg-standard-pei-student-contract-v4' }, { care: { included: true } }, { package: { ...s.package, feeAmount: 5501 } }, { package: { ...s.package, totalMinutes: 3600 } }, { parent: { ...s.parent, email: 'different@example.com' } }, { agreementHtml: s.agreementHtml.replace('24 hours', '12 hours') }])
        assert.equal(Boolean(sameRenewalTerms(s, { ...s, ...patch })), false);
});
test('credit cap binds hours, monetary exposure, expiry and renewal size', () => {
    const now = new Date('2026-11-06T00:00:00Z'), base = { minutes: 120, limitCents: 22000, due: new Date('2026-11-10'), totalMinutes: 3000, feeCents: 550000, serviceTo: new Date('2027-01-01') };
    assert.doesNotThrow(() => validateCredit(base, now));
    for (const patch of [{ minutes: 0 }, { minutes: 3001 }, { minutes: 1.5 }, { limitCents: 21999 }, { due: now }, { due: new Date('2026-12-20') }, { serviceTo: new Date('2026-11-08') }])
        assert.throws(() => validateCredit({ ...base, ...patch }, now));
});
