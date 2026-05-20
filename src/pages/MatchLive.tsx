import { useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  TouchSensor,
  rectIntersection,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { snapCenterToCursor } from "@dnd-kit/modifiers";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import {
  useEndPeriod,
  useLogGoal,
  useMatchDetail,
  useSubstitute,
  useUpdateMatch,
  type RichMatchPlayer,
} from "@/hooks/useMatch";
import { useTeam } from "@/hooks/useTeams";
import {
  PITCH_SPECS, HANDBALL_COURT_SPEC, HOCKEY_RINK_SPEC, BASKETBALL_COURT_SPEC,
  type PitchSpec, type HandballCourtSpec, type HockeyRinkSpec, type BasketballCourtSpec,
} from "@/lib/pitchSpecs";
import {
  ELEVEN_FORMATIONS, getFormationPositions, getHandballPositions,
  getHockeyPositions, getBasketballPositions,
} from "@/lib/formations";

// ─── Utilities ────────────────────────────────────────────────────────────────

// Auto-pause the clock this many seconds past the period's scheduled end
const AUTO_STOP_BUFFER_SEC = 10 * 60;

function lsClockKey(matchId: string) {
  return `faircoach_clock_${matchId}`;
}

const CROP_START = 1 / 3; // show from y=33% (1/3 into opponent half) to y=100% (own goal)

function toCroppedY(y: number): number {
  return Math.max(0, Math.min(100, (y - CROP_START * 100) / ((1 - CROP_START) * 100) * 100));
}

function fmtTime(s: number) {
  const abs = Math.max(0, s);
  return `${Math.floor(abs / 60).toString().padStart(2, "0")}:${(abs % 60).toString().padStart(2, "0")}`;
}

type FPColor = "blue" | "green" | "yellow" | "red";

const FP_CIRCLE_BG: Record<FPColor, string> = {
  blue:   "bg-blue-500",
  green:  "bg-green-500",
  yellow: "bg-yellow-400",
  red:    "bg-red-500",
};
const FP_CIRCLE_TEXT: Record<FPColor, string> = {
  blue:   "text-white",
  green:  "text-white",
  yellow: "text-ink",
  red:    "text-white",
};

function calcFP(play: number, elapsed: number, onField: number, total: number): FPColor {
  if (elapsed === 0 || total === 0) return "green";
  const ratio = play / ((elapsed * onField) / total);
  if (ratio > 1.1) return "blue";
  if (ratio >= 0.9) return "green";
  if (ratio >= 0.6) return "yellow";
  return "red";
}

// ─── SVG pitch markings ───────────────────────────────────────────────────────

function PitchMarkings({ spec }: { spec: PitchSpec }) {
  const { width: W, length: L, penaltyAreaWidth, penaltyAreaDepth,
    goalAreaWidth, goalAreaDepth, penaltySpotDistance, centerCircleRadius } = spec;
  const cx = W / 2, cy = L / 2;
  const sw = W / 50;
  const cornerR = Math.min(1, W * 0.06);
  const dotR = sw * 1.4;
  const line = { fill: "none" as const, stroke: "white", strokeOpacity: 0.45, strokeWidth: sw };
  const dot  = { fill: "white", fillOpacity: 0.45, stroke: "none" as const };

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none"
      viewBox={`0 ${L / 3} ${W} ${L * 2 / 3}`} preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={L} {...line} />
      <line x1={0} y1={cy} x2={W} y2={cy} {...line} />
      <circle cx={cx} cy={cy} r={centerCircleRadius} {...line} />
      <circle cx={cx} cy={cy} r={dotR} {...dot} />
      {penaltyAreaWidth != null && penaltyAreaDepth != null && (<>
        <rect x={(W - penaltyAreaWidth) / 2} y={0} width={penaltyAreaWidth} height={penaltyAreaDepth} {...line} />
        <rect x={(W - penaltyAreaWidth) / 2} y={L - penaltyAreaDepth} width={penaltyAreaWidth} height={penaltyAreaDepth} {...line} />
      </>)}
      {goalAreaWidth != null && goalAreaDepth != null && (<>
        <rect x={(W - goalAreaWidth) / 2} y={0} width={goalAreaWidth} height={goalAreaDepth} {...line} />
        <rect x={(W - goalAreaWidth) / 2} y={L - goalAreaDepth} width={goalAreaWidth} height={goalAreaDepth} {...line} />
      </>)}
      {penaltySpotDistance != null && (<>
        <circle cx={cx} cy={penaltySpotDistance} r={dotR} {...dot} />
        <circle cx={cx} cy={L - penaltySpotDistance} r={dotR} {...dot} />
      </>)}
      <path d={`M 0,${cornerR * 2} A ${cornerR * 2},${cornerR * 2} 0 0,1 ${cornerR * 2},0`} {...line} />
      <path d={`M ${W},${cornerR * 2} A ${cornerR * 2},${cornerR * 2} 0 0,0 ${W - cornerR * 2},0`} {...line} />
      <path d={`M 0,${L - cornerR * 2} A ${cornerR * 2},${cornerR * 2} 0 0,0 ${cornerR * 2},${L}`} {...line} />
      <path d={`M ${W},${L - cornerR * 2} A ${cornerR * 2},${cornerR * 2} 0 0,1 ${W - cornerR * 2},${L}`} {...line} />
    </svg>
  );
}

// ─── Handball court markings ─────────────────────────────────────────────────

