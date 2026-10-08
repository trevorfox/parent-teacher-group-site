#!/usr/bin/env node
/* =========================================================================
   sync-engine — copy the engine files from an upstream checkout.

   This template was cut from a working school site. The files listed below
   are the engine: they hold no school's content, and are identical in both
   repositories. Everything else here (config, src/pages/, content/, assets/,
   the README, and the tests not listed) belongs to the template.

     node scripts/sync-engine.mjs ../path-to-upstream

   Review `git diff` afterwards, then `npm run build:site && npm test`.
   ========================================================================= */
import { copyFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const from = process.argv[2] && resolve(process.argv[2]);
if (!from || !existsSync(join(from, 'scripts', 'lib', 'chrome.mjs'))) {
  console.error('usage: node scripts/sync-engine.mjs <path to upstream checkout>');
  process.exit(1);
}

const FILES = [
  'styles.css', 'script.js', 'calendar.js', 'supplies.js', 'faq.js',
  'api/calendar.js',
  'scripts/build-blog.mjs', 'scripts/build-config.mjs', 'scripts/build-pages.mjs',
  'scripts/build-programs.mjs', 'scripts/snapshot.mjs',
  'scripts/build-blog.test.mjs', 'scripts/calendar-categorize.test.mjs',
  'scripts/fixtures/calendar-feed.ics',
  ...readdirSync(join(from, 'scripts', 'lib')).filter((f) => f.endsWith('.mjs')).map((f) => 'scripts/lib/' + f),
];

for (const f of FILES) copyFileSync(join(from, f), join(ROOT, f));
console.log('sync-engine: copied ' + FILES.length + ' file(s) from ' + from);
