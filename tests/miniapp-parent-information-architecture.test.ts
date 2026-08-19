import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const miniappRoot = path.join(root, "miniapp", "boss-academic-parent");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const readMiniapp = (file: string) => fs.readFileSync(path.join(miniappRoot, file), "utf8");

test("parent tab bar has four task-oriented destinations", () => {
  const app = JSON.parse(readMiniapp("app.json"));
  assert.deepEqual(app.tabBar.list.map((item: any) => item.text), ["首页", "进展", "课表", "我的"]);
  assert.equal(app.tabBar.list.length, 4);
});

test("parent home uses one stable dashboard request and answers the four parent questions", () => {
  const page = readMiniapp("pages/home/home.wxml");
  const script = readMiniapp("pages/home/home.js");
  assert.match(page, /孩子现在怎么样/);
  assert.match(page, /需要您处理/);
  assert.match(page, /接下来/);
  assert.match(page, /最新进展/);
  assert.match(page, /常用服务/);
  assert.match(page, /本周数据/);
  assert.match(page, /wx:if="\{\{latestUpdate\}\}"/);
  assert.match(script, /goLatestUpdate/);
  assert.match(script, /\/dashboard/);
  assert.doesNotMatch(script, /\/service-progress/);
  assert.doesNotMatch(script, /\/subscriptions\/intent/);
  assert.doesNotMatch(script, /api\.request\(`\/api\/miniapp\/students\/\$\{studentId\}\/monthly-scheduling/);
});

test("progress separates updates, reports and entitlements without leaking Full Care into ordinary plans", () => {
  const page = readMiniapp("pages/progress/progress.wxml");
  const script = readMiniapp("pages/progress/progress.js");
  assert.match(page, /最新动态/);
  assert.match(page, /正式报告/);
  assert.match(page, /服务权益/);
  assert.match(page, /wx:if="\{\{hasFormalReports\}\}"/);
  assert.match(script, /servicePlanType === "ACADEMIC_MANAGEMENT"/);
});

test("parent progress and requests prioritize one next action and hide detail on demand", () => {
  const progress = readMiniapp("pages/progress/progress.wxml");
  const progressScript = readMiniapp("pages/progress/progress.js");
  const requests = readMiniapp("pages/requests/requests.wxml");
  const requestDetail = readMiniapp("pages/request-detail/request-detail.wxml");
  assert.match(progress, /现在需要您做/);
  assert.match(progress, /更多服务记录/);
  assert.match(progressScript, /toggleDetails/);
  assert.match(requests, /request-arrow/);
  assert.match(requestDetail, /现在要做什么/);
  assert.match(requestDetail, /展开完整内容/);
  assert.match(requestDetail, /最终处理结果/);
});

test("account centre contains low-frequency parent services and reminder settings", () => {
  const page = readMiniapp("pages/students/students.wxml");
  const route = read("app/api/miniapp/students/route.ts");
  assert.match(page, /课包、财务与合同/);
  assert.match(page, /服务请求/);
  assert.match(page, /微信提醒设置/);
  assert.match(page, /切换孩子/);
  assert.match(page, /currentStudent\.fullCareActive/);
  assert.match(route, /careEngagements/);
  assert.match(route, /FULL_CARE_PROGRAMS/);
});

test("dashboard aggregates parent data, records freshness and keeps loading stable", () => {
  const route = read("app/api/miniapp/students/[studentId]/dashboard/route.ts");
  assert.match(route, /getHome/);
  assert.match(route, /getProgress/);
  assert.match(route, /getSubscriptionIntent/);
  assert.match(route, /getMonthlyScheduling/);
  assert.match(route, /PARENT_DASHBOARD_VIEWED/);
  assert.match(route, /unreadTimelineCount/);
  assert.match(route, /pendingActionCount/);
});

test("parent finance shows translated package state and authenticated signed contracts", () => {
  const finance = read("app/api/miniapp/students/[studentId]/finance/route.ts");
  const pdf = read("app/api/exports/student-contract/[id]/route.ts");
  const page = readMiniapp("pages/finance/finance.wxml");
  assert.match(finance, /contracts: contracts\.map/);
  assert.match(finance, /contractGroup: contract\.contractMode === "FULL_CARE_AGREEMENT"/);
  assert.match(pdf, /getParentPortalSession/);
  assert.match(pdf, /canViewFinance: true/);
  assert.match(page, /全程托管服务合同/);
  assert.match(page, /课程合同/);
  assert.match(page, /fullCareContracts/);
  assert.match(page, /tuitionContracts/);
  assert.doesNotMatch(page, /item\.package\.status\}\}/);
});

test("parent request form asks for one explanation and an urgency choice", () => {
  const page = readMiniapp("pages/request-new/request-new.wxml");
  const script = readMiniapp("pages/request-new/request-new.js");
  const route = read("app/api/miniapp/students/[studentId]/requests/route.ts");
  assert.match(page, /一般事项/);
  assert.match(page, /紧急事项/);
  assert.equal((page.match(/<textarea/g) || []).length, 1);
  assert.doesNotMatch(script, /requiredAction/);
  assert.match(route, /urgency === "URGENT"/);
});

test("monthly scheduling uses the same restrained orange and green parent visual language", () => {
  const css = readMiniapp("pages/monthly-scheduling/monthly-scheduling.wxss");
  assert.match(css, /#ec5e0a/i);
  assert.match(css, /border-radius:12rpx/);
  assert.doesNotMatch(css, /#174ea6/i);
});
