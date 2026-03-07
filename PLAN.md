# KC – Arkitektur- och Funktionsplan

## Övergripande koncept

En liga = en isolerad "bubbla" i Firebase med egna spelare, matcher, tipp och historik.
Varje liga identifieras av en auto-genererad 6-teckens kod (t.ex. `HJK4P2`).
Koden ger också en delbar URL: `https://vg1414.github.io/KC/?liga=HJK4P2`

---

## URL-routing (single-file app)

```
index.html              → Landningssida
index.html?liga=HJK4P2  → Direkt till ligan HJK4P2 (hoppar förbi landningssidan)
```

JS kollar `window.location.search` vid sidladdning och renderar rätt vy.

---

## Firebase-datastruktur

```json
{
  "leagues": {
    "HJK4P2": {
      "info": {
        "name": "Krokens Copa Sommar 2025",
        "createdAt": 1234567890,
        "createdBy": "Anna",
        "joinMode": "admin",
        "competitions": ["VM"],
        "status": "active",
        "adminUID": "<firebase-auth-uid>",
        "adminEmail": "anna@gmail.com",
        "defaultRounds": { "VM": 2 }
      },
      "members": {
        "<uid_admin>": { "name": "Anna", "email": "anna@gmail.com", "joinedAt": 1234567890 },
        "<uid_majscht>": { "name": "Majscht", "email": "majscht@gmail.com", "joinedAt": 1234567890 }
      },
      "invitedEmails": {
        "majscht_AT_gmail_DOT_com": true,
        "olle_AT_gmail_DOT_com": true
      },
      "pendingMembers": {
        "<uid_ny>": { "name": "NyKille", "email": "ny@gmail.com", "requestedAt": 1234567890 }
      },
      "matches": [
        {
          "id": "m1",
          "homeTeam": "Sverige",
          "awayTeam": "Brasilien",
          "league": "VM",
          "date": "2026-06-15T15:00:00Z",
          "actualOutcome": null,
          "actualScore": null,
          "apiMatchId": 12345
        }
      ],
      "predictions": {
        "m1": {
          "Hefner": "1",
          "Majscht": "X"
        }
      },
      "exactPredictions": {
        "m1": {
          "Hefner": "2-1"
        }
      },
      "predictions": {
        "m1": { "Anna": "1", "Majscht": "X" }
      },
      "exactPredictions": {
        "m1": { "Anna": "2-1" }
      }
    }
  }
}
```

### Notera om adminUID
`adminUID` är Firebase Auth UID för den som skapade ligan.
Admin-check: `currentUserUID === currentLeagueInfo.adminUID || isGhost()`

### E-postkodning för invitedEmails
Firebase-nycklar tillåter inte `.` `#` `$` `[` `]` `/` `@`.
E-poster kodas: `@` → `_AT_`, `.` → `_DOT_`
Exempel: `anna@gmail.com` → `anna_AT_gmail_DOT_com`

---

## Ligakodgenerering (JS, client-side)

```javascript
// Teckenuppsättning: inga 0/O/I/1 för att undvika förväxling
const CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

async function generateLeagueCode() {
  let code;
  let attempts = 0;
  do {
    code = Array.from({length: 6}, () =>
      CHARS[Math.floor(Math.random() * CHARS.length)]
    ).join('');
    attempts++;
    if (attempts > 20) throw new Error('Kunde inte generera unik kod');
  } while (await codeExists(code)); // kolla mot Firebase
  return code;
}
```

---

## Vyer i appen (renderingsstates)

### 1. Landningssida (ingen ?liga= i URL)
```
┌──────────────────────────────────┐
│  🎣  Krokens Copa                │
│                                  │
│  [  Ange ligakod  ] [Gå till →] │
│                                  │
│  ──────────────────────────────  │
│  Admin? [Skapa ny liga]          │
└──────────────────────────────────┘
```

### 2. Ogiltlig kod (kod finns inte i Firebase)
```
Ligan "XYZ123" hittades inte.
[← Tillbaka]
```

### 3. Inloggning (liga hittad, joinMode: "admin")
```
┌──────────────────────────────────┐
│  🎣  Krokens Copa                │
│      Liganamn: VM 2026           │
│                                  │
│  Namn: [_________]               │
│  Lösen: [_________]              │
│  [Logga in]                      │
└──────────────────────────────────┘
```

### 4. Inloggning med självregistrering (joinMode: "self")
```
┌──────────────────────────────────┐
│  🎣  Krokens Copa                │
│      Liganamn: VM 2026           │
│                                  │
│  Namn: [_________]               │
│  Lösen: [_________]              │
│  [Logga in]  [Ny spelare? Gå med]│
└──────────────────────────────────┘
```

### 5. Huvud-appen (inloggad)
Samma layout som nuvarande PL-app:
- Tabs: Topplista | Tippning | Historik | Admin (om Hefner)
- Allt data hämtas från `/leagues/{kod}/...`

