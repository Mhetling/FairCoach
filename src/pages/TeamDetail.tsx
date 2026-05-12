import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Play } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useTeam } from "@/hooks/useTeams";
import { useCreatePlayer, useDeletePlayer, usePlayers } from "@/hooks/usePlayers";
import { cn } from "@/lib/utils";

const SOCCER_POSITIONS = [
  { id: "GK",  label: "Keeper" },
  { id: "DEF", label: "Back" },
  { id: "MID", label: "Midtbane" },
  { id: "FWD", label: "Angriper" },
];

export function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team, isLoading: loadingTeam } = useTeam(teamId);
  const { data: players, isLoading: loadingPlayers } = usePlayers(teamId);
  const create = useCreatePlayer();
  const remove = useDeletePlayer();

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [jersey, setJersey] = useState("");
  const [position, setPosition] = useState<string>("MID");

  async function onCreate() {
    if (!teamId || !name.trim()) return;
    try {
      await create.mutateAsync({
        team_id: teamId,
        name: name.trim(),
        jersey_number: jersey ? Number(jersey) : null,
        position,
      });
      toast({ title: "Spiller lagt til", variant: "success" });
      setName("");
      setJersey("");
      setPosition("MID");
      setOpen(false);
    } catch (err) {
      toast({
        title: "Kunne ikke lagre spiller",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "error",
      });
    }
  }

  async function onDelete(id: string, label: string) {
    if (!teamId) return;
    if (!confirm(`Slette ${label} fra laget?`)) return;
    try {
      await remove.mutateAsync({ id, team_id: teamId });
    } catch (err) {
      toast({
        title: "Kunne ikke slette",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "error",
      });
    }
  }

  return (
    <AppShell title={team?.name ?? "Lag"} showBack>
      {loadingTeam && <div className="text-ink-muted">Laster …</div>}

      {team && (
        <>
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm text-ink-muted">Spillerstall</div>
              <div className="font-display text-2xl font-bold">{players?.length ?? 0} spillere</div>
            </div>
            <Button
              variant="accent"
              onClick={() => navigate(`/teams/${team.id}/matches/new`)}
              disabled={(players?.length ?? 0) < 1}
            >
              <Play className="h-4 w-4" /> Ny kamp
            </Button>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-muted">Stall</p>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button variant="primary" size="sm">
                  <Plus className="h-4 w-4" /> Legg til
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Ny spiller</DialogTitle>
                </DialogHeader>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <Label htmlFor="player-name">Navn</Label>
                    <Input
                      id="player-name"
                      autoFocus
                      placeholder="Fornavn etternavn"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="player-jersey">Draktnummer</Label>
                    <Input
                      id="player-jersey"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      placeholder="Valgfritt"
                      value={jersey}
                      onChange={(e) => setJersey(e.target.value.replace(/[^0-9]/g, ""))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Posisjon</Label>
                    <div className="grid grid-cols-4 gap-1">
                      {SOCCER_POSITIONS.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setPosition(p.id)}
                          className={cn(
                            "h-10 rounded-md border text-sm",
                            position === p.id
                              ? "border-ink bg-ink text-cream"
                              : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
                          )}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="mt-4 flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setOpen(false)}>
                    Avbryt
                  </Button>
                  <Button variant="primary" onClick={onCreate} disabled={create.isPending || !name.trim()}>
                    {create.isPending ? "Lagrer …" : "Legg til"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {loadingPlayers && <div className="text-ink-muted">Laster …</div>}

          {players && players.length === 0 && (
            <Card>
              <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
                <p className="font-display text-xl font-bold">Stallen er tom</p>
                <p className="text-sm text-ink-muted">Legg til spillere før du starter en kamp.</p>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col gap-2">
            {players?.map((p) => {
              const pos = SOCCER_POSITIONS.find((s) => s.id === p.position)?.label ?? p.position ?? "—";
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream font-display font-bold">
                      {p.jersey_number ?? "—"}
                    </div>
                    <div className="flex-1">
                      <div className="font-medium text-ink">{p.name}</div>
                      <div className="text-xs text-ink-muted">{pos}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Slett ${p.name}`}
                      onClick={() => onDelete(p.id, p.name)}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </AppShell>
  );
}
