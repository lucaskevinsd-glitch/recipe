/* FoodAtlas v2 — 个人数据层
 * 职责: 收藏/最近浏览/冰箱/购物清单/菜单/制作记录/偏好 的读写与备份。
 * 对应架构文档第十一章: 静态部署下个人数据保存在本机(localStorage),
 * 通过导出/导入实现备份与跨设备迁移; 后端 API 上线后替换本模块的读写实现即可。
 */
(function () {
  const KEY = 'foodatlas.v2.store';
  const blank = () => ({
    favorites: [],   // {type, id, at}
    recent: [],      // {type, id, at}
    fridge: [],      // {name, qty, unit, exp}
    shopping: [],    // {name, qty, done, auto?, sources?} — sources/auto 为三阶段A新增可选字段, 旧数据无此字段按手动项目解释
    menus: {},       // weekKey -> {day: [recipeId]}
    logs: [],        // {id, date, title, refType, refId, rating, note}
    prefs: { defaultServings: 3 },
  });
  let s = blank();
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) s = Object.assign(blank(), JSON.parse(raw));
  } catch (e) { /* 损坏则重置 */ }

  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(s)); } catch (e) {}
  }
  const now = () => Date.now();

  // ---- 收藏 ----
  function isFav(type, id) { return s.favorites.some(f => f.type === type && f.id === id); }
  function toggleFav(type, id) {
    const i = s.favorites.findIndex(f => f.type === type && f.id === id);
    if (i >= 0) s.favorites.splice(i, 1); else s.favorites.unshift({ type, id, at: now() });
    save(); return i < 0;
  }

  // ---- 最近浏览 (最多 30) ----
  function pushRecent(type, id) {
    s.recent = s.recent.filter(r => !(r.type === type && r.id === id));
    s.recent.unshift({ type, id, at: now() });
    s.recent = s.recent.slice(0, 30);
    save();
  }

  // ---- 冰箱 ----
  function fridgeAdd(name, qty, unit, exp) {
    name = (name || '').trim(); if (!name) return false;
    const ex = s.fridge.find(f => f.name === name);
    if (ex) { if (qty) ex.qty = qty; if (unit) ex.unit = unit; if (exp) ex.exp = exp; }
    else s.fridge.push({ name, qty: qty || '', unit: unit || '', exp: exp || '' });
    save(); return true;
  }
  function fridgeRemove(name) { s.fridge = s.fridge.filter(f => f.name !== name); save(); }
  // 冰箱匹配 (四阶段B): 精确匹配 + 食材库显式别名, 不再使用子串模糊匹配 (鸡≠鸡蛋, 葱≠洋葱)
  // 标准化只做无语义处理: 去首尾空白、全角空格转半角、内部连续空白合并
  function fridgeNorm(name) {
    return String(name == null ? '' : name).replace(/　/g, ' ').trim().replace(/\s+/g, ' ');
  }
  // 别名规范名映射: 数据来自 ingredients 的 alias 字段 (显式同义词, 如 菠菜=赤根菜);
  // 两遍构建: 先登记全部标准名, 再登记别名; 别名若与标准名冲突或被多个食材认领 (一义多指, 如 蒜苗) 则禁用
  let _fridgeAlias = null;
  function fridgeAliasMap() {
    if (_fridgeAlias) return _fridgeAlias;
    const map = new Map();
    try {
      const list = FA.data && FA.data.list ? FA.data.list('ingredient') : [];
      list.forEach(g => { const c = fridgeNorm(g && g.name); if (c) map.set(c, c); });
      const ambiguous = new Set();
      list.forEach(g => {
        const c = fridgeNorm(g && g.name); const a = fridgeNorm(g && g.alias);
        if (!c || !a || a === c) return;
        if (map.has(a) && map.get(a) !== c) { ambiguous.add(a); return; }
        map.set(a, c);
      });
      ambiguous.forEach(a => { if (map.get(a) !== a) map.delete(a); });
    } catch (e) { /* 食材数据不可用时退化为纯精确匹配 */ }
    _fridgeAlias = map;
    return map;
  }
  function fridgeHas(ingName) {
    const target = fridgeNorm(ingName);
    if (!target) return false;
    const map = fridgeAliasMap();
    const tc = map.get(target) || target;
    return s.fridge.some(f => {
      const fn = fridgeNorm(f && f.name);
      return !!fn && (map.get(fn) || fn) === tc;
    });
  }

  // ---- 购物清单 ----
  function shopAdd(name, qty) {
    name = (name || '').trim(); if (!name) return false;
    const ex = s.shopping.find(x => x.name === name);
    if (!ex) s.shopping.push({ name, qty: qty || '', done: false });
    // 三阶段B最小扩展: 项目已有自动来源且手动数量为空时, 手动添加补写 qty, 避免用户输入被静默丢弃;
    // 纯手动项目的重复添加仍保持原语义 (不覆盖已有 qty)
    else if (qty && !ex.qty && Array.isArray(ex.sources) && ex.sources.length) ex.qty = qty;
    save(); return true;
  }
  function shopToggle(name) { const x = s.shopping.find(x => x.name === name); if (x) { x.done = !x.done; save(); } }
  function shopRemove(name) { s.shopping = s.shopping.filter(x => x.name !== name); save(); }
  function shopClearDone() { s.shopping = s.shopping.filter(x => !x.done); save(); }

  // ---- 购物清单: 自动来源贡献 (三阶段A) ----
  // 模型: 项目仍以 name 为唯一记录; sources[] 保存自动生成的来源贡献, 与手动 qty 并存、互不覆盖。
  // - 无 sources 的项目 (含全部旧数据与手动添加) 按手动项目解释, 永远不会被来源操作删除。
  // - 贡献以 key 为稳定标识 (如 'recipe:tomato'), 同 key 重复提交是替换而非累加 (幂等)。
  // - 勾选/删除仍作用于整个项目 (沿用 shopToggle/shopRemove 的既有语义)。
  // - normNum/normUnit 只在单位可归入重量/体积且因子确定时给出; 计数/包装/量具单位不归一 (null)。
  const SHOP_NORM = {
    '克': ['克', 1], 'g': ['克', 1], 'kg': ['克', 1000], '千克': ['克', 1000], '斤': ['克', 500],
    'ml': ['ml', 1], '毫升': ['ml', 1], 'l': ['ml', 1000], '升': ['ml', 1000], 'L': ['ml', 1000],
  };
  function shopNormAmount(num, unit) {
    if (typeof num !== 'number' || !Number.isFinite(num)) return null;
    const t = SHOP_NORM[unit];
    if (!t) return null;
    return { num: num * t[1], unit: t[0] };
  }
  function shopSources(name) {
    const x = s.shopping.find(i => i.name === name);
    if (!x || !Array.isArray(x.sources)) return [];
    return x.sources.map(c => ({ ...c }));
  }
  function shopAddSource(name, contrib) {
    name = (name || '').trim(); if (!name) return false;
    if (!contrib || !contrib.key) return false;
    let x = s.shopping.find(i => i.name === name);
    if (!x) { x = { name, qty: '', done: false, auto: true }; s.shopping.push(x); }
    if (!Array.isArray(x.sources)) x.sources = [];
    const norm = shopNormAmount(contrib.num, contrib.unit);
    const entry = {
      key: String(contrib.key),
      from: contrib.from || '',
      label: contrib.label || '',
      text: contrib.text || '',
      num: typeof contrib.num === 'number' && Number.isFinite(contrib.num) ? contrib.num : null,
      unit: contrib.unit || '',
      normNum: norm ? norm.num : null,
      normUnit: norm ? norm.unit : null,
    };
    const i = x.sources.findIndex(c => c.key === entry.key);
    if (i >= 0) x.sources[i] = entry; else x.sources.push(entry);
    save(); return true;
  }
  function shopRemoveSource(name, key) {
    const x = s.shopping.find(i => i.name === name);
    if (!x || !Array.isArray(x.sources)) return false;
    const before = x.sources.length;
    x.sources = x.sources.filter(c => c.key !== String(key));
    if (x.sources.length === before) return false;
    if (!x.sources.length) {
      delete x.sources;
      // 纯自动项目 (自动创建且无手动数量) 在来源清空后移除; 带手动内容的项目保留并转为纯手动项目
      if (x.auto && !x.qty) s.shopping = s.shopping.filter(i => i.name !== name);
      else delete x.auto;
    }
    save(); return true;
  }
  // 来源汇总 (三阶段B): 只读计算, 不修改数据。
  // 分组规则: 有归一值 (normUnit 克/ml) 的贡献按归一单位求和; 无归一但数值可解析的 (计数单位) 按原单位分组求和;
  // 其余 (不可解析/缺失) 进 singles 逐条保留。手动 qty 原样返回, 永不并入自动求和。
  function shopSummary(name) {
    const x = s.shopping.find(i => i.name === name);
    if (!x) return null;
    const srcs = Array.isArray(x.sources) ? x.sources : [];
    const byKey = new Map();
    const singles = [];
    for (const c of srcs) {
      if (typeof c.normNum === 'number' && Number.isFinite(c.normNum) && c.normUnit) {
        const k = 'n:' + c.normUnit;
        if (!byKey.has(k)) byKey.set(k, { unit: c.normUnit, total: 0, count: 0 });
        const g = byKey.get(k); g.total += c.normNum; g.count++;
      } else if (typeof c.num === 'number' && Number.isFinite(c.num) && c.unit) {
        const k = 'c:' + c.unit;
        if (!byKey.has(k)) byKey.set(k, { unit: c.unit, total: 0, count: 0 });
        const g = byKey.get(k); g.total += c.num; g.count++;
      } else singles.push({ ...c });
    }
    return {
      name: x.name, qty: x.qty || '', done: !!x.done,
      groups: [...byKey.values()], singles, sources: srcs.map(c => ({ ...c })),
    };
  }

  // ---- 一周菜单 ----
  function weekKey(d) {
    d = d || new Date();
    const t = new Date(d); t.setHours(0, 0, 0, 0);
    const day = (t.getDay() + 6) % 7; t.setDate(t.getDate() - day); // 周一
    return t.toISOString().slice(0, 10);
  }
  function menuGet(wk) { return s.menus[wk] || {}; }
  function menuSet(wk, day, slot, recipeId) {
    if (!s.menus[wk]) s.menus[wk] = {};
    if (!s.menus[wk][day]) s.menus[wk][day] = {};
    if (recipeId) s.menus[wk][day][slot] = recipeId; else delete s.menus[wk][day][slot];
    save();
  }

  // ---- 制作记录 ----
  function logAdd(e) {
    e.id = 'log' + now(); e.date = e.date || new Date().toISOString().slice(0, 10);
    s.logs.unshift(e); save(); return e.id;
  }
  function logRemove(id) { s.logs = s.logs.filter(l => l.id !== id); save(); }

  // ---- 备份 ----
  function exportJSON() {
    return JSON.stringify({ app: 'FoodAtlas', version: 2, exportedAt: new Date().toISOString(), data: s }, null, 2);
  }
  function importJSON(text) {
    const o = JSON.parse(text);
    if (!o || !o.data || o.app !== 'FoodAtlas') throw new Error('文件格式不正确');
    s = Object.assign(blank(), o.data); save(); return true;
  }
  function resetAll() { s = blank(); save(); }

  FA.store = {
    get state() { return s; },
    save, isFav, toggleFav, pushRecent,
    fridgeAdd, fridgeRemove, fridgeHas,
    shopAdd, shopToggle, shopRemove, shopClearDone,
    shopAddSource, shopRemoveSource, shopSources, shopSummary,
    weekKey, menuGet, menuSet,
    logAdd, logRemove,
    exportJSON, importJSON, resetAll,
  };
})();
