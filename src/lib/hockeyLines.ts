export type HockeyLine = {
  id: string;
  name: string;
  playerIds: string[];
};

export function lsLinesKey(matchId: string): string {
  return `faircoach_lines_${matchId}`;
}

export function loadHockeyLines(matchId: string): HockeyLine[] | null {
  try {
    const raw = localStorage.getItem(lsLinesKey(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as HockeyLine[]) : null;
  } catch {
    return null;
  }
}

export function saveHockeyLines(matchId: string, lines: HockeyLine[]): void {
  localStorage.setItem(lsLinesKey(matchId), JSON.stringify(lines));
}

export function autoSplitLines(playerIds: string[], lineCount: number): HockeyLine[] {
  return Array.from({ length: lineCount }, (_, i) => ({
    id: `line-${i + 1}`,
    name: `Rekke ${i + 1}`,
    playerIds: playerIds.filter((_, idx) => idx % lineCount === i),
  }));
}
