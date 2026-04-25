"use client";

import { useMemo, useState } from "react";

export type AcademicAlertLane = "all" | "own" | "partner" | "unclassified";

export type AcademicAlertLaneOption = {
  value: AcademicAlertLane;
  label: string;
};

export type AcademicAlertRow = {
  studentId: string;
  studentName: string;
  remainingLabel: string;
  lane: Exclude<AcademicAlertLane, "all">;
  laneLabel: string;
  studentTypeLabel: string;
  packageWarning: string | null;
  riskLabel: string;
  riskColor: string;
  profileLabel: string;
  profileColor: string;
  profileBold: boolean;
  servicePlanLabel: string;
  monthlyReportLabel: string | null;
  nextLessonLabel: string | null;
  noUpcomingLessonLabel: string;
  nextAction: string;
  nextActionDueLabel: string | null;
  nextActionDueColor: string;
  nextActionDueBold: boolean;
  ownerLabel: string;
  actionLabel: string;
};

type Props = {
  initialLane: AcademicAlertLane;
  lanes: AcademicAlertLaneOption[];
  rows: AcademicAlertRow[];
  labels: {
    empty: string;
    student: string;
    type: string;
    risk: string;
    servicePlan: string;
    nextLesson: string;
    nextAction: string;
    owner: string;
    action: string;
  };
};

const tableStyle = { borderCollapse: "collapse", width: "100%" } as const;

export default function AcademicManagementAlertsClient({ initialLane, lanes, rows, labels }: Props) {
  const [lane, setLane] = useState<AcademicAlertLane>(initialLane);
  const counts = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        acc.all += 1;
        acc[row.lane] += 1;
        return acc;
      },
      { all: 0, own: 0, partner: 0, unclassified: 0 } as Record<AcademicAlertLane, number>
    );
  }, [rows]);
  const filteredRows = lane === "all" ? rows : rows.filter((row) => row.lane === lane);

  function selectLane(nextLane: AcademicAlertLane) {
    setLane(nextLane);
    const url = new URL(window.location.href);
    if (nextLane === "all") {
      url.searchParams.delete("academicLane");
    } else {
      url.searchParams.set("academicLane", nextLane);
    }
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        {lanes.map((item) => (
          <button
            key={item.value}
            type="button"
            onClick={() => selectLane(item.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 999,
              border: lane === item.value ? "1px solid #2563eb" : "1px solid #cbd5e1",
              background: lane === item.value ? "#dbeafe" : "#fff",
              color: "#0f172a",
              textDecoration: "none",
              fontWeight: lane === item.value ? 800 : 600,
              cursor: "pointer",
            }}
          >
            {item.label} ({counts[item.value]})
          </button>
        ))}
      </div>
      {filteredRows.length === 0 ? (
        <div style={{ color: "#999" }}>{labels.empty}</div>
      ) : (
        <table cellPadding={8} style={tableStyle}>
          <thead>
            <tr style={{ background: "#f5f5f5" }}>
              <th align="left">{labels.student}</th>
              <th align="left">{labels.type}</th>
              <th align="left">{labels.risk}</th>
              <th align="left">{labels.servicePlan}</th>
              <th align="left">{labels.nextLesson}</th>
              <th align="left">{labels.nextAction}</th>
              <th align="left">{labels.owner}</th>
              <th align="left">{labels.action}</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <tr key={row.studentId} style={{ borderTop: "1px solid #eee" }}>
                <td>
                  <div style={{ fontWeight: 700 }}>{row.studentName}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{row.remainingLabel}</div>
                </td>
                <td style={{ fontWeight: 700 }}>
                  {row.laneLabel}
                  <div style={{ fontSize: 12, color: "#64748b", fontWeight: 400 }}>{row.studentTypeLabel}</div>
                  {row.packageWarning ? <div style={{ fontSize: 12, color: "#c2410c", fontWeight: 700 }}>{row.packageWarning}</div> : null}
                </td>
                <td style={{ color: row.riskColor, fontWeight: 700 }}>
                  {row.riskLabel}
                  <div style={{ color: row.profileColor, fontSize: 12, fontWeight: row.profileBold ? 700 : 400 }}>{row.profileLabel}</div>
                </td>
                <td>
                  {row.servicePlanLabel}
                  {row.monthlyReportLabel ? <div style={{ color: "#1d4ed8", fontSize: 12, fontWeight: 700 }}>{row.monthlyReportLabel}</div> : null}
                </td>
                <td>
                  {row.nextLessonLabel ? (
                    row.nextLessonLabel
                  ) : (
                    <span style={{ color: "#be123c", fontWeight: 700 }}>{row.noUpcomingLessonLabel}</span>
                  )}
                </td>
                <td>
                  <div style={{ whiteSpace: "pre-wrap" }}>{row.nextAction}</div>
                  {row.nextActionDueLabel ? (
                    <div style={{ color: row.nextActionDueColor, fontSize: 12, fontWeight: row.nextActionDueBold ? 700 : 400 }}>
                      {row.nextActionDueLabel}
                    </div>
                  ) : null}
                </td>
                <td>{row.ownerLabel}</td>
                <td>
                  <a href={`/admin/students/${row.studentId}`}>{row.actionLabel}</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}
