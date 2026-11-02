import {loadEnvConfig} from '@next/env';
loadEnvConfig(process.cwd());
async function main(){
 const {prisma}=await import('../lib/prisma');const {sopInventory,sopNeedsReview}=await import('../lib/sop-governance');
 try{
  const email=(process.env.OWNER_MANAGER_EMAIL||'zhaohongwei0880@gmail.com').trim().toLowerCase();
  const owner=await prisma.user.findUnique({where:{email},select:{id:true,email:true,name:true,role:true,language:true,teacherId:true,isObserver:true}});
  if(!owner||owner.role!=='ADMIN'||owner.isObserver)throw Error('No active owner manager for inventory snapshot');
  const user={...owner,workspaces:[],trainingRoles:[],operationsAdmin:false};
  const entries=await sopInventory(user);const now=new Date();const month=new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Singapore',year:'numeric',month:'2-digit'}).format(now);
  const snapshot={month,generatedAt:now.toISOString(),entries:entries.map(e=>({key:e.key,title:e.title,version:e.version,roles:e.roles,status:e.review?.status==='WITHDRAWN'?'WITHDRAWN':sopNeedsReview(e.review,now)?'REVIEW_REQUIRED':'CURRENT',owner:e.review?.ownerName||e.defaultOwner,reviewedAt:e.review?.reviewedAt||null,nextReviewAt:e.review?.nextReviewAt||null,replacementKey:e.review?.replacementKey||null}))};
  const key='SOP_INVENTORY_SNAPSHOT:'+month;
  await prisma.appSetting.upsert({where:{key},create:{key,value:JSON.stringify(snapshot)},update:{}});
  console.log(JSON.stringify({month,count:entries.length,reviewDue:snapshot.entries.filter(e=>e.status==='REVIEW_REQUIRED').length}));
 }finally{await prisma.$disconnect();}
}
main().catch(e=>{console.error(e instanceof Error?e.message:'Snapshot failed');process.exitCode=1;});