function HandballCourtMarkings({ spec }: { spec: HandballCourtSpec }) {
  const { width: W, length: L, goalWidth: G, goalAreaRadius: R6, freeThrowRadius: R9, penaltyDistance: P7 } = spec;
  const cx = W / 2;
  const sw = W / 60;
  const line = { fill: "none" as const, stroke: "white", strokeOpacity: 0.5, strokeWidth: sw };
  const dash = { ...line, strokeDasharray: `${sw * 3} ${sw * 2}` };
  const dot = { fill: "white", fillOpacity: 0.5, stroke: "none" as const };
  const goalLine = { stroke: "white", strokeOpacity: 0.9, strokeWidth: sw * 3 };
  const lx = cx - G / 2;
  const rx = cx + G / 2;

  // D-shaped path: y0 = end line, dir=1 opens downward (top end), dir=-1 opens upward (bottom end)
  function dPath(y0: number, r: number, dir: 1 | -1) {
    const yc = y0 + r * dir;
    const sweep = dir === 1 ? 0 : 1;
    return `M ${lx - r},${y0} A ${r},${r} 0 0,${sweep} ${lx},${yc} L ${rx},${yc} A ${r},${r} 0 0,${sweep} ${rx + r},${y0}`;
  }

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden"
      viewBox={`0 ${L / 3} ${W} ${L * 2 / 3}`} preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={L} {...line} />
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} {...line} />
      <circle cx={cx} cy={L / 2} r={sw * 1.2} {...dot} />
      {/* Top end */}
      <path d={dPath(0, R6, 1)} {...line} />
      <path d={dPath(0, R9, 1)} {...dash} />
      <circle cx={cx} cy={P7} r={sw * 1.2} {...dot} />
      <line x1={lx} y1={0} x2={rx} y2={0} {...goalLine} />
      {/* Bottom end */}
      <path d={dPath(L, R6, -1)} {...line} />
      <path d={dPath(L, R9, -1)} {...dash} />
      <circle cx={cx} cy={L - P7} r={sw * 1.2} {...dot} />
      <line x1={lx} y1={L} x2={rx} y2={L} {...goalLine} />
    </svg>
  );
}

// ─── Hockey rink markings ─────────────────────────────────────────────────────

function HockeyRinkMarkings({ spec }: { spec: HockeyRinkSpec }) {
  const { width: W, length: L, goalWidth: G, goalLineDistance: GL,
    blueLineDistance: BL, cornerRadius: CR, centerCircleRadius: CCR, creaseRadius: CR2 } = spec;
  const cx = W / 2;
  const sw = W / 60;
  const line    = { fill: "none" as const, stroke: "white", strokeOpacity: 0.45, strokeWidth: sw };
  const redLine = { fill: "none" as const, stroke: "#ff4444", strokeOpacity: 0.7, strokeWidth: sw * 2 };
  const blueLine = { fill: "none" as const, stroke: "#4488ff", strokeOpacity: 0.7, strokeWidth: sw * 1.5 };
  const goalLine = { fill: "none" as const, stroke: "white", strokeOpacity: 0.9, strokeWidth: sw * 3 };
  const dot = { fill: "white", fillOpacity: 0.5, stroke: "none" as const };

  // D-shaped crease path opening away from end line
  function creasePath(y0: number, dir: 1 | -1) {
    const yc = y0 + CR2 * dir;
    const lx = cx - CR2, rx = cx + CR2;
    const sweep = dir === 1 ? 0 : 1;
    return `M ${lx},${y0} A ${CR2},${CR2} 0 0,${sweep} ${rx},${y0} L ${rx},${yc} A ${CR2},${CR2} 0 0,${sweep} ${lx},${yc} Z`;
  }

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden"
      viewBox={`0 ${L / 3} ${W} ${L * 2 / 3}`} preserveAspectRatio="none">
      {/* Outer rink with rounded corners */}
      <rect x={0} y={0} width={W} height={L} rx={CR} {...line} />
      {/* Centre red line */}
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} {...redLine} />
      {/* Blue zone lines */}
      <line x1={0} y1={BL} x2={W} y2={BL} {...blueLine} />
      <line x1={0} y1={L - BL} x2={W} y2={L - BL} {...blueLine} />
      {/* Goal lines */}
      <line x1={0} y1={GL} x2={W} y2={GL} {...line} />
      <line x1={0} y1={L - GL} x2={W} y2={L - GL} {...line} />
      {/* Goal highlights */}
      <line x1={(W - G) / 2} y1={GL} x2={(W + G) / 2} y2={GL} {...goalLine} />
      <line x1={(W - G) / 2} y1={L - GL} x2={(W + G) / 2} y2={L - GL} {...goalLine} />
      {/* Creases */}
      <path d={creasePath(GL, 1)} fill="white" fillOpacity={0.1} stroke="white" strokeOpacity={0.4} strokeWidth={sw} />
      <path d={creasePath(L - GL, -1)} fill="white" fillOpacity={0.1} stroke="white" strokeOpacity={0.4} strokeWidth={sw} />
      {/* Centre face-off circle and dot */}
      <circle cx={cx} cy={L / 2} r={CCR} {...line} />
      <circle cx={cx} cy={L / 2} r={sw * 1.4} {...dot} />
    </svg>
  );
}

// ─── Basketball court markings ────────────────────────────────────────────────

