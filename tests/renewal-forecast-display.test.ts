import assert from "node:assert/strict";
import test from "node:test";
import { formatRenewalUnits, readRenewalForecastSnapshot } from "../lib/renewal-forecast-display";
import { renewalForLegacyMiniapp } from "../lib/renewal-auto-resolution";
test("counts and fractional usage are never formatted as minutes",()=>{
 assert.equal(formatRenewalUnits(10,"COUNT","ZH"),"10 次");
 assert.equal(formatRenewalUnits(.25,"COUNT","EN"),"0.25 sessions");
 assert.equal(formatRenewalUnits(90,"MINUTES","BILINGUAL"),"1.5 hours / 小时");
 assert.equal(formatRenewalUnits(0,"PERIOD","ZH"),"有效期");
 assert.equal(readRenewalForecastSnapshot(null),null);
 assert.equal(readRenewalForecastSnapshot({version:0}),null);
});
test("published client keeps statuses and canonical units with an explicit hour-field warning",()=>{
 const snapshot={version:1,unit:"COUNT",remainingUnits:10,scheduledUnits:2,weeklyUnits:.25,needsReview:false,checkedAt:new Date().toISOString()};
 assert.ok(readRenewalForecastSnapshot(snapshot));
 const row=renewalForLegacyMiniapp({status:"PENDING_CONTACT",riskLevel:"YELLOW",forecastSnapshot:snapshot});
 assert.equal(row.status,"PENDING_CONTACT");assert.match(row.riskLevel!,/小时栏不适用/);assert.match(row.riskLevel!,/10 sessions/);
});
