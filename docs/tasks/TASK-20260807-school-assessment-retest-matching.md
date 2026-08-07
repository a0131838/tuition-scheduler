# TASK-20260807-school-assessment-retest-matching

## Context

旧版智能选校仍容易把知名学校排得过高，中等难度与相对容易申请的学校不足；华中国际、英华国际和圣若瑟国际等择优学校可能被误放入稳妥档。家长也无法清楚看到学生年龄对应的入学年级，课程体系常被界面笼统理解成IB。30–45分钟入学准备度测评完成一次后，旧逻辑又把30天建议间隔做成了硬性复测阻断。

## Change

- 为国际学校增加独立招生画像：竞争度、建议档位、年龄范围、年级换算、主要入学节点、课程体系和是否可进入智能推荐。
- 第一梯队保持高竞争；华中国际、英华国际和圣若瑟国际保持择优录取，不进入相对稳妥档。
- CIS、Stamford、AIS、XCL、GIIS、NPS、ISS、OWIS、OFS等根据家庭条件进入匹配或相对稳妥候选。GIIS和NPS明确其印度家庭社群和多课程优势，ISS明确相对容易申请及滚动招生；页面不使用“保证录取”。
- 课程筛选和详情明确区分IB、A Level、AP、IGCSE、CBSE、澳洲课程与学校文凭，不再默认所有国际学校均为IB。
- 使用目标入学年份、出生日期和当前年级计算建议年级/Year/Grade，并过滤不在学校年龄范围内的结果。
- 复测不再永久锁定：优先分配近30天未使用的A/B/C平行卷；三套都做过时使用最久未做的一套。30天保留为趋势对比建议，不是禁止条件。
- 小程序保存并展示本机历史报告入口，提供“开始新一轮测评”和“为另一个孩子测评”，不覆盖已完成报告。
- 数据缓存版本升级到`2026-08-07-r346`。

## Curriculum corrections

- SAS：美式课程、High School Diploma、AP。
- XCL：IB PYP/MYP/DP、AP、WASC High School Diploma。
- GIIS：GMP、PYP、Cambridge Lower Secondary、IGCSE、IBDP、CBSE。
- NPS：Cambridge/IGCSE、IBDP、CBSE Science/Commerce。
- Nexus：PYP、MYP、IGCSE、IBDP，按学校年级分段显示。
- ISS：PYP、MYP、IBDP及ISS High School Diploma。

## Source boundary

课程与申请路径依据学校官方招生、课程页面或招生政策。难度档位属于博思基于公开录取流程、测评要求和实际咨询经验形成的内部选校判断，不冒充学校官方录取率。印度家庭社群等家长关心的就读环境只作方向性提示，不用于评分学生，也不代表国籍限制。

Primary references:

- ACS International admissions: https://www.acsinternational.edu.sg/en/admissions-requirements/
- Hwa Chong International direct admission: https://www.hcis.edu.sg/school-admission/apply-directly-to-hcis/
- SJI International admissions: https://www.sji-international.com.sg/admissions/high-school
- Nexus curriculum: https://www.nexus.edu.sg/secondary/
- XCL learning: https://www.xwa.edu.sg/learning
- GIIS Singapore: https://globalindianschool.org/sg/
- ISS admissions FAQ: https://www.iss.edu.sg/admissions/faq/
- NPS admission policy: https://www.npsinternational.com.sg/pdfs/Admission_Policy.pdf

## Non-goals

- 不承诺录取，不公开伪造录取率或族群比例。
- 不改变测评题目、答案、评分标准、老师开放题复核或顾问线索分配。
- 不修改家长/员工登录、教学、排课、课包、财务、工资、工单、通知、权限或数据库结构。

## Verification

- TypeScript检查通过。
- 61项学校指南与评估聚焦测试通过。
- 67页小程序发布审计通过。
- 本次涉及的原生小程序JavaScript语法检查通过。
- 174项仓库配置的后端回归测试通过；测试中的`DATABASE_URL`日志来自既有通知降级用例，测试套件最终为174/174通过。
- 243页Next.js生产构建通过。

## Risk

风险为中低。推荐档位是辅助筛选，不是学校官方录取结论；招生名额、年级截止日、课程开放和测评要求仍可能调整，需要按资料复核周期更新。复测改动只调整平行卷分配与入口展示，不删除历史报告，也不改变评分标准。
