# 财务核心流程 SOP（中英文对照版）
# Core Finance Process SOP (Bilingual)

适用对象：财务、管理审批人、教务配合人员、老板复核人员  
For: Finance staff, manager approvers, admin staff, and owner reviewers.

适用系统：`sgtmanage.com` 当前线上系统  
System: Current live version of `sgtmanage.com`.

适用范围：  
Scope:
1. `Partner Settlement / 合作方结算`
2. `Teacher Payroll / 老师工资单`
3. `Receipt Approvals / 收据审批`

目标：让财务拿到这份文档后，不需要猜流程，不需要问开发，就知道每一步应该怎么做、谁先做、谁后做、卡住时该找谁。  
Goal: Finance staff should be able to follow this document without guessing, know who does what, in what order, and who to contact when a step is blocked.

---

# 一、财务每天先看什么
# 1. What Finance Should Check First Every Day

每天登录后台后，先按这个顺序处理：  
After logging into the admin system, use this order first:

1. 打开 `Teacher Payroll / 老师工资单`  
   Open `Teacher Payroll`.
2. 打开 `Partner Settlement / 合作方结算`  
   Open `Partner Settlement`.
3. 打开 `Receipt Approvals / 收据审批`  
   Open `Receipt Approvals`.
4. 先看有没有：  
   Check whether there are any of the following:
   - 待管理审批 / waiting for manager approval  
   - 待财务审批 / waiting for finance approval  
   - 待发薪 / waiting to be paid  
   - 待开票 / waiting for invoice  
   - 待创建收据 / waiting for receipt creation  
   - 已创建但未完成审批的收据 / receipts created but not fully approved
5. 最后再做导出、付款、归档  
   Do exports, payments, and archiving only after the review above.

原则：  
Rules:
1. 先处理卡住主流程的东西  
   Handle items blocking the main process first.
2. 先处理待审批，再处理导出，再处理归档  
   Do approvals first, exports second, archiving last.
3. 任何导出或付款前，先确认前置审批都完成  
   Before exporting or paying anything, confirm all prior approvals are complete.

---

# 二、角色分工
# 2. Role Responsibilities

## 1. 教务 / Admin 负责什么
## 2.1 What Admin Staff Are Responsible For

1. 维护老师课次、点名、反馈完整性  
   Maintain complete session, attendance, and feedback records.
2. 生成合作方结算账单前，先确保学生课次、反馈、扣课状态正确  
   Before partner billing is created, ensure sessions, feedback, and deduction status are correct.
3. 如果财务发现数据不对，教务负责先改业务数据，再让财务继续  
   If finance finds business data is wrong, admin must correct the business data first before finance continues.

## 2. 管理审批人 / Manager 负责什么
## 2.2 What Manager Approvers Are Responsible For

1. 审批老师工资单  
   Approve teacher payroll.
2. 审批收据  
   Approve receipts.
3. 审批合作方相关收据  
   Approve partner-related receipts.
4. 驳回时必须写原因  
   A rejection reason is mandatory.

## 3. 财务 / Finance 负责什么
## 2.3 What Finance Is Responsible For

1. 财务确认老师工资单  
   Finance confirmation of teacher payroll.
2. 标记老师工资已发薪  
   Mark teacher payroll as paid.
3. 生成合作方 Invoice / Receipt  
   Create partner invoices and receipts.
4. 上传付款记录  
   Upload payment records.
5. 财务审批收据  
   Finance approval for receipts.
6. 导出 PDF / XLSX / CSV  
   Export PDF / XLSX / CSV.
7. 核对异常并保留凭证  
   Review exceptions and keep evidence.

## 4. 老板 / Owner 负责什么
## 2.4 What the Owner Is Responsible For

1. 规则确认  
   Confirm rules and policy.
2. 高风险驳回或特殊情况审批  
   Handle high-risk rejection or special-case approval.
3. 需要时撤回重做  
   Revoke for redo when necessary.

---

# 三、模块一：Teacher Payroll / 老师工资单
# 3. Module One: Teacher Payroll

## 1. 这个模块是干什么的
## 3.1 What This Module Is For

这个模块用来做：  
This module is used to:
1. 查看每位老师在某个工资月的工资  
   View each teacher’s payroll for a payroll month.
