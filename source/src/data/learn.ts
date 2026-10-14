import { Difficulty, Lang, Recipe } from '../types';
import { recipeById } from './recipes';

/**
 * Learn While You Cook: short notes that sit inside the normal recipe steps.
 * Hand-written per dish. The words in Tagalog, Indonesian, Burmese and Chinese are drafts:
 * ask a native speaker to check them before release. Safety notes are general public food-safety
 * guidance, not checked by a food-safety professional.
 */
export type L5 = Record<Lang, string>;

export interface DishLearn {
  /** at most two tips that teach something she can use on other dishes; shown before the step */
  tips: { step: number; text: L5 }[];
  /** why a step is done that way */
  why: Record<number, L5>;
  /** shown on the step in every mode and never shortened away */
  safety: { step: number; text: L5 }[];
}

export const LEARN: Record<string, DishLearn> = {
  'black-pepper-chicken': {
    tips: [
      {
        step: 0,
        text: {
          en: 'Dry meat browns, wet meat steams. Pat any meat dry before you fry it, and it will get a golden colour.',
          tl: 'Ang tuyong karne ay nagiging golden brown, ang basa ay lumalambot lang. Patuyuin ang karne bago iprito.',
          id: 'Daging kering jadi kecokelatan, daging basah malah terkukus. Keringkan daging dengan tisu sebelum digoreng.',
          my: 'ခြောက်သောအသားသည် ရွှေရောင်ဖြစ်ပြီး စိုသောအသားသည် ပြုတ်သွားတတ်သည်။ မကြော်မီ အသားကို သုတ်ခြောက်ပါ။',
          zh: '肉擦干才会煎出金黄色，湿的肉只会被蒸熟。下锅前先把肉擦干。',
        },
      },
      {
        step: 8,
        text: {
          en: 'Spices and garlic turn bitter if they cook too long. When you can smell them strongly, they are ready. Add the sauce right away.',
          tl: 'Mapait ang pampalasa at bawang kapag nasobrahan sa luto. Kapag malakas na ang amoy, tapos na. Ilagay agad ang sarsa.',
          id: 'Rempah dan bawang jadi pahit kalau terlalu lama dimasak. Saat aromanya kuat, sudah siap. Langsung masukkan saus.',
          my: 'ဟင်းခတ်အမွှေးအကြိုင်နှင့် ကြက်သွန်ဖြူကို ကြာကြာချက်ရင် ခါးသွားတတ်သည်။ အနံ့ပြင်းလာရင် ရပြီ၊ ဆော့စ်ကို ချက်ချင်းထည့်ပါ။',
          zh: '香料和蒜炒太久会发苦。闻到浓香就够了，马上倒入酱汁。',
        },
      },
    ],
    why: {
      0: {
        en: 'Pieces the same size finish cooking at the same time.',
        tl: 'Ang magkakasinlaking hiwa ay sabay maluto.',
        id: 'Potongan yang sama besar matang bersamaan.',
        my: 'အရွယ်တူ အတုံးများသည် တစ်ပြိုင်နက် ကျက်သည်။',
        zh: '大小一样的块会同时煮熟。',
      },
      1: {
        en: 'Salt and pepper go into the meat while it rests, so the flavour goes inside.',
        tl: 'Pumapasok sa karne ang lasa habang ito ay nakababad.',
        id: 'Garam dan lada meresap ke daging saat didiamkan.',
        my: 'ထားစဉ်အတွင်း ဆားနှင့် ငရုတ်ကောင်း အသားထဲ စိမ့်ဝင်သည်။',
        zh: '腌的时候，盐和胡椒会渗进肉里。',
      },
      4: {
        en: 'Mix the sauce first. The stir-fry goes fast, so you will not have time to measure later.',
        tl: 'Haluin muna ang sarsa. Mabilis ang pagluto kaya wala nang oras sumukat mamaya.',
        id: 'Campur saus lebih dulu. Menumis itu cepat, nanti tidak sempat menakar.',
        my: 'ဆော့စ်ကို ကြိုရောထားပါ။ ဆီပြန်ကြော်ချက်သည် မြန်လွန်းသဖြင့် နောက်မှ ချိန်ရန် အချိန်မရှိပါ။',
        zh: '先把酱汁调好。快炒很快，到时候来不及量。',
      },
      5: {
        en: 'The wok must be hot before the chicken goes in, so the pieces sizzle and do not stick.',
        tl: 'Dapat mainit na ang kawali bago ilagay ang manok, para hindi dumikit.',
        id: 'Wajan harus panas sebelum ayam masuk, supaya tidak lengket.',
        my: 'ကြက်သားမထည့်မီ ဒယ်အိုး ပူနေရမည်၊ ထို့ကြောင့် မကပ်ပါ။',
        zh: '锅要先烧热再下鸡肉，这样才不会粘锅。',
      },
      6: {
        en: 'Do not turn the pieces too soon. Let one side brown first, then turn.',
        tl: 'Huwag agad baliktarin. Hayaang mag-brown muna ang isang side.',
        id: 'Jangan terlalu cepat dibalik. Biarkan satu sisi kecokelatan dulu.',
        my: 'မြန်မြန် မလှန်ပါနှင့်။ တစ်ဖက်ရွှေရောင်ဖြစ်မှ လှန်ပါ။',
        zh: '不要太早翻面，先让一面上色再翻。',
      },
      10: {
        en: 'Capsicum goes in last so it stays bright and a little crunchy.',
        tl: 'Huling ilagay ang capsicum para manatiling maganda ang kulay at medyo malutong.',
        id: 'Paprika masuk terakhir supaya tetap cerah dan agak renyah.',
        my: 'ငရုတ်ကောင်းပြားကို နောက်ဆုံးထည့်သဖြင့် အရောင်လှပြီး နည်းနည်းကြွပ်နေသည်။',
        zh: '青椒最后放，才能保持翠绿和脆度。',
      },
    },
    safety: [
      {
        step: 0,
        text: {
          en: 'Raw chicken: keep it away from other food. After cutting, wash your hands, the knife and the board with soap and water.',
          tl: 'Hilaw na manok: ilayo sa ibang pagkain. Pagkatapos maghiwa, hugasan ng sabon at tubig ang kamay, kutsilyo at tabla.',
          id: 'Ayam mentah: jauhkan dari makanan lain. Setelah memotong, cuci tangan, pisau dan talenan dengan sabun dan air.',
          my: 'အစိမ်းကြက်သား - အခြားအစားအစာနှင့် ဝေးဝေးထားပါ။ လှီးပြီးလျှင် လက်၊ ဓားနှင့် စက်ဖြတ်ခုံကို ဆပ်ပြာနှင့် ရေဖြင့် ဆေးပါ။',
          zh: '生鸡肉要和其他食物分开。切完后，用肥皂和水洗手、洗刀、洗砧板。',
        },
      },
      {
        step: 5,
        text: {
          en: 'Hot oil can splash. Lay the chicken in gently, away from you. Dry pieces splash less.',
          tl: 'Maaaring tumalsik ang mainit na mantika. Dahan-dahang ilagay ang manok palayo sa iyo. Mas kaunti ang talsik kapag tuyo.',
          id: 'Minyak panas bisa memercik. Letakkan ayam pelan-pelan, menjauh dari badan. Potongan kering lebih sedikit memercik.',
          my: 'ပူသောဆီ ပက်ဖြန်းနိုင်သည်။ ကြက်သားကို ကိုယ့်ဆီမှ ဝေးရာသို့ ဖြည်းဖြည်းချပါ။ ခြောက်လျှင် ပက်ဖြန်းမှုနည်းသည်။',
          zh: '热油会溅。把鸡肉轻轻放入锅中，身体离远一点。肉擦干会溅得少。',
        },
      },
      {
        step: 6,
        text: {
          en: 'Chicken must be cooked all the way through: no pink inside. Cut open the thickest piece to check before you go on.',
          tl: 'Dapat luto hanggang loob ang manok: walang pink sa loob. Hiwain ang pinakamakapal na piraso para tingnan bago magpatuloy.',
          id: 'Ayam harus matang sampai ke dalam: tidak ada warna merah muda. Belah potongan paling tebal untuk memeriksa sebelum lanjut.',
          my: 'ကြက်သားကို အတွင်းထိ ကျက်ရမည် - အတွင်းတွင် ပန်းရောင် မရှိရ။ ဆက်မလုပ်မီ အထူဆုံးအတုံးကို ခွဲကြည့်ပါ။',
          zh: '鸡肉必须完全煮熟，里面不能有粉红色。继续之前，切开最厚的一块检查。',
        },
      },
    ],
  },
};

