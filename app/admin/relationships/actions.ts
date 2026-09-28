'use server';
import {requireResourceUser,requireResourceAdmin} from '@/lib/auth';
import {linkLeadStudent} from '@/lib/lead-student-link';
import {mutateSalesRelationship,type RelationshipMutation} from '@/lib/sales-relationships';
import {revalidatePath} from 'next/cache';
import {Prisma} from '@prisma/client';
import {getLang,t} from '@/lib/i18n';
async function run(formData:FormData,action:RelationshipMutation['action']){
 const actor=await requireResourceUser();const values=Object.fromEntries(formData.entries());let id='';
 try{id=await mutateSalesRelationship(actor,{action,values});}
 catch(error){const lang=await getLang();const safe=error instanceof Error&&!(error instanceof Prisma.PrismaClientKnownRequestError)&&error.message.includes(' / ')?error.message.split(' / '):null;const message=safe?t(lang,safe[0],safe.slice(1).join(' / ')):t(lang,'Unable to save this record. Reload and check its current state.','未能保存，请刷新并核对记录当前状态。');const leadId=String(values.leadId??''),relationshipId=String(values.relationshipId??'');const base=action==='LINK_LEAD'&&leadId?`/admin/leads/${encodeURIComponent(leadId)}`:relationshipId?`/admin/relationships/${encodeURIComponent(relationshipId)}`:'/admin/relationships';return `${base}?err=${encodeURIComponent(message)}`;}
 revalidatePath('/admin/relationships');if(id)revalidatePath(`/admin/relationships/${id}`);revalidatePath('/admin/leads');
 if(action==='LINK_LEAD'){const leadId=String(values.leadId);revalidatePath(`/admin/leads/${leadId}`);return `/admin/leads/${leadId}?ok=relationship-linked`;}
 return id?`/admin/relationships/${id}?ok=saved`:'/admin/relationships?ok=saved';
}
export async function createRelationshipAction(formData:FormData){return run(formData,'CREATE');}
export async function updateRelationshipAction(formData:FormData){return run(formData,'UPDATE');}
export async function addRelationshipFollowUpAction(formData:FormData){return run(formData,'FOLLOW_UP');}
export async function linkRelationshipLeadAction(formData:FormData){return run(formData,'LINK_LEAD');}
export async function saveRelationshipOpportunityAction(formData:FormData){return run(formData,'OPPORTUNITY');}
export async function linkLeadStudentAction(formData:FormData){
 const actor=await requireResourceAdmin(),lang=await getLang(),leadId=String(formData.get('leadId')??'');
 try{
  const mode=String(formData.get('mode')??'');if(mode!=='CREATE'&&mode!=='LINK')throw new Error('Invalid student link mode / 学生关联方式无效');
  const studentId=await linkLeadStudent(actor,{leadId,mode,expectedUpdatedAt:String(formData.get('expectedUpdatedAt')??''),studentId:String(formData.get('studentId')??''),reviewNote:String(formData.get('reviewNote')??'')});
  revalidatePath(`/admin/leads/${leadId}`);revalidatePath('/admin/leads');revalidatePath('/admin/relationships');revalidatePath('/admin/students');
  return `/admin/students/${studentId}`;
 }catch(error){
  const safe=error instanceof Error&&!(error instanceof Prisma.PrismaClientKnownRequestError)&&error.message.includes(' / ')?error.message.split(' / '):null;
  const message=safe?t(lang,safe[0],safe.slice(1).join(' / ')):t(lang,'Unable to link this student. Reload and review the record.','未能关联学生，请刷新并核对记录。');
  return `/admin/leads/${encodeURIComponent(leadId)}?err=${encodeURIComponent(message)}`;
 }
}

export async function saveSalesEvidenceAction(formData:FormData){
 const actor=await requireResourceAdmin(),lang=await getLang(),leadId=String(formData.get('leadId')??'');
 try{
  const {mutateSalesEvidence}=await import('@/lib/sales-evidence');
  const action=String(formData.get('action')??'');if(action!=='ATTACH'&&action!=='REVOKE')throw new Error('Invalid attribution action / 归属操作无效');
  const selection=String(formData.get('contract')??'').split('|');
  await mutateSalesEvidence(actor,{action,leadId,documentId:selection[0],sourceUpdatedAt:selection[1],assignmentId:String(formData.get('assignmentId')??''),expectedUpdatedAt:String(formData.get('expectedUpdatedAt')??''),reviewNote:String(formData.get('reviewNote')??'')});
  revalidatePath('/admin/relationships','layout');revalidatePath(`/admin/leads/${leadId}`);
  return `/admin/leads/${encodeURIComponent(leadId)}?ok=evidence-saved`;
 }catch(error){
  const safe=error instanceof Error&&!(error instanceof Prisma.PrismaClientKnownRequestError)&&error.message.includes(' / ')?error.message.split(' / '):null;
  const message=safe?t(lang,safe[0],safe.slice(1).join(' / ')):t(lang,'Unable to save attribution. Reload and review the record.','未能保存归属，请刷新并核对记录。');
  return `/admin/leads/${encodeURIComponent(leadId)}?err=${encodeURIComponent(message)}`;
 }
}

export async function saveParentInvoiceEvidenceAction(formData:FormData){
 const actor=await requireResourceAdmin(),lang=await getLang(),leadId=String(formData.get('leadId')??'');
 try{
  const {attributeParentInvoice}=await import('@/lib/sales-invoice-evidence');
  const [documentId,sourceFingerprint]=String(formData.get('invoice')??'').split('|');
  await attributeParentInvoice(actor,{leadId,documentId,sourceFingerprint,expectedUpdatedAt:String(formData.get('expectedUpdatedAt')??''),reviewNote:String(formData.get('reviewNote')??'')});
  revalidatePath('/admin/relationships','layout');revalidatePath(`/admin/leads/${leadId}`);
  return `/admin/leads/${encodeURIComponent(leadId)}?ok=evidence-saved`;
 }catch(error){
  const safe=error instanceof Error&&!(error instanceof Prisma.PrismaClientKnownRequestError)&&error.message.includes(' / ')?error.message.split(' / '):null;
  const message=safe?t(lang,safe[0],safe.slice(1).join(' / ')):t(lang,'Unable to save invoice attribution. Reload and review the record.','未能保存发票归属，请刷新并核对记录。');
  return `/admin/leads/${encodeURIComponent(leadId)}?err=${encodeURIComponent(message)}`;
 }
}
