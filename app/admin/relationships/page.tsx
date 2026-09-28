import RelationshipForm from './RelationshipForm';
import RelationshipComparison from './RelationshipComparison';
import {requireResourceUser} from '@/lib/auth';
import {prisma} from '@/lib/prisma';
import {getLang,t} from '@/lib/i18n';
import {formatBusinessDateTime} from '@/lib/date-only';
import {summarizeRelationshipLeads} from '@/lib/sales-relationship-policy';
import {summarizeRelationshipWork} from '@/lib/sales-relationship-work';
import {readRelationshipFinancialComparison} from '@/lib/sales-relationship-overview';
import {createRelationshipAction} from './actions';
import {panel,grid,ProfileFields,relationLabel} from './fields';
export default async function RelationshipsPage({searchParams}:{searchParams?:Promise<{q?:string;status?:string;focus?:string;view?:string;sort?:string;err?:string;ok?:string}>}){
 const user=await requireResourceUser(),lang=await getLang(),sp=await searchParams,now=new Date();
 const q=String(sp?.q??'').trim(),archived=sp?.status==='ARCHIVED',due=sp?.focus==='due',compare=sp?.view==='compare';
 const [rows,pending]=await Promise.all([
  prisma.salesRelationship.findMany({where:{status:archived?'ARCHIVED':{not:'ARCHIVED'},
   ...(q?{OR:[{name:{contains:q,mode:'insensitive' as const}},{ownerName:{contains:q,mode:'insensitive' as const}},{contactName:{contains:q,mode:'insensitive' as const}}]}:{}),
   ...(due?{AND:[{OR:[{nextActionDue:{lte:now}},{leads:{some:{recordKind:'STUDENT',isArchived:false,status:{notIn:['Won','Lost']},nextActionDue:{lte:now}}}},{opportunities:{some:{status:{in:['OPEN','IN_PROGRESS']},nextActionDue:{lte:now}}}}]}]}:{})},
   include:{leads:{select:{recordKind:true,status:true,convertedStudentId:true,isArchived:true,nextActionDue:true}},opportunities:{select:{status:true,nextActionDue:true}}},
   orderBy:[{nextActionDue:'asc'},{updatedAt:'desc'}],take:201}),
  prisma.lead.count({where:{recordKind:'UNREVIEWED',isArchived:false}})
 ]);
 const financial=compare?await readRelationshipFinancialComparison(user,rows.slice(0,200).map(row=>row.id)):null;
 const metrics=rows.slice(0,200).map(row=>({row,students:summarizeRelationshipLeads(row.leads),work:summarizeRelationshipWork(row,now),finance:financial?.get(row.id)}));
 const sort=['students','open'].includes(sp?.sort??'')?sp!.sort!:'due';
 metrics.sort((a,b)=>sort==='students'?b.students.linkedStudents-a.students.linkedStudents:sort==='open'?b.students.openStudentOpportunities-a.students.openStudentOpportunities:(a.work.nextDue?.getTime()??Infinity)-(b.work.nextDue?.getTime()??Infinity));
 return <main style={{display:'grid',gap:16}}>
 <header><h1>{t(lang,'Relationships & referrals','关系与转介')}</h1><p>{t(lang,'Maintain each relationship and follow its students and cooperation projects separately.','持续维护每段关系，分别跟进其介绍的学生和合作项目。')}</p><a href="/admin/leads">{t(lang,'Student opportunities & original records','学生商机与原始记录')}</a></header>
 {sp?.err?<p role="alert" style={{color:'#991b1b'}}>{sp.err}</p>:null}{sp?.ok?<p role="status">{t(lang,'Saved','已保存')}</p>:null}
 <section style={panel}><form method="get" style={{display:'flex',gap:10,flexWrap:'wrap'}}>
  <input name="q" defaultValue={q} aria-label={t(lang,'Search relationship or owner','搜索关系或负责人')} placeholder={t(lang,'Search relationship or owner','搜索关系或负责人')}/>
  <select name="status" defaultValue={archived?'ARCHIVED':''} aria-label={t(lang,'Scope','范围')}><option value="">{t(lang,'Current relationships','当前关系')}</option><option value="ARCHIVED">{t(lang,'Archived relationships','已归档关系')}</option></select>
  <select name="focus" defaultValue={due?'due':''} aria-label={t(lang,'Follow-up filter','跟进筛选')}><option value="">{t(lang,'All follow-ups','全部跟进')}</option><option value="due">{t(lang,'Relationship, student or project due','关系、学生或项目已到期')}</option></select>
  <select name="view" defaultValue={compare?'compare':''} aria-label={t(lang,'View','视图')}><option value="">{t(lang,'Relationship cards','关系卡片')}</option><option value="compare">{t(lang,'Compare relationships','关系对比')}</option></select>
  <select name="sort" defaultValue={sort} aria-label={t(lang,'Sort displayed results','当前结果排序')}><option value="due">{t(lang,'Earliest follow-up','最早跟进时间')}</option><option value="students">{t(lang,'Most linked students','已关联学生最多')}</option><option value="open">{t(lang,'Most open student opportunities','跟进中学生商机最多')}</option></select>
  <button>{t(lang,'Apply','应用')}</button>
 </form></section>
 {pending?<aside style={panel}><a href="/admin/leads?recordKind=UNREVIEWED">{t(lang,`${pending} original records need classification`,`${pending} 条原始记录待分类核对`)}</a><p>{t(lang,'Names alone do not establish a relationship or a student identity. Original records remain available until reviewed.','仅凭名称无法确定关系和学生身份。核对前保留原记录。')}</p></aside>:null}
 <details style={panel}><summary style={{fontWeight:700,cursor:'pointer'}}>{t(lang,'Create relationship','新建关系档案')}</summary><RelationshipForm lang={lang} action={createRelationshipAction} style={{display:'grid',gap:12,marginTop:16}}><ProfileFields lang={lang} row={{ownerName:user.name}}/><button>{t(lang,'Create relationship','创建关系档案')}</button></RelationshipForm></details>
 <p>{t(lang,'Student opportunities are records; linked students are deduplicated by exact student ID within each relationship. Unreviewed original records are excluded. Won does not establish signed contracts or payments.','学生商机按记录统计，已关联学生按每段关系内的准确学生ID去重；待核对原始记录不计入。成交状态不代表签约或收款。')}</p>
 {compare?<RelationshipComparison lang={lang} metrics={metrics} showFinancial={financial!==null}/>:<section style={grid}>{metrics.map(({row,students,work})=><article key={row.id} style={panel}>
  <div>{relationLabel(lang,row.kind)} · {relationLabel(lang,row.status)}</div><h2><a href={`/admin/relationships/${row.id}`}>{row.name}</a></h2>
  <p>{t(lang,'Owner','负责人')}: {row.ownerName||t(lang,'Unassigned','未分配')}</p><p>{row.nextAction||t(lang,'Set a relationship next action','请设置关系下一步')}</p>
  <p>{t(lang,'Relationship follow-up','关系跟进')}: {row.nextActionDue?formatBusinessDateTime(row.nextActionDue):t(lang,'Not set','未设置')}</p>
  <p>{t(lang,'Student opportunities / distinct linked students','学生商机／已关联学生（去重）')}: {students.studentOpportunities} / {students.linkedStudents}</p>
  <p>{t(lang,'Open cooperation projects','跟进中合作项目')}: {work.openProjects}</p>
  {work.relationshipDue||work.studentDue||work.projectDue?<p style={{color:'#b45309'}}>{t(lang,'Due relationship / student / project tasks','到期关系／学生／项目任务')}: {Number(work.relationshipDue)} / {work.studentDue} / {work.projectDue}</p>:null}
 </article>)}</section>}
 {!rows.length?<p>{t(lang,'No relationships match these filters. Create a profile to start maintaining a relationship.','当前筛选没有关系档案。可新建档案开始维护。')}</p>:null}
 {rows.length>200?<p>{t(lang,'Comparison and sorting cover the first 200 matching relationships only. Narrow the search to compare other records.','对比和排序仅涵盖前200条匹配关系，请缩小筛选范围对比其他记录。')}</p>:null}
 </main>;
}
