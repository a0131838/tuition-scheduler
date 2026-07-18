import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path: string) => readFileSync(path, "utf8");

test("Emily sees a dominant request-intake entry and a three-step form", () => {
  const home = read("miniapp/boss-academic-parent/pages/staff-home/staff-home.wxml");
  const form = read("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.wxml");
  assert.match(home, /微信群有新的家长消息/);
  assert.match(home, /立即录入工单/);
  assert.match(home, /wx:if="\{\{isAcademic\}\}"/);
  assert.match(form, /这是哪位学生的事/);
  assert.match(form, /家长说了什么/);
  assert.match(form, /有截图或文件吗/);
  assert.match(form, /更多设置（通常不用改）/);
  assert.match(form, /确认创建工单/);
});

test("request intake keeps internal and parent-visible content visibly separate", () => {
  const form = read("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.wxml");
  const script = read("miniapp/boss-academic-parent/pages/staff-request-new/staff-request-new.js");
  assert.match(form, /仅员工可见/);
  assert.match(form, /家长不会看到上面的聊天原话/);
  assert.match(form, /请只写家长可以直接看到的内容/);
  assert.match(script, /originalContent: this\.data\.originalContent\.trim\(\)/);
  assert.match(script, /publicSummary: this\.data\.publicSummary\.trim\(\)/);
});

test("CS can complete only own low-risk requests while managers retain final authority", () => {
  const route = read("app/api/miniapp/staff/parent-requests/[id]/route.ts");
  const detail = read("miniapp/boss-academic-parent/pages/staff-request-detail/staff-request-detail.wxml");
  assert.match(route, /MANAGER_CLOSE_TYPES = new Set\(\["投诉", "财务问题", "学校事务"\]\)/);
  assert.match(route, /if \(user\.role === "ADMIN"\)/);
  assert.match(route, /staffName !== ownerName/);
  assert.match(route, /nextOwner && auth\.user\.role !== "ADMIN"/);
  assert.match(route, /if \(!capability\.canComplete\) return bad\(capability\.completionBlockReason, 403\)/);
  assert.match(detail, /wx:if="\{\{canComplete\}\}"/);
  assert.match(detail, /等待负责人或管理确认完成/);
});
