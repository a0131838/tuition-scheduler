// A signed parent's existing link remains read-only after the signing deadline.
// Draft links expire; voided or withdrawn signing snapshots are never public.
export function schoolApplicationSignLinkCanRead(
  app: { status: string; signToken: string | null; signExpiresAt: Date | null },
  token: string | null,
  now = new Date(),
) {
  if (!token || !app.signToken || token !== app.signToken) return false;
  if (app.status === "SIGNED" || app.status === "INVOICE_CREATED") return true;
  return app.status === "READY_TO_SIGN" && (!app.signExpiresAt || app.signExpiresAt.getTime() >= now.getTime());
}

export function isSchoolApplicationStoredPath(pathname: string) {
  return /^\/uploads\/contracts\/school-applications\//.test(pathname) ||
    /^\/uploads\/contract-signatures\/[^/]+\/school-applications\//.test(pathname);
}
