import {prisma} from '@/lib/prisma';
import {t,type Lang} from '@/lib/i18n';
import RelationshipForm from './RelationshipForm';
import {linkLeadStudentAction} from './actions';

export default async function LeadStudentLinkPanel({lead,lang,query}:{lead:{id:string;recordKind:string;isArchived:boolean;updatedAt:Date};lang:Lang;query:string}){
 if(lead.recordKind!=='STUDENT'||lead.isArchived)return <p>{t(lang,'Review the classification and restore this record if archived before linking a student.','请先核对学生商机分类；若已归档，请先恢复，再关联学生。')}</p>;
 const search=query.trim().slice(0,120);
 const rows=search?await prisma.student.findMany({where:{OR:[{id:search},{name:{contains:search,mode:'insensitive'}}]},select:{id:true,name:true,grade:true,school:true},orderBy:[{name:'asc'},{id:'asc'}],take:21}):[];
 const hidden=<><input type="hidden" name="leadId" value={lead.id}/><input type="hidden" name="expectedUpdatedAt" value={lead.updatedAt.toISOString()}/></>;
 return <div style={{display:'grid',gap:12}}>
  <details open={Boolean(search)}><summary>{t(lang,'Link an existing student','关联已有学生')}</summary>
   <p>{t(lang,'Search, inspect the exact student profile and record the identity check. Matching names alone is insufficient.','搜索后打开具体学生档案，并记录身份核对依据。不能只凭同名关联。')}</p>
   <form method="get" action={`/admin/leads/${lead.id}`} data-native-submit style={{display:'grid',gap:8}}><label>{t(lang,'Student name or exact ID','学生姓名或完整编号')}<input name="studentQuery" defaultValue={search}/></label><button>{t(lang,'Find existing student','查找已有学生')}</button></form>
   {rows.length?<RelationshipForm action={linkLeadStudentAction} lang={lang} style={{display:'grid',gap:10,marginTop:12}}>{hidden}<input type="hidden" name="mode" value="LINK"/>
    {rows.slice(0,20).map(row=><div key={row.id}><label><input type="radio" name="studentId" value={row.id} required/> {row.name} · {row.grade||'—'} · {row.school||'—'}</label><small style={{display:'block',overflowWrap:'anywhere'}}>{row.id}</small><a href={`/admin/students/${row.id}`} target="_blank" rel="noopener noreferrer">{t(lang,'Inspect student profile','核对学生档案')}</a></div>)}
    <label>{t(lang,'Identity check and linking reason','身份核对依据与关联原因')}<textarea name="reviewNote" required rows={3} style={{width:'100%'}}/></label>
    <p>{t(lang,'The existing student profile, packages, source and history stay intact. Deal status and receipt verification are separate.','保留已有学生资料、课包、来源和历史。商机状态与收款核验独立处理。')}</p><button>{t(lang,'Link selected student','关联所选学生')}</button>
   </RelationshipForm>:search?<p>{t(lang,'No matching students found. Check the name or exact ID before creating a new record.','未找到匹配学生。新建前请核对姓名或完整编号。')}</p>:null}
   {rows.length>20?<p>{t(lang,'First 20 results shown; narrow the name or enter the exact student ID.','当前展示前20条，请缩小姓名范围或输入准确学生编号。')}</p>:null}
  </details>
  <details><summary>{t(lang,'Create a new student record','新建学生档案')}</summary><p>{t(lang,'Use only after checking that no existing student profile should be reused. This does not mark the deal Won or verify payment.','确认没有应复用的学生档案后再新建。建档不会自动标记成交或确认收款。')}</p>
   <RelationshipForm action={linkLeadStudentAction} lang={lang}>{hidden}<input type="hidden" name="mode" value="CREATE"/><button>{t(lang,'Create student record','建立学生档案')}</button></RelationshipForm>
  </details>
 </div>;
}
