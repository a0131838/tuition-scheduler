import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),suffix=randomUUID(),base='http://127.0.0.1:3149';
 const first=await prisma.student.create({data:{name:'Care scoped first '+suffix}}),second=await prisma.student.create({data:{name:'Care scoped second '+suffix}});
 const cs=await prisma.user.create({data:{email:`care-${suffix}@example.invalid`,name:'Isolated assigned care staff',role:'CS',passwordHash:'not-a-login',passwordSalt:'isolated',workspaceAccesses:{create:{workspace:'CARE'}}}});
 const create=(studentId:string)=>prisma.careEngagement.create({data:{studentId,programType:'PRE_U_FULL_COORDINATION',scopeJson:[],createdByUserId:owner.id,caseOwnerUserId:owner.id}});
 const own=await create(first.id),hidden=await create(first.id),foreign=await create(second.id);
 await prisma.careEngagementMember.create({data:{engagementId:own.id,userId:cs.id,role:'COORDINATOR',assignedByUserId:owner.id}});
 await prisma.careEngagementMember.create({data:{engagementId:hidden.id,userId:cs.id,role:'COORDINATOR',isActive:false,assignedByUserId:owner.id}});
 await prisma.careEngagementMember.create({data:{engagementId:foreign.id,userId:cs.id,role:'COORDINATOR',assignedByUserId:owner.id}});
 const cookie=async(userId:string)=>{const token=randomUUID();await prisma.authSession.create({data:{userId,token,expiresAt:new Date(Date.now()+3600000)}});return `ts_admin_session=${token}`;};
 const ownerCookie=await cookie(owner.id),staffCookie=await cookie(cs.id),href=`/admin/care?forStudent=${first.id}`;
 const get=async(path:string,Cookie:string)=>{const res=await fetch(base+path,{headers:{Cookie},redirect:'manual'});assert.equal(res.status,200,path);return res.text();};
 const snapshot=()=>prisma.careEngagement.findMany({where:{id:{in:[own.id,hidden.id,foreign.id]}},include:{members:true},orderBy:{id:'asc'}}),before=await snapshot();
 try{for(const language of ['EN','ZH','BILINGUAL'] as const){await prisma.user.update({where:{id:owner.id},data:{language}});const profile=await get(`/admin/students/${first.id}`,ownerCookie);assert.ok(profile.includes(href));const html=await get(href,ownerCookie);assert.ok(html.includes(`/admin/care/${own.id}`));assert.ok(html.includes(`/admin/care/${hidden.id}`));assert.ok(!html.includes(`/admin/care/${foreign.id}`));assert.ok(html.includes(language==='EN'?'Showing accessible projects':language==='ZH'?'当前仅显示所选学生':'Showing accessible projects'));assert.ok(html.includes(language==='ZH'?'全方位托管协调服务':'Comprehensive Care Coordination'));if(language==='BILINGUAL')assert.ok(html.includes('全方位托管协调服务'));}}
 finally{await prisma.user.update({where:{id:owner.id},data:{language:owner.language}});}
 const limited=await get(href,staffCookie);assert.ok(limited.includes(`/admin/care/${own.id}`));assert.ok(!limited.includes(`/admin/care/${hidden.id}`));assert.ok(!limited.includes(`/admin/care/${foreign.id}`));
 const empty=await get('/admin/care?forStudent=not-a-student',staffCookie);assert.ok(!empty.includes(first.name));assert.ok(!empty.includes(second.name));
 const legacy=await get(`/admin/care?studentId=${first.id}`,ownerCookie);assert.ok(legacy.includes(`/admin/care/${foreign.id}`));assert.ok(legacy.includes(`name="studentId" value="${first.id}"`));
 const finance=await prisma.user.findFirstOrThrow({where:{name:'Policy FINANCE'}}),financeCookie=await cookie(finance.id);const financeProfile=await fetch(base+`/admin/students/${first.id}`,{headers:{Cookie:financeCookie},redirect:'manual'});assert.equal(financeProfile.status,307);const denied=await fetch(base+href,{headers:{Cookie:financeCookie},redirect:'manual'});assert.ok([303,307].includes(denied.status));
 assert.deepEqual(await snapshot(),before);writeFileSync('/tmp/sgt-r445-fixture.json',JSON.stringify({studentId:first.id,url:base+href,projectIds:[own.id,hidden.id,foreign.id]}));console.log(JSON.stringify({passed:true,threeLanguages:true,exactStudentScope:true,activeMembershipOnly:true,noForeignNamesOnEmptyScope:true,financeDenied:true,legacyCreationPreserved:true,recordsUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());
