import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import ts from "typescript";
import { activeAdminNavHref, reorganizeAdminNavigation, type AdminNavGroup } from "../lib/admin-navigation";
import { isOperationsAdminPathAllowed } from "../lib/operations-admin-access";

// Evaluate the actual menu declarations without loading auth or a database.
const layout = fs.readFileSync("app/admin/layout.tsx", "utf8");
const declarations = layout.slice(layout.indexOf("  const adminNavGroups ="), layout.indexOf("  // Regroup only"));
const evaluate = new Function("t", "lang", "user", "employeeProfile", "showManagerConsole", "canSeeCare", "canSeeHr", "canSeeSharedDocs", "approvalInboxLabel", "isOperationsAdminPathAllowed",
  ts.transpileModule(declarations + "\nreturn { adminNavGroups, operationsAdminNavGroups, financeNavGroups, resourceNavGroups };", { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText);
const translate = (lang: string, en: string, zh: string) => lang === "ZH" ? zh : lang === "EN" ? en : `${en} / ${zh}`;
const links = (groups: AdminNavGroup[]) => groups.flatMap(g => g.items);

for (const lang of ["ZH", "EN", "BILINGUAL"] as const) {
  for (const role of ["ADMIN", "OPS", "FINANCE", "SALES", "CS"]) {
    for (const extended of [false, true]) {
      test(`${role}, ${lang}, extended=${extended}: regrouping preserves every permitted destination and translation`, () => {
        const user = { role, operationsAdmin: role === "OPS", workspaces: extended ? ["CARE", "CS", "SALES"] : [] };
        const menus = evaluate(translate, lang, user, extended, extended, extended, extended, extended, translate(lang, "Approvals", "审批"), isOperationsAdminPathAllowed);
        const before: AdminNavGroup[] = menus[role === "OPS" ? "operationsAdminNavGroups" : role === "FINANCE" ? "financeNavGroups" : role === "CS" || role === "SALES" ? "resourceNavGroups" : "adminNavGroups"];
        const after = reorganizeAdminNavigation(before, lang);
        assert.deepEqual(new Set(links(after).map(x => x.href)), new Set(links(before).map(x => x.href)));
        for (const item of links(after)) {
          const source = links(before).find(x => x.href === item.href)!;
          assert.equal(item.label, source.label);
          assert.equal(item.description, source.description);
        }
        if (lang === "EN") assert.ok(after.every(g => !/[\u4e00-\u9fff]/.test(g.title)));
        if (lang === "ZH") assert.ok(after.every(g => !/[a-z]/i.test(g.title)));
        if (role === "OPS") assert.ok(links(after).every(x => isOperationsAdminPathAllowed(x.href)));
        if (role === "ADMIN" && extended) {
          for (const href of ["/admin/care", "/admin/school-applications", "/admin/monthly-scheduling"]) {
            assert.equal(links(after).find(x => x.href === href)?.secondary, false, href);
          }
        }
      });
    }
  }
}

test("the most specific destination owns nested route highlighting", () => {
  const groups = [{ title: "Service", items: ["/admin", "/admin/tickets", "/admin/tickets/scheduling"].map(href => ({ href, label: href })) }];
  assert.equal(activeAdminNavHref(groups, "/admin/tickets/scheduling/123"), "/admin/tickets/scheduling");
  assert.equal(activeAdminNavHref(groups, "/admin/tickets/123"), "/admin/tickets");
  assert.equal(activeAdminNavHref(groups, "/admin/students"), undefined);
});

test("no available links means no groups; hidden roles gain no destinations", () => {
  assert.deepEqual(reorganizeAdminNavigation([], "EN"), []);
});
