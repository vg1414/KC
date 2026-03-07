# KC – Krokens Copa Multi-Liga – Projektinstruktioner

## VIKTIG INFO FÖR CLAUDE VID SESSIONSSTART
Läs denna fil INNAN du gör något annat. Alla beslut är tagna – fråga inte om dem igen.
Läs sedan PLAN.md (arkitektur) och SESSIONER.md (vad som ska göras härnäst).

---

## Projektbeskrivning
En skalad version av Krokens Copa-appen som stödjer flera ligor parallellt.
Ligor skapas av admin (Hefner), varje liga får en unik 6-teckens kod + delbar URL.
Gruppen skriver in koden eller klickar länken och hamnar i sin liga.

## Namngivning
- **Appen heter:** "Krokens Copa" (visas i alla titlar, rubriker, UI)
- **Projektet heter:** KC (internt kodnamn, repo-namn, mappnamn)

---

## GitHub
- Repo: https://github.com/vg1414/KC ✅ Skapat 2026-03-03
- Pages: https://vg1414.github.io/KC/ (aktiveras i Session 4)
- Git remote: https://github.com/vg1414/KC.git
- Användare: vg1414

## Firebase
- **Separat** Firebase-projekt: **KrokensCopa-Multi** ✅ Skapat 2026-03-03
- Realtime Database aktiverad ✅
- Database URL: `https://krokenscopa-multi-default-rtdb.firebaseio.com`
- Regler: öppna (.read/.write = true) till att börja med
- Deploy: `npx firebase-tools deploy --only database`

### Firebase-konfiguration (klistra in i index.html)
```js
const firebaseConfig = {
  apiKey: "AIzaSyB-bBX07bnuMMfEJhsrSppMOmlHRUZQbWk",
  authDomain: "krokenscopa-multi.firebaseapp.com",
  databaseURL: "https://krokenscopa-multi-default-rtdb.firebaseio.com",
  projectId: "krokenscopa-multi",
  storageBucket: "krokenscopa-multi.firebasestorage.app",
  messagingSenderId: "229733900548",
  appId: "1:229733900548:web:3ba7951e00291678377051"
};
```

---

## Stack
- Vanilla HTML/CSS/JS – inga ramverk, inget byggsystem
- **Single-file app** (`index.html`) med URL-routing via `?liga=KOD`
- Firebase Realtime Database
- football-data.org API (samma nyckel som PL-appen) för matcher och resultat
- CORS-proxy: corsproxy.io (samma som PL-appen)

## Referensprojekt (LÄSES VID VARJE SESSION)
KC baseras på KrokensCopa – den senaste och uppdaterade versionen av appen.
PL är ett äldre projekt. Använd INTE PL som referens.

Referensfil: `C:\Users\David\documents\david\claude\KrokensCopa\index.html`
Referens CLAUDE.md: `C:\Users\David\documents\david\claude\KrokensCopa\CLAUDE.md`

---

## Fattade beslut – ändra INTE utan att fråga användaren

| Beslut | Val |
|--------|-----|
| Ligakodformat | Auto-genererad, 6 tecken, alfanumerisk (inga 0/O/I/1) |
| Delning | Hybrid: kod + auto-genererad URL |
| Admin | Den som skapar ligan är admin för just den ligan |
| Spelregistrering | Admin väljer vid skapande: förregistrerade ELLER självregistrering |
| Tävlingstyper | PL, CL, VM – valfri kombination per liga |
| Poängsystem | Samma dynamiska system (100 × (N−k)/(N−1) + 50p bonus) |
| Offline-stöd | Behövs inte |
| Plattform | Mobile-first design |
| Firebase | Eget separat projekt |
| Repo | Eget separat GitHub-repo |
| Antal ligor | 1–6 parallellt (men bygg för skalbarhet) |
| Ligas livslängd | Ingen historik – folk startar ny liga istället |
| Auth | Firebase Authentication – Email/Password |
| Admin bjuder in | Via e-postadress (joinMode:admin) – spelare väljer eget visningsnamn |
| Resultatinmatning | Alla inloggade spelare kan sätta resultat – ej admin-exklusivt |
| API-resultat | Slutgiltigt (setBy:'API') – knapp försvinner, ingen kan ändra |
| Sniper/Nostradamus/Unicorn | Behålls på topplistan |
| Troféer/stjärnor i namn | BORTTAGET |
| Historik-flik | BORTTAGET |
| Åskådarläge | BORTTAGET |
| Aktivitetslogg (admin) | BORTTAGET från admin-panel |
| Spara/nollställ säsong | BORTTAGET |

---

## Viktiga tekniska mönster
- Alla onclick-funktioner MÅSTE vara `window.functionName = function()` (module-script)
- `scheduleRender()` – debounced rendering via requestAnimationFrame
  - Anropar: `rebuildMatchMap()` → `rebuildPointsCache()` → render (trophyCache borttaget)
- Firebase Auth: `onAuthStateChanged` som ingångspunkt (inte direkt routeFromUrl)
- `currentUser` = visningsnamn (string), `currentUserUID` = Firebase Auth UID
- `isAdmin()` = `currentUserUID === currentLeagueInfo.adminUID || isGhost()`
- `leaguePlayers` = `Object.values(members).map(m => m.name)` (ej separat array i Firebase)
- E-postkodning: `@` → `_AT_`, `.` → `_DOT_` (Firebase-nycklar i invitedEmails)
- `showStatus(msg, type)` använder `textContent` (ej innerHTML) för XSS-säkerhet
- Deadline-system: per-omgång spelstopp (inte bara "första matchen startad")
  - Deadline-chips med nedräkning (`data-countdown`, `updateCountdownSpans()`)

## Design – tema (VIKTIGT)
KC följer exakt KrokensCopas design:
- **Landningssida / inloggning**: Mörkt Matchnight-tema (`#0a0c10`, guld `#f0b429`, Bebas Neue)
- **Main-appen (efter inloggning)**: Ljust tema (`#f0f4f8` bakgrund, vita kort `#ffffff`, `border: 1px solid #dde3ec`)
- **Header**: Kompakt mörk header (`#1e2535`) med `Krokens<span>Copa</span>` – liten fiskikon
- **Knappar**: Guld primär (`#f0b429`), ljusgrå sekundär (`#e2e8f0`), `border-radius: 4px`
- **Tabs**: Underline-stil, aktiv = mörk guld (`#d4930a`)
- **Topplistans header**: `#d4930a`
- **Status-meddelanden (ljust tema)**: `d1fae5/fee2e2/fef3c7` utan border

## Signatur
Längst ner på sidan: "Made by: David Hefner" (liten, dämpad färg)
