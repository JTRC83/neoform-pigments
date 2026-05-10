# neoform-pigments

Local-first digital art composition editor for **N€O FORM & PIGM€NT$**.

The app is built for geometric composition, pigments, vector-style textures, reusable compositions, analog-inspired finishes and export workflows.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Fabric.js
- Zustand
- Driver.js

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

Open:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

## PWA

The app includes a first-pass PWA setup:

- Web app manifest in `public/manifest.webmanifest`.
- SVG and PNG app icons in `public/icons/`, including `192x192`, `512x512` and maskable variants.
- Production-only service worker registration.
- Offline app-shell cache for the editor shell, fonts, cursors and static assets.
- User projects, imported images, palettes and final works remain local-first through IndexedDB/local storage.

Test the installable build locally:

```bash
npm run build
npm run preview
```

Open the preview URL and use the browser install option. The service worker is intentionally disabled during `npm run dev` so hot reload remains predictable.

## QA

Run the baseline verification before pushing product changes:

```bash
npm run check
```

Manual QA checklist:

```text
docs/QA.md
```

## Current Features

- Neobrutalist editor layout.
- Fabric.js canvas.
- Multiple artboards and canvas formats.
- Basic and library shapes.
- Pigment palette inspired by Bauhaus, Chaos and Klein blue.
- Vector-style texture presets, Bauhaus/pop art tramas and gradients.
- Layer panel with duplicate, multi-select, bulk actions, groups, lock, order, rename and delete.
- Blend modes and shadows per selected layer.
- Local project save/open.
- Project JSON import/export.
- One primary `JPG sRGB` export button with configurable quality, current canvas size and active PPP settings.
- JPG sRGB exports are also saved into the local `Obras finales` visual library.
- Advanced export foundation for SVG, proof PDF, all-artboards JPG/JPEG and package metadata.
- Full-screen visual asset library with Bridge-style large preview and bottom filmstrip for compositions, pigments, pigment mixes, color palettes, textures and final works.
- Visual assets are stored in IndexedDB, with palette extraction from imported images and palette/mix assets for reusable pigment combinations.
- Grid, golden ratio and custom guides.
- Zoom, fit and center controls.
- Undo/redo.
- Reusable saved compositions with rename, update, reorder, delete, JSON export and JSON import.
- Pencil, nib and marker drawing tools with tablet pressure support.
- Chainsaw cutting for simple shapes, text and complex clipped shapes with reusable cut-piece outlines.
- Animated cursor styles, currently CSS/SVG based and ready to evolve toward Anime.js for smoother trails and tool feedback.
- Light, standard and dark color modes.
- Driver.js guided tour foundation.

## Project Structure

```text
src/
  components/
  editor/
  canvas/
  libraries/
  effects/
  pigment/
  store/
  types/
  utils/
```

## Product Roadmap

Read [PRD.md](./PRD.md) before implementing product behavior.

The current priority is the **Fase De Puesta A Punto**:

1. Advanced vector chainsaw cutting. Base now supports multi-object strokes and compound groups.
   It now uses `polygon-clipping` for boolean cuts, preserves text visually with relative vector clipping, keeps experimental `opentype.js` contour conversion for future refinement, supports compound holes with even-odd paths, and warns visually instead of producing broken shapes when a cut is unsafe.
2. Real Wacom/tablet pressure.
3. Advanced layers.
4. Composition management.
5. Vector textures and grain strategy. Base implemented with Bauhaus/pop art tramas and raster film-grain presets.
6. Professional export. Implemented with a primary JPG sRGB flow, DPI, quality, print presets, bleed, safe margin, crop marks, proof PDF and package manifest metadata.
7. More didactic Driver.js tour.
8. Minimal QA and visual checks.

The production bundle is split into separate `fabric`, `vector-geometry`, `vendor`, and app chunks so the editor can keep growing without returning to a single oversized JavaScript file.
