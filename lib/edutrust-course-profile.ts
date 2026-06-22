import {
  EduTrustCourseFileStatus,
  EduTrustCourseLine,
  EduTrustDeliveryMode,
  EduTrustPermissionStatus,
} from "@prisma/client";

export const EDUTRUST_MIN_HOURS = 50;

export const EDUTRUST_COURSE_LINE_LABELS: Record<
  EduTrustCourseLine,
  { en: string; zh: string; complianceName: string; publicName: string }
> = {
  INTERNATIONAL_SCHOOL_ADMISSION: {
    en: "International School Admission",
    zh: "国际学校入学",
    complianceName: "Preparatory Course for International School Admission",
    publicName: "International School Admission Preparation",
  },
  AEIS_ADMISSION: {
    en: "AEIS Admission",
    zh: "AEIS 入学",
    complianceName: "Preparatory Course for AEIS Admission",
    publicName: "AEIS Admission Preparation",
  },
  ACADEMIC_ENGLISH_COMMUNICATION: {
    en: "Academic English and Communication",
    zh: "学术英文与沟通",
    complianceName: "Certificate in Academic English and Communication Skills",
    publicName: "Academic English and Communication Skills",
  },
  STANDARDIZED_ENGLISH_TESTS: {
    en: "Standardized English Tests",
    zh: "标准化英语考试",
    complianceName: "Preparatory Course for Standardized English Tests",
    publicName: "IELTS / TOEFL / PTE / DET Preparation",
  },
  ACADEMIC_SUBJECT_BRIDGING: {
    en: "Academic Subject Bridging",
    zh: "学科桥梁",
    complianceName: "Academic Subject Bridging Programme",
    publicName: "Academic Subject Bridging Programme",
  },
  SCHOLARSHIP_SELECTION_TESTS: {
    en: "Scholarship and Selection Tests",
    zh: "奖学金与选拔考试",
    complianceName: "Preparatory Course for Scholarship and Selection Tests",
    publicName: "Scholarship and Selection Test Preparation",
  },
  HIGHER_EDUCATION_SUPPORT: {
    en: "Higher Education Support",
    zh: "大学学术支持",
    complianceName: "Academic Support Programme for Higher Education",
    publicName: "Higher Education Academic Support",
  },
  NOT_FOR_EDUTRUST: {
    en: "Not for EduTrust",
    zh: "不纳入 EduTrust",
    complianceName: "",
    publicName: "",
  },
};

export function suggestEduTrustCourseLine(courseName: string): EduTrustCourseLine {
  const name = courseName.trim().toLowerCase();
  if (!name) return "NOT_FOR_EDUTRUST";
  if (name.includes("国际学校") || name.includes("eal camp")) return "INTERNATIONAL_SCHOOL_ADMISSION";
  if (name.includes("aeis")) return "AEIS_ADMISSION";
  if (name.includes("英语口语") || name.includes("英文评估")) return "ACADEMIC_ENGLISH_COMMUNICATION";
  if (name.includes("standardized english") || name.includes("sat")) return "STANDARDIZED_ENGLISH_TESTS";
  if (
    name.includes("ib") ||
    name.includes("igcse") ||
    name.includes("a-level") ||
    name.includes("gce-a level") ||
    name.includes("olevel") ||
    name.includes("wace")
  ) {
    return "ACADEMIC_SUBJECT_BRIDGING";
  }
  if (name.includes("奖学金") || name.includes("sm2")) return "SCHOLARSHIP_SELECTION_TESTS";
  if (name.includes("大学")) return "HIGHER_EDUCATION_SUPPORT";
  return "NOT_FOR_EDUTRUST";
}

export function defaultEduTrustProfileForCourse(courseName: string) {
  const courseLine = suggestEduTrustCourseLine(courseName);
  const labels = EDUTRUST_COURSE_LINE_LABELS[courseLine];
  const isEduTrustCourse = courseLine !== "NOT_FOR_EDUTRUST";
  return {
    isEduTrustCourse,
    courseLine,
    complianceName: labels.complianceName || null,
    publicName: labels.publicName || null,
    trackLabel: null as string | null,
    minTotalHours: EDUTRUST_MIN_HOURS,
    deliveryMode: "ONE_TO_ONE" as EduTrustDeliveryMode,
    permissionStatus: isEduTrustCourse
      ? ("DRAFT" as EduTrustPermissionStatus)
      : ("NOT_FOR_EDUTRUST" as EduTrustPermissionStatus),
    courseFileStatus: "NOT_STARTED" as EduTrustCourseFileStatus,
    note: null as string | null,
  };
}

export function packageMinutesBelowEduTrustMinimum(totalMinutes: number | null | undefined, minTotalHours = EDUTRUST_MIN_HOURS) {
  if (!totalMinutes || totalMinutes <= 0) return true;
  return totalMinutes < minTotalHours * 60;
}
