from pathlib import Path
import sys
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "school-guide" / "downloads"
OUT.mkdir(parents=True, exist_ok=True)

FONT_CANDIDATES = [
    Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf"),
    Path("/usr/share/fonts/truetype/noto/NotoSansCJK-Regular.ttf"),
    Path("/usr/share/fonts/opentype/noto/NotoSansCJK-Regular.ttc"),
]
FONT_PATH = next((path for path in FONT_CANDIDATES if path.exists()), None)
if not FONT_PATH:
    raise RuntimeError("No embeddable Chinese font found for school-guide PDFs")
pdfmetrics.registerFont(TTFont("GuideSans", str(FONT_PATH)))
ORANGE = colors.HexColor("#EC5E0A")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#E5E7EB")
PAPER = colors.HexColor("#FFF9F4")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CNTitle", fontName="GuideSans", fontSize=22, leading=30, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle(name="CNSub", fontName="GuideSans", fontSize=10, leading=16, textColor=MUTED, spaceAfter=6))
styles.add(ParagraphStyle(name="CNH1", fontName="GuideSans", fontSize=15, leading=22, textColor=INK, spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name="CNBody", fontName="GuideSans", fontSize=10.5, leading=18, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="CNSmall", fontName="GuideSans", fontSize=8.5, leading=14, textColor=MUTED))
styles.add(ParagraphStyle(name="CNCover", fontName="GuideSans", fontSize=11, leading=18, textColor=ORANGE, alignment=TA_CENTER))

