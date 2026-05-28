# TASK-20260528 Resource Follow-up CRM Plan

## 背景

当前系统已经有学生来源、工单中心、学生选课链接、老师端、教务排课、合同与课包等模块，但缺少“客户还没有正式成为学生之前”的资源跟进闭环。

本计划目标是新增一个轻量的 `Resource Follow-up / 资源跟进` 功能，把自媒体、老客户介绍、渠道介绍等咨询资源从录入、销售跟进、老师评估、教务承接、管理复盘串起来。等资源成交或需要排课时，再进入现有 Student、Ticket、Booking Link、Contract、Package 流程。

## 目标

1. 客户咨询后可以马上落到系统里，不再只停留在微信、表格或口头交接。
2. 每个资源都有来源、负责人、当前状态、下一步动作、截止时间。
3. 销售可以连续记录沟通历史，不覆盖旧记录。
4. 老师评估有明确派发、截止、提交结果和完成率。
5. 教务可以从资源一键承接到现有学生、排课协调、选课链接或后续合同课包流程。
6. 管理可以看到资源来源转化、销售跟进、老师评估、逾期未跟进和成交/流失情况。
7. 第一版控制在两天内完成，不影响现有排课、财务、课包、合同、老师工资、OpenClaw 等功能。

## 非目标

第一版暂不做：

- 微信/企微/小红书/抖音自动接口导入。
- 广告 ROI 自动计算。
- 渠道佣金或老客户返佣结算。
- AI 自动评分。
- 多级审批。
- 复杂营销自动化。
- 自动创建合同或自动收费。

这些可以作为第二阶段继续扩展。

## 资源来源设计

第一版来源类型使用“主来源 + 具体平台/渠道”的结构。主来源用于统计，具体平台可手动修改，方便后续适配新的自媒体账号、渠道或活动。

主来源建议：

- 小红书
- 抖音
- 短视频/自媒体
- 老客户介绍
- 渠道介绍
- 微信/私域
- 官网/表单
- 线下活动
- 其他

具体平台/渠道建议内置常见选项，同时允许手动输入或修改：

- 小红书
- 抖音
- 视频号
- 微信公众号
- 微信群
- 朋友圈
- Instagram
- Facebook
- TikTok
- YouTube
- Google
- 官网
- 老客户介绍
- 渠道介绍
- 线下活动
- 其他手动填写

每个来源需要额外记录 `sourceDetail / 来源备注`，例如：

- 小红书账号名
- 抖音视频链接
- 短视频平台名称
- 老客户姓名
- 渠道人姓名
- 群名称
- 活动名称
- 具体推广内容

## 角色协作流程

### 客服

客服负责第一时间把咨询录入系统。

客服需要填写：

- 家长姓名
- 家长微信
- 家长电话
- 学生姓名
- 年级
- 学校
- 咨询课程
- 当前问题
- 来源类型
- 来源备注
- 初步需求
- 初步紧急程度
- 默认负责人/销售

客服录入后，资源状态为 `New Lead / 新资源`。如果家长已经明确需要老师判断，客服可以直接创建老师评估请求。

### 销售

销售负责资源转化。

销售需要在资源详情页持续记录：

- 本次沟通渠道：微信、电话、面谈、群聊、其他
- 本次沟通内容
- 家长关注点
- 报价或套餐意向
- 意向等级：Hot / Warm / Cold
- 下一步动作
- 下一步截止时间
- 是否需要老师评估
- 是否已发方案
- 是否成交或流失

销售不能覆盖历史跟进，只能新增 follow-up 记录。资源卡片展示最新一次摘要。

### 老师

老师负责专业评估。

老师端需要新增 `Assessment Requests / 评估请求`。

老师只看到分配给自己的评估任务。老师提交内容包括：

- 学生当前水平
- 主要学术问题
- 适合课程
- 建议上课频率
- 建议课时包
- 是否适合自己带
- 推荐老师或老师类型
- 风险提醒
- 给销售/教务的建议

提交后，评估结果自动回写到资源详情页，销售和管理可查看。

### 教务

教务负责成交后的承接。

当资源进入 `Trial / Demo Pending`、`Proposal Sent` 或 `Won` 阶段，教务可以从资源详情页执行：

