import {NextResponse,after} from 'next/server';
import {randomUUID} from 'node:crypto';
import {getCurrentUser} from '@/lib/auth';
import {canManageSops} from '@/lib/sop-governance';
import {prisma} from '@/lib/prisma';
import {draftSop,validateSopAiText} from '@/lib/sop-ai';
import {isParentReportSameOrigin} from '@/lib/learning-report-parent-content';
export const maxDuration=150;
const reply=(data:unknown,status=200)=>NextResponse.json(data,{status,headers:{'Cache-Control':'private, no-store'}});
export async function GET(){const u=await getCurrentUser();if(!u)return reply({error:'LOGIN_REQUIRED'},401);if(!await canManageSops(u))return reply({error:'NOT_ALLOWED'},403);const key='SOP_AI_DRAFT:'+u.id;const row=await prisma.appSetting.findUnique({where:{key}});if(!row)return reply({status:'EMPTY'});const draft=JSON.parse(row.value);if(draft.status==='GENERATING'&&Date.now()-draft.started>150000){const failed={id:draft.id,status:'FAILED',error:'Generation timed out; please retry. / 生成超时，请重试。'};const changed=await prisma.appSetting.updateMany({where:{key,value:row.value},data:{value:JSON.stringify(failed)}});if(changed.count)return reply(failed);const latest=await prisma.appSetting.findUnique({where:{key}});return reply(latest?JSON.parse(latest.value):{status:'EMPTY'});}return reply(draft);}
export async function POST(req:Request){
 if(!isParentReportSameOrigin(req,process.env.NEXT_PUBLIC_APP_URL))return reply({error:'NOT_ALLOWED'},403);
 const u=await getCurrentUser();if(!u)return reply({error:'LOGIN_REQUIRED'},401);if(!await canManageSops(u))return reply({error:'NOT_ALLOWED'},403);
 const raw=await req.text();if(raw.length>50000)return reply({error:'INPUT_LIMIT'},400);
 let body;try{body=JSON.parse(raw);}catch{return reply({error:'INVALID_REQUEST'},400);}
 if(!body || typeof body!=='object' || Array.isArray(body))return reply({error:'INVALID_REQUEST'},400);
 const key='SOP_AI_DRAFT:'+u.id;
 if(body.action==='save'){
  try{const text=validateSopAiText(body.text);const changed=await prisma.appSetting.updateMany({where:{key,value:{contains:'"id":"'+String(body.id).replace(/[^a-z0-9-]/gi,'')+'"'}},data:{value:JSON.stringify({id:body.id,status:'READY',text,edited:true})}});if(!changed.count)return reply({error:'DRAFT_CHANGED'},409);return reply({status:'READY',id:body.id,text,edited:true});}catch{return reply({error:'INVALID_DRAFT'},400);}
 }
 if(body.action!=='generate'||typeof body.facts!=='string'||body.facts.trim().length<30||body.facts.length>12000)return reply({error:'Provide 30–12000 characters of verified steps / 请提供30至12000字符的已核实步骤'},400);
 const id=randomUUID();let accepted=false;
 await prisma.$transaction(async tx=>{await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${key}))`;const old=await tx.appSetting.findUnique({where:{key}});const value=old?JSON.parse(old.value):null;if(value?.status==='GENERATING'&&Date.now()-value.started<150000)return;await tx.appSetting.upsert({where:{key},create:{key,value:JSON.stringify({id,status:'GENERATING',started:Date.now()})},update:{value:JSON.stringify({id,status:'GENERATING',started:Date.now()})}});accepted=true;});
 if(!accepted)return reply({error:'Generation in progress / 正在生成，请稍候'},409);
 after(async()=>{try{const result=await draftSop(body.facts);await prisma.appSetting.updateMany({where:{key,value:{contains:'"id":"'+id+'"'}},data:{value:JSON.stringify({id,status:'READY',...result})}});await prisma.auditLog.create({data:{actorEmail:u.email,actorName:u.name,module:'training',action:'SOP_AI_DRAFT_GENERATED',entityId:id,meta:{model:result.model}}});}catch{await prisma.appSetting.updateMany({where:{key,value:{contains:'"id":"'+id+'"'}},data:{value:JSON.stringify({id,status:'FAILED',error:'Could not prepare draft. Retry or write it manually. / 草稿生成失败，可重试或手动编写。'})}});}});
 return reply({id,status:'GENERATING'},202);
}
