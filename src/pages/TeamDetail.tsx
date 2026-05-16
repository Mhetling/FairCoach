import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2, Play, History, Pencil, Settings } from "lucide-react";
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
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { useTeam, useUpdateTeam, useDeleteTeam } from "@/hooks/useTeams";
import { useCreatePlayer, useDeletePlayer, usePlayers, useUpdatePlayer } from "@/hooks/usePlayers";
import { useTeamMatches } from "@/hooks/useMatches";
import { getSportConfig } from "@/lib/sportConfig";
import type { SportPosition } from "@/lib/sportConfig";
import { cn } from "@/lib/utils";
import type { Player, SportId } from "@/types/database";

// ─── Player create / edit dialog ─────────────────────────────────────────────

function PlayerDialog({
  open, onClose, teamId, player, positions,
}: {
  open: boolean; onClose: () => void; teamId: string; player: Player | null; positions: SportPosition[];
}) {
  const isEdit = player !== null;
  const create = useCreatePlayer();
  const update = useUpdatePlayer();

  const [name, setName] = useState(player?.name ?? "");
  const [jersey, setJersey] = useState(player?.jersey_number?.toString() ?? "");
  const [position, setPosition] = useState<string | null>(player?.position ?? null);

  function resetTo(p: Player | null) {
    setName(p?.name ?? "");
    setJersey(p?.jersey_number?.toString() ?? "");
    setPosition(p?.position ?? null);
  }

  function handleOpenChange(next: boolean) { if (!next) onClose(); }

  if (open && player?.id !== undefined) {
    if (name !== player.name && name === "") resetTo(player);
  }

  async function onSubmit() {
    if (!name.trim()) return;
    try {
      if (isEdit) {
        await update.mutateAsync({ id: player.id, team_id: teamId, name: name.trim(), jersey_number: jersey ? Number(jersey) : null, position: position || null });
        toast({ title: "Spiller oppdatert", variant: "success" });
      } else {
        await create.mutateAsync({ team_id: teamId, name: name.trim(), jersey_number: jersey ? Number(jersey) : null, position: position || null });
        toast({ title: "Spiller lagt til", variant: "success" });
        resetTo(null);
      }
      onClose();
    } catch (err) {
      toast({ title: isEdit ? "Kunne ikke oppdatere" : "Kunne ikke lagre", description: err instanceof Error ? err.message : "Ukjent feil", variant: "error" });
    }
  }

  const isPending = create.isPending || update.isPending;

  // All position options including "none"
  const allOptions = [
    ...positions,
    { id: "", label: "Ingen" },
  ];
  const cols = allOptions.length <= 3 ? "grid-cols-3"
    : allOptions.length === 4 ? "grid-cols-4"
    : "grid-cols-3";

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Rediger spiller" : "Ny spiller"}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="player-name">Navn</Label>
            <Input id="player-name" autoFocus placeholder="Fornavn etternavn" value={name}
              onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === "Enter" && onSubmit()} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="player-jersey">Draktnummer</Label>
            <Input id="player-jersey" inputMode="numeric" pattern="[0-9]*" placeholder="Valgfritt"
              value={jersey} onChange={(e) => setJersey(e.target.value.replace(/[^0-9]/g, ""))} />
          </div>
          <div className="space-y-1">
            <Label>Posisjon</Label>
            <div className={cn("grid gap-1", cols)}>
              {allOptions.map((p) => {
                const active = p.id === "" ? !position : position === p.id;
                return (
                  <button key={p.id || "none"} type="button"
                    onClick={() => setPosition(p.id || null)}
                    className={cn("h-10 rounded-md border text-sm transition-colors",
                      active
                        ? "border-ink bg-ink text-cream"
                        : p.id === ""
                          ? "border-ink/10 bg-transparent text-ink-muted hover:bg-ink/5"
                          : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5")}>
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={onSubmit} disabled={isPending || !name.trim()}>
            {isPending ? "Lagrer …" : isEdit ? "Lagre endringer" : "Legg til"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Team settings dialog ─────────────────────────────────────────────────────

function OptionBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick}
      className={cn("h-9 rounded-md border text-sm font-medium transition-colors",
        active ? "border-ink bg-ink text-cream" : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5")}>
      {children}
    </button>
  );
}

function TeamSettingsDialog({ open, onClose, teamId }: { open: boolean; onClose: () => void; teamId: string }) {
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const update = useUpdateTeam();
  const remove = useDeleteTeam();

  const config = team ? getSportConfig(team.sport_id as SportId) : null;

  const [name, setName] = useState("");
  const [players, setPlayers] = useState<number | null>(null);
  const [periodSecs, setPeriodSecs] = useState<number | null>(null);
  const [periodCount, setPeriodCount] = useState<number | null>(null);
  const initialized = useRef(false);

  useEffect(() => {
    if (open && team && !initialized.current) {
      initialized.current = true;
      setName(team.name);
      setPlayers(team.default_players_on_field);
      setPeriodSecs(team.default_period_length_seconds);
      setPeriodCount(team.default_period_count);
    }
    if (!open) initialized.current = false;
  }, [open, team]);

  async function onSave() {
    if (!name.trim()) return;
    try {
      await update.mutateAsync({
        id: teamId,
        name: name.trim(),
        default_players_on_field: players,
        default_period_length_seconds: periodSecs,
        default_period_count: periodCount,
      });
      toast({ title: "Lagret", variant: "success" });
      onClose();
    } catch (err) {
      toast({ title: "Kunne ikke lagre", description: err instanceof Error ? err.message : "Ukjent feil", variant: "error" });
    }
  }

  async function onDelete() {
    if (!confirm(`Slette laget «${team?.name}»?\n\nAlle spillere og kamper forsvinner permanent.`)) return;
    try {
      await remove.mutateAsync(teamId);
      toast({ title: "Laget er slettet", variant: "success" });
      navigate("/");
    } catch (err) {
      toast({ title: "Kunne ikke slette", description: err instanceof Error ? err.message : "Ukjent feil", variant: "error" });
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Lagsinnstillinger</DialogTitle>
        </DialogHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1">
            <Label htmlFor="settings-name">Lagnavn</Label>
            <Input id="settings-name" value={name} onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && onSave()} />
          </div>

          {/* Default match format */}
          {config && (
            <div className="space-y-3 rounded-lg border border-ink/10 bg-cream-dark p-3">
              <div>
                <p className="text-sm font-medium text-ink">Standard kampoppsett</p>
                <p className="text-xs text-ink-muted">Forhåndsvelg format når du starter ny kamp</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Spillere på banen</Label>
                <div className={cn("grid gap-1.5",
                  config.playersOnFieldOptions.length <= 4 ? "grid-cols-4" : "grid-cols-5")}>
                  {config.playersOnFieldOptions.map((n) => (
                    <OptionBtn key={n} active={players === n} onClick={() => setPlayers(players === n ? null : n)}>
                      {n}er
                    </OptionBtn>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Omgangslengde</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  {config.periodLengthOptions.filter((o) => o.seconds > 0).map((o) => (
                    <OptionBtn key={o.seconds} active={periodSecs === o.seconds}
                      onClick={() => setPeriodSecs(periodSecs === o.seconds ? null : o.seconds)}>
                      {o.label}
                    </OptionBtn>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs">Antall omganger</Label>
                <div className="grid grid-cols-2 gap-1.5">
                  {config.periodCountOptions.map((n) => (
                    <OptionBtn key={n} active={periodCount === n}
                      onClick={() => setPeriodCount(periodCount === n ? null : n)}>
                      {n === 1 ? "1 omgang" : `${n} omganger`}
                    </OptionBtn>
                  ))}
                </div>
              </div>

              {(players || periodSecs || periodCount) && (
                <button type="button" onClick={() => { setPlayers(null); setPeriodSecs(null); setPeriodCount(null); }}
                  className="text-xs text-ink-muted underline">
                  Fjern standard
                </button>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose}>Avbryt</Button>
          <Button variant="primary" onClick={onSave} disabled={update.isPending || !name.trim()}>
            {update.isPending ? "Lagrer …" : "Lagre"}
          </Button>
        </div>

        {/* Danger zone */}
        <div className="mt-2 border-t border-ink/10 pt-4">
          <button type="button" onClick={onDelete}
            className="w-full rounded-md border border-danger/30 bg-danger/5 py-2.5 text-sm font-medium text-danger transition-colors hover:bg-danger/10">
            Slett laget
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function TeamDetail() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team, isLoading: loadingTeam } = useTeam(teamId);
  const { data: players, isLoading: loadingPlayers } = usePlayers(teamId);
  const { data: matches } = useTeamMatches(teamId);
  const remove = useDeletePlayer();

  const sportPositions = team ? getSportConfig(team.sport_id as SportId).positions : [];

  const activeMatch = matches?.find((m) => m.status === "live" || m.status === "paused");

  const [playerDialogOpen, setPlayerDialogOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<Player | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);

  function openCreate() { setEditingPlayer(null); setPlayerDialogOpen(true); }
  function openEdit(p: Player) { setEditingPlayer(p); setPlayerDialogOpen(true); }
  function closePlayerDialog() { setPlayerDialogOpen(false); setEditingPlayer(null); }

  async function onDeletePlayer(id: string, label: string) {
    if (!teamId) return;
    if (!confirm(`Slette ${label} fra laget?`)) return;
    try {
      await remove.mutateAsync({ id, team_id: teamId });
    } catch (err) {
      toast({ title: "Kunne ikke slette", description: err instanceof Error ? err.message : "Ukjent feil", variant: "error" });
    }
  }

  return (
    <AppShell
      title={team?.name ?? "Lag"}
      showBack
      rightSlot={
        teamId ? (
          <Button variant="ghost" size="icon" onClick={() => setSettingsOpen(true)} aria-label="Innstillinger">
            <Settings className="h-5 w-5" />
          </Button>
        ) : undefined
      }
    >
      {loadingTeam && <div className="text-ink-muted">Laster …</div>}

      {team && (
        <>
          {activeMatch && (
            <Card className="mb-4 border-green-400 bg-green-50">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-green-900">
                    {activeMatch.status === "paused" ? "Kamp i pause" : "Kamp pågår"}
                  </p>
                  <p className="text-sm text-green-700 truncate">
                    {activeMatch.opponent ?? "Ukjent motstander"} · {activeMatch.players_on_field}er
                  </p>
                </div>
                <Button variant="accent" size="sm" onClick={() => navigate(`/matches/${activeMatch.id}`)}>
                  Gjenoppta
                </Button>
              </CardContent>
            </Card>
          )}

          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <div className="text-sm text-ink-muted">Spillerstall</div>
              <div className="font-display text-2xl font-bold">{players?.length ?? 0} spillere</div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => navigate(`/teams/${team.id}/matches`)}>
                <History className="h-4 w-4" /> Historikk
              </Button>
              <Button variant="accent" onClick={() => navigate(`/teams/${team.id}/matches/new`)}
                disabled={(players?.length ?? 0) < 1}>
                <Play className="h-4 w-4" /> Ny kamp
              </Button>
            </div>
          </div>

          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm text-ink-muted">Stall</p>
            <Button variant="primary" size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" /> Legg til
            </Button>
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
              const pos = sportPositions.find((s) => s.id === p.position)?.label ?? "—";
              return (
                <Card key={p.id}>
                  <CardContent className="flex items-center gap-3 p-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ink text-cream font-display font-bold">
                      {p.jersey_number ?? "—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-ink truncate">{p.name}</div>
                      <div className="text-xs text-ink-muted">{pos}</div>
                    </div>
                    <Button variant="ghost" size="icon" aria-label={`Rediger ${p.name}`} onClick={() => openEdit(p)}>
                      <Pencil className="h-4 w-4 text-ink-muted" />
                    </Button>
                    <Button variant="ghost" size="icon" aria-label={`Slett ${p.name}`} onClick={() => onDeletePlayer(p.id, p.name)}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}

      {teamId && (
        <>
          <PlayerDialog open={playerDialogOpen} onClose={closePlayerDialog} teamId={teamId} player={editingPlayer} positions={sportPositions} />
          <TeamSettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} teamId={teamId} />
        </>
      )}
    </AppShell>
  );
}