const SAFE_RAW: L5 = {
  en: 'Raw meat, fish and eggs: keep them away from other food. After handling, wash your hands, the knife and the board with soap and water.',
  tl: 'Hilaw na karne, isda at itlog: ilayo sa ibang pagkain. Pagkatapos hawakan, hugasan ng sabon at tubig ang kamay, kutsilyo at tabla.',
  id: 'Daging, ikan dan telur mentah: jauhkan dari makanan lain. Setelah memegang, cuci tangan, pisau dan talenan dengan sabun dan air.',
  my: 'အစိမ်းအသား၊ ငါးနှင့် ကြက်ဥ - အခြားအစားအစာနှင့် ဝေးဝေးထားပါ။ ကိုင်ပြီးလျှင် လက်၊ ဓားနှင့် စက်ဖြတ်ခုံကို ဆပ်ပြာနှင့် ရေဖြင့် ဆေးပါ။',
  zh: '生的肉、鱼和蛋要和其他食物分开。处理完后，用肥皂和水洗手、洗刀、洗砧板。',
};
const SAFE_DONE: L5 = {
  en: 'Make sure it is cooked all the way through before you serve it: no pink inside and the juices run clear. Cut open the thickest piece to check.',
  tl: 'Tiyaking luto hanggang loob bago ihain: walang pink sa loob at malinaw ang katas. Hiwain ang pinakamakapal na piraso para tingnan.',
  id: 'Pastikan matang sampai ke dalam sebelum disajikan: tidak ada warna merah muda dan airnya bening. Belah potongan paling tebal untuk memeriksa.',
  my: 'ပွဲမတင်မီ အတွင်းထိ ကျက်ကြောင်း သေချာပါစေ - အတွင်းတွင် ပန်းရောင်မရှိရ၊ အရည်ကြည်ရမည်။ အထူဆုံးအပိုင်းကို ခွဲကြည့်ပါ။',
  zh: '上桌前确保完全煮熟：里面没有粉红色，汁水是清的。切开最厚的一块检查。',
};
const SAFE_OIL: L5 = {
  en: 'Hot oil can splash. Add food gently, away from you, and keep your face back. Dry food splashes less.',
  tl: 'Maaaring tumalsik ang mainit na mantika. Dahan-dahang ilagay ang pagkain palayo sa iyo. Mas kaunti ang talsik kapag tuyo.',
  id: 'Minyak panas bisa memercik. Masukkan bahan pelan-pelan, menjauh dari badan. Bahan kering lebih sedikit memercik.',
  my: 'ပူသောဆီ ပက်ဖြန်းနိုင်သည်။ အစားအစာကို ကိုယ့်ဆီမှ ဝေးရာသို့ ဖြည်းဖြည်းချပါ။ ခြောက်လျှင် ပက်ဖြန်းမှုနည်းသည်။',
  zh: '热油会溅。轻轻放入食材，身体离远一点。食材擦干会溅得少。',
};
const SAFE_BOIL: L5 = {
  en: 'Hot liquid and steam burn. Turn pot handles inwards, and lift the lid away from your face.',
  tl: 'Nakapapaso ang mainit na likido at singaw. Ipaling papasok ang hawakan ng kaldero at buksan ang takip palayo sa mukha.',
  id: 'Cairan panas dan uap bisa melukai. Putar gagang panci ke dalam, dan buka tutup menjauh dari wajah.',
  my: 'ပူသောအရည်နှင့် ရေနွေးငွေ့ အပူလောင်စေသည်။ အိုးကိုင်းကို အတွင်းဘက်လှည့်ပြီး အဖုံးကို မျက်နှာနှင့်ဝေးရာသို့ ဖွင့်ပါ။',
  zh: '热汤和蒸汽会烫伤。锅柄朝内，开盖时脸要避开。',
};
const WHY_PREP: L5 = {
  en: 'Getting this ready first means you are not rushing once the heat is on.',
  tl: 'Kapag handa na ito, hindi ka magmamadali kapag naka-apoy na.',
  id: 'Siapkan dulu supaya tidak terburu-buru saat api sudah menyala.',
  my: 'မီးမဖွင့်မီ ကြိုပြင်ထားလျှင် မီးပေါ်ရောက်မှ အလျင်စလို မဖြစ်ပါ။',
  zh: '先备好料，开火后就不会手忙脚乱。',
};

