# KC – Sessionsplan

Varje session är designad för att vara självständig och avslutad.
Börja alltid en session med att läsa CLAUDE.md + PLAN.md.

---

## Tokeneffektivt arbetsflöde

**Starta varje session med detta meddelande:**
> "Vi fortsätter KC-projektet. Vi är i Session [N]. Läs CLAUDE.md och PLAN.md i mappen
> C:\Users\David\documents\david\claude\KC\ innan vi börjar."

**Avsluta varje session med att uppdatera STATUS-sektionen längst ner i denna fil.**

---

## Session 1 – Grund & Ligaskapande

**Mål:** Fungerande landningssida + skapa liga + navigera till liga
**Tokenåtgång:** Medel

### Uppgifter
1. Skapa GitHub-repo `KC` under `vg1414`
2. Skapa nytt Firebase-projekt (Hefner gör detta manuellt, Claude hjälper med config)
3. Skriv `index.html` med:
   - Landningssida (kod-inmatning + admin-knapp)
   - Visa landningssida om ingen `?liga=` i URL
   - Validera kod mot Firebase
   - Admin-formulär: skapa ny liga (kräver Hefner-lösenord)
   - Ligakodgenerering (6 tecken, kolla mot Firebase)
   - Visa delningsinfo (kod + URL + kopieringsknapp)
4. Firebase-regler (öppna)
5. Testa: skapa en testliga, navigera till den via URL

### Filer som skapas
- `index.html` (ca 500–800 rader för denna session)
- `firebase.json`
- `database.rules.json`
- `README.md`
- `CHANGELOG.md`

### Definition of done
- Kan skapa en liga som Hefner
- Får en kod och en URL
- Kan navigera till ligan via URL (ser "Liga hittad" eller login-skärm)

---

## Session 2 – Login & Tippning

**Mål:** Spelare kan logga in och tippa i sin liga
**Tokenåtgång:** Hög (mest kod)

### Uppgifter
1. Inloggningsskärm (joinMode: admin)
2. Inloggning med självregistrering (joinMode: self)
3. SHA-256 lösenord + passwordsLoaded-flagga
4. 10-min session via localStorage (nyckel: `kc_session_{ligakod}`)
5. Visa matcher för inloggad spelare
6. Spara tipp (1X2 + exakt resultat)
7. Lås tippning när första matchen startat
8. Firebase-listeners med scheduleRender()

### Porteras från KrokensCopa (inte PL)
Kopiera och anpassa dessa delar (byt hårdkodade sökvägar mot `/leagues/{kod}/...`):
- Login-logiken (inkl. Åskådare-läge, IP-loggning)
- Tippning-rendering med deadline-chips och nedräkning
- matchMap + trophyCache + pointsCache
- Deadlines-systemet (per omgång, ej global firstMatch-check)

### Definition of done
- Kan logga in i en liga
- Kan se och spara tipp
- Tippning låser vid matchstart

---

## Session 3 – Topplista, API & Admin-panel

**Mål:** Komplett poängsystem + admin kan ladda matcher och sätta resultat
**Tokenåtgång:** Hög

### Uppgifter
1. Topplista med dynamisk poängberäkning
2. 🏆-ikoner för säsongsvinster
3. football-data.org API-integration (PL/CL/VM per liga)
4. Admin-panel:
   - Ladda matcher per tävling
   - Sätt resultat manuellt
   - Auto-fetch (var 15:e minut)
   - Hantera spelare (lägg till/ta bort)
   - Godkänn väntande spelare (om joinMode: self)
5. Aktivitetslogg

### Porteras från KrokensCopa (inte PL)
- `getStandings()`, `renderLeaderboard()`
- Sniper + Nostradamus + Unicorn-titlar
- `fetchResults()`, `fetchAPIFootball()` (anpassas)
- `requireAdmin()` (ändras till att kolla per-liga adminHash)
- Admin-panelens UI inkl. deadline-admin och POSTPONED-modal
- `CL_STAGE_LABELS` för CL-faser

### Definition of done
- Topplistan visar korrekta poäng
- Admin kan ladda och uppdatera matcher
- Hela spelflödet fungerar end-to-end

---

## Session 4 – Historik, Nollställning & Polish

**Mål:** Säsongshantering + UI-putsning + deploy
**Tokenåtgång:** Medel

