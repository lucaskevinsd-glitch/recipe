/* FoodAtlas v2 — 详情页 (菜谱/烘焙/饮品/食材) + 烹饪模式 */
(function () {
  const { esc, imgTag } = FA.ui;

  // 饮品关键参数的英文键名 → 中文展示名(中文键名原样展示)
  const PARAM_LABEL = { sweet: '甜度', ice: '冰量', strength: '浓度' };

  function hero(item, title, alias) {
    return `<div class="detail-hero">${item.image ? `<img src="${esc(item.image)}" alt="${esc(title)}">` : `<div class="dh-fallback">${esc(title)}</div>`}</div>
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
    return `<aside class="side-box"><h3>食材</h3>
      <div class="serv-ctl"><button id="sv-dec">−</button><span><b id="sv-n">${base}</b> 人份</span><button id="sv-inc">＋</button></div>
      <ul class="ing-list" id="ing-list"></ul>
      <div id="sv-note" style="font-size:12px;color:var(--muted);margin:8px 0"></div>
      <button class="btn soft sm block" id="ing-to-shop">把缺少的加入购物清单</button>
      <button class="btn ghost sm block" id="ing-to-fridge" style="margin-top:8px">把已有的记入冰箱</button>
    </aside>`;
  }
  function bindIngSide(item) {
    const raw = item.ingredients || [];
    const base = item.servings || 3;
    let cur = base;
    const render = () => {
      const f = cur / base;
      const scaled = FA.tools.scaleIngredients(raw, f);
      document.getElementById('sv-n').textContent = cur;
      document.getElementById('ing-list').innerHTML = scaled.map((x, i) =>
        `<li class="ing-item"><input type="checkbox" data-ing="${i}"><span class="ing-name">${esc(x.name)}${x.note ? `<span style="color:var(--muted)">（${esc(x.note)}）</span>` : ''}</span><span class="amt">${esc(x.amount || '')}</span></li>`).join('');
      document.getElementById('sv-note').textContent = f === 1 ? '' : `已按 ${f.toFixed(2)} 倍换算；盐、酵母等调料按非线性换算`;
      document.querySelectorAll('#ing-list input').forEach(c => c.onchange = () => c.closest('.ing-item').classList.toggle('done', c.checked));
    };
    document.getElementById('sv-dec').onclick = () => { if (cur > 1) { cur--; render(); } };
    document.getElementById('sv-inc').onclick = () => { if (cur < 24) { cur++; render(); } };
    const checkedNames = () => [...document.querySelectorAll('#ing-list input:checked')].map(c => raw[+c.dataset.ing])
      .map(x => typeof x === 'string' ? x : x.name);
    document.getElementById('ing-to-shop').onclick = () => {
      const have = new Set(checkedNames());
      const missing = raw.map(x => typeof x === 'string' ? x : x.name).filter(n => !have.has(n) && !FA.store.fridgeHas(n));
      if (!missing.length) { FA.ui.toast('食材齐了，无需购买'); return; }
      missing.forEach(n => FA.store.shopAdd(n, ''));
      FA.ui.toast(`已将 ${missing.length} 样加入购物清单`);
    };
    document.getElementById('ing-to-fridge').onclick = () => {
      const names = checkedNames();
      if (!names.length) { FA.ui.toast('先勾选已有的食材'); return; }
      names.forEach(n => FA.store.fridgeAdd(n, '', '', ''));
      FA.ui.toast(`已记入冰箱 ${names.length} 样`);
    };
    render();
  }

  function relatedCards(title, cards) {
    if (!cards.length) return '';
    return `<section class="section"><h3 style="font-family:var(--font-d);margin-bottom:14px">${title}</h3><div class="hscroll">${cards}</div></section>`;
  }

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
      <div class="detail-cols">${ingSide(item, 'recipe')}
        <div>
          <h3 style="font-family:var(--font-d);margin-bottom:12px">制作步骤</h3>
          <ol class="step-list">${(item.steps || []).map((s, i) =>
            `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${tipsBox('💡 关键技巧', item.tips)}${faqHtml(item.faq)}${subsHtml(item.subs)}
          ${item.benefits ? `<h3 style="font-family:var(--font-d);margin:22px 0 6px">营养与功效</h3><p style="color:var(--ink2)">${esc(item.benefits)}</p>` : ''}
        </div></div>
      ${relatedCards('相关食材', relIng.map(x => FA.ui.card(x, 'ingredient')))}
      ${relatedCards('同类菜谱', findRelatedRecipes(item, 'recipe').map(x => FA.ui.card(x, 'recipe')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    bindIngSide(item);
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
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias)}${metaBadges(item)}${passiveNote(item)}
      ${item.sweetness || item.texture ? `<div class="meta-row"><span class="badge gold">甜度 ${esc(item.sweetness || '—')}</span><span class="badge gold">口感 ${esc(item.texture || '—')}</span></div>` : ''}
      <div class="detail-actions">${FA.ui.favBtn('baking', id)}
        <button class="btn sm" id="cook-go">👨‍🍳 进入烹饪模式</button>
        <button class="btn ghost sm" id="log-quick">记一次制作</button></div>
      <h3 style="font-family:var(--font-d);margin:18px 0 10px">配方${showPercent ? '（烘焙百分比）' : ''}</h3>
      <div class="formula-wrap">
      <table class="formula"><tr><th>原料</th><th>用量</th>${showPercent ? '<th>百分比</th>' : ''}<th>备注</th></tr>
        ${formula.map(x => { const amt = x.amount || (x.grams != null ? x.grams + '克' : ''); return `<tr><td>${esc(x.name)}</td><td>${amt ? esc(amt) : '—'}</td>${showPercent ? `<td>${x.percent == null ? '—' : x.percent + '%'}</td>` : ''}<td style="color:var(--muted)">${esc(x.note || '')}</td></tr>`; }).join('')}</table>
      <div class="formula-cards">${formula.map(x => { const amt = x.amount || (x.grams != null ? x.grams + '克' : '');
        const sub = [showPercent && x.percent != null ? `烘焙百分比 ${x.percent}%` : '', x.note || ''].filter(Boolean).join(' · ');
        return `<div class="fcard"><div class="frow"><span class="fname">${esc(x.name)}</span><span class="famt">${amt ? esc(amt) : '—'}</span></div>${sub ? `<div class="fsub">${esc(sub)}</div>` : ''}</div>`; }).join('')}</div>
      </div>
      ${item.totalDough ? `<p style="font-size:13.5px;color:var(--muted);margin-top:8px">面团/面糊总重约 ${item.totalDough} 克</p>` : ''}
      <div class="form-row" style="margin:16px 0">
        ${item.pan ? `<div class="field"><label>模具</label><div style="font-size:15px">${esc(item.pan)}</div></div>` : ''}
        ${item.oven && item.oven.temp ? `<div class="field"><label>烤箱</label><div style="font-size:15px">${item.oven.temp}°C${item.oven.preheat ? '（预热）' : ''} · 约 ${item.oven.time || '—'} 分钟${item.oven.note ? ' · ' + esc(item.oven.note) : ''}</div></div>` : ''}
        ${item.ferment ? `<div class="field"><label>发酵</label><div style="font-size:15px">${esc(item.ferment)}</div></div>` : ''}
        ${item.yield ? `<div class="field"><label>成品</label><div style="font-size:15px">${esc(item.yield)}</div></div>` : ''}
      </div>
      ${item.doneness ? `<div class="tip-box"><h4>成品判断</h4><p>${esc(item.doneness)}</p></div>` : ''}
      <h3 style="font-family:var(--font-d);margin:18px 0 12px">制作步骤</h3>
      <ol class="step-list">${(item.steps || []).map((s, i) =>
        `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
      ${tipsBox('💡 关键技巧', item.tips)}
      ${item.troubleshoot && item.troubleshoot.length ? `<h3 style="font-family:var(--font-d);margin:22px 0 6px">失败排查</h3>` +
        item.troubleshoot.map(t => `<div class="faq-item"><b>${esc(t.problem)}</b><p>原因：${esc(t.cause)}<br>解决：${esc(t.fix)}</p></div>`).join('') : ''}
      ${faqHtml(item.faq)}${subsHtml(item.subs)}
      ${relatedCards('同类烘焙', findRelatedRecipes(item, 'baking').map(x => FA.ui.card(x, 'baking')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
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
      <div class="detail-cols">${ingSide(item, 'drink')}
        <div>
          <h3 style="font-family:var(--font-d);margin-bottom:12px">制作步骤</h3>
          <ol class="step-list">${(item.steps || []).map((s, i) =>
            `<li class="step">${esc(s)}${item.stepTimes && item.stepTimes[i] ? `<div class="step-time">⏱ 约 ${item.stepTimes[i]} 分钟</div>` : ''}</li>`).join('')}</ol>
          ${item.params && Object.keys(item.params).length ? `<div class="tip-box"><h4>关键参数</h4><ul>${Object.entries(item.params).map(([k, v]) => `<li>${esc(PARAM_LABEL[k] || k)}：${esc(v)}</li>`).join('')}</ul></div>` : ''}
          ${tipsBox('💡 关键技巧', item.tips)}${faqHtml(item.faq)}
          ${item.benefits ? `<h3 style="font-family:var(--font-d);margin:22px 0 6px">营养与功效</h3><p style="color:var(--ink2)">${esc(item.benefits)}</p>` : ''}
        </div></div>
      ${relatedCards('同类饮品', findRelatedRecipes(item, 'drink').map(x => FA.ui.card(x, 'drink')))}
    </div></div>`;
    document.getElementById('app').innerHTML = html;
    bindIngSide(item);
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
    const sec = (t, c) => c ? `<h3 style="font-family:var(--font-d);margin:22px 0 8px">${t}</h3><p style="color:var(--ink2)">${esc(c)}</p>` : '';
    const html = `<div class="wrap page"><div class="page-narrow" style="margin:0 auto;max-width:960px">
      ${hero(item, item.name, item.alias ? '别名：' + item.alias : '')}
      <div class="meta-row" style="margin:12px 0"><span class="badge green">${esc(item.cat)}</span>${item.nutrient ? `<span class="badge gold">${esc(item.nutrient)}</span>` : ''}</div>
      <div class="detail-actions">${FA.ui.favBtn('ingredient', id)}
        <a class="btn ghost sm" href="#/tools/substitute?q=${encodeURIComponent(item.name)}">查替换方案</a></div>
      ${item.lead ? `<p class="lead" style="font-size:18px;color:var(--ink2);margin:14px 0">${esc(item.lead)}</p>` : ''}
      ${sec('🔍 选购与形态', item.texture)}${sec('🥗 营养亮点', item.nutrientText || item.nutrient)}
      ${sec('🍳 处理与烹饪', item.cooking)}${sec('❄️ 保存方法', item.storage)}
      ${subs.length ? `<h3 style="font-family:var(--font-d);margin:22px 0 10px">可替代关系</h3>` +
        subs.map(s => `<div class="faq-item"><b>${esc(s.match)} → ${esc(s.to)}</b><p>用量比 ${esc(s.ratio)}；${esc(s.note)}</p></div>`).join('') : ''}
      ${relatedCards('用它做的菜', usedIn.map(x => FA.ui.card(x, FA.data.byId.get(x.id).type)))}
      ${relatedCards('同类食材', sameCat.map(x => FA.ui.card(x, 'ingredient')))}
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
            <button class="btn sm ghost" id="cm-trs" style="color:#F2F4E9;border-color:rgba(255,255,255,.3)">重置</button></div>` : ''}
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
