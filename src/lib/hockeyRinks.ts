// ─── Hockey rink specs & positions (NIHF Isbjørnmodellen) ─────────────────────

export type HockeyFormat = '3v3-small' | '3v3-quarter' | '5v5-small' | '5v5-full';

export interface RinkSpec {
  format: HockeyFormat;
  label: string;
  ageGroup: string;
  /** Reelle mål i meter — brukes som SVG viewBox-enheter */
  width: number;
  length: number;
  /** Radius på rundvant-hjørner i meter */
  cornerRadius: number;
  /** Avstand fra kortside til mållinje i meter */
  goalLineDistance: number;
  /** Bredde på mål i meter */
  goalWidth: number;
  /** Radius på keeper-halvsirkel (crease) i meter */
  creaseRadius: number;
  /** Avstand fra kortside til blålinje (kun 5v5-full) */
  blueLineDistance: number | null;
  /** Radius på midtsirkel i meter (null = ikke tegnet) */
  centerCircleRadius: number | null;
  /** Tegn faceoff-sirkler i hjørnene (kun 5v5) */
  hasFaceoffCircles: boolean;
  /** Radius på faceoff-sirkler i meter (null = ingen sirkler) */
  faceoffCircleRadius: number | null;
  /** Antall spillere på isen inkl. målvakt */
  playersOnField: number;
  /** 'vertical' = mål øverst/nederst, 'horizontal' = mål til venstre/høyre */
  orientation: 'vertical' | 'horizontal';
}

export const RINK_SPECS: Record<HockeyFormat, RinkSpec> = {
  '3v3-small': {
    format: '3v3-small',
    label: '3 mot 3 (1/6 bane)',
    ageGroup: 'U7–U9',
    width: 15, length: 20,
    cornerRadius: 3,
    goalLineDistance: 2,
    goalWidth: 1.5,
    creaseRadius: 1.2,
    blueLineDistance: null,
    centerCircleRadius: 2.5,
    hasFaceoffCircles: false,
    faceoffCircleRadius: null,
    playersOnField: 4,
    orientation: 'vertical',
  },
  '3v3-quarter': {
    format: '3v3-quarter',
    label: '3 mot 3 (1/4 bane, på tvers)',
    ageGroup: 'U10–U11',
    // Spilles på tvers: bredden er "lengden" i spilleretning
    width: 30, length: 20,
    cornerRadius: 3,
    goalLineDistance: 2,
    goalWidth: 1.5,
    creaseRadius: 1.2,
    blueLineDistance: null,
    centerCircleRadius: 2.5,
    hasFaceoffCircles: false,
    faceoffCircleRadius: null,
    playersOnField: 4,
    orientation: 'horizontal',
  },
  '5v5-small': {
    format: '5v5-small',
    label: '5 mot 5 (halv bane)',
    ageGroup: 'U12',
    width: 26, length: 30,
    cornerRadius: 5,
    goalLineDistance: 3,
    goalWidth: 1.83,
    creaseRadius: 1.5,
    blueLineDistance: null,
    centerCircleRadius: 3.5,
    hasFaceoffCircles: true,
    faceoffCircleRadius: 2.5,
    playersOnField: 6,
    orientation: 'vertical',
  },
  '5v5-full': {
    format: '5v5-full',
    label: '5 mot 5 (full bane)',
    ageGroup: 'U13 og eldre',
    width: 26, length: 60,
    cornerRadius: 7,
    goalLineDistance: 4,
    goalWidth: 1.83,
    creaseRadius: 1.8,
    blueLineDistance: 17.4,
    centerCircleRadius: 4.5,
    hasFaceoffCircles: true,
    faceoffCircleRadius: 4.5,
    playersOnField: 6,
    orientation: 'vertical',
  },
};

// ─── Posisjoner ───────────────────────────────────────────────────────────────
// x/y er prosent (0–100) av henholdsvis bredde og lengde i spilleretning.
// For 'vertical': y=100 er eget mål (bunn), y=0 er motstanderens mål (topp).
// For 'horizontal': x=0 er eget mål (venstre), x=100 er motstanderens mål (høyre).

export interface RinkPosition {
  id: string;
  label: string;     // kort, vises som chip: "MV", "LB", "C"
  fullName: string;
  /** 0–100 prosent av banens bredde (SVG x) */
  x: number;
  /** 0–100 prosent av banens lengde (SVG y) */
  y: number;
  isGoalie: boolean;
}

