[x] EMAILJS – Skicka inbjudningsmail direkt från appen (ingen backend behövs)
    - Gratis upp till 200 mail/månad, kopplas till Gmail
    - David gör manuellt: Skapa konto på emailjs.com → koppla Gmail → skapa mall med {{to_email}}, {{league_name}}, {{league_url}} → notera Service ID, Template ID, Public Key
    - Claude implementerar sedan: ersätt "tillagd i inbjudningslistan"-meddelandet med riktig mailsändning via EmailJS SDK
    - Referens: adminInvitePlayer() i index.html

[x] GHOST FIREBASE AUTH – Löst automatiskt i koden (ingen manuell setup krävs)
    - Vid första ghost-login skapas Firebase Auth-kontot automatiskt med GHOST_EMAIL + ghost-lösenordet
    - Vid nästa ghost-login loggas kontot in automatiskt
    - OBS: Om ghost-lösenordet byts måste Firebase Auth-kontot återställas manuellt (Authentication → ta bort ghost-användaren, nästa login skapar nytt konto)


[x] "fyll i bada siffrorna" ska vara "fyll i båda siffrorna"
[x] klickar man på krokenscopa texten under fisken ska man komma till öppningssidan utan någon liga
[x] skriv om admin_guide utan att nämna firebase. Den ska vara skriven som att en verklig nybörjare förstår hur man hanterar funktionerna.
[x] kunna komma in i superadmin från startsidan och sedan kunna välja ligor i en droplist som finns
[x] när man hämtar matcher ska bara rutorna som spelar någon roll efter man valt liga/ligor synas
[x] admin ska kunna radera vald liga
[x] gör det enkelt när man skapar en ny liga så man slipper göra valet inne i ligan senare. fråga vilka ligor som ska spelas och hur många omgångar i varje liga.
[x] starta automatisk resultathämtning av sig själv utan att valet finns
[x] det blir problematiskt för folk att logga in då folk inte kommer komma ihåg sina ligakoder. hur ska vi lösa detta?
[x] glömt lösenord fungerar inte som den ska. ❌ Ange din e-postadress i fältet ovan, klicka sedan igen - finns inget fält ovan.
[x] svart bakgrund i aktivitetslogg och senaste längst ner. större typsnitt också så det blir läsbart.
[] Ligor raderas 1mån efter sista matchen
[] Föräldralösa Firebase Auth-konton – användare som skapat konto men aldrig gått med i en liga syns inte i superadmin-listan. Behöver lösas, t.ex. via Firebase Admin SDK eller en cleanup-funktion i superadmin som listar Auth-konton utan ligamedlemskap.
[] Gör så man inte kan ha samma namn i en liga
[] Komma ihåg ligakoden kanske inte behövs? Vad tycker du?
[] Alla kan se sin egen tippning under matcher. När spelstopp passerat visas allas tippningar under matcher. När spelstopp passerat döljs tippa-fliken. Dead-line verkar inte synas under tippa.