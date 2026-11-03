"use client";

import type { ReactNode } from "react";

/**
 * The dark "strata" look of the guest menu: every category sits on its own
 * very dark tone, with one large faint line drawing behind the list.
 * The tone and the drawing are picked from the category name.
 */

type PropKind =
  | "coffee"
  | "tea"
  | "cold"
  | "dessert"
  | "icecream"
  | "breakfast"
  | "pizza"
  | "burger"
  | "sandwich"
  | "roll"
  | "momos"
  | "noodles"
  | "soup"
  | "pasta"
  | "rice"
  | "starter"
  | "fries"
  | "salad"
  | "plate";

const KIND_TONE: Record<Exclude<PropKind, "plate">, string> = {
  coffee: "#1b1612", // espresso
  tea: "#131a15", // moss
  cold: "#111820", // slate blue
  dessert: "#1a1319", // plum
  icecream: "#151427", // indigo
  breakfast: "#101a1a", // teal
  pizza: "#231312", // tomato
  burger: "#1f1218", // wine
  sandwich: "#191a10", // olive
  roll: "#21160f", // paprika
  momos: "#1c1517", // rose ash
  noodles: "#0f1b21", // steel cyan
  soup: "#221a0f", // saffron
  pasta: "#1f1710", // terracotta
  rice: "#111b14", // pine
  starter: "#19161d", // graphite violet
  fries: "#1f1b10", // golden dark
  salad: "#121c12", // leaf
};

// Categories that match no drawing rotate through these.
const PLATE_TONES = ["#161618", "#1c1512", "#14171c"];

// The first rule that matches the category name wins, so the specific ones
// come first ("Cold coffee" is a cold drink, "Egg roll" is a roll).
const RULES: [PropKind, RegExp][] = [
  ["icecream", /ice ?cream|gelato|kulfi|sundae|scoop/],
  ["dessert", /dessert|cake|sweet|brownie|pudding|waffle|donut|doughnut/],
  ["pizza", /pizza|calzone/],
  ["burger", /burger|slider/],
  ["sandwich", /sandwich|panini|toastie|\bsub\b/],
  ["roll", /\brolls?\b|wrap|shawarma|kathi|frankie|burrito|taco/],
  ["momos", /momo|dumpling|dim ?sum|gyoza|wonton/],
  [
    "noodles",
    /noodle|maggi|ramen|chow ?mein|hakka|udon|thukpa|chinese|oriental|asian|thai/,
  ],
  ["soup", /soup|broth|shorba|stew/],
  ["pasta", /pasta|spaghetti|penne|lasagn|macaroni|italian/],
  ["rice", /rice|biryani|pulao|thali|main ?course|curry|meals?\b|combo/],
  ["starter", /starter|appetizer|appetiser|kebab|tikka|skewer|tandoor|bbq/],
  ["fries", /fries|snack|chips|nugget|pakora|bites|sides|crispy/],
  ["salad", /salad|healthy|greens/],
  ["breakfast", /breakfast|bakery|brunch|croissant|toast|bread|egg|pastr/],
  ["cold", /cold|iced|juice|shake|smoothie|mocktail|lemonade|soda|cooler|fizz/],
  ["tea", /tea|chai|kahwa|matcha|infusion/],
  ["coffee", /coffee|espresso|latte|cappuc|brew|mocha|hot|cafe|café/],
  ["cold", /beverage|drink|refresh/],
];

function propKindFor(name: string): PropKind {
  const n = name.toLowerCase();

  for (const [kind, pattern] of RULES) {
    if (pattern.test(n)) return kind;
  }

  return "plate";
}

export function toneFor(name: string, index: number) {
  const kind = propKindFor(name);

  return kind === "plate"
    ? PLATE_TONES[Math.abs(index) % PLATE_TONES.length]
    : KIND_TONE[kind];
}

/** Steam rising from something hot. `dy` moves it down for lower objects. */
function Steam({
  xs = [85, 100, 115],
  dy = 0,
}: {
  xs?: number[];
  dy?: number;
}) {
  return (
    <g transform={`translate(0 ${dy})`}>
      {xs.map((x, i) => (
        <path
          key={x}
          className="menu-steam"
          style={{ animationDelay: `${i * 0.9}s` }}
          d={`M${x} 62Q${x - 7} 50 ${x} 40Q${x + 7} 30 ${x} 18`}
        />
      ))}
    </g>
  );
}

