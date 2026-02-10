# Tuition Scheduler (sgtmanage.com) 员工使用手册

更新时间：2026-02-10

## 1. 系统入口与账号

- 线上域名：`https://sgtmanage.com`
- 服务器 IP：`43.128.46.115`
- 后台入口：`/admin`（例：`https://sgtmanage.com/admin`）
- 老师入口：`/teacher`（例：`https://sgtmanage.com/teacher`）

说明：
- 后台和老师端的账号由管理员创建或绑定。
- 不在文档中保存任何密码或密钥；账号密码由负责人单独保管。

## 2. 核心模块概览（后台 Admin）

### 2.1 学生（Students）
- 创建/编辑学生资料：姓名、学校、年级、来源、类型、备注等。
- 查看学生关联信息：报名（Enrollments）、课包（Packages）、排课/课次（Sessions）、预约（Appointments）、导出 PDF（学生报告/课表等）。
- 常见操作：
  - 取消/恢复某一节课次（可选是否扣课时 + 备注）。
  - 快速排课（Quick Schedule）：按学生时间寻找可用老师并创建预约/课次。

### 2.2 老师（Teachers）
- 老师资料维护、绑定老师账号（Teacher Portal 登录）。
- 老师可用时间（Availability）：
  - 每周模板（Weekly Template）：固定每周可用时段。
  - 按日期可用时间（Monthly / by date）：具体某天的可用时段。
  - 按每周模板生成整月：将模板批量生成到某个月的按日期时段。
- 老师名片（Teacher Card）：查看/导出老师名片 PDF。

### 2.3 班级（Classes）
- 创建班级：选择科目/级别/老师/校区/教室/容量。
- 查看班级详情：报名学生、课次列表、生成课次等。
- 快捷入口：跳转到报名管理（Enrollments）。

### 2.4 报名（Enrollments）
- 新增报名：给学生报名某个班级。
- 取消报名：从班级移除学生（支持撤销 Undo）。
- 规则要点：
  - 同一学生对同一班级只允许报名一次。
  - 学生必须拥有该课程的有效课包（ACTIVE 且在有效期内；小时包需剩余课时足够）。
  - 同一课程的报名冲突会被阻止（防止同一课程重复报名到不同班级）。

### 2.5 待办中心（Todo Center / Todos）
- 今日重点：未点名课次、续费预警等。
- 明日上课提醒（老师/学生）：
  - 单个确认「已提醒」
  - 批量确认「已提醒」

### 2.6 课包（Packages）与对账单（Package Ledger）
- 课包创建/维护：小时包、月包等。
- 对账单（Ledger）：
  - 查看课包期初/期末/消耗记录
  - 导出 PDF（用于给家长/学生对账）

### 2.7 预约链接（Booking Links）
- 为学生生成选课/预约链接。
- 管理：启用/停用、仅允许选定时段、删除链接。
- 管理选定时段可见性：勾选后立即生效（不刷新页面）。

## 3. 员工日常操作流程（建议）

### 3.1 每日开工检查（2-3 分钟）
1. 打开 `https://sgtmanage.com/admin`
2. 进入 `/admin/todos`
3. 处理待办：
   - 明日上课提醒（老师/学生）：逐个确认或批量确认
   - 续费预警：联系家长并记录跟进
4. 如有冲突提示：进入 `/admin/conflicts` 处理（换老师/换教室/取消课次等）

### 3.2 新学生从 0 到排课
1. `/admin/students` 新建学生
2. `/admin/packages` 创建课包（或先由财务确认付款后创建）
3. `/admin/enrollments` 或 `/admin/classes/[id]` 给学生报名班级
4. `/admin/students/[id]` 使用 Quick Schedule 快速排课（如需）

### 3.3 老师可用时间维护（管理员）
1. `/admin/teachers/[id]/availability`
2. 先维护 Weekly Template（每周模板）
3. 再生成某个月（Generate Month）
4. 如临时调整：在月视图中对某一天新增/删除时段

