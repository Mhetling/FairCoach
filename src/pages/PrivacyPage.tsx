import { Link } from "react-router-dom";

const CONTACT_EMAIL = "hetling@gmail.com";

export function PrivacyPage() {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link to="/" className="mb-8 inline-block text-sm text-ink-muted underline underline-offset-2">
          ← Tilbake
        </Link>

        <h1 className="font-display text-3xl font-black leading-tight">
          Personvernerklæring for FairCoach
        </h1>
        <p className="mt-1 text-sm text-ink-muted">Sist oppdatert: 20. mai 2026</p>

        <div className="mt-8 space-y-8">

          <Section title="1. Hvem behandler dataene">
            <p>
              Du som trener er behandlingsansvarlig for dataene i ditt lag. FairCoach er et
              verktøy du bruker på egne vegne — Anthropic er ikke involvert i behandlingen
              av dine data.
            </p>
            <p className="mt-2">
              For spørsmål om personvern, kontakt:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section title="2. Hvilke data lagres">
            <ul className="list-disc space-y-1 pl-5">
              <li>Trenerens e-postadresse (via Google-innlogging)</li>
              <li>Lagnavn</li>
              <li>Spillernes fornavn (eller fornavn + forbokstav)</li>
              <li>Valgfritt draktnummer og foretrukket posisjon</li>
              <li>Kampdata: spilletid, posisjoner og byttehistorikk</li>
            </ul>
          </Section>

          <Section title="3. Hvorfor lagres dataene">
            <p>
              Dataene brukes utelukkende for å sikre rettferdig fordeling av spilletid i
              barneidrett.
            </p>
            <p className="mt-2">
              Rettslig grunnlag: berettiget interesse (GDPR art. 6 nr. 1 bokstav f). Appen
              behandler minimumsdata for et åpenbart legitimt formål i barnets interesse.
            </p>
          </Section>

          <Section title="4. Hvor dataene lagres">
            <ul className="list-disc space-y-1 pl-5">
              <li>Supabase — PostgreSQL-database hostet i EU</li>
              <li>Google — håndterer innlogging</li>
              <li>Vercel — hosting av appen</li>
            </ul>
          </Section>

          <Section title="5. Hvor lenge lagres dataene">
            <p>
              Data lagres til du som trener selv sletter dem. Du oppfordres til å slette
              spillere som ikke lenger er aktive i laget.
            </p>
          </Section>

          <Section title="6. Hvem ser dataene">
            <p>
              Kun du som trener har tilgang til dine lag og spillere. Databasen er sikret
              med Row Level Security, som teknisk sett hindrer andre brukere i å se dine
              data.
            </p>
            <p className="mt-2">
              Ingen data deles med tredjepart utover hosting-leverandørene nevnt i punkt 4.
            </p>
          </Section>

          <Section title="7. Dine og foreldres rettigheter">
            <p>Du og barnas foresatte har rett til:</p>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Innsyn i hvilke data som er lagret</li>
              <li>Korrigering av feil opplysninger</li>
              <li>Sletting («rett til å bli glemt»)</li>
              <li>Dataportabilitet — eksport som JSON via Innstillinger-siden</li>
              <li>
                Klage til{" "}
                <a
                  href="https://www.datatilsynet.no"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline underline-offset-2"
                >
                  Datatilsynet
                </a>
              </li>
            </ul>
            <p className="mt-2">
              Kontakt for rettighetsforespørsler:{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="underline underline-offset-2">
                {CONTACT_EMAIL}
              </a>
            </p>
          </Section>

          <Section title="8. Trenerens ansvar">
            <p>
              Ved å bruke FairCoach bekrefter du som trener at foresatte er informert om at
              barnets fornavn og kampdata lagres i appen.
            </p>
            <p className="mt-2">
              Anbefalt praksis: nevn dette på første foreldremøte eller i sesongstart-informasjonen.
            </p>
          </Section>

          <Section title="9. Informasjonskapsler og sporing">
            <p>
              Appen bruker kun tekniske informasjonskapsler som er nødvendige for
              innlogging. Det benyttes ingen analyse, sporing eller reklame.
            </p>
          </Section>

          <Section title="10. Endringer i erklæringen">
            <p>
              Vesentlige endringer i denne erklæringen varsles via appen ved neste
              innlogging.
            </p>
          </Section>

        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-lg font-bold">{title}</h2>
      <div className="mt-2 text-sm leading-relaxed text-ink/80">{children}</div>
    </section>
  );
}
