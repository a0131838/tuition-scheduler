import { requireTeacherProfile } from "@/lib/auth";
import { AttendanceSaveError, saveTeacherAttendance } from "@/lib/teacher-attendance-save";
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
 const {user,teacher}=await requireTeacherProfile();
 if(!teacher) return Response.json({ok:false,message:"Teacher profile not linked / 未关联教师档案"},{status:403});
 const {id:sessionId}=await ctx.params;
 let body;try{body=await req.json();}catch{return Response.json({ok:false,message:"Invalid JSON body / 请求格式无效"},{status:400});}
 try {
  const result=await saveTeacherAttendance({sessionId,teacherId:teacher.id,actor:user,action:"TEACHER_SAVE",items:Array.isArray(body?.items)?body.items:[]});
  return Response.json({ok:true,...result});
 }catch(error){return Response.json({ok:false,message:error instanceof AttendanceSaveError?error.message:"Attendance was not saved; retry or contact an administrator / 点名未保存，请重试或联系管理员"},{status:error instanceof AttendanceSaveError?error.status:500});}
}
