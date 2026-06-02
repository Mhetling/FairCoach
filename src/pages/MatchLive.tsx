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
  useMatchEvents,
  useSubstitute,
  useBulkSubstitute,
  useUpdateAllPlayerMetas,
  useUpdateMatch,
  useUpdatePlayerMeta,
  useUpdatePlayerPlayTime,
  useAddExtraPlayer,
  useRemoveExtraPlayer,
  type RichMatchEvent,
  type RichMatchPlayer,
} from "@/hooks/useMatch";
import type { ZoneTime } from "@/types/database";
import { useTeam } from "@/hooks/useTeams";
import {
  PITCH_SPECS, getHandballCourtSpec, getBasketballCourtSpec,
  type PitchSpec, type BasketballCourtSpec,
} from "@/lib/pitchSpecs";
import {
  ELEVEN_FORMATIONS, getFormationPositions, getHandballPositions,
  getHandballCourtPositions, resolveHandballFormatId,
  getBasketballCourtPositions, resolveBasketballFormatId,
} from "@/lib/formations";
import {
  RINK_SPECS, RINK_POSITIONS, resolveHockeyFormat, type HockeyFormat,
} from "@/lib/hockeyRinks";
import { type HockeyLine, loadHockeyLines, saveHockeyLines, autoSplitLines, linePlayerIds } from "@/lib/hockeyLines";
import { HockeyLineSetupDialog, type LineSetupPlayer } from "@/components/HockeyLineSetupDialog";
import { HockeyRinkHalfContent } from "@/components/HockeyRink";
import { SPORT_CONFIGS } from "@/lib/sportConfig";

// ─── Utilities ────────────────────────────────────────────────────────────────

// Auto-pause the clock this many seconds past the period's scheduled end
const AUTO_STOP_BUFFER_SEC = 15 * 60;

function lsClockKey(matchId: string) {
  return `faircoach_clock_${matchId}`;
}

const CROP_START = 1 / 3; // soccer/basketball: show from y=33% to y=100%

function toCroppedY(y: number): number {
  return Math.max(0, Math.min(100, (y - CROP_START * 100) / ((1 - CROP_START) * 100) * 100));
}

// handball: show own defensive half only (full-court y=50–100% → view y=0–100%)
function toHandballY(y: number): number {
  return Math.max(0, Math.min(100, (y - 50) * 2));
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

// ─── Zone helpers ─────────────────────────────────────────────────────────────

export const ZONE_DISPLAY: Record<string, string> = {
  keeper: "Keeper",
  "l-back": "V. back", back: "Back", "r-back": "H. back",
  "l-wing": "V. kant", wing: "Kant", "r-wing": "H. kant",
  "l-ving": "V. ving", ving: "Ving", "r-ving": "H. ving",
  senter: "Senter",
  strek: "Strek",
  "l-midt": "V. midt", midt: "Midt", "r-midt": "H. midt",
  "l-angrep": "V. angrep", angrep: "Angrep", "r-angrep": "H. angrep",
};
const ZONE_ORDER = [
  "keeper",
  "l-back", "back", "r-back",
  "l-ving", "ving", "r-ving",
  "l-wing", "wing", "r-wing",
  "senter",
  "strek",
  "l-midt", "midt", "r-midt",
  "l-angrep", "angrep", "r-angrep",
];

function computeZoneForSlot(
  posIdx: number,
  sportId: string,
  hockeyFmt: HockeyFormat,
  playersOnField: number,
  formation: string | null,
): string {
  if (sportId === "basketball") return "midt";
  if (sportId === "hockey") {
    const rinkPos = RINK_POSITIONS[hockeyFmt][posIdx];
    if (rinkPos?.isGoalie) return "keeper";
    switch (rinkPos?.id) {
      case 'ld': return "l-back";
      case 'rd': return "r-back";
      case 'c':  return "senter";
      case 'lw': return "l-ving";
      case 'rw': return "r-ving";
      default: {
        const x = rinkPos?.x ?? 50;
        const y = rinkPos?.y ?? 60;
        const side = x < 42 ? "l-" : x > 58 ? "r-" : "";
        return y >= 70 ? `${side}back` : y < 65 ? `${side}ving` : "senter";
      }
    }
  }
  if (sportId === "handball") {
    const fmtId = resolveHandballFormatId(formation, playersOnField);
    const courtPos = getHandballCourtPositions(fmtId)[posIdx];
    if (!courtPos) return "back";
    if (courtPos.isGoalkeeper) return "keeper";
    switch (courtPos.id) {
      case 'st': return "strek";
      case 'vk': return "l-wing";
      case 'hk': return "r-wing";
      case 'vb': return "l-back";
      case 'hb': return "r-back";
      case 'mb': return "back";
      default: {
        const { x, y } = courtPos;
        if (x <= 20) return "l-wing";
        if (x >= 80) return "r-wing";
        return y < 50 ? (x < 50 ? "l-angrep" : "r-angrep") : (x < 47 ? "l-back" : x > 53 ? "r-back" : "back");
      }
    }
  }
  // Soccer — posIdx 0 is always GK (3v3 has no keeper)
  if (posIdx === 0 && playersOnField > 3) return "keeper";
  const rawPositions = getFormationPositions(playersOnField, formation);
  const pos = rawPositions[posIdx];
  const y = pos?.y ?? 65;
  const x = pos?.x ?? 50;
  const side = x < 42 ? "l-" : x > 58 ? "r-" : "";
  const depth = y > 75 ? "back" : y >= 55 ? "midt" : "angrep";
  return `${side}${depth}`;
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

function HandballCourtMarkings({ formatId }: { formatId: string }) {
  const spec = getHandballCourtSpec(formatId);
  const { width: W, length: L, goalWidth: G, goalAreaRadius: R6, freeThrowRadius: R9, penaltyDistance: P7 } = spec;
  const cx = W / 2;
  const sw = W / 60;
  const line = { fill: "none" as const, stroke: "white", strokeOpacity: 0.5, strokeWidth: sw };
  const dash = { ...line, strokeDasharray: `${sw * 3} ${sw * 2}` };
  const goalLine = { stroke: "white", strokeOpacity: 0.9, strokeWidth: sw * 3, fill: "none" as const };
  const lx = cx - G / 2;
  const rx = cx + G / 2;

  // D-shape: rectangle (goalWidth × r) + two quarter circles of radius r at each goalpost
  function dPath(y0: number, r: number, dir: 1 | -1) {
    const yc = y0 + r * dir;
    const sweep = dir === 1 ? 0 : 1;
    return `M ${lx - r},${y0} A ${r},${r} 0 0,${sweep} ${lx},${yc} L ${rx},${yc} A ${r},${r} 0 0,${sweep} ${rx + r},${y0}`;
  }

  // All formats: show own defensive half — from center line (top) to own goal (bottom)
  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden"
      viewBox={`0 ${L / 2} ${W} ${L / 2}`} preserveAspectRatio="none">
      <rect x={0} y={0} width={W} height={L} {...line} />
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} {...line} />
      <circle cx={cx} cy={L / 2} r={sw * 1.5} fill="white" fillOpacity={0.5} stroke="none" />
      {/* Own goal (bottom) — D-shape, 9m dashed, 7m mark, goal line */}
      {R6 != null && <path d={dPath(L, R6, -1)} {...line} />}
      {R9 != null && <path d={dPath(L, R9, -1)} {...dash} />}
      {P7 != null && <line x1={cx - 0.5} y1={L - P7} x2={cx + 0.5} y2={L - P7} stroke="white" strokeOpacity={0.6} strokeWidth={sw * 2} fill="none" />}
      <line x1={lx} y1={L} x2={rx} y2={L} {...goalLine} />
    </svg>
  );
}

// ─── Hockey rink markings ─────────────────────────────────────────────────────


// ─── Basketball court markings ────────────────────────────────────────────────

// Returns the y-coordinate to start the half-court view and the total view height.
// Crops above the three-point arc (or above the FT line for no-arc formats).
function getBasketballCrop(spec: BasketballCourtSpec): { cropStart: number; viewHeight: number } {
  if (spec.halfCourt) return { cropStart: 0, viewHeight: spec.length };
  const { length: L, basketDistance: BD, threePointRadius: TPR, keyDepth: KD } = spec;
  const topMark = TPR != null ? L - BD - TPR : L - KD;
  const buf     = TPR != null ? 1.5 : 2.0;
  const cropStart = Math.max(L / 2, topMark - buf);
  return { cropStart, viewHeight: L - cropStart + 1 };  // +1 m below baseline for breathing room
}

