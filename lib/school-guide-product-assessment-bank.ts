export type ProductQuestion = {
  id: string;
  domain: string;
  subskill: string;
  type: "single_choice" | "extended_response";
  prompt: string;
  options: Array<{ key: string; text: string }>;
  answer: string;
  maxScore: number;
  expectedMinutes: number;
  rubric?: string;
};

type Variant = "A" | "B" | "C";

const AGE_LEVEL: Record<string, number> = {
  "6–8岁": 0,
  "9–11岁": 1,
  "12–14岁": 2,
  "15–17岁": 3,
};

const AGE_CODE: Record<string, string> = {
  "6–8岁": "68",
  "9–11岁": "911",
  "12–14岁": "1214",
  "15–17岁": "1517",
};

const READING = {
  A: [
    "Mina visits the school garden every Tuesday. She waters the tomato plants and records their height. This week, the leaves look pale, so she asks her science teacher for advice.",
    "Leo's class is planning a community book swap. Each student brings one book, writes a short recommendation, and chooses a different book to take home. The class will donate any books left after Friday.",
    "A city library extended its weekend opening hours after surveying local families. Attendance rose, but the quiet study area became crowded. The library will now test a booking system before deciding whether to make the change permanent.",
    "Schools often introduce technology to improve access to information. Yet access alone does not guarantee learning: students must evaluate sources, explain their reasoning, and decide when a digital tool is less effective than discussion or direct observation.",
  ],
  B: [
    "Ben keeps a weather chart beside his window. Every morning, he records the temperature and draws a symbol for the sky. At the end of the month, he compares sunny and rainy days.",
    "A group of pupils wanted less food waste at lunch. They measured what was thrown away, interviewed classmates, and suggested smaller first portions with free second servings. Waste fell during the two-week trial.",
    "The school council proposed a later start time. Supporters said students would be more alert, while others worried about transport and after-school activities. The principal asked for a limited trial with clear measures before changing the timetable.",
    "Public debates are rarely resolved by collecting more facts alone. People may agree on the evidence but disagree about priorities, acceptable risk, or who should bear a cost. Good decisions therefore require both reliable information and transparent values.",
  ],
  C: [
    "Sara borrows a library book on Monday. She reads ten pages each night and writes one new word in her notebook. On Friday, she tells her friend the most interesting part.",
    "Students created a walking route around their neighbourhood. They checked road crossings, measured the distance, and added signs explaining local history. Families tested the route and suggested two safer changes.",
    "A museum replaced some written labels with interactive displays. Younger visitors stayed longer, but several adults said the new displays made it harder to compare objects. The museum plans to offer both formats and study how visitors use them.",
    "Convenient recommendations can narrow attention as well as save time. When an algorithm repeatedly shows material similar to what a person already prefers, unfamiliar but valuable ideas may disappear from view. Users therefore need ways to inspect and adjust the system's assumptions.",
  ],
} as const;

const WRITING = {
  A: [
    "Write 50–80 words about a school activity you enjoyed. Explain what happened and why you liked it.",
    "Write 80–120 words to suggest one improvement for your school. Give at least two reasons.",
    "Write 140–180 words: Should students have a fixed amount of homework every day? Give a clear position, reasons and an example.",
    "Write 180–250 words: Evaluate whether schools should limit students' use of generative AI. Address one opposing view before reaching a conclusion.",
  ],
  B: [
    "Write 50–80 words about a person who helped you learn something. Explain what the person did.",
    "Write 80–120 words to persuade classmates to join a useful school project. Explain the project and its benefits.",
    "Write 140–180 words: Is group work usually better than working alone? Give a clear position, reasons and an example.",
    "Write 180–250 words: Evaluate whether examinations are the fairest way to measure learning. Address one opposing view before reaching a conclusion.",
  ],
  C: [
    "Write 50–80 words about a place where you like to read or study. Explain why it works well for you.",
    "Write 80–120 words to explain a problem in your neighbourhood and propose a practical solution.",
    "Write 140–180 words: Should schools require every student to learn an art subject? Give a clear position, reasons and an example.",
    "Write 180–250 words: Evaluate whether social media companies should be responsible for the accuracy of information shared on their platforms. Address one opposing view.",
  ],
} as const;

