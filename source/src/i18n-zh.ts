/**
 * Simplified Chinese (简体中文, as used in Singapore) for the helper's screens, the Kitchen tab and the dish names.
 * Machine-drafted: it wants a check by a native speaker, like the other languages.
 * Cooking steps are not here: they are translated by Gemini on demand, like every other language.
 */
import type { BadgeKey } from './i18n-kitchen';

export const ZH_UI: Record<string, string> = {
  breakfast: '早餐', lunch: '午餐', dinner: '晚餐',
  title: '本周菜单', ingredients: '食材', steps: '步骤', minutes: '分钟', done: '标记为已煮好', cooked: '已煮好 ✓',
  mild: '煮得清淡一点，辣椒另外放在旁边。', avoid: '请注意', hello: '嗨 kaki！👋 这是本周要煮的菜。',
  helloEmpty: '嗨 kaki！👋 现在还没有要煮的菜。家人确认菜单后，我会在这里显示。', nothing: '还没有菜单。家人确认后会显示在这里。',
  recipes: '食谱', shopping: '购物清单', estTotal: '大约总额（示例价格）', tryInstead: '改买这个', pantry: '先看看厨房（用完了才买）',
  forDish: '用于', bought: '已买', 'Meat & Seafood': '肉类和海鲜', 'Fruit & Veg': '水果和蔬菜', Chilled: '冷藏食品', Pantry: '干货和调味料',
  startCooking: '开始煮', resume: '继续煮', stepOf: '第 {n} 步，共 {m} 步', next: '下一步', back: '返回', finish: '完成：标记为已煮好',
  watchVideo: '观看视频', startTimer: '开始 {t} 计时', timesUp: '时间到了！', timers: '计时器', ingredientsReady: '请先准备好这些',
  close: '关闭', otherThings: '其他要买的东西', addItem: '添加物品（例如洗洁精）', add: '添加', menuChanged: '菜单有变动', dishAdded: '已加入',
  dishCancelled: '已取消，不用煮', newItem: '新', lateNote: '菜单有变动，所以有新的东西要买：{names}。', extraTrip: '你已经买完菜了，所以需要再去一趟店里。',
  groceriesReady: '食材都齐了 ✓', stillToBuy: '还要买：{n}', gotIt: '好的，明白了', notAvailable: '没有货', pickInstead: '店里没有？请选一样改买的：',
  skipIt: '不买了', cancel: '取消', buyingInstead: '改买', skipped: '没有货，已跳过', undo: '撤销', cookLighter: '煮得清淡一点',
  noChilli: '不要放辣椒', steam: '用蒸的或煮的，不要煎炸', lessSalt: '酱汁和盐只用一半', lessOil: '少放油，并去掉皮和肥肉',
  useInstead: '用{use}代替{need}', stepsEnglish: '烹饪步骤和食材暂时还是英文，要等雇主开启翻译才会翻译。目前只翻译了菜名。', stepDone: '这一步完成了',
};

export const ZH_K: Record<string, string> = {
  myKitchen: '我的厨房', points: '厨房积分', toNext: '再得 {n} 分就升到{rank}', topRank: '已是最高等级。谢谢你为我们做的一切！',
  thanksHead: '感谢卡', from: '来自{who}', noThanks: '家人的感谢卡会显示在这里。', badges: '徽章', noBadges: '你获得的徽章会显示在这里。',
  myDishes: '我的菜', mastered: '已掌握', confident: '有信心', practise: '再练习', howSure: '你觉得自己一个人煮这道菜有多有把握？',
  sure1: '还不行', sure5: '很有把握', rateDishes: '评一评你的把握程度', noDishes: '你煮过的菜会显示在这里。评一评你的把握，家人可以把它们标记为已掌握。',
  tipsHead: '我们喜欢的口味', tipThanks: '谢谢你煮了{dish}！', tipNext: '下次：', remember: '每次煮这道菜时：', gotIt: '好的',
  original: '显示英文', hide: '隐藏我的积分', show: '显示我的积分', hidden: '你的积分已隐藏。感谢卡仍会显示。',
  private: '只有你的家人看得到。这是一份感谢，不是考试，也绝不会和薪水挂钩。', saveRecord: '分享我的记录',
  nowRank: '恭喜！你现在是{rank}了。', newBadge: '新徽章：{badge}', thankYou: '谢谢！', lesson: '烹饪课', lessonWhen: '{date} {time}，老师：{teacher}',
  plan2h: '2 小时计划', knife: '切菜和备料', heat: '火候', notes: '老师笔记', finish: '课程结束', done: '完成',
  stepTeach: '欢迎，洗手，一起看计划', stepPrep: '准备好所有东西：洗、切、量', stepCook: '烹饪：{dish}', stepEarly: '上课前先开始：{dish}',
  stepTaste: '一起尝味道，调整调味', stepTidy: '收拾干净，回顾学到的东西',
  soupKnife: '把蔬菜切成大小一致的块，这样才能同时煮熟。', soupHeat: '先煮滚，再转小火慢慢炖。把浮沫撇掉。',
  slowKnife: '在厚的鱼或肉上划几刀，热力才能传到中间。', slowHeat: '用大火滚水来蒸，或盖上锅盖用小火焖煮。检查最厚的部分有没有熟。',
  wokKnife: '所有东西都切小块，大小一样，开火前先全部准备好。', wokHeat: '锅要很烫，快速翻炒不停。大蒜很容易烧焦，要留意。',
  byGemini: '这些提示由 Gemini 草拟，还没有经过厨师检查',
};

