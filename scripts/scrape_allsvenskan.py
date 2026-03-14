"""
Allsvenskan scraper – hämtar fixtures och resultat från allsvenskan.se (GraphQL)
och skriver till Firebase Realtime Database under globalMatches/ALLSVENSKAN/2026/

Körs av GitHub Actions:
  - En gång per dag: uppdaterar alla fixtures (datum, tid, lag)
  - Var 30:e minut: hämtar resultat för matcher som startade för 3+ timmar sedan
"""

import json
import os
import sys
import time
from datetime import datetime, timezone, timedelta

import requests
import firebase_admin
from firebase_admin import credentials, db

# ── Konstanter ────────────────────────────────────────────────────────────────
GQL_URL = "https://gql.sportomedia.se/graphql"
LEAGUE_NAME = "allsvenskan"
SEASON_YEAR = 2026
FIREBASE_DB_URL = "https://krokenscopa-multi-default-rtdb.firebaseio.com"
FIREBASE_PATH = "globalMatches/ALLSVENSKAN/2026"

GQL_QUERY = """
{
  matchesForLeague(
    configLeagueName: "allsvenskan",
    configSeasonStartYear: 2026
  ) {
    matches {
      id
      startDate
      homeTeamNameFormatted
      visitingTeamNameFormatted
      homeTeamScore
      visitingTeamScore
      status
      round
    }
  }
}
"""

# ── Firebase-init ─────────────────────────────────────────────────────────────
def init_firebase():
    """Initierar Firebase med service account från env-variabel eller fil."""
    service_account_json = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if service_account_json:
        cred_dict = json.loads(service_account_json)
        cred = credentials.Certificate(cred_dict)
    else:
        # Lokalt test: leta efter JSON-filen i projektmappen
        local_file = os.path.join(os.path.dirname(__file__), "..", "krokenscopa-multi-firebase-adminsdk-fbsvc-998037186d.json")
        if not os.path.exists(local_file):
            print("❌ Ingen Firebase-autentisering hittades (varken env-variabel eller lokal fil)")
            sys.exit(1)
        cred = credentials.Certificate(local_file)

    firebase_admin.initialize_app(cred, {"databaseURL": FIREBASE_DB_URL})
    print("✅ Firebase initierat")

# ── Hämta matcher från allsvenskan.se ────────────────────────────────────────
def fetch_matches():
    """Hämtar alla Allsvenskan 2026-matcher via GraphQL."""
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Mozilla/5.0 (compatible; KrokensCopa-scraper/1.0)",
        "Origin": "https://allsvenskan.se",
        "Referer": "https://allsvenskan.se/",
    }
    payload = {"query": GQL_QUERY}

    resp = requests.post(GQL_URL, json=payload, headers=headers, timeout=15)
    resp.raise_for_status()
    data = resp.json()

    matches = data["data"]["matchesForLeague"]["matches"]
    print(f"✅ Hämtade {len(matches)} matcher från allsvenskan.se")
    return matches

# ── Konvertera match till Firebase-format ─────────────────────────────────────
def convert_match(m):
    """Konverterar en match från GraphQL-format till Firebase-format."""
    match_id = str(m["id"])

    # Konvertera startDate (UTC ISO) till svensk tid
    utc_dt = datetime.fromisoformat(m["startDate"].replace("Z", "+00:00"))
    swedish_tz = timezone(timedelta(hours=2))  # CEST – sommartid
    # Använd UTC+1 (CET) för matcher januari–mars/november–december
    # Python hanterar inte IANA-tidszoner utan pytz/zoneinfo – vi använder
    # en förenklad approach: UTC+1 vintertid, UTC+2 sommartid (apr–okt)
    month = utc_dt.month
    offset_hours = 2 if 4 <= month <= 10 else 1
    local_dt = utc_dt + timedelta(hours=offset_hours)

    date_str = local_dt.strftime("%Y-%m-%d")
    time_str = local_dt.strftime("%H:%M")

    status = m["status"]  # UPCOMING, FINISHED, ONGOING, POSTPONED, INTERRUPTED

    result = {
        "homeTeam": m["homeTeamNameFormatted"],
        "awayTeam": m["visitingTeamNameFormatted"],
        "date": f"{date_str}T{time_str}",
        "league": f"Allsvenskan – Omgång {m['round']}",
        "round": m["round"],
        "competition": "ALLSVENSKAN",
        "apiMatchId": match_id,
        "fotmobStatus": status,
        "stage": None,
    }

    # Lägg till resultat om matchen är klar
    if status == "FINISHED" and m["homeTeamScore"] is not None and m["visitingTeamScore"] is not None:
        h = m["homeTeamScore"]
        a = m["visitingTeamScore"]
        if h > a:
            outcome = "HOME"
        elif a > h:
            outcome = "AWAY"
        else:
            outcome = "DRAW"
        result["actualOutcome"] = outcome
        result["actualScore"] = f"{h}-{a}"
        result["setBy"] = "API"
        result["setAt"] = datetime.now(timezone.utc).isoformat()
    elif status == "POSTPONED":
        result["actualOutcome"] = "POSTPONED"
        result["actualScore"] = None
        result["setBy"] = "API"
        result["setAt"] = datetime.now(timezone.utc).isoformat()

    return match_id, result

