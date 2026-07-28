# TASK-20260728-staff-training-center

## Context

SGT 已有大量岗位 SOP，但新旧版本、合同样板和临时资料混在一起；最新小程序资料散落，员工没有统一版本入口、完成记录、测验或主管实操验收。

## Change

- 建立受控培训目录、版本总表、岗位学习路径和发布规则。
- 制作六套 2026-07-28 岗位主 SOP，并归集七份 2026-07-18/23 现行资料。
- 新增 `/training`，按角色显示必修 SOP。
- 新增受登录和岗位权限保护的 PDF 下载接口。
- 新增阅读确认、五题测验、80 分门槛、实操证据和主管通过/退回。
- 新增版本级培训进度表、验收人和审核记录。
- 在 Admin 和 Teacher 导航加入员工培训中心。

## Non-goals

- 不修改排课、考勤、扣课、课包余额、合同、发票、收据、工资、报销或合作方结算业务逻辑。
- 不自动把任何员工标记为已培训。
- 不把内部 SOP 公开到未登录页面。

## Verification

- Prisma format/generate。
- 培训中心和迁移安全专项测试。
- TypeScript。
- 后端完整测试。
- Next.js 生产构建。
- 51 页现行培训 PDF 页数、文字、图片依赖和 contact sheet 视觉检查。

## Risk

中等。新增一张独立培训进度表和新的内部页面；业务核心表和现有业务状态机不变。主要风险是员工首次使用时对实操证据写法不熟悉，由主管验收台和 SOP 引导控制。

## Production verification

- 运行提交：`49f9ff847aa1c7180f3f85818ae7d389a39d722a`。
- PM2 PID：`1863191`；`/admin/login` 返回 HTTP 200。
- Admin 与 Teacher 的 `/training` 均返回 200，Admin 的 `/training/manage` 返回 200。
- 两类账号均能打开岗位允许的受保护 PDF；Teacher 访问 Finance-only PDF 返回 403，未登录访问返回 401。
- 验收前后培训进度均为 0 行，没有自动把任何员工标记为完成。
