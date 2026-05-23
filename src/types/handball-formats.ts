// ─── Handball format types and data (NHF / IHF) ──────────────────────────────
// All data sourced directly from handball.no — do not modify without citing source.

export interface HandballFormat {
  id: '4er' | '5er' | '6er' | '7er';
  label: string;
  subtitle: string;
  ageGroup: string;
  playersOnCourt: number;
  outfieldPlayers: number;
  hasGoalkeeper: boolean;
  squadMax: number;
  courtLength: number;
  courtWidth: number;
  goalWidth: number;
  goalHeight: number;
  periodLength: number;
  periodCount: number;
  rulesUrl: string;
  note: string;
}

export const HANDBALL_FORMATS: Record<string, HandballFormat> = {
  '4er': {
    id: '4er', label: '4-er-håndball', subtitle: 'Minihåndball', ageGroup: '6–8 år',
    playersOnCourt: 4, outfieldPlayers: 4, hasGoalkeeper: false, squadMax: 8,
    courtLength: 20, courtWidth: 12, goalWidth: 2.4, goalHeight: 1.6,
    periodLength: 10, periodCount: 2,
    rulesUrl: 'https://www.handball.no/regioner/nhf-sentralt/praktisk-info/lover-og-regler/spilleregler-handball/spilleregler-minihandball/',
    note: 'Spilles uten fast keeper. Den som er målvakt når laget vinner ballen blir med i angrep – gir 4 mot 3 overtall. Ingen utvisninger, kun veiledning.',
  },
  '5er': {
    id: '5er', label: '5-er-håndball', subtitle: 'Kortbanehåndball', ageGroup: '9–10 år',
    playersOnCourt: 5, outfieldPlayers: 4, hasGoalkeeper: true, squadMax: 10,
    courtLength: 26, courtWidth: 20, goalWidth: 3, goalHeight: 1.65,
    periodLength: 15, periodCount: 2,
    rulesUrl: 'https://www.handball.no/regioner/nhf-sentralt/praktisk-info/lover-og-regler/spilleregler-handball/spilleregler-5er-handball/',
    note: 'Keeper kan bli med opp i angrep for overtall. Oppfordres til å rotere på plasser, særlig keeper. 2 min personlig utvisning kan brukes i begrenset omfang.',
  },
  '6er': {
    id: '6er', label: '6-er-håndball', subtitle: 'Full bane', ageGroup: '11–12 år',
    playersOnCourt: 6, outfieldPlayers: 5, hasGoalkeeper: true, squadMax: 12,
    courtLength: 40, courtWidth: 20, goalWidth: 3, goalHeight: 1.65,
    periodLength: 20, periodCount: 2,
    rulesUrl: 'https://www.handball.no/regioner/nhf-sentralt/praktisk-info/lover-og-regler/spilleregler-handball/spilleregler-6er-handball/',
    note: 'Ordinær håndballbane. Alle på laget kan spille keeper i løpet av kampen. 2 min personlig utvisning kan brukes i begrenset omfang.',
  },
  '7er': {
    id: '7er', label: 'Håndball', subtitle: 'Full bane (7-er)', ageGroup: '13 år og eldre / voksen',
    playersOnCourt: 7, outfieldPlayers: 6, hasGoalkeeper: true, squadMax: 14,
    courtLength: 40, courtWidth: 20, goalWidth: 3, goalHeight: 2,
    periodLength: 30, periodCount: 2,
    rulesUrl: 'https://www.handball.no/regioner/nhf-sentralt/praktisk-info/lover-og-regler/spilleregler-handball/',
    note: 'Full håndball etter IHF/NHF-regler. 6 utespillere + målvakt. Spilletid 2x30 min for 16 år og eldre, 2x25 min for 12–16 år. Tropp inntil 14 (16 i øverste divisjoner). Vanlige håndballregler gjelder fullt ut (utvisning, frikast, 7-meter, passivt spill).',
  },
};

