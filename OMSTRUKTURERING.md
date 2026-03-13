# KC – Plan: Delad matchdatabas + Allsvenskan

## Context

Nuläge: `leagues/{code}/matches` innehåller en per-liga-kopia av alla matcher. Om 10 ligor
tippar Allsvenskan måste resultat sättas 10 gånger (manuellt eller via separata API-anrop).

Mål: Flytta matchdata + resultat till en delad global nod. Predictions/deadlines/members
är fortfarande per-liga. En resultatuppdatering slår igenom i alla ligor omedelbart.

Utlösare: Allsvenskan ska läggas till (TheSportsDB). Rätt tillfälle att strukturera om.

---

## Ny Firebase-struktur

```
/globalMatches/{competition}/{season}/{matchId}/
    homeTeam, awayTeam, league, date, actualOutcome, actualScore,
    apiMatchId, competition, stage, setBy, setAt
    (id-fältet LAGRAS EJ – det är Firebase-nyckeln)

/leagues/{code}/
    info/competitions → ['PL', 'CL', 'ALLSVENSKAN']   ← ny tävlingstyp
    members/           → OFÖRÄNDRAT
    predictions/       → OFÖRÄNDRAT
    exactPredictions/  → OFÖRÄNDRAT
    predictionTimestamps/ → OFÖRÄNDRAT
    deadlines/         → OFÖRÄNDRAT + ny nyckel 'ALLSVENSKAN'
    matches/           → BORTTAGET (abandoneras, ingen migrering)
```

**Firebase-nycklar:**
- PL/CL/WC: String(apiMatchId) från football-data.org  – t.ex. `"462839"`
- ALLSVENSKAN: idEvent från TheSportsDB – t.ex. `"2212154"`

**Season-format:**
- PL, CL: `"2024-2025"`
- WC: `"2026"`
- ALLSVENSKAN: `"2026"`

**match.id i minnet** = Firebase-nyckeln (String(apiMatchId/idEvent))
Predictions i Firebase använder match.id som nyckel → per liga, oförändrat.

---

## Tekniska beslut

- `update` är redan importerat i index.html (rad 1577) – inga nya imports behövs
- `setupGlobalMatchListeners(comps)` ersätter `leagues/{code}/matches`-lyssnaren
- Varje competition prenumereras separat; merge sker i minnet till `matches[]`
- Gamla ligor med data i `leagues/{code}/matches` ignoreras tyst – admin laddar om
- Firebase-regler (`auth != null`) täcker `/globalMatches/` utan ändring
- `getSeasonForComp(comp)` – ny hjälpfunktion, DRY

---

## SESSION A – Firebase-omstrukturering

**Klistra in detta i ny konversation:**

---

