import { useNavigate } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";
import { useSports } from "@/hooks/useSports";
import { cn } from "@/lib/utils";

const ICONS: Record<string, string> = {
  soccer: "⚽",
  handball: "🤾",
  basketball: "🏀",
  hockey: "🏒",
};

export function SportPicker() {
  const navigate = useNavigate();
  const { data: sports, isLoading } = useSports();

  return (
    <AppShell title="Velg idrett">
      <div className="mb-4">
        <p className="font-display text-3xl font-black leading-tight text-ink">
          Hva skal du<br />administrere i dag?
        </p>
        <p className="mt-1 text-sm text-ink-muted">
          Fotball er klar. Flere idretter kommer.
        </p>
      </div>

      {isLoading && <div className="text-ink-muted">Laster …</div>}

      <div className="grid grid-cols-2 gap-3">
        {sports?.map((s) => {
          const disabled = !s.is_active;
          return (
            <button
              key={s.id}
              disabled={disabled}
              onClick={() => navigate(`/sport/${s.id}/teams`)}
              className={cn(
                "text-left transition-transform",
                disabled ? "opacity-50" : "active:scale-[0.98]",
              )}
            >
              <Card className={cn(disabled && "pointer-events-none")}>
                <CardContent className="flex flex-col items-start gap-3 p-4">
                  <div className="text-4xl">{ICONS[s.id] ?? "🎯"}</div>
                  <div>
                    <div className="font-display text-xl font-bold text-ink">{s.name}</div>
                    <div className="text-xs text-ink-muted">
                      {disabled ? "Kommer snart" : "Aktiv"}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </button>
          );
        })}
      </div>
    </AppShell>
  );
}
