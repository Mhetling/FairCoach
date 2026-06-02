import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Match, MatchEvent, MatchPlayer, PlayerMeta, ZoneTime } from "@/types/database";

export type RichMatchPlayer = MatchPlayer & {
  player: { id: string; name: string; jersey_number: number | null; position: string | null; dominant_side: "R" | "L" | null };
};

export function useMatchDetail(matchId: string | undefined) {
  return useQuery({
    enabled: !!matchId,
    queryKey: ["match", matchId],
    queryFn: async () => {
      if (!matchId) return null;
      const [{ data: match, error: me }, { data: mps, error: mpe }] = await Promise.all([
        supabase.from("matches").select("*").eq("id", matchId).single(),
        supabase
          .from("match_players")
          .select("*, player:players(id, name, jersey_number, position, dominant_side)")
          .eq("match_id", matchId),
      ]);
      if (me) throw me;
      if (mpe) throw mpe;
      return { match: match as Match, players: (mps ?? []) as RichMatchPlayer[] };
    },
  });
}

export function useUpdateMatch(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: Partial<Omit<Match, "id">>) => {
      if (!matchId) return;
      const { error } = await supabase.from("matches").update(update).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useSubstitute(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      comingOnId: string;
      goingOffId: string;
      goingOffTotalSeconds: number;
      atSeconds: number;
    }) => {
      if (!matchId) return;
      const [r1, r2] = await Promise.all([
        supabase
          .from("match_players")
          .update({ on_field: true })
          .eq("match_id", matchId)
          .eq("player_id", args.comingOnId),
        supabase
          .from("match_players")
          .update({ on_field: false, total_play_seconds: args.goingOffTotalSeconds })
          .eq("match_id", matchId)
          .eq("player_id", args.goingOffId),
      ]);
      if (r1.error) throw r1.error;
      if (r2.error) throw r2.error;
      await supabase.from("match_events").insert([
        { match_id: matchId, player_id: args.goingOffId, event_type: "off", at_seconds: args.atSeconds },
        { match_id: matchId, player_id: args.comingOnId, event_type: "on", at_seconds: args.atSeconds },
      ]);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useBulkSubstitute(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      swaps: Array<{ comingOnId: string; goingOffId: string; goingOffTotalSeconds: number }>;
      atSeconds: number;
    }) => {
      if (!matchId || args.swaps.length === 0) return;
      await Promise.all(
        args.swaps.flatMap(({ comingOnId, goingOffId, goingOffTotalSeconds }) => [
          supabase.from("match_players").update({ on_field: true }).eq("match_id", matchId).eq("player_id", comingOnId),
          supabase.from("match_players").update({ on_field: false, total_play_seconds: goingOffTotalSeconds }).eq("match_id", matchId).eq("player_id", goingOffId),
        ]),
      );
      const events = args.swaps.flatMap(({ comingOnId, goingOffId }) => [
        { match_id: matchId, player_id: goingOffId, event_type: "off" as const, at_seconds: args.atSeconds },
        { match_id: matchId, player_id: comingOnId, event_type: "on" as const, at_seconds: args.atSeconds },
      ]);
      await supabase.from("match_events").insert(events);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useEndPeriod(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      elapsed: number;
      currentPeriod: number;
      periodCount: number;
      fieldPlayerFinalSeconds: { player_id: string; total_play_seconds: number }[];
    }) => {
      if (!matchId) return;
      const isLastPeriod = args.currentPeriod >= args.periodCount;
      if (isLastPeriod) {
        await Promise.all([
          supabase
            .from("matches")
            .update({ status: "finished", elapsed_seconds: args.elapsed })
            .eq("id", matchId),
          ...args.fieldPlayerFinalSeconds.map((u) =>
            supabase
              .from("match_players")
              .update({ total_play_seconds: u.total_play_seconds, on_field: false })
              .eq("match_id", matchId)
              .eq("player_id", u.player_id),
          ),
        ]);
      } else {
        await supabase
          .from("matches")
          .update({
            status: "paused",
            elapsed_seconds: args.elapsed,
            current_period: args.currentPeriod + 1,
          })
          .eq("id", matchId);
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export type RichMatchEvent = MatchEvent & {
  player: { id: string; name: string; jersey_number: number | null } | null;
};

export function useMatchEvents(matchId: string | undefined) {
  return useQuery({
    enabled: !!matchId,
    queryKey: ["match-events", matchId],
    queryFn: async () => {
      if (!matchId) return [];
      const { data, error } = await supabase
        .from("match_events")
        .select("*, player:players(id, name, jersey_number)")
        .eq("match_id", matchId)
        .in("event_type", ["on", "off", "goal"])
        .order("at_seconds", { ascending: true });
      if (error) throw error;
      return (data ?? []) as RichMatchEvent[];
    },
  });
}

export function useLogGoal(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: {
      team: "home" | "away";
      scorerPlayerId: string | null;
      assistPlayerId: string | null;
      assist2PlayerId?: string | null;
      atSeconds: number;
    }) => {
      if (!matchId) return;
      const { error } = await supabase.from("match_events").insert({
        match_id: matchId,
        player_id: args.scorerPlayerId,
        event_type: "goal",
        at_seconds: args.atSeconds,
        meta: {
          team: args.team,
          ...(args.assistPlayerId ? { assist_player_id: args.assistPlayerId } : {}),
          ...(args.assist2PlayerId ? { assist2_player_id: args.assist2PlayerId } : {}),
        },
      });
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match-events", matchId] }),
  });
}

