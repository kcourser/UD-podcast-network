# Webflow consent install preview

Not installed. Not a change to the podcast graph runtime.

The live site freeform head ends with a 298-character ungated loader for `G-56LGZ7E9CD`. Registered scripts: none. `register_inline_script` allows 2000 characters and no `<script>` tags. The consent bundle is 14781 characters, so it must not be registered, and it must not be split into registered pieces.

## Counts

| Piece | Characters |
|---|---:|
| Current GA4 block | 298 |
| Current site head, including CSS | 4483 |
| Current site footer | 3158 |
| v0.2 bridge inside the bundle | 1065 |
| Hosted `ud-consent.js` | 14774 |
| Head if that file is referenced, CSS preserved | 4859 |
| Head if that file is pasted inline | 18979 |
| Head replacement snippet alone | 674 |

The inline head is past 10000 characters. Do not paste it into freeform on the assumption it will fit. The head that stays near the current size is the 4859-character preview: same CSS, GA4 block replaced by `preview/head-replacement.html`.

`preview/site-footer.html` is byte-for-byte the current footer. This patch does not edit it.

## Baseline that must still match before anyone applies this

Re-read site freeform head and footer. Abort if the head does not end with `baseline/ga-block.html`, or if the footer does not equal `baseline/site-footer.html`. Those files were copied from site `6a0787a8f156f041ca46a155` on 2026-11-08.

## Hosted snippet

`preview/head-replacement.html` points at:

`https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@COMMIT_SHA/webflow-integration/ud-consent.js`

`COMMIT_SHA` is not a real pin. Replace it with the full commit that contains that exact file, then confirm the URL returns those bytes. Do not use `@main`. The integrity value in the snippet is `sha384-Oi4t63Zz5qpyL1RD14Z7f3+DGO3XvGUbijg5OG83dqjGl3Gi78TTYmJezJErGbC2` for the current bundle. Recompute it if the file changes. `crossorigin="anonymous"` is required with that hash. jsDelivr sends `Access-Control-Allow-Origin: *` for these files; that was not re-checked against a consent URL because this commit is not published there.

Leave `privacyHref` and `termsHref` empty until the approved pages exist. `/privacy`, `/terms`, `/privacy-policy`, and `/terms-of-service` returned 404 on 2026-11-08.

## What an editor would change later

1. In the site head, replace only the GA4 block with the hosted snippet.
2. Leave the footer modal script and the older contact `gtag` script untouched until their separate draft is approved. While `gtag` is absent those calls return immediately.
3. Do not add a second config or a manual `page_view`.

Running `node webflow-integration/assemble.mjs` rewrites `ud-consent.js` and the preview files from the runtime and the v0.2 bridge fixture.
