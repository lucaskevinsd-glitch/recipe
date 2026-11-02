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
    const t = FA.ui.totalTime(item);
    // S1 特稿重构: 只改表现层;钩子清单见 ~/workspace/foodatlas-audit/hook-inventory-s1.md
    // 保留: pushRecent/H1, document.title, relIng, 所有 #sec-* 锚点, data-jump 导航,
    // #sv-dec/#sv-inc/#sv-n/#ing-list/#sv-note/#ing-to-shop/#ing-to-fridge,
    // #cook-go/#log-quick, data-fav, relatedCards;绑定逻辑(下)逐行保留
    const html = `<div class="wrap page"><div class="rd-wrap">
      <nav class="rd-crumb" aria-label="面包屑"><a href="#/">食见</a><span class="sep">/</span><a href="#/recipes">菜谱厨房</a><span class="sep">/</span><span>${esc(item.category || '菜谱')}</span></nav>
      <div class="kicker">${esc(item.category || '')} · RECIPE</div>
      <h1 class="rd-title">${esc(item.name)}</h1>
      ${item.alias ? `<div class="rd-alias">别名：${esc(item.alias)}</div>` : ''}
      ${item.summary ? `<p class="rd-standfirst">${esc(item.summary)}</p>` : ''}
      <div class="rd-glance">
        ${t ? `<div class="rd-g"><span class="rd-gk">总耗时</span><span class="rd-gv">${t} 分钟</span>${(item.prepTime || item.cookTime) ? `<span class="rd-gsub">准备 ${item.prepTime || 0} · 制作 ${item.cookTime || 0}</span>` : ''}</div>` : ''}
        ${item.level ? `<div class="rd-g"><span class="rd-gk">难度</span><span class="rd-gv">${esc(item.level)}</span></div>` : ''}
        ${item.servings ? `<div class="rd-g"><span class="rd-gk">份量</span><span class="rd-gv">${item.servings} 人份</span><span class="rd-gsub">可在配方卡调整</span></div>` : ''}
        <div class="rd-g rd-gact">${FA.ui.favBtn('recipe', id)}</div>
      </div>
      <figure class="rd-hero">${item.image ? imgTag(item.image, item.name, null, { eager: true, fetchPriority: true, width: 960, height: 600 }) : `<div class="dh-fallback">${esc(item.name)}</div>`}</figure>
      <div class="detail-actions">
        <button class="btn sm" id="cook-go">👨‍🍳 进入烹饪模式</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-ing">食材</button><button data-jump="sec-steps">制作步骤</button>${item.tips && item.tips.length ? '<button data-jump="sec-tips">关键技巧</button>' : ''}${item.faq && item.faq.length ? '<button data-jump="sec-faq">常见问题</button>' : ''}${item.subs && item.subs.length ? '<button data-jump="sec-subs">替换建议</button>' : ''}</nav>
      <div class="rd-cols">${ingSide(item, 'recipe')}
        <div>
          <h2 class="rd-h2" id="sec-steps">制作步骤</h2>
          <ol class="rd-steps">${(item.steps || []).map((s, i) =>
            `<li class="rd-step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${item.tips && item.tips.length ? `<div id="sec-tips"><h2 class="rd-h2">关键技巧</h2><div class="rd-callout"><ul>${item.tips.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div></div>` : ''}${item.faq && item.faq.length ? `<div id="sec-faq"><h2 class="rd-h2">常见问题</h2>${item.faq.map(f => `<div class="rd-qa"><div class="q">${esc(f.q)}</div><div class="a">${esc(f.a)}</div></div>`).join('')}</div>` : ''}${item.subs && item.subs.length ? `<div id="sec-subs"><h2 class="rd-h2">替换建议</h2><table class="rd-subs"><thead><tr><th>原食材</th><th></th><th>可替换为</th><th>说明</th></tr></thead><tbody>${item.subs.map(s => `<tr><td class="from">${esc(s.from)}</td><td class="arr">→</td><td class="from">${esc(s.to)}</td><td>${esc(s.note || '')}</td></tr>`).join('')}</tbody></table></div>` : ''}
          ${item.benefits ? `<h2 class="rd-h2">营养与功效</h2><div class="rd-benefits">${esc(item.benefits)}</div>` : ''}
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
    const t = FA.ui.totalTime(item);
    const oven = item.oven || {};
    // S2 烘焙重构: 只改表现层;钩子清单见 ~/workspace/foodatlas-audit/hook-inventory-s2.md
    // 保留: pushRecent/B1, document.title, formula/showPercent, renderBk 全部逻辑,
    // #bk-dec/#bk-inc/#bk-n/#bk-note/#bk-formula, #bk-to-shop 绑定, #cook-go/#log-quick,
    // data-fav, data-jump 导航, sec-* 锚点, passiveNote, relatedCards;绑定逻辑(下)逐行保留
    const html = `<div class="wrap page"><div class="bk-wrap ed-wrap">
      <nav class="ed-crumb" aria-label="面包屑"><a href="#/">食见</a><span class="sep">/</span><a href="#/baking">烘焙甜点</a><span class="sep">/</span><span>${esc(item.category || '烘焙')}</span></nav>
      <div class="kicker bk">${esc(item.category || '')} · BAKING</div>
      <h1 class="ed-title">${esc(item.name)}</h1>
      ${item.alias ? `<div class="ed-alias">别名：${esc(item.alias)}</div>` : ''}
      ${item.summary ? `<p class="ed-standfirst">${esc(item.summary)}</p>` : ''}
      ${(oven.temp || oven.time) ? `<div class="bk-oven" role="note" aria-label="烤箱信息">
        ${oven.temp ? `<div><span class="lbl">烤箱温度</span><span class="t">${oven.temp}°C</span></div>` : ''}
        ${oven.time ? `<div><span class="lbl">烘烤时间</span><span class="t">约 ${oven.time} 分钟</span></div>` : ''}
        ${oven.preheat ? `<div><span class="lbl">预热</span><span class="t">需预热</span></div>` : ''}
        ${oven.note ? `<div class="note">📌 ${esc(oven.note)}</div>` : ''}
      </div>` : ''}
      <div class="ed-glance">
        ${t ? `<div class="ed-g"><span class="ed-gk">总耗时</span><span class="ed-gv">${t} 分钟</span>${(item.prepTime || item.cookTime) ? `<span class="ed-gsub">准备 ${item.prepTime || 0} · 制作 ${item.cookTime || 0}</span>` : ''}</div>` : ''}
        ${item.level ? `<div class="ed-g"><span class="ed-gk">难度</span><span class="ed-gv">${esc(item.level)}</span></div>` : ''}
        ${item.servings ? `<div class="ed-g"><span class="ed-gk">份量</span><span class="ed-gv">${item.servings} 人份</span><span class="ed-gsub">可在配方区调整</span></div>` : ''}
        <div class="ed-g ed-gact">${FA.ui.favBtn('baking', id)}</div>
      </div>
      ${item.sweetness || item.texture ? `<div class="bk-attr">${item.sweetness ? `<span class="badge gold">甜度 ${esc(item.sweetness)}</span>` : ''}${item.texture ? `<span class="badge gold">口感 ${esc(item.texture)}</span>` : ''}</div>` : ''}
      <figure class="ed-hero">${item.image ? imgTag(item.image, item.name, null, { eager: true, fetchPriority: true, width: 960, height: 600 }) : `<div class="dh-fallback">${esc(item.name)}</div>`}</figure>
      <div class="detail-actions">
        <button class="btn sm" id="cook-go">👨‍🍳 进入烹饪模式</button>
        <button class="btn ghost sm" id="bk-to-shop">🛒 加入购物清单</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-formula">配方</button><button data-jump="sec-steps">制作步骤</button>${item.troubleshoot && item.troubleshoot.length ? '<button data-jump="sec-trouble">失败排查</button>' : ''}${item.faq && item.faq.length ? '<button data-jump="sec-faq">常见问题</button>' : ''}${item.subs && item.subs.length ? '<button data-jump="sec-subs">替换建议</button>' : ''}</nav>
      <h2 class="ed-h2" id="sec-formula">配方${showPercent ? '（烘焙百分比）' : ''}</h2>
      <div class="serv-ctl"><button id="bk-dec">−</button><span><b id="bk-n">${base}</b> 人份</span><button id="bk-inc">＋</button></div>
      <div id="bk-note" style="font-size:12px;color:var(--muted);margin:8px 0"></div>
      <div id="bk-formula"></div>
      <p class="bk-pannote">提示：份量变化不会自动调整烤盘尺寸。面糊厚度可能变化，请根据实际状态观察并调整烘焙时间。</p>
      ${(item.pan || item.ferment || item.yield) ? `<div class="bk-spec">
        ${item.pan ? `<div class="sp"><div class="k">模具</div><div class="v">${esc(item.pan)}</div></div>` : ''}
        ${item.ferment ? `<div class="sp"><div class="k">发酵</div><div class="v">${esc(item.ferment)}</div></div>` : ''}
        ${item.yield ? `<div class="sp"><div class="k">成品</div><div class="v">${esc(item.yield)}</div></div>` : ''}
      </div>` : ''}
      ${item.doneness ? `<div class="bk-doneness"><h4>👀 成品判断</h4><p>${esc(item.doneness)}</p></div>` : ''}
      ${passiveNote(item)}
      <h2 class="ed-h2" id="sec-steps">制作步骤</h2>
      <ol class="ed-steps">${(item.steps || []).map((s, i) =>
        `<li class="ed-step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
      ${tipsBox('💡 关键技巧', item.tips)}
      ${item.troubleshoot && item.troubleshoot.length ? `<div id="sec-trouble"><h2 class="ed-h2">失败排查</h2><div class="bk-trouble">` +
        item.troubleshoot.map(x => `<div class="bk-t"><div class="p">⚠️ ${esc(x.problem)}</div><div class="row"><b>原因：</b>${esc(x.cause)}</div><div class="row"><b>解决：</b>${esc(x.fix)}</div></div>`).join('') + `</div></div>` : ''}
      ${item.faq && item.faq.length ? `<div id="sec-faq">${faqHtml(item.faq)}</div>` : ''}${item.subs && item.subs.length ? `<div id="sec-subs">${subsHtml(item.subs)}</div>` : ''}
      ${item.benefits ? `<h2 class="ed-h2">营养与功效</h2><div class="ed-benefits">${esc(item.benefits)}</div>` : ''}
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
    const tt = FA.ui.totalTime(item);
    // S2 饮品重构: 只改表现层;钩子清单见 ~/workspace/foodatlas-audit/hook-inventory-s2.md
    // 保留: pushRecent/D1, document.title, ingSide/bindIngSide(item,'drink') 全部逻辑,
    // #sv-*/#ing-*/#cook-go/#log-quick, data-fav, data-jump 导航, sec-* 锚点,
    // PARAM_LABEL 映射, relatedCards;绑定逻辑(下)逐行保留
    const html = `<div class="wrap page"><div class="dk-wrap ed-wrap">
      <nav class="ed-crumb" aria-label="面包屑"><a href="#/">食见</a><span class="sep">/</span><a href="#/drinks">饮品世界</a><span class="sep">/</span><span>${esc(item.category || '饮品')}</span></nav>
      <div class="kicker dk">${esc(item.category || '')} · DRINKS</div>
      <h1 class="ed-title">${esc(item.name)}</h1>
      ${item.alias ? `<div class="ed-alias">别名：${esc(item.alias)}</div>` : ''}
      ${item.summary ? `<p class="ed-standfirst">${esc(item.summary)}</p>` : ''}
      ${item.tastes && item.tastes.length ? `<div class="dk-tastes" aria-label="风味">${item.tastes.map(x => `<span class="badge gold">${esc(x)}</span>`).join('')}${item.temp ? `<span class="badge">饮用 · ${esc(item.temp)}</span>` : ''}</div>` : ''}
      <div class="ed-glance">
        ${tt ? `<div class="ed-g"><span class="ed-gk">总耗时</span><span class="ed-gv">${tt} 分钟</span>${(item.prepTime || item.cookTime) ? `<span class="ed-gsub">准备 ${item.prepTime || 0} · 制作 ${item.cookTime || 0}</span>` : ''}</div>` : ''}
        ${item.level ? `<div class="ed-g"><span class="ed-gk">难度</span><span class="ed-gv">${esc(item.level)}</span></div>` : ''}
        ${item.servings ? `<div class="ed-g"><span class="ed-gk">份量</span><span class="ed-gv">${item.servings} 人份</span><span class="ed-gsub">可在配方卡调整</span></div>` : ''}
        <div class="ed-g ed-gact">${FA.ui.favBtn('drink', id)}</div>
      </div>
      <figure class="dk-hero">${item.image ? imgTag(item.image, item.name, null, { eager: true, fetchPriority: true, width: 900, height: 675 }) : `<div class="dh-fallback">${esc(item.name)}</div>`}</figure>
      <div class="detail-actions">
        <button class="btn sm" id="cook-go">👨‍🍳 进入制作模式</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <nav class="detail-nav" aria-label="页面导航"><button data-jump="sec-ing">食材</button><button data-jump="sec-steps">制作步骤</button>${item.params && Object.keys(item.params).length ? '<button data-jump="sec-params">关键参数</button>' : ''}</nav>
      <div class="dk-cols">${ingSide(item, 'drink')}
        <div>
          <h2 class="ed-h2" id="sec-steps">制作步骤</h2>
          <ol class="ed-steps">${(item.steps || []).map((s, i) =>
            `<li class="ed-step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${item.params && Object.keys(item.params).length ? `<div id="sec-params"><h2 class="ed-h2">关键参数</h2><div class="dk-specs">${Object.entries(item.params).map(([k, v]) => `<div class="dk-spec"><div class="k">${esc(PARAM_LABEL[k] || k)}</div><div class="v">${esc(v)}</div></div>`).join('')}</div></div>` : ''}
          ${tipsBox('💡 关键技巧', item.tips)}${faqHtml(item.faq)}
          ${item.benefits ? `<h2 class="ed-h2">营养与功效</h2><div class="ed-benefits">${esc(item.benefits)}</div>` : ''}
        </div></div>
      ${relatedCards('同类饮品', findRelatedRecipes(item, 'drink').map(x => FA.ui.card(x, 'drink')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    bindIngSide(item, 'drink');
    // S2: 饮品图自适应比例 — 竖图 3:4、横图 16:10、方图 4:3;不强行裁切杯体
    (() => {
      const fig = document.querySelector('.dk-hero');
      const img = fig && fig.querySelector('img');
      if (!img) return;
      const setOrient = () => {
        if (!img.naturalWidth) return;
        const r = img.naturalWidth / img.naturalHeight;
        fig.classList.toggle('tall', r < 0.92);
        fig.classList.toggle('wide', r > 1.25);
      };
      if (img.complete && img.naturalWidth) setOrient();
      else img.addEventListener('load', setOrient);
    })();
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
    // 适用菜谱: 配料名包含该食材名 (既有逻辑)
    const usedIn = [...FA.data.list('recipe'), ...FA.data.list('drink')].filter(r =>
      (r.ingredients || []).some(x => { const n = typeof x === 'string' ? x : x.name; return n && (n.includes(item.name) || item.name.includes(n)); })).slice(0, 8);
    const subs = FA.data.DB.substitutions.filter(s => s.match.includes(item.name) || s.to.includes(item.name)).slice(0, 6);
    const sameCat = FA.data.list('ingredient').filter(x => x.cat === item.cat && x.id !== id).slice(0, 8);
    // S5: 营养关键词按 · 拆分 (537/537 含 ·, 真实数据)
    const nutTags = String(item.nutrient || '').split('·').map(s => s.trim()).filter(Boolean);
    // S5: 替代目标精确匹配食材名时可跳转, 否则为纯文本 (不虚构链接)
    const nameToId = {};
    FA.data.list('ingredient').forEach(x => { nameToId[x.name] = x.id; });
    const subsHtml = subs.length ? `<div id="sec-subs"><h2 class="ig-h2">可替代关系</h2>` +
      subs.map(s => {
        const toHref = nameToId[s.to] ? `#/ingredient/${encodeURIComponent(nameToId[s.to])}` : null;
        const toEl = toHref ? `<a class="ig-sub-to" href="${toHref}">${esc(s.to)}</a>` : `<span class="ig-sub-to">${esc(s.to)}</span>`;
        return `<div class="ig-sub">
          <div class="ig-sub-row"><span class="ig-sub-from">${esc(s.match)}</span><span class="ig-sub-arrow">→</span>${toEl}</div>
          <div class="meta-row">${s.ratio ? `<span class="badge">用量 ${esc(s.ratio)}</span>` : ''}${(s.for || []).map(f => `<span class="badge green">适用 ${esc(f)}</span>`).join('')}${s.risky ? `<span class="badge" style="background:#FBEAE5;border-color:#E8B4A6;color:#A33B22">⚠️ 替代有风险</span>` : ''}</div>
          ${s.flavor ? `<p class="ig-sub-note"><b>风味差异：</b>${esc(s.flavor)}</p>` : ''}
          ${s.note ? `<p class="ig-sub-note">${esc(s.note)}</p>` : ''}
        </div>`;
      }).join('') + `</div>` : '';
    const secBtn = (cond, target, label) => cond ? `<button data-jump="${target}">${label}</button>` : '';
    const html = `<div class="wrap page"><div class="ig-wrap">
      <nav class="ig-crumb" aria-label="面包屑"><a href="#/">食见</a><span>/</span><a href="#/ingredients">全球食材百科</a><span>/</span><span>${esc(item.cat)}</span></nav>
      <div class="kicker ing">${esc(item.cat)} · INGREDIENT</div>
      <h1 class="ig-title">${esc(item.name)}</h1>
      ${item.alias ? `<div class="ig-alias">别名：${esc(item.alias)}</div>` : ''}
      ${item.lead ? `<p class="ig-lead">${esc(item.lead)}</p>` : ''}
      <div class="ig-glance">
        <div class="ig-g"><span class="ig-gk">分类</span><span class="ig-gv">${esc(item.cat)}</span></div>
        <div class="ig-g"><span class="ig-gk">营养关键词</span><span class="ig-gv">${nutTags.map(t => `<span class="badge gold">${esc(t)}</span>`).join('')}</span></div>
        <div class="ig-gact">${FA.ui.favBtn('ingredient', id)}</div>
      </div>
      <div class="ig-hero">${item.image ? imgTag(item.image, item.name, null, { eager: true, fetchPriority: true, thumb: true, width: 960, height: 720 }) : `<div class="dh-fallback">${esc(item.name)}</div>`}</div>
      <div class="detail-actions"><a class="btn ghost sm" href="#/tools/substitute?q=${encodeURIComponent(item.name)}">查替换方案</a></div>
      <nav class="detail-nav" aria-label="页面导航">${secBtn(item.texture, 'sec-texture', '选购')}${secBtn(item.nutrientText || item.nutrient, 'sec-nutrient', '营养')}${secBtn(item.cooking, 'sec-cooking', '处理')}${secBtn(item.storage, 'sec-storage', '保存')}${secBtn(subs.length, 'sec-subs', '替代关系')}${secBtn(usedIn.length, 'sec-used', '用它做的菜')}${secBtn(sameCat.length, 'sec-same', '同类食材')}</nav>
      ${item.texture ? `<div id="sec-texture"><h2 class="ig-h2">🔍 选购与形态</h2><p class="ig-p">${esc(item.texture)}</p></div>` : ''}
      ${item.nutrientText ? `<div id="sec-nutrient"><h2 class="ig-h2">🥗 营养</h2><p class="ig-p">${esc(item.nutrientText)}</p></div>` : ''}
      ${item.cooking ? `<div id="sec-cooking"><h2 class="ig-h2">🍳 处理与烹饪</h2><p class="ig-p">${esc(item.cooking)}</p></div>` : ''}
      ${item.storage ? `<div id="sec-storage"><h2 class="ig-h2">❄️ 保存方法</h2><p class="ig-p">${esc(item.storage)}</p></div>` : ''}
      ${subsHtml}
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
