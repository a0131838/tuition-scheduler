import type {Prisma} from '@prisma/client';
import {isStrictSuperAdmin,managerEmailsFromEnv} from './auth';
/** Current HR permissions; keeps the existing HR module management boundary. */
export async function requireHrWriteActor(tx:Prisma.TransactionClient,id:string,management=false){
 await tx.$queryRaw`SELECT id FROM "User" WHERE id=${id} FOR SHARE`;
 const actor=await tx.user.findUnique({where:{id}});
 if(!actor||actor.isObserver||actor.role==='STUDENT')throw Error('Read-only or unavailable account / 账号仅可查看或已失效');
 if(!management)return actor;
 await tx.$queryRaw`SELECT id FROM "ManagerAcl" WHERE "isActive"=true FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM "UserWorkspaceAccess" WHERE "userId"=${id} AND workspace='HR' AND "isActive"=true FOR SHARE`;
 const [acl,workspace]=await Promise.all([tx.managerAcl.findMany({where:{isActive:true},select:{email:true}}),tx.userWorkspaceAccess.findFirst({where:{userId:id,workspace:'HR',isActive:true}})]);
 const managers=new Set([...managerEmailsFromEnv(),...acl.map(a=>a.email.trim().toLowerCase())]);
 if(!isStrictSuperAdmin(actor)&&!(['ADMIN','TEACHER'].includes(actor.role)&&(!!workspace||(managers.size?managers.has(actor.email.toLowerCase()):actor.role==='ADMIN'))))throw Error('Current HR management permission required / 当前无HR管理权限');
 return actor;
}
