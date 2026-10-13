import { ImageSourcePropType } from 'react-native';

/**
 * Free-licence dish photos (Unsplash License / Pexels License), stored inside the app (assets/dishes, 640px JPEGs),
 * so they always show, offline too, and nothing is loaded from the photo sites.
 * Neither licence requires credit, but we credit the photographers anyway (Settings > Photo credits, and under the photo).
 * Photographer and licence of each photo checked on its photo page on 2026-10-13. Add new photos only with page,
 * photographer and licence recorded; skip any photo whose licence can't be confirmed (no Unsplash+).
 * Wikimedia Commons photos (added 2026-10-13): only CC0, public domain and CC BY are used; CC BY-SA, non-commercial
 * and unclear licences are skipped. CC BY needs the photographer, licence name and licence link shown (licenseUrl).
 * Author and licence read from each Commons file page on 2026-10-13.
 */
// Every photo here was looked at (2026-10-13) and kept only when it clearly shows this dish. Wrong dishes and
// lookalikes were removed: a dish with no photo shows a labelled "Photo coming soon" placeholder instead.
export interface Photo {
  src: ImageSourcePropType;
  page: string;
  by: string;
  site: 'Unsplash' | 'Pexels' | 'Wikimedia Commons';
  license: string;
  /** link to the licence text; set for CC BY photos, which must show the licence name and link with the credit */
  licenseUrl?: string;
  shows: string;
}

