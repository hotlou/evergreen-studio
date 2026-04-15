# SVG Template Generator — spec

> Status: **backlog / separate microsite**. This doc captures the full vision so it can ship as its own tool later and hand finished templates back to Evergreen Studio.

## The dream, in one sentence

A brand builds a library of gorgeous SVG templates — frames, lockups, banners, carousels, sale callouts — where every color is a **token**, every text block is a **placeholder**, and any "photo area" is a **fill slot**. When Evergreen generates content, a template is picked (or auto-selected), tokens snap to the brand palette, placeholders fill with caption copy, fill slots drop in a generated or library image, and out pops a finished, on-brand social image.

## Why it's worth building

- Generative image models alone can't produce consistent brand identity on repeat (typography, negative space, fixed lockups, safe areas).
- Real agencies solve this with InDesign/Figma templates. We can too — SVG is XML, which means it's programmable.
- The same template, reused across 50 posts, is what makes a feed "look like a brand."
- It compounds with everything else we're doing: generated imagery becomes the fill, brand colors become the tokens, voice becomes the copy, pillars become the categorical selection logic.

## Architecture — microsite vs. in-app

Build it as **a standalone microsite** (say `studio-forge.evergreen.app`) that reads/writes to the same Postgres + Blob as Evergreen. Reasoning:
- Template editing is a heavy UI (canvas, layers panel, inspector, asset picker). It deserves its own route tree, state store, and keyboard-shortcut space.
- Designers who touch templates aren't the same people who touch captions most of the time. Separation of concerns.
- Launching a separate subdomain means we can ship on a different cadence without polluting the main app surface area.
- Same auth (NextAuth session cookie across subdomains), same Prisma client, same Blob store — no data duplication.

The main Evergreen app just:
1. Lists available templates for the current brand
2. Lets a ContentPiece pick one
3. Renders it (SVG → PNG via server-side rasterization) into a MediaAsset

## Data model additions

```prisma
model BrandTemplate {
  id          String   @id @default(cuid())
  brandId     String
  name        String
  description String?  @db.Text
  category    String   // "frame" | "carousel-slide" | "callout" | "quote-card" | ...
  aspect      String   // "1:1" | "4:5" | "9:16" | "16:9"

  // SVG source with token/placeholder/slot markers intact
  svgSource   String   @db.Text

  // Parsed schema extracted from the SVG on save:
  //   { tokens: ["primary","accent",...],
  //     textSlots: [{id,label,maxChars,role:"headline"|"body"|"caption"}],
  //     imageSlots: [{id,label,aspect,fit}] }
  schema      Json

  // Optional: a rendered PNG preview for the template picker
  previewUrl  String?

  isActive    Boolean  @default(true)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  brand           Brand            @relation(fields: [brandId], references: [id], onDelete: Cascade)
  renders         TemplateRender[]

  @@index([brandId, category])
}

model TemplateRender {
  id             String       @id @default(cuid())
  templateId     String
  contentPieceId String?
  // Resolved inputs used at render time
  tokenValues    Json         // { primary: "#4EB35E", ... }
  textValues     Json         // { headline: "...", body: "..." }
  imageValues    Json         // { hero: "<blob url>", ... }
  outputAssetId  String?      // MediaAsset produced
  createdAt      DateTime     @default(now())

  template       BrandTemplate @relation(fields: [templateId], references: [id], onDelete: Cascade)
  outputAsset    MediaAsset?   @relation(fields: [outputAssetId], references: [id])
}
```

## The SVG contract

A template is a valid SVG with a small set of conventions:

### 1. Color tokens — `data-token="<key>"`
```xml
<rect width="1080" height="1080" fill="#4EB35E" data-token="primary" />
<path fill="#FFFFFF" data-token="background" />
```
On render, every `fill` or `stroke` attribute on an element with `data-token` gets replaced by the brand's `colorTokens[key]`.

### 2. Text slots — `data-text-slot="<key>"` + attributes
```xml
<text data-text-slot="headline"
      data-role="headline"
      data-max-chars="60"
      font-family="Canela"
      font-size="64"
      fill="#FFFFFF"
      x="80" y="180">
  {{HEADLINE}}
</text>
```
The literal text node is replaced at render. `data-role` hints at formatting (headline gets title case, body gets left alignment, etc.). `data-max-chars` is enforced with auto-ellipsis + (in editor) live wrap preview.

### 3. Image slots — `data-image-slot="<key>"` + clip region
```xml
<clipPath id="hero-clip">
  <rect x="0" y="400" width="1080" height="600" rx="24" />
</clipPath>
<image data-image-slot="hero"
       data-fit="cover"
       href=""
       x="0" y="400"
       width="1080" height="600"
       clip-path="url(#hero-clip)" />
```
At render, `href` gets set to the chosen image URL (generated image, creative asset, or library piece), and `data-fit` (`cover|contain|fill`) controls how the image is positioned inside the slot.

### 4. Logo anchor — `data-logo-anchor="<position>"`
```xml
<image data-logo-anchor="top-right"
       data-padding="32"
       href=""
       width="120" height="120" />
```
At render, Evergreen drops the brand's `logoUrl` in. The editor lets a designer pre-place + size a logo rectangle; render just fills the `href`.

### 5. Everything else is untouched

A designer can use any SVG filters, gradients, masks, patterns, fonts, etc. The microsite doesn't re-invent SVG — it annotates it.

