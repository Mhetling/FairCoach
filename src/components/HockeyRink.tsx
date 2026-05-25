import { cn } from "@/lib/utils";
import { RINK_SPECS, type HockeyFormat, type RinkSpec } from "@/lib/hockeyRinks";
import type { ReactNode } from "react";

// ─── Design-tokens ────────────────────────────────────────────────────────────
const ICE          = "#E8F4FB";
const BOARD_STROKE = "#8BBDD4";
const RED          = "#CC0000";
const BLUE         = "#0044BB";
const CREASE_FILL  = "rgba(0,100,220,0.13)";
const CREASE_STROKE = "rgba(0,80,180,0.5)";
const GOAL_FILL    = "rgba(255,255,255,0.92)";
const GOAL_STROKE  = "#CC0000";

// ─── D-shaped crease path helpers ────────────────────────────────────────────
// The crease is a D: two straight sides from the goal posts perpendicular to
// the goal line, joined by a semicircle whose centre is the middle of the goal.
// All creases use sweep=1 (CW) so the arc bulges toward centre ice.

function creaseVertTop(cx: number, GL: number, GW: number, CR2: number): string {
  const h = GW / 2;
  const dy = Math.sqrt(Math.max(0, CR2 * CR2 - h * h));
  return `M ${cx - h},${GL} L ${cx - h},${GL + dy} A ${CR2},${CR2} 0 0,1 ${cx + h},${GL + dy} L ${cx + h},${GL} Z`;
}

function creaseVertBot(cx: number, L: number, GL: number, GW: number, CR2: number): string {
  const h = GW / 2;
  const dy = Math.sqrt(Math.max(0, CR2 * CR2 - h * h));
  return `M ${cx - h},${L - GL} L ${cx - h},${L - GL - dy} A ${CR2},${CR2} 0 0,0 ${cx + h},${L - GL - dy} L ${cx + h},${L - GL} Z`;
}

// Horizontal rink: left goal opens rightward (sweep=1), right goal leftward (sweep=0).
function creaseHorizLeft(GL: number, cy: number, GW: number, CR2: number): string {
  const h = GW / 2;
  const dx = Math.sqrt(Math.max(0, CR2 * CR2 - h * h));
  return `M ${GL},${cy - h} L ${GL + dx},${cy - h} A ${CR2},${CR2} 0 0,1 ${GL + dx},${cy + h} L ${GL},${cy + h} Z`;
}

function creaseHorizRight(W: number, GL: number, cy: number, GW: number, CR2: number): string {
  const h = GW / 2;
  const dx = Math.sqrt(Math.max(0, CR2 * CR2 - h * h));
  return `M ${W - GL},${cy - h} L ${W - GL - dx},${cy - h} A ${CR2},${CR2} 0 0,0 ${W - GL - dx},${cy + h} L ${W - GL},${cy + h} Z`;
}

// ─── Faceoff circle with hash marks ──────────────────────────────────────────
function FaceoffCircle({ cx, cy, r, sw }: { cx: number; cy: number; r: number; sw: number }) {
  const lw   = sw * 0.7;
  const tick = r * 0.28;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={RED} strokeWidth={lw} />
      <circle cx={cx} cy={cy} r={sw * 1.2} fill={RED} />
      {/* Hash marks at 12 / 3 / 6 / 9 o'clock */}
      <line x1={cx - tick} y1={cy - r} x2={cx + tick} y2={cy - r} stroke={RED} strokeWidth={lw} />
      <line x1={cx - tick} y1={cy + r} x2={cx + tick} y2={cy + r} stroke={RED} strokeWidth={lw} />
      <line x1={cx - r} y1={cy - tick} x2={cx - r} y2={cy + tick} stroke={RED} strokeWidth={lw} />
      <line x1={cx + r} y1={cy - tick} x2={cx + r} y2={cy + tick} stroke={RED} strokeWidth={lw} />
    </g>
  );
}

// ─── Public component ─────────────────────────────────────────────────────────

interface HockeyRinkProps {
  format: HockeyFormat;
  children?: ReactNode;
  className?: string;
}