PACKS = {
    "preschool-readiness-sample": ("3-6岁入学观察与准备练习", "幼儿园、K1与K2", "20-30分钟", [
        ("语言与表达", ["请孩子看一看身边的房间，说出5样物品，并用一句完整的话描述其中一样。", "给孩子讲一个三句话的小故事，请孩子按顺序复述发生了什么。"]),
        ("早期数学", ["桌上放7颗积木，拿走2颗。请孩子数一数还剩多少，并说出自己怎么知道。", "请孩子把圆形、三角形和正方形物品分类，并说明分类理由。"]),
        ("观察与执行", ["请孩子完成连续指令：拿起红色笔，放在书旁边，然后拍两下手。", "观察孩子遇到不会的任务时，会请求帮助、尝试其他方法还是立即放弃。"]),
    ]),
    "primary-language-math-sample": ("小学语言与数学准备练习", "小学入学测试", "30分钟", [
        ("阅读", ["小敏每天给阳台上的植物浇水。星期一她发现新长出两片叶子。问题：小敏为什么每天去阳台？", "用两句话写出你最喜欢的一项活动，并说明原因。"]),
        ("数学", ["一盒有24支铅笔，平均分给6名学生，每人得到多少支？", "一个长方形长8厘米、宽5厘米。它的周长是多少？写出算式。"]),
        ("推理", ["找规律：3，6，9，12，__，__。说明规律。", "所有蓝色卡片都是圆形。这张卡片不是圆形，它一定不是蓝色吗？说明理由。"]),
    ]),
    "aeis-primary-sample": ("AEIS小学英文基础准备练习", "AEIS P2-P5", "40-50分钟", [
        ("Part A - Vocabulary and grammar", [
            "Choose the best word: Lina ____ her homework before dinner. (finish / finishes / finishing / finished)",
            "Choose the best word: The puppies are sleeping ____ the table. (under / during / until / without)",
            "Choose the best word: Amir was tired, ____ he completed the book review. (but / because / unless / while)",
            "Choose the correct sentence. (A) She don't like rain. (B) She doesn't likes rain. (C) She doesn't like rain. (D) She not like rain.",
            "Choose the word closest in meaning to enormous. (tiny / huge / narrow / gentle)",
            "Choose the opposite of arrive. (enter / leave / travel / wait)",
            "Complete the sentence: If it ____ tomorrow, we will practise indoors. (rain / rains / rained / raining)",
            "Choose the correct pronoun: Maya and I made the poster by ____. (ourselves / themselves / herself / itself)",
        ]),
        ("Part B - Cloze", [
            "Complete with one word: Ben wanted to grow a sunflower, ____ he planted a seed in a pot.",
            "He placed the pot near the window ____ it could receive sunlight.",
            "Every morning, he checked the soil and added water ____ it felt dry.",
            "After two weeks, a green shoot appeared. Ben was excited ____ he had never grown a plant before.",
            "The plant grew taller each day, ____ its stem was still weak.",
            "Ben tied it gently to a stick to keep it ____. (straight / softly / early / almost)",
        ]),
        ("Part C - Reading comprehension", [
            "Read: On Saturday, Nila found a wallet beside a bench. It contained money and a library card. She took it to the librarian, who called the owner. Why could the librarian identify the owner?",
            "What did Nila do before the owner was contacted?",
            "Which word best describes Nila? Give one reason from the passage.",
            "Read: The school garden became dry during a hot week. Class 4B collected leftover drinking water in clean containers and used it on the plants. What problem did Class 4B notice?",
            "How did the class avoid wasting water?",
            "What lesson can readers learn from the class? Answer in one complete sentence.",
        ]),
        ("Part D - Writing", [
            "Write 80-100 words about a time when you helped someone. Explain what happened, what you did and how the person responded.",
            "Check your writing: underline one past-tense verb, circle one linking word, and correct any sentence that does not end with punctuation.",
        ])
    ]),
    "aeis-secondary-sample": ("AEIS中学英文与写作准备练习", "AEIS S1-S3", "50-60分钟", [
        ("Part A - Vocabulary and grammar", [
            "Choose the word closest in meaning to reluctant. (eager / unwilling / careless / certain)",
            "Choose the best answer: By the time the bus arrived, we ____ for forty minutes. (waited / have waited / had been waiting / are waiting)",
            "Choose the best connector: The proposal was expensive; ____, it offered the most reliable long-term solution. (however / therefore / similarly / otherwise)",
            "Correct the error: Neither of the students were prepared for the presentation.",
            "Complete the sentence: If the team ____ the warning earlier, the delay might have been avoided. (noticed / had noticed / would notice / has noticed)",
            "Choose the correctly punctuated sentence. (A) Although it was late we continued. (B) Although it was late, we continued. (C) Although, it was late we continued. (D) Although it was late; we continued.",
            "Replace the informal phrase with a formal alternative: The researchers found out that the water was unsafe.",
            "Combine without changing the meaning: The task was difficult. The group refused to give up.",
        ]),
        ("Part B - Cloze", [
            "Complete with one word: Urban trees do more ____ make streets attractive; they also provide shade.",
            "On very hot days, shaded areas can be several degrees cooler ____ nearby concrete surfaces.",
            "Trees also absorb some rainwater, ____ reduces pressure on drains.",
            "However, young trees require regular care ____ their roots become established.",
            "A successful planting project therefore depends ____ long-term planning, not only the number of trees planted.",
            "Choose the best final word: Communities benefit most when residents help to protect the trees they ____. (share / avoid / remove / divide)",
        ]),
        ("Part C - Reading comprehension", [
            "Read: A town replaced some roadside parking spaces with trees and cycling paths. Shop owners initially feared fewer customers. Six months later, pedestrian visits had increased, although delivery drivers still reported difficulties. State the two main changes made by the town.",
            "Why were shop owners worried at first?",
            "What evidence suggests the project had a positive result?",
            "Which group still experienced a problem, and what was it?",
            "Is the passage completely in favour of the project? Explain using evidence.",
            "Suggest one practical improvement that could address the remaining problem.",
        ]),
        ("Part D - Writing", [
            "Write 220-300 words: Describe a time when a plan changed unexpectedly. Explain how you responded and what you learned.",
            "Alternative topic: Schools should require every student to join one community project each year. Do you agree? Give reasons and examples.",
            "Editing check: verify paragraphing, subject-verb agreement, verb tense, linking words and sentence punctuation before finishing.",
        ])
    ]),
    "international-primary-sample": ("国际学校小学英文入学准备练习", "国际学校Primary", "40-50分钟", [
        ("Part A - Language use", [
            "Choose the best adjective: The kitten approached the unfamiliar box very ____. (careful / carefully / care / caring)",
            "Rewrite in the past tense: We walk to the field and play a game.",
            "Choose the best connector: I packed a raincoat ____ the forecast predicted a storm. (because / although / unless / before)",
            "Add capital letters and punctuation: on friday mrs tan took us to the science centre",
            "Choose the word closest in meaning to investigate. (ignore / examine / borrow / announce)",
            "Write one sentence using the word although correctly.",
            "Replace the repeated word: The film was interesting because the characters were interesting.",
            "Put in logical order: Finally we presented our model. First we drew a plan. Next we collected materials.",
        ]),
        ("Part B - Reading", [
            "Read: Eva heard scratching near the classroom window. Outside, a young bird was trapped between two flowerpots. She asked the teacher for a towel and a box. Why did Eva ask an adult for help?",
            "What problem did Eva discover?",
            "Name two items used to help the bird.",
            "What does Eva's behaviour show about her? Use one detail as evidence.",
            "Read: Kai's first paper bridge collapsed under three coins. He folded the next sheet into a zigzag shape. The new bridge held twelve coins. What did Kai change?",
            "How do we know the second design was stronger?",
            "What should Kai do next if he wants a fair test?",
            "Write a one-sentence summary of Kai's experiment.",
        ]),
        ("Part C - Written response", [
            "Write 100-130 words about a place where you feel comfortable. Describe the place and explain why it matters to you.",
            "Imagine you are class monitor. Write a short message explaining one new classroom rule and why it would help everyone.",
            "Check your work for a clear opening, complete sentences, accurate tense and a closing sentence.",
        ])
    ]),
    "international-secondary-sample": ("国际学校中学学术英文准备练习", "国际学校Secondary", "50-60分钟", [
        ("Part A - Academic language", [
            "Choose the word closest in meaning to significant. (minor / important / uncertain / temporary)",
            "Choose the most formal sentence. (A) Lots of people think it is bad. (B) Many respondents considered the policy ineffective. (C) People were kind of unhappy. (D) Everyone hated it.",
            "Correct the error: The information from the two reports do not agree.",
            "Complete the sentence: The experiment was repeated ____ the researchers could check whether the result was reliable.",
            "Rewrite without using I think: I think schools should provide more quiet study spaces.",
            "Combine with a relative clause: The library opened in 1998. The library now serves four neighbourhoods.",
            "Replace get better with a precise academic verb: Air quality may get better after traffic is reduced.",
            "Write one sentence that presents a counterargument using however or although.",
        ]),
        ("Part B - Reading and evidence", [
            "Read: A school introduced a phone-free lunch period for one term. A survey found that 64% of students spoke with friends more often, while 21% felt more anxious without access to messages. Teachers reported fewer lunchtime conflicts, but the survey did not compare results with another school. What was the purpose of the policy?",
            "State one reported benefit for students.",
            "State one reported concern.",
            "What did teachers observe?",
            "Why should the 64% figure not be treated as final proof that the policy works everywhere?",
            "What additional evidence would make the conclusion stronger?",
            "Summarise the passage in no more than 45 words.",
            "Write one balanced conclusion supported by the passage.",
        ]),
        ("Part C - Writing and reflection", [
            "Write 250-320 words: Should schools have a fixed phone-free period every day? Present a clear position, evidence, a counterargument and a conclusion.",
            "Alternative topic: A student's progress should be judged by more than examination scores. Discuss.",
            "Write 80-100 words describing a difficult academic task: what you tried first, what failed and what you changed.",
            "Editing check: remove vague words, verify evidence, vary sentence structure and check paragraph links.",
        ])
    ]),
    "dsa-interview-sample": ("DSA面试与活动证据练习", "DSA-Sec", "30-45分钟", [
        ("经历证据", ["选择一项你持续投入至少一年的专长，写出时间线、训练频率、一次挫折和一次改进。", "列出三项可以证明你个人贡献的材料，并说明每项材料证明什么。"]),
        ("面试", ["为什么选择这所学校的这个DSA领域？回答中必须包含学校项目与你个人经历的具体联系。", "如果进入学校后遇到比自己更强的同学，你会如何学习和贡献？"]),
        ("反思", ["选择一个作品或比赛，说明结果之外你真正学到的两件事。"])
    ]),
    "jae-planning-checklist": ("JAE志愿与材料核对清单", "JC、MI、Poly与ITE", "15分钟", [
        ("资格", ["确认自己是否符合当年JAE资格。", "记录Form A中可申请的课程。"]),
        ("志愿", ["分别写出理想、匹配和保底课程。", "按真实偏好排序，不只按历年分数排序。"]),
        ("复核", ["检查每门课程的科目先修要求。", "提交前保存最终志愿顺序与确认页。"])
    ]),
    "postsecondary-english-math-sample": ("专上课程英文与数学准备练习", "PEI与衔接课程", "45分钟", [
        ("English", ["Write 200 words explaining how you manage deadlines when several assignments are due in the same week.", "Read a course description and list three questions you should ask before signing a student contract."]),
        ("Mathematics", ["A course costs $12,840 after GST. If it is paid in 6 equal instalments, how much is each instalment?", "Interpret a bar chart showing monthly attendance and identify the largest percentage change."])
    ]),
    "poly-eae-interview-sample": ("Poly EAE作品与面试准备包", "Poly EAE", "30-45分钟", [
        ("课程理解", ["用100字说明目标Diploma学习什么、毕业后可能进入什么领域。", "写出该课程最吸引你的两个模块，并说明理由。"]),
        ("作品", ["选择一个项目，用问题、你的角色、过程、结果、反思五部分介绍。", "指出作品中哪一部分最能证明你的个人贡献。"]),
        ("面试", ["如果没有被录取，你会如何继续证明自己适合这个领域？"])
    ]),
    "ite-eae-interview-sample": ("ITE EAE兴趣与面试准备包", "ITE EAE", "30分钟", [
        ("兴趣", ["说明你什么时候开始对目标技能感兴趣，并列出两次实际尝试。", "描述一次动手任务中出现的问题和你的处理方法。"]),
        ("面试", ["为什么这个课程适合你，而不是只因为朋友也申请？", "你希望在课程中掌握哪三项具体技能？"])
    ]),
    "arts-portfolio-sample": ("艺术作品集说明与面试练习", "LASALLE、NAFA与艺术路线", "45分钟", [
        ("作品选择", ["选择6-10件能显示不同能力和持续发展的作品。", "每件作品记录日期、媒介、主题、个人贡献和修改过程。"]),
        ("过程", ["展示至少一件作品从草图、测试、失败到完成的过程。", "说明一次你接受反馈后做出的具体改变。"]),
        ("面试", ["哪位艺术家、设计师或表演者影响了你？不要只介绍对方，要说明对你作品的具体影响。"])
    ]),
    "university-application-checklist": ("新加坡大学申请资料核对表", "自治大学本科", "20分钟", [
        ("资格", ["确认使用A-Level、IB、Poly Diploma或其他国际资格通道。", "逐项核对目标课程的先修科目和英语要求。"]),
        ("材料", ["成绩、预测分或最终资格。", "课程要求的个人陈述、活动、作品集、测试或面试资料。"]),
        ("提交", ["记录每所大学和课程的截止日期。", "提交后保存申请编号并定期查看补件通知。"])
    ]),
    "sped-parent-observation-checklist": ("SPED申请家长观察与报告清单", "专业评估与SPED申请", "20分钟", [
        ("日常功能", ["记录孩子在沟通、自理、社交、感官、行动和学习方面需要帮助的具体情境。", "不要只写“不会”或“有问题”，记录任务、支持方式和孩子的反应。"]),
        ("报告", ["整理诊断、心理、教育、治疗和学校报告的日期与有效期。", "列出目前正在接受的支持和频率。"]),
        ("学校匹配", ["比较学校支持的主要诊断、课程、年龄、交通和家庭配合要求。"])
    ]),
}

