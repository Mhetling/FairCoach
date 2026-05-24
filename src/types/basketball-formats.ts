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

export const BASKETBALL_RULES_OVERVIEW = 'https://www.basket.no/regioner/nbbf-sentralt/dommere/regler/';
