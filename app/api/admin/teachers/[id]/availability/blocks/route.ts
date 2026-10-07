import {requireAdmin} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {listTeacherAvailabilityBlocks,removeTeacherAvailabilityBlock,saveTeacherAvailabilityBlock} from '@/lib/teacher-availability-blocks';
import {formatBusinessDateOnly} from '@/lib/date-only';
type Context={params:Promise<{id:string}>};
export async function GET(req:Request,{params}:Context){
  await requireAdmin();const {id}=await params;
  try{return Response.json({blocks:await listTeacherAvailabilityBlocks(prisma,id,new URL(req.url).searchParams.get('month')||formatBusinessDateOnly(new Date()).slice(0,7))});}
  catch(e){return new Response(e instanceof Error?e.message:'Invalid request',{status:400});}
}
export async function POST(req:Request,{params}:Context){
  const actor=await requireAdmin();if(actor.isObserver)return new Response('Read-only / 只读账号',{status:403});const {id}=await params;
  try {const body=await req.json();return Response.json(await saveTeacherAvailabilityBlock(id,body,actor));}
  catch(e){return new Response(e instanceof Error?e.message:'Save failed / 保存失败',{status:409});}
}
export async function DELETE(req:Request,{params}:Context){
  const actor=await requireAdmin();if(actor.isObserver)return new Response('Read-only / 只读账号',{status:403});const {id}=await params;
  try{const body=await req.json();await removeTeacherAvailabilityBlock(id,String(body.id||''),String(body.updatedAt||''),actor);return Response.json({ok:true});}
  catch(e){return new Response(e instanceof Error?e.message:'Delete failed / 删除失败',{status:409});}
}
