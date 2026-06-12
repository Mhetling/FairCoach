import type { Feature, Tier } from "@/types/database";

export interface GateResult {
  allowed: boolean;
  reason: string;
}

const FEATURE_LABELS: Record<Feature, string> = {
  match_history:        "Kamphistorikk",
  season_stats:         "Sesongstatistikk",
  player_stats_export:  "Eksporter spillerkort",
  team_form:            "Lagform",
  goalie_rotation:      "Keeperrotasjon",
  match_templates:      "Kampmal",
};

const FEATURE_DESCRIPTIONS: Record<Feature, string> = {
  match_history:        "Se alle tidligere kamper og oppsummeringer.",
  season_stats:         "Følg spillerutviklingen over hele sesongen med spilletid, mål og fairness-trend.",
  player_stats_export:  "Eksporter spillerkort med sesongstatistikk som bilde.",
  team_form:            "Se lagets vinn/uavgjort/tap-rekord og målstatistikk over sesongen.",
  goalie_rotation:      "Hold oversikt over hvem som har vært keeper og hvem som er forfalt.",
  match_templates:      "Lagre kampoppsett som mal og last inn raskt til neste kamp.",
};

export { FEATURE_LABELS, FEATURE_DESCRIPTIONS };

export function evaluateGate(feature: Feature, tier: Tier, proUntil: string | null): GateResult {
  const isPro = tier === "pro" && (!proUntil || new Date(proUntil) > new Date());
  if (isPro) return { allowed: true, reason: "" };

  return {
    allowed: false,
    reason: `${FEATURE_LABELS[feature]} er en Pro-funksjon. Oppgrader for å få tilgang.`,
  };
}