# ── Skriv till Firebase ───────────────────────────────────────────────────────
def update_firebase(matches_raw):
    """Skriver alla matcher till Firebase. Bevarar befintliga tipp (setBy != API)."""
    firebase_ref = db.reference(FIREBASE_PATH)

    # Hämta befintlig data för att bevara manuellt satta resultat
    existing = firebase_ref.get() or {}

    updates = {}
    fixtures_updated = 0
    results_updated = 0

    for m in matches_raw:
        match_id, converted = convert_match(m)

        existing_match = existing.get(match_id, {})

        # Bevara manuellt satta resultat (setBy = spelarnamn, ej 'API')
        set_by = existing_match.get("setBy")
        if set_by and set_by != "API" and existing_match.get("actualOutcome"):
            # Behåll existerande resultat men uppdatera datum/tid/lag
            converted["actualOutcome"] = existing_match["actualOutcome"]
            converted["actualScore"] = existing_match.get("actualScore")
            converted["setBy"] = existing_match["setBy"]
            converted["setAt"] = existing_match.get("setAt")

        # Räkna vad som ändrats
        if converted.get("setBy") == "API" and not existing_match.get("setBy"):
            results_updated += 1
        elif existing_match.get("date") != converted.get("date"):
            fixtures_updated += 1

        updates[match_id] = converted

    firebase_ref.update(updates)
    print(f"✅ Firebase uppdaterat: {len(updates)} matcher ({results_updated} nya resultat, {fixtures_updated} ändrade tider)")

# ── Kolla om det finns matcher att hämta resultat för ────────────────────────
def check_pending_results(matches_raw):
    """Returnerar True om det finns avslutade matcher utan resultat i Firebase."""
    firebase_ref = db.reference(FIREBASE_PATH)
    existing = firebase_ref.get() or {}

    now = datetime.now(timezone.utc)
    pending = []

    for m in matches_raw:
        if m["status"] == "FINISHED":
            match_id = str(m["id"])
            existing_match = existing.get(match_id, {})
            if not existing_match.get("actualOutcome") or existing_match.get("actualOutcome") == "POSTPONED":
                pending.append(m["homeTeamNameFormatted"] + " vs " + m["visitingTeamNameFormatted"])

    if pending:
        print(f"⏳ {len(pending)} matcher med resultat att hämta:")
        for p in pending[:5]:
            print(f"   - {p}")
    return len(pending) > 0

# ── Huvudlogik ────────────────────────────────────────────────────────────────
def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "fixtures"
    # mode = "fixtures" → uppdatera alla fixtures (körs en gång per dag)
    # mode = "results"  → hämta resultat för startade matcher (körs var 30:e minut)

    print(f"🚀 Allsvenskan-scraper startar (mode: {mode})")
    print(f"   Tid (UTC): {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}")

    init_firebase()

    matches_raw = fetch_matches()

    if mode == "fixtures":
        # Uppdatera alla fixtures (datum, tid, lag, resultat)
        update_firebase(matches_raw)

    elif mode == "results":
        # Kolla om det finns nya resultat – om ja, uppdatera Firebase
        has_pending = check_pending_results(matches_raw)
        if has_pending:
            update_firebase(matches_raw)
        else:
            print("✅ Inga nya resultat att hämta")

    print("✅ Klar!")

if __name__ == "__main__":
    main()