2. 检查工资是否已完成  
   Check whether the payroll workflow is complete.
3. 走完整审批链：老师确认 -> 管理审批 -> 财务确认 -> 财务发薪  
   Complete the workflow: teacher review -> manager approval -> finance confirmation -> finance payout.
4. 配置课时费率  
   Configure teaching rates.

## 2. 进入路径
## 3.2 Navigation Path

进入后台后，左侧点击：  
In the admin backend, click:
1. `Teacher Payroll / 老师工资单`

页面顶部会看到：  
At the top of the page, you will see:
1. `Payroll Month / 工资月份`
2. `Scope / 统计口径`
3. `Apply / 应用`
4. `Go to Salary Slips / 跳到工资单`
5. `Go to Rate Config / 跳到费率配置`
6. `Go to Approval Config / 跳到审批配置`

## 3. 第一步：先选工资月份
## 3.3 Step 1: Select the Payroll Month

操作：  
Action:
1. 在 `Payroll Month / 工资月份` 选择月份  
   Select the payroll month.
2. 在 `Scope / 统计口径` 选择统计方式  
   Select the calculation scope.

说明：  
Meaning:
1. `All Scheduled Sessions` = 全部排课课次（排除整节取消）  
   All scheduled sessions excluding fully cancelled sessions.
2. `Completed Only` = 仅已完成（已点名 + 已反馈）  
   Only sessions with completed attendance and submitted feedback.

建议：  
Recommendation:
1. 财务正式核工资时，优先看 `Completed Only`  
   Use `Completed Only` for formal payroll review.
2. 如果要核差异或找漏，才看 `All Scheduled Sessions`  
   Use `All Scheduled Sessions` only when investigating differences or missing items.

## 4. 第二步：看顶部汇总卡
## 3.4 Step 2: Review the Summary Cards

顶部会显示：  
The top summary area shows:
1. `Teachers / 教师数`
2. `Total Hours / 总课时`
3. `Completed / 已完成`
4. `Estimated Salary / 预估工资`
5. `Pending Sessions / 待完成课次`

财务要先做的判断：  
Finance should first judge:
1. `Pending Sessions` 如果很多，说明这月工资还不能着急结  
   If pending sessions are high, payroll is not ready to finalize.
2. `Estimated Salary` 要按币种分别看，不能混合相加  
   Estimated salary must be checked by currency, not combined across currencies.
3. 如果看到多种货币，要分别核对  
   If multiple currencies appear, review each separately.

## 5. 第三步：看每个老师的工资单状态
## 3.5 Step 3: Check Each Teacher's Salary Slip Status

进入 `Salary Slips by Teacher / 按老师工资单` 区域。  
Go to the `Salary Slips by Teacher` section.

每位老师一行，财务要看这几列：  
Each teacher has one row. Finance should review:
1. 老师姓名 / Teacher name
2. 课时 / Hours
3. 工资金额 / Salary amount
4. 发送状态 / Send status
5. 审批进度 / Approval progress
6. 操作 / Actions

### 操作按钮的意思
### Meaning of Action Buttons

1. `Open Detail / 打开详情`  
   View the full payroll detail.
2. `Send / 发送`  
   Send the payroll slip to the teacher.
3. `Resend / 重新发送`  
   Resend the payroll slip.
4. `Revoke / 撤销发送`  
   Revoke the sent payroll slip.
5. `Manager Approve / 管理审批`  
   Manager approval.
6. `Finance Confirm / 财务确认`  
   Finance confirmation.
7. `Mark Paid / 标记已发薪`  
   Mark salary as paid.
8. `Finance Reject / 财务驳回`  
   Finance rejection with reason.

## 6. 老师工资单完整流程
## 3.6 Full Teacher Payroll Workflow

### 第一步：教务先保证基础数据完整
### Step 1: Admin Must Ensure the Base Data Is Complete

财务不要一上来就发薪。先确认教务已完成：  
Finance should not start payout immediately. First confirm admin has completed:
1. 老师该月课次已经排完  
   Sessions are scheduled.
2. 点名完成  
   Attendance is completed.
3. 老师反馈完成  
   Teacher feedback is completed.