export function HockeyRink({ format, children, className }: HockeyRinkProps) {
  const spec = RINK_SPECS[format];
  const { width: W, length: L } = spec;

  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-xl", className)}
      style={{ aspectRatio: `${W} / ${L}` }}
    >
      <svg
        viewBox={`0 0 ${W} ${L}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        <RinkSurface spec={spec} />
        {spec.orientation === "horizontal"
          ? <HorizontalMarkings spec={spec} />
          : <VerticalMarkings spec={spec} />}
      </svg>

      {children && (
        <div className="pointer-events-none absolute inset-0">
          {children}
        </div>
      )}
    </div>
  );
}

// ─── Isflate og rundvant ──────────────────────────────────────────────────────

function RinkSurface({ spec }: { spec: RinkSpec }) {
  const { width: W, length: L, cornerRadius: CR } = spec;
  const sw = W / 40;
  const rinkPath = roundedRect(0, 0, W, L, CR);
  return (
    <>
      <path d={rinkPath} fill={ICE} />
      <path d={rinkPath} fill="none" stroke={BOARD_STROKE} strokeWidth={sw} />
    </>
  );
}

// ─── Vertikal bane (mål øverst/nederst) ───────────────────────────────────────

function VerticalMarkings({ spec }: { spec: RinkSpec }) {
  const { width: W, length: L, goalLineDistance: GL, goalWidth: GW,
    creaseRadius: CR2, centerCircleRadius: CCR,
    blueLineDistance: BL, hasFaceoffCircles } = spec;

  const cx  = W / 2;
  const sw  = W / 70;
  const gd  = Math.min(0.55, GL * 0.8);

  const topCrease = creaseVertTop(cx, GL, GW, CR2);
  const botCrease = creaseVertBot(cx, L, GL, GW, CR2);

  // Zone faceoff positions
  const fxL = W * 0.27, fxR = W * 0.73;
  const fyTop = GL * 2.4, fyBot = L - GL * 2.4;
  const fcr = CR2 * 0.9;

  // Neutral zone faceoff dots (midway between each blue line and centre)
  const fyNeutTop = BL !== null ? (BL + L / 2) / 2 : null;
  const fyNeutBot = BL !== null ? L - (BL + L / 2) / 2 : null;

  return (
    <>
      {/* ─── Keeper-halvsirkler (D-form) ─── */}
      <path d={topCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />
      <path d={botCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />

      {/* ─── Mållinjer ─── */}
      <line x1={0} y1={GL}     x2={W} y2={GL}     stroke={RED} strokeWidth={sw} />
      <line x1={0} y1={L - GL} x2={W} y2={L - GL} stroke={RED} strokeWidth={sw} />

      {/* ─── Mål ─── */}
      <rect x={cx - GW / 2} y={0} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
      <rect x={cx - GW / 2} y={L - gd} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />

      {/* ─── Blålinjer ─── */}
      {BL !== null && (
        <>
          <line x1={0} y1={BL}     x2={W} y2={BL}     stroke={BLUE} strokeWidth={sw * 2} />
          <line x1={0} y1={L - BL} x2={W} y2={L - BL} stroke={BLUE} strokeWidth={sw * 2} />
        </>
      )}

      {/* ─── Midtlinje ─── */}
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} stroke={RED} strokeWidth={sw * 1.5} />

      {/* ─── Midtsirkel ─── */}
      {CCR !== null && (
        <>
          <circle cx={cx} cy={L / 2} r={CCR} fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={cx} cy={L / 2} r={sw * 1.2} fill={RED} />
        </>
      )}

      {/* ─── Faceoff-sirkler og prikker (sonene) ─── */}
      {hasFaceoffCircles && (
        <>
          <FaceoffCircle cx={fxL} cy={fyTop} r={fcr} sw={sw} />
          <FaceoffCircle cx={fxR} cy={fyTop} r={fcr} sw={sw} />
          <FaceoffCircle cx={fxL} cy={fyBot} r={fcr} sw={sw} />
          <FaceoffCircle cx={fxR} cy={fyBot} r={fcr} sw={sw} />
        </>
      )}

      {/* ─── Nøytralsoneprikker ─── */}
      {fyNeutTop !== null && fyNeutBot !== null && (
        <>
          <circle cx={fxL} cy={fyNeutTop} r={sw * 1.2} fill={RED} />
          <circle cx={fxR} cy={fyNeutTop} r={sw * 1.2} fill={RED} />
          <circle cx={fxL} cy={fyNeutBot} r={sw * 1.2} fill={RED} />
          <circle cx={fxR} cy={fyNeutBot} r={sw * 1.2} fill={RED} />
        </>
      )}
    </>
  );
}

// ─── Horisontal bane (3v3-quarter, mål til venstre/høyre) ─────────────────────

function HorizontalMarkings({ spec }: { spec: RinkSpec }) {
  const { width: W, length: L, goalLineDistance: GL, goalWidth: GW,
    creaseRadius: CR2, centerCircleRadius: CCR } = spec;

  const cy  = L / 2;
  const sw  = L / 50;
  const gd  = Math.min(0.55, GL * 0.8);

  const leftCrease  = creaseHorizLeft(GL, cy, GW, CR2);
  const rightCrease = creaseHorizRight(W, GL, cy, GW, CR2);

  return (
    <>
      {/* ─── Keeper-halvsirkler (D-form) ─── */}
      <path d={leftCrease}  fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />
      <path d={rightCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />

      {/* ─── Mållinjer (vertikale streker) ─── */}
      <line x1={GL}     y1={0} x2={GL}     y2={L} stroke={RED} strokeWidth={sw} />
      <line x1={W - GL} y1={0} x2={W - GL} y2={L} stroke={RED} strokeWidth={sw} />

      {/* ─── Mål ─── */}
      <rect x={0} y={cy - GW / 2} width={gd} height={GW}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
      <rect x={W - gd} y={cy - GW / 2} width={gd} height={GW}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />

      {/* ─── Midtlinje (vertikal strek) ─── */}
      <line x1={W / 2} y1={0} x2={W / 2} y2={L} stroke={RED} strokeWidth={sw * 1.5} />

      {/* ─── Midtsirkel ─── */}
      {CCR !== null && (
        <>
          <circle cx={W / 2} cy={cy} r={CCR} fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={W / 2} cy={cy} r={sw * 1.2} fill={RED} />
        </>
      )}
    </>
  );
}

// ─── SVG-kun eksport (for bruk inne i MatchLive sin PitchZone) ───────────────

export function HockeyRinkContent({ format }: { format: HockeyFormat }) {
  const spec = RINK_SPECS[format];
  const { width: W, length: L } = spec;
  return (
    <svg
      viewBox={`0 0 ${W} ${L}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      <RinkSurface spec={spec} />
      {spec.orientation === "horizontal"
        ? <HorizontalMarkings spec={spec} />
        : <VerticalMarkings spec={spec} />}
    </svg>
  );
}

