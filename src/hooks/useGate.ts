import { useProfile } from "./useProfile";
import { evaluateGate, type GateResult } from "@/lib/gates";
import type { Feature } from "@/types/database";

export function useGate(feature: Feature): GateResult & { loading: boolean } {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return { allowed: true, reason: "", loading: true };
  }

  return {
    ...evaluateGate(feature, profile.tier, profile.pro_until),
    loading: false,
  };
}
