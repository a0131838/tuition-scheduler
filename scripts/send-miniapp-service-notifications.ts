import {prisma} from "@/lib/prisma";
import {dispatchNotification} from "@/lib/notification-dispatch";
import {availableServiceTemplate,sendServiceNotification} from "@/lib/wechat-miniapp-service-subscription";
const TEMPLATE_KEYS = ["request_status_changed", "finance_unpaid", "invoice_issued", "receipt_issued", "feedback_published"];
async function main() {
  const rows = await prisma.miniappNotificationOutbox.findMany({
    where:{status:"PENDING",templateKey:{in:TEMPLATE_KEYS},scheduledAt:{lte:new Date()}},
    orderBy:{scheduledAt:"asc"},take:100,select:{id:true},
  });
  const summary = {scanned:rows.length,sent:0,waitingConsent:0,retried:0,failed:0,skipped:0,uncertain:0,unchanged:0};
  for (const row of rows) {
    const result = await dispatchNotification(row.id,{
      templateKeys:TEMPLATE_KEYS,prefix:"AUTO_NOTIFICATION",
      available:row=>availableServiceTemplate(row.parentId,row.templateKey),send:sendServiceNotification,
    });
    summary[result]++;
  }
  console.log(JSON.stringify({ok:true,...summary,generatedAt:new Date().toISOString()},null,2));
}
main().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>prisma.$disconnect());
