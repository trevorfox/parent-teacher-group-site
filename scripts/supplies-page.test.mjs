#!/usr/bin/env node
/* Smoke test for the /supplies Office Depot flow. Dep-free; run from repo root:
   node scripts/supplies-page.test.mjs */
import { readFileSync } from 'node:fs';
import config from '../site.config.mjs';

const html = readFileSync('supplies.html', 'utf8');
const js = readFileSync('supplies.js', 'utf8');
const css = readFileSync('styles.css', 'utf8');

let failed = 0;
function check(name, ok) {
  console.log(`${ok ? '✓' : '✗'} ${name}`);
  if (!ok) failed++;
}

check('supplies.html has no Amazon references', !/amazon/i.test(html));
check('supplies.js has no Amazon references', !/amazon/i.test(js));
check('no data-asin/data-qty/data-skip attributes remain', !/data-(asin|qty|skip)\b/.test(html));
check('supplies.js links to Office Depot search', js.includes('officedepot.com/a/search'));
const grades = (html.match(/<details class="grade"/g) || []).length;
check('every grade has a print button', grades > 0 && (html.match(/class="btn btn--blue print-btn"/g) || []).length === grades);
const ID = config.fundraising.officeDepotId;
check('print sheet header exists with the school ID', html.includes('class="print-sheet"') && html.indexOf(ID) > html.indexOf('class="print-sheet"'));
check('school ID appears in callout, ID card, and print sheet', html.split(ID).length - 1 >= 3);
check('fine print covers qualifying-item exclusions', /ink\s*(&amp;|&)\s*toner/i.test(html));
check('fine print warns online orders cannot be credited', /online checkout has no ID\s+field/i.test(html));
check('styles.css has the print block', css.includes('@media print') && css.includes('.print-target') && css.includes('printing-grade'));
check('checklist checkboxes in print styles', css.includes('"☐ "') || css.includes("'☐ '"));
check('GA4: supply_print event wired', js.includes("'supply_print'"));
check('GA4: od_id_copy event wired', js.includes("'od_id_copy'"));
check('GA4: item clicks carry store + query params', js.includes("store: 'officedepot'"));
check('GA4: supply_cart event removed', !js.includes("'supply_cart'"));
check('data-q override hook exists in supplies.js', js.includes("getAttribute('data-q')"));

console.log(failed ? `\n${failed} check(s) failed` : '\nAll checks passed');
process.exit(failed ? 1 : 0);
