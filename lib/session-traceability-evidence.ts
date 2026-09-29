export function explicitSessionReferences(meta:unknown){
 const value=meta&&typeof meta==='object'&&!Array.isArray(meta)?meta as Record<string,unknown>:{};
 const id=(v:unknown)=>typeof v==='string'&&v.trim()&&v.length<=200?v.trim():null;
 const source=id(value.sourceSessionId);
 const results=[id(value.resultSessionId),...(Array.isArray(value.resultSessionIds)?value.resultSessionIds.slice(0,100).map(id):[])].filter((v):v is string=>!!v);
 return {sourceSessionId:source,resultSessionIds:[...new Set(results)]};
}
export function traceSnapshotLabel(value:unknown){
 if(!value||typeof value!=='object'||Array.isArray(value))return null;
 const v=value as Record<string,unknown>;
 const date=(x:unknown)=>typeof x==='string'&&Number.isFinite(Date.parse(x))?x:null;
 const str=(x:unknown)=>typeof x==='string'?x.slice(0,500):null;
 return {startAt:date(v.startAt),endAt:date(v.endAt),teacherName:str(v.teacherName),studentName:str(v.studentName),campusName:str(v.campusName),roomName:str(v.roomName)};
}
