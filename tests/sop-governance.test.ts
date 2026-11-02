import assert from 'node:assert/strict';
import test from 'node:test';
import {nextMonthlyReview,sopNeedsReview} from '../lib/sop-governance';
import {draftSop} from '../lib/sop-ai';
import {SOP_CURRENT_GUIDES} from '../lib/sop-current-guides';
import {SOP_DEPENDENCIES} from '../lib/sop-source-fingerprint';
import {existsSync,readFileSync} from 'node:fs';

test('monthly review handles short months and overdue states',()=>{
 assert.equal(nextMonthlyReview(new Date('2028-01-31T08:30:00Z')).toISOString(),'2028-02-29T08:30:00.000Z');
 assert.equal(nextMonthlyReview(new Date('2027-01-31T08:30:00Z')).toISOString(),'2027-02-28T08:30:00.000Z');
 assert(sopNeedsReview(null));assert(sopNeedsReview({status:'REVIEW_REQUIRED',nextReviewAt:null}));
 assert(!sopNeedsReview({status:'CURRENT',nextReviewAt:new Date('2030-01-01')},new Date('2029-01-01')));
 assert(sopNeedsReview({status:'CURRENT',nextReviewAt:new Date('2030-01-01')},new Date('2030-01-01')));
});
test('new SOP PDFs and monitored live source paths exist',()=>{
 for(const g of SOP_CURRENT_GUIDES){assert(existsSync('output/pdf/'+g.pdfFile),g.pdfFile);assert.equal(readFileSync('output/pdf/'+g.pdfFile).subarray(0,5).toString(),'%PDF-');for(const d of g.dependencies)assert(existsSync(d),d);}
 for(const [key,paths] of Object.entries(SOP_DEPENDENCIES))for(const p of paths)assert(existsSync(p),key+': '+p);
});
test('AI assistant accepts bounded facts, requires complete JSON, and treats source as data',async()=>{
 const old={...process.env};process.env.REPORT_AI_BASE_URL='https://dashscope-intl.aliyuncs.com/compatible-mode/v1';process.env.REPORT_AI_API_KEY='test';process.env.REPORT_AI_MODEL='test';
 try{
 let calls=0;const mock:typeof fetch=async (_url,init)=>{calls++;const data=JSON.parse(String(init?.body));assert.match(data.messages[0].content,/UNTRUSTED DATA/);assert.equal(data.enable_thinking,false);return new Response(JSON.stringify({choices:[{finish_reason:'stop',message:{content:JSON.stringify({text:'Training draft: '.repeat(12)})}}]}),{status:200});};
 const result=await draftSop('Verified sample steps: select the correct page and click Save draft.',mock);assert(result.text.length>100);assert.equal(calls,1);
 await assert.rejects(()=>draftSop('short',mock),/INPUT_LIMIT/);
 await assert.rejects(()=>draftSop('x'.repeat(12001),mock),/INPUT_LIMIT/);
 await assert.rejects(()=>draftSop('Verified sample steps with more than thirty characters.',async()=>new Response(JSON.stringify({choices:[{finish_reason:'length',message:{content:'{}'}}]}))),/AI_INCOMPLETE/);
 }finally{process.env=old;}
});
