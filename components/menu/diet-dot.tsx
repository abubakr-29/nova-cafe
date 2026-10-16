import type { Diet } from "@/lib/menu-import";

const STYLES: Record<Diet, { label: string; color: string }> = {
  veg: { label: "Vegetarian", color: "#3fa34d" },
  non_veg: { label: "Non-vegetarian", color: "#c0392b" },
  egg: { label: "Contains egg", color: "#d7a45a" },
};

/** The familiar green / red / amber marker used on Indian menus. */
export default function DietDot({
  diet,
  className = "",
}: {
  diet: Diet | null | undefined;
  className?: string;
}) {
  if (!diet) return null;

  const style = STYLES[diet];

  return (
    <span
      role="img"
      aria-label={style.label}
      title={style.label}
      className={`inline-flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[3px] border ${className}`}
      style={{ borderColor: style.color }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: style.color }}
      />
    </span>
  );
}