const READING_CHECKS = {
  A: [
    [["Why does Mina ask her teacher for advice?", ["The leaves look pale.", "The plants are too tall.", "She missed Tuesday.", "She lost her chart."], "A"], ["What does Mina record?", ["The weather", "The plants' height", "The number of teachers", "The price of tomatoes"], "B"], ["Which action happens regularly?", ["Asking for advice", "Picking tomatoes", "Watering the plants", "Changing the garden"], "C"], ["What can we infer about Mina?", ["She observes changes carefully.", "She dislikes science.", "She visits only once.", "She knows why every leaf is pale."], "A"]],
    [["What must each student bring?", ["A recommendation", "One book", "Money", "Two boxes"], "B"], ["What happens to books left after Friday?", ["They are sold.", "They go home with the teacher.", "They are donated.", "They are thrown away."], "C"], ["Why do students write recommendations?", ["To help others choose", "To replace the book", "To extend Friday", "To count families"], "A"], ["Which word best describes the activity?", ["Competitive", "Wasteful", "Shared", "Secret"], "C"]],
    [["Why was a booking system proposed?", ["Weekend hours ended.", "The study area became crowded.", "Families disliked books.", "Attendance fell."], "B"], ["What happened after hours were extended?", ["Attendance rose.", "The library closed.", "The survey stopped.", "Study space increased."], "A"], ["What will the library do before a permanent decision?", ["Build another library", "Run a trial", "Remove the quiet area", "Survey only adults"], "B"], ["Which principle guides the decision?", ["Choose the cheapest idea immediately", "Use trial evidence before committing", "Avoid all changes", "Follow the first complaint"], "B"]],
    [["What is the main claim?", ["Technology always improves results.", "Access to information alone does not ensure learning.", "Discussion should replace all devices.", "Sources should never be questioned."], "B"], ["Which skill does the passage explicitly require?", ["Memorising every source", "Evaluating sources", "Typing faster", "Avoiding observation"], "B"], ["When might a digital tool be less effective?", ["When discussion or observation serves the goal better", "Whenever information is available", "Only during examinations", "When students explain reasoning"], "A"], ["The writer's attitude is best described as", ["unconditionally enthusiastic", "completely opposed", "balanced and purpose-focused", "uninterested"], "C"]],
  ],
  B: [
    [["What does Ben do every morning?", ["Borrow a book", "Record weather information", "Walk to school", "Call a friend"], "B"], ["What does he compare at month end?", ["Hot and cold drinks", "Sunny and rainy days", "Morning and evening lessons", "Two notebooks"], "B"], ["Why is the chart useful?", ["It collects observations over time.", "It predicts every storm.", "It changes the temperature.", "It replaces the window."], "A"], ["Which item is NOT mentioned?", ["Temperature", "Sky symbols", "Rainy days", "Wind speed"], "D"]],
    [["What did pupils measure first?", ["Lunch prices", "Food thrown away", "Serving time", "Class size"], "B"], ["What was the proposed change?", ["Larger first portions", "No second servings", "Smaller first portions with optional seconds", "A longer lunch"], "C"], ["What was the result of the trial?", ["Waste fell.", "Interviews stopped.", "More food was discarded.", "Lunch was cancelled."], "A"], ["Why is the measurement important?", ["It tests whether the idea worked.", "It guarantees everyone liked it.", "It replaces pupil interviews.", "It proves portions were expensive."], "A"]],
    [["What concern did opponents raise?", ["Homework", "Transport and after-school activities", "Exam results only", "School meals"], "B"], ["Why did the principal request a limited trial?", ["To delay forever", "To collect evidence before changing the timetable", "To cancel transport", "To avoid clear measures"], "B"], ["What did supporters expect?", ["Students would be more alert.", "Activities would end.", "School would start earlier.", "Transport would be free."], "A"], ["Which detail shows more than one viewpoint?", ["The council made a proposal.", "Supporters and others raised different effects.", "A principal exists.", "There is a timetable."], "B"]],
    [["Why might more facts not settle a debate?", ["Facts are always false.", "People can disagree about values and trade-offs.", "Risk never matters.", "Priorities are identical."], "B"], ["What should good decisions make transparent?", ["Only costs", "Only evidence", "Evidence and values", "Personal identities"], "C"], ["Who may disagree even when evidence is shared?", ["People with different priorities", "Only researchers", "Nobody", "Only those lacking facts"], "A"], ["What does 'bear a cost' mean here?", ["Hide a cost", "Pay or experience the burden", "Calculate perfectly", "Remove all risk"], "B"]],
  ],
  C: [
    [["When does Sara tell her friend about the book?", ["Monday", "Tuesday", "Thursday", "Friday"], "D"], ["What does she write each night?", ["Ten pages", "One new word", "A full review", "Her friend's name"], "B"], ["How many nights of reading are described before Friday?", ["One", "Two", "Four", "Seven"], "C"], ["Which habit supports vocabulary growth?", ["Borrowing on Monday", "Recording a new word", "Talking only on Friday", "Reading exactly ten books"], "B"]],
    [["What did students add to the route?", ["Shops", "Signs about local history", "Bus tickets", "School rules"], "B"], ["Who tested the route?", ["Only teachers", "Families", "Tourists only", "Drivers"], "B"], ["What changed after testing?", ["Two safer changes were suggested.", "The route was deleted.", "The distance doubled.", "History signs were removed."], "A"], ["Which step most directly addresses safety?", ["Explaining history", "Checking road crossings", "Measuring distance", "Naming the neighbourhood"], "B"]],
    [["What benefit did interactive displays show?", ["Adults compared objects faster.", "Younger visitors stayed longer.", "All labels disappeared.", "Visits became shorter."], "B"], ["What problem did some adults report?", ["Objects were missing.", "Comparison became harder.", "Tickets cost more.", "Displays were too quiet."], "B"], ["What will the museum do next?", ["Use only written labels", "Use only interactive displays", "Offer both and study use", "Stop collecting feedback"], "C"], ["Why is offering both formats reasonable?", ["Different visitors may use information differently.", "All visitors agreed.", "Written labels are always superior.", "The study is already complete."], "A"]],
    [["What risk can repeated recommendations create?", ["Wider attention", "A narrower range of ideas", "Fewer preferences", "More direct observation"], "B"], ["Why may unfamiliar ideas disappear?", ["Users ban them manually.", "The system repeats similar material.", "All unfamiliar ideas lack value.", "Recommendations are random."], "B"], ["What control does the writer suggest?", ["Users should inspect and adjust assumptions.", "Users should accept every result.", "Algorithms should hide settings.", "Preferences should never change."], "A"], ["The phrase 'narrow attention' most nearly means", ["make users read faster", "limit what users notice", "improve every choice", "remove all recommendations"], "B"]],
  ],
} as const;

