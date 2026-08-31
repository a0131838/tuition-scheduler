import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";

/** Learning evidence is academic-record data, not a finance workspace export. */
export async function requireLearningEvidenceUser() {
  const user = await requireAdmin();
  if (user.role === "FINANCE") redirect("/admin");
  return user;
}