4. 整节取消课次不会计入工资  
   Fully cancelled sessions are excluded.

如果发现：  
If you find:
1. 课次未点名 / session attendance missing
2. 没反馈 / missing feedback
3. 班课/一对一费率不对 / group or 1-on-1 rate is wrong

先退回教务处理，不要往后走。  
Return it to admin for correction before proceeding.

### 第二步：非财务管理员发送工资单给老师
### Step 2: Non-finance Admin Sends the Payroll Slip to the Teacher

操作：  
Action:
1. 找到对应老师那一行  
   Find the teacher row.
2. 点 `Send / 发送`  
   Click `Send`.

目的：  
Purpose:
1. 让老师先看到自己的工资单  
   Let the teacher review the payroll slip first.
2. 老师确认有没有明显问题  
   Let the teacher identify obvious issues.

### 第三步：管理审批
### Step 3: Manager Approval

前提：  
Prerequisite:
1. 老师工资单已经发送  
   The slip has been sent.
2. 老师确认后无问题，或管理层已决定继续  
   The teacher has no objection, or management decides to continue.

操作：  
Action:
1. 管理审批人点 `Manager Approve / 管理审批`  
   The manager approver clicks `Manager Approve`.

结果：  
Result:
1. 管理审批状态变成完成  
   Manager approval becomes complete.
2. 只有管理审批完成后，财务才能继续  
   Finance can continue only after manager approval is complete.

### 第四步：财务确认
### Step 4: Finance Confirmation

操作：  
Action:
1. 财务检查工资明细  
   Finance reviews the payroll detail.
2. 点 `Finance Confirm / 财务确认`  
   Click `Finance Confirm`.

财务确认前必须核：  
Before confirming, finance must check:
1. 月份是否正确 / payroll month is correct
2. 课次是否合理 / sessions look reasonable
3. 币种是否正确 / currency is correct
4. 班课是否误用了一对一费率回退 / group sessions are not wrongly using a 1-on-1 fallback
5. 是否有明显缺课或重复课次 / there are no obvious missing or duplicate sessions

### 第五步：财务发薪
### Step 5: Finance Payout

操作：  
Action:
1. 付款完成后，点 `Mark Paid / 标记已发薪`  
   After payment is completed, click `Mark Paid`.

结果：  
Result:
1. 该老师工资单进入已发薪状态  
   The payroll record is marked as paid.
2. 后续只能查看或有限重发  
   After that, only view or limited resend actions remain.

### 第六步：如果要驳回
### Step 6: If Finance Must Reject

操作：  
Action:
1. 点 `Finance Reject / 财务驳回`  
   Click `Finance Reject`.
2. 填 `Reject reason / 驳回原因`  
   Enter the rejection reason.
3. 提交  
   Submit.

驳回时必须写清楚，例如：  
Use a clear reason, for example:
1. 课时未完成 / hours not complete
2. 班课费率未配置 / group rate not configured
3. 明细有误 / detail error
4. 币种不对 / wrong currency

## 7. 老师工资明细页怎么用
## 3.7 How to Use the Teacher Payroll Detail Page

点击某个老师行的 `Open Detail / 打开详情`。  
Click `Open Detail` on a teacher row.

进入后会看到：  
You will see:
1. `Payroll Month / 工资月份`
2. `Scope / 统计口径`
3. 当前周期 / current period
4. `Combo Summary / 课程组合汇总`
5. `Session Details / 逐课次明细`

### 财务在明细页重点看什么
### What Finance Should Focus on in the Detail Page

1. `Course Combo / 课程组合`
2. `Teaching Mode / 班型`
3. `Hourly Rate / 课时费`
4. `Amount / 金额`
5. `Special / 特别标记`
6. `Pending Reason / 未完成原因`

### 如果看到这些情况，要暂停
### Stop and Investigate if You See These

1. `Using 1-on-1 fallback for group rate`  
   This means a group rate is missing and a 1-on-1 fallback is being used.
2. `Pending`  
   This means the session is incomplete.
3. `Cancelled+Charged`  
   This means the session was cancelled but still deducted and must be confirmed.

## 8. 费率配置怎么做
## 3.8 How to Configure Rates

进入 `Rate Config / 费率配置` 区块。  
Go to the `Rate Config` section.

