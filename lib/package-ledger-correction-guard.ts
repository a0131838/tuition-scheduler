import type {Prisma} from '@prisma/client';
export class ProtectedLedgerConflict extends Error {}
/** Legacy edit/delete/restore must not overwrite a concurrent correction or its immutable source. */
export async function lockLegacyLedgerSnapshot(db:Prisma.TransactionClient,input:{packageId:string;totalMinutes:number|null;remainingMinutes:number|null;ledgerRemaining:number;txnId?:string}){
 await db.$queryRaw`SELECT id FROM "CoursePackage" WHERE id=${input.packageId} FOR UPDATE`;
 const pkg=await db.coursePackage.findUnique({where:{id:input.packageId},select:{totalMinutes:true,remainingMinutes:true}});
 const total=await db.packageTxn.aggregate({where:{packageId:input.packageId},_sum:{deltaMinutes:true}});
 if(!pkg||pkg.totalMinutes!==input.totalMinutes||pkg.remainingMinutes!==input.remainingMinutes||(total._sum.deltaMinutes??0)!==input.ledgerRemaining)throw new ProtectedLedgerConflict();
 if(input.txnId&&await db.packageEntitlementCorrection.count({where:{OR:[{sourceTxnId:input.txnId},{adjustmentTxnId:input.txnId}]}}))throw new ProtectedLedgerConflict();
}
