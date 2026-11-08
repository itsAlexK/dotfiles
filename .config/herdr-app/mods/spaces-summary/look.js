// How the Spaces list looks: one choice of several complete looks. Every look keeps
// the list's rules (nothing hides on its own; each space distinct from the next);
// they differ only in paint. LOOK picks one.
//
// card    a space's card: bg "hue" (its color) / "surface" / null, its alpha,
//         border (px, null for none), left accent bar (px) and its alpha, an inset
//         pill instead ({w, inset, alpha}: a short rounded mark at the left edge),
//         radius, gap below, padding inside (px, top and bottom).
// avatar  "tint": its letter in its color on a faint tile; "solid": a white
//         letter on its color; "ring": its letter in a ring of its color;
//         "ringfill": a 1 px ring on a faint fill; "squarering": a rounded square
//         with a ring (ringAlpha, ringWidth px) on a faint fill; letter: its size.
// guide   the line its tabs hang from: "hue", "neutral" or "faint", its width.
// name    a space name's size and weight.
// machine a machine header's text size, weight, color ("dim" or "muted") and the
//         space above each one after the first.

export const LOOKS = {
  // Tinted cards: each space's card in a faint tint of its color.
  a: { card: { bg: "hue", alpha: "0d", border: null, bar: 0, radius: 9, gap: 4, pad: 0, padBottom: 2 }, avatar: "tint", guide: { color: "hue", alpha: "66", width: 1.5 }, name: { size: 13.5, weight: "semibold" } },
  // Accent rail: no fill; a bar in the space's color down the card's left edge.
  b: { card: { bg: null, alpha: null, border: null, bar: 2.5, radius: 3, gap: 8, pad: 0, padBottom: 2 }, avatar: "ring", guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13, weight: "semibold" } },
  // Soft panels: neutral raised panels with a hairline border; color in a solid avatar.
  c: { card: { bg: "surface", alpha: null, border: 1, bar: 0, radius: 10, gap: 6, pad: 2, padBottom: 2 }, avatar: "solid", guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" } },
  // b1 (round 11): b with an inset pill instead of the full bar, tinted avatars, tighter rhythm.
  b1: { card: { bg: null, alpha: null, border: null, bar: 0, pill: { w: 3, inset: 6, alpha: "99" }, radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "tint", guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" } },
  // b2 (round 11): b with a thinner, fainter bar and a fine ring on a faint fill.
  b2: { card: { bg: null, alpha: null, border: null, bar: 2, barAlpha: "8c", radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "ringfill", guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" } },
  // d1 (round 12, Claude's synthesis): a soft inset mark, a fine square ring, clearer machine headers.
  d1: { card: { bg: null, alpha: null, border: null, bar: 0, pill: { w: 3, inset: 8, alpha: "80" }, radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "squarering", ringAlpha: "99", guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" }, machine: { size: 11.5, weight: "medium", color: "muted", gapAbove: 6 } },
  // d2 (round 12, Codex's synthesis): a thin inset bar, a stronger fine square ring, a fainter guide.
  d2: { card: { bg: null, alpha: null, border: null, bar: 0, pill: { w: 2, inset: 4, alpha: "8c", radius: 1 }, radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "squarering", ringAlpha: "d9", guide: { color: "faint", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" }, machine: { size: 11.5, weight: "medium", color: "muted", gapAbove: 6 } },
  // d3 (round 12, Kiro's): a full, stronger bar, a heavier square ring and letter, tighter gaps.
  d3: { card: { bg: null, alpha: null, border: null, bar: 3, barAlpha: "e6", radius: 3, gap: 5, pad: 0, padBottom: 2 }, avatar: "squarering", ringAlpha: "d9", ringWidth: 2, letter: 11.5, guide: { color: "neutral", alpha: null, width: 1 }, name: { size: 13.5, weight: "semibold" }, machine: { size: 11.5, weight: "medium", color: "muted", gapAbove: 6 } },
  // e1 (round 13): d2 with the council's tweaks: a 65% inset bar, a softer ring on a
  // slightly fuller fill, an 18% guide.
  e1: { card: { bg: null, alpha: null, border: null, bar: 0, pill: { w: 2, inset: 6, alpha: "a6", radius: 1 }, radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "squarering", ringAlpha: "cc", ringFill: "1a", guide: { color: "faint", alpha: "2e", width: 1 }, name: { size: 13.5, weight: "semibold" }, machine: { size: 11.5, weight: "medium", color: "muted", gapAbove: 6 } },
  // e2 (round 13): d1 with Kiro's tweaks: a 70% 3 px mark, a 1.5 px ring and 11 px letter, a 1.5 px guide.
  e2: { card: { bg: null, alpha: null, border: null, bar: 0, pill: { w: 3, inset: 6, alpha: "b3" }, radius: 3, gap: 6, pad: 0, padBottom: 2 }, avatar: "squarering", ringAlpha: "c0", ringWidth: 1.5, letter: 11, guide: { color: "neutral", alpha: null, width: 1.5 }, name: { size: 13.5, weight: "semibold" }, machine: { size: 11.5, weight: "medium", color: "muted", gapAbove: 6 } },
};

export const LOOK = "e1";
export const look = () => LOOKS[LOOK] ?? LOOKS.a;
