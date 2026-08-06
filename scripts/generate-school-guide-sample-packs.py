from pathlib import Path
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.cidfonts import UnicodeCIDFont
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "school-guide" / "downloads"
OUT.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(UnicodeCIDFont("STSong-Light"))
ORANGE = colors.HexColor("#EC5E0A")
INK = colors.HexColor("#111827")
MUTED = colors.HexColor("#667085")
LINE = colors.HexColor("#E5E7EB")
PAPER = colors.HexColor("#FFF9F4")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CNTitle", fontName="STSong-Light", fontSize=22, leading=30, textColor=INK, spaceAfter=10))
styles.add(ParagraphStyle(name="CNSub", fontName="STSong-Light", fontSize=10, leading=16, textColor=MUTED, spaceAfter=6))
styles.add(ParagraphStyle(name="CNH1", fontName="STSong-Light", fontSize=15, leading=22, textColor=INK, spaceBefore=10, spaceAfter=8))
styles.add(ParagraphStyle(name="CNBody", fontName="STSong-Light", fontSize=10.5, leading=18, textColor=INK, spaceAfter=7))
styles.add(ParagraphStyle(name="CNSmall", fontName="STSong-Light", fontSize=8.5, leading=14, textColor=MUTED))
styles.add(ParagraphStyle(name="CNCover", fontName="STSong-Light", fontSize=11, leading=18, textColor=ORANGE, alignment=TA_CENTER))

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
    "aeis-primary-sample": ("AEIS小学数学与英文准备练习", "AEIS P2-P5", "35-45分钟", [
        ("English readiness", ["Choose the best word: Lina ____ her homework before dinner. (finish / finishes / finishing)", "Read: Tom brought an umbrella because the sky was dark. Why did Tom bring an umbrella?"]),
        ("Mathematics", ["There are 156 books on three equal shelves. How many books are on each shelf?", "Mei had $50. She bought two notebooks at $6 each and a pen for $4. How much money was left?"]),
        ("Open response", ["A bus has 48 passengers. At the first stop, 17 get off and 9 get on. How many passengers are now on the bus? Show your working."])
    ]),
    "aeis-secondary-sample": ("AEIS中学英文、写作与数学练习", "AEIS S1-S3", "45分钟", [
        ("English", ["Write 200-250 words: Describe a time when a plan changed unexpectedly and explain what you learned.", "Correct the sentence: Neither of the students were prepared for the presentation."]),
        ("Reading", ["A town replaced some car parks with trees and cycling paths. Businesses first worried about fewer customers, but six months later weekend visits increased. What changed, and what was the unexpected result?"]),
        ("Mathematics", ["Solve 3(2x - 5) = 27.", "A jacket is discounted by 20% and now costs $72. What was the original price? Show your working."])
    ]),
    "international-primary-sample": ("国际学校小学入学准备练习", "国际学校Primary", "35分钟", [
        ("English", ["Read a short story of your choice and explain the main problem and how it was solved.", "Write 80-120 words about a place where you feel comfortable."]),
        ("Maths", ["A class collected 238 cans on Monday and 176 on Tuesday. They packed them equally into 9 bags. How many cans were left over?", "Draw two different rectangles with an area of 24 square units."]),
        ("Thinking", ["You have paper, tape and 10 straws. Describe how you would build the tallest free-standing tower and how you would improve it after one test."])
    ]),
    "international-secondary-sample": ("国际学校中学入学准备练习", "国际学校Secondary", "45分钟", [
        ("Academic English", ["Write 250-300 words: Should students have a fixed amount of homework every day? Give reasons and examples.", "Summarise in no more than 50 words why reliable evidence matters when making a decision."]),
        ("Mathematics", ["A sequence begins 5, 11, 17, 23. Find the nth term and the 20th term.", "A cylinder has radius 3 cm and height 10 cm. Write an exact expression for its volume."]),
        ("Interview", ["Describe a difficult academic task. What did you try first, what did not work, and what did you change?"])
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

def header_footer(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(colors.white)
    canvas.rect(0, 0, A4[0], A4[1], stroke=0, fill=1)
    canvas.setStrokeColor(ORANGE)
    canvas.setLineWidth(2)
    canvas.line(18 * mm, 282 * mm, 192 * mm, 282 * mm)
    canvas.setFont("STSong-Light", 8)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 12 * mm, "新加坡学校指南 - 博思原创资料")
    canvas.drawRightString(192 * mm, 12 * mm, f"第 {doc.page} 页")
    canvas.restoreState()

def make_pack(slug, title, audience, duration, sections):
    path = OUT / f"{slug}.pdf"
    doc = SimpleDocTemplate(str(path), pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=22*mm, bottomMargin=20*mm, title=title, author="GT Educational Institute")
    story = [Spacer(1, 18*mm), Paragraph("新加坡学校指南", styles["CNCover"]), Spacer(1, 8*mm), Paragraph(title, styles["CNTitle"]), Paragraph(f"适用：{audience}<br/>建议时间：{duration}", styles["CNSub"]), Spacer(1, 8*mm)]
    note = Table([[Paragraph("重要说明", styles["CNBody"]), Paragraph("本资料为博思原创入学准备练习或申请清单，不是MOE、学校或考试机构官方真题，不预测录取。学生应独立完成，家长只负责计时和记录。", styles["CNBody"])]], colWidths=[28*mm, 138*mm], style=TableStyle([("BACKGROUND", (0,0),(-1,-1), PAPER), ("BOX", (0,0),(-1,-1), 0.7, ORANGE), ("VALIGN", (0,0),(-1,-1), "TOP"), ("LEFTPADDING", (0,0),(-1,-1), 8), ("RIGHTPADDING", (0,0),(-1,-1), 8), ("TOPPADDING", (0,0),(-1,-1), 8), ("BOTTOMPADDING", (0,0),(-1,-1), 8)]))
    story += [note, Spacer(1, 8*mm), Paragraph("使用方法", styles["CNH1"]), Paragraph("1. 一次完成，不提前讲答案。<br/>2. 记录用时、是否需要重复说明、是否检查答案。<br/>3. 完成后再看参考方向。<br/>4. 如需老师批改或完整测评，可在小程序申请评估码。", styles["CNBody"]), PageBreak()]
    number = 1
    for section, questions in sections:
        story.append(Paragraph(section, styles["CNH1"]))
        for question in questions:
            story.append(Paragraph(f"{number}. {question}", styles["CNBody"]))
            story.append(Spacer(1, 15*mm))
            number += 1
    story += [PageBreak(), Paragraph("家长记录页", styles["CNTitle"]), Paragraph("不要在学生作答时纠正。完成后按事实记录。", styles["CNSub"])]
    rows = [["记录项目", "观察"]] + [[item, ""] for item in ["总用时", "能够独立理解的题目", "需要重复说明的题目", "最有把握的部分", "最困难的部分", "检查与修改情况", "情绪与专注情况"]]
    table = Table([[Paragraph(str(c), styles["CNBody"]) for c in row] for row in rows], colWidths=[55*mm, 111*mm], rowHeights=[12*mm]+[20*mm]*7)
    table.setStyle(TableStyle([("GRID", (0,0),(-1,-1),0.6,LINE),("BACKGROUND",(0,0),(-1,0),PAPER),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),6),("TOPPADDING",(0,0),(-1,-1),6)]))
    story += [table, PageBreak(), Paragraph("完成后的下一步", styles["CNTitle"]), Paragraph("这份练习只用于发现当前表现，不是正式考试成绩。建议根据孩子的原始答案、用时和家长记录，选择以下一种方式继续：", styles["CNBody"]), Paragraph("- 自行复习：针对错误题型安排2-4周练习。<br/>- 老师批改：提交原始答案，由老师按统一标准反馈。<br/>- 完整测评：在小程序申请评估码，完成30-45分钟入学准备度测评。<br/>- 申请规划：结合目标学校、年级、时间和孩子水平制定准备计划。", styles["CNBody"]), Spacer(1, 8*mm), Paragraph("资料版本：2026-08-06<br/>制作主体：GT Educational Institute<br/>资料性质：博思原创练习 / 申请清单", styles["CNSmall"])]
    doc.build(story, onFirstPage=header_footer, onLaterPages=header_footer)
    return path

if __name__ == "__main__":
    outputs = [make_pack(slug, *data) for slug, data in PACKS.items()]
    print(f"generated={len(outputs)}")
    for output in outputs:
        print(output)
