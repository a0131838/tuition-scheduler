"use client";

import { useMemo, useState } from "react";

const COURSE_LINES = [
  ["INTERNATIONAL_SCHOOL_ADMISSION", "International School Admission / 国际学校入学"],
  ["AEIS_ADMISSION", "AEIS Admission / AEIS 入学"],
  ["ACADEMIC_ENGLISH_COMMUNICATION", "Academic English / 学术英文"],
  ["STANDARDIZED_ENGLISH_TESTS", "Standardized English Tests / 标准化英语考试"],
  ["ACADEMIC_SUBJECT_BRIDGING", "Academic Subject Bridging / 学科桥梁"],
  ["SCHOLARSHIP_SELECTION_TESTS", "Scholarship Selection / 奖学金选拔"],
  ["HIGHER_EDUCATION_SUPPORT", "Higher Education Support / 大学学术支持"],
  ["NOT_FOR_EDUTRUST", "Not for EduTrust / 不纳入"],
] as const;

const DELIVERY_MODES = [
  ["ONE_TO_ONE", "One-to-one / 一对一"],
  ["GROUP", "Group / 小班"],
  ["BLENDED", "Blended / 混合"],
  ["ONLINE", "Online / 线上"],
  ["OTHER", "Other / 其他"],
] as const;

const PERMISSION_STATUSES = [
  ["NOT_FOR_EDUTRUST", "Not for EduTrust / 不纳入"],
  ["DRAFT", "Draft / 草稿"],
  ["READY_FOR_SSG", "Ready for SSG / 可准备提交"],
  ["SUBMITTED", "Submitted / 已提交"],
  ["PERMITTED", "Permitted / 已获准"],
  ["RETIRED", "Retired / 停用"],
] as const;

const COURSE_FILE_STATUSES = [
  ["NOT_STARTED", "Not started / 未开始"],
  ["DRAFTING", "Drafting / 草拟中"],
  ["READY_FOR_REVIEW", "Ready for review / 可审核"],
  ["APPROVED", "Approved / 已批准"],
  ["NEEDS_UPDATE", "Needs update / 待更新"],
] as const;

type ProfileDraft = {
  courseId: string;
  isEduTrustCourse: boolean;
  courseLine: string;
  complianceName: string;
  publicName: string;
  trackLabel: string;
  minTotalHours: number;
  deliveryMode: string;
  permissionStatus: string;
  courseFileStatus: string;
  note: string;
  courseFile: CourseFileDraft;
};

type CourseFileDraft = {
  courseWriteup: string;
  admissionRequirements: string;
  learningOutcomes: string;
  syllabus: string;
  lessonPlan: string;
  assessmentPlan: string;
  teacherDeployment: string;
  academicBoardApproval: string;
  examinationBoardApproval: string;
  courseReview: string;
  evidenceNotes: string;
  approvedBy: string;
};

type CourseRow = {
  id: string;
  operationalName: string;
  subjects: string;
  packageCount: number;
  activePackageCount: number;
  lowHourPackageCount: number;
  classCount: number;
  oneOnOneClassCount: number;
  suggested: ProfileDraft;
  profile: ProfileDraft | null;
};

function textInputStyle() {
  return {
    width: "100%",
    boxSizing: "border-box" as const,
    border: "1px solid #cbd5e1",
    borderRadius: 8,
    padding: "7px 9px",
    fontSize: 13,
    background: "#fff",
  };
}

function selectStyle() {
  return {
    ...textInputStyle(),
    padding: "7px 8px",
  };
}

function textareaStyle() {
  return {
    ...textInputStyle(),
    minHeight: 82,
    resize: "vertical" as const,
    lineHeight: 1.45,
  };
}

