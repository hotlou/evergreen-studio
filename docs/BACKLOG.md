# Backlog

Open items captured across sessions. Oldest at top, newest at bottom.

---

## Dim the image-generation dialog while generating

**Reported:** 2026-04-15

While `GenerateImageDialog` is firing OpenAI, the controls inside the dialog
(prompt textarea, asset selection, settings panel, Generate button) are still
interactive. Clicking them during a generation is confusing — the request is
already in flight and the state won't apply to it.

**Fix idea:**
- When `generating === true`, wrap the dialog body in a wrapper that sets
  `pointer-events: none` and `opacity: 0.5` (or similar).
- The rotating status toast stays fully interactive/visible on top.
- Keep the Cancel button active so the user can abandon the dialog if they
  get bored — but the abandon should NOT abort the server-side generation
  (that still completes and attaches the image).

**Touch points:** `components/today/GenerateImageDialog.tsx`

---

## Rename a brand

**Reported:** 2026-04-15

`createBrand` sets the name at intake but there's no UI to edit it after.
If the user typos "Combat Candy" as "Comabt Candy" they're stuck.

**Fix idea:**
- `updateBrandName` server action already exists in `app/actions/brand.ts`
  (added earlier but never wired to UI).
- Add an inline-editable brand name at the top of `/app/brand` — click the
  `<h1>` to edit, Save/Cancel bar appears.
- Optionally allow editing the slug too — but slug changes break saved URLs,
  so gate behind a "show advanced" toggle.

**Touch points:** `app/app/brand/page.tsx`, `app/actions/brand.ts`
(`updateBrandName` exists)

---

## Better user-facing error for first-generation malformed tool args

**Reported:** 2026-04-15

On a fresh brand, first "Generate today's pack" occasionally fails with:

```
Generation pipeline error: Error: Claude returned pieces as a malformed string. Please retry.
```

Claude sometimes returns the `pieces` field as a stringified JSON array
instead of a real array. `lib/generation/pipeline.ts` already defends
against this with a JSON.parse retry, but if that parse also fails, the
error bubbles to the UI verbatim. Not user-friendly.

Second click always works (suggests non-determinism on cold cache, not a
data problem).

**Fix ideas:**
1. Automatic retry (once) on this specific error before surfacing it.
2. Better user-facing wording — "Generation hiccupped on this brand's first
   run. Click Generate again — this almost always resolves on retry."
3. Sentry / log-level distinction so the dev-facing error stays detailed
   but the UI gets a friendly message.

**Touch points:** `lib/generation/pipeline.ts` (the parse logic),
`app/api/generate/route.ts` (error shaping), `components/today/GenerateButton.tsx`
(error display).

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
