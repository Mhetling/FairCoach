import { cn } from "@/lib/utils";
import { RINK_SPECS, type HockeyFormat, type RinkSpec } from "@/lib/hockeyRinks";
import type { ReactNode } from "react";

// ─── Design-tokens ────────────────────────────────────────────────────────────
const ICE          = "#E8F4FB";
const BOARD_STROKE = "#8BBDD4";
const RED          = "#CC0000";
const BLUE         = "#0044BB";
const CREASE_FILL  = "rgba(173, 216, 230, 0.45)";
const CREASE_STROKE = RED;
const GOAL_FILL    = "rgba(255,255,255,0.92)";
const GOAL_STROKE  = RED;

// ─── D-shaped crease path helpers ────────────────────────────────────────────
// Straight sides from goal posts + circular arc bulging toward centre ice.

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
  const lw   = sw * 0.6;
  const tick = r * 0.22;
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={RED} strokeWidth={lw} />
      <circle cx={cx} cy={cy} r={sw * 1.0} fill={RED} />
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
  const sw = W / 50;
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
    blueLineDistance: BL, hasFaceoffCircles, faceoffCircleRadius: FCR } = spec;

  const cx  = W / 2;
  const sw  = W / 90;
  const gd  = Math.min(0.55, GL * 0.8);

  const topCrease = creaseVertTop(cx, GL, GW, CR2);
  const botCrease = creaseVertBot(cx, L, GL, GW, CR2);

  // Zone faceoff positions — ~20% from each side board, centered between goal line and blue line
  const fxL = W * 0.27, fxR = W * 0.73;
  const fyTop = BL !== null ? (GL + BL) / 2 : GL * 2.2;
  const fyBot = BL !== null ? L - (GL + BL) / 2 : L - GL * 2.2;
  const fcr = FCR ?? CR2;

  // Neutral zone faceoff dots: just inside the neutral zone from each blue line
  const fyNeutTop = BL !== null ? BL + 1.5 : null;
  const fyNeutBot = BL !== null ? L - BL - 1.5 : null;

  return (
    <>
      {/* ─── Keeper-halvsirkler (D-form) ─── */}
      <path d={topCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.9} />
      <path d={botCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.9} />

      {/* ─── Mållinjer ─── */}
      <line x1={0} y1={GL}     x2={W} y2={GL}     stroke={RED} strokeWidth={sw} />
      <line x1={0} y1={L - GL} x2={W} y2={L - GL} stroke={RED} strokeWidth={sw} />

      {/* ─── Mål — åpning på mållinjen, nett strekker seg mot kortenden ─── */}
      <rect x={cx - GW / 2} y={GL - gd} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
      <rect x={cx - GW / 2} y={L - GL} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />

      {/* ─── Blålinjer ─── */}
      {BL !== null && (
        <>
          <line x1={0} y1={BL}     x2={W} y2={BL}     stroke={BLUE} strokeWidth={sw * 2.5} />
          <line x1={0} y1={L - BL} x2={W} y2={L - BL} stroke={BLUE} strokeWidth={sw * 2.5} />
        </>
      )}

      {/* ─── Midtlinje ─── */}
      <line x1={0} y1={L / 2} x2={W} y2={L / 2} stroke={RED} strokeWidth={sw * 1.5} />

      {/* ─── Midtsirkel ─── */}
      {CCR !== null && (
        <>
          <circle cx={cx} cy={L / 2} r={CCR} fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={cx} cy={L / 2} r={sw * 1.0} fill={RED} />
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

      {/* ─── Nøytralsoneprikker (rett innenfor blålinjene) ─── */}
      {fyNeutTop !== null && fyNeutBot !== null && (
        <>
          <circle cx={fxL} cy={fyNeutTop} r={sw * 1.0} fill={RED} />
          <circle cx={fxR} cy={fyNeutTop} r={sw * 1.0} fill={RED} />
          <circle cx={fxL} cy={fyNeutBot} r={sw * 1.0} fill={RED} />
          <circle cx={fxR} cy={fyNeutBot} r={sw * 1.0} fill={RED} />
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
  const sw  = L / 70;
  const gd  = Math.min(0.55, GL * 0.8);

  const leftCrease  = creaseHorizLeft(GL, cy, GW, CR2);
  const rightCrease = creaseHorizRight(W, GL, cy, GW, CR2);

  return (
    <>
      {/* ─── Keeper-halvsirkler (D-form) ─── */}
      <path d={leftCrease}  fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.9} />
      <path d={rightCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.9} />

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
          <circle cx={W / 2} cy={cy} r={sw * 1.0} fill={RED} />
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
    centerCircleRadius: CCR, hasFaceoffCircles, faceoffCircleRadius: FCR } = spec;

  const cx    = W / 2;
  const sw    = W / 90;
  const halfY = L / 2;
  const gd    = Math.min(0.55, GL * 0.8);

  const botCrease = creaseVertBot(cx, L, GL, GW, CR2);
  const boardPath = roundedRect(0, 0, W, L, CR);
  const bw = W / 50;

  const fcr = FCR ?? CR2;

  // Forsvarssone faceoff-posisjoner
  const fxL = W * 0.27, fxR = W * 0.73;
  const fyBot = L - GL * 2.2;

  // Nøytralsone-prikker: rett innenfor blålinjen mot nøytralsonen
  const fyNeutDot = BL !== null ? L - BL - 1.5 : null;

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
          <circle cx={cx} cy={halfY} r={sw * 1.0} fill={RED} />
        </>
      )}

      {/* Blålinje i eget halvfelt */}
      {BL !== null && (
        <line x1={0} y1={L - BL} x2={W} y2={L - BL} stroke={BLUE} strokeWidth={sw * 2.5} />
      )}

      {/* Nøytralsoneprikker — rett innenfor blålinjen */}
      {fyNeutDot !== null && (
        <>
          <circle cx={fxL} cy={fyNeutDot} r={sw * 1.0} fill={RED} />
          <circle cx={fxR} cy={fyNeutDot} r={sw * 1.0} fill={RED} />
        </>
      )}

      {/* Faceoff-sirkler i forsvarssonen */}
      {hasFaceoffCircles && (
        <>
          <FaceoffCircle cx={fxL} cy={fyBot} r={fcr} sw={sw} />
          <FaceoffCircle cx={fxR} cy={fyBot} r={fcr} sw={sw} />
        </>
      )}

      {/* Mållinje */}
      <line x1={0} y1={L - GL} x2={W} y2={L - GL} stroke={RED} strokeWidth={sw} />

      {/* Målgård (D-form, åpner mot senter) */}
      <path d={botCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.9} />

      {/* Mål — åpning på mållinjen */}
      <rect x={cx - GW / 2} y={L - GL} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
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
