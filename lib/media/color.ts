/**
 * Normalize arbitrary color strings to 6-digit uppercase hex (#RRGGBB).
 * Returns null for anything we can't confidently convert.
 *
 * Claude Vision sometimes returns colors as:
 *   "#FFF"             3-digit hex
 *   "#ffddee"          6-digit hex (lower/mixed case)
 *   "ffddee"           hex without #
 *   "rgb(255, 0, 0)"   CSS rgb
 *   "rgba(255,0,0,1)"  CSS rgba (alpha ignored)
 *   "red"              CSS named color (best-effort via a small table)
 */
const NAMED_COLORS: Record<string, string> = {
  black: "#000000",
  white: "#FFFFFF",
  red: "#FF0000",
  green: "#008000",
  lime: "#00FF00",
  blue: "#0000FF",
  yellow: "#FFFF00",
  cyan: "#00FFFF",
  magenta: "#FF00FF",
  silver: "#C0C0C0",
  gray: "#808080",
  grey: "#808080",
  maroon: "#800000",
  olive: "#808000",
  purple: "#800080",
  teal: "#008080",
  navy: "#000080",
  orange: "#FFA500",
  pink: "#FFC0CB",
  brown: "#A52A2A",
  beige: "#F5F5DC",
  gold: "#FFD700",
  tan: "#D2B48C",
  khaki: "#F0E68C",
  ivory: "#FFFFF0",
  coral: "#FF7F50",
  salmon: "#FA8072",
  indigo: "#4B0082",
  violet: "#EE82EE",
  crimson: "#DC143C",
  turquoise: "#40E0D0",
};

function clampByte(n: number): number {
  if (Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(255, Math.round(n)));
}

function toHex2(n: number): string {
  return clampByte(n).toString(16).padStart(2, "0").toUpperCase();
}

export function normalizeHexColor(raw: string): string | null {
  if (!raw || typeof raw !== "string") return null;
  const s = raw.trim().toLowerCase();
  if (!s) return null;

  // Named color
  if (NAMED_COLORS[s]) return NAMED_COLORS[s];

  // rgb() / rgba()
  const rgbMatch = s.match(
    /^rgba?\s*\(\s*(\d{1,3})\s*[, ]\s*(\d{1,3})\s*[, ]\s*(\d{1,3})/
  );
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `#${toHex2(Number(r))}${toHex2(Number(g))}${toHex2(Number(b))}`;
  }

  // Hex variants
  const hex = s.replace(/^#/, "");
  if (/^[0-9a-f]{3}$/.test(hex)) {
    const [r, g, b] = hex;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  if (/^[0-9a-f]{6}$/.test(hex)) {
    return `#${hex.toUpperCase()}`;
  }
  if (/^[0-9a-f]{8}$/.test(hex)) {
    // 8-digit hex — drop alpha
    return `#${hex.slice(0, 6).toUpperCase()}`;
  }

  return null;
}

export function normalizeHexColors(raw: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of raw) {
    const n = normalizeHexColor(s);
    if (n && !seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}
