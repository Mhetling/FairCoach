import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Match } from "@/types/database";

export function useTeamMatches(teamId: string | undefined) {
  return useQuery({
    enabled: !!teamId,
    queryKey: ["team-matches", teamId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("matches")
        .select("*")
        .eq("team_id", teamId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Match[];
    },
  });
}

export function useDeleteMatch() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; team_id: string }) => {
      const { error } = await supabase.from("matches").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: ({ team_id }) => {
      qc.invalidateQueries({ queryKey: ["team-matches", team_id] });
    },
  });
}

export function useCreateMatch() {
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: {
      team_id: string;
      sport_id: import("@/types/database").SportId;
      opponent: string | null;
      players_on_field: number;
      period_length_seconds: number;
      period_count: number;
      formation: string | null;
      track_goals: boolean;
      selected_player_ids: string[];
    }) => {
      if (!user) throw new Error("Ikke innlogget");

      const { data: match, error: matchError } = await supabase
        .from("matches")
        .insert({
          user_id: user.id,
          team_id: input.team_id,
          sport_id: input.sport_id,
          opponent: input.opponent || null,
          players_on_field: input.players_on_field,
          period_length_seconds: input.period_length_seconds,
          period_count: input.period_count,
          formation: input.formation,
          track_goals: input.track_goals,
        })
        .select()
        .single();
      if (matchError) throw matchError;

      if (input.selected_player_ids.length > 0) {
        const starters = new Set(input.selected_player_ids.slice(0, input.players_on_field));
        const { error: mpError } = await supabase.from("match_players").insert(
          input.selected_player_ids.map((player_id) => ({
            match_id: match.id,
            player_id,
            selected: true,
            on_field: starters.has(player_id),
          }))
        );
        if (mpError) throw mpError;
      }

      return match as Match;
    },
  });
}
