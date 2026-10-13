import { Lang, TipTag } from './types';

/**
 * Words the helper sees in the Kitchen tab: thanks, tips, ranks, badges and lessons.
 * Tagalog, Bahasa Indonesia and Burmese are draft translations made for the prototype:
 * ask native speakers to check them before release.
 */
const K = {
  myKitchen: { en: 'My kitchen', tl: 'Aking kusina', id: 'Dapurku', my: 'ကျွန်မ၏ မီးဖိုချောင်' },
  points: { en: 'Kitchen points', tl: 'Puntos sa kusina', id: 'Poin dapur', my: 'မီးဖိုချောင် အမှတ်' },
  toNext: { en: '{n} more points to {rank}', tl: '{n} puntos pa para maging {rank}', id: '{n} poin lagi menuju {rank}', my: '{rank} ဖြစ်ရန် အမှတ် {n} ထပ်လိုသည်' },
  topRank: { en: 'The highest rank. Thank you for everything!', tl: 'Pinakamataas na ranggo. Salamat sa lahat!', id: 'Peringkat tertinggi. Terima kasih atas semuanya!', my: 'အမြင့်ဆုံး အဆင့်ပါ။ အစစအရာရာ ကျေးဇူးတင်ပါတယ်!' },
  thanksHead: { en: 'Thank-you notes', tl: 'Mga pasasalamat', id: 'Ucapan terima kasih', my: 'ကျေးဇူးတင်စကားများ' },
  from: { en: 'from {who}', tl: 'mula kay {who}', id: 'dari {who}', my: '{who} ထံမှ' },
  noThanks: { en: 'Thank-you notes from the family will show here.', tl: 'Dito lalabas ang mga pasasalamat ng pamilya.', id: 'Ucapan terima kasih dari keluarga akan muncul di sini.', my: 'မိသားစု၏ ကျေးဇူးတင်စကားများ ဤနေရာတွင် ပေါ်ပါမည်။' },
  badges: { en: 'Badges', tl: 'Mga badge', id: 'Lencana', my: 'တံဆိပ်များ' },
  noBadges: { en: 'Badges you earn will show here.', tl: 'Dito lalabas ang mga badge na makukuha mo.', id: 'Lencana yang kamu dapat akan muncul di sini.', my: 'ရရှိသော တံဆိပ်များ ဤနေရာတွင် ပေါ်ပါမည်။' },
  myDishes: { en: 'My dishes', tl: 'Aking mga putahe', id: 'Masakanku', my: 'ကျွန်မ၏ ဟင်းများ' },
  mastered: { en: 'Mastered', tl: 'Bihasa na', id: 'Sudah mahir', my: 'ကျွမ်းကျင်ပြီ' },
  confident: { en: 'Confident', tl: 'Kumpiyansa', id: 'Percaya diri', my: 'ယုံကြည်မှုရှိ' },
  practise: { en: 'Practise again', tl: 'Sanayin pa', id: 'Latih lagi', my: 'ထပ်လေ့ကျင့်ရန်' },
  howSure: { en: 'How sure do you feel cooking this alone?', tl: 'Gaano ka kasigurado na kaya mo itong lutuin nang mag-isa?', id: 'Seberapa yakin kamu memasak ini sendiri?', my: 'ဒီဟင်းကို တစ်ယောက်တည်း ချက်နိုင်မယ်လို့ ဘယ်လောက် ယုံကြည်လဲ?' },
  sure1: { en: 'Not yet', tl: 'Hindi pa', id: 'Belum', my: 'မယုံကြည်သေး' },
  sure5: { en: 'Very sure', tl: 'Siguradong-sigurado', id: 'Sangat yakin', my: 'အလွန်ယုံကြည်' },
  rateDishes: { en: 'Rate how sure you feel', tl: 'I-rate kung gaano ka kasigurado', id: 'Nilai seberapa yakin kamu', my: 'ယုံကြည်မှုကို အဆင့်သတ်မှတ်ပါ' },
  noDishes: { en: 'Dishes you cook will show here. Rate how sure you feel, and the family can mark them as mastered.', tl: 'Dito lalabas ang mga putaheng niluto mo. I-rate kung gaano ka kasigurado, at maaaring markahan ng pamilya na bihasa ka na.', id: 'Masakan yang kamu masak akan muncul di sini. Nilai seberapa yakin kamu, dan keluarga bisa menandainya sudah mahir.', my: 'သင်ချက်ခဲ့သော ဟင်းများ ဤနေရာတွင် ပေါ်ပါမည်။ ယုံကြည်မှုကို အဆင့်သတ်မှတ်ပါ၊ မိသားစုက ကျွမ်းကျင်ပြီဟု မှတ်ပေးနိုင်သည်။' },
  tipsHead: { en: 'How we like it', tl: 'Ganito namin gusto', id: 'Begini kami suka', my: 'ကျွန်ုပ်တို့ ကြိုက်သည့်ပုံစံ' },
  tipThanks: { en: 'Thank you for cooking {dish}!', tl: 'Salamat sa pagluto ng {dish}!', id: 'Terima kasih sudah memasak {dish}!', my: '{dish} ချက်ပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်!' },
  tipNext: { en: 'Next time:', tl: 'Sa susunod:', id: 'Lain kali:', my: 'နောက်တစ်ကြိမ်:' },
  remember: { en: 'Each time you cook this:', tl: 'Tuwing lulutuin mo ito:', id: 'Setiap kali memasak ini:', my: 'ဒီဟင်းချက်တိုင်း:' },
  gotIt: { en: 'Got it', tl: 'Sige po', id: 'Mengerti', my: 'နားလည်ပါပြီ' },
  original: { en: 'Show the English', tl: 'Ipakita ang Ingles', id: 'Tampilkan bahasa Inggris', my: 'အင်္ဂလိပ်လို ပြရန်' },
  hide: { en: 'Hide my points', tl: 'Itago ang aking puntos', id: 'Sembunyikan poinku', my: 'ကျွန်မ၏ အမှတ်ကို ဖျောက်ရန်' },
  show: { en: 'Show my points', tl: 'Ipakita ang aking puntos', id: 'Tampilkan poinku', my: 'ကျွန်မ၏ အမှတ်ကို ပြရန်' },
  hidden: { en: 'Your points are hidden. Thank-you notes still show.', tl: 'Nakatago ang iyong puntos. Makikita pa rin ang mga pasasalamat.', id: 'Poinmu disembunyikan. Ucapan terima kasih tetap muncul.', my: 'အမှတ်များကို ဖျောက်ထားသည်။ ကျေးဇူးတင်စကားများ ဆက်ပြပါမည်။' },
  private: { en: 'Only your family sees this. It is a thank-you, not a test, and it is never used for pay.', tl: 'Ang pamilya mo lang ang nakakakita nito. Pasasalamat ito, hindi pagsusulit, at hindi ito ginagamit sa sahod.', id: 'Hanya keluargamu yang melihat ini. Ini ucapan terima kasih, bukan ujian, dan tidak pernah dipakai untuk gaji.', my: 'သင့်မိသားစုသာ မြင်ရသည်။ ကျေးဇူးတင်ခြင်းသာဖြစ်ပြီး စာမေးပွဲ မဟုတ်ပါ၊ လစာအတွက် ဘယ်တော့မှ မသုံးပါ။' },
  saveRecord: { en: 'Share my record', tl: 'Ibahagi ang aking record', id: 'Bagikan catatanku', my: 'ကျွန်မ၏ မှတ်တမ်းကို မျှဝေရန်' },
  nowRank: { en: 'Congratulations! You are now a {rank}.', tl: 'Binabati kita! Isa ka na ngayong {rank}.', id: 'Selamat! Sekarang kamu {rank}.', my: 'ဂုဏ်ယူပါတယ်! ယခု သင်သည် {rank} ဖြစ်ပါပြီ။' },
  newBadge: { en: 'New badge: {badge}', tl: 'Bagong badge: {badge}', id: 'Lencana baru: {badge}', my: 'တံဆိပ်အသစ်: {badge}' },
  thankYou: { en: 'Thank you!', tl: 'Salamat po!', id: 'Terima kasih!', my: 'ကျေးဇူးတင်ပါတယ်!' },
  // lessons
  lesson: { en: 'Cooking lesson', tl: 'Aralin sa pagluluto', id: 'Pelajaran memasak', my: 'ချက်ပြုတ်နည်း သင်ခန်းစာ' },
  lessonWhen: { en: '{date} at {time} with {teacher}', tl: '{date}, {time}, kasama si {teacher}', id: '{date} pukul {time} bersama {teacher}', my: '{date} {time} တွင် {teacher} နှင့်' },
  plan2h: { en: 'The 2-hour plan', tl: 'Ang 2-oras na plano', id: 'Rencana 2 jam', my: '၂ နာရီ အစီအစဉ်' },
  knife: { en: 'Cutting and prep', tl: 'Paghiwa at paghahanda', id: 'Memotong dan menyiapkan', my: 'လှီးဖြတ်ခြင်းနှင့် ပြင်ဆင်ခြင်း' },
  heat: { en: 'Heat and fire', tl: 'Init at apoy', id: 'Panas dan api', my: 'အပူနှင့် မီး' },
  notes: { en: "Teacher's notes", tl: 'Mga tala ng guro', id: 'Catatan guru', my: 'ဆရာ၏ မှတ်စုများ' },
  finish: { en: 'Lesson finished', tl: 'Tapos na ang aralin', id: 'Pelajaran selesai', my: 'သင်ခန်းစာ ပြီးပါပြီ' },
  done: { en: 'Done', tl: 'Tapos', id: 'Selesai', my: 'ပြီးပါပြီ' },
  stepTeach: { en: 'Welcome, wash hands, read the plan together', tl: 'Batian, maghugas ng kamay, basahin ang plano nang magkasama', id: 'Sambutan, cuci tangan, baca rencana bersama', my: 'နှုတ်ဆက်၊ လက်ဆေး၊ အစီအစဉ်ကို အတူဖတ်ပါ' },
  stepPrep: { en: 'Prepare everything: wash, cut and measure', tl: 'Ihanda ang lahat: hugasan, hiwain at sukatin', id: 'Siapkan semua: cuci, potong dan takar', my: 'အားလုံးပြင်ဆင်ပါ- ဆေး၊ လှီး၊ ချိန်' },
  stepCook: { en: 'Cook: {dish}', tl: 'Lutuin: {dish}', id: 'Masak: {dish}', my: 'ချက်ရန်: {dish}' },
  stepEarly: { en: 'Before the lesson, start: {dish}', tl: 'Bago ang aralin, simulan: {dish}', id: 'Sebelum pelajaran, mulai: {dish}', my: 'သင်ခန်းစာ မစမီ စတင်ရန်: {dish}' },
  stepTaste: { en: 'Taste and adjust the seasoning together', tl: 'Tikman at ayusin ang timpla nang magkasama', id: 'Cicipi dan sesuaikan bumbu bersama', my: 'အရသာကို အတူမြည်းပြီး ညှိပါ' },
  stepTidy: { en: 'Clean up and go over what you learned', tl: 'Maglinis at balikan ang natutunan', id: 'Bersihkan dan ulas yang sudah dipelajari', my: 'သန့်ရှင်းရေးလုပ်ပြီး သင်ယူခဲ့တာကို ပြန်သုံးသပ်ပါ' },
  // general lesson tips by kind of dish, used when Gemini is off
  soupKnife: { en: 'Cut the vegetables into even chunks so they cook at the same time.', tl: 'Hiwain nang pare-pareho ang mga gulay para sabay-sabay maluto.', id: 'Potong sayur sama besar agar matang bersamaan.', my: 'ဟင်းသီးဟင်းရွက်ကို အရွယ်တူ လှီးပါ၊ တပြိုင်နက် ကျက်စေရန်။' },
  soupHeat: { en: 'Bring to a boil, then lower to a gentle simmer. Skim off the foam.', tl: 'Pakuluan, saka hinaan sa mahinang kulo. Alisin ang bula.', id: 'Didihkan, lalu kecilkan api hingga mendidih pelan. Buang busanya.', my: 'ဆူအောင်တည်ပြီး မီးလျှော့ကာ ဖြည်းဖြည်းဆူစေပါ။ အမြှုပ်ကို ဆယ်ထုတ်ပါ။' },
  slowKnife: { en: 'Score thick fish or meat so the heat reaches the middle.', tl: 'Hiwaan ang makapal na isda o karne para umabot ang init sa gitna.', id: 'Toreh ikan atau daging yang tebal agar panas sampai ke tengah.', my: 'အထူ ငါး သို့မဟုတ် အသားကို အလယ်ထိ အပူရောက်အောင် ခြစ်ပါ။' },
  slowHeat: { en: 'Steam over fast-boiling water, or braise on low heat with the lid on. Check the thickest part is cooked.', tl: 'I-steam sa malakas na kumukulong tubig, o lutuin sa mahinang apoy nang may takip. Tiyaking luto ang pinakamakapal na bahagi.', id: 'Kukus di atas air yang mendidih kencang, atau masak dengan api kecil dan tutup. Pastikan bagian paling tebal matang.', my: 'အပြင်းဆူနေသော ရေပေါ်တွင် ပေါင်းပါ၊ သို့မဟုတ် အဖုံးအုပ်ပြီး မီးအေးအေးဖြင့် နှပ်ပါ။ အထူဆုံးနေရာ ကျက်မကျက် စစ်ပါ။' },
  wokKnife: { en: 'Cut everything small and the same size, and have it all ready before you turn on the fire.', tl: 'Hiwain nang maliit at pare-pareho, at ihanda lahat bago buksan ang apoy.', id: 'Potong semua kecil dan sama besar, dan siapkan semuanya sebelum menyalakan api.', my: 'အားလုံးကို သေးသေးနှင့် အရွယ်တူ လှီးပြီး မီးမဖွင့်မီ အဆင်သင့်ထားပါ။' },
  wokHeat: { en: 'Very hot wok, cook fast and keep tossing. Garlic burns quickly, so watch it.', tl: 'Napakainit na kawali, lutuin nang mabilis at laging haluin. Mabilis masunog ang bawang, kaya bantayan.', id: 'Wajan sangat panas, masak cepat dan terus diaduk. Bawang putih cepat gosong, jadi perhatikan.', my: 'ဒယ်အိုး အလွန်ပူပါစေ၊ မြန်မြန်ချက်ပြီး အမြဲမွှေပါ။ ကြက်သွန်ဖြူ မြန်မြန်တူးတတ်သဖြင့် သတိထားပါ။' },
  byGemini: { en: 'Tips drafted by Gemini, not checked by a cook', tl: 'Mga tip na ginawa ng Gemini, hindi pa nasusuri ng kusinero', id: 'Tips dibuat Gemini, belum dicek juru masak', my: 'Gemini ရေးထားသော အကြံပြုချက်များ၊ စားဖိုမှူး မစစ်ရသေးပါ' },
} satisfies Record<string, Record<Lang, string>>;

