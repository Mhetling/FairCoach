export interface Formation {
  name: string;
  positions: { x: number; y: number }[];
}

// Positions for 3–9-a-side (x%, y% from top-left, y=0 opponent goal, y=100 own goal)
// All positions kept in own half (y ≥ 50) so they are always visible in the cropped view.
const SMALL_SIDED: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 28, y: 72 }, { x: 72, y: 72 },
    { x: 50, y: 54 },
  ],
  5: [
    { x: 50, y: 93 },
    { x: 28, y: 76 }, { x: 72, y: 76 },
    { x: 28, y: 57 }, { x: 72, y: 57 },
  ],
  7: [
    { x: 50, y: 93 },
    { x: 20, y: 78 }, { x: 50, y: 78 }, { x: 80, y: 78 },
    { x: 20, y: 60 }, { x: 50, y: 60 }, { x: 80, y: 60 },
  ],
  9: [
    { x: 50, y: 93 },
    { x: 20, y: 79 }, { x: 50, y: 79 }, { x: 80, y: 79 },
    { x: 20, y: 65 }, { x: 50, y: 65 }, { x: 80, y: 65 },
    { x: 33, y: 53 }, { x: 67, y: 53 },
  ],
};

export const ELEVEN_FORMATIONS: Formation[] = [
  {
    name: "4-4-2",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 80 }, { x: 36, y: 81 }, { x: 64, y: 81 }, { x: 88, y: 80 },
      { x: 12, y: 65 }, { x: 36, y: 63 }, { x: 64, y: 63 }, { x: 88, y: 65 },
      { x: 33, y: 54 }, { x: 67, y: 54 },
    ],
  },
  {
    name: "4-3-3",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 80 }, { x: 36, y: 81 }, { x: 64, y: 81 }, { x: 88, y: 80 },
      { x: 25, y: 66 }, { x: 50, y: 64 }, { x: 75, y: 66 },
      { x: 15, y: 53 }, { x: 50, y: 52 }, { x: 85, y: 53 },
    ],
  },
  {
    name: "4-5-1",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 80 }, { x: 36, y: 81 }, { x: 64, y: 81 }, { x: 88, y: 80 },
      { x: 10, y: 64 }, { x: 28, y: 62 }, { x: 50, y: 64 }, { x: 72, y: 62 }, { x: 90, y: 64 },
      { x: 50, y: 53 },
    ],
  },
  {
    name: "3-5-2",
    positions: [
      { x: 50, y: 93 },
      { x: 25, y: 81 }, { x: 50, y: 79 }, { x: 75, y: 81 },
      { x: 10, y: 64 }, { x: 28, y: 62 }, { x: 50, y: 64 }, { x: 72, y: 62 }, { x: 90, y: 64 },
      { x: 33, y: 54 }, { x: 67, y: 54 },
    ],
  },
  {
    name: "4-2-3-1",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 80 }, { x: 36, y: 81 }, { x: 64, y: 81 }, { x: 88, y: 80 },
      { x: 33, y: 70 }, { x: 67, y: 70 },
      { x: 15, y: 60 }, { x: 50, y: 58 }, { x: 85, y: 60 },
      { x: 50, y: 52 },
    ],
  },
  {
    name: "3-4-3",
    positions: [
      { x: 50, y: 93 },
      { x: 25, y: 81 }, { x: 50, y: 79 }, { x: 75, y: 81 },
      { x: 12, y: 66 }, { x: 36, y: 64 }, { x: 64, y: 64 }, { x: 88, y: 66 },
      { x: 15, y: 53 }, { x: 50, y: 52 }, { x: 85, y: 53 },
    ],
  },
];

export const DEFAULT_11_FORMATION = "4-4-2";

// ─── Handball positions ───────────────────────────────────────────────────────
// Delegated to src/types/handball-formats.ts (NHF-accurate data).

import {
  HANDBALL_COURT_POSITIONS, HANDBALL_FORMATS,
  type CourtPosition,
} from "@/types/handball-formats";

import {
  BASKETBALL_FORMATS, BASKETBALL_COURT_POSITIONS,
  type BasketballFormatId, type BasketballCourtPosition,
} from "@/types/basketball-formats";

export type { BasketballCourtPosition };

