/** Historical evidence survives VOID, even when invoice creation never completed. */
type ApplicationHistory = {
  status: string;
  signedAt?: unknown; invoiceCreatedAt?: unknown; invoiceId?: unknown; invoiceNo?: unknown;
  signatureImagePath?: unknown; signedPdfPath?: unknown; signerName?: unknown;
  signerEmail?: unknown; signerPhone?: unknown; signerIp?: unknown;
  signToken?: unknown; signExpiresAt?: unknown; signViewedAt?: unknown; contractSnapshotJson?: unknown;
  parentInfoToken?: unknown; parentInfoExpiresAt?: unknown; parentInfoViewedAt?: unknown; parentInfoSubmittedAt?: unknown;
  events: {eventType: string}[];
};
export function schoolApplicationHasSignedHistory(row: ApplicationHistory) {
  return row.status === 'SIGNED' || row.status === 'INVOICE_CREATED' ||
    [row.signedAt, row.invoiceCreatedAt, row.invoiceId, row.invoiceNo, row.signatureImagePath,
      row.signedPdfPath, row.signerName, row.signerEmail, row.signerPhone, row.signerIp].some(Boolean) ||
    row.events.some(e => ['SIGNED', 'INVOICE_CREATED'].includes(e.eventType));
}
export function canDeleteVoidedSchoolApplication(row: ApplicationHistory) {
  return row.status === 'VOID' && !schoolApplicationHasSignedHistory(row) &&
    ![row.signToken, row.signExpiresAt, row.signViewedAt, row.contractSnapshotJson,
      row.parentInfoToken, row.parentInfoExpiresAt, row.parentInfoViewedAt, row.parentInfoSubmittedAt].some(Boolean) &&
    row.events.every(e => ['GENERATED', 'DRAFT_SAVED', 'VOIDED'].includes(e.eventType));
}
