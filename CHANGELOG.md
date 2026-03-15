# CHANGELOG – Krokens Copa Multi-Liga

## 2026-03-15 – Flaggningssystem för felaktiga resultat

### Nytt
- Spelare kan flagga API-satta resultat som felaktiga (🚩 visas direkt efter resultatet, synlig i 24h)
- Max 3 flaggningar per match, en per spelare – sparas med namn och tidpunkt
- Flaggad match: inga poäng räknas, gula pluppar visas istället för gröna/röda
- Admin-sektion "🚩 Flaggade matcher" (efter Spelstopp) med lista, tidpunkt, utgångstid och knapp för att rensa flagga
- Auto-fetch re-fetchar bara flaggade matcher (ej alla API-resultat < 48h) – sparar API-anrop
- Flagga löper ut automatiskt efter 48h från matchstart
- Admin-listan uppdateras live när sektionen är öppen

## 2026-03-15 – Design: matcher-fliken förbättrad

### Ändrat
- Röda ❌ och gröna ✅ före spelarnamn ersatta med diskreta 6px färgprickar (grön=rätt, röd=fel)
- Spelarnamn och tippat resultat behåller neutral färg – pricken bär färginformationen
- 0p vid fel tippning visas nu i rött (liksom poäng i grönt vid rätt)
- Eget namn highlightat med subtil guldbakgrund för snabb igenkänning
- Textstorlek på spelarrader minskad till 0.8em för renare intryck

## 2026-03-14 – Buggfixar: tippsynlighet efter spelstopp + färger

### Fixat
- Matcher-fliken: andras tippningar visas nu efter spelstopp (inte bara för startade matcher)
- Tippa-fliken: döljs korrekt när alla spelstopp passerat (periodic timer-koll tillagd)
- `getEffectiveDeadline`: fallback i global mode om GLOBAL-nyckeln saknas
- `adminSetDeadlineMode`: rensar gamla deadlines vid lägesbyte (förhindrar nyckelkonflikter)
- Färger i matcher-fliken: pred-row fick explicit textfärg, rätt/fel tydligare mot mörk bakgrund

## 2026-03-14 – Admin kan radera liga

### Nytt
- Admin kan radera sin liga via en ny sektion i admin-panelen (ovanför Admin-guide)
- Bekräftelsedialog kräver att admin anger sitt lösenord (Firebase re-autentisering) innan radering sker
- Vid radering rensas ligan, alla spelares kopplingar och inbjudna e-poster permanent
- Ghost-admin ser inte sektionen

---

## 2026-03-14 – Admin-meny: ny ordning + centrerad knapp

### Förändringar
- Admin-sektioner omordnade: Ligainfo → Spelare → Spelstopp → Hämta resultat → Ladda matcher → Admin-guide
- "Hämta resultat nu"-knappen centrerad

---

## 2026-03-14 – Buggfix: deadline omgång för omgång

### Buggfix
- Allsvenskan-matcher fick alla samma deadline-nyckel (`ALLSVENSKAN`) vilket gav fel spelstopp – nu per omgång precis som PL

---

## 2026-03-14 – Dölj raderade ligor i hubben

### Buggfix
- Ligavalssidan visade inte längre existerande ligor – nu kontrolleras varje liga mot Firebase och saknade ligor filtreras bort och rensas automatiskt från användarens index

---

## 2026-03-14 – Allsvenskan-scraper via GitHub Actions

### Nytt
- `scripts/scrape_allsvenskan.py`: hämtar alla 240 Allsvenskan 2026-matcher från allsvenskan.se (GraphQL) och skriver till Firebase (`globalMatches/ALLSVENSKAN/2026/`)
- `.github/workflows/allsvenskan.yml`: GitHub Actions-workflow som kör fixtures dagligen kl 07:00 och kollar resultat var 30:e minut 14:00–01:30
- `.gitignore`: Firebase service account JSON läggs aldrig till i repot
- `index.html`: `fetchAllsvenskanMatches()` och `fetchAllsvenskanResults()` läser nu från Firebase istället för TheSportsDB – alltid komplett och korrekt data

## 2026-03-14 – Auto-radering av inaktiva ligor

### Nytt
- Inaktiva ligor raderas automatiskt efter 30 dagar (räknas från senaste spelade match med tippningar)
- `lastMatchDate` sparas på ligan max en gång per dag när resultat hämtas
- Cleanup körs vid appstart max en gång per dag

