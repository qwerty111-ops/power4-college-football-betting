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
   * Parses the current page’s URL and returns the value of the specified query
   * parameter.
   *
   * @param {string} name Parameter name
   * @returns {string|null} Parameter value or null if not present
   */
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  /**
   * Renders the game summary into the DOM.
   *
   * @param {object} summary JSON summary object from ESPN
   */
  function renderSummary(summary) {
    const titleEl = document.getElementById('game-title');
    const container = document.getElementById('summary-container');
    container.innerHTML = '';
    const boxscore = summary.boxscore;
    if (!boxscore || !boxscore.teams || boxscore.teams.length < 2) {
      titleEl.textContent = 'Summary not available';
      return;
    }
    // Determine teams and statistics
    const teamStats = boxscore.teams.map((t) => {
      const stats = {};
      for (const stat of t.statistics || []) {
        stats[stat.name] = stat.displayValue;
      }
      return {
        name: t.team.displayName,
        logo: t.team.logo || '',
        stats
      };
    });
    titleEl.textContent = `${teamStats[0].name} vs ${teamStats[1].name}`;
    // Build a comparison table
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
    header.innerHTML = `<th>Statistic</th><th>${teamStats[0].name}</th><th>${teamStats[1].name}</th>`;
    table.appendChild(header);
    for (const row of rows) {
      const tr = document.createElement('tr');
      const statA = teamStats[0].stats[row.key] || '–';
      const statB = teamStats[1].stats[row.key] || '–';
      tr.innerHTML = `<td>${row.label}</td><td>${statA}</td><td>${statB}</td>`;
      table.appendChild(tr);
    }
    container.appendChild(table);
    // Additional game info (venue and weather)
    const info = summary.gameInfo || {};
    const infoDiv = document.createElement('div');
    infoDiv.style.marginTop = '20px';
    if (info.venue && info.venue.fullName) {
      infoDiv.innerHTML += `<p><strong>Venue:</strong> ${info.venue.fullName}, ${info.venue.address.city}, ${info.venue.address.state}</p>`;
    }
    if (info.weather) {
      infoDiv.innerHTML += `<p><strong>Weather:</strong> ${info.weather.temperature}°F, High ${info.weather.highTemperature}°F, Low ${info.weather.lowTemperature}°F, Precip ${info.weather.precipitation}%</p>`;
    }
    container.appendChild(infoDiv);
  }

  async function loadGame() {
    const eventId = getQueryParam('event');
    const titleEl = document.getElementById('game-title');
    if (!eventId) {
      titleEl.textContent = 'No event specified';
      return;
    }
    titleEl.textContent = 'Loading game summary…';
    try {
      const url = `https://site.api.espn.com/apis/site/v2/sports/football/college-football/summary?event=${encodeURIComponent(eventId)}`;
      const res = await fetch(url);
      const data = await res.json();
      renderSummary(data);
    } catch (err) {
      console.error(err);
      titleEl.textContent = 'Failed to load summary';
    }
  }
  document.addEventListener('DOMContentLoaded', loadGame);
})();