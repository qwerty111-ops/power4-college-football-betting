/*
 * Game details page script.  When a visitor clicks a game card on the
 * homepage they are redirected to this page with a query parameter
 * specifying the ESPN event ID.  This script retrieves a summary of that
 * event from ESPN’s site API and extracts head‑to‑head team statistics
 * (points per game, total yards, passing yards, rushing yards and
 * defensive equivalents).  The statistics are presented in a simple
 * comparison table for the home and away teams.  Additional details such
 * as venue and weather are also displayed when available.
 */

(() => {
  /**
   * Parse query parameters from the current URL.
   *
   * @param {string} name Name of parameter
   * @returns {string|null}
   */
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /**
   * Render the game details table from a local event object.  Each event
   * contains precomputed statistics keyed by team ID.
   *
   * @param {object} event Event object from games.json
   */
  function renderEvent(event) {
    const container = document.getElementById('summary-container');
    container.innerHTML = '';
    const titleEl = document.getElementById('game-title');
    const competitors = event.competitors || [];
    if (competitors.length < 2) {
      titleEl.textContent = 'Game data unavailable';
      return;
    }
    // Extract teams and their stats
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) {
      titleEl.textContent = 'Game data unavailable';
      return;
    }
    const statsMap = event.stats || {};
    const homeStats = statsMap[home.id] || {};
    const awayStats = statsMap[away.id] || {};
    titleEl.textContent = `${away.name} vs ${home.name}`;
    const rows = [
      { key: 'totalPointsPerGame', label: 'Points Per Game' },
      { key: 'yardsPerGame', label: 'Total Yards' },
      { key: 'passingYardsPerGame', label: 'Passing Yards' },
      { key: 'rushingYardsPerGame', label: 'Rushing Yards' },
      { key: 'totalPointsPerGameAllowed', label: 'Points Allowed' },
      { key: 'yardsPerGameAllowed', label: 'Yards Allowed' },
      { key: 'passingYardsPerGameAllowed', label: 'Pass Yards Allowed' },
      { key: 'rushingYardsPerGameAllowed', label: 'Rush Yards Allowed' }
    ];
    const table = document.createElement('table');
    table.className = 'rankings-table';
    const header = document.createElement('tr');
    header.innerHTML = `<th>Statistic</th><th>${away.name}</th><th>${home.name}</th>`;
    table.appendChild(header);
    rows.forEach((row) => {
      const tr = document.createElement('tr');
      const aVal = awayStats[row.key] !== undefined ? awayStats[row.key] : '–';
      const hVal = homeStats[row.key] !== undefined ? homeStats[row.key] : '–';
      tr.innerHTML = `<td>${row.label}</td><td>${aVal}</td><td>${hVal}</td>`;
      table.appendChild(tr);
    });
    container.appendChild(table);
    // Basic event details (date and network)
    const infoDiv = document.createElement('div');
    infoDiv.style.marginTop = '20px';
    const formattedDate = new Date(event.date).toLocaleString('en-US', {
      timeZone: 'America/Denver',
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
    infoDiv.innerHTML = `<p><strong>Date:</strong> ${formattedDate}${event.network ? ` • ${event.network}` : ''}</p>`;
    container.appendChild(infoDiv);
  }

  async function loadGame() {
    const eventId = getQueryParam('event');
    const titleEl = document.getElementById('game-title');
    if (!eventId) {
      titleEl.textContent = 'No event specified';
      return;
    }
    titleEl.textContent = 'Loading game…';
    try {
      const res = await fetch('data/games.json');
      const events = await res.json();
      const event = events.find((e) => String(e.id) === String(eventId));
      if (!event) {
        titleEl.textContent = 'Game not found';
        return;
      }
      renderEvent(event);
    } catch (err) {
      console.error(err);
      titleEl.textContent = 'Failed to load game data';
    }
  }
  document.addEventListener('DOMContentLoaded', loadGame);
})();