# TASK-20260807-school-directory-classification-audit

## Context

逐校补充Poly和自治大学资料后，旧的“五所理工学院”“六所自治大学”总览卡仍留在相同筛选组，造成重复。原MOE分类只把名称直接标记为Junior College或Centralised Institute的11所放入JC/MI，遗漏8所在MOE 2026 JAE中招生、但学校记录为中学至JC混合学段的院校。LASALLE与NAFA也被合并成一张学校卡，监管说明则与真实学校混排。

## Official classification

MOE《Courses Offered in 2026 JAE》列出19所JC/MI招生院校：

1. Anderson Serangoon Junior College
2. Anglo-Chinese Junior College
3. Anglo-Chinese School (Independent)
4. Catholic Junior College
5. Dunman High School
6. Eunoia Junior College
7. Hwa Chong Institution
8. Jurong Pioneer Junior College
9. Millennia Institute
10. Nanyang Junior College
11. National Junior College
12. Raffles Institution
13. River Valley High School
14. St. Andrew's Junior College
15. St. Joseph's Institution
16. Tampines Meridian Junior College
17. Temasek Junior College
18. Victoria Junior College
19. Yishun Innova Junior College

其中ACS (Independent)和SJI提供IB路线，其余名单中的JC/MI路线以MOE当年课程为准。NUS High、SOTA和Singapore Sports School虽然覆盖高中年龄段，但不属于普通2026 JAE JC/MI列表。

## Change

- 删除`guide-polytechnics`、`guide-autonomous-universities`和`guide-arts-institutions`三张过时聚合卡。
- 将上述19所完整映射到`JC / MI（19所）`。
- 将NUS High、SOTA、Singapore Sports School与SST归入`专科与特色学校`。
- 新增LASALLE和NAFA两份独立详细档案，并说明两校均为UAS组成学院、各自管理招生。
- 私立学校、PEI与Madrasah监管说明统一归入`申请与监管总览`。
- 学前与私立政策卡名称增加“申请总览”或“政策总览”，不冒充具体学校。
- 缓存版本升级为`2026-08-07-r345`。

## Full-directory audit result

- MOE公开记录：337条，系统档案337条，slug唯一337条。
- 2026 JAE JC/MI：19所，系统19所。
- Poly：5所独立档案，无额外总览卡。
- 自治大学：6所独立档案，无额外总览卡。
- 艺术院校：LASALLE、NAFA两所独立档案，无合并卡。
- 国际学校：34个学校品牌、43条校区/来源记录，继续由既有品牌合并逻辑处理，不产生重复品牌卡。
- 政策总览：学前政策已经在`政策总览`；私校与PEI监管改到`申请与监管总览`。

## Primary sources

- MOE 2026 JAE course list: https://www.moe.gov.sg/-/media/files/post-secondary/2026-jae/2026-jae-courses.pdf
- MOE JC/MI subjects and programmes: https://www.moe.gov.sg/post-secondary/admissions/jae/junior-colleges-and-millennia-institute/subjects-and-programmes
- MOE Integrated Programme: https://www.moe.gov.sg/secondary/courses/express/integrated-programme
- MOE PSEI overview and UAS structure: https://www.moe.gov.sg/post-secondary/overview
- MOE SchoolFinder / data.gov.sg school directory snapshot updated 2026-04-17.

## Non-goals

- 不改变任何学校成绩、费用、就业数据或测评推荐分数。
- 不删除MOE原始学校记录。
- 不修改登录、教学、排课、课包、财务、工资、工单、权限或消息。

## Verification

- 57项学校指南聚焦测试通过。
- 174项仓库配置的后端回归测试通过。
- 67页小程序发布审计、原生JavaScript语法和TypeScript检查通过。
- 243页Next.js生产构建通过。
- 数量审计：337/337条MOE记录、19所JC/MI、5所Poly、6所自治大学、2所艺术院校；3张已删除聚合卡残留为0。
- 线上目录返回`2026-08-07-r345`，JC/MI 19所、Poly 5所、大学3+3所、艺术院校2所、私立监管总览3项。
- 三张旧聚合slug在线上均返回HTTP 404。
- 运行功能提交为`3e5222d921c0180eb32d036b909b7f69cafe78a7`，PM2 PID `2038337`，健康检查HTTP 200。
- 微信开发版`1.0.42`上传成功，包体716,495字节。
