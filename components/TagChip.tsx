export type TagType = "Notes" | "Exam" | "Reference" | "Study Trail";

const TAG_CONFIG: Record <
  TagType,
  { label: string; bg: string; color: string; border: string }
> = {
  Notes: { label: "Notes", bg: "#F7F7F5", color: "#6E6D68", border: "#D3D1C7" },
  Exam: { label: "Exam", bg: "#F7F7F5", color: "#6E6D68", border: "#D3D1C7" },
  Reference: { label: "Reference", bg: "#F7F7F5", color: "#6E6D68", border: "#D3D1C7" },
  "Study Trail": { label: "Study Trail", bg: "#F1EFFD", color: "#3C3489", border: "#C4BFEE" },
};

interface Props {
  tag: TagType;
  size?: "sm" | "md";
}

export default function TagChip({ tag, size = "sm" }: Props) {
  const cfg = TAG_CONFIG[tag];
  const px = size === "sm" ? "3px 8px" : "4px 10px";
  const fs = size === "sm" ? "12px" : "12.5px";

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: px,
        borderRadius: 4,
        background: cfg.bg,
        color: cfg.color,
        fontSize: fs,
        fontWeight: 500,
        whiteSpace: "nowrap",
        border: `1px solid ${cfg.border}`,
      }}
    >
      {tag === "Study Trail" && (
        <span style={{ display: "inline-flex", gap: 1.5, alignItems: "flex-end" }}>
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              style={{
                width: 2.5,
                height: 2.5,
                borderRadius: "50%",
                background: "currentColor",
                opacity: [0.45, 0.65, 0.9][i],
                transform:
                  i === 1 ? "translateY(-1px)" : i === 2 ? "translateY(-2.5px)" : undefined,
              }}
            />
          ))}
        </span>
      )}
      {cfg.label}
    </span>
  );
}