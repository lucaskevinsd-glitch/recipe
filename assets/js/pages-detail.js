/* FoodAtlas v2 — 详情页 (菜谱/烘焙/饮品/食材) + 烹饪模式 */
(function () {
  const { esc, imgTag } = FA.ui;

  // 饮品关键参数的英文键名 → 中文展示名(中文键名原样展示)
  const PARAM_LABEL = { sweet: '甜度', ice: '冰量', strength: '浓度' };

  function hero(item, title, alias) {
    return `<div class="detail-hero">${item.image ? imgTag(item.image, title, null, { eager: true, fetchPriority: true, width: 800, height: 450 }) : `<div class="dh-fallback">${esc(title)}</div>`}</div>
    <div class="detail-head"><div class="kicker">${esc(item.category || '')}</div>
    <h1>${esc(title)}</h1>${alias ? `<div class="alias">${esc(alias)}</div>` : ''}
    <p style="color:var(--ink2);margin-top:8px">${esc(item.summary || '')}</p></div>`;
  }

  // 详情页顶部信息: 语义化结构,桌面端渲染为徽章,移动端渲染为紧凑信息行
  // 主要信息: 难度/总耗时/份量;次要: 准备/制作时间;标签独立一行
  function metaBadges(item) {
    const primary = [];
    if (item.level) primary.push(`<span class="mi mi-level">${esc(item.level)}</span>`);
    const t = FA.ui.totalTime(item);
    if (t) primary.push(`<span class="mi">⏱ ${t} 分钟</span>`);
    if (item.servings) primary.push(`<span class="mi">${item.servings} 人份</span>`);
    const sub = [];
    if (item.prepTime) sub.push(`准备 ${item.prepTime} 分钟`);
    if (item.cookTime) sub.push(`制作 ${item.cookTime} 分钟`);
    const tags = (item.tags || []).map(t => `<span class="mtag">${esc(t)}</span>`).join('');
    return `<div class="meta-block"><div class="meta-line">${primary.join('<i>·</i>')}${sub.length ? `<span class="mi-sub">${sub.join(' · ')}</span>` : ''}</div>${tags ? `<div class="meta-tags">${tags}</div>` : ''}</div>`;
  }

  // 烘焙步骤用时常含发酵/冷藏/晾凉等被动等待,合计会大于页头的主动操作时间(准备+制作),加注说明避免混淆
  function passiveNote(item) {
    const sum = (item.stepTimes || []).reduce((a, b) => a + (+b || 0), 0);
    const active = (+item.prepTime || 0) + (+item.cookTime || 0);
    if (sum > active && active > 0) {
      return `<p style="font-size:13px;color:var(--muted);margin:10px 0 0">⏱ 步骤用时合计约 ${sum} 分钟,其中主动操作约 ${active} 分钟,另含发酵 / 冷藏 / 晾凉等被动等待约 ${sum - active} 分钟。</p>`;
    }
    return '';
  }

  function tipsBox(title, items) {
    if (!items || !items.length) return '';
    return `<div class="tip-box"><h4>${title}</h4><ul>${items.map(t => `<li>${esc(t)}</li>`).join('')}</ul></div>`;
  }

  function faqHtml(faq) {
    if (!faq || !faq.length) return '';
    return `<h3 style="font-family:var(--font-d);margin:22px 0 6px">常见问题</h3>` +
      faq.map(f => `<div class="faq-item"><b>Q: ${esc(f.q)}</b><p>A: ${esc(f.a)}</p></div>`).join('');
  }

  function subsHtml(subs) {
    if (!subs || !subs.length) return '';
    return `<h3 style="font-family:var(--font-d);margin:22px 0 10px">替换建议</h3>` +
      subs.map(s => `<div class="faq-item"><b>${esc(s.from)} → ${esc(s.to)}</b><p>${esc(s.note)}</p></div>`).join('');
  }

  /* ---------- 食材侧栏 (含份量换算) ---------- */
  function ingSide(item, type) {
    const base = item.servings || 3;
    return `<aside class="side-box" id="sec-ing"><h3>食材</h3>
      <div class="serv-ctl"><button id="sv-dec">−</button><span><b id="sv-n">${base}</b> 人份</span><button id="sv-inc">＋</button></div>
      <ul class="ing-list" id="ing-list"></ul>
      <div id="sv-note" style="font-size:12px;color:var(--muted);margin:8px 0"></div>
      <button class="btn soft sm block" id="ing-to-shop">把缺少的加入购物清单</button>
      <button class="btn ghost sm block" id="ing-to-fridge" style="margin-top:8px">把已有的记入冰箱</button>
    </aside>`;
  }
  function bindIngSide(item, type) {
    const raw = item.ingredients || [];
    const base = item.servings || 3;
    let cur = base;
    const render = () => {
      const f = cur / base;
      const infos = FA.tools.scaleInfo(raw, f);
      document.getElementById('sv-n').textContent = cur;
      document.getElementById('ing-list').innerHTML = infos.map((r, i) => {
        const badge = (r.factorChanged && (r.state === 'unscaled' || r.state === 'missing')) ? ' <span class="badge terra">未换算</span>' : '';
        const origNote = (r.state === 'scaled' && r.orig) ? ` <span class="amt-orig">（原 ${esc(r.orig)}）</span>` : '';
        return `<li class="ing-item"><input type="checkbox" data-ing="${i}"><span class="ing-name">${esc(r.name)}${r.note ? `<span style="color:var(--muted)">（${esc(r.note)}）</span>` : ''}</span><span class="amt">${esc(r.text)}${origNote}${badge}</span></li>`;
      }).join('');
      document.getElementById('sv-note').textContent = f === 1 ? '' : `已按 ${f.toFixed(2)} 倍换算；盐、酵母等调料按非线性换算，计数单位已取整到半个，标注“未换算”的项目保持原量`;
      document.querySelectorAll('#ing-list input').forEach(c => c.onchange = () => c.closest('.ing-item').classList.toggle('done', c.checked));
    };
    document.getElementById('sv-dec').onclick = () => { if (cur > 1) { cur--; render(); } };
    document.getElementById('sv-inc').onclick = () => { if (cur < 24) { cur++; render(); } };
    const checkedNames = () => [...document.querySelectorAll('#ing-list input:checked')].map(c => raw[+c.dataset.ing])
      .map(x => typeof x === 'string' ? x : x.name);
    document.getElementById('ing-to-shop').onclick = () => {
      // 加入范围与原行为一致 (未勾选且冰箱没有); 用量取当前份量的 scaleInfo 结果, 以配方为来源幂等写入
      const have = new Set(checkedNames());
      const infos = FA.tools.scaleInfo(raw, cur / base);
      let added = 0;
      raw.forEach((x, i) => {
        const nm = typeof x === 'string' ? x : x.name;
        if (have.has(nm) || FA.store.fridgeHas(nm)) return;
        const r = infos[i];
        FA.store.shopAddSource(nm, {
          key: `${type}:${item.id}`, from: type, label: item.name,
          text: r.orig == null ? '' : r.text, num: r.num, unit: r.unit,
        });
        added++;
      });
      if (!added) { FA.ui.toast('食材齐了，无需购买'); return; }
      FA.ui.toast(`已将 ${added} 样加入购物清单`);
    };
    document.getElementById('ing-to-fridge').onclick = () => {
      const names = checkedNames();
      if (!names.length) { FA.ui.toast('先勾选已有的食材'); return; }
      names.forEach(n => FA.store.fridgeAdd(n, '', '', ''));
      FA.ui.toast(`已记入冰箱 ${names.length} 样`);
    };
    render();
  }

  function relatedCards(title, cards, id) {
    if (!cards.length) return '';
    return `<section class="section"${id ? ` id="${id}"` : ''}><h3 style="font-family:var(--font-d);margin-bottom:14px">${title}</h3><div class="hscroll">${cards}</div></section>`;
  }

  // 页内导航: 用按钮 + scrollIntoView, 不改 location.hash (hash 路由会把 #sec-* 当成未知路由)
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-jump]');
    if (!b) return;
    const el = document.getElementById(b.dataset.jump);
    if (el) el.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
  });

  function findRelatedRecipes(item, type, n) {
    const pool = type === 'drink' ? FA.data.list('drink') : FA.data.list('recipe');
    return pool.filter(x => x.id !== item.id && x.category === item.category).slice(0, n || 4);
  }

  /* ================= 菜谱详情 ================= */
  function recipeDetail(id) {
    const item = FA.data.get('recipe', id);
    if (!item) return FA.pagesContent.notFound();
    FA.store.pushRecent('recipe', id);
    document.title = item.name + ' - 食见 FoodAtlas';
    const relIng = (item.relatedIngredients || []).map(n => FA.data.list('ingredient').find(x => x.name === n)).filter(Boolean).slice(0, 8);
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias)}${metaBadges(item)}
      <div class="detail-actions">${FA.ui.favBtn('recipe', id)}
        <button class="btn sm" id="cook-go">👨‍🍳 进入烹饪模式</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-ing">食材</button><button data-jump="sec-steps">制作步骤</button>${item.tips && item.tips.length ? '<button data-jump="sec-tips">关键技巧</button>' : ''}${item.faq && item.faq.length ? '<button data-jump="sec-faq">常见问题</button>' : ''}${item.subs && item.subs.length ? '<button data-jump="sec-subs">替换建议</button>' : ''}</nav>
      <div class="detail-cols">${ingSide(item, 'recipe')}
        <div>
          <h3 id="sec-steps" style="font-family:var(--font-d);margin-bottom:12px">制作步骤</h3>
          <ol class="step-list">${(item.steps || []).map((s, i) =>
            `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${item.tips && item.tips.length ? `<div id="sec-tips">${tipsBox('💡 关键技巧', item.tips)}</div>` : ''}${item.faq && item.faq.length ? `<div id="sec-faq">${faqHtml(item.faq)}</div>` : ''}${item.subs && item.subs.length ? `<div id="sec-subs">${subsHtml(item.subs)}</div>` : ''}
          ${item.benefits ? `<h3 style="font-family:var(--font-d);margin:22px 0 6px">营养与功效</h3><p style="color:var(--ink2)">${esc(item.benefits)}</p>` : ''}
        </div></div>
      ${relatedCards('相关食材', relIng.map(x => FA.ui.card(x, 'ingredient')))}
      ${relatedCards('同类菜谱', findRelatedRecipes(item, 'recipe').map(x => FA.ui.card(x, 'recipe')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    bindIngSide(item, 'recipe');
    document.getElementById('cook-go').onclick = () => cookMode(item, 'recipe');
    document.getElementById('log-quick').onclick = () => {
      FA.store.logAdd({ title: item.name, refType: 'recipe', refId: id, rating: 5, note: '' });
      FA.ui.toast('已记录这次制作');
    };
  }

  /* ================= 烘焙详情 ================= */
  function bakingDetail(id) {
    const item = FA.data.get('baking', id);
    if (!item) return FA.pagesContent.notFound();
    FA.store.pushRecent('baking', id);
    document.title = item.name + ' - 食见 FoodAtlas';
    const formula = item.formula && item.formula.length ? item.formula :
      (item.ingredients || []).map(x => ({ name: typeof x === 'string' ? x : x.name, grams: null, percent: null, note: '' }));
    // 烘焙百分比只对有面粉结构基准的配方有意义;无有效百分比时隐藏该列,避免误导(如蛋挞400%糖)
    const showPercent = formula.some(x => x.percent != null);
    const base = item.servings || 3;
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias)}${metaBadges(item)}${passiveNote(item)}
      ${item.sweetness || item.texture ? `<div class="meta-row"><span class="badge gold">甜度 ${esc(item.sweetness || '—')}</span><span class="badge gold">口感 ${esc(item.texture || '—')}</span></div>` : ''}
      <div class="detail-actions">${FA.ui.favBtn('baking', id)}
        <button class="btn sm" id="cook-go">👨‍🍳 进入烹饪模式</button>
        <button class="btn ghost sm" id="bk-to-shop">🛒 加入购物清单</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-formula">配方</button><button data-jump="sec-steps">制作步骤</button>${item.troubleshoot && item.troubleshoot.length ? '<button data-jump="sec-trouble">失败排查</button>' : ''}${item.faq && item.faq.length ? '<button data-jump="sec-faq">常见问题</button>' : ''}${item.subs && item.subs.length ? '<button data-jump="sec-subs">替换建议</button>' : ''}</nav>
      <h3 id="sec-formula" style="font-family:var(--font-d);margin:18px 0 10px">配方${showPercent ? '（烘焙百分比）' : ''}</h3>
      <div class="serv-ctl"><button id="bk-dec">−</button><span><b id="bk-n">${base}</b> 人份</span><button id="bk-inc">＋</button></div>
      <div id="bk-note" style="font-size:12px;color:var(--muted);margin:8px 0"></div>
      <div id="bk-formula"></div>
      <p style="font-size:12.5px;color:var(--muted);margin-top:10px">提示：份量变化不会自动调整烤盘尺寸。面糊厚度可能变化，请根据实际状态观察并调整烘焙时间。</p>
      <div class="form-row" style="margin:16px 0">
        ${item.pan ? `<div class="field"><label>模具</label><div style="font-size:15px">${esc(item.pan)}</div></div>` : ''}
        ${item.oven && item.oven.temp ? `<div class="field"><label>烤箱</label><div style="font-size:15px">${item.oven.temp}°C${item.oven.preheat ? '（预热）' : ''} · 约 ${item.oven.time || '—'} 分钟${item.oven.note ? ' · ' + esc(item.oven.note) : ''}</div></div>` : ''}
        ${item.ferment ? `<div class="field"><label>发酵</label><div style="font-size:15px">${esc(item.ferment)}</div></div>` : ''}
        ${item.yield ? `<div class="field"><label>成品</label><div style="font-size:15px">${esc(item.yield)}</div></div>` : ''}
      </div>
      ${item.doneness ? `<div class="tip-box"><h4>成品判断</h4><p>${esc(item.doneness)}</p></div>` : ''}
      <h3 id="sec-steps" style="font-family:var(--font-d);margin:18px 0 12px">制作步骤</h3>
      <ol class="step-list">${(item.steps || []).map((s, i) =>
        `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
      ${tipsBox('💡 关键技巧', item.tips)}
      ${item.troubleshoot && item.troubleshoot.length ? `<div id="sec-trouble"><h3 style="font-family:var(--font-d);margin:22px 0 6px">失败排查</h3>` +
        item.troubleshoot.map(t => `<div class="faq-item"><b>${esc(t.problem)}</b><p>原因：${esc(t.cause)}<br>解决：${esc(t.fix)}</p></div>`).join('') + `</div>` : ''}
      ${item.faq && item.faq.length ? `<div id="sec-faq">${faqHtml(item.faq)}</div>` : ''}${item.subs && item.subs.length ? `<div id="sec-subs">${subsHtml(item.subs)}</div>` : ''}
      ${relatedCards('同类烘焙', findRelatedRecipes(item, 'baking').map(x => FA.ui.card(x, 'baking')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    // 份量换算: 统一走 FA.tools.scaleInfo (二阶段设计规范), 每次从原始数据按当前倍率计算, 无累计误差。
    // 烘焙规则 (amount 优先; amount 不可解析则保留原文不回退 grams; 无 amount 以 grams 为基准;
    // percent 透传不缩放; totalDough 用 fmtNum) 由 scaleInfo 的 kind:'baking' 保证。
    let cur = base;
    const renderBk = () => {
      const f = cur / base;
      document.getElementById('bk-n').textContent = cur;
      const infos = FA.tools.scaleInfo(formula, f, { kind: 'baking' });
      const badge = r => (r.factorChanged && (r.state === 'unscaled' || r.state === 'missing')) ? ' <span class="badge terra">未换算</span>' : '';
      const origNote = r => (r.state === 'scaled' && r.orig) ? ` <span class="amt-orig">（原 ${esc(r.orig)}）</span>` : '';
      const rows = formula.map((x, i) => {
        const r = infos[i];
        return `<tr><td>${esc(x.name)}</td><td>${esc(r.text)}${origNote(r)}${badge(r)}</td>${showPercent ? `<td>${x.percent == null ? '—' : x.percent + '%'}</td>` : ''}<td style="color:var(--muted)">${esc(x.note || '')}</td></tr>`;
      }).join('');
      const cards = formula.map((x, i) => {
        const r = infos[i];
        const sub = [showPercent && x.percent != null ? `烘焙百分比 ${x.percent}%` : '', x.note || ''].filter(Boolean).join(' · ');
        const mark = badge(r) ? `<div class="fsub"><span class="badge terra">未换算</span></div>` : '';
        return `<div class="fcard"><div class="frow"><span class="fname">${esc(x.name)}</span><span class="famt">${esc(r.text)}${origNote(r)}</span></div>${sub ? `<div class="fsub">${esc(sub)}</div>` : ''}${mark}</div>`;
      }).join('');
      const td = (typeof item.totalDough === 'number' && isFinite(item.totalDough))
        ? `<p style="font-size:13.5px;color:var(--muted);margin-top:8px">面团/面糊总重约 ${f === 1 ? item.totalDough : FA.tools.fmtNum(item.totalDough * f)} 克</p>` : '';
      document.getElementById('bk-formula').innerHTML = `<div class="formula-wrap"><table class="formula"><tr><th>原料</th><th>用量</th>${showPercent ? '<th>百分比</th>' : ''}<th>备注</th></tr>${rows}</table><div class="formula-cards">${cards}</div></div>${td}`;
      document.getElementById('bk-note').textContent = f === 1 ? '' : `已按 ${f.toFixed(2)} 倍换算；盐、酵母等调料按非线性规则换算，计数单位已取整到半个，标注“未换算”的项目保持原量`;
    };
    document.getElementById('bk-dec').onclick = () => { if (cur > 1) { cur--; renderBk(); } };
    document.getElementById('bk-inc').onclick = () => { if (cur < 24) { cur++; renderBk(); } };
    document.getElementById('bk-to-shop').onclick = () => {
      // 与菜谱详情一致: 冰箱已有的不加入; 用量取当前份量, 以本配方为来源幂等写入 (重复点击只更新不累加)
      const infos = FA.tools.scaleInfo(formula, cur / base, { kind: 'baking' });
      let added = 0;
      formula.forEach((x, i) => {
        if (FA.store.fridgeHas(x.name)) return;
        const r = infos[i];
        FA.store.shopAddSource(x.name, {
          key: `baking:${id}`, from: 'baking', label: item.name,
          text: r.orig == null ? '' : r.text, num: r.num, unit: r.unit,
        });
        added++;
      });
      FA.ui.toast(added ? `已将 ${added} 样加入购物清单` : '食材齐了，无需购买');
    };
    renderBk();
    document.getElementById('cook-go').onclick = () => cookMode(item, 'baking');
    document.getElementById('log-quick').onclick = () => {
      FA.store.logAdd({ title: item.name, refType: 'baking', refId: id, rating: 5, note: '' });
      FA.ui.toast('已记录这次制作');
    };
  }

  /* ================= 饮品详情 ================= */
  function drinkDetail(id) {
    const item = FA.data.get('drink', id);
    if (!item) return FA.pagesContent.notFound();
    FA.store.pushRecent('drink', id);
    document.title = item.name + ' - 食见 FoodAtlas';
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias)}${metaBadges(item)}
      ${item.tastes && item.tastes.length ? `<div class="meta-row">${item.tastes.map(t => `<span class="badge gold">${esc(t)}</span>`).join('')}${item.temp ? `<span class="badge">${esc(item.temp)}</span>` : ''}</div>` : ''}
      <div class="detail-actions">${FA.ui.favBtn('drink', id)}
        <button class="btn sm" id="cook-go">👨‍🍳 进入制作模式</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-ing">食材</button><button data-jump="sec-steps">制作步骤</button>${item.params && Object.keys(item.params).length ? '<button data-jump="sec-params">关键参数</button>' : ''}</nav>
      <div class="detail-cols">${ingSide(item, 'drink')}
        <div>
          <h3 id="sec-steps" style="font-family:var(--font-d);margin-bottom:12px">制作步骤</h3>
          <ol class="step-list">${(item.steps || []).map((s, i) =>
            `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${item.params && Object.keys(item.params).length ? `<div id="sec-params"><div class="tip-box"><h4>关键参数</h4><ul>${Object.entries(item.params).map(([k, v]) => `<li>${esc(PARAM_LABEL[k] || k)}：${esc(v)}</li>`).join('')}</ul></div></div>` : ''}
          ${tipsBox('💡 关键技巧', item.tips)}${faqHtml(item.faq)}
          ${item.benefits ? `<h3 style="font-family:var(--font-d);margin:22px 0 6px">营养与功效</h3><p style="color:var(--ink2)">${esc(item.benefits)}</p>` : ''}
        </div></div>
      ${relatedCards('同类饮品', findRelatedRecipes(item, 'drink').map(x => FA.ui.card(x, 'drink')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    bindIngSide(item, 'drink');
    document.getElementById('cook-go').onclick = () => cookMode(item, 'drink');
    document.getElementById('log-quick').onclick = () => {
      FA.store.logAdd({ title: item.name, refType: 'drink', refId: id, rating: 5, note: '' });
      FA.ui.toast('已记录这次制作');
    };
  }

  /* ================= 食材详情 ================= */
  function ingredientDetail(id) {
    const item = FA.data.get('ingredient', id);
    if (!item) return FA.pagesContent.notFound();
    FA.store.pushRecent('ingredient', id);
    document.title = item.name + ' - 食见 FoodAtlas';
    // 适用菜谱: 配料名包含该食材名
    const usedIn = [...FA.data.list('recipe'), ...FA.data.list('drink')].filter(r =>
      (r.ingredients || []).some(x => { const n = typeof x === 'string' ? x : x.name; return n && (n.includes(item.name) || item.name.includes(n)); })).slice(0, 8);
    const subs = FA.data.DB.substitutions.filter(s => s.match.includes(item.name) || s.to.includes(item.name)).slice(0, 6);
    const sameCat = FA.data.list('ingredient').filter(x => x.cat === item.cat && x.id !== id).slice(0, 8);
    const sec = (t, c, id) => c ? `<div id="${id}"><h3 style="font-family:var(--font-d);margin:22px 0 8px">${t}</h3><p style="color:var(--ink2)">${esc(c)}</p></div>` : '';
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias ? '别名：' + item.alias : '')}
      <div class="meta-row" style="margin:12px 0"><span class="badge green">${esc(item.cat)}</span>${item.nutrient ? `<span class="badge gold">${esc(item.nutrient)}</span>` : ''}</div>
      <div class="detail-actions">${FA.ui.favBtn('ingredient', id)}
        <a class="btn ghost sm" href="#/tools/substitute?q=${encodeURIComponent(item.name)}">查替换方案</a></div>
      <nav class="detail-nav" aria-label="页面导航">${item.texture ? '<button data-jump="sec-texture">选购</button>' : ''}${item.nutrientText || item.nutrient ? '<button data-jump="sec-nutrient">营养</button>' : ''}${item.cooking ? '<button data-jump="sec-cooking">处理</button>' : ''}${item.storage ? '<button data-jump="sec-storage">保存</button>' : ''}${subs.length ? '<button data-jump="sec-subs">替代关系</button>' : ''}${usedIn.length ? '<button data-jump="sec-used">用它做的菜</button>' : ''}${sameCat.length ? '<button data-jump="sec-same">同类食材</button>' : ''}</nav>
      ${item.lead ? `<p class="lead" style="font-size:18px;color:var(--ink2);margin:14px 0">${esc(item.lead)}</p>` : ''}
      ${sec('🔍 选购与形态', item.texture, 'sec-texture')}${sec('🥗 营养亮点', item.nutrientText || item.nutrient, 'sec-nutrient')}
      ${sec('🍳 处理与烹饪', item.cooking, 'sec-cooking')}${sec('❄️ 保存方法', item.storage, 'sec-storage')}
      ${subs.length ? `<div id="sec-subs"><h3 style="font-family:var(--font-d);margin:22px 0 10px">可替代关系</h3>` +
        subs.map(s => `<div class="faq-item"><b>${esc(s.match)} → ${esc(s.to)}</b><p>用量比 ${esc(s.ratio)}；${esc(s.note)}</p></div>`).join('') + `</div>` : ''}
      ${relatedCards('用它做的菜', usedIn.map(x => FA.ui.card(x, FA.data.byId.get(x.id).type)), 'sec-used')}
      ${relatedCards('同类食材', sameCat.map(x => FA.ui.card(x, 'ingredient')), 'sec-same')}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
  }

  /* ================= 烹饪模式 ================= */
  function cookMode(item, type) {
    const steps = item.steps || [];
    if (!steps.length) { FA.ui.toast('暂无步骤'); return; }
    let idx = 0, left = 0, iv = null;
    const stepTime = i => (item.stepTimes && item.stepTimes[i]) || 0;
    const overlay = document.createElement('div');
    overlay.className = 'cookmode';
    const render = () => {
      const mm = String(Math.floor(left / 60)).padStart(2, '0'), ss = String(left % 60).padStart(2, '0');
      overlay.innerHTML = `
        <div class="cm-top"><h3>${esc(item.name)}</h3><span style="margin-left:auto;opacity:.6">${idx + 1} / ${steps.length}</span>
          <button id="cm-x" style="background:none;border:none;color:#F2F4E9;font-size:22px">✕</button></div>
        <div class="cm-body"><div class="cm-stepno">第 ${idx + 1} 步</div>
          <div class="cm-text">${esc(steps[idx])}</div>
          ${stepTime(idx) ? `<div class="cm-timer"><span class="t">${mm}:${ss}</span>
            <button class="btn sm" id="cm-tgo">${iv ? '暂停' : left > 0 && left < stepTime(idx) * 60 ? '继续' : '开始计时'}</button>
            <button class="btn sm ghost" id="cm-trs" style="color:#F2F4E9;background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.3)">重置</button></div>` : ''}
        </div>
        <div class="cm-nav">
          <button class="btn" id="cm-prev" ${idx === 0 ? 'disabled' : ''}>← 上一步</button>
          ${idx === steps.length - 1 ? `<button class="btn primary" id="cm-done">完成 🎉</button>` : `<button class="btn primary" id="cm-next">下一步 →</button>`}
        </div>`;
      document.getElementById('cm-x').onclick = close;
      const pv = document.getElementById('cm-prev'); if (pv) pv.onclick = () => { stopT(); idx--; left = 0; render(); };
      const nx = document.getElementById('cm-next'); if (nx) nx.onclick = () => { stopT(); idx++; left = 0; render(); };
      const dn = document.getElementById('cm-done'); if (dn) dn.onclick = () => {
        stopT(); close();
        FA.store.logAdd({ title: item.name, refType: type, refId: item.id, rating: 5, note: '烹饪模式完成' });
        FA.ui.toast('🎉 完成！已记入制作记录');
      };
      const tg = document.getElementById('cm-tgo');
      if (tg) tg.onclick = () => {
        if (iv) { stopT(); render(); return; }
        if (left <= 0) left = stepTime(idx) * 60;
        iv = setInterval(() => {
          left--;
          if (left <= 0) { stopT(); left = 0; try { new AudioContext(); } catch (e) {} FA.ui.toast('⏰ 这一步时间到！'); }
          render();
        }, 1000);
        render();
      };
      const rs = document.getElementById('cm-trs'); if (rs) rs.onclick = () => { stopT(); left = 0; render(); };
    };
    const stopT = () => { if (iv) clearInterval(iv); iv = null; };
    const close = () => { stopT(); overlay.remove(); };
    document.addEventListener('keydown', function esc2(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', esc2); } });
    document.body.appendChild(overlay);
    try { navigator.wakeLock && navigator.wakeLock.request('screen'); } catch (e) {}
    render();
  }

  FA.pagesDetail = { recipeDetail, bakingDetail, drinkDetail, ingredientDetail, cookMode };
})();