export function getBasketballCourtPositions(formatId: string): BasketballCourtPosition[] {
  return BASKETBALL_COURT_POSITIONS[formatId] ?? BASKETBALL_COURT_POSITIONS['5v5-senior'];
}

export function resolveBasketballFormatId(
  formation: string | null,
  playersOnCourt: number,
): BasketballFormatId {
  if (formation && formation in BASKETBALL_FORMATS) return formation as BasketballFormatId;
  if (formation === '5v5') return '5v5-senior'; // legacy alias
  if (playersOnCourt <= 3) return '3x3';
  if (playersOnCourt === 4) return 'easybasket';
  return '5v5-senior';
}

export type { CourtPosition };

export function resolveHandballFormatId(
  formation: string | null,
  playersOnCourt: number,
): string {
  if (formation && formation in HANDBALL_FORMATS) return formation;
  if (playersOnCourt <= 4) return '4er';
  if (playersOnCourt === 5) return '5er';
  if (playersOnCourt === 6) return '6er';
  return '7er';
}

export function getHandballCourtPositions(formatId: string): CourtPosition[] {
  return HANDBALL_COURT_POSITIONS[formatId] ?? HANDBALL_COURT_POSITIONS['7er'];
}

export function getHandballPositions(formatId: string): { x: number; y: number }[] {
  return getHandballCourtPositions(formatId).map(({ x, y }) => ({ x, y }));
}

// ─── Hockey positions ─────────────────────────────────────────────────────────
// GK at own goal; field players on curved arc (same parabola formula as handball).
const HOCKEY_POSITIONS: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 50, y: 88 },                              // GK (foran mållinjen)
    { x: 25, y: 62 }, { x: 75, y: 62 },
  ],
  4: [
    { x: 50, y: 88 },
    { x: 20, y: 70 }, { x: 50, y: 58 }, { x: 80, y: 70 },
  ],
  5: [
    { x: 50, y: 88 },
    { x: 15, y: 72 }, { x: 85, y: 72 },           // 2 backer
    { x: 35, y: 52 }, { x: 65, y: 52 },           // 2 forward
  ],
  6: [
    { x: 50, y: 88 },                              // GK — 2-1-2
    { x: 25, y: 74 }, { x: 75, y: 74 },           // 2 backer
    { x: 50, y: 55 },                              // center
    { x: 25, y: 36 }, { x: 75, y: 36 },           // 2 forward
  ],
};

export function getHockeyPositions(playersOnField: number): { x: number; y: number }[] {
  return HOCKEY_POSITIONS[playersOnField] ?? HOCKEY_POSITIONS[6];
}

// ─── Basketball positions ─────────────────────────────────────────────────────
// No GK — all players in offensive setup on own half.
const BASKETBALL_POSITIONS: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 50, y: 55 },
    { x: 18, y: 70 }, { x: 82, y: 70 },
  ],
  4: [
    { x: 50, y: 55 },
    { x: 18, y: 64 }, { x: 82, y: 64 },
    { x: 50, y: 76 },
  ],
  5: [
    { x: 50, y: 55 },
    { x: 18, y: 64 }, { x: 82, y: 64 },
    { x: 30, y: 76 }, { x: 70, y: 76 },
  ],
};

export function getBasketballPositions(playersOnField: number): { x: number; y: number }[] {
  return BASKETBALL_POSITIONS[playersOnField] ?? BASKETBALL_POSITIONS[5];
}

export function getFormationPositions(
  playersOnField: number,
  formation: string | null,
): { x: number; y: number }[] {
  if (playersOnField === 11) {
    const f = ELEVEN_FORMATIONS.find((f) => f.name === (formation ?? DEFAULT_11_FORMATION));
    if (f) return f.positions;
  }
  if (SMALL_SIDED[playersOnField]) return SMALL_SIDED[playersOnField];

  // Fallback generic layout
  const pos = [{ x: 50, y: 87 }];
  const rest = playersOnField - 1;
  const rows = Math.ceil(rest / 3);
  for (let r = 0; r < rows; r++) {
    const inRow = Math.min(3, rest - r * 3);
    const y = 72 - r * (58 / Math.max(rows - 1, 1));
    for (let i = 0; i < inRow; i++) {
      pos.push({ x: inRow === 1 ? 50 : 15 + (i * 70) / (inRow - 1), y });
    }
  }
  return pos.slice(0, playersOnField);
}
