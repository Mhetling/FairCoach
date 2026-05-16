import { useNavigate, useParams } from "react-router-dom";
import { Trash2 } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useTeam } from "@/hooks/useTeams";
import { useTeamMatches, useDeleteMatch } from "@/hooks/useMatches";
import { toast } from "@/components/ui/use-toast";
import type { Match, MatchStatus } from "@/types/database";

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(iso));
}

function fmtDuration(match: Match) {
  const min = match.period_length_seconds / 60;
  return `${match.players_on_field}er · ${match.period_count}×${min} min`;
}

const STATUS_LABEL: Record<MatchStatus, string> = {
  pending: "Ikke startet",
  live:    "Pågår",
  paused:  "Pause",
  finished: "Avsluttet",
};

const STATUS_COLOR: Record<MatchStatus, string> = {
  pending:  "bg-ink/10 text-ink-muted",
  live:     "bg-green-100 text-green-800",
  paused:   "bg-yellow-100 text-yellow-800",
  finished: "bg-ink/8 text-ink-muted",
};

function MatchCard({ match, onDelete }: { match: Match; onDelete: () => void }) {
  const navigate = useNavigate();

  function handleClick() {
    if (match.status === "finished") {
      navigate(`/matches/${match.id}/summary`);
    } else {
      navigate(`/matches/${match.id}`);
    }
  }

  const hasScore = match.score_home != null && match.score_away != null;

  return (
    <Card className="transition-opacity">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className="flex-1 min-w-0 cursor-pointer active:opacity-80"
          onClick={handleClick}
        >
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-semibold text-ink truncate">
              {match.opponent ?? "Ukjent motstander"}
            </span>
            {hasScore && (
              <span className="shrink-0 font-display font-bold text-ink tabular-nums">
                {match.score_home}–{match.score_away}
              </span>
            )}
          </div>
          <div className="text-xs text-ink-muted">
            {fmtDate(match.created_at)} · {fmtDuration(match)}
          </div>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium",
            STATUS_COLOR[match.status],
          )}
        >
          {STATUS_LABEL[match.status]}
        </span>
        <button
          type="button"
          aria-label="Slett kamp"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          className="shrink-0 rounded p-1 text-ink-muted hover:text-danger transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </CardContent>
    </Card>
  );
}

export function MatchHistory() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: team } = useTeam(teamId);
  const { data: matches, isLoading } = useTeamMatches(teamId);
  const deleteMatch = useDeleteMatch();

  async function handleDelete(match: Match) {
    if (!confirm(`Slette kamp mot "${match.opponent ?? "Ukjent motstander"}"?`)) return;
    try {
      await deleteMatch.mutateAsync({ id: match.id, team_id: match.team_id });
      toast({ title: "Kamp slettet", variant: "success" });
    } catch (err) {
      toast({
        title: "Kunne ikke slette kamp",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "error",
      });
    }
  }

  return (
    <AppShell title={team ? `${team.name} — Kamper` : "Kamphistorikk"} showBack>
      {isLoading && <div className="text-ink-muted">Laster …</div>}

      {!isLoading && matches?.length === 0 && (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
            <p className="font-display text-xl font-bold">Ingen kamper ennå</p>
            <p className="text-sm text-ink-muted">
              Start en kamp fra lagsiden for å se historikk her.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col gap-2">
        {matches?.map((m) => (
          <MatchCard key={m.id} match={m} onDelete={() => handleDelete(m)} />
        ))}
      </div>
    </AppShell>
  );
}
