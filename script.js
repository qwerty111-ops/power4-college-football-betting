/*
 * Client‑side JavaScript for the Power‑4 betting site.  This script powers
 * the homepage by fetching the ESPN scoreboard for Sept 6 2025 and filtering
 * the results to only include games featuring at least one Power‑4 team
 * (ACC, Big 12, Big Ten or SEC).  For each qualifying matchup it
 * asynchronously loads basic team information (including conference group
 * identifiers and logos) from the ESPN core API and uses that data to
 * construct clickable game cards.  Cards link to a dedicated game page
 * (`game.html`) with a query parameter containing the event ID.
 */

(() => {
  const P4_GROUPS = [1, 4, 5, 8];
  const CONFERENCE_CLASS = {
    5: 'big-ten',
    8: 'sec',
    1: 'acc',
    4: 'big-12'
  };
  const TEAM_CACHE = {};

  /**
   * Fetches core team information (conference group ID, logo URL and display name)
   * from the ESPN core API.  Results are cached to avoid redundant network
   * requests.
   *
   * @param {string|number} teamId The ESPN team identifier
   * @returns {Promise<{ groupId: number|null, logo: string|null, name: string }>} team info
   */
  async function getTeamInfo(teamId) {
    if (TEAM_CACHE[teamId]) return TEAM_CACHE[teamId];
    try {
      const res = await fetch(
        `https://sports.core.api.espn.com/v2/sports/football/leagues/college-football/teams/${teamId}?lang=en&region=us`
      );
      const data = await res.json();
      const groupId = data.groups && data.groups.id ? parseInt(data.groups.id) : null;
      // Logos array may not exist; fall back to team abbreviation if missing
      let logo = null;
      if (data.logos && data.logos.length) {
        logo = data.logos[0].href;
      }
      TEAM_CACHE[teamId] = {
        groupId,
        logo,
        name: data.displayName || data.name || data.shortDisplayName || ''
      };
    } catch (err) {
      // If the fetch fails we return minimal info
      TEAM_CACHE[teamId] = { groupId: null, logo: null, name: '' };
    }
    return TEAM_CACHE[teamId];
  }

  /**
   * Converts an ISO date string to a human friendly date/time in America/Denver.
   *
   * @param {string} isoString ISO formatted date string
   * @returns {string} formatted date/time
   */
  function formatDateTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      timeZone: 'America/Denver',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  }

  /**
   * Loads the scoreboard for the specified date and populates the game cards.
   */
  async function loadGames() {
    const gamesContainer = document.getElementById('games-container');
    gamesContainer.innerHTML = '<p>Loading games…</p>';
    try {
      const scoreboardUrl =
        'https://site.api.espn.com/apis/site/v2/sports/football/college-football/scoreboard?dates=20250906';
      const res = await fetch(scoreboardUrl);
      const data = await res.json();
      const events = Array.isArray(data.events) ? data.events : [];
      // Prepare an array of promises to process each event sequentially
      const gameCards = [];
      for (const event of events) {
        if (!event.competitions || !event.competitions.length) continue;
        const comp = event.competitions[0];
        const competitors = comp.competitors || [];
        let isP4Game = false;
        let confId = null;
        // Preload team info for each competitor
        const teamInfos = [];
        for (const c of competitors) {
          const info = await getTeamInfo(c.team.id);
          teamInfos.push(info);
          if (!isP4Game && info.groupId && P4_GROUPS.includes(info.groupId)) {
            isP4Game = true;
            confId = info.groupId;
          }
        }
        if (!isP4Game) continue;
        // Determine bar class based on conference of the P4 team.  If both
        // competitors are P4 teams from different conferences we'll choose the
        // home team’s conference colour.
        const barClass = CONFERENCE_CLASS[confId] || '';
        // Extract schedule time and network (if available)
        const gameDate = comp.date;
        const formatted = formatDateTime(gameDate);
        const broadcasters = comp.broadcasts && comp.broadcasts.length ? comp.broadcasts[0].media.shortName : '';
        // Determine betting details
        let oddsText = '';
        if (comp.odds && comp.odds.length) {
          const oddsObj = comp.odds[0];
          if (oddsObj.details) {
            oddsText = oddsObj.details;
          }
          if (typeof oddsObj.overUnder === 'number') {
            oddsText += ` | O/U: ${oddsObj.overUnder}`;
          }
          if (typeof oddsObj.spread === 'number') {
            const favorite = competitors.find((c) => c.homeAway === 'home')?.team.abbreviation || '';
            oddsText += ` | Spread: ${favorite}${oddsObj.spread > 0 ? '+' : ''}${oddsObj.spread}`;
          }
        }
        // Build card HTML
        const away = competitors.find((c) => c.homeAway === 'away');
        const home = competitors.find((c) => c.homeAway === 'home');
        const awayInfo = teamInfos[competitors.indexOf(away)];
        const homeInfo = teamInfos[competitors.indexOf(home)];
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
          <div class="conference-bar ${barClass}"></div>
          <div class="game-header">
            <div class="team-name">
              ${awayInfo.logo ? `<img class="team-logo" src="${awayInfo.logo}" alt="${awayInfo.name}">` : ''}
              <span>${awayInfo.name}</span>
            </div>
            <div class="team-name">
              @
            </div>
            <div class="team-name">
              ${homeInfo.logo ? `<img class="team-logo" src="${homeInfo.logo}" alt="${homeInfo.name}">` : ''}
              <span>${homeInfo.name}</span>
            </div>
          </div>
          <div class="game-info">${formatted}${broadcasters ? ` • ${broadcasters}` : ''}</div>
          <div class="odds">${oddsText}</div>
        `;
        card.addEventListener('click', () => {
          window.location.href = `game.html?event=${encodeURIComponent(event.id)}`;
        });
        gameCards.push(card);
      }
      gamesContainer.innerHTML = '';
      if (gameCards.length === 0) {
        gamesContainer.innerHTML = '<p>No Power‑4 games found for this date.</p>';
        return;
      }
      for (const gc of gameCards) {
        gamesContainer.appendChild(gc);
      }
    } catch (err) {
      gamesContainer.innerHTML = `<p>Failed to load games. Please try again later.</p>`;
      console.error(err);
    }
  }

  // Kick off the loading on page load
  document.addEventListener('DOMContentLoaded', loadGames);
})();