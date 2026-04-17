"use client";

type StudentCalendarMonthPagerClientProps = {
  prevHref: string;
  prevLabel: string;
  currentMonthLabel: string;
  nextHref: string;
  nextLabel: string;
};

export default function StudentCalendarMonthPagerClient({
  prevHref,
  prevLabel,
  currentMonthLabel,
  nextHref,
  nextLabel,
}: StudentCalendarMonthPagerClientProps) {
  const handleNavigate = (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    window.location.assign(href);
  };

  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
      <a href={prevHref} onClick={handleNavigate(prevHref)}>
        {prevLabel}
      </a>
      <b>{currentMonthLabel}</b>
      <a href={nextHref} onClick={handleNavigate(nextHref)}>
        {nextLabel}
      </a>
    </div>
  );
}