## 2026-03-14 – Buggfix: tävlingar som saknas i competitions-listan + UI

### Buggfixar
- PL-matcher försvann för liga 37U5PT – `competitions`-arrayen i ligans info uppdaterades aldrig när PL-matcher laddades
- Info-listenern anropar nu `setupGlobalMatchListeners` om `competitions`-listan ändras i Firebase
- När admin laddar matcher för en tävling som saknas i ligans `competitions`-lista läggs den nu till automatiskt

### UI
- Tog bort "(ej laddad)" från admin-matchladdning – gråfärgen räcker som signal

## 2026-03-13 – Buggfixar och UI-förbättringar

### Buggfixar
- Matcher förladdades från fel liga – `setupGlobalMatchListeners` lyssnar nu bara på ligans egna tävlingar
- Raderade ligor visades fortfarande i liga-switchern – filtreras nu bort och rensas från `userLeagues`
- Allsvenskan-matcher saknade tider – `strTimestamp` (UTC) konverteras nu till svensk tid via `Intl.DateTimeFormat` med `Europe/Stockholm`
- Datum skrivs nu alltid över vid omladdning av matcher (inte bara resultat)

### UI
- Admin "Ladda matcher": en knapp för alla tävlingar istället för en per liga
- Stepper-design (−/+) för antal omgångar per tävling
- Grid-layout så spinnarna är lodrätt linjerade
- "omgångar" och "(ej laddad)" synligare färg

## 2026-03-13 – Allsvenskan (Session B)

### Nytt
- Allsvenskan som ny tävlingstyp via TheSportsDB API (gratis, ingen CORS-proxy)

## 2026-03-13 – Firebase-omstrukturering (Session A)

### Tekniska förbättringar
- Matcher flyttade från `leagues/{code}/matches` till `globalMatches/{comp}/{season}/{matchId}` för bättre skalbarhet
- `getSeasonForComp()`-funktion tillagd för att hämta aktuell säsong per tävling
- `setupGlobalMatchListeners()` tillagd för att lyssna på globala matcher
- Alla skriv-operationer uppdaterade för den nya datastrukturen

### Dokumentation
- Nya filer: `Fredag.md`, `OMSTRUKTURERING.md`, `OPTIMERING_FORSLAG.md`, `design-preview-fetch.html`
- Ny mapp: `Prompter jag ska använda/`
- Ny mapp: `uefa-champions-league-vector-logo-seeklogo/`
- `fetchAllsvenskanMatches(rounds)` – hämtar kommande Allsvenskan-omgångar
- `fetchAllsvenskanResults(pendingMatches)` – hämtar resultat från TheSportsDB
- Allsvenskan-checkbox + omgångsinput i skapningsformuläret
- Allsvenskan-rad i admin-panelens "Ladda matcher"-sektion
- Allsvenskan-deadline-stöd (nyckel: `ALLSVENSKAN`)
- Allsvenskan-badge i liga-header (grön: `#4ade80`)
- `loadMatchesForComp` routar ALLSVENSKAN till rätt API
- Ligor med enbart Allsvenskan kräver ingen football-data.org API-nyckel

## 2026-03-13 – Liga-switcher, FAQ på landningssida, admin kan byta spelarnamn, UI-förbättringar

### Nytt
- Liga-switcher: klicka på liganamnet i headern för att byta mellan dina ligor via dropdown
- FAQ-sektion i Regler-fliken med 14 vanliga frågor och svar
- FAQ/Hjälp bottom sheet på landningssidan (öppnas via "Hjälp"-knappen)
- Admin kan byta visningsnamn på spelare – alla tips migreras automatiskt till det nya namnet

### Förbättrat
- Slash-tecknet i tippa-räknaren (9/18) har nu samma storlek och font som siffrorna
- FAQ: rättad text om andras tips (syns efter deadline, inte vid matchstart)
- FAQ: felsökningsfrågan borttagen

## 2026-03-13 – Gruppering per omgång i tippa-fliken + auto-fokus mellan matcher

### Förbättrat
- Tippa-fliken visar nu en tydlig omgångsrubrik (t.ex. "Premier League – Omgång 15") ovanför varje grupp av matcher
- Auto-fokus: efter bortasiffran hoppar fokus automatiskt till nästa matchs hemmafält

