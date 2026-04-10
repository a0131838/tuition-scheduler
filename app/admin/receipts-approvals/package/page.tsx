import {
  type ReceiptsApprovalSearchParams,
  ReceiptsApprovalsPageContent,
} from "../page";

export default async function ReceiptsApprovalsPackagePage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptsApprovalSearchParams>;
}) {
  return ReceiptsApprovalsPageContent({ searchParams, screenMode: "package" });
}
