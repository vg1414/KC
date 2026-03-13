# KC – Optimeringsförslag (inför omstrukturering)

> Skapad: 2026-03-11
> Syfte: Sammanfattning av vad som bör förbättras gällande mobiloptimering, UX och kodkvalitet.

---

## TIER 1 – KRITISKT (åtgärda innan/under omstrukturering)

### 1. Touchytor för små (< 44×44px)

**Problemet**: Flera knappar och klickbara element uppfyller inte Apples/Googles minimikrav på 44×44px touchyta. Det gör dem svåra att trycka på, speciellt för äldre och för stress-situationer (live-spel).

**Drabbade ställen:**
- Glömt-lösenord-knapp (~32px hög)
- Landningssidans flikar (ca 32px)
- Super-admin-flikar (~28px)
- Admin-kopieringsknappar
- Resultat-input-knapp i modal

**Lösning**: Lägg till `min-height: 44px` på basklasserna `.btn-gold`, `.btn-ghost`, `.btn-green` och alla knappar utan explicit höjd.

---

### 2. Saknar tablet-breakpoint (768px)

**Problemet**: Det finns bara **ett** breakpoint: `@media (max-width: 480px)`. Alla surfplattor (iPad mini, iPad) renderas alltså som desktop utan optimering.

**Lösning**: Lägg till ett 768px-breakpoint med:
- Bredare maxbredd på kort
- Anpassade fontsstorlekar
- Bättre rutnätslayout för matchlistor

---

### 3. Firebase-lyssnare rensas inte vid utloggning

**Problemet**: När en spelare loggar ut körs `leagueUnsubscribers` aldrig – de gamla Firebase-lyssnarena fortsätter köra i bakgrunden. Det är en **minnesl äcka** och kan orsaka konstiga buggar (t.ex. gamla ligadata dyker upp).

**Drabbat ställe**: `handleLogout()` saknar `leagueUnsubscribers.forEach(u => u())`

**Lösning**: Anropa cleanup i `handleLogout()` och vid ligabyte.

---

### 4. Alla flikar renderas om vid varje dataändring

**Problemet**: Varje gång något sparas i Firebase (t.ex. en tippning) triggas `scheduleRender()`, som **ritar om alla flikar på en gång** – även de som är dolda. Det är 3–5 fullständiga DOM-omritningar per åtgärd.

**Exempel**: Spara en tippning → `renderPredictions()` + `renderMatches()` + `renderLeaderboard()` + `renderAdminPlayers()` + `renderAdminDeadlines()` = 5 omritningar.

**Lösning**: Rendera bara den aktiva fliken. Markera övriga som "dirty" och rendera dem lazy när spelaren byter flik.

---

### 5. DOM-querys i renderloop

**Problemet**: `switchTab()` kör `document.querySelectorAll('.tab-content')` och `querySelectorAll('.app-tab')` **varje gång en flik byts**. Det är onödigt dyrt.

**Lösning**: Cacha dessa element vid sidladdning eller använd klasser + en `currentTab`-variabel.

---

## TIER 2 – HÖGT (förbättra under omstrukturering)

### 6. Modal inte mobilanpassad

**Problemet**: Resultatmodalen och admin-overlays är centrerade fixed-positionerade. På iPhone SE och liknande (< 375px) kan de sticka utanför viewport, speciellt när tangentbordet är uppe.

**Lösning**: Använd **bottom sheet**-mönster på mobil (glider upp från botten) och centrera bara på tablet+. Lägg till `overflow-y: auto` inuti modalen.

---

### 7. Super-admin-panel för trång

**Problemet**: Listan i super-admin-overlayen har `max-height: 55vh` ≈ 330px på iPhone SE. Med många ligor scrollar man i en väldigt liten yta.

**Lösning**: Öka till `80vh` på mobil, eller implementera paginering.

---

### 8. Poängberäkning körs för alla matcher vid varje spara

**Problemet**: `rebuildPointsCache()` räknar om poäng för **alla matcher × alla spelare** vid varje sparad tippning. För en liga med 30 matcher och 8 spelare = 240 beräkningar per knapptryckning.

**Lösning**: Spåra vilka matcher som ändrats och räkna bara om dem.

---

### 9. Duplikatmönster – switch/modal-logik

**Problemet**: `switchTab()` och `switchAuthTab()` gör exakt samma sak med olika element-ID:n. Två separata modal-open/close-par följer också exakt samma mönster.

**Lösning**: Skapa en generell `showOnlyElement(containerId, activeId)` och en `openModal(id)` / `closeModal(id)`.

---

### 10. Sifferinput bör ha `inputmode="numeric"`

**Problemet**: Score-inputs har `type="number"`, vilket ger decimaltangentbord på iOS. Det räcker med siffror 0–9.

**Lösning**: Byt till `type="text" inputmode="numeric" pattern="[0-9]*"` för tipp-inputs.

---

## TIER 3 – MÅTTLIGT (nice-to-have / städning)

### 11. Död kod

Följande kan tas bort:
- `fetchClientIP()` – returnerar hårdkodat `'n/a'`, anropas ingenstans
- `logActivity()` – skriver till Firebase men aktivitetsloggen är borttagen ur UI
- `hashPassword` – kommentaren är vilseledande; används bara för ghost/superadmin

---

### 12. Inline-stilar bör vara CSS-klasser

Glömt-lösenord-panelen och landningssidans knappar bygger sina stilar som inline string-konkatenering i JS. Det är svårt att underhålla och sämre för rendering.

**Lösning**: Flytta till CSS-klasser.

---

### 13. Ghost click-lyssnare binds dubbelt

`handleGhostClick` på fiskikonen binds två gånger (en gång i `DOMContentLoaded`, en gång direkt). Om DOM redan är laddad körs båda.

**Lösning**: Ta bort en av dem, behåll bara den i `DOMContentLoaded`.

---

### 14. Fontstorlekar för små på mobil

Flera element ligger på 13–14px:
- `.admin-field label`: 13px
- `.leaderboard-table` på 480px: 14px
- `.pred-row`: 14.7px

**Rekommendation**: Minst 15px för brödtext, 13px för hjälptext/etiketter.

---

### 15. Ingen landscape-optimering

Appen är inte testad/designad för liggande mobilläge. Score-inputs och kortlayout kan se konstiga ut i landscape på smala telefoner.

**Lösning**: Lägg till `@media (orientation: landscape) and (max-height: 500px)` med kompaktare layout.

---

## SAMMANFATTNING – Prioriterad lista

| # | Åtgärd | Prioritet | Typ |
|---|--------|-----------|-----|
| 1 | Touchytor min 44px | Kritisk | Mobil/UX |
| 2 | Tablet-breakpoint 768px | Kritisk | Mobil |
| 3 | Firebase cleanup vid logout | Kritisk | Bugg/Minne |
| 4 | Rendera bara aktiv flik | Kritisk | Prestanda |
| 5 | Cacha DOM-querys | Kritisk | Prestanda |
| 6 | Bottom sheet för modaler | Hög | UX |
| 7 | Super-admin panel storlek | Hög | UX |
| 8 | Selektiv poängberäkning | Hög | Prestanda |
| 9 | Generalisera switch/modal | Medel | Kodkvalitet |
| 10 | inputmode="numeric" | Medel | UX |
| 11 | Ta bort död kod | Låg | Städning |
| 12 | Inline-stilar → CSS-klasser | Låg | Kodkvalitet |
| 13 | Ghost click-dubbelbindning | Låg | Bugg |
| 14 | Fontstorlekar på mobil | Låg | UX |
| 15 | Landscape-optimering | Låg | Mobil |
