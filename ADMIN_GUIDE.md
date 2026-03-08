# Krokens Copa – Admin-guide

Den här guiden är till för dig som är ligaadmin i Krokens Copa. Här förklaras steg för steg hur du kommer igång och vad du kan göra i appen.

---

## Steg 1 – Skapa en liga

1. Gå till **https://vg1414.github.io/KC/**
2. Klicka på knappen **"Skapa liga"**
3. Fyll i formuläret:
   - **Ditt namn** – det här blir ditt namn i ligan när du är inloggad som admin. Använd inga specialtecken som `.`, `#`, `$`, `[`, `]`.
   - **Lösenord** – välj ett lösenord du minns. Du behöver det varje gång du loggar in som admin.
   - **Liganamn** – ge ligan ett namn, t.ex. "VM 2026" eller "Krokens Copa Säsong 3".
   - **Tävlingar** – kryssa i vilka tävlingar gruppen ska tippa på: Premier League, Champions League och/eller VM.
   - **Spelregistrering** – se "Två sätt att registrera spelare" nedan.
4. Klicka **"Skapa liga"**
5. Du får nu en **6-teckens kod** och en **länk** – spara båda! Du behöver dem för att dela ligan.
6. En fråga visas: "Vill du delta i tippningen?"
   - **"Ja, lägg till mig"** – välj detta om du själv ska tippa med i gruppen
   - **"Nej, bara admin"** – välj detta om du bara ska sköta ligan

---

## Steg 2 – Dela ligan med deltagarna

Du kan dela ligan på två sätt – välj det som passar:

- **Koden** (6 tecken, t.ex. `HJK4P2`) – deltagarna skriver in den på startsidan
- **Länken** (t.ex. `https://vg1414.github.io/KC/?liga=HJK4P2`) – kopiera och skicka direkt i chatten

Koden och länken hittar du alltid under **Admin-panelen → Ligainfo & Delning**.

---

## Steg 3 – Logga in som admin

1. Gå till ligans sida (via länken eller koden)
2. Bläddra ner till **"Admin?"**-sektionen i inloggningsformuläret
3. Skriv in ditt adminlösenord
4. Klicka **"Logga in som admin"**
5. Du är nu inne i Admin-panelen

---

## Två sätt att registrera spelare

### Alternativ 1 – Du lägger in spelare själv (rekommenderas)
Du som admin lägger till varje deltagare för hand med namn. Spelaren väljer sitt eget lösenord första gången de loggar in. Passar bra när du känner alla i gruppen.

### Alternativ 2 – Spelare registrerar sig själva
Deltagarna ansöker om att gå med direkt i appen. Du som admin godkänner eller nekar varje ansökan. Praktiskt om du inte vet i förväg exakt vilka som ska vara med.

---

## Admin-panelen – vad kan du göra?

### Ligainfo & Delning
Visar ligans kod och länk. Kopieringsknapp finns bredvid båda.
Använd det här om du behöver skicka länken till en ny deltagare i efterhand.

---

### Ladda matcher
Här hämtar du in de kommande matcherna så att deltagarna kan börja tippa.

1. Välj **tävling** (Premier League, Champions League, VM eller PL + CL)
2. Ange **antal omgångar** du vill hämta
3. Klicka **"Hämta och spara matcher"**

Matcherna visas direkt för alla spelare. Om du hämtar igen skrivs inga befintliga resultat över.

> Obs: Det måste finnas en giltig API-nyckel sparad i systemet. Det sköts av superadmin.

---

### Hämta resultat

**Manuellt:** Klicka "Hämta resultat nu" för att uppdatera resultaten direkt.

**Automatiskt:** Slå på auto-hämtning – appen kontrollerar automatiskt var 15:e minut.
Auto-hämtning stängs av när du loggar ut.

Manuellt satta resultat gäller tills API:et hämtar det riktiga resultatet – då ersätts det manuella av API-resultatet. Använd manuella resultat om API:et är långsamt eller du vill lägga in ett resultat direkt.

---

### Sätt resultat manuellt

Om en match spelats men resultatet inte hämtats automatiskt kan du lägga in det själv:

1. Gå till **Matcher-fliken**
2. Klicka **"Sätt resultat"** på matchen
3. Skriv in antal mål för hemma- och bortalaget
4. Klicka **"Spara"**

Du kan också markera en match som **Inställd** – då får alla spelare 0 poäng på den matchen.
Resultat kan alltid ändras i efterhand med **"Ändra resultat"**.

---

### Hantera spelare

