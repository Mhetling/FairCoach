import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type HockeyLine, autoSplitLines } from "@/lib/hockeyLines";

export type LineSetupPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

const LINE_RING   = ["ring-blue-500",   "ring-green-500",   "ring-orange-400"  ];
const LINE_BG     = ["bg-blue-500",     "bg-green-500",     "bg-orange-400"    ];
const LINE_LIGHT  = ["bg-blue-50",      "bg-green-50",      "bg-orange-50"     ];
const LINE_BORDER = ["border-blue-200", "border-green-200", "border-orange-200"];
const LINE_TEXT   = ["text-blue-700",   "text-green-700",   "text-orange-700"  ];

interface Props {
  players: LineSetupPlayer[];
  initialLines: HockeyLine[];
  onSave: (lines: HockeyLine[]) => void;
  onClose: () => void;
}

export function HockeyLineSetupDialog({ players, initialLines, onSave, onClose }: Props) {
  const [lines, setLines] = useState<HockeyLine[]>(() =>
    initialLines.length > 0 ? initialLines : autoSplitLines(players.map(p => p.id), 2),
  );

  const lineCount = lines.length;

  function getLineIdx(playerId: string): number {
    return lines.findIndex(l => l.playerIds.includes(playerId));
  }

  function cyclePlayer(playerId: string) {
    const cur = getLineIdx(playerId);
    const next = (cur + 1) % lineCount;
    setLines(prev => prev.map((l, i) => ({
      ...l,
      playerIds: i === next
        ? [...l.playerIds.filter(id => id !== playerId), playerId]
        : l.playerIds.filter(id => id !== playerId),
    })));
  }

  function changeLineCount(n: number) {
    const allIds = lines.flatMap(l => l.playerIds);
    // Add unassigned players too
    const assignedSet = new Set(allIds);
    const unassigned = players.filter(p => !assignedSet.has(p.id)).map(p => p.id);
    setLines(autoSplitLines([...allIds, ...unassigned], n));
  }

  function autoFill() {
    setLines(autoSplitLines(players.map(p => p.id), lineCount));
  }

  const assignedIds = new Set(lines.flatMap(l => l.playerIds));
  const unassignedPlayers = players.filter(p => !assignedIds.has(p.id));

  function chipLabel(p: LineSetupPlayer) {
    return p.jerseyNumber != null ? `#${p.jerseyNumber} ${p.name.split(" ")[0]}` : p.name.split(" ")[0];
  }

  return (
    <Dialog open onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rekker</DialogTitle>
        </DialogHeader>

        {/* Line count + auto-fill */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-ink-muted">Antall rekker:</span>
          {[2, 3].map(n => (
            <button key={n} type="button" onClick={() => changeLineCount(n)}
              className={cn(
                "w-9 h-9 rounded-full border text-sm font-bold transition-colors",
                lineCount === n ? "border-ink bg-ink text-cream" : "border-ink/20 bg-cream-dark text-ink",
              )}>
              {n}
            </button>
          ))}
          <button type="button" onClick={autoFill}
            className="ml-auto text-xs font-medium text-ink-muted underline underline-offset-2">
            Autofyll
          </button>
        </div>

        {/* Line buckets */}
        <div className="space-y-3">
          {lines.map((line, li) => {
            const linePlayers = players.filter(p => line.playerIds.includes(p.id));
            return (
              <div key={line.id}
                className={cn("rounded-xl border p-3 space-y-2", LINE_LIGHT[li], LINE_BORDER[li])}>
                <div className="flex items-center justify-between">
                  <span className={cn("text-sm font-semibold", LINE_TEXT[li])}>{line.name}</span>
                  <span className="text-xs text-ink-muted">{linePlayers.length} spillere</span>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[2rem]">
                  {linePlayers.map(p => (
                    <button key={p.id} type="button" onClick={() => cyclePlayer(p.id)}
                      className={cn(
                        "rounded-full px-3 py-1 text-sm font-medium text-white ring-2 ring-offset-1 transition-transform active:scale-95",
                        LINE_BG[li], LINE_RING[li],
                      )}>
                      {chipLabel(p)}
                    </button>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Unassigned */}
          {unassignedPlayers.length > 0 && (
            <div className="rounded-xl border border-ink/15 p-3 space-y-2 bg-cream-dark">
              <span className="text-sm font-semibold text-ink-muted">Ikke tildelt</span>
              <div className="flex flex-wrap gap-2">
                {unassignedPlayers.map(p => (
                  <button key={p.id} type="button" onClick={() => cyclePlayer(p.id)}
                    className="rounded-full border border-ink/20 bg-ink/5 px-3 py-1 text-sm font-medium text-ink active:scale-95 transition-transform">
                    {chipLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-ink-muted">
          Trykk på en spiller for å flytte til neste rekke.
        </p>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={() => onSave(lines)}>Lagre</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
