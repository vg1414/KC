# CHANGELOG – Krokens Copa Multi-Liga

## 2026-03-07 – Session 6: Firebase Authentication

### Firebase Auth ersätter SHA-256-systemet
- Importerat Firebase Auth SDK (Email/Password)
- `onAuthStateChanged` som ingångspunkt – autentiserad användare loggas in automatiskt
- `createUserWithEmailAndPassword` / `signInWithEmailAndPassword` / `signOut`
- "Glömt lösenord?" skickar reset-mail via `sendPasswordResetEmail`
- Ingen 10-min timeout – Firebase Auth-session håller kvar

### Ny datastruktur
- `leagues/{kod}/members/{uid}` ersätter `players` (array) + `passwords`
- `leagues/{kod}/invitedEmails/{encodedEmail}` för adminbjudna spelare
- `leagues/{kod}/pendingMembers/{uid}` för ansökningsflödet
- `info.adminUID` (Firebase Auth UID) ersätter `info.adminHash`

### Nytt inloggningsformulär
- E-post + lösenord (ersätter dropdown + SHA-256)
- Två flikar: "Logga in" / "Registrera dig"
- Namnval-formulär för ny spelare som inte är member än
- joinMode:admin: kontrollerar invitedEmails innan membership skapas
- joinMode:self: ansökan hamnar i pendingMembers

### Ligaskapande
- Nytt e-postfält i "Skapa liga"-formuläret
- Admin skapas som Firebase Auth-användare, läggs direkt i members
- "Ja/Nej"-knapparna borttagna – admin är alltid med som spelare

### Ghost-bakdörren bevarad
- Fortfarande aktiv (5 klick på fiskikonen)
- Använder SHA-256 + `config/mh` (oförändrat)

## 2026-03-06 – Session 5: Landningssida, Per-liga-admin & Ghost-bakdörr

### Landningssida
- Ny design: två tydliga val – "Gå med i en liga" och "Skapa ny liga"
- Borttaget: global Hefner-admin-inloggning på landningssidan

### Per-liga-admin (arkitekturändring)
- Den som skapar en liga väljer namn + lösenord – blir admin för just den ligan
- `createdBy` + `adminHash` i Firebase `info` identifierar admins per liga
- Alla `currentUser === 'Hefner'`-kontroller ersatta med `isAdmin()`-hjälpfunktion
- `adminConfig/hefnerHash` i Firebase borttaget

### Admin-ingång till liga
- Ny "admin"-sektion längst ner i login-formuläret för varje liga
- Admin loggar in med adminlösenord utan att vara registrerad spelare
- Löser hönan-och-ägget-problemet vid tom liga

### Ghost-admin (bakdörr)
- Klicka 5x på fiskikonen på ligas login-sida inom 4 sekunder
- Dolt lösenordsfält dyker upp (inget syns i HTML-källkoden)
- Lösenord jämförs mot hash i Firebase `/config/mh` (sparas första gången)
- Ghost syns inte i spelarlista, aktivitetslogg eller header
- Ghost har alla admin-rättigheter i alla ligor

### API-nyckel
- Sparas globalt i Firebase `/config/apikey` istället för localStorage
- Endast ghost-admin kan se/ändra nyckeln i admin-panelen
- Alla ligeadmins kan ladda matcher – nyckeln hämtas automatiskt

### "Vill du delta i tippningen?"-flöde
- Direkt efter att liga skapats: fråga om admin vill vara spelare
- "Ja" lägger till admin i spelarlistan och navigerar till ligan
- "Nej" navigerar direkt utan att lägga till

### Buggfixar
- Namnvalidering: blockar `.`, `#`, `$`, `[`, `]` i spelarnamn (Firebase-krav)
- Matcher-fliken visar nu alla som tippat, även admin utanför spelarlistan
- Admin/ghost ser alltid sitt eget faktiska tips (andra ser bara "Har tippat")

### Dokumentation
- PLAN.md uppdaterad med ny admin-arkitektur och Firebase-säkerhetsnotering
- Ny fil: ADMIN_GUIDE.md – guide för ligeadmins

