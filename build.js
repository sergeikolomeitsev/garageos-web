#!/usr/bin/env node
/**
 * build.js — собирает index.html из content/*.md + templates/shell.html
 *
 *   node build.js
 *
 * Источники истины — content/. Файл index.html переписывается полностью.
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');
const { marked } = require('marked');

const ROOT = __dirname;
const CONTENT_DIR = path.join(ROOT, 'content');
const TEMPLATES_DIR = path.join(ROOT, 'templates');
const OUT_FILE = path.join(ROOT, 'index.html');

// ── helpers ──────────────────────────────────────────────────────────────────

function permCellClass(v) {
  const s = String(v).trim();
  if (s.startsWith('✓')) return 'yes';
  if (s.startsWith('✗')) return 'pt-no';
  return '';
}

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function md(text) {
  // inline markdown без оборачивания в <p>
  return marked.parseInline(text || '');
}

function mdBlock(text) {
  return marked.parse(text || '');
}

// ── section renderers ────────────────────────────────────────────────────────

function renderHero(m) {
  const actions = (m.actions || [])
    .map(a => `<a href="${a.href}" class="btn btn-${a.style || 'primary'}">${escapeHtml(a.label)}</a>`)
    .join('\n    ');
  return `<div class="hero">
  <img src="logo.png" class="hero-logo" alt="GarageOS" />
  <div class="hero-badge">${escapeHtml(m.badge || '')}</div>
  <h1>${escapeHtml(m.title_pre || '')}<br/><span>${escapeHtml(m.title_accent || '')}</span></h1>
  <p>${escapeHtml(m.subtitle || '')}</p>
  <div class="hero-actions">
    ${actions}
  </div>
</div>`;
}

function renderRoles(m) {
  const cols = m.permissions.columns;
  const rows = m.permissions.rows;
  const head = cols.map(c => `<th>${escapeHtml(c)}</th>`).join('');
  const body = rows.map(r => {
    const cells = r.map((cell, idx) => {
      if (idx === 0) return `<td>${escapeHtml(cell)}</td>`;
      const cls = permCellClass(cell);
      return `<td class="${cls}">${escapeHtml(cell)}</td>`;
    }).join('');
    return `<tr>${cells}</tr>`;
  }).join('\n        ');
  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>
  <div class="section-sub">${escapeHtml(m.subtitle)}</div>
  <div class="perm-table-wrap">
    <table class="perm-table">
      <thead>
        <tr>${head}</tr>
      </thead>
      <tbody>
        ${body}
      </tbody>
    </table>
  </div>
</section>`;
}

function renderInviteFlow(items) {
  const steps = items.map((text, i) => `
    <div class="invite-step">
      <div class="invite-step-num">${i + 1}</div>
      <div class="invite-step-text">${text}</div>
    </div>`).join('');
  return `<div class="invite-flow" style="margin-top: 16px;">
  <div class="invite-steps">${steps}
  </div>
</div>`;
}

function renderSteps(m) {
  const steps = m.steps.map((s, i) => {
    const invite = s.invite_flow ? `\n        ${renderInviteFlow(s.invite_flow)}` : '';
    return `    <div class="step">
      <div class="step-num">${i + 1}</div>
      <div class="step-body">
        <h3>${escapeHtml(s.title)}</h3>
        <p>${s.body}</p>${invite}
      </div>
    </div>`;
  }).join('\n');
  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>
  <div class="section-sub">${escapeHtml(m.subtitle)}</div>
  <div class="steps">
${steps}
  </div>
</section>`;
}

function renderTgBlocks(blocks) {
  return blocks.map(b => {
    if (b.type === 'text') return `<p class="tg-step-desc">${b.html}</p>`;
    if (b.type === 'highlight') return `<div class="tg-highlight">${escapeHtml(b.text)}</div>`;
    if (b.type === 'list') {
      const items = b.items.map(i => `<li>${i}</li>`).join('');
      return `<ul style="margin: 8px 0 8px 16px; font-size:14px; color: var(--label2); line-height:1.7">${items}</ul>`;
    }
    return '';
  }).join('\n        ');
}

function renderTgSteps(m) {
  const total = m.tg_steps.length;
  const tgSteps = m.tg_steps.map((s, i) => {
    const line = i < total - 1 ? '<div class="tg-step-line"></div>' : '';
    return `<div class="tg-step">
      <div class="tg-step-left">
        <div class="tg-step-circle">${s.icon}</div>
        ${line}
      </div>
      <div class="tg-step-body">
        <span class="tg-step-num">${i + 1}</span>
        <span class="tg-step-title">${escapeHtml(s.title)}</span>
        ${renderTgBlocks(s.blocks)}
      </div>
    </div>`;
  }).join('\n    ');

  const where = m.where_box ? `<div class="tg-where-box">
  <div class="tg-where-icon">${m.where_box.icon}</div>
  <div>
    <div class="tg-where-title">${escapeHtml(m.where_box.title)}</div>
    <div class="tg-where-desc">${m.where_box.body_html}</div>
  </div>
</div>` : '';

  let botSection = '';
  if (m.bot_section) {
    const bs = m.bot_section;
    const scenarioItems = bs.scenario.map((t, i) => `
      <div class="invite-step">
        <div class="invite-step-num">${i + 1}</div>
        <div class="invite-step-text">${t}</div>
      </div>`).join('');
    const cards = bs.cards.map(c => `<div class="role-card" style="padding: 16px 20px;">
  <div style="font-size: 22px; margin-bottom: 8px;">${c.icon}</div>
  <div style="font-size: 14px; font-weight: 600; margin-bottom: 6px;">${escapeHtml(c.title)}</div>
  <div style="font-size: 13px; color: var(--label2);">${escapeHtml(c.desc)}</div>
</div>`).join('\n      ');
    botSection = `

  <div style="margin-top: 56px;">
    <div class="section-label">${escapeHtml(bs.label)}</div>
    <div class="section-title" style="font-size: clamp(18px, 3.5vw, 26px); margin-top: 8px; margin-bottom: 8px;">${escapeHtml(bs.title)}</div>
    <div class="section-sub" style="margin-bottom: 32px;">${escapeHtml(bs.subtitle)}</div>

    <div class="invite-flow">
      <div class="invite-flow-title">${escapeHtml(bs.scenario_title)}</div>
      <div class="invite-steps">${scenarioItems}
      </div>
    </div>

    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; margin-top: 20px;">
      ${cards}
    </div>
  </div>`;
  }

  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>
  <div class="section-sub">${escapeHtml(m.subtitle)}</div>

  <div class="tg-steps">
    ${tgSteps}
  </div>

  ${where}${botSection}
</section>`;
}

function renderStatuses(m) {
  const chips = m.flow.map((s, i) => {
    const chip = `<span class="status-chip" style="color:${s.color};background:${s.bg};border-color:${s.border};">${escapeHtml(s.name)}</span>`;
    const arrow = i < m.flow.length - 1 ? '\n    <span class="status-arrow">→</span>' : '';
    return `    ${chip}${arrow}`;
  }).join('\n');

  const rows = m.table.map((r, i) => {
    const last = i === m.table.length - 1;
    const borderStyle = last ? '' : ' style="border-bottom: 1px solid var(--border);"';
    return `<tr${borderStyle}>
          <td style="padding: 12px 16px; font-weight: 600; white-space: nowrap;"><span style="color:${r.color};">${escapeHtml(r.status)}</span></td>
          <td style="padding: 12px 16px; color: var(--label2);">${r.means}</td>
          <td style="padding: 12px 16px; color: var(--label2);">${r.notify}</td>
          <td style="padding: 12px 16px; color: var(--label2);">${r.transitioner}</td>
        </tr>`;
  }).join('\n        ');

  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>
  <div class="section-sub">${escapeHtml(m.subtitle)}</div>
  <div class="status-flow">
${chips}
  </div>

  <div style="margin-top: 32px; background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden;">
    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
      <thead>
        <tr>
          <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--label2); background: var(--surface2); border-bottom: 1px solid var(--border);">Статус</th>
          <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--label2); background: var(--surface2); border-bottom: 1px solid var(--border);">Что означает</th>
          <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--label2); background: var(--surface2); border-bottom: 1px solid var(--border);">Уведомление клиенту</th>
          <th style="padding: 12px 16px; text-align: left; font-size: 12px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--label2); background: var(--surface2); border-bottom: 1px solid var(--border);">Кто переводит</th>
        </tr>
      </thead>
      <tbody>
        ${rows}
      </tbody>
    </table>
  </div>
</section>`;
}

function renderFaq(m, body) {
  // Каждый ### Question — отдельный details. Тело между ### до следующего ### — ответ.
  const sections = body.split(/^###\s+/m).filter(s => s.trim());
  const details = sections.map(sec => {
    const lines = sec.split('\n');
    const question = lines[0].trim();
    const answer = lines.slice(1).join('\n').trim();
    const answerHtml = mdBlock(answer);
    return `<details>
    <summary>${escapeHtml(question)}</summary>
    <div class="faq-body">
      ${answerHtml}
    </div>
  </details>`;
  }).join('\n\n  ');

  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>

  ${details}
</section>`;
}

function renderContact(m, config) {
  return `<section id="${m.id}">
  <div class="section-label">${escapeHtml(m.section_label)}</div>
  <div class="section-title">${escapeHtml(m.title)}</div>
  <div class="contact-card">
    <div style="font-size:40px">${m.icon}</div>
    <h3>${escapeHtml(m.heading)}</h3>
    <p>${escapeHtml(m.body)}</p>
    <a class="contact-email" href="mailto:${config.support_email}">
      ${config.support_email}
    </a>
  </div>
</section>`;
}

// ── main ─────────────────────────────────────────────────────────────────────

const RENDERERS = {
  hero: renderHero,
  roles: renderRoles,
  steps: renderSteps,
  'tg-steps': renderTgSteps,
  statuses: renderStatuses,
  faq: renderFaq,
  contact: renderContact,
};

function main() {
  const config = JSON.parse(fs.readFileSync(path.join(CONTENT_DIR, '_config.json'), 'utf8'));
  const shell = fs.readFileSync(path.join(TEMPLATES_DIR, 'shell.html'), 'utf8');

  const files = fs.readdirSync(CONTENT_DIR)
    .filter(f => /^\d+.*\.md$/.test(f))
    .sort();

  const sections = [];
  const navLinks = [];

  for (const file of files) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf8');
    const { data: meta, content: body } = matter(raw);
    const tpl = meta.template;
    const renderer = RENDERERS[tpl];
    if (!renderer) throw new Error(`Unknown template "${tpl}" in ${file}`);

    let html;
    if (tpl === 'faq') html = renderer(meta, body);
    else if (tpl === 'contact') html = renderer(meta, config);
    else html = renderer(meta);
    sections.push(html);

    if (meta.nav !== false && meta.id && meta.nav_label) {
      navLinks.push(`    <a href="#${meta.id}">${meta.nav_label}</a>`);
    }
  }

  const out = shell
    .replace('{{TITLE}}', config.title)
    .replace('{{DESCRIPTION}}', config.description)
    .replace('{{NAV_LINKS}}', navLinks.join('\n'))
    .replace('{{SECTIONS}}', sections.join('\n\n'))
    .replace('{{FOOTER}}', config.footer.html);

  fs.writeFileSync(OUT_FILE, out, 'utf8');
  console.log(`✓ Built ${OUT_FILE} (${out.length} bytes, ${files.length} sections)`);
}

main();
