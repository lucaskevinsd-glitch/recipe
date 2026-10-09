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

  async function loadAll() {
    const entries = await Promise.all(Object.entries(FILES).map(async ([k, url]) => {
      try {
        const r = await fetch(url, { cache: 'no-cache' });
        if (!r.ok) throw new Error(r.status);
        return [k, await r.json()];
      } catch (e) {
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

  FA.data = { DB, loadAll, get, list, counts, byId: DB.byId };
})();
