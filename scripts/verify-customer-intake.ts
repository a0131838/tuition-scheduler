/** Isolated acceptance of public intake; refuses any other database. */
import assert from 'node:assert/strict';
import {prisma} from '../lib/prisma';
import {createStudentParentIntakeLink,submitStudentParentIntake} from '../lib/student-parent-intake';
import {POST} from '../app/api/partner/student-intake/route';
import {NETWORK_KEY} from '../lib/sales-network-source';
async function main(){
 const url=new URL(process.env.DATABASE_URL!);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.pathname,'/sgt_customer_workspace_20261123');
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'jasmine@example.test'}});
 const payload={studentName:'UAT Public Parent '+Date.now(),parentFullNameEn:'Unverified Guardian',phone:'+6592222222',email:'uat@example.test',relationshipToStudent:'mother',isLegalGuardian:true};
 const link=await createStudentParentIntakeLink({createdByUserId:owner.id});
 const results=await Promise.allSettled([submitStudentParentIntake({token:link.token,payload}),submitStudentParentIntake({token:link.token,payload})]);assert.equal(results.filter(r=>r.status==='fulfilled').length,1);assert.equal(await prisma.student.count({where:{name:payload.studentName}}),1);
 const duplicateLink=await createStudentParentIntakeLink({createdByUserId:owner.id});await assert.rejects(()=>submitStudentParentIntake({token:duplicateLink.token,payload}),/identity review/);
 const type=await prisma.studentType.upsert({where:{name:'合作方学生'},create:{name:'合作方学生'},update:{}});assert.ok(type.id);
 const source=await prisma.studentSourceChannel.findUniqueOrThrow({where:{name:'新东方学生'}});
 const partner=await prisma.partner.upsert({where:{sourceChannelId:source.id},create:{name:'UAT Partner',sourceChannelId:source.id,billTo:'UAT Partner'},update:{}});
 const name='UAT Public Partner '+Date.now(),request=()=>new Request('http://local.test/api/partner/student-intake',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name,school:'UAT School'})});
 const responses=await Promise.all([POST(request()),POST(request())]);assert.deepEqual(responses.map(r=>r.status).sort(),[201,409]);assert.equal(await prisma.student.count({where:{name}}),1);
 const store=JSON.parse((await prisma.appSetting.findUniqueOrThrow({where:{key:NETWORK_KEY}})).value);
 const student=await prisma.student.findFirstOrThrow({where:{name}}),node=store.nodes.find((n:any)=>n.studentId===student.id),parentStudent=await prisma.student.findFirstOrThrow({where:{name:payload.studentName}}),parentNode=store.nodes.find((n:any)=>n.studentId===parentStudent.id);
 assert.equal(node.ownerUserId,undefined);assert.equal(parentNode.ownerUserId,owner.id);assert.equal(parentNode.guardianContact.name,payload.parentFullNameEn);assert.equal(await prisma.parentStudentLink.count({where:{studentId:parentStudent.id}}),0);
 const partnerNode=store.nodes.find((n:any)=>n.partnerId===partner.id);assert.ok(store.edges.some((e:any)=>e.from===partnerNode.id&&e.to===node.id&&!e.confirmed&&e.meaning==='CONTACT'));
 console.log(JSON.stringify({result:'PASS',parentConcurrentSubmit:'one student',sameNamePublicIntake:'staff review',partnerConcurrentSubmit:'201 + 409, one student',sourceLink:'exact partner ID, unconfirmed',guardianPortalGrants:0}));
}
main().catch(e=>{console.error(e);process.exitCode=1}).finally(()=>prisma.$disconnect());