// Alle y-verdier er i [50, 100] — eget halvfelt (y=50 = midtlinje, y=100 = eget mål).
// I kampvisningen konverteres disse til halvbane-koordinater: viewY = (y - 50) * 2.
export const RINK_POSITIONS: Record<HockeyFormat, RinkPosition[]> = {
  // U7–U9: MV + 2-1 formasjon (3 utespillere)
  '3v3-small': [
    { id: 'g',  label: 'MV', fullName: 'Målvakt',    x: 50, y: 95, isGoalie: true  },
    { id: 'u1', label: '1',  fullName: 'Utespiller', x: 28, y: 74, isGoalie: false },
    { id: 'u2', label: '2',  fullName: 'Utespiller', x: 72, y: 74, isGoalie: false },
    { id: 'u3', label: '3',  fullName: 'Utespiller', x: 50, y: 58, isGoalie: false },
  ],
  // U10–U11: samme 2-1 som 3v3-small (kampvisning bruker vertikalt halvfelt)
  '3v3-quarter': [
    { id: 'g',  label: 'MV', fullName: 'Målvakt',    x: 50, y: 95, isGoalie: true  },
    { id: 'u1', label: '1',  fullName: 'Utespiller', x: 28, y: 74, isGoalie: false },
    { id: 'u2', label: '2',  fullName: 'Utespiller', x: 72, y: 74, isGoalie: false },
    { id: 'u3', label: '3',  fullName: 'Utespiller', x: 50, y: 58, isGoalie: false },
  ],
  // U12: MV + 2-1-2 formasjon (5 utespillere)
  // C ved midtlinjen, vinger i nøytralsonen nær rundvant, backs i forsvarssonen
  '5v5-small': [
    { id: 'g',  label: 'MV', fullName: 'Målvakt',        x: 50, y: 96, isGoalie: true  },
    { id: 'ld', label: 'LB', fullName: 'Venstre back',   x: 30, y: 78, isGoalie: false },
    { id: 'rd', label: 'HB', fullName: 'Høyre back',     x: 70, y: 78, isGoalie: false },
    { id: 'c',  label: 'C',  fullName: 'Senter',         x: 50, y: 60, isGoalie: false },
    { id: 'lw', label: 'LV', fullName: 'Venstre ving',   x: 14, y: 63, isGoalie: false },
    { id: 'rw', label: 'HV', fullName: 'Høyre ving',     x: 86, y: 63, isGoalie: false },
  ],
  // U13+: MV + 2-1-2 formasjon
  '5v5-full': [
    { id: 'g',  label: 'MV', fullName: 'Målvakt',        x: 50, y: 96, isGoalie: true  },
    { id: 'ld', label: 'LB', fullName: 'Venstre back',   x: 30, y: 78, isGoalie: false },
    { id: 'rd', label: 'HB', fullName: 'Høyre back',     x: 70, y: 78, isGoalie: false },
    { id: 'c',  label: 'C',  fullName: 'Senter',         x: 50, y: 60, isGoalie: false },
    { id: 'lw', label: 'LV', fullName: 'Venstre ving',   x: 14, y: 63, isGoalie: false },
    { id: 'rw', label: 'HV', fullName: 'Høyre ving',     x: 86, y: 63, isGoalie: false },
  ],
};

// ─── Hjelpefunksjoner ─────────────────────────────────────────────────────────

/** Utleder hockey-format fra match.formation. Faller tilbake på playersOnField. */
export function resolveHockeyFormat(
  formation: string | null,
  playersOnField: number,
): HockeyFormat {
  if (formation && formation in RINK_SPECS) return formation as HockeyFormat;
  // Bakoverkompatibel fallback: 4 spillere → 5v5-full, 6 spillere → 5v5-full
  return playersOnField <= 4 ? '3v3-small' : '5v5-full';
}

/** Standard omgangslengde i sekunder per format (NIHF-anbefaling). */
export const FORMAT_DEFAULTS: Record<HockeyFormat, {
  periodLengthSeconds: number;
  periodCount: number;
}> = {
  '3v3-small':   { periodLengthSeconds: 8 * 60,  periodCount: 3 },
  '3v3-quarter': { periodLengthSeconds: 10 * 60, periodCount: 2 },
  '5v5-small':   { periodLengthSeconds: 12 * 60, periodCount: 3 },
  '5v5-full':    { periodLengthSeconds: 15 * 60, periodCount: 3 },
};
