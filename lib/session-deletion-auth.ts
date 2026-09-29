import {requireAdmin,isManagerUser} from './auth';
export async function requireSessionDeletionActor(){
 const user=await requireAdmin();
 if(user.isObserver||!(user.role==='ADMIN'||user.role==='TEACHER'&&await isManagerUser(user)))throw new Error('Teaching management permission required / 需要教学管理权限');
 return user;
}
