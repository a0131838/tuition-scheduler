import {requireAdmin,isManagerUser} from '@/lib/auth';
import {saveFeedbackPolicy} from '@/lib/session-feedback-policy-service';
export async function POST(req:Request,ctx:{params:Promise<{id:string}>}){
 const user=await requireAdmin();
 if(user.isObserver||!(user.role==='ADMIN'||user.operationsAdmin||await isManagerUser(user)))return Response.json({ok:false,message:'Teaching management permission required / 需要教学管理权限'},{status:403});
 let body;try{body=await req.json();}catch{return Response.json({ok:false,message:'Invalid JSON / 请求格式无效'},{status:400});}
 const {id}=await ctx.params;
 try{return Response.json({ok:true,...await saveFeedbackPolicy({sessionId:id,activity:body.activity,reason:body.reason,fingerprint:String(body.fingerprint??''),requestKey:String(body.requestKey??''),acknowledged:body.acknowledged===true,actorEmail:user.email})});}
 catch(e){return Response.json({ok:false,message:e instanceof Error?e.message:'Save failed / 保存失败'},{status:409});}
}
