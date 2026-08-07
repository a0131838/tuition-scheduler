# TASK-20260807-public-poly-university-bca-preschool

## Context

公立高中与大学目录原来只有一张五所Poly总览和一张六所自治大学总览，家长无法逐校理解专业、申请、排名和就业。BCA Academy没有独立位置；幼儿园虽有年龄路线，但缺少中国家庭的完整筛选流程和五大Anchor Operator独立档案。

## Change

- 新增SP、NP、NYP、TP、RP五所独立Poly档案。
- 新增NUS、NTU、SMU、SUTD、SIT、SUSS六所独立自治大学档案。
- 新增BCA Academy独立分类与详情。
- 新增五大AOP品牌独立档案和中国家庭幼儿园选择指南。
- 公立高等教育筛选改为：JC/MI、五所Poly、BCA、综合/研究型大学、应用/设计型大学、ITE、艺术院校。
- 幼儿园筛选改为：怎么选、2-17个月、18个月-6岁、4-6岁幼儿园、MOE幼儿园、五大AOP、政策总览。
- 目录缓存版本升级为`2026-08-07-r344`。

## Data rules

- Poly不展示虚构的单校就业率，只展示2025五所联合GES，并解释劳动力参与口径。
- 大学排名统一使用QS World University Rankings 2027；没有综合名次的院校写“未列综合名次”，不写成排名差。
- 大学就业统一使用各校发布的2025 Graduate Employment Survey，并区分“已落实就业”“调查时在职”“全职长期职位”和薪资中位数。
- BCA Academy官网就业数字单独展示，并注明网页未同步披露调查年份、样本、劳动力参与率和职位类型。
- 学费是申请年度和资格敏感数据；有官方明确值才写示例，SIT/SUSS等按课程计费的院校引导家长逐课程核对。
- 国际学生接受MOE Tuition Grant通常附带毕业后三年为新加坡实体工作的义务。

## Primary sources checked

- MOE Autonomous Universities: https://www.moe.gov.sg/post-secondary/overview/autonomous-universities
- Joint Polytechnic GES 2025: https://www.nyp.edu.sg/media-centre/media-releases/polytechnic-graduates-employment-outcomes-in-2025-largely-held-steady-and-graduates-commanded-higher-salary
- QS World University Rankings 2027: https://www.topuniversities.com/qs-top-uni-wur
- NUS PRC admission: https://www.nus.edu.sg/oam/admissions/international-qualifications-for-foreigners/international-qualifications/gaokao-or-prc-national-college-entrance-examination
- NTU PRC admission: https://www.ntu.edu.sg/admissions/undergraduate/admission-guide/international-qualifications/prc-gaokao
- SMU international admission: https://admissions.smu.edu.sg/admissions-requirements/international-and-other-qualifications
- SUTD PRC admission: https://www.sutd.edu.sg/admissions/undergraduate/prc-national-college-entrance-exam-ncee/criteria-for-admission/
- SIT admission FAQs: https://www.singaporetech.edu.sg/admissions/admissions-faqs
- SUSS international full-time admission: https://www.suss.edu.sg/admissions/application-process/international-students/international-ft-undergraduate-students
- BCA Academy: https://www1.bca.gov.sg/about-us/bca-academy/ and https://www.bcaa.edu.sg/what-we-offer/studying-with-us
- ECDA AOP: https://www.ecda.gov.sg/parents/choosing-a-preschool/aop
- LifeSG Preschool Search: https://www.life.gov.sg/services-tools/preschool-search
- MOE Kindergarten registration: https://www.moe.gov.sg/preschool/moe-kindergarten/register

## Verification

- 51项学校指南聚焦测试通过。
- 174项仓库配置的后端回归测试通过。
- 67页小程序发布审计通过。
- 小程序原生JavaScript语法检查、TypeScript检查通过。
- 243页Next.js生产构建通过。

## Non-goals

- 不把Poly Diploma写成本科学位。
- 不把QS排名写成就业保证。
- 不承诺录取、签证、学额、补助或工作。
- 不改测评、家长/员工登录及任何已登录业务流程。
