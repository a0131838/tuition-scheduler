import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { isOwnerManager, managerEmailsFromEnv, teacherLeadEmailsFromEnv } from './auth';
import { TEACHER_TRAINING_CATEGORY, OPERATIONS_SOP_CATEGORY, TRAINING_CATEGORIES, TRAINING_MATERIAL_ACTION, teacherTrainingMaterialState, teacherTrainingMaterialTransitionAllowed, type TeacherTrainingMaterialDecision } from './teacher-training-materials';

type MaterialFile = { relativePath: string; originalName: string; sizeBytes: number; mimeType: string | null };
type DraftInput = { category?: string; topic?: string; actorId: string; title: string; version: string; summary: string; file: MaterialFile };

async function operator(tx: Prisma.TransactionClient, id: string, category = TEACHER_TRAINING_CATEGORY) {
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR SHARE`;
  const user = await tx.user.findUnique({ where: { id } });
  if (!user || user.isObserver) throw Error('Current material editing permission required / 当前无材料编辑权限');
  await tx.$queryRaw`SELECT id FROM "ManagerAcl" WHERE "isActive"=true FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "TeacherLeadAcl" WHERE "isActive"=true FOR SHARE`;
  const [managers, leads] = await Promise.all([
    tx.managerAcl.findMany({ where: { isActive: true } }), tx.teacherLeadAcl.findMany({ where: { isActive: true } }),
  ]);
  const managerSet = new Set([...managerEmailsFromEnv(), ...managers.map(x => x.email.trim().toLowerCase())]);
  const leadSet = new Set([...teacherLeadEmailsFromEnv(), ...leads.map(x => x.email.trim().toLowerCase())]);
  const manager = isOwnerManager(user) || ['ADMIN', 'TEACHER'].includes(user.role) && (managerSet.size ? managerSet.has(user.email.toLowerCase()) : user.role === 'ADMIN');
  const lead = (user.role === 'TEACHER' || (user.role === 'ADMIN' && !!user.teacherId)) && leadSet.has(user.email.toLowerCase());
  const opsGrant = category === OPERATIONS_SOP_CATEGORY && !!(await tx.sopAuthorAccess.findUnique({where:{userId:id}}));
  if (category === OPERATIONS_SOP_CATEGORY ? !manager && !opsGrant : !manager && !lead) throw Error('Current material editing permission required / 当前无材料编辑权限');
  return user;
}

async function lockedMaterial(tx: Prisma.TransactionClient, id: string, expectedUpdatedAt: string) {
  await tx.$queryRaw`SELECT id FROM "SharedDocument" WHERE id=${id} FOR UPDATE`;
  const row = await tx.sharedDocument.findFirst({
    where: { id, category: { name: {in: TRAINING_CATEGORIES} } },
    include: { category: true, audits: { orderBy: [{ createdAt: 'desc' }, { id: 'desc' }] } },
  });
  if (!row) throw Error('Training material not found / 培训材料不存在');
  if (row.updatedAt.toISOString() !== expectedUpdatedAt) throw Error('Material changed; refresh and review / 材料已变化，请刷新核对');
  return row;
}

function conflict(error: unknown): never {
  if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2034' || (error.code === 'P2010' && String(error.meta?.code) === '40001'))) {
    throw Error('Material changed; refresh and review / 材料已变化，请刷新核对');
  }
  throw error;
}

function draftData(input: DraftInput) {
  const title = input.title.trim().slice(0, 120), version = input.version.trim().slice(0, 30);
  if (!title || !version || !input.file.relativePath || input.file.sizeBytes <= 0) throw Error('Title, version and file are required / 请填写标题、版本及文件');
  return { title, filePath: input.file.relativePath, originalFileName: input.file.originalName, fileSizeBytes: input.file.sizeBytes, mimeType: input.file.mimeType, remarks: `Version ${version}${input.summary.trim() ? '\n' + input.summary.trim().slice(0, 500) : ''}` };
}

async function audit(tx: Prisma.TransactionClient, actor: { id: string; email: string; name: string; role: string }, id: string, action: string, note: string, before: unknown, after: unknown, at: Date) {
  await tx.sharedDocumentAudit.create({ data: { documentId: id, actorUserId: actor.id, action, note: note || null, createdAt: at } });
  await tx.auditLog.create({ data: { actorEmail: actor.email, actorName: actor.name, actorRole: actor.role, module: 'training', action, entityType: 'SharedDocument', entityId: id, meta: JSON.parse(JSON.stringify({ before, after })) } });
}

export async function createTrainingMaterial(input: DraftInput) {
  return prisma.$transaction(async tx => {
    const categoryName = input.category || TEACHER_TRAINING_CATEGORY;
    if (!TRAINING_CATEGORIES.includes(categoryName)) throw Error('Invalid category');
    const actor = await operator(tx, input.actorId, categoryName), data = draftData(input);
    const category = await tx.documentCategory.upsert({ where: { name: categoryName }, create: { name: categoryName }, update: { isActive: true } });
    const row = await tx.sharedDocument.create({ data: { ...data, categoryId: category.id, uploadedByUserId: actor.id } });
    await tx.sopReview.create({data:{key:'MATERIAL:'+row.id, ownerName:actor.name, topicKey:categoryName+':'+(input.topic?.trim()||data.title).toLowerCase().replace(/\s+/g,' ').slice(0,120)}});
    await audit(tx, actor, row.id, TRAINING_MATERIAL_ACTION.DRAFT, data.remarks, null, row, row.updatedAt);
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(conflict);
}

export async function updateTrainingMaterial(input: DraftInput & { id: string; expectedUpdatedAt: string }) {
  return prisma.$transaction(async tx => {
    const before = await lockedMaterial(tx, input.id, input.expectedUpdatedAt), actor = await operator(tx, input.actorId, before.category.name);
    const state = teacherTrainingMaterialState(before.audits.map(x => x.action), before.status === 'ARCHIVED');
    if (state !== 'DRAFT' && state !== 'NEEDS_REVISION') throw Error('Only draft or returned materials can be updated / 仅可更新草稿或退回的材料');
    const data = draftData(input);
    const at = new Date(Math.max(Date.now(), +before.updatedAt + 1, +(before.audits[0]?.createdAt || 0) + 1));
    const row = await tx.sharedDocument.update({ where: { id: before.id }, data: { ...data, updatedAt: at } });
    await audit(tx, actor, row.id, TRAINING_MATERIAL_ACTION.DRAFT_UPDATED, data.remarks, before, row, at);
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(conflict);
}

export async function transitionTrainingMaterial(input: { actorId: string; id: string; expectedUpdatedAt: string; decision: TeacherTrainingMaterialDecision; note?: string }) {
  return prisma.$transaction(async tx => {
    const before = await lockedMaterial(tx, input.id, input.expectedUpdatedAt), actor = await operator(tx, input.actorId, before.category.name);
    const state = teacherTrainingMaterialState(before.audits.map(x => x.action), before.status === 'ARCHIVED');
    if (!teacherTrainingMaterialTransitionAllowed({ state, decision: input.decision, owner: isOwnerManager(actor) })) throw Error('Training material transition is not allowed / 当前不能执行此材料操作');
    const note = (input.note || '').trim().slice(0, 500);
    if (input.decision === 'REVISION' && note.length < 10) throw Error('Revision instructions are required / 请填写至少10个字符的修改要求');
    const action = { SUBMIT: TRAINING_MATERIAL_ACTION.SUBMITTED, PUBLISH: TRAINING_MATERIAL_ACTION.PUBLISHED, REVISION: TRAINING_MATERIAL_ACTION.NEEDS_REVISION, ARCHIVE: TRAINING_MATERIAL_ACTION.ARCHIVED }[input.decision];
    const at = new Date(Math.max(Date.now(), +before.updatedAt + 1, +(before.audits[0]?.createdAt || 0) + 1));
    const row = await tx.sharedDocument.update({ where: { id: before.id }, data: {
      updatedAt: at, ...(input.decision === 'ARCHIVE' ? { status: 'ARCHIVED', archivedAt: at, archivedByEmail: actor.email } : {}),
    } });
    if (input.decision === 'PUBLISH') {
      const ownReview=await tx.sopReview.findUnique({where:{key:'MATERIAL:'+row.id}});
      if(ownReview?.topicKey){
        const older=await tx.sopReview.findMany({where:{topicKey:ownReview.topicKey,status:{not:'WITHDRAWN'},key:{not:'MATERIAL:'+row.id}}});
        for(const old of older){
          if(!old.key.startsWith('MATERIAL:')) continue;
          const prior=await tx.sharedDocument.findFirst({where:{id:old.key.slice(9),categoryId:before.categoryId,status:'ACTIVE'},include:{audits:{orderBy:[{createdAt:'desc'},{id:'desc'}]}}});
          if(!prior||teacherTrainingMaterialState(prior.audits.map(a=>a.action))!=='PUBLISHED') continue;
          const archived=await tx.sharedDocument.update({where:{id:prior.id},data:{status:'ARCHIVED',archivedAt:at,archivedByEmail:actor.email}});
          await tx.sopReview.update({where:{key:old.key},data:{status:'WITHDRAWN',replacementKey:'MATERIAL:'+row.id,note:'Replaced by '+row.title}});
          await audit(tx,actor,prior.id,TRAINING_MATERIAL_ACTION.ARCHIVED,'Replaced by '+row.id,prior,archived,at);
        }
      }
      const {nextMonthlyReview}=await import('./sop-governance'); const next=nextMonthlyReview(at);
      await tx.sopReview.upsert({where:{key:'MATERIAL:'+row.id},create:{key:'MATERIAL:'+row.id,ownerName:actor.name,status:'CURRENT',sourceHash:row.updatedAt.toISOString(),reviewedAt:at,nextReviewAt:next},update:{status:'CURRENT',sourceHash:row.updatedAt.toISOString(),reviewedAt:at,nextReviewAt:next}});
    }
    if (input.decision === 'ARCHIVE') await tx.sopReview.updateMany({where:{key:'MATERIAL:'+row.id},data:{status:'WITHDRAWN'}});
    await audit(tx, actor, row.id, action, note, before, row, at);
    return row;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch(conflict);
}
