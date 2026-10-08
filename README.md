# Parent-teacher group site

A website template for a school parent-teacher group (PTA, PTO, PTC): a home page, family
and teacher pages, news, programs, meeting minutes, supply lists, and a calendar
that merges the school's feed with your own events.

Plain HTML, CSS and JavaScript. No framework, no bundler, no dependencies. It is
cut from a site a real elementary school PTC runs; the build, layout and
calendar are the same code, and the words are placeholders.

```
site.config.mjs   ← name, domain, nav, footer, calendar feeds, analytics ID
src/pages/        ← the nine main pages: frontmatter + <main> content
content/          ← markdown for /blog and /programs; minutes.json for /minutes
assets/           ← logo and images
scripts/          ← the build and its tests
styles.css        ← all styling
api/calendar.js   ← merges the school + group calendar feeds (Vercel function)
```

**Generated, do not hand-edit:** every `.html` outside `src/`, plus
`vercel.json` and `api/site.config.generated.cjs`. They are committed so the
host can serve them with no build step, and the next build overwrites them.

## Set it up

You need Node 18 or later, a GitHub account, and a free Vercel account.

### 1. Config

Open `site.config.mjs` and replace every value. Each key has a comment. Two take
real work:

- **`calendar.districtFeedUrl`.** Your school's public iCal feed: whatever URL
  sits behind the "iCal" or "Subscribe" icon on its calendar page. Every school
  CMS exposes it differently and some publish none. Leave it `null` to show only
  your own events.
- **`calendar.googleCalendarId`.** Create a Google Calendar under the group's
  own account, make it public, and copy the ID from Settings > Integrate
  calendar. Board members add events there and they appear on the site with no
  deploy. Enter meetings as individual events, not a recurring one.

### 2. Logo and colors

- Replace `assets/logo.svg` with your logo (PNG is fine), and set `brand.logo`,
  `logoWidth` and `logoHeight` to match.
- Edit the palette in the `:root` block at the top of `styles.css`. `--blue` is
  the primary color and `--green` the accent; each has `-deep`, `-dark` and
  `-tint` shades to adjust with it. The variable names stay even if your colors
  are not blue and green.
- Copy your new `--blue` value into `theme.themeColor`. The build fails if the
  two differ.

### 3. Build and look

```bash
npm run build:site
npm run serve        # http://localhost:3000, static pages only
```

`npm run serve` does not run the calendar function. To see `/calendar` with
live events, use `vercel dev`.

### 4. Write your copy

Names, emails and links in the pages are `{{tokens}}` filled from the config,
so they are already yours. What is left is marked `[Replace: …]`:

```bash
grep -rn 'Replace' src/pages
```

- **`src/pages/`** holds the nine pages as plain HTML. The family FAQ, the
  volunteer steps, the fundraising programs and the supply lists are the parts
  only you can write.
- **`content/programs/`** has one markdown file per program or event. The four
  there are examples. A file with `stub: true` is a card on the index with no
  page of its own.
- **`content/blog/`** has one example post. Copy `_template.md` to start
  another.
- **`content/minutes.json`** lists meeting minutes, one line per meeting:
  `{ "month": "2026-10", "url": "https://…" }`. A Google Doc published to the
  web (File > Share > Publish to web) makes a good link.

Remove a page by deleting its file in `src/pages/`, its built `.html`, and its
links in the `nav` and `footer.links` config.

### 5. Tests

```bash
npm run build:site && npm run snapshot
npm test
```

`npm run snapshot` records the current build as the baseline that
`verify-pages` compares against. Run it whenever you change built pages on
purpose and have checked the diff.

### 6. Deploy

1. Push the repo to GitHub.
2. Import it in Vercel. Framework preset: Other. No build command.
3. Add your domain in the Vercel project, set `deploy.canonicalHost` (and any
   `www` or short domains in `deploy.aliasHosts`), run `npm run build:config`,
   and commit the regenerated `vercel.json`.

From then on: edit a source file, run `npm run build:site`, commit the source
and the built pages together, push.

## Changing something

| To change | Edit |
|---|---|
| Group or school name, email, address, social links | `site.config.mjs` |
| Nav or footer links | `site.config.mjs` (`nav`, `footer.links`) |
| Where every Donate button goes | `site.config.mjs` (`links.donate`) |
| Meeting day or time | `site.config.mjs` (`meetings`) |
| Calendar feeds, event categories | `site.config.mjs` (`calendar`) |
| Domains and redirects | `site.config.mjs` (`deploy`), then `npm run build:config` |
| Page copy | the matching file in `src/pages/` |
| A news post or program | the matching markdown in `content/` |
| Meeting minutes | `content/minutes.json` |
| Colors, spacing, type | `styles.css` |

## What you get

- **Translation and accessibility.** One-tap languages in the top bar plus
  Google Translate for the rest; text size, high contrast and underline-links
  controls remembered per visitor; skip link, landmarks and visible focus.
- **Calendar.** School and group events in one list, filterable by type, with
  subscribe links for Google, Apple and Outlook and a per-event "add to
  calendar".
- **Supply lists.** Per-grade lists where each item links to an Office Depot
  search, and a print button that makes a one-page checklist headed by the
  school's 5% Back to Schools ID.
- **Programs.** A page per program with "what your gift buys" cards and an
  optional sponsor grid.
- **News.** Markdown posts with tags, tag pages, and "latest posts" strips you
  can embed on any page with `<!-- latest-posts tag="fundraising" count="3" -->`.

## Things that will trip you up

- **Google Forms must belong to a consumer Google account.** A form created
  under a Workspace account is sign-in-walled, and Google blocks transferring
  it out.
- **Analytics is off until you set `analytics.ga4Id`.**
- **Office Depot's school ID only counts in store or by phone**, not at online
  checkout. The supplies page is built around that. If your school has no ID,
  cut those sections.
- **The build script is not called `build` on purpose.** Vercel would run it on
  every deploy; committed HTML is what gets served.
- **The markdown renderer is a small subset:** `##`/`###` headings, paragraphs,
  `-` lists, `>` quotes, bold, italic, code, links and standalone images.

## Keeping up with the original

The engine files (stylesheet, browser scripts, calendar function, build
scripts) are identical to the site this was cut from. To pull in later fixes
from a checkout of it: `node scripts/sync-engine.mjs ../path-to-checkout`.

`scripts/fixtures/calendar-feed.ics` is a saved copy of one district's public
calendar feed, used only by the calendar tests.

## License

MIT. See [LICENSE](LICENSE).