## 2026-03-13 – Open Graph-taggar för WhatsApp-förhandsgranskning

### Lagt till
- Open Graph-taggar (og:title, og:description, og:image, og:url) i index.html så länken visar ikon och beskrivning när den delas på WhatsApp

## 2026-03-13 – Buggfix: tippa-flik försvinner för spelare

### Fixat
- Lade till Firebase-lyssnare på `leagues/{kod}/info` så att ändringar av `deadlineMode` av admin nu synkas i realtid till alla inloggade spelare utan att de behöver ladda om sidan

## 2026-03-13 – Deadline-system + bugfixar

### Nytt
- Tre deadline-lägen: Globalt / Omgång för omgång / Match för match
- Väljs vid skapande av liga och kan ändras i admin-panelen
- Dialog vid inladdning av matcher efter passerat spelstopp (3 val)
- Andras tippningar döljs tills matchen faktiskt startat (ej bara vid spelstopp)

### Bugfixar
- PL grå i admin-panelen efter inladdning – fixat
- CL visade 2 omgångar trots 1 laddad – fixat (räknar nu stages, ej labels)

---

## 2026-03-13 – Rensning av tillfällig migreringskod

### Ändringar
- Raderade 8 förstabens-matcher (CL LAST_16) från Firebase som saknade tippningar
- Tog bort migreringssektion från admin-panelen (loadFinishedCLStage, adminLoadFinishedCL, migrateOldPredictions)

---

## 2026-03-13 – Firebase-omstrukturering + buggfixar

### Ändringar
- Matcher flyttade från `leagues/{code}/matches` till delad `globalMatches/{comp}/{säsong}/{matchId}` – ett resultat slår igenom i alla ligor direkt
- Ny funktion `getSeasonForComp()` och `setupGlobalMatchListeners()`
- Admin-panel "Ladda matcher" ombyggd: varje tävling får egen rad med omgångs-input och Hämta-knapp (inga dropdowns)
- "Ladda matcher"-sektionen synlig för alla liga-admins (inte bara superadmin)
- Stöd för 0 omgångar – rensar befintliga pending-matcher för den tävlingen
- Bugg fixad: Firebase accepterar inte `undefined` – null-värden filtreras nu bort vid skrivning
- Gamla pending-matcher för en tävling rensas automatiskt vid omladdning

## 2026-03-14 – Byt CORS-proxy till Cloudflare Worker

### Ändringar
- Ersatte corsproxy.io med en egen Cloudflare Worker (`football-proxy.davhef.workers.dev`)
- API-nyckeln för football-data.org lagras nu säkert som Secret i Workern – syns inte längre i frontend-koden
- Uppdaterade `fetchCompetitionMatches` och `fetchResults` att använda Worker-proxyn

## 2026-03-12 – Uppdatera CORS-proxy för resultatshämtning

### Ändringar
- Bytte proxy-URL-format till `corsproxy.io/?url=` (ny syntax)
- Behåller `X-Auth-Token` som header (football-data.org stödjer ej token i URL)

## 2026-03-11 – Utmärkelse-chips i toppliste-kortet med matchande färger

### Ändringar
- Sniper/Nostradamus/Unicorn-chips flyttades in i samma mörka app-card som tabellen
- Separator-linje med luft tillagd mellan tabell och utmärkelser
- Textfärger matchar nu exakt Regler-sektionens chips (amber/lila/rosa på mörk bakgrund)

## 2026-03-11 – Bättre kontrast på titel-chips i regler

### Ändringar
- Sniper/Nostradamus/Unicorn-chips i Regler-fliken och topplistan fick ljusare textfärger (`#fbbf24`, `#c4b5fd`, `#f9a8d4`) för bättre läsbarhet mot mörk kortbakgrund

## 2026-03-11 – Sniper-emoji 🎯 på matchrader

### Ändringar
- **Sniper-emoji 🎯** visas bredvid tippad 1X2 om spelaren är ensam om rätt utfall (och inte unicorn)
- Unicorn 🦄 (ensam + exakt resultat) visas som tidigare – 🎯 visas inte dubbelt i det fallet

## 2026-03-11 – Web App Manifest för hemskärmsikon

### Ändringar
- **manifest.json skapad**: Chrome på Android använder nu rätt ikon (apple-touch-icon.png) och namn (Krokens Copa) när appen läggs till på hemskärmen
- **manifest-länk tillagd i index.html**: `<link rel="manifest">` kopplad till manifestfilen