export function useAddExtraPlayer(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { playerId: string; atSeconds: number }) => {
      if (!matchId) return;
      const { error } = await supabase
        .from("match_players")
        .update({ on_field: true })
        .eq("match_id", matchId)
        .eq("player_id", args.playerId);
      if (error) throw error;
      await supabase.from("match_events").insert({
        match_id: matchId,
        player_id: args.playerId,
        event_type: "on",
        at_seconds: args.atSeconds,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useRemoveExtraPlayer(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { playerId: string; totalPlaySeconds: number; atSeconds: number }) => {
      if (!matchId) return;
      const { error } = await supabase
        .from("match_players")
        .update({ on_field: false, total_play_seconds: args.totalPlaySeconds })
        .eq("match_id", matchId)
        .eq("player_id", args.playerId);
      if (error) throw error;
      await supabase.from("match_events").insert({
        match_id: matchId,
        player_id: args.playerId,
        event_type: "off",
        at_seconds: args.atSeconds,
      });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useUpdatePlayerPlayTime(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { playerId: string; totalPlaySeconds: number }) => {
      if (!matchId) return;
      const { error } = await supabase
        .from("match_players")
        .update({ total_play_seconds: args.totalPlaySeconds })
        .eq("match_id", matchId)
        .eq("player_id", args.playerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useUpdateAllPlayerMetas(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (updates: { playerId: string; meta: PlayerMeta | null }[]) => {
      if (!matchId || updates.length === 0) return;
      await Promise.all(
        updates.map(({ playerId, meta }) =>
          supabase
            .from("match_players")
            .update({ meta })
            .eq("match_id", matchId)
            .eq("player_id", playerId)
            .then(({ error }) => { if (error) throw error; }),
        ),
      );
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

// Suppress unused import warning — ZoneTime is re-exported for consumers
export type { ZoneTime };

export function useUpdatePlayerMeta(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (args: { playerId: string; meta: PlayerMeta | null }) => {
      if (!matchId) return;
      const { error } = await supabase
        .from("match_players")
        .update({ meta: args.meta })
        .eq("match_id", matchId)
        .eq("player_id", args.playerId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}

export function useUpdateMatchSummary(matchId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (update: {
      score_home: number | null;
      score_away: number | null;
      notes: string | null;
    }) => {
      if (!matchId) return;
      const { error } = await supabase.from("matches").update(update).eq("id", matchId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["match", matchId] }),
  });
}