function BasketballCourtMarkings({ spec }: { spec: BasketballCourtSpec }) {
  const { width: W, length: L, threePointRadius: TPR, keyWidth: KW, keyDepth: KD,
    basketDistance: BD, centerCircleRadius: CCR, freeThrowRadius: FTR, halfCourt: HC } = spec;
  const cx = W / 2;
  const sw = W / 100;
  const line = { fill: "none" as const, stroke: "white", strokeOpacity: 0.5, strokeWidth: sw };
  const dash = { ...line, strokeDasharray: `${sw * 4} ${sw * 3}` };
  const dot  = { fill: "white", fillOpacity: 0.5, stroke: "none" as const };
  const keyFill = { fill: "white", fillOpacity: 0.07 };
  const kx = (W - KW) / 2;

  // Three-point path centred on the basket (not the baseline).
  // baselineY: y of the baseline end; dir=1 top end, dir=-1 bottom end.
  function threePointPath(baselineY: number, dir: 1 | -1): string {
    if (TPR == null) return "";
    const cornerX = 0.9;              // straight portion: 0.9 m from sideline
    const dx = cx - cornerX;          // horizontal distance from centre to corner
    const dy = Math.sqrt(Math.max(0, TPR * TPR - dx * dx));
    const basketCY = baselineY + dir * BD;  // basket centre y
    const cornerY  = basketCY - dir * dy;   // where straight meets arc
    const sweep = dir === 1 ? 0 : 1;
    return [
      `M ${cornerX},${baselineY}`,
      `L ${cornerX},${cornerY}`,
      `A ${TPR},${TPR} 0 1,${sweep} ${W - cornerX},${cornerY}`,
      `L ${W - cornerX},${baselineY}`,
    ].join(" ");
  }

  // Crop the view to just above the three-point arc (or FT line) to remove empty space.
  const { cropStart, viewHeight } = getBasketballCrop(spec);
  const viewBox = `0 ${cropStart} ${W} ${viewHeight}`;

  // Basket positions
  const botBasketY = L - BD;          // bottom basket centre y
  const botBoardY  = L - BD + 0.375;  // backboard behind basket (toward baseline)
  const topBasketY = BD;              // top basket centre y (3×3 only)
  const topBoardY  = BD - 0.375;      // backboard toward top baseline

  return (
    <svg className="absolute inset-0 h-full w-full pointer-events-none overflow-hidden"
      viewBox={viewBox} preserveAspectRatio="none">
      {/* Outer boundary */}
      <rect x={0} y={0} width={W} height={L} {...line} />

      {/* Centre line + half-circle — only for 3×3 full-court view.
          For cropped half-court views the centre line is above the viewport. */}
      {HC && <>
        <line x1={0} y1={L / 2} x2={W} y2={L / 2} {...line} />
        <circle cx={cx} cy={L / 2} r={CCR} {...line} />
        <circle cx={cx} cy={L / 2} r={sw * 0.8} {...dot} />
      </>}

      {/* Top basket (3×3 only — full-court view) */}
      {HC && <>
        <rect x={kx} y={0} width={KW} height={KD} {...keyFill} />
        <rect x={kx} y={0} width={KW} height={KD} {...line} />
        {/* FT circle: dashed half outside key (curves away from basket), solid half inside */}
        <path d={`M ${cx - FTR},${KD} A ${FTR},${FTR} 0 0,1 ${cx + FTR},${KD}`} {...dash} />
        <path d={`M ${cx - FTR},${KD} A ${FTR},${FTR} 0 0,0 ${cx + FTR},${KD}`} {...line} />
        <path d={`M ${cx - 1.25},${topBasketY} A 1.25,1.25 0 0,0 ${cx + 1.25},${topBasketY}`}
          {...{ fill: "rgba(255,255,255,0.06)", stroke: "white", strokeOpacity: 0.35, strokeWidth: sw }} />
        <circle cx={cx} cy={topBasketY} r={0.45} {...{ fill: "#ff6b6b", fillOpacity: 0.75, stroke: "white", strokeWidth: sw * 1.5 }} />
        <line x1={cx - 0.9} y1={topBoardY} x2={cx + 0.9} y2={topBoardY}
          {...{ stroke: "white", strokeOpacity: 0.7, strokeWidth: sw * 2, fill: "none" }} />
        {TPR != null && <path d={threePointPath(0, 1)} {...line} />}
      </>}

      {/* Bottom basket — always shown */}
      <rect x={kx} y={L - KD} width={KW} height={KD} {...keyFill} />
      <rect x={kx} y={L - KD} width={KW} height={KD} {...line} />
      {/* FT circle: solid half outside key (bows toward center), dashed half inside key (bows toward basket) */}
      <path d={`M ${cx - FTR},${L - KD} A ${FTR},${FTR} 0 0,0 ${cx + FTR},${L - KD}`} {...dash} />
      <path d={`M ${cx - FTR},${L - KD} A ${FTR},${FTR} 0 0,1 ${cx + FTR},${L - KD}`} {...line} />
      <path d={`M ${cx - 1.25},${botBasketY} A 1.25,1.25 0 0,1 ${cx + 1.25},${botBasketY}`}
        {...{ fill: "rgba(255,255,255,0.06)", stroke: "white", strokeOpacity: 0.35, strokeWidth: sw }} />
      <circle cx={cx} cy={botBasketY} r={0.45} {...{ fill: "#ff6b6b", fillOpacity: 0.75, stroke: "white", strokeWidth: sw * 1.5 }} />
      <line x1={cx - 0.9} y1={botBoardY} x2={cx + 0.9} y2={botBoardY}
        {...{ stroke: "white", strokeOpacity: 0.7, strokeWidth: sw * 2, fill: "none" }} />
      {TPR != null && <path d={threePointPath(L, -1)} {...line} />}
    </svg>
  );
}

// ─── Pitch drop zone ──────────────────────────────────────────────────────────

function PitchZone({ children, anyDragging, spec, bgColor = "bg-green-700", fullLength = false, halfLength = false, aspectOverride }: {
  children: React.ReactNode; anyDragging: boolean; spec: { width: number; length: number };
  bgColor?: string; fullLength?: boolean; halfLength?: boolean; aspectOverride?: string;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "pitch" });
  const ar = aspectOverride ?? (halfLength
    ? `${spec.width} / ${spec.length / 2}`
    : fullLength
    ? `${spec.width} / ${spec.length}`
    : `${spec.width} / ${spec.length * 2 / 3}`);
  return (
    <div id="pitch-container" ref={setNodeRef}
      className={cn(
        "relative w-full overflow-hidden rounded-xl transition-shadow",
        bgColor,
        isOver && anyDragging && "ring-2 ring-yellow-400 ring-offset-1",
      )}
      style={{ aspectRatio: ar }}>
      {children}
    </div>
  );
}

// ─── Field token ──────────────────────────────────────────────────────────────

function FieldToken({ mp, pos, playSeconds, fpColor, isPendingSwap, positionLabel, isGK,
  subOutRank, lightSurface, onLongPressStart, onLongPressEnd }: {
  mp: RichMatchPlayer; pos: { x: number; y: number };
  playSeconds: number; fpColor: FPColor; isPendingSwap: boolean;
  positionLabel?: string; isGK?: boolean; subOutRank?: number; lightSurface?: boolean;
  onLongPressStart?: () => void; onLongPressEnd?: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: mp.player_id });
  const firstName = mp.player.name.split(" ")[0];
  const fontSize = firstName.length <= 4 ? "text-sm" : firstName.length <= 6 ? "text-xs" : "text-[10px]";

  const mergedListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerDown?.(e);
      onLongPressStart?.();
    },
    onPointerUp: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerUp?.(e);
      onLongPressEnd?.();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerCancel?.(e);
      onLongPressEnd?.();
    },
  };

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...mergedListeners}
      style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
      className={cn(
        "absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-px",
        "touch-none select-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}
    >
      {(positionLabel ?? (isGK ? "MV" : undefined)) && (
        <span className="rounded bg-black/40 px-1 py-px text-[8px] font-bold uppercase tracking-wider text-white/90 backdrop-blur-sm pointer-events-none">
          {positionLabel ?? "MV"}
        </span>
      )}
      <div className="relative pointer-events-none">
        <div className={cn(
          "flex h-[46px] w-[46px] items-center justify-center rounded-full border-2 font-bold text-center leading-tight px-1 transition-all duration-150 shadow-md",
          fontSize,
          isPendingSwap
            ? "scale-125 border-yellow-400 bg-yellow-400 text-ink shadow-lg"
            : isGK
            ? "border-white/50 bg-slate-400 text-white"
            : cn("border-white", FP_CIRCLE_BG[fpColor], FP_CIRCLE_TEXT[fpColor]),
        )}>
          {firstName}
        </div>
        {subOutRank !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white/90 text-[9px] font-bold text-ink shadow">
            {subOutRank}
          </span>
        )}
      </div>
      <span className={cn(
        "text-[10px] font-mono mt-0.5 pointer-events-none",
        lightSurface
          ? "rounded px-0.5 bg-black/20 text-ink/90"
          : "text-white/90 drop-shadow",
      )}>
        {fmtTime(playSeconds)}
      </span>
    </div>
  );
}

