import {t,type Lang} from '@/lib/i18n';
import {formatBusinessDateTime} from '@/lib/date-only';
import type {summarizeRelationshipLeads} from '@/lib/sales-relationship-policy';
import type {summarizeRelationshipWork} from '@/lib/sales-relationship-work';
import type {RelationshipFinancialMetrics} from '@/lib/sales-relationship-overview';
import {panel} from './fields';
type Metric={row:{id:string;name:string;ownerName:string|null};students:ReturnType<typeof summarizeRelationshipLeads>;work:ReturnType<typeof summarizeRelationshipWork>;finance?:RelationshipFinancialMetrics};
export default function RelationshipComparison({lang,metrics,showFinancial}:{lang:Lang;metrics:Metric[];showFinancial:boolean}){
 const money=(value:number|null|undefined)=>value==null?t(lang,'Not verified','未核实'):`SGD ${(value/100).toFixed(2)}`;
 return <section style={panel}><h2>{t(lang,'Compare displayed relationships','当前关系对比')}</h2>
 <p>{t(lang,'This table compares the current displayed results. Financial columns cover explicitly verified attribution only; missing evidence is not zero business. Parent and partner receipts stay separate and are not net revenue after refunds.','本表对比当前展示结果。财务列仅涵盖明确核实的归属，缺少凭据不代表零业务。直客与合作方收据分开统计，均不等于扣除退款后的净收入。')}</p>
 {!showFinancial?<p>{t(lang,'Financial evidence is available to authorized administrators in the existing finance scope.','财务凭据由具备原财务权限的管理员查看。')}</p>:null}
 <div style={{overflowX:'auto'}}><table cellPadding={10} style={{width:'100%',textAlign:'left'}}><thead><tr>{[
  t(lang,'Relationship / owner','关系／负责人'),t(lang,'Student opportunities / linked students','学生商机／已关联学生'),t(lang,'Open student deals / projects','跟进中学生商机／项目'),t(lang,'Next follow-up / due tasks','最早跟进／到期任务'),
  ...(showFinancial?[t(lang,'Verified signed contracts','已核实签约合同'),t(lang,'Parent approved receipts','直客已批准收据'),t(lang,'Partner approved receipts','合作方已批准收据'),t(lang,'Evidence needing review','待核对凭据')]:[])
 ].map(label=><th key={label}>{label}</th>)}</tr></thead><tbody>{metrics.map(({row,students,work,finance})=><tr key={row.id}>
  <td><a href={`/admin/relationships/${row.id}`}>{row.name}</a><p>{row.ownerName||t(lang,'Unassigned','未分配')}</p></td>
  <td>{students.studentOpportunities} / {students.linkedStudents}</td><td>{students.openStudentOpportunities} / {work.openProjects}</td>
  <td>{work.nextDue?formatBusinessDateTime(work.nextDue):t(lang,'Not set','未设置')}<p>{t(lang,'Relationship / student / project','关系／学生／项目')}: {Number(work.relationshipDue)} / {work.studentDue} / {work.projectDue}</p></td>
  {showFinancial?<><td>{finance?.signed??t(lang,'Not verified','未核实')}</td><td>{money(finance?.parentApproved)}<p>{t(lang,'Verified invoices','已核实发票')}: {finance?.parentInvoices??0}</p></td><td>{money(finance?.partnerApproved)}<p>{t(lang,'Verified invoices','已核实发票')}: {finance?.partnerInvoices??0}</p></td><td>{finance?.review??0}</td></>:null}
 </tr>)}</tbody></table></div></section>;
}
