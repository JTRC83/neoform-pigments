# Visual QA Matrix

Use this matrix when changes touch forms, canvas geometry, textures, layers, export or the chainsaw tool.

## How To Run

1. Start the app with `npm run dev`.
2. Open `http://127.0.0.1:5173/`.
3. Use a clean canvas at A4 horizontal, 300 PPP.
4. For each figure, add it from `Forms`, resize it to small and large, rotate it, apply one pigment, apply one vector texture, duplicate the layer and export JPG sRGB.
5. For chainsaw checks, draw one straight cut through the figure. If the figure is marked as compound, confirm the visible shape stays stable and pieces do not jump together.

## Figure Matrix

| Figure | Type | Basic visual | Resize/rotate | Pigment | Vector texture | Layer duplicate | JPG sRGB | Chainsaw expectation |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Solar Block | rectangle | Solid rectangle stays crisp | Corners stay square | Fill replaces outline | Pattern repeats cleanly | Offset copy visible | Color/export match | Splits as simple vector |
| Mineral Orbit | ellipse | Ellipse stays smooth | Circle/oval symmetry visible | Fill applies cleanly | Pattern clips inside ellipse | Offset copy visible | Color/export match | Splits as simple vector |
| Signal Delta | triangle | Triangle points are sharp | Points do not deform | Fill applies cleanly | Pattern clips inside triangle | Offset copy visible | Color/export match | Splits as simple vector |
| Ochre Diamond | diamond | Diamond is centered | Diagonal edges stay straight | Fill applies cleanly | Pattern clips inside diamond | Offset copy visible | Color/export match | Splits as simple vector |
| Klein Pentagon | pentagon | Five sides visible | Sides stay proportional | Fill applies cleanly | Pattern clips inside pentagon | Offset copy visible | Color/export match | Splits as simple vector |
| Stack Hexagon | hexagon | Six sides visible | Sides stay proportional | Fill applies cleanly | Pattern clips inside hexagon | Offset copy visible | Color/export match | Splits as simple vector |
| Orange Pill | pill | Rounded capsule visible | Radius stays rounded | Fill applies cleanly | Pattern clips inside pill | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Blue Semi | semicircle | Flat base and round top visible | Flat edge stays flat | Fill applies cleanly | Pattern clips inside semi | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Sun Quarter | quarterCircle | Quarter arc and straight edges visible | Arc stays smooth | Fill applies cleanly | Pattern clips inside quarter | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Green Star | starburst | Star points are readable | Points stay sharp | Fill applies cleanly | Pattern clips inside star | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Red Scallop | scallop | Scallop waves remain readable | Waves do not collapse | Fill applies cleanly | Pattern clips inside scallop | Offset copy visible | Color/export match | Compound pieces stay independent |
| Klein Drop | drop | Drop silhouette visible | Curved side stays smooth | Fill applies cleanly | Pattern clips inside drop | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Orange Petals | petalGrid | Four petals remain separate-looking | Petals do not merge badly | Fill applies cleanly | Pattern clips inside petals | Offset copy visible | Color/export match | Compound pieces stay independent |
| Sun Dots | circleCluster | Four dots remain circular | Dots stay aligned | Fill applies cleanly | Pattern clips per dot | Offset copy visible | Color/export match | Known fragile case: no jumping or merging |
| Green Cross | crossBurst | Cross burst silhouette readable | Arms stay symmetric | Fill applies cleanly | Pattern clips inside cross | Offset copy visible | Color/export match | Compound pieces stay independent |
| Rose Stack | semicircleStack | Three semi-circles visible | Stack spacing stays stable | Fill applies cleanly | Pattern clips inside stack | Offset copy visible | Color/export match | Compound pieces stay independent |
| Tri Grid | triangleGrid | 3x3 triangle grid visible | Grid alignment stays clean | Fill applies cleanly | Pattern clips inside triangles | Offset copy visible | Color/export match | Compound pieces stay independent |
| Rose Shield | shield | Shield bottom curve visible | Top stays flat | Fill applies cleanly | Pattern clips inside shield | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Green Crescent | crescent | Crescent hole stays open | Inner curve stays smooth | Fill applies cleanly | Pattern respects hole visually | Offset copy visible | Color/export match | Hole should stay stable |
| Red Pacman | pacman | Wedge mouth remains open | Arc stays smooth | Fill applies cleanly | Pattern clips inside pacman | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Rose Arch | arch | U arch hole stays open | Legs stay parallel | Fill applies cleanly | Pattern respects hole visually | Offset copy visible | Color/export match | Hole should stay stable |
| Pink Asterisk | asterisk | Six arms visible | Arms stay centered | Fill applies cleanly | Pattern clips inside asterisk | Offset copy visible | Color/export match | Uses stable vector fallback if needed |
| Pinwheel | cornerPinwheel | Four arrow corners visible | Negative center stays open | Fill applies cleanly | Pattern clips inside corners | Offset copy visible | Color/export match | Compound pieces stay independent |
| Cream Rings | quarterRings | Four quarter rings visible | Ring thickness stable | Fill applies cleanly | Pattern respects ring holes | Offset copy visible | Color/export match | Holes should stay stable |
| Portal Dot | portal | Outer portal and blue dot visible | Dot remains centered | Fill applies cleanly | Pattern respects inner pieces | Offset copy visible | Color/export match | Compound pieces stay independent |
| Petal Burst | petalBurst | Petal ring remains readable | Petals stay radial | Fill applies cleanly | Pattern clips inside petals | Offset copy visible | Color/export match | Compound pieces stay independent |
| Pink Eye | eye | Eye and inner hole remain readable | Eye curve stays smooth | Fill applies cleanly | Pattern respects hole visually | Offset copy visible | Color/export match | Hole should stay stable |
| Classic Bolt | boltClassic | Bolt is sharp and readable | Points stay sharp | Fill applies cleanly | Pattern clips inside bolt | Offset copy visible | Color/export match | Splits as simple vector |
| Sym Bolt | boltSharp | Symmetric bolt has pointed top/bottom | Top and bottom stay mirrored | Fill applies cleanly | Pattern clips inside bolt | Offset copy visible | Color/export match | Splits as simple vector |
| Step Bolt | boltStep | Stepped bolt is readable | Steps stay square | Fill applies cleanly | Pattern clips inside bolt | Offset copy visible | Color/export match | Splits as simple vector |