## 2026-03-10 – Unicorn-fix och bättre kortexpandering

### Ändringar
- **Unicorn/Sniper-bugg fixad**: Borttagna spelare (spökspelare) räknades med i beräkningen av vem som ensam tippat rätt – nu filtreras enbart aktiva spelare
- **Kortexpandering fixad**: Kort med blandning av klara och kommande matcher expanderas nu alltid före rent kommande kort

## 2026-03-10 – Smart expandering av omgångar, admin kan hämta resultat manuellt

### Ändringar
- **Smart expandering**: Matcher-fliken öppnar nu automatiskt rätt omgång – väntande resultat prioriteras, annars nästa kommande, annars senaste avklarade
- **Hämta resultat för alla admins**: "Hämta nu"-knappen visas nu för alla ligeadmins, inte bara superadmin

## 2026-03-10 – Resultatinfo på matchrad, POSTPONED-fix

### Ändringar
- **Satt av på samma rad**: Matcher-fliken visar nu "(Satt av: [namn])" och "(Satt av: API)" direkt på datumraden, inga emojis
- **POSTPONED-fix**: Inställda matcher checkas nu mot API:t om matchdatumet är yngre än 48h – fångar upp matcher som faktiskt spelades ändå

## 2026-03-10 – UX-fix: poängtext, sniper-kort, vem satte resultatet, API-felhantering

### Ändringar
- **Poängbeskrivning**: Tog bort "exakt halv rätt är inte nödvändigtvis 50 p" ur regler-fliken – onödigt förvirrande
- **Sniper/Nostradamus/Unicorn**: Korten visas nu under tabellen istället för ovanför. Färgerna mörkade för bättre läsbarhet (gult-på-gult-problem löst)
- **Vem satte resultatet**: I Matcher-fliken visas nu "✏️ Satt av: [namn]" för manuellt inmatade resultat
- **Admin kan alltid ändra resultat**: Admin ser "Ändra resultat"-knappen även på API-satta matcher (säkerhetsnät vid fel API-data)
- **Auto-fetch re-checkar inom 48h**: API-satta resultat hämtas om automatiskt om de är yngre än 48 timmar – fångar upp korrigeringar från football-data.org
- **Firebase-fix**: Galatasaray–Liverpool rättad till 1-0 (API returnerade felaktigt 1-1 p.g.a. VAR-underkänt mål)

## 2026-03-09 – Spelarsortering fix, lastSeen-tracking, force-logout vid borttagning

### Ändringar
- **Sortering fix**: Spelare i Matcher-fliken sorteras nu stabilt efter tippningsordning. Om en spelare saknar tidsstämpel (äldre tips) används `joinedAt` som reservsortering istället för slumpmässig ordning
- **lastSeen-tracking**: Tidsstämpel sparas i Firebase (`members/{uid}/lastSeen`) vid varje inloggning. Adminpanelens spelarlista visar nu "· X min sedan" / "· 2 dagar sedan" / "· Aldrig" bredvid varje spelare
- **Force-logout vid borttagning**: Om admin tar bort en spelare från ligan loggas de ut automatiskt inom 2,5 sekunder och skickas till startsidan

## 2026-03-09 – Färg på eget tips, sortering, "Tabell", teamnamn i rätt färg

### Ändringar
- **Eget tips grönt**: Eget tips i Matcher-fliken visas nu i grönt (som andras "Har tippat") istället för grått
- **Teamnamn i rätt färg**: `(Liverpool)` etc. ärver nu radens färg istället för att alltid vara grått – gäller Matcher- och Tippa-fliken
- **Sortering per tippningsordning**: Spelare sorteras i den ordning de tippade för varje match. Timestamp sparas i Firebase vid första tippningen
- **"Topplista" → "Tabell"**: Fliken och rubriken omdöpta

## 2026-03-09 – Fix Safari iOS scroll (arkitekturändring)

### Ändringar
- **Safari scroll-fix**: Scroll-arkitekturen omgjord – `#viewApp` är nu en flex-kolumn utan scroll. Istället är `#appScrollArea` (wrappern runt innehållet) det enda scrollbara elementet med `flex: 1; overflow-y: scroll; -webkit-overflow-scrolling: touch`. Header och tab-bar sitter fast naturligt som flex-barn, utan `position: sticky` som orsakade Safari-buggar

