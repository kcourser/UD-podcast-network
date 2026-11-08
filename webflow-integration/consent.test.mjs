/**
 * First-party consent tests. Google hosts are intercepted.
 * No analytics hit, form submission, or Webflow write is performed.
 */
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { describe, test, before, after } from 'node:test';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const integration = path.join(root, 'webflow-integration');
const D3_URL = 'https://cdnjs.cloudflare.com/ajax/libs/d3/7.8.5/d3.min.js';
const DATA_URL = 'https://raw.githubusercontent.com/kcourser/UD-podcast-network/main/episodes.json';
const GA_HOST = /google-analytics\.com|googletagmanager\.com|doubleclick\.net|googleadservices\.com|google\.com\/ccm/i;
const DAY = 24 * 60 * 60 * 1000;

let server;
let origin;
let browser;
let d3Source = '';

const graphFixture = {
  meta: {
    topic_colors: { 'Topic One': '#0ea5e9' },
    show_colors: { 'Alpha Show': '#1A4AF0' }
  },
  episodes: [
    {
      id: 'ep_yt', show: 'Alpha Show', name: 'Video Guest', role: 'Host', date: '2025-03-01',
      url: 'https://youtu.be/exampleVideo', spotify_url: '', topics: ['Topic One'], timestamps: {}
    },
    {
      id: 'ep_none', show: 'Alpha Show', name: 'Silent Guest', role: 'Host', date: '2025-04-01',
      url: '', spotify_url: '', topics: ['Topic One'], timestamps: {}
    }
  ]
};

