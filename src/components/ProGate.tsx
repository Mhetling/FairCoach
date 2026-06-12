import { Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { ReactNode } from "react";
import { useGate } from "@/hooks/useGate";
import { FEATURE_LABELS, FEATURE_DESCRIPTIONS } from "@/lib/gates";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Feature } from "@/types/database";

interface ProGateProps {
  feature: Feature;
  /** true = full-page lock (for MatchHistory, SeasonStats) */
  fullPage?: boolean;
  children?: ReactNode;
}

function LockCard({ feature, className }: { feature: Feature; className?: string }) {
  const navigate = useNavigate();
  return (
    <div className={cn("flex flex-col items-center gap-4 rounded-2xl border border-ink/10 bg-cream-dark p-8 text-center", className)}>
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ink/8">
        <Lock className="h-6 w-6 text-ink-muted" />
      </div>
      <div className="space-y-1">
        <p className="font-display text-lg font-bold text-ink">{FEATURE_LABELS[feature]}</p>
        <p className="text-sm text-ink-muted">{FEATURE_DESCRIPTIONS[feature]}</p>
      </div>
      <Button variant="accent" onClick={() => navigate("/upgrade")}>
        Oppgrader til Pro
      </Button>
    </div>
  );
}

export function ProGate({ feature, fullPage = false, children }: ProGateProps) {
  const gate = useGate(feature);

  if (gate.loading || gate.allowed) {
    return <>{children}</>;
  }

  if (fullPage) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-6">
        <LockCard feature={feature} className="w-full max-w-sm" />
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-30">{children}</div>
      <div className="absolute inset-0 flex items-center justify-center bg-cream/70 backdrop-blur-[2px]">
        <LockCard feature={feature} />
      </div>
    </div>
  );
}
