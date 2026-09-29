import {requireAdmin} from '@/lib/auth';
import {applyEntitlementCorrection,canApplyEntitlementCorrection,EntitlementCorrectionError} from '@/lib/package-entitlement-correction';
export async function POST(req:Request,{params}:{params:Promise<{id:string}>}){
 const actor=await requireAdmin();
 if(!canApplyEntitlementCorrection(actor))return Response.json({ok:false,message:'Only the owner can record entitlement corrections / 仅老板可登记权益更正'},{status:403});
 let body;try{body=await req.json();}catch{return Response.json({ok:false,message:'Invalid JSON / JSON无效'},{status:400});}
 try{const {id}=await params;const result=await applyEntitlementCorrection(actor,{...body,packageId:id});return Response.json({ok:true,id:result.id,afterTotal:result.afterTotal,afterBalance:result.afterBalance,unit:result.unit});}
 catch(error){if(error instanceof EntitlementCorrectionError)return Response.json({ok:false,message:error.message},{status:error.status});throw error;}
}
