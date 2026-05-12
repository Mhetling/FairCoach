import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Player } from "@/types/database";

export function usePlayers(teamId: string | undefined) {
  return useQuery({
    enabled: !!teamId,
    queryKey: ["players", teamId],
    queryFn: async (): Promise<Player[]> => {
      if (!teamId) return [];
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .eq("team_id", teamId)
        .order("jersey_number", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useCreatePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      team_id: string;
      name: string;
      jersey_number: number | null;
      position: string | null;
    }) => {
      const { data, error } = await supabase.from("players").insert(input).select().single();
      if (error) throw error;
      return data as Player;
    },
    onSuccess: (player) => {
      qc.invalidateQueries({ queryKey: ["players", player.team_id] });
    },
  });
}

export function useDeletePlayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; team_id: string }) => {
      const { error } = await supabase.from("players").delete().eq("id", input.id);
      if (error) throw error;
      return input;
    },
    onSuccess: ({ team_id }) => {
      qc.invalidateQueries({ queryKey: ["players", team_id] });
    },
  });
}
