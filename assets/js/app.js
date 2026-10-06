
(function(){
  const recipes=window.__DATA__.recipes;
  const ingredientGroups=window.__DATA__.ingredientGroups;
  const ingredients=ingredientGroups.flatMap(g=>g.items.split(',').map((entry,i)=>{const parts=entry.split('/');return{id:`${g.cat}-${i}`,name:parts[0],alias:parts[1]||'',cat:g.cat,nutrient:g.nutrient}}));
  const ingredientDetails=window.__DATA__.ingredientDetails;
  const ingredientImages=window.__DATA__.ingredientImages;
  const workouts=window.__DATA__.workouts;
  const mealPlans=window.__DATA__.mealPlans;
  const dayNames=window.__DATA__.dayNames;
  let section='recipes',recipeFilter='全部',ingredientFilter='全部',muscleFilter='全部',planDay=0,mealSet=0;
  const selectedIngredients=new Set();
  const q=s=>document.querySelector(s),qa=s=>Array.from(document.querySelectorAll(s));
  const searchInput=q('#search');
  let searchComposing=false;

  function normalizeSearch(value){
    const text=String(value==null?'':value);
    return (typeof text.normalize==='function'?text.normalize('NFKC'):text).toLowerCase().replace(/\s+/g,'').trim();
  }
  function matchesSearch(values,term){return normalizeSearch(values.join(' ')).includes(term)}
  function recipeMatches(r,term){return matchesSearch([r.name,r.alias,r.summary,...r.tags,...r.ingredients],term)}
  function ingredientMatches(x,term){return matchesSearch([x.name,x.alias,x.cat,x.nutrient],term)}
  function workoutMatches(w,term){return matchesSearch([w.name,w.muscle,w.focus,w.cue,w.plan,w.tip],term)}

  function renderRecipes(){
    const term=normalizeSearch(searchInput.value);
    let list=recipes.filter(r=>(recipeFilter==='全部'||r.cats.includes(recipeFilter))&&recipeMatches(r,term));
    if(term&&list.length===0&&recipes.some(r=>recipeMatches(r,term))){recipeFilter='全部';qa('.filters .chip').forEach(x=>x.classList.toggle('active',x.dataset.filter==='全部'));list=recipes.filter(r=>recipeMatches(r,term))}
    q('#recipeGrid').innerHTML=list.map(r=>`<button class="recipe" data-id="${r.id}" aria-label="查看${r.name}详情"><div class="recipe-image"><img src="${r.image}" alt="${r.name}"><span class="time">${r.time}</span></div><div class="recipe-body"><h3>${r.name}</h3><div class="alias">${r.alias.replace('又名：','')}</div><p class="tagline">${r.summary}</p><div class="tags">${r.tags.map(t=>`<span class="tag">${t}</span>`).join('')}</div></div></button>`).join('');
    q('#resultCount').textContent=`${list.length} 道菜谱`;
    q('#recipeEmpty').style.display=list.length?'none':'block';
    qa('.recipe').forEach(el=>el.addEventListener('click',()=>openRecipe(el.dataset.id)));
  }
  function renderIngredientFilters(){
    const cats=['全部',...ingredientGroups.map(g=>g.cat)];
    q('#ingredientFilters').innerHTML=cats.map(cat=>`<button class="chip ingredient-chip ${cat===ingredientFilter?'active':''}" data-cat="${cat}">${cat}</button>`).join('');
    qa('.ingredient-chip').forEach(b=>b.addEventListener('click',()=>{ingredientFilter=b.dataset.cat;renderIngredientFilters();renderIngredients()}));
  }
  function renderIngredients(){
    const term=normalizeSearch(searchInput.value);
    let list=ingredients.filter(x=>(ingredientFilter==='全部'||x.cat===ingredientFilter)&&ingredientMatches(x,term));
    if(term&&list.length===0&&ingredients.some(x=>ingredientMatches(x,term))){ingredientFilter='全部';renderIngredientFilters();list=ingredients.filter(x=>ingredientMatches(x,term))}
    q('#ingredientGrid').innerHTML=list.map(x=>{const media=ingredientImages[x.id]||{};return `<article class="ingredient ${selectedIngredients.has(x.id)?'selected':''}"><button class="ingredient-preview" type="button" data-detail="${x.id}" aria-label="查看${x.name}图片与介绍"><span class="ingredient-photo">${media.image?`<img src="${media.image}" alt="${x.name}实物" loading="lazy" decoding="async">`:'<span>图片整理中</span>'}</span><span class="ingredient-info"><span class="ingredient-name">${x.name}</span><span class="ingredient-alias">${x.alias?`别名：${x.alias}`:x.cat}</span><span class="ingredient-meta">${x.nutrient}</span></span></button><button class="ingredient-select" type="button" data-ingredient="${x.id}" aria-pressed="${selectedIngredients.has(x.id)}">${selectedIngredients.has(x.id)?'已加入组合':'加入组合'}</button></article>`}).join('');
    q('#ingredientCount').textContent=`${list.length} 种食材 · 共收录 ${ingredients.length} 种`;
    q('#ingredientEmpty').style.display=list.length?'none':'block';
    qa('[data-detail]').forEach(b=>b.addEventListener('click',()=>openIngredient(b.dataset.detail)));
    qa('.ingredient-select').forEach(b=>b.addEventListener('click',()=>toggleIngredient(b.dataset.ingredient)));
  }
  let activeIngredientId='';
  function toggleIngredient(id){
    if(selectedIngredients.has(id))selectedIngredients.delete(id);else if(selectedIngredients.size<6)selectedIngredients.add(id);
    q('#ideaList').innerHTML='';q('#ideaSummary').hidden=true;renderIngredients();renderSelection();
    if(activeIngredientId===id)q('#ingredientDetailSelect').textContent=selectedIngredients.has(id)?'从组合中移除':'加入组合做菜';
  }
  function renderSelection(){
    const chosen=ingredients.filter(x=>selectedIngredients.has(x.id));
    q('#selectionCount').textContent=`${chosen.length}/6`;
    q('#selectedList').innerHTML=chosen.length?chosen.map(x=>`<button class="selected-pill" data-remove="${x.id}" aria-label="移除${x.name}">${x.name} ×</button>`).join(''):'<span class="selection-empty">还没有选择食材</span>';
    q('#generateIdeas').disabled=!chosen.length;
    qa('[data-remove]').forEach(b=>b.addEventListener('click',()=>toggleIngredient(b.dataset.remove)));
  }
  function addIdea(list,name,method,steps){if(!list.some(x=>x.name===name))list.push({name,method,steps})}
  function makeIdeas(){
    const chosen=ingredients.filter(x=>selectedIngredients.has(x.id));if(!chosen.length)return;
    const names=chosen.map(x=>x.name),joined=names.join('、');
    const vegetableCats=['叶菜','根茎薯芋','瓜果茄类','花茎芽苗','菌菇木耳','香草葱蒜'];
    const proteinCats=['禽蛋','畜肉内脏','鱼类','虾蟹贝软体','豆类豆制品','乳品'];
    const stapleCats=['谷物杂粮','面食粉类'];
    const veg=chosen.filter(x=>vegetableCats.includes(x.cat));
    const proteins=chosen.filter(x=>proteinCats.includes(x.cat));
    const staples=chosen.filter(x=>stapleCats.includes(x.cat));
    const fruits=chosen.filter(x=>x.cat==='水果');
    const nuts=chosen.filter(x=>x.cat==='坚果种子');
    const dry=chosen.filter(x=>x.cat==='海藻干货');
    const seasonings=chosen.filter(x=>x.cat==='调味酱料'||x.cat==='香草葱蒜');
    const eggs=chosen.filter(x=>['鸡蛋','鸭蛋','鹅蛋','鹌鹑蛋','鸽子蛋'].includes(x.name));
    const tofu=chosen.filter(x=>['豆腐','嫩豆腐','北豆腐','内酯豆腐','豆腐干','千张','腐竹','油豆皮','豆泡','豆腐丝'].includes(x.name));
    const ideas=[];
    const v=veg.map(x=>x.name).join('、'),p=proteins.map(x=>x.name).join('、'),s=staples.map(x=>x.name).join('、');
    if(veg.length){
      addIdea(ideas,`${v}清炒`,'大火快炒',['洗净沥干，根茎切薄片，瓜果切块，叶菜切段。','热锅少油，按根茎、菌菇、瓜果、叶菜的顺序下锅。','炒至刚熟，加盐调味，叶菜保持翠绿时出锅。']);
      addIdea(ideas,`${v}蒜香小炒`,'爆香快炒',['食材处理成均匀大小，蒜末用少量油小火爆香。','先炒耐熟食材，再加入易熟食材，大火翻匀。','沿锅边加少量水帮助熟化，收干后调味。']);
      addIdea(ideas,`${v}清汤`,'煮汤',['根茎和菌菇先冷水入锅，煮开后转中火。','瓜果类煮至变软，叶菜最后 2–3 分钟加入。','全部熟透后以盐、白胡椒调味。']);
    }
    if(veg.some(x=>['根茎薯芋','瓜果茄类','花茎芽苗','菌菇木耳'].includes(x.cat))){
      addIdea(ideas,`烤${v}`,'烘烤',['食材切成接近大小并擦干，拌少量油、盐和黑胡椒。','单层铺入烤盘，较硬的根茎先烤 10 分钟。','200°C 再烤 15–25 分钟，中途翻面，以熟透上色为准。']);
    }
    if(veg.length&&proteins.length){
      addIdea(ideas,`${v}${p}小炒`,'荤素同锅',[`${p}切成适口大小；肉类可用少量淀粉和生抽抓匀。`,'先将蛋白食材充分加热至熟后盛出，再炒蔬菜。','两者回锅翻炒 1–2 分钟，少量调味后出锅。']);
      addIdea(ideas,`${v}${p}炖煮`,'一锅炖',['肉类或豆制品先煎香；贝类吐沙，干货按需提前泡发。','加入耐煮蔬菜和热水，煮开后转小火。','炖至全部熟透，叶菜最后加入，再调味收汁。']);
      addIdea(ideas,`${v}${p}蒸盘`,'少油蒸制',['把耐熟食材切薄，易熟食材切大块，分层铺盘。','水开后上锅，鱼虾约 8–12 分钟，禽畜肉按厚度延长并确保熟透。','关火后淋少量酱油或葱油，静置 1 分钟。']);
    }
    if(eggs.length&&veg.length)addIdea(ideas,`${v}炒${eggs.map(x=>x.name).join('、')}`,'滑炒',[`${eggs.map(x=>x.name).join('、')}打散，先滑炒至刚凝固后盛出。`,`${v}按耐熟程度依次下锅炒至断生。`,'蛋回锅，快速翻匀并调味。']);
    if(tofu.length&&(veg.length||dry.length))addIdea(ideas,`${[v,...tofu.map(x=>x.name),...dry.map(x=>x.name)].filter(Boolean).join('、')}烧制`,'焖烧',['豆腐类切块煎至表面微黄；干货提前充分泡发。','其余食材炒香，加入少量热水和豆腐。','小火焖 6–10 分钟，确认食材熟透后收汁。']);
    if(staples.length){
      const rest=chosen.filter(x=>!stapleCats.includes(x.cat)&&x.cat!=='调味酱料').map(x=>x.name).join('、');
      addIdea(ideas,`${rest?rest+' ':''}${s}焖饭`,'主食一锅出',[`${s}淘洗，杂粮按品种提前浸泡。`,rest?`${rest}切小块，与主食分层放入锅中。`:'按谷物种类加入适量水。','按正常煮饭程序煮熟，肉类必须熟透，焖 10 分钟后拌匀。']);
      if(staples.some(x=>x.cat==='面食粉类'))addIdea(ideas,`${v||p||'家常'}拌面`,'面食',[`将${s}按包装说明煮熟，保留少量面汤。`,v?`${v}炒熟；${p?p+'另行充分加热至熟。':'加入常用调味。'}`:'准备喜欢的熟食配菜。','与面食和少量面汤拌匀，按口味调味。']);
      if(staples.some(x=>x.cat==='谷物杂粮'))addIdea(ideas,`${s}杂粮粥`,'慢煮',[`${s}洗净，较硬谷物提前浸泡 2–4 小时。`,'加足量水煮开，转小火并不时搅动。','煮至谷物开花软烂；咸口可加入熟制配菜。']);
    }
    if(fruits.length){
      const f=fruits.map(x=>x.name).join('、');
      addIdea(ideas,`${f}酸奶碗`,'免开火',[`${f}洗净，去核去皮后切成小块。`,'铺在原味酸奶上。',nuts.length?`撒上${nuts.map(x=>x.name).join('、')}，现做现吃。`:'可搭配燕麦或坚果，现做现吃。']);
      addIdea(ideas,`${f}温热果羹`,'煮甜汤',[`${f}去核切块，易氧化水果最后处理。`,'耐煮水果加水煮 8–12 分钟，软质水果最后加入。','按水果甜度决定是否加糖，放至温热食用。']);
    }
    if(nuts.length&&(veg.length||fruits.length))addIdea(ideas,`${v||fruits.map(x=>x.name).join('、')}坚果拌盘`,'凉拌',['可生食蔬果洗净沥干；需熟食的食材先彻底加热并放凉。',`${nuts.map(x=>x.name).join('、')}切碎或轻烘增香。`,'混合后用少量醋、橄榄油和盐调味。']);
    if(seasonings.length&&chosen.length===seasonings.length)addIdea(ideas,`${joined}复合蘸汁`,'调味搭配',['固体香料切碎或研磨，酱料按咸甜酸辣分次少量加入。','加少量温水搅匀，静置 5 分钟让香气融合。','先小量试味，再搭配已彻底熟制的主菜。']);
    if(!ideas.length)addIdea(ideas,`${joined}家常拼盘`,'分别熟制',['食材分别清洗并按品类处理，干货提前泡发。','按各自所需时间分别蒸、煮或煎熟；肉蛋水产必须彻底加热。','组合装盘，用少量盐、胡椒或酱汁调味。']);
    q('#ideaSummary').hidden=false;q('#ideaSummary').innerHTML=`已按 <b>${chosen.length} 种食材</b> 匹配出 <b>${ideas.length} 种做法</b>，从易操作到复合烹饪排列。`;
    q('#ideaList').innerHTML=ideas.map((x,i)=>`<article class="idea"><span class="idea-method">方案 ${String(i+1).padStart(2,'0')} · ${x.method}</span><h3>${x.name}</h3><ol>${x.steps.map(step=>`<li>${step}</li>`).join('')}</ol></article>`).join('');
  }
  function openIngredient(id){
    const x=ingredients.find(item=>item.id===id);if(!x)return;
    const p=ingredientDetails[x.id],media=ingredientImages[x.id]||{};
    activeIngredientId=id;
    const img=q('#ingredientDetailImage');
    if(media.image){img.src=media.image;img.alt=`${x.name}实物`;img.style.display='block';q('#ingredientPhotoLabel').hidden=false}else{img.removeAttribute('src');img.alt='';img.style.display='none';q('#ingredientPhotoLabel').hidden=true}
    q('#ingredientDetailCategory').textContent=x.cat;
    q('#ingredientDetailTitle').textContent=x.name;
    q('#ingredientDetailAlias').textContent=x.alias?`别名：${x.alias} · ${x.nutrient}`:x.nutrient;
    q('#ingredientDetailLead').textContent=p.lead;
    q('#ingredientDetailTexture').textContent=p.texture;
    q('#ingredientDetailNutrient').textContent=p.nutrient;
    q('#ingredientDetailCooking').textContent=p.cooking;
    q('#ingredientDetailStorage').textContent=p.storage;
    q('#ingredientDetailSelect').textContent=selectedIngredients.has(id)?'从组合中移除':'加入组合做菜';
    const source=q('#ingredientDetailSource');source.hidden=!media.source;if(media.source)source.href=media.source;
    q('#ingredientDialog').showModal();
  }
  function openRecipe(id){
    const r=recipes.find(x=>x.id===id); if(!r)return;
    q('#detailImage').src=r.image;q('#detailImage').alt=r.name;q('#detailTitle').textContent=r.name;q('#detailAlias').textContent=`${r.alias} · ${r.time}`;
    q('#detailBenefits').innerHTML=r.benefits.map(x=>`<span>${x}</span>`).join('');q('#detailIngredients').innerHTML=r.ingredients.map(x=>`<li>${x}</li>`).join('');q('#detailSteps').innerHTML=r.steps.map(x=>`<li>${x}</li>`).join('');q('#detailSource').href=r.source;
    q('#recipeDialog').showModal();
  }
  function renderMeals(){const p=mealPlans[mealSet%mealPlans.length];q('#mealStrip').innerHTML=p.map(x=>`<div><b>${x.t}</b><span>${x.n}</span></div>`).join('')}
  function renderPlan(){q('#planDays').innerHTML=dayNames.map((d,i)=>`<button class="day ${i===planDay?'active':''}" data-day="${i}">${d}</button>`).join('');q('#planContent').innerHTML=mealPlans[planDay].map(x=>`<div class="plan-meal"><b>${x.t}</b><span>${x.n}</span><small>${x.d}</small></div>`).join('');qa('.day').forEach(b=>b.addEventListener('click',()=>{planDay=+b.dataset.day;renderPlan()}))}
  function renderWorkouts(){
    const term=normalizeSearch(searchInput.value);let list=workouts.filter(w=>(muscleFilter==='全部'||w.muscle===muscleFilter)&&workoutMatches(w,term));
    if(term&&list.length===0&&workouts.some(w=>workoutMatches(w,term))){muscleFilter='全部';qa('.muscle').forEach(x=>x.classList.toggle('active',x.dataset.muscle==='全部'));list=workouts.filter(w=>workoutMatches(w,term))}
    q('#workoutGrid').innerHTML=list.map((w,i)=>`<article class="workout" data-num="${String(i+1).padStart(2,'0')}"><div class="workout-top"><h3>${w.name}</h3><span class="level">${w.level}</span></div><p>${w.cue}</p><ul><li><b>训练部位</b><span>${w.focus}</span></li><li><b>建议组次</b><span>${w.plan}</span></li><li><b>动作要点</b><span>${w.tip}</span></li></ul></article>`).join('');
    q('#workoutCount').textContent=`${list.length} 个动作 · ${muscleFilter}`;q('#workoutEmpty').style.display=list.length?'none':'block';
  }
  function switchSection(next,{preserveSearch=false,keepScroll=false}={}){
    section=next;const recipesOn=section==='recipes',ingredientsOn=section==='ingredients';
    q('#recipesPanel').hidden=!recipesOn;q('#ingredientsPanel').hidden=!ingredientsOn;q('#fitnessPanel').hidden=recipesOn||ingredientsOn;if(!preserveSearch)searchInput.value='';
    searchInput.placeholder=recipesOn?'搜索菜名、食材或营养':ingredientsOn?'搜索胡萝卜、青菜、豆类等':'搜索动作或训练部位';
    qa('.section-tab').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.section===section)));qa('.mobile-tab').forEach(b=>b.classList.toggle('active',b.dataset.section===section));
    if(recipesOn)renderRecipes();else if(ingredientsOn)renderIngredients();else renderWorkouts();if(!keepScroll)window.scrollTo({top:0,behavior:'smooth'});
  }
  function revealIngredientResults(){
    requestAnimationFrame(()=>{const target=q('#ingredientCatalog');if(target)target.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'})});
  }
  function applySearch(revealResults){
    const term=normalizeSearch(searchInput.value);
    if(section==='recipes'&&term){
      const ingredientHit=ingredients.some(x=>ingredientMatches(x,term));
      const exactRecipe=recipes.some(r=>[r.name,r.alias.replace('又名：','')].some(name=>normalizeSearch(name)===term));
      if(ingredientHit&&!exactRecipe){
        ingredientFilter='全部';renderIngredientFilters();switchSection('ingredients',{preserveSearch:true,keepScroll:true});
        if(revealResults)revealIngredientResults();
        return;
      }
    }
    if(section==='recipes')renderRecipes();else if(section==='ingredients')renderIngredients();else renderWorkouts();
    if(revealResults&&term&&section==='ingredients')revealIngredientResults();
  }
  qa('[data-section]').forEach(b=>b.addEventListener('click',()=>switchSection(b.dataset.section)));
  qa('.filters .chip').forEach(b=>b.addEventListener('click',()=>{recipeFilter=b.dataset.filter;qa('.filters .chip').forEach(x=>x.classList.toggle('active',x===b));renderRecipes()}));
  qa('.muscle').forEach(b=>b.addEventListener('click',()=>{muscleFilter=b.dataset.muscle;qa('.muscle').forEach(x=>x.classList.toggle('active',x===b));renderWorkouts()}));
  searchInput.addEventListener('compositionstart',()=>{searchComposing=true});
  searchInput.addEventListener('compositionend',()=>{searchComposing=false;applySearch(true)});
  searchInput.addEventListener('input',event=>{if(!searchComposing&&!event.isComposing)applySearch(true)});
  searchInput.addEventListener('search',()=>applySearch(true));
  searchInput.addEventListener('change',()=>applySearch(true));
  q('#generateIdeas').addEventListener('click',makeIdeas);q('#clearSelection').addEventListener('click',()=>{selectedIngredients.clear();q('#ideaList').innerHTML='';q('#ideaSummary').hidden=true;renderIngredients();renderSelection()});
  q('#shuffleMeals').addEventListener('click',()=>{mealSet=(mealSet+1)%mealPlans.length;renderMeals()});q('#recipeDialog .close').addEventListener('click',()=>q('#recipeDialog').close());q('#recipeDialog').addEventListener('click',e=>{if(e.target===q('#recipeDialog'))q('#recipeDialog').close()});
  q('.ingredient-close').addEventListener('click',()=>q('#ingredientDialog').close());q('#ingredientDialog').addEventListener('click',e=>{if(e.target===q('#ingredientDialog'))q('#ingredientDialog').close()});q('#ingredientDetailSelect').addEventListener('click',()=>{if(activeIngredientId)toggleIngredient(activeIngredientId)});
  q('#coverageTotal').textContent=ingredients.length.toLocaleString('zh-CN');q('#coverageCats').textContent=ingredientGroups.length;
  renderRecipes();renderMeals();renderPlan();renderWorkouts();renderIngredientFilters();renderSelection();
})();
