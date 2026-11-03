"use client";

import type { ReactNode } from "react";

/**
 * The dark "strata" look of the guest menu: every category sits on its own
 * very dark tone, with one large faint line drawing behind the list.
 * The tone and the drawing are picked from the category name.
 */

type PropKind = "coffee" | "tea" | "cold" | "dessert" | "breakfast" | "plate";

const KIND_TONE: Record<Exclude<PropKind, "plate">, string> = {
  coffee: "#1b1612", // espresso
  tea: "#131a15", // moss
  cold: "#111820", // slate blue
  dessert: "#1a1319", // plum
  breakfast: "#101a1a", // teal
};

// Categories that match no drawing rotate through these.
const PLATE_TONES = ["#161618", "#1c1512", "#14171c"];

function propKindFor(name: string): PropKind {
  const n = name.toLowerCase();

  if (/dessert|cake|sweet|brownie|ice ?cream|pudding|gelato/.test(n)) {
    return "dessert";
  }
  if (/breakfast|bakery|brunch|croissant|toast|bread|egg|pastr/.test(n)) {
    return "breakfast";
  }
  if (
    /cold|iced|juice|shake|smoothie|mocktail|lemonade|soda|cooler|fizz/.test(n)
  ) {
    return "cold";
  }
  if (/tea|chai|kahwa|matcha|infusion/.test(n)) return "tea";
  if (/coffee|espresso|latte|cappuc|brew|mocha|hot|cafe|café/.test(n)) {
    return "coffee";
  }

  return "plate";
}

export function toneFor(name: string, index: number) {
  const kind = propKindFor(name);

  return kind === "plate"
    ? PLATE_TONES[Math.abs(index) % PLATE_TONES.length]
    : KIND_TONE[kind];
}

function Steam() {
  return (
    <>
      {[85, 100, 115].map((x, i) => (
        <path
          key={x}
          className="menu-steam"
          style={{ animationDelay: `${i * 0.9}s` }}
          d={`M${x} 62Q${x - 7} 50 ${x} 40Q${x + 7} 30 ${x} 18`}
        />
      ))}
    </>
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
  breakfast: (
    <>
      <path d="M40 132Q40 82 100 72Q160 82 160 132Q140 122 130 137Q115 120 100 137Q85 120 70 137Q60 122 40 132Z" />
      <path d="M70 137Q75 102 90 80" />
      <path d="M100 137V74" />
      <path d="M130 137Q125 102 110 80" />
      <path d="M30 158H170" />
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

/**
 * A fixed full-screen layer behind the page. Put the page content in a
 * wrapper with `relative z-10` so it sits above it.
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
      </div>
    </div>
  );
}
