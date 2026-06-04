export type SchoolApplicationTargetKind = "INTERNATIONAL_SCHOOL" | "MOE_EXERCISE";

export type SchoolApplicationTarget = {
  id: string;
  name: string;
  kind: SchoolApplicationTargetKind;
  country: string;
  area?: string;
  programmes: string[];
  grades: string[];
  intakes: string[];
  officialFee?: number;
  officialFeeMode?: string;
  note?: string;
};

export const SCHOOL_APPLICATION_PROGRAMMES = [
  "Early Years",
  "Primary",
  "Secondary",
  "IGCSE",
  "IB Diploma",
  "A-Level",
  "Boarding",
  "AEIS",
  "S-AEIS",
  "P1 Registration",
  "Transfer Admission",
] as const;

export const SCHOOL_APPLICATION_GRADES = [
  "Nursery",
  "K1",
  "K2",
  "Grade 1 / Year 1 / P1",
  "Grade 2 / Year 2 / P2",
  "Grade 3 / Year 3 / P3",
  "Grade 4 / Year 4 / P4",
  "Grade 5 / Year 5 / P5",
  "Grade 6 / Year 6 / P6",
  "Grade 7 / Year 7 / Sec 1",
  "Grade 8 / Year 8 / Sec 2",
  "Grade 9 / Year 9 / Sec 3",
  "Grade 10 / Year 10 / Sec 4",
  "Grade 11 / Year 11",
  "Grade 12 / Year 12",
  "Grade 13 / Year 13",
  "AEIS Primary 2",
  "AEIS Primary 3",
  "AEIS Primary 4",
  "AEIS Primary 5",
  "AEIS Secondary 1",
  "AEIS Secondary 2",
  "AEIS Secondary 3",
] as const;

export const SCHOOL_APPLICATION_INTAKES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
  "Rolling intake",
  "2026 AEIS",
  "2026 S-AEIS",
] as const;

const allGrades = [...SCHOOL_APPLICATION_GRADES];
const internationalProgrammes = ["Early Years", "Primary", "Secondary", "IGCSE", "IB Diploma", "A-Level"];
const internationalIntakes = ["January", "August", "September", "Rolling intake"];

function intl(
  id: string,
  name: string,
  options: Partial<SchoolApplicationTarget> = {},
): SchoolApplicationTarget {
  return {
    id,
    name,
    kind: "INTERNATIONAL_SCHOOL",
    country: "Singapore",
    programmes: options.programmes ?? internationalProgrammes,
    grades: options.grades ?? allGrades.slice(0, 16),
    intakes: options.intakes ?? internationalIntakes,
    officialFeeMode: "Parent pays school / official fee varies",
    ...options,
  };
}