const COURSE_FILE_FIELDS: Array<{ key: keyof CourseFileDraft; label: string; hint: string }> = [
  {
    key: "courseWriteup",
    label: "Course write-up / 课程说明",
    hint: "Purpose, target learners, course duration, delivery mode, and course positioning.",
  },
  {
    key: "admissionRequirements",
    label: "Admission requirements / 入学要求",
    hint: "Minimum age, language level, prior learning, placement test, or diagnostic criteria.",
  },
  {
    key: "learningOutcomes",
    label: "Learning outcomes / 学习成果",
    hint: "Measurable outcomes students should achieve by course completion.",
  },
  {
    key: "syllabus",
    label: "Syllabus / 课程大纲",
    hint: "Modules, topics, hours, sequence, and pathway notes.",
  },
  {
    key: "lessonPlan",
    label: "Lesson plan / 课时计划",
    hint: "How the standard syllabus is delivered in one-to-one, group, blended, or online modes.",
  },
  {
    key: "assessmentPlan",
    label: "Assessment plan / 评估计划",
    hint: "Assessment modes, frequency, weighting, grading, award or completion criteria.",
  },
  {
    key: "teacherDeployment",
    label: "Teacher deployment / 老师配置",
    hint: "Teacher qualification criteria, deployment rules, and Academic Board approval basis.",
  },
  {
    key: "academicBoardApproval",
    label: "Academic Board approval / 学术委员会审批",
    hint: "Meeting date, approver, decision, and follow-up actions.",
  },
  {
    key: "examinationBoardApproval",
    label: "Examination Board approval / 考试委员会审批",
    hint: "Assessment approval, moderation approach, appeal handling, and decision record.",
  },
  {
    key: "courseReview",
    label: "Course review / 课程复盘",
    hint: "Student feedback, assessment results, teacher feedback, trend data, and improvement actions.",
  },
  {
    key: "evidenceNotes",
    label: "Evidence notes / 证据备注",
    hint: "Where related attendance, assessment, feedback, contract, or review samples are kept.",
  },
  {
    key: "approvedBy",
    label: "Approved by / 批准人",
    hint: "Management representative, Academic Board chair, or authorised approver.",
  },
];

