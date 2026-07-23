# TASK-20260723-renewal-xdf-separation

## Context

续费预警首次扫描后，博思自营/其他来源学生与新东方学生显示在同一列表。新东方学生通常需要先对接新东方项目负责人，不能让教务误按普通家长续费文案处理。

## Change

- 使用现有学生来源 `新东方学生` 作为唯一分类依据，不按姓名、学校或备注猜测。
- 网页和员工小程序默认打开“博思及其他”，并提供独立“新东方学生”队列和数量。
- 新东方队列使用“待联系新东方、已通知新东方、新东方确认中”等展示文案。
- 新东方微信模板改为发给项目负责人，并把群名、回复和截图提示改为项目对接语义。
- 统一待办、员工首页和管理健康看板同时显示博思/其他与新东方数量。
- 老师端继续没有续费入口，也看不到学生余额或来源队列。

## Non-goals

- 不修改任何学生来源归属。
- 不改变续费任务状态机和历史记录。
- 不修改课包余额、扣课、排课、合同、发票、收款、工资或合作方结算。

## Verification

- 生产只读数据：20 条开放任务中，新东方 9 条，博思及其他 11 条。
- `npx prisma generate`
- `npx tsc --noEmit`
- 15/15 focused renewal/action-center tests
- 103/103 backend regression tests
- Native miniapp JavaScript syntax checks
- 44-page miniapp release audit
- 213-route production build
- `git diff --check`

## Risk

Low. Classification reads the canonical source-channel relation. A student whose source is missing or not exactly `新东方学生` remains in “博思及其他” until management corrects that student's source through the existing student-source workflow.
