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
import { type HockeyLine, saveHockeyLines, autoSplitLines } from "@/lib/hockeyLines";
import { HockeyLineSetupDialog, type LineSetupPlayer } from "@/components/HockeyLineSetupDialog";
import {
  HANDBALL_FORMATS, HANDBALL_FORMAT_ORDER, HANDBALL_RULES_OVERVIEW,
  type HandballFormatId,
} from "@/types/handball-formats";
import {
  BASKETBALL_FORMATS, BASKETBALL_FORMAT_ORDER, BASKETBALL_RULES_OVERVIEW,
  type BasketballFormatId,
} from "@/types/basketball-formats";
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

// ─── Handball format card ─────────────────────────────────────────────────────

function HandballFormatCard({
  formatId, active, periodLengthSecs, onSelect, onSelectTime,
}: {
  formatId: HandballFormatId;
  active: boolean;
  periodLengthSecs: number;
  onSelect: () => void;
  onSelectTime: (secs: number) => void;
}) {
  const spec = HANDBALL_FORMATS[formatId];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-colors",
        active ? "border-ink bg-ink/5" : "border-ink/15 bg-cream-dark hover:bg-ink/5",
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink leading-snug">{spec.label}</div>
          <div className="text-xs text-ink-muted mt-0.5">{spec.subtitle}</div>
        </div>
        <span className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
          active ? "border-ink/30 bg-ink/10 text-ink" : "border-ink/15 bg-transparent text-ink-muted",
        )}>
          {spec.ageGroup}
        </span>
      </div>

      {/* Chips */}
      <div className="flex flex-wrap gap-1.5">
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.playersOnCourt} på banen
        </span>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.periodCount}×{spec.periodLength} min
        </span>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.courtLength}×{spec.courtWidth} m
        </span>
        {!spec.hasGoalkeeper && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            Ingen fast keeper
          </span>
        )}
      </div>

      {/* 7er time sub-picker — only when selected */}
      {active && formatId === '7er' && (
        <div className="space-y-1.5" onClick={(e) => e.stopPropagation()}>
          <p className="text-xs font-medium text-ink-muted">Velg spilletid</p>
          <div className="grid grid-cols-2 gap-2">
            {([25, 30] as const).map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={(e) => { e.stopPropagation(); onSelectTime(mins * 60); }}
                className={cn(
                  "rounded-lg border py-2.5 text-sm font-medium transition-colors leading-tight",
                  periodLengthSecs === mins * 60
                    ? "border-ink bg-ink text-cream"
                    : "border-ink/20 bg-cream text-ink hover:bg-ink/5",
                )}
              >
                2×{mins} min
                <div className="text-[10px] font-normal opacity-60 mt-0.5">
                  {mins === 25 ? "12–16 år" : "16 år og eldre"}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Note */}
      <p className="text-xs text-ink-muted leading-relaxed">{spec.note}</p>

      {/* NHF rules link */}
      <a
        href={spec.rulesUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 transition-opacity",
          active ? "text-ink" : "text-ink-muted",
        )}
      >
        Se NHFs offisielle regler →
      </a>
    </button>
  );
}

// ─── Basketball format card ───────────────────────────────────────────────────