const LANGUAGE_EXTENSION = [
  [
    ["Choose the best word: The children worked ___ to finish the poster.", ["together", "yesterday", "outside", "yellow"], "A"],
    ["Which sentence tells us the reason?", ["We stayed inside because it rained.", "We stayed inside at noon.", "We stayed inside quietly.", "We stayed inside together."], "A"],
    ["Choose the word closest in meaning to tiny.", ["small", "heavy", "bright", "late"], "A"],
    ["Which sentence is in the past tense?", ["They visit the museum.", "They visited the museum.", "They will visit the museum.", "They are visiting the museum."], "B"],
    ["Choose the best joining word: I packed an umbrella ___ the sky was dark.", ["because", "but", "after", "or"], "A"],
    ["Which sentence is a clear instruction?", ["Please place the books on the shelf.", "The books are on the shelf.", "I like the shelf.", "The shelf is brown."], "A"],
    ["Choose the correctly spelled word.", ["becose", "because", "becaus", "beacause"], "B"],
    ["Which title best fits a paragraph about caring for a class pet?", ["Our New Library", "Looking After a Hamster", "A Rainy Journey", "Sports Day"], "B"],
    ["Choose the best pronoun: Maya has a bicycle. ___ rides it to the park.", ["He", "She", "It", "They"], "B"],
    ["Which sentence compares two things?", ["The blue bag is heavier than the red bag.", "The bag is beside the door.", "Please carry the bag.", "I bought a bag."], "A"],
  ],
  [
    ["Choose the closest meaning of essential.", ["necessary", "optional", "unusual", "temporary"], "A"],
    ["Which sentence uses evidence?", ["The trial reduced waste by 20%, according to the class record.", "The idea is obviously perfect.", "Everyone must agree with me.", "It just feels better."], "A"],
    ["Choose the best transition: The route was shorter; ___, it had two unsafe crossings.", ["however", "therefore", "for example", "similarly"], "A"],
    ["Which sentence is written in the passive voice?", ["The team measured the results.", "The results were measured by the team.", "The team will measure results.", "Measure the results."], "B"],
    ["What does revise most nearly mean in school writing?", ["improve by reviewing and changing", "copy without reading", "submit immediately", "remove every example"], "A"],
    ["Choose the sentence with correct subject-verb agreement.", ["The list of activities are long.", "The list of activities is long.", "The activities list are long.", "The list is have many activities."], "B"],
    ["Which statement is an opinion?", ["The library opens at nine.", "The library has two floors.", "The library is the most welcoming place in town.", "The library closes on Sunday."], "C"],
    ["Choose the most precise verb: The scientist ___ the temperature every hour.", ["did", "made", "recorded", "got"], "C"],
    ["Which sentence clearly shows contrast?", ["Although the task was difficult, the group completed it.", "The group completed the task yesterday.", "The difficult task had four parts.", "The group met after lunch."], "A"],
    ["Choose the best summary of a text explaining three ways to save water.", ["Water is useful.", "The text gives practical methods for reducing water use.", "The writer likes showers.", "Three paragraphs are included."], "B"],
  ],
  [
    ["Choose the closest meaning of feasible.", ["possible and practical", "expensive and risky", "already completed", "impossible to measure"], "A"],
    ["Which sentence makes a qualified claim?", ["This method always works.", "The results suggest the method may help in similar conditions.", "Nobody could disagree.", "The method proves everything."], "B"],
    ["Choose the best transition: The sample was small; ___, the result should be interpreted cautiously.", ["consequently", "meanwhile", "likewise", "otherwise"], "A"],
    ["Which revision removes ambiguity?", ["When Lina met Priya, she was late.", "Lina was late when she met Priya.", "When they met, she was late.", "She met her because she was late."], "B"],
    ["What is the function of a counterargument?", ["To ignore the main claim", "To consider an opposing view before responding", "To repeat the introduction", "To replace all evidence"], "B"],
    ["Choose the correctly structured sentence.", ["Despite the rain, the event continued.", "Despite it rained, the event continued.", "Despite of rain continued the event.", "The event despite continued rain."], "A"],
    ["Which source would best support a claim about school attendance?", ["An anonymous rumour", "Verified attendance records over several terms", "One student's guess", "An advertisement"], "B"],
    ["Choose the most precise phrase.", ["a lot of things changed", "weekly attendance increased from 62 to 81 students", "it became much better", "everyone noticed something"], "B"],
    ["Which sentence distinguishes correlation from cause?", ["Scores rose after the change, but other factors may also have contributed.", "The change definitely caused every improvement.", "Two events occurred, so one caused the other.", "Cause never requires evidence."], "A"],
    ["Choose the best concluding sentence for a balanced argument.", ["Therefore, a limited trial with published results is more justified than an immediate permanent change.", "That is all I know.", "Everyone should agree.", "The other side is wrong."], "A"],
  ],
  [
    ["Choose the closest meaning of mitigate.", ["reduce the severity of", "prove beyond doubt", "increase without limit", "describe in detail"], "A"],
    ["Which claim is appropriately cautious?", ["The findings indicate a possible benefit, but replication is needed.", "The findings settle the issue forever.", "This must work for every population.", "No limitation matters."], "A"],
    ["Choose the best transition: The policy may improve access; ___, it could create new privacy risks.", ["conversely", "for instance", "therefore", "similarly"], "A"],
    ["Which revision improves logical parallelism?", ["The course develops analysis, communication, and students learn to collaborate.", "The course develops analysis, communication, and collaboration.", "The course is analytical, communicating, and collaboration.", "Analysis, to communicate, and collaboration are developed."], "B"],
    ["What makes a source authoritative for a policy date?", ["It is frequently reposted.", "It is issued by the responsible official body and is current.", "It has a persuasive headline.", "It agrees with the reader."], "B"],
    ["Choose the sentence that separates evidence from interpretation.", ["Attendance increased by 12%; this may indicate that the later time helped.", "Attendance increased, proving the policy perfect.", "The policy was obviously successful.", "Everyone preferred the change."], "A"],
    ["Which limitation most weakens a broad conclusion?", ["The study used one small, self-selected group.", "The report includes a title.", "The table has three columns.", "The study lasted several months."], "A"],
    ["Choose the most coherent thesis.", ["Schools should pilot the policy because it may improve access, but they must publish cost and privacy safeguards.", "Schools, policies, access and privacy are important things.", "There are many opinions about school.", "This essay will discuss stuff."], "A"],
    ["Which sentence accurately synthesises two sources?", ["Both sources report improved access, while only the second identifies a rise in administrative cost.", "The sources say exactly the same thing.", "One source is longer, so it is correct.", "Both sources prove all outcomes."], "A"],
    ["Choose the strongest conclusion for an evaluative essay.", ["On balance, the evidence supports a reversible trial rather than immediate full adoption.", "In conclusion, this topic exists.", "Clearly no objection matters.", "The first idea is always best."], "A"],
  ],
] as const;

