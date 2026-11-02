import {SOP_CURRENT_GUIDES} from './sop-current-guides';
import {createHash} from 'node:crypto';
import {readFile,readdir} from 'node:fs/promises';
import path from 'node:path';
// Deterministic dependency map: a changed live workflow returns its guide to review.
export const SOP_DEPENDENCIES:Record<string,string[]>={
 SYSTEM_OPERATION_MAP:['app/admin/layout.tsx','app/teacher/layout.tsx'],
 ACADEMIC_SCHEDULING_MASTER:['app/admin/schedule','app/admin/students','lib/teacher-teaching-rule.ts','lib/room-reservations.ts'],
 ACADEMIC_DAILY_STUDENT_RECORDS:['app/admin/students'],
 ACADEMIC_TEACHER_COORDINATION:['app/admin/teachers','app/teacher/availability'],
 CONTRACT_PACKAGE_GATE_MASTER:['app/admin/students','lib/student-contract.ts'],
 FINANCE_MASTER:['app/admin/finance','app/admin/receipts-approvals','app/admin/reports/partner-settlement'],
 RESOURCE_HANDOFF_MASTER:['app/admin/leads','app/teacher/lead'],
 MANAGEMENT_CONTROL_MASTER:['app/admin/manager','app/training'],
 ATTENDANCE_EXCEPTION_MASTER:['app/teacher/sessions'],
 ACADEMIC_MINIAPP:['app/api/miniapp'], PARENT_COMMUNICATION:['app/admin/communications'],
 FULL_CARE:['app/admin/care'], SHARED_PACKAGE_COURSE:['app/admin/packages'],
 XZS_PACKAGE:['app/admin/packages','app/admin/students'], XZS_SETTLEMENT:['app/admin/reports/partner-settlement'],
 SCHOOL_APPLICATION:['app/admin/school-applications'], EDUTRUST_SSG:['app/admin/edutrust','lib/student-contract.ts'],
 TEACHER_MINIAPP:['app/api/miniapp'], TEACHER_DAILY:['app/teacher'],
 TEACHER_PAYMENT:['app/teacher/payment-details'], TEACHER_ONBOARDING_PROFILE:['app/teacher/page.tsx','app/teacher/page.tsx'],
 TEACHER_AVAILABILITY_SCHEDULING:['app/teacher/availability','app/admin/teachers','lib/teacher-teaching-rule.ts'],
 TEACHER_REPORTS_ASSESSMENTS:['app/teacher/midterm-reports','app/teacher/final-reports','app/_components/ParentReportEditionPanel.tsx','lib/learning-report-parent-pdf.ts'],
 TEACHER_EXPENSES_PAYROLL:['app/teacher/expense-claims','app/teacher/payroll','app/api/hr/payslips'],
 FINANCE_PAYMENT_PROFILE:['lib/teacher-payment-profile.ts'],PARTNER_CREDIT_NOTE:['app/admin/reports/partner-settlement'],
 MANAGEMENT_MINIAPP:['app/api/miniapp'],MANAGEMENT_COMMUNICATION:['app/admin/communications'],MANAGER_FEEDBACK:['app/teacher/manager-feedback'],
 MINIAPP_STARTER:['app/api/miniapp'],PARENT_MINIAPP_BINDING:['app/api/miniapp'],SALES_MINIAPP:['app/api/miniapp'],FINANCE_MINIAPP:['app/api/miniapp'],FULL_CARE_MINIAPP:['app/api/miniapp'],PARENT_STUDENT_SUPPORT_MINIAPP:['app/api/miniapp'],
};
const cache=new Map<string,Promise<string>>();
async function files(relative:string):Promise<string[]>{try{const entries=await readdir(path.join(process.cwd(),relative),{withFileTypes:true});const result=await Promise.all(entries.sort((a,b)=>a.name.localeCompare(b.name)).map(e=>files(path.posix.join(relative,e.name))));return result.flat();}catch{return [relative];}}
export function sopSourceFingerprint(code:string,pdfFile:string){const key=code+':'+pdfFile;if(!cache.has(key))cache.set(key,(async()=>{const hash=createHash('sha256');const sources=[...(SOP_CURRENT_GUIDES.find(g=>g.code===code)?.dependencies||SOP_DEPENDENCIES[code]||['app/training']),path.posix.join('output/pdf',pdfFile)];for(const source of sources)for(const file of await files(source)){hash.update(file);try{hash.update(await readFile(path.join(process.cwd(),file)));}catch{hash.update('MISSING');}}return hash.digest('hex');})());return cache.get(key)!;}
