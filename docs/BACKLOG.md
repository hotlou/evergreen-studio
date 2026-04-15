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

## Logo fidelity when included as a reference image

**Reported:** 2026-04-15

When `includeLogo` is true and the brand logo is sent to the generator as a
reference, the model frequently warps the wordmark — letters drift, the icon
gets re-interpreted, colors shift. A logo that's almost-right is worse than
no logo (the brand looks counterfeit).

**Fix ideas (pick one or stack them):**
1. **Force high input fidelity when logo is included.** If `includeLogo` is
   true, lock `settings.input_fidelity = "high"` regardless of what the user
   picked, and surface a tiny "logo mode" badge in the dialog explaining why.
2. **Inject a logo-fidelity clause into the prompt** automatically when the
   logo is attached: "Reproduce the supplied logo pixel-perfect — do not
   restyle, recolor, or redraw it. Treat it as a fixed asset to be placed,
   not a reference to riff on."
3. **Compose, don't generate.** Generate the image without the logo, then
   run a follow-up image-edit step that overlays the logo onto a designated
   corner (bottom-right by default, configurable). This is the only fully
   reliable path — generators will never beat a literal compositor for
   wordmark fidelity.

Probably want #1+#2 immediately and #3 as the long-term answer (ties into
the "edit a generated image" item below).

**Touch points:** `components/today/GenerateImageDialog.tsx`
(settings lock + badge), `app/api/content/[id]/generate-image/route.ts`
(prompt clause injection, fidelity override), eventually a new
compositor step in `lib/generation/image.ts` (or wherever the OpenAI
image call lives).

---

## Edit a generated image with a follow-up prompt (or full image editor)

**Reported:** 2026-04-15

Right now the generator is one-shot: prompt in, image out. If the user
wants a small change ("move the logo to the top-left", "make the
background lighter", "remove the second cup") their only option is to
re-generate from scratch and hope.

**Fix ideas:**
- **Minimum:** add an "Edit with prompt" button on a generated image that
  opens a follow-up dialog. The previous image becomes the input reference
  (with `input_fidelity: "high"`), the user types what to change, we hit
  the image-edit endpoint, and the result replaces or sibling-attaches to
  the original.
- **Nice-to-have:** mark a region (rect or freehand mask) that the edit is
  scoped to, so untouched areas are guaranteed pixel-stable. OpenAI's
  image-edit endpoint accepts a mask image — wire it through.
- **Stretch:** an actual in-app image editor pane — crop, brightness,
  text overlay, logo overlay drag-to-position. This is the natural home
  for the "compose the logo on top" approach from the logo-fidelity item.

**Touch points:** new `EditImageDialog` component, new
`/api/content/[id]/edit-image` route, `lib/generation/image.ts` for the
edit-call wrapper. Decide whether edited images replace the original
`mediaAsset` row or stack as versions.

