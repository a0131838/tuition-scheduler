export type RelationshipWork={nextActionDue:Date|null;leads:Array<{recordKind:string;status:string;isArchived:boolean;nextActionDue:Date|null}>;opportunities:Array<{status:string;nextActionDue:Date|null}>};
/** Each scope keeps its own task. Won/lost student deals never close the relationship's next action. */
export function summarizeRelationshipWork(row:RelationshipWork,now:Date){
 const leadDates=row.leads.filter(l=>l.recordKind==='STUDENT'&&!l.isArchived&&!['Won','Lost'].includes(l.status)).flatMap(l=>l.nextActionDue?[l.nextActionDue]:[]);
 const projects=row.opportunities.filter(p=>['OPEN','IN_PROGRESS'].includes(p.status));
 const projectDates=projects.flatMap(p=>p.nextActionDue?[p.nextActionDue]:[]);
 const dates=[...(row.nextActionDue?[row.nextActionDue]:[]),...leadDates,...projectDates];
 return {relationshipDue:!!row.nextActionDue&&row.nextActionDue<=now,studentDue:leadDates.filter(d=>d<=now).length,projectDue:projectDates.filter(d=>d<=now).length,openProjects:projects.length,nextDue:dates.length?new Date(Math.min(...dates.map(d=>d.getTime()))):null};
}
