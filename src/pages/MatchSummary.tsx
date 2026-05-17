import { forwardRef, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import html2canvas from "html2canvas";
import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  useMatchDetail,
  useMatchEvents,
  useUpdateMatchSummary,
  type RichMatchEvent,
  type RichMatchPlayer,
} from "@/hooks/useMatch";
import type { Match } from "@/types/database";

// ─── Utilities ────────────────────────────────────────────────────────────────

function fmtTime(s: number) {
  const abs = Math.max(0, s);
  return `${Math.floor(abs / 60).toString().padStart(2, "0")}:${(abs % 60).toString().padStart(2, "0")}`;
}

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("nb-NO", { day: "numeric", month: "short", year: "numeric" })
    .format(new Date(iso));
}

type FPColor = "blue" | "green" | "yellow" | "red";

const FP_DOT: Record<FPColor, string> = {
  blue: "bg-blue-500", green: "bg-green-500", yellow: "bg-yellow-400", red: "bg-red-500",
};
const FP_HEX: Record<FPColor, string> = {
  blue: "#3b82f6", green: "#22c55e", yellow: "#facc15", red: "#ef4444",
};
const FP_LABEL: Record<FPColor, string> = {
  blue: "Mye", green: "Balansert", yellow: "Litt under", red: "Mye under",
};

function calcFP(play: number, elapsed: number, onField: number, total: number): FPColor {
  if (elapsed === 0 || total === 0) return "green";
  const ratio = play / ((elapsed * onField) / total);
  if (ratio > 1.1) return "blue";
  if (ratio >= 0.9) return "green";
  if (ratio >= 0.6) return "yellow";
  return "red";
}

type GoalMeta = { team?: string; assist_player_id?: string } | null;

function playerLabel(p: { jersey_number: number | null; name: string } | null | undefined): string {
  if (!p) return "Ukjent";
  return p.jersey_number != null
    ? `#${p.jersey_number} ${p.name.split(" ")[0]}`
    : p.name.split(" ")[0];
}

// ─── Score input ──────────────────────────────────────────────────────────────

function ScoreInput({ label, value, onChange }: {
  label: string; value: number | null; onChange: (v: number | null) => void;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <span className="text-sm text-ink-muted">{label}</span>
      <div className="flex items-center gap-2">
        <button type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 text-xl font-bold text-ink active:bg-ink/5"
          onClick={() => onChange(Math.max(0, (value ?? 0) - 1))}>−</button>
        <span className="w-10 text-center font-display text-4xl font-bold tabular-nums text-ink">
          {value ?? 0}
        </span>
        <button type="button"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-ink/20 text-xl font-bold text-ink active:bg-ink/5"
          onClick={() => onChange((value ?? 0) + 1)}>+</button>
      </div>
    </div>
  );
}

// ─── Play time bar ────────────────────────────────────────────────────────────

function PlayBar({ seconds, max }: { seconds: number; max: number }) {
  const pct = max > 0 ? Math.round((seconds / max) * 100) : 0;
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10">
      <div className="h-full rounded-full bg-ink/40 transition-all" style={{ width: `${pct}%` }} />
    </div>
  );
}

// ─── Goals section ────────────────────────────────────────────────────────────

