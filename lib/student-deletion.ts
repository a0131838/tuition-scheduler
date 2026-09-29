import {prisma} from './prisma';

type Actor={email:string;name:string|null;role:string;isObserver?:boolean};
const linkedMessage='This student has business history. Keep the profile and review the linked records; deletion is blocked / 该学生存在业务历史，请保留档案并核对关联记录，不能删除';
function refersToStudent(value:unknown,id:string):boolean {
 if(Array.isArray(value))return value.some(row=>refersToStudent(row,id));
 if(!value||typeof value!=='object')return false;
 const row=value as Record<string,unknown>;
 return row.studentId===id||Object.values(row).some(child=>typeof child==='object'&&refersToStudent(child,id));
}
/** Never cascade student deletion into teaching, finance or long-term service history. */
export async function deleteUnusedStudent(id:string,actor:Actor){
 if(actor.isObserver)throw new Error('Read-only account / 此账号仅可查看');
 return prisma.$transaction(async tx=>{
  await tx.$queryRaw`SELECT id FROM "Student" WHERE id=${id} FOR UPDATE`;
  const student=await tx.student.findUnique({where:{id},include:{_count:true}});
  if(!student)throw new Error('Student not found / 学生不存在');
  if(Object.values(student._count).some(count=>count>0))throw new Error(linkedMessage);
  const [communications,alerts,feedbackReads,salesEvidence,audits,billing]=await Promise.all([
   tx.parentCommunicationTask.count({where:{studentId:id}}),tx.signInAlert.count({where:{studentId:id}}),
   tx.teacherFeedbackRead.count({where:{studentId:id}}),tx.salesEvidenceAssignment.count({where:{studentId:id}}),
   tx.auditLog.count({where:{meta:{path:['studentId'],equals:id}}}),
   tx.appSetting.findUnique({where:{key:'parent_billing_v1'},select:{value:true}}),
  ]);
  if(communications||alerts||feedbackReads||salesEvidence||audits)throw new Error(linkedMessage);
  if(billing){
   let value:unknown;try{value=JSON.parse(billing.value);}catch{throw new Error('Billing history needs review before deletion / 账单历史需核对，暂不能删除');}
   if(refersToStudent(value,id))throw new Error(linkedMessage);
  }
  await tx.auditLog.create({data:{actorEmail:actor.email,actorName:actor.name,actorRole:actor.role,
   module:'STUDENTS',action:'DELETE_UNUSED_STUDENT',entityType:'Student',entityId:id,
   meta:JSON.parse(JSON.stringify({version:1,sourceSnapshot:student}))}});
  await tx.student.delete({where:{id}});
  return {ok:true};
 },{isolationLevel:'Serializable',timeout:15000});
}
