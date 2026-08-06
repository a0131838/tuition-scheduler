# TASK-20260806：国际学校成绩与私立教育档案补全

## Context

现有目录已覆盖34个国际学校品牌和完整教育类型，但许多学校的成绩区为空；私立教育也缺少“重点详细、普通简洁”的消费决策层级。家长无法判断是学校没有毕业班、学校没有公开数据，还是系统尚未收录。

## Change

- 通过学校公告、监管资料、年度成绩页面及可追溯的可靠公开资料，扩充国际学校历年成绩。
- 按真实课程体系记录IB、AP、French Baccalauréat、HSC、IGCSE、CBSE等，不强行换算或混用口径。
- 所有国际学校都提供成绩数据状态；没有高中毕业考试的学前记录明确标注“不适用”。
- 详情页根据实际字段展示平均分、通过率或已公布亮点，并显示来源名称与核对日期。
- 增加热门私立大学/PEI和私立高中详细档案，涵盖课程、适合人群、申请与付款前核对。
- 普通PEI仅保留名称，未完成课程级核验前不输出排名、就业保证或模糊推荐。
- 将目录入口明确为“高中、大学与PEI”，重点档案优先显示。

## Data rules

- 成绩必须能够核对学校、年份、考试体系和统计口径。
- 不用集团其他国家或校区成绩替代新加坡本校。
- 不以单个学生高分、单个大学offer或媒体排名替代整届数据。
- 第三方资料必须明确标记，下一轮优先回查学校年度报告。
- PEI必须区分海外大学直属校区与和海外大学合作的私立教育机构。
- 课程注册、EduTrust、Student's Pass和颁证主体按具体课程核查，不能用机构名气替代。

## Non-goals

- 不修改登录、账号、权限或数据库。
- 不修改排课、课包、余额、出勤、工资、续费、财务、工单或通知。
- 不发布主观“最好学校”排名，不承诺录取或就业。

## Verification

- `node --import tsx --test tests/school-guide-complete-profiles.test.ts tests/school-guide-directory-ia.test.ts tests/school-guide-complete-content.test.ts tests/school-guide-sectors.test.ts`
- `npx tsc --noEmit`
- `npm run miniapp:audit-release`
- `npm run test:backend`
- `npm run build`

## Release

- Release ID：`2026-08-06-r336`。
- 计划微信开发版：`1.0.33`。
- 回滚点：`5d96ac0709d8375195742f1a77d0c8ff95ea7eaa`（`2026-08-06-r335`）。

## Risk

中低。改动集中在公开指南的资料、排序和展示，无数据库迁移。主要残余风险是学校后续修订成绩或课程，因此页面保留来源名称、核对日期、更新频率和下次复核时间。
