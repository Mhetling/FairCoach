// ─── Basketball format types and data (NBBF / FIBA) ──────────────────────────
// Data sourced from NBBF guidelines — do not modify without citing source.

export interface BasketballFormat {
  id: 'easybasket' | '3x3' | '5v5';
  label: string;
  subtitle: string;
  ageGroup: string;
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
    playersOnCourt: 4, squadMax: 8,
    courtLength: 22, courtWidth: 13, basketHeight: 2.6,
    periodLength: 5, periodCount: 6,
    rulesUrl: 'https://www.basket.no/siteassets/nbbf---dokumenter/easybasket/nbbf-easybasket-regler-og-retningslinjer-2020.pdf',
    note: 'Ingen poengføring – alle deltar og har det gøy. Alle spillere må spille minst én periode. Lavere kurv (2,6 m) og liten bane. Kun mann-til-mann-forsvar. Ingen timeout.',
  },
  '3x3': {
    id: '3x3', label: '3×3 Basketball', subtitle: 'Halvbane', ageGroup: 'U13 og eldre',
    playersOnCourt: 3, squadMax: 4,
    courtLength: 15, courtWidth: 11, basketHeight: 3.05,
    periodLength: 10, periodCount: 1,
    rulesUrl: 'https://www.basket.no/konkurranser/3x3/',
    note: 'Spilles på halvbane etter FIBA 3×3-regler. Vinner ved 21 poeng eller flest poeng på 10 minutter. 12 sekunders skuddsur.',
  },
  '5v5': {
    id: '5v5', label: 'Basketball', subtitle: 'Full bane (5v5)', ageGroup: 'U14 og eldre',
    playersOnCourt: 5, squadMax: 12,
    courtLength: 28, courtWidth: 15, basketHeight: 3.05,
    periodLength: 10, periodCount: 4,
    rulesUrl: 'https://www.basket.no/regioner/nbbf-sentralt/dommere/regler/',
    note: 'Standard FIBA-regler. 4 kvarter à 8–10 minutter avhengig av aldersklasse. 24 sekunders skuddsur. Maks 12 spillere på troppen.',
  },
};

export type BasketballFormatId = BasketballFormat['id'];
export const BASKETBALL_FORMAT_ORDER: BasketballFormatId[] = ['easybasket', '3x3', '5v5'];

export const BASKETBALL_RULES_OVERVIEW = 'https://www.basket.no/regioner/nbbf-sentralt/dommere/regler/';
