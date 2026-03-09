# DRYP App — Opsætningsguide

## Hvad er dette?
DRYP's interne virksomhedsapp: produktion, HACCP, kunder, lager, økonomi og team.
Hostet gratis på Vercel + Supabase med email/password login.

---

## TRIN 1: Installer Node.js

Åbn **Terminal** (tryk Cmd+Space, skriv "Terminal", tryk Enter).

Kopier og kør denne linje:
```
curl -fsSL https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
```

Luk Terminal og åbn den igen. Kør derefter:
```
nvm install 20
```

Tjek det virker:
```
node --version
```
Du bør se noget lignende `v20.x.x`.

---

## TRIN 2: Installer Git

Kør i Terminal:
```
git --version
```
Hvis det beder dig installere Xcode Command Line Tools, tryk "Install" og vent.
Hvis du allerede ser en version (fx `2.x.x`), er du klar.

---

## TRIN 3: Opret GitHub konto + repo

1. Gå til **github.com** → Opret konto (gratis)
2. Klik **"New repository"** (det grønne + ikon øverst til højre)
3. Repository name: `dryp-app`
4. Vælg **Private**
5. Klik **Create repository**
6. Kopiér URL'en der vises (noget lignende `https://github.com/DIT-BRUGERNAVN/dryp-app.git`)

---

## TRIN 4: Opret Supabase projekt

1. Gå til **supabase.com** → Opret konto (gratis)
2. Klik **"New Project"**
3. Organization: Opret en ny (fx "DRYP")
4. Project name: `dryp-app`
5. Database password: Vælg noget stærkt — skriv det ned!
6. Region: **Central EU (Frankfurt)** ← vigtigt for GDPR
7. Klik **Create new project** og vent 1-2 minutter

Når projektet er klar:
1. Gå til **Settings** → **API** (i venstre sidebar)
2. Kopiér **Project URL** (starter med `https://`)
3. Kopiér **anon public key** (den lange tekst under "Project API keys")

Gem begge — du skal bruge dem i trin 6.

### Kør database setup:
1. Gå til **SQL Editor** i venstre sidebar i Supabase
2. Klik **"New query"**
3. Åbn filen `supabase-setup.sql` fra dette projekt
4. Kopiér ALT indholdet og indsæt det i SQL editoren
5. Klik **"Run"** (den grønne knap)
6. Du bør se "Success. No rows returned" — det er korrekt

### Aktivér email-login:
1. Gå til **Authentication** → **Providers** i Supabase
2. Email-provider bør allerede være aktiveret (grøn)
3. Under **Authentication** → **Settings**:
   - Slå "Enable email confirmations" FRA for nu (kan slås til senere)
   - Det gør det nemmere at teste

---

## TRIN 5: Opret Vercel konto

1. Gå til **vercel.com** → Opret konto med din **GitHub konto** (klik "Continue with GitHub")
2. Tillad Vercel at få adgang til din GitHub

---

## TRIN 6: Upload koden og deploy

Åbn Terminal og kør følgende (én linje ad gangen):

```
cd ~/Desktop
```

Flyt hele `dryp-app` mappen til Desktop (du har downloadet den fra Claude).
Eller hvis du har filerne allerede:

```
cd ~/Desktop/dryp-app
```

Opret `.env.local` filen med dine Supabase-nøgler:
```
cp .env.local.example .env.local
```

Åbn `.env.local` i TextEdit og erstat med dine rigtige nøgler fra trin 4:
```
open -a TextEdit .env.local
```

Test at appen virker lokalt:
```
npm install
npm run dev
```

Åbn **http://localhost:3000** i din browser. Du bør se login-siden.
Opret en bruger med din email og et password. Log ind.

Tryk **Ctrl+C** i Terminal for at stoppe.

### Push til GitHub:
```
git init
git add .
git commit -m "DRYP v1"
git branch -M main
git remote add origin https://github.com/DIT-BRUGERNAVN/dryp-app.git
git push -u origin main
```

(Erstat `DIT-BRUGERNAVN` med dit rigtige GitHub brugernavn)

### Deploy til Vercel:
1. Gå til **vercel.com/new**
2. Klik **"Import"** ud for dit `dryp-app` repo
3. Under **Environment Variables** tilføj:
   - `NEXT_PUBLIC_SUPABASE_URL` → din Supabase Project URL
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` → din Supabase anon key
4. Klik **Deploy**
5. Vent 1-2 minutter

Du får en URL som `dryp-app-xxxx.vercel.app` — det er din live app!

---

## TRIN 7: Tilslut dit domæne (valgfrit)

1. I Vercel: Gå til dit projekt → **Settings** → **Domains**
2. Skriv: `app.dryp.dk` (eller hvad dit domæne er)
3. Vercel viser dig DNS-records du skal tilføje
4. Log ind hos din domæne-udbyder og tilføj de DNS-records
5. Vent op til 24 timer (normalt 5-30 min) for at det aktiveres

---

## Daglig brug

- Gå til din app-URL (fx `app.dryp.dk` eller `dryp-app-xxxx.vercel.app`)
- Log ind med din email og password
- Al data gemmes automatisk i Supabase-databasen
- Inviter teammedlemmer: de opretter konto via login-siden

---

## Fejlfinding

**"Module not found" fejl ved `npm run dev`:**
Kør `npm install` igen.

**Login virker ikke:**
Tjek at `.env.local` har de rigtige Supabase-nøgler.

**Data gemmes ikke:**
Tjek at du har kørt `supabase-setup.sql` i Supabase SQL Editor.

**Vercel deploy fejler:**
Tjek at Environment Variables er sat korrekt i Vercel.

---

## Næste skridt

Når appen kører, kan vi tilføje:
- Email-integration (Resend + Cloudflare)
- PDF-eksport af HACCP-rapporter
- Automatisk lager-advarsler via email
- Mobilvenlig PWA (installérbar app)
