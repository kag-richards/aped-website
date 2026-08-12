/* APED CMS content loader
 * Renders the Leadership Team, News/Blog, and editable hero/mission copy
 * from content/*.json (managed via Sveltia at /admin).
 * Progressive enhancement: if any fetch fails, the existing HTML stays as-is,
 * so the site never breaks if a file is missing or the page is opened offline.
 */
(function () {
  'use strict';

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  async function getJSON(path) {
    try {
      var res = await fetch(path, { cache: 'no-cache' });
      if (!res.ok) return null;
      return await res.json();
    } catch (e) { return null; }
  }

  // Minimal, safe Markdown -> HTML. Escapes input first, then applies a small
  // subset: #/##/### headings, **bold**, *italic*, [links](url), - lists.
  function md(src) {
    var lines = String(src || '').replace(/\r\n/g, '\n').split('\n');
    var html = '', inList = false;
    function inline(t) {
      t = esc(t);
      // External links (http/https) open in a new tab; internal ones
      // (news/educating-a-girl/) stay in the same tab so posts can link to
      // pages on this site. Any other scheme (javascript:, data:) is left as
      // plain text rather than turned into a link.
      t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, function (whole, label, url) {
        var external = /^https?:/i.test(url);
        if (!external && /^[a-z][a-z0-9+.-]*:/i.test(url)) return whole;
        return '<a href="' + url + '"' + (external ? ' target="_blank" rel="noopener"' : '') + '>' + label + '</a>';
      });
      t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      t = t.replace(/\*([^*]+)\*/g, '<em>$1</em>');
      return t;
    }
    function closeList() { if (inList) { html += '</ul>'; inList = false; } }
    for (var i = 0; i < lines.length; i++) {
      var line = lines[i].trim();
      if (/^###\s+/.test(line)) { closeList(); html += '<h4>' + inline(line.replace(/^###\s+/, '')) + '</h4>'; }
      else if (/^##\s+/.test(line)) { closeList(); html += '<h3>' + inline(line.replace(/^##\s+/, '')) + '</h3>'; }
      else if (/^#\s+/.test(line)) { closeList(); html += '<h2>' + inline(line.replace(/^#\s+/, '')) + '</h2>'; }
      else if (/^[-*]\s+/.test(line)) { if (!inList) { html += '<ul>'; inList = true; } html += '<li>' + inline(line.replace(/^[-*]\s+/, '')) + '</li>'; }
      else if (line === '') { closeList(); }
      else { closeList(); html += '<p>' + inline(line) + '</p>'; }
    }
    closeList();
    return html;
  }

  async function renderTeam() {
    var data = await getJSON('content/team.json');
    if (!data || !Array.isArray(data.members) || !data.members.length) return;
    var grid = document.querySelector('.team-grid');
    if (!grid) return;
    grid.innerHTML = data.members.map(function (m) {
      var name = esc(m.name), role = esc(m.role);
      var img = m.photo
        ? '<img class="team-photo" width="140" height="140" loading="lazy" decoding="async" src="' + esc(m.photo) + '" alt="' + name + '">'
        : '';
      return '<div class="team-card">' + img +
        '<div class="team-name">' + name + '</div>' +
        '<div class="team-role">' + role + '</div></div>';
    }).join('');
  }

  async function renderCopy() {
    var c = await getJSON('content/site-copy.json');
    if (!c) return;
    if (c.hero_subtext) { var h = document.getElementById('cms-hero-sub'); if (h) h.textContent = c.hero_subtext; }
    if (c.mission) { var mn = document.getElementById('cms-mission'); if (mn) mn.textContent = c.mission; }
  }

  async function renderNews() {
    var list = document.getElementById('news-list');
    if (!list) return;
    var data = await getJSON('content/blog.json');
    var posts = data && Array.isArray(data.posts) ? data.posts.slice() : [];
    if (!posts.length) { list.innerHTML = '<p class="section-sub">No news yet. Check back soon.</p>'; return; }
    posts.sort(function (a, b) { return String(b.date || '').localeCompare(String(a.date || '')); });
    list.innerHTML = posts.map(function (p) {
      var thumb = p.thumbnail
        ? '<img src="' + esc(p.thumbnail) + '" alt="' + esc(p.title) + '" style="max-width:100%;border-radius:12px;margin-bottom:16px;">'
        : '';
      var date = p.date ? '<div style="color:#8a8a8a;font-size:14px;margin-bottom:8px;">' + esc(p.date) + '</div>' : '';
      return '<article class="news-item" style="max-width:760px;margin:0 auto 48px;">' +
        thumb +
        '<h3 style="font-size:26px;margin:0 0 4px;">' + esc(p.title) + '</h3>' +
        date +
        '<div class="news-body">' + md(p.body) + '</div>' +
        '</article>';
    }).join('');
  }

  function init() { renderTeam(); renderCopy(); renderNews(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
