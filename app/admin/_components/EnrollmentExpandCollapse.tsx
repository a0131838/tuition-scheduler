"use client";

export default function EnrollmentExpandCollapse() {
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
        全部展开
      </button>
      <button
        type="button"
        onClick={() => {
          document.querySelectorAll("details[data-enroll-card]").forEach((el) => {
            (el as HTMLDetailsElement).open = false;
          });
        }}
      >
        全部收起
      </button>
    </div>
  );
}
