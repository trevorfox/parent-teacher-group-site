#!/usr/bin/env node
/* Smoke test for the programs build, against the entries in content/programs/.
   It discovers them rather than naming them, so it keeps working as you
   replace the examples. Run: node scripts/build-programs.test.mjs */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert';
import { loadPrograms } from './lib/programs.mjs';
import config from '../site.config.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const entries = loadPrograms((msg) => { throw new Error(msg); });

// Build into a temp directory rather than through the real programs/, so a
// failing run cannot leave the committed output half-written.
const OUT = mkdtempSync(join(tmpdir(), 'programs-test-'));
try {
  execFileSync('node', [join(ROOT, 'scripts', 'build-programs.mjs')], {
    stdio: 'inherit',
    env: { ...process.env, PROGRAMS_OUT_DIR: OUT },
  });
  const read = (f) => readFileSync(join(OUT, f), 'utf8');
  const idx = read('index.html');

  for (const e of entries) {
    assert(idx.includes(e.title.replace(/&/g, '&amp;')), 'index missing: ' + e.title);
    const file = join(OUT, e.slug + '.html');
    if (e.stub) {
      assert(!existsSync(file), 'stub generated a page: ' + e.slug);
      assert(!idx.includes('href="/programs/' + e.slug + '"'), 'index must not link a stub: ' + e.slug);
      continue;
    }
    assert(existsSync(file), e.slug + '.html missing');
    assert(idx.includes('href="/programs/' + e.slug + '"'), 'index does not link ' + e.slug);
    const page = read(e.slug + '.html');
    assert(page.includes('id="impact"'), e.slug + ': impact section missing');
    assert(page.includes('data-program-donate="' + e.slug + '"'), e.slug + ': donate attribution missing');
    assert(page.includes('donations support all ' + config.org.abbrev + ' programs'), e.slug + ': fineprint missing');
    assert(page.includes('hero--gradient') || page.includes('hero--image'), e.slug + ': hero variant missing');
    assert(page.includes('href="/styles.css"') && page.includes('src="/script.js"'), e.slug + ': asset paths must be absolute');
    assert(page.includes('id="sponsors-title"') === e.sponsors.length > 0, e.slug + ': sponsors section should appear only with sponsors');
  }

  console.log('build-programs smoke test: OK (' + entries.length + ' entries)');
} finally {
  rmSync(OUT, { recursive: true, force: true });
}