function choice(id: string, domain: string, subskill: string, prompt: string, options: string[], answer: string): ProductQuestion {
  return {
    id, domain, subskill, type: "single_choice", prompt,
    options: options.map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
    answer, maxScore: 1, expectedMinutes: 1,
  };
}

function englishQuestions(product: string, ageBand: string, variant: Variant, count: number, includeWriting: boolean) {
  const level = AGE_LEVEL[ageBand] ?? 1;
  const prefix = `P-${product}-${AGE_CODE[ageBand]}-${variant}`;
  const grammarSets = [
    [
      ["Choose the best sentence.", ["She go to school every day.", "She goes to school every day.", "She going to school every day.", "She gone to school every day."], "B"],
      ["Choose the word that means the opposite of noisy.", ["quiet", "bright", "quick", "busy"], "A"],
      ["We ___ lunch before the lesson started.", ["eat", "ate", "eating", "eats"], "B"],
      ["Which word best completes the sentence? The bag is ___ the chair.", ["under", "quickly", "because", "happy"], "A"],
      ["Choose the correctly punctuated sentence.", ["Where are you going.", "Where are you going?", "where are you going?", "Where, are you going?"], "B"],
    ],
    [
      ["If it rains tomorrow, we ___ the match indoors.", ["move", "moved", "will move", "moving"], "C"],
      ["Choose the closest meaning of reluctant.", ["unwilling", "excited", "careless", "certain"], "A"],
      ["Neither the teacher nor the pupils ___ ready.", ["was", "were", "is", "be"], "B"],
      ["The experiment failed; ___, the team learned how to improve it.", ["however", "because", "unless", "before"], "A"],
      ["Which sentence uses the word affect correctly?", ["The rain may affect the game.", "The rain is an affect.", "The affect was cancelled.", "They affect to leave."], "A"],
    ],
    [
      ["By the time the bus arrived, we ___ for forty minutes.", ["wait", "waited", "had been waiting", "will wait"], "C"],
      ["Choose the closest meaning of ambiguous.", ["unclear", "obvious", "brief", "accurate"], "A"],
      ["The report, together with its appendices, ___ available online.", ["are", "were", "is", "have"], "C"],
      ["The evidence was limited; ___, the claim should be treated cautiously.", ["therefore", "meanwhile", "otherwise", "similarly"], "A"],
      ["Which revision is most concise?", ["Due to the fact that it rained, the event was cancelled.", "Because it rained, the event was cancelled.", "It rained and this was the reason why cancellation occurred.", "The event, being rained on, had cancellation."], "B"],
    ],
    [
      ["Had the policy been explained earlier, fewer people ___ it.", ["misunderstand", "would have misunderstood", "will misunderstand", "had misunderstand"], "B"],
      ["Choose the closest meaning of substantiate.", ["support with evidence", "hide deliberately", "simplify completely", "reject immediately"], "A"],
      ["The committee recommended that each applicant ___ two references.", ["provides", "provided", "provide", "providing"], "C"],
      ["The proposal is attractive in theory; ___, its practical costs remain uncertain.", ["nevertheless", "for example", "therefore", "likewise"], "A"],
      ["Which sentence avoids an unsupported generalisation?", ["Technology always improves learning.", "Everyone learns better online.", "Some studies report benefits when technology supports a clear teaching goal.", "Digital lessons are obviously the future."], "C"],
    ],
  ] as const;
  const rows: ProductQuestion[] = grammarSets[level].slice(0, Math.min(5, count)).map((item, index) => choice(
    `${prefix}-LU-${index + 1}`, "英语", "语言运用", item[0], [...item[1]], item[2],
  ));
  const passage = READING[variant][level];
  const readingItems = READING_CHECKS[variant][level];
  const readingCount = Math.min(4, Math.max(0, count - rows.length));
  readingItems.slice(0, readingCount).forEach((item, index) => rows.push(choice(
    `${prefix}-RD-${index + 1}`, "英语", "阅读理解", `${passage}\n\n${item[0]}`, [...item[1]], item[2],
  )));
  const extensionCount = Math.max(0, count - rows.length);
  const extensionPool = LANGUAGE_EXTENSION[level];
  const extensionOffset = ({ A: 0, B: 3, C: 6 }[variant] ?? 0);
  Array.from({ length: Math.min(extensionCount, extensionPool.length) }, (_, index) => extensionPool[(extensionOffset + index) % extensionPool.length])
    .forEach((item, index) => rows.push(choice(
      `${prefix}-EV-${index + 1}`, "英语", index % 3 === 0 ? "词汇与语境" : index % 3 === 1 ? "证据与推理" : "语言运用",
      item[0], [...item[1]], item[2],
    )));
  if (includeWriting) rows.push({
    id: `${prefix}-WR-1`, domain: "英语", subskill: "写作", type: "extended_response",
    prompt: WRITING[variant][level], options: [], answer: "", maxScore: 12, expectedMinutes: level < 2 ? 12 : 20,
    rubric: "按任务完成、内容与论证、结构衔接、词汇、语法准确度五项评分；只依据学生原文，不根据姓名、学校或背景推断。",
  });
  return rows;
}