const MEAT = /\b(chicken|pork|beef|mutton|lamb|fish|prawns?|shrimps?|squid|minced|mince|eggs?|seafood|crab|clams?|salmon|sausages?)\b/;
const HANDLE = /\b(cut|slice|chop|rinse|wash|marinate|mix|season|pat|clean|peel|devein|crack|beat|debone|dice|score)\b/;
const PREP_START = /^(peel|cut|slice|chop|dice|mince|wash|rinse|trim|grate|measure|pat|remove|crush|smash|shred|halve|quarter|cube|core|deseed|chop)\b/;
const NOT_PREP = /\b(soak|blend|chill|mash|whisk|knead|refrigerate|heat|fry|boil|simmer|bake|cook|mix|marinate|add|stir|pour|season|rest|leave|steam|roast|grill)\b/;
const OIL = /(\b(heat|hot)\b[^.]*\boil\b|deep[- ]?fry|pan[- ]?fry|shallow[- ]?fry)/;
const DONE = /(cooked through|no pink|juices run clear|until (the )?(chicken|pork|meat|fish|prawns?|egg|eggs)[^.]*(cooked|opaque|white|firm|done))/;
const BOIL = /(bring[^.]*to (a |the )?boil|boiling (water|liquid)|lift the lid|steam)/;