export type KKey = keyof typeof K;
export const tk = (key: KKey, lang: Lang, vars: Record<string, string | number> = {}) =>
  K[key][lang].replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ''));

/** Praise and tips as the helper reads them. The owner picks them as chips (TIP_CHIP). */
export const TIP_TEXT: Record<TipTag, Record<Lang, string>> = {
  delicious: { en: 'That was delicious!', tl: 'Ang sarap nito!', id: 'Enak sekali!', my: 'အရမ်းစားကောင်းတယ်!' },
  justright: { en: 'Just right, the way we like it.', tl: 'Tamang-tama, gaya ng gusto namin.', id: 'Pas sekali, seperti yang kami suka.', my: 'ကျွန်ုပ်တို့ကြိုက်သလို အနေတော်ပဲ။' },
  kidsloved: { en: 'The kids loved it.', tl: 'Gustong-gusto ito ng mga bata.', id: 'Anak-anak sangat suka.', my: 'ကလေးတွေ အရမ်းကြိုက်ကြတယ်။' },
  thanks: { en: 'Thank you for your hard work.', tl: 'Salamat sa iyong pagsisikap.', id: 'Terima kasih atas kerja kerasmu.', my: 'ကြိုးစားပေးတဲ့အတွက် ကျေးဇူးတင်ပါတယ်။' },
  salty: { en: 'A little less salt.', tl: 'Bawasan nang kaunti ang asin.', id: 'Kurangi sedikit garamnya.', my: 'ဆားကို နည်းနည်း လျှော့ပါ။' },
  bland: { en: 'A little more flavour (salt or sauce).', tl: 'Dagdagan nang kaunti ang lasa (asin o sarsa).', id: 'Tambah sedikit rasa (garam atau saus).', my: 'အရသာ နည်းနည်း ထပ်ထည့်ပါ (ဆား သို့မဟုတ် ဆော့စ်)။' },
  spicy: { en: 'Milder, please: less chilli.', tl: 'Mas hindi maanghang po: bawasan ang sili.', id: 'Kurang pedas ya: kurangi cabainya.', my: 'အစပ်လျော့ပါ- ငရုတ်သီး နည်းနည်းထည့်ပါ။' },
  mild: { en: 'A bit spicier, please.', tl: 'Medyo mas maanghang po.', id: 'Sedikit lebih pedas ya.', my: 'နည်းနည်း ပိုစပ်ပါစေ။' },
  oily: { en: 'Less oil.', tl: 'Bawasan ang mantika.', id: 'Kurangi minyaknya.', my: 'ဆီ လျှော့ထည့်ပါ။' },
  sweet: { en: 'Less sweet.', tl: 'Bawasan ang tamis.', id: 'Kurangi manisnya.', my: 'အချို လျှော့ပါ။' },
  undercooked: { en: 'Cook it a little longer.', tl: 'Lutuin nang medyo mas matagal.', id: 'Masak sedikit lebih lama.', my: 'နည်းနည်း ပိုကြာအောင် ချက်ပါ။' },
  overcooked: { en: 'Cook it a little less, so it stays tender or crunchy.', tl: 'Lutuin nang medyo mas maikli, para malambot o malutong pa rin.', id: 'Masak sedikit lebih sebentar, agar tetap empuk atau renyah.', my: 'နည်းနည်း စောစောချပါ၊ နူးညံ့ သို့မဟုတ် ကြွပ်နေစေရန်။' },
  smaller: { en: 'Cut the pieces smaller.', tl: 'Hiwain nang mas maliit.', id: 'Potong lebih kecil.', my: 'အပိုင်းအစများကို ပိုသေးအောင် လှီးပါ။' },
};

