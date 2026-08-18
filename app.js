const USERNAME = 'edson-dev';

const $ = (id) => document.getElementById(id);

const LANG_COLORS = {
  Python: '#3572A5',
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Java: '#b07219',
  'C#': '#178600',
  Go: '#00ADD8',
  C: '#555555',
  'C++': '#f34b7d',
  Shell: '#89e051',
  Batchfile: '#C1F12E',
  Dockerfile: '#384d54',
  Vue: '#41b883',
  Rust: '#dea584',
  PHP: '#4F5D95',
};

const LEVEL_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];

function renderProfile(profile, user) {
  $('avatar').src = 'images/avatar.png';
  $('name').textContent = user?.name || profile.name;
  $('bio').textContent = user?.bio || profile.bio || '';

  const socials = profile.socials || [];
  $('socials').innerHTML = socials
    .map((s) => {
      const icon = s.icon ? `<img src="${s.icon}" alt="" onerror="this.remove()" />` : '';
      return `
      <a href="${s.url}" target="_blank" rel="noopener">
        ${icon}${s.fallbackIcon ? `<span>${s.fallbackIcon}</span>` : ''}
        ${s.name}
      </a>`;
    })
    .join('');
}

function renderTechStack(tech) {
  $('tech').innerHTML = tech
    .map(
      (t) => `
      <div class="tech-item" title="${t.label}">
        <img src="${t.icon}" alt="${t.label}" loading="lazy" />
        <span>${t.label}</span>
      </div>`,
    )
    .join('');
}

function renderLanguages(repos) {
  const counts = new Map();
  for (const r of repos) {
    if (!r.language) continue;
    counts.set(r.language, (counts.get(r.language) || 0) + 1);
  }
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, n]) => sum + n, 0);

  const bar = entries
    .map(([lang, n]) => {
      const pct = ((n / total) * 100).toFixed(1);
      const color = LANG_COLORS[lang] || '#8b949e';
      return `<div class="lang-seg" style="width:${pct}%;background:${color}" title="${lang}: ${pct}%"></div>`;
    })
    .join('');

  const list = entries
    .map(([lang, n]) => {
      const color = LANG_COLORS[lang] || '#8b949e';
      const pct = ((n / total) * 100).toFixed(0);
      return `<span><span class="dot" style="background:${color}"></span>${lang} · ${pct}%</span>`;
    })
    .join('');

  $('languages').innerHTML = `
    <div class="lang-bar">${bar}</div>
    <div class="lang-list">${list || '<span>No languages found</span>'}</div>
  `;
}

function renderOrganizations(orgs) {
  if (!orgs || orgs.length === 0) return;
  $('orgs').innerHTML = `
    <h3 class="sub-title">Organizations</h3>
    <div class="org-list">
      ${orgs
        .map(
          (o) => `
        <a class="org-card" href="${o.html_url || '#'}" target="_blank" rel="noopener">
          <img src="${o.avatar_url}" alt="${o.login}" loading="lazy" />
          <span>${escapeHtml(o.login)}</span>
        </a>`,
        )
        .join('')}
    </div>
  `;
}

