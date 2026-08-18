export type ItepAlignedSection = "GRAMMAR" | "LISTENING" | "READING" | "WRITING";

export type ItepAlignedQuestion = {
  id: string;
  domain: "英语";
  subskill: string;
  type: "single_choice" | "extended_response";
  prompt: string;
  stimulus?: string;
  options: Array<{ key: string; text: string }>;
  answer: string;
  maxScore: number;
  expectedMinutes: number;
  rubric?: string;
  section: ItepAlignedSection;
  sectionLabel: string;
  sectionPart: number;
  sectionDurationMinutes: number;
  sectionInstructions: string;
  audioUrl?: string;
  audioTranscript?: string;
};

type Variant = "A" | "B" | "C";

const SECTION = {
  GRAMMAR: { label: "语法", minutes: 10, instructions: "共25题。第1部分13道句子填空；第2部分12道错误识别。请在10分钟内完成。" },
  LISTENING: { label: "听力", minutes: 20, instructions: "共14题。先听4段短对话，再听1段较长对话和1段讲座。每段音频只播放一次。" },
  READING: { label: "阅读", minutes: 20, instructions: "共10题。第1篇约250词，回答4题；第2篇约450词，回答6题。" },
  WRITING: { label: "写作", minutes: 25, instructions: "共2题。第1题建议5分钟写50–75词；第2题建议20分钟写175–225词。" },
} as const;

type ChoiceSeed = [string, string[], string];

const GRAMMAR_FORMS: Record<Variant, { fill: ChoiceSeed[]; error: ChoiceSeed[] }> = {
  A: {
    fill: [
      ["Maya ___ to the library every Saturday.", ["go", "goes", "going", "gone"], "B"],
      ["We had already eaten when the guests ___.", ["arrive", "arrived", "will arrive", "are arriving"], "B"],
      ["If the weather improves, the match ___ outdoors.", ["moves", "moved", "will be moved", "has moved"], "C"],
      ["Neither the teacher nor the students ___ ready to leave.", ["was", "were", "is", "be"], "B"],
      ["The report, together with its appendices, ___ available online.", ["are", "were", "is", "have"], "C"],
      ["By next June, she ___ at the school for three years.", ["studies", "studied", "will have studied", "has study"], "C"],
      ["The experiment was repeated ___ the first result was unexpected.", ["because", "although", "unless", "whereas"], "A"],
      ["Students are encouraged ___ questions when an instruction is unclear.", ["ask", "asking", "to ask", "asked"], "C"],
      ["The new timetable is ___ convenient than the previous one.", ["more", "most", "much", "many"], "A"],
      ["Had we known about the delay, we ___ a different route.", ["choose", "chose", "would choose", "would have chosen"], "D"],
      ["The principal requested that every applicant ___ two references.", ["provides", "provide", "provided", "providing"], "B"],
      ["There is little evidence ___ the change improved attendance.", ["what", "that", "which", "whose"], "B"],
      ["The findings are useful, ___ they should not be applied to every school.", ["so", "because", "but", "unless"], "C"],
    ],
    error: [
      ["Choose the underlined part that contains an error: The students (A) was asked (B) to submit (C) their work by Friday (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: Each of the books (A) have (B) a label (C) on the front cover (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: She explained (A) the process clearly (B) so that everyone can understood (C) the final step (D).", ["A", "B", "C", "D"], "C"],
      ["Choose the underlined part that contains an error: The equipment (A) were delivered (B) earlier than (C) we expected (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: He is interested (A) in learn (B) how the system (C) records changes (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: If I had seen (A) the notice, I would attend (B) the meeting (C) yesterday (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The teacher asked (A) where had the student put (B) the missing file (C) after class (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: There are fewer (A) traffic on the road (B) during the school holiday (C) than usual (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: Despite of (A) the heavy rain, the event (B) continued as planned (C) until six (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: The results suggest (A) that the new method (B) may be more easier (C) to use (D).", ["A", "B", "C", "D"], "C"],
      ["Choose the underlined part that contains an error: One of my classmates (A) are preparing (B) a presentation about (C) renewable energy (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: We look forward (A) to hear (B) your ideas (C) at the next meeting (D).", ["A", "B", "C", "D"], "B"],
    ],
  },
  B: {
    fill: [
      ["Daniel usually ___ his notes before a test.", ["review", "reviews", "reviewed", "reviewing"], "B"],
      ["The bus had left before we ___ the station.", ["reach", "reached", "will reach", "have reach"], "B"],
      ["If enough students register, the workshop ___ next month.", ["holds", "held", "will be held", "holding"], "C"],
      ["Either the parents or the coordinator ___ the final form.", ["sign", "signs", "signing", "have signed"], "B"],
      ["The list of recommended books ___ on the noticeboard.", ["are", "were", "is", "have"], "C"],
      ["By the end of the term, they ___ four research projects.", ["complete", "completed", "will have completed", "are complete"], "C"],
      ["The room was quiet ___ several students were still working.", ["because", "although", "unless", "therefore"], "B"],
      ["The guide advises visitors ___ tickets in advance.", ["book", "booking", "to book", "booked"], "C"],
      ["This explanation is ___ precise than the first one.", ["more", "most", "many", "very"], "A"],
      ["Had the data been checked earlier, the error ___ before publication.", ["finds", "found", "would find", "would have been found"], "D"],
      ["The committee recommended that the policy ___ for one term.", ["is tested", "be tested", "was tested", "testing"], "B"],
      ["It is important ___ every source is dated and verified.", ["what", "that", "which", "who"], "B"],
      ["The proposal could reduce cost, ___ it may create privacy concerns.", ["so", "but", "because", "therefore"], "B"],
    ],
    error: [
      ["Choose the underlined part that contains an error: The information (A) were sent (B) to all families (C) on Monday (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: Every student (A) have completed (B) the first part (C) of the task (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The tutor showed us (A) how using (B) the new software (C) safely (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: These advice (A) may help families (B) compare the two options (C) more carefully (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: She succeeded (A) in finish (B) the assignment (C) before lunch (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: If they left earlier (A), they would have arrived (B) before the doors closed (C) yesterday (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: I asked (A) whether was the library open (B) during the holiday (C) this year (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: There were less (A) mistakes in the revised report (B) than in the original (C) version (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: In spite (A) the short notice, everyone (B) arrived on time (C) for the briefing (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: The second route (A) is considerably more shorter (B) than the coastal road (C) in winter (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: Neither of the answers (A) seem (B) completely accurate (C) to the reviewer (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: They are looking forward (A) to visit (B) the campus (C) next week (D).", ["A", "B", "C", "D"], "B"],
    ],
  },
  C: {
    fill: [
      ["Aisha ___ her reading log at the end of each week.", ["update", "updates", "updated", "updating"], "B"],
      ["The discussion had ended when the principal ___.", ["arrive", "arrived", "arrives", "will arrive"], "B"],
      ["If the trial is successful, the programme ___ to other classes.", ["extends", "extended", "will be extended", "has extending"], "C"],
      ["Neither the timetable nor the room numbers ___ correct.", ["was", "were", "is", "be"], "B"],
      ["The quality of the written responses ___ carefully reviewed.", ["are", "were", "is", "have"], "C"],
      ["By Friday, the team ___ all three alternatives.", ["evaluates", "evaluated", "will have evaluated", "is evaluate"], "C"],
      ["The survey was repeated ___ the original sample was too small.", ["because", "although", "unless", "despite"], "A"],
      ["The instructions require applicants ___ every section.", ["complete", "completing", "to complete", "completed"], "C"],
      ["The revised graph is ___ informative than the old one.", ["more", "most", "many", "muchest"], "A"],
      ["Had the warning been clearer, fewer users ___ the mistake.", ["make", "made", "would make", "would have made"], "D"],
      ["The editor suggested that the final paragraph ___ shortened.", ["is", "be", "was", "being"], "B"],
      ["The evidence indicates ___ access improved during the pilot.", ["what", "that", "which", "where"], "B"],
      ["The change is convenient, ___ its long-term cost remains uncertain.", ["so", "because", "but", "therefore"], "C"],
    ],
    error: [
      ["Choose the underlined part that contains an error: The research (A) were conducted (B) over two school terms (C) in three classes (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: Each participant (A) were given (B) the same amount of time (C) to respond (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The guide explains (A) how evaluating (B) an online source (C) before using it (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: Much students (A) said the new layout (B) was easier to follow (C) on a phone (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: He objected (A) to change (B) the rule without (C) a public trial (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: If the team had tested (A) the form, it will have found (B) the missing field (C) earlier (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The reviewer asked (A) why did the score change (B) after the second check (C) that morning (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The updated page contains fewer (A) text and more (B) visual examples (C) than before (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: Although of (A) the limited evidence, the report (B) made a broad recommendation (C) for every school (D).", ["A", "B", "C", "D"], "A"],
      ["Choose the underlined part that contains an error: This explanation is (A) the most clearest (B) of the three versions (C) we reviewed (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: The number of applicants (A) have increased (B) since the portal opened (C) in May (D).", ["A", "B", "C", "D"], "B"],
      ["Choose the underlined part that contains an error: We are accustomed (A) to work (B) with evidence from (C) several sources (D).", ["A", "B", "C", "D"], "B"],
    ],
  },
};

