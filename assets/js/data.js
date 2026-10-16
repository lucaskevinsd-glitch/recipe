/* FoodAtlas v2 — 数据层
 * 职责: 加载 data/*.json, 建立统一索引, 提供只读查询接口。
 * 对应架构文档第九章(数据库设计): JSON 文件即静态部署下的数据表映射。
 */
(function () {
  const DB = {
    recipes: [], baking: [], drinks: [],
    ingredients: [], substitutions: [],
    techniques: [], cultures: [],
    meta: {},
    byId: new Map(), // id -> {type, item}
    loaded: false,
    // 加载失败记录：key -> 错误信息，区分"空数据"与"加载失败"
    loadErrors: {},
  };

  const FILES = {
    recipes: 'data/recipes.json',
    baking: 'data/baking.json',
    drinks: 'data/drinks.json',
    ingredients: 'data/ingredients.json',
    substitutions: 'data/substitutions.json',
    techniques: 'data/techniques.json',
    cultures: 'data/cultures.json',
    meta: 'data/meta.json',
  };
  const AV = (FA.config && FA.config.assetV) || '';

  async function loadAll() {
    // 清空上次的错误记录
    DB.loadErrors = {};
    const entries = await Promise.all(Object.entries(FILES).map(async ([k, url]) => {
      try {
        const r = await fetch(url + (AV ? '?v=' + AV : ''));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        // 验证 Content-Type，避免把 HTML 当作 JSON 解析
        const ct = (r.headers.get('content-type') || '').toLowerCase();
        if (ct && !ct.includes('json') && !ct.includes('text/plain')) {
          throw new Error('非 JSON 响应: ' + ct);
        }
        const data = await r.json();
        // 验证数据结构：数据文件应为数组，meta 应为对象
        if (k === 'meta') {
          if (!data || typeof data !== 'object' || Array.isArray(data)) {
            throw new Error('meta 数据结构异常');
          }
        } else {
          if (!Array.isArray(data)) {
            throw new Error(k + ' 数据结构异常，期望数组');
          }
        }
        return [k, data];
      } catch (e) {
        // 记录错误，区分"加载失败"与"空数据"
        DB.loadErrors[k] = e.message;
        console.warn('[FA] 数据加载失败:', url, e.message);
        return [k, k === 'meta' ? {} : []];
      }
    }));
    for (const [k, v] of entries) DB[k] = v;
    // 统一 id 索引
    DB.byId.clear();
    const types = { recipes: 'recipe', baking: 'baking', drinks: 'drink', ingredients: 'ingredient', techniques: 'technique', cultures: 'culture' };
    for (const [k, t] of Object.entries(types)) {
      for (const item of (DB[k] || [])) {
        if (item && item.id) DB.byId.set(item.id, { type: t, item });
      }
    }
    DB.loaded = true;
    return DB;
  }

  function get(type, id) {
    const e = DB.byId.get(id);
    return e && (!type || e.type === type) ? e.item : null;
  }

  function list(type) {
    const map = { recipe: 'recipes', baking: 'baking', drink: 'drinks', ingredient: 'ingredients', technique: 'techniques', culture: 'cultures' };
    return DB[map[type]] || [];
  }

  function counts() {
    return {
      recipe: DB.recipes.length, baking: DB.baking.length, drink: DB.drinks.length,
      ingredient: DB.ingredients.length, technique: DB.techniques.length, culture: DB.cultures.length,
    };
  }

  // 检查是否有关键数据加载失败（用于 UI 显示加载失败状态）
  function hasLoadErrors() {
    return Object.keys(DB.loadErrors).length > 0;
  }

  // 获取加载失败的文件列表
  function getLoadErrors() {
    return { ...DB.loadErrors };
  }

  FA.data = { DB, loadAll, get, list, counts, byId: DB.byId, hasLoadErrors, getLoadErrors };
})();
