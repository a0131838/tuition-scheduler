import {
  type ReceiptsApprovalSearchParams,
  ReceiptsApprovalsPageContent,
} from "../page";

export default async function ReceiptsApprovalsRepairsPage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptsApprovalSearchParams>;
}) {
  return ReceiptsApprovalsPageContent({ searchParams, screenMode: "repairs" });
}