```
Vi fortsätter KC-projektet. Läs CLAUDE.md och SESSIONER.md i
C:\Users\David\documents\david\claude\KC\ innan vi börjar.

UPPGIFT: Refaktorera Firebase-datamodellen. Flytta matcher från per-liga
(leagues/{code}/matches) till en delad global nod (globalMatches/{comp}/{season}/{matchId}).
Predictions/deadlines/members är OFÖRÄNDRADE.

Alla ändringar sker i index.html. Gör dem i denna ordning:

────────────────────────────────────────────────
1. NY STATE-VARIABEL (rad ~1618, bland leagueUnsubscribers)
   Lägg till: let globalMatchUnsubscribers = [];

────────────────────────────────────────────────
2. NY HJÄLPFUNKTION (placera direkt efter getDeadlineKey, rad ~1901)

   function getSeasonForComp(comp) {
       if (comp === 'WC') return '2026';
       if (comp === 'ALLSVENSKAN') return '2026';
       return '2024-2025';
   }

────────────────────────────────────────────────
3. RENSA getDeadlineKey (rad 1893)
   Ta bort de befintliga fallback-grenarna som testar match.id.startsWith('pl_') etc.
   Behåll bara: if (comp === 'PL') / if (comp === 'WC') / if (comp === 'CL')
   (match.competition är alltid satt på globala matcher)

────────────────────────────────────────────────
4. NY FUNKTION setupGlobalMatchListeners(comps)
   Placera direkt efter setupLeagueListeners-funktionen.

   function setupGlobalMatchListeners(comps) {
       globalMatchUnsubscribers.forEach(u => u());
       globalMatchUnsubscribers = [];
       const allCompMatches = {};
       (comps || []).forEach(comp => {
           const season = getSeasonForComp(comp);
           const path = `globalMatches/${comp}/${season}`;
           const unsub = onValue(ref(database, path), snap => {
               const data = snap.val();
               allCompMatches[comp] = data
                   ? Object.entries(data).map(([key, obj]) => ({ ...obj, id: key }))
                   : [];
               matches = Object.values(allCompMatches).flat();
               matches.sort((a, b) => new Date(a.date) - new Date(b.date));
               cachedFirstMatch = null;
               if (currentUser) scheduleRender();
           });
           globalMatchUnsubscribers.push(unsub);
       });
   }

────────────────────────────────────────────────
5. UPPDATERA setupLeagueListeners (rad 2132)
   a) I teardown-blocket (rad 2133): lägg till
      globalMatchUnsubscribers.forEach(u => u()); globalMatchUnsubscribers = [];
   b) Ta bort hela lyssnaren för leagues/${code}/matches (rad 2165-2172)
   c) I slutet av funktionen: lägg till
      setupGlobalMatchListeners(currentLeagueInfo.competitions || []);

────────────────────────────────────────────────
6. UPPDATERA showLanding (rad ~3865)
   Lägg till i teardown-blocket:
   globalMatchUnsubscribers.forEach(u => u()); globalMatchUnsubscribers = [];

────────────────────────────────────────────────
7. UPPDATERA fetchCompetitionMatches – match-ID (rad ~3086)
   Byt: id: `${code.toLowerCase()}_${roundKey}_${idx}`
   Till: id: String(m.id)
   (m.id = matchens ID från football-data.org API-svaret)
   Behåll apiMatchId-fältet som det är.

────────────────────────────────────────────────
8. UPPDATERA adminLoadMatches – skriv till globalMatches (rad ~3151)
   Byt ut: await set(ref(database, `leagues/${currentLeagueCode}/matches`), merged);
   Till:
   const updates = {};
   merged.forEach(m => {
       const s = getSeasonForComp(m.competition);
       updates[`globalMatches/${m.competition}/${s}/${m.id}`] = (({ id, ...rest }) => rest)(m);
   });
   await update(ref(database), updates);

────────────────────────────────────────────────
9. UPPDATERA autoLoadDefaultMatches – samma ändring som punkt 8 (rad ~3660)
   Byt ut: await set(ref(database, `leagues/${currentLeagueCode}/matches`), allMatches);
   Till samma update()-mönster som punkt 8 (loopa allMatches, skriv till globalMatches).

────────────────────────────────────────────────
10. UPPDATERA fetchResults – skriv till globalMatches (rad ~3236)
    Byt ut: await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
    Till:
    const updates = {};
    matchesCopy
        .filter(m => m.setBy === 'API')  // bara de som just uppdaterades
        .forEach(m => {
            const s = getSeasonForComp(m.competition);
            updates[`globalMatches/${m.competition}/${s}/${m.id}`] = (({ id, ...rest }) => rest)(m);
        });
    if (Object.keys(updates).length > 0) await update(ref(database), updates);

    OBS: Koden samlar redan matchesCopy med uppdaterade resultat. Ändra bara skrivsteget.
    Variabeln foundResults används fortfarande för att bestämma om något ska skrivas –
    men nu använder vi filtret .filter(m => m.setBy === 'API') istället för foundResults > 0.

────────────────────────────────────────────────
11. UPPDATERA saveModalResult – tre set()-anrop (rad 3322, 3327, 3336)
    Alla tre anropar: await set(ref(database, `leagues/${currentLeagueCode}/matches`), matchesCopy);
    Byt alla tre till:
    const updM = matchesCopy[idx];
    const s = getSeasonForComp(updM.competition);
    const { id: _id, ...matchData } = updM;
    await set(ref(database, `globalMatches/${updM.competition}/${s}/${updM.id}`), matchData);

────────────────────────────────────────────────
12. UPPDATERA createLeague (rad ~3944)
    Ta bort raden: matches: [],
    från det initiala Firebase-skrivobjektet.

────────────────────────────────────────────────

VIKTIGT:
- match.id i minnet = Firebase-nyckeln (String från API)
- id-fältet lagras INTE i Firebase (vi destrukturerar bort det vid skrivning)
- Vid läsning tilldelar setupGlobalMatchListeners id: key från Object.entries
- Predictions-nycklar använder match.id – de är per liga och förblir oförändrade
- Gamla data i leagues/{code}/matches ignoreras – ingen migrering
- update() är redan importerat i index.html

Uppdatera SESSIONER.md med ny rad för denna session när du är klar.
Följ push-flödet i CLAUDE.md.
```

