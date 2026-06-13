import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Renders a screenshot image with graceful fallback — returns null if file is missing. */
function Screenshot({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [ok, setOk] = useState(true);
  if (!ok) return null;
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setOk(false)}
      className={cn(
        "rounded-[22px] border border-black/8 object-contain shadow-xl",
        className,
      )}
    />
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-accent px-3 py-1 font-display text-sm font-bold tracking-wide text-accent-ink">
      {children}
    </span>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-3 text-xs font-bold uppercase tracking-widest text-ink-muted">{children}</p>
  );
}

function SectionHeading({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("font-display text-3xl font-bold leading-tight text-ink sm:text-4xl", className)}>
      {children}
    </h2>
  );
}

const APP_PATH = "/app";

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  return (
    <nav
      className={cn(
        "sticky top-0 z-40 transition-shadow",
        scrolled
          ? "border-b border-ink/10 bg-cream/90 backdrop-blur-md shadow-sm"
          : "bg-cream/0",
      )}
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link to="/" className="font-display text-xl font-bold text-ink">
          FairCoach
        </Link>
        <div className="flex items-center gap-3">
          <a
            href="#priser"
            className="hidden text-sm font-medium text-ink-muted hover:text-ink sm:block"
          >
            Priser
          </a>
          <Link
            to={APP_PATH}
            className="rounded-full bg-accent px-4 py-2 text-sm font-bold text-accent-ink transition-opacity hover:opacity-90 active:opacity-75"
          >
            Åpne appen
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="mx-auto max-w-5xl px-5 pb-16 pt-12 sm:pt-20">
      <div className="flex flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
        <div className="flex-1 text-center lg:text-left">
          <div className="mb-4 flex justify-center lg:justify-start">
            <Badge>Gratis for trenere</Badge>
          </div>
          <h1 className="mb-5 font-display text-4xl font-black leading-tight text-ink sm:text-5xl lg:text-6xl">
            Kampdagen,<br className="hidden sm:block" /> uten kaoset.
          </h1>
          <p className="mx-auto mb-8 max-w-lg text-base leading-relaxed text-ink-muted lg:mx-0 lg:text-lg">
            FairCoach holder styr på bytter og spilletid, så hovedtreneren kan bruke kampen på det
            som teller — se alle spillerne, gi ros, og lede laget. En hjelpetrener eller forelder
            styrer byttene i appen.
          </p>
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center lg:justify-start">
            <Link
              to={APP_PATH}
              className="w-full rounded-full bg-accent px-7 py-3.5 text-center text-base font-bold text-accent-ink transition-opacity hover:opacity-90 active:opacity-75 sm:w-auto"
            >
              Kom i gang gratis
            </Link>
            <a
              href="#slik-funker-det"
              className="w-full rounded-full border border-ink/20 bg-cream-dark px-7 py-3.5 text-center text-base font-semibold text-ink transition-colors hover:bg-ink/5 sm:w-auto"
            >
              Se hvordan det funker
            </a>
          </div>
          <p className="mt-4 text-xs text-ink-muted">
            Fungerer i nettleseren på iPhone og Android — ingen app-nedlasting nødvendig.
            Legg til på hjemskjermen for app-følelsen.
          </p>
        </div>
        <div className="flex w-full max-w-[300px] shrink-0 justify-center lg:max-w-[340px]">
          <Screenshot
            src="/landing/hero-live.PNG"
            alt="Live kampvisning med fargekodet spilletid"
            className="w-full"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Slik funker det ──────────────────────────────────────────────────────────

function HowItWorks() {
  const steps = [
    {
      number: "1",
      title: "Før kampen",
      text: "Velg format, omgangslengde og spillere. FairCoach kan reglene for fotball, håndball, basket og ishockey — hentet fra forbundene selv.",
      img: "/landing/oppsett.PNG",
      alt: "Kampoppsett med spillervalg og format",
    },
    {
      number: "2",
      title: "Under kampen",
      text: "Dra og slipp for å bytte. Fargene viser live hvem som har spilt mye og hvem som har spilt lite.",
      img: "/landing/live-bytte.PNG",
      alt: "Live banevisning med drag-og-slipp-bytter",
    },
    {
      number: "3",
      title: "Etter kampen",
      text: "Se nøyaktig hvor mye hver enkelt spilte, full bytteoversikt, og del en ryddig oppsummering med foreldrene.",
      img: "/landing/oppsummering.PNG",
      alt: "Oppsummering med spilletidsoversikt per spiller",
    },
  ];

  return (
    <section
      id="slik-funker-det"
      className="bg-cream-dark py-16 sm:py-24"
    >
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-12 text-center">
          <SectionLabel>Tre steg</SectionLabel>
          <SectionHeading>Fra oppstilling til oppsummering</SectionHeading>
        </div>
        <div className="grid gap-8 sm:grid-cols-3">
          {steps.map((s) => (
            <div key={s.number} className="flex flex-col gap-5 rounded-card bg-cream p-6 shadow-card">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent font-display text-sm font-black text-accent-ink">
                {s.number}
              </div>
              <div>
                <h3 className="mb-1 font-display text-xl font-bold text-ink">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-muted">{s.text}</p>
              </div>
              <div className="mt-auto flex justify-center pt-2">
                <Screenshot
                  src={s.img}
                  alt={s.alt}
                  className="w-full max-w-[220px]"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── La treneren være trener ──────────────────────────────────────────────────

function CoachSection() {
  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-16">
        <div className="flex-1 space-y-5">
          <SectionHeading>La treneren være trener</SectionHeading>
          <p className="leading-relaxed text-ink-muted">
            På kampdagen skjer alt på én gang. Hvem byttet sist? Hvem har spilt mest? Var det hennes
            tur, eller en annens? Det blir fort surr, og oversikten ryker.
          </p>
          <p className="leading-relaxed text-ink-muted">
            FairCoach tar seg av det. Mens hovedtreneren coacher, ser hver enkelt og gir ros, kan en
            hjelpetrener eller forelder styre byttene i appen. Da slipper treneren å holde alt i
            hodet — og kan bruke oppmerksomheten der den hører hjemme: hos spillerne.
          </p>
          <p className="leading-relaxed text-ink-muted">
            Og når kampen er over, ser du faktisk hvor mye hver enkelt fikk spille. Ikke for at alt
            må være helt likt — men fordi det er lett å miste tråden i kampens hete, og lett å la de
            beste bli stående litt for lenge. Med oversikten på plass kan du justere, forklare, og
            notere hvis noe ble skjevt.
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-col">
          <Screenshot
            src="/landing/bytter.PNG"
            alt="Byttelogg med tidsstempel"
            className="w-full max-w-[220px]"
          />
          <Screenshot
            src="/landing/oppsummering.PNG"
            alt="Oppsummering med spilletid per spiller"
            className="w-full max-w-[220px]"
          />
        </div>
      </div>
    </section>
  );
}

// ─── Spotlight row ────────────────────────────────────────────────────────────

function Spotlight({
  title,
  text,
  imgSrc,
  imgAlt,
  reverse = false,
}: {
  title: string;
  text: string;
  imgSrc: string;
  imgAlt: string;
  reverse?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-10 py-10 lg:flex-row lg:gap-16",
        reverse && "lg:flex-row-reverse",
      )}
    >
      <div className="flex w-full shrink-0 justify-center lg:w-auto">
        <Screenshot
          src={imgSrc}
          alt={imgAlt}
          className="w-full max-w-[260px]"
        />
      </div>
      <div className="flex-1">
        <h3 className="mb-3 font-display text-2xl font-bold text-ink">{title}</h3>
        <p className="leading-relaxed text-ink-muted">{text}</p>
      </div>
    </div>
  );
}

// ─── Features ─────────────────────────────────────────────────────────────────

function Features() {
  const spotlights = [
    {
      title: "Visuell banevisning med fargekodet spilletid",
      text: "Se hele laget på banen i sanntid. Hver spiller er fargekodet etter hvor mye de har spilt: blå = mye, grønn = balansert, gul = litt under, rød = mye under. Keeper telles for seg.",
      img: "/landing/live-bytte.PNG",
      alt: "Fargekodet banevisning med spillere",
    },
    {
      title: "Spillerstatus og notater",
      text: "Trykk på en spiller for å sette status — skadet, ville ikke spille, foreldreavtale eller utvist — skrive et kort notat, og justere spilletiden manuelt hvis noe må korrigeres.",
      img: "/landing/spiller-info.PNG",
      alt: "Spillerkort med status, notat og spilletidsjustering",
    },
    {
      title: "Mål og assist",
      text: "Registrer målscorer og assist underveis, så oppsummeringen blir komplett.",
      img: "/landing/mal-registrering.PNG",
      alt: "Velg målscorer og assist",
    },
    {
      title: "Juster klokka",
      text: "Glemte du å starte eller stoppe? Rett opp klokka raskt uten å miste oversikten.",
      img: "/landing/juster-klokka.PNG",
      alt: "Juster kampklokka underveis",
    },
    {
      title: "Byttelogg med tidsstempel",
      text: "Hvert eneste bytte logges med tid — inn og ut — så du alltid kan se hva som skjedde og når.",
      img: "/landing/bytter.PNG",
      alt: "Byttelogg med tidsstempel for inn og ut",
    },
    {
      title: "Oppsummering med posisjonsfordeling",
      text: "Etter kampen ser du nøyaktig spilletid per spiller, hvor de spilte (back, midt, keeper), og en fargekodet status på hvor jevnt det ble.",
      img: "/landing/oppsummering.PNG",
      alt: "Oppsummering med posisjonsfordeling og spilletid",
    },
  ];

  const gridFeatures: Array<{ title: string; text: string; img: string | null; imgAlt?: string }> = [
    {
      title: "Kampnotat",
      text: "Skriv taktiske observasjoner: hva fungerte, hva bør øves på.",
      img: null,
    },
    {
      title: "Del som bilde",
      text: "Eksportér en pen oppsummering, eller kopier som tekst.",
      img: "/landing/del-bilde.PNG",
      imgAlt: "Del oppsummering som bilde",
    },
    {
      title: "Forbundsriktige regler",
      text: "Formater og omgangslengder fra NFF, NHF, NBBF og NIHF, tilpasset alderstrinn.",
      img: "/landing/forbundsregler.PNG",
      imgAlt: "Kampoppsett med forbundsformater",
    },
    {
      title: "Flere lag på én konto",
      text: "Administrer alle lagene dine ett sted.",
      img: "/landing/multisport.PNG",
      imgAlt: "Mine lag med fire idretter",
    },
    {
      title: "Sett opp rekker (ishockey)",
      text: "Bygg rekker og linjer på forhånd, så bytter går kjapt og riktig i kampens hete.",
      img: "/landing/hockey-rekker.PNG",
      imgAlt: "Ishockey rekkeoppsett",
    },
    {
      title: "Sanntidssynk",
      text: "Endringer oppdateres på alle enheter umiddelbart, så hovedtrener og hjelpetrener ser det samme.",
      img: null,
    },
    {
      title: "Personvern først",
      text: "Kun fornavn, innlogging med Google, ingen app store nødvendig, og en GDPR-vennlig løsning.",
      img: null,
    },
  ];

  return (
    <section className="bg-cream-dark py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-4 text-center">
          <SectionHeading>Alt du trenger på kampdagen</SectionHeading>
        </div>
        <p className="mb-12 text-center text-base text-ink-muted">
          Fra første oppstilling til ferdig oppsummering — hele kampen i én app.
        </p>

        {/* Spotlight rows */}
        <div className="divide-y divide-ink/8">
          {spotlights.map((s, i) => (
            <Spotlight
              key={s.title}
              title={s.title}
              text={s.text}
              imgSrc={s.img}
              imgAlt={s.alt}
              reverse={i % 2 === 1}
            />
          ))}
        </div>

        {/* Feature grid */}
        <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {gridFeatures.map((f) => (
            <div
              key={f.title}
              className="flex flex-col overflow-hidden rounded-card bg-cream shadow-card"
            >
              {f.img && (
                <div className="flex justify-center bg-cream-dark px-6 pt-6">
                  <Screenshot
                    src={f.img}
                    alt={f.imgAlt ?? f.title}
                    className="h-56 w-auto"
                  />
                </div>
              )}
              <div className="p-5">
                <p className="mb-1 font-display text-base font-bold text-ink">{f.title}</p>
                <p className="text-sm leading-snug text-ink-muted">{f.text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Flest mulig, lengst mulig ────────────────────────────────────────────────

function Fairness() {
  const cards = [
    {
      title: "Bra for de som vil bli best.",
      text: "De fleste toppspillere spesialiserte seg sent. Bredde og tålmodighet skaper flere på toppen, ikke færre.",
    },
    {
      title: "Bra for alle de andre.",
      text: "De fleste vil mestre, høre til og ha det gøy. Får de spille, blir de værende — og det er der idrettsgleden lever.",
    },
    {
      title: "Bra for de aller beste.",
      text: "Også de som vinner mest, har godt av å tape iblant. Det bygger ydmykhet, vilje og folk man fortsatt vil spille med.",
    },
    {
      title: "Bra for motstanderen.",
      text: "En jevn kamp er en bedre kamp — for begge lag. Når alle får spille, blir idretten morsommere for alle på banen.",
    },
  ];

  return (
    <section className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <div className="mb-4 text-center">
        <SectionHeading>Flest mulig, lengst mulig — bra for alle</SectionHeading>
      </div>
      <p className="mb-10 text-center text-base text-ink-muted">
        Det er ikke snillisme. Det er den beste idretten for hele laget.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((c) => (
          <div key={c.title} className="rounded-card border border-ink/8 bg-cream-dark p-6">
            <p className="mb-2 font-display text-lg font-bold text-ink">{c.title}</p>
            <p className="text-sm leading-relaxed text-ink-muted">{c.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

// ─── Multi-sport ──────────────────────────────────────────────────────────────

function MultiSport() {
  const sports = [
    { img: "/landing/hero-live.PNG", alt: "Fotball — live banevisning" },
    { img: "/landing/handball-live.PNG", alt: "Håndball — live banevisning" },
    { img: "/landing/basket1.PNG", alt: "Basketball — banevisning" },
    { img: "/landing/hockey.PNG", alt: "Ishockey — banevisning" },
  ];

  return (
    <section className="bg-cream-dark py-16 sm:py-24">
      <div className="mx-auto max-w-5xl px-5">
        <div className="mb-4 text-center">
          <SectionHeading>Én app, fire idretter</SectionHeading>
        </div>
        <p className="mb-10 text-center text-base text-ink-muted">
          Fotball, håndball, basketball og ishockey — hver med riktig bane, formasjoner og regler.
        </p>
        <div className="flex flex-wrap justify-center gap-6">
          {sports.map((s) => (
            <Screenshot
              key={s.img}
              src={s.img}
              alt={s.alt}
              className="w-[calc(50%-12px)] max-w-[200px] sm:w-auto"
            />
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Priser ───────────────────────────────────────────────────────────────────

function Pricing() {
  return (
    <section id="priser" className="mx-auto max-w-5xl px-5 py-16 sm:py-24">
      <div className="mb-12 text-center">
        <SectionHeading>Priser</SectionHeading>
      </div>
      <div className="grid gap-5 sm:grid-cols-3">
        {/* Gratis */}
        <div className="flex flex-col rounded-card border border-ink/10 bg-cream-dark p-6 shadow-card">
          <p className="mb-1 font-display text-2xl font-bold text-ink">Gratis</p>
          <p className="mb-1 text-sm font-medium text-ink-muted">for treneren</p>
          <p className="mb-5 font-display text-3xl font-black text-ink">0 kr</p>
          <p className="flex-1 text-sm leading-relaxed text-ink-muted">
            Alt du trenger på kampdagen. Visuell banevisning, bytter, spilletidsoversikt og deling
            av oppsummering. Gratis for enkelttrenere, alltid.
          </p>
          <Link
            to={APP_PATH}
            className="mt-6 rounded-full border border-ink/20 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-ink/5"
          >
            Kom i gang
          </Link>
        </div>

        {/* Pro — featured */}
        <div className="flex flex-col rounded-card bg-ink p-6 shadow-xl ring-2 ring-accent">
          <div className="mb-2 self-start rounded-full bg-accent px-2.5 py-0.5 text-xs font-bold text-accent-ink">
            Tidlig-bruker: 199 kr/år for de første 100
          </div>
          <p className="mb-1 font-display text-2xl font-bold text-cream">Pro</p>
          <p className="mb-1 text-sm font-medium text-cream/60">per trener</p>
          <div className="mb-5 flex items-baseline gap-2">
            <span className="font-display text-3xl font-black text-cream">299 kr</span>
            <span className="text-sm text-cream/60">/ år</span>
          </div>
          <p className="flex-1 text-sm leading-relaxed text-cream/70">
            For deg som vil ha mer: historikk over flere kamper, statistikk over tid og flere lag på
            samme konto.
          </p>
          <Link
            to={APP_PATH}
            className="mt-6 rounded-full bg-accent py-2.5 text-center text-sm font-bold text-accent-ink transition-opacity hover:opacity-90"
          >
            Prøv gratis nå
          </Link>
        </div>

        {/* Klubb */}
        <div className="flex flex-col rounded-card border border-ink/10 bg-cream-dark p-6 shadow-card">
          <p className="mb-1 font-display text-2xl font-bold text-ink">Klubb</p>
          <p className="mb-1 text-sm font-medium text-ink-muted">ta kontakt</p>
          <p className="mb-5 font-display text-3xl font-black text-ink">–</p>
          <p className="flex-1 text-sm leading-relaxed text-ink-muted">
            Felles standard for hele klubben. Alle trenere får Pro, samlet fakturering, og en
            GDPR-vennlig løsning klubben kan stå inne for.
          </p>
          <a
            href="mailto:hei@faircoach.dev"
            className="mt-6 rounded-full border border-ink/20 py-2.5 text-center text-sm font-bold text-ink transition-colors hover:bg-ink/5"
          >
            Ta kontakt
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── CTA closing ─────────────────────────────────────────────────────────────

function ClosingCta() {
  return (
    <section className="bg-cream-dark py-16 sm:py-24">
      <div className="mx-auto max-w-lg px-5 text-center">
        <SectionHeading className="mb-5">Klar for en roligere kampdag?</SectionHeading>
        <Link
          to={APP_PATH}
          className="inline-block rounded-full bg-accent px-8 py-4 text-base font-bold text-accent-ink transition-opacity hover:opacity-90 active:opacity-75"
        >
          Kom i gang gratis
        </Link>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="border-t border-ink/10 bg-cream px-5 py-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-2 text-center text-xs text-ink-muted sm:flex-row sm:justify-between">
        <span className="font-display font-bold text-ink">FairCoach</span>
        <div className="flex gap-4">
          <Link to="/privacy" className="underline underline-offset-2 hover:text-ink">
            Personvern
          </Link>
          <a
            href="https://faircoach.dev"
            className="hover:text-ink"
          >
            faircoach.dev
          </a>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div className="min-h-dvh bg-cream text-ink">
      <Nav />
      <main>
        <Hero />
        <HowItWorks />
        <CoachSection />
        <Features />
        <Fairness />
        <MultiSport />
        <Pricing />
        <ClosingCta />
      </main>
      <Footer />
    </div>
  );
}