- 一键创建 Student。
- 一键创建 `排课协调` Ticket。
- 一键创建或跳转 Booking Link。
- 转入现有合同/首购/课包流程。

第一版建议只做安全的一键入口，不自动生成课包和收费，避免影响现有财务与合同逻辑。

### 管理

管理看整体效率和风险。

管理看板需要显示：

- 今日新增资源
- 本周新增资源
- Hot 资源
- 逾期未跟进
- 等老师评估
- 老师评估超时
- 来源转化率
- 销售跟进完成率
- 老师评估完成率
- 成交数
- 流失数
- 流失原因

## 状态流

第一版资源状态建议如下：

1. `New Lead / 新资源`
2. `Contacted / 已联系`
3. `Need Assessment / 待老师评估`
4. `Assessment Done / 评估完成`
5. `Trial Pending / 待试听/体验`
6. `Proposal Sent / 已发方案`
7. `Won / 已成交`
8. `Lost / 已流失`
9. `Dormant / 暂缓`

状态流转建议：

- 新资源 -> 已联系
- 已联系 -> 待老师评估
- 待老师评估 -> 评估完成
- 评估完成 -> 待试听/体验
- 评估完成 -> 已发方案
- 待试听/体验 -> 已发方案
- 已发方案 -> 已成交
- 已发方案 -> 已流失
- 任意未结束状态 -> 暂缓
- 暂缓 -> 已联系
- 任意未结束状态 -> 已流失

## 数据模型建议

### Lead

用于保存资源主档。

字段建议：

- `id`
- `leadNo`
- `sourceType`
- `sourcePlatform`
- `sourceDetail`
- `referralName`
- `parentName`
- `parentWechat`
- `parentPhone`
- `studentName`
- `grade`
- `school`
- `target`
- `needs`
- `preferredCourse`
- `budgetRange`
- `urgency`
- `intentLevel`
- `status`
- `ownerUserId`
- `ownerName`
- `assignedSalesName`
- `nextAction`
- `nextActionDue`
- `latestSummary`
- `convertedStudentId`
- `convertedSourceChannelId`
- `lostReason`
- `createdAt`
- `updatedAt`

关键索引：

- `leadNo`
- `status`
- `sourceType`
- `sourcePlatform`
- `ownerName`
- `intentLevel`
- `nextActionDue`
- `parentWechat`
- `parentPhone`
- `convertedStudentId`

重复检测：

- 微信相同提醒。
- 电话相同提醒。
- 学生姓名 + 家长微信相同提醒。
- 7 天内相同家长联系方式的新资源提醒。

### LeadFollowUp

用于保存销售/客服/管理每一次跟进。

字段建议：

- `id`
- `leadId`
- `actorUserId`
- `actorName`
- `actorRole`
- `channel`
- `content`
- `nextAction`
- `nextActionDue`
- `nextStatus`
- `intentLevelAfter`
- `createdAt`

### LeadAssessmentRequest

用于保存老师评估任务。

字段建议：

- `id`
- `leadId`
- `teacherId`
- `teacherName`
- `status`
- `dueAt`
- `studentLevel`
- `academicProblems`
- `recommendedCourse`
- `recommendedFrequency`
- `recommendedPackage`
- `teacherFit`
- `recommendedTeacherType`
- `risks`
- `suggestionForSales`
- `submittedAt`
- `createdAt`
- `updatedAt`

状态建议：

- `Pending`
- `Submitted`
- `Cancelled`

## 页面设计

### `/admin/leads`

资源工作台。

顶部 KPI：

- 当前列表资源数
- 未结束资源
- Hot 资源
- 逾期未跟进
- 待老师评估

快捷筛选：

- 我的资源
- 今日新增
- 本周新增
- Hot
- 逾期未跟进
- 待老师评估
- 已成交
- 已流失

表格列：

- Lead No
- 学生/家长
- 来源
- 状态
- 意向
- 负责人
- 下一步
- 截止时间
- 最新摘要
- 操作

### `/admin/leads/new`

新建资源页。

表单分区：

- 来源信息
- 家长信息
- 学生信息
- 需求信息
- 分配与下一步

提交后：

- 如果检测到重复联系方式，显示重复提醒。
- 可确认后继续创建。
- 成功后跳转资源详情页。

### `/admin/leads/[id]`

资源详情页。

页面分区：

