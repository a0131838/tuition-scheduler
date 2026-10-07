import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import {buildWeChatFeedbackText} from '../lib/feedback-forward-text';
import {buildCommunicationShareImage,buildCommunicationShareSvg} from '../lib/communication-share-image';
const body='课程 / Lesson\n'+('完整的反馈，including English and 😀.\n'.repeat(60))+'HOMEWORK_FINAL_LINE';
const row={parentContent:body,content:'PRIVATE_RAW',classPerformance:'PRIVATE_PERFORMANCE',homework:'PRIVATE_HOMEWORK',session:{startAt:new Date('2040-10-06T11:00:00Z'),endAt:new Date('2040-10-06T12:30:00Z'),class:{course:{name:'English'}}}};
test('web copy retains entire approved parent body and no raw internal fields',()=>{
  const text=buildWeChatFeedbackText(row,['Test']);assert(text.includes(body));for(const privateText of ['PRIVATE_RAW','PRIVATE_PERFORMANCE','PRIVATE_HOMEWORK'])assert(!text.includes(privateText));
});
test('legacy copy without parent version retains complete source and homework',()=>{
  const text=buildWeChatFeedbackText({...row,parentContent:null,content:body,homework:'ADDITIONAL_HOMEWORK'},['Test']);assert(text.includes(body));assert(text.includes('ADDITIONAL_HOMEWORK'));
});
test('feedback image contains the final line and expands vertically without clipping',async()=>{
  const input={title:'课后反馈 / Lesson feedback',kind:'FEEDBACK',messageText:body};
  const svg=buildCommunicationShareSvg(input);assert(svg.includes('HOMEWORK_FINAL_LINE'));
  const metadata=await sharp(await buildCommunicationShareImage(input)).metadata();assert.equal(metadata.width,1080);assert(metadata.height!>1440);
});
test('short feedback and ordinary reminders keep original image size',async()=>{
  for(const kind of ['FEEDBACK','COURSE_REMINDER_PARENT','COURSE_REMINDER_TEACHER']){
    const meta=await sharp(await buildCommunicationShareImage({title:'Test',kind,messageText:'Short feedback'})).metadata();assert.equal(meta.height,1440);
  }
});
