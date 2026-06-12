import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/providers/AuthProvider";
import type { Profile } from "@/types/database";

export function useProfile() {
  const { user } = useAuth();

  return useQuery({
    enabled: !!user,
    staleTime: 10 * 60 * 1000,
    queryKey: ["profile", user?.id],
    queryFn: async (): Promise<Profile | null> => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();
      if (error) throw error;

      if (!data) {
        const { data: created, error: insertError } = await supabase
          .from("profiles")
          .insert({ id: user.id })
          .select()
          .single();
        if (insertError) throw insertError;
        return created as Profile;
      }
      return data as Profile;
    },
  });
}

export function useIsPro(): boolean {
  const { data: profile } = useProfile();
  if (!profile) return false;
  if (profile.tier !== "pro") return false;
  if (profile.pro_until && new Date(profile.pro_until) < new Date()) return false;
  return true;
}
