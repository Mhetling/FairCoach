import { useState } from "react";
import { useParams } from "react-router-dom";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Legend,
} from "recharts";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { ProGate } from "@/components/ProGate";
import { useTeam } from "@/hooks/useTeams";
import { useSeasonStats, type PlayerSeasonStat } from "@/hooks/useSeasonStats";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMin(seconds: number): string {
  return `${Math.floor(seconds / 60)}m`;
}

function fmtDate(iso: string): string {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short" }).format(new Date(iso));
}

// Distinct colours for the trend chart lines (up to 8 players)
const LINE_COLORS = [
  "#2563eb", "#dc2626", "#16a34a", "#d97706",
  "#7c3aed", "#0891b2", "#be185d", "#374151",
];

// ─── Team record card ─────────────────────────────────────────────────────────

function TeamRecordCard({ wins, losses, draws, goalsFor, goalsAgainst }: {
  wins: number; losses: number; draws: number; goalsFor: number; goalsAgainst: number;
}) {
  const total = wins + losses + draws;
  const wPct = total > 0 ? (wins / total) * 100 : 0;
  const dPct = total > 0 ? (draws / total) * 100 : 0;
  const lPct = total > 0 ? (losses / total) * 100 : 0;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Lagform</p>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-green-700">{wins}</p>
            <p className="text-xs text-ink-muted">V</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-ink-muted">{draws}</p>
            <p className="text-xs text-ink-muted">U</p>
          </div>
          <div className="text-center">
            <p className="font-display text-2xl font-bold text-red-600">{losses}</p>
            <p className="text-xs text-ink-muted">T</p>
          </div>
          <div className="flex-1" />
          <div className="text-right">
            <p className="font-display text-xl font-bold tabular-nums">{goalsFor}–{goalsAgainst}</p>
            <p className="text-xs text-ink-muted">Mål</p>
          </div>
        </div>
        {total > 0 && (
          <div className="flex h-2 rounded-full overflow-hidden gap-px">
            <div className="bg-green-500 rounded-l-full transition-all" style={{ width: `${wPct}%` }} />
            <div className="bg-ink/20 transition-all" style={{ width: `${dPct}%` }} />
            <div className="bg-red-400 rounded-r-full transition-all" style={{ width: `${lPct}%` }} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Player stats table ───────────────────────────────────────────────────────

type SortKey = "name" | "matchesPlayed" | "totalPlaySeconds" | "goals" | "avgFairnessPct";

function PlayerStatsTable({ players }: { players: PlayerSeasonStat[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("totalPlaySeconds");
  const [sortAsc, setSortAsc] = useState(false);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(false);
    }
  }

  const sorted = [...players].sort((a, b) => {
    const dir = sortAsc ? 1 : -1;
    if (sortKey === "name") return dir * a.name.localeCompare(b.name, "nb");
    return dir * (a[sortKey] - b[sortKey]);
  });

  function ColHeader({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <th
        className={cn("py-2 px-2 text-right text-xs font-semibold cursor-pointer select-none", active ? "text-ink" : "text-ink-muted")}
        onClick={() => toggleSort(k)}
      >
        {label}{active ? (sortAsc ? " ↑" : " ↓") : ""}
      </th>
    );
  }

  function fairnessColor(pct: number): string {
    if (pct > 110) return "text-blue-600";
    if (pct >= 90) return "text-green-700";
    if (pct >= 60) return "text-amber-600";
    return "text-red-600";
  }

  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted px-4 pt-4 pb-2">Spillerstatistikk</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-ink/10">
              <th className="py-2 px-4 text-left text-xs font-semibold text-ink-muted cursor-pointer select-none"
                onClick={() => toggleSort("name")}>
                Spiller{sortKey === "name" ? (sortAsc ? " ↑" : " ↓") : ""}
              </th>
              <ColHeader k="matchesPlayed" label="Kamper" />
              <ColHeader k="totalPlaySeconds" label="Min totalt" />
              <ColHeader k="goals" label="Mål" />
              <ColHeader k="avgFairnessPct" label="FP %" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr key={p.playerId} className="border-b border-ink/6 last:border-0">
                <td className="py-2.5 px-4 font-medium text-ink">
                  {p.jerseyNumber != null && (
                    <span className="text-ink-muted text-xs mr-1">#{p.jerseyNumber}</span>
                  )}
                  {p.name.split(" ")[0]}
                </td>
                <td className="py-2.5 px-2 text-right tabular-nums text-ink-muted">{p.matchesPlayed}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{fmtMin(p.totalPlaySeconds)}</td>
                <td className="py-2.5 px-2 text-right tabular-nums">{p.goals}</td>
                <td className={cn("py-2.5 px-4 text-right tabular-nums font-medium", fairnessColor(p.avgFairnessPct))}>
                  {p.avgFairnessPct}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

// ─── Fairness trend chart ─────────────────────────────────────────────────────

function FairnessTrendChart({ players }: { players: PlayerSeasonStat[] }) {
  const top = players.slice(0, 8);

  if (top.length === 0 || top[0].fairnessByMatch.length < 2) {
    return (
      <Card>
        <CardContent className="p-4">
          <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-2">Fairness-trend</p>
          <p className="text-sm text-ink-muted">Trengs minst 2 kamper for å vise trend.</p>
        </CardContent>
      </Card>
    );
  }

  // Build chart data: one entry per match (x-axis)
  const matchDates = top[0].fairnessByMatch.slice(-10).map((m) => ({
    matchId: m.matchId,
    label: fmtDate(m.matchDate),
  }));

  const chartData = matchDates.map(({ matchId, label }) => {
    const entry: Record<string, string | number> = { label };
    for (const p of top) {
      const m = p.fairnessByMatch.find((fm) => fm.matchId === matchId);
      if (m) entry[p.name.split(" ")[0]] = m.fairnessPct;
    }
    return entry;
  });

  return (
    <Card>
      <CardContent className="p-4">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted mb-4">Fairness-trend (siste {matchDates.length} kamper)</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#00000010" />
            <XAxis dataKey="label" tick={{ fontSize: 10 }} />
            <YAxis domain={[0, 150]} tick={{ fontSize: 10 }} unit="%" />
            <Tooltip formatter={(v) => (v != null ? `${v}%` : "")} />
            <ReferenceLine y={100} stroke="#00000030" strokeDasharray="4 4" />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
            {top.map((p, i) => (
              <Line
                key={p.playerId}
                type="monotone"
                dataKey={p.name.split(" ")[0]}
                stroke={LINE_COLORS[i % LINE_COLORS.length]}
                dot={false}
                strokeWidth={2}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

// ─── Goalie rotation ──────────────────────────────────────────────────────────

function GoalieRotation({ players }: { players: PlayerSeasonStat[] }) {
  const goalies = players.filter((p) => p.keeperMatchCount > 0);
  if (goalies.length === 0) return null;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <p className="text-xs font-bold uppercase tracking-widest text-ink-muted">Keeperrotasjon</p>
        <div className="flex flex-col gap-1.5">
          {goalies.map((p) => (
            <div key={p.playerId} className="flex items-center gap-3">
              <span className="flex-1 text-sm font-medium text-ink truncate">
                {p.jerseyNumber != null ? `#${p.jerseyNumber} ` : ""}{p.name.split(" ")[0]}
              </span>
              <span className="text-sm tabular-nums text-ink-muted">
                {p.keeperMatchCount} {p.keeperMatchCount === 1 ? "kamp" : "kamper"}
              </span>
              {p.lastKeeperMatchDate && (
                <span className="text-xs text-ink-muted">Sist: {fmtDate(p.lastKeeperMatchDate)}</span>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function SeasonStats() {
  const { teamId } = useParams<{ teamId: string }>();
  const { data: team } = useTeam(teamId);
  const { data: stats, isLoading } = useSeasonStats(teamId);

  return (
    <AppShell title={team ? `${team.name} — Statistikk` : "Sesongstatistikk"} showBack>
      <ProGate feature="season_stats" fullPage>
        {isLoading && <div className="text-ink-muted">Laster …</div>}

        {!isLoading && stats && stats.matchCount === 0 && (
          <Card>
            <CardContent className="flex flex-col items-center gap-2 py-10 text-center">
              <p className="font-display text-xl font-bold">Ingen avsluttede kamper</p>
              <p className="text-sm text-ink-muted">
                Sesongstatistikk vises etter at kamper er avsluttet.
              </p>
            </CardContent>
          </Card>
        )}

        {!isLoading && stats && stats.matchCount > 0 && (
          <div className="space-y-4">
            <TeamRecordCard {...stats.teamRecord} />
            <PlayerStatsTable players={stats.playerStats} />
            <FairnessTrendChart players={stats.playerStats} />
            <GoalieRotation players={stats.playerStats} />
          </div>
        )}
      </ProGate>
    </AppShell>
  );
}