export type HandballFormatId = HandballFormat['id'];
export const HANDBALL_FORMAT_ORDER: HandballFormatId[] = ['4er', '5er', '6er', '7er'];

export const HANDBALL_RULES_OVERVIEW =
  'https://www.handball.no/regioner/nhf-sentralt/utvikling/ht/barnehandball/bestemmelser-og-spilleregler-i-barnehandball/';

// ─── Court positions ──────────────────────────────────────────────────────────
// x/y are percentages [0–100] from top-left.
// y=0 = opponent's goal end, y=100 = own GK end.

export interface CourtPosition {
  id: string;
  label: string;
  fullName: string;
  x: number;
  y: number;
  isGoalkeeper: boolean;
}

export const HANDBALL_COURT_POSITIONS: Record<string, CourtPosition[]> = {
  // Defensive formation: 6-0 arc in front of own goal (bottom of view).
  // x/y in full-court % (y=50–100 = own half). toHandballY() maps to display %.
  '4er': [
    { id: 'p1', label: '1', fullName: 'Utespiller', x: 22, y: 62, isGoalkeeper: false },
    { id: 'p2', label: '2', fullName: 'Utespiller', x: 42, y: 70, isGoalkeeper: false },
    { id: 'p3', label: '3', fullName: 'Utespiller', x: 58, y: 70, isGoalkeeper: false },
    { id: 'p4', label: '4', fullName: 'Utespiller', x: 78, y: 62, isGoalkeeper: false },
  ],
  '5er': [
    { id: 'mv', label: 'MV', fullName: 'Målvakt',       x: 50, y: 90, isGoalkeeper: true  },
    { id: 'vk', label: 'VK', fullName: 'Venstre kant',  x: 18, y: 64, isGoalkeeper: false },
    { id: 'vb', label: 'VB', fullName: 'Venstre back',  x: 40, y: 72, isGoalkeeper: false },
    { id: 'hb', label: 'HB', fullName: 'Høyre back',    x: 60, y: 72, isGoalkeeper: false },
    { id: 'hk', label: 'HK', fullName: 'Høyre kant',    x: 82, y: 64, isGoalkeeper: false },
  ],
  '6er': [
    { id: 'mv', label: 'MV', fullName: 'Målvakt',       x: 50, y: 92, isGoalkeeper: true  },
    { id: 'vk', label: 'VK', fullName: 'Venstre kant',  x: 14, y: 64, isGoalkeeper: false },
    { id: 'vb', label: 'VB', fullName: 'Venstre back',  x: 33, y: 72, isGoalkeeper: false },
    { id: 'mb', label: 'MB', fullName: 'Midtback',      x: 50, y: 74, isGoalkeeper: false },
    { id: 'hb', label: 'HB', fullName: 'Høyre back',    x: 67, y: 72, isGoalkeeper: false },
    { id: 'hk', label: 'HK', fullName: 'Høyre kant',    x: 86, y: 64, isGoalkeeper: false },
  ],
  '7er': [
    { id: 'mv', label: 'MV', fullName: 'Målvakt',       x: 50, y: 93, isGoalkeeper: true  },
    { id: 'vk', label: 'VK', fullName: 'Venstre kant',  x: 12, y: 64, isGoalkeeper: false },
    { id: 'vb', label: 'VB', fullName: 'Venstre back',  x: 30, y: 73, isGoalkeeper: false },
    { id: 'mb', label: 'MB', fullName: 'Midtback',      x: 42, y: 76, isGoalkeeper: false },
    { id: 'hb', label: 'HB', fullName: 'Høyre back',    x: 70, y: 73, isGoalkeeper: false },
    { id: 'hk', label: 'HK', fullName: 'Høyre kant',    x: 88, y: 64, isGoalkeeper: false },
    { id: 'st', label: 'ST', fullName: 'Strek',         x: 58, y: 70, isGoalkeeper: false },
  ],
};
