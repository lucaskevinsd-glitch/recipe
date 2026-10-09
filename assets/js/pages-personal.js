/* FoodAtlas v2 — 个人空间: 我的厨房 (架构文档 2.2 / 第十一章) */
(function () {
  const { esc, card } = FA.ui;

  const TABS = [
    { id: 'fav', label: '我的收藏' }, { id: 'recent', label: '最近浏览' },
    { id: 'fridge', label: '我的冰箱' }, { id: 'shopping', label: '购物清单' },
    { id: 'menu', label: '我的菜单' }, { id: 'logs', label: '制作记录' },
    { id: 'prefs', label: '我的偏好' }, { id: 'backup', label: '数据备份' },
  ];

  function stats() {
    const s = FA.store.state;
    return `<div class="stat-cards">
      <div class="stat-card"><div class="n">${s.favorites.length}</div><div class="l">收藏</div></div>
      <div class="stat-card"><div class="n">${s.fridge.length}</div><div class="l">冰箱食材</div></div>
      <div class="stat-card"><div class="n">${s.shopping.filter(x => !x.done).length}</div><div class="l">待购</div></div>
      <div class="stat-card"><div class="n">${s.logs.length}</div><div class="l">制作记录</div></div>
    </div>`;
  }

  function favTab() {
    const groups = {};
    FA.store.state.favorites.forEach(f => {
      const it = FA.data.get(f.type, f.id); if (!it) return;
      (groups[f.type] = groups[f.type] || []).push(it);
    });
    const types = Object.keys(groups);
    if (!types.length) return FA.ui.empty('⭐', '还没有收藏，看到喜欢的内容点右上角 ☆ 即可收藏');
    return types.map(t => `<h3 style="font-family:var(--font-d);margin:18px 0 12px">${FA.ui.TYPE_LABEL[t]}</h3>
      <div class="grid-cards">${groups[t].map(x => card(x, t)).join('')}</div>`).join('');
  }

  function recentTab() {
    const items = FA.store.state.recent.map(r => { const it = FA.data.get(r.type, r.id); return it ? { t: r.type, it } : null; }).filter(Boolean);
    if (!items.length) return FA.ui.empty('👣', '还没有浏览记录');
    return `<div class="grid-cards">${items.map(({ t, it }) => card(it, t)).join('')}</div>`;
  }

  function fridgeTab() {
    const st = FA.store.state.fridge;
    return `<div style="display:flex;gap:10px;margin-bottom:14px"><a class="btn sm" href="#/tools/fridge">管理冰箱</a>
      <a class="btn soft sm" href="#/tools/fridge/match">按冰箱找菜 →</a></div>` +
      (st.length ? st.map(f => `<div class="list-row"><b style="flex:1">${esc(f.name)}</b>
        <span style="color:var(--muted);font-size:13px">${esc([f.qty, f.unit].filter(Boolean).join(''))}</span></div>`).join('')
        : FA.ui.empty('🧊', '冰箱是空的', '<a class="btn sm" href="#/tools/fridge">去添加</a>'));
  }

  function shoppingTab() {
    const st = FA.store.state.shopping;
    const open = st.filter(x => !x.done);
    return `<div style="margin-bottom:14px"><a class="btn sm" href="#/tools/shopping">管理购物清单</a></div>` +
      (open.length ? `<p style="color:var(--muted);font-size:14px;margin-bottom:8px">还有 ${open.length} 样待购：</p>` +
        open.map(x => `<div class="list-row"><b style="flex:1">${esc(x.name)}</b><span style="color:var(--muted);font-size:13px">${esc(x.qty || '')}</span></div>`).join('')
        : FA.ui.empty('🛒', '没有待购项目'));
  }

  function menuTab() {
    const wk = FA.store.weekKey();
    const menu = FA.store.menuGet(wk);
    const names = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    let has = false, rows = '';
    for (let d = 0; d < 7; d++) for (const slot of ['lunch', 'dinner']) {
      const rid = (menu[d] || {})[slot];
      if (rid) { has = true; const r = FA.data.get('recipe', rid); rows += `<div class="list-row"><span style="color:var(--muted);width:90px">${names[d]}${slot === 'lunch' ? '午餐' : '晚餐'}</span><b style="flex:1">${esc(r ? r.name : rid)}</b></div>`; }
    }
    return `<div style="margin-bottom:14px"><a class="btn sm" href="#/tools/menu">规划一周菜单</a></div>` +
      (has ? rows : FA.ui.empty('📅', '本周还没有安排', '<a class="btn sm" href="#/tools/menu">去规划</a>'));
  }

  function logsTab() {
    const logs = FA.store.state.logs.slice(0, 20);
    return `<div style="margin-bottom:14px"><a class="btn sm" href="#/tools/log">写制作记录</a></div>` +
      (logs.length ? logs.map(l => `<div class="list-row"><div style="flex:1"><b>${esc(l.title)}</b>
        <span class="pill">${'★'.repeat(l.rating || 0)}</span><br><span style="font-size:13px;color:var(--muted)">${esc(l.date)}</span>
        ${l.note ? `<div style="font-size:14px">${esc(l.note)}</div>` : ''}</div></div>`).join('')
        : FA.ui.empty('📝', '还没有制作记录'));
  }

  function prefsTab() {
    const p = FA.store.state.prefs;
    const body = `<div class="field" style="max-width:320px"><label>默认份量（人份）</label>
      <input id="pf-serv" type="number" min="1" max="12" value="${p.defaultServings || 3}"></div>
      <button class="btn sm" id="pf-save">保存偏好</button>
      <p style="font-size:13px;color:var(--muted);margin-top:12px">偏好保存在本机。AI 助手接入后，可在此管理口味偏好、忌口与过敏原。</p>`;
    setTimeout(() => {
      document.getElementById('pf-save').onclick = () => {
        FA.store.state.prefs.defaultServings = Math.max(1, +document.getElementById('pf-serv').value || 3);
        FA.store.save(); FA.ui.toast('偏好已保存');
      };
    }, 0);
    return body;
  }

  function backupTab() {
    const body = `
      <p style="color:var(--muted);font-size:14px;margin-bottom:16px">个人数据保存在本机浏览器。定期导出备份，换设备时导入即可迁移。</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:20px">
        <button class="btn sm" id="bk-exp">导出备份文件</button>
        <label class="btn ghost sm" style="cursor:pointer">导入备份<input type="file" id="bk-imp" accept=".json" hidden></label>
        <button class="btn ghost sm" id="bk-reset" style="color:var(--danger)">清空全部个人数据</button>
      </div>
      <div class="result-box" style="font-size:14px">备份包含：收藏 ${FA.store.state.favorites.length} · 冰箱 ${FA.store.state.fridge.length} · 购物清单 ${FA.store.state.shopping.length} · 制作记录 ${FA.store.state.logs.length}</div>`;
    setTimeout(() => {
      document.getElementById('bk-exp').onclick = () => {
        const blob = new Blob([FA.store.exportJSON()], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'foodatlas-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        a.click(); URL.revokeObjectURL(a.href);
        FA.ui.toast('备份已导出');
      };
      document.getElementById('bk-imp').onchange = e => {
        const f = e.target.files[0]; if (!f) return;
        const r = new FileReader();
        r.onload = () => {
          try { FA.store.importJSON(r.result); FA.ui.toast('备份已导入'); FA.router.render(); }
          catch (err) { FA.ui.toast('导入失败：文件格式不正确'); }
        };
        r.readAsText(f);
      };
      document.getElementById('bk-reset').onclick = () => {
        if (confirm('确定清空全部个人数据吗？此操作不可恢复，建议先导出备份。')) {
          FA.store.resetAll(); FA.ui.toast('已清空'); FA.router.render();
        }
      };
    }, 0);
    return body;
  }

  function render(query) {
    const tab = (query.tab || 'fav');
    const tabs = { fav: favTab, recent: recentTab, fridge: fridgeTab, shopping: shoppingTab, menu: menuTab, logs: logsTab, prefs: prefsTab, backup: backupTab };
    const fn = tabs[tab] || favTab;
    const html = `${FA.ui.pageHead('MY KITCHEN', '我的厨房', '收藏、库存、菜单与制作记录，一处管理。')}
      ${stats()}
      <div class="kitchen-tabs">${TABS.map(t => `<a class="chip ${t.id === tab ? 'on' : ''}" href="#/kitchen?tab=${t.id}">${t.label}</a>`).join('')}</div>
      <div>${fn()}</div>`;
    document.getElementById('app').innerHTML = `<div class="wrap page">${html}</div>`;
  }

  FA.pagesPersonal = { render };
})();
