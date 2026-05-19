import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";

const CONTACT_EMAIL = "hetling@gmail.com";

// ─── Data export ─────────────────────────────────────────────────────────────

async function fetchAllUserData() {
  const [teamsRes, matchesRes] = await Promise.all([
    supabase.from("teams").select("*"),
    supabase.from("matches").select("*"),
  ]);
  if (teamsRes.error) throw teamsRes.error;
  if (matchesRes.error) throw matchesRes.error;

  const teams = teamsRes.data ?? [];
  const matches = matchesRes.data ?? [];
  const teamIds = teams.map((t) => t.id);
  const matchIds = matches.map((m) => m.id);

  const [playersRes, matchPlayersRes, matchEventsRes] = await Promise.all([
    teamIds.length > 0
      ? supabase.from("players").select("*").in("team_id", teamIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length > 0
      ? supabase.from("match_players").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
    matchIds.length > 0
      ? supabase.from("match_events").select("*").in("match_id", matchIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (playersRes.error) throw playersRes.error;
  if (matchPlayersRes.error) throw matchPlayersRes.error;
  if (matchEventsRes.error) throw matchEventsRes.error;

  return {
    exported_at: new Date().toISOString(),
    teams,
    players: playersRes.data ?? [],
    matches,
    match_players: matchPlayersRes.data ?? [],
    match_events: matchEventsRes.data ?? [],
  };
}

function triggerJsonDownload(data: unknown, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Delete account dialog ────────────────────────────────────────────────────

function DeleteAccountDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [confirmation, setConfirmation] = useState("");
  const [isPending, setIsPending] = useState(false);

  async function onConfirm() {
    if (confirmation !== "SLETT") return;
    setIsPending(true);
    try {
      const { data: teams, error: teamsError } = await supabase.from("teams").select("id");
      if (teamsError) throw teamsError;

      if (teams && teams.length > 0) {
        const ids = teams.map((t) => t.id);
        const { error: deleteError } = await supabase.from("teams").delete().in("id", ids);
        if (deleteError) throw deleteError;
      }

      await signOut();
      navigate("/login", { replace: true });
    } catch {
      toast({
        title: "Kunne ikke slette konto",
        description: "Noe gikk galt. Prøv igjen, eller kontakt support.",
        variant: "error",
      });
      setIsPending(false);
    }
  }

  function handleOpenChange(next: boolean) {
    if (!next) {
      setConfirmation("");
      onClose();
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Slett hele kontoen og alle data</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <p className="text-sm text-ink/80">
            Dette sletter alle dine lag, spillere og kamper permanent. Handlingen kan
            ikke angres.
          </p>
          <div className="space-y-1">
            <label className="text-sm font-medium text-ink" htmlFor="confirm-delete">
              Skriv <span className="font-mono font-bold">SLETT</span> for å bekrefte
            </label>
            <Input
              id="confirm-delete"
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="SLETT"
              autoComplete="off"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end gap-2">
          <Button variant="ghost" onClick={onClose} disabled={isPending}>
            Avbryt
          </Button>
          <Button
            onClick={onConfirm}
            disabled={confirmation !== "SLETT" || isPending}
            className="bg-danger text-white hover:bg-danger/90"
          >
            {isPending ? "Sletter …" : "Slett alt permanent"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SettingsPage() {
  const [isExporting, setIsExporting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  async function onExport() {
    setIsExporting(true);
    try {
      const data = await fetchAllUserData();
      const date = new Date().toISOString().slice(0, 10);
      triggerJsonDownload(data, `faircoach-eksport-${date}.json`);
      toast({ title: "Eksport lastet ned", variant: "success" });
    } catch {
      toast({
        title: "Eksport feilet",
        description: "Noe gikk galt. Prøv igjen, eller kontakt support.",
        variant: "error",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <AppShell title="Innstillinger" showBack>
      <div className="mb-6">
        <p className="font-display text-3xl font-black leading-tight text-ink">Innstillinger</p>
      </div>

      <div className="space-y-8">

        {/* Data */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Dine data
          </h2>
          <div className="rounded-xl border border-ink/10 bg-cream-dark p-4 space-y-3">
            <div>
              <p className="font-medium text-sm text-ink">Eksporter alle data som JSON</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Laster ned alle lag, spillere, kamper og hendelser.
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={onExport} disabled={isExporting}>
              {isExporting ? "Eksporterer …" : "Last ned eksport"}
            </Button>
          </div>
        </section>

        {/* Delete */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Slett data
          </h2>
          <div className="rounded-xl border border-ink/10 bg-cream-dark p-4 space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-ink-muted">
                Slett enkeltspillere eller hele lag fra lagsidene.
              </p>
              <Link to="/" className="inline-block text-sm underline underline-offset-2 text-ink">
                Gå til laglisten
              </Link>
            </div>
          </div>
          <div className="rounded-xl border border-danger/20 bg-danger/5 p-4 space-y-3">
            <div>
              <p className="font-medium text-sm text-danger">Slett hele kontoen og alle data</p>
              <p className="text-xs text-ink-muted mt-0.5">
                Fjerner alle lag, spillere og kamper permanent.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-danger text-white hover:bg-danger/90"
              onClick={() => setDeleteDialogOpen(true)}
            >
              Slett konto og alle data
            </Button>
          </div>
        </section>

        {/* Privacy */}
        <section className="space-y-3">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
            Personvern
          </h2>
          <div className="rounded-xl border border-ink/10 bg-cream-dark p-4 space-y-2">
            <Link
              to="/privacy"
              className="block text-sm underline underline-offset-2 text-ink"
            >
              Les personvernerklæringen
            </Link>
            <p className="text-sm text-ink-muted">
              Spørsmål?{" "}
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="underline underline-offset-2 text-ink"
              >
                {CONTACT_EMAIL}
              </a>
            </p>
          </div>
        </section>

      </div>

      <DeleteAccountDialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
      />
    </AppShell>
  );
}