const PROPS: Record<PropKind, ReactNode> = {
  coffee: (
    <>
      <path d="M55 80H145V105Q145 145 100 145Q55 145 55 105Z" />
      <ellipse cx="100" cy="80" rx="45" ry="7" />
      <path d="M145 90H160Q175 90 175 107Q175 124 158 124H143" />
      <path d="M30 152Q100 172 170 152" />
      <Steam />
    </>
  ),
  tea: (
    <>
      <path d="M55 112Q55 72 100 72Q145 72 145 112Q145 152 100 152Q55 152 55 112Z" />
      <path d="M85 72Q100 56 115 72" />
      <circle cx="100" cy="50" r="5" />
      <path d="M145 102Q168 97 172 77L179 80Q176 112 145 122" />
      <path d="M55 96Q28 96 28 116Q28 136 55 133" />
      <path d="M68 152H132" />
      <path d="M80 112H120" />
      <path className="menu-steam" d="M172 66Q166 56 172 46Q178 36 172 26" />
    </>
  ),
  cold: (
    <>
      <path d="M65 58H135L126 160Q125 168 117 168H83Q75 168 74 160Z" />
      <path d="M69 80H131" />
      <path d="M86 96L102 92L106 108L90 112Z" />
      <path d="M108 124L124 128L120 144L104 140Z" />
      <path d="M114 20L126 60" />
      <path d="M121 18L133 58" />
      <circle cx="136" cy="62" r="13" />
      <path d="M136 49V75M123 62H149" />
    </>
  ),
  dessert: (
    <>
      <path d="M45 152H155V116H45Z" />
      <path d="M45 116L100 86L155 116" />
      <path d="M45 134H155" />
      <circle cx="100" cy="78" r="8" />
      <path d="M100 70Q104 56 114 52" />
      <path d="M30 160H170" />
    </>
  ),
  icecream: (
    <>
      <path d="M70 104L100 176L130 104" />
      <path d="M78 120L112 154" />
      <path d="M122 120L88 154" />
      <path d="M74 112H126" />
      <path d="M66 104Q58 62 100 58Q142 62 134 104Z" />
      <path d="M66 104Q76 114 86 104Q96 116 106 104Q116 114 126 104Q130 108 134 104" />
      <circle cx="100" cy="48" r="7" />
      <path d="M100 41Q104 28 114 24" />
    </>
  ),
  breakfast: (
    <>
      <path d="M84 66Q100 52 116 66Q122 96 100 122Q78 96 84 66Z" />
      <g>
        <path d="M50 84Q66 66 84 72Q80 104 62 124Q44 110 50 84Z" />
        <path d="M24 130Q28 106 50 98Q58 114 46 136Q30 142 24 130Z" />
      </g>
      <g transform="translate(200 0) scale(-1 1)">
        <path d="M50 84Q66 66 84 72Q80 104 62 124Q44 110 50 84Z" />
        <path d="M24 130Q28 106 50 98Q58 114 46 136Q30 142 24 130Z" />
      </g>
      <path d="M30 160H170" />
    </>
  ),
  pizza: (
    <>
      <circle cx="100" cy="100" r="64" />
      <circle cx="100" cy="100" r="54" />
      <path d="M100 46V154" />
      <path d="M46 100H154" />
      <path d="M62 62L138 138" />
      <path d="M138 62L62 138" />
      <circle cx="80" cy="74" r="7" />
      <circle cx="124" cy="80" r="7" />
      <circle cx="126" cy="124" r="7" />
      <circle cx="76" cy="126" r="7" />
    </>
  ),
  burger: (
    <>
      <path d="M45 95Q45 55 100 55Q155 55 155 95Z" />
      <path d="M80 72l5 2M105 66l5 2M126 78l5 2M92 84l5 2" />
      <path d="M42 104Q55 114 68 104Q81 114 94 104Q107 114 120 104Q133 114 146 104Q152 108 158 104" />
      <path d="M48 112H152Q158 112 158 120Q158 128 152 128H48Q42 128 42 120Q42 112 48 112Z" />
      <path d="M48 130L68 144L88 130L108 144L128 130L148 144" />
      <path d="M45 150H155Q155 170 135 170H65Q45 170 45 150Z" />
    </>
  ),
  sandwich: (
    <>
      <path d="M50 68Q50 58 60 58H140Q150 58 150 68V82H50Z" />
      <path d="M46 92Q58 102 70 92Q82 102 94 92Q106 102 118 92Q130 102 142 92Q148 96 154 92" />
      <path d="M52 108H148" />
      <path d="M50 120Q50 112 60 112H140Q150 112 150 120V136Q150 144 140 144H60Q50 144 50 136Z" />
      <path d="M100 58V28" />
      <circle cx="100" cy="22" r="7" />
      <path d="M30 156H170" />
    </>
  ),
  roll: (
    <g transform="rotate(-22 100 100)">
      <path d="M36 100Q36 76 60 76H148Q168 76 168 100Q168 124 148 124H60Q36 124 36 100Z" />
      <path d="M148 76Q132 100 148 124" />
      <path d="M168 90Q150 84 158 76M168 110Q150 116 158 124" />
      <path d="M72 76Q82 100 72 124" />
      <path d="M104 76Q114 100 104 124" />
    </g>
  ),
  momos: (
    <>
      <g transform="translate(20 60)">
        <path d="M0 40Q0 0 40 0Q80 0 80 40Z" />
        <path d="M22 3L20 20M32 1L32 20M42 1L44 20M52 3L56 20" />
      </g>
      <g transform="translate(100 60)">
        <path d="M0 40Q0 0 40 0Q80 0 80 40Z" />
        <path d="M22 3L20 20M32 1L32 20M42 1L44 20M52 3L56 20" />
      </g>
      <g transform="translate(60 106)">
        <path d="M0 40Q0 0 40 0Q80 0 80 40Z" />
        <path d="M22 3L20 20M32 1L32 20M42 1L44 20M52 3L56 20" />
      </g>
      <Steam xs={[70, 130]} dy={-8} />
    </>
  ),
  noodles: (
    <>
      <path d="M40 104H160Q160 164 100 164Q40 164 40 104Z" />
      <path d="M62 104Q66 82 80 98Q92 112 100 92Q110 74 122 98Q128 108 140 100" />
      <path d="M58 98Q64 76 78 92" />
      <path d="M150 26L108 98" />
      <path d="M164 32L120 102" />
      <path d="M72 164H128" />
      <Steam xs={[70, 90]} dy={22} />
    </>
  ),
  soup: (
    <>
      <path d="M40 106H160Q160 166 100 166Q40 166 40 106Z" />
      <path d="M44 118H156" />
      <path d="M72 166H128" />
      <path d="M160 36L128 100" />
      <ellipse
        cx="122"
        cy="108"
        rx="13"
        ry="8"
        transform="rotate(-63 122 108)"
      />
      <Steam xs={[68, 88]} dy={28} />
    </>
  ),
  pasta: (
    <>
      <path d="M30 112Q30 152 100 152Q170 152 170 112Z" />
      <path d="M30 112H170" />
      <path d="M62 112Q62 78 100 78Q138 78 138 112" />
      <path d="M74 112Q74 92 100 92Q126 92 126 112" />
      <path d="M86 112Q86 104 100 104Q114 104 114 112" />
      <circle cx="136" cy="104" r="7" />
      <path d="M156 28V74M149 28V58Q149 68 156 68Q163 68 163 58V28M156 74V124" />
    </>
  ),
  rice: (
    <>
      <path d="M44 108H156Q156 168 100 168Q44 168 44 108Z" />
      <path d="M54 108Q58 64 100 64Q142 64 146 108" />
      <path d="M84 86l6 2M104 78l6 2M116 94l6 2M92 100l6 2M72 98l6 2" />
      <path d="M26 58L132 36" />
      <path d="M32 74L138 50" />
      <path d="M76 168H124" />
    </>
  ),
  starter: (
    <g transform="rotate(-40 100 100)">
      <path d="M22 100H182" />
      <path d="M52 90Q52 87 55 87H75Q78 87 78 90V110Q78 113 75 113H55Q52 113 52 110Z" />
      <circle cx="97" cy="100" r="13" />
      <path d="M116 90Q116 87 119 87H139Q142 87 142 90V110Q142 113 139 113H119Q116 113 116 110Z" />
      <circle cx="161" cy="100" r="13" />
    </g>
  ),
  fries: (
    <>
      <path d="M58 104H142L132 168H68Z" />
      <path d="M86 130H114" />
      <path d="M66 104V62H76V104" />
      <path d="M78 104V48H88V104" />
      <path d="M90 104V68H100V104" />
      <path d="M102 104V44H112V104" />
      <path d="M114 104V64H124V104" />
      <path d="M126 104V56H136V104" />
    </>
  ),
  salad: (
    <>
      <path d="M40 112H160Q160 168 100 168Q40 168 40 112Z" />
      <path d="M58 112Q52 80 84 70Q96 104 58 112" />
      <path d="M100 110Q94 70 126 60Q136 98 100 110" />
      <path d="M122 112Q126 90 150 86Q152 108 122 112" />
      <circle cx="76" cy="124" r="6" />
      <circle cx="116" cy="130" r="6" />
    </>
  ),
  plate: (
    <>
      <circle cx="104" cy="100" r="56" />
      <circle cx="104" cy="100" r="38" />
      <path d="M26 56V104" />
      <path d="M18 56V80Q18 90 26 90Q34 90 34 80V56" />
      <path d="M26 104V150" />
      <path d="M182 56Q196 80 182 104V150" />
    </>
  ),
};

function PropDrawing({ kind }: { kind: PropKind }) {
  return (
    <svg
      viewBox="0 0 200 200"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-full w-full"
    >
      {PROPS[kind]}
    </svg>
  );
}

/**
 * A fixed full-screen layer behind the page. It sits at -z-10, so the page
 * itself needs `isolate` (or its own stacking context) around it.
 */
export default function MenuBackdrop({
  name,
  index,
}: {
  name: string;
  index: number;
}) {
  const kind = propKindFor(name);

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 overflow-hidden transition-colors duration-700"
      style={{ backgroundColor: toneFor(name, index) }}
    >
      <div
        key={kind}
        className="menu-prop absolute -right-16 bottom-8 h-80 w-80 text-[#ece9e1]/12 sm:h-104 sm:w-104 lg:right-[8%]"
      >
        <PropDrawing kind={kind} />
      </div>
    </div>
  );
}
