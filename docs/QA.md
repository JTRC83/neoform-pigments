# QA Checklist

Use this checklist before pushing changes that affect canvas behavior, layers, export, libraries or interaction tools.

## Automatic Checks

Run:

```bash
npm run check
```

This runs:

- `npm run qa:smoke`
- `npm run build`

`qa:smoke` verifies that the main product files, roadmap items, core dependencies, asset folders and critical editor workflows are still present.

For shape and canvas regressions, use the figure-by-figure visual matrix:

```bash
open docs/VISUAL_QA_MATRIX.md
```

## Manual Smoke Test

1. Start the app with `npm run dev`.
2. Open `http://127.0.0.1:5173/`.
3. Confirm the editor loads without console errors.
4. Add a rectangle, ellipse, triangle and one library form.
5. Open the visual asset library from the top bar.
6. Confirm the five tabs appear: Compositions, Pigments, Pigment mixes, Textures and Final works.
7. Import one image into a visual asset category.
8. Confirm the imported images appear in the bottom filmstrip.
9. Click thumbnails in the filmstrip and confirm the large preview changes.
10. Use that imported image and confirm it appears on the active canvas as a selectable image layer.
5. Apply a pigment to one selected object.
6. Apply a gradient or vector texture to one selected object.
7. Move, resize and rotate a figure.
8. Use undo and redo.
9. Add a second canvas and switch between canvases.
10. Turn on grid and golden ratio.
11. Add one vertical guide and one horizontal guide.
12. Move both guides and remove them.
13. Rename a layer.
14. Toggle layer visibility.
15. Lock and unlock a layer.
16. Delete a layer and undo the deletion.
17. Duplicate one layer.
18. Select several layers with Cmd/Ctrl and with Shift range selection.
19. Hide, lock, move and delete several selected layers.
20. Group several layers and confirm the group behaves as one layer.
21. Lock the group and confirm it cannot be moved from canvas.
22. Ungroup and confirm the original objects return as editable layers.
23. Save selected figures as a composition.
24. Reinsert a saved composition.
25. Rename the saved composition.
26. Move the saved composition up/down when several exist.
27. Update a saved composition from a different current selection.
28. Export one composition as JSON.
29. Export all own compositions as JSON.
30. Import the exported compositions JSON.
31. Delete a saved composition.
32. Export active canvas as JPG/JPEG using the `JPG sRGB` button.
33. Export project JSON.
34. Import the exported project JSON.
35. Save project locally.
36. Reload the page and open the saved project.

## Tool-Specific Checks

### Drawing Tools

- Pencil draws a thin stroke.
- Nib draws a sharper stroke.
- Marker draws a thicker stroke.
- Gradient applies a light/shadow gradient to the selected figure.
- Dragging with Gradient over a figure changes gradient direction.
- Gradient intensity slider changes how strong the light/shadow effect is.
- Selected Color controls change exposure, contrast, saturation, temperature and RGB channel strength on a selected vector shape.
- Composition Color controls affect the full canvas preview/export, including images and textures.
- With a Wacom/tablet, light pressure creates thinner strokes and stronger pressure creates thicker strokes.
- With mouse/trackpad, drawing still works with a stable fallback width.
- Strokes appear as selectable layers.
- Strokes can receive pigments, gradients and vector textures after being drawn.

### Layers

- Click selects one layer.
- Cmd/Ctrl-click toggles individual layer selection.
- Shift-click selects a range.
- Duplicate creates an offset copy with a unique layer name.
- Bulk visibility, lock, move and delete apply to every selected layer.
- Group creates a single `Group` layer from multiple selected layers.
- A locked group cannot be moved, scaled or rotated from the canvas.
- Ungroup restores child objects as normal layers.
- Rename selects the full current name on focus, Enter confirms and Escape cancels.

### Compositions

- Save selected figures creates a reusable own composition.
- Clicking a composition inserts it back into the active canvas.
- Rename selects the current label on focus, Enter confirms and Escape cancels.
- Update replaces the saved composition contents with the current canvas selection.
- Up/down controls reorder the own composition library.
- Individual export downloads one composition JSON.
- Export all downloads the full own composition library JSON.
- Import accepts a previously exported JSON and merges it into local compositions.
- Delete removes an own composition from local storage.