function renderRpg(contributions) {
  const holder = $('rpg');
  if (!contributions || !Array.isArray(contributions.contributions)) {
    holder.innerHTML = '<p class="empty">No contribution data available.</p>';
    return;
  }

  const CELL = 14;
  const GAP = 3;
  const PAD = 16;
  const ROWS = 7;

  const cells = contributions.contributions
    .map((c) => ({ date: new Date(c.date + 'T00:00:00'), count: c.count, level: c.level }))
    .filter((c) => !Number.isNaN(c.date.getTime()));

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yearAgo = new Date(today.getTime() - 364 * 86400000);

  const lastYear = cells
    .filter((c) => c.date >= yearAgo && c.date <= today)
    .sort((a, b) => a.date - b.date);

  const totalLastYear = lastYear.reduce((s, c) => s + c.count, 0);
  const totals = contributions.total || {};
  const totalAllTime = Object.values(totals).reduce((s, n) => s + (n || 0), 0);

  $('contribution-stats').innerHTML = `
    <div class="stat"><span class="stat-value">${totalLastYear.toLocaleString()}</span><span class="stat-label">contributions (1 year)</span></div>
    <div class="stat"><span class="stat-value">${totalAllTime.toLocaleString()}</span><span class="stat-label">contributions (all time)</span></div>
  `;

  const weeks = [];
  for (let i = 0; i < lastYear.length; i += ROWS) {
    weeks.push(lastYear.slice(i, i + ROWS));
  }

  const W = weeks.length * (CELL + GAP);
  const H = ROWS * (CELL + GAP);

  const LEVEL_COLORS = ['#161b22', '#0e4429', '#006d32', '#26a641', '#39d353'];
  const CLEARED = '#22262e';
  const level0 = LEVEL_COLORS[0];

  const cellColor = (level) => LEVEL_COLORS[level] || level0;

  const gridRects = [];
  weeks.forEach((week, wi) => {
    week.forEach((cell, ri) => {
      if (!cell) return;
      gridRects.push({
        wi,
        ri,
        x: wi * (CELL + GAP) + PAD,
        y: ri * (CELL + GAP) + PAD,
        count: cell.count,
        level: cell.level,
      });
    });
  });

  const waypoints = [];
  weeks.forEach((week, wi) => {
    const order = wi % 2 === 0 ? [...week.keys()] : [...week.keys()].reverse();
    for (const ri of order) {
      const cell = week[ri];
      if (!cell) continue;
      waypoints.push({
        wi,
        ri,
        count: cell.count,
        x: wi * (CELL + GAP) + PAD + CELL / 2,
        y: ri * (CELL + GAP) + PAD + CELL / 2,
      });
    }
  });

  if (waypoints.length === 0) {
    holder.innerHTML = '<p class="empty">No contribution squares to draw.</p>';
    return;
  }

  const gridSvg = gridRects
    .map(
      (g) =>
        `<rect id="cell-${g.wi}-${g.ri}" x="${g.x}" y="${g.y}" width="${CELL}" height="${CELL}" rx="2.5" fill="${cellColor(g.level)}" />`,
    )
    .join('');

  holder.innerHTML = `
    <div class="rpg-hud">
      <div class="rpg-hud-item"><span id="rpg-score" class="rpg-hud-value">0</span><span class="rpg-hud-label">COMMITS</span></div>
      <div class="rpg-hud-item"><span id="rpg-kills" class="rpg-hud-value">0</span><span class="rpg-hud-label">DAYS</span></div>
      <div class="rpg-hud-item"><span id="rpg-level" class="rpg-hud-value">1</span><span class="rpg-hud-label">LEVEL</span></div>
      <button class="rpg-ctl" id="rpg-ctl" title="Speed — click to change">2x</button>
    </div>
    <div class="rpg-stage">
      <svg id="rpg-svg" viewBox="0 0 ${W + PAD * 2} ${H + PAD * 2}" xmlns="http://www.w3.org/2000/svg" class="rpg-svg">
        <rect id="rpg-bg" x="0" y="0" width="${W + PAD * 2}" height="${H + PAD * 2}" fill="transparent" />
        ${gridSvg}
        <g id="rpg-monsters"></g>
        <g id="rpg-effects"></g>
        <g id="rpg-hero" transform="translate(${waypoints[0].x},${waypoints[0].y})">
          <g id="rpg-hero-inner">
            <circle r="${CELL * 0.62}" fill="#58a6ff" stroke="#1f6feb" stroke-width="1.5" />
            <path d="M -7 -2 A 7 7 0 0 1 7 -2 Z" fill="#0d1117" />
            <circle cx="-2.6" cy="-3" r="1.2" fill="#0d1117" />
            <circle cx="0.6" cy="-3" r="1.2" fill="#0d1117" />
            <g id="rpg-sword" transform="rotate(-60 0 0)">
              <rect x="${CELL * 0.62 - 1.5}" y="${-CELL * 0.62 - 2}" width="2.6" height="${CELL * 0.62 + 6}" fill="#c9d1d9" />
              <path d="M ${CELL * 0.62 - 0.2} ${-CELL * 0.62 - 2} L ${CELL * 0.62 + 5} ${-CELL * 0.62 - 7} L ${CELL * 0.62 - 0.2} ${-CELL * 0.62 - 5} Z" fill="#e3b341" />
            </g>
          </g>
        </g>
        </svg>
      <div class="rpg-level-banner" id="rpg-level-banner"></div>
    </div>
  `;

  const svg = document.getElementById('rpg-svg');
  const hero = document.getElementById('rpg-hero');
  const heroInner = document.getElementById('rpg-hero-inner');
  const sword = document.getElementById('rpg-sword');
  const monstersLayer = document.getElementById('rpg-monsters');
  const effectsLayer = document.getElementById('rpg-effects');
  const scoreEl = document.getElementById('rpg-score');
  const killsEl = document.getElementById('rpg-kills');
  const levelEl = document.getElementById('rpg-level');
  const bannerEl = document.getElementById('rpg-level-banner');
  const ctlBtn = document.getElementById('rpg-ctl');

  let speed = 2;
  const SPEEDS = [1, 2, 4];
  let running = false;
  let cancelled = false;
  let score = 0;
  let kills = 0;
  let level = 1;

  const levelFor = (s) => Math.floor(Math.sqrt(s / 8)) + 1;

  ctlBtn.addEventListener('click', () => {
    if (started && !running) {
      cancelled = true;
      setTimeout(() => {
        renderRpg(contributions);
      }, 50);
      return;
    }
    speed = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    ctlBtn.textContent = `${speed}x`;
  });

  const sleep = (ms) => new Promise((resolve) => {
    const go = () => {
      if (paused) {
        setTimeout(go, 100);
        return;
      }
      setTimeout(resolve, ms / speed);
    };
    go();
  });
  const lerp = (a, b, t) => a + (b - a) * t;

  const cellEl = (wi, ri) => document.getElementById(`cell-${wi}-${ri}`);

  const NS = 'http://www.w3.org/2000/svg';

  function monster(count) {
    const maxColor = count >= 20 ? '#f85149' : count >= 8 ? '#bc4c00' : '#d29922';
    const g = document.createElementNS(NS, 'g');
    g.classList.add('rpg-monster');
    const body = document.createElementNS(NS, 'circle');
    body.setAttribute('r', CELL * 0.62);
    body.setAttribute('fill', maxColor);
    body.setAttribute('stroke', '#0d1117');
    body.setAttribute('stroke-width', '1.5');
    g.appendChild(body);
    const l = document.createElementNS(NS, 'circle');
    l.setAttribute('cx', -2.5);
    l.setAttribute('cy', -1.5);
    l.setAttribute('r', 1.1);
    l.setAttribute('fill', '#0d1117');
    g.appendChild(l);
    const r = document.createElementNS(NS, 'circle');
    r.setAttribute('cx', 2.5);
    r.setAttribute('cy', -1.5);
    r.setAttribute('r', 1.1);
    r.setAttribute('fill', '#0d1117');
    g.appendChild(r);
    return g;
  }

  function spawnMonster(wi, ri, count) {
    const wp = waypoints.find((w) => w.wi === wi && w.ri === ri);
    const holder = document.createElementNS(NS, 'g');
    holder.setAttribute('transform', `translate(${wp.x},${wp.y - 14})`);
    holder.appendChild(monster(count));
    monstersLayer.appendChild(holder);
    return holder;
  }

  function damageNumber(wi, ri, count) {
    const wp = waypoints.find((w) => w.wi === wi && w.ri === ri);
    const t = document.createElementNS(NS, 'text');
    const isCrit = count >= 10;
    t.textContent = isCrit ? `${count} CRIT!` : `${count}`;
    t.setAttribute('x', wp.x);
    t.setAttribute('y', wp.y - 12);
    t.setAttribute('text-anchor', 'middle');
    t.setAttribute('fill', isCrit ? '#f85149' : '#e3b341');
    t.setAttribute('font-size', isCrit ? 13 : 11);
    t.setAttribute('font-weight', 'bold');
    t.classList.add('rpg-dmg');
    effectsLayer.appendChild(t);
    setTimeout(() => t.remove(), 900 / speed);
  }

  async function attack(wi, ri, count) {
    const m = spawnMonster(wi, ri, count);
    const inner = m.querySelector('.rpg-monster');
    await sleep(90);
    sword.setAttribute('transform', 'rotate(70 0 0)');
    await sleep(120);
    sword.setAttribute('transform', 'rotate(-40 0 0)');
    inner.classList.add('rpg-monster-hit');
    damageNumber(wi, ri, count);

    score += count;
    kills += 1;
    const newLevel = levelFor(score);
    if (newLevel > level) {
      level = newLevel;
      bannerEl.textContent = `LEVEL UP! → ${level}`;
      bannerEl.classList.add('show');
      setTimeout(() => bannerEl.classList.remove('show'), 1200 / speed);
    }
    scoreEl.textContent = score;
    killsEl.textContent = kills;
    levelEl.textContent = level;

    const el = cellEl(wi, ri);
    if (el) el.setAttribute('fill', CLEARED);

    await sleep(120);
    inner.classList.add('rpg-monster-dead');
    await sleep(150);
    m.remove();
  }

  async function animate() {
    running = true;
    cancelled = false;

    let fx = waypoints[0].x;
    let fy = waypoints[0].y;

    for (let i = 0; i < waypoints.length; i++) {
      if (cancelled) break;
      const wp = waypoints[i];
      const prevX = fx;
      const prevY = fy;
      const dx = wp.x - prevX;

      if (dx !== 0) {
        heroInner.setAttribute('transform', `scale(${dx < 0 ? -1 : 1},1)`);
      }

      const steps = 4;
      for (let s = 1; s <= steps; s++) {
        if (cancelled) break;
        fx = lerp(prevX, wp.x, s / steps);
        fy = lerp(prevY, wp.y, s / steps);
        hero.setAttribute('transform', `translate(${fx},${fy})`);
        await sleep(14);
      }
      hero.setAttribute('transform', `translate(${wp.x},${wp.y})`);

      if (wp.count > 0 && !cancelled) {
        await attack(wp.wi, wp.ri, wp.count);
      }
    }

    if (!cancelled) {
      const end = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      end.textContent = `Quest complete! ${score} damage dealt, ${kills} days conquered, level ${level}`;
      end.setAttribute('x', W / 2 + PAD);
      end.setAttribute('y', H / 2 + PAD);
      end.setAttribute('text-anchor', 'middle');
      end.setAttribute('fill', '#39d353');
      end.setAttribute('font-size', '16');
      end.setAttribute('font-weight', 'bold');
      end.classList.add('rpg-end');
      effectsLayer.appendChild(end);
    }
    running = false;
    ctlBtn.textContent = 'Replay';
    ctlBtn.title = 'Replay the quest';
  }

  let started = false;
  let paused = false;

  const startAnim = () => {
    if (started) return;
    started = true;
    animate();
  };

  if (typeof IntersectionObserver !== 'undefined') {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) startAnim();
          paused = !entry.isIntersecting;
        }
      },
      { rootMargin: '0px 0px -25% 0px', threshold: 0.05 },
    );
    io.observe(holder);
  } else {
    startAnim();
  }
}

function escapeHtml(text) {
  return String(text ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

async function main() {
  const data = window.APP_DATA;
  if (!data || !data.profile) {
    throw new Error('no baked data — run `make run`');
  }
  const profile = data.profile || {};
  const tech = data.tech || [];
  const user = data.user || null;
  const repos = Array.isArray(data.repos) ? data.repos : [];
  const contributions = data.contributions;
  const orgs = Array.isArray(data.orgs) ? data.orgs : [];

  renderTechStack(tech);
  renderProfile(profile, user);
  renderLanguages(repos);
  renderRpg(contributions);
  renderOrganizations(orgs);

  $('source').textContent =
    'Edson CS';
}

main().catch((err) => {
  const hint = /^file:/.test(location.protocol)
    ? 'Opening via file:// — run `make run` then open http://localhost:8080'
    : `Run \`make run\` to bake the data in (${err.message})`;
  $('name').textContent = 'Failed to load';
  $('source').textContent = hint;
  for (const id of ['tech', 'languages', 'rpg', 'orgs']) {
    const el = $(id);
    if (el) el.innerHTML = `<p class="empty">${hint}</p>`;
  }
  console.error(err);
});
