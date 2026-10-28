/**
 * Remplit une base vide avec la boutique de démonstration Sable (magasin
 * généraliste : high-tech, maison, beauté, sport, mode, cuisine) :
 * compte admin, catégories, attributs, produits et variants, page d'accueil,
 * header, footer, avis et commandes d'exemple.
 *
 *   npx tsx src/scripts/seedDemo.ts           # refuse si la base contient déjà des produits
 *   npx tsx src/scripts/seedDemo.ts --reset   # vide les collections de la démo puis reseed
 *
 * Le compte admin est lu dans SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD (.env).
 */
import 'dotenv/config'

import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { getPayload, type Payload } from 'payload'
import config from '@payload-config'

import { brand } from '@/brand.config'
import { avatarImage, heroImage, productImage, sceneImage, type Shape } from './demoImages'

const RESET = process.argv.includes('--reset')

/**
 * Photos réelles (Unsplash, voir demo-photos/CREDITS.md). Quand un fichier
 * manque, on retombe sur l'illustration générée.
 */
const PHOTOS_DIR = path.resolve(process.cwd(), 'src/scripts/demo-photos')
const photo = (name: string, fallback: () => Promise<Buffer>) => {
  const file = path.join(PHOTOS_DIR, `${name}.jpg`)
  return fs.existsSync(file) ? fs.promises.readFile(file) : fallback()
}

/** Une seule couleur par produit : celle de sa photo. */
const PHOTO_COLOR: Record<string, string> = {
  'ecouteurs-sans-fil': 'noir',
  'montre-connectee': 'blanc',
  'enceinte-bluetooth': 'blanc',
  'casque-audio-confort': 'rose',
  'lampe-de-bureau': 'miel',
  'vase-ceramique': 'creme',
  'bougie-parfumee': 'miel',
  'coussin-gaze-coton': 'blanc',
  'serum-eclat': 'miel',
  'creme-hydratante': 'blanc',
  'eau-de-parfum-jasmin': 'rose',
  'tapis-de-yoga': 'sauge',
  'gourde-isotherme': 'blanc',
  'halteres-neoprene': 'noir',
  'sweat-a-capuche': 'blanc',
  'sac-a-dos-urbain': 'noir',
  'lunettes-de-soleil': 'noir',
  'montre-classique': 'miel',
  'baskets-cuir': 'blanc',
  'set-de-mugs': 'creme',
  'theiere-ceramique': 'blanc',
  'bloc-couteaux': 'noir',
}
const ctx = { disableRevalidate: true, skipMerchantSync: true }

type L = { fr: string; en: string; ar: string }
type Locale = keyof L

/* ------------------------------------------------------------------ */
/* Données                                                             */
/* ------------------------------------------------------------------ */

const COLORS = {
  sable: { hex: '#e8a99a', label: { fr: 'Corail', en: 'Coral', ar: 'مرجاني' } },
  creme: { hex: '#f3f1ec', label: { fr: 'Ivoire', en: 'Ivory', ar: 'عاجي' } },
  sauge: { hex: '#7fa491', label: { fr: 'Sauge', en: 'Sage', ar: 'أخضر مريمية' } },
  taupe: { hex: '#f0a07c', label: { fr: 'Abricot', en: 'Apricot', ar: 'مشمشي' } },
  rose: { hex: '#e3b7aa', label: { fr: 'Rose poudré', en: 'Powder pink', ar: 'وردي فاتح' } },
  noir: { hex: '#2f2c2a', label: { fr: 'Noir mat', en: 'Matte black', ar: 'أسود مطفي' } },
  blanc: { hex: '#f7f5f1', label: { fr: 'Blanc', en: 'White', ar: 'أبيض' } },
  brume: { hex: '#9fb3c2', label: { fr: 'Bleu brume', en: 'Mist blue', ar: 'أزرق ضبابي' } },
  miel: { hex: '#e0b25c', label: { fr: 'Miel', en: 'Honey', ar: 'عسلي' } },
  terracotta: { hex: '#c47d5e', label: { fr: 'Terracotta', en: 'Terracotta', ar: 'طوبي' } },
} as const
type ColorKey = keyof typeof COLORS

const SIZES = ['S', 'M', 'L', 'XL']
const SHOE_SIZES = ['38', '39', '40', '41', '42', '43', '44']
const VOLUMES = ['30 ml', '50 ml', '100 ml']
/** Prix relatif de chaque contenance (le prix produit correspond à la plus petite). */
const VOLUME_FACTOR: Record<string, number> = { '30 ml': 1, '50 ml': 1.3, '100 ml': 1.8 }

/** Fond pastel des visuels produits, selon le rayon. */
const DEPARTMENT_BG: Record<string, string> = {
  'high-tech': '#e6eef3',
  'maison-deco': '#e8f0ea',
  beaute: '#f9e9e3',
  sport: '#e4efec',
  mode: '#efeef6',
  cuisine: '#eef2e3',
}

const CATEGORIES: {
  slug: string
  kind: 'age' | 'collection'
  order: number
  title: L
  description: L
  bg: string
  scene: [Shape, ColorKey][]
}[] = [
  {
    slug: 'high-tech',
    kind: 'age',
    order: 1,
    title: { fr: 'High-tech', en: 'High-tech', ar: 'تكنولوجيا' },
    description: {
      fr: 'Écouteurs, casques, enceintes et montres connectées.',
      en: 'Earbuds, headphones, speakers and smartwatches.',
      ar: 'سماعات، مكبرات صوت وساعات ذكية.',
    },
    bg: DEPARTMENT_BG['high-tech'],
    scene: [['headphones', 'sable']],
  },
  {
    slug: 'maison-deco',
    kind: 'age',
    order: 2,
    title: { fr: 'Maison & Déco', en: 'Home & Decor', ar: 'المنزل والديكور' },
    description: {
      fr: 'Luminaires, vases, bougies et textiles doux.',
      en: 'Lighting, vases, candles and soft textiles.',
      ar: 'إنارة، مزهريات، شموع ومنسوجات ناعمة.',
    },
    bg: DEPARTMENT_BG['maison-deco'],
    scene: [['vase', 'rose']],
  },
  {
    slug: 'beaute',
    kind: 'age',
    order: 3,
    title: { fr: 'Beauté', en: 'Beauty', ar: 'الجمال' },
    description: {
      fr: 'Soins du visage, sérums et parfums.',
      en: 'Skincare, serums and fragrances.',
      ar: 'العناية بالبشرة، أمصال وعطور.',
    },
    bg: DEPARTMENT_BG.beaute,
    scene: [['perfume', 'rose']],
  },
  {
    slug: 'sport',
    kind: 'age',
    order: 4,
    title: { fr: 'Sport & Loisirs', en: 'Sport & Leisure', ar: 'الرياضة والترفيه' },
    description: {
      fr: 'Yoga, fitness et accessoires pour bouger.',
      en: 'Yoga, fitness and gear to keep moving.',
      ar: 'يوغا، لياقة بدنية ومستلزمات للحركة.',
    },
    bg: DEPARTMENT_BG.sport,
    scene: [['yogamat', 'sauge']],
  },
  {
    slug: 'mode',
    kind: 'age',
    order: 5,
    title: { fr: 'Mode & Accessoires', en: 'Fashion & Accessories', ar: 'الموضة والإكسسوارات' },
    description: {
      fr: 'Sacs, montres, lunettes et baskets.',
      en: 'Bags, watches, sunglasses and sneakers.',
      ar: 'حقائب، ساعات، نظارات وأحذية رياضية.',
    },
    bg: DEPARTMENT_BG.mode,
    scene: [['backpack', 'taupe']],
  },
  {
    slug: 'cuisine',
    kind: 'age',
    order: 6,
    title: { fr: 'Cuisine', en: 'Kitchen', ar: 'المطبخ' },
    description: {
      fr: 'Mugs, théières et ustensiles du quotidien.',
      en: 'Mugs, teapots and everyday utensils.',
      ar: 'أكواب، أباريق شاي وأدوات يومية.',
    },
    bg: DEPARTMENT_BG.cuisine,
    scene: [['teapot', 'terracotta']],
  },
  {
    slug: 'idees-cadeaux',
    kind: 'collection',
    order: 7,
    title: { fr: 'Idées cadeaux', en: 'Gift ideas', ar: 'أفكار هدايا' },
    description: {
      fr: 'Des attentions qui font plaisir, pour toutes les occasions.',
      en: 'Thoughtful gifts for every occasion.',
      ar: 'هدايا تسعد أحبّاءك في كل المناسبات.',
    },
    bg: '#f9e9e3',
    scene: [['perfume', 'rose'], ['watch', 'taupe']],
  },
  {
    slug: 'bien-etre',
    kind: 'collection',
    order: 8,
    title: { fr: 'Bien-être', en: 'Wellbeing', ar: 'العافية' },
    description: {
      fr: 'Soins, yoga et thé : prendre du temps pour soi.',
      en: 'Skincare, yoga and tea: time for yourself.',
      ar: 'عناية، يوغا وشاي: وقت خاص لنفسك.',
    },
    bg: '#e4efec',
    scene: [['candle', 'creme'], ['serum', 'miel']],
  },
]

type OptionKind = 'size' | 'shoe' | 'volume'

type ProductSeed = {
  slug: string
  shape: Shape
  title: L
  subtitle: L
  description: L
  price: number
  oldPrice?: number
  colors: ColorKey[]
  options: { kind: OptionKind; values: string[] } | null
  categories: string[]
  tags: ('new' | 'best' | 'promo')[]
  specs: [L, L][]
}