const LISTENING: Record<Variant, {
  shorts: Array<{ transcript: string; question: ChoiceSeed }>;
  conversation: { transcript: string; questions: ChoiceSeed[] };
  lecture: { transcript: string; questions: ChoiceSeed[] };
}> = {
  A: {
    shorts: [
      { transcript: "Woman: Did you print the history worksheet? Man: Not yet. The printer is busy, so I will use the one in the library after lunch.", question: ["Where will the man print the worksheet?", ["In the library", "In the classroom", "At home", "In the office"], "A"] },
      { transcript: "Man: I thought the science club met on Thursday. Woman: It usually does, but this week it has moved to Friday because the laboratory is being repaired.", question: ["Why was the science club moved?", ["The teacher is away", "The laboratory is being repaired", "Friday is a holiday", "Students requested more time"], "B"] },
      { transcript: "Woman: Are you taking the bus to the museum? Man: I was going to, but Nina offered me a ride. We will leave at nine.", question: ["How will the man travel to the museum?", ["By bus", "By train", "By car with Nina", "On foot"], "C"] },
      { transcript: "Man: The assignment is due tomorrow, isn't it? Woman: The written part is, but the presentation is not until next Monday.", question: ["What is due tomorrow?", ["The written assignment", "The presentation", "Both parts", "Neither part"], "A"] },
    ],
    conversation: {
      transcript: "Advisor: Hi, Elena. You said you wanted to discuss next term's timetable. Student: Yes. I registered for environmental science, but it meets at the same time as the advanced writing seminar. I need both courses for my programme. Advisor: The science department has another section on Wednesday afternoon. Student: I saw that, but I work at the community centre every Wednesday from two until six. Advisor: Is that job required for your scholarship? Student: No, but it pays for my transport and books, so I cannot simply give it up. Advisor: There may be a third option. The writing seminar is also offered online, although students must attend two campus workshops during the term. Student: That sounds possible. When are the workshops? Advisor: One is on a Saturday in September and the other is on a Friday in November. Student: I can attend the Saturday one. I would need to ask my supervisor about the Friday workshop. Advisor: Before changing your registration, check the online course outline. Some students find it requires more independent reading than the classroom section. Student: I am comfortable studying independently, but I want to make sure I can still get feedback on my drafts. Advisor: The lecturer holds a weekly video consultation and returns written feedback within five days. Student: In that case, I will read the outline tonight and speak to my supervisor tomorrow. If the workshop is not a problem, I will switch to the online writing seminar. Advisor: Good. Do not drop your current place until the online section confirms that a seat is available.",
      questions: [
        ["What problem does Elena have?", ["Two required courses meet at the same time", "She cannot afford the science textbook", "Her scholarship requires a new job", "The writing seminar has been cancelled"], "A"],
        ["Why can Elena not attend the Wednesday science section?", ["She has another class", "She works at the community centre", "She has no transport", "She dislikes afternoon classes"], "B"],
        ["What concern does Elena have about the online seminar?", ["Whether she will receive feedback", "Whether it includes science", "Whether it meets every Friday", "Whether it costs more"], "A"],
        ["What does the advisor tell Elena not to do yet?", ["Read the outline", "Speak to her supervisor", "Drop her current place", "Attend the video consultation"], "C"],
      ],
    },
    lecture: {
      transcript: "Today we will examine why cities create small areas of vegetation known as rain gardens. A rain garden is not simply a decorative flower bed. It is a shallow planted area designed to collect water that flows from roofs, roads, or parking spaces during a storm. In a conventional drainage system, rainwater moves quickly across hard surfaces and enters pipes. The water may carry oil, soil, litter, and other pollutants into rivers. When a storm is unusually heavy, the volume can also exceed the capacity of the pipes and contribute to local flooding. A rain garden slows this process. Water enters the planted area, spreads across the soil, and gradually soaks into the ground. Plant roots help keep the soil open, while layers of sand and organic material filter some pollutants. The garden then releases cleaner water more slowly. The choice of plants matters. A rain garden may be dry for several days and then briefly hold water after a storm. Plants therefore need to tolerate both conditions. Native species are often selected because they are adapted to local rainfall and can support insects and birds. However, native plants are not automatically suitable for every site. Designers must still consider sunlight, soil depth, and the amount of water expected. Location is equally important. A garden placed too close to a building can direct moisture toward the foundation. A garden placed on a steep slope may erode. For this reason, planners first observe how water already moves across the site. They may conduct a simple infiltration test by filling a small hole with water and measuring how quickly the level falls. If the soil drains too slowly, the design may require an overflow pipe or a different location. Rain gardens do require maintenance. During the first year, weeds must be removed and young plants may need watering. Sediment can build up where water enters, so that area needs periodic inspection. Once established, however, a well-designed rain garden can demand less irrigation than a traditional lawn. It can also create a visible example of how a city manages water. The broader lesson is that urban infrastructure does not always need to be hidden underground. Some systems can reduce risk, improve water quality, and provide habitat at the same time. Their success depends not on appearance alone, but on careful measurement, appropriate plants, and continued maintenance.",
      questions: [
        ["What is the main purpose of a rain garden?", ["To store drinking water", "To slow and filter stormwater", "To replace every drainage pipe", "To grow food in cities"], "B"],
        ["Why are native plants often chosen?", ["They never need maintenance", "They are adapted to local conditions", "They grow only in deep water", "They prevent all flooding"], "B"],
        ["What does an infiltration test measure?", ["How quickly water enters the soil", "How many insects visit", "How much sunlight reaches the plants", "How steep the slope is"], "A"],
        ["Why should a rain garden not be placed too close to a building?", ["It may block a road", "It may direct moisture toward the foundation", "It will receive too much sunlight", "It will attract birds"], "B"],
        ["What maintenance is mentioned for the first year?", ["Replacing all soil", "Removing weeds and sometimes watering", "Painting an overflow pipe", "Testing drinking water"], "B"],
        ["What broader point does the lecturer make?", ["Useful infrastructure can also provide environmental benefits", "All city systems should be underground", "Decorative gardens require no measurement", "Traditional lawns prevent pollution"], "A"],
      ],
    },
  },
  B: {
    shorts: [
      { transcript: "Man: Have you returned the calculator to the office? Woman: I tried, but it closed at four. I will take it back before class tomorrow.", question: ["When will the woman return the calculator?", ["Before class tomorrow", "At four today", "After lunch today", "Next week"], "A"] },
      { transcript: "Woman: Why are you carrying an umbrella? Man: The forecast says the rain will start in the afternoon, just as practice ends.", question: ["Why did the man bring an umbrella?", ["It is already raining", "Rain is expected after practice", "He left his coat at school", "Practice was cancelled"], "B"] },
      { transcript: "Man: Did Sara choose the blue poster? Woman: No. She liked it, but the words were too small, so the class selected the green one.", question: ["Why was the blue poster not selected?", ["Its words were too small", "Its colour was too dark", "Sara disliked it", "It was unfinished"], "A"] },
      { transcript: "Woman: The meeting begins at ten. Man: Then let us take the earlier train. The later one arrives only five minutes before it starts.", question: ["Why does the man prefer the earlier train?", ["It is cheaper", "It avoids arriving just before the meeting", "The later train is cancelled", "The meeting time changed"], "B"] },
    ],
    conversation: {
      transcript: "Librarian: Hello, Marcus. I received your request to reserve the media room for the debate team. Student: Great. We hoped to use it every Tuesday after school until the competition. Librarian: Tuesdays are available for the next three weeks, but the room is already booked on the fourth Tuesday. Student: Could we use the large study room that day? Librarian: Possibly, but it does not have recording equipment. Student: We mainly need to practise our arguments. Recording is useful because we review our speaking speed, but we can manage without it once. Librarian: Then the study room may work. How many students will attend? Student: Usually eight, plus our teacher. Librarian: That room allows ten people, so the number is fine. You must keep the door closed because another group will be taking an online examination nearby. Student: Understood. Is food allowed? We sometimes stay until seven. Librarian: Drinks in covered bottles are fine, but food is not allowed in either room. You can use the tables outside during a break. Student: That is reasonable. Can I reserve the three Tuesdays in the media room now and wait before booking the study room? Librarian: Yes. I will hold the study room for forty-eight hours. Confirm it after you ask your teacher whether practising without a recording is acceptable. Student: Thank you. I will send the team the room rules today and reply tomorrow.",
      questions: [
        ["Why can the team not use the media room every Tuesday?", ["It is too small", "It is booked on the fourth Tuesday", "It closes before seven", "Recording is prohibited"], "B"],
        ["What disadvantage does the study room have?", ["It holds fewer than eight people", "It has no recording equipment", "It is outside the library", "It cannot be reserved"], "B"],
        ["Why must the team keep the door closed?", ["Food is being served outside", "Another group will take an online examination", "The room has no heating", "The librarian is recording them"], "B"],
        ["What will Marcus do before confirming the study room?", ["Ask his teacher about practising without a recording", "Reduce the team to six people", "Buy covered bottles", "Move the competition"], "A"],
      ],
    },
    lecture: {
      transcript: "This lecture considers a familiar object: the public bench. A bench may appear to be a simple piece of street furniture, yet its design can influence how people use an entire public space. Planners first consider location. A bench beside a busy path allows people to rest without leaving the route. A bench facing a playground helps caregivers watch children. In a very hot climate, shade may matter more than a scenic view. Orientation therefore reflects the activity that the space is meant to support. Distance between benches also matters. If every seat is placed in one cluster, people who want quiet may avoid the area. If seats are too widely separated, older visitors or people with limited mobility may not have enough opportunities to rest. Some cities use an approximate walking distance between resting points, but there is no single distance that works for every population or landscape. The shape of a bench affects social interaction. A long straight bench can hold several strangers, although people often leave a gap between groups. Seats arranged at a slight angle make conversation easier. Individual seats offer personal space but may be less flexible for families. Armrests can help some users stand up safely, yet poorly positioned armrests can also prevent a parent from sitting close to a child. Materials introduce further trade-offs. Metal is durable but may become extremely hot in direct sun. Wood usually feels more comfortable, but it requires maintenance. Concrete can resist damage and movement, although it is heavy and may feel unwelcoming. Designers also need to consider how rainwater drains and whether surfaces can be repaired rather than completely replaced. To evaluate a design, observation is more useful than simply counting benches. Researchers may record who uses the seats, how long they stay, whether people move seats into the shade, and which nearby activities are connected with each location. They may also speak with users who are absent from the space, because an empty bench could indicate poor placement rather than a lack of demand. The best design is therefore not necessarily the most attractive object in a catalogue. It is the design that responds to climate, movement, safety, maintenance, and the different ways people share public space. A bench succeeds when it quietly enables people to pause, meet, watch, or recover during a journey.",
      questions: [
        ["Why might a bench face a playground?", ["To help caregivers watch children", "To protect it from rain", "To reduce maintenance", "To create a longer path"], "A"],
        ["What problem can occur if benches are too widely separated?", ["Metal becomes hotter", "Some visitors lack enough resting points", "Families sit too closely", "Paths become shaded"], "B"],
        ["What advantage can armrests provide?", ["They help some users stand", "They make every family sit together", "They prevent surfaces from heating", "They increase walking distance"], "A"],
        ["Which material is described as durable but potentially hot?", ["Wood", "Concrete", "Metal", "Plastic"], "C"],
        ["Why should researchers consider people absent from the space?", ["An empty bench may be poorly placed", "Absent users can repair benches", "They always prefer concrete", "Observation is unnecessary"], "A"],
        ["What is the lecture's main conclusion?", ["Bench design should respond to how a place is actually used", "Every city should buy the same bench", "Appearance is the only important factor", "Public benches should be grouped together"], "A"],
      ],
    },
  },
  C: {
    shorts: [
      { transcript: "Woman: I left the permission form on your desk. Man: Thanks. I will sign it after I finish this call and put it in your folder.", question: ["What will the man do with the form?", ["Mail it", "Sign it and put it in the folder", "Copy it for the class", "Take it home"], "B"] },
      { transcript: "Man: The cafeteria looks empty today. Woman: Most students are eating outside because the new tables were finally installed.", question: ["Why are most students outside?", ["The cafeteria is closed", "New outdoor tables are available", "Lunch ended early", "The weather is cold"], "B"] },
      { transcript: "Woman: Can we submit the project on Friday? Man: The teacher extended the deadline to Monday, but I would rather finish before the weekend.", question: ["When is the new deadline?", ["Friday", "Saturday", "Monday", "Tuesday"], "C"] },
      { transcript: "Man: Did the school choose the cheapest supplier? Woman: No. Its delivery time was too uncertain, so they selected the second-lowest price.", question: ["Why was the cheapest supplier rejected?", ["Its quality was poor", "Its delivery time was uncertain", "It charged a fee", "It offered too few products"], "B"] },
    ],
    conversation: {
      transcript: "Coordinator: Priya, I read your proposal for the student garden. The idea is promising, but we need a clearer plan before approval. Student: Which part is unclear? Coordinator: You explain what you want to plant, but not who will care for it during holidays. Student: The environmental club can create a rota. Several members live near the school and could visit once a week. Coordinator: That may work during short breaks. What about the six-week holiday? Student: We could choose plants that need less water and ask the grounds team to check the irrigation system. Coordinator: Speak with them before including that promise. Their schedule is already full. Student: I will. Is the budget acceptable? Coordinator: The initial cost is reasonable, but your estimate does not include replacement tools or soil delivery. Student: I assumed families would donate tools. Coordinator: Donations can help, but the project should still work if fewer donations arrive than expected. Add a small reserve to the budget. Student: All right. I also wondered whether we could sell herbs to support future costs. Coordinator: The school cannot approve sales until the food-safety rules are checked. For the first term, focus on the educational purpose and collect evidence about participation. Student: So I should revise the holiday plan, confirm support from the grounds team, and add a reserve to the budget. Coordinator: Exactly. If you return the revision by Thursday, the committee can discuss it next week.",
      questions: [
        ["What is the main weakness in Priya's original proposal?", ["It lists the wrong plants", "It lacks a clear holiday care plan", "It costs too much", "It has no educational purpose"], "B"],
        ["Why must Priya speak with the grounds team?", ["To confirm they can support irrigation checks", "To ask them to buy herbs", "To replace the environmental club", "To approve food sales"], "A"],
        ["Why does the coordinator recommend a budget reserve?", ["Tool donations may be lower than expected", "Soil delivery is free", "The garden must make a profit", "Families requested payment"], "A"],
        ["What should Priya do by Thursday?", ["Start selling herbs", "Submit a revised proposal", "Plant the garden", "Meet the full committee"], "B"],
      ],
    },
    lecture: {
      transcript: "Today we will discuss citizen science, a term used when members of the public contribute to scientific research. Participants may count birds, photograph insects, measure rainfall, classify images, or report changes in local water quality. These activities can create datasets across areas that a small professional team could not visit regularly. The approach is especially valuable when observations must be repeated over many seasons or in thousands of locations. Large numbers, however, do not automatically produce reliable evidence. Participants may use different equipment, misunderstand a category, or be more likely to report unusual events than ordinary ones. A well-designed project therefore gives clear instructions and limits tasks to observations that non-specialists can perform consistently. Training may include photographs of similar species, short practice activities, and feedback on early submissions. Digital tools can also reduce error. A phone application can record location and time automatically, prevent impossible measurements, or ask for a photograph that experts can verify later. Yet technology does not solve every problem. Poor internet access can exclude some communities, and automatic identification may repeat errors found in its training data. Researchers must decide which observations require expert review. Sampling bias presents another challenge. People often collect data near their homes, along popular trails, or in pleasant weather. A map with many reports may therefore show where participants like to go rather than where a species is most common. Project leaders can respond by assigning specific locations, encouraging reports of common as well as rare observations, and recording when participants looked but found nothing. These negative observations are important because absence can be evidence. Ethical questions also arise. Publishing the exact location of a rare plant could attract collectors, while photographs may accidentally include private property or people. Projects need rules for protecting sensitive locations and personal information. Participants should also understand how the data will be used and whether the results will be shared openly. When these issues are handled carefully, citizen science benefits both researchers and communities. Scientists gain broader coverage, while participants learn how evidence is collected and interpreted. Some projects have also changed local decisions by identifying pollution, migration patterns, or habitat loss. The strongest citizen-science programmes do not treat volunteers as free labour. They explain the research question, show how each observation contributes, report findings back to participants, and acknowledge uncertainty. In this way, public participation can expand scientific knowledge while also improving public understanding of science itself.",
      questions: [
        ["What is a major advantage of citizen science?", ["It eliminates the need for researchers", "It can collect observations across many places and times", "It guarantees equal internet access", "It focuses only on rare events"], "B"],
        ["Why are practice activities useful?", ["They help participants make observations consistently", "They replace all expert review", "They increase sampling bias", "They hide ordinary events"], "A"],
        ["What can a phone application record automatically?", ["A participant's opinion", "Location and time", "The final scientific conclusion", "Every species correctly"], "B"],
        ["What does sampling bias mean in the lecture?", ["Reports may reflect where people prefer to collect data", "Participants use too many photographs", "Experts publish all rare locations", "Projects have too few seasons"], "A"],
        ["Why can a negative observation be valuable?", ["It proves equipment failed", "Not finding something can also provide evidence", "It protects personal information", "It makes a map more attractive"], "B"],
        ["According to the lecturer, what characterises a strong programme?", ["It explains the purpose and reports findings back", "It treats volunteers only as free labour", "It avoids discussing uncertainty", "It publishes every sensitive location"], "A"],
      ],
    },
  },
};

