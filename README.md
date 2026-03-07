# Krokens Copa – Multi-Liga

Ett tippsystem for fotboll dar flera ligor kan kora parallellt.

## Vad ar det?

Krokens Copa Multi-Liga later Hefner skapa isolerade tippigas for olika turnament (Premier League, Champions League, VM). Varje liga far en unik 6-teckens kod och en delbar URL.

## Funktioner

- **Landningssida** – ange ligakod eller skapa ny liga
- **Ligakoder** – auto-genererade, 6 tecken, alfanumeriska (inga 0/O/I/1)
- **Delbar URL** – `https://vg1414.github.io/KC/?liga=HJK4P2`
- **Adminlage** – Hefner skapar och administrerar ligor
- **Tippning** – 1X2 + exakt resultat (Session 2)
- **Topplista** – dynamisk poangberakning (Session 3)
- **Historik** – sparade säsonger med topplista per säsong
- **Säsongshantering** – admin sparar säsong till historik, sedan nollställning

## Stack

- Vanilla HTML/CSS/JS (ingen build-step)
- Firebase Realtime Database
- football-data.org API for matcher
- Single-file app (`index.html`)

## Kom igang

Oppna `index.html` i webblasar eller ga till:
https://vg1414.github.io/KC/

## Ligakod

Teckenuppsattning: `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (inga 0/O/I/1)
Format: 6 tecken, t.ex. `HJK4P2`