费率按以下维度配置：  
Rates are configured by:
1. 老师 / Teacher
2. 课程 / Course
3. 科目 / Subject
4. 级别 / Level
5. `Teaching Mode / 授课模式`
   - `ONE_ON_ONE`
   - `GROUP`
6. 货币 / Currency

### 配置步骤
### Configuration Steps

1. 找到对应老师/课程/科目行  
   Find the correct teacher/course/subject row.
2. 确认是 `ONE_ON_ONE` 还是 `GROUP`  
   Confirm the mode.
3. 输入费率金额  
   Enter the rate amount.
4. 选择货币  
   Select the currency.
5. 点保存  
   Save.

### 重要原则
### Important Principles

1. 一对一和班课费率不要混  
   Do not mix 1-on-1 and group rates.
2. 如果同一个老师教同一课程的一对一和班课，就要录两条  
   If the same teacher teaches both 1-on-1 and group for the same combo, create two rows.
3. 不同币种不能混加  
   Do not combine different currencies.
4. 班课暂时没有 `GROUP` 费率时，系统会回退到一对一费率，但页面会提示  
   If a group rate is missing, the system may temporarily fall back to 1-on-1 and show a warning.

## 9. 审批配置怎么做
## 3.9 How to Configure Payroll Approval Roles

进入 `Approval Config / 审批配置`。  
Open the `Approval Config` section.

可配置：  
You can configure:
1. 经理审批人 / manager approvers
2. 财务审批人 / finance approvers

原则：  
Rules:
1. 只有有权限的人改  
   Only authorized users may edit this.
2. 配置改动后，后续工资审批就会按新规则走  
   New payroll approvals will follow the updated config.
3. 配置错误会直接影响审批链  
   A wrong config directly affects the approval chain.

## 10. 老师工资模块最常见错误
## 3.10 Most Common Payroll Errors

1. 没有等点名和反馈完成就发薪  
   Paying before attendance and feedback are complete.
2. 班课还在用一对一费率回退，却没去补 `GROUP` 费率  
   Ignoring group-rate fallback and not configuring a proper `GROUP` rate.
3. 不同币种混算  
   Mixing currencies.
4. 财务还没确认就先标记已发薪  
   Marking as paid before finance confirmation.
5. 驳回时不写原因  
   Rejecting without a reason.

---

# 四、模块二：Partner Settlement / 合作方结算
# 4. Module Two: Partner Settlement

## 1. 这个模块是干什么的
## 4.1 What This Module Is For

这个模块用来处理合作方的账单和收据，包括：  
This module handles partner billing and receipts, including:
1. 生成合作方结算项 / creating settlement items
2. 生成合作方 Invoice / creating partner invoices
3. 上传合作方付款记录 / uploading partner payment records
4. 创建合作方 Receipt / creating partner receipts
5. 进入收据审批 / sending receipts to approval
6. 导出 PDF / XLSX / exporting PDF / XLSX

## 2. 进入路径
## 4.2 Navigation Path

后台左侧点击：  
In the admin backend, click:
1. `Partner Settlement / 合作方结算`

页面顶部会看到：  
At the top of the page, you will see:
1. `Month / 月份`
2. `Apply / 应用`
3. `Open Billing Workspace / 打开账单工作区`

重要规则：  
Important rule:
1. 这里只统计来源为合作方渠道的学生  
   Only students from the partner source channel are included.

## 3. 第一步：先看待结算概览
## 4.3 Step 1: Review the Pending Settlement Overview

页面会显示：  
The page shows:
1. `Online Pending / 线上待结算`
2. `Offline Pending / 线下待结算`
3. `Pending Records / 待开票记录`
4. `Invoiced Records / 已开票记录`

财务先看：  
Finance should first review:
1. 本月有没有待结算数据  
   Whether there are pending items this month.
2. 总金额是否合理  
   Whether the total amount is reasonable.
3. 是线上结算多，还是线下按月结算多  
   Whether online or offline monthly settlement is more significant.

## 4. 第二步：设置费率
## 4.4 Step 2: Set the Partner Settlement Rates

