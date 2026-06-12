import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ZoneTime } from "@/types/database";

export type PlayerSeasonStat = {
  playerId: string;
  name: string;
  jerseyNumber: number | null;
  matchesPlayed: number;
  totalPlaySeconds: number;
  avgPlaySecondsPerMatch: number;
  goals: number;
  avgFairnessPct: number;
  keeperMatchCount: number;
  lastKeeperMatchDate: string | null;
  fairnessByMatch: { matchId: string; matchDate: string; fairnessPct: number }[];
};

export type TeamRecord = {
  wins: number;
  losses: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
};

export type SeasonStatsResult = {
  playerStats: PlayerSeasonStat[];
  teamRecord: TeamRecord;
  matchCount: number;
};

type FinishedMatch = {
  id: string;
  created_at: string;
  elapsed_seconds: number;
  players_on_field: number;
  score_home: number | null;
  score_away: number | null;
};

type MatchPlayerRow = {
  match_id: string;
  player_id: string;
  total_play_seconds: number;
  meta: { note?: string; freeNote?: string; zones?: ZoneTime[] } | null;
};

type GoalEventRow = {
  match_id: string;
  player_id: string | null;
  meta: Record<string, unknown> | null;
};

export function useSeasonStats(teamId: string | undefined) {
  return useQuery({
    enabled: !!teamId,
    staleTime: 5 * 60 * 1000,
    queryKey: ["season-stats", teamId],
    queryFn: async (): Promise<SeasonStatsResult | null> => {
      if (!teamId) return null;

      const [
        { data: matches, error: me },
        { data: players, error: pe },
      ] = await Promise.all([
        supabase
          .from("matches")
          .select("id, created_at, elapsed_seconds, players_on_field, score_home, score_away")
          .eq("team_id", teamId)
          .eq("status", "finished")
          .order("created_at", { ascending: true }),
        supabase
          .from("players")
          .select("id, name, jersey_number")
          .eq("team_id", teamId),
      ]);

      if (me) throw me;
      if (pe) throw pe;

      const finishedMatches = (matches ?? []) as FinishedMatch[];

      if (finishedMatches.length === 0) {
        return { playerStats: [], teamRecord: { wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 }, matchCount: 0 };
      }

      const matchIds = finishedMatches.map((m) => m.id);

      const [
        { data: matchPlayers, error: mpe },
        { data: goalEvents, error: ge },
      ] = await Promise.all([
        supabase
          .from("match_players")
          .select("match_id, player_id, total_play_seconds, meta")
          .in("match_id", matchIds),
        supabase
          .from("match_events")
          .select("match_id, player_id, meta")
          .in("match_id", matchIds)
          .eq("event_type", "goal"),
      ]);

      if (mpe) throw mpe;
      if (ge) throw ge;

      const mpRows = (matchPlayers ?? []) as MatchPlayerRow[];
      const goalRows = (goalEvents ?? []) as GoalEventRow[];

      // ── Team record ──────────────────────────────────────────────────────────
      const teamRecord: TeamRecord = finishedMatches.reduce(
        (acc, m) => {
          const h = m.score_home ?? 0;
          const a = m.score_away ?? 0;
          acc.goalsFor += h;
          acc.goalsAgainst += a;
          if (h > a) acc.wins++;
          else if (h < a) acc.losses++;
          else acc.draws++;
          return acc;
        },
        { wins: 0, losses: 0, draws: 0, goalsFor: 0, goalsAgainst: 0 },
      );

      // ── Per-match participant count ───────────────────────────────────────────
      const participantsPerMatch: Record<string, number> = {};
      for (const mp of mpRows) {
        participantsPerMatch[mp.match_id] = (participantsPerMatch[mp.match_id] ?? 0) + 1;
      }

      // ── Home goals per player ─────────────────────────────────────────────────
      const goalsByPlayer: Record<string, number> = {};
      for (const g of goalRows) {
        if (g.player_id && (g.meta as { team?: string } | null)?.team === "home") {
          goalsByPlayer[g.player_id] = (goalsByPlayer[g.player_id] ?? 0) + 1;
        }
      }

      // ── Per-player stats ─────────────────────────────────────────────────────
      const playerStats: PlayerSeasonStat[] = (players ?? []).map((p) => {
        const rows = mpRows.filter((mp) => mp.player_id === p.id);

        let totalPlaySeconds = 0;
        let totalFairnessPct = 0;
        let keeperMatchCount = 0;
        let lastKeeperMatchDate: string | null = null;
        const fairnessByMatch: PlayerSeasonStat["fairnessByMatch"] = [];

        for (const mp of rows) {
          const match = finishedMatches.find((m) => m.id === mp.match_id);
          if (!match) continue;

          totalPlaySeconds += mp.total_play_seconds;

          const total = participantsPerMatch[match.id] ?? 1;
          const expected = (match.elapsed_seconds * match.players_on_field) / total;
          const pct = expected > 0 ? (mp.total_play_seconds / expected) * 100 : 100;
          totalFairnessPct += pct;

          fairnessByMatch.push({
            matchId: match.id,
            matchDate: match.created_at,
            fairnessPct: Math.round(pct),
          });

          const zones = mp.meta?.zones ?? [];
          const hadKeeper = zones.some((z) => z.zone === "keeper" && z.seconds > 0);
          if (hadKeeper) {
            keeperMatchCount++;
            if (!lastKeeperMatchDate || match.created_at > lastKeeperMatchDate) {
              lastKeeperMatchDate = match.created_at;
            }
          }
        }

        const matchesPlayed = rows.length;

        return {
          playerId: p.id,
          name: p.name,
          jerseyNumber: p.jersey_number,
          matchesPlayed,
          totalPlaySeconds,
          avgPlaySecondsPerMatch: matchesPlayed > 0 ? Math.round(totalPlaySeconds / matchesPlayed) : 0,
          goals: goalsByPlayer[p.id] ?? 0,
          avgFairnessPct: matchesPlayed > 0 ? Math.round(totalFairnessPct / matchesPlayed) : 0,
          keeperMatchCount,
          lastKeeperMatchDate,
          fairnessByMatch,
        };
      });

      // Only include players who appeared in at least one match
      const activePlayers = playerStats.filter((p) => p.matchesPlayed > 0);
      activePlayers.sort((a, b) => b.totalPlaySeconds - a.totalPlaySeconds);

      return { playerStats: activePlayers, teamRecord, matchCount: finishedMatches.length };
    },
  });
}