const derived = new Map<string, DishLearn>();
/**
 * Notes for a dish with no hand-written ones, worked out from its steps by fixed word rules (no AI).
 * Prep steps (peeling, cutting, washing) get a short "why". Every step is always shown.
 * The safety steps found this way are a safety net, not a food-safety check: a cook should review them.
 */
export function deriveLearn(r: Recipe): DishLearn {
  const key = `${r.id}:${r.steps.length}`;
  const hit = derived.get(key);
  if (hit) return hit;
  const low = r.steps.map((x) => x.toLowerCase());
  const safety: DishLearn['safety'] = [];
  const rawAt = low.findIndex((x) => MEAT.test(x) && HANDLE.test(x));
  if (rawAt >= 0) safety.push({ step: rawAt, text: SAFE_RAW });
  const oilAt = low.findIndex((x) => OIL.test(x));
  if (oilAt >= 0) safety.push({ step: oilAt, text: SAFE_OIL });
  const boilAt = low.findIndex((x) => BOIL.test(x));
  if (boilAt >= 0) safety.push({ step: boilAt, text: SAFE_BOIL });
  low.forEach((x, k) => { if (DONE.test(x)) safety.push({ step: k, text: SAFE_DONE }); });
  const prep = low.map((x, k) => PREP_START.test(x) && !NOT_PREP.test(x) && !safety.some((s) => s.step === k));
  const why: DishLearn['why'] = {};
  prep.forEach((p, k) => { if (p) why[k] = WHY_PREP; });
  const out = { tips: [], why, safety };
  derived.set(key, out);
  return out;
}