ANSWER_GUIDES = {
    "aeis-primary-sample": [
        "1 finishes; 2 under; 3 but; 4 C; 5 huge; 6 leave; 7 rains; 8 ourselves.",
        "9 so; 10 so; 11 when/if; 12 because; 13 but/although; 14 straight.",
        "15 The library card identified the owner. 16 She took the wallet to the librarian. 17 Accept honest/responsible with a passage detail.",
        "18 The garden was dry. 19 They reused leftover drinking water. 20 Accept a complete sentence about reusing resources or caring for shared spaces.",
        "Writing: check task completion, clear sequence, complete sentences, understandable vocabulary, mostly consistent past tense and basic punctuation.",
    ],
    "aeis-secondary-sample": [
        "1 unwilling; 2 had been waiting; 3 however; 4 was prepared; 5 had noticed; 6 B.",
        "7 discovered/determined; 8 Accept a correct contrast structure, for example: Although the task was difficult, the group refused to give up.",
        "9 than; 10 than; 11 which; 12 until/while; 13 on; 14 share.",
        "15 Trees and cycling paths replaced some parking. 16 They feared losing customers. 17 Pedestrian visits increased. 18 Delivery drivers still had difficulties.",
        "19 No; the delivery problem is a limitation. 20 Accept a practical evidence-based suggestion such as timed loading bays.",
        "Writing: assess clear position or event sequence, relevant examples, paragraph control, sentence accuracy, vocabulary range and a purposeful conclusion.",
    ],
    "international-primary-sample": [
        "1 carefully. 2 We walked to the field and played a game. 3 because. 4 On Friday, Mrs Tan took us to the Science Centre. 5 examine.",
        "6 Accept any grammatical sentence. 7 Accept a precise replacement such as engaging. 8 First we drew a plan; next we collected materials; finally we presented our model.",
        "9 To keep herself and the bird safe. 10 A young bird was trapped. 11 A towel and a box. 12 Accept caring/responsible with evidence.",
        "13 He folded the paper into a zigzag. 14 It held twelve rather than three coins. 15 Keep materials and testing conditions the same. 16 Accept a one-sentence problem-method-result summary.",
        "Writing: assess clear ideas, supporting detail, paragraph or message structure, sentence control, accurate tense and evidence of checking.",
    ],
    "international-secondary-sample": [
        "1 important; 2 B; 3 does not agree; 4 so that; 5 Accept an impersonal claim such as Schools should provide more quiet study spaces.",
        "6 The library, which opened in 1998, now serves four neighbourhoods. 7 improve. 8 Accept a grammatical counterargument.",
        "9 To test a phone-free lunch period. 10 More face-to-face conversation. 11 Some students felt more anxious. 12 Fewer lunchtime conflicts.",
        "13 The survey covered one school and had no comparison group. 14 Accept a comparison school, baseline, larger sample or longer follow-up. 15-16 must be concise, balanced and evidence-based.",
        "Writing: assess a clear thesis, relevant evidence, counterargument, paragraph cohesion, academic vocabulary, sentence variety and an effective conclusion.",
    ],
}

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(ORANGE)
    canvas.setLineWidth(2)
    canvas.line(18 * mm, 282 * mm, 192 * mm, 282 * mm)
    canvas.setFont("GuideSans", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 12 * mm, "新加坡学校指南 - 博思原创资料")
    canvas.drawRightString(192 * mm, 12 * mm, f"第 {doc.page} 页")
    canvas.restoreState()