### 6. Admin: Skapa ny liga
```
Liga-namn: [_____________]
Tävlingar: [✓] PL  [✓] CL  [ ] VM
Spelregistrering: (•) Jag lägger in spelare  ( ) Spelare registrerar sig själva
[Skapa liga]
↓
Ligan skapad!
Kod: HJK4P2
Länk: https://vg1414.github.io/KC/?liga=HJK4P2
[Kopiera länk] [Kopiera kod]
```

---

## Funktionslista (komplett)

### Landningssida
- [ ] Visa landningssida om ingen ?liga= i URL
- [ ] Validera kod mot Firebase (visa fel om kod saknas)
- [ ] Navigera till liga via kod eller URL
- [ ] Admin-knapp: visa formulär för att skapa liga (kräver Hefner-lösenord)
- [ ] Skapa liga: generera kod, spara info i Firebase, visa delningsinfo

### Inloggning
- [ ] Login för förregistrerade spelare (joinMode: admin)
- [ ] Login + registrering för nya spelare (joinMode: self)
- [ ] SHA-256 lösenordshashning (WebCrypto)
- [ ] 10-min session via localStorage (nyckel: `kc_session_{ligakod}`)
- [ ] passwordsLoaded-flagga mot race condition

### Tippning
- [ ] Hämta matcher från `/leagues/{kod}/matches`
- [ ] Deadline-system: per-omgång spelstopp (deadline-chips med nedräkning)
  - Låses per omgång när deadline passerats (ej globalt vid första matchstart)
  - Sparas i `/leagues/{kod}/deadlines/{omgång}`
- [ ] Åskådare-läge: ingen lösenord, direkt inloggning, kan se men inte tippa
- [ ] Spara 1X2-tipp
- [ ] Spara exakt resultat
- [ ] Gruppera matcher per omgång/fas (PL=matchday, CL/VM=fas)
- [ ] tippCountLabel – visar antal tipp som lagts

### Topplista
- [ ] Dynamisk poängberäkning (samma formel som KrokensCopa)
- [ ] +50p bonus för exakt resultat
- [ ] Sortering, visa alla spelare
- [ ] 🏆-ikoner för säsongsvinster (5 = ⭐)
- [ ] Sniper-titel (ensam rätt 1X2)
- [ ] Nostradamus-titel (flest exakta resultat)
- [ ] Unicorn-titel (ny i KrokensCopa)

### Admin-panel (Hefner)
- [ ] Ladda matcher via football-data.org API (PL, CL, VM)
- [ ] Sätt matchresultat manuellt (modal med POSTPONED-stöd)
- [ ] Auto-hämta resultat (var 15:e minut)
- [ ] Hantera spelare (lägg till/ta bort)
- [ ] Hantera deadlines per omgång (datum + tid)
- [ ] Godkänn väntande spelare (om joinMode: self)
- [ ] Spara säsong till historik
- [ ] Nollställ säsong (matcher + tipp, behåll historik och spelare)
- [ ] Visa aktivitetslogg (med IP-loggning)
- [ ] Visa/kopiera ligakod och delningslänk

### Historik-flik
- [ ] Visa sparade säsonger
- [ ] Visa topplista per säsong

---

## Poängsystem (oförändrat från PL-appen)

```
N = antal spelare i ligan
k = antal spelare som hade rätt på samma tips

Om rätt: poäng = Math.round(100 × (N − k) / (N − 1))
Om exakt resultat också rätt: +50 bonus (oavsett om 1X2 var rätt)
Om fel: 0
Uppskjuten match: 0 för alla
```

---

## Prestationsoptimering (ärvt från KrokensCopa)

- `scheduleRender()` – debounced rendering, kallar inte render direkt från Firebase-listeners
  - Ordning: `rebuildMatchMap()` → `rebuildTrophyCache()` → `rebuildPointsCache()` → render
- `matchMap` / `getMatch(id)` – O(1) matchsökning, byggs om varje render-cykel
- `trophyCache` / `getPlayerTrophyHTML()` – troféer byggs en gång per render-cykel
- `pointsCache` / `getCachedPoints()` – poäng beräknas en gång per render-cykel
- Firebase-listeners kallar `scheduleRender()`, inte enskilda render-funktioner
- Deadline-countdown: `setInterval(updateCountdownSpans, 60000)` – uppdaterar `[data-countdown]`-element

---

## API-integration (football-data.org)

Samma nyckel och mönster som PL-appen. Anropen grupperas per datum+tävling.
CORS-proxy: `corsproxy.io`
Tävlingskoder: PL = `PL`, CL = `CL`, VM = `WC`

---

## Säkerhet

- Firebase Auth: Email/Password (aktiveras i Firebase Console)
- Firebase-regler: `auth != null` för läsning och skrivning (deployade i Session 8)
- Lösenord: hanteras helt av Firebase Auth (ingen SHA-256 i klienten)
- Admin: `info.adminUID` jämförs mot Firebase Auth UID
- Ligakod = skydd mot obehöriga att hitta ligan (tillräckligt för use case)

---

## Planerade förbättringar – Landningssida, Admin-ingång & Per-liga-admin