const spec = (fr: string, en: string, ar: string): L => ({ fr, en, ar })
const WARRANTY = spec('Garantie', 'Warranty', 'الضمان')
const MATERIAL = spec('Matière', 'Material', 'المادة')
const DIMENSIONS = spec('Dimensions', 'Dimensions', 'الأبعاد')
const BATTERY = spec('Autonomie', 'Battery life', 'عمر البطارية')
const SKIN = spec('Type de peau', 'Skin type', 'نوع البشرة')
const CAPACITY = spec('Contenance', 'Capacity', 'السعة')
const WEIGHT = spec('Poids', 'Weight', 'الوزن')
const CARE = spec('Entretien', 'Care', 'العناية')
const ONE_YEAR = spec('1 an', '1 year', 'سنة واحدة')
const TWO_YEARS = spec('2 ans', '2 years', 'سنتان')

const PRODUCTS: ProductSeed[] = [
  /* ---- High-tech ---- */
  {
    slug: 'ecouteurs-sans-fil',
    shape: 'earbuds',
    title: { fr: 'Écouteurs sans fil Pulse', en: 'Pulse wireless earbuds', ar: 'سماعات لاسلكية Pulse' },
    subtitle: { fr: 'Réduction de bruit active', en: 'Active noise cancelling', ar: 'عزل نشط للضوضاء' },
    description: {
      fr: 'Des écouteurs légers avec réduction de bruit active, mode transparence et boîtier de charge compact. Un son ample et un maintien confortable toute la journée.',
      en: 'Lightweight earbuds with active noise cancelling, transparency mode and a compact charging case. Rich sound and an all-day comfortable fit.',
      ar: 'سماعات خفيفة مع عزل نشط للضوضاء ووضع الشفافية وعلبة شحن صغيرة. صوت غني وراحة طوال اليوم.',
    },
    price: 189,
    colors: ['blanc', 'noir', 'sable'],
    options: null,
    categories: ['high-tech', 'idees-cadeaux'],
    tags: ['new', 'best'],
    specs: [[BATTERY, spec('30 h avec le boîtier', '30 h with case', '30 ساعة مع العلبة')], [spec('Connexion', 'Connectivity', 'الاتصال'), spec('Bluetooth 5.3', 'Bluetooth 5.3', 'بلوتوث 5.3')], [WARRANTY, ONE_YEAR]],
  },
  {
    slug: 'montre-connectee',
    shape: 'smartwatch',
    title: { fr: 'Montre connectée Active', en: 'Active smartwatch', ar: 'ساعة ذكية Active' },
    subtitle: { fr: 'Santé, sport et notifications', en: 'Health, sport and notifications', ar: 'الصحة والرياضة والإشعارات' },
    description: {
      fr: 'Suivi du sommeil, du rythme cardiaque et de plus de 100 sports, notifications du téléphone et écran AMOLED lumineux. Étanche pour la piscine.',
      en: 'Sleep, heart-rate and 100+ sports tracking, phone notifications and a bright AMOLED screen. Water-resistant for swimming.',
      ar: 'تتبع النوم ونبض القلب وأكثر من 100 رياضة، إشعارات الهاتف وشاشة AMOLED ساطعة. مقاومة للماء للسباحة.',
    },
    price: 349,
    oldPrice: 399,
    colors: ['taupe', 'noir', 'rose'],
    options: null,
    categories: ['high-tech', 'bien-etre'],
    tags: ['promo'],
    specs: [[BATTERY, spec('Jusqu’à 10 jours', 'Up to 10 days', 'حتى 10 أيام')], [spec('Étanchéité', 'Water resistance', 'مقاومة الماء'), spec('5 ATM', '5 ATM', '5 ATM')], [WARRANTY, TWO_YEARS]],
  },
  {
    slug: 'enceinte-bluetooth',
    shape: 'speaker',
    title: { fr: 'Enceinte Bluetooth Nomade', en: 'Nomade Bluetooth speaker', ar: 'مكبر صوت بلوتوث Nomade' },
    subtitle: { fr: 'Son 360°, résistante à l’eau', en: '360° sound, water-resistant', ar: 'صوت 360°، مقاوم للماء' },
    description: {
      fr: 'Une enceinte compacte au son 360° et aux basses profondes, résistante aux éclaboussures. Elle vous suit du salon à la plage.',
      en: 'A compact speaker with 360° sound and deep bass, splash-resistant. It follows you from the living room to the beach.',
      ar: 'مكبر صوت صغير بصوت 360° وجهير عميق، مقاوم للرذاذ. يرافقك من الصالون إلى الشاطئ.',
    },
    price: 129,
    colors: ['sauge', 'sable', 'noir'],
    options: null,
    categories: ['high-tech'],
    tags: ['best'],
    specs: [[BATTERY, spec('12 heures', '12 hours', '12 ساعة')], [spec('Étanchéité', 'Water resistance', 'مقاومة الماء'), spec('IPX6', 'IPX6', 'IPX6')], [WARRANTY, ONE_YEAR]],
  },
  {
    slug: 'casque-audio-confort',
    shape: 'headphones',
    title: { fr: 'Casque audio Confort', en: 'Comfort headphones', ar: 'سماعة رأس Comfort' },
    subtitle: { fr: 'Arceau rembourré, pliable', en: 'Padded headband, foldable', ar: 'طوق مبطن وقابل للطي' },
    description: {
      fr: 'Un casque sans fil aux coussinets à mémoire de forme, pensé pour les longues sessions de travail ou de musique. Micro intégré pour les appels.',
      en: 'Wireless headphones with memory-foam ear cushions, designed for long work or music sessions. Built-in mic for calls.',
      ar: 'سماعة لاسلكية بوسائد من الإسفنج الذكي، مصممة لجلسات العمل أو الموسيقى الطويلة. ميكروفون مدمج للمكالمات.',
    },
    price: 259,
    colors: ['sable', 'noir', 'brume'],
    options: null,
    categories: ['high-tech'],
    tags: ['new'],
    specs: [[BATTERY, spec('40 heures', '40 hours', '40 ساعة')], [spec('Connexion', 'Connectivity', 'الاتصال'), spec('Bluetooth et jack 3,5 mm', 'Bluetooth and 3.5 mm jack', 'بلوتوث ومنفذ 3.5 مم')], [WARRANTY, ONE_YEAR]],
  },

  /* ---- Maison & Déco ---- */
  {
    slug: 'lampe-de-bureau',
    shape: 'lamp',
    title: { fr: 'Lampe de bureau articulée', en: 'Adjustable desk lamp', ar: 'مصباح مكتب قابل للتعديل' },
    subtitle: { fr: 'Métal laqué, lumière chaude', en: 'Lacquered metal, warm light', ar: 'معدن مطلي، ضوء دافئ' },
    description: {
      fr: 'Une lampe articulée en métal laqué, au bras orientable et à la lumière chaude. Parfaite sur un bureau, une console ou une table de chevet.',
      en: 'An adjustable lamp in lacquered metal with a pivoting arm and warm light. Perfect on a desk, console or bedside table.',
      ar: 'مصباح من المعدن المطلي بذراع قابلة للتوجيه وضوء دافئ. مثالي على المكتب أو الطاولة الجانبية.',
    },
    price: 89,
    oldPrice: 109,
    colors: ['miel', 'blanc', 'sauge'],
    options: null,
    categories: ['maison-deco'],
    tags: ['new', 'promo'],
    specs: [[MATERIAL, spec('Métal laqué', 'Lacquered metal', 'معدن مطلي')], [spec('Ampoule', 'Bulb', 'المصباح'), spec('LED E14 incluse', 'E14 LED included', 'LED E14 مرفق')], [DIMENSIONS, spec('Hauteur 45 cm', 'Height 45 cm', 'الارتفاع 45 سم')]],
  },
  {
    slug: 'vase-ceramique',
    shape: 'vase',
    title: { fr: 'Vase en céramique Dune', en: 'Dune ceramic vase', ar: 'مزهرية سيراميك Dune' },
    subtitle: { fr: 'Fait main, finition mate', en: 'Handmade, matte finish', ar: 'مصنوعة يدويًا، لمسة مطفية' },
    description: {
      fr: 'Un vase aux formes douces en céramique émaillée mate, façonné à la main à Nabeul. Superbe avec quelques branches d’eucalyptus ou seul sur une étagère.',
      en: 'A softly rounded vase in matte glazed ceramic, handmade in Nabeul. Beautiful with a few eucalyptus stems or on its own on a shelf.',
      ar: 'مزهرية بأشكال ناعمة من السيراميك المطلي المطفي، مصنوعة يدويًا في نابل. رائعة مع أغصان الأوكالبتوس أو وحدها على رف.',
    },
    price: 59,
    colors: ['rose', 'creme', 'terracotta'],
    options: null,
    categories: ['maison-deco', 'idees-cadeaux'],
    tags: ['best'],
    specs: [[MATERIAL, spec('Céramique émaillée', 'Glazed ceramic', 'سيراميك مطلي')], [DIMENSIONS, spec('Hauteur 24 cm', 'Height 24 cm', 'الارتفاع 24 سم')], [spec('Fabrication', 'Made in', 'الصنع'), spec('Tunisie', 'Tunisia', 'تونس')]],
  },
  {
    slug: 'bougie-parfumee',
    shape: 'candle',
    title: { fr: 'Bougie parfumée Fleur d’oranger', en: 'Orange blossom scented candle', ar: 'شمعة معطرة بزهر البرتقال' },
    subtitle: { fr: 'Cire végétale, 40 h', en: 'Plant wax, 40 h', ar: 'شمع نباتي، 40 ساعة' },
    description: {
      fr: 'Une bougie en cire de soja coulée dans un verre réutilisable, aux notes de fleur d’oranger et de néroli. Une combustion lente et propre.',
      en: 'A soy-wax candle poured into a reusable glass, with notes of orange blossom and neroli. Slow, clean burn.',
      ar: 'شمعة من شمع الصويا في كأس قابل لإعادة الاستعمال، بنفحات زهر البرتقال والنيرولي. احتراق بطيء ونظيف.',
    },
    price: 35,
    colors: ['creme', 'rose', 'sauge'],
    options: null,
    categories: ['maison-deco', 'idees-cadeaux', 'bien-etre'],
    tags: ['best'],
    specs: [[MATERIAL, spec('Cire de soja', 'Soy wax', 'شمع الصويا')], [spec('Durée', 'Burn time', 'مدة الاشتعال'), spec('Environ 40 h', 'About 40 h', 'حوالي 40 ساعة')], [WEIGHT, spec('200 g', '200 g', '200 غ')]],
  },
  {
    slug: 'coussin-gaze-coton',
    shape: 'cushion',
    title: { fr: 'Coussin en gaze de coton', en: 'Cotton gauze cushion', ar: 'وسادة من شاش القطن' },
    subtitle: { fr: 'Doux et froissé', en: 'Soft and crinkled', ar: 'ناعمة ومجعدة' },
    description: {
      fr: 'Un coussin moelleux en double gaze de coton, au toucher froissé naturel. Housse amovible avec garnissage inclus.',
      en: 'A plump cushion in double cotton gauze with a naturally crinkled feel. Removable cover, filling included.',
      ar: 'وسادة طرية من شاش القطن المزدوج بملمس مجعد طبيعي. غطاء قابل للنزع مع الحشوة.',
    },
    price: 45,
    oldPrice: 59,
    colors: ['sauge', 'sable', 'rose'],
    options: null,
    categories: ['maison-deco'],
    tags: ['promo'],
    specs: [[MATERIAL, spec('100% coton', '100% cotton', '100% قطن')], [DIMENSIONS, spec('45 × 45 cm', '45 × 45 cm', '45 × 45 سم')], [CARE, spec('Housse lavable à 30°', 'Cover machine wash 30°', 'غطاء قابل للغسل على 30°')]],
  },

  /* ---- Beauté ---- */
  {
    slug: 'serum-eclat',
    shape: 'serum',
    title: { fr: 'Sérum éclat à la vitamine C', en: 'Vitamin C glow serum', ar: 'سيروم الإشراق بفيتامين C' },
    subtitle: { fr: 'Teint lumineux et unifié', en: 'Radiant, even complexion', ar: 'بشرة مشرقة وموحدة' },
    description: {
      fr: 'Un sérum léger à la vitamine C et à l’acide hyaluronique qui ravive l’éclat du teint et hydrate en profondeur. Quelques gouttes matin et soir.',
      en: 'A lightweight serum with vitamin C and hyaluronic acid that revives radiance and deeply hydrates. A few drops morning and evening.',
      ar: 'سيروم خفيف بفيتامين C وحمض الهيالورونيك يعيد إشراق البشرة ويرطبها بعمق. بضع قطرات صباحًا ومساءً.',
    },
    price: 79,
    colors: ['miel'],
    options: { kind: 'volume', values: ['30 ml', '50 ml'] },
    categories: ['beaute', 'bien-etre'],
    tags: ['new'],
    specs: [[SKIN, spec('Tous types de peau', 'All skin types', 'جميع أنواع البشرة')], [spec('Actifs', 'Key ingredients', 'المكونات النشطة'), spec('Vitamine C, acide hyaluronique', 'Vitamin C, hyaluronic acid', 'فيتامين C، حمض الهيالورونيك')], [spec('Utilisation', 'Use', 'الاستعمال'), spec('Matin et soir', 'Morning and evening', 'صباحًا ومساءً')]],
  },
  {
    slug: 'creme-hydratante',
    shape: 'cream',
    title: { fr: 'Crème hydratante à l’huile d’argan', en: 'Argan oil moisturising cream', ar: 'كريم مرطب بزيت الأرغان' },
    subtitle: { fr: 'Nourrit sans graisser', en: 'Nourishes without greasiness', ar: 'يغذي دون أن يترك أثرًا دهنيًا' },
    description: {
      fr: 'Une crème onctueuse à l’huile d’argan et au beurre de karité, qui nourrit et apaise la peau tout au long de la journée. Texture fondante, fini non gras.',
      en: 'A rich cream with argan oil and shea butter that nourishes and soothes skin all day long. Melting texture, non-greasy finish.',
      ar: 'كريم غني بزيت الأرغان وزبدة الشيا يغذي البشرة ويهدئها طوال اليوم. قوام ذائب ولمسة غير دهنية.',
    },
    price: 65,
    colors: ['rose', 'blanc'],
    options: { kind: 'volume', values: ['50 ml', '100 ml'] },
    categories: ['beaute', 'bien-etre'],
    tags: ['best'],
    specs: [[SKIN, spec('Peaux sèches à normales', 'Dry to normal skin', 'البشرة الجافة إلى العادية')], [spec('Actifs', 'Key ingredients', 'المكونات النشطة'), spec('Argan, karité', 'Argan, shea', 'الأرغان، الشيا')], [spec('Fabrication', 'Made in', 'الصنع'), spec('Tunisie', 'Tunisia', 'تونس')]],
  },
  {
    slug: 'eau-de-parfum-jasmin',
    shape: 'perfume',
    title: { fr: 'Eau de parfum Jasmin & Ambre', en: 'Jasmine & Amber eau de parfum', ar: 'عطر الياسمين والعنبر' },
    subtitle: { fr: 'Floral, chaud, enveloppant', en: 'Floral, warm, enveloping', ar: 'زهري، دافئ وآسر' },
    description: {
      fr: 'Un parfum lumineux qui s’ouvre sur le jasmin de Tunisie avant de révéler un fond chaud d’ambre et de vanille. Une signature élégante, de jour comme de nuit.',
      en: 'A luminous fragrance opening on Tunisian jasmine before revealing a warm base of amber and vanilla. An elegant signature, day or night.',
      ar: 'عطر مشرق يفتتح بالياسمين التونسي ثم يكشف عن قاعدة دافئة من العنبر والفانيليا. توقيع أنيق ليلًا ونهارًا.',
    },
    price: 149,
    oldPrice: 179,
    colors: ['rose', 'sable'],
    options: { kind: 'volume', values: VOLUMES },
    categories: ['beaute', 'idees-cadeaux'],
    tags: ['promo'],
    specs: [[spec('Famille', 'Family', 'العائلة'), spec('Floral ambré', 'Floral amber', 'زهري عنبري')], [spec('Notes', 'Notes', 'النفحات'), spec('Jasmin, ambre, vanille', 'Jasmine, amber, vanilla', 'ياسمين، عنبر، فانيليا')], [spec('Concentration', 'Concentration', 'التركيز'), spec('Eau de parfum', 'Eau de parfum', 'ماء العطر')]],
  },

  /* ---- Sport & Loisirs ---- */
  {
    slug: 'tapis-de-yoga',
    shape: 'yogamat',
    title: { fr: 'Tapis de yoga antidérapant', en: 'Non-slip yoga mat', ar: 'سجادة يوغا مانعة للانزلاق' },
    subtitle: { fr: '6 mm, sangle de transport', en: '6 mm, carrying strap', ar: '6 مم مع حزام حمل' },
    description: {
      fr: 'Un tapis épais et antidérapant pour le yoga, le pilates et les étirements. Livré avec une sangle pour l’emporter partout.',
      en: 'A thick, non-slip mat for yoga, pilates and stretching. Comes with a strap to take it anywhere.',
      ar: 'سجادة سميكة ومانعة للانزلاق لليوغا والبيلاتس والتمدد. تأتي مع حزام لحملها في كل مكان.',
    },
    price: 99,
    colors: ['sauge', 'rose', 'brume'],
    options: null,
    categories: ['sport', 'bien-etre'],
    tags: ['new'],
    specs: [[MATERIAL, spec('TPE sans latex', 'Latex-free TPE', 'TPE خالٍ من اللاتكس')], [DIMENSIONS, spec('183 × 61 cm, 6 mm', '183 × 61 cm, 6 mm', '183 × 61 سم، 6 مم')], [WEIGHT, spec('900 g', '900 g', '900 غ')]],
  },
  {
    slug: 'gourde-isotherme',
    shape: 'bottle',
    title: { fr: 'Gourde isotherme 750 ml', en: 'Insulated bottle 750 ml', ar: 'قارورة حافظة للحرارة 750 مل' },
    subtitle: { fr: 'Froid 24 h, chaud 12 h', en: 'Cold 24 h, hot 12 h', ar: 'بارد 24 ساعة، ساخن 12 ساعة' },
    description: {
      fr: 'Une gourde en acier inoxydable à double paroi, qui garde vos boissons fraîches toute la journée. Bouchon étanche avec anse.',
      en: 'A double-walled stainless steel bottle that keeps drinks cold all day. Leak-proof cap with handle.',
      ar: 'قارورة من الفولاذ المقاوم للصدأ بجدار مزدوج تحافظ على برودة المشروبات طوال اليوم. غطاء محكم بمقبض.',
    },
    price: 49,
    colors: ['brume', 'sauge', 'noir', 'blanc'],
    options: null,
    categories: ['sport'],
    tags: ['best'],
    specs: [[MATERIAL, spec('Acier inoxydable', 'Stainless steel', 'فولاذ مقاوم للصدأ')], [CAPACITY, spec('750 ml', '750 ml', '750 مل')], [spec('Sans BPA', 'BPA-free', 'خالٍ من BPA'), spec('Oui', 'Yes', 'نعم')]],
  },
  {
    slug: 'halteres-neoprene',
    shape: 'dumbbell',
    title: { fr: 'Paire d’haltères 3 kg', en: 'Pair of 3 kg dumbbells', ar: 'زوج دمبل 3 كغ' },
    subtitle: { fr: 'Revêtement néoprène', en: 'Neoprene coating', ar: 'طلاء نيوبرين' },
    description: {
      fr: 'Deux haltères au revêtement néoprène antidérapant, idéales pour le renforcement musculaire à la maison. Leur forme évite qu’elles roulent.',
      en: 'Two dumbbells with a non-slip neoprene coating, ideal for strength training at home. Their shape stops them from rolling.',
      ar: 'دمبلان بطلاء نيوبرين مانع للانزلاق، مثاليان لتقوية العضلات في المنزل. شكلهما يمنعهما من التدحرج.',
    },
    price: 119,
    oldPrice: 139,
    colors: ['noir', 'sauge', 'rose'],
    options: null,
    categories: ['sport'],
    tags: ['promo'],
    specs: [[WEIGHT, spec('2 × 3 kg', '2 × 3 kg', '2 × 3 كغ')], [MATERIAL, spec('Fonte, néoprène', 'Cast iron, neoprene', 'حديد صب، نيوبرين')], [WARRANTY, TWO_YEARS]],
  },
  {
    slug: 'sweat-a-capuche',
    shape: 'hoodie',
    title: { fr: 'Sweat à capuche Studio', en: 'Studio hoodie', ar: 'سويت شيرت بقلنسوة Studio' },
    subtitle: { fr: 'Molleton coton bio', en: 'Organic cotton fleece', ar: 'قطن عضوي مبطن' },
    description: {
      fr: 'Un sweat à capuche en molleton de coton bio, doux à l’intérieur, avec poche kangourou. Pour l’échauffement, le week-end ou le canapé.',
      en: 'An organic cotton fleece hoodie, soft on the inside, with a kangaroo pocket. For warm-ups, weekends or the sofa.',
      ar: 'سويت شيرت بقلنسوة من القطن العضوي المبطن، ناعم من الداخل مع جيب أمامي. للإحماء أو عطلة نهاية الأسبوع أو الاسترخاء.',
    },
    price: 119,
    colors: ['sable', 'sauge', 'noir'],
    options: { kind: 'size', values: SIZES },
    categories: ['sport', 'mode'],
    tags: ['new'],
    specs: [[MATERIAL, spec('100% coton bio', '100% organic cotton', '100% قطن عضوي')], [CARE, spec('Lavage à 30°', 'Machine wash 30°', 'غسيل على 30°')], [spec('Coupe', 'Fit', 'القصة'), spec('Droite, unisexe', 'Regular, unisex', 'مستقيمة، للجنسين')]],
  },

  /* ---- Mode & Accessoires ---- */
  {
    slug: 'sac-a-dos-urbain',
    shape: 'backpack',
    title: { fr: 'Sac à dos urbain', en: 'Urban backpack', ar: 'حقيبة ظهر حضرية' },
    subtitle: { fr: 'Poche ordinateur 15"', en: '15" laptop sleeve', ar: 'جيب لحاسوب 15 بوصة' },
    description: {
      fr: 'Un sac à dos déperlant au design épuré, avec poche rembourrée pour ordinateur 15 pouces et rangements malins. Pour le bureau, la fac ou le voyage.',
      en: 'A water-repellent backpack with a clean design, padded 15-inch laptop sleeve and smart storage. For work, campus or travel.',
      ar: 'حقيبة ظهر مقاومة للماء بتصميم أنيق، مع جيب مبطن لحاسوب 15 بوصة وتقسيمات عملية. للعمل أو الجامعة أو السفر.',
    },
    price: 139,
    colors: ['taupe', 'sable', 'noir'],
    options: null,
    categories: ['mode'],
    tags: ['new'],
    specs: [[MATERIAL, spec('Polyester recyclé déperlant', 'Water-repellent recycled polyester', 'بوليستر معاد تدويره مقاوم للماء')], [CAPACITY, spec('20 litres', '20 litres', '20 لترًا')], [DIMENSIONS, spec('44 × 30 × 14 cm', '44 × 30 × 14 cm', '44 × 30 × 14 سم')]],
  },
  {
    slug: 'lunettes-de-soleil',
    shape: 'sunglasses',
    title: { fr: 'Lunettes de soleil Riviera', en: 'Riviera sunglasses', ar: 'نظارات شمسية Riviera' },
    subtitle: { fr: 'Verres polarisés UV400', en: 'Polarised UV400 lenses', ar: 'عدسات مستقطبة UV400' },
    description: {
      fr: 'Des lunettes à la monture en acétate et aux verres polarisés qui protègent à 100% des UV. Livrées avec un étui rigide.',
      en: 'Sunglasses with an acetate frame and polarised lenses offering 100% UV protection. Comes with a hard case.',
      ar: 'نظارات بإطار من الأسيتات وعدسات مستقطبة توفر حماية كاملة من الأشعة فوق البنفسجية. تأتي مع علبة صلبة.',
    },
    price: 89,
    oldPrice: 109,
    colors: ['noir', 'taupe', 'sable'],
    options: null,
    categories: ['mode', 'idees-cadeaux'],
    tags: ['promo'],
    specs: [[spec('Monture', 'Frame', 'الإطار'), spec('Acétate', 'Acetate', 'أسيتات')], [spec('Verres', 'Lenses', 'العدسات'), spec('Polarisés, UV400', 'Polarised, UV400', 'مستقطبة، UV400')], [spec('Accessoire', 'Included', 'مرفق'), spec('Étui rigide', 'Hard case', 'علبة صلبة')]],
  },
  {
    slug: 'montre-classique',
    shape: 'watch',
    title: { fr: 'Montre classique cuir', en: 'Classic leather watch', ar: 'ساعة كلاسيكية بحزام جلدي' },
    subtitle: { fr: 'Cadran minimaliste 38 mm', en: 'Minimalist 38 mm dial', ar: 'ميناء بسيط 38 مم' },
    description: {
      fr: 'Une montre à quartz au cadran épuré et au boîtier doré, sur un bracelet en cuir véritable. Intemporelle, elle se porte au quotidien comme en soirée.',
      en: 'A quartz watch with a clean dial and gold-tone case on a genuine leather strap. Timeless, for every day and evenings out.',
      ar: 'ساعة كوارتز بميناء بسيط وهيكل ذهبي على حزام من الجلد الطبيعي. خالدة، تناسب الاستعمال اليومي والسهرات.',
    },
    price: 229,
    colors: ['taupe', 'noir', 'sable'],
    options: null,
    categories: ['mode', 'idees-cadeaux'],
    tags: ['best'],
    specs: [[spec('Mouvement', 'Movement', 'الحركة'), spec('Quartz', 'Quartz', 'كوارتز')], [spec('Bracelet', 'Strap', 'الحزام'), spec('Cuir véritable', 'Genuine leather', 'جلد طبيعي')], [WARRANTY, TWO_YEARS]],
  },
  {
    slug: 'baskets-cuir',
    shape: 'sneaker',
    title: { fr: 'Baskets en cuir Daily', en: 'Daily leather sneakers', ar: 'حذاء رياضي جلدي Daily' },
    subtitle: { fr: 'Semelle confort, cuir lisse', en: 'Comfort sole, smooth leather', ar: 'نعل مريح وجلد ناعم' },
    description: {
      fr: 'Des baskets minimalistes en cuir lisse, semelle amortissante et doublure respirante. Elles s’accordent avec tout, toute l’année.',
      en: 'Minimalist smooth-leather sneakers with a cushioned sole and breathable lining. They go with everything, all year round.',
      ar: 'حذاء رياضي بسيط من الجلد الناعم بنعل مريح وبطانة تسمح بالتهوية. يتماشى مع كل شيء طوال السنة.',
    },
    price: 199,
    colors: ['blanc', 'sable', 'brume'],
    options: { kind: 'shoe', values: SHOE_SIZES },
    categories: ['mode'],
    tags: ['new', 'best'],
    specs: [[MATERIAL, spec('Cuir de vachette', 'Cowhide leather', 'جلد بقري')], [spec('Semelle', 'Sole', 'النعل'), spec('Caoutchouc amortissant', 'Cushioned rubber', 'مطاط مريح')], [spec('Fabrication', 'Made in', 'الصنع'), spec('Tunisie', 'Tunisia', 'تونس')]],
  },

  /* ---- Cuisine ---- */
  {
    slug: 'set-de-mugs',
    shape: 'mugs',
    title: { fr: 'Set de 2 mugs en grès', en: 'Set of 2 stoneware mugs', ar: 'طقم كوبين من الفخار' },
    subtitle: { fr: 'Émail réactif, 350 ml', en: 'Reactive glaze, 350 ml', ar: 'طلاء تفاعلي، 350 مل' },
    description: {
      fr: 'Deux mugs en grès à l’émail réactif, chaque pièce est unique. Leur anse généreuse et leur contenance en font les compagnons du café du matin.',
      en: 'Two stoneware mugs with a reactive glaze: each piece is unique. A generous handle and capacity make them perfect for morning coffee.',
      ar: 'كوبان من الفخار بطلاء تفاعلي، كل قطعة فريدة. مقبض مريح وسعة كبيرة لقهوة الصباح.',
    },
    price: 55,
    colors: ['brume', 'sauge', 'terracotta'],
    options: null,
    categories: ['cuisine', 'idees-cadeaux'],
    tags: ['new'],
    specs: [[MATERIAL, spec('Grès émaillé', 'Glazed stoneware', 'فخار مطلي')], [CAPACITY, spec('2 × 350 ml', '2 × 350 ml', '2 × 350 مل')], [CARE, spec('Lave-vaisselle et micro-ondes', 'Dishwasher and microwave safe', 'آمن لغسالة الصحون والميكروويف')]],
  },
  {
    slug: 'theiere-ceramique',
    shape: 'teapot',
    title: { fr: 'Théière en céramique 1 L', en: 'Ceramic teapot 1 L', ar: 'إبريق شاي سيراميك 1 لتر' },
    subtitle: { fr: 'Filtre inox amovible', en: 'Removable steel infuser', ar: 'مصفاة فولاذية قابلة للنزع' },
    description: {
      fr: 'Une théière en céramique au filtre en inox amovible, pour infuser thé vert à la menthe ou tisanes. Son bec verseur ne goutte pas.',
      en: 'A ceramic teapot with a removable stainless steel infuser, for mint green tea or herbal infusions. Its spout pours without dripping.',
      ar: 'إبريق شاي من السيراميك بمصفاة فولاذية قابلة للنزع، لتحضير الشاي الأخضر بالنعناع أو منقوع الأعشاب. صنبور لا يقطر.',
    },
    price: 79,
    colors: ['taupe', 'sauge', 'terracotta'],
    options: null,
    categories: ['cuisine', 'bien-etre'],
    tags: ['best'],
    specs: [[MATERIAL, spec('Céramique, filtre inox', 'Ceramic, steel infuser', 'سيراميك، مصفاة فولاذية')], [CAPACITY, spec('1 litre', '1 litre', '1 لتر')], [CARE, spec('Lavage à la main', 'Hand wash', 'غسيل يدوي')]],
  },
  {
    slug: 'bloc-couteaux',
    shape: 'knives',
    title: { fr: 'Bloc de 4 couteaux', en: '4-piece knife block', ar: 'حامل 4 سكاكين' },
    subtitle: { fr: 'Acier inoxydable, bloc en bois', en: 'Stainless steel, wooden block', ar: 'فولاذ مقاوم للصدأ، حامل خشبي' },
    description: {
      fr: 'Quatre couteaux essentiels (chef, pain, office, universel) en acier inoxydable, rangés dans un bloc en bois d’acacia. Lames affûtées et manches ergonomiques.',
      en: 'Four essential knives (chef, bread, paring, utility) in stainless steel, stored in an acacia wood block. Sharp blades and ergonomic handles.',
      ar: 'أربع سكاكين أساسية (الشيف، الخبز، التقشير، متعددة الاستعمال) من الفولاذ المقاوم للصدأ في حامل من خشب الأكاسيا. شفرات حادة ومقابض مريحة.',
    },
    price: 169,
    oldPrice: 199,
    colors: ['sable', 'noir'],
    options: null,
    categories: ['cuisine'],
    tags: ['promo'],
    specs: [[MATERIAL, spec('Acier inoxydable, acacia', 'Stainless steel, acacia', 'فولاذ مقاوم للصدأ، أكاسيا')], [spec('Contenu', 'Contents', 'المحتوى'), spec('4 couteaux et bloc', '4 knives and block', '4 سكاكين وحامل')], [WARRANTY, TWO_YEARS]],
  },
]

