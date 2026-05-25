export type HockeyLineSlot = {
  positionId: string;    // matches RinkPosition.id, e.g. 'ld', 'rd', 'c', 'lw', 'rw'
  positionLabel: string; // e.g. 'LB', 'HB', 'C', 'LV', 'HV'
  playerId: string | null;
};

export type HockeyLine = {
  id: string;
  name: string;
  slots: HockeyLineSlot[];
};

export function linePlayerIds(line: HockeyLine): string[] {
  return line.slots.map(s => s.playerId).filter((id): id is string => id !== null);
}

export function lsLinesKey(matchId: string): string {
  return `faircoach_lines_${matchId}`;
}

export function loadHockeyLines(matchId: string): HockeyLine[] | null {
  try {
    const raw = localStorage.getItem(lsLinesKey(matchId));
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Reject old format that had playerIds arrays instead of slots
    if (!Array.isArray(parsed) || !parsed[0]?.slots) return null;
    return parsed as HockeyLine[];
  } catch {
    return null;
  }
}

export function saveHockeyLines(matchId: string, lines: HockeyLine[]): void {
  localStorage.setItem(lsLinesKey(matchId), JSON.stringify(lines));
}

export function autoSplitLines(
  skaterPositions: Array<{ id: string; label: string }>,
  playerIds: string[],
  lineCount: number,
): HockeyLine[] {
  // Round-robin distribution: player[0] → line1, player[1] → line2, ...
  const perLine: string[][] = Array.from({ length: lineCount }, () => []);
  playerIds.forEach((id, i) => perLine[i % lineCount].push(id));
  return Array.from({ length: lineCount }, (_, li) => ({
    id: `line-${li + 1}`,
    name: `Rekke ${li + 1}`,
    slots: skaterPositions.map((pos, pi) => ({
      positionId: pos.id,
      positionLabel: pos.label,
      playerId: perLine[li][pi] ?? null,
    })),
  }));
}
