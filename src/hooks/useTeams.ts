import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { SportId, Team } from "@/types/database";

export function useAllTeams() {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user,
    queryKey: ["teams", user?.id],
    queryFn: async (): Promise<Team[]> => {
      const { data, error } = await supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeams(sportId?: SportId) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!sportId,
    queryKey: ["teams", user?.id, sportId],
    queryFn: async (): Promise<Team[]> => {
      let q = supabase
        .from("teams")
        .select("*")
        .order("created_at", { ascending: false });
      if (sportId) q = q.eq("sport_id", sportId);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useTeam(teamId: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    enabled: !!user && !!teamId,
    queryKey: ["team", teamId],
    queryFn: async (): Promise<Team | null> => {
      if (!teamId) return null;
      const { data, error } = await supabase.from("teams").select("*").eq("id", teamId).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useCreateTeam() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: { name: string; sport_id: SportId }) => {
      if (!user) throw new Error("Ikke innlogget");
      const { data, error } = await supabase
        .from("teams")
        .insert({ name: input.name, sport_id: input.sport_id, user_id: user.id })
        .select()
        .single();
      if (error) throw error;
      return data as Team;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}

export function useUpdateTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      id: string;
      name?: string;
      default_players_on_field?: number | null;
      default_period_length_seconds?: number | null;
      default_period_count?: number | null;
      default_formation?: string | null;
    }) => {
      const { id, ...fields } = input;
      const { data, error } = await supabase.from("teams").update(fields).eq("id", id).select().single();
      if (error) throw error;
      return data as import("@/types/database").Team;
    },
    onSuccess: (team) => {
      qc.invalidateQueries({ queryKey: ["teams"] });
      qc.invalidateQueries({ queryKey: ["team", team.id] });
    },
  });
}

export function useDeleteTeam() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (teamId: string) => {
      const { error } = await supabase.from("teams").delete().eq("id", teamId);
      if (error) throw error;
      return teamId;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teams"] });
    },
  });
}