### Uppgifter
1. Historik-flik (spara/visa säsonger)
2. Nollställ säsong (behåll historik + spelare, rensa matcher + tipp)
3. Visa ligakod/URL i admin-panelen (kopieringsknapp)
4. Mobile-first CSS-genomgång
5. Genomgång av alla TODO:s i PLAN.md (checka av)
6. README.md uppdateras
7. CHANGELOG.md uppdateras
8. Push till GitHub + testa GitHub Pages

### Definition of done
- Komplett spelflöde testat
- Deployad på https://vg1414.github.io/KC/
- README och CHANGELOG uppdaterade

---

## STATUS (uppdateras efter varje session)

| Session | Status | Datum | Kommentar |
|---------|--------|-------|-----------|
| Session 1 | ✅ Klar | 2026-03-06 | Landningssida, ligaskapande, URL-routing, admin-login |
| Session 2 | ✅ Klar | 2026-03-06 | Login (admin+self), tippning, deadline-system, huvud-app |
| Session 3 | ✅ Klar | 2026-03-06 | Topplista, Sniper/Nostradamus/Unicorn, API-integration, Admin-panel komplett |
| Session 4 | ✅ Klar | 2026-03-06 | Historik-flik, Spara säsong, deploy till GitHub Pages |
| Session 5 | ✅ Klar | 2026-03-06 | Ny landningssida, per-liga-admin, ghost-bakdörr, API-nyckel i Firebase, buggfixar |
| Session 6 | ✅ Klar | 2026-03-07 | Firebase Auth: login/register/createLeague/logout, members-struktur, ghost-bakdörr bevarad |
| Session 7 | ✅ Klar | 2026-03-07 | Bjud in via e-post, inbjudna e-poster visas, alla kan sätta resultat, POSTPONED only admin, ta bort aktivitetslogg/spara säsong/nollställ |
| Session 8 | ✅ Klar | 2026-03-07 | Troféer/historik/åskådare borttagna, Firebase Rules låsta (auth != null) |
| Session 9 | ✅ Klar | 2026-03-07 | EmailJS-integration, aktivitetslogg förbättrad, superadmin-panel med ligaöversikt och radering |
| Session 10 | ✅ Klar | 2026-03-07 | Buggfixar (inbjudningslänk, auth-fel, lösenordsåterställning), Regler-tab, mobiloptimering |
| Session 11 | ✅ Klar | 2026-03-08 | Tippnings-UX (eget tipp synligt, deadline-chips per grupp, Tippa-flik döljs), Mina ligor via Firebase userLeagues-index, pName-bug fixad |
| Session 12 | ✅ Klar | 2026-03-08 | Tippa-korten bytte till Design 4 (vita kort, ljust tema), bakgrund Cool Slate #d8e0eb – design justeras vid ett senare tillfälle |
| Session A  | ✅ Klar | 2026-03-13 | Firebase-omstrukturering: matcher flyttade från leagues/{code}/matches till globalMatches/{comp}/{season}/{matchId}. getSeasonForComp() tillagd, setupGlobalMatchListeners() tillagd, alla skriv-operationer uppdaterade. |
| Session B  | ✅ Klar | 2026-03-13 | Allsvenskan (TheSportsDB): fetchAllsvenskanMatches, fetchAllsvenskanResults, loadMatchesForComp-branch, admin-panel, skapningsformulär, deadline-stöd, CSS-badge. Inga API-nyckelkrav för ALLSVENSKAN-ligor. |

**Planerat (framtida session):** Superadmin-vy med alla användare och vilka ligor de spelar i/administrerar. Design-justering: finjustera Tippa-fliken och bakgrund ytterligare. Admin-panel "Ladda matcher"-sektionen (per-tävling-rader) behöver visuell polish.

---

---

## Session 6 – Auth-grund: Firebase Auth + Datastruktur + Login

**Mål:** Ersätt SHA-256-systemet med Firebase Auth. Spelare kan logga in och registrera sig med e-post + lösenord.
**Tokenåtgång:** Hög

### Manuellt steg FÖRE session 6 (David gör detta)
- Firebase Console → KrokensCopa-Multi → Authentication → Sign-in method → aktivera **Email/Password**