function BasketballFormatCard({
  formatId, active, onSelect,
}: {
  formatId: BasketballFormatId;
  active: boolean;
  onSelect: () => void;
}) {
  const spec = BASKETBALL_FORMATS[formatId];
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        "w-full flex flex-col gap-2.5 rounded-xl border-2 p-4 text-left transition-colors",
        active ? "border-ink bg-ink/5" : "border-ink/15 bg-cream-dark hover:bg-ink/5",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold text-ink leading-snug">{spec.label}</div>
          <div className="text-xs text-ink-muted mt-0.5">{spec.subtitle}</div>
        </div>
        <span className={cn(
          "shrink-0 rounded-full border px-2 py-0.5 text-xs font-medium",
          active ? "border-ink/30 bg-ink/10 text-ink" : "border-ink/15 bg-transparent text-ink-muted",
        )}>
          {spec.ageGroup}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5">
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.playersOnCourt}v{spec.playersOnCourt}
        </span>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.periodCount}×{spec.periodLength} min
        </span>
        <span className={cn(
          "rounded px-1.5 py-0.5 text-xs font-medium",
          active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
        )}>
          {spec.courtLength}×{spec.courtWidth} m
        </span>
        {spec.id === 'easybasket' && (
          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-medium text-amber-800">
            Ingen poengføring
          </span>
        )}
      </div>

      <p className="text-xs text-ink-muted leading-relaxed">{spec.note}</p>

      <a
        href={spec.rulesUrl}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "inline-flex items-center gap-1 text-xs font-medium underline underline-offset-2 transition-opacity",
          active ? "text-ink" : "text-ink-muted",
        )}
      >
        Se NBBFs offisielle regler →
      </a>
    </button>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function MatchSetup() {
  const { teamId } = useParams<{ teamId: string }>();
  const navigate = useNavigate();
  const { data: team } = useTeam(teamId);
  const { data: players } = usePlayers(teamId);
  const createMatch = useCreateMatch();

  const sportId = (team?.sport_id ?? "soccer") as SportId;
  const config = getSportConfig(sportId);
  const isHockey = sportId === "hockey";
  const isHandball = sportId === "handball";
  const isBasketball = sportId === "basketball";

  const DEFAULT_HANDBALL: HandballFormatId = "7er";
  const DEFAULT_BASKETBALL: BasketballFormatId = "5v5-senior";

  const [opponent, setOpponent] = useState("");
  const [hockeyFormat, setHockeyFormat] = useState<HockeyFormat>("5v5-full");
  const [handballFormat, setHandballFormat] = useState<HandballFormatId>(DEFAULT_HANDBALL);
  const [basketballFormat, setBasketballFormat] = useState<BasketballFormatId>(DEFAULT_BASKETBALL);
  const [playersOnField, setPlayersOnField] = useState(
    isHockey ? RINK_SPECS["5v5-full"].playersOnField
    : isHandball ? HANDBALL_FORMATS[DEFAULT_HANDBALL].playersOnCourt
    : config.defaultPlayersOnField,
  );
  const [periodLengthSecs, setPeriodLengthSecs] = useState(
    isHockey ? FORMAT_DEFAULTS["5v5-full"].periodLengthSeconds
    : isHandball ? HANDBALL_FORMATS[DEFAULT_HANDBALL].periodLength * 60
    : config.defaultPeriodLengthSeconds,
  );
  const [customMinutes, setCustomMinutes] = useState("");
  const [periodCount, setPeriodCount] = useState(
    isHockey ? FORMAT_DEFAULTS["5v5-full"].periodCount
    : isHandball ? HANDBALL_FORMATS[DEFAULT_HANDBALL].periodCount
    : config.defaultPeriodCount,
  );
  const [formation, setFormation] = useState(DEFAULT_11_FORMATION);
  const [trackGoals, setTrackGoals] = useState(config.trackGoalsDefault);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [formatPickerOpen, setFormatPickerOpen] = useState(false);
  const [basketballPickerOpen, setBasketballPickerOpen] = useState(false);
  const [hockeyLines, setHockeyLines] = useState<HockeyLine[]>([]);
  const [lineSetupOpen, setLineSetupOpen] = useState(false);

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
      if (team.sport_id === "handball") {
        const fmt = (team.default_formation as HandballFormatId | null) ?? DEFAULT_HANDBALL;
        if (fmt in HANDBALL_FORMATS) selectHandballFormat(fmt);
      }
      if (team.sport_id === "basketball") {
        const fmt = (team.default_formation as BasketballFormatId | null) ?? DEFAULT_BASKETBALL;
        if (fmt in BASKETBALL_FORMATS) selectBasketballFormat(fmt);
      }
      if (team.sport_id === "hockey" && team.default_formation) {
        const fmt = team.default_formation as HockeyFormat;
        if (HOCKEY_FORMATS.includes(fmt)) selectHockeyFormat(fmt);
      }
      if (team.sport_id === "soccer" && team.default_formation) {
        setFormation(team.default_formation);
      }
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

  function selectHandballFormat(fmt: HandballFormatId) {
    setHandballFormat(fmt);
    const spec = HANDBALL_FORMATS[fmt];
    setPlayersOnField(spec.playersOnCourt);
    // 7er defaults to 2×30 unless already showing a 7er-valid time
    const defaultMins = fmt === '7er' ? 30 : spec.periodLength;
    setPeriodLengthSecs(defaultMins * 60);
    setPeriodCount(spec.periodCount);
  }

  function selectBasketballFormat(fmt: BasketballFormatId) {
    setBasketballFormat(fmt);
    const spec = BASKETBALL_FORMATS[fmt];
    setPlayersOnField(spec.playersOnCourt);
    setPeriodLengthSecs(spec.periodLength * 60);
    setPeriodCount(spec.periodCount);
    // NBBF EasyBasket rule: no score registration
    if (fmt === 'easybasket') setTrackGoals(false);
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
        players_on_field: isHockey ? RINK_SPECS[hockeyFormat].playersOnField
          : isHandball ? HANDBALL_FORMATS[handballFormat].playersOnCourt
          : isBasketball ? BASKETBALL_FORMATS[basketballFormat].playersOnCourt
          : playersOnField,
        period_length_seconds: effectivePeriodSecs,
        period_count: periodCount,
        formation: isSoccer11 ? formation
          : isHockey ? hockeyFormat
          : isHandball ? handballFormat
          : isBasketball ? basketballFormat
          : null,
        track_goals: trackGoals,
        selected_player_ids: Array.from(selectedIds),
      });
      if (isHockey && hockeyLines.length > 0) {
        saveHockeyLines(match.id, hockeyLines);
      }
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
                    const def = FORMAT_DEFAULTS[fmt];
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
                        <div className="text-sm font-semibold text-ink leading-snug">{spec.label}</div>
                        <div className="text-xs text-ink-muted">{spec.ageGroup}</div>
                        <div className="mt-1 flex flex-wrap gap-1.5">
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium",
                            active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
                          )}>
                            {spec.playersOnField} spillere
                          </span>
                          <span className={cn(
                            "rounded px-1.5 py-0.5 text-xs font-medium",
                            active ? "bg-ink/10 text-ink" : "bg-ink/6 text-ink-muted",
                          )}>
                            {def.periodCount}×{def.periodLengthSeconds / 60} min
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            ) : isHandball ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Format</Label>
                  {!formatPickerOpen && (
                    <button
                      type="button"
                      onClick={() => setFormatPickerOpen(true)}
                      className="text-xs font-medium text-ink underline underline-offset-2"
                    >
                      Bytt format
                    </button>
                  )}
                </div>

                {!formatPickerOpen ? (
                  /* Compact summary */
                  <div className="flex items-center gap-3 rounded-lg border border-ink/15 bg-cream-dark px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream text-sm font-bold shrink-0">
                      {HANDBALL_FORMATS[handballFormat].playersOnCourt}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{HANDBALL_FORMATS[handballFormat].label}</p>
                      <p className="text-xs text-ink-muted">{HANDBALL_FORMATS[handballFormat].ageGroup}</p>
                    </div>
                  </div>
                ) : (
                  /* Full picker */
                  <div className="space-y-3">
                    {/* Progression indicator */}
                    <div className="flex items-center px-1">
                      {HANDBALL_FORMAT_ORDER.map((fmt, i) => {
                        const spec = HANDBALL_FORMATS[fmt];
                        const activeIdx = HANDBALL_FORMAT_ORDER.indexOf(handballFormat);
                        const isActive = fmt === handballFormat;
                        const isPast = i < activeIdx;
                        return (
                          <div key={fmt} className="flex flex-1 items-center">
                            <button
                              type="button"
                              onClick={() => selectHandballFormat(fmt)}
                              className="flex flex-col items-center gap-0.5 shrink-0"
                            >
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-colors",
                                isActive
                                  ? "border-ink bg-ink text-cream"
                                  : isPast
                                  ? "border-ink/50 bg-ink/10 text-ink/60"
                                  : "border-ink/20 bg-cream-dark text-ink-muted",
                              )}>
                                {spec.playersOnCourt}
                              </div>
                              <span className="text-[9px] leading-none text-ink-muted whitespace-nowrap">
                                {spec.ageGroup.split('–')[0]}+
                              </span>
                            </button>
                            {i < HANDBALL_FORMAT_ORDER.length - 1 && (
                              <div className={cn(
                                "flex-1 h-px mx-1 transition-colors",
                                i < activeIdx ? "bg-ink/40" : "bg-ink/15",
                              )} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* Format cards — one per format, full-width */}
                    <div className="flex flex-col gap-2">
                      {HANDBALL_FORMAT_ORDER.map((fmt) => (
                        <HandballFormatCard
                          key={fmt}
                          formatId={fmt}
                          active={handballFormat === fmt}
                          periodLengthSecs={periodLengthSecs}
                          onSelect={() => selectHandballFormat(fmt)}
                          onSelectTime={setPeriodLengthSecs}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setFormatPickerOpen(false)}
                      className="w-full text-center text-xs font-medium text-ink-muted py-1"
                    >
                      Skjul ↑
                    </button>
                  </div>
                )}

                {/* NHF rules overview link */}
                <p className="text-xs text-ink-muted leading-relaxed">
                  Reglene er definert av Norges Håndballforbund.{" "}
                  <a
                    href={HANDBALL_RULES_OVERVIEW}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink underline underline-offset-2"
                  >
                    Se alle bestemmelser →
                  </a>
                </p>
              </div>

            ) : isBasketball ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Format</Label>
                  {!basketballPickerOpen && (
                    <button
                      type="button"
                      onClick={() => setBasketballPickerOpen(true)}
                      className="text-xs font-medium text-ink underline underline-offset-2"
                    >
                      Bytt format
                    </button>
                  )}
                </div>

                {!basketballPickerOpen ? (
                  <div className="flex items-center gap-3 rounded-lg border border-ink/15 bg-cream-dark px-3 py-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-cream text-[11px] font-bold shrink-0 leading-tight text-center">
                      {BASKETBALL_FORMATS[basketballFormat].shortLabel}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold leading-tight">{BASKETBALL_FORMATS[basketballFormat].label}</p>
                      <p className="text-xs text-ink-muted">{BASKETBALL_FORMATS[basketballFormat].ageGroup}</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Progression indicator */}
                    <div className="flex items-center px-1">
                      {BASKETBALL_FORMAT_ORDER.map((fmt, i) => {
                        const spec = BASKETBALL_FORMATS[fmt];
                        const activeIdx = BASKETBALL_FORMAT_ORDER.indexOf(basketballFormat);
                        const isActive = fmt === basketballFormat;
                        const isPast = i < activeIdx;
                        return (
                          <div key={fmt} className="flex flex-1 items-center">
                            <button
                              type="button"
                              onClick={() => selectBasketballFormat(fmt)}
                              className="flex flex-col items-center gap-0.5 shrink-0"
                            >
                              <div className={cn(
                                "flex h-8 w-8 items-center justify-center rounded-full border-2 text-[10px] font-bold transition-colors",
                                isActive
                                  ? "border-ink bg-ink text-cream"
                                  : isPast
                                  ? "border-ink/50 bg-ink/10 text-ink/60"
                                  : "border-ink/20 bg-cream-dark text-ink-muted",
                              )}>
                                {spec.shortLabel}
                              </div>
                              <span className="text-[8px] leading-none text-ink-muted whitespace-nowrap mt-0.5">
                                {spec.ageGroup}
                              </span>
                            </button>
                            {i < BASKETBALL_FORMAT_ORDER.length - 1 && (
                              <div className={cn(
                                "flex-1 h-px mx-1 transition-colors",
                                i < activeIdx ? "bg-ink/40" : "bg-ink/15",
                              )} />
                            )}
                          </div>
                        );
                      })}
                    </div>

                    <div className="flex flex-col gap-2">
                      {BASKETBALL_FORMAT_ORDER.map((fmt) => (
                        <BasketballFormatCard
                          key={fmt}
                          formatId={fmt}
                          active={basketballFormat === fmt}
                          onSelect={() => selectBasketballFormat(fmt)}
                        />
                      ))}
                    </div>

                    <button
                      type="button"
                      onClick={() => setBasketballPickerOpen(false)}
                      className="w-full text-center text-xs font-medium text-ink-muted py-1"
                    >
                      Skjul ↑
                    </button>
                  </div>
                )}

                <p className="text-xs text-ink-muted leading-relaxed">
                  Reglene er definert av Norges Basketballforbund.{" "}
                  <a
                    href={BASKETBALL_RULES_OVERVIEW}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-medium text-ink underline underline-offset-2"
                  >
                    Se alle bestemmelser →
                  </a>
                </p>
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

            {/* Period length — hidden for handball and basketball (cards handle it) */}
            {!isHandball && !isBasketball && (
              <>
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
              </>
            )}

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
            {isBasketball && basketballFormat === 'easybasket' ? (
              <div className="flex w-full items-center justify-between rounded-md border border-ink/10 bg-cream-dark/50 px-3 py-3 opacity-60">
                <div>
                  <div className="text-sm font-medium text-ink">Tell mål</div>
                  <div className="text-xs text-ink-muted">Ikke tillatt i EasyBasket (NBBF-regler)</div>
                </div>
                <div className="relative h-6 w-11 shrink-0 rounded-full bg-ink/10">
                  <span className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white/70 shadow" />
                </div>
              </div>
            ) : (
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
            )}

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

        {/* Hockey line setup */}
        {isHockey && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <div className="flex items-center justify-between">
                <Label>Rekker</Label>
                <button type="button"
                  onClick={() => {
                    if (hockeyLines.length === 0) {
                      setHockeyLines(autoSplitLines(Array.from(selectedIds), 2));
                    }
                    setLineSetupOpen(true);
                  }}
                  className="text-xs font-medium text-ink underline underline-offset-2">
                  {hockeyLines.length > 0 ? "Endre rekker" : "Sett opp rekker"}
                </button>
              </div>
              {hockeyLines.length > 0 ? (
                <div className="space-y-1.5">
                  {hockeyLines.map(line => {
                    const names = line.playerIds
                      .map(id => players?.find(p => p.id === id))
                      .filter(Boolean)
                      .map(p => p!.name.split(" ")[0])
                      .join(", ");
                    return (
                      <div key={line.id}
                        className="flex items-baseline gap-2 rounded-lg border border-ink/10 bg-cream-dark px-3 py-2">
                        <span className="text-xs font-semibold text-ink-muted w-14 shrink-0">{line.name}</span>
                        <span className="text-sm text-ink truncate">{names || "—"}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-ink-muted">
                  Valgfritt. Gjør det enkelt å bytte en hel rekke under kampen.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <Button
          variant="accent"
          className="w-full"
          onClick={onStart}
          disabled={createMatch.isPending || selectedIds.size === 0 || (isCustomLength && !customMinutes)}
        >
          {createMatch.isPending ? "Starter …" : "Start kamp"}
        </Button>

      </div>

      {lineSetupOpen && players && (
        <HockeyLineSetupDialog
          players={players.filter(p => selectedIds.has(p.id)).map((p): LineSetupPlayer => ({
            id: p.id,
            name: p.name,
            jerseyNumber: p.jersey_number,
          }))}
          initialLines={hockeyLines}
          onSave={(lines) => { setHockeyLines(lines); setLineSetupOpen(false); }}
          onClose={() => setLineSetupOpen(false)}
        />
      )}
    </AppShell>
  );
}
