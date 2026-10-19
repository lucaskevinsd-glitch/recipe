/* FoodAtlas v2 — 通用 UI 组件 */
(function () {
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  const TYPE_LABEL = { recipe: '菜谱', baking: '烘焙', drink: '饮品', ingredient: '食材', technique: '技巧', culture: '文化' };
  const TYPE_ROUTE = { recipe: 'recipe', baking: 'baking', drink: 'drink', ingredient: 'ingredient', technique: 'technique', culture: 'culture' };

  function thumbUrl(src) {
    // 将原图 URL 转换为缩略图 URL
    // assets/img/recipes/r001.jpg -> assets/img/thumb/recipes/r001.jpg
    // assets/img/full/img0001.webp -> assets/img/thumb/full/img0001.webp
    // 非本地图片路径原样返回
    if (!src || typeof src !== 'string') return src;
    if (!src.startsWith('assets/img/')) return src;
    if (src.includes('/thumb/')) return src; // 已是缩略图
    return src.replace('assets/img/', 'assets/img/thumb/');
  }

  function imgTag(src, alt, cls, opts) {
    if (src) {
      // opts: { eager, fetchPriority, width, height, thumb: boolean }
      // thumb=true 时使用缩略图，加载失败自动回退到原图
      const o = opts || {};
      const loading = o.eager ? 'eager' : 'lazy';
      const fp = o.fetchPriority ? ' fetchpriority="high"' : '';
      const dims = (o.width && o.height) ? ` width="${o.width}" height="${o.height}"` : '';
      let imgSrc = src;
      let onerror = `this.parentNode.innerHTML='<div class=&quot;img-fallback&quot;>食见</div>'`;
      let dataFull = '';
      if (o.thumb) {
        const thumb = thumbUrl(src);
        if (thumb !== src) {
          // 缩略图加载失败时回退到原图，原图失败时显示占位
          imgSrc = thumb;
          onerror = `if(!this.dataset.fb){this.dataset.fb=1;this.src='${esc(src)}';}else{this.parentNode.innerHTML='<div class=&quot;img-fallback&quot;>食见</div>'}`;
          // data-full 供预加载：列表用缩略图，详情页需原图
          dataFull = ` data-full="${esc(src)}"`;
        }
      }
      return `<img src="${esc(imgSrc)}" alt="${esc(alt || '')}" loading="${loading}" decoding="async"${fp}${dims}${dataFull} onerror="${onerror}">`;
    }
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

  function card(item, type, opts) {
    // opts 透传给 imgTag：{ eager, fetchPriority }
    // 卡片图统一 4:3，width/height 防止布局跳动
    // 卡片使用缩略图（thumb=true），加载失败自动回退原图
    const imgOpts = Object.assign({ width: 400, height: 300, thumb: true }, opts || {});
    return `<a class="card" href="${routeOf(type, item.id)}">
      <div class="card-img">${imgTag(item.image, item.name || item.title, null, imgOpts)}</div>
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

    // 图片预加载：详情页主图与列表缩略图是不同资源（原图 vs 缩略图）
  // 列表只加载缩略图（~36K），详情页需要原图（~640K），首次打开需下载原图导致延迟
  // 本机制在列表可见时预加载原图，利用浏览器缓存，详情页打开时直接命中缓存
  const preloaded = new Set();
  let preloadQueue = [];
  let preloadActive = 0;
  const PRELOAD_MAX_CONCURRENT = 3;
  let preloadObserver = null;

  function doPreload(url) {
    if (!url || preloaded.has(url)) return;
    preloaded.add(url);
    preloadActive++;
    const img = new Image();
    img.onload = img.onerror = () => {
      preloadActive--;
      img.onload = img.onerror = null;
      pumpPreloadQueue();
    };
    img.src = url;
  }

  function pumpPreloadQueue() {
    while (preloadActive < PRELOAD_MAX_CONCURRENT && preloadQueue.length > 0) {
      const url = preloadQueue.shift();
      if (!preloaded.has(url)) doPreload(url);
    }
  }

  function queuePreload(url, priority) {
    if (!url || preloaded.has(url)) return;
    const idx = preloadQueue.indexOf(url);
    if (idx >= 0) {
      // 已在队列中：用户点击时提升到队首，优先加载
      if (priority) {
        preloadQueue.splice(idx, 1);
        preloadQueue.unshift(url);
        pumpPreloadQueue();
      }
      return;
    }
    if (priority) preloadQueue.unshift(url);
    else preloadQueue.push(url);
    pumpPreloadQueue();
  }

  function observePreload() {
    if (!('IntersectionObserver' in window)) return;
    if (preloadObserver) preloadObserver.disconnect();
    preloadObserver = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          const full = e.target.getAttribute('data-full');
          if (full) queuePreload(full); // 背景预加载，正常排队
          preloadObserver.unobserve(e.target);
        }
      }
    }, { rootMargin: '200px' });
    document.querySelectorAll('img[data-full]').forEach(img => preloadObserver.observe(img));
  }

  document.addEventListener('pointerdown', (e) => {
    // 从点击目标向上找到卡片，再在卡片内找带 data-full 的图片
    const card = e.target.closest ? e.target.closest('a.card') : null;
    const img = card ? card.querySelector('img[data-full]') : null;
    if (img) {
      const full = img.getAttribute('data-full');
      if (full) queuePreload(full, true); // 用户点击，优先加载
    }
  }, { passive: true });

FA.ui = { esc, imgTag, thumbUrl, routeOf, card, sectionHead, empty, pageHead, favBtn, toast, totalTime, TYPE_LABEL , observePreload, queuePreload };
})();
