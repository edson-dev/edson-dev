import { writeFile, mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const USERNAME = process.env.GITHUB_USERNAME || 'edson-dev';
const TOKEN = process.env.GITHUB_TOKEN || '';
const TIMEOUT_MS = Number(process.env.FETCH_TIMEOUT_MS || 10000);

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', 'data');

const headers = {
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'User-Agent': 'edson-dev-profile-fetcher',
};
if (TOKEN) headers['Authorization'] = `Bearer ${TOKEN}`;

async function fetchJson(url, opts = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, { ...opts, signal: controller.signal });
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status} ${res.statusText}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

async function github(url) {
  return fetchJson(url, { headers });
}

async function readExisting(file) {
  try {
    return JSON.parse(await readFile(join(dataDir, file), 'utf8'));
  } catch {
    return null;
  }
}

async function save(file, data) {
  await mkdir(dataDir, { recursive: true });
  await writeFile(join(dataDir, file), JSON.stringify(data), 'utf8');
  console.log(`wrote data/${file}`);
}

const task = async (label, fn) => {
  try {
    await fn();
    return true;
  } catch (e) {
    console.warn(`skip ${label} (${e.message}) — keeping existing file`);
    return false;
  }
};

// All three snapshots fetched concurrently (fast server startup)
await Promise.all([
  task('repos.json', async () => {
    const [user, repos] = await Promise.all([
      github(`https://api.github.com/users/${USERNAME}`),
      github(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`),
    ]);
    const snapshot = {
      fetchedAt: new Date().toISOString(),
      user: {
        login: user.login,
        name: user.name,
        avatar_url: user.avatar_url,
        bio: user.bio,
        company: user.company,
        location: user.location,
        blog: user.blog,
        html_url: user.html_url,
        public_repos: user.public_repos,
        followers: user.followers,
        following: user.following,
        created_at: user.created_at,
      },
      repos: repos.map((r) => ({
        name: r.name,
        full_name: r.full_name,
        description: r.description,
        html_url: r.html_url,
        homepage: r.homepage,
        language: r.language,
        topics: r.topics,
        stars: r.stargazers_count,
        forks: r.forks_count,
        archived: r.archived,
        fork: r.fork,
        updated_at: r.updated_at,
        created_at: r.created_at,
      })),
    };
    await save('repos.json', snapshot);
    console.log(`  (${repos.length} repos)`);
  }),

  task('contributions.json', async () => {
    const existing = await readExisting('repos.json');
    const createdYear = existing?.user?.created_at
      ? new Date(existing.user.created_at).getFullYear()
      : new Date().getFullYear();
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = createdYear; y <= currentYear; y++) years.push(y);

    const results = await Promise.all(
      years.map((y) =>
        fetchJson(`https://github-contributions-api.jogruber.de/v4/${USERNAME}?y=${y}`, {
          headers: { 'User-Agent': 'edson-dev-profile-fetcher' },
        }).catch(() => null),
      ),
    );

    const all = [];
    const total = {};
    for (const r of results) {
      if (!r) continue;
      for (const c of r.contributions || []) {
        all.push({ date: c.date, count: c.count, level: c.level });
      }
      Object.assign(total, r.total || {});
    }
    all.sort((a, b) => a.date.localeCompare(b.date));
    await save('contributions.json', {
      fetchedAt: new Date().toISOString(),
      total,
      contributions: all,
    });
    console.log(`  (${all.length} cells, ${years.length} years)`);
  }),

  task('orgs.json', async () => {
    const orgs = await github(`https://api.github.com/users/${USERNAME}/orgs`);
    await save('orgs.json', orgs);
    console.log(`  (${orgs.length} orgs)`);
  }),
]);

const missing = await Promise.all([
  readExisting('repos.json'),
  readExisting('contributions.json'),
  readExisting('orgs.json'),
]);
if (missing.some((d) => d === null)) {
  console.warn('⚠ some data files are missing — run `make fetch` with internet access once');
}

// bundle.json: everything the site needs in ONE request
const [repos, contributions, orgs, profile, tech] = await Promise.all([
  readExisting('repos.json'),
  readExisting('contributions.json'),
  readExisting('orgs.json'),
  readExisting('profile.json'),
  readExisting('tech-stack.json'),
]);
await save('bundle.json', {
  fetchedAt: new Date().toISOString(),
  profile: profile || {},
  tech: tech || [],
  user: repos?.user || null,
  repos: repos?.repos || [],
  contributions,
  orgs: orgs || [],
});
console.log('wrote data/bundle.json');

// Bake the bundle straight into index.html so the page makes zero data requests.
const bundle = await readExisting('bundle.json');
const htmlPath = join(__dirname, '..', 'index.html');
const html = await readFile(htmlPath, 'utf8');
const marker = '/*__APP_DATA__*/null;';
const re = /<script>window\.APP_DATA = .*?<\/script>/s;
if (!html.includes(marker) && !re.test(html)) {
  console.warn('skip: index.html is missing the __APP_DATA__ placeholder');
} else {
  const injected = html.replace(re, `<script>window.APP_DATA = ${JSON.stringify(bundle)}</script>`);
  await writeFile(htmlPath, injected, 'utf8');
  console.log('baked data into index.html');
}