- 资源摘要卡
- 家长与学生信息
- 来源与转化信息
- 跟进时间线
- 新增跟进表单
- 老师评估区
- 教务承接区
- 风险与流失原因

主要操作：

- 更新状态
- 新增跟进
- 设置下一步动作
- 派发老师评估
- 取消评估
- 查看评估结果
- 转为学生
- 创建排课协调 Ticket
- 跳转现有学生详情

### `/teacher/assessments`

老师评估任务页。

老师只能看到自己的任务。

列表列：

- 学生姓名
- 年级
- 需求课程
- 来源
- 截止时间
- 状态
- 操作

提交页/弹窗字段：

- 学生当前水平
- 主要问题
- 建议课程
- 建议频率
- 建议课时包
- 是否适合自己带
- 风险提醒
- 销售建议

### `/admin/leads/dashboard`

管理看板。

模块：

- 资源漏斗：新增 -> 已联系 -> 评估 -> 方案 -> 成交
- 来源排行：小红书、抖音、短视频、老客户、渠道等
- 销售排行：资源数、Hot 数、逾期数、成交数
- 老师评估：待处理、超时、完成率
- 流失原因统计
- 逾期资源列表

## 与现有系统的连接

### 连接 Student

当资源成交或准备试听时，从 Lead 创建 Student。

映射建议：

- `Lead.studentName` -> `Student.name`
- `Lead.grade` -> `Student.grade`
- `Lead.school` -> `Student.school`
- `Lead.needs` -> `Student.coachingContent`
- `Lead.sourceType/sourcePlatform` -> 自动匹配或创建 `StudentSourceChannel`
- `Lead.sourceDetail` -> 写入学生备注/资源来源备注
- `Lead.nextAction/nextActionDue` -> 学业管理下一步动作

创建后写回：

- `Lead.convertedStudentId`
- `Lead.convertedSourceChannelId`
- `Lead.status = Won` 或保持当前阶段并显示已关联学生

### 连接 Ticket

需要教务排课时，从 Lead 创建 `排课协调` 或 `临时评估学生（没有买课程）` Ticket。

建议第一版只做按钮生成工单，不自动排课。

### 连接 Booking Link

如果需要家长选时间，可以从 Lead 详情跳到 Booking Link 创建页，后续再做自动预填。

### 连接 Contract / Package

第一版只提供跳转入口，不自动生成合同或课包。

原因：

- 合同/课包/发票已有严格财务与签约逻辑。
- 资源阶段信息未必足够完整。
- 自动创建可能误触发后续财务流程。

## 权限建议

第一版沿用现有角色：

- `ADMIN`: 可看全部资源、dashboard、所有操作。
- `FINANCE`: 默认不开放资源模块，避免无关信息暴露。
- `TEACHER`: 只看分配给自己的评估请求。
- `STUDENT`: 不开放。

销售/客服负责人第一版先使用现有 admin 用户姓名，不新增 Sales/CS 角色。后续如果需要更细权限，第二阶段再加 Sales/CS 专用角色或 ACL。

## 两天实施排期

### Day 1 上午

目标：打通资源主档。

任务：

- 增加 Prisma schema。
- 增加 migration。
- 增加 lead 编号生成逻辑。
- 增加资源列表查询 helper。
- 增加 `/admin/leads` 页面。
- 增加 `/admin/leads/new` 页面。

验收：

- 可以创建资源。
- 可以看到资源列表。
- 可以按状态、来源、负责人、意向筛选。
- 重复微信/电话可以提醒。

### Day 1 下午

目标：打通销售跟进。

任务：

- 增加 `/admin/leads/[id]` 详情页。
- 增加 follow-up 时间线。
- 增加跟进提交 action。
- 支持状态、意向等级、下一步动作、截止时间更新。
- 逾期未跟进高亮。
- 在 admin sidebar 加入口。

验收：

- 销售可以新增跟进记录。
- 历史跟进不会被覆盖。
- 最新摘要在列表显示。
- 逾期资源能被筛出来。

### Day 2 上午

目标：打通老师评估。

任务：

- 增加老师评估数据模型。
- 资源详情页支持派发老师评估。
- 新增 `/teacher/assessments`。
- 老师提交评估结果。
- 评估结果回写资源详情页。
- 管理员可以批准老师重新修改已提交评估。
- 老师端导航增加入口。

