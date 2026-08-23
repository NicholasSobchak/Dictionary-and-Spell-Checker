#!/usr/bin/env node
/**
 * QuickQuill app showcase.
 *
 * Serves the built Angular bundle (web/dist/browser) from a local static
 * server, mocks every /api endpoint the UI talks to, seeds a demo session,
 * then walks Chromium through every page and saves full-page screenshots.
 *
 * Works with zero infrastructure — no Spring Boot, Postgres, or nginx needed:
 *
 *   npm run build            # produce dist/browser
 *   npx playwright install chromium   # once
 *   node scripts/showcase-app.mjs           # desktop tour  -> screenshots/desktop-*.png
 *   node scripts/showcase-app.mjs --mobile  # iPhone tour    -> screenshots/mobile-*.png
 *   node scripts/showcase-app.mjs --headed  # watch it live
 */

import { createServer } from 'node:http';
import {
  accessSync,
  constants,
  readFileSync,
  readdirSync,
  existsSync,
  statSync,
  unlinkSync,
} from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium, devices } from 'playwright';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const webRoot = resolve(scriptDir, '..');
const distDir = join(webRoot, 'dist', 'browser');
const shotsDir = join(webRoot, 'screenshots');

const MOBILE = process.argv.includes('--mobile');
const GIF = process.argv.includes('--gif');
const HEADLESS = !process.argv.includes('--headed');
const PORT = Number(process.env.SHOWCASE_PORT || 4173);
const BASE = `http://127.0.0.1:${PORT}`;

const DEMO_USER = { id: 1, email: 'demo@quickquill.dev', displayName: 'Demo Writer' };
const AUTH_KEY = 'quickquill-auth';
const DEMO_TOKEN = 'demo-token';

const DOCS = [
  {
    id: 1,
    title: 'Field Notes',
    content:
      'The heron stood motionless in the shallows,\nthen lifted off without a single sound.\n\nNote to self: patience is also a technique.',
    updatedAt: '2026-08-20T09:30:00Z',
  },
  {
    id: 2,
    title: 'Reading List',
    content: '- The Elements of Style\n- Dreyer\u2019s English\n- Garner\u2019s Modern English Usage',
    updatedAt: '2026-08-19T18:12:00Z',
  },
  { id: 3, title: 'Untitled', content: '', updatedAt: '2026-08-18T07:45:00Z' },
];

const HISTORY_WORDS = ['ephemeral', 'serene', 'petrichor', 'quixotic', 'limerence'];
const SUGGESTED_WORDS = ['halcyon', 'susurrus', 'apricity', 'vellichor', 'redamancy'];
const SYNONYMS = ['tranquil', 'placid', 'untroubled', 'halcyon'];

function wordResponse(lemma) {
  return {
    id: 42,
    lemma,
    display_lemma: lemma,
    forms: [
      { form: lemma, tag: 'adjective' },
      { form: `${lemma}ly`, tag: 'adverb' },
    ],
    senses: [
      {
        pos: 'adjective',
        definition: 'calm, peaceful, and untroubled; tranquil.',
        examples: [`the ${lemma} lake lay still at dawn.`, `a ${lemma} smile.`],
        synonyms: SYNONYMS.slice(0, 3),
        antonyms: ['stormy', 'agitated'],
      },
      {
        pos: 'noun',
        definition: 'a state of utter calm; stillness of the air or sea.',
        examples: [`the ${lemma} of the evening`],
        synonyms: ['stillness'],
        antonyms: [],
      },
    ],
    etymology: [
      'from Latin serenus \u201cclear, fair\u201d (of weather)',
      'Middle English: from Old French serene, from Latin serenus',
    ],
    alternative_searches: ['serenity', 'serenely'],
  };
}

function summaryOf(doc) {
  return { id: doc.id, title: doc.title, updatedAt: doc.updatedAt };
}

