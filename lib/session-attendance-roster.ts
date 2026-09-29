type Student={id?:string|null;name?:string|null};
type RosterSource={studentId?:string|null;student?:Student|null;class:{capacity:number;oneOnOneStudentId?:string|null;oneOnOneStudent?:Student|null;enrollments?:Array<{studentId:string;student?:Student|null}>}};
/** Use explicit ownership; never choose the first student of an ambiguous one-to-one class. */
export function resolveAttendanceRoster(s:RosterSource){
 const enrolled=new Map((s.class.enrollments??[]).map(e=>[e.studentId,{id:e.studentId,name:e.student?.name??null}]));
 if(s.class.capacity!==1)return {students:[...enrolled.values()],needsReview:enrolled.size===0};
 const id=s.studentId??s.student?.id??s.class.oneOnOneStudentId??s.class.oneOnOneStudent?.id??(enrolled.size===1?[...enrolled.keys()][0]:null);
 if(!id)return {students:[],needsReview:true};
 const name=(s.student?.id===id?s.student.name:null)??(s.class.oneOnOneStudent?.id===id?s.class.oneOnOneStudent.name:null)??enrolled.get(id)?.name??null;
 return {students:[{id,name}],needsReview:false};
}