const CUSTOMERS = [
  { name: 'Sarah Mansour', phone: '20 111 222', city: 'Tunis' },
  { name: 'Youssef Ben Ali', phone: '22 333 444', city: 'Ariana' },
  { name: 'Ines Trabelsi', phone: '50 555 666', city: 'Sousse' },
  { name: 'Mehdi Gharbi', phone: '98 777 888', city: 'Sfax' },
  { name: 'Leila Haddad', phone: '25 999 000', city: 'Nabeul' },
  { name: 'Karim Jaziri', phone: '27 123 789', city: 'Monastir' },
  { name: 'Amel Bouazizi', phone: '53 456 123', city: 'Ben Arous' },
  { name: 'Nour Chaabane', phone: '29 654 321', city: 'Bizerte' },
  { name: 'Hamza Riahi', phone: '55 246 810', city: 'Kairouan' },
  { name: 'Salma Ayari', phone: '24 135 790', city: 'Gabès' },
]

const REVIEWS = [
  { name: 'Sarah M.', rating: 5, fr: 'Produit conforme à la description et très bien emballé. Je recommande !' },
  { name: 'Youssef B.', rating: 5, fr: 'Très bonne qualité pour le prix, livré en 48h à Ariana.' },
  { name: 'Ines T.', rating: 4, fr: 'Joli produit, la couleur est encore plus belle en vrai.' },
  { name: 'Mehdi G.', rating: 5, fr: 'Paiement à la livraison sans souci, livreur très aimable.' },
]

