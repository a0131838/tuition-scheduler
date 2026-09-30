import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {prisma} from '../../lib/prisma';
import {createTrainingMaterial,updateTrainingMaterial,transitionTrainingMaterial} from '../../lib/training-material-write';
import {teacherTrainingMaterialState} from '../../lib/teacher-training-materials';

async function main(){
  for(const key of ['DATABASE_URL','DIRECT_DATABASE_URL']){const u=new URL(process.env[key]||'');assert.equal(u.hostname,'127.0.0.1');assert.equal(u.port,'55439');assert.equal(u.pathname,'/sgt_workspace_completion_test');}
  if(process.argv.includes('--http')){
    const f=JSON.parse(readFileSync('/tmp/sgt-r467-fixture.json','utf8')),base='http://127.0.0.1:3149';
    const cookie=async(id:string)=>{const token=randomUUID();await prisma.authSession.create({data:{userId:id,token,expiresAt:new Date(Date.now()+3600000)}});return 'ts_admin_session='+token;};
    const owner=await cookie(f.ownerId),lead=await cookie(f.leadId),teacher=await cookie(f.teacherId),finance=await cookie(f.financeId),observer=await cookie(f.observerId);
    const get=(p:string,Cookie='')=>fetch(base+p,{headers:{Cookie},redirect:'manual'});
    const raw=f.rawPath,api='/api/training/materials/'+f.documentId+'/file';
    for(const path of [raw,api]){assert.equal((await get(path)).status,401);assert.equal((await get(path,teacher)).status,403);assert.equal((await get(path,finance)).status,403);const r=await get(path,owner);assert.equal(r.status,200);assert.equal(await r.text(),f.content);assert.equal(r.headers.get('cache-control'),'private, no-store');}
    for (const path of [raw.replace('shared-docs','%73hared-docs'), raw.replace('/uploads/','/%75ploads/'), raw.replace('/uploads/','/uploads%2f')]) {
      assert.equal((await get(path)).status,401);assert.equal((await get(path,teacher)).status,403);assert.equal((await get(path,owner)).status,200);
    }
    const page='/training/materials';
    const forms=async(Cookie:string)=>(await(await get(page,Cookie)).text()).match(/<form\b[^>]*>[\s\S]*?<\/form>/g)||[];
    const form=async(Cookie:string,decision:string)=>(await forms(Cookie)).find(s=>s.includes(`value="${f.documentId}"`)&&s.includes(`value="${decision}"`))!;
    const post=async(html:string,Cookie:string,decision:string)=>{assert(html);const data=new FormData();for(const m of html.matchAll(/<input[^>]+name="([^"]+)"[^>]*value="([^"]*)"/g))data.set(m[1],m[2].replaceAll('&quot;','"').replaceAll('&amp;','&'));const action=html.match(/name="(\$ACTION_(?:REF|ID)_[^"]+)"/);assert(action);data.set(action[1],'');data.set('decision',decision);data.set('note','Isolated publication note');return fetch(base+page,{method:'POST',headers:{Cookie,Origin:base},body:data,redirect:'manual'});};
    const state=async()=>{const row=await prisma.sharedDocument.findUniqueOrThrow({where:{id:f.documentId},include:{audits:{orderBy:{createdAt:'desc'}}}});return teacherTrainingMaterialState(row.audits.map(x=>x.action),row.status==='ARCHIVED');};
    const submit=await form(lead,'SUBMIT');await post(submit,observer,'SUBMIT');await post(submit,finance,'SUBMIT');assert.equal(await state(),'DRAFT');assert.equal((await post(submit,lead,'SUBMIT')).status,303);assert.equal(await state(),'SUBMITTED');
    const publish=await form(owner,'PUBLISH');await post(publish,lead,'PUBLISH');assert.equal(await state(),'SUBMITTED');assert.equal((await post(publish,owner,'PUBLISH')).status,303);assert.equal(await state(),'PUBLISHED');
    for(const path of [raw,api]){const r=await get(path,teacher);assert.equal(r.status,200);assert.equal(await r.text(),f.content);}
    const archive=await form(owner,'ARCHIVE');assert.equal((await post(archive,owner,'ARCHIVE')).status,303);assert.equal(await state(),'ARCHIVED');await post(publish,owner,'PUBLISH');assert.equal(await state(),'ARCHIVED');for(const path of [raw,api])assert.equal((await get(path,teacher)).status,403);
    // Restoring generic document status alone cannot republish an archived training release.
    await prisma.sharedDocument.update({where:{id:f.documentId},data:{status:'ACTIVE'}});assert.equal(await state(),'ARCHIVED');assert.equal((await get(raw,teacher)).status,403);
    const unknown='/uploads/shared-docs/unlinked-'+randomUUID()+'.txt';assert.equal((await get(unknown)).status,401);assert.equal((await get(unknown,owner)).status,404);
    assert.equal((await get('/api/shared-docs/legacy-file?path='+encodeURIComponent('/etc/passwd'),owner)).status,404);
    console.log(JSON.stringify({passed:true,rawAndApiSameRights:true,draftHidden:true,leadSubmitOwnerPublishOnly:true,observerFinanceDenied:true,archiveAndStaleReplayDenied:true,unlinkedAndTraversalDenied:true,noStore:true}));return;
  }
  const owner=await prisma.user.findUniqueOrThrow({where:{email:'zhaohongwei0880@gmail.com'}});
  const make=(role:'TEACHER'|'FINANCE'|'ADMIN',isObserver=false)=>prisma.user.create({data:{role,isObserver,name:'Isolated material '+role,email:randomUUID()+'@example.invalid',passwordHash:'isolated',passwordSalt:'isolated'}});
  const lead=await make('TEACHER'),teacher=await make('TEACHER'),finance=await make('FINANCE'),observer=await make('ADMIN',true);
  const acl=await prisma.teacherLeadAcl.create({data:{email:lead.email}});
  const file=(tag:string)=>{const content='ISOLATED TRAINING '+tag,relativePath='/uploads/shared-docs/'+randomUUID()+'.txt';mkdirSync('public/uploads/shared-docs',{recursive:true});writeFileSync('public'+relativePath,content);return {relativePath,originalName:tag+'.txt',sizeBytes:content.length,mimeType:'text/plain'};};
  const input={actorId:lead.id,title:'Isolated training '+randomUUID(),version:'v1',summary:'Isolated only',file:file('draft')};
  const counts=await Promise.all([prisma.packageTxn.count(),prisma.miniappNotificationOutbox.count()]);let fail='';
  prisma.$use(async(p,next)=>{if(p.model==='AuditLog'&&p.action==='create'&&p.args.data.action===fail)throw Error('forced material audit failure');return next(p);});
  fail='TRAINING_DRAFT_CREATED';await assert.rejects(createTrainingMaterial(input),/forced material/);assert.equal(await prisma.sharedDocument.count({where:{title:input.title}}),0);fail='';
  let row=await createTrainingMaterial(input);
  const read=()=>prisma.sharedDocument.findUniqueOrThrow({where:{id:row.id},include:{audits:{orderBy:{createdAt:'desc'}}}});
  const transition=(decision:'SUBMIT'|'PUBLISH'|'REVISION'|'ARCHIVE',actorId=lead.id,version=row.updatedAt.toISOString())=>transitionTrainingMaterial({actorId,id:row.id,expectedUpdatedAt:version,decision,note:'Please revise the full example'});
  const before=await read();fail='TRAINING_DRAFT_UPDATED';await assert.rejects(updateTrainingMaterial({...input,id:row.id,expectedUpdatedAt:row.updatedAt.toISOString(),file:file('failed')}),/forced material/);assert.deepEqual(await read(),before);fail='';
  for(const actorId of [teacher.id,finance.id,observer.id])await assert.rejects(transition('SUBMIT',actorId));
  await prisma.teacherLeadAcl.update({where:{id:acl.id},data:{isActive:false}});await assert.rejects(transition('SUBMIT'),/permission/);await prisma.teacherLeadAcl.update({where:{id:acl.id},data:{isActive:true}});
  const race=await Promise.allSettled([transition('SUBMIT'),updateTrainingMaterial({...input,id:row.id,expectedUpdatedAt:row.updatedAt.toISOString(),file:file('replacement')})]);assert.equal(race.filter(x=>x.status==='fulfilled').length,1);
  row=await read();if(teacherTrainingMaterialState((await read()).audits.map(x=>x.action))==='DRAFT')row=await transition('SUBMIT');
  await assert.rejects(transition('PUBLISH',lead.id),/not allowed/);
  const submitted=await read();fail='TRAINING_PUBLISHED';await assert.rejects(transition('PUBLISH',owner.id),/forced material/);assert.deepEqual(await read(),submitted);fail='';
  const publishRace=await Promise.allSettled([transition('PUBLISH',owner.id),transition('PUBLISH',owner.id)]);assert.equal(publishRace.filter(x=>x.status==='fulfilled').length,1);row=await read();assert.equal((await read()).audits.filter(x=>x.action==='TRAINING_PUBLISHED').length,1);
  await assert.rejects(updateTrainingMaterial({...input,id:row.id,expectedUpdatedAt:row.updatedAt.toISOString(),file:file('forbidden')}),/Only draft/);
  const published=await read();fail='TRAINING_ARCHIVED';await assert.rejects(transition('ARCHIVE',owner.id),/forced material/);assert.deepEqual(await read(),published);fail='';row=await transition('ARCHIVE',owner.id);assert.equal(row.status,'ARCHIVED');
  const fixture=await createTrainingMaterial({...input,file:file('HTTP'),title:'Isolated HTTP material'});
  assert.deepEqual(await Promise.all([prisma.packageTxn.count(),prisma.miniappNotificationOutbox.count()]),counts);
  writeFileSync('/tmp/sgt-r467-fixture.json',JSON.stringify({ownerId:owner.id,leadId:lead.id,teacherId:teacher.id,financeId:finance.id,observerId:observer.id,documentId:fixture.id,rawPath:fixture.filePath,content:'ISOLATED TRAINING HTTP'}));
  console.log(JSON.stringify({passed:true,auditRollback:true,submitVersusEditRace:true,publishOnce:true,currentAclAndRole:true,ownerOnly:true,publishedEditDenied:true,tuitionOutboxUnchanged:true}));
}
main().finally(()=>prisma.$disconnect());
