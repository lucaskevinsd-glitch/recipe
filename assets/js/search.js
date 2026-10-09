/* FoodAtlas v2 — 搜索
 * 关键词检索 + 分类/标签/条件过滤 + 简单自然语言解析。
 * 语义向量检索与 AI 整理属于 AI 层, 待 AI 接口接入后实现。
 */
(function () {
  // ---------- 自然语言解析 ----------
  function parseNL(q) {
    const f = { text: q, maxTime: 0, noOven: false, tags: [], level: '', mustIng: [] };
    let t = q;
    let m = t.match(/(\d+)\s*分钟\s*(内|以[下内])/);
    if (m) { f.maxTime = +m[1]; t = t.replace(m[0], ' '); }
    if (/不?需要烤箱|不用烤箱|无烤箱/.test(t)) { f.noOven = true; t = t.replace(/不?需要烤箱|不用烤箱|无烤箱/g, ' '); }
    const tagWords = ['低糖', '清爽', '快手', '新手', '下饭', '解腻', '早餐', '夜宵', '减脂', '高蛋白', '素食', '微辣', '酸甜'];
    for (const w of tagWords) if (t.includes(w)) { f.tags.push(w); t = t.replace(w, ' '); }
    if (/新手|入门|简单/.test(t)) f.level = '入门';
    // 剩余文本中的食材词: 与食材库名称做包含匹配
    const rest = t.replace(/\s+/g, ' ').trim();
    if (rest) {
      const ingNames = FA.data.list('ingredient').map(x => x.name).filter(Boolean);
      // 取 2-4 字片段与食材名互相包含
      const cand = [];
      for (let i = 0; i < rest.length; i++)
        for (let l = 2; l <= 4 && i + l <= rest.length; l++)
          cand.push(rest.slice(i, i + l));
      f.mustIng = [...new Set(cand.filter(c => ingNames.some(n => n === c || (c.length >= 2 && n.includes(c)))).slice(0, 4))];
    }
    f.text = rest;
    return f;
  }

  function itemText(type, item) {
    const parts = [item.name || item.title, item.alias, item.category, item.cuisine, item.region];
    if (item.tags) parts.push(...item.tags);
    if (item.tastes) parts.push(...item.tastes);
    (item.ingredients || []).forEach(x => parts.push(typeof x === 'string' ? x : (x.name + ' ' + (x.note || ''))));
    if (item.formula) item.formula.forEach(x => parts.push(x.name));
    parts.push(item.summary);
    return parts.filter(Boolean).join(' ');
  }

  function score(type, item, raw) {
    const name = (item.name || item.title || '');
    const hay = itemText(type, item);
    let s = 0;
    if (raw && name.includes(raw)) s += 100;
    if (raw && hay.includes(raw)) s += 30;
    // 单字级匹配: "鸡肉"能命中"鸡腿肉"
    const chars = [...new Set(String(raw || '').replace(/\s+/g, ''))];
    for (const ch of chars) {
      if (name.includes(ch)) s += 10;
      else if (hay.includes(ch)) s += 3;
    }
    return s;
  }

  function search(rawQ, opts) {
    opts = opts || {};
    const q = (rawQ || '').trim();
    const nl = parseNL(q);
    const types = opts.types || ['recipe', 'baking', 'drink', 'ingredient', 'technique', 'culture'];
    const out = [];
    for (const type of types) {
      for (const item of FA.data.list(type)) {
        // 查询词被过滤器完全消耗时(如"30分钟内"), 按过滤器返回全部
        let s = q ? score(type, item, nl.text) : 1;
        if (q && !nl.text && (nl.maxTime || nl.noOven || nl.tags.length || nl.mustIng.length)) s = 1;
        if (q && s <= 0) continue;
        // 过滤器
        if (opts.category && item.category !== opts.category) continue;
        if (opts.level && item.level !== opts.level) continue;
        if (nl.maxTime && (FA.ui.totalTime(item) || 9999) > nl.maxTime) continue;
        if (nl.noOven && (item.equipment || []).includes('烤箱')) continue;
        for (const tg of nl.tags.concat(opts.tags || [])) {
          const ht = itemText(type, item);
          if (!ht.includes(tg)) { s = -1; break; }
        }
        if (s < 0) continue;
        if (nl.mustIng.length) {
          const ht = itemText(type, item);
          const hit = nl.mustIng.filter(w => ht.includes(w)).length;
          s += hit * 20; // 食材命中为加分项，不做硬过滤（"鸡肉"应能命中"鸡腿肉"）
        }
        if (nl.level && item.level && !['入门', '简单'].includes(item.level) && nl.level === '入门') s -= 5;
        out.push({ type, item, score: s });
      }
    }
    out.sort((a, b) => b.score - a.score);
    return { results: out.slice(0, opts.limit || 60), parsed: nl };
  }

  function describeParsed(nl) {
    const d = [];
    if (nl.maxTime) d.push(`${nl.maxTime} 分钟内`);
    if (nl.noOven) d.push('不需要烤箱');
    nl.tags.forEach(t => d.push(t));
    nl.mustIng.forEach(w => d.push('含' + w));
    return d;
  }

  FA.search = { search, parseNL, describeParsed };
})();