## 2026-03-09 – UX-förbättringar: liganamn, superadmin, aktivitetslogg, regler

### Ändringar
- **Regler**: Tog bort "(inte 50!)" ur exempelraden i poängsystemet
- **Liganamn på mobil**: `.app-league-chip` visas nu även på mobil (< 480px) – tog bort `display:none` i media query
- **Superadmin logout**: Ghost/superadmin-användaren visas nu i header-pillen med "👻 Superadmin" och kan logga ut därifrån
- **Aktivitetslogg**: Laddas automatiskt när sektionen expanderas – "Uppdatera"-knappen borttagen
- **Ny spelare i aktivitetslogg**: Event `NEW_PLAYER` (🆕) loggas nu när en spelare skapar sitt konto i ligan (gäller båda join-lägena)

## 2026-03-09 – Safari-scroll-fix + auto-fokus vid tippning

### Ändringar
- **Scroll-fix Safari iOS**: `#viewApp` använder nu `overflow-y: scroll` och `-webkit-overflow-scrolling: touch` istället för `auto` – fixar problemet med att inte kunna scrolla längst ner i Tippa-fliken på iPhone
- **Safe-area padding**: `.app-content` får nu dynamisk `padding-bottom` som tar hänsyn till iPhones hemindikator (safe-area-inset-bottom)
- **Auto-fokus vid tippning**: När man skriver en siffra (0–9) i hemma-rutan hoppar fokus automatiskt till borta-rutan – underlättar tippning på mobil

## 2026-03-08 – Godkännande-systemet borttaget; Automatisk sparning av tips; Poänglogik uppdaterad

### Ändringar
- **Godkännande-systemet**: Borttaget helt. Nya spelare registreras direkt till ligan (ingen väntande status eller admin-godkännande)
- **Tippnings-sparning**: Sparande är nu helt automatiskt. Varje gång man fyller i/ändrar resultatet sparas det direkt till Firebase. Inga "Spara tips"-knappar längre, och resultatetiketten ("1 – Liverpool vinner") är borttagen från korten
- **Poäng-logik**: Rättad och förtydligad. Poängberäkning följer: `100 × (N−k)/(N−1)` där N=totalt antal spelare och k=antal som gissade samma. Exempel (4 spelare): 1 rätt→100p, 2 rätt→67p, 3 rätt→33p, 4 rätt→0p
- **Bonus för exakt resultat**: +50p för rätt exakt slutresultat (kombineras med 1X2-poängen)

## 2026-03-08 – Design 4: Tippa-korten och bakgrund (Session 12)

### Ändringar
- Tippa-fliken: vita kort med Design 4-layout (meta → lag → inputs → utfall → spara)
- Score-inputs: ljus bakgrund med guldkant vid värde/fokus, `has-val`-klass för dynamisk styling
- Låst kort: stort guld-resultat i JetBrains Mono istället för gråa siffror
- Tipp-counter: Bebas Neue-siffra (t.ex. "3/8 matcher tippade") istället för progress-bar
- Deadline-chips: ljusgröna/ljusröda bakgrunder (naturliga färger istället för neontonar)
- Bakgrund: Cool Slate `#d8e0eb` för tydligare kontrast mot vita kort
- Design justeras ytterligare vid ett senare tillfälle

## 2026-03-08 – Admin-guide: regel 4 och FAQ rättade

### Fixar
- Regel 4 i "Komma igång": förtydligat att manuell resultatinmatning sker i **Matcher-fliken** (inte Tippnings-fliken), från matchstart tills API hämtat resultatet automatiskt
- FAQ "Hur sätter jag ett resultat?": rättad till Matcher-fliken + tillagt att auto-hämtning sker var 15:e minut
- Övriga regler (1–3) omskrivna till enklare och tydligare språk för nya admins

## 2026-03-08 – Admin-guide i Admin-fliken

### Nytt
- Admin-guide lagd som kollapsbar sektion längst ner i Admin-fliken
- Innehåller: komma igång-checklista (4 steg) och vanliga frågor om deadline, resultat, inställda matcher och spelarhantering
- Korrigerat: guide refererar inte längre till borttagna funktioner (Ladda matcher / Hämta resultat)

## 2026-03-08 – Automatisk deadline vid matchstart

