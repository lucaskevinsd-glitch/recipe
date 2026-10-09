/* FoodAtlas v2 — 通用 UI 组件 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TYPE_LABEL = { recipe: '菜谱', baking: '烘焙', drink: '饮品', ingredient: '食材', technique: '技巧', culture: '文化' };
  const TYPE_ROUTE = { recipe: 'recipe', baking: 'baking', drink: 'drink', ingredient: 'ingredient', technique: 'technique', culture: 'culture' };

  function imgTag(src, alt, cls) {
    if (src) return `<img src="${esc(src)}" alt="${esc(alt || '')}" loading="lazy" onerror="this.parentNode.innerHTML='<div class=&quot;img-fallback&quot;>食见</div>'">`;
    const ch = (alt || '食').trim().charAt(0) || '食';
    return `<div class="img-fallback">${esc(ch)}</div>`;
  }

  function routeOf(type, id) { return '#/' + TYPE_ROUTE[type] + '/' + encodeURIComponent(id); }

  function metaBadges(item, type) {
    const b = [];
    if (item.category) b.push(`<span class="badge">${esc(item.category)}</span>`);
    if (item.level) b.push(`<span class="badge green">${esc(item.level)}</span>`);
    const t = totalTime(item);
    if (t) b.push(`<span class="badge">⏱ ${t} 分钟</span>`);
    return b.join('');
  }
  function totalTime(item) {
    const t = (item.prepTime || 0) + (item.cookTime || 0);
    return t > 0 ? t : 0;
  }

  function card(item, type) {
    return `<a class="card" href="${routeOf(type, item.id)}">
      <div class="card-img">${imgTag(item.image, item.name || item.title)}</div>
      <div class="card-body">
        <div class="card-title">${esc(item.name || item.title)}</div>
        ${item.summary ? `<div class="card-desc">${esc(item.summary)}</div>` : ''}
        <div class="meta-row">${metaBadges(item, type)}</div>
      </div></a>`;
  }

  function sectionHead(kicker, title, moreHref, moreText) {
    return `<div class="section-head"><div><div class="kicker">${esc(kicker)}</div><h2>${esc(title)}</h2></div>
      ${moreHref ? `<a class="more" href="${moreHref}">${esc(moreText || '查看全部 →')}</a>` : ''}</div>`;
  }

  function empty(icon, text, action) {
    return `<div class="empty-state"><div class="e-ic">${icon}</div><p>${esc(text)}</p>${action || ''}</div>`;
  }

  function pageHead(kicker, title, sub) {
    return `<div class="section" style="margin-top:8px"><div class="kicker">${esc(kicker)}</div>
      <h1 style="font-family:var(--font-d);font-size:30px;margin:6px 0 8px">${esc(title)}</h1>
      ${sub ? `<p class="section-sub" style="margin:0">${esc(sub)}</p>` : ''}</div>`;
  }

  function favBtn(type, id) {
    const on = FA.store.isFav(type, id);
    return `<button class="btn ghost sm" data-fav="${type}:${esc(id)}">${on ? '★ 已收藏' : '☆ 收藏'}</button>`;
  }

  let toastTimer = null;
  function toast(msg) {
    let el = document.querySelector('.toast');
    if (!el) { el = document.createElement('div'); el.className = 'toast'; document.body.appendChild(el); }
    el.textContent = msg; el.classList.add('show');
    clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
  }

  // 全局委托: 收藏按钮
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-fav]');
    if (!b) return;
    const [type, id] = b.dataset.fav.split(':');
    const added = FA.store.toggleFav(type, id);
    b.innerHTML = added ? '★ 已收藏' : '☆ 收藏';
    toast(added ? '已加入收藏' : '已取消收藏');
  });

  FA.ui = { esc, imgTag, routeOf, card, sectionHead, empty, pageHead, favBtn, toast, totalTime, TYPE_LABEL };
})();