验收：

- 管理/销售可以派发评估给老师。
- 老师只能看到自己的评估任务。
- 老师提交后，资源详情页可见结果。
- 老师提交后默认锁定；管理员批准后老师可以再次修改。
- 待评估和超时评估可以统计。

### Day 2 下午

目标：打通教务承接和管理看板。

任务：

- 资源详情页增加 `Convert to Student / 转为学生`。
- 资源详情页增加 `Create Scheduling Ticket / 创建排课协调工单`。
- 新增 `/admin/leads/dashboard`。
- 增加资源 CSV 导出。
- 增加来源、销售、老师评估、状态漏斗统计。
- 增加测试。
- 本地 build。
- 按正常流程更新 release docs、提交、部署、线上验证。

验收：

- 成交资源可以创建 Student。
- 转学生时自动设置学生来源，并把资源来源细节写入备注。
- 可以从资源创建排课协调 Ticket。
- 可以从资源列表导出 CSV。
- dashboard 可显示关键指标。
- 现有学生、排课、工单、老师端不受影响。

## 测试计划

必须测试：

- 创建资源。
- 重复微信/电话提醒。
- 列表筛选。
- 新增跟进。
- 修改状态。
- 设置下一步截止时间。
- 逾期资源筛选。
- 派发老师评估。
- 老师提交评估。
- 老师不能看别人的评估。
- 转为学生。
- 转学生自动设置来源。
- 创建排课协调工单。
- 导出资源 CSV。
- dashboard 汇总。
- 未登录访问跳转登录。
- `npm run build`。

建议新增测试文件：

- `tests/leads.test.ts`
- `tests/lead-assessments.test.ts`

## 发布计划

如果你确认后开始执行，发布流程建议：

1. 查当前真实 schema 和页面，确认没有同名模块。
2. 实现数据库 migration。
3. 实现功能代码。
4. 本地专项测试。
5. `npm run build`。
6. 更新：
   - `docs/CHANGELOG-LIVE.md`
   - `docs/RELEASE-BOARD.md`
   - 对应 `docs/tasks/TASK-*` 实施记录
7. commit。
8. push。
9. quick deploy。
10. 线上验证 `/admin/login`、`/admin/leads`、`/teacher/assessments`。

## 风险与控制

### 风险 1：和现有 Ticket Center 重叠

控制：

- Lead 只管“未成为正式学生前”的资源。
- Ticket 继续管“明确要执行的运营/教务任务”。
- 需要排课时才从 Lead 创建 Ticket。

### 风险 2：误影响合同/课包/财务

控制：

- 第一版不自动生成合同、课包、发票。
- 只做转学生和创建排课协调工单。

### 风险 3：老师端信息暴露

控制：

- 老师只看分配给自己的评估。
- 老师不看销售报价、来源成本、其他老师评估。
- 老师提交后默认锁定，只有管理员批准后才允许再次修改，避免评估结果被无痕覆盖。

### 风险 4：资源来源过细导致后期统计混乱

控制：

- `sourceType` 用固定枚举。
- `sourcePlatform` 记录具体平台/渠道，允许手动修改。
- `sourceDetail` 放自由文本。
- 后续如需要，再增加渠道主档。

### 风险 5：两天内范围过大

控制：

- 第一版只做核心闭环。
- 自动导入、佣金、复杂 ROI、自动合同放到第二阶段。

## 第一版完成定义

两天内第一版完成标准：

- 资源可以录入。
- 销售可以跟进。
- 老师可以评估。
- 教务可以转学生和创建排课协调工单。
- 管理可以看 dashboard。
- 资源可以导出 CSV。
- 所有资源都有下一步动作和截止时间。
- 逾期资源可以被筛出。
- 不影响现有功能。
- 本地测试和 build 通过。
- 生产部署并通过基础线上验证。

## 已确认口径

1. 第一版销售/客服负责人先使用现有 admin 用户姓名，不新建 Sales/CS 角色。
2. 资源来源增加具体平台/渠道，并且允许手动修改。
3. 老师评估提交后默认锁定；管理员批准后可以再次修改。
4. 转学生时自动设置学生来源，同时把资源来源细节写入备注。
5. 第一版需要资源 CSV 导出。