## Microsite surfaces

### `/templates` — library view
- Grid of rendered previews, filter by category and aspect
- "New template" (blank canvas, choose aspect) · "Import SVG" · "Fork this one"

### `/templates/:id/edit` — editor
Three-panel layout:

| Left | Center | Right |
|---|---|---|
| **Layers tree** (SVG structure). Click a node to focus it. Right-click → "Mark as token" / "Mark as text slot" / "Mark as image slot" | **Canvas** — the SVG rendered with current token/placeholder values. Drag to move, Cmd-drag to resize. Live palette swap when tokens change. | **Inspector** — per-node properties. For a tokenized node: which token key. For a text slot: role, max-chars, preview text. For an image slot: fit mode. |

Top bar: **Style** button — cycles the brand's palette against the template so the designer can sanity-check it works against different color decisions. **Incorporate imagery** button — drops a recent generated image or creative asset into the first available image slot as a preview fill.

### `/templates/:id/preview` — render tester
- Pick any ContentPiece from the brand and see the template rendered against it.
- Swap tokens live (set `primary` to accent, etc.) to verify the template holds up.

### Route handler: `POST /api/templates/:id/render`
Body:
```json
{
  "tokenOverrides": { "primary": "#4EB35E" },
  "text": { "headline": "...", "body": "..." },
  "images": { "hero": "<blob url>" },
  "logoUrl": "<blob url>"
}
```
Steps:
1. Load `svgSource`, walk the DOM with `@xmldom/xmldom` or `parse5`.
2. For each `[data-token]` node, set `fill`/`stroke` from `tokenOverrides[key] || brand.colorTokens[key]`.
3. For each `[data-text-slot]`, replace text content with `text[key]` (truncate to `data-max-chars`).
4. For each `[data-image-slot]`, set `href` + compute viewBox for `data-fit`.
5. For `[data-logo-anchor]`, set `href = logoUrl` and position per `data-padding` and corner.
6. Serialize, rasterize with **resvg-js** (`@resvg/resvg-js`) at 2x for retina, output PNG.
7. `put()` to Blob, create MediaAsset + TemplateRender rows, return URL.

**resvg-js** is the right call over Playwright/Puppeteer: pure Rust, no headless browser, sub-100ms render per image, works in serverless.

## Integration back into Evergreen

A new button on ContentCard: **"Use template"** → opens a picker with this brand's templates filtered by the piece's channel aspect. Picking one routes to the template render flow with the piece's caption split into headline+body (Claude does the split), a chosen image (either a freshly-generated one or a selected MediaAsset), and the brand's palette. The rendered PNG lands in the existing `mediaAssetIds` array and displays inline like any other image.

The **Style** and **Incorporate imagery** buttons from the designer editor also live in this picker — so a brand operator can quickly re-style an existing template for a seasonal push ("make it holiday") without opening the full editor.

## Build plan

Rough five-week shape if a single full-time person takes it:

**Week 1 — Foundations**
- Standalone Next.js app on `studio-forge.evergreen.app`
- Shared Prisma client, same DB, migration adding the two models
- Auth via NextAuth session cookie (same secret, same domain parent)
- `/templates` list + create blank/paste SVG

**Week 2 — SVG contract + renderer**
- Parser that extracts `schema` from an SVG on save
- `resvg-js` render path → Blob → MediaAsset
- `/api/templates/:id/render` endpoint + a "Test render" UI using mock values

**Week 3 — Editor MVP**
- Layers panel + canvas + inspector
- Click-to-tokenize, click-to-slotify
- Live token swap against current brand palette
- Text-slot live preview with character counts

**Week 4 — Integration + polish**
- "Use template" picker on ContentCard in Evergreen
- Claude-powered split of a caption into template fields (headline/body/CTA)
- Category/aspect filters, preview renders cached on save

**Week 5 — Starter pack**
- Ship with 10 genuinely gorgeous templates so the feature doesn't look empty on launch
- Quote card · product announcement · carousel title slide · carousel body slide · before/after · text-over-photo hero · full-bleed photo with corner lockup · founder quote · stat callout · event/date card
- All built as tokenized SVGs, reviewed against three sample brands

## Open questions

- **Fonts.** Templates will reference brand fonts. Do we host them in Blob and load via `@font-face` at render time? Probably yes — we'll need a `BrandFont` table eventually.
- **Animation.** Lottie and SVG-SMIL are on the table for stories. Deferred; v1 is static.
- **Carousels.** A single template with `slide-1`, `slide-2`, `slide-3` marker attributes? Or one template per slide linked as a set? Probably the latter — simpler contract.
- **Template marketplace.** Once 5+ brands exist, designers will want to share. Deferred.
- **AI template generation.** Given a brand + a vibe prompt, hallucinate a full SVG? Tempting and possible with Claude 4.x. Deferred until the editor's mature enough to fix its output.

## Why this belongs outside v1

- Requires a new migration, new renderer dependency (`@resvg/resvg-js`), a full custom editor, and a starter pack of designed templates to not look empty.
- Every surface in v1 assumes "picture or no picture" — templates introduce a third state ("template composed from picture + text + tokens") that ripples through Library, Publish, and the generation pipeline.
- The editor itself is a substantial UI project — conservatively 2–3 weeks just for the three-panel designer to feel good.

Keep the vision crisp, ship the rest of v1 first, then build this as the next chapter.
