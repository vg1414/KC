# Att göra – Fredag

## Problem
corsproxy.io har slutat hantera CORS preflight korrekt för custom headers (X-Auth-Token).
Alla API-anrop till football-data.org misslyckas med:
"Response to preflight request doesn't pass access control check: It does not have HTTP ok status."

## Lösning: Cloudflare Worker
Sätt upp en gratis Cloudflare Worker som agerar proxy.

### Steg 1 – Skapa Cloudflare-konto
- Gå till cloudflare.com och skapa gratis konto (om du inte redan har ett)

### Steg 2 – Skapa Worker
1. Logga in → gå till **Workers & Pages**
2. Klicka **Create** → **Create Worker**
3. Ge den ett namn, t.ex. `football-proxy`
4. Klicka **Deploy** (med default-koden)
5. Klicka **Edit code** och ersätt allt med detta:

```js
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
          'Access-Control-Max-Age': '86400',
        }
      });
    }

    const url = new URL(request.url);
    const path = url.searchParams.get('path');
    if (!path) return new Response('Missing path', { status: 400 });

    const apiUrl = `https://api.football-data.org/v4/${path}`;
    const response = await fetch(apiUrl, {
      headers: { 'X-Auth-Token': env.FOOTBALL_API_KEY }
    });

    const data = await response.text();
    return new Response(data, {
      status: response.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
};
```

6. Klicka **Deploy**

### Steg 3 – Lägg till API-nyckeln som secret
1. Gå till din Worker → **Settings** → **Variables and Secrets**
2. Klicka **Add** → välj **Secret**
3. Namn: `FOOTBALL_API_KEY`
4. Värde: (din football-data.org API-nyckel)
5. Klicka **Deploy**

### Steg 4 – Notera Worker-URL:en
Den ser ut ungefär så här: `https://football-proxy.DITTNAMN.workers.dev`

### Steg 5 – Uppdatera index.html
Claude uppdaterar de två fetch-anropen i index.html:

**fetchCompetitionMatches:**
```js
const path = `competitions/${code}/matches?status=SCHEDULED,TIMED`;
const url = `https://football-proxy.DITTNAMN.workers.dev/?path=${encodeURIComponent(path)}`;
const response = await fetch(url);
```

**fetchResults:**
```js
const path = `competitions/${group.comp}/matches?dateFrom=${group.matchDate}&dateTo=${group.matchDate}`;
const url = `https://football-proxy.DITTNAMN.workers.dev/?path=${encodeURIComponent(path)}`;
const response = await fetch(url);
```

(API-nyckeln skickas inte längre från frontend – den lagras säkert i Worker)

## Bonus
API-nyckeln blir osynlig i koden – säkrare än tidigare!