// ─── Bench item ───────────────────────────────────────────────────────────────

function BenchItem({ mp, playSeconds, fpColor, priority, onLongPressStart, onLongPressEnd }: {
  mp: RichMatchPlayer; playSeconds: number; fpColor: FPColor; priority?: number;
  onLongPressStart?: () => void; onLongPressEnd?: () => void;
}) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({ id: mp.player_id });
  const firstName = mp.player.name.split(" ")[0];
  const fontSize = firstName.length <= 4 ? "text-sm" : firstName.length <= 6 ? "text-xs" : "text-[10px]";

  const mergedListeners = {
    ...listeners,
    onPointerDown: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerDown?.(e);
      onLongPressStart?.();
    },
    onPointerUp: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerUp?.(e);
      onLongPressEnd?.();
    },
    onPointerCancel: (e: React.PointerEvent) => {
      (listeners as Record<string, (e: React.PointerEvent) => void>).onPointerCancel?.(e);
      onLongPressEnd?.();
    },
  };

  return (
    <div ref={setNodeRef} {...attributes} {...mergedListeners}
      className={cn(
        "flex flex-col items-center gap-1.5 select-none touch-none cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30",
      )}>
      <div className="relative pointer-events-none">
        <div className={cn(
          "flex h-14 w-14 items-center justify-center rounded-full font-bold text-center leading-tight px-1",
          FP_CIRCLE_BG[fpColor], FP_CIRCLE_TEXT[fpColor], fontSize,
        )}>
          {firstName}
        </div>
        {priority !== undefined && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-ink text-[9px] font-bold text-cream shadow">
            {priority}
          </span>
        )}
      </div>
      <div className="text-xs font-mono text-ink-muted pointer-events-none">{fmtTime(playSeconds)}</div>
    </div>
  );
}

// ─── Player detail / play-time edit dialog ────────────────────────────────────

const NOTE_PRESETS = ["Skadet", "Ville ikke spille", "Foreldreavtale", "Utvist"];

function dominantSideLabel(sportId: string, side: "R" | "L"): string {
  const word = sportId === "soccer" ? (side === "R" ? "Høyrefot" : "Venstrefot")
    : sportId === "hockey" ? (side === "R" ? "Høyre skudd" : "Venstre skudd")
    : side === "R" ? "Høyrehendt" : "Venstrehendt";
  return word;
}

