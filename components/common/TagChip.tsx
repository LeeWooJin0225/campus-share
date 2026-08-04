type TagType = "notes" | "exam" | "reference" | "trail";

const TAG_CONFIG: Record <
  TagType,
  { label: string; bg: string; color: string }
> = {
  notes: {
    label: "Notes",
    bg: "var(--cs-notes-bg)",
    color: "var(--cs-notes-fg)",
  },
  exam: {
    label: "Exam",
    bg: "var(--cs-exam-bg)",
    color: "var(--cs-exam-fg)",
  },
  reference: {
    label: "Reference",
    bg: "var(--cs-ref-bg)",
    color: "var(--cs-ref-fg)",
  },
  trail: {
    label: "Study Trail",
    bg: "var(--cs-trail-bg)",
    color: "var(--cs-trail-fg)",
  },
};

type TagChipProps = {
  tag: TagType;
  size?: "sm" | "md";
};

export default function TagChip({ tag, size = "sm" }: TagChipProps) {
  const cfg = TAG_CONFIG[tag];

  return (
    <span
      style={{
        display: "inline-block",
        background: cfg.bg,
        color: cfg.color,
        fontSize: size === "md" ? 12 : 11,
        fontWeight: 500,
        padding: size === "md" ? "3px 8px" : "2.5px 7px",
        borderRadius: "var(--cs-radius-xs)",
        whiteSpace: "nowrap",
        flexShrink: 0,
      }}
    >
      {cfg.label}
    </span>
  );
}