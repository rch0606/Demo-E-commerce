/**
 * Images de démonstration générées localement (aucun téléchargement) :
 * illustrations « flat » de produits sur fonds pastel, visuels du hero,
 * scènes de catégories / collections / promo et avatars.
 * Remplacez-les par de vraies photos depuis l'admin quand vous en avez.
 *
 * Chaque objet est dessiné dans une boîte de 600×600 dont le « sol » est à y≈560,
 * en 2–3 tons (base, ombre, reflet) sans contour.
 */
import sharp from 'sharp'

export type Shape =
  | 'headphones'
  | 'earbuds'
  | 'smartwatch'
  | 'speaker'
  | 'tablet'
  | 'lamp'
  | 'vase'
  | 'candle'
  | 'cushion'
  | 'mugs'
  | 'teapot'
  | 'serum'
  | 'cream'
  | 'perfume'
  | 'yogamat'
  | 'bottle'
  | 'dumbbell'
  | 'hoodie'
  | 'backpack'
  | 'sunglasses'
  | 'watch'
  | 'sneaker'
  | 'knives'

/** Mélange une couleur hex vers le noir (amount > 0) ou le blanc (amount < 0). */
const mix = (hex: string, amount: number) => {
  const n = parseInt(hex.slice(1), 16)
  const target = amount > 0 ? 0 : 255
  const a = Math.abs(amount)
  const c = (v: number) => Math.round(v + (target - v) * a)
  return `#${[n >> 16, (n >> 8) & 255, n & 255].map((v) => c(v).toString(16).padStart(2, '0')).join('')}`
}

const INK = '#26232b'
const CREAM = '#fffaf7'
const GOLD = '#d9b26f'
const METAL = '#c9ccd0'

type Tones = { c: string; d: string; dd: string; l: string }
let uid = 0