function startServer() {
  const serverRoot = root.endsWith(path.sep) ? root : root + path.sep;
  return new Promise((resolve) => {
    const instance = http.createServer((req, res) => {
      const url = new URL(req.url, 'http://127.0.0.1');
      const file = path.normalize(path.join(root, decodeURIComponent(url.pathname)));
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
        const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json' };
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

test('bundle, bridge, and head preview stay within the install contract', () => {
  const bridge = fs.readFileSync(path.join(root, 'tests/fixtures/ud-analytics-bridge-v0.2.js'));
  const bundle = fs.readFileSync(path.join(integration, 'ud-consent.js'));
  const runtime = fs.readFileSync(path.join(integration, 'ud-consent-runtime.js'));
  const counts = JSON.parse(fs.readFileSync(path.join(integration, 'preview/counts.json'), 'utf8'));
  const ga = fs.readFileSync(path.join(integration, 'baseline/ga-block.html'));
  const head = fs.readFileSync(path.join(integration, 'baseline/site-head.html'));
  const footer = fs.readFileSync(path.join(integration, 'baseline/site-footer.html'));
  const hosted = fs.readFileSync(path.join(integration, 'preview/site-head.html'));
  const inline = fs.readFileSync(path.join(integration, 'preview/site-head.inline.html'));
  const replacement = fs.readFileSync(path.join(integration, 'preview/head-replacement.html'), 'utf8');
  const previewFooter = fs.readFileSync(path.join(integration, 'preview/site-footer.html'));

  assert.equal(bundle.subarray(0, bridge.length).equals(bridge), true);
  assert.equal(runtime.includes('</script>'), false);
  assert.equal(head.subarray(head.length - ga.length).equals(ga), true);
  assert.equal(head.indexOf(ga.toString('utf8')), head.lastIndexOf(ga.toString('utf8')));
  assert.equal(hosted.includes('font-smoothing'), true);
  assert.equal(hosted.includes('async src="https://www.googletagmanager.com/gtag/js'), false);
  assert.equal(hosted.includes('@COMMIT_SHA/'), true);
  assert.equal(hosted.includes('@main/'), false);
  assert.match(hosted.toString('utf8'), /integrity="sha384-[A-Za-z0-9+/=]+"/);
  assert.equal(inline.includes('async src="https://www.googletagmanager.com/gtag/js'), false);
  assert.equal(inline.includes(bridge.toString('utf8')), true);
  assert.equal(previewFooter.equals(footer), true);
  assert.equal(counts.bundle > 2000, true);
  assert.equal(counts.registerInlineMax, 2000);
  assert.equal(counts.gaBlock, ga.length);
  assert.equal(counts.integrity, 'sha384-' + crypto.createHash('sha384').update(bundle).digest('base64'));
  assert.equal(replacement.includes('googletagmanager.com/gtag/js'), false);
  assert.equal(fs.readFileSync(path.join(integration, 'ud-consent-runtime.js'), 'utf8').includes("gtag('event', 'page_view'"), false);
});

describe('first-party consent in Chrome', { concurrency: false }, () => {
  before(async () => {
    d3Source = await fetch(D3_URL).then((res) => {
      if (!res.ok) throw new Error('d3 download failed');
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

  test('no Google request before a choice, after reject, or on reload', async () => {
    const ctx = await openConsent();
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      await ctx.page.waitForTimeout(400);
      assert.deepEqual(ctx.hits, []);
      assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), false);
      assert.equal(await ctx.page.evaluate(() => typeof window.gtag), 'undefined');
      await ctx.page.locator('#necessary').click();
      assert.equal(await ctx.page.evaluate(() => location.hash), '#contact');
      await ctx.page.keyboard.press('Escape');
      assert.equal(await ctx.page.locator('#ud-consent[hidden]').count(), 0);
      assert.equal(await stored(ctx.page), null);

      const buttons = await buttonMetrics(ctx.page);
      assert.equal(buttons.length, 2);
      assert.equal(buttons[0].text, 'Reject analytics');
      assert.equal(buttons[1].text, 'Accept analytics');
      assert.equal(buttons[0].w, buttons[1].w);
      assert.equal(buttons[0].h, buttons[1].h);
      assert.equal(buttons[0].bg, buttons[1].bg);
      assert.equal(buttons[0].color, buttons[1].color);
      assert.equal(buttons[0].fw, buttons[1].fw);
      assert.equal(await ctx.page.locator('#ud-consent a').count(), 0);

      await ctx.page.screenshot({ path: '/opt/cursor/artifacts/consent-desktop-banner.png' });
      await ctx.page.locator('#ud-consent button', { hasText: 'Reject analytics' }).focus();
      await ctx.page.keyboard.press('Enter');
      assert.equal((await stored(ctx.page)).a, 0);
      assert.deepEqual(ctx.hits, []);
      assert.equal(await ctx.page.locator('#ud-consent-settings').isVisible(), true);

      await ctx.page.reload({ waitUntil: 'domcontentloaded' });
      await ctx.page.waitForSelector('#ud-consent-settings');
      await ctx.page.waitForTimeout(300);
      assert.deepEqual(ctx.hits, []);
      assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), false);
    } finally {
      await ctx.page.close();
    }
  });

  test('mobile layout keeps both choices and reopens settings', async () => {
    const ctx = await openConsent({ viewport: { width: 390, height: 844 } });
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      const buttons = await buttonMetrics(ctx.page);
      assert.equal(buttons[0].w, buttons[1].w);
      assert.ok(buttons[0].h >= 44);
      await ctx.page.screenshot({ path: '/opt/cursor/artifacts/consent-mobile-banner.png' });
      await ctx.page.getByRole('button', { name: 'Reject analytics' }).click();
      await ctx.page.getByRole('button', { name: 'Analytics choices' }).click();
      await ctx.page.waitForSelector('#ud-consent[role="region"], #ud-consent-panel[role="dialog"]');
      const dialogButtons = await buttonMetrics(ctx.page);
      assert.equal(dialogButtons.map((b) => b.text).join('|'), 'Turn analytics on|Keep analytics off');
      assert.equal(dialogButtons[0].w, dialogButtons[1].w);
      await ctx.page.screenshot({ path: '/opt/cursor/artifacts/consent-mobile-settings.png' });
      await ctx.page.keyboard.press('Escape');
      assert.equal(await ctx.page.locator('#ud-consent[hidden]').count(), 1);
      assert.equal(await ctx.page.evaluate(() => document.activeElement.id), 'ud-consent-settings');
      assert.deepEqual(ctx.hits, []);
    } finally {
      await ctx.page.close();
    }
  });

  test('accept loads one tag and config, persists, and does not replay a denied call', async () => {
    const ctx = await openConsent();
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      await ctx.page.evaluate(() => {
        window.__tracks = [];
        const original = window.UDAnalytics.track.bind(window.UDAnalytics);
        window.UDAnalytics.track = (name, data) => {
          window.__tracks.push({ name, data });
          return original(name, data);
        };
        window.UDAnalytics.track('podcast_graph_filter', { filter_type: 'topic', action: 'select' });
      });
      await ctx.page.getByRole('button', { name: 'Accept analytics' }).click();
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      const layer = await dataLayer(ctx.page);
      assert.deepEqual(layer.map((entry) => entry[0]), ['js', 'config']);
      assert.equal(layer[1][1], 'G-56LGZ7E9CD');
      assert.equal(layer.some((entry) => entry[0] === 'event'), false);
      assert.deepEqual(ctx.hits, ['https://www.googletagmanager.com/gtag/js?id=G-56LGZ7E9CD']);
      assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), true);
      assert.equal((await stored(ctx.page)).a, 1);

      await ctx.page.evaluate(() => {
        window.UDAnalytics.track('podcast_graph_filter', { filter_type: 'topic', action: 'deselect' });
      });
      const after = await dataLayer(ctx.page);
      const events = after.filter((entry) => entry[0] === 'event');
      assert.equal(events.length, 1);
      assert.equal(events[0][1], 'podcast_graph_filter');
      assert.equal(events[0][2].action, 'deselect');
      assert.equal(events[0][2].send_to, 'G-56LGZ7E9CD');
      assert.equal(after.filter((entry) => entry[0] === 'config').length, 1);

      await ctx.page.reload({ waitUntil: 'domcontentloaded' });
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      assert.equal(ctx.hits.length, 2);
      assert.equal(ctx.hits.every((url) => url.endsWith('/gtag/js?id=G-56LGZ7E9CD')), true);
      const reloaded = await dataLayer(ctx.page);
      assert.equal(reloaded.filter((entry) => entry[0] === 'config').length, 1);
      assert.equal(reloaded.some((entry) => entry[1] === 'podcast_graph_filter'), false);
    } finally {
      await ctx.page.close();
    }
  });

  test('withdrawal deletes readable analytics cookies and does not load the tag again', async () => {
    const ctx = await openConsent();
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      await ctx.page.evaluate(() => { document.cookie = 'ud_keep=1; path=/'; });
      await ctx.page.getByRole('button', { name: 'Accept analytics' }).click();
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      assert.match(await ctx.page.evaluate(() => document.cookie), /_ga=/);
      await ctx.page.getByRole('button', { name: 'Analytics choices' }).click();
      await ctx.page.screenshot({ path: '/opt/cursor/artifacts/consent-desktop-settings.png' });
      await Promise.all([
        ctx.page.waitForNavigation({ waitUntil: 'domcontentloaded' }),
        ctx.page.getByRole('button', { name: 'Turn analytics off' }).click()
      ]);
      await ctx.page.waitForSelector('#ud-consent-settings');
      await ctx.page.waitForTimeout(300);
      assert.equal(ctx.hits.length, 1);
      const jar = await ctx.page.evaluate(() => document.cookie);
      assert.equal(jar.includes('_ga'), false);
      assert.match(jar, /ud_keep=1/);
      assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), false);
      assert.equal((await stored(ctx.page)).a, 0);
      assert.equal(await ctx.page.evaluate(() => window['ga-disable-G-56LGZ7E9CD']), undefined);
    } finally {
      await ctx.page.close();
    }
  });

  test('corrupt, expired, future, and unreadable preferences fail closed', async () => {
    for (const seed of [
      '{',
      JSON.stringify({ v: 9, a: 1, t: Date.now() }),
      JSON.stringify({ v: 1, a: 1, t: Date.now() - 181 * DAY }),
      JSON.stringify({ v: 1, a: 1, t: Date.now() + 3 * DAY }),
      JSON.stringify({ v: 1, a: 1, t: Date.now(), email: 'person@example.com' })
    ]) {
      const ctx = await openConsent({ storageSeed: seed });
      try {
        await ctx.page.waitForSelector('#ud-consent button');
        await ctx.page.waitForTimeout(200);
        assert.deepEqual(ctx.hits, [], seed);
        assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), false);
        if (seed.includes('person@example.com')) {
          const raw = await ctx.page.evaluate(() => {
            try { return localStorage.getItem('ud_consent_v1'); }
            catch (err) { return ''; }
          });
          assert.equal(String(raw || '').includes('person@example.com'), false);
        }
      } finally {
        await ctx.page.close();
      }
    }

    const blocked = await openConsent({ storageThrows: true });
    try {
      await blocked.page.waitForSelector('#ud-consent button');
      await blocked.page.getByRole('button', { name: 'Accept analytics' }).click();
      await blocked.page.waitForTimeout(300);
      assert.deepEqual(blocked.hits, []);
      assert.match(await blocked.page.locator('#ud-consent [role="status"]').innerText(), /did not save/);
      assert.equal(await blocked.page.evaluate(() => window.UDAnalytics.isGranted()), false);
    } finally {
      await blocked.page.close();
    }
  });

  test('a second script tag does not add another banner or tag', async () => {
    const ctx = await openConsent();
    try {
      await ctx.page.waitForSelector('#ud-consent');
      await ctx.page.addScriptTag({ url: origin + '/webflow-integration/ud-consent.js?again=1' });
      await ctx.page.waitForTimeout(200);
      assert.equal(await ctx.page.locator('#ud-consent').count(), 1);
      assert.equal(await ctx.page.locator('#ud-consent-settings').count(), 1);
      await ctx.page.getByRole('button', { name: 'Accept analytics' }).click();
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      assert.equal(ctx.hits.length, 1);
      assert.equal((await dataLayer(ctx.page)).filter((entry) => entry[0] === 'config').length, 1);
    } finally {
      await ctx.page.close();
    }
  });

  test('configured policy links are limited to paths and https', async () => {
    const ctx = await openConsent({
      config: { privacyHref: '/privacy', termsHref: 'javascript:alert(1)' }
    });
    try {
      await ctx.page.waitForSelector('#ud-consent');
      const hrefs = await ctx.page.locator('#ud-consent a').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
      assert.deepEqual(hrefs, ['/privacy']);
    } finally {
      await ctx.page.close();
    }
  });

  test('a withdrawal that cannot be saved does not reload the accepted tag', async () => {
    const ctx = await openConsent();
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      await ctx.page.getByRole('button', { name: 'Accept analytics' }).click();
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      await ctx.page.evaluate(() => {
        localStorage.setItem = () => { throw new Error('full'); };
      });
      await ctx.page.getByRole('button', { name: 'Analytics choices' }).click();
      await ctx.page.getByRole('button', { name: 'Turn analytics off' }).click();
      await ctx.page.waitForTimeout(200);
      assert.match(await ctx.page.locator('#ud-consent [role="status"]').innerText(), /not reloaded/);
      assert.equal(await ctx.page.evaluate(() => window.UDAnalytics.isGranted()), false);
      assert.equal(await ctx.page.evaluate(() => window['ga-disable-G-56LGZ7E9CD']), true);
      assert.equal((await stored(ctx.page)).a, 1);
      assert.equal(ctx.hits.length, 1);
    } finally {
      await ctx.page.close();
    }
  });

  test('graph events stay gated and are not replayed', async () => {
    const ctx = await openConsent({ graph: true, viewport: { width: 1400, height: 1200 } });
    try {
      await ctx.page.waitForSelector('#ud-consent button');
      await ctx.page.waitForFunction(() => document.querySelectorAll('#ud-graph .ud-topic-btn, #ud-topic-list .ud-topic-btn').length > 0);
      await ctx.page.evaluate(() => {
        window.__tracks = [];
        const original = window.UDAnalytics.track.bind(window.UDAnalytics);
        window.UDAnalytics.track = (name, data) => {
          window.__tracks.push(JSON.parse(JSON.stringify({ name, data })));
          return original(name, data);
        };
      });
      await ctx.page.getByRole('button', { name: /Topic One/ }).click();
      await ctx.page.waitForTimeout(200);
      assert.equal(await ctx.page.evaluate(() => window.__tracks.length), 1);
      assert.equal(await ctx.page.evaluate(() => window.dataLayer), undefined);
      assert.deepEqual(ctx.hits, []);
      assert.equal(await ctx.page.locator('.ud-topic-btn.active').count(), 1);

      await ctx.page.getByRole('button', { name: 'Accept analytics' }).click();
      await ctx.page.waitForFunction(() => window.__gtagLoaded === 1);
      assert.equal((await dataLayer(ctx.page)).some((entry) => entry[1] === 'podcast_graph_filter'), false);

      await ctx.page.getByRole('button', { name: /Topic One/ }).click();
      const events = (await dataLayer(ctx.page)).filter((entry) => entry[0] === 'event');
      assert.equal(events.length, 1);
      assert.equal(events[0][2].action, 'deselect');
      assert.equal(events[0][2].filter_type, 'topic');
      assert.equal(ctx.hits.length, 1);
    } finally {
      await ctx.page.close();
    }
  });
});

