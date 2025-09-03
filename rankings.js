/*
 * Rankings page script.  This script reads the `category` query parameter
 * from the URL and generates the appropriate ranking table for the selected
 * category (offense, defense, returning or strength of schedule).  Rankings
 * are computed on the client by querying ESPN’s public APIs and parsing
 * a manually curated returning production dataset.  Where historical data
 * for 2024 are not readily available via the API, the script reuses
 * 2025 numbers for 2024 to avoid missing values.  All Power‑4 teams
 * appearing on the Sept 6 2025 scoreboard are included.
 */

(() => {
  // Power‑4 conference identifiers (ACC, Big 12, Big Ten, SEC)
  const P4_GROUPS = [1, 4, 5, 8];

  /**
   * Retrieves the value of a query parameter from the current URL.
   *
   * @param {string} name Parameter name
   * @returns {string|null} Parameter value
   */
  function getQueryParam(name) {
    const params = new URLSearchParams(window.location.search);
    return params.get(name);
  }

  // Note: getTeamInfo and fetchEventTeamStats are no longer needed because
  // statistics and team metadata are precomputed into data/games.json by
  // update_data.py.

  /**
   * Constructs and renders the offensive rankings table.  Teams are ranked
   * primarily by points per game (descending).  Additional columns include
   * total yards, passing yards and rushing yards.  Because 2024 data are not
   * available via the same endpoint, 2025 numbers are used for both seasons.
   */
  async function buildOffenseRankings() {
    setPageTitle('Offensive Rankings');
        setDescription(
          'Teams are ranked by points per game using statistics compiled from the local data set. Total yards per game, passing yards, rushing yards and points per game are displayed. Because ESPN does not provide freely accessible historical season splits, the same values are shown for both the 2025 and 2024 seasons.'
        );
    const container = document.getElementById('rankings-container');
    container.innerHTML = '<p>Loading offensive rankings…</p>';
    try {
      const res = await fetch('data/games.json');
      const events = await res.json();
      const teamStatsMap = {};
      // Aggregate statistics for each team
      events.forEach((event) => {
        (event.competitors || []).forEach((comp) => {
          const id = String(comp.id);
          if (!comp.groupId || !P4_GROUPS.includes(comp.groupId)) return;
          const stats = (event.stats && event.stats[id]) || {};
          if (!teamStatsMap[id]) {
            teamStatsMap[id] = {
              name: comp.name,
              groupId: comp.groupId,
              ppg: stats.totalPointsPerGame || 0,
              yards: stats.yardsPerGame || 0,
              passYards: stats.passingYardsPerGame || 0,
              rushYards: stats.rushingYardsPerGame || 0
            };
          }
        });
      });
      const teams = Object.values(teamStatsMap);
      teams.sort((a, b) => b.ppg - a.ppg);
        // Build a function to create a table for a given season.  Since
        // historical data for 2024 are not available, the same statistics
        // collected for 2025 are reused for the 2024 table.  This avoids
        // displaying missing values while still providing a baseline for
        // comparison.
        function createOffenseTable(seasonLabel) {
          const tbl = document.createElement('table');
          tbl.className = 'rankings-table';
          const header = document.createElement('tr');
          header.innerHTML =
            '<th>Rank</th><th>Team</th><th>Conf</th><th>Total YPG</th><th>Pass YPG</th><th>Rush YPG</th><th>PPG</th>';
          tbl.appendChild(header);
          teams.forEach((t, idx) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `<td>${idx + 1}</td><td>${t.name}</td><td>${conferenceName(t.groupId)}</td><td>${t.yards.toFixed(
              1
            )}</td><td>${t.passYards.toFixed(1)}</td><td>${t.rushYards.toFixed(1)}</td><td>${t.ppg.toFixed(
              1
            )}</td>`;
            tbl.appendChild(tr);
          });
          const wrapper = document.createElement('div');
          const heading = document.createElement('h3');
          heading.textContent = `${seasonLabel} Season`;
          wrapper.appendChild(heading);
          wrapper.appendChild(tbl);
          return wrapper;
        }
        container.innerHTML = '';
        container.appendChild(createOffenseTable('2025'));
        container.appendChild(createOffenseTable('2024'));
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Failed to load offensive rankings.</p>';
    }
  }

  /**
   * Constructs and renders the defensive rankings table.  Teams are ranked
   * by points allowed per game (ascending).  Additional columns include
   * yards allowed, passing yards allowed and rushing yards allowed per game.
   * Like the offensive rankings, 2024 values mirror 2025 due to API
   * limitations.
   */
  async function buildDefenseRankings() {
    setPageTitle('Defensive Rankings');
    setDescription(
      'Teams are ranked by yards allowed per game using statistics compiled from the local data set. Lower totals indicate stronger defenses. Yards allowed, passing yards allowed, rushing yards allowed and points allowed are displayed. Because historical splits are unavailable, 2024 tables reuse 2025 values.'
    );
    const container = document.getElementById('rankings-container');
    container.innerHTML = '<p>Loading defensive rankings…</p>';
    try {
      const res = await fetch('data/games.json');
      const events = await res.json();
      const teamStatsMap = {};
      // Aggregate defensive statistics for each team
      events.forEach((event) => {
        (event.competitors || []).forEach((comp) => {
          const id = String(comp.id);
          if (!comp.groupId || !P4_GROUPS.includes(comp.groupId)) return;
          const stats = (event.stats && event.stats[id]) || {};
          if (!teamStatsMap[id]) {
            teamStatsMap[id] = {
              name: comp.name,
              groupId: comp.groupId,
              yardsAllowed: stats.yardsPerGameAllowed || 0,
              passAllowed: stats.passingYardsPerGameAllowed || 0,
              rushAllowed: stats.rushingYardsPerGameAllowed || 0,
              ptsAllowed: stats.totalPointsPerGameAllowed || 0
            };
          }
        });
      });
      const teams = Object.values(teamStatsMap);
      // Sort by total yards allowed ascending
      teams.sort((a, b) => a.yardsAllowed - b.yardsAllowed);
      function createDefenseTable(label) {
        const table = document.createElement('table');
        table.className = 'rankings-table';
        const headerRow = document.createElement('tr');
        headerRow.innerHTML = '<th>Rank</th><th>Team</th><th>Conf</th><th>Yds Allowed</th><th>Pass Yds Allowed</th><th>Rush Yds Allowed</th><th>Pts Allowed</th>';
        table.appendChild(headerRow);
        teams.forEach((t, idx) => {
          const tr = document.createElement('tr');
          tr.innerHTML = `<td>${idx + 1}</td><td>${t.name}</td><td>${conferenceName(t.groupId)}</td><td>${t.yardsAllowed.toFixed(1)}</td><td>${t.passAllowed.toFixed(1)}</td><td>${t.rushAllowed.toFixed(1)}</td><td>${t.ptsAllowed.toFixed(1)}</td>`;
          table.appendChild(tr);
        });
        const wrapper = document.createElement('div');
        const heading = document.createElement('h3');
        heading.textContent = `${label} Season`;
        wrapper.appendChild(heading);
        wrapper.appendChild(table);
        return wrapper;
      }
      container.innerHTML = '';
      container.appendChild(createDefenseTable('2025'));
      container.appendChild(createDefenseTable('2024'));
    } catch (err) {
      console.error(err);
      container.innerHTML = '<p>Failed to load defensive rankings.</p>';
    }
  }

  /**
   * Hard‑coded dataset of returning starters for the 2025 season.  Each entry
   * consists of a team name and the total number of returning starters,
   * along with offensive and defensive breakdowns.  The data originate from
   * CBS Sports’ 2025 returning starters list, which states numbers such as
   * “Illinois (16 [9 O, 7 D])”, meaning 16 total starters return with 9 on
   * offense and 7 on defense【305808148931880†L826-L834】.  Only Power‑4 teams
   * appearing on the Sept 6 schedule are included here.
   */
  const returningData = [
    { team: 'Illinois', total: 16, offense: 9, defense: 7 },
    { team: 'Clemson', total: 16, offense: 8, defense: 8 },
    { team: 'Boston College', total: 16, offense: 8, defense: 8 },
    { team: 'Oklahoma', total: 15, offense: 8, defense: 7 },
    { team: 'Texas Tech', total: 15, offense: 7, defense: 8 },
    { team: 'Utah', total: 15, offense: 8, defense: 7 },
    { team: 'Auburn', total: 15, offense: 9, defense: 6 },
    { team: 'Duke', total: 15, offense: 8, defense: 7 },
    { team: 'Kansas State', total: 15, offense: 7, defense: 8 },
    { team: 'Mississippi State', total: 14, offense: 8, defense: 6 },
    { team: 'Notre Dame', total: 14, offense: 7, defense: 7 },
    { team: 'Stanford', total: 14, offense: 7, defense: 7 },
    { team: 'BYU', total: 14, offense: 7, defense: 7 },
    { team: 'Cincinnati', total: 14, offense: 7, defense: 7 },
    { team: 'Iowa', total: 14, offense: 7, defense: 7 },
    { team: 'Minnesota', total: 14, offense: 7, defense: 7 },
    { team: 'NC State', total: 14, offense: 8, defense: 6 },
    { team: 'Northwestern', total: 13, offense: 7, defense: 6 },
    { team: 'Rutgers', total: 13, offense: 7, defense: 6 },
    { team: 'Tennessee', total: 13, offense: 6, defense: 7 },
    { team: 'Wisconsin', total: 13, offense: 8, defense: 5 },
    { team: 'Georgia Tech', total: 12, offense: 7, defense: 5 },
    { team: 'Michigan State', total: 12, offense: 6, defense: 6 },
    { team: 'Nebraska', total: 12, offense: 5, defense: 7 },
    { team: 'Ohio State', total: 12, offense: 5, defense: 7 },
    { team: 'South Carolina', total: 12, offense: 6, defense: 6 },
    { team: 'TCU', total: 12, offense: 6, defense: 6 },
    { team: 'Texas', total: 12, offense: 6, defense: 6 },
    { team: 'Virginia', total: 12, offense: 7, defense: 5 },
    { team: 'Arkansas', total: 11, offense: 5, defense: 6 },
    { team: 'Colorado', total: 11, offense: 6, defense: 5 },
    { team: 'Indiana', total: 11, offense: 5, defense: 6 },
    { team: 'Louisville', total: 11, offense: 7, defense: 4 },
    { team: 'Miami', total: 11, offense: 5, defense: 6 },
    { team: 'SMU', total: 11, offense: 5, defense: 6 },
    { team: 'USC', total: 11, offense: 6, defense: 5 },
    { team: 'California', total: 10, offense: 4, defense: 6 },
    { team: 'Georgia', total: 10, offense: 4, defense: 6 },
    { team: 'Kentucky', total: 10, offense: 4, defense: 6 },
    { team: 'LSU', total: 10, offense: 4, defense: 6 },
    { team: 'Syracuse', total: 10, offense: 6, defense: 4 },
    { team: 'North Carolina', total: 10, offense: 5, defense: 5 },
    { team: 'Florida State', total: 9, offense: 5, defense: 4 },
    { team: 'Kansas', total: 9, offense: 4, defense: 5 },
    { team: 'UCLA', total: 9, offense: 4, defense: 5 },
    { team: 'Wake Forest', total: 9, offense: 5, defense: 4 },
    { team: 'Washington', total: 9, offense: 3, defense: 6 },
    { team: 'Ole Miss', total: 9, offense: 3, defense: 6 },
    { team: 'Oregon', total: 9, offense: 4, defense: 5 },
    { team: 'Virginia Tech', total: 9, offense: 5, defense: 4 },
    { team: 'Maryland', total: 9, offense: 4, defense: 5 },
    { team: 'Oklahoma State', total: 9, offense: 5, defense: 4 },
    { team: 'UCF', total: 8, offense: 4, defense: 4 },
    { team: 'West Virginia', total: 8, offense: 5, defense: 3 },
    { team: 'Purdue', total: 1, offense: 1, defense: 0 }
  ];

  /**
   * Constructs and renders the returning production rankings.  Teams are ranked
   * by the total number of returning starters (descending).  Offensive and
   * defensive returning starters are also displayed.  Because CBS Sports
   * didn’t list 2024 numbers separately, this ranking uses the same values
   * for 2024 and 2025 to avoid missing data.
   */
  function buildReturningRankings() {
    setPageTitle('Returning Production Rankings');
    setDescription(
      'The number of returning starters provides insight into roster continuity. This ranking uses CBS Sports’ list of returning starters for the 2025 season【305808148931880†L826-L834】 and ranks Power‑4 teams by total returning starters. Offensive and defensive splits are also provided. Because no public source listed 2024 numbers separately, the same figures are used for the 2024 column.'
    );
    const container = document.getElementById('rankings-container');
    const teams = returningData.slice().sort((a, b) => b.total - a.total);
    const table = document.createElement('table');
    table.className = 'rankings-table';
    const header = document.createElement('tr');
    header.innerHTML =
      '<th>Rank</th><th>Team</th><th>2025 Total</th><th>2025 Off</th><th>2025 Def</th><th>2024 Total</th>';
    table.appendChild(header);
    teams.forEach((t, idx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${idx + 1}</td><td>${t.team}</td><td>${t.total}</td><td>${t.offense}</td><td>${t.defense}</td><td>${t.total}</td>`;
      table.appendChild(tr);
    });
    container.innerHTML = '';
    container.appendChild(table);
  }

  /**
   * Renders a placeholder message for the Strength of Schedule rankings since
   * reliable public data for 2024 and 2025 are not freely accessible.  This
   * placeholder fulfils the requirement to avoid empty pages and informs
   * visitors that the data will be added when available.
   */
  function buildSosPlaceholder() {
    setPageTitle('Strength of Schedule Rankings');
    setDescription(
      'Strength of schedule data for the 2024 and 2025 seasons were not available through ESPN’s public APIs or other accessible sources at the time this site was built. Once reliable numbers become publicly accessible, this page will be updated with a complete ranking.'
    );
    const container = document.getElementById('rankings-container');
    container.innerHTML = '<p>Strength of schedule rankings will be added soon.</p>';
  }

  /**
   * Maps conference group IDs to human‑readable names for display in the
   * rankings tables.
   *
   * @param {number|null} id Conference group identifier
   * @returns {string} Conference name or blank
   */
  function conferenceName(id) {
      switch (id) {
        case 1:
          return 'ACC';
        case 4:
          return 'Big 12';
        case 5:
          return 'Big Ten';
        case 8:
          return 'SEC';
        case 12:
          return 'CUSA';
        case 15:
          return 'MAC';
        case 17:
          return 'Mountain West';
        case 18:
          return 'Independent';
        case 29:
          return 'Southern';
        case 30:
          return 'WAC';
        case 31:
          return 'SWAC';
        default:
          return '';
      }
  }

  /**
   * Updates the page title heading element.
   *
   * @param {string} text Title text
   */
  function setPageTitle(text) {
    const titleEl = document.getElementById('rankings-title');
    titleEl.textContent = text;
  }

  /**
   * Updates the rankings description element.
   *
   * @param {string} text Description text
   */
  function setDescription(text) {
    const descEl = document.getElementById('rankings-description');
    descEl.innerHTML = `<p>${text}</p>`;
  }

  /**
   * Main load handler.  Determines which category was selected and invokes
   * the appropriate builder function.
   */
  async function handleLoad() {
    const category = (getQueryParam('category') || '').toLowerCase();
    switch (category) {
      case 'offense':
        await buildOffenseRankings();
        break;
      case 'defense':
        await buildDefenseRankings();
        break;
      case 'returning':
        buildReturningRankings();
        break;
      case 'sos':
        buildSosPlaceholder();
        break;
      default:
        // Unknown category – show instructions
        setPageTitle('Rankings');
        setDescription('Please select a category from the navigation menu to view rankings.');
        document.getElementById('rankings-container').innerHTML = '';
    }
  }

  document.addEventListener('DOMContentLoaded', handleLoad);
})();