"use client";

export default function EnrollmentExpandCollapse() {
  const expandLabel = "Expand all / 全部展开";
  const collapseLabel = "Collapse all / 全部收起";
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
      <button
        type="button"
        onClick={() => {
          document.querySelectorAll("details[data-enroll-card]").forEach((el) => {
            (el as HTMLDetailsElement).open = true;
          });
        }}
      >
        {expandLabel}
      </button>
      <button
        type="button"
        onClick={() => {
          document.querySelectorAll("details[data-enroll-card]").forEach((el) => {
            (el as HTMLDetailsElement).open = false;
          });
        }}
      >
        {collapseLabel}
      </button>
    </div>
  );
}
