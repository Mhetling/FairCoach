import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Plus, Minus, Check } from "lucide-react";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { getDisplayError } from "@/lib/errors";
import { useTeam } from "@/hooks/useTeams";
import { usePlayers } from "@/hooks/usePlayers";
import { useCreateMatch } from "@/hooks/useMatches";
import { ELEVEN_FORMATIONS, DEFAULT_11_FORMATION } from "@/lib/formations";
import { getSportConfig } from "@/lib/sportConfig";
import {
  RINK_SPECS, FORMAT_DEFAULTS, type HockeyFormat,
} from "@/lib/hockeyRinks";
import { HockeyRink } from "@/components/HockeyRink";
import { cn } from "@/lib/utils";
import type { SportId } from "@/types/database";

const HOCKEY_FORMATS: HockeyFormat[] = ["3v3-small", "3v3-quarter", "5v5-small", "5v5-full"];

function OptionButton({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-md border text-sm font-medium transition-colors",
        active
          ? "border-ink bg-ink text-cream"
          : "border-ink/20 bg-cream-dark text-ink hover:bg-ink/5",
      )}
    >
      {children}
    </button>
  );
}

export function MatchSetup() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const { data: players } = usePlayers(teamId);
  const createMatch = useCreateMatch();

  const sportId = (team?.sport_id ?? "soccer") as SportId;
  const config = getSportConfig(sportId);
  const isHockey = sportId === "hockey";

  const [opponent, setOpponent] = useState("");
  const [hockeyFormat, setHockeyFormat] = useState<HockeyFormat>("5v5-full");
  const [playersOnField, setPlayersOnField] = useState(
    isHockey ? RINK_SPECS["5v5-full"].playersOnField : config.defaultPlayersOnField,
  );
  const [periodLengthSecs, setPeriodLengthSecs] = useState(
    isHockey ? FORMAT_DEFAULTS["5v5-full"].periodLengthSeconds : config.defaultPeriodLengthSeconds,
  );
  const [customMinutes, setCustomMinutes] = useState("");
  const [periodCount, setPeriodCount] = useState(
    isHockey ? FORMAT_DEFAULTS["5v5-full"].periodCount : config.defaultPeriodCount,
  );
  const [formation, setFormation] = useState(DEFAULT_11_FORMATION);
  const [trackGoals, setTrackGoals] = useState(config.trackGoalsDefault);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());

  const configInitialized = useRef(false);
  const playersInitialized = useRef(false);

  // Apply sport/team defaults once the team loads
  useEffect(() => {
    if (!configInitialized.current && team?.sport_id) {
      configInitialized.current = true;
      const c = getSportConfig(team.sport_id as SportId);
      setPlayersOnField(team.default_players_on_field ?? c.defaultPlayersOnField);
      setPeriodLengthSecs(team.default_period_length_seconds ?? c.defaultPeriodLengthSeconds);
      setPeriodCount(team.default_period_count ?? c.defaultPeriodCount);
      setTrackGoals(c.trackGoalsDefault);
    }
  }, [team]);

  // Pre-select all players once they load
  useEffect(() => {
    if (!playersInitialized.current && players && players.length > 0) {
      playersInitialized.current = true;
      setSelectedIds(new Set(players.map((p) => p.id)));
    }
  }, [players]);

  const allPlayerIds = players?.map((p) => p.id) ?? [];
  const isCustomLength = periodLengthSecs === -1;
  const effectivePeriodSecs = isCustomLength
    ? (parseInt(customMinutes) || 0) * 60
    : periodLengthSecs;

  const isSoccer11 = sportId === "soccer" && playersOnField === 11;

  function selectHockeyFormat(fmt: HockeyFormat) {
    setHockeyFormat(fmt);
    setPlayersOnField(RINK_SPECS[fmt].playersOnField);
    setPeriodLengthSecs(FORMAT_DEFAULTS[fmt].periodLengthSeconds);
    setPeriodCount(FORMAT_DEFAULTS[fmt].periodCount);
  }

  function togglePlayer(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  async function onStart() {
    if (!teamId) return;
    if (effectivePeriodSecs < 60) {
      toast({ title: "Ugyldig omgangslengde", description: "Minimum 1 minutt.", variant: "error" });
      return;
    }
    try {
      const match = await createMatch.mutateAsync({
        team_id: teamId,
        sport_id: sportId,
        opponent: opponent.trim() || null,
        players_on_field: isHockey ? RINK_SPECS[hockeyFormat].playersOnField : playersOnField,
        period_length_seconds: effectivePeriodSecs,
        period_count: periodCount,
        formation: isSoccer11 ? formation : isHockey ? hockeyFormat : null,
        track_goals: trackGoals,
        selected_player_ids: Array.from(selectedIds),
      });
      navigate(`/matches/${match.id}`);
    } catch (err) {
      toast({ title: "Kunne ikke opprette kamp", description: getDisplayError(err), variant: "error" });
    }
  }

  const colsForOptions = (n: number) =>
    n <= 3 ? "grid-cols-3" : n === 4 ? "grid-cols-4" : n <= 6 ? "grid-cols-3" : "grid-cols-5";

  return (
    <AppShell title={`Ny kamp — ${team?.name ?? ""}`} showBack>
      <div className="flex flex-col gap-4">

        {/* Opponent */}
        <Card>
          <CardContent className="space-y-2 py-4">
            <Label htmlFor="opponent">Motstander</Label>
            <Input
              id="opponent"
              placeholder="Motstanderlagets navn (valgfritt)"
              value={opponent}
              onChange={(e) => setOpponent(e.target.value)}
            />
          </CardContent>
        </Card>

        {/* Format */}
        <Card>
          <CardContent className="space-y-4 py-4">

            {isHockey ? (
              <div className="space-y-2">
                <Label>Format</Label>
                <div className="grid grid-cols-2 gap-3">
                  {HOCKEY_FORMATS.map((fmt) => {
                    const spec = RINK_SPECS[fmt];
                    const active = hockeyFormat === fmt;
                    return (
                      <button
                        key={fmt}
                        type="button"
                        onClick={() => selectHockeyFormat(fmt)}
                        className={cn(
                          "flex flex-col gap-2 rounded-xl border-2 p-3 text-left transition-colors",
                          active
                            ? "border-ink bg-ink/5"
                            : "border-ink/15 bg-cream-dark hover:bg-ink/5",
                        )}
                      >
                        <HockeyRink format={fmt} className="pointer-events-none rounded-lg" />
                        <div>
                          <div className="text-sm font-semibold text-ink">{spec.label}</div>
                          <div className="text-xs text-ink-muted">{spec.ageGroup}</div>
                          <div className="mt-0.5 text-xs text-ink-muted">
                            {spec.playersOnField} spillere · {FORMAT_DEFAULTS[fmt].periodCount}×{FORMAT_DEFAULTS[fmt].periodLengthSeconds / 60} min
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Spillere på banen</Label>
                <div className={cn("grid gap-2", colsForOptions(config.playersOnFieldOptions.length))}>
                  {config.playersOnFieldOptions.map((n) => (
                    <OptionButton key={n} active={playersOnField === n} onClick={() => setPlayersOnField(n)}>
                      {n}er
                    </OptionButton>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Omgangslengde</Label>
              <div className="grid grid-cols-3 gap-2">
                {config.periodLengthOptions.map((o) => (
                  <OptionButton
                    key={o.seconds}
                    active={periodLengthSecs === o.seconds}
                    onClick={() => setPeriodLengthSecs(o.seconds)}
                  >
                    {o.label}
                  </OptionButton>
                ))}
              </div>
              {isCustomLength && (
                <div className="flex items-center gap-2 pt-1">
                  <Input
                    autoFocus
                    inputMode="numeric"
                    pattern="[0-9]*"
                    placeholder="Antall minutter"
                    value={customMinutes}
                    onChange={(e) => setCustomMinutes(e.target.value.replace(/[^0-9]/g, ""))}
                    className="max-w-[160px]"
                  />
                  <span className="text-sm text-ink-muted">min</span>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label>Antall omganger</Label>
              <div className={cn("grid gap-2", config.periodCountOptions.length === 2 ? "grid-cols-2" : "grid-cols-4")}>
                {config.periodCountOptions.map((n) => (
                  <OptionButton key={n} active={periodCount === n} onClick={() => setPeriodCount(n)}>
                    {n === 1 ? "1 omgang" : `${n} omganger`}
                  </OptionButton>
                ))}
              </div>
            </div>

            {/* Formation picker — 11er soccer only */}
            {isSoccer11 && (
              <div className="space-y-2">
                <Label>Formasjon</Label>
                <div className="grid grid-cols-3 gap-2">
                  {ELEVEN_FORMATIONS.map((f) => (
                    <OptionButton
                      key={f.name}
                      active={formation === f.name}
                      onClick={() => setFormation(f.name)}
                    >
                      {f.name}
                    </OptionButton>
                  ))}
                </div>
              </div>
            )}

            {/* Goal tracking toggle */}
            <button
              type="button"
              onClick={() => setTrackGoals((v) => !v)}
              className="flex w-full items-center justify-between rounded-md border border-ink/20 bg-cream-dark px-3 py-3 text-left transition-colors hover:bg-ink/5"
            >
              <div>
                <div className="text-sm font-medium text-ink">Tell mål</div>
                <div className="text-xs text-ink-muted">Registrer mål og målscorer underveis</div>
              </div>
              <div className={cn(
                "relative h-6 w-11 shrink-0 rounded-full transition-colors",
                trackGoals ? "bg-ink" : "bg-ink/20",
              )}>
                <span className={cn(
                  "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform",
                  trackGoals ? "translate-x-5" : "translate-x-0.5",
                )} />
              </div>
            </button>

          </CardContent>
        </Card>

        {/* Player picker */}
        <Card>
          <CardContent className="py-4">
            <div className="mb-3 flex items-center justify-between">
              <Label>Spillere med ({selectedIds.size})</Label>
              <button
                type="button"
                className="text-xs text-ink-muted underline"
                onClick={() =>
                  setSelectedIds(
                    selectedIds.size === allPlayerIds.length
                      ? new Set()
                      : new Set(allPlayerIds),
                  )
                }
              >
                {selectedIds.size === allPlayerIds.length ? "Fjern alle" : "Velg alle"}
              </button>
            </div>
            <div className="flex flex-col gap-2">
              {players?.map((p) => {
                const on = selectedIds.has(p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => togglePlayer(p.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border p-3 text-left transition-colors",
                      on
                        ? "border-ink bg-ink text-cream"
                        : "border-ink/20 bg-cream-dark text-ink/50",
                    )}
                  >
                    <div className="flex h-4 w-4 shrink-0 items-center justify-center">
                      {on ? <Minus className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current font-display text-sm font-bold">
                      {p.jersey_number ?? "—"}
                    </div>
                    <div className="flex-1 text-sm font-medium">{p.name}</div>
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2",
                      on ? "border-green-500 bg-green-500" : "border-ink/30 bg-transparent"
                    )}>
                      {on && <Check className="h-3 w-3 text-white" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Button
          variant="accent"
          className="w-full"
          onClick={onStart}
          disabled={createMatch.isPending || selectedIds.size === 0 || (isCustomLength && !customMinutes)}
        >
          {createMatch.isPending ? "Starter …" : "Start kamp"}
        </Button>

      </div>
    </AppShell>
  );
}
