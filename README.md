# Kids Sport Management

Web-app for å administrere innbyttere og spilletid i barneidrett. Starter med fotball, mobil-først.

**Stack:** Vite + React 18 + TypeScript 5 + Tailwind 3 + shadcn/ui-primitives + React Router 6 + TanStack Query 5 + Supabase (Postgres + Auth + Realtime) + Vercel (planlagt).

---

## Kom i gang lokalt

```bash
npm install
cp .env.example .env       # fyll inn Supabase-credentials
npm run dev
```

Appen kjører på <http://localhost:5173>.

---

## Supabase-oppsett (engangs)

1. Opprett et nytt prosjekt på <https://supabase.com>.
2. I **SQL Editor** kjør i rekkefølge:
   - `supabase/migrations/0001_schema.sql`
   - `supabase/migrations/0002_rls.sql`
3. I **Authentication → Providers → Google**: slå på Google og legg inn OAuth client id/secret fra Google Cloud Console. Sett **Authorized redirect URL** til `https://<din-supabase-ref>.supabase.co/auth/v1/callback`.
4. I **Authentication → URL Configuration**: legg `http://localhost:5173` og din Vercel-URL som tillatte redirect-URLer.
5. Kopier **Project URL** og **anon public key** fra **Settings → API** inn i `.env`:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key>
   ```

---

## Mappestruktur

```
src/
├── components/
│   ├── ui/           # Button, Input, Card, Dialog, Toast …
│   └── layout/       # AppShell, Header
├── hooks/            # useSports, useTeams, usePlayers
├── lib/              # supabase-klient, utils
├── pages/            # Login, SportPicker, TeamList, TeamDetail, MatchSetup, MatchLive
├── providers/        # AuthProvider, QueryProvider
├── types/            # database.ts (Supabase-skjema som TS-typer)
├── App.tsx, main.tsx, router.tsx, index.css
supabase/migrations/  # SQL-migrasjoner
```

---

## Hva som fungerer i denne sprinten

- Google OAuth-innlogging, beskyttede ruter, logg ut.
- Idrettsvelger (fotball aktiv, øvrige som "kommer").
- Lagliste per idrett — opprett og slett lag.
- Lagdetalj med spillerstall — opprett spiller med navn, posisjon og draktnummer.
- TanStack Query for caching, toast-varsler, mobil-først layout med safe-area.
- RLS på alle tabeller så hver coach kun ser sine egne data.

## Hva som gjenstår (bevisst utelatt — egen sprint)

- **Kampoppsett:** velg formasjon, omgangslengde, antall omganger, spillerutvalg.
- **Live kamp:** banegrafikk, klokke, dra-og-slipp mellom bane og benk, spilletidssporing per spiller, statusindikator (over/under/balansert spilletid).
- **Realtime-sync** mellom enheter (skjemaet og publication er klare).
- **Eksport** av kampstatistikk.
- **Andre idretter** (håndball, basket, hockey).

---

## Scripts

| Kommando            | Hva det gjør                            |
| ------------------- | --------------------------------------- |
| `npm run dev`       | Vite dev-server på port 5173            |
| `npm run build`     | TS-typecheck + produksjonsbygg          |
| `npm run preview`   | Forhåndsvis produksjonsbygget lokalt    |
| `npm run typecheck` | Bare typecheck, uten bygg               |

---

## Deploy til Vercel

1. Push repoet til GitHub.
2. Importer i Vercel — preset er Vite, ingen ekstra config trengs.
3. Sett `VITE_SUPABASE_URL` og `VITE_SUPABASE_ANON_KEY` som Environment Variables.
4. Legg Vercel-URLen til som tillatt redirect i Supabase Auth-innstillinger.