### Nytt
- Om admin inte sätter ett manuellt spelstopp gäller första matchstart i varje grupp automatiskt som deadline
- Deadline-chipen visar "Stänger vid matchstart" (auto) eller "Tippa klart innan" (manuell) beroende på typ

## 2026-03-08 – Design-förbättringar

### Förbättringar
- **Header**: Liganamnet visas nu centrerat i headern (3-kolumn layout)
- **Header**: Ny användarpill med avatar-bokstav (första bokstaven i namnet), visningsnamn och ✕ för utloggning
- **Tippning**: Texten "1 – Liverpool vinner / X – Oavgjort / 2 – Away vinner" har nu enhetlig mörk färg (ej tre olika färger)
- **Deadline-chip**: Redesignad layout – status + nedräkning på översta raden, datum/tid på understa. Nedräkningen visas nu alltid tydligt och uppdateras direkt vid rendering

## 2026-03-08 – Superadmin: Användarlista

### Nytt
- Superadmin-panelen har nu en "Användare"-flik som visar alla registrerade spelare
- Varje användare visar namn, e-post och vilka ligor de spelar i (med Admin/Spelare-roll)
- Ligor-fliken visar nu även antal spelare per liga

## 2026-03-08 – Tippnings-UX & Mina ligor

### Nytt
- Landningssidan visar "Mina ligor" för inloggade användare (hämtas från Firebase `userLeagues/{uid}`)
- Firebase-index `userLeagues` uppdateras automatiskt vid ligeskapande, gå med och godkännande

### Fixar
- Alla inloggade spelare ser nu sin egen tippning i Matcher-fliken (inte bara admin)
- `pName`-bugg fixad – spelares namn visades som "undefined" i Matcher-flik efter spelstopp
- Deadline-chips visas nu per grupp, direkt ovanför sina matcher (inte alla samlade överst)
- Svenska tecken fixade i chips: "Stängd"/"Öppen" (var "Stangd"/"Oppen")
- Tippa-fliken döljs automatiskt när alla matcher är låsta/startade

## 2026-03-07 – Favicon, Apple Touch Icon & README-uppdatering

### Nytt
- Lade till favicon och Apple Touch Icon (`apple-touch-icon.png`) i `<head>`
- Uppdaterade README.md med admin-notifikation och EmailJS-info

## 2026-03-07 – E-postnotifikation vid ny liga

### Nytt
- Skickar automatiskt e-post till viarkroken@gmail.com (via EmailJS) när en ny liga skapas, med liganamn, kod, admin-info, tävlingar och länk

## 2026-03-07 – Session 10: Buggfixar, Regler-tab & Mobiloptimering

### Buggfixar
- Inbjudningslänk (admin-panel & skapelse-vy): lade till `&register=1` så mottagaren landar på "Registrera dig"-fliken
- Skapa liga: fångar nu `auth/invalid-credential` (nyare Firebase SDK) vid fel lösenord på befintligt konto
- Glömt lösenord: ersatt otydlig UX med inline-panel med eget e-postfält + tydligt felmeddelande + "kolla skräpposten"-påminnelse
- Superadmin: raderingsknapp fungerar nu – loggar in med Firebase Auth (krävs av Firebase-regler)
- Superadmin: bekräftelseruta scrollas automatiskt in i vy vid radering
- Stavfel: "Fyll i bada siffrorna" → "Fyll i båda siffrorna"

### Spelregistrering
- Uppdaterade texter: "Jag lägger in spelare" → "Jag bjuder in spelare" och "Spelare registrerar sig själva" → "Öppen registrering"
- Beskrivningar mer korrekta och tydliga

### Aktivitetslogg
- Svart bakgrund (`#0a0c10`) istället för ljusgrå
- Senaste post visas längst ner med automatisk scroll dit
- Större textstorlek (`.88em`)

### Regler-tab
- Ny "📋 Regler"-tab synlig för alla inloggade spelare
- Förklarar: dynamiskt poängsystem (0–100p), +50p bonuspoäng, titlarna Sniper/Nostradamus/Unicorn, spelstopp/deadlines

### Mobiloptimering
- `touch-action: manipulation` på alla knappar (eliminerar 300ms iOS-klickfördröjning)
- Admin-inputs: `font-size: 1em` (förhindrar auto-zoom på iPhone vid fokus)
- Score-inputs: ökad storlek (48px → 52px på liten skärm)
- `btn-admin`: mer padding för godkänd touch-yta
- Tab-padding reducerad på `< 480px`
- Topplista: "Snitt"-kolumn dold på mobil, kompaktare padding
- Result-modal: större sifferfält på liten skärm

