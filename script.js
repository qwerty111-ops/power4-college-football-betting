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
  // Conference group identifiers for the Power‑4 leagues.  These are used
  // to determine whether a matchup should be displayed on the homepage.
  const P4_GROUPS = [1, 4, 5, 8];

  /*
   * Maps conference group identifiers to friendly names.  These names
   * correspond to both Power‑4 and non‑Power‑4 leagues that appear on
   * the Sept 6 schedule.  If a new conference appears in a future update
   * simply extend this map with the appropriate key and label.
   */
  const GROUP_ID_MAP = {
    1: 'ACC',
    4: 'Big 12',
    5: 'Big Ten',
    8: 'SEC',
    12: 'CUSA',
    15: 'MAC',
    17: 'Mountain West',
    18: 'Independent',
    29: 'Southern',
    30: 'WAC',
    31: 'SWAC'
  };

  /*
   * Assign a CSS colour class for each conference.  These classes are
   * defined in style.css and provide distinct colours for labels in the
   * matchup header.  Colour values are loosely based on official league
   * branding palettes where available and otherwise chosen to maximise
   * contrast.
   */
  const CONF_COLOR_CLASS = {
    1: 'conf-acc',
    4: 'conf-big12',
    5: 'conf-bigten',
    8: 'conf-sec',
    12: 'conf-cusa',
    15: 'conf-mac',
    17: 'conf-mw',
    18: 'conf-ind',
    29: 'conf-southern',
    30: 'conf-wac',
    31: 'conf-swac'
  };

  // Maps Power‑4 conference IDs to CSS classes for the coloured bar atop
  // each card.  Only Power‑4 matchups receive a coloured bar; non‑P4
  // matchups retain a neutral bar.
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
   * Convert an ISO string into separate date and time strings in the
   * America/Denver timezone.  This helper returns an object with
   * `date` and `time` properties, making it easy to display them
   * separately in the UI.
   *
   * @param {string} isoString ISO formatted date string
   * @returns {{date: string, time: string}}
   */
  function splitDateAndTime(isoString) {
    const date = new Date(isoString);
    const optionsDate = {
      timeZone: 'America/Denver',
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    };
    const optionsTime = {
      timeZone: 'America/Denver',
      hour: 'numeric',
      minute: '2-digit'
    };
    return {
      date: date.toLocaleDateString('en-US', optionsDate),
      time: date.toLocaleTimeString('en-US', optionsTime)
    };
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
        const { date: dateStr, time } = splitDateAndTime(event.date);
        const network = event.network && event.network.trim() ? event.network : 'TBD';
        // Determine home and away teams
        const away = competitors.find((c) => c.homeAway === 'away');
        const home = competitors.find((c) => c.homeAway === 'home');
        if (!away || !home) continue;
        // Determine conference labels and classes
        const awayConf = GROUP_ID_MAP[away.groupId] || '';
        const homeConf = GROUP_ID_MAP[home.groupId] || '';
        const awayConfClass = CONF_COLOR_CLASS[away.groupId] || '';
        const homeConfClass = CONF_COLOR_CLASS[home.groupId] || '';
        // Compose spread line.  If spread is positive the away team is
        // favoured; if negative the home team is favoured; if zero or
        // unavailable we treat it as pick’em.  Always display a value
        // to avoid “N/A” values.
        let spreadLine = 'Pick';
        const odds = event.odds || {};
        if (typeof odds.spread === 'number') {
          const spread = odds.spread;
          if (spread < 0) {
            spreadLine = `${home.abbreviation} ${Math.abs(spread)}`;
          } else if (spread > 0) {
            spreadLine = `${away.abbreviation} ${spread}`;
          }
        }
        // Compose over/under line
        const overUnderLine = typeof odds.overUnder === 'number' ? odds.overUnder.toString() : 'TBD';
        const card = document.createElement('div');
        card.className = 'game-card';
        card.innerHTML = `
              <div class="conference-bar ${barClass}"></div>
              <div class="conference-matchup">
                <span class="conf-label ${awayConfClass}">${awayConf}</span>
                <span class="vs-sep">vs</span>
                <span class="conf-label ${homeConfClass}">${homeConf}</span>
              </div>
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
              <div class="game-details">
                <p><strong>Date:</strong> ${dateStr}</p>
                <p><strong>Time:</strong> ${time} MT</p>
                <p><strong>TV:</strong> ${network}</p>
              </div>
              <div class="odds-details">
                <p><strong>Spread:</strong> ${spreadLine}</p>
                <p><strong>O/U:</strong> ${overUnderLine}</p>
              </div>
              <div class="analysis-link">Click for detailed team analysis →</div>
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