async function openConsent(options = {}) {
  const page = await browser.newPage({ viewport: options.viewport || { width: 1280, height: 800 } });
  const hits = [];
  page.on('pageerror', (err) => hits.push('pageerror:' + err.message));
  page.on('request', (req) => {
    if (GA_HOST.test(req.url())) hits.push(req.url());
  });
  await page.route('**/*', async (route) => {
    const url = route.request().url();
    if (url.startsWith(origin)) return route.continue();
    if (url === D3_URL) return route.fulfill({ status: 200, contentType: 'text/javascript', body: d3Source });
    if (url === DATA_URL) {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(graphFixture) });
    }
    if (url.startsWith('https://www.googletagmanager.com/gtag/js')) {
      return route.fulfill({
        status: 200,
        contentType: 'text/javascript',
        body: 'window.__gtagLoaded=(window.__gtagLoaded||0)+1;document.cookie="_ga=GA1.2.1.1; path=/";document.cookie="_ga_56LGZ7E9CD=1; path=/";'
      });
    }
    if (GA_HOST.test(url)) return route.abort();
    return route.abort();
  });
  await page.addInitScript((opts) => {
    if (opts.storageThrows) {
      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() { throw new Error('storage blocked'); }
      });
    } else if (opts.storageSeed) {
      localStorage.setItem('ud_consent_v1', opts.storageSeed);
    }
    if (opts.config) window.UDConsentConfig = opts.config;
  }, {
    storageThrows: !!options.storageThrows,
    storageSeed: options.storageSeed || '',
    config: options.config || null
  });
  await page.goto(origin + '/webflow-integration/fixtures/page.html', { waitUntil: 'domcontentloaded' });
  if (options.graph) {
    await page.evaluate(() => {
      const mount = document.createElement('div');
      mount.id = 'uprt-network-mount';
      document.body.appendChild(mount);
    });
    await page.addScriptTag({ url: origin + '/uprt-network-ud.js' });
  }
  return { page, hits };
}

async function stored(page) {
  return page.evaluate(() => {
    try { return JSON.parse(localStorage.getItem('ud_consent_v1') || 'null'); }
    catch (err) { return { error: true }; }
  });
}

async function dataLayer(page) {
  return page.evaluate(() => (window.dataLayer || []).map((item) => Array.from(item).map((value) => (
    value instanceof Date ? 'Date' : value
  ))));
}

async function buttonMetrics(page) {
  return page.locator('#ud-consent-actions button').evaluateAll((nodes) => nodes.map((node) => {
    const style = getComputedStyle(node);
    const rect = node.getBoundingClientRect();
    return {
      text: node.textContent,
      w: Math.round(rect.width),
      h: Math.round(rect.height),
      bg: style.backgroundColor,
      color: style.color,
      fw: style.fontWeight
    };
  }));
}
