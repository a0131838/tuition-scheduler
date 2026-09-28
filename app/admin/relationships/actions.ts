'use server';
import {requireResourceUser} from '@/lib/auth';
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
