import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const bridgePath = path.join(dir, '../tests/fixtures/ud-analytics-bridge-v0.2.js');
const runtimePath = path.join(dir, 'ud-consent-runtime.js');
const bundlePath = path.join(dir, 'ud-consent.js');
const gaPath = path.join(dir, 'baseline/ga-block.html');
const headPath = path.join(dir, 'baseline/site-head.html');
const footerPath = path.join(dir, 'baseline/site-footer.html');
const previewDir = path.join(dir, 'preview');

const bridge = fs.readFileSync(bridgePath);
const runtime = fs.readFileSync(runtimePath, 'utf8');
if (runtime.includes('</script>')) {
  throw new Error('runtime contains a script end tag and cannot be inlined');
}
const bundle = Buffer.concat([bridge, Buffer.from('\n'), Buffer.from(runtime)]);
fs.writeFileSync(bundlePath, bundle);

const integrity = 'sha384-' + crypto.createHash('sha384').update(bundle).digest('base64');
const replacement = [
  '<!-- UD 2026: first-party analytics consent. Replaces the ungated GA4 loader.',
  '     Do not keep the gtag snippet and do not add a second one.',
  '     privacyHref and termsHref stay empty until those pages are published.',
  '     Replace COMMIT_SHA with the full commit that contains this file. Do not use @main.',
  '     This snippet is a preview. It is not installed. -->',
  '<script>',
  'window.UDConsentConfig = { privacyHref: "", termsHref: "" };',
  '</script>',
  '<script src="https://cdn.jsdelivr.net/gh/kcourser/UD-podcast-network@COMMIT_SHA/webflow-integration/ud-consent.js" integrity="' + integrity + '" crossorigin="anonymous"></script>'
].join('\n');

const ga = fs.readFileSync(gaPath, 'utf8');
const head = fs.readFileSync(headPath, 'utf8');
if (!head.endsWith(ga)) {
  throw new Error('site head baseline does not end with the verified GA block');
}
const hostedHead = head.slice(0, -ga.length) + replacement + '\n';
const inlineHead = head.slice(0, -ga.length) + '<script>\n' + bundle.toString('utf8') + '\n</script>\n';
fs.mkdirSync(previewDir, { recursive: true });
fs.writeFileSync(path.join(previewDir, 'head-replacement.html'), replacement + '\n');
fs.writeFileSync(path.join(previewDir, 'site-head.html'), hostedHead);
fs.writeFileSync(path.join(previewDir, 'site-head.inline.html'), inlineHead);
fs.copyFileSync(footerPath, path.join(previewDir, 'site-footer.html'));

const counts = {
  gaBlock: ga.length,
  bridge: bridge.length,
  runtime: Buffer.byteLength(runtime),
  bundle: bundle.length,
  registerInlineMax: 2000,
  bundleExceedsRegisterInline: bundle.length > 2000,
  baselineHead: Buffer.byteLength(head),
  baselineFooter: fs.statSync(footerPath).size,
  hostedHead: Buffer.byteLength(hostedHead),
  inlineHead: Buffer.byteLength(inlineHead),
  headReplacement: Buffer.byteLength(replacement + '\n'),
  integrity: integrity,
  baselineHeadContainsGaOnce: head.split(ga).length === 2,
  hostedHeadContainsAsyncGtag: hostedHead.includes('googletagmanager.com/gtag/js'),
  inlineHeadContainsGtagString: inlineHead.includes('googletagmanager.com/gtag/js')
};
fs.writeFileSync(path.join(previewDir, 'counts.json'), JSON.stringify(counts, null, 2) + '\n');
console.log(JSON.stringify(counts, null, 2));
