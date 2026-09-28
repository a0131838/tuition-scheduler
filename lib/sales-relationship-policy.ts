import { canAccessResourceWorkspaceRole } from "./staff-roles";
export const RELATIONSHIP_KINDS = ["AGENT", "PARTNER", "SCHOOL", "PARENT", "CONTACT"] as const;
export const RELATIONSHIP_STATUSES = ["ACTIVE", "NURTURING", "DORMANT", "ARCHIVED"] as const;
export const RELATIONSHIP_OPPORTUNITY_STATUSES = ["OPEN", "IN_PROGRESS", "WON", "LOST", "PAUSED"] as const;
export const RELATIONSHIP_RECORD_KINDS = ["UNREVIEWED", "STUDENT", "RELATIONSHIP"] as const;
export type RelationshipActor = { id:string; name:string; email:string; role:string; isObserver?:boolean; operationsAdmin?:boolean };
export function assertRelationshipWrite(actor:RelationshipActor) {
 if(actor.isObserver || (!canAccessResourceWorkspaceRole(actor.role) && !actor.operationsAdmin)) throw new Error("No permission to change relationships / 无权修改关系档案");
}
export function relationshipOption<T extends string>(value:unknown,allowed:readonly T[]):T {
 if(typeof value!=='string' || !allowed.includes(value as T)) throw new Error("Invalid relationship option / 关系选项无效");
 return value as T;
}
export function relationshipText(value:unknown,max=2000) {return typeof value==='string'?value.trim().slice(0,max):'';}
export function assertRelationshipLink(input:{recordKind:string; reviewNote:string; convertedStudentId?:string|null}) {
 if(input.recordKind==='UNREVIEWED' || !RELATIONSHIP_RECORD_KINDS.includes(input.recordKind as typeof RELATIONSHIP_RECORD_KINDS[number])) throw new Error("Confirm whether this is a student opportunity or a relationship record / 请先确认这是学生商机还是关系记录");
 if(!input.reviewNote.trim()) throw new Error("Record the basis for this relationship link / 请填写关系归属的核对依据");
 if(input.recordKind==='RELATIONSHIP' && input.convertedStudentId) throw new Error("This record is linked to a student; review its history before reclassifying / 该记录已关联学生，请先核对历史后再调整类型");
}
/** Won is a pipeline outcome, never evidence of a contract, invoice or receipt. */
export function summarizeRelationshipLeads(rows:Array<{recordKind:string;status:string;convertedStudentId:string|null;isArchived:boolean}>) {
 const students=rows.filter(r=>r.recordKind==='STUDENT');
 return {studentOpportunities:students.length,linkedStudents:new Set(students.flatMap(r=>r.convertedStudentId?[r.convertedStudentId]:[])).size,
   openStudentOpportunities:students.filter(r=>!r.isArchived && !['Won','Lost'].includes(r.status)).length,
   pipelineWon:students.filter(r=>r.status==='Won').length,unreviewed:rows.filter(r=>r.recordKind==='UNREVIEWED').length};
}
