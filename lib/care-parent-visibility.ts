import { Prisma } from '@prisma/client';
import { prisma } from './prisma';
import { requireCareReportWriteAccess } from './care-report-access';
import { CARE_PARENT_VISIBILITY_OPTIONS, isUniversityCareProgram, parentVisibilityIdsFromJson } from './care-validation';

export const CARE_SUMMARY_SECTIONS = CARE_PARENT_VISIBILITY_OPTIONS.filter(option => option.id !== 'formal_reports');
export function careParentVisibility(programType: string, profile: { studentConsentStatus: string; parentVisibilityJson: Prisma.JsonValue | null } | null) {
  const university = isUniversityCareProgram(programType as Parameters<typeof isUniversityCareProgram>[0]);
  const sections = university && profile && ['GRANTED', 'LIMITED'].includes(profile.studentConsentStatus)
    ? parentVisibilityIdsFromJson(profile.parentVisibilityJson) : [];
  return { university, sections, reports: !university || sections.includes('formal_reports') };
}

export async function setCareParentVisibilitySection(input: { actorId: string; engagementId: string; recordType: string; recordId: string; version: number; section: string }) {
  const section = input.section.trim() || null;
  if (section && !CARE_SUMMARY_SECTIONS.some(option => option.id === section)) throw new Error('Choose a valid summary section / 请选择有效的摘要栏目');
  return prisma.$transaction(async tx => {
    const { actor, canManage } = await requireCareReportWriteAccess(tx, input.actorId, input.engagementId);
    if (!canManage) throw new Error('Only managers can review parent visibility / 仅管理人员可核对家长可见栏目');
    const engagement = await tx.careEngagement.findUniqueOrThrow({ where: { id: input.engagementId } });
    if (!isUniversityCareProgram(engagement.programType)) throw new Error('Section review applies to university-stage care / 此栏目核对适用于大学阶段托管');
    const where = { id: input.recordId, engagementId: input.engagementId, studentId: engagement.studentId };
    const current = input.recordType === 'ACTIVITY' ? await tx.careActivity.findFirst({ where })
      : input.recordType === 'TASK' ? await tx.careTask.findFirst({ where })
      : input.recordType === 'RISK' ? await tx.careRiskCase.findFirst({ where }) : null;
    if (!current) throw new Error('Record not found in this project / 此项目中未找到该记录');
    if (current.version !== input.version) throw new Error('Record changed. Refresh and review again / 记录已更新，请刷新后重新核对');
    if (current.parentVisibilitySection === section) return;
    const change = { where: { ...where, version: input.version }, data: { parentVisibilitySection: section, version: { increment: 1 } } };
    const result = input.recordType === 'ACTIVITY' ? await tx.careActivity.updateMany(change)
      : input.recordType === 'TASK' ? await tx.careTask.updateMany(change) : await tx.careRiskCase.updateMany(change);
    if (result.count !== 1) throw new Error('Record changed. Refresh and review again / 记录已更新，请刷新后重新核对');
    await tx.auditLog.create({ data: { actorEmail: actor.email, actorName: actor.name, actorRole: actor.role, module: 'CARE_MANAGEMENT', action: 'REVIEW_PARENT_VISIBILITY', entityType: input.recordType, entityId: current.id,
      meta: { engagementId: engagement.id, before: current.parentVisibilitySection, after: section, version: input.version, consentUnchanged: true } } });
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable, timeout: 15000 });
}

/** Read consent, permission and visible records in one consistent snapshot; unknown historical sections stay internal. */
export async function getParentCareProgress(studentId: string, parentId: string, fullCare: boolean) {
  return prisma.$transaction(async tx => {
    const link = await tx.parentStudentLink.findUnique({ where: { parentId_studentId: { parentId, studentId } }, include: { parent: { select: { status: true } } } });
    if (!link?.canViewReports || link.parent.status !== 'ACTIVE') return null;
    const current = await tx.careEngagement.findFirst({ where: { studentId, status: 'ACTIVE', ...(fullCare ? { programType: { in: ['PRE_U_ACADEMIC_CARE', 'PRE_U_FULL_COORDINATION'] as const } } : {}) }, include: { universityProfile: true }, orderBy: { createdAt: 'desc' } });
    if (!current) return null;
    const visibility = careParentVisibility(current.programType, current.universityProfile);
    const section = visibility.university ? { parentVisibilitySection: { in: visibility.sections.filter(value => value !== 'formal_reports') } } : {};
    const activities: Prisma.CareActivityWhereInput = { ...section, publicationStatus: 'PUBLISHED', audience: { in: ['PARENT', 'PARENT_AND_STUDENT'] }, publicSummary: { not: null } };
    const tasks: Prisma.CareTaskWhereInput = { ...section, parentActionRequired: true, parentVisibleSummary: { not: null }, status: { in: ['OPEN', 'IN_PROGRESS', 'WAITING_EXTERNAL', 'BLOCKED'] } };
    const risks: Prisma.CareRiskCaseWhereInput = { ...section, parentVisible: true, publicSummary: { not: null }, status: { in: ['OPEN', 'ACKNOWLEDGED'] } };
    const reports: Prisma.CareReportWhereInput = { status: 'PUBLISHED', ...(visibility.reports ? {} : { id: { in: [] } }) };
    const engagement = await tx.careEngagement.findUniqueOrThrow({ where: { id: current.id }, select: {
      id: true, programType: true, startDate: true, endDate: true, nextReportDueAt: true, scopeJson: true, caseOwner: { select: { name: true } }, universityProfile: true,
      activities: { where: activities, select: { id: true, title: true, publicSummary: true, occurredAt: true }, orderBy: { occurredAt: 'desc' }, take: 12 },
      tasks: { where: tasks, select: { id: true, parentVisibleSummary: true, dueAt: true, status: true }, orderBy: { dueAt: 'asc' }, take: 5 },
      riskCases: { where: risks, select: { id: true, publicSummary: true, status: true, updatedAt: true }, orderBy: { updatedAt: 'desc' }, take: 5 },
      reports: { where: reports, select: { id: true, status: true, reportType: true, periodLabel: true, title: true, publishedAt: true, views: { where: { parentId }, select: { acknowledgedAt: true }, take: 1 } }, orderBy: { publishedAt: 'desc' }, take: 12 },
      _count: { select: { activities: { where: activities }, reports: { where: reports } } },
    } });
    return { ...engagement, visibility };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead });
}
