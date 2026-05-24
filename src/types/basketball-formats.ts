// ─── Basketball format types and data (NBBF / FIBA) ──────────────────────────
// Data sourced from NBBF guidelines — do not modify without citing source.

export interface BasketballFormat {
  id: 'easybasket' | '3x3' | '5v5-u14' | '5v5-u16' | '5v5-senior';
  label: string;
  subtitle: string;
  ageGroup: string;
  shortLabel: string;  // compact label for progression indicator (≤4 chars)
  playersOnCourt: number;
  squadMax: number;
  courtLength: number;
  courtWidth: number;
  basketHeight: number;
  periodLength: number;
  periodCount: number;
  rulesUrl: string;
  note: string;
}

export const BASKETBALL_FORMATS: Record<string, BasketballFormat> = {
  'easybasket': {
    id: 'easybasket', label: 'EasyBasket', subtitle: 'Minibasket', ageGroup: '6–13 år',
    shortLabel: '4v4',
    playersOnCourt: 4, squadMax: 8,
    courtLength: 22, courtWidth: 13, basketHeight: 2.6,
    periodLength: 5, periodCount: 6,
    rulesUrl: '/nbbf-easybasket-regler-2022.pdf',
    note: 'Ingen poengregistrering. Spilleren som spiller mest kan kun spille én periode mer enn spilleren som spiller minst. Alle straffesituasjoner gir innkast. Ingen straffekast, timeout, backcourt-regel eller 3-poengslinjer. Kun mann-til-mann-forsvar.',
  },
  '3x3': {
    id: '3x3', label: '3×3 Basketball', subtitle: 'Halvbane', ageGroup: 'U13 og eldre',
    shortLabel: '3×3',
    playersOnCourt: 3, squadMax: 4,
    courtLength: 15, courtWidth: 11, basketHeight: 3.05,
    periodLength: 10, periodCount: 1,
    rulesUrl: 'https://www.basket.no/konkurranser/3x3/',
    note: 'Spilles på halvbane etter FIBA 3×3-regler. Vinner ved 21 poeng eller flest poeng på 10 minutter. 12 sekunders skuddsur.',
  },
  '5v5-u14': {
    id: '5v5-u14', label: 'Basketball U13/U14', subtitle: '5v5 – U13/U14', ageGroup: 'U13-14',
    shortLabel: 'U14',
    playersOnCourt: 5, squadMax: 12,
    courtLength: 28, courtWidth: 15, basketHeight: 3.05,
    periodLength: 8, periodCount: 4,
    rulesUrl: 'https://www.basket.no/siteassets/nbbf---dokumenter/spilleregler/nbbf-spilleregler-tilpasninger-u14-16.pdf',
    note: 'Ingen soneforvar eller helbanepressing – teknisk feil på trener ved brudd. Alle regelbrudd som normalt medfører straffekast gir i stedet innkast til feilet lag. 4 kvarter à 8 minutter.',
  },
  '5v5-u16': {
    id: '5v5-u16', label: 'Basketball U15/U16', subtitle: '5v5 – U15/U16', ageGroup: 'U15-16',
    shortLabel: 'U16',
    playersOnCourt: 5, squadMax: 12,
    courtLength: 28, courtWidth: 15, basketHeight: 3.05,
    periodLength: 8, periodCount: 4,
    rulesUrl: 'https://www.basket.no/siteassets/nbbf---dokumenter/spilleregler/nbbf-spilleregler-tilpasninger-u14-16.pdf',
    note: 'Standard FIBA ungdomsregler med NBBFs nasjonale tilpasninger. 4 kvarter à 8 minutter. 24 sekunders skuddsur.',
  },
  '5v5-senior': {
    id: '5v5-senior', label: 'Basketball', subtitle: '5v5 – U18 og eldre', ageGroup: 'U18 og eldre',
    shortLabel: 'U18+',
    playersOnCourt: 5, squadMax: 12,
    courtLength: 28, courtWidth: 15, basketHeight: 3.05,
    periodLength: 10, periodCount: 4,
    rulesUrl: 'https://www.basket.no/regioner/nbbf-sentralt/dommere/regler/',
    note: 'Fulle FIBA-regler. 4 kvarter à 10 minutter. 24 sekunders skuddsur (14 sek ved innkast fra angrepssonen). Maks 12 spillere på troppen.',
  },
};

export type BasketballFormatId = BasketballFormat['id'];
export const BASKETBALL_FORMAT_ORDER: BasketballFormatId[] = ['easybasket', '3x3', '5v5-u14', '5v5-u16', '5v5-senior'];

// ─── Court positions ──────────────────────────────────────────────────────────
// x/y are full-court percentages [0–100], y=50 = centre line, y=100 = own basket.
// Exception: '3x3' positions are stored as half-court view percentages (y=0 top,
// y=100 = own basket) because the entire 3×3 court is one defensive half.
// toHandballY((y-50)*2) is applied in MatchLive for non-3×3 formats.

export interface BasketballCourtPosition {
  id: string;
  label: string;     // e.g. "PG", "C", "1"
  fullName: string;
  x: number;
  y: number;
}

// 2-3 zone positions for all 5v5 variants (full-court %)
const FIVE_V_FIVE_2_3: BasketballCourtPosition[] = [
  // Front row — guards (low y = high up, far from own basket)
  { id: 'pg', label: 'PG', fullName: 'Oppspiller',    x: 38, y: 72 },  // view y≈44
  { id: 'sg', label: 'SG', fullName: 'Skyttebakvakt', x: 62, y: 72 },  // view y≈44
  // Back row — forwards + centre (high y = near own basket)
  { id: 'sf', label: 'SF', fullName: 'Liten forward', x: 20, y: 84 },  // view y≈68
  { id: 'c',  label: 'C',  fullName: 'Senter',        x: 50, y: 86 },  // view y≈72
  { id: 'pf', label: 'PF', fullName: 'Stor forward',  x: 80, y: 84 },  // view y≈68
];

export const BASKETBALL_COURT_POSITIONS: Record<string, BasketballCourtPosition[]> = {
  // 4v4 EasyBasket — 2-2 box (no named positions, neutral labels 1–4)
  'easybasket': [
    { id: 'p1', label: '1', fullName: 'Utespiller 1', x: 32, y: 71 },  // view y≈42
    { id: 'p2', label: '2', fullName: 'Utespiller 2', x: 68, y: 71 },  // view y≈42
    { id: 'p3', label: '3', fullName: 'Utespiller 3', x: 28, y: 84 },  // view y≈68
    { id: 'p4', label: '4', fullName: 'Utespiller 4', x: 72, y: 84 },  // view y≈68
  ],
  // 3×3 — triangle; stored as half-court view % (raw, no toHandballY)
  '3x3': [
    { id: 'pg', label: 'PG', fullName: 'Oppspiller',    x: 50, y: 38 },
    { id: 'sf', label: 'SF', fullName: 'Liten forward', x: 22, y: 68 },
    { id: 'pf', label: 'PF', fullName: 'Stor forward',  x: 78, y: 68 },
  ],
  '5v5-u14':   FIVE_V_FIVE_2_3,
  '5v5-u16':   FIVE_V_FIVE_2_3,
  '5v5-senior': FIVE_V_FIVE_2_3,
};

export const BASKETBALL_RULES_OVERVIEW = 'https://www.basket.no/regioner/nbbf-sentralt/dommere/regler/';