## 4. PDF 导出说明

系统中多处支持导出 PDF（学生报告、老师名片、课包对账单、报名表等）。

如果导出样式异常（例如 logo 与文字重叠）：
- 优先确认浏览器下载的是最新文件（清缓存后重试）。
- 若仍异常，记录具体页面 URL、导出类型、截图，提交给技术处理。

## 5. 线上是否真的在跑：确认流程

### 5.1 站点层面（最简单）
- 浏览器打开：`https://sgtmanage.com`
- 能正常打开页面、登录、查询数据，基本可确认线上服务可用。

### 5.2 服务器层面（运维人员）
服务器（Ubuntu）上常用路径：
- 应用目录：`/home/ubuntu/apps/tuition-scheduler`
- 日志目录：`/home/ubuntu/logs`

常用命令（在服务器上执行）：
- 查看服务日志：
  - `tail -n 200 /home/ubuntu/logs/tuition-scheduler.log`
- 查看监控脚本日志：
  - `tail -n 200 /home/ubuntu/logs/tuition-scheduler_monitor.log`
- 查看备份日志：
  - `tail -n 200 /home/ubuntu/logs/tuition-scheduler_backup_object_storage.log`

## 6. 备份与维护（规则）

当前线上（crontab）规则：
- HTTP 监控：每 5 分钟一次（`*/5 * * * *`）
  - 脚本：`/home/ubuntu/apps/tuition-scheduler/ops/server/scripts/monitor_http.sh`
  - 日志：`/home/ubuntu/logs/tuition-scheduler_monitor.log`
- Postgres 备份：每天 03:00（服务器时间）一次（`0 3 * * *`）
  - 脚本：`/home/ubuntu/apps/tuition-scheduler/ops/server/scripts/backup_postgres_to_object_storage.sh`
  - 日志：`/home/ubuntu/logs/tuition-scheduler_backup_object_storage.log`
  - 备份文件路径示例：`/home/ubuntu/backups/tuition-scheduler/*.dump`
  - 备份会上传到对象存储（S3 兼容）bucket（具体路径见备份日志）

说明：
- 若监控日志出现权限/读取 env 失败等错误，需要运维调整 `/etc/tuition-scheduler/*.env` 权限。
- 备份是否成功以备份日志中 `Uploaded: s3://...` 为准。

## 7. Windows PowerShell 远程执行（不登录服务器）

如果你在本机 Windows（PowerShell）：

### 7.1 用 SSH 直接跑服务器命令
```powershell
ssh -i C:\Users\DEEP\Desktop\.ssh\tuition_scheduler888.pem ubuntu@43.128.46.115 "tail -n 200 /home/ubuntu/logs/tuition-scheduler_monitor.log"
```

第一次连接会提示是否信任主机指纹，输入 `yes` 并回车即可。

### 7.2 常用检查命令示例
```powershell
ssh -i C:\Users\DEEP\Desktop\.ssh\tuition_scheduler888.pem ubuntu@43.128.46.115 "pm2 ls"
ssh -i C:\Users\DEEP\Desktop\.ssh\tuition_scheduler888.pem ubuntu@43.128.46.115 "crontab -l"
ssh -i C:\Users\DEEP\Desktop\.ssh\tuition_scheduler888.pem ubuntu@43.128.46.115 "tail -n 60 /home/ubuntu/logs/tuition-scheduler_backup_object_storage.log"
```

## 8. 常见问题（FAQ）

### 8.1 为什么点按钮会闪一下/回到页面顶端？
- 通常是因为表单提交触发了服务端跳转或页面刷新。
- 已对高频页面（Todos、Enrollments、Teachers Availability、Students Session Cancel/Restore、Classes Create）做了无刷新操作优化。

### 8.2 发现数据不一致/页面报错怎么办？
- 先截图保存（包含 URL）
- 记录操作步骤
- 记录报错时间（精确到分钟）和账号
- 交给技术查看服务器日志定位

