import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export function MatchLive() {
  const { matchId } = useParams<{ matchId: string }>();
  return (
    <AppShell title="Kamp" showBack>
      <Card>
        <CardContent className="flex flex-col gap-2 py-10 text-center">
          <p className="font-display text-2xl font-bold">Live kamp — kommer i neste sprint</p>
          <p className="text-sm text-ink-muted">
            Banegrafikk, klokke, dra-og-slipp mellom bane og benk, og spilletidssporing per spiller.
          </p>
          <p className="mt-2 text-xs text-ink-muted">Kamp-ID: {matchId}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