/** Hand-written notes if there are any, else the rule-made ones. */
export const learnFor = (recipeId: string): DishLearn | null => {
  if (LEARN[recipeId]) return LEARN[recipeId];
  const r = recipeById(recipeId);
  return r?.steps?.length ? deriveLearn(r) : null;
};
export const hasLearn = (recipeId: string) => !!learnFor(recipeId);

export const LEARN_UI = {
  safety: { en: 'Safety', tl: 'Kaligtasan', id: 'Keselamatan', my: 'ဘေးကင်းရေး', zh: '安全' },
  tip: { en: 'Good to know', tl: 'Mabuting malaman', id: 'Baik diketahui', my: 'သိထားရန်', zh: '小知识' },
  why: { en: 'Why', tl: 'Bakit', id: 'Kenapa', my: 'အကြောင်းရင်း', zh: '原因' },
  howWent: { en: 'How did it go?', tl: 'Kumusta ang pagluto?', id: 'Bagaimana tadi?', my: 'ဘယ်လိုနေလဲ?', zh: '做得怎么样？' },
  howSure: {
    en: 'How sure do you feel cooking this alone next time?',
    tl: 'Gaano ka kasigurado na kaya mo itong lutuin nang mag-isa sa susunod?',
    id: 'Seberapa yakin kamu memasak ini sendiri lain kali?',
    my: 'နောက်တစ်ကြိမ် တစ်ယောက်တည်း ချက်နိုင်မယ်လို့ ဘယ်လောက် ယုံကြည်လဲ?',
    zh: '下次你有多大把握自己做这道菜？',
  },
  anyHard: { en: 'Was anything hard? (tap any)', tl: 'May mahirap ba? (pindutin)', id: 'Ada yang sulit? (ketuk)', my: 'ခက်တာရှိလား? (နှိပ်ပါ)', zh: '有什么觉得难吗？（可多选）' },
  save: { en: 'Save', tl: 'I-save', id: 'Simpan', my: 'သိမ်းမည်', zh: '保存' },
  skip: { en: 'Skip', tl: 'Laktawan', id: 'Lewati', my: 'ကျော်မည်', zh: '跳过' },
  optional: {
    en: 'Optional. Only your family sees this, and it is never a test.',
    tl: 'Opsyonal. Ang pamilya mo lang ang nakakakita, at hindi ito pagsusulit.',
    id: 'Opsional. Hanya keluargamu yang melihat, dan ini bukan ujian.',
    my: 'မဖြစ်မနေမလို။ သင့်မိသားစုသာ မြင်ရပြီး စာမေးပွဲ မဟုတ်ပါ။',
    zh: '可选。只有你的家人能看到，这不是考试。',
  },
  lastTime: { en: 'Last time you found this tricky:', tl: 'Noong nakaraan, nahirapan ka sa:', id: 'Terakhir kali ini terasa sulit:', my: 'ပြီးခဲ့သည့်အကြိမ် ခက်ခဲခဲ့သည်:', zh: '上次你觉得难的是：' },
} satisfies Record<string, L5>;

export const HISTORY_UI = {
  cooked: { en: 'Cooked {n}× before', tl: 'Naluto na {n}×', id: 'Sudah dimasak {n}×', my: '{n} ကြိမ် ချက်ဖူးပြီ', zh: '以前做过 {n} 次' },
  last: { en: 'last {date}', tl: 'huli noong {date}', id: 'terakhir {date}', my: 'နောက်ဆုံး {date}', zh: '上次 {date}' },
  first: { en: 'Not cooked yet', tl: 'Hindi pa naluluto', id: 'Belum pernah dimasak', my: 'မချက်ဖူးသေးပါ', zh: '还没做过' },
  feedback: { en: 'Family said:', tl: 'Sabi ng pamilya:', id: 'Kata keluarga:', my: 'မိသားစုပြောသည်:', zh: '家人说：' },
} satisfies Record<string, L5>;

