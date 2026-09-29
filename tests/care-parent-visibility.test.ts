import test from 'node:test';
import assert from 'node:assert/strict';
import {careParentVisibility,CARE_SUMMARY_SECTIONS} from '../lib/care-parent-visibility';
test('university visibility requires current granted or limited consent and explicit sections',()=>{
 for(const status of ['NOT_RECORDED','WITHDRAWN'])assert.deepEqual(careParentVisibility('UNIVERSITY_GROWTH',{studentConsentStatus:status,parentVisibilityJson:{sectionIds:['academic_progress','formal_reports']}}),{university:true,sections:[],reports:false});
 const onlyReports=careParentVisibility('CAREER_LAUNCH',{studentConsentStatus:'LIMITED',parentVisibilityJson:{sectionIds:['formal_reports']}});assert.equal(onlyReports.reports,true);assert.deepEqual(onlyReports.sections,['formal_reports']);assert(!CARE_SUMMARY_SECTIONS.some(x=>String(x.id)==='formal_reports'));
 assert.equal(careParentVisibility('POSTGRAD_PREPARATION',null).reports,false);
});
test('pre-university Care keeps existing parent visibility without university section classification',()=>{
 assert.deepEqual(careParentVisibility('PRE_U_FULL_COORDINATION',null),{university:false,sections:[],reports:true});
});
