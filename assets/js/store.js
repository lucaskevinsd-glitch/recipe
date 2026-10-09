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
    shopping: [],    // {name, qty, done}
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
  function fridgeHas(ingName) {
    // 模糊匹配: 任一方向包含即算有
    return s.fridge.some(f => f.name && ingName && (ingName.includes(f.name) || f.name.includes(ingName)));
  }

  // ---- 购物清单 ----
  function shopAdd(name, qty) {
    name = (name || '').trim(); if (!name) return false;
    if (!s.shopping.some(x => x.name === name)) s.shopping.push({ name, qty: qty || '', done: false });
    save(); return true;
  }
  function shopToggle(name) { const x = s.shopping.find(x => x.name === name); if (x) { x.done = !x.done; save(); } }
  function shopRemove(name) { s.shopping = s.shopping.filter(x => x.name !== name); save(); }
  function shopClearDone() { s.shopping = s.shopping.filter(x => !x.done); save(); }

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
    weekKey, menuGet, menuSet,
    logAdd, logRemove,
    exportJSON, importJSON, resetAll,
  };
})();
