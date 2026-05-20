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

// ─── Public component ─────────────────────────────────────────────────────────

interface HockeyRinkProps {
  format: HockeyFormat;
  /** Spillerbrikker – posisjoneres absolut over banen (left/top i %) */
  children?: ReactNode;
  className?: string;
}

export function HockeyRink({ format, children, className }: HockeyRinkProps) {
  const spec = RINK_SPECS[format];
  const { width: W, length: L } = spec;

  return (
    // Container med eksakt baneproporsjon slik at SVG fyller 100 %
    <div
      className={cn("relative w-full overflow-hidden rounded-xl", className)}
      style={{ aspectRatio: `${W} / ${L}` }}
    >
      <svg
        viewBox={`0 0 ${W} ${L}`}
        preserveAspectRatio="none"
        style={{ display: "block", width: "100%", height: "100%" }}
      >
        {/* Isflate */}
        <RinkSurface spec={spec} />
        {/* Markeringer */}
        {spec.orientation === "horizontal"
          ? <HorizontalMarkings spec={spec} />
          : <VerticalMarkings spec={spec} />}
      </svg>

      {/* Spilleroverlay – absolutt innenfor banen */}
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
  const sw = W / 40; // vant-tykkelse relativt til bredde

  const rinkPath = roundedRect(0, 0, W, L, CR);

  return (
    <>
      {/* Isblå fyll */}
      <path d={rinkPath} fill={ICE} />
      {/* Vant-kontur */}
      <path d={rinkPath} fill="none" stroke={BOARD_STROKE} strokeWidth={sw} />
    </>
  );
}

// ─── Vertikal bane (mål øverst/nederst) ───────────────────────────────────────

function VerticalMarkings({ spec }: { spec: RinkSpec }) {
  const { width: W, length: L, goalLineDistance: GL, goalWidth: GW,
    creaseRadius: CR2, centerCircleRadius: CCR,
    blueLineDistance: BL, hasFaceoffCircles } = spec;

  const cx    = W / 2;
  const sw    = W / 70;          // strek-tykkelse
  const gd    = Math.min(0.55, GL * 0.8); // mål-dybde i meter

  // Keeper-halvsirkel (D-formet, åpner MOT isen)
  const topCrease = `M ${cx - CR2},${GL} A ${CR2},${CR2} 0 0,1 ${cx + CR2},${GL} Z`;
  const botCrease = `M ${cx - CR2},${L - GL} A ${CR2},${CR2} 0 0,0 ${cx + CR2},${L - GL} Z`;

  // Faceoff-sirkler: to i topp-sone, to i bunn-sone
  const fxL = W * 0.27, fxR = W * 0.73;
  const fyTop = GL * 2.4, fyBot = L - GL * 2.4;
  const fcr   = CR2 * 0.9;      // faceoff-sirkelradius

  return (
    <>
      {/* ─── Keeper-halvsirkler ─── */}
      <path d={topCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />
      <path d={botCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />

      {/* ─── Mållinjer ─── */}
      <line x1={0} y1={GL}     x2={W} y2={GL}     stroke={RED} strokeWidth={sw} />
      <line x1={0} y1={L - GL} x2={W} y2={L - GL} stroke={RED} strokeWidth={sw} />

      {/* ─── Mål ─── */}
      {/* Topp-mål (motstander) */}
      <rect x={cx - GW / 2} y={0} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
      {/* Bunn-mål (eget) */}
      <rect x={cx - GW / 2} y={L - gd} width={GW} height={gd}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />

      {/* ─── Blålinjer (kun 5v5-full) ─── */}
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
          <circle cx={cx} cy={L / 2} r={CCR}
            fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={cx} cy={L / 2} r={sw * 1.2} fill={RED} />
        </>
      )}

      {/* ─── Faceoff-sirkler og prikker ─── */}
      {hasFaceoffCircles && (
        <>
          {/* Prikker */}
          {[fxL, fxR].flatMap(fx => [fyTop, fyBot].map(fy => (
            <circle key={`${fx}-${fy}`} cx={fx} cy={fy} r={sw * 1.2} fill={RED} />
          )))}
          {/* Sirkler (kun hvis det er plass — 5v5 formater) */}
          {[fxL, fxR].flatMap(fx => [fyTop, fyBot].map(fy => (
            <circle key={`ring-${fx}-${fy}`}
              cx={fx} cy={fy} r={fcr}
              fill="none" stroke={RED} strokeWidth={sw * 0.7} />
          )))}
        </>
      )}
    </>
  );
}

// ─── Horisontal bane (3v3-quarter, mål til venstre/høyre) ─────────────────────

function HorizontalMarkings({ spec }: { spec: RinkSpec }) {
  const { width: W, length: L, goalLineDistance: GL, goalWidth: GW,
    creaseRadius: CR2, centerCircleRadius: CCR } = spec;

  const cy  = L / 2;           // midtpunkt vertikalt (y-retning = L=20)
  const sw  = L / 50;          // strek-tykkelse relativt til kortside
  const gd  = Math.min(0.55, GL * 0.8);

  // Keeper-halvsirkel: venstre mål åpner MOT høyre (inn på isen)
  const leftCrease  = `M ${GL},${cy - CR2} A ${CR2},${CR2} 0 0,1 ${GL},${cy + CR2} Z`;
  // Høyre mål åpner MOT venstre
  const rightCrease = `M ${W - GL},${cy - CR2} A ${CR2},${CR2} 0 0,0 ${W - GL},${cy + CR2} Z`;

  return (
    <>
      {/* ─── Keeper-halvsirkler ─── */}
      <path d={leftCrease}  fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />
      <path d={rightCrease} fill={CREASE_FILL} stroke={CREASE_STROKE} strokeWidth={sw * 0.8} />

      {/* ─── Mållinjer (vertikale streker) ─── */}
      <line x1={GL}     y1={0} x2={GL}     y2={L} stroke={RED} strokeWidth={sw} />
      <line x1={W - GL} y1={0} x2={W - GL} y2={L} stroke={RED} strokeWidth={sw} />

      {/* ─── Mål ─── */}
      {/* Venstre mål (eget) */}
      <rect x={0} y={cy - GW / 2} width={gd} height={GW}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />
      {/* Høyre mål (motstander) */}
      <rect x={W - gd} y={cy - GW / 2} width={gd} height={GW}
        fill={GOAL_FILL} stroke={GOAL_STROKE} strokeWidth={sw * 0.7} rx={sw * 0.3} />

      {/* ─── Midtlinje (vertikal strek) ─── */}
      <line x1={W / 2} y1={0} x2={W / 2} y2={L} stroke={RED} strokeWidth={sw * 1.5} />

      {/* ─── Midtsirkel ─── */}
      {CCR !== null && (
        <>
          <circle cx={W / 2} cy={cy} r={CCR}
            fill="none" stroke={BLUE} strokeWidth={sw} />
          <circle cx={W / 2} cy={cy} r={sw * 1.2} fill={RED} />
        </>
      )}
    </>
  );
}

// ─── SVG-kun eksport (for bruk inne i MatchLive sin PitchZone) ───────────────
// Rendrer kun SVG-innholdet uten wrapper-div og uten eget aspektforhold.

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