### Uppgifter
1. Lägg till Firebase Auth SDK i `<script>`-importen
2. Ny state: `auth`, `currentAuthUser`, `currentUserUID`, `members`, `invitedEmails`, `pendingMembers`
3. Ta bort state: `passwords`, `passwordsLoaded`, `seasonHistory`, `activityLog`, `activityLogLoaded`, `clientIP`
4. Ta bort: `hashPassword()`, `sessionKey()`, `saveSession()`, `loadSession()`, `clearSession()`, `SESSION_DURATION`
5. Ta bort: `fetchClientIP()`, `logActivity()`
6. Init: `onAuthStateChanged(auth, user => { currentAuthUser = user; routeFromUrl(); })` istället för direkt `routeFromUrl()`
7. `routeFromUrl()`: om användare redan är autentiserad → kolla `members/{uid}` → aktivera direkt (hoppa över login-vy)
8. Ny `buildLoginForm()`: email + lösenord, två flikar: "Logga in" / "Registrera dig"
9. `handleLogin()`: `signInWithEmailAndPassword` → kolla `members/{uid}` → aktivera eller visa namn-val
10. `handleRegister()`: `createUserWithEmailAndPassword` → kolla inbjudan (joinMode:admin) eller lägg i pending (joinMode:self) → visa namn-val
11. `handleForgotPassword()`: `sendPasswordResetEmail`, "Glömt lösenord?"-knapp i login-formuläret
12. `handleJoinLeague(name)`: lägger authenticated user i `members/{uid}` eller `pendingMembers/{uid}`
13. `handleLogout()`: `signOut(auth)` + visa login-vy
14. `activateSession(name, uid)`: sätter `currentUser` + `currentUserUID`, ingen localStorage
15. `isAdmin()`: `currentUserUID === currentLeagueInfo.adminUID || isGhost()`

### Datastruktur som ändras
```
Tas bort:  leagues/{kod}/players (array)
Tas bort:  leagues/{kod}/passwords/{namn}
Läggs till: leagues/{kod}/members/{uid}: { name, email, joinedAt }
Läggs till: leagues/{kod}/invitedEmails/{encodedEmail}: true
Läggs till: leagues/{kod}/pendingMembers/{uid}: { name, email, requestedAt }
Ändras:    info.adminHash → info.adminUID
```

### Definition of done
- Kan skapa liga (admin väljer e-post + lösenord + visningsnamn)
- Kan logga in i liga med e-post + lösenord
- "Glömt lösenord?" skickar reset-mail
- Firebase Auth-session håller kvar (ingen 10-min timeout)
- Ghost-bakdörren fungerar fortfarande

---

## Session 7 – Auth-del 2: Spelarhantering + Admin + Resultatinmatning

**Mål:** Uppdatera admin-panelens spelarhantering + öppna resultatinmatning för alla spelare.
**Tokenåtgång:** Medel

### Uppgifter

**Spelarhantering (admin-panel):**
1. `setupLeagueListeners()`: lyssna på `members/` istället för `players/` + `passwords/`, ta bort `seasonHistory/activityLog/`-lyssnare, lägg till `pendingMembers/`-lyssnare
2. `leaguePlayers` byggs från `members`: `Object.values(members).map(m => m.name)`
3. `renderAdminPlayers()`: ny design
   - Visa nuvarande medlemmar med namn + e-post + "Ta bort"-knapp
   - Admin-raden visar "Admin"-badge (kan inte tas bort)
   - joinMode:admin: visa inbjudna e-poster (ej ännu gått med) + [e-postinput] + "Bjud in"-knapp
   - joinMode:self: visa väntande ansökningar med namn + e-post + "Godkänn/Neka"-knapp
4. `adminInvitePlayer(email)`: encode email + spara i `invitedEmails/{encodedEmail}: true`
5. `adminRemovePlayer(uid)`: ta bort från `members/{uid}`
6. `adminApprovePending(uid)`: flytta från `pendingMembers/{uid}` → `members/{uid}`
7. `adminRejectPending(uid)`: ta bort `pendingMembers/{uid}`

**Resultatinmatning för alla:**
8. I `renderMatchCard()`: ändra `canSetResult = isAdmin() && started` → `!!currentUser && started && match.setBy !== 'API' && match.actualOutcome !== 'POSTPONED'`
9. I `saveModalResult()`: ta bort `if (!isAdmin()) return` – alla kan spara
10. "Inställd (POSTPONED)"-knappen i modalen: bara synlig om `isAdmin()` (ghost/admin-rättighet)

