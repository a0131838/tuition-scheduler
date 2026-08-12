"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

type SubjectOpt = {
  id: string;
  name: string;
  courseId: string;
  courseName: string;
};

type CourseOpt = {
  id: string;
  name: string;
};

export default function TeacherCreateForm({
  subjects,
  courses,
  labels,
  initial,
  teacherId,
  onDone,
}: {
  subjects: SubjectOpt[];
  courses: CourseOpt[];
  labels: {
    teacherName: string;
    nationality: string;
    almaMater: string;
    almaMaterRule: string;
    teacherIntro: string;
    subjectsMulti: string;
    subjectSearch: string;
    subjectCourseFilter: string;
    allCourses: string;
    noSubjects: string;
    yearsExp: string;
    teachingLanguage: string;
    chinese: string;
    english: string;
    bilingual: string;
    otherLang: string;
    otherLangInput: string;
    offlineTeaching: string;
    offlineShanghai: string;
    offlineSingapore: string;
    teachingOnline: string;
    teachingHome: string;
    tutorCode: string;
    paymentMethod: string;
    paymentPayNow: string;
    paymentWise: string;
    paymentProfileStatus: string;
    paymentPendingReview: string;
    paymentVerified: string;
    paymentRejected: string;
    paymentRejectReason: string;
    payNowType: string;
    payNowMobile: string;
    payNowNric: string;
    payNowUen: string;
    payNowOther: string;
    payNowValue: string;
    payNowName: string;
    payNowNote: string;
    wiseAccountName: string;
    wiseEmail: string;
    wisePhone: string;
    wiseTag: string;
    wiseCountry: string;
    wiseCurrency: string;
    wiseNote: string;
    legacyBankDetails: string;
    bankName: string;
    bankAccountName: string;
    bankAccountNumber: string;
    bankBranchCode: string;
    add: string;
  };
  initial?: {
    name?: string;
    tutorCode?: string | null;
    paymentMethod?: string | null;
    paymentProfileStatus?: string | null;
    paymentProfileRejectReason?: string | null;
    nationality?: string;
    almaMater?: string;
    intro?: string;
    yearsExperience?: number | null;
    teachingLanguage?: string | null;
    teachingLanguageOther?: string | null;
    subjectIds?: string[];
    offlineShanghai?: boolean | null;
    offlineSingapore?: boolean | null;
    teachingOnline?: boolean | null;
    teachingHome?: boolean | null;
    payNowType?: string | null;
    payNowValue?: string | null;
    payNowName?: string | null;
    payNowNote?: string | null;
    wiseAccountName?: string | null;
    wiseEmail?: string | null;
    wisePhone?: string | null;
    wiseTag?: string | null;
    wiseCountry?: string | null;
    wiseCurrency?: string | null;
    wiseNote?: string | null;
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
    bankBranchCode?: string | null;
  };
  teacherId?: string;
  onDone?: () => void;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [courseId, setCourseId] = useState("");
  const [subjectQ, setSubjectQ] = useState("");
  const [lang, setLang] = useState(initial?.teachingLanguageOther ? "OTHER" : initial?.teachingLanguage ?? "");
  const [selectedSubjectIds, setSelectedSubjectIds] = useState<string[]>(
    initial?.subjectIds ? Array.from(new Set(initial.subjectIds)) : []
  );
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  const shownSubjects = useMemo(() => {
    const q = subjectQ.trim().toLowerCase();
    return subjects.filter((s) => {
      if (courseId && s.courseId !== courseId) return false;
      if (!q) return true;
      return `${s.courseName} ${s.name}`.toLowerCase().includes(q);
    });
  }, [subjects, courseId, subjectQ]);

  const selectedSubjects = useMemo(() => {
    const set = new Set(selectedSubjectIds);
    return subjects.filter((s) => set.has(s.id));
  }, [subjects, selectedSubjectIds]);

  const toggleSubject = (id: string) => {
    setSelectedSubjectIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  return (
    <form
      style={{ display: "grid", gap: 8, maxWidth: 860 }}
      onSubmit={async (e) => {
        e.preventDefault();
        if (busy) return;
        const formEl = e.currentTarget as HTMLFormElement;
        setErr("");
        setBusy(true);
        try {
          const fd = new FormData(formEl);
          const payload = {
            name: String(fd.get("name") ?? ""),
            nationality: String(fd.get("nationality") ?? ""),
            almaMater: String(fd.get("almaMater") ?? ""),
            intro: String(fd.get("intro") ?? ""),
            yearsExperience: String(fd.get("yearsExperience") ?? ""),
            teachingLanguage: String(fd.get("teachingLanguage") ?? ""),
            teachingLanguageOther: String(fd.get("teachingLanguageOther") ?? ""),
            offlineShanghai: String(fd.get("offlineShanghai") ?? "") === "on",
            offlineSingapore: String(fd.get("offlineSingapore") ?? "") === "on",
            teachingOnline: String(fd.get("teachingOnline") ?? "") === "on",
            teachingHome: String(fd.get("teachingHome") ?? "") === "on",
            tutorCode: String(fd.get("tutorCode") ?? ""),
            paymentMethod: String(fd.get("paymentMethod") ?? ""),
            paymentProfileStatus: String(fd.get("paymentProfileStatus") ?? ""),
            paymentProfileRejectReason: String(fd.get("paymentProfileRejectReason") ?? ""),
            payNowType: String(fd.get("payNowType") ?? ""),
            payNowValue: String(fd.get("payNowValue") ?? ""),
            payNowName: String(fd.get("payNowName") ?? ""),
            payNowNote: String(fd.get("payNowNote") ?? ""),
            wiseAccountName: String(fd.get("wiseAccountName") ?? ""),
            wiseEmail: String(fd.get("wiseEmail") ?? ""),
            wisePhone: String(fd.get("wisePhone") ?? ""),
            wiseTag: String(fd.get("wiseTag") ?? ""),
            wiseCountry: String(fd.get("wiseCountry") ?? ""),
            wiseCurrency: String(fd.get("wiseCurrency") ?? ""),
            wiseNote: String(fd.get("wiseNote") ?? ""),
            subjectIds: selectedSubjectIds,
          };

          const url = teacherId ? `/api/admin/teachers/${encodeURIComponent(teacherId)}` : "/api/admin/teachers";
          const method = teacherId ? "PATCH" : "POST";
          const res = await fetch(url, {
            method,
            headers: { "content-type": "application/json" },
            body: JSON.stringify(payload),
          });
          const data = (await res.json().catch(() => null)) as any;
          if (!res.ok || !data?.ok) {
            setErr(String(data?.message ?? `Request failed (${res.status})`));
            return;
          }

          const dlg =
            formEl.closest("dialog") ??
            (formEl.ownerDocument?.querySelector("dialog[open]") as HTMLDialogElement | null);
          if (onDone) onDone();
          else dlg?.close();

          if (!teacherId) {
            const createdId = String(data?.id ?? "");
            const target = `/admin/teachers?msg=${encodeURIComponent(`Teacher created: ${createdId}`)}&t=${Date.now()}`;
            window.location.href = target;
            return;
          }

          const y = window.scrollY;
          router.refresh();
          requestAnimationFrame(() => window.scrollTo(0, y));
        } catch (e2: any) {
          setErr(String(e2?.message ?? "Create failed"));
        } finally {
          setBusy(false);
        }
      }}
    >
      {err ? <div style={{ color: "#b00" }}>{err}</div> : null}
      <input name="name" placeholder={labels.teacherName} defaultValue={initial?.name ?? ""} />
      <input name="tutorCode" placeholder={labels.tutorCode} defaultValue={initial?.tutorCode ?? ""} />
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input name="nationality" placeholder={labels.nationality} defaultValue={initial?.nationality ?? ""} />
        <input name="almaMater" placeholder={labels.almaMater} defaultValue={initial?.almaMater ?? ""} />
      </div>
      <fieldset style={{ border: "1px solid #ddd", borderRadius: 8, padding: 10, display: "grid", gap: 8 }}>
        <legend style={{ color: "#475569", fontWeight: 700 }}>{labels.paymentMethod}</legend>
        <select name="paymentMethod" defaultValue={initial?.paymentMethod ?? ""}>
          <option value="">{labels.paymentMethod}</option>
          <option value="PAYNOW">{labels.paymentPayNow}</option>
          <option value="WISE">{labels.paymentWise}</option>
        </select>
        <select name="paymentProfileStatus" defaultValue={initial?.paymentProfileStatus ?? "PENDING_REVIEW"}>
          <option value="PENDING_REVIEW">{labels.paymentPendingReview}</option>
          <option value="VERIFIED">{labels.paymentVerified}</option>
          <option value="REJECTED">{labels.paymentRejected}</option>
        </select>
        <input name="paymentProfileRejectReason" placeholder={labels.paymentRejectReason} defaultValue={initial?.paymentProfileRejectReason ?? ""} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select name="payNowType" defaultValue={initial?.payNowType ?? ""}>
            <option value="">{labels.payNowType}</option>
            <option value="MOBILE">{labels.payNowMobile}</option>
            <option value="NRIC">{labels.payNowNric}</option>
            <option value="UEN">{labels.payNowUen}</option>
            <option value="OTHER">{labels.payNowOther}</option>
          </select>
          <input name="payNowValue" placeholder={labels.payNowValue} defaultValue={initial?.payNowValue ?? ""} />
          <input name="payNowName" placeholder={labels.payNowName} defaultValue={initial?.payNowName ?? ""} />
        </div>
        <input name="payNowNote" placeholder={labels.payNowNote} defaultValue={initial?.payNowNote ?? ""} />
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input name="wiseAccountName" placeholder={labels.wiseAccountName} defaultValue={initial?.wiseAccountName ?? ""} />
          <input name="wiseEmail" placeholder={labels.wiseEmail} defaultValue={initial?.wiseEmail ?? ""} />
          <input name="wisePhone" placeholder={labels.wisePhone} defaultValue={initial?.wisePhone ?? ""} />
          <input name="wiseTag" placeholder={labels.wiseTag} defaultValue={initial?.wiseTag ?? ""} />
          <input name="wiseCountry" placeholder={labels.wiseCountry} defaultValue={initial?.wiseCountry ?? ""} />
          <input name="wiseCurrency" placeholder={labels.wiseCurrency} defaultValue={initial?.wiseCurrency ?? ""} />
        </div>
        <input name="wiseNote" placeholder={labels.wiseNote} defaultValue={initial?.wiseNote ?? ""} />
        {(initial?.bankName || initial?.bankAccountName || initial?.bankAccountNumber || initial?.bankBranchCode) ? (
          <div style={{ border: "1px dashed #cbd5e1", borderRadius: 8, padding: 8, color: "#475569", fontSize: 12 }}>
            <b>{labels.legacyBankDetails}</b>
            <div>{initial?.bankName ?? "-"} {initial?.bankAccountName ?? ""} {initial?.bankAccountNumber ?? ""} {initial?.bankBranchCode ?? ""}</div>
          </div>
        ) : null}
      </fieldset>
      <div style={{ color: "#666", fontSize: 12 }}>{labels.almaMaterRule}</div>
      <textarea name="intro" rows={3} placeholder={labels.teacherIntro} defaultValue={initial?.intro ?? ""} />

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#666", fontSize: 12 }}>{labels.subjectCourseFilter}</span>
          <select value={courseId} onChange={(e) => setCourseId(e.target.value)}>
            <option value="">{labels.allCourses}</option>
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ color: "#666", fontSize: 12 }}>{labels.subjectSearch}</span>
          <input value={subjectQ} onChange={(e) => setSubjectQ(e.target.value)} placeholder={labels.subjectSearch} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ minWidth: 420, maxWidth: 560, border: "1px solid #ddd", borderRadius: 8, padding: 8 }}>
          <div style={{ maxHeight: 220, overflow: "auto", display: "grid", gap: 6 }}>
            {shownSubjects.map((s) => (
              <label key={s.id} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <input
                  type="checkbox"
                  checked={selectedSubjectIds.includes(s.id)}
                  onChange={() => toggleSubject(s.id)}
                />
                <span>
                  {s.courseName} - {s.name}
                </span>
              </label>
            ))}
            {shownSubjects.length === 0 ? <div style={{ color: "#999" }}>{labels.noSubjects}</div> : null}
          </div>
        </div>
        <span style={{ color: "#666" }}>{labels.subjectsMulti}</span>

        <input
          name="yearsExperience"
          type="number"
          min={0}
          placeholder={labels.yearsExp}
          defaultValue={initial?.yearsExperience ?? ""}
          style={{ width: 220 }}
        />

        <select
          name="teachingLanguage"
          value={lang}
          onChange={(e) => setLang(e.target.value)}
        >
          <option value="">{labels.teachingLanguage}</option>
          <option value="CHINESE">{labels.chinese}</option>
          <option value="ENGLISH">{labels.english}</option>
          <option value="BILINGUAL">{labels.bilingual}</option>
          <option value="OTHER">{labels.otherLang}</option>
        </select>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ color: "#666", fontSize: 12 }}>{labels.offlineTeaching}</span>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="offlineShanghai" defaultChecked={!!initial?.offlineShanghai} />
          {labels.offlineShanghai}
        </label>
        <label style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
          <input type="checkbox" name="offlineSingapore" defaultChecked={!!initial?.offlineSingapore} />
          {labels.offlineSingapore}
        </label>
        <label>
          <input type="checkbox" name="teachingOnline" defaultChecked={!!initial?.teachingOnline} />
          {labels.teachingOnline}
        </label>
        <label>
          <input type="checkbox" name="teachingHome" defaultChecked={!!initial?.teachingHome} />
          {labels.teachingHome}
        </label>
      </div>

      {selectedSubjects.length > 0 ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {selectedSubjects.map((s) => (
            <span
              key={s.id}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                border: "1px solid #ddd",
                borderRadius: 999,
                padding: "4px 10px",
                background: "#fafafa",
              }}
            >
              {s.courseName} - {s.name}
              <button
                type="button"
                aria-label="Remove subject"
                onClick={() => toggleSubject(s.id)}
                style={{ border: 0, background: "transparent", cursor: "pointer" }}
              >
                x
              </button>
            </span>
          ))}
        </div>
      ) : null}

      {selectedSubjectIds.map((id) => (
        <input key={id} type="hidden" name="subjectIds" value={id} />
      ))}

      {lang === "OTHER" ? (
        <input
          name="teachingLanguageOther"
          placeholder={labels.otherLangInput}
          defaultValue={initial?.teachingLanguageOther ?? ""}
          required
        />
      ) : null}

      <button type="submit" disabled={busy}>
        {busy ? `${labels.add}...` : labels.add}
      </button>
    </form>
  );
}
