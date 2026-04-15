/**
 * Catalog of visual styles a brand can pick from. Each style carries a
 * prompt fragment that gets folded into the image-generation prompt so
 * the model stops defaulting to generic AI illustration.
 *
 * Keep this list curated — adding too many dilutes the signal. If you
 * want a style that isn't here, pick the closest match and refine via
 * the "Paste anything" panel or a manual prompt edit.
 */

export type ImageStyleId =
  | "photography"
  | "editorial-photo"
  | "product-photo"
  | "lifestyle-photo"
  | "cinematic"
  | "vector-illustration"
  | "hand-drawn"
  | "3d-render"
  | "minimalist-graphic"
  | "collage";

export type ImageStyle = {
  id: ImageStyleId;
  label: string;
  short: string; // Short one-line description for UI
  promptFragment: string; // What the image generator sees
};

export const IMAGE_STYLES: ImageStyle[] = [
  {
    id: "photography",
    label: "Photography",
    short: "Photorealistic, documentary",
    promptFragment:
      "Photorealistic photography. Real cameras, real lenses, real light — NOT AI illustration. " +
      "Grain, depth of field, and genuine material rendering (fabric, skin, glass). " +
      "Never an illustration, never CGI, never a render.",
  },
  {
    id: "editorial-photo",
    label: "Editorial photo",
    short: "Magazine-style, intentional lighting",
    promptFragment:
      "Editorial magazine photography. Intentional, directional lighting (hair light, key + fill), " +
      "art-directed composition with negative space, fashion-magazine quality. Think Kinfolk, " +
      "The New York Times Magazine, Bon Appétit — not stock.",
  },
  {
    id: "product-photo",
    label: "Product photo",
    short: "Studio, controlled, clean",
    promptFragment:
      "Studio product photography. Clean seamless background (white, neutral, or brand-colored), " +
      "controlled lighting, sharp focus on the product, considered shadow. Packaging and materials " +
      "rendered accurately. No models unless explicitly requested.",
  },
  {
    id: "lifestyle-photo",
    label: "Lifestyle photo",
    short: "Candid, in-context, warm",
    promptFragment:
      "Candid lifestyle photography. Real people in real contexts using the product/service, " +
      "natural light, authentic expressions (not fake smiles), slight imperfection that reads as " +
      "documentary rather than staged. Feels like it was shot in the moment.",
  },
  {
    id: "cinematic",
    label: "Cinematic",
    short: "Film-still, color-graded, moody",
    promptFragment:
      "Cinematic film-still aesthetic. Anamorphic framing, intentional color grade (teal/orange, " +
      "desaturated, or brand-palette), atmospheric haze or smoke, dramatic lighting. Looks like a " +
      "frame from a prestige TV show — not a photo, a scene.",
  },
  {
    id: "vector-illustration",
    label: "Vector illustration",
    short: "Clean flat vectors, geometric",
    promptFragment:
      "Clean flat vector illustration. Geometric shapes, bold flat colors from the brand palette, " +
      "minimal shading (hard edges, no gradients unless intentional), confident line work. Think " +
      "modern editorial illustration — NOT cartoony mascot work.",
  },
  {
    id: "hand-drawn",
    label: "Hand-drawn",
    short: "Sketchy, organic, imperfect",
    promptFragment:
      "Hand-drawn illustration with visible pencil/ink/marker texture. Slight imperfection, " +
      "organic line weight, intentional roughness. Looks made by a human hand, not vector-perfect. " +
      "Think editorial illustration from The New Yorker or a risograph print.",
  },
  {
    id: "3d-render",
    label: "3D render",
    short: "Polished CGI, modern",
    promptFragment:
      "Polished 3D render with physically-based materials. Soft global illumination, accurate " +
      "shadows and reflections, clay-render clean aesthetic OR glossy brand-colored finish. " +
      "Not cartoonish — closer to Apple product renders or contemporary design studio work.",
  },
  {
    id: "minimalist-graphic",
    label: "Minimalist graphic",
    short: "Bold shapes, lots of negative space",
    promptFragment:
      "Minimalist graphic design. Heavy negative space, 1-3 bold shapes, a single hero element, " +
      "and the brand palette. Swiss-design inspired, poster-like. No busy textures, no clutter. " +
      "Trust the whitespace.",
  },
  {
    id: "collage",
    label: "Collage / mixed media",
    short: "Cut-paper, layered, tactile",
    promptFragment:
      "Collage / mixed media aesthetic. Cut-paper textures, layered elements with visible edges, " +
      "optional analog grain or halftone dots. Tactile and handmade. Colors from the brand palette " +
      "feel physical, not digital.",
  },
];

const STYLE_BY_ID: Record<string, ImageStyle> = Object.fromEntries(
  IMAGE_STYLES.map((s) => [s.id, s])
);

export function getImageStyles(ids: string[]): ImageStyle[] {
  return ids.map((id) => STYLE_BY_ID[id]).filter((s): s is ImageStyle => !!s);
}

/**
 * Build the prompt-fragment block for a given set of selected style ids.
 * Returns an empty string if no styles selected.
 */
export function buildStylePromptFragment(ids: string[]): string {
  const styles = getImageStyles(ids);
  if (styles.length === 0) return "";
  if (styles.length === 1) {
    return `## Visual style\n${styles[0].promptFragment}`;
  }
  const lines = [
    "## Visual style (pick one or blend, do not violate any)",
    ...styles.map((s) => `- ${s.label}: ${s.promptFragment}`),
  ];
  return lines.join("\n");
}
