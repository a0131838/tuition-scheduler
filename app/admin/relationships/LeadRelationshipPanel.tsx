import RelationshipForm from './RelationshipForm';
import {prisma} from '@/lib/prisma';
import {t,type Lang} from '@/lib/i18n';
import {linkRelationshipLeadAction} from './actions';
export default async function LeadRelationshipPanel({lead,lang}:{lead:{id:string;relationshipId:string|null;recordKind:string;relationshipReviewNote:string|null;updatedAt:Date};lang:Lang}){
 const [rows,current]=await Promise.all([prisma.salesRelationship.findMany({select:{id:true,name:true,status:true},orderBy:{name:'asc'},take:500}),lead.relationshipId?prisma.salesRelationship.findUnique({where:{id:lead.relationshipId},select:{id:true,name:true,status:true}}):null]);
 if(current&&!rows.some(r=>r.id===current.id))rows.push(current);
 return <section style={{border:'1px solid #cbd5e1',borderRadius:12,padding:16}}><b>{t(lang,'Referring relationship','转介关系')}: </b>{current?<a href={`/admin/relationships/${current.id}`}>{current.name}</a>:t(lang,'Not linked / needs review','未关联／待核对')}
 <details style={{marginTop:10}}><summary>{t(lang,'Review relationship and record type','核对关系与记录类型')}</summary><RelationshipForm lang={lang} action={linkRelationshipLeadAction} style={{display:'grid',gap:12,marginTop:12}}>
 <input type="hidden" name="leadId" value={lead.id}/><input type="hidden" name="expectedUpdatedAt" value={lead.updatedAt.toISOString()}/>
 <label>{t(lang,'Relationship','关系档案')}<select name="relationshipId" defaultValue={lead.relationshipId??''}><option value="">{t(lang,'No relationship / unlink','不关联／解除关联')}</option>{rows.map(r=><option key={r.id} value={r.id}>{r.name}{r.status==='ARCHIVED'?` (${t(lang,'Archived','已归档')})`:''}</option>)}</select></label>
 <label>{t(lang,'Confirmed record type','已核实记录类型')}<select name="recordKind" defaultValue={lead.recordKind==='UNREVIEWED'?'':lead.recordKind} required><option value="">{t(lang,'Select after review','核对后选择')}</option><option value="STUDENT">{t(lang,'Individual student opportunity','单个学生商机')}</option><option value="RELATIONSHIP">{t(lang,'Original relationship/contact record','原始关系／联系人记录')}</option></select></label>
 <label style={{display:'grid'}}>{t(lang,'Basis for this classification and link','分类与关联核对依据')}<textarea name="reviewNote" required defaultValue={lead.relationshipReviewNote??''}/></label>
 <p>{t(lang,'Original names and follow-ups are retained. This action does not create a student, sign a contract or confirm payment.','保留原名称及跟进历史。本操作不会新建学生、签约或确认收款。')}</p><button>{t(lang,'Save reviewed link','保存已核对关联')}</button><a href="/admin/relationships">{t(lang,'Create or find a relationship','创建或查找关系档案')}</a>
 </RelationshipForm></details></section>;
}
