/* First-party analytics gate. Not a certified CMP. The v0.2 bridge is prepended to the hosted bundle. */
(function () {
  if (window.__udConsentBoot) return;
  window.__udConsentBoot = 1;

  var MEASUREMENT_ID = 'G-56LGZ7E9CD';
  var STORAGE_KEY = 'ud_consent_v1';
  var VERSION = 1;
  var MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
  var FUTURE_SKEW_MS = 24 * 60 * 60 * 1000;
  var cfg = window.UDConsentConfig || {};
  var choice = 'unknown';
  var googleStarted = false;

  function safeHref(value) {
    if (typeof value !== 'string') return '';
    var href = value.trim();
    if (!href || /[\s<>]/.test(href)) return '';
    if (href.charAt(0) === '/' && href.charAt(1) !== '/') return href;
    if (/^https:\/\//i.test(href)) return href;
    return '';
  }

  var privacyHref = safeHref(cfg.privacyHref);
  var termsHref = safeHref(cfg.termsHref);

  function readStore() {
    var raw;
    try {
      raw = localStorage.getItem(STORAGE_KEY);
    } catch (err) {
      return { state: 'unknown', error: true };
    }
    if (!raw) return { state: 'unknown' };
    try {
      var data = JSON.parse(raw);
      var now = Date.now();
      var keys = data && typeof data === 'object' ? Object.keys(data).sort().join(',') : '';
      var valid = keys === 'a,t,v' && data.v === VERSION && (data.a === 0 || data.a === 1) &&
        typeof data.t === 'number' && isFinite(data.t) && data.t <= now + FUTURE_SKEW_MS;
      if (!valid) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (ignore) {}
        return { state: 'unknown', corrupt: true };
      }
      if (now - data.t > MAX_AGE_MS) {
        try { localStorage.removeItem(STORAGE_KEY); } catch (ignore2) {}
        return { state: 'unknown', expired: true };
      }
      return { state: data.a === 1 ? 'accepted' : 'rejected' };
    } catch (err2) {
      try { localStorage.removeItem(STORAGE_KEY); } catch (ignore3) {}
      return { state: 'unknown', corrupt: true };
    }
  }

  function writeStore(accepted) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        v: VERSION,
        a: accepted ? 1 : 0,
        t: Date.now()
      }));
      var saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return !!(saved && saved.v === VERSION && saved.a === (accepted ? 1 : 0));
    } catch (err) {
      return false;
    }
  }

  function silence() {
    if (window.UDAnalytics && typeof window.UDAnalytics.setConsent === 'function') {
      window.UDAnalytics.setConsent(false);
    }
  }

  function loadGoogle() {
    if (googleStarted || window['ga-disable-' + MEASUREMENT_ID]) return false;
    googleStarted = true;
    window.dataLayer = window.dataLayer || [];
    if (typeof window.gtag !== 'function') {
      window.gtag = function () { window.dataLayer.push(arguments); };
    }
    window.gtag('js', new Date());
    window.gtag('config', MEASUREMENT_ID);
    if (!document.querySelector('script[data-ud-gtag="1"]')) {
      var script = document.createElement('script');
      script.async = true;
      script.src = 'https://www.googletagmanager.com/gtag/js?id=' + MEASUREMENT_ID;
      script.setAttribute('data-ud-gtag', '1');
      document.head.appendChild(script);
    }
    if (window.UDAnalytics && typeof window.UDAnalytics.setConsent === 'function') {
      window.UDAnalytics.setConsent(true);
    }
    return true;
  }

  function cookieNames() {
    var names = [];
    var raw = '';
    try { raw = document.cookie || ''; } catch (err) { return names; }
    raw.split(';').forEach(function (part) {
      var name = part.split('=')[0].replace(/^\s+/, '');
      if (name === '_ga' || name === '_gid' || name === '_gat' || name.indexOf('_ga_') === 0 || name.indexOf('_gat_') === 0) {
        names.push(name);
      }
    });
    return names;
  }

  function deleteOwnedAnalyticsCookies() {
    var host = location.hostname || '';
    var domains = [''];
    if (host) domains.push(host);
    var bits = host.split('.');
    if (bits.length >= 2 && bits[bits.length - 1] !== 'localhost') {
      domains.push('.' + bits.slice(-2).join('.'));
    }
    cookieNames().forEach(function (name) {
      domains.forEach(function (domain) {
        var base = name + '=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
        document.cookie = domain ? base + '; domain=' + domain : base;
      });
    });
  }

  function ensureStyle() {
    if (document.getElementById('ud-consent-style')) return;
    var style = document.createElement('style');
    style.id = 'ud-consent-style';
    style.textContent = [
      '#ud-consent, #ud-consent-settings { box-sizing: border-box; font-family: Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; }',
      '#ud-consent { position: fixed; left: 0; right: 0; bottom: 0; z-index: 100000; color: #F2F7FD; background: #010E1E; border-top: 2px solid #F2F7FD; box-shadow: 0 -8px 24px rgba(1, 6, 15, 0.35); }',
      '#ud-consent[hidden], #ud-consent-settings[hidden] { display: none !important; }',
      '#ud-consent-panel { max-width: 880px; margin: 0 auto; padding: 16px 20px 20px; }',
      '#ud-consent h2 { margin: 0 0 8px; font-size: 18px; line-height: 1.3; color: #F2F7FD; }',
      '#ud-consent p { margin: 0 0 10px; font-size: 15px; line-height: 1.45; color: #F2F7FD; }',
      '#ud-consent a { color: #F2F7FD; }',
      '#ud-consent-actions { display: flex; gap: 12px; margin-top: 4px; }',
      '#ud-consent-actions button, #ud-consent-settings { min-height: 44px; padding: 12px 16px; font: 600 16px/1.2 Poppins, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #F2F7FD; background: transparent; border: 2px solid #F2F7FD; border-radius: 6px; cursor: pointer; }',
      '#ud-consent-actions button { flex: 1 1 0; }',
      '#ud-consent-settings { position: fixed; left: 12px; bottom: 12px; z-index: 100000; color: #010E1E; background: #F2F7FD; }',
      '#ud-consent button:focus-visible, #ud-consent a:focus-visible, #ud-consent-settings:focus-visible { outline: 3px solid #A8E0FF; outline-offset: 3px; }',
      '@media (max-width: 640px) {',
      '  #ud-consent { max-height: 70vh; overflow: auto; }',
      '  #ud-consent-panel { padding: 14px 14px 16px; }',
      '  #ud-consent-actions { flex-direction: column; }',
      '  #ud-consent-settings { left: 8px; right: 8px; bottom: 8px; width: auto; }',
      '}',
      '@media (prefers-reduced-motion: reduce) { #ud-consent, #ud-consent-settings { transition: none; } }'
    ].join('\n');
    document.head.appendChild(style);
  }

  var root, panel, copy, links, status, actions, settingsBtn, lastFocus = null;

  function setHidden(node, hidden) {
    if (hidden) node.setAttribute('hidden', '');
    else node.removeAttribute('hidden');
  }

  function showError(message) {
    status.textContent = message;
  }

  function focusables() {
    return panel.querySelectorAll('button, a[href]');
  }

  function onKeydown(event) {
    if (root.hasAttribute('hidden')) return;
    if (!panel.classList.contains('is-dialog')) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closeSettings();
      return;
    }
    if (event.key !== 'Tab') return;
    var items = focusables();
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function button(label) {
    var node = document.createElement('button');
    node.type = 'button';
    node.textContent = label;
    return node;
  }

  function renderActions(mode) {
    actions.textContent = '';
    if (mode === 'ask') {
      var reject = button('Reject analytics');
      var accept = button('Accept analytics');
      reject.addEventListener('click', onReject);
      accept.addEventListener('click', onAccept);
      actions.appendChild(reject);
      actions.appendChild(accept);
      return reject;
    }
    if (mode === 'accepted') {
      var off = button('Turn analytics off');
      var closeOn = button('Close');
      off.addEventListener('click', onWithdraw);
      closeOn.addEventListener('click', closeSettings);
      actions.appendChild(off);
      actions.appendChild(closeOn);
      return off;
    }
    var on = button('Turn analytics on');
    var keep = button('Keep analytics off');
    on.addEventListener('click', onAccept);
    keep.addEventListener('click', closeSettings);
    actions.appendChild(on);
    actions.appendChild(keep);
    return on;
  }

  function fillLinks() {
    links.textContent = '';
    if (!privacyHref && !termsHref) return;
    function add(href, label) {
      if (!href) return;
      if (links.childNodes.length) links.appendChild(document.createTextNode(' '));
      var anchor = document.createElement('a');
      anchor.href = href;
      anchor.textContent = label;
      links.appendChild(anchor);
    }
    add(privacyHref, 'Privacy');
    add(termsHref, 'Terms');
  }

  function openPanel(mode, dialog) {
    ensureStyle();
    copy.textContent = mode === 'ask'
      ? 'Analytics is off until you choose. Accepting loads Google Analytics for this browser. Rejecting keeps it off. The rest of the site stays available either way. Saving this choice is not a legal certification.'
      : (mode === 'accepted'
        ? 'Analytics is on in this browser. Turning it off stops new Google Analytics use and reloads the page. Data already sent cannot be recalled. This page deletes only readable first-party cookies named _ga, _gid, _gat, and _ga_ or _gat_ followed by a suffix. It cannot delete HttpOnly cookies or cookies on Google’s sites.'
        : 'Analytics is off in this browser. Turning it on loads Google Analytics. Keeping it off leaves the site usable without that tag.');
    fillLinks();
    status.textContent = '';
    var first = renderActions(mode);
    setHidden(root, false);
    setHidden(settingsBtn, true);
    if (dialog) {
      panel.classList.add('is-dialog');
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      first.focus();
    } else {
      panel.classList.remove('is-dialog');
      panel.setAttribute('role', 'region');
      panel.removeAttribute('aria-modal');
    }
  }

  function showSettled() {
    setHidden(root, true);
    setHidden(settingsBtn, false);
    panel.classList.remove('is-dialog');
    panel.setAttribute('role', 'region');
    panel.removeAttribute('aria-modal');
  }

  function closeSettings() {
    showSettled();
    if (settingsBtn) settingsBtn.focus();
  }

  function onAccept() {
    if (!writeStore(true)) {
      silence();
      showError('This browser did not save the choice. Analytics stays off.');
      return;
    }
    choice = 'accepted';
    var started = loadGoogle();
    if (!started) {
      showError('Analytics stayed off because this page already blocked the Google tag.');
      showSettled();
      return;
    }
    showSettled();
  }

  function onReject() {
    silence();
    if (!writeStore(false)) {
      showError('This browser did not save the choice. Analytics stays off and the question will return on the next page.');
      return;
    }
    choice = 'rejected';
    showSettled();
  }

  function onWithdraw() {
    silence();
    window['ga-disable-' + MEASUREMENT_ID] = true;
    deleteOwnedAnalyticsCookies();
    if (!writeStore(false)) {
      showError('The withdrawal was not saved. Analytics is disabled for this view only. The page was not reloaded, because a stored acceptance would load Google Analytics again.');
      return;
    }
    choice = 'rejected';
    location.reload();
  }

  function openSettings() {
    if (!panel) return;
    lastFocus = document.activeElement;
    openPanel(choice === 'accepted' ? 'accepted' : 'rejected', true);
  }

  function mount(initial) {
    if (!document.body) {
      document.addEventListener('DOMContentLoaded', function () { mount(initial); });
      return;
    }
    if (document.getElementById('ud-consent')) return;
    ensureStyle();
    choice = initial;
    root = document.createElement('div');
    root.id = 'ud-consent';
    panel = document.createElement('div');
    panel.id = 'ud-consent-panel';
    panel.setAttribute('role', 'region');
    panel.setAttribute('aria-labelledby', 'ud-consent-title');
    var title = document.createElement('h2');
    title.id = 'ud-consent-title';
    title.textContent = 'Analytics choice';
    copy = document.createElement('p');
    links = document.createElement('p');
    status = document.createElement('p');
    status.setAttribute('role', 'status');
    actions = document.createElement('div');
    actions.id = 'ud-consent-actions';
    panel.appendChild(title);
    panel.appendChild(copy);
    panel.appendChild(links);
    panel.appendChild(status);
    panel.appendChild(actions);
    root.appendChild(panel);
    settingsBtn = button('Analytics choices');
    settingsBtn.id = 'ud-consent-settings';
    settingsBtn.addEventListener('click', openSettings);
    document.body.appendChild(root);
    document.body.appendChild(settingsBtn);
    document.addEventListener('keydown', onKeydown);
    if (initial === 'unknown') openPanel('ask', false);
    else showSettled();
  }

  window.UDConsent = {
    open: openSettings,
    getChoice: function () { return choice; },
    storageKey: STORAGE_KEY
  };

  var record = readStore();
  if (record.state === 'accepted') {
    choice = 'accepted';
    loadGoogle();
  } else {
    choice = record.state === 'rejected' ? 'rejected' : 'unknown';
    silence();
  }
  mount(choice);
})();