---

## 2026-03-07 – EmailJS: riktiga inbjudningsmail + auto-öppna registreringsflik

### EmailJS-integration
- EmailJS SDK inläst (`@emailjs/browser@4`) + initierat med publik nyckel
- När admin bjuder in via e-post skickas nu ett riktigt mail med liga-URL via EmailJS
- Länken i mailet innehåller `?register=1` som automatiskt öppnar registreringsfliken
- Login-formuläret läser `?register=1` och öppnar rätt flik direkt vid sidladdning
- `buildLoginForm(defaultTab)` – stöd för att rendera formuläret med förvald flik

---

## 2026-03-07 – Aktivitetslogg: inloggningar + grupperade tipp-poster

### Aktivitetslogg förbättrad
- Inloggningar loggas nu som `LOGIN`-poster (visas som 🔓 grönt) – ej för ghost
- PREDICT-poster från samma spelare inom 10 minuter grupperas till en enda rad, t.ex. "Tippade 8 matcher"
- Grupperingen sker vid rendering (raw-data i Firebase oförändrad)

---

## 2026-03-07 – Superadmin-panel: ligaöversikt med skapare och radering

### Superadmin-overlay uppgraderad
- Steg 2 (efter inloggning) visar nu alla ligor som individuella kort istället för en dropdown-lista
- Varje ligakort visar: ligans namn, ligakod (guld/monospace), "Skapad av: [namn]" och skapelsedatum
- Ligor sorteras nyaste först (efter `createdAt`)
- **"→ Gå till"**-knapp på varje kort – öppnar ligan direkt i ghost-admin-läge
- **"🗑"**-knapp visar ett inline-bekräftelsesteg ("Ja, radera" / "Avbryt") utan blockande `confirm()`-dialog
- Raderat ligas kort försvinner direkt ur listan; om listan blir tom visas "Inga ligor kvar"
- Statusmeddelande (grönt/rött) visas i panelen vid lyckad/misslyckad radering

---

## 2026-03-07 – Session 8: Rensning + Firebase Rules + Buggfixar

### Borttaget
- Troféer/säsongshistorik: `seasonHistory`, `trophyCache`, `rebuildTrophyCache()`, `getPlayerTrophyHTML()`, `nameWithTrophy()` – alla borttagna
- Historik-flik: tab-knapp, tab-div och `renderHistory()` – alla borttagna
- Åskådarläge (`isViewer`, `Askadare`-logik) – borttaget från renderPredictions och saveScorePrediction

### Firebase Security Rules
- `.read: true`, `.write: "auth != null"` – läsning öppen (krävs för login-vy), skrivning kräver auth
- `.firebaserc` tillagd så Firebase vet vilket projekt som används

### Buggfixar
- Ghost kan nu radera ligor: vid ghost-login skapas/används ett Firebase Auth-konto automatiskt (`GHOST_EMAIL`) så att skrivoperationer tillåts
- "Ladda matcher från API" och "Hämta resultat" döljs nu för vanliga ligeadmins – syns bara för ghost
- Inbjudningsmeddelandet förtydligat: appen skickar inte e-post, admin delar länken manuellt

---

## 2026-03-07 – Session 7: Spelarhantering + resultat för alla + rensning

### Spelarhantering (admin-panel)
- Admin kan bjuda in spelare via e-postadress (joinMode:admin) – sparas i `invitedEmails/`
- Inbjudna e-poster som ännu inte gått med visas i admin-panelen
- Bjud in-sektionen dold vid joinMode:self (ansökningsflöde används istället)

### Resultatinmatning öppen för alla
- Alla inloggade spelare kan nu sätta resultat på startade matcher
- Knappen visas inte om resultatet är satt av API (`setBy: 'API'`)
- Knappen visas inte om matchen är POSTPONED
- "Inställd"-knappen i modalen är bara synlig för admin/ghost

### Rensning av admin-panel
- Borttaget: Aktivitetslogg-sektion (HTML + JS)
- Borttaget: Spara säsong till historik-sektion (HTML + JS)
- Borttaget: Nollställ säsong-sektion (HTML + JS)

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