在 `Rate Settings / 费率设置` 可以设置：  
In `Rate Settings`, you can configure:
1. `Online rate per 45min / 线上每45分钟单价`
2. `Offline rate per 45min / 线下每45分钟单价`

规则：  
Rule:
1. 金额 = 总分钟 / 45 × 单价  
   Amount = total minutes / 45 × rate.
2. 改费率会直接影响账单金额  
   Changing the rate directly changes billing amounts.
3. 费率变更前最好先和老板确认  
   Confirm with the owner before changing rates.

## 5. 第三步：检查线上待结算
## 4.5 Step 3: Review Online Pending Items

在 `Online Pending (Package Completed)`：  
In `Online Pending (Package Completed)`:
1. 每个完结课包是一条待结算项  
   Each completed package becomes one settlement item.
2. 同一个学生再次买新课包，也要分开结算  
   If the same student buys another package, it must be settled separately.

操作步骤：  
Steps:
1. 看学生 / check student
2. 看课程 / check course
3. 看课包状态 / check package status
4. 看小时数 / check hours
5. 看金额 / check amount
6. 确认后点 `Create Bill / 生成账单`  
   After confirmation, click `Create Bill`.

## 6. 第四步：检查线下待结算
## 4.6 Step 4: Review Offline Pending Items

在 `Offline Pending (Monthly)`：  
In `Offline Pending (Monthly)`:
1. 这是按月统计的线下结算  
   These are offline monthly settlement items.
2. 会纳入 `PRESENT / LATE`  
   `PRESENT` and `LATE` are included.
3. 以及 `EXCUSED 但已扣课` 的情况  
   `EXCUSED` with charged deduction is also included.
4. 要求课次有反馈  
   The session must have feedback.

### 财务先看预警
### Check Warnings First

如果页面出现 `Settlement Warnings / 结算预警`：  
If the page shows settlement warnings:
1. 说明点名总数和可结算数不一致  
   Attendance count and settlement-eligible count do not match.
2. 不要直接生成账单  
   Do not generate the bill immediately.
3. 先点学生名字  
   Click the student name first.
4. 让教务检查：  
   Ask admin staff to check:
   - 是否缺反馈 / missing feedback  
   - 是否状态不对 / wrong status  
   - 是否有不该纳入的点名 / attendance incorrectly included

### 预警处理完后再生成账单
### Generate the Bill Only After Warnings Are Resolved

操作：  
Action:
1. 找到对应学生行  
   Find the student row.
2. 确认月份、课次、小时、金额  
   Confirm month, sessions, hours, and amount.
3. 点 `Create Bill / 生成账单`  
   Click `Create Bill`.

## 7. 第五步：看最近结算记录
## 4.7 Step 5: Review Recent Settlement Records

在 `Recent Settlement Records / 最近结算记录`：  
In `Recent Settlement Records`:

### 第一块：待开票结算记录（可撤回）
### Block 1: Pending Settlement Records (Revertible)

这里表示：  
This means:
1. 已生成结算项  
   Settlement items have been created.
2. 但还没做 Invoice  
   But an invoice has not been created yet.

如果发现做错了：  
If something is wrong:
1. 点 `Revert / 撤回`  
   Click `Revert`.
2. 让数据回到待结算状态  
   Return the data to pending settlement.

注意：  
Important:
1. 如果已经关联到 Invoice，就不能随便撤回  
   If it is already linked to an invoice, you cannot freely revert it.

### 第二块：已开票记录（按 Invoice 聚合）
### Block 2: Invoiced Records (Grouped by Invoice)

这里表示：  
This means:
1. 已经成功生成合作方 Invoice  
   Partner invoices have already been created.
2. 可以继续做付款记录和收据  
   You can continue with payment records and receipts.

## 8. 第六步：进入 Partner Settlement Billing / 合作方结算账单中心
## 4.8 Step 6: Open the Partner Settlement Billing Workspace

点击：  
Click:
1. `Open Billing Workspace / 打开账单工作区`

这个页面是合作方结算最核心的操作页。  
This is the core operations page for partner settlement.

顶部有 5 个标签：  
Top tabs:
1. `Create Invoice`
2. `Payment Records`
3. `Create Receipt`
4. `Invoices`
5. `Receipts & Approval`

## 9. Create Invoice 标签怎么做
## 4.9 How to Use the Create Invoice Tab

