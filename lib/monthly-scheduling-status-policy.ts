/** Parent observations are recorded by their own workflows, never by a staff status dropdown. */
export const MONTHLY_STAFF_STATUS_CHOICES = ['SENT','NEEDS_CLARIFICATION','MATCHED','TEACHER_EXCEPTION','PAUSED','NO_RESPONSE','EXCLUDED'] as const;
export function assertMonthlyStaffStatusChange(item:{status:string;intent:string|null;submittedAt:Date|null;parentConfirmedAt:Date|null;teacherPreferenceType:string|null;currentScheduleJson:unknown;carryForwardScheduleJson:unknown}, next:string, note:string|null|undefined) {
 if(item.status===next)return; // Notes do not create a new observed fact.
 const fail=(en:string,zh:string):never=>{throw Error(`${en} / ${zh}`);};
 const reason=note?.trim()??'';
 if(next==='SCHEDULED')return; // The exact timetable verification service owns this transition.
 if(!(MONTHLY_STAFF_STATUS_CHOICES as readonly string[]).includes(next))
  fail('Use the parent response or time-selection workflow for this status','此状态须通过家长回复或时间选择流程产生，不能手动指定');
 if(next==='SENT') {
  if(item.status!=='NOT_SENT')fail('An existing response cannot be reset to sent','已有回复或处理结果不能改回已发送');
  if(reason.length<5)fail('Record when and how you manually sent the message','请在备注记录人工发送的时间和渠道（至少5字）');
 }
 if(next==='NO_RESPONSE' && (item.submittedAt || item.parentConfirmedAt))
  fail('A recorded parent response cannot be marked as no response','已有家长回复证据，不能标记为未回复');
 if(next==='MATCHED') {
  if(item.status==='PARENT_SELECTED')return; // The service verifies and accepts the live hold.
  if(item.status==='SCHEDULED') {
   if(reason.length<10)fail('Record why timetable verification is being reopened','请说明重新核验课表的原因（至少10字）');
   return;
  }
  if(!['SUBMITTED','NEEDS_CLARIFICATION','TEACHER_EXCEPTION','CHANGE_REQUESTED'].includes(item.status)
    || !item.submittedAt || !item.parentConfirmedAt || !['KEEP','CHANGE'].includes(item.intent??''))
   fail('Record the parent arrangement before confirming it','请先通过家长端或代录入口记录家长安排，再确认匹配');
  if(item.teacherPreferenceType==='VERIFY')fail('Resolve the teacher identity before confirming','老师身份尚待核对，请先完成需求澄清');
  const hasBaseline=[item.currentScheduleJson,item.carryForwardScheduleJson].some(v=>Array.isArray(v)&&v.length>0);
  if((item.intent!=='KEEP'||!hasBaseline)&&reason.length<10)
   fail('Record the manually agreed dates, time and teacher','请记录人工确认的日期、时间及老师（至少10字）');
 }
}