export const ZH_TIP: Record<string, string> = {
  delicious: '真好吃！', justright: '刚刚好，就是我们喜欢的口味。', kidsloved: '孩子们很喜欢。', thanks: '谢谢你的辛苦。',
  salty: '盐少一点。', bland: '味道再浓一点（盐或酱汁）。', spicy: '请煮得不那么辣：少放辣椒。', mild: '请煮得辣一点。', oily: '少放油。',
  sweet: '不要那么甜。', undercooked: '再煮久一点。', overcooked: '少煮一会儿，才能保持嫩或脆。', smaller: '切得小块一点。',
};

export const ZH_RANK: string[] = ['家常厨师', '值得信赖的厨师', '熟练的厨师', '资深厨师', '家里的厨师长'];

export const ZH_BADGE: Record<BadgeKey, string> = {
  firstLesson: '第一堂课', soups: '汤品专家', slow: '蒸焖高手', wok: '锅气高手', favourite: '家人最爱', explorer: '探索者',
  steady: '稳扎稳打', cuisines: '三种厨房', thanked: '深受感谢',
};

/** Dish names by recipe id. Dishes the family adds themselves keep their own name. */
export const ZH_NAMES: Record<string, string> = {
  'chicken-rice': '海南鸡饭', 'sambal-kangkong': '参巴空心菜', 'steamed-fish': '姜酱油蒸鱼', 'dhal-curry': '扁豆咖喱',
  'ayam-masak-merah': '红烧咖喱鸡（Ayam Masak Merah）', 'sweet-sour-pork': '咕噜肉（糖醋猪肉）', 'beef-rendang': '仁当牛肉',
  'egg-tofu-veg': '蔬菜蛋豆腐', 'assam-fish': '亚参辣鱼', 'garlic-broccoli': '蒜香西兰花', 'prawn-chye-sim': '蒜香虾炒菜心',
  'chicken-curry': '马铃薯咖喱鸡', 'tau-yew-bak': '豆油肉（红烧五花肉）', 'miso-salmon': '烤味噌三文鱼', 'spaghetti-bolognese': '肉酱意大利面',
  'sayur-lodeh': '椰浆蔬菜汤（Sayur Lodeh，素）', 'tomato-egg': '番茄炒蛋', 'ayam-serai': '香茅鸡', 'black-pepper-chicken': '黑胡椒鸡',
  'chap-chye': '杂菜煲（娘惹杂菜）', 'fish-curry': '印度咖喱鱼', 'teriyaki-chicken': '照烧鸡', 'garlic-kailan': '蒜香芥兰',
  'chana-masala': '印度鹰嘴豆咖喱', 'ikan-goreng-kunyit': '姜黄煎鱼', 'steamed-pork-tofu': '肉碎蒸豆腐', 'abc-soup': 'ABC 鸡汤',
  'chicken-chop': '烤鸡扒配马铃薯', 'garlic-brinjal': '蒜香茄子', 'japchae': '韩式炒杂菜（韩国粉丝）', 'dakjjim': '安东炖鸡（韩式酱油焖鸡）',
  'gyeran-mari': '韩式蛋卷', 'kimchi-tofu-soup': '泡菜豆腐汤', 'pad-krapow': '泰式打抛鸡（九层塔炒鸡）', 'tom-yum-soup': '冬阴功虾汤',
  'old-cucumber-soup': '老黄瓜猪肋骨汤', 'lotus-root-soup': '莲藕猪肋骨汤', 'watercress-soup': '西洋菜猪肋骨汤', 'winter-melon-soup': '冬瓜鸡汤',
  'spinach-egg-soup': '菠菜蛋汤', 'sup-sayur': '马来蔬菜汤（Sup Sayur）', rasam: '番茄酸辣汤（Rasam）', 'fish-tofu-soup': '番茄豆腐鱼片汤',
  'sup-ayam': '马来鸡汤（Sup Ayam）', 'chicken-porridge': '鸡粥', 'fish-porridge': '鱼粥', 'egg-porridge': '白粥配蒸蛋',
  'kaya-toast-eggs': '咖椰吐司配半熟蛋', 'banana-oatmeal': '香蕉燕麦粥', 'egg-tomato-toast': '番茄炒蛋吐司', 'barley-water': '薏米水',
  'iced-lemon-tea': '冰柠檬茶', 'banana-milk': '香蕉牛奶', 'green-bean-soup': '绿豆汤', 'mango-sago': '杨枝甘露（芒果西米露）',
  'pisang-santan': '热香蕉椰浆（Pisang Santan）',
  'banana-french-toast': '香蕉法式吐司', 'plain-porridge-egg': '白粥蛋花', 'mushroom-omelette-toast': '蘑菇煎蛋卷配吐司', 'egg-cucumber-sandwich': '鸡蛋黄瓜三明治',
  'mango-oat-bowl': '芒果燕麦碗', 'chicken-fried-rice': '鸡肉炒饭', 'egg-bee-hoon': '鸡蛋蔬菜炒米粉', 'chicken-noodle-soup': '鸡汤面', 'tomato-egg-rice-bowl': '番茄炒蛋饭',
  'tomato-mushroom-spaghetti': '番茄蘑菇意大利面', 'steamed-egg-pork-rice': '肉碎蒸蛋饭', 'chicken-cucumber-sandwich': '鸡肉黄瓜三明治', 'mee-goreng-mild': '马来炒面（Mee Goreng）',
};
