import type {Prisma} from '@prisma/client';
import {managerEmailsFromEnv, operationsAdminEmailsFromEnv} from './auth';

/** Existing Care access rules, evaluated from current rows rather than a captured page actor. */
export function careReportCapabilities(input: {role:string;isObserver:boolean;manager:boolean;operationsAdmin:boolean;careWorkspace:boolean;memberRoles:string[]}) {
  const manager = input.role === 'ADMIN' || input.role === 'TEACHER' && input.manager;
  const operations = !['FINANCE','STUDENT'].includes(input.role) && input.operationsAdmin;
  const member = input.role === 'CS' && input.careWorkspace && input.memberRoles.length > 0;
  const canWrite = !input.isObserver && (manager || operations || member);
  return {canWrite, canReview:canWrite && (manager || operations || input.memberRoles.some(role=>['REVIEWER','EXECUTIVE_OWNER'].includes(role)))};
}

export async function requireCareReportWriteAccess(tx:Prisma.TransactionClient, userId:string, engagementId:string) {
  await tx.$queryRaw`SELECT id FROM "CareEngagement" WHERE id=${engagementId} FOR UPDATE`;
  await tx.$queryRaw`SELECT id FROM "User" WHERE id=${userId} FOR SHARE`;
  const actor = await tx.user.findUnique({where:{id:userId},select:{id:true,email:true,name:true,role:true,isObserver:true}});
  if(!actor || actor.isObserver) throw new Error('Read-only or unavailable account / 此账号仅可查看或已失效');
  const email=actor.email.trim().toLowerCase();
  await tx.$queryRaw`SELECT id FROM "ManagerAcl" WHERE LOWER(TRIM(email))=${email} AND "isActive"=true FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "OperationsAdminAcl" WHERE LOWER(TRIM(email))=${email} AND "isActive"=true FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "UserWorkspaceAccess" WHERE "userId"=${userId} AND "isActive"=true FOR SHARE`;
  await tx.$queryRaw`SELECT id FROM "CareEngagementMember" WHERE "engagementId"=${engagementId} AND "userId"=${userId} AND "isActive"=true FOR SHARE`;
  const [managers,operations,workspace,members]=await Promise.all([
    tx.managerAcl.findMany({where:{isActive:true},select:{email:true}}),tx.operationsAdminAcl.findMany({where:{isActive:true},select:{email:true}}),
    tx.userWorkspaceAccess.findFirst({where:{userId,workspace:'CARE',isActive:true},select:{id:true}}),
    tx.careEngagementMember.findMany({where:{engagementId,userId,isActive:true},select:{role:true}}),
  ]);
  const access=careReportCapabilities({role:actor.role,isObserver:actor.isObserver,
    manager:managerEmailsFromEnv().includes(email)||managers.some(row=>row.email.trim().toLowerCase()===email),
    operationsAdmin:operationsAdminEmailsFromEnv().includes(email)||operations.some(row=>row.email.trim().toLowerCase()===email),
    careWorkspace:Boolean(workspace),memberRoles:members.map(row=>row.role)});
  if(!access.canWrite)throw new Error('You no longer have permission to change this care record / 你已无权限修改此托管记录');
  return {...access,actor};
}