export const SCHOOL_APPLICATION_TARGETS: SchoolApplicationTarget[] = [
  {
    id: "moe-aeis-primary",
    name: "MOE AEIS Primary",
    kind: "MOE_EXERCISE",
    country: "Singapore",
    programmes: ["AEIS"],
    grades: ["AEIS Primary 2", "AEIS Primary 3", "AEIS Primary 4", "AEIS Primary 5"],
    intakes: ["2026 AEIS"],
    officialFee: 340,
    officialFeeMode: "MOE application fee, non-refundable",
    note: "For international students seeking Primary 2 to Primary 5 admission to mainstream schools.",
  },
  {
    id: "moe-aeis-secondary",
    name: "MOE AEIS Secondary",
    kind: "MOE_EXERCISE",
    country: "Singapore",
    programmes: ["AEIS"],
    grades: ["AEIS Secondary 1", "AEIS Secondary 2", "AEIS Secondary 3"],
    intakes: ["2026 AEIS"],
    officialFee: 630,
    officialFeeMode: "MOE application fee, non-refundable",
    note: "For international students seeking Secondary 1 to Secondary 3 admission to mainstream schools.",
  },
  {
    id: "moe-s-aeis-primary",
    name: "MOE S-AEIS Primary",
    kind: "MOE_EXERCISE",
    country: "Singapore",
    programmes: ["S-AEIS"],
    grades: ["AEIS Primary 2", "AEIS Primary 3", "AEIS Primary 4"],
    intakes: ["2026 S-AEIS"],
    officialFee: 340,
    officialFeeMode: "MOE application fee, non-refundable",
    note: "Supplementary admissions exercise for selected mainstream primary levels.",
  },
  {
    id: "moe-s-aeis-secondary",
    name: "MOE S-AEIS Secondary",
    kind: "MOE_EXERCISE",
    country: "Singapore",
    programmes: ["S-AEIS"],
    grades: ["AEIS Secondary 1", "AEIS Secondary 2"],
    intakes: ["2026 S-AEIS"],
    officialFee: 630,
    officialFeeMode: "MOE application fee, non-refundable",
    note: "Supplementary admissions exercise for selected mainstream secondary levels.",
  },
  {
    id: "moe-p1-international-interest",
    name: "MOE P1 International Student Registration Interest",
    kind: "MOE_EXERCISE",
    country: "Singapore",
    programmes: ["P1 Registration"],
    grades: ["Grade 1 / Year 1 / P1"],
    intakes: ["January"],
    officialFeeMode: "MOE process / official fees may vary",
    note: "Indication of interest is not registration and does not guarantee a place.",
  },
  intl("acs-international", "ACS International Singapore"),
  intl("australian-international-school", "Australian International School Singapore"),
  intl("brighton-college-singapore", "Brighton College (Singapore)", { programmes: ["Early Years", "Primary", "Secondary"] }),
  intl("canadian-international-school", "Canadian International School"),
  intl("chatsworth-international-school", "Chatsworth International School"),
  intl("dover-court-international-school", "Dover Court International School"),
  intl("dulwich-college-singapore", "Dulwich College (Singapore)"),
  intl("etonhouse-international-school", "EtonHouse International School"),
  intl("german-european-school-singapore", "German European School Singapore (GESS)"),
  intl("global-indian-international-school", "Global Indian International School"),
  intl("hillside-world-academy", "Hillside World Academy"),
  intl("hollandse-school", "Hollandse School"),
  intl("hwa-chong-international-school", "Hwa Chong International School", { programmes: ["Secondary", "IB Diploma"] }),
  intl("integrated-international-school", "Integrated International School"),
  intl("international-community-school", "International Community School Singapore"),
  intl("iss-international-school", "ISS International School"),
  intl("invictus-international-school", "Invictus International School"),
  intl("knightsbridge-house-international-school", "Knightsbridge House International School"),
  intl("lycee-francais-singapour", "International French School (Singapore) / LFS"),
  intl("middleton-international-school", "Middleton International School"),
  intl("nexus-international-school", "Nexus International School Singapore"),
  intl("north-london-collegiate-school", "North London Collegiate School (Singapore)"),
  intl("nps-international-school", "NPS International School"),
  intl("one-world-international-school", "One World International School"),
  intl("overseas-family-school", "Overseas Family School"),
  intl("perse-school-singapore", "The Perse School Singapore", { programmes: ["Primary", "Secondary"] }),
  intl("sji-international", "SJI International School"),
  intl("singapore-american-school", "Singapore American School"),
  intl("singapore-japanese-school", "The Japanese School Singapore"),
  intl("singapore-korean-international-school", "Singapore Korean International School"),
  intl("sir-manasseh-meyer-international-school", "Sir Manasseh Meyer International School"),
  intl("stamford-american-international-school", "Stamford American International School"),
  intl("swiss-school-in-singapore", "Swiss School in Singapore"),
  intl("tanglin-trust-school", "Tanglin Trust School"),
  intl("uwcsea-dover", "United World College of South East Asia (Dover)"),
  intl("uwcsea-east", "United World College of South East Asia (East)"),
  intl("waseda-shibuya-senior-high-school", "Waseda Shibuya Senior High School"),
  intl("xcl-american-academy", "XCL American Academy", { programmes: ["Early Years", "Primary", "Secondary"] }),
  intl("xcl-world-academy", "XCL World Academy"),
];

const targetById = new Map(SCHOOL_APPLICATION_TARGETS.map((target) => [target.id, target] as const));

export function getSchoolApplicationTarget(id: string | null | undefined) {
  return id ? targetById.get(id) ?? null : null;
}