function BasketballCourtMarkings({ spec }: { spec: BasketballCourtSpec }) {
  const { width: W, length: L, threePointRadius: TPR, keyWidth: KW, keyDepth: KD,
    basketDistance: BD, centerCircleRadius: CCR, freeThrowRadius: FTR } = spec;
  const cx = W / 2;
  const sw = W / 50;
  const line = { fill: "none" as const, stroke: "white", strokeOpacity: 0.45, strokeWidth: sw };
  const dot  = { fill: "white", fillOpacity: 0.5, stroke: "none" as const };
  const keyFill = { fill: "white", fillOpacity: 0.06 };

  function threePointPath(basketY: number, dir: 1 | -1) {
    const cornerX = 0.9;
    const dx = cx - cornerX;
    const arcY = basketY + dir * Math.sqrt(Math.max(0, TPR * TPR - dx * dx));
    const sweep = dir === 1 ? 1 : 0;
    return [
      `M ${cornerX},${basketY + dir * 0}`,
      `L ${cornerX},${arcY}`,
      `A ${TPR},${TPR} 0 0,${sweep} ${W - cornerX},${arcY}`,
      `L ${W - cornerX},${basketY}`,
    ].join(" ");
  }

  function keyPath(endY: number, dir: 1 | -1) {
    const kx = (W - KW) / 2;
    const ftY = endY + dir * KD;
    const ftSweep = dir === 1 ? 1 : 0;
    return { kx, ftY, ftSweep };
  }

  const top = keyPath(0, 1);
  const bot = keyPath(L, -1);

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden"
      viewBox={`0 ${L / 3} ${W} ${L * 2 / 3}`} preserveAspectRatio="none">
      {/* Outer boundary */}
      <rect x={0} y={0} width={W} height={L} {...line} />
      {/* Centre line and circle */}
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} {...line} />
      <circle cx={cx} cy={L / 2} r={CCR} {...line} />
      <circle cx={cx} cy={L / 2} r={sw * 0.8} {...dot} />

      {/* Top end */}
      <rect x={top.kx} y={0} width={KW} height={KD} {...keyFill} />
      <rect x={top.kx} y={0} width={KW} height={KD} {...line} />
      <path d={`M ${top.kx},${top.ftY} A ${FTR},${FTR} 0 0,${top.ftSweep} ${top.kx + KW},${top.ftY}`} {...line} />
      {/* Restricted area under top basket */}
      <path d={`M ${cx - 1.25},${BD} A 1.25,1.25 0 0,1 ${cx + 1.25},${BD}`}
        {...{ fill: "rgba(255,255,255,0.06)", stroke: "white", strokeOpacity: 0.35, strokeWidth: sw * 0.8 }} />
      {/* Basket */}
      <circle cx={cx} cy={BD} r={0.45} {...{ fill: "#ff6b6b", fillOpacity: 0.75, stroke: "white", strokeWidth: sw * 1.5 }} />
      <circle cx={cx} cy={BD} r={0.35} {...{ fill: "none", stroke: "white", strokeOpacity: 0.6, strokeWidth: sw * 0.8 }} />
      {/* Backboard */}
      <line x1={cx - 1.2} y1={BD + 0.2} x2={cx + 1.2} y2={BD + 0.2} {...{ stroke: "white", strokeOpacity: 0.7, strokeWidth: sw * 2, fill: "none" }} />
      <path d={threePointPath(0, 1)} {...line} />

      {/* Bottom end */}
      <rect x={bot.kx} y={L - KD} width={KW} height={KD} {...keyFill} />
      <rect x={bot.kx} y={L - KD} width={KW} height={KD} {...line} />
      <path d={`M ${bot.kx},${bot.ftY} A ${FTR},${FTR} 0 0,${bot.ftSweep} ${bot.kx + KW},${bot.ftY}`} {...line} />
      {/* Restricted area under bottom basket */}
      <path d={`M ${cx - 1.25},${L - BD} A 1.25,1.25 0 0,0 ${cx + 1.25},${L - BD}`}
        {...{ fill: "rgba(255,255,255,0.06)", stroke: "white", strokeOpacity: 0.35, strokeWidth: sw * 0.8 }} />
      {/* Basket */}
      <circle cx={cx} cy={L - BD} r={0.45} {...{ fill: "#ff6b6b", fillOpacity: 0.75, stroke: "white", strokeWidth: sw * 1.5 }} />
      <circle cx={cx} cy={L - BD} r={0.35} {...{ fill: "none", stroke: "white", strokeOpacity: 0.6, strokeWidth: sw * 0.8 }} />
      {/* Backboard */}
      <line x1={cx - 1.2} y1={L - BD - 0.2} x2={cx + 1.2} y2={L - BD - 0.2} {...{ stroke: "white", strokeOpacity: 0.7, strokeWidth: sw * 2, fill: "none" }} />
      <path d={threePointPath(L, -1)} {...line} />
    </svg>
  );
}

// ─── Pitch drop zone ──────────────────────────────────────────────────────────

function PitchZone({ children, anyDragging, spec, bgColor = "bg-green-700" }: {
  children: React.ReactNode; anyDragging: boolean; spec: { width: number; length: number }; bgColor?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pitch" });
  return (
    <div id="pitch-container" ref={setNodeRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl transition-shadow",
        bgColor,
        isOver && anyDragging && "ring-2 ring-yellow-400 ring-offset-1",
      )}
      style={{ aspectRatio: `${spec.width} / ${spec.length * 2 / 3}` }}>
      {children}
    </div>
  );
}