export const HARD: Difficulty[] = ['cutting', 'heat', 'flavour', 'timing', 'words'];
/** Label for each difficulty chip, and a short help line shown the next time. */
export const HARD_TEXT: Record<Difficulty, { label: L5; help: L5 }> = {
  cutting: {
    label: { en: 'Cutting', tl: 'Paghiwa', id: 'Memotong', my: 'လှီးဖြတ်ခြင်း', zh: '切菜' },
    help: {
      en: 'Take your time cutting. Same-size pieces cook evenly.',
      tl: 'Magdahan-dahan sa paghiwa. Pantay na hiwa, pantay na luto.',
      id: 'Pelan-pelan saat memotong. Ukuran sama, matang rata.',
      my: 'ဖြည်းဖြည်းလှီးပါ။ အရွယ်တူလျှင် ညီညာစွာကျက်သည်။',
      zh: '慢慢切。大小一致才会熟得均匀。',
    },
  },
  heat: {
    label: { en: 'Fire and heat', tl: 'Apoy at init', id: 'Api dan panas', my: 'မီးနှင့် အပူ', zh: '火候' },
    help: {
      en: 'If the oil smokes or things burn, lower the fire. You can always turn it up again.',
      tl: 'Kapag umuusok ang mantika o nasusunog, hinaan ang apoy.',
      id: 'Kalau minyak berasap atau gosong, kecilkan api. Bisa dibesarkan lagi.',
      my: 'ဆီမီးခိုးထွက်ရင် မီးလျှော့ပါ။ ပြန်မြှင့်လို့ရသည်။',
      zh: '油冒烟或快焦时就把火调小，随时可以再调大。',
    },
  },
  flavour: {
    label: { en: 'Taste and salt', tl: 'Lasa at asin', id: 'Rasa dan garam', my: 'အရသာနှင့် ဆား', zh: '味道和盐' },
    help: {
      en: 'Add salt and sauce a little at a time and taste in between.',
      tl: 'Magdagdag ng asin at sarsa nang unti-unti at tikman.',
      id: 'Tambahkan garam dan saus sedikit demi sedikit, sambil dicicipi.',
      my: 'ဆားနှင့် ဆော့စ်ကို နည်းနည်းချင်းထည့်ပြီး မြည်းကြည့်ပါ။',
      zh: '盐和酱汁一点一点加，边加边尝。',
    },
  },
  timing: {
    label: { en: 'Doing many things at once', tl: 'Maraming sabay-sabay', id: 'Banyak hal sekaligus', my: 'တစ်ပြိုင်နက် အများကြီး', zh: '同时做太多事' },
    help: {
      en: 'Cut and measure everything first, then turn on the fire.',
      tl: 'Hiwain at sukatin lahat bago buksan ang apoy.',
      id: 'Potong dan takar semuanya dulu, baru nyalakan api.',
      my: 'မီးမဖွင့်မီ အားလုံးကို လှီးပြီး ချိန်ထားပါ။',
      zh: '先把所有东西切好量好，再开火。',
    },
  },
  words: {
    label: { en: 'Understanding the steps', tl: 'Pag-unawa sa hakbang', id: 'Memahami langkah', my: 'အဆင့်များကို နားလည်ခြင်း', zh: '看不懂步骤' },
    help: {
      en: 'Try Guided mode: it explains each step. Ask the family if a word is new.',
      tl: 'Subukan ang Guided: ipinaliliwanag nito ang bawat hakbang.',
      id: 'Coba mode Dipandu: setiap langkah dijelaskan.',
      my: 'လမ်းညွှန်ပါ ပုံစံကို သုံးကြည့်ပါ၊ အဆင့်တိုင်းကို ရှင်းပြပါသည်။',
      zh: '试试“详细指导”，它会解释每一步。',
    },
  },
};