## 2026-03-06 – Session 4: Historik, Säsongshantering & Deploy

- Implementerade Historik-fliken: visar sparade säsonger med fullständig topplista
- Varje säsong visar datum, placeringstabell (poäng, rätt, exakta resultat)
- Admin-panel: ny sektion "Spara säsong till historik" med säsongsnamn-input
- `adminSaveSeason()` sparar nuvarande ställning till `seasonHistory` i Firebase
- Vinnare-fält sparas per säsong (används av troféikoner i topplistan)
- Historik visar nyaste säsongen först (omvänd kronologisk ordning)
- Uppdaterade README.md med fullständig funktionsbeskrivning
- Pushad till GitHub, GitHub Pages aktiverat på https://vg1414.github.io/KC/

## 2026-03-06 – Session 3: Topplista, API & Admin-panel

- Implementerade fullständig Topplista med dynamisk poängberäkning
- Titel-chips: 🎯 Sniper (ensam rätt 1X2), 🔮 Nostradamus (flest exakta), 🦄 Unicorn (solo + exakt)
- Placeringsrankning med guld/silver/brons-badges och troféer
- Admin-panel implementerad med accordionsektioner:
  - Ligainfo & Delning (kod + URL + kopieringsknappar)
  - Ladda matcher via football-data.org API (PL, CL, VM, BOTH)
  - Hämta resultat: manuell + auto (var 15:e minut)
  - Spelare: lägg till/ta bort + godkänn/neka väntande ansökningar
  - Spelstopp (Deadlines) per omgång/fas
  - API-nyckel (localStorage)
  - Aktivitetslogg
  - Nollställ säsong
- Resultat-modal: sätt score, markera inställd, rensa resultat
- "Sätt resultat"-knapp på matcher-fliken för Hefner
- Merge-logik vid matchladdning (bevarar befintliga resultat)

## 2026-03-06 – Korrigering: Referensprojekt
- Korrigerade referensprojekt från PL → KrokensCopa (nyare version)
- Uppdaterade CLAUDE.md med korrekt sökväg och designregler
- Uppdaterade PLAN.md med deadline-system, Åskådare-läge, IP-loggning, Unicorn-titel
- Uppdaterade SESSIONER.md med porteringsinstruktioner från KrokensCopa

## 2026-03-06 – Session 2: Login & Tippning

- Implementerade inloggningsskärm för joinMode:admin (spelardropdown + lösenord)
- Implementerade inloggningsskärm för joinMode:self (fritext + registreringsflöde)
- SHA-256 lösenordshashning + passwordsLoaded-flagga mot race condition
- 10-min session via localStorage (nyckel: `kc_session_{ligakod}`)
- Åskådare-läge (ingen inloggning, kan se men inte tippa)
- Firebase-listeners med scheduleRender()-pipeline för alla liga-data
- Implementerade huvud-appen (ljust tema) med tabs: Tippa, Matcher, Topplista, Historik, Admin
- Implementerade Tippning-fliken: exakt-resultat-inputs (X–Y), live 1X2-label, spara-knapp
- Implementerade Matcher-fliken: matchgrupper per omgång med tippningsstatus
- Deadline-system: deadline-chips med nedräkning, tippning låses per omgång
- IP-loggning via ipify.org, aktivitetslogg sparas per liga
- Kompakt mörk app-header med liganamn, inloggad spelare, logout
- Stubs för Topplista (Session 3), Historik (Session 4), Admin (Session 3)

## 2026-03-06 – Session 1: Grund & Ligaskapande

- Skapade `index.html` med landningssida, ligakodsinmatning och adminpanel
- Implementerade ligakodsgenerering (6 tecken, alfanumerisk, unik mot Firebase)
- Implementerade SHA-256 adminloseords-verifiering (WebCrypto API)
- Implementerade URL-routing via `?liga=KOD`
- Implementerade "Liga hittad" och "Liga hittades inte"-vyer
- Implementerade delningsinformation (kod + URL + kopiering)
- Skapade `firebase.json` och `database.rules.json` (oppna regler for MVP)
- Skapade `README.md` och `CHANGELOG.md`