// ─── Field token ──────────────────────────────────────────────────────────────

function FieldToken({ mp, pos, playSeconds, fpColor, isPendingSwap }: {
  mp: RichMatchPlayer; pos: { x: number; y: number };
  playSeconds: number; fpColor: FPColor; isPendingSwap: boolean;
}) {
  const firstName = mp.player.name.split(" ")[0];
  const fontSize = firstName.length <= 4 ? "text-sm" : firstName.length <= 6 ? "text-xs" : "text-[10px]";
  return (
    <div style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      className="absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-px pointer-events-none">
      <div className={cn(
        "flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 font-bold text-center leading-tight px-1 transition-all duration-150 shadow-md",
        fontSize,
        isPendingSwap
          ? "scale-125 border-yellow-400 bg-yellow-400 text-ink shadow-lg"
          : cn("border-white", FP_CIRCLE_BG[fpColor], FP_CIRCLE_TEXT[fpColor]),
      )}>
        {firstName}
      </div>
      <span className="text-[10px] font-mono text-white/90 drop-shadow mt-0.5">
        {fmtTime(playSeconds)}
      </span>
    </div>
  );
}

// ─── Bench item ───────────────────────────────────────────────────────────────

function BenchItem({ mp, playSeconds, fpColor }: {
  mp: RichMatchPlayer; playSeconds: number; fpColor: FPColor;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: mp.player_id });
  const firstName = mp.player.name.split(" ")[0];
  const fontSize = firstName.length <= 4 ? "text-sm" : firstName.length <= 6 ? "text-xs" : "text-[10px]";
  return (
    <div ref={setNodeRef} {...attributes} {...listeners}
      className={cn(
        "flex flex-col items-center gap-1.5 select-none touch-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}>
      <div className={cn(
        "flex h-14 w-14 items-center justify-center rounded-full font-bold text-center leading-tight px-1",
        FP_CIRCLE_BG[fpColor], FP_CIRCLE_TEXT[fpColor], fontSize,
      )}>
        {firstName}
      </div>
      <div className="text-xs font-mono text-ink-muted">{fmtTime(playSeconds)}</div>
    </div>
  );
}

// ─── Goal dialog ──────────────────────────────────────────────────────────────

function GoalDialog({ open, team, opponent, teamName, players, onConfirm, onCancel }: {
  open: boolean;
  team: "home" | "away";
  opponent: string | null;
  teamName: string | null;
  players: RichMatchPlayer[];
  onConfirm: (scorerId: string | null, assistId: string | null) => void;
  onCancel: () => void;
}) {
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assistId, setAssistId] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setScorerId(null); setAssistId(null); }
  }, [open]);

  const isHome = team === "home";
  const teamLabel = isHome ? (teamName ?? "Vi") : (opponent ?? "Motstander");

  const onField = players.filter((p) => p.on_field)
    .sort((a, b) => (a.player.jersey_number ?? 999) - (b.player.jersey_number ?? 999));
  const bench = players.filter((p) => !p.on_field)
    .sort((a, b) => (a.player.jersey_number ?? 999) - (b.player.jersey_number ?? 999));

  function chipLabel(mp: RichMatchPlayer) {
    return mp.player.jersey_number != null
      ? `#${mp.player.jersey_number} ${mp.player.name.split(" ")[0]}`
      : mp.player.name.split(" ")[0];
  }

  function PlayerChip({ mp, selected, onSelect, dim }: {
    mp: RichMatchPlayer; selected: boolean; onSelect: () => void; dim?: boolean;
  }) {
    return (
      <button type="button" onClick={onSelect}
        className={cn(
          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          selected
            ? "border-ink bg-ink text-cream"
            : mp.on_field
              ? "border-green-400 bg-green-50 text-green-900 hover:bg-green-100"
              : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
          dim && !selected && "opacity-40",
        )}>
        {chipLabel(mp)}
      </button>
    );
  }

  function NoneChip({ label, selected, onSelect }: { label: string; selected: boolean; onSelect: () => void }) {
    return (
      <button type="button" onClick={onSelect}
        className={cn(
          "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
          selected ? "border-ink bg-ink text-cream" : "border-ink/20 bg-cream-dark text-ink-muted hover:bg-ink/5",
        )}>
        {label}
      </button>
    );
  }

  function PlayerSection({ label, pool, selectedId, onSelectId, excludeId }: {
    label: string; pool: typeof onField; selectedId: string | null;
    onSelectId: (id: string | null) => void; excludeId?: string | null;
  }) {
    const field = pool.filter((p) => !excludeId || p.player_id !== excludeId);
    const onFieldPlayers = field.filter((p) => p.on_field);
    const benchPlayers = field.filter((p) => !p.on_field);
    return (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">{label}</p>
        <div className="flex flex-wrap gap-2">
          <NoneChip
            label={label === "Målscorer" ? "Ukjent" : "Ingen"}
            selected={selectedId === null}
            onSelect={() => onSelectId(null)}
          />
          {onFieldPlayers.map((mp) => (
            <PlayerChip key={mp.player_id} mp={mp}
              selected={selectedId === mp.player_id}
              onSelect={() => onSelectId(mp.player_id)} />
          ))}
          {benchPlayers.length > 0 && onFieldPlayers.length > 0 && (
            <div className="w-full border-t border-ink/10 pt-1 mt-1" />
          )}
          {benchPlayers.map((mp) => (
            <PlayerChip key={mp.player_id} mp={mp}
              selected={selectedId === mp.player_id}
              onSelect={() => onSelectId(mp.player_id)}
              dim={selectedId !== null && selectedId !== mp.player_id} />
          ))}
        </div>
        {onFieldPlayers.length > 0 && (
          <p className="mt-1.5 text-xs text-ink-muted">
            <span className="inline-block h-2 w-2 rounded-full border border-green-400 bg-green-50 mr-1" />
            Grønn = på banen nå
          </p>
        )}
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Mål for {teamLabel}!</DialogTitle>
        </DialogHeader>

        {isHome ? (
          <div className="space-y-5">
            <PlayerSection
              label="Målscorer"
              pool={[...onField, ...bench]}
              selectedId={scorerId}
              onSelectId={(id) => {
                setScorerId(id);
                if (id && assistId === id) setAssistId(null);
              }}
            />
            <PlayerSection
              label="Assist"
              pool={[...onField, ...bench]}
              selectedId={assistId}
              onSelectId={setAssistId}
              excludeId={scorerId}
            />
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Mål for motstanderlaget registreres uten målscorer.</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={() => onConfirm(scorerId, assistId)}>
            Registrer mål
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Formation dialog ─────────────────────────────────────────────────────────

function FormationDialog({ open, current, onSelect, onClose }: {
  open: boolean; current: string; onSelect: (f: string) => void; onClose: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Bytt formasjon</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-3 gap-2 pt-2">
          {ELEVEN_FORMATIONS.map((f) => (
            <button key={f.name} type="button"
              onClick={() => { onSelect(f.name); onClose(); }}
              className={cn(
                "h-12 rounded-lg border text-sm font-semibold transition-colors",
                current === f.name
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
              )}>
              {f.name}
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MatchLive() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMatchDetail(matchId);
  const { data: team } = useTeam(data?.match.team_id);
  const updateMatch = useUpdateMatch(matchId);
  const substitute = useSubstitute(matchId);
  const endPeriod = useEndPeriod(matchId);
  const logGoal = useLogGoal(matchId);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [formation, setFormation] = useState<string | null>(null);
  const [goalDialog, setGoalDialog] = useState<{ team: "home" | "away" } | null>(null);
  const [formationDialogOpen, setFormationDialogOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);

  const cameOnAt = useRef<Record<string, number>>({});
  const periodStartAt = useRef(0);
  const positionMap = useRef<Record<string, number>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);

  const playersRef = useRef<RichMatchPlayer[]>([]);
  const fieldPlayersRef = useRef<RichMatchPlayer[]>([]);

  // Wall-clock refs — allows the timer to survive backgrounding and app kills
  const clockStartedAt = useRef<number | null>(null);   // Date.now() when clock last started
  const clockBaseElapsed = useRef<number>(0);            // elapsed value at that moment
  const periodLengthRef = useRef<number>(0);             // for auto-stop inside interval

  function computeLiveElapsed(): number {
    if (clockStartedAt.current === null) return elapsed;
    return clockBaseElapsed.current + Math.floor((Date.now() - clockStartedAt.current) / 1000);
  }

  useEffect(() => {
    if (!data) return;
    const { match, players } = data;
    periodLengthRef.current = match.period_length_seconds;
    periodStartAt.current = (match.current_period - 1) * match.period_length_seconds;

    let initElapsed = match.elapsed_seconds;

    if (match.status === "live" && matchId) {
      // Recover wall-clock time: works for backgrounded tab AND killed app
      try {
        const stored = localStorage.getItem(lsClockKey(matchId));
        if (stored) {
          const { startedAt, baseElapsed } = JSON.parse(stored) as { startedAt: number; baseElapsed: number };
          const MAX_SESSION_MS = 3 * 60 * 60 * 1000; // 3 hours — sanity cap
          if (Date.now() - startedAt < MAX_SESSION_MS) {
            initElapsed = baseElapsed + Math.floor((Date.now() - startedAt) / 1000);
            clockStartedAt.current = startedAt;
            clockBaseElapsed.current = baseElapsed;
          }
        } else {
          clockStartedAt.current = Date.now();
          clockBaseElapsed.current = match.elapsed_seconds;
        }
      } catch {
        clockStartedAt.current = Date.now();
        clockBaseElapsed.current = match.elapsed_seconds;
      }
    }

    setElapsed(initElapsed);
    setRunning(match.status === "live");
    setScoreHome(match.score_home ?? 0);
    setScoreAway(match.score_away ?? 0);
    setFormation(match.formation);

    const initCameOn: Record<string, number> = {};
    const initPos: Record<string, number> = {};
    players.filter((p) => p.on_field).forEach((p, i) => {
      initCameOn[p.player_id] = match.elapsed_seconds;
      initPos[p.player_id] = i;
    });
    cameOnAt.current = initCameOn;
    positionMap.current = initPos;
  }, [data?.match.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }
    intervalRef.current = setInterval(() => {
      if (clockStartedAt.current === null) return;
      const newElapsed = clockBaseElapsed.current + Math.floor((Date.now() - clockStartedAt.current) / 1000);
      setElapsed(newElapsed);

      // Auto-pause 10 minutes past the period's scheduled end
      const pLen = periodLengthRef.current;
      const periodElapsed = newElapsed - periodStartAt.current;
      if (pLen > 0 && periodElapsed >= pLen + AUTO_STOP_BUFFER_SEC) {
        clearInterval(intervalRef.current!);
        intervalRef.current = null;
        clockStartedAt.current = null;
        if (matchId) localStorage.removeItem(lsClockKey(matchId));
        setRunning(false);
        updateMatch.mutate({ status: "paused", elapsed_seconds: newElapsed });
      }
    }, 1000);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-sync elapsed from wall clock whenever the tab becomes visible again
  useEffect(() => {
    function onVisibilityChange() {
      if (!document.hidden && clockStartedAt.current !== null) {
        setElapsed(clockBaseElapsed.current + Math.floor((Date.now() - clockStartedAt.current) / 1000));
      }
    }
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useEffect(() => {
    function onPointerMove(e: PointerEvent) {
      lastPointerPos.current = { x: e.clientX, y: e.clientY };
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (t) lastPointerPos.current = { x: t.clientX, y: t.clientY };
    }
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("touchmove", onTouchMove);
    };
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 0, tolerance: 5 } }),
  );

  if (isLoading || !data) {
    return (
      <AppShell title="Kamp" showBack>
        <div className="text-ink-muted">Laster …</div>
      </AppShell>
    );
  }

  const { match, players } = data;
  playersRef.current = players;
  const fieldPlayers = players.filter((p) => p.on_field);
  fieldPlayersRef.current = fieldPlayers;
  const benchPlayers = players
    .filter((p) => !p.on_field)
    .sort((a, b) => getPlayTime(a) - getPlayTime(b));
  const activePlayer = activeId ? (players.find((p) => p.player_id === activeId) ?? null) : null;
  const periodElapsed = Math.max(0, elapsed - periodStartAt.current);
  const isLastPeriod = match.current_period >= match.period_count;
  const isHandball   = match.sport_id === "handball";
  const isHockey     = match.sport_id === "hockey";
  const isBasketball = match.sport_id === "basketball";

  const positions = (
    isHandball   ? getHandballPositions(match.players_on_field) :
    isHockey     ? getHockeyPositions(match.players_on_field) :
    isBasketball ? getBasketballPositions(match.players_on_field) :
    getFormationPositions(match.players_on_field, formation)
  ).map(p => ({ x: p.x, y: toCroppedY(p.y) }));

  const pitchSpec =
    isHandball   ? HANDBALL_COURT_SPEC :
    isHockey     ? HOCKEY_RINK_SPEC :
    isBasketball ? BASKETBALL_COURT_SPEC :
    (PITCH_SPECS[match.players_on_field] ?? PITCH_SPECS[11]);

  const isEleven = !isHandball && !isHockey && !isBasketball && match.players_on_field === 11;

  function getPlayTime(mp: RichMatchPlayer) {
    if (mp.on_field) {
      const came = cameOnAt.current[mp.player_id] ?? elapsed;
      return mp.total_play_seconds + Math.max(0, elapsed - came);
    }
    return mp.total_play_seconds;
  }

  function getFP(mp: RichMatchPlayer) {
    return calcFP(getPlayTime(mp), elapsed, match.players_on_field, players.length);
  }

  const MAX_DROP_RADIUS_PX = 70;

  function closestFieldPlayer(cx: number, cy: number): RichMatchPlayer | null {
    const pitchEl = document.getElementById("pitch-container");
    if (!pitchEl) return null;
    const pitchRect = pitchEl.getBoundingClientRect();
    let closest: RichMatchPlayer | null = null;
    let minDist = Infinity;
    for (const fp of fieldPlayersRef.current) {
      const posIdx = positionMap.current[fp.player_id] ?? 0;
      const pos = positions[posIdx] ?? { x: 50, y: 50 };
      const dist = Math.hypot(
        cx - (pitchRect.left + (pos.x / 100) * pitchRect.width),
        cy - (pitchRect.top + (pos.y / 100) * pitchRect.height),
      );
      if (dist < minDist) { minDist = dist; closest = fp; }
    }
    return minDist <= MAX_DROP_RADIUS_PX ? closest : null;
  }

  async function handleStart() {
    const now = Date.now();
    clockBaseElapsed.current = elapsed;
    clockStartedAt.current = now;
    if (matchId) {
      localStorage.setItem(lsClockKey(matchId), JSON.stringify({ startedAt: now, baseElapsed: elapsed }));
    }
    setRunning(true);
    players.filter((p) => p.on_field).forEach((p) => {
      cameOnAt.current[p.player_id] ??= elapsed;
    });
    await updateMatch.mutateAsync({ status: "live", elapsed_seconds: elapsed });
  }

  async function handlePause() {
    const currentElapsed = computeLiveElapsed();
    clockStartedAt.current = null;
    if (matchId) localStorage.removeItem(lsClockKey(matchId));
    setElapsed(currentElapsed);
    setRunning(false);
    await updateMatch.mutateAsync({ status: "paused", elapsed_seconds: currentElapsed });
  }

  async function handleEndPeriod() {
    const currentElapsed = computeLiveElapsed();
    clockStartedAt.current = null;
    if (matchId) localStorage.removeItem(lsClockKey(matchId));
    setElapsed(currentElapsed);
    setRunning(false);
    const fieldPlayerFinalSeconds = fieldPlayers.map((mp) => {
      const came = cameOnAt.current[mp.player_id] ?? currentElapsed;
      return {
        player_id: mp.player_id,
        total_play_seconds: mp.total_play_seconds + Math.max(0, currentElapsed - came),
      };
    });
    await endPeriod.mutateAsync({
      elapsed: currentElapsed,
      currentPeriod: match.current_period,
      periodCount: match.period_count,
      fieldPlayerFinalSeconds,
    });
    if (isLastPeriod) {
      navigate(`/matches/${matchId}/summary`);
    } else {
      periodStartAt.current = currentElapsed;
    }
  }

  function openGoalDialog(team: "home" | "away") {
    setGoalDialog({ team });
  }

  async function confirmGoal(scorerId: string | null, assistId: string | null) {
    if (!goalDialog) return;
    const { team } = goalDialog;
    const newHome = team === "home" ? scoreHome + 1 : scoreHome;
    const newAway = team === "away" ? scoreAway + 1 : scoreAway;
    setScoreHome(newHome);
    setScoreAway(newAway);
    setGoalDialog(null);
    await Promise.all([
      updateMatch.mutateAsync({ score_home: newHome, score_away: newAway }),
      logGoal.mutateAsync({ team, scorerPlayerId: scorerId, assistPlayerId: assistId, atSeconds: elapsed }),
    ]);
  }

  function handleFormationChange(newFormation: string) {
    setFormation(newFormation);
    updateMatch.mutate({ formation: newFormation });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
  }

  function handleDragMove(e: DragMoveEvent) {
    if (!e.over || e.over.id !== "pitch") { setPendingSwapId(null); return; }
    const pos = lastPointerPos.current;
    if (!pos) return;
    setPendingSwapId(closestFieldPlayer(pos.x, pos.y)?.player_id ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setPendingSwapId(null);
    if (!over || over.id !== "pitch") return;
    const benchPlayer = playersRef.current.find((p) => p.player_id === active.id);
    if (!benchPlayer || benchPlayer.on_field) return;
    const pos = lastPointerPos.current;
    if (!pos) return;
    const fieldPlayer = closestFieldPlayer(pos.x, pos.y);
    if (!fieldPlayer) return;
    const goingOffTotalSeconds = getPlayTime(fieldPlayer);
    const posIdx = positionMap.current[fieldPlayer.player_id] ?? 0;
    positionMap.current[benchPlayer.player_id] = posIdx;
    delete positionMap.current[fieldPlayer.player_id];
    cameOnAt.current[benchPlayer.player_id] = elapsed;
    delete cameOnAt.current[fieldPlayer.player_id];
    substitute.mutate({
      comingOnId: benchPlayer.player_id,
      goingOffId: fieldPlayer.player_id,
      goingOffTotalSeconds,
      atSeconds: elapsed,
    });
  }

  return (
    <DndContext sensors={sensors} collisionDetection={rectIntersection}
      onDragStart={handleDragStart} onDragMove={handleDragMove} onDragEnd={handleDragEnd}>
      <AppShell title={match.opponent ? `vs ${match.opponent}` : "Kamp"} showBack
        rightSlot={match.status !== "finished" ? (
          <div className="flex flex-col items-end leading-none">
            <span className="font-mono text-lg font-bold tabular-nums">{fmtTime(periodElapsed)}</span>
            <span className="text-[10px] text-ink-muted">{match.current_period}. omgang</span>
          </div>
        ) : undefined}
      >

        {/* Clock bar */}
        <div className="mb-3 flex items-center justify-between rounded-xl bg-ink px-4 py-3 text-cream">
          <div>
            <div className="text-sm opacity-70">
              {match.current_period}. omgang av {match.period_count}
            </div>
            <div className="font-display text-6xl font-bold tabular-nums leading-none">
              {fmtTime(periodElapsed)}
            </div>
          </div>
          {match.status === "finished" ? (
            <div className="text-sm font-medium opacity-60">Kamp avsluttet</div>
          ) : (
            <div className="flex flex-col items-end gap-1.5">
              {match.status === "live" ? (
                <Button variant="ghost" size="sm"
                  className="border border-cream/30 text-cream hover:bg-cream/10"
                  onClick={handlePause}>Pause</Button>
              ) : (
                <Button variant="ghost" size="sm"
                  className="border border-cream/30 text-cream hover:bg-cream/10"
                  onClick={handleStart}>
                  {match.status === "pending"
                    ? "Start"
                    : periodElapsed === 0
                      ? `Start omgang ${match.current_period}`
                      : "Fortsett"}
                </Button>
              )}
              <Button variant="ghost" size="sm"
                className="border border-cream/30 text-cream hover:bg-cream/10"
                onClick={isLastPeriod ? () => setConfirmEndOpen(true) : handleEndPeriod}
                disabled={endPeriod.isPending}>
                {isLastPeriod ? "Avslutt kamp" : "Neste omgang →"}
              </Button>
            </div>
          )}
        </div>

        {/* Score */}
        {match.track_goals && <div className="mb-3 flex items-center rounded-xl border border-ink/10 bg-cream-dark px-4 py-3">
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="max-w-[100px] truncate text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">{team?.name ?? "Vi"}</span>
            <span className="font-display text-5xl font-bold tabular-nums text-ink leading-none">{scoreHome}</span>
            {match.status !== "finished" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => { if (scoreHome > 0) { setScoreHome(scoreHome - 1); updateMatch.mutate({ score_home: scoreHome - 1, score_away: scoreAway }); } }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10">−</button>
                <button type="button" onClick={() => openGoalDialog("home")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10">+</button>
              </div>
            )}
          </div>
          <span className="font-display text-2xl font-bold text-ink/20 mx-2">–</span>
          <div className="flex flex-1 flex-col items-center gap-1.5">
            <span className="max-w-[100px] truncate text-center text-xs font-semibold uppercase tracking-widest text-ink-muted">
              {match.opponent ?? "Motstander"}
            </span>
            <span className="font-display text-5xl font-bold tabular-nums text-ink leading-none">{scoreAway}</span>
            {match.status !== "finished" && (
              <div className="flex gap-2">
                <button type="button" onClick={() => openGoalDialog("away")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10">+</button>
                <button type="button" onClick={() => { if (scoreAway > 0) { setScoreAway(scoreAway - 1); updateMatch.mutate({ score_home: scoreHome, score_away: scoreAway - 1 }); } }}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10">−</button>
              </div>
            )}
          </div>
        </div>}

        {/* Pitch + optional formation badge — full bleed on mobile */}
        <div className="-mx-4 relative mb-1">
          {isEleven && match.status !== "finished" && (
            <button type="button"
              onClick={() => setFormationDialogOpen(true)}
              className="absolute -top-0 right-0 z-10 rounded-full border border-ink/20 bg-cream px-2.5 py-0.5 text-xs font-semibold text-ink-muted shadow-sm">
              {formation ?? "4-4-2"}
            </button>
          )}
          <PitchZone anyDragging={!!activeId} spec={pitchSpec}
            bgColor={
              isHandball   ? "bg-[#C8A45A]" :
              isHockey     ? "bg-[#9ec8e0]" :
              isBasketball ? "bg-[#c8944a]" :
              "bg-green-700"
            }>
            {isHandball   ? <HandballCourtMarkings spec={HANDBALL_COURT_SPEC} /> :
             isHockey     ? <HockeyRinkMarkings spec={HOCKEY_RINK_SPEC} /> :
             isBasketball ? <BasketballCourtMarkings spec={BASKETBALL_COURT_SPEC} /> :
             <PitchMarkings spec={pitchSpec as PitchSpec} />
            }
            {fieldPlayers.map((mp, i) => {
              const posIdx = positionMap.current[mp.player_id] ?? i;
              return (
                <FieldToken key={mp.player_id} mp={mp}
                  pos={positions[posIdx] ?? { x: 50, y: 50 }}
                  playSeconds={getPlayTime(mp)} fpColor={getFP(mp)}
                  isPendingSwap={mp.player_id === pendingSwapId} />
              );
            })}
            {activeId && (
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-medium text-white/80 pointer-events-none">
                {pendingSwapId
                  ? `Bytt ut ${players.find((p) => p.player_id === pendingSwapId)?.player.name.split(" ")[0]}`
                  : "Dra over en spiller for å bytte"}
              </div>
            )}
          </PitchZone>
        </div>

        {/* Fair play legend */}
        <div className="mt-2 mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-ink-muted">
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" />Mye</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-green-500" />Balansert</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-yellow-400" />Litt under</span>
          <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-red-500" />Mye under</span>
        </div>

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <div>
            <p className="mb-2 text-base font-semibold text-ink">
              Benk <span className="font-normal text-ink-muted">({benchPlayers.length})</span>
              <span className="ml-2 text-sm font-normal text-ink-muted">— dra opp på banen for å bytte</span>
            </p>
            <div className="flex flex-wrap gap-4">
              {benchPlayers.map((mp) => (
                <BenchItem key={mp.player_id} mp={mp}
                  playSeconds={getPlayTime(mp)} fpColor={getFP(mp)} />
              ))}
            </div>
          </div>
        )}

        {/* Drag overlay */}
        <DragOverlay dropAnimation={null} modifiers={[snapCenterToCursor]}>
          {activePlayer && (() => {
            const firstName = activePlayer.player.name.split(" ")[0];
            const fp = getFP(activePlayer);
            const fontSize = firstName.length <= 4 ? "text-sm" : firstName.length <= 6 ? "text-xs" : "text-[10px]";
            return (
              <div className="flex flex-col items-center gap-1.5 pointer-events-none scale-110">
                <div className={cn(
                  "flex h-14 w-14 items-center justify-center rounded-full font-bold text-center leading-tight px-1 shadow-2xl",
                  FP_CIRCLE_BG[fp], FP_CIRCLE_TEXT[fp], fontSize,
                )}>
                  {firstName}
                </div>
              </div>
            );
          })()}
        </DragOverlay>

        {/* Goal dialog */}
        {match.track_goals && (
          <GoalDialog
            open={goalDialog !== null}
            team={goalDialog?.team ?? "home"}
            opponent={match.opponent}
            teamName={team?.name ?? null}
            players={players}
            onConfirm={confirmGoal}
            onCancel={() => setGoalDialog(null)}
          />
        )}

        {/* Formation dialog */}
        <FormationDialog
          open={formationDialogOpen}
          current={formation ?? "4-4-2"}
          onSelect={handleFormationChange}
          onClose={() => setFormationDialogOpen(false)}
        />

        {/* Confirm end match dialog */}
        <Dialog open={confirmEndOpen} onOpenChange={setConfirmEndOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Avslutt kamp?</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-ink-muted">Kampen avsluttes og spilletid lagres. Dette kan ikke angres.</p>
            <div className="mt-4 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirmEndOpen(false)}>Avbryt</Button>
              <Button onClick={() => { setConfirmEndOpen(false); handleEndPeriod(); }}>Avslutt kamp</Button>
            </div>
          </DialogContent>
        </Dialog>

      </AppShell>
    </DndContext>
  );
}
