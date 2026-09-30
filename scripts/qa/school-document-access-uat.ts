import assert from 'node:assert/strict';
import {Prisma} from '@prisma/client';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import path from 'node:path';
import {prisma} from '../../lib/prisma';
import {schoolApplicationSignLinkCanRead} from '../../lib/school-application-document-policy';

async function main(){
 for(const k of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[k]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
 const f=JSON.parse(readFileSync('/tmp/sgt-r470-export-fixture.json','utf8')),original=await prisma.schoolApplicationService.findUniqueOrThrow({where:{id:f.applicationId}});
 const id=randomUUID(),token=randomUUID(),signaturePath='/uploads/contract-signatures/'+original.studentId+'/school-applications/'+id+'.png',pdfPath='/uploads/contracts/school-applications/'+id+'/signed.pdf';
 const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}}),finance=await prisma.user.findFirstOrThrow({where:{name:'Policy FINANCE'}}),teacher=await prisma.user.findFirstOrThrow({where:{name:'Policy TEACHER'}});
 const row=await prisma.schoolApplicationService.create({data:{...original, parentInfoJson: original.parentInfoJson ?? Prisma.DbNull, applicationItemsJson: original.applicationItemsJson ?? Prisma.JsonNull, addOnItemsJson: original.addOnItemsJson ?? Prisma.DbNull, officialFeesJson: original.officialFeesJson ?? Prisma.DbNull, contractSnapshotJson: original.contractSnapshotJson ?? Prisma.DbNull, id,signToken:token,parentInfoToken:null,status:'INVOICE_CREATED',signExpiresAt:new Date('2000-01-01'),signatureImagePath:signaturePath,signedPdfPath:pdfPath,createdAt:new Date(),updatedAt:new Date()}});
 const cookie=async(userId:string)=>{const value=randomUUID();await prisma.authSession.create({data:{userId,token:value,expiresAt:new Date(Date.now()+3600000)}});return 'ts_admin_session='+value;};
 const ownerCookie=await cookie(owner.id),financeCookie=await cookie(finance.id),teacherCookie=await cookie(teacher.id);
 const base='http://127.0.0.1:3149',exportPath='/api/exports/school-application/'+id;
 const get=(p:string,Cookie='')=>fetch(base+p,{headers:Cookie?{Cookie}:{},redirect:'manual'});
 const pdf=await get(exportPath,ownerCookie);assert.equal(pdf.status,200);const bytes=Buffer.from(await pdf.arrayBuffer());assert.equal(bytes.subarray(0,4).toString(),'%PDF');assert.equal(pdf.headers.get('cache-control'),'private, no-store');
 const sig=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/l1kAAAAASUVORK5CYII=','base64');
 for(const [relative,content] of [[signaturePath,sig],[pdfPath,bytes]] as const){const file=path.join(process.cwd(),'public',relative);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,content);}
 for(const p of [exportPath,'/api/school-applications/'+id+'/signature',signaturePath,pdfPath,signaturePath.replace('/uploads/','/%75ploads/'),pdfPath.replace('/uploads/','/%75ploads/')]){
  assert.equal((await get(p)).status,403,'anonymous '+p);assert.equal((await get(p,teacherCookie)).status,403,'teacher '+p);
  assert.equal((await get(p+'?token=wrong')).status,403,'wrong token '+p);
  const parent=await get(p+'?token='+token);assert.equal(parent.status,200,'parent '+p);assert.equal(parent.headers.get('cache-control'),'private, no-store');
  assert.equal((await get(p,ownerCookie)).status,200,'owner '+p);assert.equal((await get(p,financeCookie)).status,200,'finance '+p);
 }
 assert.equal((await get(exportPath+'?token='+token+'&seal=1')).status,403);assert.equal((await get(exportPath+'?seal=1',ownerCookie)).status,200);
 const publicHtml=await(await get('/school-application/'+token)).text();assert(publicHtml.includes(exportPath+'?token='+token));assert(publicHtml.includes('/api/school-applications/'+id+'/signature?token='+token));assert(!publicHtml.includes('src="'+signaturePath+'"'));
 for(const status of ['DRAFT','VOID'] as const){await prisma.schoolApplicationService.update({where:{id},data:{status}});assert.equal((await get(exportPath+'?token='+token)).status,403);const html=await(await get('/school-application/'+token)).text();assert(!html.includes(exportPath));assert.equal((await get(exportPath,ownerCookie)).status,200,'staff history retained');}
 await prisma.schoolApplicationService.update({where:{id},data:{status:'READY_TO_SIGN',signExpiresAt:new Date('2000-01-01')}});assert.equal((await get(exportPath+'?token='+token)).status,403);
 await prisma.schoolApplicationService.update({where:{id},data:{signExpiresAt:new Date(Date.now()+3600000)}});assert.equal((await get(exportPath+'?token='+token)).status,200);
 const other=await prisma.schoolApplicationService.findFirstOrThrow({where:{id:{not:id}}});assert.equal((await get('/api/exports/school-application/'+other.id+'?token='+token)).status,403,'cross-application capability');
 assert.equal(schoolApplicationSignLinkCanRead({...row,status:'SIGNED'},token),true,'signed read capability preserves existing deadline semantics');
 assert.equal((await get('/uploads/contracts/school-applications/no-such-record/no.pdf')).status,404);
 await prisma.schoolApplicationService.update({where:{id},data:{signToken:randomUUID()}});assert.equal((await get(exportPath+'?token='+token)).status,403,'token rotation');
 writeFileSync('/tmp/sgt-r470-document-fixture.json',JSON.stringify({id,exportPath,signaturePath,pdfPath}));
 console.log(JSON.stringify({passed:true,anonymousAndTeacherDenied:true,ownerAndFinanceRetained:true,exactParentCapability:true,readyExpiryAndDraftVoidGuards:true,signedReadCapabilityRetained:true,rawAndEncodedFilesGuarded:true,staffHistoricalPdfRetained:true,publicLinksCarryCapability:true,noStore:true}));
}
main().finally(()=>prisma.$disconnect());
