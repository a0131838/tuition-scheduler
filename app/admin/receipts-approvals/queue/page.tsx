import {
  ReceiptsApprovalsPageContent,
  type ReceiptsApprovalSearchParams,
} from "../page";

export default async function ReceiptsApprovalsQueuePage({
  searchParams,
}: {
  searchParams?: Promise<ReceiptsApprovalSearchParams>;
}) {
  return ReceiptsApprovalsPageContent({
    searchParams,
    screenMode: "queue",
    forceClearQueue: true,
  });
}
