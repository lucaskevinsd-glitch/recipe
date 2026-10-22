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
        open.map(x => {
          const sum = FA.store.shopSummary ? FA.store.shopSummary(x.name) : null;
          const auto = sum && sum.groups.length ? ` · 自动 ${sum.groups.map(g => FA.tools.fmtNum(g.total) + g.unit).join(' + ')}` : '';
          return `<div class="list-row"><b style="flex:1">${esc(x.name)}</b><span style="color:var(--muted);font-size:13px">${esc(x.qty || '')}${auto}</span></div>`;
        }).join('')
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
      <div class="result-box" style="font-size:14px">备份包含：收藏 ${FA.store.state.favorites.length} · 冰箱 ${FA.store.state.fridge.length} · 购物清单 ${FA.store.state.shopping.length} · 制作记录 ${FA.store.state.logs.length}</div>
      <h3 style="margin:24px 0 10px">离线图片</h3>
      <p style="color:var(--muted);font-size:14px;margin-bottom:12px">下载全部菜谱图片（原图 + 缩略图），离线时也可查看图片。建议在 WiFi 环境下下载。</p>
      <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">
        <button class="btn sm" id="dl-imgs">下载全部菜谱图片</button>
        <button class="btn ghost sm" id="dl-check" style="display:none">检查缓存状态</button>
      </div>
      <div id="dl-status" class="result-box" style="font-size:14px;display:none"></div>
      <div id="dl-progress" style="display:none;margin-top:12px">
        <div style="background:var(--line);border-radius:6px;height:20px;overflow:hidden">
          <div id="dl-bar" style="background:var(--terra);height:100%;width:0%;transition:width .3s"></div>
        </div>
        <div id="dl-text" style="font-size:13px;color:var(--muted);margin-top:6px"></div>
      </div>`;
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
      // 离线图片下载
      document.getElementById('dl-imgs').onclick = async () => {
        const btn = document.getElementById('dl-imgs');
        const statusEl = document.getElementById('dl-status');
        const progressEl = document.getElementById('dl-progress');
        const barEl = document.getElementById('dl-bar');
        const textEl = document.getElementById('dl-text');
        btn.disabled = true;
        btn.textContent = '下载中…';
        statusEl.style.display = 'block';
        progressEl.style.display = 'block';
        try {
          // 检查存储空间（预检查，非成功保证；实际写入时仍可能因配额不足失败）
          if (navigator.storage && navigator.storage.estimate) {
            try {
              const est = await navigator.storage.estimate();
              const available = (est.quota - est.usage) / 1024 / 1024;
              if (available < 100) {
                statusEl.innerHTML = `⚠️ 存储空间可能不足（预估可用约 ${available.toFixed(0)} MB，约需 85 MB）。请清理空间后重试。`;
                btn.disabled = false;
                btn.textContent = '下载全部菜谱图片';
                return;
              }
            } catch (e) {
              // 预检查失败不阻止下载，实际写入时 SW 会报告配额错误
              console.warn('[FA] 存储空间预检查失败:', e.message);
            }
          }
          // 收集全部图片 URL（原图 + 缩略图）
          const urls = new Set();
          for (const type of ['recipe', 'baking', 'drink', 'ingredient']) {
            for (const item of FA.data.list(type)) {
              if (item.image) {
                urls.add(item.image);
                const thumb = FA.ui.thumbUrl(item.image);
                if (thumb !== item.image) urls.add(thumb);
              }
            }
          }
          const urlList = [...urls];
          statusEl.innerHTML = `共 ${urlList.length} 张图片，正在检查缓存…`;
          // 监听 SW 进度消息
          const onMsg = (e) => {
            const d = e.data;
            if (d.type === 'CACHE_BUSY') {
              // SW 已有下载任务在运行，拒绝重复请求
              navigator.serviceWorker.removeEventListener('message', onMsg);
              statusEl.innerHTML = '⚠️ 下载任务已在进行中，请等待完成后再试。';
              btn.disabled = false;
              btn.textContent = '下载全部菜谱图片';
            } else if (d.type === 'CACHE_PROGRESS') {
              const pct = Math.round((d.done / d.total) * 100);
              barEl.style.width = pct + '%';
              textEl.textContent = `已处理 ${d.done}/${d.total}，成功 ${d.success}，失败 ${d.failed}`;
            } else if (d.type === 'CACHE_COMPLETE') {
              navigator.serviceWorker.removeEventListener('message', onMsg);
              barEl.style.width = '100%';
              if (d.failed === 0) {
                statusEl.innerHTML = `✅ 下载完成：共 ${d.total} 张，全部成功。离线时可查看全部菜谱图片。`;
              } else {
                statusEl.innerHTML = `⚠️ 下载完成：共 ${d.total} 张，成功 ${d.success} 张，失败 ${d.failed} 张。<br>可再次点击下载按钮重试失败项。`;
                // 保存失败列表供重试
                window.__FA_FAILED_URLS = d.failedUrls;
              }
              btn.disabled = false;
              btn.textContent = '下载全部菜谱图片';
            }
          };
          navigator.serviceWorker.addEventListener('message', onMsg);
          // 发送给 SW
          const reg = await navigator.serviceWorker.ready;
          if (reg.active) {
            reg.active.postMessage({ type: 'CACHE_IMAGES', urls: urlList });
          } else {
            throw new Error('Service Worker 未激活');
          }
          // 超时保护：5 分钟无响应则提示
          setTimeout(() => {
            if (btn.disabled) {
              navigator.serviceWorker.removeEventListener('message', onMsg);
              statusEl.innerHTML = '⚠️ 下载超时，请检查网络后重试。';
              btn.disabled = false;
              btn.textContent = '下载全部菜谱图片';
            }
          }, 5 * 60 * 1000);
        } catch (err) {
          statusEl.innerHTML = `❌ 下载失败：${err.message || '未知错误'}，请检查网络后重试。`;
          btn.disabled = false;
          btn.textContent = '下载全部菜谱图片';
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
