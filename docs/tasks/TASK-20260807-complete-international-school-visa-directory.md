# TASK-20260807-complete-international-school-visa-directory

## Context

原国际学校目录由IB官方目录和优先学校组成，只覆盖34个品牌，遗漏布莱顿、Middleton、Invictus、Knightsbridge House、The Perse、The Grange及多个国家课程、小型和专项支持学校。目录也没有区分学校能否支持新办Student’s Pass，可能让只有短期访客身份的家庭在缴费后才发现无法入学。

## Change

- 底层学校来源库从43条校区/来源记录扩展到84条记录、75个K–12及学前品牌。家长端国际学校目录为66个品牌；英华自主、SOTA、体育学校、圣法、回教学校及纯学前品牌不再混入“国际学校”数量，而是保留在各自的政府、私立/教会或学前类别。
- 新增布莱顿、Middleton、Invictus、Knightsbridge House、The Perse、The Grange、SMMIS、ICS等主流与中价位学校。
- 新增Cambridge、A Level、AP、CBSE、ICSE/ISC、澳洲、日本、韩国、印尼、瑞士、荷兰、法国及专项支持路线，不再把国际学校等同于IB。
- 增加“近期开校”“国家/侨民课程”“需长期准证”“专项支持”筛选。
- 每所学校增加Student’s Pass状态：`SUPPORTED`、`LONG_TERM_PASS_ONLY`或`VERIFY_WITH_SCHOOL`。
- Brighton官方列明2023–2027四年EduTrust；Middleton官方列明2026–2030 EduTrust并明确可接收需要Student’s Pass的申请，因此标记为可支持申请，最终仍由ICA审批。
- The Grange官方FAQ明确不接收Student’s Pass；Astor官方家长手册明确其牌照不允许代办，只接受DP、LTVP、PR等有效长期身份，因此标记为需已有长期准证。
- The Perse等官网只列出可能提交的准证文件、但未明确能为新生发起Student’s Pass的学校保持“书面确认”，不自行推断。

## Primary sources

- ICA Foreign System Schools and Privately-Funded Schools: https://www.ica.gov.sg/reside/STP/apply/fss
- SSG / TPGateway PEI Listing: https://www.tpgateway.gov.sg/resources/information-for-private-education-institutions-%28peis%29/pei-listing
- Brighton accreditations: https://www.brightoncollege.edu.sg/about-us/awards-and-accreditations/
- Middleton accreditations: https://www.middleton.edu.sg/about/awards-and-accreditations/
- The Grange FAQ: https://www.thegrange.edu.sg/admissions/faqs/
- Astor parent handbook: https://www.astor.edu.sg/_files/ugd/4f8001_229c19cac17d4609b2d6f794fd5ccd80.pdf
- The Perse application and registration: https://www.perse.edu.sg/admissions/application-process/application-form/

## Non-goals

- 不保证学校录取或ICA签发Student’s Pass。
- 不把第三方学校榜单当作监管资格证据。
- 不为资料不足的学校猜测EduTrust或签证资格。
- 不修改评估题目、评分、登录、教学、排课、课包、财务、工资、工单、通知、权限或数据库。

## Verification

- TypeScript检查通过。
- 63项学校指南测试通过，包含84条来源记录、75个底层品牌、66个家长端国际学校品牌、分类排除、准证状态和筛选断言。
- 67页小程序发布审计和本次原生JavaScript语法检查通过。
- 243页生产构建与174项后端回归已通过。

## Risk

风险为中低。学校注册、EduTrust、学段、校区和准证政策可能变化，因此准证状态设置较短复核周期；任何没有当前明确证据的学校都要求缴费前书面确认。目录“全面”以当前可识别、在营、提供全日制学前至高中教育的学校为范围，不把单纯补习中心和仅课外课程机构混入。

## Rollout

- 功能提交：`07c739ce766165bdf585f3335fea0515c1a0e013`。
- 服务器：PM2 PID `2069710`，健康检查HTTP 200，线上目录返回`2026-08-07-r347`、84条来源记录和66个国际学校品牌。
- 微信开发版：`1.0.43`，721,335 bytes；仍需在微信公众平台设为体验版并真机检查。
