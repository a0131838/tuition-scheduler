import {
  type ReceiptsApprovalSearchParams,
  ReceiptsApprovalsPageContent,
} from "../page";

export default async function ReceiptsApprovalsHistoryPage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptsApprovalSearchParams>;
}) {
  return ReceiptsApprovalsPageContent({ searchParams, screenMode: "history" });
}