export const PRAISE: TipTag[] = ['delicious', 'justright', 'kidsloved', 'thanks'];
export const TIPS: TipTag[] = ['salty', 'bland', 'spicy', 'mild', 'oily', 'sweet', 'undercooked', 'overcooked', 'smaller'];
export const isPraise = (x: TipTag) => PRAISE.includes(x);
/** Short labels on the owner's chips. */
export const TIP_CHIP: Record<TipTag, string> = {
  delicious: 'Delicious!', justright: 'Just right', kidsloved: 'Kids loved it', thanks: 'Thanks for your hard work',
  salty: 'Less salt', bland: 'More flavour', spicy: 'Milder', mild: 'Spicier', oily: 'Less oil', sweet: 'Less sweet',
  undercooked: 'Cook longer', overcooked: 'Cook less', smaller: 'Cut smaller',
};
/** Tips that say the opposite of each other: a new one replaces the old one. */
export const OPPOSITE: Partial<Record<TipTag, TipTag>> = { salty: 'bland', bland: 'salty', spicy: 'mild', mild: 'spicy', undercooked: 'overcooked', overcooked: 'undercooked' };

/** Ranks, lowest first. They never go down. */
export const RANKS: { from: number; name: Record<Lang, string>; meaning: string }[] = [
  { from: 0, name: { en: 'Home Cook', tl: 'Home Cook', id: 'Juru Masak Rumah', my: 'အိမ်ချက် စားဖိုမှူး' }, meaning: "Starting out in the family's kitchen" },
  { from: 150, name: { en: 'Trusted Cook', tl: 'Pinagkakatiwalaang Kusinero', id: 'Juru Masak Terpercaya', my: 'ယုံကြည်ရသော စားဖိုမှူး' }, meaning: 'The family relies on her everyday cooking' },
  { from: 400, name: { en: 'Skilled Cook', tl: 'Bihasang Kusinero', id: 'Juru Masak Terampil', my: 'ကျွမ်းကျင်သော စားဖိုမှူး' }, meaning: "Cooks a wide range of the family's dishes well" },
  { from: 800, name: { en: 'Senior Cook', tl: 'Senior na Kusinero', id: 'Juru Masak Senior', my: 'အကြီးတန်း စားဖိုမှူး' }, meaning: 'Has mastered dishes across several cuisines' },
  { from: 1500, name: { en: 'Head Cook of the House', tl: 'Punong Kusinero ng Bahay', id: 'Kepala Juru Masak Rumah', my: 'အိမ်၏ စားဖိုမှူးချုပ်' }, meaning: 'Runs the family kitchen with confidence' },
];