export default function EduTrustCourseProfilesClient({ rows }: { rows: CourseRow[] }) {
  const initialDrafts = useMemo(() => {
    return Object.fromEntries(rows.map((row) => [row.id, row.profile ?? row.suggested]));
  }, [rows]);
  const [drafts, setDrafts] = useState<Record<string, ProfileDraft>>(initialDrafts);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messageById, setMessageById] = useState<Record<string, string>>({});

  function patchDraft(courseId: string, patch: Partial<ProfileDraft>) {
    setDrafts((prev) => ({ ...prev, [courseId]: { ...prev[courseId], ...patch } }));
  }

  function patchCourseFile(courseId: string, patch: Partial<CourseFileDraft>) {
    setDrafts((prev) => ({
      ...prev,
      [courseId]: {
        ...prev[courseId],
        courseFile: { ...prev[courseId].courseFile, ...patch },
      },
    }));
  }

  async function save(row: CourseRow) {
    const draft = drafts[row.id];
    setBusyId(row.id);
    setMessageById((prev) => ({ ...prev, [row.id]: "" }));
    try {
      const res = await fetch("/api/admin/edutrust/course-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.message || "Save failed");
      setMessageById((prev) => ({ ...prev, [row.id]: "Saved / 已保存" }));
    } catch (err) {
      setMessageById((prev) => ({ ...prev, [row.id]: err instanceof Error ? err.message : "Save failed" }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div style={{ display: "grid", gap: 12 }}>
      {rows.map((row) => {
        const draft = drafts[row.id];
        const enabled = draft.isEduTrustCourse;
        return (
          <section
            key={row.id}
            style={{
              border: "1px solid #dbe3ef",
              borderRadius: 12,
              background: "#fff",
              padding: 14,
              display: "grid",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: "#0f172a" }}>{row.operationalName}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{row.subjects || "No subjects / 暂无科目"}</div>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", fontSize: 12 }}>
                <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px" }}>
                  Packages {row.activePackageCount}/{row.packageCount}
                </span>
                <span style={{ border: "1px solid #cbd5e1", borderRadius: 999, padding: "4px 8px" }}>
                  1:1 {row.oneOnOneClassCount}/{row.classCount}
                </span>
                {row.lowHourPackageCount > 0 ? (
                  <span style={{ border: "1px solid #fed7aa", color: "#9a3412", background: "#fff7ed", borderRadius: 999, padding: "4px 8px" }}>
                    {row.lowHourPackageCount} low-hour package(s)
                  </span>
                ) : null}
              </div>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>EduTrust 主证据</span>
                <select
                  value={enabled ? "yes" : "no"}
                  onChange={(event) => {
                    const nextEnabled = event.target.value === "yes";
                    patchDraft(row.id, {
                      isEduTrustCourse: nextEnabled,
                      courseLine: nextEnabled && draft.courseLine === "NOT_FOR_EDUTRUST" ? row.suggested.courseLine : draft.courseLine,
                      permissionStatus: nextEnabled && draft.permissionStatus === "NOT_FOR_EDUTRUST" ? "DRAFT" : "NOT_FOR_EDUTRUST",
                    });
                  }}
                  style={selectStyle()}
                >
                  <option value="yes">Yes / 纳入</option>
                  <option value="no">No / 不纳入</option>
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>EduTrust 课程线</span>
                <select value={draft.courseLine} onChange={(event) => patchDraft(row.id, { courseLine: event.target.value })} style={selectStyle()}>
                  {COURSE_LINES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>最低总课时</span>
                <input
                  type="number"
                  min={0}
                  value={draft.minTotalHours}
                  onChange={(event) => patchDraft(row.id, { minTotalHours: Number(event.target.value) })}
                  style={textInputStyle()}
                />
              </label>

              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>授课方式</span>
                <select value={draft.deliveryMode} onChange={(event) => patchDraft(row.id, { deliveryMode: event.target.value })} style={selectStyle()}>
                  {DELIVERY_MODES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>EduTrust 合规课程名</span>
                <input value={draft.complianceName} onChange={(event) => patchDraft(row.id, { complianceName: event.target.value })} style={textInputStyle()} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>对外展示名</span>
                <input value={draft.publicName} onChange={(event) => patchDraft(row.id, { publicName: event.target.value })} style={textInputStyle()} />
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Track / Pathway</span>
                <input value={draft.trackLabel} onChange={(event) => patchDraft(row.id, { trackLabel: event.target.value })} style={textInputStyle()} />
              </label>
            </div>

            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>SSG permission 状态</span>
                <select value={draft.permissionStatus} onChange={(event) => patchDraft(row.id, { permissionStatus: event.target.value })} style={selectStyle()}>
                  {PERMISSION_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>Course file 状态</span>
                <select value={draft.courseFileStatus} onChange={(event) => patchDraft(row.id, { courseFileStatus: event.target.value })} style={selectStyle()}>
                  {COURSE_FILE_STATUSES.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              <label style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                <span>备注</span>
                <input value={draft.note} onChange={(event) => patchDraft(row.id, { note: event.target.value })} style={textInputStyle()} />
              </label>
            </div>

            <details style={{ border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc", padding: 12 }}>
              <summary style={{ cursor: "pointer", fontWeight: 800, color: "#0f172a" }}>
                Course File / 课程文件
                <span style={{ marginLeft: 8, color: "#64748b", fontSize: 12, fontWeight: 500 }}>
                  GD4 Criterion 5 evidence
                </span>
              </summary>
              <div style={{ marginTop: 12, display: "grid", gap: 10 }}>
                <div style={{ color: "#64748b", fontSize: 12, lineHeight: 1.45 }}>
                  这里先沉淀官方审核会看的课程文件内容；不会改变排课、课包、老师或学生数据。
                </div>
                <div style={{ display: "grid", gap: 10, gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))" }}>
                  {COURSE_FILE_FIELDS.map((field) => (
                    <label key={field.key} style={{ display: "grid", gap: 5, fontSize: 12, color: "#475569" }}>
                      <span>{field.label}</span>
                      <textarea
                        value={draft.courseFile[field.key]}
                        onChange={(event) => patchCourseFile(row.id, { [field.key]: event.target.value })}
                        placeholder={field.hint}
                        style={textareaStyle()}
                      />
                    </label>
                  ))}
                </div>
              </div>
            </details>

            <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => patchDraft(row.id, row.suggested)}
                style={{ border: "1px solid #cbd5e1", background: "#f8fafc", borderRadius: 8, padding: "7px 10px" }}
              >
                Apply suggestion / 使用建议
              </button>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                {messageById[row.id] ? <span style={{ fontSize: 12, color: messageById[row.id].includes("Saved") ? "#166534" : "#b91c1c" }}>{messageById[row.id]}</span> : null}
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => save(row)}
                  style={{ border: "1px solid #2563eb", background: "#2563eb", color: "#fff", borderRadius: 8, padding: "8px 12px", fontWeight: 700 }}
                >
                  {busyId === row.id ? "Saving..." : "Save mapping / 保存映射"}
                </button>
              </div>
            </div>
          </section>
        );
      })}
    </div>
  );
}
