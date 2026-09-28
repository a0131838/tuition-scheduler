import { requireAdmin } from "@/lib/auth";
import { saveAdminAttendance } from "@/lib/admin-attendance-deduction";
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}) {
 const admin=await requireAdmin(),{id:sessionId}=await ctx.params;
 let body;try{body=await req.json();}catch{return Response.json({ok:false,message:'Invalid JSON body / 请求格式无效'},{status:400});}
 try{return Response.json({ok:true,...await saveAdminAttendance({sessionId,actor:admin,items:Array.isArray(body?.items)?body.items:[]})});}
 catch(error){return Response.json({ok:false,message:error instanceof Error?error.message:'Save failed / 保存失败'},{status:409});}
}