/** Answers every /api request the SPA can make, in fixture shapes. */
async function mockApi(route) {
  const req = route.request();
  const url = new URL(req.url());
  const path = url.pathname;
  const post = () => new URLSearchParams(req.postData() || '');
  const json = (data, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(data) });

  if (path.startsWith('/api/word/')) {
    const query = decodeURIComponent(path.slice('/api/word/'.length)).replace(/\+/g, ' ').trim();
    if (!query || /\d/.test(query)) return json({ error: 'Enter a valid word' }, 400);
    if (query.toLowerCase() === 'zzzz') return json({ query, found: false, suggestion: 'serene' });
    return json(wordResponse(query.toLowerCase()));
  }
  if (path.startsWith('/api/suggest/') || path.startsWith('/api/synonym/')) {
    return json(path.startsWith('/api/suggest/') ? ['serenity', 'serenely'] : SYNONYMS);
  }
  if (path.startsWith('/api/autofill/')) {
    return json({ completion: 'serenity' });
  }

  if (path === '/api/auth/refresh' || path === '/api/auth/login' || path === '/api/auth/signup') {
    return json({ token: DEMO_TOKEN, user: DEMO_USER });
  }
  if (path === '/api/auth/me') return json(DEMO_USER);
  if (path.startsWith('/api/auth/')) return json({ message: 'ok' });

  if (path === '/api/documents') {
    if (req.method() === 'GET') return json(DOCS.map(summaryOf));
    if (req.method() === 'POST') {
      const created = {
        id: DOCS.length + 1,
        title: post().get('title') || 'Untitled',
        content: '',
        updatedAt: new Date().toISOString(),
      };
      DOCS.push(created);
      return json(created);
    }
  }
  const docMatch = path.match(/^\/api\/documents\/(\d+)(\/rename)?$/);
  if (docMatch) {
    const doc = DOCS.find((d) => d.id === Number(docMatch[1]));
    if (!doc) return json({ message: 'Document not found' }, 404);
    if (req.method() === 'GET') return json(doc);
    if (req.method() === 'PUT') doc.content = post().get('content') ?? doc.content;
    if (docMatch[2]) doc.title = post().get('title') ?? doc.title;
    doc.updatedAt = new Date().toISOString();
    if (req.method() === 'DELETE') DOCS.splice(DOCS.indexOf(doc), 1);
    return req.method() === 'DELETE' ? json({ message: 'deleted' }) : json(doc);
  }

  if (path === '/api/search-history') {
    if (req.method() === 'GET') return json(HISTORY_WORDS);
    return json({ message: 'ok' });
  }
  if (path === '/api/suggested-words') {
    if (req.method() === 'GET') return json(SUGGESTED_WORDS);
    return json({ message: 'ok' });
  }
  if (path.startsWith('/api/suggested-words/')) return json({ message: 'ok' });

  return json({ error: `showcase mock: unhandled ${req.method()} ${path}` }, 404);
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

