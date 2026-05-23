export interface PitchSpec {
  format: '3er' | '5er' | '7er' | '9er' | '11er';
  width: number;
  length: number;
  goalWidth: number;
  goalHeight: number;
  penaltyAreaWidth: number | null;
  penaltyAreaDepth: number | null;
  goalAreaWidth: number | null;
  goalAreaDepth: number | null;
  penaltySpotDistance: number | null;
  centerCircleRadius: number;
  hasOffside: boolean;
}

// ─── Handball court ───────────────────────────────────────────────────────────

export interface HandballCourtSpec {
  width: number;
  length: number;
  goalWidth: number;
  goalAreaRadius: number | null;   // null = no fixed goal area (4er, no goalkeeper)
  freeThrowRadius: number | null;  // null = no free-throw line
  penaltyDistance: number | null;  // null = no 7m penalty
}

const HANDBALL_COURT_SPECS: Record<string, HandballCourtSpec> = {
  '4er': { width: 12,  length: 20, goalWidth: 2.4, goalAreaRadius: null, freeThrowRadius: null, penaltyDistance: null },
  '5er': { width: 20,  length: 26, goalWidth: 3,   goalAreaRadius: 6,    freeThrowRadius: 9,    penaltyDistance: 7    },
  '6er': { width: 20,  length: 40, goalWidth: 3,   goalAreaRadius: 6,    freeThrowRadius: 9,    penaltyDistance: 7    },
  '7er': { width: 20,  length: 40, goalWidth: 3,   goalAreaRadius: 6,    freeThrowRadius: 9,    penaltyDistance: 7    },
};

// Keep a default spec so callers that don't care about format still work
export const HANDBALL_COURT_SPEC: HandballCourtSpec = HANDBALL_COURT_SPECS['7er'];

export function getHandballCourtSpec(formatId: string): HandballCourtSpec {
  return HANDBALL_COURT_SPECS[formatId] ?? HANDBALL_COURT_SPECS['7er'];
}

// ─── Hockey rink ──────────────────────────────────────────────────────────────

export interface HockeyRinkSpec {
  width: number;
  length: number;
  goalWidth: number;
  goalLineDistance: number;   // from end to goal line
  blueLineDistance: number;   // from end to blue line
  cornerRadius: number;
  centerCircleRadius: number;
  creaseRadius: number;
}

export const HOCKEY_RINK_SPEC: HockeyRinkSpec = {
  width: 26,
  length: 60,
  goalWidth: 1.83,
  goalLineDistance: 4,
  blueLineDistance: 17.4,
  cornerRadius: 7,
  centerCircleRadius: 4.5,
  creaseRadius: 1.8,
};

// ─── Basketball court ─────────────────────────────────────────────────────────

export interface BasketballCourtSpec {
  width: number;
  length: number;
  threePointRadius: number | null;   // null = no three-point line (EasyBasket)
  keyWidth: number;
  keyDepth: number;
  basketDistance: number;    // from baseline to basket centre
  centerCircleRadius: number;
  freeThrowRadius: number;
  halfCourt: boolean;        // true = 3x3 (single basket, no centre line)
}

const BASKETBALL_COURT_SPECS: Record<string, BasketballCourtSpec> = {
  'easybasket': {
    width: 13, length: 22, threePointRadius: null,
    keyWidth: 3.6, keyDepth: 4.6, basketDistance: 1.2,
    centerCircleRadius: 1.5, freeThrowRadius: 1.5, halfCourt: false,
  },
  '3x3': {
    width: 11, length: 15, threePointRadius: 6.75,
    keyWidth: 4.9, keyDepth: 5.8, basketDistance: 1.575,
    centerCircleRadius: 1.8, freeThrowRadius: 1.8, halfCourt: true,
  },
  '5v5': {
    width: 15, length: 28, threePointRadius: 6.75,
    keyWidth: 4.9, keyDepth: 5.8, basketDistance: 1.575,
    centerCircleRadius: 1.8, freeThrowRadius: 1.8, halfCourt: false,
  },
};

export const BASKETBALL_COURT_SPEC: BasketballCourtSpec = BASKETBALL_COURT_SPECS['5v5'];

export function getBasketballCourtSpec(formatId: string): BasketballCourtSpec {
  return BASKETBALL_COURT_SPECS[formatId] ?? BASKETBALL_COURT_SPECS['5v5'];
}

// ─── Soccer pitches ───────────────────────────────────────────────────────────

export const PITCH_SPECS: Record<number, PitchSpec> = {
  3: {
    format: '3er', width: 15, length: 20, goalWidth: 1.5, goalHeight: 1.2,
    penaltyAreaWidth: null, penaltyAreaDepth: null,
    goalAreaWidth: null, goalAreaDepth: null, penaltySpotDistance: null,
    centerCircleRadius: 3, hasOffside: false,
  },
  5: {
    format: '5er', width: 20, length: 30, goalWidth: 3, goalHeight: 2,
    penaltyAreaWidth: 9, penaltyAreaDepth: 5,
    goalAreaWidth: null, goalAreaDepth: null, penaltySpotDistance: 6,
    centerCircleRadius: 4, hasOffside: false,
  },
  7: {
    format: '7er', width: 30, length: 50, goalWidth: 5, goalHeight: 2,
    penaltyAreaWidth: 13, penaltyAreaDepth: 8,
    goalAreaWidth: null, goalAreaDepth: null, penaltySpotDistance: 8,
    centerCircleRadius: 5, hasOffside: false,
  },
  9: {
    format: '9er', width: 50, length: 67, goalWidth: 5, goalHeight: 2,
    penaltyAreaWidth: 21, penaltyAreaDepth: 8,
    goalAreaWidth: null, goalAreaDepth: null, penaltySpotDistance: 11,
    centerCircleRadius: 7, hasOffside: true,
  },
  11: {
    format: '11er', width: 68, length: 105, goalWidth: 7.32, goalHeight: 2.44,
    penaltyAreaWidth: 40.32, penaltyAreaDepth: 16.5,
    goalAreaWidth: 18.32, goalAreaDepth: 5.5, penaltySpotDistance: 11,
    centerCircleRadius: 9.15, hasOffside: true,
  },
};
