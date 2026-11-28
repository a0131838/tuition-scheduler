import test from "node:test";
import assert from "node:assert/strict";
import { formatBusinessDateOnly } from "../lib/date-only";
import { checks, cycleDates, FIRST_DUE, openActions, periodLabel, readContent, shift, validDay, type Period } from "../lib/fortnightly-reflection";

function form() {
  const f = new FormData();
  for (const [key] of checks) f.set(key,"na");
  for (const [key,value] of Object.entries({actionCount:"1", action0:"Review handovers",deadline0:"2027-01-01",evidence0:"Two completed records",status0:"open"})) f.set(key,value);
  return f;
}

test("SGT midnight, leap day, year boundary and a late submission preserve fortnight anchors",()=>{
  assert.equal(formatBusinessDateOnly(new Date("2026-12-13T15:59:59Z")), "2026-12-13");
  assert.equal(formatBusinessDateOnly(new Date("2026-12-13T16:00:00Z")), "2026-12-14");
  assert.equal(shift("2028-03-01",-1),"2028-02-29");
  assert.equal(validDay("2026-02-29"),false);
  assert.deepEqual(cycleDates(FIRST_DUE,"2026-11-28"),[FIRST_DUE]);
  assert.deepEqual(cycleDates(FIRST_DUE,"2026-12-28"),[FIRST_DUE,"2026-12-27","2027-01-10"]);
  for (const [day,expect] of [["2026-12-10","Upcoming"],["2026-12-11","Due soon"],["2026-12-13","Due today"],["2026-12-14","Overdue"]]) assert.match(periodLabel(FIRST_DUE,day),new RegExp(expect));
  assert.match(periodLabel(FIRST_DUE,"2026-12-15",{submittedAt:new Date("2026-12-13T16:00:00Z")} as Period),/Submitted late/);
});

test("draft accepts incomplete input, submission requires four choices, follow-up details and one to three complete actions",()=>{
  const f=form(); f.delete(checks[0][0]); f.delete("evidence0");
  assert.doesNotThrow(()=>readContent(f,false,[]));
  assert.throws(()=>readContent(f,true,[]),/four checks/);
  f.set(checks[0][0],"follow");
  assert.throws(()=>readContent(f,true,[]),/follow-up needed/);
  f.set(checks[0][0]+"Note","Check missing receipt");
  assert.throws(()=>readContent(f,true,[]),/evidence/);
  f.set("evidence0","Paid receipt");assert.equal(readContent(f,true,[]).narrative.analysis,"");
  f.set("actionCount","4");assert.throws(()=>readContent(f,false,[]),/one to three/);
});

test("actions persist through skipped periods, reviews never mutate the original, drafts never close an action",()=>{
  const row:Period={dueDate:FIRST_DUE,submittedAt:new Date(),revision:1,content:readContent(form(),true,[])};
  const prior=openActions([row],"2027-01-10");assert.equal(prior.length,1);
  const f=form();assert.throws(()=>readContent(f,false,prior),/Reload/);
  f.set("reviewStatus"+prior[0].id,"completed");f.set("reviewNote"+prior[0].id,"Receipt checked");
  f.set("status0","completed");
  const next={...row,dueDate:"2027-01-10",content:readContent(f,true,prior)};
  assert.equal(openActions([row,next],"2027-01-24").length,0);
  assert.equal(openActions([row,{...next,submittedAt:null}],"2027-01-24").length,1);
  assert.equal(row.content.action_plan[0].status,"open");
});