---

## SESSION B – Allsvenskan

**Förutsättning: Session A är klar.**

**Klistra in detta i ny konversation:**

---

```
Vi fortsätter KC-projektet. Läs CLAUDE.md och SESSIONER.md i
C:\Users\David\documents\david\claude\KC\ innan vi börjar.

FÖRUTSÄTTNING: Session A är klar. globalMatches-strukturen finns.
match.id = String(apiMatchId/idEvent). getSeasonForComp() finns.

UPPGIFT: Lägg till Allsvenskan som ny tävlingstyp (competition: 'ALLSVENSKAN').

TheSportsDB API (gratis, ingen nyckel, ingen CORS-proxy):
  URL: https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4347&s=2026
  Relevanta fält: idEvent (string), strHomeTeam, strAwayTeam, strTimestamp (ISO UTC),
  strTimeLocal (lokal tid HH:MM:SS), dateEventLocal (YYYY-MM-DD),
  strStatus ('Not Started' / 'Match Finished'), intHomeScore, intAwayScore (strings – kan vara ""),
  intRound (string)

Gör ändringarna i denna ordning:

────────────────────────────────────────────────
1. NY FUNKTION fetchAllsvenskanMatches(rounds)
   Placera i närheten av fetchCompetitionMatches.

   async function fetchAllsvenskanMatches(rounds) {
       adminLog('🔗 Hämtar Allsvenskan från TheSportsDB...');
       const resp = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4347&s=2026');
       if (!resp.ok) throw new Error(`TheSportsDB ${resp.status}`);
       const data = await resp.json();
       const upcoming = (data.events || [])
           .filter(e => e.strStatus === 'Not Started')
           .sort((a, b) => new Date(a.strTimestamp) - new Date(b.strTimestamp));

       const byRound = {};
       upcoming.forEach(e => {
           const r = e.intRound || '?';
           if (!byRound[r]) byRound[r] = [];
           byRound[r].push(e);
       });

       const roundKeys = Object.keys(byRound)
           .sort((a, b) => Number(a) - Number(b))
           .slice(0, rounds);

       const converted = [], labels = [];
       roundKeys.forEach(roundKey => {
           const label = `Allsvenskan – Omgång ${roundKey}`;
           labels.push(label);
           byRound[roundKey].forEach(e => {
               // Kombinera lokal datum + tid från TheSportsDB
               const dateStr = e.dateEventLocal || e.strTimestamp.slice(0, 10);
               const timeStr = e.strTimeLocal ? e.strTimeLocal.slice(0, 5) : '00:00';
               converted.push({
                   homeTeam: e.strHomeTeam,
                   awayTeam: e.strAwayTeam,
                   league: label,
                   date: `${dateStr}T${timeStr}`,
                   actualOutcome: null, actualScore: null,
                   apiMatchId: e.idEvent,
                   competition: 'ALLSVENSKAN',
                   stage: null,
                   setBy: null, setAt: null
               });
           });
       });
       adminLog(`✅ ${converted.length} Allsvenskan-matcher hämtade`);
       return { converted, labels };
   }

────────────────────────────────────────────────
2. NY FUNKTION fetchAllsvenskanResults(pendingMatches)
   Placera i närheten av fetchResults.

   async function fetchAllsvenskanResults(pendingMatches) {
       if (!pendingMatches.length) return 0;
       fetchLog('🔗 Hämtar Allsvenskan-resultat...');
       const resp = await fetch('https://www.thesportsdb.com/api/v1/json/3/eventsseason.php?id=4347&s=2026');
       if (!resp.ok) { fetchLog(`⚠️ TheSportsDB ${resp.status}`); return 0; }
       const data = await resp.json();
       const finished = (data.events || []).filter(e => e.strStatus === 'Match Finished');
       let found = 0;
       const updates = {};
       for (const match of pendingMatches) {
           const game = finished.find(e => String(e.idEvent) === String(match.id));
           if (!game) continue;
           const h = parseInt(game.intHomeScore), a = parseInt(game.intAwayScore);
           if (isNaN(h) || isNaN(a)) continue;
           const outcome = h > a ? '1' : h < a ? '2' : 'X';
           const updated = { ...match, actualOutcome: outcome, actualScore: `${h}-${a}`,
                             setBy: 'API', setAt: new Date().toISOString() };
           const { id: _id, ...matchData } = updated;
           updates[`globalMatches/ALLSVENSKAN/2026/${match.id}`] = matchData;
           fetchLog(`✅ ${match.homeTeam} ${h}-${a} ${match.awayTeam}`);
           found++;
       }
       if (found > 0) await update(ref(database), updates);
       return found;
   }

────────────────────────────────────────────────
3. UPPDATERA fetchResults (rad ~3162)
   Dela upp pendingMatches i Allsvenskan och övriga, lägg till anrop:

   I toppen av fetchResults, efter att pendingMatches är filtrerade:
   const allsvenskanPending = pendingMatches.filter(m => m.competition === 'ALLSVENSKAN');
   const fdoPending = pendingMatches.filter(m => m.competition !== 'ALLSVENSKAN');

   Kör fetchAllsvenskanResults(allsvenskanPending) parallellt med det befintliga
   football-data.org-flödet. Uppdatera foundResults med summan.
   OBS: football-data.org-loopen ska bara iterera fdoPending, inte allsvenskanPending.

────────────────────────────────────────────────
4. UPPDATERA getDeadlineKey (rad 1893)
   Lägg till: if (comp === 'ALLSVENSKAN') return 'ALLSVENSKAN';

────────────────────────────────────────────────
5. DEADLINE-KONSTANTER
   a) ALL_DEADLINE_KEYS (rad ~3456): lägg till 'ALLSVENSKAN'
   b) DEADLINE_LABELS_FULL (rad ~3457): lägg till 'ALLSVENSKAN': 'Allsvenskan'
   c) DEADLINE_LABELS i renderPredictions (rad ~2662): lägg till 'ALLSVENSKAN': 'Allsvenskan'
   d) renderAdminDeadlines (rad ~3468): lägg till i filtret:
      if (k === 'ALLSVENSKAN') return comps.includes('ALLSVENSKAN');

────────────────────────────────────────────────
6. ADMIN-PANEL – matcha-laddning
   a) I <select id="adminCompSelect">: lägg till
      <option value="ALLSVENSKAN">🇸🇪 Allsvenskan</option>
   b) Lägg till rounds-input för Allsvenskan (kopiera strukturen för PL-rounds):
      <div id="adminAllsvenskanRoundsWrap" style="display:none">
        <label>Omgångar att ladda</label>
        <input type="number" id="adminAllsvenskanRounds" value="3" min="1" max="30">
      </div>
   c) updateCompFields(): lägg till allsvenskanWrap show/hide
   d) adminLoadMatches():
      - Lägg till compNames['ALLSVENSKAN'] = 'Allsvenskan'
      - Lägg till branch: else if (competition === 'ALLSVENSKAN')
        { result = await fetchAllsvenskanMatches(parseInt(adminAllsvenskanRounds.value || 3)); }

────────────────────────────────────────────────
7. AUTOLOAD – autoLoadDefaultMatches (rad ~3650)
   Lägg till branch för ALLSVENSKAN i loopen:
   else if (comp === 'ALLSVENSKAN') {
       result = await fetchAllsvenskanMatches(defaultRounds.ALLSVENSKAN || 3);
   }

────────────────────────────────────────────────
8. SKAPA-FORMULÄR (viewCreate, rad ~1067)
   a) Ny checkbox:
      <label class="check-label">
        <input type="checkbox" id="compALLSVENSKAN" onchange="window.updateCreateRounds()">
        🇸🇪 Allsvenskan
      </label>
   b) Ny rounds-wrap (kopiera strukturen för PL):
      <div id="createAllsvenskanRoundsWrap" style="display:none">
        <label>Allsvenskan-omgångar att förladda</label>
        <input type="number" id="createAllsvenskanRounds" value="3" min="1" max="30">
      </div>
   c) updateCreateRounds(): lägg till allsvenskanWrap show/hide
   d) createLeague():
      - if (document.getElementById('compALLSVENSKAN').checked) comps.push('ALLSVENSKAN');
      - defaultRounds.ALLSVENSKAN = parseInt(document.getElementById('createAllsvenskanRounds').value || 3);

────────────────────────────────────────────────
9. SETUPLEAGUEVIEW – comp-badge (rad ~2030)
   Lägg till i labels-objektet: 'ALLSVENSKAN': '🇸🇪 Allsvenskan'

────────────────────────────────────────────────
10. CSS – comp-badge (placera med övriga .comp-badge-*-stilar)
    .comp-badge-allsvenskan { background: rgba(0,100,30,.15); color: #4ade80; }

────────────────────────────────────────────────

VIKTIGT:
- intHomeScore/intAwayScore från TheSportsDB är strings – kan vara "" för ofärdiga matcher.
  Använd parseInt() + isNaN-guard, INTE null-check.
- idEvent är en sträng (t.ex. "2212154") – använd String() konsekvent.
- Ingen CORS-proxy för TheSportsDB.
- strTimeLocal är lokal stockholmstid – ingen konvertering behövs.
- Resultat kan dröja 30 min – flera timmar efter slutsignal. Det är acceptabelt.

Uppdatera SESSIONER.md med ny rad för denna session när du är klar.
Följ push-flödet i CLAUDE.md.
```

