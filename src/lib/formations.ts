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
    { x: 28, y: 68 }, { x: 72, y: 68 },
    { x: 28, y: 54 }, { x: 72, y: 54 },
  ],
  7: [
    { x: 50, y: 93 },
    { x: 20, y: 70 }, { x: 50, y: 70 }, { x: 80, y: 70 },
    { x: 20, y: 55 }, { x: 50, y: 55 }, { x: 80, y: 55 },
  ],
  9: [
    { x: 50, y: 93 },
    { x: 20, y: 72 }, { x: 50, y: 72 }, { x: 80, y: 72 },
    { x: 20, y: 60 }, { x: 50, y: 60 }, { x: 80, y: 60 },
    { x: 33, y: 52 }, { x: 67, y: 52 },
  ],
};

export const ELEVEN_FORMATIONS: Formation[] = [
  {
    name: "4-4-2",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 73 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 73 },
      { x: 12, y: 60 }, { x: 36, y: 58 }, { x: 64, y: 58 }, { x: 88, y: 60 },
      { x: 33, y: 52 }, { x: 67, y: 52 },
    ],
  },
  {
    name: "4-3-3",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 73 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 73 },
      { x: 25, y: 62 }, { x: 50, y: 60 }, { x: 75, y: 62 },
      { x: 15, y: 52 }, { x: 50, y: 51 }, { x: 85, y: 52 },
    ],
  },
  {
    name: "4-5-1",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 73 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 73 },
      { x: 10, y: 60 }, { x: 28, y: 58 }, { x: 50, y: 60 }, { x: 72, y: 58 }, { x: 90, y: 60 },
      { x: 50, y: 51 },
    ],
  },
  {
    name: "3-5-2",
    positions: [
      { x: 50, y: 93 },
      { x: 25, y: 74 }, { x: 50, y: 72 }, { x: 75, y: 74 },
      { x: 10, y: 60 }, { x: 28, y: 58 }, { x: 50, y: 60 }, { x: 72, y: 58 }, { x: 90, y: 60 },
      { x: 33, y: 52 }, { x: 67, y: 52 },
    ],
  },
  {
    name: "4-2-3-1",
    positions: [
      { x: 50, y: 93 },
      { x: 12, y: 73 }, { x: 36, y: 74 }, { x: 64, y: 74 }, { x: 88, y: 73 },
      { x: 33, y: 65 }, { x: 67, y: 65 },
      { x: 15, y: 57 }, { x: 50, y: 55 }, { x: 85, y: 57 },
      { x: 50, y: 51 },
    ],
  },
  {
    name: "3-4-3",
    positions: [
      { x: 50, y: 93 },
      { x: 25, y: 74 }, { x: 50, y: 72 }, { x: 75, y: 74 },
      { x: 12, y: 62 }, { x: 36, y: 60 }, { x: 64, y: 60 }, { x: 88, y: 62 },
      { x: 15, y: 52 }, { x: 50, y: 51 }, { x: 85, y: 52 },
    ],
  },
];

export const DEFAULT_11_FORMATION = "4-4-2";

// ─── Handball positions ───────────────────────────────────────────────────────
// x/y are percentages from top-left; y=0 = opponent's goal end, y=100 = own GK end

// Field players form a single curved arc (parabola: y = 58 + 0.007*(x-50)^2).
// GK is alone at own goal. No player in front of or behind the arc.
// x values kept in [10, 90] so 66px tokens don't clip on a 375px mobile screen.
// y follows a parabola y = 58 + 0.007*(x-50)^2 so all players sit on one curved arc.
const HANDBALL_POSITIONS: Record<number, { x: number; y: number }[]> = {
  4: [
    { x: 50, y: 95 },                              // GK
    { x: 20, y: 64 }, { x: 50, y: 58 }, { x: 80, y: 64 },
  ],
  5: [
    { x: 50, y: 95 },                              // GK
    { x: 10, y: 69 }, { x: 37, y: 59 }, { x: 63, y: 59 }, { x: 90, y: 69 },
  ],
  6: [
    { x: 50, y: 95 },                              // GK
    { x: 10, y: 69 }, { x: 30, y: 61 }, { x: 50, y: 58 }, { x: 70, y: 61 }, { x: 90, y: 69 },
  ],
  7: [
    { x: 50, y: 95 },                              // GK
    { x: 10, y: 69 }, { x: 26, y: 62 }, { x: 42, y: 59 }, { x: 58, y: 59 }, { x: 74, y: 62 }, { x: 90, y: 69 },
  ],
};

export function getHandballPositions(playersOnField: number): { x: number; y: number }[] {
  return HANDBALL_POSITIONS[playersOnField] ?? getFormationPositions(playersOnField, null);
}

// ─── Hockey positions ─────────────────────────────────────────────────────────
// GK at own goal; field players on curved arc (same parabola formula as handball).
const HOCKEY_POSITIONS: Record<number, { x: number; y: number }[]> = {
  3: [
    { x: 50, y: 95 },                              // GK
    { x: 25, y: 62 }, { x: 75, y: 62 },
  ],
  4: [
    { x: 50, y: 95 },
    { x: 20, y: 64 }, { x: 50, y: 58 }, { x: 80, y: 64 },
  ],
  5: [
    { x: 50, y: 95 },
    { x: 10, y: 69 }, { x: 37, y: 59 }, { x: 63, y: 59 }, { x: 90, y: 69 },
  ],
  6: [
    { x: 50, y: 95 },
    { x: 10, y: 69 }, { x: 30, y: 61 }, { x: 50, y: 58 }, { x: 70, y: 61 }, { x: 90, y: 69 },
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
