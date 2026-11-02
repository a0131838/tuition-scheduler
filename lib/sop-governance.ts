import { SOP_CURRENT_GUIDES } from './sop-current-guides';
import { sopSourceFingerprint } from './sop-source-fingerprint';
import { prisma } from './prisma';
import { getCurrentUser, isOwnerManager, isManagerUser } from './auth';
import { trainingModulesForUser, TRAINING_MODULES } from './training-center';
import { TRAINING_CATEGORIES, OPERATIONS_SOP_CATEGORY, isOperationsSopAuthor, isTeacherTrainingMaterialOperator, teacherTrainingMaterialState } from './teacher-training-materials';
export type SopUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;
export function nextMonthlyReview(at: Date) {
  const next = new Date(at); const day=next.getUTCDate(); next.setUTCDate(1);next.setUTCMonth(next.getUTCMonth()+1);
  const end = new Date(Date.UTC(next.getUTCFullYear(),next.getUTCMonth()+1,0)).getUTCDate(); next.setUTCDate(Math.min(day,end)); return next;
}
export function sopNeedsReview(review: {status:string; nextReviewAt:Date|null}|null|undefined, now = new Date()) {
  return !review || review.status === 'REVIEW_REQUIRED' || review.status === 'CURRENT' && (!review.nextReviewAt || review.nextReviewAt <= now);
}
export async function canManageSops(user:SopUser) { return !user.isObserver && (await isOperationsSopAuthor(user) || await isTeacherTrainingMaterialOperator(user)); }
export async function sopInventory(user:SopUser) {
  const manager = isOwnerManager(user) || await isManagerUser(user), ops = await isOperationsSopAuthor(user), lead=await isTeacherTrainingMaterialOperator(user);
  const modules = manager ? TRAINING_MODULES : trainingModulesForUser(user.role,user.trainingRoles);
  const documents = await prisma.sharedDocument.findMany({where:{category:{name:{in:TRAINING_CATEGORIES}}},include:{category:true,uploader:{select:{name:true}},audits:{orderBy:[{createdAt:'desc'},{id:'desc'}]}}});
  const entries = await Promise.all(modules.map(async m=>({fingerprint:await sopSourceFingerprint(m.code,m.pdfFile),key:'MODULE:'+m.code,title:m.title,titleEn:m.titleEn,version:m.version,roles:m.roles.join(', '),accessRoles:m.roles.map(String),kind:'SYSTEM',url:'/api/training/sops/'+m.code,published:true,platform:m.platform})));
  for(const g of SOP_CURRENT_GUIDES){
    if(!manager&&!ops&&!g.roles.some(r=>r===user.role)&&!user.trainingRoles.some(r=>g.roles.some(gr=>gr===r)))continue;
    entries.push({fingerprint:await sopSourceFingerprint(g.code,g.pdfFile),key:'GUIDE:'+g.code,title:g.title,titleEn:g.titleEn,version:'20261102',roles:g.roles.join(', '),accessRoles:g.roles.map(String),kind:'GUIDE',url:'/api/training/guides/'+g.code,published:true,platform:'WEB'});
  }
  for (const d of documents) {
    const operations=d.category.name===OPERATIONS_SOP_CATEGORY;
    const state=teacherTrainingMaterialState(d.audits.map(a=>a.action),d.status==='ARCHIVED');
    if (!(operations ? ops || state==='PUBLISHED' && user.role!=='STUDENT' : lead || state==='PUBLISHED' && user.role==='TEACHER')) continue;
    entries.push({fingerprint:d.updatedAt.toISOString(),key:'MATERIAL:'+d.id,title:d.title,titleEn:d.title,version:(d.remarks||'').split('\n')[0],roles:operations?'Staff / 员工':'Teachers / 老师',accessRoles:operations?['ADMIN','TEACHER','FINANCE','CS','SALES']:['TEACHER'],kind:operations?'OPERATIONS':'TEACHER',url:'/api/training/materials/'+d.id+'/file',published:state==='PUBLISHED',platform:'WEB'});
  }
  const reviews=await prisma.sopReview.findMany({where:{key:{in:entries.map(e=>e.key)}}}); const map=new Map(reviews.map(r=>[r.key,r]));
  return entries.map(e=>{const r=map.get(e.key);const defaultOwner=e.kind==='OPERATIONS'?'Operations manager / 运营主管':e.accessRoles.includes('FINANCE')&&!e.accessRoles.includes('TEACHER')?'Finance lead / 财务负责人':e.accessRoles.includes('TEACHER')?'Training manager / 培训主管':'Operations manager / 运营主管';return {...e,defaultOwner,review:r?{...r,status:r.status==='CURRENT'&&r.sourceHash!==e.fingerprint?'REVIEW_REQUIRED':r.status}:null};});
}
export async function requireSopEntry(user:SopUser,key:string) {
  if(user.role==='STUDENT') throw Error('Staff access required / 仅限员工');
  const entry=(await sopInventory(user)).find(e=>e.key===key); if(!entry) throw Error('SOP not available / 无权访问此SOP'); return entry;
}
export async function recordSopReview(user:SopUser,input:{key:string;decision:string;expected:string;ownerName:string;note:string;replacementKey:string;checked:boolean}) {
  if(!await canManageSops(user)) throw Error('SOP editing permission required / 无SOP编辑权限');
  const entry=await requireSopEntry(user,input.key);
  if(!['CHECK','FLAG','WITHDRAW'].includes(input.decision)) throw Error('Invalid decision');
  if(['CHECK','WITHDRAW'].includes(input.decision) && !isOwnerManager(user)) throw Error('Owner review required / 需负责人审核');
  if(input.decision==='CHECK' && (!input.checked || !entry.published)) throw Error('Confirm the live steps, screenshots and an independent walkthrough first / 请先核对真实步骤、截图及独立试操作');
  if(!input.ownerName.trim() || input.note.trim().length<10) throw Error('Owner and a clear review note are required / 请填写负责人和至少10个字符的复核说明');
  if(input.replacementKey && input.decision==='WITHDRAW'){const target=await requireSopEntry(user,input.replacementKey);if(target.key===entry.key || !target.published || target.review?.status!=='CURRENT' || target.review.replacementKey || !entry.accessRoles.every(role=>target.accessRoles.includes(role))) throw Error('Choose a current replacement accessible to all original readers / 请选择原读者均可访问的现行替代版本');}
  return prisma.$transaction(async tx=>{
    // A stable advisory lock also serializes a not-yet-created review row.
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('SOP_GOVERNANCE'))`;
    const before=await tx.sopReview.findUnique({where:{key:input.key}});
    if(input.replacementKey && input.decision==='WITHDRAW'){const fresh=await tx.sopReview.findUnique({where:{key:input.replacementKey}});if(!fresh || fresh.status!=='CURRENT' || fresh.replacementKey) throw Error('Replacement changed; refresh first / 替代版本已变化，请刷新');}
    if((before?.updatedAt.toISOString()||'')!==input.expected) throw Error('SOP changed; refresh first / 资料已变化，请刷新');
    if(input.decision==='WITHDRAW' && before?.replacementKey && input.replacementKey===entry.key) throw Error('Invalid replacement');
    const at=new Date(),status=input.decision==='CHECK'?'CURRENT':input.decision==='WITHDRAW'?'WITHDRAWN':'REVIEW_REQUIRED';
    const data={status,ownerName:input.ownerName.trim().slice(0,100),note:input.note.trim().slice(0,1500),replacementKey:input.decision==='WITHDRAW'?input.replacementKey||null:null,...(input.decision==='CHECK'?{sourceHash:entry.fingerprint,reviewedAt:at,nextReviewAt:nextMonthlyReview(at)}:{})};
    const after=await tx.sopReview.upsert({where:{key:input.key},create:{key:input.key,...data},update:data});
    await tx.auditLog.create({data:{actorEmail:user.email,actorName:user.name,actorRole:user.role,module:'training',action:'SOP_'+input.decision,entityType:'SopReview',entityId:input.key,meta:JSON.parse(JSON.stringify({before,after}))}});
    return after;
  });
}
export async function reportSopIssue(user:SopUser,key:string,step:string,message:string) {
  if(user.isObserver) throw Error('Read-only account / 只读账号');
  if(!step.trim() || message.trim().length<10) throw Error('Please give the step and a description of at least 10 characters / 请填写步骤及至少10个字符的说明');
  const entry = await requireSopEntry(user,key);
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext('SOP_GOVERNANCE'))`;
    const item=await tx.sopFeedback.create({data:{key,reporterId:user.id,reporterName:user.name,step:step.trim().slice(0,120),message:message.trim().slice(0,2000)}});
    const existing=await tx.sopReview.findUnique({where:{key}});
    if(existing?.status!=='WITHDRAWN') await tx.sopReview.upsert({where:{key},create:{key,ownerName:entry.review?.ownerName||entry.defaultOwner,status:'REVIEW_REQUIRED'},update:{status:'REVIEW_REQUIRED'}});
    return item;
  });
}
