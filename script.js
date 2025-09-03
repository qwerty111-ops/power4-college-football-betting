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
  // Conference group identifiers for ACC, Big 12, Big Ten and SEC
  const P4_GROUPS = [1, 4, 5, 8];
  // Maps conference group IDs to CSS classes for colour bars
  const CONFERENCE_CLASS = {
    5: 'big-ten',
    8: 'sec',
    1: 'acc',
    4: 'big-12'
  };

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
   * Load the local games JSON file and populate the game cards.  This
   * implementation no longer makes network requests to ESPN; instead it
   * reads data compiled offline by ``update_data.py``.
   */
  async function loadGames() {
    const gamesContainer = document.getElementById('games-container');
    gamesContainer.innerHTML = '<p>Loading games…</p>';
    try {
      const res = await fetch('data/games.json');
      const events = await res.json();
      const gameCards = [];
      for (const event of events) {
        const competitors = event.competitors || [];
        // Determine if at least one competitor is from a P4 conference
        let confId = null;
        for (const c of competitors) {
          if (c.groupId && P4_GROUPS.includes(c.groupId)) {
            confId = c.groupId;
            // Prefer the home team’s conference if multiple are P4
            if (c.homeAway === 'home') break;
          }
        }
        if (confId == null) continue;
        const barClass = CONFERENCE_CLASS[confId] || '';
        // Format date/time and network
        const formatted = formatDateTime(event.date);
        const network = event.network || '';
        // Compose betting line
        let oddsText = '';
        const odds = event.odds || {};
        if (odds.details) {
          oddsText = odds.details;
        }
        if (typeof odds.overUnder === 'number') {
          oddsText += (oddsText ? ' | ' : '') + `O/U: ${odds.overUnder}`;
        }
        if (typeof odds.spread === 'number' && odds.favorite) {
          const fav = competitors.find((c) => c.id === String(odds.favorite));
          const abbrev = fav ? fav.abbreviation : '';
          oddsText += (oddsText ? ' | ' : '') + `Spread: ${abbrev}${odds.spread > 0 ? '+' : ''}${odds.spread}`;
        }
        // Determine home and away teams
        const away = competitors.find((c) => c.homeAway === 'away');
        const home = competitors.find((c) => c.homeAway === 'home');
        if (!away || !home) continue;
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
          <div class="conference-bar ${barClass}"></div>
          <div class="game-header">
            <div class="team-name">
              ${away.logo ? `<img class="team-logo" src="${away.logo}" alt="${away.name}">` : ''}
              <span>${away.name}</span>
            </div>
            <div class="team-name">@</div>
            <div class="team-name">
              ${home.logo ? `<img class="team-logo" src="${home.logo}" alt="${home.name}">` : ''}
              <span>${home.name}</span>
            </div>
          </div>
          <div class="game-info">${formatted}${network ? ` • ${network}` : ''}</div>
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
      for (const card of gameCards) {
        gamesContainer.appendChild(card);
      }
    } catch (err) {
      console.error(err);
      gamesContainer.innerHTML = '<p>Failed to load games. Please try again later.</p>';
    }
  }

  document.addEventListener('DOMContentLoaded', loadGames);
})();