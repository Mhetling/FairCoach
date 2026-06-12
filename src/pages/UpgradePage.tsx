import { Check } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@/lib/gates";
import type { Feature } from "@/types/database";

const PRO_FEATURES: Feature[] = [
  "match_history",
  "season_stats",
  "team_form",
  "goalie_rotation",
  "player_stats_export",
  "match_templates",
];

export function UpgradePage() {
  const navigate = useNavigate();

  return (
    <AppShell title="Oppgrader til Pro" showBack>
      <div className="space-y-6">
        <div className="rounded-2xl bg-ink p-6 text-cream text-center space-y-1">
          <p className="text-xs font-bold uppercase tracking-widest text-cream/60">FairCoach Pro</p>
          <p className="font-display text-4xl font-bold">Sesongverktøy</p>
          <p className="text-sm text-cream/70 mt-2">
            Følg spillerutviklingen over hele sesongen — ikke bare én kamp av gangen.
          </p>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Inkludert i Pro</p>
          {PRO_FEATURES.map((f) => (
            <div key={f} className="flex items-start gap-3 rounded-xl border border-ink/10 bg-cream-dark px-4 py-3">
              <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100">
                <Check className="h-3 w-3 text-green-700" />
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">{FEATURE_LABELS[f]}</p>
                <p className="text-xs text-ink-muted mt-0.5">{FEATURE_DESCRIPTIONS[f]}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-ink/10 bg-cream-dark p-6 text-center space-y-2">
          <p className="text-sm font-semibold text-ink">Betaling kommer snart</p>
          <p className="text-xs text-ink-muted">
            Pro-abonnement er under utvikling. Registrer deg for å bli varslet når det er klart.
          </p>
          <Button
            variant="accent"
            className="w-full mt-2"
            onClick={() => window.location.href = "mailto:hei@faircoach.no?subject=Pro-tilgang"}
          >
            Kontakt oss for tidlig tilgang
          </Button>
        </div>

        <Button variant="ghost" className="w-full" onClick={() => navigate(-1)}>
          Tilbake
        </Button>
      </div>
    </AppShell>
  );
}
