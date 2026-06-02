import { cn } from "@/lib/utils";
import type { Formation } from "@/lib/formations";

export function FormationMiniPitch({ formation, selected = false, className }: {
  formation: Formation;
  selected?: boolean;
  className?: string;
}) {
  const W = 60;
  const H = 76;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" className={cn("block", className)}>
      <rect x="0" y="0" width={W} height={H} rx="2"
        fill={selected ? "#14532d" : "#166534"} />
      {/* Center line at top */}
      <line x1="0" y1="0" x2={W} y2="0" stroke="white" strokeOpacity="0.35" strokeWidth="0.7" />
      {/* Goal at bottom */}
      <rect x={W * 0.33} y={H - 3} width={W * 0.34} height={3} rx="1"
        fill="white" fillOpacity="0.35" />
      {formation.positions.map((pos, i) => {
        const cx = (pos.x / 100) * W;
        // pos.y is in [50, 100] (own half) → map to [0, H]
        const cy = ((pos.y - 50) / 50) * H;
        return (
          <circle key={i}
            cx={cx} cy={cy}
            r={i === 0 ? 3.2 : 2.8}
            fill={i === 0 ? "#fde047" : "white"}
            fillOpacity={0.92}
          />
        );
      })}
    </svg>
  );
}