在 `Create Invoice (Batch)` 填：  
In `Create Invoice (Batch)`, fill in:
1. `Invoice No.`
2. `Issue Date`
3. `Due Date`
4. `Payment Terms`
5. `Bill To`
6. `Description`
7. `Manual Extra Items / 手动附加项目`
8. `Note`

然后点：  
Then click:
1. `Create Invoice (Batch)`

原则：  
Rules:
1. Invoice No 要规范  
   Use a consistent invoice numbering rule.
2. 手动附加项目每行一个：`描述|金额`  
   Manual extra items must be one line each: `description|amount`.
3. 生成前确认本批次学生和金额都对  
   Confirm students and amounts before creating the invoice.

## 10. Payment Records 标签怎么做
## 4.10 How to Use the Payment Records Tab

这是财务上传合作方付款凭证的地方。  
This is where finance uploads partner payment proof.

填写：  
Fill in:
1. `Payment Proof`
2. `Payment Date`
3. `Payment Method`
4. `Reference No.`
5. `Replace Existing`
6. `Note`

然后点：  
Then click:
1. `Upload`

上传后，下方 `Payment Records` 列表可以看：  
After upload, the list shows:
1. 上传时间 / upload time
2. 付款日期 / payment date
3. 付款方式 / method
4. 流水号 / reference number
5. 文件 / file
6. 备注 / note
7. 上传人 / uploaded by

如果传错：  
If uploaded wrongly:
1. 可点 `Delete`  
   Click `Delete`.
2. 重新上传  
   Upload again.

## 11. Create Receipt 标签怎么做
## 4.11 How to Use the Create Receipt Tab

这是合作方收据创建页。  
This is the partner receipt creation page.

需要填写：  
You must fill in:
1. `Source Invoice`
2. `Receipt No.`
3. `Receipt Date`
4. `Received From`
5. `Paid By`
6. `Quantity`
7. `Amount`
8. `GST`
9. `Total`
10. `Amount Received`
11. `Payment Record`
12. `Note`

然后点：  
Then click:
1. `Create Receipt`

注意：  
Important:
1. 必须先有 Invoice，才能创建 Receipt  
   An invoice must exist before a receipt can be created.
2. 最好关联 Payment Record，保证审计完整  
   Link a payment record whenever possible for a complete audit trail.

## 12. Invoices 标签怎么做
## 4.12 How to Use the Invoices Tab

这里用来看和导出 Invoice。  
This tab is used to review and export invoices.

每条 Invoice 可做：  
Each invoice supports:
1. `Export PDF`
2. `PDF + Seal`
3. 线下月结可导出：  
   For offline monthly mode, you can also export:
   - `Export XLSX`
   - `XLSX + Seal`
4. 如需删掉错误 Invoice，可点 `Delete`  
   If an invoice is wrong, you can delete it.

原则：  
Rules:
1. 已发给合作方前，先内部核一遍  
   Review internally before sending to the partner.
2. 删 Invoice 要确认不会破坏后续收据链路  
   Deleting an invoice must not break later receipt flow.

## 13. Receipts & Approval 标签怎么做
## 4.13 How to Use the Receipts & Approval Tab

这里用来看合作方收据状态。  
This tab is for reviewing partner receipt status.

每条收据会显示：  
Each receipt row shows:
1. Receipt No.
2. Date
3. Invoice No.
4. Payment Record
5. Amount
6. Manager
7. Finance
8. Actions
9. PDF
10. Delete

如果审批没完成：  
If approval is not complete:
1. 会提示去 `Receipt Approval Center`  
   It will prompt you to go to the `Receipt Approval Center`.

如果审批完成：  
If approval is complete:
1. 可以 `Export PDF`  
   You can export the PDF.

---

# 五、模块三：Receipt Approvals / 收据审批
# 5. Module Three: Receipt Approvals

## 1. 这个模块是干什么的
## 5.1 What This Module Is For

这个模块统一处理两类收据：  
This module handles two receipt types in one place:
1. `Parent / 家长收据`
2. `Partner / 合作方收据`