function mathQuestions(product: string, ageBand: string, variant: Variant, count: number) {
  const level = AGE_LEVEL[ageBand] ?? 1;
  const shift = ({ A: 0, B: 2, C: 4 }[variant] ?? 0) + level * 3;
  const prefix = `P-${product}-${AGE_CODE[ageBand]}-${variant}`;
  const numberItem = (index: number, subskill: string, prompt: string, expected: number, distractors: number[]) => {
    const values = [expected, ...distractors].filter((value, position, all) => all.indexOf(value) === position).slice(0, 4);
    while (values.length < 4) values.push(expected + values.length + 1);
    const rotate = (shift + index) % 4;
    const options = [...values.slice(rotate), ...values.slice(0, rotate)];
    return choice(`${prefix}-MA-${index + 1}`, "数学", subskill, prompt, options.map(String), String.fromCharCode(65 + options.indexOf(expected)));
  };
  const s = shift;
  const rows = level <= 0 ? [
    numberItem(0, "数与运算", `图书角有${24 + s}本书，又加入${13 + s}本，现有多少本？`, 37 + 2 * s, [35 + 2 * s, 27 + 2 * s, 47 + 2 * s]),
    numberItem(1, "数与运算", `${48 + s}块积木平均分给6人，每人多少块？`, (48 + s - (s % 6)) / 6, [6, 7, 9]),
    choice(`${prefix}-MA-3`, "数学", "时间", "课程14:20开始，50分钟后结束。结束时间是？", ["14:50", "15:00", "15:10", "15:20"], "C"),
    numberItem(3, "几何", `长方形长${8 + s}厘米、宽4厘米，周长是多少厘米？`, 2 * (12 + s), [12 + s, 32 + 4 * s, 20 + s]),
    numberItem(4, "分数", "一张纸平均分成8份，涂了3份。未涂部分占几份？", 5, [3, 8, 11]),
    numberItem(5, "规律", "数列 4, 7, 10, 13, __ 的下一项是？", 16, [14, 15, 17]),
    numberItem(6, "应用题", "每盒彩笔6支，买4盒后送给同学5支，还剩多少支？", 19, [24, 17, 29]),
    numberItem(7, "钱币", "一本书12元，两本书和一支5元的笔共多少元？", 29, [17, 24, 34]),
    numberItem(8, "数据", "四天阅读页数为8、12、10、14，总页数是多少？", 44, [40, 42, 46]),
    numberItem(9, "测量", "3米等于多少厘米？", 300, [30, 3000, 33]),
    numberItem(10, "逻辑", "小明排在第6位，他前面有几人？", 5, [6, 7, 4]),
    numberItem(11, "应用题", "巴士上有32人，下车9人，又上车4人，现在有多少人？", 27, [19, 23, 45]),
  ] : level === 1 ? [
    numberItem(0, "数与运算", `计算：${360 + s * 12} ÷ 6`, 60 + s * 2, [50 + s, 66 + s, 70 + s]),
    numberItem(1, "分数", "一本书读完3/8后还剩120页，全书共有多少页？", 192, [150, 200, 320]),
    numberItem(2, "百分数", "一件80元的物品打九折，售价是多少元？", 72, [8, 70, 88]),
    numberItem(3, "比例", "红球与蓝球数量比为3:5，共有32个球。红球有多少个？", 12, [15, 20, 8]),
    numberItem(4, "几何", "长方形面积84平方厘米，长12厘米，宽是多少厘米？", 7, [6, 8, 72]),
    numberItem(5, "平均数", "四次测验成绩为72、80、84、88，平均分是多少？", 81, [80, 82, 324]),
    numberItem(6, "小数", "2.75 + 1.6 等于多少（答案扩大100倍填写）？", 435, [335, 425, 451]),
    numberItem(7, "速率", "汽车2小时行驶150千米，平均每小时多少千米？", 75, [70, 80, 300]),
    numberItem(8, "应用题", "5本相同练习册共45元，买8本需要多少元？", 72, [53, 64, 81]),
    numberItem(9, "角度", "三角形两个内角是45°和65°，第三个内角是多少度？", 70, [80, 90, 110]),
    numberItem(10, "数列", "数列2, 6, 18, 54的下一项是？", 162, [108, 158, 216]),
    numberItem(11, "面积", "边长9厘米的正方形面积是多少平方厘米？", 81, [18, 36, 72]),
  ] : [
    numberItem(0, "代数", `解方程：3x + ${6 + s} = ${30 + s}`, 8, [6, 10, 12]),
    numberItem(1, "比例", "若 y 与 x 成正比，x=4时y=10；x=14时y是多少？", 35, [24, 28, 40]),
    numberItem(2, "百分数", "价格先上涨20%，再下降20%。原价100元，现价多少元？", 96, [100, 80, 104]),
    numberItem(3, "几何", "直角三角形两直角边为6和8，斜边长度是多少？", 10, [12, 14, 48]),
    numberItem(4, "概率", "袋中有3红、2蓝、5绿球，随机取一个，取到蓝球的概率为多少（百分数）？", 20, [10, 25, 50]),
    numberItem(5, "统计", "数据4、7、7、9、13的中位数是多少？", 7, [8, 9, 40]),
    numberItem(6, "代数", "展开并化简 2(x+3)+x，x的系数是多少？", 3, [2, 5, 6]),
    numberItem(7, "坐标", "点(2,3)向右平移4个单位后，横坐标是多少？", 6, [-2, 4, 7]),
    numberItem(8, "指数", "2³ × 2² 等于多少？", 32, [10, 16, 64]),
    numberItem(9, "速率", "180千米路程以每小时60千米行驶，需要多少小时？", 3, [2, 4, 120]),
    numberItem(10, "方程", "两个连续整数之和为41，较大的整数是多少？", 21, [19, 20, 22]),
    numberItem(11, "圆", "圆半径为7，取π=22/7，周长是多少？", 44, [22, 49, 154]),
    numberItem(12, "因式分解", "x²-9=(x-3)(x+a)，a是多少？", 3, [-3, 6, 9]),
    numberItem(13, "数据", "一组数据平均数为12，共5个数，其总和是多少？", 60, [17, 50, 72]),
  ];
  return rows.slice(0, count);
}

