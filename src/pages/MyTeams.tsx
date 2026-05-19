import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Plus, ChevronRight, Settings } from "lucide-react";
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
import { getDisplayError } from "@/lib/errors";
import { useAllTeams, useCreateTeam } from "@/hooks/useTeams";
import { SPORT_CONFIGS, ALL_SPORTS } from "@/lib/sportConfig";
import { cn } from "@/lib/utils";
import type { SportId } from "@/types/database";


export function MyTeams() {
  const navigate = useNavigate();
  const { data: teams, isLoading } = useAllTeams();
  const create = useCreateTeam();

  const [open, setOpen] = useState(false);
  const [selectedSport, setSelectedSport] = useState<SportId | null>(null);
  const [name, setName] = useState("");

  function openDialog() {
    setSelectedSport(null);
    setName("");
    setOpen(true);
  }

  async function onCreate() {
    if (!name.trim() || !selectedSport) return;
    try {
      const team = await create.mutateAsync({ name: name.trim(), sport_id: selectedSport });
      toast({ title: "Lag opprettet", variant: "success" });
      setOpen(false);
      navigate(`/teams/${team.id}`);
    } catch (err) {
      toast({
        title: "Kunne ikke opprette lag",
        description: getDisplayError(err),
        variant: "error",
      });
    }
  }

  return (
    <AppShell
      title="Mine lag"
      rightSlot={
        <Button variant="ghost" size="icon" onClick={() => navigate("/settings")} aria-label="Innstillinger">
          <Settings className="h-5 w-5" />
        </Button>
      }
    >
      <div className="mb-6">
        <p className="font-display text-3xl font-black leading-tight text-ink">
          Mine lag
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Administrer spilletid og bytter på tvers av idretter.
        </p>
      </div>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {teams?.length ?? 0} {(teams?.length ?? 0) === 1 ? "lag" : "lag"}
        </p>
        <Button variant="accent" size="sm" onClick={openDialog}>
          <Plus className="h-4 w-4" /> Nytt lag
        </Button>
      </div>

      {isLoading && <div className="text-ink-muted">Laster …</div>}

      {!isLoading && teams?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
            <div className="text-5xl">🏅</div>
            <p className="font-display text-2xl font-bold">Ingen lag ennå</p>
            <p className="text-sm text-ink-muted">
              Legg til ditt første lag for å komme i gang.
            </p>
            <Button variant="accent" onClick={openDialog}>
              <Plus className="h-4 w-4" /> Nytt lag
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {teams?.map((team) => (
          <Card key={team.id}>
            <CardContent className="flex items-center gap-2 p-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-ink/5 text-2xl">
                {SPORT_CONFIGS[team.sport_id]?.icon ?? "🎯"}
              </div>
              <button
                onClick={() => navigate(`/teams/${team.id}`)}
                className="flex-1 min-w-0 text-left"
              >
                <div className="font-display text-lg font-bold text-ink truncate">{team.name}</div>
                <div className="text-xs text-ink-muted">
                  {SPORT_CONFIGS[team.sport_id]?.name ?? team.sport_id}
                </div>
              </button>
              <ChevronRight className="h-4 w-4 shrink-0 text-ink/30" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create team dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) setOpen(false); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nytt lag</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Idrett</Label>
              <div className="grid grid-cols-2 gap-2">
                {ALL_SPORTS.map((s) => {
                  const chosen = selectedSport === s.id;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      disabled={!s.isActive}
                      onClick={() => setSelectedSport(s.id)}
                      className={cn(
                        "flex items-center gap-3 rounded-xl border p-3 text-left transition-colors",
                        !s.isActive && "cursor-not-allowed opacity-40",
                        s.isActive && chosen  && "border-ink bg-ink text-cream",
                        s.isActive && !chosen && "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
                      )}
                    >
                      <span className="text-xl">{s.icon}</span>
                      <div>
                        <div className="text-sm font-semibold">{s.name}</div>
                        {!s.isActive && <div className="text-xs">Kommer snart</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="space-y-1">
              <Label htmlFor="team-name">Navn på laget</Label>
              <Input
                id="team-name"
                placeholder="F.eks. Lyn G10 Rød"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && onCreate()}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-ink-muted leading-relaxed">
            Ved å opprette et lag bekrefter du at du som trener informerer foresatte om at
            barnets fornavn og kampdata lagres i appen. Les mer i{" "}
            <Link to="/privacy" className="underline underline-offset-2 hover:text-ink" onClick={() => setOpen(false)}>
              personvernerklæringen
            </Link>
            .
          </p>
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>Avbryt</Button>
            <Button
              variant="primary"
              onClick={onCreate}
              disabled={create.isPending || !name.trim() || !selectedSport}
            >
              {create.isPending ? "Lagrer …" : "Opprett"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