它负责：  
It is responsible for:
1. 查看收据队列 / viewing the receipt queue
2. 选择一条收据 / selecting one receipt
3. 做管理审批 / manager approval
4. 做财务审批 / finance approval
5. 驳回重做 / reject or revoke for redo
6. 导出 PDF / exporting PDF

## 2. 进入路径
## 5.2 Navigation Path

后台左侧点击：  
In the admin backend, click:
1. `Receipt Approvals / 收据审批`

顶部筛选项：  
Top filters:
1. `Package ID / 课包ID`
2. `Month / 月份`
3. `View / 视图`
   - `All`
   - `Parent`
   - `Partner`
4. `Filter / 筛选`
5. `Reset / 重置`

## 3. 家长收据怎么走
## 5.3 Parent Receipt Workflow

### 第一步：选择 package
### Step 1: Select the Package

如果是家长收据，先在：  
For a parent receipt, first use:
1. `Quick Select Package / 快捷选择课包`
里选择课包  
   Select the package.
2. 点 `Open Finance Operations / 打开财务操作`  
   Click `Open Finance Operations`.

### 第二步：上传缴费记录
### Step 2: Upload the Payment Record

进入 `Finance Receipt Operations / 财务收据操作`  
In the finance receipt operations area,

展开：  
Expand:
1. `1) Upload Payment Record / 上传缴费记录`

填写：  
Fill in:
1. `Payment Proof`
2. `Payment Date`
3. `Payment Method`
4. `Reference No.`
5. `Replace Existing`
6. `Note`

点：  
Click:
1. `Upload`

### 第三步：检查已上传记录
### Step 3: Review Existing Payment Records

展开：  
Expand:
1. `2) Existing Payment Records / 已上传缴费记录`

核对：  
Review:
1. 日期 / date
2. 方法 / method
3. 流水号 / reference number
4. 文件 / file
5. 备注 / note
6. 上传人 / uploaded by

### 第四步：创建收据
### Step 4: Create the Receipt

展开：  
Expand:
1. `3) Create Receipt / 创建收据`

填写：  
Fill in:
1. `Source Invoice`
2. `Receipt No.`
3. `Receipt Date`
4. `Received From`
5. `Paid By`
6. `Quantity`
7. `Amount`
8. `GST`
9. `Total`
10. `Amount Received`
11. `Payment Record`
12. `Description`
13. `Note`

点：  
Click:
1. `Create Receipt`

## 4. 合作方收据怎么走
## 5.4 Partner Receipt Workflow

合作方收据通常先在 `Partner Settlement Billing` 那边创建，  
Partner receipts are usually created from `Partner Settlement Billing`,
然后统一回到 `Receipt Approval Center` 进行审批。  
and then reviewed in the `Receipt Approval Center`.

## 5. Unified Receipt Queue / 统一收据队列 怎么看
## 5.5 How to Read the Unified Receipt Queue

这个表是最重要的收据总表。  
This is the main receipt queue table.

每一行会显示：  
Each row shows:
1. 类型（家长/合作方） / type
2. 收据号 / receipt number
3. 日期 / date
4. 发票号 / invoice number
5. 学生或合作方对象 / student or partner
6. 缴费记录 / payment record
7. 金额 / amount
8. 管理审批进度 / manager approval progress
9. 财务审批进度 / finance approval progress
10. 当前状态 / current status
11. `Open / 打开`

## 6. 选中收据后怎么审批
## 5.6 How to Approve a Selected Receipt

点击某一行 `Open / 打开` 后，进入：  
After clicking `Open`, go to:
1. `Selected Receipt Details & Actions / 选中收据详情与审批操作`

这里会显示：  
This section shows:
1. 类型 / type
2. 收据号 / receipt number
3. 发票号 / invoice number
4. 缴费记录 / payment record
5. 之前的驳回原因（如果有） / previous rejection reasons, if any

### 对家长收据
### For Parent Receipts

管理审批人可以：  
Manager approvers can:
1. `Manager Approve / 管理审批通过`
2. `Manager Reject / 管理驳回`

财务审批人可以：  
Finance approvers can:
1. `Finance Approve / 财务审批通过`
2. `Finance Reject / 财务驳回`

### 对合作方收据
### For Partner Receipts

管理审批人可以：  
Manager approvers can:
1. `Manager Approve / 管理审批通过`
2. `Manager Reject / 管理驳回`