## Focus Scenarios

| Area | Scenario | Expected Result |
| --- | --- | --- |
| Export JPG | A4 horizontal, 300 PPP, JPG quality 95, one pigment and one vector texture | Exported JPG matches visible canvas and is saved in Final works |
| Export JPG + grain | Enable Film grain `Press`, export JPG | Grain appears in output as raster finish, not as object texture |
| Visual Library | Open `Library`, import one image, select from filmstrip, add to canvas | Image appears as selectable image layer |
| Layers | Select three layers, duplicate, group, lock group, unlock, ungroup | Layer count and canvas behavior remain predictable |
| Blend Modes | Stack two colored shapes, test Multiply, Screen, Overlay, Difference | Blend preview and canvas result visibly change |
| Textures | Apply Bauhaus Weave, Pop Halftone and Serigraphy Bars to three shapes | Patterns repeat cleanly after resize |
| Gradient Tool | Apply Gradient to a colored shape, change intensity, then drag across it in another direction | Gradient adapts to object bounds, intensity changes visibly and drag direction updates light/shadow direction |
| Selected Color | Select a colored vector shape, adjust exposure/contrast/saturation/temp/RGB channels, then reset | Shape changes color predictably and returns to its base color after reset |
| Composition Color | Add one image and one vector texture, adjust global color, export JPG | Preview/export reflect exposure, contrast, saturation, temperature and channel changes across the whole composition |
| Chainsaw Simple | Cut rectangle, triangle and bolt | Each produces editable pieces and Undo restores original |
| Chainsaw Compound | Cut Red Scallop, Green Cross, Orange Petals, Rose Stack, Portal Dot, Petal Burst, Pink Eye | Shape should not collapse, jump, merge unexpectedly or turn into a fake white mask |
| Canvas Guides | Enable grid/phi, add/move/delete V and H guides | Guides are visible, draggable and removable |
| Undo/Redo | Perform add, texture, layer delete, chainsaw cut | Undo/Redo returns to the expected visual state |

## Fail Fast Rules

- If a figure turns into a black blob, white mask or unrelated square, stop and mark it as a blocker.
- If cut pieces jump together after repeated cuts, mark as chainsaw regression.
- If a texture pixelates when resizing an object, move it out of vector texture groups or fix its SVG pattern.
- If export does not match the visible canvas, do not push.
