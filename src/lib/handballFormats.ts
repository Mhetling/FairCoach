// ─── Handball formats (NHF Isbjørnmodellen / ungdomshåndball) ─────────────────

export type HandballFormat =
  | '3v3-mini'
  | '4v4-spillende'
  | '5v5-spillende'
  | '6v6'
  | '7v7';

export interface HandballFormatSpec {
  format: HandballFormat;
  label: string;
  ageGroup: string;
  playersOnField: number;
  playingGK: boolean;
  tagline: string;
  description: string;
  periodLengthSeconds: number;
  periodCount: number;
}

export const HANDBALL_FORMAT_SPECS: Record<HandballFormat, HandballFormatSpec> = {
  '3v3-mini': {
    format: '3v3-mini',
    label: '3 mot 3',
    ageGroup: 'U6–U8',
    playersOnField: 3,
    playingGK: true,
    tagline: 'Ingen fast keeper',
    description: 'Liten bane. Alle spiller på hele banen og roterer i mål. Fokus på deltakelse og lek.',
    periodLengthSeconds: 8 * 60,
    periodCount: 2,
  },
  '4v4-spillende': {
    format: '4v4-spillende',
    label: '4 mot 4',
    ageGroup: 'U9–U10',
    playersOnField: 4,
    playingGK: true,
    tagline: 'Spillende keeper',
    description: 'Keeper deltar i angrep og gir laget overtall fremover. 3 utespillere.',
    periodLengthSeconds: 10 * 60,
    periodCount: 2,
  },
  '5v5-spillende': {
    format: '5v5-spillende',
    label: '5 mot 5',
    ageGroup: 'U11–U12',
    playersOnField: 5,
    playingGK: true,
    tagline: 'Spillende keeper — overtall i angrep',
    description: '4 utespillere + spillende keeper. Keeper kan angripe og gir 5 mot 4 overtall fremover.',
    periodLengthSeconds: 12 * 60,
    periodCount: 2,
  },
  '6v6': {
    format: '6v6',
    label: '6 mot 6',
    ageGroup: 'U13',
    playersOnField: 6,
    playingGK: false,
    tagline: 'Fast keeper',
    description: '5 utespillere + fast keeper. Overgang mot fullstendig håndball på stor bane.',
    periodLengthSeconds: 15 * 60,
    periodCount: 2,
  },
  '7v7': {
    format: '7v7',
    label: '7 mot 7',
    ageGroup: 'U14 og eldre',
    playersOnField: 7,
    playingGK: false,
    tagline: 'Full håndball',
    description: '6 utespillere + fast keeper. Standard håndball på full bane.',
    periodLengthSeconds: 25 * 60,
    periodCount: 2,
  },
};

export const HANDBALL_FORMATS: HandballFormat[] = [
  '3v3-mini', '4v4-spillende', '5v5-spillende', '6v6', '7v7',
];

export function resolveHandballFormat(
  formation: string | null,
  playersOnField: number,
): HandballFormat {
  if (formation && formation in HANDBALL_FORMAT_SPECS) return formation as HandballFormat;
  if (playersOnField <= 3) return '3v3-mini';
  if (playersOnField === 4) return '4v4-spillende';
  if (playersOnField === 5) return '5v5-spillende';
  if (playersOnField === 6) return '6v6';
  return '7v7';
}