const READING: Record<Variant, Array<{ passage: string; questions: ChoiceSeed[] }>> = {
  A: [
    {
      passage: "When a secondary school introduced a weekly silent-reading period, teachers expected students to welcome a break from normal lessons. The first month produced mixed results. Some students quickly chose books and read for the full twenty minutes. Others spent most of the period searching the shelves, repeatedly changing books, or waiting for a friend to recommend something. The school initially considered requiring every class to read the same novel. Librarians argued that this would make organisation easier but would remove the choice that helps many reluctant readers begin. Instead, they created short interest cards. Students selected topics such as sport, mysteries, science, biography, or everyday life, and the library prepared small rotating collections for each class. Teachers also began the period by reading for themselves rather than completing paperwork. After six weeks, more students started reading within the first three minutes, and book borrowing increased. The change did not mean that every student suddenly enjoyed reading. Interviews showed that some still found the available books too difficult, while others preferred articles or graphic novels to traditional fiction. The school therefore expanded the formats included in the programme and asked students to record not the number of pages completed, but one idea, question, or reaction after each session. The experiment suggests that a reading habit is not created by time alone. Access, suitable difficulty, visible adult participation, and meaningful choice all influence whether students use that time well.",
      questions: [
        ["What problem occurred during the first month?", ["The library was closed", "Some students spent much of the period choosing books", "Teachers assigned too much homework", "Every class read the same novel"], "B"],
        ["Why did librarians oppose one required novel?", ["It was too expensive", "It would reduce helpful student choice", "It contained no science", "Teachers had not read it"], "B"],
        ["What changed after six weeks?", ["Students began reading sooner and borrowing increased", "All students preferred fiction", "The reading period became longer", "Interest cards were removed"], "A"],
        ["What is the passage's main conclusion?", ["Reading time works only with novels", "Several conditions support the development of a reading habit", "Students should record page totals", "Teachers should complete paperwork quietly"], "B"],
      ],
    },
    {
      passage: "Many organisations use dashboards to turn large amounts of information into a few visible numbers, colours, and charts. A well-designed dashboard can help a team notice a problem early. A school, for example, might track attendance, assignment completion, and requests for academic support. If one measure changes sharply, staff can investigate before the issue becomes harder to address. The usefulness of a dashboard, however, depends on what its measures actually represent. A bright red indicator can create urgency even when the underlying definition is weak. Suppose a dashboard labels every unanswered message as overdue after twenty-four hours. The number may appear precise, but it does not distinguish an urgent safeguarding concern from a parent who has already received a phone call and is waiting for a written summary. Staff may then spend time reducing the visible count instead of solving the most important problems. Good dashboards therefore begin with decisions, not decoration. Designers should ask who will use each measure, what action it should support, and what evidence is needed before that action is justified. Definitions must be stable enough for comparisons over time. If the meaning of “at risk” changes each month, a rising number may reflect a new rule rather than a real deterioration. Context is also necessary. A total of twenty missed lessons means something different in a school of one hundred students and a school of two thousand. Rates, trends, and comparison groups may provide a more honest view. Yet adding every possible detail can make a dashboard unreadable. Effective design uses layers: the first view signals priorities, while a user can open the evidence behind a number when needed. Human judgement remains essential. A dashboard can show that attendance fell, but it cannot by itself determine whether the cause was illness, transport, family circumstances, or inaccurate records. Nor should a single score quietly trigger a serious decision without verification. Teams need procedures for reviewing source data, recording exceptions, and correcting errors. They should also study unintended behaviour. When performance is judged by one visible number, people may learn to improve that number without improving the outcome it was meant to represent. For this reason, useful dashboards combine quantitative measures with case notes, user feedback, and periodic review of the measures themselves. The goal is not to make complex work look simple. It is to make the next responsible question easier to see.",
      questions: [
        ["What benefit can a dashboard provide?", ["It can reveal a change that deserves investigation", "It can remove the need for staff judgement", "It can prove the cause of every problem", "It can make all definitions permanent"], "A"],
        ["Why is the twenty-four-hour message example misleading?", ["It uses too many colours", "It treats different situations as equivalent", "It includes phone calls", "It measures only schools"], "B"],
        ["What should dashboard design begin with?", ["The brightest colour", "The decisions and actions the measure should support", "The largest possible dataset", "A single overall score"], "B"],
        ["Why might a rising risk count not show real deterioration?", ["The definition may have changed", "The school may be larger", "Rates are always dishonest", "No students were counted"], "A"],
        ["What risk arises when one visible number controls performance?", ["People may optimise the number rather than the real outcome", "Users will always ignore it", "Source data becomes unnecessary", "Every case receives more context"], "A"],
        ["What is the author's central position?", ["Dashboards should simplify every decision", "Dashboards are useful only when measures, context, and verification support responsible action", "Quantitative measures should replace case notes", "Complex work should never be measured"], "B"],
      ],
    },
  ],
  B: [
    {
      passage: "A neighbourhood arts centre wanted more teenagers to attend its weekend workshops. Staff first assumed that the fee was the main barrier, so they offered several free sessions. Registration increased, but many students did not arrive. A short survey revealed a different problem: the workshops began at nine in the morning, while the first convenient bus reached the centre at nine fifteen. Staff moved the start time to ten and sent a reminder the evening before each session. Attendance improved, although another difficulty appeared. New participants often felt uncomfortable entering a room where experienced students already knew one another. The centre responded by adding a fifteen-minute welcome activity in small groups and asking instructors to explain that no previous experience was expected. After two months, both first-time attendance and return visits had increased. The centre did not conclude that free workshops, later times, or welcome activities would work everywhere. Instead, it treated each change as a small test. Staff compared registration with actual attendance, spoke with students who stopped coming, and recorded which changes helped different age groups. The project showed why access is more than price. Transport, timing, communication, and the feeling of belonging can each determine whether an opportunity that exists on paper is genuinely usable.",
      questions: [
        ["Why did free sessions not solve the original problem?", ["Students disliked art", "The bus arrived after the workshop began", "The centre cancelled reminders", "Experienced students paid more"], "B"],
        ["What helped new participants feel more comfortable?", ["A small-group welcome activity", "An earlier start", "A difficult entrance test", "Longer bus journeys"], "A"],
        ["How did staff evaluate changes?", ["They assumed one solution worked everywhere", "They compared records and spoke with students", "They counted registrations only", "They removed all instructors"], "B"],
        ["What is the main lesson?", ["Free services are always accessible", "Practical and social barriers can affect real access", "Transport is the only barrier", "Experienced students should attend alone"], "B"],
      ],
    },
    {
      passage: "Urban trees are often praised for cooling streets, reducing stormwater runoff, and improving neighbourhood appearance. These benefits are real, but a successful planting programme involves more than increasing the total number of trees. Species, location, age, maintenance, and distribution all shape the result. A city may announce that it planted ten thousand trees, yet many young trees can die within several years if roots have too little soil, watering stops too soon, or construction damages them. Survival rates can therefore be more informative than planting totals. Diversity also matters. When one species dominates a city, a single pest or disease can destroy a large part of the canopy. Planting several suitable species reduces that risk, although diversity must be planned carefully. A tree that thrives in a large park may damage pavement or overhead wires on a narrow street. Climate forecasts complicate the decision because a species suited to today's temperature may struggle several decades later. Distribution raises questions of fairness. Wealthier areas often have older, larger trees, while dense neighbourhoods with fewer private gardens receive more heat but have less space for planting. If a programme chooses only the easiest sites, it can improve the citywide total without helping residents who face the greatest heat exposure. Planners may need to redesign pavements, protect underground space, or work with housing agencies to create viable sites in these areas. Measuring benefits is not simple either. Satellite images can estimate canopy cover, but they do not show whether shade reaches a bus stop at the hottest time of day. Temperature sensors provide local evidence but may be expensive to maintain. Community reports can identify uncomfortable routes, though the reports may be unevenly distributed. Strong programmes combine these sources and publish both progress and uncertainty. Residents also influence survival. A newly planted tree near a shop may need protection from deliveries, while a tree beside a home may receive extra care from neighbours. Consultation can reveal conflicts before planting, but it should not become a way for a small number of voices to block benefits for an entire street. The most responsible goal is therefore not simply “more trees.” It is a healthy, diverse, fairly distributed canopy that continues to provide useful shade and environmental benefits over time. Reaching that goal requires long-term funding and repeated observation, not just a photograph from planting day.",
      questions: [
        ["Why can survival rates be more useful than planting totals?", ["They show whether young trees continue to live", "They count only park trees", "They ignore maintenance", "They measure bus routes"], "A"],
        ["Why is species diversity important?", ["It reduces the risk from one pest or disease", "It guarantees every tree fits every street", "It removes future climate change", "It makes watering unnecessary"], "A"],
        ["How might an easy-site strategy be unfair?", ["It may avoid neighbourhoods with the greatest heat exposure", "It plants too many large park trees", "It relies on residents", "It uses satellite images"], "A"],
        ["What limitation of satellite images is mentioned?", ["They cannot estimate canopy", "They cannot show shade at a specific place and time", "They are always too expensive", "They exclude private gardens"], "B"],
        ["What role can consultation play?", ["It can reveal conflicts before planting", "It should allow any one person to cancel a street project", "It replaces technical planning", "It guarantees long-term funding"], "A"],
        ["What is the author's preferred goal?", ["The highest possible planting announcement", "A healthy, diverse, fairly distributed canopy that lasts", "Only large trees in parks", "No change to pavement or infrastructure"], "B"],
      ],
    },
  ],
  C: [
    {
      passage: "A school introduced reusable food containers in its cafeteria to reduce disposable packaging. Students borrowed a container at lunch and returned it to a collection point after eating. During the first week, almost a quarter of the containers were not returned. Staff initially blamed carelessness, but interviews showed that many students left campus directly after lunch and could not find a collection point near the exit. The school added two return stations and allowed containers to be returned the next morning. Losses fell sharply. A second issue was confusion about cleanliness. Some students thought they had to wash the containers themselves, while others returned food inside them. Clear signs explained that students only needed to remove leftover food; the cafeteria's commercial equipment would complete the washing. Staff also began publishing the number of containers borrowed, returned, and replaced each week. The figures helped students see the environmental and financial effects of their behaviour. The programme still required more labour and water than disposable packaging, so the school did not call it a perfect solution. Instead, it compared the full costs and continued adjusting the system. The experience demonstrated that people are more likely to follow a new routine when the convenient action is also the correct action and when instructions explain what happens next.",
      questions: [
        ["Why were many containers not returned at first?", ["Students wanted to keep them", "Return points were inconvenient for students leaving campus", "The containers were too clean", "The cafeteria closed"], "B"],
        ["What were students expected to do before returning a container?", ["Wash it completely", "Remove leftover food", "Pay a replacement fee", "Take it home overnight"], "B"],
        ["Why did staff publish weekly figures?", ["To show environmental and financial effects", "To advertise disposable packaging", "To stop washing containers", "To reduce the number of return stations"], "A"],
        ["What broader lesson does the passage give?", ["Instructions are unnecessary", "A routine works better when the correct action is convenient and clear", "Reusable systems have no costs", "People change only when punished"], "B"],
      ],
    },
    {
      passage: "When organisations collect feedback, they often focus on increasing the number of responses. A large response count can be useful, but it does not guarantee that the results represent the people affected by a decision. A school might send an online survey about transport and receive hundreds of replies. If families with unreliable internet access or limited confidence in the survey language respond less often, the results may understate their needs. Improving representation requires attention to how questions are asked and who is missing. Survey length is one factor. People with strong opinions may finish a long form, while those with less time leave halfway through. Shorter forms can increase completion, but removing necessary context may produce answers that are difficult to interpret. Designers should identify the few decisions the survey must inform and keep only questions connected to those decisions. Wording is equally important. A question such as “How satisfied are you with our improved service?” assumes that the service improved and may encourage a positive answer. Neutral wording asks about the experience without suggesting the preferred response. Response options also shape evidence. A fixed list is easy to analyse but can hide an issue that the designer did not anticipate. An optional open field can reveal such issues, although reading and coding the comments requires time. Multiple channels can improve access. A survey may be offered online, on paper, by telephone, or during a meeting. This does not mean that every response should be counted as if it came from the same random sample. Staff should record the channel and consider why people chose it. They may also compare respondents with the broader population by language, location, age group, or service use, while protecting privacy. Sometimes targeted follow-up is more responsible than simply sending another general reminder. Reporting should include uncertainty and disagreement. If most respondents support a change but one group faces a serious disadvantage, an average approval rate can conceal the conflict. Decision-makers need to see both the overall pattern and the groups most affected. Feedback is also damaged when people never learn what happened next. Organisations should explain what they heard, what they changed, and what they could not change. This closes the loop and helps participants judge whether future feedback is worth their time. The aim of consultation is not to collect a number that justifies a decision already made. It is to improve understanding before action, especially by making room for experiences that are easiest to overlook.",
      questions: [
        ["Why might a high response count still be misleading?", ["It may not represent people who respond less often", "It always contains too many open questions", "It prevents analysis", "It guarantees random sampling"], "A"],
        ["What is a risk of making a survey too short?", ["Important context may be lost", "Only strong opinions remain", "Completion always falls", "The language becomes positive"], "A"],
        ["Why is the example satisfaction question biased?", ["It assumes the service improved", "It asks about transport", "It is an open question", "It records the channel"], "A"],
        ["Why should staff record the response channel?", ["People may choose channels for different reasons", "All channels create identical samples", "Telephone answers are always correct", "It removes privacy concerns"], "A"],
        ["What can an average approval rate conceal?", ["A serious disadvantage faced by one group", "The total number of replies", "Whether the form was online", "Every neutral response"], "A"],
        ["What does closing the feedback loop involve?", ["Explaining what was heard and what happened next", "Repeating the same survey", "Publishing personal details", "Ignoring changes that were impossible"], "A"],
      ],
    },
  ],
};

