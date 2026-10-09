/* FoodAtlas v2 — 厨房工具箱 (9 件工具, 全部本地独立运行, 不依赖 AI) */
(function () {
  const { esc } = FA.ui;

  function layout(activeId, title, sub, bodyHtml) {
    const menu = FA.config.tools.map(t =>
      `<a href="#/tools/${t.id}" class="${t.id === activeId ? 'on' : ''}"><span>${t.icon}</span>${t.name}</a>`).join('');
    return `<div class="wrap page"><div class="tool-layout">
      <nav class="tool-menu">${menu}</nav>
      <div class="tool-panel"><h2>${title}</h2><p class="tp-sub">${sub}</p>${bodyHtml}</div>
    </div></div>`;
  }

  /* ---------- 通用量解析 ---------- */
  function parseAmt(s) {
    const m = String(s || '').match(/(\d+(?:\.\d+)?)\s*([a-zA-Z\u4e00-\u9fa5]*)/);
    if (!m) return null;
    return { num: parseFloat(m[1]), unit: m[2] || '' };
  }
  function fmtNum(n) {
    if (n >= 100) return String(Math.round(n));
    const r = Math.round(n * 10) / 10;
    return String(r);
  }
  // 调料类是否应用非线性换算(架构文档 7.2)
  const NONLINEAR = /盐|酵母|泡打粉|小苏打|苏打粉|胡椒|花椒|辣椒粉|五香粉|味精|鸡精|香料|孜然/;
  function scaleAmount(amount, factor, isSeasoning) {
    const p = parseAmt(amount);
    if (!p) return amount;
    const f = isSeasoning ? Math.pow(factor, 0.75) : factor;
    return fmtNum(p.num * f) + p.unit;
  }
  function scaleIngredients(ings, factor) {
    return ings.map(x => {
      const name = typeof x === 'string' ? x : x.name;
      const amount = typeof x === 'string' ? '' : (x.amount || '');
      const note = typeof x === 'string' ? '' : (x.note || '');
      return { name, amount: scaleAmount(amount, factor, NONLINEAR.test(name)), note };
    });
  }

  /* ================= 1. 配方换算 ================= */
  function scaleTool() {
    const all = [
      ...FA.data.list('recipe').map(x => ({ type: 'recipe', id: x.id, name: x.name, servings: x.servings || 2 })),
      ...FA.data.list('baking').map(x => ({ type: 'baking', id: x.id, name: x.name, servings: x.servings || 6 })),
      ...FA.data.list('drink').map(x => ({ type: 'drink', id: x.id, name: x.name, servings: x.servings || 1 })),
    ];
    const body = `
      <div class="field"><label>选择配方</label>
        <select id="sc-pick">${all.map(x => `<option value="${x.type}:${x.id}">${esc(x.name)}（${x.servings} 人份）</option>`).join('')}</select></div>
      <div class="form-row">
        <div class="field"><label>原始份量</label><input id="sc-from" type="number" value="3" min="1"></div>
        <div class="field"><label>目标份量</label><input id="sc-to" type="number" value="2" min="1"></div>
      </div>
      <button class="btn" id="sc-go">换算</button>
      <div id="sc-out"></div>`;
    setTimeout(() => {
      const $ = id => document.getElementById(id);
      const render = () => {
        const [type, id] = $('sc-pick').value.split(':');
        const item = FA.data.get(type, id);
        const from = Math.max(1, +$('sc-from').value || 1), to = Math.max(1, +$('sc-to').value || 1);
        const f = to / from;
        let rows = '';
        if (type === 'baking' && item.formula && item.formula.length) {
          rows = item.formula.map(x => {
            const g = x.grams == null ? '—' : fmtNum(x.grams * f) + ' 克';
            return `<tr><td>${esc(x.name)}</td><td>${g}</td><td>${x.percent == null ? '—' : x.percent + '%'}</td><td style="color:var(--muted)">${esc(x.note || '')}</td></tr>`;
          }).join('');
          $('sc-out').innerHTML = `<div class="result-box">
            <p><b>${esc(item.name)}</b>：${from} 人份 → ${to} 人份（系数 ${f.toFixed(2)}）</p>
            <table class="formula" style="margin-top:12px"><tr><th>原料</th><th>换算后重量</th><th>烘焙百分比</th><th>备注</th></tr>${rows}</table>
            <p style="margin-top:12px;font-size:13.5px;color:var(--muted)">烘焙换算说明：原料重量按比例缩放，百分比不变；<b>烤箱温度不变</b>，烘烤时间视面糊厚度增减并观察上色；酵母、盐、泡打粉已按非线性（系数^0.75）换算，避免过量。</p>
            ${item.oven && item.oven.temp ? `<p style="font-size:13.5px;color:var(--muted)">原配方：${item.oven.temp}°C${item.oven.preheat ? '（需预热）' : ''}，约 ${item.oven.time || '—'} 分钟。</p>` : ''}
          </div>`;
        } else {
          const ings = item.ingredients || [];
          const scaled = scaleIngredients(ings, f);
          rows = scaled.map(x => `<tr><td>${esc(x.name)}</td><td>${esc(x.amount || '—')}</td><td style="color:var(--muted)">${esc(x.note || '')}</td></tr>`).join('');
          $('sc-out').innerHTML = `<div class="result-box">
            <p><b>${esc(item.name)}</b>：${from} 人份 → ${to} 人份（系数 ${f.toFixed(2)}）</p>
            <table class="formula" style="margin-top:12px"><tr><th>食材</th><th>换算后用量</th><th>备注</th></tr>${rows}</table>
            <p style="margin-top:12px;font-size:13.5px;color:var(--muted)">换算说明：主料按比例线性缩放；盐、酵母、香辛料等按非线性（系数^0.75）换算，火候与时间请按实际观察调整。</p>
          </div>`;
        }
      };
      $('sc-go').onclick = render;
      $('sc-pick').onchange = () => {
        const [type, id] = $('sc-pick').value.split(':');
        const item = FA.data.get(type, id);
        $('sc-from').value = item.servings || 3;
        render();
      };
      // 默认选中第一个并渲染
      const [t0, id0] = $('sc-pick').value.split(':');
      $('sc-from').value = FA.data.get(t0, id0).servings || 3;
      render();
    }, 0);
    return layout('scale', '⚖️ 配方换算', '按份量缩放食材用量。烘焙与普通菜谱使用不同的换算规则。', body);
  }

  /* ================= 2. 单位换算 ================= */
  const CUP_GRAMS = { '面粉': 120, '细砂糖': 200, '黄油': 227, '牛奶': 240, '水': 240, '大米': 185, '燕麦片': 90, '可可粉': 100, '蜂蜜': 340, '植物油': 220 };
  function unitTool() {
    const body = `
      <div class="form-row">
        <div class="field"><label>数值</label><input id="un-v" type="number" value="100"></div>
        <div class="field"><label>从</label><select id="un-from">
          <option value="g">克 g</option><option value="kg">千克 kg</option><option value="jin">斤</option>
          <option value="oz">盎司 oz</option><option value="lb">磅 lb</option>
          <option value="ml">毫升 ml</option><option value="l">升 L</option>
          <option value="cup">杯 cup</option><option value="tbsp">大勺 tbsp</option><option value="tsp">小勺 tsp</option>
        </select></div>
        <div class="field"><label>到</label><select id="un-to">
          <option value="g">克 g</option><option value="kg">千克 kg</option><option value="jin">斤</option>
          <option value="oz">盎司 oz</option><option value="lb">磅 lb</option>
          <option value="ml">毫升 ml</option><option value="l">升 L</option>
          <option value="cup">杯 cup</option><option value="tbsp">大勺 tbsp</option><option value="tsp">小勺 tsp</option>
        </select></div>
      </div>
      <button class="btn" id="un-go">换算</button><div id="un-out"></div>
      <div class="section" style="margin-top:28px"><h3 style="font-family:var(--font-d);margin-bottom:10px">常见食材 1 杯 ≈ 多少克</h3>
      <table class="formula"><tr><th>食材</th><th>1 杯(240ml)</th></tr>
      ${Object.entries(CUP_GRAMS).map(([k, v]) => `<tr><td>${k}</td><td>${v} 克</td></tr>`).join('')}</table></div>`;
    setTimeout(() => {
      const G = { g: 1, kg: 1000, jin: 500, oz: 28.3495, lb: 453.592 };
      const V = { ml: 1, l: 1000, cup: 240, tbsp: 15, tsp: 5 };
      const $ = id => document.getElementById(id);
      $('un-go').onclick = () => {
        const v = +$('un-v').value || 0, a = $('un-from').value, b = $('un-to').value;
        let r;
        if (G[a] && G[b]) r = v * G[a] / G[b];
        else if (V[a] && V[b]) r = v * V[a] / V[b];
        else { $('un-out').innerHTML = `<div class="result-box">重量单位与体积单位不能直接互换（密度不同）。查上表"1 杯 ≈ 多少克"。</div>`; return; }
        $('un-out').innerHTML = `<div class="result-box" style="font-size:20px"><b>${v} ${a}</b> ≈ <b style="color:var(--accent-deep)">${fmtNum(r)} ${b}</b></div>`;
      };
    }, 0);
    return layout('unit', '📐 单位换算', '克 / 毫升 / 杯 / 盎司等常用厨房单位互转。', body);
  }

  /* ================= 3. 食材替换助手 ================= */
  function subTool(query) {
    const q = (query || '').trim();
    let list = FA.data.DB.substitutions;
    if (q) list = list.filter(s => s.match.includes(q) || q.includes(s.match) || s.to.includes(q));
    const cards = list.map(s => `<div class="timer-card">
      <div style="font-size:16px"><b>${esc(s.match)}</b> <span style="color:var(--muted)">→</span> <b style="color:var(--accent-deep)">${esc(s.to)}</b>
      ${s.risky ? ' <span class="badge terra">风险较高</span>' : ''}</div>
      <div style="font-size:14px;margin-top:6px;color:var(--ink2)">用量比 ${esc(s.ratio)} · 风味变化：${esc(s.flavor)}</div>
      <div style="font-size:13.5px;color:var(--muted);margin-top:4px">${esc(s.note)}</div>
      <div style="margin-top:6px">${(s.for || []).map(f => `<span class="badge">${esc(f)}</span>`).join(' ')}</div>
    </div>`).join('');
    const body = `
      <div class="field"><label>输入缺少的食材</label>
        <div style="display:flex;gap:8px"><input id="sub-q" placeholder="如：黄油 / 淡奶油 / 鸡蛋" value="${esc(q)}" style="flex:1">
        <button class="btn" id="sub-go">查找替换</button></div></div>
      <div id="sub-out">${list.length ? cards : FA.ui.empty('🔄', q ? '没有找到「' + q + '」的替换方案' : '输入食材名查找替换方案')}</div>`;
    setTimeout(() => {
      const $ = id => document.getElementById(id);
      const go = () => { location.hash = '#/tools/substitute?q=' + encodeURIComponent($('sub-q').value.trim()); };
      $('sub-go').onclick = go;
      $('sub-q').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
    }, 0);
    return layout('substitute', '🔄 食材替换助手', '缺料不慌：查替换品、用量比与风味影响。', body);
  }

  /* ================= 4. 我的冰箱 ================= */
  function fridgeTool() {
    const render = () => {
      const st = FA.store.state.fridge;
      const today = new Date().toISOString().slice(0, 10);
      const rows = st.map(f => {
        let warn = '';
        if (f.exp) {
          const days = Math.round((new Date(f.exp) - new Date(today)) / 864e5);
          if (days < 0) warn = '<span class="badge terra">已过期</span>';
          else if (days <= 3) warn = `<span class="badge gold">${days} 天后过期</span>`;
        }
        return `<div class="list-row"><div style="flex:1"><b>${esc(f.name)}</b>
          <span style="color:var(--muted);font-size:13px">${esc([f.qty, f.unit, f.exp ? '过期:' + f.exp : ''].filter(Boolean).join(' · '))}</span> ${warn}</div>
          <button class="btn ghost sm" data-fridge-del="${esc(f.name)}">移除</button></div>`;
      }).join('');
      const body = `
        <div class="form-row">
          <div class="field" style="flex:2"><label>食材名</label><input id="fr-name" placeholder="如：鸡蛋"></div>
          <div class="field"><label>数量</label><input id="fr-qty" placeholder="如：6"></div>
          <div class="field"><label>单位</label><input id="fr-unit" placeholder="个/克"></div>
          <div class="field"><label>过期日</label><input id="fr-exp" type="date"></div>
        </div>
        <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn" id="fr-add">加入冰箱</button>
        <a class="btn soft" href="#/tools/fridge/match">看看能做什么 →</a></div>
        <div class="section" style="margin-top:20px"><h3 style="font-family:var(--font-d);margin-bottom:8px">库存（${st.length}）</h3>
        ${st.length ? rows : FA.ui.empty('🧊', '冰箱是空的，先记几样常备食材吧')}</div>`;
      setTimeout(() => {
        const $ = id => document.getElementById(id);
        $('fr-add').onclick = () => {
          if (FA.store.fridgeAdd($('fr-name').value, $('fr-qty').value, $('fr-unit').value, $('fr-exp').value)) {
            FA.ui.toast('已加入冰箱'); FA.router.render();
          } else FA.ui.toast('请填写食材名');
        };
        document.querySelectorAll('[data-fridge-del]').forEach(b => b.onclick = () => { FA.store.fridgeRemove(b.dataset.fridgeDel); FA.ui.toast('已移除'); FA.router.render(); });
      }, 0);
      return layout('fridge', '🧊 我的冰箱', '记录现有食材、数量与保质期，联动菜谱与购物清单。', body);
    };
    return render();
  }

  // 冰箱 → 可做菜谱匹配
  function fridgeMatch() {
    const score = item => {
      const ings = (item.ingredients || []).map(x => typeof x === 'string' ? x : x.name);
      if (!ings.length) return { hit: 0, total: 0, missing: [] };
      const missing = ings.filter(n => !FA.store.fridgeHas(n));
      return { hit: ings.length - missing.length, total: ings.length, missing };
    };
    const all = [...FA.data.list('recipe'), ...FA.data.list('drink')];
    const ranked = all.map(item => ({ item, ...score(item) }))
      .filter(x => x.total > 0 && x.hit > 0)
      .sort((a, b) => (b.hit / b.total) - (a.hit / a.total) || b.hit - a.hit)
      .slice(0, 24);
    const cards = ranked.map(({ item, hit, total, missing }) => {
      const pct = Math.round(hit / total * 100);
      const type = FA.data.byId.get(item.id).type;
      return `<a class="card" href="${FA.ui.routeOf(type, item.id)}">
        <div class="card-img">${FA.ui.imgTag(item.image, item.name)}</div>
        <div class="card-body"><div class="card-title">${esc(item.name)}</div>
        <div class="card-desc">${pct === 100 ? '食材齐了，直接开做！' : `还缺 ${missing.length} 样：${esc(missing.slice(0, 3).join('、'))}${missing.length > 3 ? '…' : ''}`}</div>
        <div class="meta-row"><span class="badge ${pct === 100 ? 'green' : 'gold'}">匹配 ${pct}%</span>${FA.ui.totalTime(item) ? `<span class="badge">⏱ ${FA.ui.totalTime(item)} 分钟</span>` : ''}</div>
        </div></a>`;
    }).join('');
    const body = `<p class="tp-sub">根据冰箱现有食材，找出匹配度最高的菜谱。缺的食材可一键加入购物清单（在菜谱详情页操作）。</p>
      <div class="grid-cards">${cards || FA.ui.empty('🧊', '冰箱里还没有能匹配的食材，先去记几样吧', '<a class="btn" href="#/tools/fridge">去记食材</a>')}</div>
      <div style="margin-top:16px"><a class="btn ghost" href="#/tools/fridge">← 返回冰箱</a></div>`;
    return layout('fridge', '🍳 按冰箱找菜', '用现有食材发现今天可以做的美食。', body);
  }

  /* ================= 5. 购物清单 ================= */
  function shopTool() {
    const render = () => {
      const st = FA.store.state.shopping;
      const rows = st.map(x => `<div class="list-row">
        <input type="checkbox" ${x.done ? 'checked' : ''} data-shop-tg="${esc(x.name)}">
        <div style="flex:1;${x.done ? 'text-decoration:line-through;color:var(--muted)' : ''}"><b>${esc(x.name)}</b>
        ${x.qty ? `<span style="color:var(--muted);font-size:13px"> · ${esc(x.qty)}</span>` : ''}</div>
        <button class="btn ghost sm" data-shop-del="${esc(x.name)}">删除</button></div>`).join('');
      const body = `
        <div style="display:flex;gap:8px;margin-bottom:8px"><input id="sh-name" placeholder="食材名，如：番茄" style="flex:2">
        <input id="sh-qty" placeholder="数量" style="flex:1"><button class="btn" id="sh-add">添加</button></div>
        <div style="display:flex;gap:10px;margin:12px 0"><button class="btn ghost sm" id="sh-clear">清除已购</button>
        <span style="font-size:13px;color:var(--muted);align-self:center">共 ${st.length} 项，未购 ${st.filter(x => !x.done).length} 项</span></div>
        ${st.length ? rows : FA.ui.empty('🛒', '清单是空的。在菜谱详情页可把缺少的食材一键加入。')}`;
      setTimeout(() => {
        const $ = id => document.getElementById(id);
        $('sh-add').onclick = () => { if (FA.store.shopAdd($('sh-name').value, $('sh-qty').value)) { FA.router.render(); } };
        $('sh-clear').onclick = () => { FA.store.shopClearDone(); FA.router.render(); };
        document.querySelectorAll('[data-shop-tg]').forEach(c => c.onchange = () => { FA.store.shopToggle(c.dataset.shopTg); FA.router.render(); });
        document.querySelectorAll('[data-shop-del]').forEach(b => b.onclick = () => { FA.store.shopRemove(b.dataset.shopDel); FA.router.render(); });
      }, 0);
      return layout('shopping', '🛒 购物清单', '管理待购食材，与冰箱库存联动去重。', body);
    };
    return render();
  }

  /* ================= 6. 一周菜单 ================= */
  function menuTool(query) {
    const wk = query.w || FA.store.weekKey();
    const monday = new Date(wk + 'T00:00:00');
    const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const menu = FA.store.menuGet(wk);
    const recipes = FA.data.list('recipe');
    const cellHtml = (day, slot) => {
      const rid = (menu[day] || {})[slot];
      const r = rid ? FA.data.get('recipe', rid) : null;
      if (!r) return `<button class="btn ghost sm" data-menu-pick="${day}:${slot}">+ 添加</button>`;
      return `<div style="font-size:13.5px"><b>${esc(r.name)}</b><br>
        <button class="btn ghost sm" data-menu-pick="${day}:${slot}" style="margin-top:4px">换</button>
        <button class="btn ghost sm" data-menu-del="${day}:${slot}" style="margin-top:4px">✕</button></div>`;
    };
    let rows = '';
    for (let d = 0; d < 7; d++) {
      const dt = new Date(monday); dt.setDate(dt.getDate() + d);
      rows += `<tr><th>${names[d]}<br><span style="font-weight:400;font-size:12px">${dt.getMonth() + 1}/${dt.getDate()}</span></th>
        <td>${cellHtml(d, 'lunch')}</td><td>${cellHtml(d, 'dinner')}</td></tr>`;
    }
    const body = `
      <div style="display:flex;gap:10px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
        <button class="btn ghost sm" id="menu-prev">← 上周</button>
        <b>${wk} 起的一周</b>
        <button class="btn ghost sm" id="menu-next">下周 →</button>
        <span style="flex:1"></span>
        <button class="btn soft sm" id="menu-gen">按菜单生成购物清单</button>
      </div>
      <table class="menu-table"><tr><th></th><th>午餐</th><th>晚餐</th></tr>${rows}</table>
      <div id="menu-picker"></div><div id="menu-out"></div>`;
    setTimeout(() => {
      const $ = id => document.getElementById(id);
      const shift = n => { const d = new Date(monday); d.setDate(d.getDate() + n * 7); location.hash = '#/tools/menu?w=' + FA.store.weekKey(d); };
      $('menu-prev').onclick = () => shift(-1);
      $('menu-next').onclick = () => shift(1);
      document.querySelectorAll('[data-menu-pick]').forEach(b => b.onclick = () => {
        const [day, slot] = b.dataset.menuPick.split(':');
        $('menu-picker').innerHTML = `<div class="result-box"><div class="field"><label>为 ${names[day]} ${slot === 'lunch' ? '午餐' : '晚餐'} 选择菜谱</label>
          <select id="menu-sel">${recipes.map(r => `<option value="${r.id}">${esc(r.name)}</option>`).join('')}</select></div>
          <button class="btn sm" id="menu-ok">确定</button></div>`;
        document.getElementById('menu-ok').onclick = () => {
          FA.store.menuSet(wk, day, slot, document.getElementById('menu-sel').value);
          FA.router.render();
        };
      });
      document.querySelectorAll('[data-menu-del]').forEach(b => b.onclick = () => {
        const [day, slot] = b.dataset.menuDel.split(':');
        FA.store.menuSet(wk, day, slot, null); FA.router.render();
      });
      $('menu-gen').onclick = () => {
        const need = {};
        for (let d = 0; d < 7; d++) for (const slot of ['lunch', 'dinner']) {
          const rid = (menu[d] || {})[slot];
          const r = rid ? FA.data.get('recipe', rid) : null;
          (r && r.ingredients || []).forEach(x => {
            const n = typeof x === 'string' ? x : x.name;
            if (!FA.store.fridgeHas(n)) need[n] = (need[n] || 0) + 1;
          });
        }
        const names2 = Object.keys(need);
        if (!names2.length) { $('menu-out').innerHTML = `<div class="result-box">本周菜单所需食材冰箱里都有（或菜单为空），无需采购。</div>`; return; }
        $('menu-out').innerHTML = `<div class="result-box"><b>需采购 ${names2.length} 样</b>（已扣除冰箱现有）：
          <div style="margin:10px 0">${names2.map(n => `<span class="badge" style="margin:2px">${esc(n)}</span>`).join('')}</div>
          <button class="btn sm" id="menu-add-shop">全部加入购物清单</button></div>`;
        document.getElementById('menu-add-shop').onclick = () => {
          names2.forEach(n => FA.store.shopAdd(n, ''));
          FA.ui.toast('已加入购物清单');
        };
      };
    }, 0);
    return layout('menu', '📅 一周菜单', '规划未来七天的午餐晚餐，一键生成购物清单。', body);
  }

  /* ================= 7. 烹饪计时器 ================= */
  const timers = [];
  function timerTool() {
    const render = () => {
      const cards = timers.map((t, i) => {
        const mm = String(Math.floor(t.left / 60)).padStart(2, '0'), ss = String(t.left % 60).padStart(2, '0');
        return `<div class="timer-card"><div style="display:flex;align-items:center;gap:12px">
          <div style="flex:1"><b>${esc(t.label)}</b><div class="tt">${mm}:${ss}</div></div>
          ${t.running ? `<button class="btn ghost sm" data-t-pause="${i}">暂停</button>` : `<button class="btn soft sm" data-t-start="${i}">开始</button>`}
          <button class="btn ghost sm" data-t-del="${i}">删除</button></div></div>`;
      }).join('');
      const presets = [3, 5, 10, 15, 30, 60];
      const body = `
        <div class="form-row"><div class="field" style="flex:2"><label>事项</label><input id="tm-label" placeholder="如：蒸鱼"></div>
        <div class="field"><label>分钟</label><input id="tm-min" type="number" value="10" min="1"></div></div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
          ${presets.map(p => `<button class="chip" data-t-pre="${p}">${p} 分钟</button>`).join('')}
          <button class="btn" id="tm-add">添加计时器</button></div>
        ${timers.length ? cards : FA.ui.empty('⏱️', '还没有计时器，添加一个开始吧')}`;
      setTimeout(() => {
        const $ = id => document.getElementById(id);
        const beep = () => {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            [0, 0.4, 0.8].forEach(d => {
              const o = ctx.createOscillator(), g = ctx.createGain();
              o.connect(g); g.connect(ctx.destination);
              o.frequency.value = 880; o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.3);
            });
          } catch (e) {}
        };
        $('tm-add').onclick = () => {
          const min = Math.max(1, +$('tm-min').value || 1);
          timers.push({ label: $('tm-label').value || '计时', left: min * 60, total: min * 60, running: false, iv: null });
          FA.router.render();
        };
        document.querySelectorAll('[data-t-pre]').forEach(b => b.onclick = () => { $('tm-min').value = b.dataset.tPre; });
        const tick = i => {
          const t = timers[i]; if (!t) return;
          t.left--;
          if (t.left <= 0) { clearInterval(t.iv); t.running = false; t.left = 0; beep(); FA.ui.toast(`⏰ ${t.label} 时间到！`); }
          const card = document.querySelectorAll('.timer-card .tt')[i];
          if (card) { card.textContent = String(Math.floor(t.left / 60)).padStart(2, '0') + ':' + String(t.left % 60).padStart(2, '0'); }
        };
        document.querySelectorAll('[data-t-start]').forEach(b => b.onclick = () => {
          const t = timers[+b.dataset.tStart];
          if (t.left <= 0) t.left = t.total;
          t.running = true; t.iv = setInterval(() => tick(+b.dataset.tStart), 1000); FA.router.render();
        });
        document.querySelectorAll('[data-t-pause]').forEach(b => b.onclick = () => {
          const t = timers[+b.dataset.tPause]; clearInterval(t.iv); t.running = false; FA.router.render();
        });
        document.querySelectorAll('[data-t-del]').forEach(b => b.onclick = () => {
          const t = timers[+b.dataset.tDel]; clearInterval(t.iv); timers.splice(+b.dataset.tDel, 1); FA.router.render();
        });
      }, 0);
      return layout('timer', '⏱️ 烹饪计时器', '多任务并行倒计时，时间到会响铃提醒。', body);
    };
    return render();
  }

  /* ================= 8. 温度换算 ================= */
  function tempTool() {
    const body = `
      <div class="form-row">
        <div class="field"><label>摄氏度 °C</label><input id="tp-c" type="number" placeholder="180"></div>
        <div class="field"><label>华氏度 °F</label><input id="tp-f" type="number" placeholder="356"></div>
      </div>
      <div id="tp-gas" style="margin-bottom:16px"></div>
      <div class="section" style="margin-top:8px"><h3 style="font-family:var(--font-d);margin-bottom:10px">常用温度参考</h3>
      <table class="formula"><tr><th>用途</th><th>°C</th><th>°F</th></tr>
      ${[['低温慢烤', 120, 250], ['饼干', 170, 340], ['蛋糕', 180, 356], ['面包', 200, 400], ['披萨/高温', 230, 450],
        ['三成热(滑炒)', 90, 195], ['五成热(煎炸)', 150, 300], ['七成热(复炸)', 190, 375]].map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td><td>${r[2]}</td></tr>`).join('')}
      </table></div>`;
    setTimeout(() => {
      const $ = id => document.getElementById(id);
      const gas = c => c < 140 ? 'Gas 1' : c < 160 ? 'Gas 2–3' : c < 180 ? 'Gas 4' : c < 200 ? 'Gas 5–6' : c < 220 ? 'Gas 7' : 'Gas 8+';
      const upd = from => {
        if (from === 'c' && $('tp-c').value !== '') {
          const c = +$('tp-c').value, f = Math.round(c * 9 / 5 + 32);
          $('tp-f').value = f; $('tp-gas').innerHTML = `<span class="badge green">燃气档约 ${gas(c)}</span>`;
        } else if (from === 'f' && $('tp-f').value !== '') {
          const f = +$('tp-f').value, c = Math.round((f - 32) * 5 / 9);
          $('tp-c').value = c; $('tp-gas').innerHTML = `<span class="badge green">燃气档约 ${gas(c)}</span>`;
        }
      };
      $('tp-c').oninput = () => upd('c'); $('tp-f').oninput = () => upd('f');
    }, 0);
    return layout('temp', '🌡️ 温度换算', '摄氏 / 华氏 / 燃气档互转，附常用温度参考。', body);
  }

  /* ================= 9. 制作记录 ================= */
  function logTool() {
    const render = () => {
      const logs = FA.store.state.logs;
      const rows = logs.map(l => `<div class="list-row"><div style="flex:1">
        <b>${esc(l.title)}</b> <span class="pill">${'★'.repeat(l.rating || 0)}</span><br>
        <span style="font-size:13px;color:var(--muted)">${esc(l.date)}${l.refId ? ` · <a href="${FA.ui.routeOf(l.refType || 'recipe', l.refId)}" style="color:var(--accent-deep)">查看配方</a>` : ''}</span>
        ${l.note ? `<div style="font-size:14px;margin-top:4px">${esc(l.note)}</div>` : ''}</div>
        <button class="btn ghost sm" data-log-del="${l.id}">删除</button></div>`).join('');
      const body = `
        <div class="form-row">
          <div class="field"><label>日期</label><input id="lg-date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="field" style="flex:2"><label>做了什么</label><input id="lg-title" placeholder="如：宫保鸡丁"></div>
          <div class="field"><label>评分</label><select id="lg-rating"><option value="5">★★★★★</option><option value="4">★★★★</option><option value="3">★★★</option><option value="2">★★</option><option value="1">★</option></select></div>
        </div>
        <div class="field"><label>心得（可选）</label><textarea id="lg-note" rows="2" placeholder="火候、调味、家人反馈…"></textarea></div>
        <button class="btn" id="lg-add">保存记录</button>
        <div class="section" style="margin-top:20px"><h3 style="font-family:var(--font-d);margin-bottom:8px">历史记录（${logs.length}）</h3>
        ${logs.length ? rows : FA.ui.empty('📝', '还没有制作记录，每次下厨后记一笔吧')}</div>`;
      setTimeout(() => {
        const $ = id => document.getElementById(id);
        $('lg-add').onclick = () => {
          const title = $('lg-title').value.trim();
          if (!title) { FA.ui.toast('请填写做了什么'); return; }
          FA.store.logAdd({ date: $('lg-date').value, title, rating: +$('lg-rating').value, note: $('lg-note').value.trim() });
          FA.ui.toast('已保存'); FA.router.render();
        };
        document.querySelectorAll('[data-log-del]').forEach(b => b.onclick = () => { FA.store.logRemove(b.dataset.logDel); FA.router.render(); });
      }, 0);
      return layout('log', '📝 制作记录', '记录每次下厨：日期、菜品、评分与心得，积累个人经验。', body);
    };
    return render();
  }

  /* ---------- 工具箱首页 ---------- */
  function toolsHome() {
    const cards = FA.config.tools.map(t => `<a class="tool-entry" href="#/tools/${t.id}">
      <div class="te-ic">${t.icon}</div><div><h4>${t.name}</h4><p>${t.desc}</p></div></a>`).join('');
    return `<div class="wrap page">${FA.ui.pageHead('KITCHEN TOOLS', '厨房工具箱', '配方换算、食材管理、计时器……全部本地运行，不依赖网络与 AI。')}
      <div class="tool-grid" style="grid-template-columns:repeat(3,1fr)">${cards}</div></div>`;
  }

  FA.tools = { toolsHome, scaleTool, unitTool, subTool, fridgeTool, fridgeMatch, shopTool, menuTool, timerTool, tempTool, logTool, scaleIngredients, parseAmt, fmtNum };
})();