财务审批人可以：  
Finance approvers can:
1. `Finance Approve / 财务审批通过`
2. `Finance Reject / 财务驳回`

### 驳回规则
### Rejection Rule

驳回时必须：  
When rejecting, you must:
1. 填原因  
   Enter a reason.
2. 说明问题在哪  
   State clearly what is wrong.

例如：  
Examples:
1. 付款凭证不对 / payment proof is incorrect
2. 金额和发票不一致 / amount does not match invoice
3. 收据号不规范 / receipt number is not correct
4. 缴费记录没关联 / payment record is missing or not linked

## 7. Revoke To Redo / 撤回重做 是什么时候用
## 5.7 When to Use Revoke To Redo

这个按钮是高级权限使用的。  
This button is for higher-privilege use.

适用情况：  
Use it when:
1. 收据已经创建，但内容明显错误  
   The receipt has already been created but contains a clear error.
2. 不适合继续审批  
   It is not suitable to continue approval.
3. 需要整个单据回到重做状态  
   The whole receipt must return to redo status.

操作：  
Action:
1. 填 `撤回原因（可选）`  
   Enter an optional revoke reason.
2. 点 `Revoke To Redo / 撤回重做`  
   Click `Revoke To Redo`.

## 8. PDF 导出什么时候能做
## 5.8 When PDF Export Is Allowed

规则：  
Rule:
1. 只有审批完成后  
   Only after approval is complete
2. 才能导出 PDF  
   can the PDF be exported.

如果还没完成审批：  
If approval is still incomplete:
1. 页面会显示 `Pending approval / 等待审批`  
   The page will show `Pending approval`.
2. 不要导出未完成的正式文件  
   Do not export unfinished official documents.

---

# 六、财务在这三条流程里最常见的错误
# 6. Most Common Finance Errors Across These Three Modules

## 1. 老师工资单
## 6.1 Teacher Payroll Errors

1. 没有等点名和反馈完成就发薪  
   Paying before attendance and feedback are complete.
2. 班课还在用一对一费率回退，却没去补 `GROUP` 费率  
   Ignoring group-rate fallback and failing to add a `GROUP` rate.
3. 不同币种混算  
   Mixing currencies.
4. 财务还没确认就先标记已发薪  
   Marking paid before finance confirmation.
5. 驳回时不写原因  
   Rejecting without a reason.

## 2. 合作方结算
## 6.2 Partner Settlement Errors

1. 预警没处理就生成账单  
   Creating bills before settlement warnings are resolved.
2. 结算记录已经关联 Invoice 还想撤回  
   Trying to revert settlement records already linked to invoices.
3. 付款记录没上传就做收据  
   Creating receipts before payment records are uploaded.
4. Invoice 还没核就发出去  
   Sending invoices before internal review.

## 3. 收据审批
## 6.3 Receipt Approval Errors

1. 缴费记录和收据没对上  
   Payment records do not match receipts.
2. 驳回不写原因  
   Rejecting without a reason.
3. 审批没完成就导出 PDF  
   Exporting PDF before approval is complete.
4. 用错 Parent / Partner 路径  
   Using the wrong Parent / Partner workflow.

---

# 七、财务每天最推荐的操作顺序
# 7. Recommended Daily Finance Workflow Order

1. 先开 `Teacher Payroll`  
   Open `Teacher Payroll` first.
2. 查有没有待管理审批、待财务确认、待发薪  
   Check for pending manager approvals, finance confirmations, and unpaid payroll.
3. 再开 `Partner Settlement`  
   Then open `Partner Settlement`.
4. 查有没有待结算、待开票、待收据  
   Check for pending settlement, invoicing, and receipt tasks.
5. 再开 `Receipt Approvals`  
   Then open `Receipt Approvals`.
6. 把 Pending 的收据审批完  
   Process pending receipts.
7. 最后做导出、付款、归档  
   Leave exports, payment, and archiving for the end.

一句话原则：  
One-sentence rule:
1. **先审批，后导出；先核数据，后付款；有预警先停，不要硬往下做。**  
   **Approve first, export later; verify data before payment; if there is a warning, stop and resolve it before continuing.**
