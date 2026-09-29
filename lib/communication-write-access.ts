import type {Prisma} from '@prisma/client';
import {managerEmailsFromEnv,operationsAdminEmailsFromEnv} from './auth';
/** Re-evaluate the existing web/CS communication boundary inside the write transaction. */
export async function requireCommunicationWriteAccess(tx:Prisma.TransactionClient,userId:string){
 await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR SHARE`;
 const actor=await tx.user.findUnique({where:{id:userId},select:{id:true,name:true,email:true,role:true,isObserver:true}});
 if(!actor||actor.isObserver||actor.role==='STUDENT')throw Error('Read-only or unavailable account / 账号仅可查看或已失效');
 const email=actor.email.trim().toLowerCase();
 await tx.$queryRaw`SELECT id FROM "ManagerAcl" WHERE LOWER(TRIM(email))=${email} AND "isActive"=true FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM "OperationsAdminAcl" WHERE LOWER(TRIM(email))=${email} AND "isActive"=true FOR SHARE`;
 await tx.$queryRaw`SELECT id FROM "UserWorkspaceAccess" WHERE "userId"=${userId} AND "isActive"=true FOR SHARE`;
 const [managers,operations,workspace]=await Promise.all([tx.managerAcl.findMany({where:{isActive:true},select:{email:true}}),tx.operationsAdminAcl.findMany({where:{isActive:true},select:{email:true}}),tx.userWorkspaceAccess.findFirst({where:{userId,workspace:'CS',isActive:true}})]);
 const manager=actor.role==='TEACHER'&&(managerEmailsFromEnv().includes(email)||managers.some(row=>row.email.trim().toLowerCase()===email));
 const operator=!['FINANCE','STUDENT'].includes(actor.role)&&(operationsAdminEmailsFromEnv().includes(email)||operations.some(row=>row.email.trim().toLowerCase()===email));
 if(!['ADMIN','CS'].includes(actor.role)&&!workspace&&!manager&&!operator)throw Error('Communication permission no longer available / 当前无沟通工作台操作权限');
 return actor;
}
