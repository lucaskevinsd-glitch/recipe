/* FoodAtlas v2 — 全局配置 */
window.FA = window.FA || {};
FA.config = {
  version: '2.0.0',
  dataVersion: '2026-10-09',
  // 导航（桌面端）
  nav: [
    { id: 'home', label: '首页', route: '#/', icon: '🏠' },
    { id: 'recipes', label: '菜谱厨房', route: '#/recipes', icon: '🍳' },
    { id: 'baking', label: '烘焙甜点', route: '#/baking', icon: '🍰' },
    { id: 'drinks', label: '饮品世界', route: '#/drinks', icon: '🥤' },
    { id: 'ingredients', label: '全球食材百科', route: '#/ingredients', icon: '🥬' },
    { id: 'tools', label: '厨房工具箱', route: '#/tools', icon: '🧰' },
    { id: 'explore', label: '食物探索', route: '#/explore', icon: '🧭' },
    { id: 'kitchen', label: '我的厨房', route: '#/kitchen', icon: '👤' },
  ],
  // 移动端底部导航
  tabs: [
    { id: 'home', label: '首页', route: '#/', icon: '🏠' },
    { id: 'recipes', label: '菜谱', route: '#/recipes', icon: '🍳' },
    { id: 'baking', label: '烘焙', route: '#/baking', icon: '🍰' },
    { id: 'drinks', label: '饮品', route: '#/drinks', icon: '🥤' },
    { id: 'kitchen', label: '我的', route: '#/kitchen', icon: '👤' },
  ],
  recipeCats: ['家常菜', '肉类', '海鲜', '蔬菜', '汤品', '主食'],
  bakingCats: ['面包', '蛋糕', '饼干', '塔派', '慕斯与冷藏甜点', '中式糕点', '基础面团与面糊'],
  drinkCats: ['咖啡', '茶饮', '果汁', '奶昔', '气泡饮品', '传统特色饮品'],
  ingCats: ['叶菜', '根茎薯芋', '瓜果茄类', '花茎芽苗', '菌菇木耳', '豆类豆制品', '谷物杂粮', '面食粉类', '水果', '禽蛋', '畜肉内脏', '乳品', '鱼类', '虾蟹贝软体', '海藻干货', '坚果种子', '香草葱蒜', '调味酱料'],
  techCats: ['刀工', '火候', '调味', '温度控制', '保存方法', '烹饪技术'],
  cultureCats: ['世界菜系', '地方特色美食', '经典菜品故事', '食材与风味组合', '节日与季节性美食', '美食专题'],
  levels: ['入门', '简单', '中等', '困难'],
  tools: [
    { id: 'scale', name: '配方换算', desc: '按份量缩放食材用量', icon: '⚖️' },
    { id: 'unit', name: '单位换算', desc: '克 / 毫升 / 杯 / 盎司互转', icon: '📐' },
    { id: 'substitute', name: '食材替换助手', desc: '缺料时找替代方案', icon: '🔄' },
    { id: 'fridge', name: '我的冰箱', desc: '记录库存与保质期', icon: '🧊' },
    { id: 'shopping', name: '购物清单', desc: '管理待购食材', icon: '🛒' },
    { id: 'menu', name: '一周菜单', desc: '规划七天用餐', icon: '📅' },
    { id: 'timer', name: '烹饪计时器', desc: '多任务倒计时', icon: '⏱️' },
    { id: 'temp', name: '温度换算', desc: '摄氏 / 华氏 / 燃气档', icon: '🌡️' },
    { id: 'log', name: '制作记录', desc: '记录每次下厨', icon: '📝' },
  ],
};