export function productQuestions(formId: string, targetPath: string, ageBand: string): ProductQuestion[] {
  const variant = (formId.slice(-1) as Variant) || "A";
  if (!(variant in READING) || !(ageBand in AGE_LEVEL)) return [];
  if (targetPath === "INTERNATIONAL_ENGLISH") return englishQuestions("INT", ageBand, variant, 16, true);
  if (targetPath === "AEIS_PRIMARY") {
    return [
      ...englishQuestions("AEP", ageBand, variant, 12, true).map((item) => ({ ...item, domain: "CEQ英语准备" })),
      ...mathQuestions("AEP", ageBand, variant, 12),
    ];
  }
  if (targetPath === "AEIS_SECONDARY") {
    return [
      ...englishQuestions("AES", ageBand, variant, 14, true).map((item) => ({ ...item, domain: "英语" })),
      ...mathQuestions("AES", ageBand, variant, 14),
    ];
  }
  return [];
}

export function findProductQuestion(formId: string, targetPath: string, ageBand: string, questionId: string) {
  return productQuestions(formId, targetPath, ageBand).find((item) => item.id === questionId) || null;
}

export function productQuestionById(formId: string, questionId: string) {
  const ageCode = formId.match(/CORE-A(35|68|911|1214|1517)-[ABC]$/)?.[1];
  const ageBand = Object.entries(AGE_CODE).find(([, code]) => code === ageCode)?.[0];
  const productCode = questionId.split("-")[1];
  const targetPath = productCode === "INT" ? "INTERNATIONAL_ENGLISH"
    : productCode === "AEP" ? "AEIS_PRIMARY"
      : productCode === "AES" ? "AEIS_SECONDARY" : "";
  return ageBand && targetPath ? findProductQuestion(formId, targetPath, ageBand, questionId) : null;
}