/* ------------------------------------------------------------------ */
/* Outils                                                              */
/* ------------------------------------------------------------------ */

/** Générateur pseudo-aléatoire déterministe : la démo est identique à chaque seed. */
let seed = 42
const rand = () => {
  seed = (seed * 1664525 + 1013904223) % 4294967296
  return seed / 4294967296
}
const pick = <T,>(list: readonly T[]) => list[Math.floor(rand() * list.length)]

const SEED_COLLECTIONS = [
  'orders',
  'customers',
  'inventory-movements',
  'reviews',
  'variants',
  'products',
  'category-promos',
  'pages',
  'categories',
  'attributeValues',
  'attributes',
  'tags',
  'media',
  'notifications',
  'chiffre-affaire',
  'visits',
] as const

async function upload(payload: Payload, name: string, alt: string, data: Buffer | Promise<Buffer>) {
  const buffer = await data
  return payload.create({
    collection: 'media',
    data: { alt },
    file: { data: buffer, mimetype: 'image/jpeg', name: `${name}.jpg`, size: buffer.length },
    context: ctx,
  })
}

/** Écrit les traductions EN/AR d'un document créé en FR. */
async function translate(payload: Payload, collection: any, id: string | number, byLocale: Record<'en' | 'ar', any>) {
  for (const locale of ['en', 'ar'] as const) {
    await payload.update({ collection, id, locale, data: byLocale[locale], context: ctx, overrideAccess: true })
  }
}