### Chainsaw Cut

- A cut can start outside a selected figure.
- A straight cut splits a simple closed vector form.
- A straight cut can split one piece of a compound library form without deleting the untouched pieces.
- One straight cut can split several intersected figures in one pass.
- Grouped figures are cut by internal vector pieces when possible.
- Text remains visually text after a cut and does not collapse into a solid black polygon.
- Text cut pieces use vector clip pieces until real letter-to-path boolean cutting is implemented.
- Complex grouped forms and curved paths should prefer stable clipped pieces over broken child geometry.
- A resulting cut piece can be cut again.
- Fill, opacity, shadow and blend mode remain visually consistent after the cut.
- The result does not paint a fake white mask.
- Undo restores the original object.

### Remove Background

- The tool removes fill from a selected filled object.
- If the object becomes transparent, its outline remains visible enough to select.
- Undo restores the fill.

### Cursors

- Auto cursor behaves normally.
- Target cursor is visible.
- Finger cursor changes on press/drag/release.
- Rocket cursor moves with centered flame animation.
- Paper plane cursor shows separated motion lines.
- Tattoo cursor shows short dashed trail animation.

## Export Checks

- JPG/JPEG output matches the visible canvas.
- JPG/JPEG export uses the selected JPG quality value.
- JPG/JPEG export runs through the sRGB raster pipeline.
- The top bar exposes one primary image export button: `JPG sRGB`.
- PDF is treated as a raster proof/sample, not as a final print file.
- Film grain, when enabled, appears in JPG/JPEG output.
- Vector texture alternatives remain crisp when resized.
- Bauhaus/pop art texture presets are visible in Textures and apply as repeatable vector SVG patterns where marked.
- Textures are separated into Gradients, Bauhaus vector, Pop Art vector, Serigraphy vector and Utility vector.
- Film grain is clearly labeled as raster export, separate from object-level vector textures.
- Gradient tool remains separate from texture presets and layer blend modes.
- Film grain finish presets can quickly switch between soft, press and grit looks.
- Professional export settings apply to JPG output with selected PPP settings.
- Bleed adds printable margin around the design in raster/PDF export.
- Safe margin is stored in package metadata for production handoff.
- Crop marks, when enabled, appear outside the trim area.
- Canvas presets include A1, A2, A3, A4, A5 and Poster.
- PPP defaults to 300 and cannot be set below 150.
- Each canvas preset can be added horizontally and vertically.
- Changing the canvas preset updates the active canvas dimensions.
- Editing the active canvas size reflects as a matching preset or custom state in Canvases.
- Bleed and safe margin controls live in the Canvases inspector, not in the main canvas overlay.
- Complete package export includes project JSON plus JPG/SVG assets for each artboard.
- Complete package export includes per-artboard print metadata: PPP, source size, final size, physical mm size, bleed, safe margin, crop marks, JPG quality and sRGB profile.
- JSON export can be imported back without data loss.

## Regression Notes

When a bug is fixed, add a one-line note here with the date, the affected feature and the manual check that prevents it from returning.

- 2026-04-27: Added baseline QA checklist and smoke script for core editor workflows.
- 2026-04-27: Added tablet-pressure smoke checks for pencil, nib and marker strokes.
- 2026-04-27: Added advanced layer checks for duplicate, multi-select, bulk actions and groups.
- 2026-04-27: Added composition-library checks for rename, update, reorder, delete and JSON import/export.
- 2026-04-27: Added professional export base checks for DPI, package export and vector texture/grain strategy. PDF is postponed.
- 2026-04-29: Added print canvas presets A1-A5 plus poster and PPP controls with 150 minimum.
- 2026-04-29: Synced Canvases presets with the active canvas size and removed bleed/safe controls from the main overlay.
- 2026-04-29: Reintroduced professional export controls for bleed, safe margin, crop marks and raster PDF.
- 2026-05-05: Added visual QA matrix for every library form plus export, layers, textures and chainsaw scenarios.
- 2026-05-05: Expanded Driver.js tour into task-based steps for JPG export, visual library, layers, textures, chainsaw and blend modes.
- 2026-05-06: Added left-sidebar Gradient tool checks for direct object gradients, direction drag and intensity control.
