"""
update_data.py
----------------

This script generates a static JSON dataset for the Power‑4 college football
betting site.  It fetches ESPN’s scoreboard and summary endpoints for a given
date, filters for games involving at least one Power‑4 conference team
(ACC=1, Big 12=4, Big Ten=5, SEC=8) and writes the resulting data into
``data/games.json``.  Each entry in that JSON file contains the event ID,
scheduled date, broadcast network, betting lines, competitors and a
statistics object.

Because this script makes network requests to ESPN, you should run it on
your local machine (not within the hosted GitHub Pages environment).  You
will need Python 3.8+ and the ``requests`` library installed.  To install
``requests`` simply run ``pip install requests``.

Usage:

    python update_data.py --date YYYYMMDD

If no ``--date`` argument is provided the script defaults to the next
Saturday on the calendar.  After execution, commit and push the updated
``games.json`` file to GitHub to publish the new data on your site.
"""

import argparse
import datetime as _dt
import json
import sys
from typing import Any, Dict, List

import requests

# Conference group identifiers for the Power‑4 conferences
P4_GROUPS = {1, 4, 5, 8}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Update the games JSON dataset for the betting site.")
    parser.add_argument(
        "--date",
        type=str,
        default=None,
        help="Date in YYYYMMDD format. Defaults to the next Saturday.",
    )
    return parser.parse_args()


def next_saturday(today: _dt.date) -> str:
    """Return the date of the next Saturday as a YYYYMMDD string."""
    days_ahead = (5 - today.weekday()) % 7  # Saturday is weekday 5 (0=Mon)
    if days_ahead == 0:
        days_ahead = 7
    target = today + _dt.timedelta(days=days_ahead)
    return target.strftime("%Y%m%d")


def fetch_json(url: str) -> Dict[str, Any]:
    """Helper to fetch JSON from a URL and raise for bad status codes."""
    resp = requests.get(url)
    resp.raise_for_status()
    return resp.json()


def get_team_info(team_id: str) -> Dict[str, Any]:
    """
    Retrieve basic team information (conference group ID, display name and logo)
    from ESPN's core API.  Results are not cached here because the number of
    teams is limited to those appearing on the scoreboard.
    """
    base = "https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams/"
    data = fetch_json(f"{base}{team_id}?lang=en&region=us")
    group_id = None
    # The 'groups' field may be nested or absent depending on the response structure
    if isinstance(data.get("groups"), dict) and data["groups"].get("id"):
        group_id = int(data["groups"]["id"])
    logo = None
    logos = data.get("logos") or []
    if logos:
        logo = logos[0].get("href")
    name = data.get("displayName") or data.get("name") or data.get("shortDisplayName") or ""
    abbrev = data.get("abbreviation") or data.get("shortDisplayName") or ""
    return {"groupId": group_id, "name": name, "abbreviation": abbrev, "logo": logo}


def get_event_stats(event_id: str) -> Dict[str, Any]:
    """
    Fetch head‑to‑head season statistics for both teams in an event.  Returns a
    dictionary keyed by team ID with per‑team statistics.  Only statistics
    relevant to the site are extracted.
    """
    url = f"https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event={event_id}"
    summary = fetch_json(url)
    boxscore = summary.get("boxscore") or {}
    teams = boxscore.get("teams") or []
    stats_map: Dict[str, Dict[str, float]] = {}
    for t in teams:
        team_data = t.get("team") or {}
        team_id = str(team_data.get("id"))
        stats_map[team_id] = {}
        for stat in t.get("statistics", []):
            name = stat.get("name")
            try:
                value = float(stat.get("displayValue"))
            except (TypeError, ValueError):
                continue
            stats_map[team_id][name] = value
    return stats_map


def build_games_for_date(date_str: str) -> List[Dict[str, Any]]:
    """Fetch and build event objects for the specified date."""
    games: List[Dict[str, Any]] = []
    scoreboard_url = (
        f"https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates={date_str}"
    )
    scoreboard = fetch_json(scoreboard_url)
    events = scoreboard.get("events") or []
    for event in events:
        competitions = event.get("competitions") or []
        if not competitions:
            continue
        comp = competitions[0]
        competitors = comp.get("competitors") or []
        # Determine if at least one competitor belongs to a Power‑4 conference
        p4 = False
        competitor_entries: List[Dict[str, Any]] = []
        for c in competitors:
            team_id = str(c["team"]["id"])
            info = get_team_info(team_id)
            competitor_entries.append(
                {
                    "id": team_id,
                    "name": info["name"],
                    "abbreviation": info["abbreviation"],
                    "groupId": info["groupId"],
                    "logo": info["logo"],
                    "homeAway": c.get("homeAway"),
                }
            )
            if info["groupId"] in P4_GROUPS:
                p4 = True
        if not p4:
            continue
        # Betting odds
        odds_obj = (comp.get("odds") or [{}])[0]
        odds = {
            "details": odds_obj.get("details"),
            "overUnder": odds_obj.get("overUnder"),
            "spread": odds_obj.get("spread"),
            "favorite": odds_obj.get("team").get("id") if odds_obj.get("team") else None,
        }
        # Broadcast network
        broadcasts = comp.get("broadcasts") or []
        network = ""
        if broadcasts:
            network = broadcasts[0].get("media", {}).get("shortName", "")
        # Stats per team
        stats_map = get_event_stats(event["id"])
        games.append(
            {
                "id": event["id"],
                "date": comp.get("date"),
                "network": network,
                "odds": odds,
                "competitors": competitor_entries,
                "stats": stats_map,
            }
        )
    return games


def main() -> None:
    args = parse_args()
    if args.date:
        date_str = args.date
    else:
        date_str = next_saturday(_dt.date.today())
    print(f"Fetching games for {date_str}…", file=sys.stderr)
    games = build_games_for_date(date_str)
    out_path = "data/games.json"
    with open(out_path, "w", encoding="utf-8") as f:
        json.dump(games, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(games)} games to {out_path}", file=sys.stderr)


if __name__ == "__main__":
    main()