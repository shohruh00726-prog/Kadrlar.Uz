"use client";

export function StarRating({
  value,
  onChange,
  max = 5,
  size = "md",
  readonly = false,
}: {
  value: number;
  onChange?: (v: number) => void;
  max?: number;
  size?: "sm" | "md";
  readonly?: boolean;
}) {
  const sizeClass = size === "sm" ? "text-base" : "text-xl";
  return (
    <div className={`flex gap-0.5 ${sizeClass}`}>
      {Array.from({ length: max }, (_, i) => {
        const filled = i < value;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            className={`transition-colors ${readonly ? "cursor-default" : "cursor-pointer hover:scale-110"} ${filled ? "text-amber-400" : "text-white/20"}`}
            onClick={() => onChange?.(i + 1)}
            aria-label={`${i + 1} star${i === 0 ? "" : "s"}`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export function StarDisplay({
  rating,
  total,
  size = "sm",
}: {
  rating: number;
  total?: number;
  size?: "sm" | "md";
}) {
  const full = Math.floor(rating);
  const sizeClass = size === "sm" ? "text-sm" : "text-lg";
  return (
    <span className={`inline-flex items-center gap-1 ${sizeClass}`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < full ? "text-amber-400" : "text-white/20"}>
          ★
        </span>
      ))}
      {total != null && (
        <span className="ml-1 text-xs text-white/50">({total})</span>
      )}
    </span>
  );
}
