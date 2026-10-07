import {requireTeacherProfile} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {listTeacherAvailabilityBlocks,removeTeacherAvailabilityBlock,saveTeacherAvailabilityBlock} from '@/lib/teacher-availability-blocks';
import {formatBusinessDateOnly} from '@/lib/date-only';
export async function GET(req:Request){
  const {teacher}=await requireTeacherProfile();if(!teacher)return new Response('Teacher profile required',{status:403});
  try{return Response.json({blocks:await listTeacherAvailabilityBlocks(prisma,teacher.id,new URL(req.url).searchParams.get('month')||formatBusinessDateOnly(new Date()).slice(0,7))});}
  catch(e){return new Response(e instanceof Error?e.message:'Invalid request',{status:400});}
}
export async function POST(req:Request){
  const {teacher,user}=await requireTeacherProfile();if(!teacher||user.isObserver)return new Response('Read-only / 只读账号',{status:403});
  try{return Response.json(await saveTeacherAvailabilityBlock(teacher.id,await req.json(),user));}
  catch(e){return new Response(e instanceof Error?e.message:'Save failed / 保存失败',{status:409});}
}
export async function DELETE(req:Request){
  const {teacher,user}=await requireTeacherProfile();if(!teacher||user.isObserver)return new Response('Read-only / 只读账号',{status:403});
  try{const body=await req.json();await removeTeacherAvailabilityBlock(teacher.id,String(body.id||''),String(body.updatedAt||''),user);return Response.json({ok:true});}
  catch(e){return new Response(e instanceof Error?e.message:'Delete failed / 删除失败',{status:409});}
}