def make_pack(slug, title, audience, duration, sections):
    path = OUT / f"{slug}.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=22*mm, bottomMargin=20*mm, title=title, author="GT Educational Institute")
    story = [Spacer(1, 18*mm), Paragraph("新加坡学校指南", styles["CNCover"]), Spacer(1, 8*mm), Paragraph(title, styles["CNTitle"]), Paragraph(f"适用：{audience}<br/>建议时间：{duration}", styles["CNSub"]), Spacer(1, 8*mm)]
    note = Table([[Paragraph("重要说明", styles["CNBody"]), Paragraph("本资料为博思原创入学准备练习或申请清单，不是MOE、学校或考试机构官方真题，不预测录取。学生应独立完成，家长只负责计时和记录。", styles["CNBody"])]], colWidths=[28*mm, 138*mm], style=TableStyle([("BACKGROUND", (0,0),(-1,-1), PAPER), ("BOX", (0,0),(-1,-1), 0.7, ORANGE), ("VALIGN", (0,0),(-1,-1), "TOP"), ("LEFTPADDING", (0,0),(-1,-1), 8), ("RIGHTPADDING", (0,0),(-1,-1), 8), ("TOPPADDING", (0,0),(-1,-1), 8), ("BOTTOMPADDING", (0,0),(-1,-1), 8)]))
    story += [note, Spacer(1, 8*mm), Paragraph("使用方法", styles["CNH1"]), Paragraph("1. 一次完成，不提前讲答案或翻译题目。<br/>2. 记录用时、是否需要重复说明、是否检查答案。<br/>3. 本题包只测英文基础，不包含数学。<br/>4. 如需完整能力测评，可在小程序直接开始；如需专业分析，再联系顾问。", styles["CNBody"]), PageBreak()]
    number = 1
    for section, questions in sections:
        story.append(Paragraph(section, styles["CNH1"]))
        for question in questions:
            story.append(Paragraph(f"{number}. {question}", styles["CNBody"]))
            story.append(Spacer(1, 15*mm))
            number += 1
    if slug in ANSWER_GUIDES:
        story += [PageBreak(), Paragraph("参考答案与观察重点", styles["CNTitle"]), Paragraph("先完成全部题目再查看。开放题可有不同正确表达；以下内容只供基础自查。", styles["CNSub"])]
        for line in ANSWER_GUIDES[slug]:
            story.append(Paragraph(line, styles["CNBody"]))
            story.append(Spacer(1, 3*mm))
    story += [PageBreak(), Paragraph("家长记录页", styles["CNTitle"]), Paragraph("不要在学生作答时纠正。完成后按事实记录。", styles["CNSub"])]
    rows = [["记录项目", "观察"]] + [[item, ""] for item in ["总用时", "能够独立理解的题目", "需要重复说明的题目", "最有把握的部分", "最困难的部分", "检查与修改情况", "情绪与专注情况"]]
    table = Table([[Paragraph(str(c), styles["CNBody"]) for c in row] for row in rows], colWidths=[55*mm, 111*mm], rowHeights=[12*mm]+[20*mm]*7)
    table.setStyle(TableStyle([("GRID", (0,0),(-1,-1),0.6,LINE),("BACKGROUND",(0,0),(-1,0),PAPER),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6)]))
    story += [table, PageBreak(), Paragraph("完成后的下一步", styles["CNTitle"]), Paragraph("这份英文练习只用于发现当前表现，不是正式考试成绩。建议根据孩子的原始答案、用时和家长记录继续：", styles["CNBody"]), Paragraph("- 自行复习：针对词汇、语法、阅读或写作薄弱项安排2-4周练习。<br/>- 完整测评：在小程序直接完成30-45分钟入学准备度测评，无需评估码。<br/>- 专业分析：需要结合目标学校、年级和时间制定计划时，再主动联系顾问。", styles["CNBody"]), Spacer(1, 8*mm), Paragraph("资料版本：2026-08-06<br/>制作主体：GT Educational Institute<br/>资料性质：博思原创英文练习", styles["CNSmall"])]
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return path

if __name__ == "__main__":
    requested = sys.argv[1:]
    selected = requested or list(PACKS)
    missing = [slug for slug in selected if slug not in PACKS]
    if missing:
        raise SystemExit(f"unknown packs: {', '.join(missing)}")
    outputs = [make_pack(slug, *PACKS[slug]) for slug in selected]
    print(f"generated={len(outputs)}")
    for output in outputs:
        print(output)
