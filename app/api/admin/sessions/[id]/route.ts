import {deleteEmptySession} from '@/lib/session-deletion';
import {requireSessionDeletionActor} from '@/lib/session-deletion-auth';
export async function DELETE(_req:Request,{params}:{params:Promise<{id:string}>}){
 let actor;try{actor=await requireSessionDeletionActor();}catch{return Response.json({ok:false,message:'Teaching management permission required / 需要教学管理权限'},{status:403});}
 const {id:sessionId}=await params;
 try{return Response.json(await deleteEmptySession({sessionId,actor}));}
 catch(e){return Response.json({ok:false,code:'SESSION_DELETE_BLOCKED',message:e instanceof Error?e.message:'Delete failed / 删除失败'},{status:409});}
}
