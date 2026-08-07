# TASK-20260807-school-directory-reading-order

## Context

手机端国际学校筛选使用普通容器承载十个长标签，微信中出现标签重叠；例题按钮采用固定双列网格，窄屏会裁掉“打开PDF”。学校详情同时展开概览、招生、费用、成绩、升学和两套例题，家长难以快速找到重点。国际学校排序也只按旧“第一梯队”字段处理，无法体现“IB优先、其他课程随后”的浏览逻辑。私立高校具体专业只有英文，不利于家长阅读。

## Change

- 国际学校主筛选调整为“全部、IB、英式/A Level、美式/AP、其他课程”，其余条件收进“更多筛选”；小程序改用原生横向滚动，避免重叠。
- 目录采用编辑浏览顺序：7所重点IB学校、其他IB学校、SAS和Brighton等优质非IB学校、其他课程学校。页面明确这是浏览顺序，不作为官方排名或录取保证。
- 学校详情首屏只保留年龄、课程、Student’s Pass和首年固定费用四项，正文分为“概览、成绩升学、申请费用”三栏。
- 每所学校只显示一套与学段更匹配的英文入学准备练习；按钮统一为“查看练习”并取消会裁切的固定网格。
- 所有国际学校保留成绩公开状态；未公开或无毕业课程时只显示一句状态。有官方资料的学校按年份、课程体系和统计口径展示。
- 补充AIS、CIS、Nexus、NPS、ISS、SJI International与Tanglin等公开升学资料，并区分单届、历年汇总、录取和最终去向。
- 10所重点私立高校、全部合作院校的280条专业改为“中文参考名称 + 官方英文名称”双语显示，官方英文名称完整保留。

## Primary sources

- Tanglin Academic Results: https://www.tts.edu.sg/about-tanglin/academic-results
- AIS Academic Results & University Placements: https://www.ais.com.sg/secondary/academic-results-university-placements/
- CIS Academic Results: https://www.cis.edu.sg/about-us/academic-result
- Nexus 2025 IBDP Results and Destinations: https://www.nexus.edu.sg/research-thoughts/nexus-2025-ibdp-results-and-stories/
- NPS University Placements: https://www.npsinternational.com.sg/university-placements
- ISS School Profile 2025–2026: https://www.iss.edu.sg/wp-content/uploads/2026/01/ISS-Profile-Uni-Advisor.pdf
- SJI International High School Prospectus 2027: https://www.sji-international.com.sg/uploaded/pdf/HS-Prospectus-2027.pdf

## Non-goals

- “IB重点”是本产品的阅读顺序，不是官方学校排名。
- 不根据个别名校offer推算整届录取表现，不把录取当作最终入读。
- 不修改登录、测评评分、教学、排课、课包、财务、工资、工单、通知、权限或数据库。

## Verification

- TypeScript检查通过。
- 64项学校指南测试通过；174项后端回归通过。
- 280条私立高校合作专业全部具有中文参考名称和官方英文名称。
- 67页小程序发布审计与相关原生JavaScript语法检查通过。
- 243页生产构建通过。
- 390×844窄屏浏览器检查通过，筛选、三栏详情和单套练习均无横向裁切。

## Risk

风险为中低。公开成绩、升学去向、课程和费用会变化，系统保留来源、核对日期和复核周期；没有当前证据的学校明确显示未公开。
