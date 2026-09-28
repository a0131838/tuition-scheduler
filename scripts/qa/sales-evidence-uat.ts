import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {prisma} from '../../lib/prisma';
import {mutateSalesEvidence,mutateSalesEvidenceInTransaction,readSalesContractEvidence,listSalesContractCandidates,type SalesEvidenceInput} from '../../lib/sales-evidence';
async function main(){
 for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const actor=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),tag=`Evidence UAT ${randomUUID()}`;
 const student=await prisma.student.create({data:{name:tag}}),otherStudent=await prisma.student.create({data:{name:tag}});
 const relationship=await prisma.salesRelationship.create({data:{name:tag,kind:'AGENT',status:'ACTIVE',createdById:actor.id,createdByName:actor.name}});
 const otherRelationship=await prisma.salesRelationship.create({data:{name:`Other ${tag}`,kind:'AGENT',status:'ACTIVE',createdById:actor.id,createdByName:actor.name}});
 const course=await prisma.course.findFirstOrThrow();
 const pkg=await prisma.coursePackage.create({data:{studentId:student.id,courseId:course.id,type:'HOURS',validFrom:new Date(),totalMinutes:600,remainingMinutes:600}});
 const template=await prisma.contractTemplate.create({data:{name:tag,slug:randomUUID(),version:1,bodyHtml:'Isolated test'}});
 const makeContract=()=>prisma.studentContract.create({data:{studentId:student.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:'SIGNED',signedAt:new Date()}});
 const makeLead=()=>prisma.lead.create({data:{leadNo:`UAT-${randomUUID()}`,studentName:tag,sourceType:'Referral',recordKind:'STUDENT',relationshipId:relationship.id,relationshipLinkedAt:new Date(),convertedStudentId:student.id,status:'Contacted'}});
 const lead=await makeLead(),otherLead=await makeLead(),contract=await makeContract(),atomicContract=await makeContract(),raceContract=await makeContract();
 const invalid=await prisma.studentContract.create({data:{studentId:otherStudent.id,packageId:pkg.id,templateId:template.id,intakeToken:randomUUID(),status:'SIGNED',signedAt:new Date()}});
 const input:SalesEvidenceInput={action:'ATTACH',leadId:lead.id,documentId:contract.id,expectedUpdatedAt:lead.updatedAt.toISOString(),sourceUpdatedAt:contract.updatedAt.toISOString(),reviewNote:'Exact referral and contract checked'};
 const businessBefore={contracts:await prisma.studentContract.findMany({where:{packageId:pkg.id},orderBy:{id:'asc'}}),pkg:await prisma.coursePackage.findUnique({where:{id:pkg.id}}),ledger:await prisma.packageTxn.count(),settings:await prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','partner_billing_v1','parent_receipt_approval_v1','partner_receipt_approval_v1']}}})};
 for(const altered of [{...input,reviewNote:''},{...input,expectedUpdatedAt:'stale'},{...input,sourceUpdatedAt:'stale'},{...input,documentId:invalid.id,sourceUpdatedAt:invalid.updatedAt.toISOString()}])await assert.rejects(mutateSalesEvidence(actor,altered));
 for(const denied of [{...actor,role:'SALES'},{...actor,role:'CS'},{...actor,role:'FINANCE'},{...actor,role:'TEACHER'},{...actor,operationsAdmin:true}]){await assert.rejects(mutateSalesEvidence(denied,input));await assert.rejects(readSalesContractEvidence(denied,{leadId:lead.id}));await assert.rejects(listSalesContractCandidates(denied,lead.id));}
 await assert.rejects(mutateSalesEvidence({...actor,isObserver:true},input));
 await mutateSalesEvidence(actor,input);await mutateSalesEvidence(actor,input);
 const assignment=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{kind_documentId:{kind:'CONTRACT',documentId:contract.id}}});assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id,action:'ATTACH'}}),1);
 assert.equal((await readSalesContractEvidence(actor,{relationshipId:relationship.id})).summary.signedContracts,1);
 await assert.rejects(mutateSalesEvidence(actor,{...input,leadId:otherLead.id,expectedUpdatedAt:otherLead.updatedAt.toISOString()}),/其他商机/);
 await assert.rejects(prisma.$transaction(async tx=>{await mutateSalesEvidenceInTransaction(tx,actor,{...input,documentId:atomicContract.id,sourceUpdatedAt:atomicContract.updatedAt.toISOString()});throw Error('forced audit rollback');}),/forced audit rollback/);
 assert.equal(await prisma.salesEvidenceAssignment.count({where:{documentId:atomicContract.id}}),0);
 const race=await Promise.allSettled([lead,otherLead].map(l=>mutateSalesEvidence(actor,{...input,leadId:l.id,expectedUpdatedAt:l.updatedAt.toISOString(),documentId:raceContract.id,sourceUpdatedAt:raceContract.updatedAt.toISOString()})));assert.equal(race.filter(r=>r.status==='fulfilled').length,1);assert.equal(await prisma.salesEvidenceAssignment.count({where:{documentId:raceContract.id}}),1);
 const moved=await prisma.lead.update({where:{id:lead.id},data:{relationshipId:otherRelationship.id,relationshipLinkedAt:new Date(Date.now()+1000)}});
 const old=await readSalesContractEvidence(actor,{relationshipId:relationship.id});assert.equal(old.rows.find(r=>r.documentId===contract.id)?.state,'REVIEW');assert.equal((await readSalesContractEvidence(actor,{relationshipId:otherRelationship.id})).summary.assigned,0);
 await mutateSalesEvidence(actor,{...input,expectedUpdatedAt:moved.updatedAt.toISOString()});assert.equal((await readSalesContractEvidence(actor,{relationshipId:otherRelationship.id})).summary.signedContracts,1);
 const current=await prisma.salesEvidenceAssignment.findUniqueOrThrow({where:{id:assignment.id}});
 await assert.rejects(mutateSalesEvidence(actor,{action:'REVOKE',leadId:lead.id,assignmentId:assignment.id,expectedUpdatedAt:'stale',reviewNote:'reviewed'}));
 await mutateSalesEvidence(actor,{action:'REVOKE',leadId:lead.id,assignmentId:assignment.id,expectedUpdatedAt:current.updatedAt.toISOString(),reviewNote:'Explicit revocation only'});
 await mutateSalesEvidence(actor,{...input,leadId:otherLead.id,expectedUpdatedAt:otherLead.updatedAt.toISOString()});
 assert.equal(await prisma.auditLog.count({where:{entityId:assignment.id}}),4);
 assert.deepEqual({contracts:await prisma.studentContract.findMany({where:{packageId:pkg.id},orderBy:{id:'asc'}}),pkg:await prisma.coursePackage.findUnique({where:{id:pkg.id}}),ledger:await prisma.packageTxn.count(),settings:await prisma.appSetting.findMany({where:{key:{in:['parent_billing_v1','partner_billing_v1','parent_receipt_approval_v1','partner_receipt_approval_v1']}}})},businessBefore);
 await prisma.studentContract.update({where:{id:contract.id},data:{status:'VOID',voidedAt:new Date()}});assert.equal((await readSalesContractEvidence(actor,{leadId:otherLead.id})).rows.find(r=>r.documentId===contract.id)?.state,'INACTIVE');
 console.log(JSON.stringify({passed:true,rolesGuarded:true,noBusinessWrites:true,concurrentUniqueness:true,auditAtomic:true,movedLinkRequiresReview:true,voidImmediatelyExcluded:true,browserLeadId:lead.id,relationshipId:otherRelationship.id,browserContractId:atomicContract.id}));
}
main().finally(()=>prisma.$disconnect());
