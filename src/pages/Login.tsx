import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/providers/AuthProvider";
import { toast } from "@/components/ui/use-toast";

export function Login() {
  const { signInWithGoogle } = useAuth();
  const [loading, setLoading] = useState(false);

  async function onClick() {
    try {
      setLoading(true);
      await signInWithGoogle();
    } catch (err) {
      toast({
        title: "Innlogging feilet",
        description: err instanceof Error ? err.message : "Ukjent feil",
        variant: "error",
      });
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-dvh bg-cream text-ink"
      style={{ paddingTop: "env(safe-area-inset-top)", paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col items-center justify-center px-6">
        <div className="mb-2 inline-block rounded-full bg-accent px-3 py-1 font-display text-sm font-bold tracking-wide text-accent-ink">
          KIDS SPORT MANAGEMENT
        </div>
        <h1 className="mb-2 text-center font-display text-4xl font-black leading-tight text-ink">
          Hold orden på laget,<br />kampen og spilletida.
        </h1>
        <p className="mb-10 text-center text-base text-ink-muted">
          Logg inn for å begynne. Vi bruker Google-kontoen din — ingen ekstra passord.
        </p>
        <Button size="lg" variant="accent" onClick={onClick} disabled={loading} className="w-full">
          {loading ? "Åpner Google …" : "Logg inn med Google"}
        </Button>
        <p className="mt-8 text-center text-xs text-ink-muted">
          Ved å logge inn godtar du at appen lagrer lag-, spiller- og kampdata i din konto.
        </p>
      </div>
    </div>
  );
}
