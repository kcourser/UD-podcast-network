/* ============================================================
   UPRT+ Network — Webflow loader (v7-UD)
   Serve via jsDelivr: https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@main/uprt-network-ud.js
   Webflow embed needs only:
     <div id="uprt-network-mount"></div>
     <script src="https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@main/uprt-network-ud.js" defer></script>
   Owner: Hermes CTO
   ============================================================ */
(function () {
  var CSS = "\n#ud-network, #ud-network * { box-sizing: border-box; margin: 0; padding: 0; }\n\n#ud-network {\n  background: #01060F;\n  color: #EAF2FB;\n  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;\n  border-radius: 12px;\n  overflow: hidden;\n  display: flex;\n  flex-direction: column;\n  height: 760px;\n  width: 100%;\n}\n\n/* \u2500\u2500 Header \u2500\u2500 */\n#ud-header {\n  padding: 12px 18px;\n  border-bottom: 1px solid #1E2A4A;\n  background: #010E1E;\n  flex-shrink: 0;\n  display: flex;\n  align-items: center;\n  gap: 14px;\n}\n#ud-header h2 {\n  font-size: 14px;\n  font-weight: 800;\n  font-style: italic;\n  color: #F2F7FD;\n  letter-spacing: 0.06em;\n  text-transform: uppercase;\n  white-space: nowrap;\n}\n#ud-header p { font-size: 11px; color: #9FB2CC; margin-top: 2px; }\n\n/* \u2500\u2500 Fullscreen button \u2500\u2500 */\n#ud-fullscreen-btn {\n  flex-shrink: 0;\n  padding: 5px 9px;\n  border: 1px solid #1E2A4A;\n  background: #0F1B35;\n  color: #EAF2FB;\n  font-size: 15px;\n  line-height: 1;\n  cursor: pointer;\n  border-radius: 6px;\n  transition: all 0.15s;\n  font-family: inherit;\n}\n#ud-fullscreen-btn:hover { background: #1E2A4A; color: #F2F7FD; border-color: #9FB2CC; }\n\n/* \u2500\u2500 Fullscreen mode \u2500\u2500 */\n#ud-network.ud-fullscreen {\n  position: fixed !important;\n  inset: 0 !important;\n  z-index: 9999 !important;\n  border-radius: 0 !important;\n  height: 100dvh !important;\n  width: 100vw !important;\n}\n\n/* \u2500\u2500 Zoom hint (inline only) \u2500\u2500 */\n#ud-zoom-hint {\n  position: absolute; bottom: 10px; right: 10px;\n  font-size: 10px; color: #5E7398; pointer-events: none;\n  letter-spacing: 0.03em; user-select: none;\n}\n#ud-network.ud-fullscreen #ud-zoom-hint { display: none; }\n\n/* \u2500\u2500 Name search \u2500\u2500 */\n#ud-search {\n  margin-left: auto;\n  padding: 7px 14px;\n  border-radius: 20px;\n  border: 1px solid #5E7398;\n  background: #0F1B35;\n  color: #F2F7FD;\n  font-size: 13px;\n  font-weight: 500;\n  font-family: inherit;\n  width: 220px;\n  outline: none;\n  transition: border-color 0.15s, box-shadow 0.15s;\n  -webkit-text-fill-color: #F2F7FD;\n  caret-color: #F2F7FD;\n}\n#ud-search::placeholder { color: #9FB2CC; opacity: 1; -webkit-text-fill-color: #9FB2CC; }\n#ud-search:focus {\n  border-color: #A8E0FF;\n  box-shadow: 0 0 0 3px rgba(77, 169, 240, 0.3);\n  background: #01060F;\n}\n\n/* \u2500\u2500 Date range bar \u2500\u2500 */\n#ud-date-bar {\n  background: #010E1E;\n  border-bottom: 1px solid #1E2A4A;\n  padding: 8px 18px 10px;\n  flex-shrink: 0;\n}\n#ud-date-bar-header {\n  display: flex; align-items: center; gap: 5px; margin-bottom: 8px;\n}\n#ud-date-bar-label {\n  font-size: 9px; font-weight: 600; letter-spacing: 0.1em;\n  text-transform: uppercase; color: #9FB2CC; margin-right: 4px;\n}\n#ud-date-from-label, #ud-date-to-label {\n  font-size: 11px; font-weight: 600; color: #A8E0FF;\n}\n#ud-date-sep { font-size: 10px; color: #5E7398; }\n#ud-date-count { margin-left: auto; font-size: 10px; color: #9FB2CC; }\n\n#ud-slider-wrap {\n  position: relative; height: 20px;\n  display: flex; align-items: center;\n}\n#ud-range-track {\n  position: absolute; left: 0; right: 0;\n  height: 4px; background: #1E2A4A;\n  border-radius: 2px; pointer-events: none;\n}\n#ud-range-fill {\n  position: absolute; height: 100%;\n  background: linear-gradient(90deg, #FF3DB0, #4DA9F0);\n  border-radius: 2px;\n}\ninput.ud-rng {\n  position: absolute; width: 100%; left: 0;\n  height: 4px; -webkit-appearance: none; appearance: none;\n  background: transparent; pointer-events: none; outline: none; z-index: 2;\n}\ninput.ud-rng::-webkit-slider-thumb {\n  -webkit-appearance: none; pointer-events: all; cursor: grab;\n  width: 16px; height: 16px; border-radius: 50%;\n  background: #003D75; border: 2px solid #4DA9F0;\n  transition: border-color 0.15s, transform 0.1s;\n}\ninput.ud-rng::-webkit-slider-thumb:active { cursor: grabbing; transform: scale(1.15); border-color: #A8E0FF; }\ninput.ud-rng::-moz-range-thumb {\n  pointer-events: all; cursor: grab; width: 14px; height: 14px;\n  border-radius: 50%; background: #003D75; border: 2px solid #4DA9F0;\n}\n#ud-slider-months {\n  display: flex; justify-content: space-between;\n  margin-top: 5px; font-size: 9px; color: #5E7398; letter-spacing: 0.03em;\n}\n\n/* \u2500\u2500 Body layout \u2500\u2500 */\n#ud-layout { display: flex; flex: 1; overflow: hidden; }\n\n/* \u2500\u2500 Sidebar \u2500\u2500 */\n#ud-sidebar {\n  width: 210px; flex-shrink: 0;\n  background: #010E1E; border-right: 1px solid #1E2A4A;\n  display: flex; flex-direction: column; overflow: hidden;\n}\n.ud-sidebar-section-title {\n  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;\n  text-transform: uppercase; color: #9FB2CC;\n  padding: 11px 14px 5px; flex-shrink: 0;\n}\n#ud-match-count {\n  font-size: 11px; color: #A8E0FF; padding: 2px 14px 4px;\n  font-weight: 600; flex-shrink: 0; display: none;\n}\n#ud-topic-list {\n  overflow-y: auto; flex: 1; padding: 2px 6px;\n  scrollbar-width: thin; scrollbar-color: #1E2A4A transparent;\n}\n.ud-topic-btn {\n  display: flex; align-items: center; gap: 7px; width: 100%;\n  padding: 6px 8px; border: none; background: transparent;\n  color: #9FB2CC; font-size: 12px; cursor: pointer; border-radius: 5px;\n  text-align: left; transition: background 0.15s, color 0.15s; font-family: inherit;\n}\n.ud-topic-btn:hover { background: #1E2A4A; color: #F2F7FD; }\n.ud-topic-btn.active { background: #003D75; color: #A8E0FF; font-weight: 600; }\n.ud-topic-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }\n.ud-topic-count {\n  margin-left: auto; font-size: 10px; color: #9FB2CC;\n  background: #1E2A4A; padding: 1px 6px; border-radius: 10px; flex-shrink: 0;\n}\n.ud-topic-btn.active .ud-topic-count { background: #003D75; color: #A8E0FF; }\n\n/* \u2500\u2500 Shows section in sidebar \u2500\u2500 */\n#ud-sidebar-divider {\n  height: 1px; background: #1E2A4A; margin: 4px 0; flex-shrink: 0;\n}\n#ud-shows-list {\n  padding: 2px 6px; flex-shrink: 0;\n}\n.ud-show-btn {\n  display: flex; align-items: center; gap: 7px; width: 100%;\n  padding: 5px 8px; border: none; background: transparent;\n  color: #9FB2CC; font-size: 12px; cursor: pointer; border-radius: 5px;\n  text-align: left; transition: background 0.15s, color 0.15s; font-family: inherit;\n}\n.ud-show-btn:hover { background: #1E2A4A; color: #F2F7FD; }\n.ud-show-btn.inactive { opacity: 0.4; }\n.ud-show-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }\n\n/* \u2500\u2500 Clear button \u2500\u2500 */\n#ud-clear-btn {\n  margin: 6px; padding: 7px;\n  border: 1px solid #1E2A4A; background: #0F1B35;\n  color: #EAF2FB; font-size: 11px; cursor: pointer;\n  border-radius: 5px; transition: all 0.15s;\n  flex-shrink: 0; font-family: inherit;\n}\n#ud-clear-btn:hover { background: #1E2A4A; color: #F2F7FD; }\n\n/* \u2500\u2500 Graph \u2500\u2500 */\n#ud-graph-wrap { flex: 1; position: relative; overflow: hidden; background: #01060F; }\n#ud-graph-wrap svg { width: 100%; height: 100%; display: block; }\n\n/* \u2500\u2500 Tooltip \u2500\u2500 */\n#ud-tooltip {\n  position: absolute; background: #0F1B35; border: 1px solid #1E2A4A;\n  border-radius: 9px; padding: 10px 13px; font-size: 12px;\n  pointer-events: none; opacity: 0; transition: opacity 0.15s;\n  max-width: 280px; z-index: 10;\n}\n\n/* \u2500\u2500 Loading \u2500\u2500 */\n#ud-loading {\n  position: absolute; inset: 0;\n  display: flex; align-items: center; justify-content: center;\n  flex-direction: column; gap: 10px; color: #9FB2CC; font-size: 13px;\n}\n#ud-spinner {\n  width: 28px; height: 28px; border: 3px solid #1E2A4A;\n  border-top-color: #FF3DB0; border-radius: 50%;\n  animation: ud-spin 0.8s linear infinite;\n}\n@keyframes ud-spin { to { transform: rotate(360deg); } }\n";
  var HTML = "<div id=\"ud-network\">\n\n  <!-- Header -->\n  <div id=\"ud-header\">\n    <div>\n      <h2>UPRT<span style=\"color:#4DA9F0\">+</span> Network</h2>\n      <p id=\"ud-subline\">Upright Digital &middot; filter by topic, show, or date &middot; click a node to open the episode</p>\n    </div>\n    <input type=\"text\" id=\"ud-search\" placeholder=\"Search guest name&hellip;\">\n    <button id=\"ud-fullscreen-btn\" title=\"Open fullscreen (scroll to zoom)\">\u26f6</button>\n  </div>\n\n  <!-- Date range slider -->\n  <div id=\"ud-date-bar\">\n    <div id=\"ud-date-bar-header\">\n      <span id=\"ud-date-bar-label\">Date range</span>\n      <span id=\"ud-date-from-label\">\u2014</span>\n      <span id=\"ud-date-sep\">\u2013</span>\n      <span id=\"ud-date-to-label\">\u2014</span>\n      <span id=\"ud-date-count\"></span>\n    </div>\n    <div id=\"ud-slider-wrap\">\n      <div id=\"ud-range-track\"><div id=\"ud-range-fill\"></div></div>\n      <input type=\"range\" class=\"ud-rng\" id=\"ud-range-from\" min=\"0\" max=\"1\" value=\"0\" step=\"1\">\n      <input type=\"range\" class=\"ud-rng\" id=\"ud-range-to\"   min=\"0\" max=\"1\" value=\"1\" step=\"1\">\n    </div>\n    <div id=\"ud-slider-months\"></div>\n  </div>\n\n  <!-- Body -->\n  <div id=\"ud-layout\">\n\n    <!-- Sidebar -->\n    <div id=\"ud-sidebar\">\n      <div class=\"ud-sidebar-section-title\">Topics</div>\n      <div id=\"ud-match-count\"></div>\n      <div id=\"ud-topic-list\"></div>\n\n      <div id=\"ud-sidebar-divider\"></div>\n      <div class=\"ud-sidebar-section-title\">Shows</div>\n      <div id=\"ud-shows-list\"></div>\n\n      <button id=\"ud-clear-btn\">Clear filters</button>\n    </div>\n\n    <!-- Graph -->\n    <div id=\"ud-graph-wrap\">\n      <svg id=\"ud-graph\"></svg>\n      <div id=\"ud-tooltip\"></div>\n      <div id=\"ud-zoom-hint\">ctrl+scroll to zoom &middot; drag to pan</div>\n      <div id=\"ud-loading\">\n        <div id=\"ud-spinner\"></div>\n        <span>Loading episodes&hellip;</span>\n      </div>\n    </div>\n\n  </div>\n</div>";

  function boot() {
    var mount = document.getElementById('uprt-network-mount');
    if (!mount) return;
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    mount.innerHTML = HTML;
    if (typeof d3 === 'undefined') {
      var d = document.createElement('script');
      d.src = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
      document.head.appendChild(d);
    }
    run();
  }

  function run() {
(function () {

  const DATA_URL = "https://raw.githubusercontent.com/kcourser/UD-podcast-network/main/episodes.json";

  function waitForD3(cb) {
    if (typeof d3 !== 'undefined') cb();
    else setTimeout(() => waitForD3(cb), 80);
  }

  waitForD3(() => {
    fetch(DATA_URL)
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => buildGraph(data))
      .catch(err => {
        document.getElementById('ud-loading').innerHTML =
          '<span style="color:#ef4444">Could not load episodes: ' + err.message + '</span>';
      });
  });

  function buildGraph(data) {
    const { meta, episodes } = data;
    const TOPIC_COLORS = meta.topic_colors || {};
    const SHOW_COLORS = Object.assign({
      "PetroNoia":             "#FFA940",
      "Oil Field 360":         "#FFB65B",
      "Energy Espresso":       "#FF3DB0",
      "The IT Crowd":          "#4DA9F0",
      "The Energy Pipeline":   "#A8E0FF",
      "In Basin Observations": "#00D954",
    }, meta.show_colors || {});

    // ── Helpers ───────────────────────────────────────────────────────────────
    const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

    function fmtMonthStr(str) {
      if (!str) return '—';
      const [y, m] = str.split('-');
      return MONTH_NAMES[parseInt(m, 10) - 1] + ' ' + y;
    }
    function fmtDate(dateStr) {
      return dateStr ? fmtMonthStr(dateStr.slice(0, 7)) : '';
    }
    function fmtName(name) {
      if (!name) return '—';
      if (name.includes('&')) return name;
      const p = name.trim().split(' ');
      return p.length === 1 ? name : p[0][0] + '. ' + p[p.length - 1];
    }

    // ── State ─────────────────────────────────────────────────────────────────
    const allShows      = [...new Set(episodes.map(e => e.show))].sort();
    const sub = document.getElementById('ud-subline');
    if (sub) sub.innerHTML = 'Upright Digital &middot; ' + allShows.length + ' shows &middot; ' + episodes.length + ' episodes &middot; filter by topic, show, or date &middot; click a node to open the episode';
    const selectedShows = new Set(allShows);
    let   activeTopics  = new Set();
    let   searchQuery   = '';

    // ── Date range ────────────────────────────────────────────────────────────
    const allMonths = [...new Set(
      episodes.map(e => e.date ? e.date.slice(0, 7) : null).filter(Boolean)
    )].sort();
    const N = Math.max(allMonths.length - 1, 1);
    let dateFrom = 0, dateTo = N;

    const rangeFrom = document.getElementById('ud-range-from');
    const rangeTo   = document.getElementById('ud-range-to');
    const rangeFill = document.getElementById('ud-range-fill');
    const fromLabel = document.getElementById('ud-date-from-label');
    const toLabel   = document.getElementById('ud-date-to-label');
    const dateCount = document.getElementById('ud-date-count');

    rangeFrom.max = rangeTo.max = N;
    rangeFrom.value = 0; rangeTo.value = N;

    function updateSliderUI() {
      const from = parseInt(rangeFrom.value, 10);
      const to   = parseInt(rangeTo.value,   10);
      rangeFill.style.left  = (from / N * 100) + '%';
      rangeFill.style.right = ((1 - to / N) * 100) + '%';
      fromLabel.textContent = fmtMonthStr(allMonths[from] || allMonths[0]);
      toLabel.textContent   = fmtMonthStr(allMonths[to]   || allMonths[allMonths.length - 1]);
    }

    const monthsEl = document.getElementById('ud-slider-months');
    const tickStep = Math.max(1, Math.floor(allMonths.length / 9));
    const tickIdxs = [];
    for (let i = 0; i < allMonths.length; i += tickStep) tickIdxs.push(i);
    if (tickIdxs[tickIdxs.length - 1] !== allMonths.length - 1) tickIdxs.push(allMonths.length - 1);
    tickIdxs.forEach(i => {
      const span = document.createElement('span');
      span.textContent = fmtMonthStr(allMonths[i]);
      monthsEl.appendChild(span);
    });
    updateSliderUI();

    rangeFrom.addEventListener('input', () => {
      if (parseInt(rangeFrom.value) > parseInt(rangeTo.value)) rangeFrom.value = rangeTo.value;
      dateFrom = parseInt(rangeFrom.value, 10);
      updateSliderUI(); activeTopics.clear(); rebuildGraph();
    });
    rangeTo.addEventListener('input', () => {
      if (parseInt(rangeTo.value) < parseInt(rangeFrom.value)) rangeTo.value = rangeFrom.value;
      dateTo = parseInt(rangeTo.value, 10);
      updateSliderUI(); activeTopics.clear(); rebuildGraph();
    });

    document.getElementById('ud-loading').style.display = 'none';

    // ── Shows sidebar ─────────────────────────────────────────────────────────
    function buildShowsSidebar() {
      const listEl = document.getElementById('ud-shows-list');
      listEl.innerHTML = '';
      allShows.forEach(s => {
        const count = episodes.filter(e => e.show === s).length;
        const btn = document.createElement('button');
        btn.className = 'ud-show-btn' + (selectedShows.has(s) ? '' : ' inactive');
        btn.innerHTML = `<span class="ud-show-dot" style="background:${SHOW_COLORS[s]||'#888'}"></span>${s}<span class="ud-topic-count">${count}</span>`;
        btn.addEventListener('click', () => {
          if (selectedShows.has(s)) {
            if (selectedShows.size > 1) selectedShows.delete(s);
          } else {
            selectedShows.add(s);
          }
          activeTopics.clear(); searchQuery = '';
          searchInput.value = '';
          buildShowsSidebar(); rebuildGraph();
        });
        listEl.appendChild(btn);
      });
    }
    buildShowsSidebar();

    // ── Name search ───────────────────────────────────────────────────────────
    const searchInput = document.getElementById('ud-search');
    searchInput.addEventListener('input', () => {
      searchQuery = searchInput.value.trim().toLowerCase();
      applyVisualFilter();
    });

    // ── Graph setup ───────────────────────────────────────────────────────────
    const wrap    = document.getElementById('ud-graph-wrap');
    const network = document.getElementById('ud-network');
    const svg     = d3.select('#ud-graph');
    const W = () => wrap.clientWidth;
    const H = () => wrap.clientHeight;
    const g = svg.append('g');

    let isFullscreen = false;

    // Scroll-zoom only allowed with ctrl/meta in inline mode; free in fullscreen
    const zoom = d3.zoom().scaleExtent([0.15, 4])
      .filter(e => {
        if (e.type === 'wheel') return isFullscreen || e.ctrlKey || e.metaKey;
        return !e.button;
      })
      .on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);
    svg.call(zoom.transform, d3.zoomIdentity.translate(W()/2, H()/2).scale(0.72).translate(-W()/2, -H()/2));

    // ── Fullscreen ────────────────────────────────────────────────────────────
    const fsBtn = document.getElementById('ud-fullscreen-btn');

    function enterFullscreen() {
      isFullscreen = true;
      network.classList.add('ud-fullscreen');
      fsBtn.textContent = '✕';
      fsBtn.title = 'Exit fullscreen (Esc)';
      document.body.style.overflow = 'hidden';
      setTimeout(() => {
        svg.attr('viewBox', `0 0 ${W()} ${H()}`);
        if (sim) sim.force('center', d3.forceCenter(W()/2, H()/2)).alpha(0.15).restart();
      }, 60);
    }

    function exitFullscreen() {
      isFullscreen = false;
      network.classList.remove('ud-fullscreen');
      fsBtn.textContent = '⛶';
      fsBtn.title = 'Open fullscreen (scroll to zoom)';
      document.body.style.overflow = '';
      setTimeout(() => {
        svg.attr('viewBox', `0 0 ${W()} ${H()}`);
        if (sim) sim.force('center', d3.forceCenter(W()/2, H()/2)).alpha(0.15).restart();
      }, 60);
    }

    fsBtn.addEventListener('click', () => isFullscreen ? exitFullscreen() : enterFullscreen());
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isFullscreen) exitFullscreen(); });

    let linkSel, nodeSel, sim;
    let _usedTopics = [], _topicCounts = {}, _visEps = [];

    // ── Visual filter (topics + search, no re-simulation) ────────────────────
    function applyVisualFilter() {
      if (!nodeSel) return;
      const matchCountEl = document.getElementById('ud-match-count');
      const hasTopics = activeTopics.size > 0;
      const hasSearch = searchQuery.length > 0;

      if (!hasTopics && !hasSearch) {
        nodeSel.filter(d => d.type === 'episode').select('circle')
          .attr('fill', d => SHOW_COLORS[d.data.show] || '#FFA940')
          .attr('stroke', '#01060F').attr('stroke-width', 1.5).attr('opacity', 1);
        nodeSel.filter(d => d.type === 'episode').select('text').attr('opacity', 1);
        nodeSel.filter(d => d.type === 'topic').select('circle').attr('opacity', 1);
        nodeSel.filter(d => d.type === 'topic').select('text').attr('opacity', 1);
        linkSel.attr('stroke-opacity', 0.28);
        matchCountEl.style.display = 'none';
        return;
      }

      // Determine matching episodes
      let matchEps;
      if (hasTopics && hasSearch) {
        matchEps = new Set(_visEps.filter(ep =>
          [...activeTopics].some(t => ep.topics.includes(t)) &&
          ep.name.toLowerCase().includes(searchQuery)
        ).map(ep => ep.id));
      } else if (hasTopics) {
        matchEps = new Set(_visEps.filter(ep =>
          [...activeTopics].some(t => ep.topics.includes(t))
        ).map(ep => ep.id));
      } else {
        matchEps = new Set(_visEps.filter(ep =>
          ep.name.toLowerCase().includes(searchQuery)
        ).map(ep => ep.id));
      }

      const matchTopics = new Set([...activeTopics].map(t => 'topic_' + t));
      matchCountEl.textContent   = `${matchEps.size} episode${matchEps.size !== 1 ? 's' : ''}`;
      matchCountEl.style.display = 'block';

      nodeSel.filter(d => d.type === 'episode').select('circle')
        .attr('fill',  d => matchEps.has(d.id) ? (SHOW_COLORS[d.data.show] || '#FFA940') : '#0F1B35')
        .attr('stroke', d => matchEps.has(d.id) ? '#ffffff' : '#1E2A4A')
        .attr('stroke-width', d => matchEps.has(d.id) ? 2 : 1)
        .attr('opacity', d => matchEps.has(d.id) ? 1 : 0.15);
      nodeSel.filter(d => d.type === 'episode').select('text')
        .attr('opacity', d => matchEps.has(d.id) ? 1 : 0.08);

      if (hasTopics) {
        nodeSel.filter(d => d.type === 'topic').select('circle')
          .attr('opacity', d => matchTopics.has(d.id) ? 1 : 0.12);
        nodeSel.filter(d => d.type === 'topic').select('text')
          .attr('opacity', d => matchTopics.has(d.id) ? 1 : 0.12);
        linkSel.attr('stroke-opacity', d => {
          const id = typeof d.source === 'object' ? d.source.id : d.source;
          return matchEps.has(id) && activeTopics.has(d.topic) ? 0.75 : 0.03;
        });
      } else {
        nodeSel.filter(d => d.type === 'topic').select('circle').attr('opacity', 0.35);
        nodeSel.filter(d => d.type === 'topic').select('text').attr('opacity', 0.35);
        linkSel.attr('stroke-opacity', d => {
          const id = typeof d.source === 'object' ? d.source.id : d.source;
          return matchEps.has(id) ? 0.4 : 0.03;
        });
      }
    }

    // ── Rebuild graph (re-simulates) ──────────────────────────────────────────
    function rebuildGraph() {
      _visEps = episodes
        .filter(e => selectedShows.has(e.show))
        .filter(e => {
          if (!e.date || allMonths.length === 0) return true;
          const idx = allMonths.indexOf(e.date.slice(0, 7));
          if (idx < 0) return true;
          return idx >= dateFrom && idx <= dateTo;
        });

      dateCount.textContent = `${_visEps.length} episode${_visEps.length !== 1 ? 's' : ''}`;

      _usedTopics  = [...new Set(_visEps.flatMap(e => e.topics))].sort();
      _topicCounts = {};
      _usedTopics.forEach(t => { _topicCounts[t] = _visEps.filter(e => e.topics.includes(t)).length; });

      buildTopicSidebar();

      const nodes = [
        ..._visEps.map(ep => ({ id: ep.id, type: 'episode', data: ep })),
        ..._usedTopics.map(t => ({ id: 'topic_' + t, type: 'topic', label: t })),
      ];
      const links = _visEps.flatMap(ep =>
        ep.topics.map(t => ({ source: ep.id, target: 'topic_' + t, topic: t }))
      );

      g.selectAll('*').remove();
      if (sim) sim.stop();

      svg.attr('viewBox', `0 0 ${W()} ${H()}`);
      svg.call(zoom.transform, d3.zoomIdentity.translate(W()/2, H()/2).scale(0.72).translate(-W()/2, -H()/2));

      sim = d3.forceSimulation(nodes)
        .force('link',      d3.forceLink(links).id(d => d.id).distance(110).strength(0.4))
        .force('charge',    d3.forceManyBody().strength(d => d.type === 'topic' ? -420 : -180))
        .force('center',    d3.forceCenter(W()/2, H()/2))
        .force('collision', d3.forceCollide(d => d.type === 'topic' ? 48 : 32));

      linkSel = g.append('g').selectAll('line').data(links).join('line')
        .attr('stroke',         d => TOPIC_COLORS[d.topic] || '#4DA9F0')
        .attr('stroke-width',   1.2)
        .attr('stroke-opacity', 0.28);

      nodeSel = g.append('g').selectAll('g').data(nodes).join('g')
        .call(d3.drag()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
          .on('drag',  (e, d) => { d.fx = e.x; d.fy = e.y; })
          .on('end',   (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; }));

      // Episode nodes
      nodeSel.filter(d => d.type === 'episode').append('circle')
        .attr('r', 16)
        .attr('fill', d => SHOW_COLORS[d.data.show] || '#FFA940')
        .attr('stroke', '#01060F').attr('stroke-width', 1.5).attr('cursor', 'pointer');

      // Episode labels
      nodeSel.filter(d => d.type === 'episode').append('text')
        .attr('text-anchor', 'middle').attr('dy', '30px')
        .attr('font-size', '11px').attr('font-weight', '500')
        .attr('fill', d => SHOW_COLORS[d.data.show] || '#FFA940')
        .attr('pointer-events', 'none')
        .attr('paint-order', 'stroke').attr('stroke', '#01060F')
        .attr('stroke-width', '3px').attr('stroke-linejoin', 'round')
        .text(d => fmtName(d.data.name));

      // Topic hubs
      nodeSel.filter(d => d.type === 'topic').append('circle')
        .attr('r', 30)
        .attr('fill', d => {
          const c = d3.color(TOPIC_COLORS[d.label] || '#4DA9F0');
          return c ? c.copy({ opacity: 0.14 }) + '' : '#4DA9F020';
        })
        .attr('stroke', d => TOPIC_COLORS[d.label] || '#4DA9F0')
        .attr('stroke-width', 1.5).attr('cursor', 'pointer');

      nodeSel.filter(d => d.type === 'topic').append('text')
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '10px').attr('font-weight', '700').attr('pointer-events', 'none')
        .attr('fill', d => TOPIC_COLORS[d.label] || '#4DA9F0')
        .each(function (d) {
          const words = d.label.split(' ');
          const el = d3.select(this);
          if (words.length <= 2) { el.text(d.label); return; }
          const mid = Math.ceil(words.length / 2);
          el.append('tspan').attr('x', 0).attr('dy', '-0.6em').text(words.slice(0, mid).join(' '));
          el.append('tspan').attr('x', 0).attr('dy', '1.2em').text(words.slice(mid).join(' '));
        });

      sim.on('tick', () => {
        linkSel.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
               .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
        nodeSel.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      // ── Tooltip ──────────────────────────────────────────────────────────────
      const tooltip = document.getElementById('ud-tooltip');
      let ttTimer = null, ttHovered = false;
      tooltip.addEventListener('mouseenter', () => { ttHovered = true; clearTimeout(ttTimer); });
      tooltip.addEventListener('mouseleave', () => {
        ttHovered = false; tooltip.style.opacity = '0'; tooltip.style.pointerEvents = 'none';
      });

      // Primary listen link: YouTube wins if present; else Spotify. Never show both.
      function primaryListen(d) {
        const yt = d.data.url || '';
        const sp = d.data.spotify_url || '';
        if (yt) return { kind: 'youtube', url: yt };
        if (sp) return { kind: 'spotify', url: sp };
        return { kind: '', url: '' };
      }

      nodeSel.filter(d => d.type === 'episode')
        .on('click', (event, d) => {
          event.stopPropagation();
          const { url } = primaryListen(d);
          if (url) window.open(url, '_blank');
        })
        .on('mousemove', function (event, d) {
          const r = wrap.getBoundingClientRect();
          let x = event.clientX - r.left + 14, y = event.clientY - r.top - 10;
          if (x + 290 > r.width) x -= 300;
          tooltip.style.cssText = `left:${x}px;top:${y}px;opacity:1;position:absolute;background:#0F1B35;border:1px solid #1E2A4A;border-radius:9px;padding:10px 13px;font-size:12px;pointer-events:auto;max-width:280px;z-index:100;transition:opacity 0.2s;`;

          const ts = d.data.timestamps || {};
          const showColor = SHOW_COLORS[d.data.show] || '#FFA940';
          const dateStr   = d.data.date ? ' &middot; ' + fmtDate(d.data.date) : '';
          const listen = primaryListen(d);
          const topics = Array.isArray(d.data.topics) ? d.data.topics.filter(Boolean) : [];
          const hasTsJumps = listen.kind === 'youtube' && topics.some(t => ts[t]);

          // Always list topics in the tooltip (jump link only when YT timestamp exists)
          let tagsHtml;
          if (topics.length) {
            tagsHtml = topics.map(t => {
              const color = TOPIC_COLORS[t] || '#A8E0FF';
              const tsUrl = listen.kind === 'youtube' ? ts[t] : null;
              const style = `font-size:11px;padding:4px 9px;border-radius:10px;background:${color}33;color:${color};border:1px solid ${color}66;display:inline-block;margin:2px 3px 0 0;font-weight:600;line-height:1.2;`;
              return tsUrl
                ? `<a href="${tsUrl}" target="_blank" style="${style};text-decoration:none;" title="Jump to this topic in the episode">▶ ${t}</a>`
                : `<span style="${style}">${t}</span>`;
            }).join('');
          } else {
            tagsHtml = `<span style="font-size:11px;color:#9FB2CC;font-style:italic">No topics tagged</span>`;
          }

          let platformHtml = '';
          if (listen.kind === 'youtube') {
            platformHtml = `
            <div style="display:flex;gap:6px;margin-top:8px;border-top:1px solid #1E2A4A;padding-top:8px;">
              <a href="${listen.url}" target="_blank" style="font-size:11px;color:#fca5a5;text-decoration:none;padding:3px 9px;border-radius:5px;background:#7f1d1d55;border:1px solid #ef444480">▶ YouTube</a>
            </div>`;
          } else if (listen.kind === 'spotify') {
            platformHtml = `
            <div style="display:flex;gap:6px;margin-top:8px;border-top:1px solid #1E2A4A;padding-top:8px;">
              <a href="${listen.url}" target="_blank" style="font-size:11px;color:#6ee7b7;text-decoration:none;padding:3px 9px;border-radius:5px;background:#064e3b55;border:1px solid #1db95480">♫ Spotify</a>
            </div>`;
          }

          const clickHint = listen.kind === 'youtube'
            ? `<div style="font-size:10px;color:#9FB2CC;margin-bottom:6px">click node to open ▶ YouTube</div>`
            : (listen.kind === 'spotify'
              ? `<div style="font-size:10px;color:#9FB2CC;margin-bottom:6px">click node to open ♫ Spotify</div>`
              : `<div style="font-size:10px;color:#9FB2CC;margin-bottom:6px">no episode link yet</div>`);

          tooltip.innerHTML = `
            <div style="font-weight:700;color:#F2F7FD;font-size:14px;margin-bottom:3px">${fmtName(d.data.name)}</div>
            <div style="font-size:11px;font-weight:600;color:${showColor};margin-bottom:3px">● ${d.data.show}${dateStr}</div>
            <div style="color:#9FB2CC;font-size:11px;margin-bottom:6px;line-height:1.4">${d.data.role || ''}</div>
            ${clickHint}
            <div style="font-size:10px;color:#9FB2CC;margin-bottom:5px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Topics${hasTsJumps ? ' — click chip to jump' : ''}</div>
            <div style="line-height:1.6">${tagsHtml}</div>
            ${platformHtml}`;
        })
        .on('mouseleave', () => {
          ttTimer = setTimeout(() => {
            if (!ttHovered) { tooltip.style.opacity = '0'; tooltip.style.pointerEvents = 'none'; }
          }, 800);
        });

      nodeSel.filter(d => d.type === 'topic')
        .on('click', (e, d) => { e.stopPropagation(); filterByTopic(d.label); })
        .on('mousemove', function (event, d) {
          const r = wrap.getBoundingClientRect();
          tooltip.style.cssText = `left:${event.clientX - r.left + 14}px;top:${event.clientY - r.top - 10}px;opacity:1;position:absolute;background:#0F1B35;border:1px solid #1E2A4A;border-radius:8px;padding:9px 12px;pointer-events:none;z-index:10;`;
          tooltip.innerHTML = `<div style="font-weight:700;color:#F2F7FD;font-size:13px">${d.label}</div><div style="color:#9FB2CC;font-size:11px">${_topicCounts[d.label]} episode${_topicCounts[d.label] !== 1 ? 's' : ''}</div>`;
        })
        .on('mouseleave', () => { tooltip.style.opacity = '0'; });

      svg.on('click', () => { activeTopics.clear(); buildTopicSidebar(); applyVisualFilter(); });

      // Re-apply any active search/topic filter after rebuild
      applyVisualFilter();
    }

    // ── Topic sidebar ─────────────────────────────────────────────────────────
    function buildTopicSidebar() {
      const listEl = document.getElementById('ud-topic-list');
      listEl.innerHTML = '';
      _usedTopics.forEach(t => {
        const btn = document.createElement('button');
        btn.className = 'ud-topic-btn' + (activeTopics.has(t) ? ' active' : '');
        btn.innerHTML = `<span class="ud-topic-dot" style="background:${TOPIC_COLORS[t]||'#4DA9F0'}"></span>${t}<span class="ud-topic-count">${_topicCounts[t]}</span>`;
        btn.addEventListener('click', () => filterByTopic(t));
        listEl.appendChild(btn);
      });
    }

    function filterByTopic(topic) {
      activeTopics.has(topic) ? activeTopics.delete(topic) : activeTopics.add(topic);
      buildTopicSidebar();
      applyVisualFilter();
    }

    // ── Clear button ──────────────────────────────────────────────────────────
    document.getElementById('ud-clear-btn').addEventListener('click', () => {
      activeTopics.clear();
      searchQuery = '';
      searchInput.value = '';
      buildTopicSidebar();
      applyVisualFilter();
    });

    rebuildGraph();

    window.addEventListener('resize', () => {
      svg.attr('viewBox', `0 0 ${W()} ${H()}`);
      if (sim) sim.force('center', d3.forceCenter(W()/2, H()/2)).alpha(0.1).restart();
    });

  } // end buildGraph

})();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