export const PHOTOS: Record<string, Photo | null> = {
  'chicken-rice': { src: require('../../assets/dishes/chicken-rice.jpg'), ...{"page": "https://unsplash.com/photos/hainanese-chicken-rice-lunch-meal-vg3mQlbHyks", "by": "Annie Hatuanh", "site": "Unsplash", "license": "Unsplash License", "shows": "Hainanese chicken rice with chilli sauce"} },
  'sambal-kangkong': { src: require('../../assets/dishes/sambal-kangkong.jpg'), ...{"page": "https://www.pexels.com/photo/delicious-plecing-kangkung-dish-from-bali-indonesia-37107006/", "by": "Tamba Budiarsana", "site": "Pexels", "license": "Pexels License", "shows": "Plate of cooked water spinach (kangkung) with sliced red chillies and spring onion in a chilli sauce, top view on marble"} },
  'steamed-fish': { src: require('../../assets/dishes/steamed-fish.jpg'), ...{"page": "https://unsplash.com/photos/a-white-plate-topped-with-a-fish-covered-in-veggies-izLwrudM-RA", "by": "You Le", "site": "Unsplash", "license": "Unsplash License", "shows": "Whole steamed pomfret in light soy sauce, topped with shredded ginger, spring onion/greens, shiitake and red chilli on an oval platter"} },
  'dhal-curry': { src: require('../../assets/dishes/dhal-curry.jpg'), ...{"page": "https://unsplash.com/photos/a-bowl-of-yellow-dal-with-garnishes-and-bread-O_MFjbig3hA", "by": "Anil Sharma", "site": "Unsplash", "license": "Unsplash License", "shows": "Yellow dal"} },
  'ayam-masak-merah': { src: require('../../assets/dishes/ayam-masak-merah.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:Ayam_masak_merah.jpg", "by": "Ahmad Shazlan", "site": "Wikimedia Commons", "license": "CC0 (public domain)", "shows": "Chicken pieces in thick red chilli-tomato gravy topped with chopped onion, in a white baking dish"} },
  'sweet-sour-pork': { src: require('../../assets/dishes/sweet-sour-pork.jpg'), ...{"page": "https://www.pexels.com/photo/sweet-and-sour-pork-with-wooden-chopsticks-on-white-ceramic-bowl-5848495/", "by": "Polina Tankilevitch", "site": "Pexels", "license": "Pexels License", "shows": "Sweet and sour pork"} },
  'beef-rendang': { src: require('../../assets/dishes/beef-rendang.jpg'), ...{"page": "https://unsplash.com/photos/a-close-up-of-a-bowl-of-food-on-a-table-bX7UPKH1vxs", "by": "qaz farid", "site": "Unsplash", "license": "Unsplash License", "shows": "Malaysian rendang"} },
  'egg-tofu-veg': { src: require('../../assets/dishes/egg-tofu-veg.jpg'), ...{"page": "https://unsplash.com/photos/sizzling-tofu-skillet-dinner-BE0-pX6-J04", "by": "Kuali Nenek", "site": "Unsplash", "license": "Unsplash License", "shows": "Hotplate tofu: round egg tofu slices on a bed of egg in a cast-iron sizzling plate, with carrot, black fungus, cabbage, squid and spring onion in brown gravy"} },
  'assam-fish': { src: require('../../assets/dishes/assam-fish.jpg'), ...{"page": "https://www.pexels.com/photo/spicy-fish-curry-with-okra-and-herbs-38837083/", "by": "Shaiful Ismail", "site": "Pexels", "license": "Pexels License", "shows": "Bowl of fish pieces in thin red-orange chilli gravy with whole okra and daun kesum (laksa leaf) sprigs, white rice behind"} },
  'garlic-broccoli': { src: require('../../assets/dishes/garlic-broccoli.jpg'), ...{"page": "https://unsplash.com/photos/stir-fried-broccoli-with-chili-flakes-and-garlic-twJcB5sLvkw", "by": "Abhijit Biswas", "site": "Unsplash", "license": "Unsplash License", "shows": "Stir-fried broccoli with garlic"} },
  'prawn-chye-sim': null,
  'chicken-curry': { src: require('../../assets/dishes/chicken-curry.jpg'), ...{"page": "https://unsplash.com/photos/chicken-curry-in-a-white-bowl-with-sauce-VtNLbOAeO68", "by": "Kalindu Waranga", "site": "Unsplash", "license": "Unsplash License", "shows": "Chicken curry"} },
  'tau-yew-bak': { src: require('../../assets/dishes/tau-yew-bak.jpg'), ...{"page": "https://unsplash.com/photos/braised-pork-belly-with-eggs-and-side-dishes-_luSs5lUkjA", "by": "Nguyen Mazic", "site": "Unsplash", "license": "Unsplash License", "shows": "Soy-braised pork belly with eggs"} },
  'miso-salmon': { src: require('../../assets/dishes/miso-salmon.jpg'), ...{"page": "https://unsplash.com/photos/two-plates-of-food-on-a-white-table-nmJRb8MPCLQ", "by": "sheri silver", "site": "Unsplash", "license": "Unsplash License", "shows": "Two plates of broiled, caramelised-glaze salmon fillets with sesame seeds and charred whole scallions over white rice"} },
  'spaghetti-bolognese': { src: require('../../assets/dishes/spaghetti-bolognese.jpg'), ...{"page": "https://unsplash.com/photos/pasta-with-sauce-on-white-ceramic-plate-OMp3XpMiqGU", "by": "Karolina Kołodziejczak", "site": "Unsplash", "license": "Unsplash License", "shows": "Plate of spaghetti topped with a thick minced-meat tomato sauce and grated cheese, second plate behind"} },
  'sayur-lodeh': { src: require('../../assets/dishes/sayur-lodeh.jpg'), ...{"page": "https://www.pexels.com/photo/authentic-indonesian-sayur-lodeh-in-bali-37106989/", "by": "Tamba Budiarsana", "site": "Pexels", "license": "Pexels License", "shows": "Steel bowl of yellow coconut-milk vegetable curry (young jackfruit, vegetables, sliced chillies and spring onion) with rice, krupuk, boiled egg and sambal on the side"} },
  'tomato-egg': { src: require('../../assets/dishes/tomato-egg.jpg'), ...{"page": "https://unsplash.com/photos/cooked-food-on-white-ceramic-plate-6QE9lltiDvc", "by": "Helen Van", "site": "Unsplash", "license": "Unsplash License", "shows": "Egg tomato stir-fry"} },
  'ayam-serai': null,
  'black-pepper-chicken': { src: require('../../assets/dishes/black-pepper-chicken.jpg'), ...{"page": "https://www.pexels.com/photo/close-up-shot-of-a-dish-on-a-plate-13065207/", "by": "Marvin Sacdalan", "site": "Pexels", "license": "Pexels License", "shows": "Bite-size chicken stir-fried with green pepper, onion and garlic in a glossy brown sauce, with cracked black pepper visible on the chicken"} },
  'chap-chye': null,
  'fish-curry': { src: require('../../assets/dishes/fish-curry.jpg'), ...{"page": "https://unsplash.com/photos/fish-curry-with-rice-lime-and-nuts-7v9U94719TE", "by": "Diego Arenas de Rodrigo", "site": "Unsplash", "license": "Unsplash License", "shows": "Fish curry with rice"} },
  'teriyaki-chicken': { src: require('../../assets/dishes/teriyaki-chicken.jpg'), ...{"page": "https://unsplash.com/photos/cooked-food-on-white-ceramic-plate-VhuC3z2o8vQ", "by": "Tomoyo S", "site": "Unsplash", "license": "Unsplash License", "shows": "Teriyaki chicken"} },
  'garlic-kailan': { src: require('../../assets/dishes/garlic-kailan.jpg'), ...{"page": "https://unsplash.com/photos/a-plate-of-cooked-green-chinese-broccoli-7mlApdLeHF0", "by": "You Le", "site": "Unsplash", "license": "Unsplash License", "shows": "Cooked Chinese broccoli"} },
  'chana-masala': { src: require('../../assets/dishes/chana-masala.jpg'), ...{"page": "https://unsplash.com/photos/chana-masala-with-fried-bhatura-bread-Idh9dnG2v8w", "by": "Zoshua Colah", "site": "Unsplash", "license": "Unsplash License", "shows": "Chana masala"} },
  'ikan-goreng-kunyit': { src: require('../../assets/dishes/ikan-goreng-kunyit.jpg'), ...{"page": "https://www.pexels.com/photo/traditional-indonesian-fried-fish-with-chilies-37179947/", "by": "Ega Morgan", "site": "Pexels", "license": "Pexels License", "shows": "Two whole small mackerel (kembung-type) pan-fried with a yellow turmeric spice coating, topped with sliced green chilli and basil, sambal on the side"} },
  'steamed-pork-tofu': null,
  'chicken-chop': { src: require('../../assets/dishes/chicken-chop.jpg'), ...{"page": "https://unsplash.com/photos/a-white-plate-topped-with-meat-fries-and-coleslaw-r6J1Cq5K4wk", "by": "mahsa shamshiri fard", "site": "Unsplash", "license": "Unsplash License", "shows": "Grilled boneless chicken pieces with grill marks, crinkle-cut fries, coleslaw, a corn cob and a dip on a plate"} },
  'garlic-brinjal': { src: require('../../assets/dishes/garlic-brinjal.jpg'), ...{"page": "https://www.pexels.com/photo/close-up-of-a-bowl-with-a-gourmet-dish-27039855/", "by": "Change C.C", "site": "Pexels", "license": "Pexels License", "shows": "Soft braised purple eggplant strips glossy in a dark savoury sauce, served in a claypot"} },
  // Soups
  'abc-soup': { src: require('../../assets/dishes/abc-soup.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:ABC_Soup.jpg", "by": "Anamelessbeing", "site": "Wikimedia Commons", "license": "CC0 (public domain)", "shows": "Bowl of clear ABC soup with corn cobs, carrot, potato, tomato and chicken"} },
  'old-cucumber-soup': null,
  'lotus-root-soup': { src: require('../../assets/dishes/lotus-root-soup.jpg'), ...{"page": "https://www.pexels.com/photo/close-up-photo-of-corn-soup-7287708/", "by": "Anna Tarazevich", "site": "Pexels", "license": "Pexels License", "shows": "Close-up of a pot of clear Chinese soup with lotus root slices (holes clearly visible), corn chunks, carrot, red dates and goji berries"} },
  'watercress-soup': { src: require('../../assets/dishes/watercress-soup.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:Chinese_watercress_soup_with_sweet_corn_and_pork.jpg", "by": "Phoebe", "site": "Wikimedia Commons", "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/", "shows": "Bowl of Chinese watercress soup (titled: with sweet corn and pork) with wilted watercress and a goji berry in clear broth"} },
  'winter-melon-soup': { src: require('../../assets/dishes/winter-melon-soup.jpg'), ...{"page": "https://www.pexels.com/photo/delicious-asian-winter-melon-and-shrimp-soup-37332344/", "by": "Gu Ko", "site": "Pexels", "license": "Pexels License", "shows": "Bowl of clear broth with translucent winter melon chunks and shrimp, garnished with coriander, on a wooden table"} },
  'spinach-egg-soup': null,
  'sup-sayur': null,
  'rasam': { src: require('../../assets/dishes/rasam.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:Rasam.JPG", "by": "Miansari66", "site": "Wikimedia Commons", "license": "Public domain", "shows": "Bowl of thin reddish-brown South Indian rasam with coriander, curry leaf and chilli, papadums beside (labelled rasam, not specifically tomato rasam)"} },
  'fish-tofu-soup': { src: require('../../assets/dishes/fish-tofu-soup.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:Sliced_fish_soup,_Pek_Kio_Market_%26_Food_Centre_(25065937730).jpg", "by": "Kars Alfrink", "site": "Wikimedia Commons", "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/", "shows": "Singapore hawker sliced fish soup with fish slices, tomato, lettuce, seaweed and coriander (no tofu visible)"} },
  'sup-ayam': { src: require('../../assets/dishes/sup-ayam.jpg'), ...{"page": "https://www.pexels.com/photo/delicious-homemade-chicken-vegetable-soup-37057656/", "by": "Tiya Nh", "site": "Pexels", "license": "Pexels License", "shows": "Bowl of clear chicken broth with chicken drumstick pieces, carrot slices, black fungus, meatballs, fried shallots and celery leaf"} },
  // Korean, Thai and sick-day dishes
  'japchae': { src: require('../../assets/dishes/japchae.jpg'), ...{"page": "https://unsplash.com/photos/bowl-of-cooked-food-H6iSwrAOMG0", "by": "Ryan Kwok", "site": "Unsplash", "license": "Unsplash License", "shows": "Glass noodles stir-fried with onion, carrot, peppers, spring onion, shiitake mushrooms and sesame seeds on a black plate"} },
  'dakjjim': { src: require('../../assets/dishes/dakjjim.jpg'), ...{"page": "https://commons.wikimedia.org/wiki/File:Korean.food-Andong-Jjimdakk.jpg", "by": "ebifry", "site": "Wikimedia Commons", "license": "CC BY 2.0", "licenseUrl": "https://creativecommons.org/licenses/by/2.0/", "shows": "Large platter of Andong jjimdak in Andong: soy-braised chicken with glass noodles, potato, carrot, cabbage, chilli and spring onion"} },
  'gyeran-mari': { src: require('../../assets/dishes/gyeran-mari.jpg'), ...{"page": "https://www.pexels.com/photo/rolled-omelet-on-ceramic-plate-8979761/", "by": "makafood", "site": "Pexels", "license": "Pexels License", "shows": "Thick slices of layered rolled egg omelette with flecks of spring onion in a square white dish at a restaurant table"} },
  'kimchi-tofu-soup': { src: require('../../assets/dishes/kimchi-tofu-soup.jpg'), ...{"page": "https://unsplash.com/photos/close-up-of-spicy-korean-stew-with-tofu-and-scallions-1_SenAyTAXg", "by": "rawkkim", "site": "Unsplash", "license": "Unsplash License", "shows": "Close-up of bubbling red Korean stew with tofu slices, kimchi, scallions and chilli powder"} },
  'pad-krapow': { src: require('../../assets/dishes/pad-krapow.jpg'), ...{"page": "https://unsplash.com/photos/a-white-plate-topped-with-rice-and-fried-eggs-j-SsLyBAkZ8", "by": "Inna Safa", "site": "Unsplash", "license": "Unsplash License", "shows": "Rice topped with stir-fried minced chicken with basil leaves and red chilli, a fried egg and a lime wedge"} },
  'tom-yum-soup': { src: require('../../assets/dishes/tom-yum-soup.jpg'), ...{"page": "https://www.pexels.com/photo/delicious-tom-yum-goong-soup-on-rustic-table-34699478/", "by": "UNDO KIM", "site": "Pexels", "license": "Pexels License", "shows": "Overhead view of an orange-red tom yum goong with prawns, mushrooms and cilantro in a blue-patterned bowl on rustic wood"} },
  'chicken-porridge': { src: require('../../assets/dishes/chicken-porridge.jpg'), ...{"page": "https://www.pexels.com/photo/delicious-asian-congee-breakfast-with-tea-set-36340265/", "by": "ivi nnnnnn", "site": "Pexels", "license": "Pexels License", "shows": "White bowl of smooth white congee with pieces of chicken and spring onion, porcelain spoon, Chinese tea set behind"} },
  'fish-porridge': null,
  'egg-porridge': null,
};

export const photoFor = (id: string): Photo | null => PHOTOS[id] ?? null;