---

## Filer som påverkas

| Fil | Ändring |
|-----|---------|
| `index.html` | Alla kodändringar (båda sessionerna) |
| `SESSIONER.md` | Ny statusrad per session |
| `CHANGELOG.md` | Uppdateras vid push |
| `PLAN.md` | Firebase-strukturen i plan är nu obsolet (men behöver ej uppdateras) |
| `database.rules.json` | Inga ändringar – `auth != null` täcker `/globalMatches/` |

## Verifiering

**Session A:**
1. Skapa en ny liga med PL och/eller CL – auto-laddning sker direkt (autoLoadDefaultMatches)
2. Kontrollera i Firebase att matcher finns under `globalMatches/PL/2024-2025/` (INTE under leagues/{code}/matches)
3. Sätt ett resultat manuellt → kontrollera att globalMatches uppdateras
4. Öppna ligan i en annan flik/browser – resultatet syns utan omladdning

**Session B:**
1. Skapa en liga med ALLSVENSKAN valt
2. Ladda Allsvenskan-matcher → kontrollera `globalMatches/ALLSVENSKAN/2026/`
3. Kontrollera att deadline-system fungerar med nyckel 'ALLSVENSKAN'
4. Trigga manuell fetch → kontrollera att TheSportsDB-anropet sker utan fel
5. Kontrollera att Allsvenskan-märket visas i ligatyp-indikatorn
