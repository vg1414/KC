# Krokens Copa – Multi-Liga

Ett tippsystem för fotboll där flera ligor kan köra parallellt.

## Vad är det?

Krokens Copa Multi-Liga låter vem som helst skapa en isolerad tippliga för Premier League, Champions League eller VM. Varje liga får en unik 6-teckens kod och en delbar URL. Spelarna registrerar sig med e-post och lösenord.

## Funktioner

- **Landningssida** – ange ligakod eller skapa ny liga, visar senast besökta ligor
- **Ligakoder** – auto-genererade, 6 tecken, alfanumeriska (inga 0/O/I/1)
- **Delbar URL** – `https://vg1414.github.io/KC/?liga=HJK4P2`
- **Firebase Auth** – login och registrering med e-post + lösenord, glömt lösenord-funktion
- **Inbjudningssystem** – admin bjuder in via e-post (EmailJS), eller öppen registrering
- **Admin-notifikation** – automatiskt mail till viarkroken@gmail.com när en ny liga skapas
- **Tippning** – 1X2 + exakt slutresultat per match
- **Dynamiskt poängsystem** – 0–100p beroende på hur många som tippade rätt + 50p bonus för exakt resultat
- **Topplista** – poäng, rätt, exakta träffar
- **Titlar** – Sniper (ensam rätt), Nostradamus (flest exakta), Unicorn (solo + exakt)
- **Deadlines/Spelstopp** – per omgång med nedräkning
- **Automatisk resultathämtning** – via football-data.org API var 15:e minut
- **Regler-tab** – förklaring av poängsystem och titlar, synlig för alla spelare
- **Admin-panel** – ladda matcher, sätta resultat, hantera spelare, deadlines
- **Ghost-bakdörr** – superadmin-åtkomst för Hefner (5 klick på fiskikonen)
- **Superadmin-panel** – ligaöversikt och radering av ligor

## Poängsystem

Poängen är dynamiska – ju färre som gissar rätt, desto mer är poängen värda:

```
Rätt 1X2:  100 × (N − k) / (N − 1)   (N = antal spelare, k = antal som tippade rätt)
Exakt:     +50 bonuspoäng
```

Exempel med 4 spelare: ensam rätt = 100p, 2 rätt = 67p, 3 rätt = 33p, alla rätt = 0p.

## Stack

- Vanilla HTML/CSS/JS – ingen build-step, single-file app (`index.html`)
- Firebase Realtime Database + Firebase Authentication
- football-data.org API för matcher och resultat
- EmailJS för inbjudningsmail och admin-notifikationer
- Mobile-first design

## Kom igång

Öppna direkt på: **https://vg1414.github.io/KC/**

## Ligakod

Teckenuppsättning: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (inga 0/O/I/1 för att undvika förväxling)
Format: 6 tecken, t.ex. `HJK4P2`