const DRAW: Record<Shape, (t: Tones) => string> = {
  headphones: ({ c, d, dd, l }) => `
    <path d="M150,360 A150,170 0 0 1 450,360" fill="none" stroke="${d}" stroke-width="34" stroke-linecap="round"/>
    <path d="M168,330 A132,150 0 0 1 432,330" fill="none" stroke="${l}" stroke-width="10" stroke-linecap="round" opacity="0.6"/>
    <rect x="96" y="300" width="112" height="200" rx="52" fill="${d}"/>
    <rect x="108" y="310" width="92" height="180" rx="44" fill="${c}"/>
    <rect x="186" y="322" width="40" height="156" rx="20" fill="${dd}"/>
    <rect x="392" y="300" width="112" height="200" rx="52" fill="${d}"/>
    <rect x="400" y="310" width="92" height="180" rx="44" fill="${c}"/>
    <rect x="374" y="322" width="40" height="156" rx="20" fill="${dd}"/>
    <rect x="124" y="330" width="16" height="90" rx="8" fill="${l}" opacity="0.7"/>
    <rect x="460" y="330" width="16" height="90" rx="8" fill="${l}" opacity="0.7"/>`,

  earbuds: ({ c, d, dd, l }) => {
    const bud = (x: number, flip: number) => `
      <rect x="${x - 13}" y="280" width="26" height="100" rx="13" fill="${c}"/>
      <circle cx="${x}" cy="270" r="46" fill="${c}"/>
      <circle cx="${x + 20 * flip}" cy="262" r="22" fill="${dd}"/>
      <circle cx="${x - 18 * flip}" cy="250" r="10" fill="${l}"/>`
    return `
    <rect x="150" y="150" width="300" height="220" rx="100" fill="${d}"/>
    <rect x="170" y="170" width="260" height="190" rx="86" fill="${dd}" opacity="0.5"/>
    ${bud(236, -1)}${bud(364, 1)}
    <rect x="150" y="340" width="300" height="215" rx="96" fill="${d}"/>
    <rect x="150" y="340" width="300" height="200" rx="92" fill="${c}"/>
    <rect x="150" y="340" width="300" height="18" rx="9" fill="${d}"/>
    <rect x="186" y="380" width="18" height="110" rx="9" fill="${l}" opacity="0.8"/>
    <circle cx="300" cy="480" r="7" fill="#9cc79f"/>`
  },

  smartwatch: ({ c, d, dd, l }) => `
    <rect x="232" y="70" width="136" height="200" rx="30" fill="${d}"/>
    <rect x="232" y="330" width="136" height="220" rx="30" fill="${d}"/>
    <rect x="244" y="70" width="40" height="480" rx="20" fill="${c}" opacity="0.55"/>
    ${[400, 440, 480].map((y) => `<circle cx="300" cy="${y}" r="7" fill="${dd}"/>`).join('')}
    <rect x="410" y="250" width="22" height="64" rx="10" fill="${dd}"/>
    <rect x="180" y="180" width="240" height="270" rx="66" fill="${dd}"/>
    <rect x="194" y="194" width="212" height="242" rx="54" fill="#26292d"/>
    <circle cx="300" cy="315" r="70" fill="none" stroke="#e3b7aa" stroke-width="14" stroke-dasharray="330 440" transform="rotate(-90 300 315)" stroke-linecap="round"/>
    <circle cx="300" cy="315" r="50" fill="none" stroke="${GOLD}" stroke-width="14" stroke-dasharray="220 314" transform="rotate(-90 300 315)" stroke-linecap="round"/>
    <circle cx="300" cy="315" r="30" fill="none" stroke="#8fa58c" stroke-width="14" stroke-dasharray="150 189" transform="rotate(-90 300 315)" stroke-linecap="round"/>
    <rect x="214" y="206" width="60" height="12" rx="6" fill="${l}" opacity="0.25"/>`,

  speaker: ({ c, d, dd, l }) => {
    const id = `dots${uid++}`
    return `
    <defs><pattern id="${id}" width="18" height="18" patternUnits="userSpaceOnUse"><circle cx="9" cy="9" r="4" fill="${dd}" opacity="0.55"/></pattern></defs>
    <rect x="190" y="140" width="220" height="420" rx="70" fill="${d}"/>
    <rect x="190" y="140" width="210" height="410" rx="66" fill="${c}"/>
    <rect x="212" y="200" width="168" height="290" rx="40" fill="url(#${id})"/>
    <ellipse cx="300" cy="152" rx="96" ry="16" fill="${l}" opacity="0.8"/>
    <rect x="270" y="140" width="60" height="10" rx="5" fill="${dd}"/>
    <rect x="206" y="180" width="14" height="300" rx="7" fill="${l}" opacity="0.5"/>
    <rect x="270" y="510" width="60" height="12" rx="6" fill="${dd}" opacity="0.6"/>`
  },

  tablet: ({ c, d, l }) => {
    const id = `screen${uid++}`
    return `
    <defs><clipPath id="${id}"><rect x="172" y="112" width="256" height="400" rx="18"/></clipPath></defs>
    <rect x="150" y="90" width="310" height="450" rx="38" fill="${d}"/>
    <rect x="150" y="90" width="300" height="444" rx="36" fill="${c}"/>
    <rect x="172" y="112" width="256" height="400" rx="18" fill="#e7edf1"/>
    <g clip-path="url(#${id})">
      <circle cx="210" cy="180" r="130" fill="#e3b7aa" opacity="0.8"/>
      <circle cx="420" cy="430" r="150" fill="#8fa58c" opacity="0.75"/>
      <circle cx="350" cy="250" r="70" fill="${GOLD}" opacity="0.8"/>
      <rect x="172" y="112" width="256" height="400" fill="#fff" opacity="0.08"/>
    </g>
    <circle cx="300" cy="101" r="4" fill="${l}"/>
    <path d="M150,540 h310 l-20,14 h-270 z" fill="#000" opacity="0.05"/>`
  },

  lamp: ({ c, d, dd, l }) => `
    <ellipse cx="250" cy="535" rx="110" ry="26" fill="${d}"/>
    <rect x="140" y="510" width="220" height="26" rx="13" fill="${c}"/>
    <line x1="250" y1="510" x2="190" y2="300" stroke="${d}" stroke-width="22" stroke-linecap="round"/>
    <line x1="190" y1="300" x2="370" y2="190" stroke="${c}" stroke-width="22" stroke-linecap="round"/>
    <circle cx="190" cy="300" r="20" fill="${dd}"/>
    <circle cx="250" cy="508" r="18" fill="${dd}"/>
    <g transform="rotate(32 380 200)">
      <path d="M330,170 L430,170 L480,300 L280,300 Z" fill="${c}"/>
      <path d="M330,170 L380,170 L360,300 L280,300 Z" fill="${l}" opacity="0.45"/>
      <ellipse cx="380" cy="300" rx="100" ry="20" fill="#fff4d6"/>
      <rect x="350" y="148" width="60" height="30" rx="12" fill="${dd}"/>
    </g>
    <path d="M370,330 L520,520 L300,560 Z" fill="#fff4d6" opacity="0.35"/>`,

  vase: ({ c, d, l }) => `
    <path d="M300,250 C290,180 250,140 230,90" fill="none" stroke="#7f9a7c" stroke-width="6" stroke-linecap="round"/>
    <path d="M300,250 C315,170 370,120 400,70" fill="none" stroke="#7f9a7c" stroke-width="6" stroke-linecap="round"/>
    <path d="M300,250 C300,170 300,110 300,40" fill="none" stroke="#7f9a7c" stroke-width="6" stroke-linecap="round"/>
    ${[
      [236, 110, -30],
      [262, 150, 40],
      [372, 100, 30],
      [340, 150, -40],
      [290, 70, -20],
      [312, 120, 30],
      [226, 82, 10],
      [398, 70, -10],
    ]
      .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="26" ry="11" fill="#8fa58c" transform="rotate(${r} ${x} ${y})"/>`)
      .join('')}
    <path d="M250,230 h100 c-4,40 18,70 46,104 c40,48 60,96 60,140 c0,58 -40,86 -96,86 h-120 c-56,0 -96,-28 -96,-86 c0,-44 20,-92 60,-140 c28,-34 50,-64 46,-104 z" fill="${c}"/>
    <path d="M300,230 h50 c-4,40 18,70 46,104 c40,48 60,96 60,140 c0,58 -40,86 -96,86 h-60 z" fill="${d}" opacity="0.55"/>
    <ellipse cx="300" cy="232" rx="54" ry="12" fill="${d}"/>
    <path d="M214,400 c10,-34 30,-60 50,-82" fill="none" stroke="${l}" stroke-width="16" stroke-linecap="round" opacity="0.8"/>`,

  candle: ({ c, d, l }) => `
    <path d="M300,170 C276,206 280,240 300,248 C320,240 324,206 300,170 Z" fill="${GOLD}"/>
    <path d="M300,198 C290,218 292,236 300,240 C308,236 310,218 300,198 Z" fill="#fff4d6"/>
    <rect x="297" y="244" width="6" height="30" rx="3" fill="${INK}"/>
    <rect x="180" y="270" width="240" height="290" rx="34" fill="${d}"/>
    <rect x="180" y="270" width="226" height="284" rx="30" fill="${c}"/>
    <ellipse cx="300" cy="286" rx="104" ry="16" fill="#fbf3e4"/>
    <rect x="210" y="360" width="180" height="120" rx="10" fill="${CREAM}"/>
    <rect x="245" y="395" width="110" height="12" rx="6" fill="${INK}" opacity="0.7"/>
    <rect x="265" y="420" width="70" height="8" rx="4" fill="${INK}" opacity="0.35"/>
    <rect x="196" y="296" width="14" height="230" rx="7" fill="${l}" opacity="0.6"/>`,

  cushion: ({ c, d, dd, l }) => `
    <path d="M110,170 Q300,130 490,170 Q530,355 490,540 Q300,580 110,540 Q70,355 110,170 Z" fill="${d}"/>
    <path d="M110,170 Q300,130 490,170 Q520,345 482,520 Q300,555 116,520 Q80,345 110,170 Z" fill="${c}"/>
    <path d="M150,210 Q300,180 440,210 Q330,230 240,300 Q180,260 150,210 Z" fill="${l}" opacity="0.6"/>
    <path d="M300,355 Q240,300 160,250 M300,355 Q370,300 450,250 M300,355 Q240,420 160,480 M300,355 Q370,420 450,480" fill="none" stroke="${d}" stroke-width="6" stroke-linecap="round" opacity="0.6"/>
    <circle cx="300" cy="355" r="18" fill="${dd}"/>
    ${[
      [110, 170],
      [490, 170],
      [110, 540],
      [490, 540],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="16" fill="${dd}"/>`)
      .join('')}`,

  mugs: ({ c, d, l }) => {
    const mug = (x: number, y: number, s: number, body: string, dark: string, light: string) => `
      <g transform="translate(${x},${y}) scale(${s})">
        <path fill-rule="evenodd" d="M200,60 h28 a62,62 0 0 1 0,124 h-28 v-30 h28 a32,32 0 0 0 0,-64 h-28 z" fill="${dark}"/>
        <path d="M0,20 h220 v190 a40,40 0 0 1 -40,40 h-140 a40,40 0 0 1 -40,-40 z" fill="${body}"/>
        <path d="M110,20 h110 v190 a40,40 0 0 1 -40,40 h-70 z" fill="${dark}" opacity="0.35"/>
        <ellipse cx="110" cy="20" rx="110" ry="20" fill="${light}"/>
        <ellipse cx="110" cy="22" rx="94" ry="14" fill="#6b4a33"/>
        <rect x="20" y="56" width="14" height="150" rx="7" fill="${light}" opacity="0.7"/>
      </g>`
    return mug(90, 220, 1.05, mix(c, -0.35), mix(c, -0.1), mix(c, -0.6)) + mug(250, 290, 1.05, c, d, l)
  },

  teapot: ({ c, d, dd, l }) => `
    <path d="M150,380 C110,360 80,300 60,250 C90,260 110,290 140,320 Z" fill="${d}"/>
    <path fill-rule="evenodd" d="M430,300 a90,90 0 0 1 0,180 l-6,-34 a56,56 0 0 0 0,-112 z" fill="${d}"/>
    <ellipse cx="300" cy="400" rx="170" ry="150" fill="${c}"/>
    <path d="M300,250 a170,150 0 0 1 0,300 z" fill="${d}" opacity="0.35"/>
    <rect x="190" y="530" width="220" height="30" rx="14" fill="${dd}"/>
    <ellipse cx="300" cy="262" rx="110" ry="22" fill="${d}"/>
    <path d="M214,262 Q300,190 386,262 Z" fill="${c}"/>
    <circle cx="300" cy="206" r="20" fill="${dd}"/>
    <path d="M190,360 Q200,310 240,290" fill="none" stroke="${l}" stroke-width="18" stroke-linecap="round" opacity="0.8"/>
    <rect x="130" y="398" width="340" height="14" rx="7" fill="${dd}" opacity="0.4"/>`,

  serum: ({ c, d, dd, l }) => `
    <rect x="270" y="90" width="60" height="150" rx="30" fill="${INK}"/>
    <rect x="282" y="104" width="12" height="90" rx="6" fill="#fff" opacity="0.2"/>
    <rect x="250" y="226" width="100" height="56" rx="10" fill="${GOLD}"/>
    <rect x="250" y="226" width="30" height="56" rx="8" fill="#fff" opacity="0.25"/>
    <path d="M226,300 Q226,280 250,280 h100 Q374,280 374,300 L384,330 V530 Q384,560 354,560 H246 Q216,560 216,530 V330 Z" fill="${c}"/>
    <path d="M300,280 h50 Q374,280 374,300 L384,330 V530 Q384,560 354,560 H300 Z" fill="${d}" opacity="0.45"/>
    <rect x="236" y="380" width="128" height="110" rx="8" fill="${CREAM}"/>
    <rect x="258" y="412" width="84" height="10" rx="5" fill="${INK}" opacity="0.75"/>
    <rect x="272" y="436" width="56" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="230" y="318" width="12" height="50" rx="6" fill="${l}" opacity="0.8"/>
    <rect x="230" y="500" width="12" height="36" rx="6" fill="${l}" opacity="0.6"/>`,

  cream: ({ c, d, l }) => `
    <rect x="150" y="340" width="300" height="220" rx="40" fill="${c}"/>
    <path d="M300,340 h110 a40,40 0 0 1 40,40 v140 a40,40 0 0 1 -40,40 h-110 z" fill="${d}" opacity="0.35"/>
    <rect x="140" y="270" width="320" height="96" rx="26" fill="${d}"/>
    <rect x="140" y="270" width="320" height="40" rx="20" fill="${mix(d, -0.25)}"/>
    <rect x="182" y="410" width="236" height="90" rx="10" fill="${CREAM}"/>
    <rect x="232" y="438" width="136" height="10" rx="5" fill="${INK}" opacity="0.75"/>
    <rect x="256" y="462" width="88" height="7" rx="3.5" fill="${INK}" opacity="0.35"/>
    <rect x="168" y="372" width="14" height="160" rx="7" fill="${l}" opacity="0.7"/>`,

  perfume: ({ c, d, l }) => `
    <rect x="248" y="150" width="104" height="96" rx="12" fill="${GOLD}"/>
    <rect x="248" y="150" width="34" height="96" rx="10" fill="#fff" opacity="0.25"/>
    <rect x="276" y="240" width="48" height="36" fill="${mix(GOLD, 0.2)}"/>
    <rect x="170" y="270" width="260" height="290" rx="34" fill="${l}"/>
    <rect x="190" y="320" width="220" height="222" rx="24" fill="${c}"/>
    <path d="M300,320 h86 a24,24 0 0 1 24,24 v174 a24,24 0 0 1 -24,24 h-86 z" fill="${d}" opacity="0.4"/>
    <rect x="236" y="400" width="128" height="64" rx="6" fill="${CREAM}" opacity="0.92"/>
    <rect x="262" y="424" width="76" height="9" rx="4.5" fill="${INK}" opacity="0.7"/>
    <rect x="188" y="290" width="16" height="230" rx="8" fill="#fff" opacity="0.55"/>`,

  yogamat: ({ c, d, dd, l }) => `
    <rect x="90" y="330" width="380" height="200" rx="100" fill="${c}"/>
    <rect x="90" y="330" width="380" height="60" rx="30" fill="${l}" opacity="0.55"/>
    <rect x="370" y="330" width="100" height="200" fill="${c}"/>
    <ellipse cx="470" cy="430" rx="60" ry="100" fill="${d}"/>
    <ellipse cx="470" cy="430" rx="44" ry="78" fill="${c}"/>
    <ellipse cx="470" cy="430" rx="30" ry="56" fill="${d}"/>
    <ellipse cx="470" cy="430" rx="16" ry="32" fill="${dd}"/>
    <rect x="190" y="322" width="30" height="216" rx="8" fill="${INK}" opacity="0.8"/>
    <rect x="330" y="322" width="30" height="216" rx="8" fill="${INK}" opacity="0.8"/>
    <path d="M205,322 Q275,230 345,322" fill="none" stroke="${INK}" stroke-width="12" opacity="0.8"/>
    <path d="M500,520 q60,10 70,40 h-90 z" fill="${d}"/>`,

  bottle: ({ c, d, dd, l }) => `
    <path fill-rule="evenodd" d="M262,80 h76 a30,30 0 0 1 0,60 h-76 a30,30 0 0 1 0,-60 z M270,100 v20 h60 v-20 z" fill="${dd}"/>
    <rect x="250" y="120" width="100" height="80" rx="18" fill="${dd}"/>
    <rect x="254" y="196" width="92" height="20" fill="${d}"/>
    <rect x="220" y="210" width="160" height="350" rx="56" fill="${c}"/>
    <path d="M300,210 h24 a56,56 0 0 1 56,56 v238 a56,56 0 0 1 -56,56 h-24 z" fill="${d}" opacity="0.4"/>
    <rect x="220" y="380" width="160" height="40" fill="${d}" opacity="0.6"/>
    <rect x="240" y="236" width="16" height="130" rx="8" fill="${l}" opacity="0.8"/>`,

  dumbbell: ({ c, d, dd, l }) => {
    const bell = (y: number, body: string, dark: string, light: string) => `
      <rect x="190" y="${y + 70}" width="220" height="40" rx="12" fill="${METAL}"/>
      <rect x="190" y="${y + 70}" width="220" height="12" rx="6" fill="#fff" opacity="0.5"/>
      <rect x="100" y="${y}" width="96" height="180" rx="34" fill="${dark}"/>
      <rect x="110" y="${y}" width="80" height="172" rx="30" fill="${body}"/>
      <rect x="404" y="${y}" width="96" height="180" rx="34" fill="${dark}"/>
      <rect x="410" y="${y}" width="80" height="172" rx="30" fill="${body}"/>
      <rect x="124" y="${y + 18}" width="14" height="110" rx="7" fill="${light}" opacity="0.7"/>
      <rect x="424" y="${y + 18}" width="14" height="110" rx="7" fill="${light}" opacity="0.7"/>`
    return bell(200, mix(c, 0.12), dd, l) + bell(380, c, d, l)
  },

  hoodie: ({ c, d, dd, l }) => `
    <path d="M200,130 Q300,70 400,130 L430,200 L170,200 Z" fill="${d}"/>
    <path d="M190,150 L90,230 L56,510 L130,520 L160,330 L160,560 L440,560 L440,330 L470,520 L544,510 L510,230 L410,150 Q300,240 190,150 Z" fill="${c}"/>
    <path d="M410,150 L510,230 L544,510 L500,515 L470,300 Z" fill="${d}" opacity="0.3"/>
    <path d="M220,150 Q300,230 380,150 Q300,200 220,150 Z" fill="${dd}"/>
    <rect x="160" y="526" width="280" height="34" rx="8" fill="${d}"/>
    <rect x="56" y="490" width="76" height="30" rx="8" fill="${d}" transform="rotate(4 94 505)"/>
    <rect x="468" y="490" width="76" height="30" rx="8" fill="${d}" transform="rotate(-4 506 505)"/>
    <path d="M210,400 h180 l20,110 h-220 z" fill="${d}" opacity="0.55"/>
    <rect x="272" y="196" width="6" height="90" rx="3" fill="${l}"/>
    <rect x="322" y="196" width="6" height="90" rx="3" fill="${l}"/>
    <rect x="180" y="230" width="16" height="160" rx="8" fill="${l}" opacity="0.5"/>`,

  backpack: ({ c, d, dd, l }) => `
    <path fill-rule="evenodd" d="M240,150 Q240,90 300,90 Q360,90 360,150 h-26 Q334,116 300,116 Q266,116 266,150 z" fill="${dd}"/>
    <rect x="140" y="230" width="40" height="250" rx="20" fill="${dd}"/>
    <rect x="420" y="230" width="40" height="250" rx="20" fill="${dd}"/>
    <path d="M170,250 Q170,140 300,140 Q430,140 430,250 V530 Q430,560 400,560 H200 Q170,560 170,530 Z" fill="${c}"/>
    <path d="M300,140 Q430,140 430,250 V530 Q430,560 400,560 H300 Z" fill="${d}" opacity="0.3"/>
    <path d="M190,250 Q190,170 300,166 Q410,170 410,250 Q300,290 190,250 Z" fill="${d}"/>
    <rect x="210" y="360" width="180" height="150" rx="30" fill="${d}"/>
    <rect x="210" y="360" width="180" height="20" rx="10" fill="${dd}"/>
    <rect x="290" y="384" width="20" height="40" rx="6" fill="${GOLD}"/>
    <rect x="190" y="270" width="14" height="80" rx="7" fill="${l}" opacity="0.7"/>`,

  sunglasses: ({ c, d, l }) => `
    <path d="M60,260 Q60,236 90,236 H510 Q540,236 540,260 V280 H60 Z" fill="${d}"/>
    <path d="M70,250 h190 v80 a90,90 0 0 1 -90,90 h-10 a90,90 0 0 1 -90,-90 z" fill="${c}"/>
    <path d="M340,250 h190 v80 a90,90 0 0 1 -90,90 h-10 a90,90 0 0 1 -90,-90 z" fill="${c}"/>
    <path d="M90,270 h150 v58 a70,70 0 0 1 -70,70 h-10 a70,70 0 0 1 -70,-70 z" fill="#3d3a36"/>
    <path d="M360,270 h150 v58 a70,70 0 0 1 -70,70 h-10 a70,70 0 0 1 -70,-70 z" fill="#3d3a36"/>
    <path d="M110,290 l60,0 l-50,80 q-10,-30 -10,-50 z" fill="#fff" opacity="0.18"/>
    <path d="M380,290 l60,0 l-50,80 q-10,-30 -10,-50 z" fill="#fff" opacity="0.18"/>
    <path d="M260,262 Q300,236 340,262 v20 Q300,258 260,282 Z" fill="${d}"/>
    <rect x="70" y="244" width="460" height="10" rx="5" fill="${l}" opacity="0.7"/>`,

  watch: ({ c, d, dd, l }) => `
    <rect x="236" y="70" width="128" height="220" rx="24" fill="${d}"/>
    <rect x="236" y="320" width="128" height="230" rx="24" fill="${d}"/>
    <rect x="248" y="70" width="40" height="480" rx="20" fill="${c}" opacity="0.7"/>
    ${[410, 450, 490].map((y) => `<circle cx="300" cy="${y}" r="7" fill="${dd}"/>`).join('')}
    <rect x="418" y="286" width="26" height="40" rx="8" fill="${mix(GOLD, 0.15)}"/>
    <circle cx="300" cy="306" r="130" fill="${mix(GOLD, 0.15)}"/>
    <circle cx="300" cy="306" r="130" fill="${GOLD}" transform="translate(-6,-6)" opacity="0.9"/>
    <circle cx="296" cy="302" r="108" fill="${CREAM}"/>
    ${Array.from({ length: 12 }, (_, i) => `<rect x="293" y="206" width="6" height="${i % 3 === 0 ? 22 : 12}" rx="3" fill="${INK}" opacity="0.7" transform="rotate(${i * 30} 296 302)"/>`).join('')}
    <rect x="292" y="236" width="8" height="70" rx="4" fill="${INK}" transform="rotate(-50 296 302)"/>
    <rect x="293" y="216" width="6" height="90" rx="3" fill="${INK}" transform="rotate(60 296 302)"/>
    <circle cx="296" cy="302" r="9" fill="${GOLD}"/>
    <path d="M220,240 a108,108 0 0 1 60,-44" fill="none" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity="0.7"/>`,

  sneaker: ({ c, d, dd, l }) => `<g transform="translate(-60,-20) scale(1.12)">
    <path d="M240,338 Q246,286 292,288 Q314,296 316,350 Z" fill="${d}"/>
    <path d="M110,470 C98,420 104,370 120,340 Q150,318 200,326 Q236,350 270,340 L330,350 Q420,368 480,398 Q540,428 548,470 Z" fill="${c}"/>
    <path d="M110,470 C98,420 104,370 120,340 Q150,318 200,326 Q220,340 236,346 L150,470 Z" fill="${d}" opacity="0.4"/>
    <path d="M108,400 Q104,360 122,336 L148,330 Q134,370 138,410 Z" fill="${dd}"/>
    <path d="M470,394 Q540,428 548,470 L488,470 Q486,430 470,394 Z" fill="${d}" opacity="0.5"/>
    ${[0, 1, 2].map((i) => `<rect x="${292 + i * 40}" y="${334 + i * 11}" width="12" height="40" rx="6" fill="${l}" transform="rotate(-24 ${298 + i * 40} ${354 + i * 11})"/>`).join('')}
    <path d="M180,446 Q300,402 432,410 L428,430 Q300,424 196,464 Z" fill="${dd}" opacity="0.55"/>
    <rect x="96" y="462" width="462" height="44" rx="20" fill="#efe8dc"/>
    <rect x="96" y="494" width="462" height="22" rx="11" fill="#c9a77a"/>
    <rect x="124" y="474" width="406" height="5" rx="2.5" fill="#d8cdbb"/>
  </g>`,

  knives: ({ c, d, l }) => `
    ${[
      [222, -14, 210],
      [268, -6, 170],
      [314, 2, 190],
      [360, 10, 160],
    ]
      .map(
        ([x, r, top]) => `<g transform="rotate(${r} ${x} 300)">
        <rect x="${x - 16}" y="${top}" width="34" height="${300 - top}" rx="14" fill="${INK}"/>
        <rect x="${x - 10}" y="${top + 12}" width="8" height="${270 - top}" rx="4" fill="#fff" opacity="0.15"/>
        <circle cx="${x + 1}" cy="${top + 30}" r="4" fill="${METAL}"/>
        <circle cx="${x + 1}" cy="${top + 64}" r="4" fill="${METAL}"/>
      </g>`,
      )
      .join('')}
    <path d="M170,560 L206,290 L420,290 L470,560 Z" fill="${c}"/>
    <path d="M206,290 L420,290 L432,330 L200,330 Z" fill="${d}"/>
    <path d="M330,330 L432,330 L470,560 L360,560 Z" fill="${d}" opacity="0.35"/>
    <path d="M200,350 l-22,190" stroke="${l}" stroke-width="12" stroke-linecap="round" opacity="0.6"/>
    <path d="M250,400 q40,-10 80,0 M240,460 q60,-12 120,0 M232,516 q70,-12 140,0" fill="none" stroke="${d}" stroke-width="4" opacity="0.45"/>`,
}

/** Un objet dans sa boîte 600×600, avec son ombre portée. */
const object = (shape: Shape, color: string, transform = '') => {
  const tones: Tones = { c: color, d: mix(color, 0.16), dd: mix(color, 0.32), l: mix(color, -0.45) }
  return `<g transform="${transform}">
    <ellipse cx="300" cy="566" rx="230" ry="22" fill="#26232b" opacity="0.08"/>
    ${DRAW[shape](tones)}
  </g>`
}

const toJpeg = (svg: string) => sharp(Buffer.from(svg)).jpeg({ quality: 88 }).toBuffer()

const background = (width: number, height: number, bg: string | [string, string]) => {
  if (typeof bg === 'string') return `<rect width="${width}" height="${height}" fill="${bg}"/>`
  const id = `bg${uid++}`
  return `<defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/>
    </linearGradient></defs>
    <rect width="${width}" height="${height}" fill="url(#${id})"/>`
}

/** Photo produit 800×1000 (format 4:5). */
export const productImage = (shape: Shape, color: string, bg = '#fff6f2') =>
  toJpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
    ${background(800, 1000, bg)}
    <circle cx="400" cy="490" r="350" fill="#fff" opacity="0.35"/>
    ${object(shape, color, 'translate(70,150) scale(1.1)')}
  </svg>`)

/** Positions (dans un canevas virtuel 1200×1000) selon le nombre d'objets. */
const LAYOUTS: Record<number, { x: number; y: number; s: number }[]> = {
  1: [{ x: 225, y: 100, s: 1.25 }],
  2: [
    { x: 130, y: 170, s: 1.05 },
    { x: 610, y: 330, s: 0.8 },
  ],
  3: [
    { x: 300, y: 130, s: 1.0 },
    { x: 40, y: 380, s: 0.72 },
    { x: 728, y: 380, s: 0.72 },
  ],
}

/** Composition centrée de 1 à 3 objets, mise à l'échelle dans width × height. */
const composition = (width: number, height: number, pieces: [Shape, string][]) => {
  const layout = LAYOUTS[Math.min(3, Math.max(1, pieces.length))]
  const k = Math.min(width / 1200, height / 1000)
  const ox = (width - 1200 * k) / 2
  const oy = (height - 1000 * k) / 2
  return `<g transform="translate(${ox},${oy}) scale(${k})">
    <circle cx="600" cy="500" r="420" fill="#fff" opacity="0.4"/>
    ${pieces
      .slice(0, 3)
      .map(([shape, color], i) => object(shape, color, `translate(${layout[i].x},${layout[i].y}) scale(${layout[i].s})`))
      .join('')}
  </g>`
}

/** Visuel du hero 1200×1000, affiché dans un panneau arrondi : objets centrés. */
export const heroImage = (bg: [string, string], pieces: [Shape, string][]) =>
  toJpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1000" viewBox="0 0 1200 1000">
    ${background(1200, 1000, bg)}
    ${composition(1200, 1000, pieces)}
  </svg>`)

/** Visuel carré ou paysage pour catégories / collections / promo. */
export const sceneImage = (width: number, height: number, bg: string | [string, string], pieces: [Shape, string][]) =>
  toJpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
    ${background(width, height, bg)}
    ${composition(width, height, pieces)}
  </svg>`)

/** Avatar rond avec initiales. */
export const avatarImage = (initials: string, bg: string) =>
  toJpeg(`<svg xmlns="http://www.w3.org/2000/svg" width="400" height="400" viewBox="0 0 400 400">
    <rect width="400" height="400" fill="${bg}"/>
    <circle cx="320" cy="80" r="120" fill="#fff" opacity="0.15"/>
    <text x="200" y="246" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="140" fill="#fff">${initials}</text>
  </svg>`)
