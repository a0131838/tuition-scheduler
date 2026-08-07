# TASK-20260807-first-tier-private-results-home

## Context

家长需要继续看到市场上常用的“第一梯队”标注，但它不应替代课程体系筛选。国际学校目录同时混入博伟、英仕等PEI或考试预备路线，导致家长把不同办学路径放在同一列表比较。学校详情默认先展示概览，而家长更关注历年成绩与大学去向。

## Change

- 只对Singapore American School、Dulwich College (Singapore)、UWCSEA、Tanglin Trust School和NLCS Singapore五所学校显示“第一梯队”。
- “第一梯队”只作为家长可见标注，不参与智能推荐加分；国际学校主筛选继续按IB、英式/Cambridge、美式/AP和其他课程互斥归类。
- 将DIMENSIONS、Insworld、Stalford Academy、5 Steps Academy、SISH与The GUILD从国际学校列表迁入“私立与特色学校”。
- 保留HWA与Olympiad在国际学校：两校当前分别提供完整IB或Cambridge学段，不因新加坡监管登记形式本身被机械迁移。
- 为新迁移项目补齐私立/专项档案；SISH按当前官网定位为酒店、旅游与航空相关PEI，不再展示为普通国际高中。
- 网页和小程序学校详情将“成绩升学”放在第一个标签，并作为默认打开内容；概览与申请费用继续完整保留。
- 数据与小程序缓存版本更新为`2026-08-07-r350`。

## Source check

- DIMENSIONS官网明确称其为private education institute，并列出High School、考试预备和高等教育等不同教育分支：https://dimensions.edu.sg/our-commitment/
- Insworld公开使用标准PEI学生合同：https://insworld.edu.sg/wp-content/uploads/2024/11/Sample-of-Student-Contract-28-Nov-2024.pdf
- Stalford官网说明其为注册private education institution，同时提供完整Year 1–12与AEIS/O/A-Level预备：https://www.sa.edu.sg/admissions/faq/
- 5 Steps Academy公开PEI学生合同：https://5steps.academy/wp-content/uploads/2024/09/Student-Contract.pdf
- SISH官网说明其为SSG注册PEI，当前公开课程重点为酒店、旅游与航空：https://sish.edu.sg/about-us/sish-institute/overview/
- The GUILD公开说明其为面向学习差异学生的非考试路线，且不是EduTrust学校：https://www.theguild.edu.sg/pre-course-counselling/
- HWA官网当前列明完整IB PYP、MYP与DP，因此保留在国际学校：https://www.hwa.edu.sg/
- Olympiad官网当前列明Preschool至IGCSE及AS/A Level完整Cambridge路径，因此保留在国际学校：https://olympiad.edu.sg/

## Non-goals

- 不把“第一梯队”当作官方认证、录取保证或智能选校加分。
- 不删除任何学校原始资料；迁移项目仍能在私立与特色学校内搜索和查看。
- 不修改家长/员工登录、教学、排课、课包、财务、工资、工单、通知、权限或数据库。

## Verification

- 66项学校指南测试通过，其中自动锁定五所且仅五所第一梯队学校。
- 自动检查60所国际学校品牌不再包含六个PEI/私立/专项项目，并确认迁移后私立档案存在。
- 174项后端回归、TypeScript、小程序67页发布审计、小程序原生JavaScript语法及243页生产构建通过。
- 390×844浏览器检查通过：目录显示第一梯队标签；Tanglin详情默认打开成绩升学；私立分类可看到博伟、英仕、思德福、5 Steps、GUILD和SISH。

## Risk

低。变更只涉及公开指南分类、标签、默认展示顺序与公开档案内容，不触碰业务数据或登录后功能。

## Rollout

- 线上数据版本：`2026-08-07-r350`，60所国际学校，主课程分布23/17/5/15。
- 功能提交：`aff83c10a2e68390d4806138e55b618d6d6e5e7f`；PM2 PID `2165580`；健康检查HTTP 200。
- 线上确认仅五所第一梯队，六个迁移项目均未留在国际学校，六份私立/专项档案全部可查询。
- 微信开发版：`1.0.46`，724,146 bytes；仍需在微信公众平台设为体验版并完成真机验收。
