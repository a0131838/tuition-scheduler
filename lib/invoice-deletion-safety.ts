export function hasNonVoidedAgreementLink(
  agreements: Array<{ status: string | null | undefined }>
) {
  return agreements.some((agreement) => String(agreement.status ?? "").trim().toUpperCase() !== "VOID");
}
