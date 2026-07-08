import { cn } from "@/lib/utils";

interface TagBadgeProps {
  name: string;
  color?: string;
  onClick?: () => void;
  selected?: boolean;
  size?: "sm" | "md";
}

export const TagBadge = ({ name, color = "#3ECFB2", onClick, selected, size = "md" }: TagBadgeProps) => {
  const isClickable = !!onClick;
  
  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center rounded-md font-medium transition-all",
        size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-xs",
        isClickable && "cursor-pointer hover:opacity-80",
        selected ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""
      )}
      style={{
        backgroundColor: `${color}15`,
        color: color,
        border: `1px solid ${color}30`,
      }}
    >
      {name}
    </span>
  );
};
