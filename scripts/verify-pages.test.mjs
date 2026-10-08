#!/usr/bin/env node
/* =========================================================================
   verify-pages — guards against unintended changes to built pages.

   Every generated page is compared with its snapshot in
   scripts/fixtures/baseline/. The comparison is STRUCTURAL, not byte-for-byte:
   HTML comments are dropped and whitespace between tags is collapsed, so
   reformatting does not count. What is left is a token stream of tags and text.

   When a difference is one you meant, check it, then accept the current build
   as the new baseline:

     npm run build:site && npm run snapshot

     node scripts/verify-pages.test.mjs
   ========================================================================= */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BASELINE = join(ROOT, 'scripts', 'fixtures', 'baseline');

/* ---------- normalization ---------- */

// Strip comments, collapse inter-tag whitespace, collapse runs inside text.
//
// Inline <script> bodies also lose whitespace around JS punctuation, so that
// re-wrapping a call across lines does not read as a change. Identifiers and
// string contents survive, so a real edit still shows up.
function normalize(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(
      /(<script(?![^>]*\bsrc=)[^>]*>)([\s\S]*?)(<\/script>)/gi,
      (_, open, code, close) => open + code.replace(/\s+/g, ' ').replace(/\s*([(){},;])\s*/g, '$1').trim() + close
    )
    .replace(/>\s+</g, '><')
    .replace(/[ \t\r\n]+/g, ' ')
    .trim();
}

// Split into tags and non-empty text nodes.
function tokenize(html) {
  return normalize(html)
    .split(/(<[^>]*>)/)
    .map((t) => t.trim())
    .filter(Boolean);
}

/* ---------- diff (common prefix/suffix, then LCS on the middle) ---------- */

function diff(a, b) {
  let lo = 0;
  while (lo < a.length && lo < b.length && a[lo] === b[lo]) lo++;
  let ha = a.length, hb = b.length;
  while (ha > lo && hb > lo && a[ha - 1] === b[hb - 1]) { ha--; hb--; }

  const x = a.slice(lo, ha), y = b.slice(lo, hb);
  if (!x.length && !y.length) return [];
  // Bail out of LCS on pathologically large middles — report them wholesale
  // rather than allocating a 10^8-cell table.
  if (x.length * y.length > 4_000_000) {
    return x.map((t) => ({ op: '-', text: t })).concat(y.map((t) => ({ op: '+', text: t })));
  }

  const n = x.length, m = y.length;
  const table = new Uint32Array((n + 1) * (m + 1));
  const at = (i, j) => i * (m + 1) + j;
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      table[at(i, j)] = x[i] === y[j]
        ? table[at(i + 1, j + 1)] + 1
        : Math.max(table[at(i + 1, j)], table[at(i, j + 1)]);
    }
  }
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (x[i] === y[j]) { i++; j++; }
    else if (table[at(i + 1, j)] >= table[at(i, j + 1)]) out.push({ op: '-', text: x[i++] });
    else out.push({ op: '+', text: y[j++] });
  }
  while (i < n) out.push({ op: '-', text: x[i++] });
  while (j < m) out.push({ op: '+', text: y[j++] });
  return out;
}

/* ---------- expected differences ----------
   Keyed by output path; COMMON applies to every page. Both start empty. Add a
   rule only for a difference you have looked at and mean to keep while the
   baseline stays as it is; otherwise fix the page or run `npm run snapshot`.

     'index.html': {
       rewrite: [{ from: /old/, to: 'new', why: '…' }],
       added:   [{ re: /^<meta property="og:type"/, why: '…' }],
       removed: [],
     },
*/

const COMMON = { rewrite: [], added: [], removed: [] };
const EXPECTED = {};

/* ---------- run ---------- */

function rulesFor(page) {
  const e = EXPECTED[page] || { rewrite: [], added: [], removed: [] };
  return {
    rewrite: COMMON.rewrite.concat(e.rewrite || []),
    added: COMMON.added.concat(e.added || []),
    removed: COMMON.removed.concat(e.removed || []),
  };
}

function pages() {
  const out = [];
  const walk = (dir) => {
    for (const name of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1)) {
      const p = join(dir, name.name);
      if (name.isDirectory()) walk(p);
      else if (name.name.endsWith('.html')) out.push(relative(BASELINE, p));
    }
  };
  walk(BASELINE);
  return out;
}

let failures = 0;
let checked = 0;

if (!existsSync(BASELINE)) {
  console.error('verify-pages: no baseline at ' + BASELINE);
  process.exit(1);
}

for (const page of pages()) {
  const built = join(ROOT, page);
  if (!existsSync(built)) {
    console.error(`\n✗ ${page}\n    page is in the baseline but was not produced by the build`);
    failures++;
    continue;
  }
  checked++;

  const rules = rulesFor(page);
  let base = readFileSync(join(BASELINE, page), 'utf8');
  for (const r of rules.rewrite) base = base.replace(r.from, r.to);

  const deltas = diff(tokenize(base), tokenize(readFileSync(built, 'utf8')));
  const unexplained = deltas.filter((d) => {
    const list = d.op === '+' ? rules.added : rules.removed;
    return !list.some((r) => r.re.test(d.text));
  });

  if (!unexplained.length) {
    const note = deltas.length ? ` (${deltas.length} expected)` : '';
    console.log(`✓ ${page}${note}`);
    continue;
  }

  failures++;
  console.error(`\n✗ ${page} — ${unexplained.length} unexplained difference(s):`);
  for (const d of unexplained.slice(0, 25)) {
    const text = d.text.length > 160 ? d.text.slice(0, 157) + '…' : d.text;
    console.error(`    ${d.op === '+' ? 'built only  ' : 'baseline only'} ${text}`);
  }
  if (unexplained.length > 25) console.error(`    … and ${unexplained.length - 25} more`);
}

console.log(`\nverify-pages: ${checked} page(s) checked, ${failures} failing.`);
if (failures) {
  console.error('A difference here is either a regression to fix, or an intended change');
  console.error('that belongs in EXPECTED with a `why`. Do not add a rule to silence a');
  console.error('diff you have not explained.');
  process.exit(1);
}