function PlayerDetailDialog({ mp, sportId, currentPlaySeconds, events, liveZones, onSave, onClose }: {
  mp: RichMatchPlayer;
  sportId: string;
  currentPlaySeconds: number;
  events: RichMatchEvent[];
  liveZones: ZoneTime[];
  onSave: (newSeconds: number, meta: { note?: string; freeNote?: string } | null) => Promise<void>;
  onClose: () => void;
}) {
  const [editSeconds, setEditSeconds] = useState(currentPlaySeconds);
  const [note, setNote] = useState<string | null>(mp.meta?.note ?? null);
  const [freeNote, setFreeNote] = useState(mp.meta?.freeNote ?? "");
  const [saving, setSaving] = useState(false);

  const playerEvents = events
    .filter((e) => e.player_id === mp.player_id && ["on", "off", "goal"].includes(e.event_type))
    .sort((a, b) => a.at_seconds - b.at_seconds);

  function eventLabel(e: RichMatchEvent) {
    const min = Math.floor(e.at_seconds / 60);
    if (e.event_type === "on")   return `${min}' — Kom inn`;
    if (e.event_type === "off")  return `${min}' — Gikk ut`;
    if (e.event_type === "goal") return `${min}' — Mål`;
    return `${min}' — ${e.event_type}`;
  }

  async function handleSave() {
    setSaving(true);
    const meta = (note || freeNote.trim())
      ? { ...(note ? { note } : {}), ...(freeNote.trim() ? { freeNote: freeNote.trim() } : {}) }
      : null;
    try { await onSave(editSeconds, meta); } finally { setSaving(false); }
  }

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mp.player.jersey_number != null ? `#${mp.player.jersey_number} ` : ""}
            {mp.player.name}
          </DialogTitle>
          {mp.player.dominant_side && (
            <p className="text-xs text-ink-muted pt-0.5">
              {dominantSideLabel(sportId, mp.player.dominant_side)}
            </p>
          )}
        </DialogHeader>

        {/* Event history */}
        {playerEvents.length > 0 && (
          <div className="space-y-0.5">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-1.5">Hendelser</p>
            {playerEvents.map((e) => (
              <div key={e.id} className="flex items-center gap-2 rounded-md px-3 py-2 text-sm bg-cream-dark">
                <span className="w-5 text-center">
                  {e.event_type === "on"   ? "↑" :
                   e.event_type === "off"  ? "↓" :
                   (SPORT_CONFIGS[sportId as keyof typeof SPORT_CONFIGS]?.icon ?? "⚽")}
                </span>
                <span className="text-ink-muted">{eventLabel(e)}</span>
              </div>
            ))}
          </div>
        )}

        {/* Zone breakdown — auto-tracked from position */}
        {liveZones.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Posisjoner spilt</p>
            <div className="flex flex-wrap gap-2">
              {[...liveZones]
                .sort((a, b) => ZONE_ORDER.indexOf(a.zone) - ZONE_ORDER.indexOf(b.zone))
                .map((zt) => (
                  <div key={zt.zone}
                    className="rounded-lg border border-ink/15 bg-cream-dark px-3 py-2 text-sm">
                    <span className="font-medium text-ink">{ZONE_DISPLAY[zt.zone] ?? zt.zone}</span>
                    <span className="ml-2 font-mono text-xs text-ink-muted">
                      {Math.round(zt.seconds / 60)} min
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Status note */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Status</p>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setNote(null)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                note === null
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/20 bg-cream-dark text-ink-muted hover:bg-ink/5",
              )}>
              Ingen
            </button>
            {NOTE_PRESETS.map((n) => (
              <button key={n} type="button" onClick={() => setNote(note === n ? null : n)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                  note === n
                    ? "border-amber-600 bg-amber-100 text-amber-900"
                    : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
                )}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {/* Free text note */}
        <div className="space-y-2">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Notat</p>
          <textarea
            value={freeNote}
            onChange={(e) => setFreeNote(e.target.value)}
            placeholder="Andre kommentarer …"
            rows={2}
            className="w-full resize-none rounded-md border border-ink/20 bg-cream-dark px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink/30"
          />
        </div>

        {/* Play time editor */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Juster spilletid</p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setEditSeconds((s) => Math.max(0, s - 60))}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10"
            >−</button>
            <span className="flex-1 text-center font-mono text-2xl tabular-nums">{fmtTime(editSeconds)}</span>
            <button
              type="button"
              onClick={() => setEditSeconds((s) => s + 60)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-ink/20 text-lg font-bold text-ink active:bg-ink/10"
            >+</button>
          </div>
          {mp.on_field && (
            <p className="text-xs text-ink-muted">
              Spilleren er på banen — klokken nullstilles fra nå av ved lagring.
            </p>
          )}
        </div>

        <div className="flex gap-2 mt-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={handleSave} disabled={saving}>
            {saving ? "Lagrer …" : "Lagre"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Clock adjust dialog ──────────────────────────────────────────────────────

function ClockAdjustDialog({ periodElapsed, onSave, onClose }: {
  periodElapsed: number;
  onSave: (newPeriodElapsed: number) => void;
  onClose: () => void;
}) {
  const [secs, setSecs] = useState(periodElapsed);
  const adj = (delta: number) => setSecs((s) => Math.max(0, s + delta));

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Juster klokka</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-muted">
          Sett klokken til riktig tid før du starter igjen.
        </p>
        <div className="flex items-center justify-center gap-3 py-4">
          <button type="button" onClick={() => adj(-60)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink active:bg-ink/10">
            −1'
          </button>
          <button type="button" onClick={() => adj(-10)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink active:bg-ink/10">
            −10"
          </button>
          <span className="w-28 text-center font-mono text-4xl font-bold tabular-nums">
            {fmtTime(secs)}
          </span>
          <button type="button" onClick={() => adj(10)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink active:bg-ink/10">
            +10"
          </button>
          <button type="button" onClick={() => adj(60)}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-sm font-bold text-ink active:bg-ink/10">
            +1'
          </button>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={() => onSave(secs)}>Lagre</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Line change dialog ───────────────────────────────────────────────────────

const LINE_BG_LIGHT  = ["bg-blue-50",    "bg-green-50",    "bg-orange-50"   ];
const LINE_BORDER    = ["border-blue-200","border-green-200","border-orange-200"];
const LINE_TEXT_COL  = ["text-blue-700", "text-green-700", "text-orange-700"];

function LineChangeDialog({ lines, players, activeLineId, onConfirm, onClose }: {
  lines: HockeyLine[];
  players: RichMatchPlayer[];
  activeLineId: string | null;
  onConfirm: (lineId: string) => void;
  onClose: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bytt rekke</DialogTitle>
        </DialogHeader>

        <div className="space-y-2">
          {lines.map((line, li) => {
            const isActive = line.id === activeLineId;
            const benchCount = linePlayerIds(line).filter(id => {
              const mp = players.find(p => p.player_id === id);
              return mp && !mp.on_field;
            }).length;
            return (
              <button key={line.id} type="button"
                disabled={isActive}
                onClick={() => setSelectedId(line.id)}
                className={cn(
                  "w-full rounded-xl border-2 p-4 text-left transition-colors",
                  isActive
                    ? cn("opacity-60 cursor-default", LINE_BG_LIGHT[li], LINE_BORDER[li])
                    : selectedId === line.id
                    ? "border-ink bg-ink/5"
                    : "border-ink/15 bg-cream-dark hover:bg-ink/5",
                )}>
                <div className="flex items-center justify-between">
                  <span className={cn("font-semibold", isActive ? LINE_TEXT_COL[li] : "text-ink")}>
                    {line.name}
                    {isActive && <span className="ml-2 text-xs font-normal">— på isen</span>}
                  </span>
                  {!isActive && (
                    <span className="text-xs text-ink-muted">
                      {benchCount} på benken
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-ink-muted">
                  {line.slots.map(s => {
                    if (!s.playerId) return null;
                    const mp = players.find(p => p.player_id === s.playerId);
                    if (!mp) return null;
                    const first = mp.player.name.split(" ")[0];
                    const num = mp.player.jersey_number;
                    return `${s.positionLabel}: ${num != null ? `#${num} ` : ""}${first}`;
                  }).filter(Boolean).join("  ·  ")}
                </p>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Avbryt</Button>
          <Button variant="accent" className="flex-1"
            disabled={!selectedId}
            onClick={() => selectedId && onConfirm(selectedId)}>
            Bytt inn
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Goal dialog ──────────────────────────────────────────────────────────────

function GoalDialog({ open, team, opponent, teamName, players, isHockey, onConfirm, onCancel }: {
  open: boolean;
  team: "home" | "away";
  opponent: string | null;
  teamName: string | null;
  players: RichMatchPlayer[];
  isHockey: boolean;
  onConfirm: (scorerId: string | null, assist1Id: string | null, assist2Id: string | null) => void;
  onCancel: () => void;
}) {
  const [scorerId, setScorerId] = useState<string | null>(null);
  const [assist1Id, setAssist1Id] = useState<string | null>(null);
  const [assist2Id, setAssist2Id] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setScorerId(null); setAssist1Id(null); setAssist2Id(null); }
  }, [open]);

  const isHome = team === "home";
  const teamLabel = isHome ? (teamName ?? "Vi") : (opponent ?? "Motstander");

  // Hockey: only show players currently on the ice
  const pool = (isHockey
    ? players.filter(p => p.on_field)
    : players
  ).sort((a, b) => (a.player.jersey_number ?? 999) - (b.player.jersey_number ?? 999));

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

  function PlayerSection({ label, filteredPool, selectedId, onSelectId, noneLabel }: {
    label: string;
    filteredPool: typeof pool;
    selectedId: string | null;
    onSelectId: (id: string | null) => void;
    noneLabel: string;
  }) {
    const onFieldPlayers = filteredPool.filter(p => p.on_field);
    const benchPlayers = filteredPool.filter(p => !p.on_field);
    return (
      <div>
        <p className="mb-2 text-xs font-bold uppercase tracking-widest text-ink-muted">{label}</p>
        <div className="flex flex-wrap gap-2">
          <NoneChip label={noneLabel} selected={selectedId === null} onSelect={() => onSelectId(null)} />
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
        {!isHockey && onFieldPlayers.length > 0 && (
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
              filteredPool={pool}
              selectedId={scorerId}
              noneLabel="Ukjent"
              onSelectId={(id) => {
                setScorerId(id);
                if (id === assist1Id) setAssist1Id(null);
                if (id === assist2Id) setAssist2Id(null);
              }}
            />
            <PlayerSection
              label="Assist 1"
              filteredPool={pool.filter(p => p.player_id !== scorerId && p.player_id !== assist2Id)}
              selectedId={assist1Id}
              noneLabel="Ingen"
              onSelectId={(id) => {
                setAssist1Id(id);
                if (id === scorerId) setScorerId(null);
                if (id === assist2Id) setAssist2Id(null);
              }}
            />
            {isHockey && (
              <PlayerSection
                label="Assist 2"
                filteredPool={pool.filter(p => p.player_id !== scorerId && p.player_id !== assist1Id)}
                selectedId={assist2Id}
                noneLabel="Ingen"
                onSelectId={(id) => {
                  setAssist2Id(id);
                  if (id === scorerId) setScorerId(null);
                  if (id === assist1Id) setAssist1Id(null);
                }}
              />
            )}
          </div>
        ) : (
          <p className="text-sm text-ink-muted">Mål for motstanderlaget registreres uten målscorer.</p>
        )}

        <div className="mt-4 flex gap-2">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={() => onConfirm(scorerId, assist1Id, assist2Id)}>
            Registrer mål
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Extra player picker dialog (barnefotball rule) ───────────────────────────

function ExtraPlayerPickerDialog({ open, mode, players, onConfirm, onCancel }: {
  open: boolean;
  mode: "add" | "remove";
  players: RichMatchPlayer[];
  onConfirm: (playerId: string) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (open) setSelectedId(null);
  }, [open]);

  const pool = mode === "add"
    ? players.filter((p) => !p.on_field)
    : players.filter((p) => p.on_field);

  function label(mp: RichMatchPlayer) {
    return mp.player.jersey_number != null
      ? `#${mp.player.jersey_number} ${mp.player.name.split(" ")[0]}`
      : mp.player.name.split(" ")[0];
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onCancel(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {mode === "add" ? "Sett inn ekstra spiller" : "Fjern ekstra spiller"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-ink-muted">
          {mode === "add"
            ? "Velg en spiller fra benken som skal inn som ekstra spiller."
            : "Velg hvilken spiller som skal av banen (tilbake til normalt antall)."}
        </p>
        <div className="flex flex-wrap gap-2 mt-2">
          {pool.map((mp) => (
            <button
              key={mp.player_id}
              type="button"
              onClick={() => setSelectedId(mp.player_id)}
              className={cn(
                "rounded-lg border px-3 py-2 text-sm font-medium transition-colors",
                selectedId === mp.player_id
                  ? "border-ink bg-ink text-cream"
                  : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
              )}
            >
              {label(mp)}
            </button>
          ))}
        </div>
        <div className="mt-4 flex gap-3">
          <Button variant="ghost" className="flex-1" onClick={onCancel}>Avbryt</Button>
          <Button
            variant="accent"
            className="flex-1"
            disabled={!selectedId}
            onClick={() => selectedId && onConfirm(selectedId)}
          >
            {mode === "add" ? "Sett inn" : "Ta av"}
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
  const bulkSubstitute = useBulkSubstitute(matchId);
  const endPeriod = useEndPeriod(matchId);
  const logGoal = useLogGoal(matchId);
  const { data: matchEvents = [] } = useMatchEvents(matchId);
  const updatePlayerPlayTime = useUpdatePlayerPlayTime(matchId);
  const updatePlayerMeta = useUpdatePlayerMeta(matchId);
  const updateAllPlayerMetas = useUpdateAllPlayerMetas(matchId);
  const addExtraPlayer = useAddExtraPlayer(matchId);
  const removeExtraPlayer = useRemoveExtraPlayer(matchId);

  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [pendingSwapId, setPendingSwapId] = useState<string | null>(null);
  const [scoreHome, setScoreHome] = useState(0);
  const [scoreAway, setScoreAway] = useState(0);
  const [formation, setFormation] = useState<string | null>(null);
  const [goalDialog, setGoalDialog] = useState<{ team: "home" | "away" } | null>(null);
  const [extraPlayerDialog, setExtraPlayerDialog] = useState<"add" | "remove" | null>(null);
  const [formationDialogOpen, setFormationDialogOpen] = useState(false);
  const [confirmEndOpen, setConfirmEndOpen] = useState(false);
  const [clockAdjustOpen, setClockAdjustOpen] = useState(false);
  const [playerDetailId, setPlayerDetailId] = useState<string | null>(null);
  const [hockeyLines, setHockeyLines] = useState<HockeyLine[]>([]);
  const [lineSetupOpen, setLineSetupOpen] = useState(false);
  const [lineChangeOpen, setLineChangeOpen] = useState(false);
  const [, setSwapVersion] = useState(0); // triggers re-render after field swaps

  const cameOnAt = useRef<Record<string, number>>({});
  const periodStartAt = useRef(0);
  const positionMap = useRef<Record<string, number>>({});
  const zoneAccumRef = useRef<Record<string, ZoneTime[]>>({});
  const zoneStartRef = useRef<Record<string, { zone: string; startElapsed: number }>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastPointerPos = useRef<{ x: number; y: number } | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

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

    let loadedLines: HockeyLine[] | null = null;
    if (match.sport_id === "hockey" && matchId) {
      loadedLines = loadHockeyLines(matchId);
      if (loadedLines) setHockeyLines(loadedLines);
    }

    const hFmt = resolveHockeyFormat(match.formation, match.players_on_field);
    const rinkPositions = RINK_POSITIONS[hFmt];
    const gkPosIdx = rinkPositions.findIndex(p => p.isGoalie);

    const initCameOn: Record<string, number> = {};
    const initPos: Record<string, number> = {};
    players.filter((p) => p.on_field).forEach((p, i) => {
      initCameOn[p.player_id] = match.elapsed_seconds;
      if (loadedLines && loadedLines.length > 0) {
        const slot = loadedLines[0].slots.find(s => s.playerId === p.player_id);
        if (slot) {
          const posIdx = rinkPositions.findIndex(pos => pos.id === slot.positionId);
          initPos[p.player_id] = posIdx !== -1 ? posIdx : gkPosIdx;
        } else {
          initPos[p.player_id] = gkPosIdx !== -1 ? gkPosIdx : i;
        }
      } else {
        initPos[p.player_id] = i;
      }
    });
    cameOnAt.current = initCameOn;
    positionMap.current = initPos;

    // Init zone accumulator from previously saved DB data
    const initZoneAccum: Record<string, ZoneTime[]> = {};
    players.forEach((p) => {
      const z = p.meta?.zones;
      if (Array.isArray(z) && z.length > 0 && z[0] !== null && typeof z[0] === "object" && "zone" in z[0]) {
        initZoneAccum[p.player_id] = z;
      }
    });
    zoneAccumRef.current = initZoneAccum;

    // Start zone tracking for field players
    const initZoneStart: Record<string, { zone: string; startElapsed: number }> = {};
    players.filter((p) => p.on_field).forEach((p) => {
      const posIdx = initPos[p.player_id] ?? 0;
      const zone = computeZoneForSlot(posIdx, match.sport_id, hFmt, match.players_on_field, match.formation);
      initZoneStart[p.player_id] = { zone, startElapsed: match.elapsed_seconds };
    });
    zoneStartRef.current = initZoneStart;
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

  const handballFormatId = isHandball
    ? resolveHandballFormatId(match.formation, match.players_on_field)
    : '7er';
  const is4er = isHandball && handballFormatId === '4er';
  const is3erFootball = !isHandball && !isHockey && !isBasketball && match.players_on_field === 3;

  const basketballFormatId = isBasketball
    ? resolveBasketballFormatId(match.formation, match.players_on_field)
    : '5v5';
  const isEasyBasket = isBasketball && basketballFormatId === 'easybasket';
  // NBBF rule: most-played may not exceed least-played by more than 1 period (5 min)
  const EASYBASKET_MAX_SPREAD = 5 * 60;

  // Hockey: utled format fra match.formation (bakoverkompatibel)
  const hockeyFormat: HockeyFormat = isHockey
    ? resolveHockeyFormat(match.formation, match.players_on_field)
    : "5v5-full";
  const hockeyRinkPositions = RINK_POSITIONS[hockeyFormat];
  // For horisontale baner (3v3-quarter) brukes 3v3-small sitt baneformat i visningen
  const hockeyDisplaySpec = RINK_SPECS[hockeyFormat].orientation === "horizontal"
    ? RINK_SPECS["3v3-small"]
    : RINK_SPECS[hockeyFormat];

  const pitchSpec =
    isHandball   ? getHandballCourtSpec(handballFormatId) :
    isHockey     ? hockeyDisplaySpec :
    isBasketball ? getBasketballCourtSpec(basketballFormatId) :
    (PITCH_SPECS[match.players_on_field] ?? PITCH_SPECS[11]);

  // Basketball: crop parameters map player y-values to the cropped SVG viewport
  const bbCrop = isBasketball && basketballFormatId !== '3x3'
    ? getBasketballCrop(pitchSpec as BasketballCourtSpec)
    : null;

  const positions = isHockey
    // y-verdier i RINK_POSITIONS er i [50,100] (eget halvfelt) → konverter til halvbane-% (0–100)
    ? hockeyRinkPositions.map(p => ({ x: p.x, y: (p.y - 50) * 2 }))
    : isHandball
    // all formats: show own defensive half (full-court y 50–100% → view y 0–100%)
    ? getHandballPositions(handballFormatId).map(p => ({ x: p.x, y: toHandballY(p.y) }))
    : isBasketball
    // 3×3 positions are stored as half-court view %; others mapped to the cropped viewport
    ? getBasketballCourtPositions(basketballFormatId).map(p => ({
        x: p.x,
        y: basketballFormatId === '3x3'
          ? p.y
          : Math.max(0, Math.min(100,
              (p.y / 100 * pitchSpec.length - bbCrop!.cropStart) / bbCrop!.viewHeight * 100,
            )),
      }))
    : getFormationPositions(match.players_on_field, formation).map(p => ({ x: p.x, y: toCroppedY(p.y) }));

  const isEleven = !isHandball && !isHockey && !isBasketball && match.players_on_field === 11;

  // NFF barnefotball rule: losing team may add one extra player when 4+ goals behind
  const isBarnefotball = match.sport_id === "soccer" && [3, 5, 7].includes(match.players_on_field);
  const goalDiff = scoreAway - scoreHome;
  const hasExtraPlayer = fieldPlayers.length > match.players_on_field;
  // When track_goals: auto-detect from score. When not tracking: coach decides manually.
  const canAddExtraPlayer = isBarnefotball && !hasExtraPlayer && benchPlayers.length > 0 && match.status !== "finished"
    && (!match.track_goals || goalDiff >= 4);
  const mustRemoveExtraPlayer = isBarnefotball && hasExtraPlayer && match.status !== "finished"
    && (!match.track_goals || goalDiff < 4);

  function getPlayTime(mp: RichMatchPlayer) {
    if (mp.on_field) {
      const came = cameOnAt.current[mp.player_id] ?? elapsed;
      return mp.total_play_seconds + Math.max(0, elapsed - came);
    }
    return mp.total_play_seconds;
  }

  function startLongPress(playerId: string) {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
    longPressTimer.current = setTimeout(() => setPlayerDetailId(playerId), 700);
  }
  function cancelLongPress() {
    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
  }

  function getFP(mp: RichMatchPlayer) {
    return calcFP(getPlayTime(mp), elapsed, match.players_on_field, players.length);
  }

  // EasyBasket fair-play: flag players who violate the ≤1-period spread rule.
  const easyBasketViolation = (() => {
    if (!isEasyBasket || players.length < 2 || elapsed === 0) return null;
    const times = players.map((p) => ({ p, secs: getPlayTime(p) }));
    const maxSecs = Math.max(...times.map((t) => t.secs));
    const minSecs = Math.min(...times.map((t) => t.secs));
    if (maxSecs - minSecs <= EASYBASKET_MAX_SPREAD) return null;
    const overPlayed = times
      .filter((t) => t.secs > minSecs + EASYBASKET_MAX_SPREAD)
      .map((t) => t.p.player.name.split(" ")[0]);
    const underPlayed = times
      .filter((t) => t.secs < maxSecs - EASYBASKET_MAX_SPREAD)
      .map((t) => t.p.player.name.split(" ")[0]);
    return { overPlayed, underPlayed };
  })();

  // Returns true when a field player is currently occupying the GK slot.
  // Basketball has no GK; for hockey the slot has isGoalie=true; for all other
  // sports the GK is always at formation index 0.
  function isInGKSlot(mp: RichMatchPlayer): boolean {
    if (isBasketball) return false;
    const posIdx = positionMap.current[mp.player_id];
    if (posIdx === undefined) return false;
    if (isHockey) return hockeyRinkPositions[posIdx]?.isGoalie === true;
    if (isHandball) {
      const fmtId = resolveHandballFormatId(match.formation, match.players_on_field);
      return getHandballCourtPositions(fmtId)[posIdx]?.isGoalkeeper === true;
    }
    return !is3erFootball && posIdx === 0;
  }

  // ── Zone tracking ──────────────────────────────────────────────────────────

  function getZoneForSlot(posIdx: number): string {
    return computeZoneForSlot(posIdx, match.sport_id, hockeyFormat, match.players_on_field, formation);
  }

  function startZone(playerId: string, posIdx: number, atElapsed: number) {
    zoneStartRef.current[playerId] = { zone: getZoneForSlot(posIdx), startElapsed: atElapsed };
  }

  function endZone(playerId: string, atElapsed: number) {
    const start = zoneStartRef.current[playerId];
    if (!start) return;
    delete zoneStartRef.current[playerId];
    const seconds = Math.max(0, atElapsed - start.startElapsed);
    if (seconds === 0) return;
    const acc = zoneAccumRef.current[playerId] ?? [];
    const existing = acc.find((z) => z.zone === start.zone);
    if (existing) existing.seconds += seconds;
    else acc.push({ zone: start.zone, seconds });
    zoneAccumRef.current[playerId] = acc;
  }

  function getLiveZones(playerId: string): ZoneTime[] {
    const acc = zoneAccumRef.current[playerId] ?? [];
    const ongoing = zoneStartRef.current[playerId];
    if (!ongoing) return acc;
    const liveSecs = Math.max(0, elapsed - ongoing.startElapsed);
    if (liveSecs === 0) return acc;
    const merged = acc.map((z) => ({ ...z }));
    const existing = merged.find((z) => z.zone === ongoing.zone);
    if (existing) existing.seconds += liveSecs;
    else merged.push({ zone: ongoing.zone, seconds: liveSecs });
    return merged;
  }

  const MAX_DROP_RADIUS_PX = 70;

  function closestFieldPlayer(cx: number, cy: number, excludeId?: string): RichMatchPlayer | null {
    const pitchEl = document.getElementById("pitch-container");
    if (!pitchEl) return null;
    const pitchRect = pitchEl.getBoundingClientRect();
    let closest: RichMatchPlayer | null = null;
    let minDist = Infinity;
    for (const fp of fieldPlayersRef.current) {
      if (excludeId && fp.player_id === excludeId) continue;
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
      if (!zoneStartRef.current[p.player_id]) {
        startZone(p.player_id, positionMap.current[p.player_id] ?? 0, elapsed);
      }
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

  async function handleLineChange(incomingLineId: string) {
    const incomingLine = hockeyLines.find(l => l.id === incomingLineId);
    if (!incomingLine) return;

    const swaps: Array<{ comingOnId: string; goingOffId: string; goingOffTotalSeconds: number }> = [];

    for (const slot of incomingLine.slots) {
      if (!slot.playerId) continue;
      const incomingMp = players.find(p => p.player_id === slot.playerId);
      if (!incomingMp || incomingMp.on_field) continue; // skip if already on ice

      // Find the rink position index for this slot
      const posIdx = hockeyRinkPositions.findIndex(p => p.id === slot.positionId);
      if (posIdx === -1) continue;

      // Find who is currently in that position on the field
      const outgoingMp = fieldPlayers.find(
        mp => positionMap.current[mp.player_id] === posIdx && !isInGKSlot(mp),
      );
      if (!outgoingMp) continue;

      swaps.push({
        comingOnId: slot.playerId,
        goingOffId: outgoingMp.player_id,
        goingOffTotalSeconds: getPlayTime(outgoingMp),
      });

      endZone(outgoingMp.player_id, elapsed);
      const zones = zoneAccumRef.current[outgoingMp.player_id];
      if (zones?.length) {
        const mp = playersRef.current.find(p => p.player_id === outgoingMp.player_id);
        updatePlayerMeta.mutate({ playerId: outgoingMp.player_id, meta: { ...(mp?.meta ?? {}), zones } });
      }
      positionMap.current[slot.playerId] = posIdx;
      delete positionMap.current[outgoingMp.player_id];
      cameOnAt.current[slot.playerId] = elapsed;
      delete cameOnAt.current[outgoingMp.player_id];
      startZone(slot.playerId, posIdx, elapsed);
    }

    setLineChangeOpen(false);
    if (swaps.length === 0) return;
    setSwapVersion(v => v + 1);
    await bulkSubstitute.mutateAsync({ swaps, atSeconds: elapsed });
  }

  function handleClockAdjust(newPeriodElapsed: number) {
    const newElapsed = periodStartAt.current + newPeriodElapsed;
    clockBaseElapsed.current = newElapsed;
    setElapsed(newElapsed);
    setClockAdjustOpen(false);
    updateMatch.mutate({ elapsed_seconds: newElapsed });
  }

  async function handleEndPeriod() {
    const currentElapsed = computeLiveElapsed();
    clockStartedAt.current = null;
    if (matchId) localStorage.removeItem(lsClockKey(matchId));
    setElapsed(currentElapsed);
    setRunning(false);

    // Compute raw period seconds per field player
    const periodSecs = fieldPlayers.map((mp) => ({
      mp,
      secs: Math.max(0, currentElapsed - (cameOnAt.current[mp.player_id] ?? currentElapsed)),
    }));

    // If a GK is on the field, SET their total to the squad average of all other
    // players (on-field: accumulated + this period; bench: accumulated total).
    // This prevents keeper stints from skewing fair-play comparisons.
    const gkEntry = periodSecs.find(({ mp }) => isInGKSlot(mp));
    const keeperTotal = (() => {
      if (!gkEntry) return 0;
      const nonKeeperTotals = players
        .filter((p) => p.player_id !== gkEntry.mp.player_id)
        .map((p) => {
          const entry = periodSecs.find((e) => e.mp.player_id === p.player_id);
          return p.total_play_seconds + (entry ? entry.secs : 0);
        });
      return nonKeeperTotals.length > 0
        ? Math.round(nonKeeperTotals.reduce((a, b) => a + b, 0) / nonKeeperTotals.length)
        : 0;
    })();

    const fieldPlayerFinalSeconds = periodSecs.map(({ mp, secs }) => ({
      player_id: mp.player_id,
      total_play_seconds: gkEntry && mp.player_id === gkEntry.mp.player_id
        ? keeperTotal
        : mp.total_play_seconds + secs,
    }));

    // Finalise zone tracking for all field players
    fieldPlayers.forEach((mp) => endZone(mp.player_id, currentElapsed));

    // Save accumulated zones for all players that have data
    const zoneSaves = players
      .filter((p) => (zoneAccumRef.current[p.player_id]?.length ?? 0) > 0)
      .map((p) => ({
        playerId: p.player_id,
        meta: { ...(p.meta ?? {}), zones: zoneAccumRef.current[p.player_id] } as import("@/types/database").PlayerMeta,
      }));

    await Promise.all([
      endPeriod.mutateAsync({
        elapsed: currentElapsed,
        currentPeriod: match.current_period,
        periodCount: match.period_count,
        fieldPlayerFinalSeconds,
      }),
      ...(zoneSaves.length > 0 ? [updateAllPlayerMetas.mutateAsync(zoneSaves)] : []),
    ]);
    if (isLastPeriod) {
      navigate(`/matches/${matchId}/summary`);
    } else {
      periodStartAt.current = currentElapsed;
    }
  }

  function openGoalDialog(team: "home" | "away") {
    setGoalDialog({ team });
  }

  async function confirmGoal(scorerId: string | null, assist1Id: string | null, assist2Id: string | null) {
    if (!goalDialog) return;
    const { team } = goalDialog;
    const newHome = team === "home" ? scoreHome + 1 : scoreHome;
    const newAway = team === "away" ? scoreAway + 1 : scoreAway;
    setScoreHome(newHome);
    setScoreAway(newAway);
    setGoalDialog(null);
    await Promise.all([
      updateMatch.mutateAsync({ score_home: newHome, score_away: newAway }),
      logGoal.mutateAsync({ team, scorerPlayerId: scorerId, assistPlayerId: assist1Id, assist2PlayerId: assist2Id, atSeconds: elapsed }),
    ]);
  }

  async function handleAddExtraPlayer(playerId: string) {
    cameOnAt.current[playerId] = elapsed;
    // Place extra player at center field (falls back to { x:50, y:50 } in pitch renderer)
    positionMap.current[playerId] = match.players_on_field;
    setExtraPlayerDialog(null);
    await addExtraPlayer.mutateAsync({ playerId, atSeconds: elapsed });
  }

  async function handleRemoveExtraPlayer(playerId: string) {
    const mp = players.find((p) => p.player_id === playerId);
    const totalSecs = mp ? getPlayTime(mp) : 0;

    const removedSlot = positionMap.current[playerId];
    const isExtraSlot = removedSlot >= match.players_on_field;

    if (!isExtraSlot) {
      // Removed a normal-slot player — move the extra-slot player into the freed slot
      const extraPlayerId = Object.entries(positionMap.current)
        .find(([, slot]) => slot >= match.players_on_field)?.[0];
      if (extraPlayerId) {
        positionMap.current[extraPlayerId] = removedSlot;
      }
    }

    delete cameOnAt.current[playerId];
    delete positionMap.current[playerId];
    setExtraPlayerDialog(null);
    await removeExtraPlayer.mutateAsync({ playerId, totalPlaySeconds: totalSecs, atSeconds: elapsed });
  }

  function handleFormationChange(newFormation: string) {
    setFormation(newFormation);
    updateMatch.mutate({ formation: newFormation });
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(e.active.id as string);
    cancelLongPress();
  }

  function handleDragMove(e: DragMoveEvent) {
    if (!e.over || e.over.id !== "pitch") { setPendingSwapId(null); return; }
    const pos = lastPointerPos.current;
    if (!pos) return;
    // Exclude the dragged player from highlight candidates
    setPendingSwapId(closestFieldPlayer(pos.x, pos.y, activeId ?? undefined)?.player_id ?? null);
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    setPendingSwapId(null);
    if (!over || over.id !== "pitch") return;

    const draggedPlayer = playersRef.current.find((p) => p.player_id === active.id);
    if (!draggedPlayer) return;
    const pos = lastPointerPos.current;
    if (!pos) return;

    if (draggedPlayer.on_field) {
      // Field ↔ Field: swap positions (zone tracking updates, no substitution logged)
      const targetPlayer = closestFieldPlayer(pos.x, pos.y, draggedPlayer.player_id);
      if (!targetPlayer) return;
      const fromIdx = positionMap.current[draggedPlayer.player_id];
      const toIdx = positionMap.current[targetPlayer.player_id];
      endZone(draggedPlayer.player_id, elapsed);
      endZone(targetPlayer.player_id, elapsed);
      if (fromIdx !== undefined) positionMap.current[targetPlayer.player_id] = fromIdx;
      if (toIdx !== undefined) positionMap.current[draggedPlayer.player_id] = toIdx;
      if (toIdx !== undefined) startZone(draggedPlayer.player_id, toIdx, elapsed);
      if (fromIdx !== undefined) startZone(targetPlayer.player_id, fromIdx, elapsed);
      setSwapVersion((v) => v + 1);
    } else {
      // Bench → Field: substitution
      const fieldPlayer = closestFieldPlayer(pos.x, pos.y);
      if (!fieldPlayer) return;
      const goingOffTotalSeconds = getPlayTime(fieldPlayer);
      const posIdx = positionMap.current[fieldPlayer.player_id] ?? 0;
      // Finalise zone for going-off player and save immediately
      endZone(fieldPlayer.player_id, elapsed);
      const goingOffZones = zoneAccumRef.current[fieldPlayer.player_id];
      if (goingOffZones?.length) {
        const goingOffMeta = playersRef.current.find((p) => p.player_id === fieldPlayer.player_id)?.meta;
        updatePlayerMeta.mutate({
          playerId: fieldPlayer.player_id,
          meta: { ...(goingOffMeta ?? {}), zones: goingOffZones },
        });
      }
      positionMap.current[draggedPlayer.player_id] = posIdx;
      delete positionMap.current[fieldPlayer.player_id];
      cameOnAt.current[draggedPlayer.player_id] = elapsed;
      delete cameOnAt.current[fieldPlayer.player_id];
      startZone(draggedPlayer.player_id, posIdx, elapsed);
      substitute.mutate({
        comingOnId: draggedPlayer.player_id,
        goingOffId: fieldPlayer.player_id,
        goingOffTotalSeconds,
        atSeconds: elapsed,
      });
    }
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
            {match.status === "paused" && (
              <button type="button"
                onClick={() => setClockAdjustOpen(true)}
                className="mt-1 text-xs text-cream/50 hover:text-cream/80 underline underline-offset-2">
                Juster klokka
              </button>
            )}
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
        {match.track_goals && !isEasyBasket && <div className="mb-3 flex items-center rounded-xl border border-ink/10 bg-cream-dark px-4 py-3">
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

        {/* Extra player rule banner (NFF barnefotball) */}
        {canAddExtraPlayer && (
          <div className={cn(
            "mb-3 flex items-center justify-between rounded-xl border px-4 py-3",
            match.track_goals
              ? "border-green-300 bg-green-50"
              : "border-ink/10 bg-cream-dark",
          )}>
            <div>
              <p className={cn("text-sm font-semibold", match.track_goals ? "text-green-900" : "text-ink")}>
                Ekstra spiller (barnefotball)
              </p>
              <p className={cn("text-xs mt-0.5", match.track_goals ? "text-green-800" : "text-ink-muted")}>
                {match.track_goals
                  ? "Dere ligger under med 4+ mål (NFF-regel)"
                  : "Kan settes inn når laget ligger under med 4+ mål"}
              </p>
            </div>
            <Button size="sm" variant={match.track_goals ? "accent" : "ghost"} onClick={() => setExtraPlayerDialog("add")}>Sett inn</Button>
          </div>
        )}
        {mustRemoveExtraPlayer && (
          <div className={cn(
            "mb-3 flex items-center justify-between rounded-xl border px-4 py-3",
            match.track_goals
              ? "border-amber-300 bg-amber-50"
              : "border-ink/10 bg-cream-dark",
          )}>
            <div>
              <p className={cn("text-sm font-semibold", match.track_goals ? "text-amber-900" : "text-ink")}>
                Fjern ekstra spiller
              </p>
              <p className={cn("text-xs mt-0.5", match.track_goals ? "text-amber-800" : "text-ink-muted")}>
                {match.track_goals
                  ? "Målforskjellen er under 4 — gå tilbake til normalt antall"
                  : "Ekstra spiller er på banen — fjern ved behov"}
              </p>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setExtraPlayerDialog("remove")}>Fjern</Button>
          </div>
        )}

        {/* Hockey line bar */}
        {isHockey && match.status !== "finished" && (() => {
          const activeLineId = hockeyLines.length > 0
            ? (hockeyLines.map(l => ({
                id: l.id,
                n: linePlayerIds(l).filter(id => players.find(p => p.player_id === id)?.on_field).length,
              })).sort((a, b) => b.n - a.n)[0]?.id ?? null)
            : null;
          const activeLine = hockeyLines.find(l => l.id === activeLineId);
          return (
            <div className="mb-3 flex items-center gap-3 rounded-xl border border-ink/10 bg-cream-dark px-4 py-2.5">
              <div className="flex-1 min-w-0">
                {activeLine ? (
                  <>
                    <p className="text-xs font-semibold text-ink-muted uppercase tracking-wider">
                      {activeLine.name} på isen
                    </p>
                    <p className="text-sm text-ink truncate">
                      {activeLine.slots
                        .filter(s => s.playerId)
                        .map(s => {
                          const mp = players.find(p => p.player_id === s.playerId);
                          return mp ? `${s.positionLabel}: ${mp.player.name.split(" ")[0]}` : null;
                        })
                        .filter(Boolean)
                        .join("  ")}
                    </p>
                  </>
                ) : (
                  <p className="text-sm text-ink-muted">Ingen rekker satt opp</p>
                )}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {hockeyLines.length > 0 && (
                  <Button variant="ghost" size="sm"
                    className="border border-ink/20 text-sm font-semibold"
                    onClick={() => setLineChangeOpen(true)}>
                    Bytt rekke →
                  </Button>
                )}
                <button type="button"
                  onClick={() => {
                    if (hockeyLines.length === 0) {
                      const skaterPos = RINK_POSITIONS[hockeyFormat].filter(p => !p.isGoalie);
                      const skaterIds = players
                        .filter(mp => !hockeyRinkPositions[positionMap.current[mp.player_id] ?? -1]?.isGoalie)
                        .map(p => p.player_id);
                      setHockeyLines(autoSplitLines(skaterPos, skaterIds, 2));
                    }
                    setLineSetupOpen(true);
                  }}
                  className="text-xs text-ink-muted underline underline-offset-2">
                  {hockeyLines.length > 0 ? "Endre" : "Sett opp"}
                </button>
              </div>
            </div>
          );
        })()}

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
            halfLength={isHockey || isHandball || (isBasketball && basketballFormatId !== '3x3')}
            fullLength={isBasketball && basketballFormatId === '3x3'}
            aspectOverride={bbCrop
              ? `${pitchSpec.width} / ${bbCrop.viewHeight}`
              : undefined}
            bgColor={
              isHandball   ? "bg-[#1565C0]" :
              isHockey     ? "bg-[#E8F4FB]" :
              isBasketball ? "bg-[#c8944a]" :
              "bg-green-700"
            }>
            {isHandball   ? <HandballCourtMarkings formatId={handballFormatId} /> :
             isHockey     ? <HockeyRinkHalfContent format={hockeyFormat} /> :
             isBasketball ? <BasketballCourtMarkings spec={getBasketballCourtSpec(basketballFormatId)} /> :
             <PitchMarkings spec={pitchSpec as PitchSpec} />
            }
            {(is4er || is3erFootball) && (
              <div className="absolute top-[6%] left-1/2 -translate-x-1/2 pointer-events-none z-10 bg-black/30 backdrop-blur-sm text-white/80 text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap">
                Ingen fast keeper
              </div>
            )}
            {(() => {
              const subOutRankMap = new Map(
                [...fieldPlayers]
                  .filter((mp) => !isInGKSlot(mp))
                  .sort((a, b) => getPlayTime(b) - getPlayTime(a))
                  .map((mp, i) => [mp.player_id, i + 1]),
              );
              return fieldPlayers.map((mp, i) => {
                const posIdx = positionMap.current[mp.player_id] ?? i;
                const inGKSlot = isInGKSlot(mp);
                const posLabel = isHockey
                  ? hockeyRinkPositions[posIdx]?.label
                  : isBasketball
                  ? getBasketballCourtPositions(basketballFormatId)[posIdx]?.label
                  : undefined;
                return (
                  <FieldToken key={mp.player_id} mp={mp}
                    pos={positions[posIdx] ?? { x: 50, y: 50 }}
                    playSeconds={getPlayTime(mp)} fpColor={getFP(mp)}
                    isPendingSwap={mp.player_id === pendingSwapId}
                    positionLabel={posLabel}
                    isGK={inGKSlot}
                    subOutRank={subOutRankMap.get(mp.player_id)}
                    lightSurface={isHockey}
                    onLongPressStart={() => startLongPress(mp.player_id)}
                    onLongPressEnd={cancelLongPress} />
                );
              });
            })()}
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
          {fieldPlayers.some((mp) => isInGKSlot(mp)) && (
            <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full bg-slate-400" />MV (telles ikke)</span>
          )}
        </div>

        {/* EasyBasket fair-play violation warning */}
        {easyBasketViolation && (
          <div className="mb-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3">
            <p className="text-sm font-semibold text-amber-900">Spilletidsregel brutt (EasyBasket)</p>
            <p className="text-xs text-amber-800 mt-1 leading-snug">
              Forskjellen mellom mest og minst spilte spiller er over 1 periode (5 min).
              {easyBasketViolation.overPlayed.length > 0 && <> Gi hvile til: <strong>{easyBasketViolation.overPlayed.join(", ")}</strong>.</>}
              {easyBasketViolation.underPlayed.length > 0 && <> Spill inn: <strong>{easyBasketViolation.underPlayed.join(", ")}</strong>.</>}
            </p>
          </div>
        )}

        {/* Bench */}
        {benchPlayers.length > 0 && (
          <div>
            <p className="mb-2 text-base font-semibold text-ink">
              Benk <span className="font-normal text-ink-muted">({benchPlayers.length})</span>
              <span className="ml-2 text-sm font-normal text-ink-muted">— dra opp på banen for å bytte</span>
            </p>
            <div className="flex flex-wrap gap-4">
              {benchPlayers.map((mp, i) => (
                <BenchItem key={mp.player_id} mp={mp}
                  playSeconds={getPlayTime(mp)} fpColor={getFP(mp)}
                  priority={i + 1}
                  onLongPressStart={() => startLongPress(mp.player_id)}
                  onLongPressEnd={cancelLongPress} />
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
        {match.track_goals && !isEasyBasket && (
          <GoalDialog
            open={goalDialog !== null}
            team={goalDialog?.team ?? "home"}
            opponent={match.opponent}
            teamName={team?.name ?? null}
            players={players}
            isHockey={isHockey}
            onConfirm={confirmGoal}
            onCancel={() => setGoalDialog(null)}
          />
        )}

        {/* Extra player picker dialog */}
        {isBarnefotball && (
          <ExtraPlayerPickerDialog
            open={extraPlayerDialog !== null}
            mode={extraPlayerDialog ?? "add"}
            players={players}
            onConfirm={extraPlayerDialog === "add" ? handleAddExtraPlayer : handleRemoveExtraPlayer}
            onCancel={() => setExtraPlayerDialog(null)}
          />
        )}

        {/* Formation dialog */}
        <FormationDialog
          open={formationDialogOpen}
          current={formation ?? "4-4-2"}
          onSelect={handleFormationChange}
          onClose={() => setFormationDialogOpen(false)}
        />

        {/* Player detail / play-time edit dialog */}
        {playerDetailId && (() => {
          const mp = players.find((p) => p.player_id === playerDetailId);
          if (!mp || !matchId) return null;
          return (
            <PlayerDetailDialog
              mp={mp}
              sportId={match.sport_id}
              currentPlaySeconds={getPlayTime(mp)}
              events={matchEvents}
              liveZones={getLiveZones(mp.player_id)}
              onClose={() => setPlayerDetailId(null)}
              onSave={async (newSeconds, noteMeta) => {
                if (mp.on_field) {
                  cameOnAt.current[mp.player_id] = elapsed;
                }
                // Merge new note/freeNote with existing DB zones (zones tracked separately)
                const fullMeta = noteMeta
                  ? { ...(mp.meta ?? {}), ...noteMeta }
                  : mp.meta?.zones?.length ? { zones: mp.meta.zones } : null;
                await Promise.all([
                  updatePlayerPlayTime.mutateAsync({ playerId: mp.player_id, totalPlaySeconds: newSeconds }),
                  updatePlayerMeta.mutateAsync({ playerId: mp.player_id, meta: fullMeta }),
                ]);
                setPlayerDetailId(null);
              }}
            />
          );
        })()}

        {/* Hockey line setup dialog */}
        {lineSetupOpen && (
          <HockeyLineSetupDialog
            players={players
              .filter(mp => !hockeyRinkPositions[positionMap.current[mp.player_id] ?? -1]?.isGoalie)
              .map((mp): LineSetupPlayer => ({
                id: mp.player_id,
                name: mp.player.name,
                jerseyNumber: mp.player.jersey_number,
              }))}
            skaterPositions={RINK_POSITIONS[hockeyFormat].filter(p => !p.isGoalie)}
            initialLines={hockeyLines}
            onSave={(lines) => {
              setHockeyLines(lines);
              if (matchId) saveHockeyLines(matchId, lines);
              setLineSetupOpen(false);
            }}
            onClose={() => setLineSetupOpen(false)}
          />
        )}

        {/* Hockey line change dialog */}
        {lineChangeOpen && hockeyLines.length > 0 && (() => {
          const activeLineId = hockeyLines.map(l => ({
            id: l.id,
            n: linePlayerIds(l).filter(id => players.find(p => p.player_id === id)?.on_field).length,
          })).sort((a, b) => b.n - a.n)[0]?.id ?? null;
          return (
            <LineChangeDialog
              lines={hockeyLines}
              players={players}
              activeLineId={activeLineId}
              onConfirm={handleLineChange}
              onClose={() => setLineChangeOpen(false)}
            />
          );
        })()}

        {/* Clock adjust dialog */}
        {clockAdjustOpen && (
          <ClockAdjustDialog
            periodElapsed={periodElapsed}
            onSave={handleClockAdjust}
            onClose={() => setClockAdjustOpen(false)}
          />
        )}

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
