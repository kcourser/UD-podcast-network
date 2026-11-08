# First-party analytics consent — acceptance contract

Status: implementation contract for review. Not installed, not published, and not a legal opinion.

Checked against live site `6a0787a8f156f041ca46a155` on 2026-11-08. Registered Webflow scripts: none. Applied-scripts endpoint: 404, custom code block not found. The loader lives in site freeform head. `/`, `/media`, and `/contact` each contain that loader once. `/privacy`, `/terms`, `/privacy-policy`, and `/terms-of-service` return 404 and still receive the same site head, so the loader is site-wide.

## Decision

Use a direct first-party opt-in. A paid consent-management platform is not required for this implementation. This is not a GDPR certification and not a Google-certified CMP.

## Behavior

1. Global opt-in. Analytics stays off until this browser stores an affirmative analytics acceptance.
2. Before that acceptance, the page makes no request to Google Analytics or the Google tag host. The tag is not loaded in a denied or cookieless mode.
3. Necessary page use stays available before a choice, after reject, and while the notice is open. The notice does not lock scrolling or trap keyboard focus.
4. Accept and reject are equal: same control type, size, weight, and contrast. Neither choice is preselected. Closing or Escape is not a choice.
5. The preference is `localStorage` key `ud_consent_v1`. The value is only `{v, a, t}`: version `1`, analytics `1` or `0`, and the time of the choice. No name, email, page content, or identifier.
6. Implementation default lifetime is 180 days from `t`. A corrupt value, a wrong version, a storage exception, a timestamp more than one day in the future, or an expired record is treated as no choice. Analytics stays off and the notice is shown again.
7. A saved acceptance loads `https://www.googletagmanager.com/gtag/js?id=G-56LGZ7E9CD` once and calls `gtag('js', …)` and `gtag('config', 'G-56LGZ7E9CD')` once. It does not send a manual `page_view`.
8. The v0.2 `UDAnalytics` bridge is included unchanged. `setConsent(true)` happens only after `gtag` exists for a saved or new acceptance. Denied or pre-consent `track` calls are not stored and are not replayed after accept.
9. Withdrawal sets the bridge to denied immediately, sets `window['ga-disable-G-56LGZ7E9CD']`, deletes readable first-party cookies named `_ga`, `_gid`, `_gat`, `_ga_*`, and `_gat_*`, saves the rejection, and reloads. The reload is what keeps the tag from loading again.
10. If the withdrawal cannot be saved, the page does not reload. A reload would read the old acceptance and load Google again. Analytics is disabled for that view only, and the notice says so.
11. Analytics choices can be reopened from an “Analytics choices” button on later views, by keyboard, including after navigation within the site. The same script is what would run from the shared site head.
12. Privacy and terms hrefs come from `window.UDConsentConfig`. Empty, non-path, and non-`https` values are omitted. Defaults are empty because the checked paths 404. The notice must not say those pages are published.

## Purposes

Only two purposes are evidenced:

- Necessary operation of the site, including storing this consent record.
- Analytics, and only after accept, through the existing measurement ID `G-56LGZ7E9CD`.

No advertising, remarketing, or sale purpose is added. The Google Analytics property itself was not opened, so this contract does not claim that Google signals, ads personalization, or enhanced measurement are off inside that property.

## Install boundary

Replace only the ungated GA4 block at the end of the site freeform head. Keep every style block above it. Do not add a second gtag snippet. Do not change the site footer in this patch. The footer still has the modal script and the older contact `gtag` calls; those calls no-op while `gtag` is absent. The separate lead/modal draft remains the owner of that footer block.

`register_inline_script` allows 2000 characters and no script tags. The consent runtime is larger than that on purpose. Do not split it into registered pieces to get under the cap. Freeform head can hold a small script tag that points at one immutable commit of `webflow-integration/ud-consent.js`, or the same file inlined in place of the GA4 block if the resulting head fits the site custom-code limit. Neither option is applied here.

## Graph

Graph code keeps calling optional `UDAnalytics.track`. This consent file is what gates those calls. Event names and parameters stay the graph contract. This work does not redesign the graph.

## Unresolved (TBD)

- Attorney review of the notice copy and whether 180 days is the right lifetime.
- Approved public paths for privacy and terms. The paths checked on 2026-11-08 404.
- Numeric GA4 property, stream, retention, Google signals, ads settings, enhanced measurement, and key events.
- Whether withdrawal should also cover a parent domain beyond the host that set `_ga`. Deletion here is best-effort for cookies this page can read.
- Language, regional banners, and age gating. Not evidenced on the site.
- The separate footer lead adapter: success-only `generate_lead`, no `contact_form_submit`, still not installed.
