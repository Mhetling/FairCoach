import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Sport } from "@/types/database";

export function useSports() {
  return useQuery({
    queryKey: ["sports"],
    queryFn: async (): Promise<Sport[]> => {
      const { data, error } = await supabase
        .from("sports")
        .select("*")
        .order("sort_order", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
}