**Lägg till en spelare:**
Skriv spelarens namn och klicka "Lägg till". Spelaren loggar in och väljer sitt lösenord själv första gången. Tänk på att namnet inte får innehålla tecknen `.`, `#`, `$`, `[`, `]`.

**Ta bort en spelare:**
Klicka "Ta bort" bredvid spelarens namn. Obs: deras tippningar och lösenord raderas permanent.

**Godkänn väntande spelare (alternativ 2):**
Om du valt självregistrering visas ansökningar automatiskt här. Klicka "Godkänn" eller "Neka" per person.

---

### Spelstopp (Deadlines)

Deadlines styr när tippningen stänger för varje omgång.

- Sätt ett datum och klockslag per omgång
- När tidpunkten passerar låses tippningen för den omgången – inga fler tips kan ändras
- Alla spelare ser en nedräkningsklocka i tippnings-vyn
- Har du inte satt en deadline? Tippningen låses automatiskt när matchen startar

**Tips:** Sätt deadline strax innan den första matchen i varje omgång startar.

---

### Spara säsong till historik

När en säsong eller turnering är klar och du vill spara resultaten för eftervärlden:

1. Skriv in ett namn för säsongen (t.ex. "VM 2026")
2. Klicka **"Spara säsong"**
3. Topplistan sparas under Historik-fliken – alla spelare kan se den

**Gör alltid detta innan du nollställer säsongen.**

---

### Nollställ säsong

Används när en turnering är slut och ni ska börja en ny med samma grupp.

Vad som rensas: matcher, tippningar och deadlines.
Vad som **behålls**: spelare, lösenord och historik.

Rekommenderat flöde:
1. Spara säsongen till historik (se ovan)
2. Nollställ säsongen
3. Ladda in nya matcher

---

### Aktivitetslogg

Visar allt som hänt i ligan: inloggningar, tippningar, resultat och admin-åtgärder.
Appen sparar de senaste 200 händelserna med tid, namn och IP-adress.

Klicka **"Uppdatera"** för att visa loggen.

---

## Åskådare-läge

En åskådare kan se matcher, topplista och alla tippningar – men inte tippa själv.
Passar för någon som vill följa med utan att delta.

Hur: I inloggningsformuläret, välj **"Åskådare"** i listan och klicka "Logga in". Inget lösenord krävs.

---

## Poängsystemet

Poängen räknas automatiskt när resultaten är inlagda. Här förklaras hur det fungerar:

### 1X2-poäng
**Från 0–100 poäng** beroende på hur många andra som gissade samma resultat:

- **Ensam rätt** (bara du gissade rätt) = **100 poäng**
- **2 av 4 gissar rätt** = **67 poäng**
- **3 av 4 gissar rätt** = **33 poäng**
- **Alla gissar rätt** = **0 poäng** (ingen skill)

Formeln: `100 × (N−k)/(N−1)` där N = totalt antal spelare, k = antal som gissade samma.

### Bonus för exakt resultat 🔮
**+50 poäng extra** om du gissade rätt exakt slutresultat.

Exempel: Om du förutspår att Arsenal vinner **2–1** och det blir **2–1**, får du:
- 1X2-poäng (beroende på hur många andra som gissade Arsenal vinner) + **50 bonus** för exakt resultat

### Exempel
4 spelare, två spelar Arsenal vs Liverpool:
- **Dina tips:** Arsenal vinner, exakt **2–1**
- **Verkligt resultat:** Arsenal vinner **2–1**
- **Andra:** Anna tippar X, Malin och Kalle tippar Arsenal (men olika exakta resultat)

Din poäng:
- 1X2-rätt: Du är 1 av 3 som gissade Arsenal vinner → `100 × (4−3)/(4−1) = 33p`
- Exakt rätt: Du gissade **2–1** → `+50p`
- **Totalt: 83 poäng**

---

## Vanliga frågor

**Jag glömde mitt adminlösenord.**
Det går inte att återställa lösenordet via appen. Kontakta superadmin så ordnar vi det.

**En match saknas eller är fel.**
Gå till Admin-panelen och hämta matcher igen. Kontrollera att du valt rätt tävling och antal omgångar.

**En spelare kan inte logga in.**
Kontrollera att spelarens namn stämmer exakt – det är skiftlägeskänsligt (stor/liten bokstav spelar roll). Om de glömt lösenordet: ta bort spelaren och lägg till igen. De väljer nytt lösenord vid nästa inloggning.

**Tippningen är låst för en match.**
Antingen har deadlinen passerat, eller har matchen redan startat. Du kan ändra deadlines i admin-panelen om du behöver öppna tippningen igen.

**Hur länge håller inloggningen?**
Efter 10 minuters inaktivitet loggas spelaren ut automatiskt.
