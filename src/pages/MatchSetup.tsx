import { useParams } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { Card, CardContent } from "@/components/ui/card";

export function MatchSetup() {
  const { teamId } = useParams<{ teamId: string }>();
  return (
    <AppShell title="Kampoppsett" showBack>
      <Card>
        <CardContent className="flex flex-col gap-2 py-10 text-center">
          <p className="font-display text-2xl font-bold">Kommer i neste sprint</p>
          <p className="text-sm text-ink-muted">
            Her velger du antall spillere på banen, omgangslengde og hvilke spillere som er med.
          </p>
          <p className="mt-2 text-xs text-ink-muted">Lag-ID: {teamId}</p>
        </CardContent>
      </Card>
    </AppShell>
  );
}
