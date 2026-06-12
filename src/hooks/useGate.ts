import { useProfile } from "./useProfile";
import { evaluateGate, type GateResult } from "@/lib/gates";
import type { Feature } from "@/types/database";

// Pro features are currently open to everyone in preview.
// Set this to false when payment is ready to enforce gates.
export const PRO_GATES_ENFORCED = false;

export function useGate(feature: Feature): GateResult & { loading: boolean; preview: boolean } {
  const { data: profile, isLoading } = useProfile();

  if (isLoading || !profile) {
    return { allowed: true, reason: "", loading: true, preview: false };
  }

  const result = evaluateGate(feature, profile.tier, profile.pro_until);

  if (!PRO_GATES_ENFORCED) {
    return { allowed: true, reason: "", loading: false, preview: !result.allowed };
  }

  return { ...result, loading: false, preview: false };
}
