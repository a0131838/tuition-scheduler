type ClassTypeBadgeProps = {
  capacity?: number | null;
  compact?: boolean;
};

export default function ClassTypeBadge({ capacity, compact = false }: ClassTypeBadgeProps) {
  const oneOnOne = capacity === 1;
  return (
    <span
      style={{
        display: "inline-block",
        padding: compact ? "1px 6px" : "2px 8px",
        borderRadius: 999,
        fontSize: compact ? 11 : 12,
        fontWeight: 700,
        background: oneOnOne ? "#fee2e2" : "#dbeafe",
        color: oneOnOne ? "#991b1b" : "#1e3a8a",
        border: `1px solid ${oneOnOne ? "#fecaca" : "#bfdbfe"}`,
      }}
    >
      {oneOnOne ? "1-on-1 / 一对一" : "Group / 班课"}
    </span>
  );
}