export type BadgeKey = 'firstLesson' | 'soups' | 'slow' | 'wok' | 'favourite' | 'explorer' | 'steady' | 'cuisines' | 'thanked';
export const BADGES: Record<BadgeKey, { icon: string; name: Record<Lang, string>; how: string }> = {
  firstLesson: { icon: '🎓', name: { en: 'First Lesson', tl: 'Unang Aralin', id: 'Pelajaran Pertama', my: 'ပထမ သင်ခန်းစာ' }, how: 'First cooking lesson finished' },
  soups: { icon: '🍲', name: { en: 'Soup Specialist', tl: 'Eksperto sa Sabaw', id: 'Ahli Sup', my: 'ဟင်းချို ကျွမ်းကျင်သူ' }, how: '3 soups mastered' },
  slow: { icon: '♨️', name: { en: 'Steam & Braise', tl: 'Steam at Braise', id: 'Kukus & Ungkep', my: 'ပေါင်းနှင့် နှပ်' }, how: '3 steamed or braised dishes mastered' },
  wok: { icon: '🔥', name: { en: 'Wok Hands', tl: 'Kamay sa Kawali', id: 'Tangan Wajan', my: 'ဒယ်အိုး လက်စွမ်း' }, how: '3 stir-fries mastered' },
  favourite: { icon: '⭐', name: { en: 'Family Favourite', tl: 'Paborito ng Pamilya', id: 'Favorit Keluarga', my: 'မိသားစု အကြိုက်' }, how: 'A dish she mastered is rated 5★ by the family' },
  explorer: { icon: '🧭', name: { en: 'Explorer', tl: 'Manlalakbay', id: 'Penjelajah', my: 'စူးစမ်းသူ' }, how: '10 new dishes cooked for the first time' },
  steady: { icon: '🗓️', name: { en: 'Steady Hands', tl: 'Matatag na Kamay', id: 'Tangan Mantap', my: 'တည်ငြိမ်သော လက်' }, how: '4 full weeks cooked' },
  cuisines: { icon: '🌏', name: { en: 'Three Kitchens', tl: 'Tatlong Kusina', id: 'Tiga Dapur', my: 'မီးဖိုချောင် သုံးမျိုး' }, how: 'Dishes mastered in 3 different cuisines' },
  thanked: { icon: '💐', name: { en: 'Well Thanked', tl: 'Maraming Pasasalamat', id: 'Banyak Terima Kasih', my: 'ကျေးဇူးတင်ခံရသူ' }, how: '25 thank-you notes received' },
};