const WRITING: Record<Variant, [string, string]> = {
  A: [
    "Write a 50–75 word note to a teacher explaining that you cannot attend an activity and asking what you should do next.",
    "Write 175–225 words. Some schools require students to complete community service. Do you think this should be required? State your opinion and support it with reasons and examples.",
  ],
  B: [
    "Write a 50–75 word message to a classmate asking for help with a group project. Explain what help you need and when you need it.",
    "Write 175–225 words. Some people believe students learn more effectively online, while others prefer classroom learning. Which view is closer to yours? Support your opinion with reasons and examples.",
  ],
  C: [
    "Write a 50–75 word note to a school office asking for information about a club or programme that interests you.",
    "Write 175–225 words. Should schools give students more choice over the subjects they study? State your opinion and support it with reasons and examples.",
  ],
};

function choice(id: string, section: ItepAlignedSection, part: number, subskill: string, seed: ChoiceSeed, stimulus?: string, audioUrl?: string, audioTranscript?: string): ItepAlignedQuestion {
  const spec = SECTION[section];
  return {
    id,
    domain: "英语",
    subskill,
    type: "single_choice",
    prompt: seed[0],
    stimulus,
    options: seed[1].map((text, index) => ({ key: String.fromCharCode(65 + index), text })),
    answer: seed[2],
    maxScore: 1,
    expectedMinutes: 1,
    section,
    sectionLabel: spec.label,
    sectionPart: part,
    sectionDurationMinutes: spec.minutes,
    sectionInstructions: spec.instructions,
    audioUrl,
    audioTranscript,
  };
}