// ─── Halvbane-eksport for kampvisning ─────────────────────────────────────────
// Viser kun eget halvfelt (y = L/2 → L).

export function HockeyRinkHalfContent({ format }: { format: HockeyFormat }) {
  const rawSpec = RINK_SPECS[format];
  const spec = rawSpec.orientation === "horizontal" ? RINK_SPECS["3v3-small"] : rawSpec;
  const { width: W, length: L, goalLineDistance: GL, goalWidth: GW,
    creaseRadius: CR2, blueLineDistance: BL, cornerRadius: CR,
    centerCircleRadius: CCR, hasFaceoffCircles } = spec;

  const cx    = W / 2;
  const sw    = W / 70;
  const halfY = L / 2;

  const botCrease = creaseVertBot(cx, L, GL, GW, CR2);
  const boardPath = roundedRect(0, 0, W, L, CR);
  const bw = W / 40;

  // Zone faceoff positions (defence half)
  const fxL = W * 0.27, fxR = W * 0.73;
  const fyBot = L - GL * 2.4;
  const fcr = CR2 * 0.9;

  return (
    <svg
      viewBox={`0 ${halfY} ${W} ${halfY}`}
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full pointer-events-none"
    >
      {/* Isflate */}
      <path d={boardPath} fill={ICE} />
      <path d={boardPath} fill="none" stroke={BOARD_STROKE} strokeWidth={bw} />

      {/* Midtlinje øverst i visningen */}
      <line x1={0} y1={halfY} x2={W} y2={halfY} stroke={RED} strokeWidth={sw * 1.5} />

      {/* Midtsirkel — sentrert på midtlinjen, nedre halvdel synlig */}
      {CCR !== null && (
        <>
          <circle cx={cx} cy={halfY} r={CCR} fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={cx} cy={halfY} r={sw * 1.2} fill={RED} />
        </>
      )}

      {/* Blålinje i eget halvfelt (kun 5v5-full) */}
      {BL !== null && (
        <line x1={0} y1={L - BL} x2={W} y2={L - BL} stroke={BLUE} strokeWidth={sw * 2} />
      )}

      {/* Faceoff-sirkler i forsvarssonen */}
      {hasFaceoffCircles && (
        <>
          <FaceoffCircle cx={fxL} cy={fyBot} r={fcr} sw={sw} />
          <FaceoffCircle cx={fxR} cy={fyBot} r={fcr} sw={sw} />
        </>
      )}

      {/* Målgård (D-form, åpner mot senter) */}
      <path d={botCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />
    </svg>
  );
}

// ─── SVG-hjelper: avrundet rektangel ─────────────────────────────────────────

function roundedRect(x: number, y: number, w: number, h: number, r: number): string {
  const r2 = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + r2},${y}`,
    `H ${x + w - r2}`,
    `Q ${x + w},${y} ${x + w},${y + r2}`,
    `V ${y + h - r2}`,
    `Q ${x + w},${y + h} ${x + w - r2},${y + h}`,
    `H ${x + r2}`,
    `Q ${x},${y + h} ${x},${y + h - r2}`,
    `V ${y + r2}`,
    `Q ${x},${y} ${x + r2},${y}`,
    "Z",
  ].join(" ");
}
