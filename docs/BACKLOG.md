# Backlog

Open items captured across sessions. Oldest at top, newest at bottom.

---

## Image-style catalog expansion (when needed)

**Reported:** 2026-04-15 · Low priority

Current 10 pills cover most brand territory but a few adjacent styles keep
coming up: typography-forward posters, isometric illustration, documentary
photojournalism, anime/manga, watercolor. Hold off adding until a brand
genuinely needs one — more pills dilutes the signal.

**Touch points:** `lib/brand/image-styles.ts`

---

## SVG template-generator microsite

See `docs/TEMPLATES.md` — full spec. Separate tracked project, not v1 scope.

---

## ~~Logo fidelity when included as a reference image~~

**Resolved:** 2026-04-16

Implemented: forced `input_fidelity: "high"` when logo included, strengthened
prompt clause to demand pixel-perfect reproduction, added "High fidelity locked"
badge in dialog. Compositor (#3) remains a stretch goal — see "In-app image
editor" below.

---

## ~~Edit a generated image with a follow-up prompt~~

**Resolved:** 2026-04-16

Implemented the minimum: "Edit" button on every generated image thumbnail opens
`EditImageDialog` with quick-edit pills + freeform prompt. Calls new
`/api/content/[id]/edit-image` route → `lib/images/edit.ts` which uses
`images.edit` with `input_fidelity: "high"`. Edited image stacks as a new
`MediaAsset` alongside the original. Mask-region editing and the full in-app
editor remain as stretch goals below.

---

## In-app image editor (stretch)

**Reported:** 2026-04-16 · Low priority

Full in-app editor pane — crop, brightness, text overlay, logo overlay
drag-to-position, mask-region edits. This is the natural home for the
"compose the logo on top" approach (reliable wordmark fidelity) and
mask-scoped edits (OpenAI's images.edit accepts a mask image).

Hold off until the prompt-based edit flow proves insufficient.

**Touch points:** new editor component, extend `/api/content/[id]/edit-image`
with mask support.

---

## User/password creation (authentication)

**Reported:** 2026-04-16

Currently auth is session-based (likely OAuth only). Need a traditional
email + password sign-up / sign-in flow so users who don't have an OAuth
provider can self-register.

**Fix ideas:**
- Add credentials provider to the existing `lib/auth` NextAuth config.
- Sign-up page (`/auth/register`) with email, password, confirm password.
- Password hashing with bcrypt/argon2.
- Email verification flow (send link, mark verified).
- Password reset flow (forgot password → email link → reset form).
- Rate-limit login attempts.

**Touch points:** `lib/auth.ts` (NextAuth config), new
`app/auth/register/page.tsx`, `app/auth/forgot-password/page.tsx`,
`prisma/schema.prisma` (add `passwordHash`, `emailVerified` fields if
not already present).

---

## Simplified onboarding: "What's your website?"

**Reported:** 2026-04-16

Current brand creation asks for name, website, voice guide, taboos,
channels, colors, logo — a lot of upfront friction. Most of this can be
inferred from a single URL.

**Vision:** the happy path is just one field: "What's your website?"
(with an expandable "Add more detail if you'd like" section for power
users). From the URL we:

1. Scrape the site for brand signals (name, colors, logo, voice
   fragments, product/service descriptions, social links).
2. Run the scraped content through the existing `parseBrandSignals`
   pipeline to extract structured brand data.
3. Auto-fill the full brand settings (name, palette, logo, voice guide,
   channels, taboos) and present them for one-click approval.
4. Kick off background research (competitor scan, content strategy
   suggestions) that trickles into the brand page.

The user reviews and approves (or tweaks) rather than building from
scratch. "Add more detail" expands the current full form for anyone who
wants manual control.

**Touch points:** `app/app/brands/new/page.tsx` (redesign intake),
`lib/brand-signals.ts` (already exists — extend with URL-based scraping),
new `lib/brand/infer-from-url.ts` (scraper + signal extraction), possibly
a new `/api/brand/infer` route for async scraping.

---

## SVG template creator (AI social post generator)

**Reported:** 2026-04-16

Dedicated tool for generating branded social media images from SVG
templates — logo/image in, colors extracted, template recolored, AI-
generated caption overlaid, final PNG out.

### Core flow

1. Upload image (or use brand logo)
2. Extract 5–8 dominant hex colors (always include black, white, light
   gray, dark gray)
3. User selects colors from the extracted palette
4. Pick a random SVG template from `/templatesources/`, replace dominant
   `fill` colors with user's selected colors, convert SVG → PNG
5. User inputs a URL
6. Scrape visible page text, send to LLM, generate 1 short caption
   (curiosity-driven, < 20 words, no emojis)
7. Detect largest "empty" area in the generated PNG, auto-fit wrapped
   text (white text, black shadow, shrink font if needed)
8. Return final PNG

### Modes

- **New Image** → random new template
- **Swap Colors** → reuse current template with different palette

### Constraints

- SVG recoloring only affects `fill` (no gradients / CSS)
- Optimized for simple SVG templates
- Max upload: 10 MB · output: ~1024–2048 px square
- End-to-end generation < 10 seconds
- No separate persistence or accounts — uses existing brand context

### Data / state

Store in session or local state: `brand_colors`, `selected_colors`,
`source_svg`, `generated_image`, `generated_text`.

### File structure

```
/templatesources/          # SVG templates
/media/generated_images/   # output PNGs
/fonts/                    # font files
```

**Touch points:** new `app/app/templates/page.tsx`, new
`lib/templates/` (color extraction, SVG recoloring, text overlay,
caption generation), new `/api/templates/generate` route. Consider
integrating with the brand's existing creative assets and color tokens.