/** Remplace récursivement les chaînes FR connues par leur traduction. */
function translateTree(node: any, dict: Map<string, L>, locale: Locale): any {
  if (typeof node === 'string') return dict.get(node)?.[locale] ?? node
  if (Array.isArray(node)) return node.map((item) => translateTree(item, dict, locale))
  if (node && typeof node === 'object') {
    return Object.fromEntries(Object.entries(node).map(([key, value]) => [key, translateTree(value, dict, locale)]))
  }
  return node
}

/* ------------------------------------------------------------------ */
/* Seed                                                                */
/* ------------------------------------------------------------------ */

async function main() {
  const payload = await getPayload({ config })
  const log = (message: string) => payload.logger.info(`[seed] ${message}`)

  const existing = await payload.count({ collection: 'products', overrideAccess: true })
  if (existing.totalDocs > 0 && !RESET) {
    log(`La base contient déjà ${existing.totalDocs} produits. Relancez avec --reset pour tout remplacer.`)
    process.exit(1)
  }

  if (RESET) {
    for (const collection of SEED_COLLECTIONS) {
      await payload.delete({ collection, where: { id: { exists: true } }, overrideAccess: true, context: ctx })
    }
    log('Collections vidées')
  }

  /* ---- Admin ---------------------------------------------------- */
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@sable-store.test'
  const password = process.env.SEED_ADMIN_PASSWORD
  const admins = await payload.find({ collection: 'users', where: { email: { equals: email } }, limit: 1 })
  let admin = admins.docs[0]
  if (!admin) {
    if (!password) throw new Error('SEED_ADMIN_PASSWORD manquant dans .env')
    admin = await payload.create({
      collection: 'users',
      data: { email, password, name: 'Admin démo', role: 'owner' } as any,
    })
    log(`Compte admin créé : ${email}`)
  }

  /* ---- Tags ------------------------------------------------------ */
  const tagDefs = {
    new: { name: { fr: 'Nouveautés', en: 'New in', ar: 'جديد' }, color: '#10B981' },
    best: { name: { fr: 'Best-sellers', en: 'Best sellers', ar: 'الأكثر مبيعًا' }, color: '#F59E0B' },
    promo: { name: { fr: 'Promo', en: 'Sale', ar: 'تخفيضات' }, color: '#F87171' },
  }
  const tags: Record<string, any> = {}
  for (const [key, def] of Object.entries(tagDefs)) {
    tags[key] = await payload.create({ collection: 'tags', data: { name: def.name.fr, color: def.color } as any, context: ctx })
    await translate(payload, 'tags', tags[key].id, { en: { name: def.name.en }, ar: { name: def.name.ar } })
  }
  log('Tags créés')

  /* ---- Catégories ------------------------------------------------ */
  const categories: Record<string, any> = {}
  for (const def of CATEGORIES) {
    const image = await upload(
      payload,
      `categorie-${def.slug}`,
      def.title.fr,
      photo(`cat-${def.slug}`, () => sceneImage(800, 800, def.bg, def.scene.map(([shape, color]) => [shape, COLORS[color].hex]))),
    )
    categories[def.slug] = await payload.create({
      collection: 'categories',
      data: { title: def.title.fr, description: def.description.fr, slug: def.slug, kind: def.kind, order: def.order, image: image.id } as any,
      context: ctx,
    })
    await translate(payload, 'categories', categories[def.slug].id, {
      en: { title: def.title.en, description: def.description.en },
      ar: { title: def.title.ar, description: def.description.ar },
    })
  }
  log('Catégories créées')

  /* ---- Attributs ------------------------------------------------- */
  const makeAttribute = async (name: string, label: L, values: { label: L; value: string }[]) => {
    const attribute = await payload.create({ collection: 'attributes', data: { name, label: label.fr }, context: ctx })
    await translate(payload, 'attributes', attribute.id, { en: { label: label.en }, ar: { label: label.ar } })
    const byValue: Record<string, any> = {}
    for (const v of values) {
      const doc = await payload.create({
        collection: 'attributeValues',
        data: { attribute: attribute.id, label: v.label.fr, value: v.value },
        context: ctx,
      })
      await translate(payload, 'attributeValues', doc.id, { en: { label: v.label.en }, ar: { label: v.label.ar } })
      byValue[v.value] = doc
    }
    return { attribute, byValue }
  }

  const colorAttr = await makeAttribute(
    'Couleur',
    { fr: 'Couleur', en: 'Color', ar: 'اللون' },
    Object.values(COLORS).map((c) => ({ label: c.label, value: c.hex })),
  )
  const plain = (v: string): { label: L; value: string } => ({ label: { fr: v, en: v, ar: v }, value: v })
  const optionAttrs: Record<OptionKind, Awaited<ReturnType<typeof makeAttribute>>> = {
    size: await makeAttribute('Taille', { fr: 'Taille', en: 'Size', ar: 'المقاس' }, SIZES.map(plain)),
    shoe: await makeAttribute('Pointure', { fr: 'Pointure', en: 'Shoe size', ar: 'مقاس الحذاء' }, SHOE_SIZES.map(plain)),
    volume: await makeAttribute(
      'Contenance',
      { fr: 'Contenance', en: 'Volume', ar: 'السعة' },
      VOLUMES.map((v) => ({ label: { fr: v, en: v, ar: v.replace('ml', 'مل') }, value: v })),
    ),
  }
  log('Attributs créés')

  /* ---- Produits et variants ------------------------------------- */
  const products: { doc: any; seed: ProductSeed; variants: any[] }[] = []
  const now = Date.now()

  for (const [index, p] of PRODUCTS.entries()) {
    const photoColor = PHOTO_COLOR[p.slug] as ColorKey | undefined
    if (photoColor && fs.existsSync(path.join(PHOTOS_DIR, `${p.slug}.jpg`))) p.colors = [photoColor]

    const background = DEPARTMENT_BG[p.categories[0]] ?? '#fff6f2'
    const images: Record<string, any> = {}
    for (const color of p.colors) {
      images[color] = await upload(payload, `${p.slug}-${color}`, `${p.title.fr} – ${COLORS[color].label.fr}`, photo(p.slug, () => productImage(p.shape, COLORS[color].hex, background)))
    }

    const optionSource = p.options ? optionAttrs[p.options.kind] : null
    const productAttributes = [
      { attribute: colorAttr.attribute.id, values: p.colors.map((c) => colorAttr.byValue[COLORS[c].hex].id) },
      ...(p.options && optionSource
        ? [{ attribute: optionSource.attribute.id, values: p.options.values.map((s) => optionSource.byValue[s].id) }]
        : []),
    ]

    const doc = await payload.create({
      collection: 'products',
      context: ctx,
      data: {
        productTitle: p.title.fr,
        subtitle: p.subtitle.fr,
        description: p.description.fr,
        slug: p.slug,
        featuredImage: images[p.colors[0]].id,
        featuredImageColor: colorAttr.byValue[COLORS[p.colors[0]].hex].id,
        gallery: p.colors.map((c) => ({ image: images[c].id, color: colorAttr.byValue[COLORS[c].hex].id })),
        currentPrice: p.price,
        oldPrice: p.oldPrice,
        productAttributes,
        additionalInfoTitle: 'Détails',
        specifications: p.specs.map(([label, value]) => ({ label: label.fr, value: value.fr })),
        categories: p.categories.map((slug) => categories[slug].id),
        badge: p.tags.map((t) => tags[t].id),
        totalStock: 0,
        author: admin.id,
        // Échelonne les dates pour que « Nouveautés » et le tri récent aient du sens.
        publishedAt: new Date(now - (PRODUCTS.length - index) * 86_400_000).toISOString(),
        _status: 'published',
        meta: { title: `${p.title.fr} | ${brand.name}`, description: p.subtitle.fr, image: images[p.colors[0]].id },
      } as any,
    })

    // Les champs localisés des tableaux (specifications) gardent leurs ids d'origine.
    const specIds = (doc as any).specifications?.map((s: any) => s.id) ?? []
    for (const locale of ['en', 'ar'] as const) {
      await payload.update({
        collection: 'products',
        id: doc.id,
        locale,
        context: ctx,
        data: {
          productTitle: p.title[locale],
          subtitle: p.subtitle[locale],
          description: p.description[locale],
          additionalInfoTitle: locale === 'en' ? 'Details' : 'التفاصيل',
          specifications: p.specs.map(([label, value], i) => ({ id: specIds[i], label: label[locale], value: value[locale] })),
          meta: { title: `${p.title[locale]} | ${brand.name}`, description: p.subtitle[locale] },
          _status: 'published',
        } as any,
      })
    }

    const variants: any[] = []
    for (const color of p.colors) {
      for (const option of p.options?.values ?? [null]) {
        const combination = [colorAttr.byValue[COLORS[color].hex].id, ...(option && optionSource ? [optionSource.byValue[option].id] : [])]
        // Les grandes contenances coûtent plus cher (arrondi au dinar).
        const factor = p.options?.kind === 'volume' && option ? VOLUME_FACTOR[option] / VOLUME_FACTOR[p.options.values[0]] : 1
        variants.push(
          await payload.create({
            collection: 'variants',
            context: ctx,
            data: {
              product: doc.id,
              attributes: productAttributes.map((a) => a.attribute),
              combination,
              price: Math.round(p.price * factor),
              oldPrice: p.oldPrice ? Math.round(p.oldPrice * factor) : undefined,
              stock: 12 + Math.floor(rand() * 24),
              images: [{ image: images[color].id }],
            } as any,
          }),
        )
      }
    }
    products.push({ doc, seed: p, variants })
    log(`Produit ${index + 1}/${PRODUCTS.length} : ${p.title.fr} (${variants.length} variants)`)
  }

  /* ---- Avis ------------------------------------------------------ */
  for (const { doc } of products.filter((_, i) => i % 2 === 0)) {
    for (const review of REVIEWS.slice(0, 2 + Math.floor(rand() * 3))) {
      await payload.create({
        collection: 'reviews',
        context: ctx,
        overrideAccess: true,
        data: { product: doc.id, rating: review.rating, comment: review.fr, authorName: review.name, status: 'approved', locale: 'fr' } as any,
      })
    }
  }
  log('Avis créés')

  /* ---- Visuels de la page d'accueil ----------------------------- */
  const c = (key: ColorKey) => COLORS[key].hex
  const hero1 = await upload(payload, 'hero-maison', 'Maison & Déco', photo('hero-maison', () => heroImage(['#fff6f2', '#fce3d6'], [['lamp', c('taupe')], ['vase', c('rose')], ['candle', c('creme')]])))
  const hero2 = await upload(payload, 'hero-high-tech', 'High-tech', photo('hero-high-tech', () => heroImage(['#fff8f4', '#f9e4da'], [['headphones', c('sable')], ['smartwatch', c('taupe')], ['speaker', c('brume')]])))
  const hero3 = await upload(payload, 'hero-beaute', 'Beauté', photo('hero-beaute', () => heroImage(['#fdf6f3', '#f7e1d9'], [['perfume', c('rose')], ['serum', c('miel')], ['cream', c('blanc')]])))
  const promoImage = await upload(payload, 'promo-maison', 'Maison & Déco', photo('promo-maison', () => sceneImage(1000, 1000, ['#fdf3ef', '#f6d9cf'], [['cushion', c('sauge')], ['vase', c('sable')], ['candle', c('rose')]])))
  const collectionImages = {
    cadeaux: await upload(payload, 'collection-cadeaux', 'Idées cadeaux', photo('col-cadeaux', () => sceneImage(1200, 900, ['#fdf6f3', '#f7e1d9'], [['perfume', c('rose')], ['watch', c('taupe')], ['candle', c('creme')]]))),
    bienEtre: await upload(payload, 'collection-bien-etre', 'Bien-être', photo('col-bien-etre', () => sceneImage(1200, 900, ['#fff6f2', '#dcebe6'], [['teapot', c('sauge')], ['yogamat', c('rose')], ['serum', c('miel')]]))),
    cosy: await upload(payload, 'collection-maison-cosy', 'Maison cosy', photo('col-cosy', () => sceneImage(1200, 900, ['#f3f6fa', '#e1ebf1'], [['lamp', c('miel')], ['cushion', c('sable')], ['mugs', c('brume')]]))),
  }
  const avatars = await Promise.all(
    [['SM', '#7fa491'], ['YB', '#bb5333'], ['IT', '#f0a07c'], ['MG', '#7fa3b8'], ['LH', '#d9a74e']].map(([initials, bg]) =>
      upload(payload, `avatar-${initials.toLowerCase()}`, `Avatar ${initials}`, avatarImage(initials, bg)),
    ),
  )
  log('Visuels créés')

  /* ---- Page d'accueil ------------------------------------------- */
  // Chaque texte FR de la page est traduit par ce dictionnaire (voir translateTree).
  const T = (fr: string, en: string, ar: string) => {
    dict.set(fr, { fr, en, ar })
    return fr
  }
  const dict = new Map<string, L>()
  const link = (url: string, label: string) => ({ type: 'custom', url, label, newTab: false })
  const departments = ['high-tech', 'maison-deco', 'beaute', 'sport', 'mode', 'cuisine']

  const home = await payload.create({
    collection: 'pages',
    context: ctx,
    data: {
      title: T('Accueil', 'Home', 'الرئيسية'),
      slug: 'home',
      _status: 'published',
      publishedAt: new Date().toISOString(),
      homeHero: {
        title: T('Tout pour la maison, la beauté et le quotidien', 'Everything for home, beauty and everyday life', 'كل ما تحتاجه للمنزل والجمال والحياة اليومية'),
        description: T(
          'High-tech, déco, soins, sport et cuisine : une sélection soignée, livrée partout en Tunisie et payée à la livraison.',
          'Tech, decor, skincare, sport and kitchen: a curated selection, delivered across Tunisia with cash on delivery.',
          'تكنولوجيا، ديكور، عناية، رياضة ومطبخ: تشكيلة مختارة بعناية، توصيل إلى كل أنحاء تونس والدفع عند الاستلام.',
        ),
        images: [{ image: hero1.id }, { image: hero2.id }, { image: hero3.id }],
        cta: { link: link('/boutique', T('Découvrir la boutique', 'Shop now', 'اكتشف المتجر')) },
        trustItems: [
          { icon: 'Truck', color: '#F59E0B', label: T('Livraison 24-48h', '24-48h delivery', 'توصيل خلال 24-48 ساعة') },
          { icon: 'Wallet', color: '#10B981', label: T('Paiement à la livraison', 'Cash on delivery', 'الدفع عند الاستلام') },
          { icon: 'RotateCcw', color: '#60A5FA', label: T('Retour sous 14 jours', '14-day returns', 'إرجاع خلال 14 يومًا') },
        ],
      },
      layout: [
        {
          blockType: 'homeFeatures',
          features: [
            { icon: 'Truck', color: '#F59E0B', title: T('Livraison rapide', 'Fast delivery', 'توصيل سريع'), description: T('Partout en Tunisie en 24 à 48h', 'Across Tunisia in 24 to 48h', 'إلى كل أنحاء تونس خلال 24 إلى 48 ساعة') },
            { icon: 'Wallet', color: '#10B981', title: T('Paiement à la livraison', 'Cash on delivery', 'الدفع عند الاستلام'), description: T('Vous payez en espèces à réception', 'Pay in cash when it arrives', 'تدفع نقدًا عند الاستلام') },
            { icon: 'RotateCcw', color: '#60A5FA', title: T('Retours faciles', 'Easy returns', 'إرجاع سهل'), description: T('14 jours pour changer d’avis', '14 days to change your mind', '14 يومًا لتغيير رأيك') },
            { icon: 'ShieldCheck', color: '#8B5CF6', title: T('Produits garantis', 'Guaranteed products', 'منتجات مضمونة'), description: T('Jusqu’à 2 ans sur le high-tech', 'Up to 2 years on tech', 'حتى سنتين على التكنولوجيا') },
          ],
        },
        {
          blockType: 'homeCategories',
          title: T('Nos univers', 'Shop by department', 'أقسامنا'),
          subtitle: T('Six univers pour la maison, la beauté et le quotidien.', 'Six departments for home, beauty and everyday life.', 'ستة أقسام للمنزل والجمال والحياة اليومية.'),
          categories: departments.map((s) => categories[s].id),
        },
        {
          blockType: 'homeShowcase',
          icon: 'Sparkles',
          badge: T('SÉLECTION', 'SELECTION', 'مختارات'),
          title: T('Les produits du moment', 'Products of the moment', 'منتجات اللحظة'),
          subtitle: T('Nouveautés, best-sellers et bonnes affaires.', 'New in, best sellers and great deals.', 'الجديد، الأكثر مبيعًا وأفضل العروض.'),
          tabs: [{ tag: tags.new.id }, { tag: tags.best.id }, { tag: tags.promo.id }],
        },
        {
          blockType: 'homePromo',
          icon: 'Tag',
          badge: T('Offre du moment', 'Current offer', 'عرض اللحظة'),
          headlinePre: T('-25% sur l’univers', '-25% on', '-25% على قسم'),
          headlineHighlight: T('Maison & Déco', 'Home & Decor', 'المنزل والديكور'),
          description: T(
            'Lampes, vases, bougies et coussins : de quoi rendre chaque pièce plus douce.',
            'Lamps, vases, candles and cushions to make every room feel softer.',
            'مصابيح ومزهريات وشموع ووسائد لتصبح كل غرفة أكثر دفئًا.',
          ),
          ctaText: T("Profiter de l'offre", 'Shop the offer', 'استفد من العرض'),
          category: categories['maison-deco'].id,
          promoImage: promoImage.id,
          endDate: new Date(now + 21 * 86_400_000).toISOString(),
          trustBadges: [
            { icon: 'Truck', label: T('Livraison rapide', 'Fast delivery', 'توصيل سريع') },
            { icon: 'Wallet', label: T('Paiement à la livraison', 'Cash on delivery', 'الدفع عند الاستلام') },
            { icon: 'RefreshCw', label: T('Échange facile', 'Easy exchange', 'استبدال سهل') },
          ],
        },
        {
          blockType: 'homeCollections',
          icon: 'Gem',
          badge: T('COLLECTIONS', 'COLLECTIONS', 'التشكيلات'),
          title: T('Nos sélections du moment', 'Our current selections', 'تشكيلاتنا الحالية'),
          subtitle: T('Pour offrir, prendre soin de soi ou adoucir la maison.', 'To gift, to care for yourself or to soften your home.', 'للإهداء أو للعناية بنفسك أو لمنزل أكثر دفئًا.'),
          discoverButtonText: T('Découvrir', 'Discover', 'اكتشف'),
          collections: [
            { iconcollection: 'Gift', colorcollection: '#F87171', collectionLabel: T('COLLECTION', 'COLLECTION', 'تشكيلة'), collectionTitle: T('Idées cadeaux', 'Gift ideas', 'أفكار هدايا'), image: collectionImages.cadeaux.id, category: categories['idees-cadeaux'].id },
            { iconcollection: 'Leaf', colorcollection: '#10B981', collectionLabel: 'COLLECTION', collectionTitle: T('Bien-être', 'Wellbeing', 'العافية'), image: collectionImages.bienEtre.id, category: categories['bien-etre'].id },
            { iconcollection: 'Sofa', colorcollection: '#FBBF24', collectionLabel: 'COLLECTION', collectionTitle: T('Maison cosy', 'Cosy home', 'منزل دافئ'), image: collectionImages.cosy.id, category: categories['maison-deco'].id },
          ],
        },
        {
          blockType: 'homeProducts',
          title: T('Tous nos produits', 'All our products', 'كل منتجاتنا'),
          cta: { link: link('/boutique', T('Voir toute la boutique', 'Browse the whole shop', 'تصفح كل المتجر')) },
        },
        {
          blockType: 'homeTestimonials',
          icon: 'Star',
          badge: T('AVIS CLIENTS', 'CUSTOMER REVIEWS', 'آراء العملاء'),
          title: T('Ce que nos clients en pensent', 'What our customers think', 'ماذا يقول عملاؤنا'),
          subtitle: T(
            'Des milliers de clients en Tunisie nous font confiance pour leurs achats du quotidien.',
            'Thousands of customers across Tunisia trust us for their everyday shopping.',
            'آلاف العملاء في تونس يثقون بنا في مشترياتهم اليومية.',
          ),
          verifiedLabel: T('Achat vérifié', 'Verified purchase', 'شراء موثق'),
          featuredImage: avatars[0].id,
          featuredText: T(
            "J'ai commandé des écouteurs et une lampe de bureau : tout était conforme, bien emballé et livré en 48h. Paiement à la livraison, sans surprise. Sable est devenue ma boutique de référence.",
            'I ordered earbuds and a desk lamp: everything was as described, well packed and delivered in 48h. Cash on delivery, no surprises. Sable has become my go-to shop.',
            'طلبت سماعات ومصباح مكتب: كل شيء مطابق للوصف، مغلف بعناية ووصل خلال 48 ساعة. الدفع عند الاستلام دون مفاجآت. أصبح Sable متجري المفضل.',
          ),
          featuredName: 'Sarah M.',
          featuredLocation: 'Tunis',
          reviews: [
            { avatar: avatars[1].id, name: 'Youssef B.', location: 'Ariana', reviewText: T('La montre connectée est top, autonomie au rendez-vous.', 'The smartwatch is great, the battery really lasts.', 'الساعة الذكية رائعة والبطارية تدوم فعلًا.') },
            { avatar: avatars[2].id, name: 'Ines T.', location: 'Sousse', reviewText: T('Le vase et la bougie sont magnifiques, parfaits pour offrir.', 'The vase and candle are beautiful, perfect as gifts.', 'المزهرية والشمعة رائعتان، مثاليتان كهدية.') },
            { avatar: avatars[3].id, name: 'Mehdi G.', location: 'Sfax', reviewText: T('Livraison rapide et colis soigné, rien à redire.', 'Fast delivery and careful packaging, nothing to fault.', 'توصيل سريع وتغليف أنيق، لا شيء يُعاب.') },
            { avatar: avatars[4].id, name: 'Leila H.', location: 'Nabeul', reviewText: T('Le sérum a changé mon teint, excellent rapport qualité-prix.', 'The serum transformed my skin, excellent value.', 'السيروم غيّر بشرتي، جودة ممتازة مقابل السعر.') },
          ],
          stats: [
            { icon: 'Star', iconColor: '#F59E0B', value: '4.8/5', label: T('Note moyenne', 'Average rating', 'متوسط التقييم') },
            { icon: 'Users', iconColor: '#8B5CF6', value: '15 000+', label: T('clients satisfaits', 'happy customers', 'عميل راضٍ') },
            { icon: 'Package', iconColor: '#10B981', value: '40 000+', label: T('commandes livrées', 'orders delivered', 'طلب تم توصيله') },
            { icon: 'MapPin', iconColor: '#F87171', value: '24', label: T('gouvernorats livrés', 'governorates served', 'ولاية نوصل إليها') },
          ],
        },
        {
          blockType: 'homeFAQ',
          icon: 'HelpCircle',
          badge: 'FAQ',
          title: T('Questions fréquentes', 'Frequently asked questions', 'الأسئلة الشائعة'),
          subtitle: T('Tout ce qu’il faut savoir avant de commander.', 'Everything you need to know before ordering.', 'كل ما تحتاج معرفته قبل الطلب.'),
          items: [
            {
              question: T('Quels sont les délais et frais de livraison ?', 'How long does delivery take and how much does it cost?', 'ما هي مدة وتكلفة التوصيل؟'),
              answer: T(
                'Nous livrons dans les 24 gouvernorats en 24 à 48h ouvrées. Les frais de livraison sont de 8 DT.',
                'We deliver to all 24 governorates within 24 to 48 working hours. Delivery costs 8 DT.',
                'نوصل إلى الولايات الـ24 خلال 24 إلى 48 ساعة عمل. تكلفة التوصيل 8 د.ت.',
              ),
            },
            {
              question: T('Comment se passe le paiement ?', 'How does payment work?', 'كيف يتم الدفع؟'),
              answer: T(
                'Vous payez en espèces au livreur, à la réception de votre colis. Aucune carte bancaire n’est demandée.',
                'You pay the courier in cash when your parcel arrives. No bank card required.',
                'تدفع نقدًا لعامل التوصيل عند استلام طردك. لا حاجة لبطاقة بنكية.',
              ),
            },
            {
              question: T('Puis-je retourner un produit ?', 'Can I return a product?', 'هل يمكنني إرجاع منتج؟'),
              answer: T(
                'Oui, sous 14 jours, pour un produit non utilisé dans son emballage d’origine. Les produits de beauté ouverts ne sont ni repris ni échangés.',
                'Yes, within 14 days, for an unused product in its original packaging. Opened beauty products cannot be returned.',
                'نعم، خلال 14 يومًا لمنتج غير مستعمل في غلافه الأصلي. لا تُرجع منتجات التجميل المفتوحة.',
              ),
            },
            {
              question: T('Les produits high-tech sont-ils garantis ?', 'Are tech products covered by a warranty?', 'هل منتجات التكنولوجيا مضمونة؟'),
              answer: T(
                'Oui, tous nos produits high-tech bénéficient d’une garantie de 1 à 2 ans selon l’article, indiquée sur chaque fiche produit.',
                'Yes, all our tech products come with a 1 to 2-year warranty depending on the item, shown on each product page.',
                'نعم، جميع منتجات التكنولوجيا مضمونة من سنة إلى سنتين حسب المنتج، كما هو مبين في صفحة كل منتج.',
              ),
            },
            {
              question: T('Comment suivre ma commande ?', 'How can I track my order?', 'كيف أتابع طلبي؟'),
              answer: T(
                'Nous vous appelons pour confirmer la commande, puis le livreur vous contacte le jour de la livraison.',
                'We call you to confirm the order, then the courier contacts you on delivery day.',
                'نتصل بك لتأكيد الطلب، ثم يتصل بك عامل التوصيل يوم التسليم.',
              ),
            },
          ],
        },
        {
          blockType: 'homeCTA',
          icon: 'ShoppingBag',
          badge: T('BOUTIQUE', 'SHOP', 'المتجر'),
          title: T('Prêt à vous faire plaisir ?', 'Ready to treat yourself?', 'هل أنت مستعد لتدليل نفسك؟'),
          subtitle: T(
            'Parcourez nos six univers et faites-vous livrer partout en Tunisie.',
            'Browse our six departments and get delivery anywhere in Tunisia.',
            'تصفح أقسامنا الستة واطلب التوصيل إلى أي مكان في تونس.',
          ),
          links: [
            { link: { ...link('/boutique', T('Voir la boutique', 'Visit the shop', 'زيارة المتجر')), appearance: 'default' } },
            { link: { ...link('/categorie/idees-cadeaux', T('Idées cadeaux', 'Gift ideas', 'أفكار هدايا')), appearance: 'outline' } },
          ],
        },
      ],
      meta: {
        title: `${brand.name} | Boutique en ligne en Tunisie`,
        description: T(
          'High-tech, maison, beauté, sport et cuisine. Livraison 24-48h partout en Tunisie et paiement à la livraison.',
          'Tech, home, beauty, sport and kitchen. 24-48h delivery across Tunisia and cash on delivery.',
          'تكنولوجيا، منزل، جمال، رياضة ومطبخ. توصيل خلال 24-48 ساعة في كل أنحاء تونس والدفع عند الاستلام.',
        ),
        image: hero1.id,
      },
    } as any,
  })

  const homeFr = await payload.findByID({ collection: 'pages', id: home.id, depth: 0, locale: 'fr', draft: true })
  const { id: _id, createdAt: _c, updatedAt: _u, ...homeData } = homeFr as any
  for (const locale of ['en', 'ar'] as const) {
    const data = translateTree(homeData, dict, locale)
    data.meta.title = `${brand.name} | ${locale === 'en' ? 'Online store in Tunisia' : 'متجر إلكتروني في تونس'}`
    await payload.update({ collection: 'pages', id: home.id, locale, context: ctx, data: { ...data, _status: 'published' } })
  }
  log("Page d'accueil créée")

  /* ---- Header / Footer / réglages ------------------------------- */
  const logoPng = await sharp(path.resolve(process.cwd(), `public${brand.logo}`), { density: 300 }).png().toBuffer()
  const logo = await payload.create({
    collection: 'media',
    data: { alt: brand.name },
    file: { data: logoPng, mimetype: 'image/png', name: 'logo.png', size: logoPng.length },
    context: ctx,
  })

  const headerNav = [
    { type: 'link', link: link('/boutique', T('Boutique', 'Shop', 'المتجر')) },
    { type: 'categories', label: T('Catégories', 'Categories', 'الفئات') },
    { type: 'link', link: link('/categorie/high-tech', T('High-tech', 'High-tech', 'تكنولوجيا')) },
    { type: 'link', link: link('/categorie/maison-deco', T('Maison', 'Home', 'المنزل')) },
  ]
  const header = await payload.updateGlobal({ slug: 'header', context: ctx, data: { logo: logo.id, navItems: headerNav } as any })
  for (const locale of ['en', 'ar'] as const) {
    await payload.updateGlobal({ slug: 'header', locale, context: ctx, data: translateTree({ navItems: (header as any).navItems }, dict, locale) })
  }

  const footer = await payload.updateGlobal({
    slug: 'footer',
    context: ctx,
    data: {
      logo: logo.id,
      description: T(
        'Sable, la boutique du quotidien : high-tech, maison, beauté, sport et cuisine, livrés partout en Tunisie avec paiement à la livraison.',
        'Sable, your everyday store: tech, home, beauty, sport and kitchen, delivered across Tunisia with cash on delivery.',
        'Sable، متجرك اليومي: تكنولوجيا، منزل، جمال، رياضة ومطبخ، مع التوصيل إلى كل أنحاء تونس والدفع عند الاستلام.',
      ),
      categoriesTitle: T('Catégories', 'Categories', 'الفئات'),
      contactsTitle: T('Contact', 'Contact', 'اتصل بنا'),
      contacts: [
        { icon: 'Mail', link: link('mailto:contact@sable-store.test', 'contact@sable-store.test') },
        { icon: 'Phone', link: link('tel:+21670000000', '+216 70 000 000') },
        { icon: 'MapPin', link: link('/boutique', T('Les Berges du Lac, Tunis', 'Les Berges du Lac, Tunis', 'ضفاف البحيرة، تونس')) },
      ],
      socialTitle: T('Suivez-nous', 'Follow us', 'تابعونا'),
      whatsappnumber: '+21670000000',
      socialLinks: [
        { icon: 'fa-FaInstagram', url: 'https://instagram.com' },
        { icon: 'fa-FaFacebookF', url: 'https://facebook.com' },
        { icon: 'fa-FaTiktok', url: 'https://tiktok.com' },
      ],
      developerName: brand.name,
    } as any,
  })
  for (const locale of ['en', 'ar'] as const) {
    const { description, categoriesTitle, contactsTitle, socialTitle, contacts } = footer as any
    await payload.updateGlobal({
      slug: 'footer',
      locale,
      context: ctx,
      data: translateTree({ description, categoriesTitle, contactsTitle, socialTitle, contacts }, dict, locale),
    })
  }
  await payload.updateGlobal({ slug: 'shop-settings', context: ctx, data: { deliveryFee: 8 } as any })
  log('Header, footer et réglages enregistrés')

  /* ---- Commandes ------------------------------------------------- */
  let orders = 0
  // Stock restant par variant : chaque commande validée le décrémente.
  const stockLeft = new Map<string, number>(products.flatMap(({ variants }) => variants.map((v) => [String(v.id), v.stock ?? 0] as [string, number])))
  for (let i = 0; i < 24; i++) {
    const customer = pick(CUSTOMERS)
    const lines = Array.from({ length: 1 + Math.floor(rand() * 3) }, () => {
      const { doc, seed: p, variants } = pick(products)
      const quantity = 1 + Math.floor(rand() * 2)
      const available = variants.filter((v) => (stockLeft.get(String(v.id)) ?? 0) >= quantity + 1)
      const variant = pick(available.length ? available : variants)
      stockLeft.set(String(variant.id), (stockLeft.get(String(variant.id)) ?? 0) - quantity)
      const price = variant.price ?? p.price
      return {
        productId: String(doc.id),
        variantId: String(variant.id),
        title: p.title.fr,
        attributes: variant.sku ?? '',
        quantity,
        price,
        oldPrice: variant.oldPrice ?? p.oldPrice,
        subtotal: price * quantity,
      }
    })
    const subtotal = lines.reduce((sum, l) => sum + l.subtotal, 0)
    // Les plus récentes restent à traiter, une ancienne est annulée.
    const status = i >= 20 ? 'new' : i === 5 ? 'cancelled' : 'validated'
    try {
      await payload.create({
        collection: 'orders',
        overrideAccess: true,
        context: { ...ctx, skipNotifications: true },
        data: {
          product: lines[0].productId,
          items: lines,
          quantity: lines.reduce((sum, l) => sum + l.quantity, 0),
          status,
          deliveryFee: 8,
          totalAmount: subtotal + 8,
          customerName: customer.name,
          customerPhone: customer.phone,
          customerAddress: `${10 + i} avenue Habib Bourguiba`,
          customerGouvernorat: customer.city,
          createdAt: new Date(now - (24 - i) * 1.3 * 86_400_000).toISOString(),
        } as any,
      })
      orders++
    } catch (error) {
      payload.logger.warn(`[seed] Commande ${i + 1} ignorée : ${(error as Error).message}`)
    }
  }
  log(`${orders} commandes créées`)

  // Hors de Next, revalidateTag est impossible : on vide le cache de données
  // (header/footer en unstable_cache) pour ne pas servir d'anciens médias, et
  // le cache d'images optimisées, indexé par nom de fichier (souvent inchangé).
  for (const dir of [
    '.next/dev/cache/fetch-cache',
    '.next/cache/fetch-cache',
    '.next/dev/cache/images',
    '.next/cache/images',
  ]) {
    fs.rmSync(path.resolve(process.cwd(), dir), { recursive: true, force: true })
  }

  log(`Terminé. Admin : ${email} — site : ${brand.siteUrl}`)
  log('Redémarrez le serveur (npm run dev) pour afficher les nouvelles données.')
  process.exit(0)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