export function itepAlignedQuestions(formId: string, ageBand: string): ItepAlignedQuestion[] {
  const variant = (formId.slice(-1) as Variant) || "A";
  const grammar = GRAMMAR_FORMS[variant];
  const listening = LISTENING[variant];
  const reading = READING[variant];
  if (!grammar || !listening || !reading) return [];
  const prefix = `P-INT-${ageBand.replace(/\D/g, "")}-${variant}`;
  const rows: ItepAlignedQuestion[] = [];

  grammar.fill.forEach((seed, index) => rows.push(choice(`${prefix}-GR1-${index + 1}`, "GRAMMAR", 1, "语法结构", seed)));
  grammar.error.forEach((seed, index) => rows.push(choice(`${prefix}-GR2-${index + 1}`, "GRAMMAR", 2, "语法错误识别", seed)));

  const listeningBase = `/school-guide/assessment-audio/itep-${variant.toLowerCase()}`;
  listening.shorts.forEach((item, index) => rows.push(choice(
    `${prefix}-LS1-${index + 1}`, "LISTENING", 1, "听力短对话", item.question,
    undefined, `${listeningBase}-part1.mp3`, listening.shorts.map((row) => row.transcript).join("\n\n"),
  )));
  listening.conversation.questions.forEach((seed, index) => rows.push(choice(
    `${prefix}-LS2-${index + 1}`, "LISTENING", 2, "听力长对话", seed,
    undefined, `${listeningBase}-part2.mp3`, listening.conversation.transcript,
  )));
  listening.lecture.questions.forEach((seed, index) => rows.push(choice(
    `${prefix}-LS3-${index + 1}`, "LISTENING", 3, "听力讲座", seed,
    undefined, `${listeningBase}-part3.mp3`, listening.lecture.transcript,
  )));

  reading[0].questions.forEach((seed, index) => rows.push(choice(`${prefix}-RD1-${index + 1}`, "READING", 1, "阅读短文", seed, reading[0].passage)));
  reading[1].questions.forEach((seed, index) => rows.push(choice(`${prefix}-RD2-${index + 1}`, "READING", 2, "阅读长文", seed, reading[1].passage)));

  WRITING[variant].forEach((prompt, index) => {
    const spec = SECTION.WRITING;
    rows.push({
      id: `${prefix}-WR${index + 1}-1`, domain: "英语", subskill: index === 0 ? "写作短任务" : "写作观点作文",
      type: "extended_response", prompt, options: [], answer: "", maxScore: 12,
      expectedMinutes: index === 0 ? 5 : 20, section: "WRITING", sectionLabel: spec.label,
      sectionPart: index + 1, sectionDurationMinutes: spec.minutes, sectionInstructions: spec.instructions,
      rubric: index === 0
        ? "按任务完成、信息完整、语篇连贯、词汇和语法准确度评分；目标50–75词。只依据学生原文。"
        : "按观点回应、论证与例证、结构衔接、词汇范围和语法准确度评分；目标175–225词。只依据学生原文。",
    });
  });
  return rows;
}

export function itepListeningAudioJobs() {
  return (Object.keys(LISTENING) as Variant[]).flatMap((variant) => {
    const row = LISTENING[variant];
    return [
      { id: `itep-${variant.toLowerCase()}-part1`, text: row.shorts.map((item, index) => `Conversation ${index + 1}. ${item.transcript}`).join("\n\n") },
      { id: `itep-${variant.toLowerCase()}-part2`, text: row.conversation.transcript },
      { id: `itep-${variant.toLowerCase()}-part3`, text: row.lecture.transcript },
    ];
  });
}
