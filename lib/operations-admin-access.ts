const OPERATIONS_ADMIN_WEB_PREFIXES = [
  "/admin/alerts",
  "/admin/booking-links",
  "/admin/campuses",
  "/admin/care",
  "/admin/classes",
  "/admin/communication-reminders",
  "/admin/communications",
  "/admin/conflicts",
  "/admin/courses",
  "/admin/edutrust",
  "/admin/enrollments",
  "/admin/feedbacks",
  "/admin/leads",
  "/admin/miniapp-notifications",
  "/admin/miniapp-staff",
  "/admin/mobile",
  "/admin/monthly-scheduling",
  "/admin/reports/academic-management",
  "/admin/reports/cancelled-sessions",
  "/admin/reports/final",
  "/admin/reports/midterm",
  "/admin/reports/monthly-hours",
  "/admin/reports/monthly-schedule",
  "/admin/renewals",
  "/admin/rooms",
  "/admin/schedule",
  "/admin/school-applications",
  "/admin/sessions",
  "/admin/student-sources",
  "/admin/student-types",
  "/admin/students",
  "/admin/teacher-notices",
  "/admin/teachers",
  "/admin/tickets",
];

const OPERATIONS_ADMIN_API_PREFIXES = [
  "/api/admin/ai-os/sso",
  "/api/admin/alerts",
  "/api/admin/appointments",
  "/api/admin/booking-links",
  "/api/admin/campuses",
  "/api/admin/care",
  "/api/admin/classes",
  "/api/admin/communication-reminders",
  "/api/admin/communications",
  "/api/admin/courses",
  "/api/admin/edutrust",
  "/api/admin/enrollments",
  "/api/admin/feedbacks",
  "/api/admin/final-reports",
  "/api/admin/language",
  "/api/admin/levels",
  "/api/admin/midterm-reports",
  "/api/admin/miniapp-notifications",
  "/api/admin/miniapp-staff/invites",
  "/api/admin/ops/daily-schedule-view",
  "/api/admin/ops/lookup-student",
  "/api/admin/ops/parent-requests",
  "/api/admin/ops/recent-tickets",
  "/api/admin/ops/ticket-followups-overdue",
  "/api/admin/ops/unmarked-followups-overdue",
  "/api/admin/rooms",
  "/api/admin/renewals",
  "/api/admin/sessions",
  "/api/admin/student-sources",
  "/api/admin/student-types",
  "/api/admin/students",
  "/api/admin/subjects",
  "/api/admin/teachers",
];

function isPathOrChild(pathname: string, prefix: string) {
  return pathname === prefix || pathname.startsWith(`${prefix}/`);
}

export function isOperationsAdminPathAllowed(pathnameRaw: string) {
  const pathname = String(pathnameRaw || "").split("?")[0] || "/";
  if (/^\/admin\/students\/[^/]+\/first-purchase(?:\/|$)/.test(pathname)) return false;
  if (/^\/api\/admin\/students\/[^/]+\/package-balance-preview(?:\/|$)/.test(pathname)) return false;
  if (pathname === "/admin" || pathname === "/admin/logout") return true;
  if (pathname === "/staff/hr") return true;
  if (pathname.startsWith("/teacher") || pathname.startsWith("/training")) return true;
  if (pathname === "/api/admin/auth/login" || pathname === "/api/miniapp/staff/auth/logout") return true;
  if (pathname.startsWith("/api/teacher") || pathname.startsWith("/api/training")) return true;
  if (OPERATIONS_ADMIN_WEB_PREFIXES.some((prefix) => isPathOrChild(pathname, prefix))) return true;
  if (OPERATIONS_ADMIN_API_PREFIXES.some((prefix) => isPathOrChild(pathname, prefix))) return true;
  return false;
}

export function operationsAdminLandingPath(pathname: string) {
  return pathname.startsWith("/api/") ? null : "/admin";
}
