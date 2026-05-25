import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type HockeyLine, autoSplitLines, linePlayerIds } from "@/lib/hockeyLines";

export type LineSetupPlayer = {
  id: string;
  name: string;
  jerseyNumber: number | null;
};

export type SkaterPosition = { id: string; label: string };

const LINE_BG     = ["bg-blue-500",     "bg-green-500",     "bg-orange-400"    ];
const LINE_LIGHT  = ["bg-blue-50",      "bg-green-50",      "bg-orange-50"     ];
const LINE_BORDER = ["border-blue-200", "border-green-200", "border-orange-200"];
const LINE_RING   = ["ring-blue-400",   "ring-green-400",   "ring-orange-300"  ];
const LINE_TEXT   = ["text-blue-700",   "text-green-700",   "text-orange-700"  ];

interface Props {
  players: LineSetupPlayer[];
  skaterPositions: SkaterPosition[];
  initialLines: HockeyLine[];
  onSave: (lines: HockeyLine[]) => void;
  onClose: () => void;
}

function findSlot(playerId: string, lines: HockeyLine[]): { lineIdx: number; slotIdx: number } | null {
  for (let li = 0; li < lines.length; li++) {
    for (let si = 0; si < lines[li].slots.length; si++) {
      if (lines[li].slots[si].playerId === playerId) return { lineIdx: li, slotIdx: si };
    }
  }
  return null;
}

function deepCopyLines(lines: HockeyLine[]): HockeyLine[] {
  return lines.map(l => ({ ...l, slots: l.slots.map(s => ({ ...s })) }));
}

export function HockeyLineSetupDialog({ players, skaterPositions, initialLines, onSave, onClose }: Props) {
  const [lines, setLines] = useState<HockeyLine[]>(() =>
    initialLines.length > 0
      ? initialLines
      : autoSplitLines(skaterPositions, players.map(p => p.id), 2),
  );
  const [selected, setSelected] = useState<string | null>(null);

  const lineCount = lines.length;
  const assignedIds = new Set(lines.flatMap(l => l.slots.map(s => s.playerId).filter(Boolean)));
  const unassigned = players.filter(p => !assignedIds.has(p.id));

  function chipLabel(p: LineSetupPlayer) {
    return p.jerseyNumber != null ? `#${p.jerseyNumber} ${p.name.split(" ")[0]}` : p.name.split(" ")[0];
  }

  function tapPlayer(playerId: string) {
    if (selected === playerId) { setSelected(null); return; }
    if (selected === null)     { setSelected(playerId); return; }

    // Swap the two players' slot positions
    const aLoc = findSlot(selected, lines);
    const bLoc = findSlot(playerId, lines);
    setLines(prev => {
      const next = deepCopyLines(prev);
      if (aLoc) next[aLoc.lineIdx].slots[aLoc.slotIdx].playerId = playerId;
      if (bLoc) next[bLoc.lineIdx].slots[bLoc.slotIdx].playerId = selected;
      return next;
    });
    setSelected(null);
  }

  function tapSlot(lineIdx: number, slotIdx: number) {
    const slot = lines[lineIdx].slots[slotIdx];
    if (slot.playerId) {
      tapPlayer(slot.playerId);
      return;
    }
    if (selected === null) return;
    // Move selected player into this empty slot
    const srcLoc = findSlot(selected, lines);
    setLines(prev => {
      const next = deepCopyLines(prev);
      if (srcLoc) next[srcLoc.lineIdx].slots[srcLoc.slotIdx].playerId = null;
      next[lineIdx].slots[slotIdx].playerId = selected;
      return next;
    });
    setSelected(null);
  }

  function changeLineCount(n: number) {
    const allIds = lines.flatMap(l => linePlayerIds(l));
    const extra = players.filter(p => !allIds.includes(p.id)).map(p => p.id);
    setLines(autoSplitLines(skaterPositions, [...allIds, ...extra], n));
    setSelected(null);
  }

  function autoFill() {
    setLines(autoSplitLines(skaterPositions, players.map(p => p.id), lineCount));
    setSelected(null);
  }

  const selectedPlayer = selected ? players.find(p => p.id === selected) : null;

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
          {lines.map((line, li) => (
            <div key={line.id}
              className={cn("rounded-xl border p-3 space-y-2", LINE_LIGHT[li], LINE_BORDER[li])}>
              <div className="flex items-center justify-between">
                <span className={cn("text-sm font-semibold", LINE_TEXT[li])}>{line.name}</span>
                <span className="text-xs text-ink-muted">{linePlayerIds(line).length} spillere</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {line.slots.map((slot, si) => {
                  const player = players.find(p => p.id === slot.playerId);
                  const isSel = selected === slot.playerId;
                  return (
                    <button key={slot.positionId} type="button"
                      onClick={() => tapSlot(li, si)}
                      className={cn(
                        "flex flex-col items-start rounded-lg px-2.5 py-1.5 min-w-[3.5rem] transition-transform active:scale-95",
                        player
                          ? cn(
                              "text-white border-2",
                              LINE_BG[li],
                              isSel
                                ? "ring-2 ring-offset-1 ring-ink scale-105 border-transparent"
                                : cn("border-transparent", LINE_RING[li]),
                            )
                          : cn(
                              "border-2 border-dashed",
                              selected ? "border-ink/40 bg-white/70" : "border-ink/20 bg-white/30",
                            ),
                      )}>
                      <span className={cn(
                        "text-[10px] font-bold uppercase leading-none",
                        player ? "text-white/75" : "text-ink-muted",
                      )}>
                        {slot.positionLabel}
                      </span>
                      <span className={cn(
                        "text-sm font-medium leading-tight mt-0.5",
                        player ? "text-white" : "text-ink/25",
                      )}>
                        {player ? chipLabel(player) : "—"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Unassigned */}
          {unassigned.length > 0 && (
            <div className="rounded-xl border border-ink/15 p-3 space-y-2 bg-cream-dark">
              <span className="text-sm font-semibold text-ink-muted">Ikke tildelt</span>
              <div className="flex flex-wrap gap-2">
                {unassigned.map(p => (
                  <button key={p.id} type="button" onClick={() => tapPlayer(p.id)}
                    className={cn(
                      "rounded-full border px-3 py-1 text-sm font-medium transition-transform active:scale-95",
                      selected === p.id
                        ? "border-ink bg-ink text-cream ring-2 ring-ink ring-offset-1"
                        : "border-ink/20 bg-ink/5 text-ink",
                    )}>
                    {chipLabel(p)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-xs text-ink-muted">
          {selectedPlayer
            ? `${chipLabel(selectedPlayer)} valgt — trykk en posisjon for å flytte.`
            : "Trykk en spiller for å velge, deretter en posisjon for å flytte."}
        </p>

        <div className="flex gap-2 pt-1">
          <Button variant="ghost" className="flex-1" onClick={onClose}>Avbryt</Button>
          <Button variant="accent" className="flex-1" onClick={() => onSave(lines)}>Lagre</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
