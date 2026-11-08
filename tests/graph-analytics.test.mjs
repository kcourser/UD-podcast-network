/**
 * Graph analytics tests for uprt-network-ud.js.
 * Synthetic episodes, a mock gtag, and the v0.2 consent bridge only.
 * No Google tag loader, no analytics host, no contact-form submission.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { describe, test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const D3_URL = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
const DATA_URL = 'https://raw.githubusercontent.com/kcourser/UD-podcast-network/main/episodes.json';
const GA_HOST = /google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com/i;
const ALLOWED_EVENTS = new Set([
  'podcast_graph_filter',
  'podcast_graph_search',
  'podcast_graph_fullscreen',
  'podcast_episode_open',
  'podcast_topic_jump'
]);

let server;
let origin;
let browser;
let d3Source = '';
const fixture = buildFixture();

function buildFixture() {
  const episodes = [
    {
      id: 'ep_yt',
      show: 'Alpha Show',
      name: 'Video Guest',
      role: 'Fixture host',
      date: '2025-01-10',
      file: 'fixture.docx',
      url: 'https://youtu.be/exampleVideo',
      spotify_url: '',
      topics: ['Topic One'],
      timestamps: { 'Topic One': 'https://youtu.be/exampleVideo?t=15' }
    },
    {
      id: 'ep_sp',
      show: 'Beta Show',
      name: 'Audio Guest',
      role: 'Fixture host',
      date: '2025-02-10',
      file: 'fixture.docx',
      url: '',
      spotify_url: 'https://open.spotify.com/episode/exampleAudio',
      topics: ['Topic Two'],
      timestamps: { 'Topic Two': 'https://youtu.be/should-not-render' }
    },
    {
      id: 'ep_none',
      show: 'Alpha Show',
      name: 'Silent Guest',
      role: 'Fixture host',
      date: '2025-01-20',
      file: 'fixture.docx',
      url: '',
      spotify_url: '',
      topics: ['Topic One'],
      timestamps: {}
    },
    {
      id: 'ep_both',
      show: 'Beta Show',
      name: 'Both Guest',
      role: 'Fixture host',
      date: '2025-06-10',
      file: 'fixture.docx',
      url: 'https://youtu.be/primaryWins',
      spotify_url: 'https://open.spotify.com/episode/ignoredExample',
      topics: ['Topic One'],
      timestamps: { 'Topic One': 'https://youtu.be/primaryWins?t=9' }
    }
  ];

  for (let i = 1; i <= 21; i++) {
    const topicOne = i <= 2;
    episodes.push({
      id: 'ep_wide_' + i,
      show: i === 21 ? 'Beta Show' : 'Alpha Show',
      name: 'Wide Example ' + String(i).padStart(2, '0'),
      role: 'Fixture',
      date: '2025-03-15',
      file: 'fixture.docx',
      url: '',
      spotify_url: '',
      topics: [topicOne ? 'Topic One' : 'Topic Two'],
      timestamps: {}
    });
  }
  for (let i = 1; i <= 6; i++) {
    episodes.push({
      id: 'ep_mid_' + i,
      show: 'Beta Show',
      name: 'Midlist Example ' + String(i).padStart(2, '0'),
      role: 'Fixture',
      date: '2025-04-15',
      file: 'fixture.docx',
      url: '',
      spotify_url: '',
      topics: ['Topic Two'],
      timestamps: {}
    });
  }
  for (let i = 1; i <= 5; i++) {
    episodes.push({
      id: 'ep_tiny_' + i,
      show: 'Alpha Show',
      name: 'Tiny Example ' + String(i).padStart(2, '0'),
      role: 'Fixture',
      date: '2025-05-15',
      file: 'fixture.docx',
      url: '',
      spotify_url: '',
      topics: ['Topic Two'],
      timestamps: {}
    });
  }
  episodes.push({
    id: 'ep_solo',
    show: 'Alpha Show',
    name: 'Solo Example',
    role: 'Fixture',
    date: '2025-06-02',
    file: 'fixture.docx',
    url: '',
    spotify_url: '',
    topics: ['Topic One'],
    timestamps: {}
  });

  return {
    meta: {
      topic_colors: { 'Topic One': '#0ea5e9', 'Topic Two': '#22d3ee' },
      show_colors: { 'Alpha Show': '#1A4AF0', 'Beta Show': '#C01020' }
    },
    episodes
  };
}

function startServer() {
  const serverRoot = root.endsWith(path.sep) ? root : root + path.sep;
  return new Promise((resolve) => {
    const instance = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const rel = decodeURIComponent(url.pathname);
      const file = path.normalize(path.join(root, rel));
      if (!file.startsWith(serverRoot) && file !== root) {
        res.writeHead(403);
        res.end();
        return;
      }
      fs.readFile(file, (err, buf) => {
        if (err) {
          res.writeHead(404);
          res.end('not found');
          return;
        }
        const types = {
          '.html': 'text/html; charset=utf-8',
          '.js': 'text/javascript; charset=utf-8',
          '.json': 'application/json',
          '.png': 'image/png'
        };
        res.writeHead(200, {
          'content-type': types[path.extname(file)] || 'application/octet-stream',
          'cache-control': 'no-store'
        });
        res.end(buf);
      });
    });
    instance.listen(0, '127.0.0.1', () => resolve(instance));
  });
}

test('graph source does not load or configure Google Analytics', () => {
  const source = fs.readFileSync(path.join(root, 'uprt-network-ud.js'), 'utf8');
  assert.match(source, /window\.UDAnalytics/);
  assert.equal(source.includes('gtag('), false);
  assert.equal(source.includes('googletagmanager'), false);
  assert.equal(source.includes('G-56LGZ7E9CD'), false);
  assert.equal(source.includes('page_view'), false);
  for (const name of ALLOWED_EVENTS) assert.match(source, new RegExp(name));
  assert.equal(source.includes('podcast_graph_open'), false);
  assert.equal(source.includes('generate_lead'), false);
});

test('v0.2 bridge fixture is the handoff allowlist and stays out of the graph', () => {
  const local = fs.readFileSync(path.join(root, 'tests/fixtures/ud-analytics-bridge-v0.2.js'));
  const source = local.toString('utf8');
  assert.equal(local.length, 1065);
  assert.equal(source.includes('<script'), false);
  assert.match(source, /window\.UDAnalytics=\{setConsent\(v\)\{granted=v===true;\},isGranted\(\)\{return granted;\},track/);
  for (const name of [
    'podcast_graph_filter', 'podcast_graph_search', 'podcast_graph_fullscreen',
    'podcast_episode_open', 'podcast_topic_jump', 'generate_lead'
  ]) {
    assert.equal(source.includes(name), true);
  }
  assert.equal(fs.readFileSync(path.join(root, 'uprt-network-ud.js'), 'utf8').includes('G-56LGZ7E9CD'), false);
});

test('synthetic catalog produces the search buckets under test', () => {
  const episodes = fixture.episodes;
  const named = (q) => episodes.filter((e) => e.name.toLowerCase().includes(q)).length;
  assert.equal(named('wide'), 21);
  assert.equal(named('midlist'), 6);
  assert.equal(named('tiny'), 5);
  assert.equal(named('solo'), 1);
  assert.equal(named('nomatchzzz'), 0);
  assert.equal(episodes.filter((e) => e.show === 'Alpha Show' && /wide/i.test(e.name)).length, 20);
  assert.equal(episodes.filter((e) => /wide/i.test(e.name) && e.topics.includes('Topic One')).length, 2);
});

describe('native graph analytics in Chrome', { concurrency: false }, () => {
  before(async () => {
    d3Source = await fetch(D3_URL).then((res) => {
      if (!res.ok) throw new Error('d3 download failed ' + res.status);
      return res.text();
    });
    server = await startServer();
    origin = 'http://127.0.0.1:' + server.address().port;
    browser = await chromium.launch({
      executablePath: '/usr/bin/google-chrome',
      headless: true,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
    });
  });

  after(async () => {
    if (browser) await browser.close();
    if (server) await new Promise((resolve) => server.close(resolve));
  });

  test('initial render, zoom, and simulation ticks emit nothing', async () => {
    await withPage(async ({ page }) => {
      await page.waitForTimeout(1100);
      assert.deepEqual(await calls(page), []);
      await page.evaluate(() => {
        const svg = document.querySelector('#ud-graph');
        for (let i = 0; i < 6; i++) {
          svg.dispatchEvent(new WheelEvent('wheel', {
            deltaY: -50,
            ctrlKey: true,
            bubbles: true,
            cancelable: true,
            clientX: 500,
            clientY: 400
          }));
        }
      });
      await page.waitForTimeout(400);
      assert.deepEqual(await calls(page), []);
      const zoomed = await page.evaluate(() => {
        const svg = document.querySelector('#ud-graph');
        return svg && svg.__zoom ? svg.__zoom.k : null;
      });
      assert.equal(typeof zoomed, 'number');
    });
  });

  test('topic, show, clear, and background follow committed state', async () => {
    await withPage(async ({ page }) => {
      await page.getByRole('button', { name: /Topic One/ }).click();
      assert.deepEqual(await calls(page), [
        { name: 'podcast_graph_filter', data: { filter_type: 'topic', action: 'select' } }
      ]);
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);

      await page.getByRole('button', { name: /Topic One/ }).click();
      assert.equal((await calls(page))[1].data.action, 'deselect');
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 0);

      await page.getByRole('button', { name: /Topic Two/ }).click();
      await page.getByRole('button', { name: /Alpha Show/ }).click();
      const afterSolo = await calls(page);
      assert.deepEqual(afterSolo.at(-1), {
        name: 'podcast_graph_filter',
        data: { filter_type: 'show', action: 'solo' }
      });
      assert.equal(afterSolo.filter((e) => e.data.action === 'deselect').length, 1);
      assert.match(await page.locator('.ud-show-btn.solo-active').innerText(), /Alpha Show/);
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 0);

      await page.getByRole('button', { name: /Alpha Show/ }).click();
      assert.deepEqual((await calls(page)).at(-1).data, { filter_type: 'show', action: 'all' });
      assert.equal(await page.locator('#ud-all-shows-btn.active').count(), 1);

      await resetLog(page);
      await page.locator('#ud-all-shows-btn').click();
      assert.deepEqual(await calls(page), []);

      await page.getByRole('button', { name: /Topic Two/ }).click();
      await page.locator('#ud-all-shows-btn').click();
      assert.deepEqual((await calls(page)).at(-1), {
        name: 'podcast_graph_filter',
        data: { filter_type: 'show', action: 'all' }
      });

      await resetLog(page);
      await page.locator('#ud-clear-btn').click();
      assert.deepEqual(await calls(page), []);

      await page.getByRole('button', { name: /Beta Show/ }).click();
      await page.locator('#ud-clear-btn').click();
      assert.deepEqual((await calls(page)).at(-1), {
        name: 'podcast_graph_filter',
        data: { filter_type: 'clear', action: 'clear' }
      });
      assert.equal(await page.locator('#ud-all-shows-btn.active').count(), 1);

      await resetLog(page);
      await page.getByRole('button', { name: /Topic One/ }).click();
      const spot = await emptySvgPoint(page);
      assert.ok(spot, 'expected an empty graph background point');
      await page.mouse.move(spot.x, spot.y);
      await page.mouse.down();
      await page.mouse.move(spot.x + 80, spot.y + 36, { steps: 8 });
      await page.mouse.up();
      await page.waitForTimeout(50);
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);
      assert.equal((await calls(page)).some((e) => e.data.filter_type === 'background'), false);

      const spot2 = await emptySvgPoint(page);
      await page.mouse.click(spot2.x, spot2.y);
      assert.deepEqual((await calls(page)).at(-1), {
        name: 'podcast_graph_filter',
        data: { filter_type: 'background', action: 'clear' }
      });
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 0);

      await resetLog(page);
      const again = await emptySvgPoint(page);
      await page.mouse.click(again.x, again.y);
      assert.deepEqual(await calls(page), []);

      await page.screenshot({
        path: '/opt/cursor/artifacts/ud-graph-after-filters.png',
        fullPage: false
      });
    });
  });

  test('topic node selects without a background event or edge event', async () => {
    await withPage(async ({ page }) => {
      await clickTopicNode(page, 'Topic One');
      assert.deepEqual(await calls(page), [
        { name: 'podcast_graph_filter', data: { filter_type: 'topic', action: 'select' } }
      ]);
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);
      await page.evaluate(() => {
        document.querySelector('#ud-graph line').dispatchEvent(new MouseEvent('click', { bubbles: true }));
      });
      const names = (await calls(page)).map((e) => e.name + ':' + (e.data.filter_type || e.data.action || ''));
      assert.equal(names.includes('podcast_graph_filter:background') || names.length === 1, true);
      for (const event of await calls(page)) {
        assert.equal(ALLOWED_EVENTS.has(event.name), true);
        assert.equal(JSON.stringify(event).includes('edge'), false);
        assert.equal(JSON.stringify(event).includes('play'), false);
      }
    });
  });

  test('date drag commits once and keyboard does not emit per frame', async () => {
    await withPage(async ({ page }) => {
      const before = await page.locator('#ud-date-from-label').innerText();
      const beforeCount = await page.locator('#ud-date-count').innerText();
      await page.evaluate(() => {
        const el = document.getElementById('ud-range-from');
        for (const value of [1, 2, 3]) {
          el.value = String(value);
          el.dispatchEvent(new Event('input', { bubbles: true }));
        }
      });
      assert.notEqual(await page.locator('#ud-date-from-label').innerText(), before);
      assert.notEqual(await page.locator('#ud-date-count').innerText(), beforeCount);
      assert.deepEqual(await calls(page), []);
      await page.evaluate(() => {
        document.getElementById('ud-range-from').dispatchEvent(new Event('change', { bubbles: true }));
      });
      assert.deepEqual(await calls(page), [
        { name: 'podcast_graph_filter', data: { filter_type: 'date', action: 'select' } }
      ]);

      await resetLog(page);
      await page.locator('#ud-range-to').focus();
      await page.keyboard.press('ArrowLeft');
      await page.waitForTimeout(50);
      const dateEvents = (await calls(page)).filter((e) => e.data.filter_type === 'date');
      assert.equal(dateEvents.length, 1);
      assert.deepEqual(dateEvents[0].data, { filter_type: 'date', action: 'select' });

      await resetLog(page);
      await page.evaluate(() => {
        document.getElementById('ud-range-to').dispatchEvent(new Event('change', { bubbles: true }));
        document.getElementById('ud-range-to').dispatchEvent(new KeyboardEvent('keyup', { bubbles: true, key: 'ArrowLeft' }));
      });
      assert.deepEqual(await calls(page), []);
    });
  });

  test('search debounce, buckets, raw text, and cancelled resets', async () => {
    await withPage(async ({ page }) => {
      const search = page.locator('#ud-search');
      await search.click();
      await page.keyboard.type('wi', { delay: 20 });
      await page.waitForTimeout(350);
      assert.deepEqual(await calls(page), []);
      await page.keyboard.type('de', { delay: 20 });
      await page.waitForFunction(() => window.__trackCalls.length === 1);
      assert.deepEqual(await calls(page), [
        {
          name: 'podcast_graph_search',
          data: { query_length_bucket: '4_10', result_bucket: '21_plus' }
        }
      ]);
      assert.equal(await search.inputValue(), 'wide');
      assert.equal(JSON.stringify(await calls(page)).includes('wide'), false);

      await search.press('End');
      await page.keyboard.type(' ', { delay: 10 });
      await page.waitForTimeout(900);
      assert.equal((await calls(page)).length, 1);

      await search.fill('');
      await page.waitForFunction(() => window.__trackCalls.length === 2);
      assert.deepEqual((await calls(page))[1], {
        name: 'podcast_graph_search',
        data: { query_length_bucket: '0', result_bucket: '21_plus' }
      });

      await resetLog(page);
      await search.fill('midlist');
      await page.waitForFunction(() => window.__trackCalls.length === 1);
      assert.equal((await calls(page))[0].data.result_bucket, '6_20');
      await search.fill('tiny');
      await page.waitForFunction(() => window.__trackCalls.length === 2);
      assert.equal((await calls(page))[1].data.result_bucket, '1_5');
      assert.equal((await calls(page))[1].data.query_length_bucket, '4_10');
      await search.fill('solo');
      await page.waitForFunction(() => window.__trackCalls.length === 3);
      assert.equal((await calls(page))[2].data.result_bucket, '1_5');
      await search.fill('nomatchzzz');
      await page.waitForFunction(() => window.__trackCalls.length === 4);
      assert.deepEqual((await calls(page))[3].data, {
        query_length_bucket: '4_10',
        result_bucket: '0'
      });
      await search.fill('nomatchzzzz');
      await page.waitForFunction(() => window.__trackCalls.length === 5);
      assert.equal((await calls(page))[4].data.query_length_bucket, '11_plus');
      await search.fill('wid');
      await page.waitForFunction(() => window.__trackCalls.length === 6);
      assert.equal((await calls(page))[5].data.query_length_bucket, '1_3');
      assert.equal((await calls(page))[5].data.result_bucket, '21_plus');

      const leaked = JSON.stringify(await calls(page));
      for (const secret of ['midlist', 'tiny', 'solo', 'nomatch', 'wide', 'Video Guest']) {
        assert.equal(leaked.toLowerCase().includes(secret.toLowerCase()), false, secret);
      }

      await resetLog(page);
      await page.getByRole('button', { name: /Topic One/ }).click();
      await search.fill('wide');
      await page.waitForFunction(() => window.__trackCalls.some((e) => e.name === 'podcast_graph_search'));
      const searchEvent = (await calls(page)).find((e) => e.name === 'podcast_graph_search');
      assert.deepEqual(searchEvent.data, { query_length_bucket: '4_10', result_bucket: '1_5' });

      await resetLog(page);
      await search.fill('SecretGuestName');
      await page.waitForTimeout(200);
      await page.locator('#ud-clear-btn').click();
      await page.waitForTimeout(1000);
      assert.deepEqual(await calls(page), [
        { name: 'podcast_graph_filter', data: { filter_type: 'clear', action: 'clear' } }
      ]);
      assert.equal(JSON.stringify(await calls(page)).includes('SecretGuestName'), false);
      assert.equal(await search.inputValue(), '');

      await search.fill('SecretGuestName');
      await page.waitForTimeout(150);
      await page.getByRole('button', { name: /Beta Show/ }).click();
      await page.waitForTimeout(1000);
      const names = (await calls(page)).map((e) => e.name);
      assert.equal(names.includes('podcast_graph_search'), false);
      assert.deepEqual((await calls(page)).at(-1).data, { filter_type: 'show', action: 'solo' });
      assert.equal(await search.inputValue(), '');
    });
  });

  test('fullscreen button and Escape emit one transition each', async () => {
    await withPage(async ({ page }) => {
      const button = page.locator('#ud-fullscreen-btn');
      await button.focus();
      await page.keyboard.press('Enter');
      await page.waitForTimeout(80);
      assert.equal(await page.locator('#ud-network.ud-fullscreen').count(), 1);
      assert.equal(await button.innerText(), '✕');
      assert.equal(await page.evaluate(() => document.body.style.overflow), 'hidden');
      assert.deepEqual(await calls(page), [
        { name: 'podcast_graph_fullscreen', data: { action: 'enter' } }
      ]);
      await page.keyboard.press('Escape');
      await page.waitForTimeout(80);
      assert.equal(await page.locator('#ud-network.ud-fullscreen').count(), 0);
      assert.equal(await page.evaluate(() => document.body.style.overflow), '');
      assert.deepEqual((await calls(page)).at(-1).data, { action: 'exit' });
      await page.keyboard.press('Escape');
      await page.waitForTimeout(50);
      assert.equal((await calls(page)).length, 2);

      await button.click();
      await button.click();
      assert.equal((await calls(page)).filter((e) => e.name === 'podcast_graph_fullscreen').length, 4);
      assert.deepEqual((await calls(page)).at(-1).data, { action: 'exit' });
    });
  });

  test('episode open preserves popup targets and ignores no-listen nodes', async () => {
    await withPage(async ({ page }) => {
      await activateEpisode(page, 'ep_none');
      assert.deepEqual(await opens(page), []);
      assert.deepEqual(await calls(page), []);
      await showTooltip(page, 'ep_none');
      assert.match(await page.locator('#ud-tooltip').innerText(), /no episode link yet/i);
      assert.equal(await page.locator('#ud-tooltip a').count(), 0);

      await activateEpisode(page, 'ep_yt');
      assert.deepEqual(await opens(page), [['https://youtu.be/exampleVideo', '_blank']]);
      assert.deepEqual(await calls(page), [
        { name: 'podcast_episode_open', data: { source: 'node', platform: 'youtube' } }
      ]);
      assert.equal((await anchors(page)).length, 0);

      await resetLog(page);
      await activateEpisode(page, 'ep_sp');
      assert.deepEqual(await opens(page), [['https://open.spotify.com/episode/exampleAudio', '_blank']]);
      assert.deepEqual((await calls(page))[0].data, { source: 'node', platform: 'spotify' });

      await resetLog(page);
      await activateEpisode(page, 'ep_both');
      assert.deepEqual(await opens(page), [['https://youtu.be/primaryWins', '_blank']]);
      assert.equal((await calls(page))[0].data.platform, 'youtube');
      const blob = JSON.stringify({ calls: await calls(page), opens: await opens(page) });
      assert.equal(blob.includes('ignoredExample'), false);
      assert.equal(blob.includes('Video Guest'), false);
    });
  });

  test('tooltip links are distinct from node activation', async () => {
    await withPage(async ({ page }) => {
      await showTooltip(page, 'ep_yt');
      const primary = page.locator('#ud-tooltip a[data-ud-track="episode"]');
      const jump = page.locator('#ud-tooltip a[data-ud-track="topic"]');
      assert.equal(await primary.getAttribute('href'), 'https://youtu.be/exampleVideo');
      assert.equal(await primary.getAttribute('target'), '_blank');
      assert.equal(await jump.getAttribute('href'), 'https://youtu.be/exampleVideo?t=15');
      assert.equal(await jump.getAttribute('target'), '_blank');

      await jump.click();
      assert.deepEqual(await calls(page), [
        { name: 'podcast_topic_jump', data: { source: 'tooltip', platform: 'youtube' } }
      ]);
      assert.deepEqual(await opens(page), []);
      assert.deepEqual(await anchors(page), ['https://youtu.be/exampleVideo?t=15']);

      await primary.click();
      assert.deepEqual((await calls(page))[1], {
        name: 'podcast_episode_open',
        data: { source: 'tooltip', platform: 'youtube' }
      });
      assert.deepEqual(await opens(page), []);
      assert.deepEqual(await anchors(page), [
        'https://youtu.be/exampleVideo?t=15',
        'https://youtu.be/exampleVideo'
      ]);

      await showTooltip(page, 'ep_sp');
      assert.equal(await page.locator('#ud-tooltip a[data-ud-track="topic"]').count(), 0);
      assert.equal(await page.locator('#ud-tooltip').innerText().then((t) => t.includes('should-not-render')), false);
      await page.locator('#ud-tooltip a[data-ud-track="episode"]').click();
      assert.deepEqual((await calls(page)).at(-1), {
        name: 'podcast_episode_open',
        data: { source: 'tooltip', platform: 'spotify' }
      });
      assert.equal((await anchors(page)).at(-1), 'https://open.spotify.com/episode/exampleAudio');
    });
  });

  test('drag does not open an episode and a later click does', async () => {
    await withPage(async ({ page }) => {
      const hit = await visibleEpisode(page);
      assert.ok(hit, 'expected a visible episode circle');
      await page.mouse.move(hit.x, hit.y);
      await page.mouse.down();
      await page.mouse.move(hit.x + 90, hit.y + 40, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(80);
      assert.deepEqual(await opens(page), []);
      assert.equal((await calls(page)).some((e) => e.name === 'podcast_episode_open'), false);

      const after = await visibleEpisode(page);
      assert.ok(after);
      await page.mouse.click(after.x, after.y);
      await page.waitForTimeout(50);
      assert.equal((await opens(page)).length, 1);
      assert.equal((await opens(page))[0][1], '_blank');
      assert.equal((await opens(page))[0][0].length > 0, true);
      assert.deepEqual((await calls(page)).at(-1).name, 'podcast_episode_open');
      assert.equal((await calls(page)).at(-1).data.source, 'node');
    });
  });

  test('rebuilds and repeated tooltip renders do not stack listeners', async () => {
    await withPage(async ({ page }) => {
      await page.evaluate(() => {
        const el = document.getElementById('ud-range-to');
        const max = Number(el.max);
        for (let i = 0; i < 3; i++) {
          el.value = String(i % 2 === 0 ? max - 1 : max);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          el.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
      await resetLog(page);
      await showTooltip(page, 'ep_yt');
      await showTooltip(page, 'ep_yt');
      await showTooltip(page, 'ep_yt');
      await page.locator('#ud-tooltip a[data-ud-track="episode"]').click();
      const episodeEvents = (await calls(page)).filter((e) => e.name === 'podcast_episode_open');
      assert.equal(episodeEvents.length, 1);
      await page.locator('#ud-tooltip a[data-ud-track="episode"]').click();
      assert.equal((await calls(page)).filter((e) => e.name === 'podcast_episode_open').length, 2);

      const beforeStyles = await styleCount(page);
      await page.addScriptTag({ url: origin + '/uprt-network-ud.js?reload=1' });
      await page.waitForTimeout(250);
      assert.equal(await styleCount(page), beforeStyles);
      assert.equal(await page.locator('#ud-search').count(), 1);
      await resetLog(page);
      await page.getByRole('button', { name: /Topic Two/ }).click();
      assert.equal((await calls(page)).length, 1);
    });
  });

  test('missing bridge and a throwing bridge still navigate', async () => {
    await withPage({ bridge: false }, async ({ page }) => {
      assert.equal(await page.evaluate(() => window.UDAnalytics), undefined);
      await page.getByRole('button', { name: /Topic One/ }).click();
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);
      await activateEpisode(page, 'ep_yt');
      assert.deepEqual(await opens(page), [['https://youtu.be/exampleVideo', '_blank']]);
      assert.deepEqual(await gtag(page), []);
      assert.deepEqual(await pageErrors(page), []);
    });

    await withPage({ bridge: false, throwing: true }, async ({ page }) => {
      await activateEpisode(page, 'ep_sp');
      assert.deepEqual(await opens(page), [['https://open.spotify.com/episode/exampleAudio', '_blank']]);
      assert.deepEqual(await pageErrors(page), []);
      await page.getByRole('button', { name: /Topic Two/ }).click();
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);
    });
  });

  test('denied consent sends nothing and grant does not replay', async () => {
    await withPage({ consent: false }, async ({ page }) => {
      assert.equal(await page.evaluate(() => window.UDAnalytics.isGranted()), false);
      await page.getByRole('button', { name: /Topic One/ }).click();
      await activateEpisode(page, 'ep_yt');
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 1);
      assert.deepEqual(await opens(page), [['https://youtu.be/exampleVideo', '_blank']]);
      assert.equal((await calls(page)).length, 2);
      assert.deepEqual(await gtag(page), []);

      await page.evaluate(() => window.UDAnalytics.setConsent(true));
      await page.waitForTimeout(50);
      assert.deepEqual(await gtag(page), []);
      await page.getByRole('button', { name: /Topic One/ }).click();
      assert.equal((await gtag(page)).length, 1);
      assert.equal((await gtag(page))[0][1], 'podcast_graph_filter');
      assert.equal((await gtag(page))[0][2].action, 'deselect');
      assert.equal((await gtag(page))[0][2].send_to, 'G-56LGZ7E9CD');
      assert.equal((await gtag(page))[0][2].measurement_version, '0.1');
    });
  });

  test('revoked consent blocks later events and keeps the graph usable', async () => {
    await withPage(async ({ page }) => {
      await page.getByRole('button', { name: /Topic Two/ }).click();
      assert.equal((await gtag(page)).length, 1);
      await page.evaluate(() => window.UDAnalytics.setConsent(false));
      assert.equal(await page.evaluate(() => window.UDAnalytics.isGranted()), false);
      await page.getByRole('button', { name: /Topic Two/ }).click();
      await activateEpisode(page, 'ep_both');
      assert.equal((await gtag(page)).length, 1);
      assert.equal(await page.locator('.ud-topic-btn.active').count(), 0);
      assert.deepEqual(await opens(page), [['https://youtu.be/primaryWins', '_blank']]);
      const sent = JSON.stringify(await gtag(page));
      for (const forbidden of ['page_view', 'generate_lead', 'contact_form_submit', 'video_start', 'scroll']) {
        assert.equal(sent.includes(forbidden), false);
      }
    });
  });
});

async function withPage(options, fn) {
  if (typeof options === 'function') {
    fn = options;
    options = {};
  }
  const opts = { bridge: true, consent: true, throwing: false, ...options };
  const page = await browser.newPage({ viewport: { width: 1400, height: 1000 } });
  const gaHits = [];
  const errors = [];
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('request', (req) => {
    if (GA_HOST.test(req.url())) gaHits.push(req.url());
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    if (url === D3_URL) {
      return route.fulfill({ status: 200, contentType: 'text/javascript', body: d3Source });
    }
    if (url === DATA_URL) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(fixture)
      });
    }
    return route.abort();
  });
  await page.addInitScript(() => {
    window.__opens = [];
    window.__gtagEvents = [];
    window.__trackCalls = [];
    window.__anchorClicks = [];
    window.__pageErrors = [];
    window.open = (url, target) => {
      window.__opens.push([String(url), target]);
      return null;
    };
    window.gtag = function () {
      window.__gtagEvents.push(Array.from(arguments));
    };
    window.addEventListener('error', (event) => {
      window.__pageErrors.push(String(event.message || event.error));
    });
  });
  try {
    await page.goto(origin + '/tests/fixtures/mount.html', { waitUntil: 'domcontentloaded' });
    if (opts.throwing) {
      await page.evaluate(() => {
        window.UDAnalytics = {
          setConsent() {},
          isGranted() { return false; },
          track() { throw new Error('analytics failed'); }
        };
      });
    } else if (opts.bridge) {
      await page.addScriptTag({ url: origin + '/tests/fixtures/ud-analytics-bridge-v0.2.js' });
      await page.evaluate(() => {
        const original = window.UDAnalytics.track.bind(window.UDAnalytics);
        window.UDAnalytics.track = (name, data) => {
          const copy = {};
          if (data && typeof data === 'object') {
            for (const key of Object.keys(data)) copy[key] = data[key];
          }
          window.__trackCalls.push({ name, data: copy });
          return original(name, data);
        };
      });
      if (opts.consent) await page.evaluate(() => window.UDAnalytics.setConsent(true));
    }
    await page.addScriptTag({ url: origin + '/uprt-network-ud.js' });
    await page.evaluate(() => {
      document.addEventListener('click', (event) => {
        const raw = event.target;
        const el = raw && raw.nodeType === 1 ? raw : raw && raw.parentElement;
        const link = el && el.closest ? el.closest('a') : null;
        if (!link || link.target !== '_blank') return;
        event.preventDefault();
        window.__anchorClicks.push(link.getAttribute('href'));
      }, true);
    });
    await page.waitForFunction(() => {
      const loading = document.getElementById('ud-loading');
      return loading && getComputedStyle(loading).display === 'none'
        && document.querySelectorAll('#ud-graph g circle').length > 0;
    }, null, { timeout: 15000 });
    await fn({ page, gaHits, errors });
    assert.deepEqual(gaHits, []);
  } catch (err) {
    const state = await page.evaluate(() => ({
      calls: window.__trackCalls,
      gtag: window.__gtagEvents,
      opens: window.__opens,
      anchors: window.__anchorClicks
    })).catch(() => null);
    err.message += '\nstate ' + JSON.stringify(state);
    throw err;
  } finally {
    await page.close();
  }
}

async function calls(page) {
  return page.evaluate(() => window.__trackCalls);
}
async function gtag(page) {
  return page.evaluate(() => window.__gtagEvents);
}
async function opens(page) {
  return page.evaluate(() => window.__opens);
}
async function anchors(page) {
  return page.evaluate(() => window.__anchorClicks);
}
async function pageErrors(page) {
  return page.evaluate(() => window.__pageErrors);
}
async function resetLog(page) {
  await page.evaluate(() => {
    window.__trackCalls.length = 0;
    window.__gtagEvents.length = 0;
    window.__opens.length = 0;
    window.__anchorClicks.length = 0;
  });
}
async function styleCount(page) {
  return page.evaluate(() => (
    [...document.querySelectorAll('style')].filter((style) => style.textContent.includes('#ud-fullscreen-btn')).length
  ));
}
async function activateEpisode(page, id) {
  await readyNode(page, id);
  await page.evaluate((episodeId) => {
    let node = null;
    d3.selectAll('#ud-graph g').each(function (d) {
      if (d && d.data && d.data.id === episodeId) node = this;
    });
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }, id);
}
async function showTooltip(page, id) {
  await readyNode(page, id);
  await page.evaluate((episodeId) => {
    let node = null;
    d3.selectAll('#ud-graph g').each(function (d) {
      if (d && d.data && d.data.id === episodeId) node = this;
    });
    const rect = document.getElementById('ud-graph-wrap').getBoundingClientRect();
    node.dispatchEvent(new MouseEvent('mousemove', {
      bubbles: true,
      clientX: rect.left + 120,
      clientY: rect.top + 80,
      view: window
    }));
  }, id);
  await page.waitForFunction(() => {
    const tip = document.getElementById('ud-tooltip');
    return tip && tip.innerHTML.length > 0;
  });
}
async function clickTopicNode(page, label) {
  await page.waitForFunction((topic) => {
    let ok = false;
    d3.selectAll('#ud-graph g').each(function (d) {
      if (d && d.type === 'topic' && d.label === topic && Number.isFinite(d.x)) ok = true;
    });
    return ok;
  }, label);
  await page.evaluate((topic) => {
    let node = null;
    d3.selectAll('#ud-graph g').each(function (d) {
      if (d && d.type === 'topic' && d.label === topic) node = this;
    });
    node.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, view: window }));
  }, label);
}
async function readyNode(page, id) {
  await page.waitForFunction((episodeId) => {
    let ok = false;
    d3.selectAll('#ud-graph g').each(function (d) {
      if (d && d.data && d.data.id === episodeId && Number.isFinite(d.x) && Number.isFinite(d.y)) ok = true;
    });
    return ok;
  }, id);
}
async function visibleEpisode(page) {
  await page.waitForTimeout(200);
  return page.evaluate(() => {
    const groups = [...document.querySelectorAll('#ud-graph g')].filter((g) => (
      g.__data__ && g.__data__.type === 'episode' && g.__data__.data && g.__data__.data.url
    ));
    for (const group of groups) {
      const circle = group.querySelector('circle');
      const rect = circle.getBoundingClientRect();
      if (rect.width < 2 || rect.x < 0 || rect.y < 0) continue;
      const x = rect.x + rect.width / 2;
      const y = rect.y + rect.height / 2;
      const top = document.elementFromPoint(x, y);
      if (top === circle || (top && group.contains(top))) {
        return { x, y, id: group.__data__.data.id, url: group.__data__.data.url };
      }
    }
    return null;
  });
}
async function emptySvgPoint(page) {
  return page.evaluate(() => {
    const svg = document.querySelector('#ud-graph');
    const rect = svg.getBoundingClientRect();
    for (let y = rect.top + 8; y < rect.bottom - 8; y += 12) {
      for (let x = rect.left + 8; x < rect.right - 8; x += 12) {
        const el = document.elementFromPoint(x, y);
        if (el === svg) return { x, y };
      }
    }
    return null;
  });
}