**HTML-ändringar i admin-panel:**
11. "Spelare"-sektionen: ändra "Lägg till spelare"-input → "Bjud in via e-post"-input (för joinMode:admin)
12. Ta bort: "Aktivitetslogg"-sektionen (HTML + JS)
13. Ta bort: "Spara säsong till historik"-sektionen (HTML + JS)
14. Ta bort: "Nollställ säsong"-sektionen (HTML + JS)

**Skapa liga (viewCreate):**
15. Lägg till e-postfält (ny rad ovanför lösenord)
16. Byt label: "Ditt namn" → "Ditt visningsnamn i ligan"
17. `createLeague()`: `createUserWithEmailAndPassword` (eller fallback `signInWithEmailAndPassword` om e-post redan finns) → spara `adminUID: user.uid` i `info` + lägg admin i `members/{uid}`
18. Ta bort `joinAsPlayer()` (admin läggs automatiskt till som member vid skapande)
19. `viewCreated`: ta bort "Ja, lägg till mig / Nej, bara admin"-knapparna → en enda "Gå till ligan →"-knapp

### Definition of done
- Admin kan bjuda in spelare via e-post
- Inbjudna spelare kan registrera sig och väljer eget visningsnamn
- joinMode:self – ansökningsflöde fungerar med godkänn/neka
- Alla inloggade spelare ser "Sätt resultat"-knapp på startade matcher
- Knappen försvinner när API sätter resultatet (setBy: 'API')
- Admin-panel saknar aktivitetslogg + säsong-sektioner

---

## Session 8 – Rensning: Troféer, Historik, Åskådare + Firebase Rules

**Mål:** Ta bort återstående kod som inte längre behövs + lås Firebase-reglerna.
**Tokenåtgång:** Låg–Medel

### Uppgifter

**Ta bort troféer/säsongshistorik:**
1. Ta bort `seasonHistory` och `trophyCache` helt
2. Ta bort `rebuildTrophyCache()` och `getPlayerTrophyHTML()`
3. I `scheduleRender()`: ta bort `rebuildTrophyCache()` och `renderHistory()` anropen
4. I `renderLeaderboard()`: ta bort trophy-HTML från spelarnamnkolumnen (Sniper/Nostradamus/Unicorn-sektionerna BEHÅLLS)
5. I `renderMatchCard()`: ta bort `getPlayerTrophyHTML()` från alla ställen

**Ta bort åskådarläge:**
6. Ta bort `'Askadare'`-logik i `renderPredictions()`
7. Ta bort spectator-kod i `renderMatchCard()`
8. Ta bort spectator-alternativ från login-formuläret (redan borta efter Session 6)

**Ta bort historik-flik:**
9. Ta bort `<button ... data-tab="historik">📜 Historik</button>` från tab-baren
10. Ta bort `<div id="tab-historik" ...>` från HTML
11. Ta bort `renderHistory()`-funktionen

**Firebase Security Rules:**
12. Uppdatera `database.rules.json`:
```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
  }
}
```
13. Deploya: `npx firebase-tools deploy --only database`

### Definition of done
- Inga troféer/stjärnor i spelarnamn
- Ingen historik-flik
- Ingen åskådarlogik kvar i koden
- Firebase-regler kräver `auth != null` för läsning och skrivning

---

## Manuella steg (görs av David, inte Claude)

Dessa kräver att du är inloggad på Firebase/GitHub:

### Innan Session 1
- [x] Skapa Firebase-projekt "KrokensCopa-Multi" ✅ 2026-03-03
- [x] Aktivera Realtime Database ✅ 2026-03-03
- [x] Firebase-konfiguration sparad i CLAUDE.md ✅ 2026-03-03
- [x] Skapa GitHub-repo `KC` under `vg1414` ✅ 2026-03-03

### Innan Session 6
- [x] Firebase Console → KrokensCopa-Multi → Authentication → Sign-in method → aktivera **Email/Password**

### Inför deploy (Session 4)
- [x] Aktivera GitHub Pages på repot (Settings → Pages → branch: main, folder: root)

