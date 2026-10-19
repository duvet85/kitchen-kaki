import { Lang } from './types';

/** Helper-screen words that come from data, not from Gemini: weekday names and the units in ingredient amounts ("2 tbsp", "3 cloves"). */
const DAYS: Record<Exclude<Lang, 'en'>, string[]> = {
  tl: ['Lunes', 'Martes', 'Miyerkules', 'Huwebes', 'Biyernes', 'Sabado', 'Linggo'],
  id: ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'],
  my: ['တနင်္လာ', 'အင်္ဂါ', 'ဗုဒ္ဓဟူး', 'ကြာသပတေး', 'သောကြာ', 'စနေ', 'တနင်္ဂနွေ'],
  zh: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
};

export const dayLabel = (day: number, lang: Lang, en: string[]): string => (lang === 'en' ? en[day] : DAYS[lang][day] ?? en[day]);

const LOCALE: Record<Lang, string> = { en: 'en-SG', tl: 'fil-PH', id: 'id-ID', my: 'my-MM', zh: 'zh-CN' };
/** "20 Oct" in the helper's language (the phone's own date names), or "20/10" if the phone has none for it. */
export function shortDate(iso: string, lang: Lang): string {
  try { return new Date(iso + 'T00:00:00').toLocaleDateString(LOCALE[lang] ?? 'en-SG', { day: 'numeric', month: 'short' }); }
  catch { const [, m, d] = iso.split('-').map(Number); return `${d}/${m}`; }
}

// [tl, id, my, zh] for each unit word (singular and plural share an entry)
const UNITS: Record<string, [string, string, string, string]> = {
  tbsp: ['kutsara', 'sdm', 'ဟင်းစားဇွန်း', '汤匙'],
  tsp: ['kutsarita', 'sdt', 'လက်ဖက်ရည်ဇွန်း', '茶匙'],
  cup: ['tasa', 'cangkir', 'ခွက်', '杯'],
  clove: ['butil', 'siung', 'ဖာ', '瓣'],
  stalk: ['tangkay', 'batang', 'ပင်', '根'],
  slice: ['hiwa', 'iris', 'ချပ်', '片'],
  piece: ['piraso', 'potong', 'ခု', '块'],
  bunch: ['tali', 'ikat', 'စည်း', '把'],
  bundle: ['tali', 'ikat', 'စည်း', '把'],
  leaf: ['dahon', 'lembar', 'ရွက်', '片'],
  leaves: ['dahon', 'lembar', 'ရွက်', '片'],
  head: ['ulo', 'buah', 'လုံး', '颗'],
  sprig: ['sanga', 'tangkai', 'ကိုင်း', '枝'],
  box: ['kahon', 'kotak', 'ဘူး', '盒'],
  pack: ['pakete', 'bungkus', 'ထုပ်', '包'],
  can: ['lata', 'kaleng', 'ဗူး', '罐'],
  bag: ['supot', 'kantong', 'အိတ်', '袋'],
  whole: ['buo', 'utuh', 'တစ်ခုလုံး', '整个'],
  tube: ['tube', 'tabung', 'ပြွန်', '条'],
  fillet: ['filet', 'fillet', 'ချပ်', '片'],
  cob: ['mais', 'tongkol', 'ဖူး', '根'],
  bulb: ['bombilya', 'siung', 'လုံး', '头'],
  pcs: ['piraso', 'buah', 'ခု', '个'],
  pc: ['piraso', 'buah', 'ခု', '个'],
  loaf: ['tinapay', 'roti', 'ပေါင်မုန့်', '条'],
  l: ['L', 'L', 'L', '升'],
  cooked: ['luto na', 'matang', 'ချက်ပြီး', '熟的'],
  cold: ['malamig', 'dingin', 'အေး', '冷的'],
  thin: ['manipis', 'tipis', 'ပါး', '薄'],
};
const IDX = { tl: 0, id: 1, my: 2, zh: 3 } as const;

/** "2 tbsp" -> "2 kutsara". Words with no entry (and numbers) are left as they are. */
export function qtyLabel(qty: string, lang: Lang): string {
  if (lang === 'en') return qty;
  return qty.replace(/[A-Za-z]+/g, (w) => {
    const lower = w.toLowerCase();
    const hit = UNITS[lower] ?? UNITS[lower.replace(/s$/, '')] ?? UNITS[lower.replace(/es$/, '')];
    return hit ? hit[IDX[lang]] : w;
  });
}

/** Tab names on a helper's phone, in her language. */
export const TAB_LABEL: Record<string, Record<Exclude<Lang, 'en'>, string>> = {
  helper: { tl: 'Mga recipe', id: 'Resep', my: 'ချက်နည်း', zh: '食谱' },
  kitchen: { tl: 'Kusina', id: 'Dapur', my: 'မီးဖိုချောင်', zh: '厨房' },
  settings: { tl: 'Setting', id: 'Pengaturan', my: 'ဆက်တင်', zh: '设置' },
};