### Beslut
Alternativ B valt: Admin kan logga in i en liga direkt med adminlösenord, utan att vara registrerad spelare.
**Uppdaterat beslut:** Ingen global Hefner-admin. Den som skapar en liga blir admin för just den ligan.
Namn och lösenord väljs fritt vid ligeskapande. `createdBy` + `adminHash` i `info` identifierar admins.

---

### Del 1 – Ny landningssida

**Nuläge:** Otydlig sida med kodinmatning + dold Hefner-admin-sektion.

**Nytt:** Två tydliga kort direkt på sidan. Ingen förinloggning krävs – vem som helst kan skapa en liga.

```
┌──────────────────────────────────┐
│  🎣  Krokens Copa                │
│                                  │
│  ┌──────────────────────────┐    │
│  │  🎣  Gå med i en liga    │    │
│  │  [  Ange ligakod  ]      │    │
│  │  [Gå till liga →]        │    │
│  └──────────────────────────┘    │
│                                  │
│  ┌──────────────────────────┐    │
│  │  ➕  Skapa ny liga       │    │
│  │  Namn:    [__________]   │    │
│  │  Lösenord:[__________]   │    │
│  │  [Skapa liga →]          │    │
│  └──────────────────────────┘    │
└──────────────────────────────────┘
```

**Ändringar:**
- Ta bort `adminLoggedIn`, `adminHashStored`, `adminHashLoaded`, `adminConfig/hefnerHash`-hämtning
- `viewLanding`: Kort 1 = gå med, Kort 2 = skapa liga (namn + lösenord direkt, ingen förlogin)
- `viewCreate`: Behåll formuläret (liganamn, tävlingar, joinMode), men flytta hit namn+lösenord
- `window.createLeague()`: Hasha lösenordet på plats, spara som `info.adminHash` + `info.createdBy`

---

### Del 2 – Admin-ingång till liga

**Problem:** Tom liga → ingen i spelar-dropdown → ingen kan logga in.

**Lösning:** Admin-ingång längst ner i login-formuläret för varje liga.

```
┌──────────────────────────────────┐
│  🎣  Krokens Copa                │
│      Liganamn: VM 2026           │
│                                  │
│  [Normal spelar-login]           │
│                                  │
│  ── Admin? ──────────────────    │
│  Lösenord: [___________]         │
│  [🔑 Logga in som admin]         │
└──────────────────────────────────┘
```

**Teknisk implementation:**

1. `buildAdminLoginForm()` och `buildSelfLoginForm()` – lägg till admin-ingång-sektion i båda
2. Ny funktion `window.handleAdminLeagueLogin()`:
   - Hämtar lösenord från fältet
   - SHA-256-hashar det
   - Jämför mot `currentLeagueInfo.adminHash`
   - Om korrekt → `activateSession(currentLeagueInfo.createdBy)`
3. `activateSession(player)`: om `player === currentLeagueInfo.createdBy` → `switchTab('admin')` istället för `switchTab('tippning')`

**Flöde:**
1. Admin skapar liga (väljer namn + lösenord)
2. Liga sparas med `createdBy: "Anna"`, `adminHash: "<sha256>"`
3. Admin navigerar till ligan
4. Klickar "Logga in som admin" → skriver lösenordet
5. Hamnar direkt i Admin-panelen → lägger till spelare
6. Spelare loggar in normalt

---

### Del 3 – Ersätt alla Hefner-hårdkodningar i appen

Alla ställen där `'Hefner'` jämförs mot `currentUser` byts ut mot `currentUser === currentLeagueInfo.createdBy`.

| Nuläge | Nytt |
|--------|------|
| `currentUser === 'Hefner'` | `currentUser === currentLeagueInfo.createdBy` |
| `player === 'Hefner'` (admin-tab) | `player === currentLeagueInfo.createdBy` |
| `p !== 'Hefner'` (ta bort-knapp) | `p !== currentLeagueInfo.createdBy` |
| `setBy: 'Hefner'` (resultat) | `setBy: currentLeagueInfo.createdBy` |
| `createdBy: 'Hefner'` (skapa liga) | `createdBy: <namn från formulär>` |
| `adminConfig/hefnerHash` (Firebase) | Tas bort helt |

Gäller även UI-text: "Hefner laddar in matcher" → "Admin laddar in matcher".

---

### Del 4 – Session

Session-nyckeln `kc_session_{ligakod}` sparar spelarnamnet.
När admin loggar in sparas `currentLeagueInfo.createdBy` → fungerar utan ytterligare ändringar.

---

### Filer som ändras
- `index.html` – landningssida HTML, `createLeague()`, `buildAdminLoginForm()`, `buildSelfLoginForm()`, ny `handleAdminLeagueLogin()`, `activateSession()`, alla `currentUser === 'Hefner'`-kontroller, admin-UI-texter

### Filer som INTE ändras
- Firebase-struktur (`createdBy` + `adminHash` finns redan i `info`)
- Poängsystem, matcher, topplista – ingen förändring