function GoalList({ events, opponent, players }: {
  events: RichMatchEvent[];
  opponent: string | null;
  players: RichMatchPlayer[];
}) {
  const goals = events
    .filter((e) => e.event_type === "goal")
    .sort((a, b) => a.at_seconds - b.at_seconds);

  if (goals.length === 0) return <p className="text-sm text-ink-muted">Ingen mål registrert.</p>;

  return (
    <div className="flex flex-col gap-3">
      {goals.map((g) => {
        const meta = g.meta as GoalMeta;
        const isHome = meta?.team === "home";
        const assistPlayer = meta?.assist_player_id
          ? players.find((p) => p.player_id === meta!.assist_player_id)?.player
          : null;
        return (
          <div key={g.id} className="flex items-start gap-3 text-sm">
            <span className="mt-0.5 w-12 shrink-0 text-xs font-semibold tabular-nums text-ink-muted">
              {fmtTime(g.at_seconds)}
            </span>
            <span className="mt-0.5 text-base leading-none">⚽</span>
            <div className="flex-1">
              <span className="font-medium text-ink">
                {isHome ? playerLabel(g.player) : (opponent ?? "Motstander")}
              </span>
              {isHome && assistPlayer && (
                <div className="mt-0.5 text-xs text-ink-muted">
                  assist: {playerLabel(assistPlayer)}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Substitution timeline ────────────────────────────────────────────────────

function SubTimeline({ events }: { events: RichMatchEvent[] }) {
  const byTime: Record<number, { on: RichMatchEvent | null; off: RichMatchEvent | null }> = {};
  for (const ev of events) {
    const bucket = (byTime[ev.at_seconds] ??= { on: null, off: null });
    if (ev.event_type === "on") bucket.on = ev;
    else if (ev.event_type === "off") bucket.off = ev;
  }
  const subs = Object.entries(byTime)
    .map(([t, b]) => ({ at: Number(t), ...b }))
    .filter((s) => s.on && s.off)
    .sort((a, b) => a.at - b.at);

  if (subs.length === 0) return <p className="text-sm text-ink-muted">Ingen bytter registrert.</p>;

  return (
    <div className="flex flex-col gap-2">
      {subs.map((s) => (
        <div key={s.at} className="flex items-center gap-3 text-sm">
          <span className="w-12 shrink-0 text-xs font-semibold tabular-nums text-ink-muted">
            {fmtTime(s.at)}
          </span>
          <span className="flex items-center gap-1 font-medium text-green-700">
            <span>↑</span>{playerLabel(s.on?.player)}
          </span>
          <span className="text-ink/30">·</span>
          <span className="flex items-center gap-1 font-medium text-red-600">
            <span>↓</span>{playerLabel(s.off?.player)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Share card (PDF-style one-pager) ─────────────────────────────────────────

const ShareCard = forwardRef<HTMLDivElement, {
  match: Match;
  players: RichMatchPlayer[];
  events: RichMatchEvent[];
  scoreHome: number | null;
  scoreAway: number | null;
  notes: string;
}>(({ match, players, events, scoreHome, scoreAway, notes }, ref) => {
  const sorted = [...players].sort((a, b) => b.total_play_seconds - a.total_play_seconds);
  const maxSec = Math.max(sorted[0]?.total_play_seconds ?? 1, 1);
  const elapsed = match.elapsed_seconds;
  const nField = match.players_on_field;
  const total = players.length;
  const hasScore = scoreHome != null && scoreAway != null;
  const minPer = match.period_length_seconds / 60;

  const goals = events.filter((e) => e.event_type === "goal").sort((a, b) => a.at_seconds - b.at_seconds);
  const byTime: Record<number, { on: RichMatchEvent | null; off: RichMatchEvent | null }> = {};
  for (const ev of events) {
    if (ev.event_type !== "on" && ev.event_type !== "off") continue;
    const bucket = (byTime[ev.at_seconds] ??= { on: null, off: null });
    if (ev.event_type === "on") bucket.on = ev;
    else bucket.off = ev;
  }
  const subs = Object.entries(byTime)
    .map(([t, b]) => ({ at: Number(t), ...b }))
    .filter((s) => s.on && s.off)
    .sort((a, b) => a.at - b.at);

  // Colors — all solid, no CSS variables
  const C = {
    bg:       "#F8F5EF",
    header:   "#171717",
    text:     "#171717",
    muted:    "#6b7280",
    dim:      "#e5dfd4",
    barBg:    "#e5dfd4",
    barFill:  "#9ca3af",
    cream:    "#FAF6EE",
    label:    "#9ca3af",
  };

  const sec = (label: string) => (
    <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase" as const, color: C.label, marginBottom: 10 }}>
      {label}
    </div>
  );
  const divider = <div style={{ height: 1, background: C.dim, margin: "16px 0" }} />;

  return (
    <div ref={ref} style={{
      position: "fixed", left: -9999, top: 0,
      width: 500,
      background: C.bg,
      fontFamily: "Inter, system-ui, sans-serif",
      color: C.text,
      boxSizing: "border-box",
      overflow: "hidden",
    }}>
      {/* Dark header band */}
      <div style={{ background: C.header, padding: "24px 24px 20px", color: C.cream }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 3, textTransform: "uppercase" as const, color: "rgba(250,246,238,0.45)", marginBottom: 8 }}>
          FairCoach
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: C.cream }}>
              {match.opponent ? `vs ${match.opponent}` : "Kamp"}
            </div>
            <div style={{ fontSize: 12, color: "rgba(250,246,238,0.5)", marginTop: 4 }}>
              {fmtDate(match.created_at)} · {match.players_on_field}er · {match.period_count}×{minPer} min
              {match.formation ? ` · ${match.formation}` : ""}
            </div>
          </div>
          {hasScore && (
            <div style={{ background: "rgba(255,255,255,0.1)", borderRadius: 10, padding: "8px 16px", textAlign: "center", flexShrink: 0, marginLeft: 16 }}>
              <div style={{ fontSize: 9, color: "rgba(250,246,238,0.45)", marginBottom: 3 }}>RESULTAT</div>
              <div style={{ fontSize: 28, fontWeight: 700, color: C.cream, lineHeight: 1, letterSpacing: -1 }}>
                {scoreHome} – {scoreAway}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: "20px 24px 24px" }}>

        {/* Goals */}
        {goals.length > 0 && (
          <>
            {sec("Mål")}
            {goals.map((g) => {
              const meta = g.meta as GoalMeta;
              const isHome = meta?.team === "home";
              const assistPlayer = meta?.assist_player_id
                ? players.find((p) => p.player_id === meta!.assist_player_id)?.player
                : null;
              return (
                <div key={g.id} style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 8 }}>
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: C.muted, flexShrink: 0, marginTop: 1, minWidth: 38 }}>
                    {fmtTime(g.at_seconds)}
                  </span>
                  <span style={{ fontSize: 13, flexShrink: 0 }}>⚽</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                      {isHome ? playerLabel(g.player) : (match.opponent ?? "Motstander")}
                    </div>
                    {isHome && assistPlayer && (
                      <div style={{ fontSize: 11, color: C.muted, marginTop: 1 }}>
                        assist: {playerLabel(assistPlayer)}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
            {divider}
          </>
        )}

        {/* Play time */}
        {sec("Spilletid")}
        {sorted.map((mp) => {
          const fp = calcFP(mp.total_play_seconds, elapsed, nField, total);
          const pct = Math.round((mp.total_play_seconds / maxSec) * 100);
          const label = mp.player.jersey_number != null
            ? `#${mp.player.jersey_number} ${mp.player.name}`
            : mp.player.name;
          return (
            <div key={mp.player_id} style={{ marginBottom: 9 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: FP_HEX[fp], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {label}
                </span>
                <span style={{ fontSize: 11, fontFamily: "monospace", color: C.muted, flexShrink: 0, marginRight: 6 }}>
                  {fmtTime(mp.total_play_seconds)}
                </span>
                <span style={{ fontSize: 10, color: C.label, flexShrink: 0, minWidth: 60, textAlign: "right" as const }}>
                  {FP_LABEL[fp]}
                </span>
              </div>
              <div style={{ height: 3, background: C.barBg, borderRadius: 2 }}>
                <div style={{ height: "100%", width: `${pct}%`, background: C.barFill, borderRadius: 2 }} />
              </div>
            </div>
          );
        })}

        {/* Subs */}
        {subs.length > 0 && (
          <>
            {divider}
            {sec("Bytter")}
            {subs.map((s) => (
              <div key={s.at} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, fontSize: 12 }}>
                <span style={{ fontFamily: "monospace", color: C.muted, flexShrink: 0, minWidth: 38 }}>
                  {fmtTime(s.at)}
                </span>
                <span style={{ color: "#16a34a", fontWeight: 600 }}>↑ {playerLabel(s.on?.player)}</span>
                <span style={{ color: C.label }}>·</span>
                <span style={{ color: "#dc2626", fontWeight: 600 }}>↓ {playerLabel(s.off?.player)}</span>
              </div>
            ))}
          </>
        )}

        {/* Notes */}
        {notes.trim() && (
          <>
            {divider}
            {sec("Notat")}
            <div style={{ fontSize: 12, color: C.text, lineHeight: 1.6, whiteSpace: "pre-wrap" as const }}>
              {notes.trim()}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 24, paddingTop: 12, borderTop: `1px solid ${C.dim}`, fontSize: 10, color: C.label, textAlign: "center" as const }}>
          Laget med FairCoach
        </div>
      </div>
    </div>
  );
});
ShareCard.displayName = "ShareCard";

// ─── Copy text ────────────────────────────────────────────────────────────────

function buildCopyText({ opponent, scoreHome, scoreAway, players, events, elapsed, onField }: {
  opponent: string | null; scoreHome: number | null; scoreAway: number | null;
  players: RichMatchPlayer[]; events: RichMatchEvent[]; elapsed: number; onField: number;
}) {
  const header = opponent ? `Kamp mot ${opponent}` : "Kamp";
  const score = scoreHome != null && scoreAway != null ? `Resultat: ${scoreHome}–${scoreAway}` : "";
  const total = players.length;

  const goals = events.filter((e) => e.event_type === "goal").sort((a, b) => a.at_seconds - b.at_seconds);
  const goalRows = goals.map((g) => {
    const meta = g.meta as GoalMeta;
    const isHome = meta?.team === "home";
    const scorer = isHome ? playerLabel(g.player) : (opponent ?? "Motstander");
    const assistPlayer = meta?.assist_player_id
      ? players.find((p) => p.player_id === meta!.assist_player_id)?.player
      : null;
    const assist = assistPlayer ? ` (assist: ${playerLabel(assistPlayer)})` : "";
    return `⚽ ${fmtTime(g.at_seconds)}  ${scorer}${assist}`;
  });

  const playRows = [...players]
    .sort((a, b) => b.total_play_seconds - a.total_play_seconds)
    .map((p) => {
      const fp = calcFP(p.total_play_seconds, elapsed, onField, total);
      const dot = { blue: "🔵", green: "🟢", yellow: "🟡", red: "🔴" }[fp];
      return `${dot} ${p.player.name}: ${fmtTime(p.total_play_seconds)}`;
    });

  return [
    header, score, "",
    ...(goalRows.length ? ["Mål:", ...goalRows, ""] : []),
    "Spilletid:", ...playRows,
  ].filter(Boolean).join("\n");
}

// ─── Main page ────────────────────────────────────────────────────────────────

export function MatchSummary() {
  const { matchId } = useParams<{ matchId: string }>();
  const navigate = useNavigate();
  const { data, isLoading } = useMatchDetail(matchId);
  const { data: events = [] } = useMatchEvents(matchId);
  const updateSummary = useUpdateMatchSummary(matchId);

  const shareCardRef = useRef<HTMLDivElement>(null);
  const [scoreHome, setScoreHome] = useState<number | null>(null);
  const [scoreAway, setScoreAway] = useState<number | null>(null);
  const [notes, setNotes] = useState("");
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [sharing, setSharing] = useState(false);

  useEffect(() => {
    if (!data) return;
    setScoreHome(data.match.score_home ?? null);
    setScoreAway(data.match.score_away ?? null);
    setNotes(data.match.notes ?? "");
  }, [data?.match.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading || !data) {
    return (
      <AppShell title="Oppsummering" showBack>
        <div className="text-ink-muted">Laster …</div>
      </AppShell>
    );
  }

  const { match, players } = data;
  const sorted = [...players].sort((a, b) => b.total_play_seconds - a.total_play_seconds);
  const maxSeconds = sorted[0]?.total_play_seconds ?? 0;
  const total = players.length;
  const elapsed = match.elapsed_seconds;
  const onField = match.players_on_field;
  const title = match.opponent ? `vs ${match.opponent}` : "Kamp avsluttet";

  async function handleSave() {
    try {
      await updateSummary.mutateAsync({
        score_home: scoreHome,
        score_away: scoreAway,
        notes: notes.trim() || null,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error("Save error:", err);
      const msg = err instanceof Error ? err.message
        : typeof err === "object" && err !== null && "message" in err
          ? String((err as { message: unknown }).message) : JSON.stringify(err);
      toast({ title: "Kunne ikke lagre", description: msg, variant: "error" });
    }
  }

  async function handleCopy() {
    const text = buildCopyText({ opponent: match.opponent, scoreHome, scoreAway, players, events, elapsed, onField });
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast({ title: "Kopiering feilet", variant: "error" });
    }
  }

  async function handleShare() {
    const el = shareCardRef.current;
    if (!el) return;
    setSharing(true);
    try {
      await document.fonts.ready;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#F8F5EF", logging: false });
      canvas.toBlob(async (blob) => {
        if (!blob) { setSharing(false); return; }
        const file = new File([blob], "kampoppsummering.png", { type: "image/png" });
        if (navigator.canShare?.({ files: [file] })) {
          await navigator.share({ files: [file], title });
        } else {
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url; a.download = "kampoppsummering.png"; a.click();
          URL.revokeObjectURL(url);
        }
        setSharing(false);
      }, "image/png");
    } catch (err) {
      console.error("Share error:", err);
      toast({ title: "Deling feilet", variant: "error" });
      setSharing(false);
    }
  }

  return (
    <AppShell title={title} showBack>

      <ShareCard
        ref={shareCardRef}
        match={match}
        players={players}
        events={events}
        scoreHome={scoreHome}
        scoreAway={scoreAway}
        notes={notes}
      />

      <div className="flex flex-col gap-4">

        {match.track_goals && (
          <Card>
            <CardContent className="py-4">
              <Label className="mb-3 block">Resultat</Label>
              <div className="flex items-center justify-center gap-6">
                <ScoreInput label="Vi" value={scoreHome} onChange={setScoreHome} />
                <span className="font-display text-3xl font-bold text-ink/30">–</span>
                <ScoreInput label={match.opponent ?? "Motstander"} value={scoreAway} onChange={setScoreAway} />
              </div>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4">
            <Label className="mb-3 block">Spilletid</Label>
            <div className="flex flex-col gap-3">
              {sorted.map((mp) => {
                const fp = calcFP(mp.total_play_seconds, elapsed, onField, total);
                return (
                  <div key={mp.player_id}>
                    <div className="mb-1 flex items-center gap-2">
                      <div className={cn("h-2.5 w-2.5 shrink-0 rounded-full", FP_DOT[fp])} />
                      <span className="flex-1 truncate text-sm font-medium text-ink">
                        {mp.player.jersey_number != null ? `#${mp.player.jersey_number} ${mp.player.name}` : mp.player.name}
                      </span>
                      <span className="shrink-0 text-sm tabular-nums text-ink-muted">{fmtTime(mp.total_play_seconds)}</span>
                      <span className="w-16 shrink-0 text-right text-xs text-ink/40">{FP_LABEL[fp]}</span>
                    </div>
                    <PlayBar seconds={mp.total_play_seconds} max={maxSeconds} />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {match.track_goals && (
          <Card>
            <CardContent className="py-4">
              <Label className="mb-3 block">Mål</Label>
              <GoalList events={events} opponent={match.opponent} players={players} />
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="py-4">
            <Label className="mb-3 block">Bytter</Label>
            <SubTimeline events={events} />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="py-4">
            <Label htmlFor="notes" className="mb-2 block">Notat</Label>
            <textarea
              id="notes" rows={4} value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Taktiske observasjoner, hva fungerte bra, hva bør øves på …"
              className="w-full resize-none rounded-md border border-ink/20 bg-cream-dark px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-ink/30"
            />
          </CardContent>
        </Card>

        <div className="flex gap-2">
          <Button variant="accent" className="flex-1" onClick={handleSave} disabled={updateSummary.isPending}>
            {saved ? "Lagret ✓" : updateSummary.isPending ? "Lagrer …" : "Lagre"}
          </Button>
          <Button variant="outline" className="flex-1" onClick={handleCopy}>
            {copied ? "Kopiert ✓" : "Kopier tekst"}
          </Button>
        </div>

        <Button variant="primary" className="w-full" onClick={handleShare} disabled={sharing}>
          {sharing ? "Genererer bilde …" : "Del oppsummering som bilde"}
        </Button>

        <Button variant="ghost" className="w-full" onClick={() => navigate(`/teams/${match.team_id}`)}>
          Tilbake til lag
        </Button>

      </div>
    </AppShell>
  );
}
