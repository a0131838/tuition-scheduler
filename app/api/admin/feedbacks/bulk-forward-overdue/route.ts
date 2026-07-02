import { requireAdmin } from "@/lib/auth";

export async function POST() {
  await requireAdmin();
  return Response.json(
    {
      ok: false,
      message:
        "Bulk overdue forwarding is disabled. Please create/update proxy drafts one by one, then mark completed teacher feedback from Pending Forward.",
    },
    { status: 410 },
  );
}
