import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { getDisplayError } from "@/lib/errors";
import { useTeams, useCreateTeam, useDeleteTeam } from "@/hooks/useTeams";
import type { SportId } from "@/types/database";

export function TeamList() {
  const { sportId } = useParams<{ sportId: SportId }>();
  const navigate = useNavigate();
  const { data: teams, isLoading } = useTeams(sportId);
  const create = useCreateTeam();
  const remove = useDeleteTeam();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");

  if (!sportId) return null;

  async function onCreate() {
    if (!name.trim()) return;
    try {
      const team = await create.mutateAsync({ name: name.trim(), sport_id: sportId! });
      toast({ title: "Lag opprettet", description: team.name, variant: "success" });
      setOpen(false);
      setName("");
      navigate(`/teams/${team.id}`);
    } catch (err) {
      toast({
        title: "Kunne ikke opprette lag",
        description: getDisplayError(err),
        variant: "error",
      });
    }
  }

  async function onDelete(id: string, label: string) {
    if (!confirm(`Slette laget «${label}»? Alle spillere og kamper på laget forsvinner.`)) return;
    try {
      await remove.mutateAsync(id);
      toast({ title: "Laget er slettet", variant: "success" });
    } catch (err) {
      toast({
        title: "Kunne ikke slette",
        description: getDisplayError(err),
        variant: "error",
      });
    }
  }

  return (
    <AppShell title="Dine lag" showBack>
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-ink-muted">
          {teams?.length ?? 0} lag i {sportId === "soccer" ? "fotball" : sportId}
        </p>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="accent" size="sm">
              <Plus className="h-4 w-4" /> Nytt lag
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Nytt lag</DialogTitle>
              <DialogDescription>Gi laget et navn — du kan endre det senere.</DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label htmlFor="team-name">Navn</Label>
              <Input
                id="team-name"
                placeholder="F.eks. Lyn G10 Rød"
                value={name}
                onChange={(e) => setName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setOpen(false)}>
                Avbryt
              </Button>
              <Button variant="primary" onClick={onCreate} disabled={create.isPending || !name.trim()}>
                {create.isPending ? "Lagrer …" : "Opprett"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <div className="text-ink-muted">Laster …</div>}

      {teams && teams.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="font-display text-2xl font-bold">Ingen lag ennå</p>
            <p className="text-sm text-ink-muted">Trykk «Nytt lag» for å komme i gang.</p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-3">
        {teams?.map((t) => (
          <Card key={t.id}>
            <CardContent className="flex items-center gap-3 p-4">
              <button
                onClick={() => navigate(`/teams/${t.id}`)}
                className="flex-1 text-left"
              >
                <div className="font-display text-lg font-bold text-ink">{t.name}</div>
                <div className="text-xs text-ink-muted">
                  Opprettet {new Date(t.created_at).toLocaleDateString("no-NO")}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Slett lag"
                onClick={() => onDelete(t.id, t.name)}
              >
                <Trash2 className="h-4 w-4 text-danger" />
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </AppShell>
  );
}
