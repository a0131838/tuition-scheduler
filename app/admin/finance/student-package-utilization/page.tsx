import { requireAdmin } from "@/lib/auth";
import { formatBusinessDateOnly } from "@/lib/date-only";
import { getLang, t } from "@/lib/i18n";
import { loadStudentPackageUtilizationReport } from "@/lib/student-package-utilization-report";
import {
  workbenchFilterPanelStyle,
  workbenchHeroStyle,
  workbenchMetricCardStyle,
  workbenchMetricLabelStyle,
  workbenchMetricValueStyle,
} from "@/app/admin/_components/workbenchStyles";

type Search = {
  studentName?: string;
  studentId?: string;
  packageId?: string;
  startDate?: string;
  endDate?: string;
};

function buildExportHref(input: Search) {
  const params = new URLSearchParams();
  if (input.studentId) params.set("studentId", input.studentId);
  if (input.studentName) params.set("studentName", input.studentName);
  if (input.packageId) params.set("packageId", input.packageId);
  if (input.startDate) params.set("startDate", input.startDate);
  if (input.endDate) params.set("endDate", input.endDate);
  return `/api/exports/student-package-utilization?${params.toString()}`;
}

function trimInput(value: string | undefined) {
  return String(value ?? "").trim();
}

export default async function StudentPackageUtilizationPage({
  searchParams,
}: {
  searchParams?: Promise<Search>;
}) {
  await requireAdmin();
  const lang = await getLang();
  const sp = await searchParams;
  const studentName = trimInput(sp?.studentName);
  const studentId = trimInput(sp?.studentId);
  const packageId = trimInput(sp?.packageId);
  const startDate = trimInput(sp?.startDate);
  const endDate = trimInput(sp?.endDate) || formatBusinessDateOnly(new Date());
  const hasQuery = Boolean(studentName || studentId);
  const report = hasQuery
    ? await loadStudentPackageUtilizationReport({ studentName, studentId, packageId, startDate, endDate })
    : null;
  const exportHref = report && report.ok && report.student && !report.needDisambiguation
    ? buildExportHref({ studentName, studentId: report.student.studentId, packageId, startDate, endDate })
    : "";

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <section style={workbenchHeroStyle("blue")}>
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ fontSize: 12, fontWeight: 800, color: "#1d4ed8", letterSpacing: 0.3 }}>
            {t(lang, "Student Package Utilization", "学生课包使用提取")}
          </div>
          <h1 style={{ margin: 0 }}>{t(lang, "Attendance-based Package Usage", "按出勤拆分课包使用")}</h1>
          <div style={{ color: "#475569", lineHeight: 1.5 }}>
            {t(
              lang,
              "Extract one student's deducted package hours by attendance row, so shared packages can be split between siblings.",
              "按单个学生的出勤扣课记录提取课包使用量，适合兄妹共享课包时分别计算。"
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <a href="/admin/finance/workbench">{t(lang, "Back to finance workbench", "返回财务工作台")}</a>
          <a href="/admin/finance/individual-student-utility">{t(lang, "Open period utility report", "打开周期课时使用报表")}</a>
          {exportHref ? <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a> : null}
        </div>
      </section>

      <form style={{ ...workbenchFilterPanelStyle, display: "grid", gap: 12 }}>
        <div style={{ display: "grid", gap: 4 }}>
          <div style={{ fontWeight: 800, color: "#0f172a" }}>{t(lang, "Extract controls", "提取条件")}</div>
          <div style={{ color: "#475569", fontSize: 13 }}>
            {t(
              lang,
              "Use student name first. If multiple students match, rerun with the selected student ID. Package ID is optional; leave it blank to show all packages used by this student.",
              "先用学生姓名查询；如果出现同名，再用页面给出的学生 ID 精确查询。课包 ID 可留空，留空会显示该学生所有已扣课包。"
            )}
          </div>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Student name", "学生姓名")}</span>
            <input
              name="studentName"
              defaultValue={studentName}
              placeholder="Coco Xu"
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", minWidth: 180 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Student ID", "学生 ID")}</span>
            <input
              name="studentId"
              defaultValue={studentId}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", minWidth: 260 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Package ID", "课包 ID")}</span>
            <input
              name="packageId"
              defaultValue={packageId}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", minWidth: 260 }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "Start date", "开始日期")}</span>
            <input
              type="date"
              name="startDate"
              defaultValue={startDate}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <label style={{ display: "grid", gap: 6 }}>
            <span>{t(lang, "End date", "截止日期")}</span>
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            />
          </label>
          <button type="submit">{t(lang, "Preview", "预览")}</button>
          {exportHref ? <a href={exportHref}>{t(lang, "Download Excel", "下载 Excel")}</a> : null}
        </div>
      </form>

      {!hasQuery ? (
        <section style={{ border: "1px solid #dbeafe", borderRadius: 14, background: "#eff6ff", padding: 14, color: "#1e40af" }}>
          {t(lang, "Enter a student name to preview usage.", "输入学生姓名后即可预览使用量。")}
        </section>
      ) : report?.needDisambiguation ? (
        <section style={{ border: "1px solid #fde68a", borderRadius: 14, background: "#fffbeb", padding: 14, display: "grid", gap: 10 }}>
          <div style={{ fontWeight: 800, color: "#92400e" }}>
            {t(lang, "Multiple matching students found", "找到多个匹配学生")}
          </div>
          <table cellPadding={8} style={{ width: "100%", borderCollapse: "collapse", background: "#fff" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid #e5e7eb" }}>
                <th align="left">{t(lang, "Student", "学生")}</th>
                <th align="left">{t(lang, "Grade", "年级")}</th>
                <th align="left">{t(lang, "School", "学校")}</th>
                <th align="left">{t(lang, "Student ID", "学生 ID")}</th>
              </tr>
            </thead>
            <tbody>
              {report.candidates.map((row) => (
                <tr key={row.studentId} style={{ borderTop: "1px solid #eef2f7" }}>
                  <td style={{ fontWeight: 700 }}>{row.name}</td>
                  <td>{row.grade || "-"}</td>
                  <td>{row.school || "-"}</td>
                  <td>{row.studentId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ) : report && !report.ok ? (
        <section style={{ border: "1px solid #fecaca", borderRadius: 14, background: "#fff7f7", padding: 14, color: "#991b1b" }}>
          {report.message || t(lang, "Unable to load report.", "无法加载报表。")}
        </section>
      ) : report && report.student ? (
        <>
          <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
            <div style={{ ...workbenchMetricCardStyle("blue"), background: "#f8fbff" }}>
              <div style={workbenchMetricLabelStyle("blue")}>{t(lang, "Student", "学生")}</div>
              <div style={{ ...workbenchMetricValueStyle("blue"), fontSize: 20 }}>{report.student.name}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("amber"), background: "#fffbeb" }}>
              <div style={workbenchMetricLabelStyle("amber")}>{t(lang, "Lessons", "课次")}</div>
              <div style={workbenchMetricValueStyle("amber")}>{report.lessonCount}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("rose"), background: "#fff7f7" }}>
              <div style={workbenchMetricLabelStyle("rose")}>{t(lang, "Deducted hours", "已上/已扣小时")}</div>
              <div style={workbenchMetricValueStyle("rose")}>{report.totalDeductedHours.toFixed(2)}</div>
            </div>
            <div style={{ ...workbenchMetricCardStyle("emerald"), background: "#f0fdf4" }}>
              <div style={workbenchMetricLabelStyle("emerald")}>{t(lang, "Period end", "截止日期")}</div>
              <div style={{ ...workbenchMetricValueStyle("emerald"), fontSize: 20 }}>{report.query.endDate}</div>
            </div>
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontWeight: 800 }}>
              {t(lang, "Attendance Detail", "出勤明细")}
            </div>
            {report.detailRows.length === 0 ? (
              <div style={{ padding: "0 14px 14px", color: "#475569" }}>
                {t(lang, "No deducted attendance rows found for this filter.", "该条件下没有找到已扣课的出勤记录。")}
              </div>
            ) : (
              <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                    <th align="left">{t(lang, "Date", "日期")}</th>
                    <th align="left">{t(lang, "Time", "时间")}</th>
                    <th align="left">{t(lang, "Course", "课程")}</th>
                    <th align="left">{t(lang, "Teacher", "老师")}</th>
                    <th align="right">{t(lang, "Hours", "小时")}</th>
                    <th align="left">{t(lang, "Package owner", "课包归属")}</th>
                    <th align="left">{t(lang, "Package ID", "课包 ID")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.detailRows.slice(0, 50).map((row) => (
                    <tr key={row.attendanceId} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td>{row.sessionDate}</td>
                      <td>{row.sessionStart} - {row.sessionEnd}</td>
                      <td>
                        {[row.courseName, row.subjectName, row.levelName].filter(Boolean).join(" / ") || "-"}
                      </td>
                      <td>{row.teacherName || "-"}</td>
                      <td align="right">{row.deductedHours.toFixed(2)}</td>
                      <td>{row.packageOwnerName || "-"}</td>
                      <td style={{ fontSize: 12 }}>{row.packageId || "-"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>

          <section style={{ border: "1px solid #e5e7eb", borderRadius: 14, background: "#fff", overflow: "hidden" }}>
            <div style={{ padding: "12px 14px", fontWeight: 800 }}>
              {t(lang, "Student's Available Packages", "该学生可用课包")}
            </div>
            {report.packageOptions.length === 0 ? (
              <div style={{ padding: "0 14px 14px", color: "#475569" }}>-</div>
            ) : (
              <table cellPadding={10} style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr style={{ background: "#f8fafc", borderTop: "1px solid #e5e7eb" }}>
                    <th align="left">{t(lang, "Course", "课程")}</th>
                    <th align="left">{t(lang, "Owner", "归属")}</th>
                    <th align="left">{t(lang, "Status", "状态")}</th>
                    <th align="right">{t(lang, "Remaining hours", "剩余小时")}</th>
                    <th align="left">{t(lang, "Shared with", "共享给")}</th>
                    <th align="left">{t(lang, "Package ID", "课包 ID")}</th>
                  </tr>
                </thead>
                <tbody>
                  {report.packageOptions.slice(0, 20).map((row) => (
                    <tr key={row.packageId} style={{ borderTop: "1px solid #eef2f7" }}>
                      <td style={{ fontWeight: 700 }}>{row.courseName}</td>
                      <td>{row.ownerName}</td>
                      <td>{row.status}</td>
                      <td align="right">{row.remainingHours == null ? "-" : row.remainingHours.toFixed(2)}</td>
                      <td>{row.sharedWith || "-"}</td>
                      <td style={{ fontSize: 12 }}>{row.packageId}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </section>
        </>
      ) : null}
    </div>
  );
}
