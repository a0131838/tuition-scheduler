import { requireAdmin } from "@/lib/auth";
import { saveAdminAttendance } from "@/lib/admin-attendance-deduction";
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}) {
 const admin=await requireAdmin(),{id:sessionId}=await ctx.params;
 let body:any={};try{body=await req.json();}catch{}
 const waiveDeduction=Boolean(body?.waiveDeduction),waiveReason=waiveDeduction?String(body?.waiveReason??'').trim()||'Assessment lesson':null;
 try{return Response.json({ok:true,...await saveAdminAttendance({sessionId,actor:admin,markAll:{waiveDeduction,waiveReason}})});}
 catch(error){return Response.json({ok:false,message:error instanceof Error?error.message:'Mark all failed / 批量点名失败'},{status:409});}
}
