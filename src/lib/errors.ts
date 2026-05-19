import type { AuthError, PostgrestError } from "@supabase/supabase-js";

type SupabaseError = PostgrestError | AuthError | Error | unknown;

export function getDisplayError(error: SupabaseError): string {
  if (!error) return "Noe gikk galt. Prøv igjen, eller kontakt support.";

  const code =
    (error as PostgrestError).code ??
    (error as AuthError & { status?: number }).status?.toString();

  const message =
    typeof (error as Error).message === "string"
      ? (error as Error).message.toLowerCase()
      : "";

  // Auth errors
  if (
    message.includes("invalid login") ||
    message.includes("invalid credentials") ||
    message.includes("email not confirmed") ||
    message.includes("oauth") ||
    code === "invalid_credentials"
  ) {
    return "Innlogging feilet. Prøv igjen.";
  }

  // RLS / permission errors
  if (
    code === "42501" ||
    message.includes("row-level security") ||
    message.includes("permission denied") ||
    message.includes("insufficient privilege")
  ) {
    return "Du har ikke tilgang til denne ressursen.";
  }

  // Not found
  if (code === "PGRST116" || message.includes("no rows")) {
    return "Ressursen ble ikke funnet.";
  }

  // Unique constraint
  if (code === "23505" || message.includes("duplicate") || message.includes("unique")) {
    return "Dette finnes allerede. Prøv et annet navn.";
  }

  // Foreign key constraint
  if (code === "23503") {
    return "Kan ikke slette — andre data er koblet til denne ressursen.";
  }

  // Network / fetch errors
  if (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("networkerror") ||
    message.includes("timeout")
  ) {
    return "Nettverksfeil. Sjekk internett-tilkoblingen og prøv igjen.";
  }

  return "Noe gikk galt. Prøv igjen, eller kontakt support.";
}