function startStaticServer() {
  return new Promise((resolvePromise, reject) => {
    const server = createServer((req, res) => {
      const urlPath = decodeURIComponent(new URL(req.url, BASE).pathname);
      let filePath = normalize(join(distDir, urlPath));
      if (!filePath.startsWith(resolve(distDir) + sep) && filePath !== resolve(distDir)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (urlPath === '/' || !existsSync(filePath) || statSync(filePath).isDirectory()) {
        filePath = join(distDir, 'index.html'); // SPA fallback for client-side routes
      }
      try {
        const body = readFileSync(filePath);
        res.writeHead(200, { 'content-type': MIME[extname(filePath)] ?? 'application/octet-stream' });
        res.end(body);
      } catch {
        res.writeHead(500).end('read error');
      }
    });
    server.on('error', reject);
    server.listen(PORT, '127.0.0.1', () => resolvePromise(server));
  });
}

async function main() {
  try {
    accessSync(join(distDir, 'index.html'), constants.R_OK);
  } catch {
    console.error(`No build found at ${distDir}.\nRun "npm run build" first.`);
    process.exit(1);
  }

  const server = await startStaticServer();
  const browser = await chromium.launch({
    headless: HEADLESS,
    // GIF mode needs visible pacing even headless, or the loop blurs past.
    slowMo: GIF ? 250 : HEADLESS ? 0 : 150,
  });

  const label = MOBILE ? 'mobile' : 'desktop';
  const contextOptions = MOBILE
    ? { ...devices['iPhone 13'] }
    : { viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2 };

  if (GIF) {
    contextOptions.recordVideo = {
      dir: shotsDir,
      size: MOBILE ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    };
  }

  const context = await browser.newContext(contextOptions);
  context.setDefaultTimeout(15_000);

  // Seed the demo session before any app code runs so guarded routes render.
  await context.addInitScript(
    ([key, value]) => localStorage.setItem(key, value),
    [AUTH_KEY, JSON.stringify({ token: DEMO_TOKEN, user: DEMO_USER })],
  );

  const page = await context.newPage();
  await routeAllApi(page);

  const step = async (name, fn) => {
    process.stdout.write(`\u2022 ${name} `);
    await fn();
    if (GIF) {
      await page.waitForTimeout(600); // let each screen linger in the recording
    } else {
      await page.screenshot({
        path: join(shotsDir, `${label}-${name}.png`),
        fullPage: true,
      });
    }
    console.log('\u2713');
  };

  await step('01-dictionary', async () => {
    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
    const input = page.locator('.autofill-wrapper input');
    await input.click();
    await input.pressSequentially('serene', { delay: 90 });
    await input.press('Enter');
    await page.locator('.result-box.has-results .lemma').waitFor();
  });

  await step('02-drawer', async () => {
    await page.locator('.hamburger').click();
    await page.locator('.drawer.open').waitFor();
  });

  await step('03-search-history', async () => {
    await page.locator('.drawer .nav-link[routerlink="/search-history"]').click();
    await page.locator('.word-list-chip').first().waitFor();
  });

  await step('04-suggested-words', async () => {
    await page.goto(`${BASE}/suggestions`, { waitUntil: 'networkidle' });
    await page.locator('.word-list-chip').first().waitFor();
  });

  await step('05-lettre-files', async () => {
    await page.goto(`${BASE}/lettre`, { waitUntil: 'networkidle' });
    await page.locator('.file-item').first().waitFor();
  });

  await step('06-lettre-editor', async () => {
    await page.locator('.file-name', { hasText: 'Field Notes' }).click();
    await page.locator('.lettre-textarea').waitFor();
    await page.locator('.editor-file-title', { hasText: 'Field Notes' }).waitFor();
    await page.locator('.lettre-textarea').fill('');
    await page.keyboard.type('Autosave demo: typed in the showcase.', { delay: 20 });
    await page.locator('.lettre-saved').waitFor(); // debounced PUT resolved against the mock
  });

  await step('07-profile', async () => {
    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' });
    await page.locator('.profile-card').waitFor();
  });

  // close the context first so Playwright flushes the .webm to disk
  await context.close();
  await browser.close();

  let deliverable = `${label} screenshots in ${shotsDir}${sep}`;
  if (GIF) {
    deliverable = await encodeGif(label);
  }
  server.close();
  console.log(`\nDone: ${deliverable}`);
}

/** Transcode the tour's recorded video into a compact looping GIF via ffmpeg. */
async function encodeGif(label) {
  const recordings = readdirSync(shotsDir)
    .filter((f) => f.endsWith('.webm'))
    .map((f) => join(shotsDir, f))
    .sort((a, b) => statSync(b).mtimeMs - statSync(a).mtimeMs);
  if (recordings.length === 0) {
    throw new Error('GIF mode: no recorded video found');
  }

  const webm = recordings[0];
  const out = join(shotsDir, `showcase-${label}.gif`);
  const width = MOBILE ? 390 : 800;
  // two-pass palette keeps the dark theme free of banding artifacts;
  // multi-stream chains must run under -filter_complex (not -vf)
  const chain = `[0:v]fps=12,scale=${width}:-1:flags=lanczos,split[a][b];[a]palettegen=stats_mode=diff[p];[b][p]paletteuse=dither=bayer:bayer_scale=4`;

  execFileSync('ffmpeg', ['-y', '-i', webm, '-filter_complex', chain, '-loop', '0', out], {
    stdio: 'ignore',
  });
  unlinkSync(webm);
  return out;
}

async function routeAllApi(page) {
  await page.route('**/api/**', mockApi);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
