import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = dirname(dirname(fileURLToPath(import.meta.url)));
const checks = [];

function addCheck(label, condition) {
  checks.push({ label, passed: Boolean(condition) });
}

function readProjectFile(relativePath) {
  return readFileSync(join(rootDir, relativePath), "utf8");
}

function fileExists(relativePath) {
  return existsSync(join(rootDir, relativePath));
}

function listFiles(relativePath) {
  const directory = join(rootDir, relativePath);

  if (!existsSync(directory)) {
    return [];
  }

  return readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
}

const packageJson = JSON.parse(readProjectFile("package.json"));
const prd = readProjectFile("PRD.md");
const readme = readProjectFile("README.md");
const visualQaMatrix = readProjectFile("docs/VISUAL_QA_MATRIX.md");
const editorTypes = readProjectFile("src/types/editor.ts");
const canvasEditor = readProjectFile("src/canvas/CanvasEditor.tsx");
const canvasPresets = readProjectFile("src/canvas/canvasPresets.ts");
const libraryAssets = readProjectFile("src/libraries/libraryAssets.ts");
const librariesPanel = readProjectFile("src/libraries/LibrariesPanel.tsx");
const visualAssetsModal = readProjectFile("src/libraries/VisualAssetsModal.tsx");
const visualAssetStorage = readProjectFile("src/libraries/visualAssetStorage.ts");
const leftToolbar = readProjectFile("src/editor/LeftToolbar.tsx");
const rightPanel = readProjectFile("src/editor/RightPanel.tsx");
const topBar = readProjectFile("src/components/TopBar.tsx");
const viteConfig = readProjectFile("vite.config.ts");

[
  "src/App.tsx",
  "src/canvas/CanvasEditor.tsx",
  "src/editor/LeftToolbar.tsx",
  "src/editor/RightPanel.tsx",
  "src/libraries/LibrariesPanel.tsx",
  "src/libraries/VisualAssetsModal.tsx",
  "src/libraries/visualAssetStorage.ts",
  "src/store/editorStore.ts",
  "src/types/editor.ts",
  "src/types/library.ts",
  "PRD.md",
  "README.md",
  "docs/QA.md",
  "docs/VISUAL_QA_MATRIX.md"
].forEach((path) => addCheck(`Required file exists: ${path}`, fileExists(path)));

[
  "react",
  "react-dom",
  "fabric",
  "zustand",
  "driver.js",
  "opentype.js",
  "polygon-clipping"
].forEach((dependency) =>
  addCheck(`Dependency is declared: ${dependency}`, packageJson.dependencies?.[dependency])
);

[
  "dev",
  "build",
  "qa:smoke",
  "check"
].forEach((scriptName) =>
  addCheck(`NPM script is declared: ${scriptName}`, packageJson.scripts?.[scriptName])
);

[
  "Motosierra Vectorial Avanzada",
  "Presion Real Para Wacom Y Tabletas",
  "Capas Avanzadas",
  "Gestion De Composiciones",
  "Texturas, Tramas Y Grano",
  "Exportacion Profesional",
  "Tour Didactico Con Driver.js",
  "QA Minimo Y Pruebas Visuales"
].forEach((heading) => addCheck(`PRD contains roadmap item: ${heading}`, prd.includes(heading)));

[
  "chainsawCut",
  "lawnMower",
  "pencilStroke",
  "nibStroke",
  "markerStroke",
  "gradientTool",
  "group",
  "CanvasCursorStyle",
  "CanvasFinishSettings",
  "GradientToolSettings",
  "ColorAdjustmentSettings",
  "ProfessionalExportSettings",
  "VisualAsset",
  "VisualAssetCategory",
  "cropMarksEnabled",
  "jpegQuality",
  "ExportRequest"
].forEach((token) => addCheck(`Editor type exists: ${token}`, editorTypes.includes(token)));

[
  "exportCanvasAsPng",
  "exportCanvasAsJpeg",
  "exportCanvasAsSvg",
  "exportCanvasAsPdf",
  "exportAllArtboardsAsPng",
  "exportAllArtboardsAsJpeg",
  "exportProjectPackage",
  "saveJpegExportAsFinalWork",
  "getProfessionalRasterDataUrl",
  "createProfessionalExportManifest",
  "drawCropMarks",
  "addVisualAssetImageToCanvas",
  "saveSelectionAsComposition",
  "finishVectorCut",
  "findVectorCutTargets",
  "createBooleanVectorCutPieces",
  "createBooleanGroupCutPieces",
  "createBooleanCutGeometry",
  "createTextObjectMultiPolygon",
  "polygonClipping",
  "opentype.parse",
  "fillRule: \"evenodd\"",
  "flashUnsupportedVectorCutTarget",
  "showVectorCutNotice",
  "shouldUseClippedVectorCut",
  "createClippedVectorCutPieces",
  "cloneVectorCutObjectWithClip",
  "createAbsoluteClipPath",
  "createTextCutPieceFromPolygon",
  "createRelativeTextClipPath",
  "vectorCutPolygonName",
  "rememberVectorCutPolygon",
  "getStoredVectorCutPolygon",
  "beginPressureStroke",
  "getPointerPressure",
  "createPressureStrokeObject",
  "createVectorTextureSvgElements",
  "duplicateLayerObjects",
  "groupLayerObjects",
  "ungroupLayerObjects",
  "syncDrawingMode",
  "applyGradientToolToObject",
  "shadeDirectionName",
  "getShadeGradientCoords",
  "applyColorAdjustmentsToObject",
  "applyColorAdjustmentsToDataUrl",
  "colorAdjustmentsName"
].forEach((token) => addCheck(`Canvas workflow exists: ${token}`, canvasEditor.includes(token)));

[
  "selectedLayerIds",
  "duplicateLayers",
  "groupLayers",
  "ungroupLayers",
  "toggleLayersVisibility",
  "toggleLayersLock",
  "moveLayers"
].forEach((token) => addCheck(`Layer store workflow exists: ${token}`, readProjectFile("src/store/editorStore.ts").includes(token)));

[
  "requestUpdateCompositionFromSelection",
  "updateUserComposition",
  "renameUserComposition",
  "deleteUserComposition",
  "moveUserComposition",
  "importUserCompositions"
].forEach((token) => addCheck(`Composition store workflow exists: ${token}`, readProjectFile("src/store/editorStore.ts").includes(token)));

[
  "visualAssets",
  "visualAssetsLoaded",
  "loadVisualAssets",
  "addVisualAsset",
  "deleteVisualAsset",
  "requestAddVisualAssetToCanvas",
  "localVisualAssetsKey"
].forEach((token) => addCheck(`Visual asset store workflow exists: ${token}`, readProjectFile("src/store/editorStore.ts").includes(token)));

[
  "indexedDB.open",
  "visual-assets",
  "loadVisualAssetsFromIndexedDb",
  "saveVisualAssetToIndexedDb",
  "deleteVisualAssetFromIndexedDb",
  "replaceVisualAssetsInIndexedDb"
].forEach((token) => addCheck(`IndexedDB visual asset storage exists: ${token}`, visualAssetStorage.includes(token)));

[
  "downloadCompositionLibraryFile",
  "parseCompositionImportFile",
  "CompositionIconButton",
  "compositionImportInputRef"
].forEach((token) => addCheck(`Composition management UI exists: ${token}`, librariesPanel.includes(token)));

[
  "formPresets",
  "pigmentSwatches",
  "texturePresets",
  "compositionPresets"
].forEach((token) => addCheck(`Library export exists: ${token}`, libraryAssets.includes(token)));

[
  "vector-stipple",
  "rosette-screen",
  "fiber-hatch",
  "turquoise-mesh",
  "bauhaus-block-print",
  "pop-benday-red",
  "serigraphy-bars-klein",
  "op-art-waves-ink",
  "pop-burst-turquoise"
].forEach((token) => addCheck(`Vector texture exists: ${token}`, libraryAssets.includes(token)));

[
  "bauhaus-weave-primary",
  "bauhaus-arch-grid",
  "pop-halftone-klein",
  "screenprint-offset-red",
  "group: \"bauhaus\"",
  "group: \"popArt\"",
  "group: \"serigraphy\"",
  "renderMode: \"vector\""
].forEach((token) =>
  addCheck(`Expanded texture metadata exists: ${token}`, libraryAssets.includes(token))
);

[
  "grainFinishPresets",
  "Soft",
  "Press",
  "Grit",
  "gradientToolSettings",
  "ToolbarGradientIcon",
  "data-tour=\"gradient-tool-panel\""
].forEach((token) => addCheck(`Film grain preset exists: ${token}`, leftToolbar.includes(token)));

[
  "driver(",
  "BlendModePreview",
  "data-tour=\"layers\"",
  "data-tour=\"layers-actions\"",
  "data-tour=\"export-settings\"",
  "jpg-srgb-export",
  "visual-library-button",
  "IndexedDB",
  "Obras finales",
  "Motosierra",
  "Degradado directo",
  "Tour por tareas reales",
  "Exportar JPG sRGB",
  "Fusion y efectos"
].forEach((token) => addCheck(`Right panel tour/control exists: ${token}`, rightPanel.includes(token)));

[
  "Composition color",
  "Selected color",
  "global-color-grade",
  "Channel mixer",
  "CanvasColorAdjustmentsPanel"
].forEach((token) => addCheck(`Canvas color control exists: ${token}`, canvasEditor.includes(token)));

addCheck(
  "Libraries panel tour marker exists: data-tour=\"libraries\"",
  librariesPanel.includes("data-tour=\"libraries\"")
);
addCheck(
  "Libraries panel texture tour marker exists: data-tour=\"textures-vector-note\"",
  librariesPanel.includes("data-tour=\"textures-vector-note\"")
);

[
  "requestExportJpeg",
  "JPG sRGB",
  "onOpenVisualAssets",
  "Library",
  "data-tour=\"visual-library-button\"",
  "data-tour=\"jpg-srgb-export\"",
  "requestExportProjectJson",
  "requestImportProjectJson"
].forEach((token) => addCheck(`Top bar action exists: ${token}`, topBar.includes(token)));

[
  "a1",
  "a2",
  "a3",
  "a4",
  "a5",
  "poster-50x70",
  "minCanvasDpi = 150",
  "defaultCanvasDpi = 300"
].forEach((token) => addCheck(`Canvas preset exists: ${token}`, canvasPresets.includes(token)));

[
  "PPP",
  "minCanvasDpi",
  "maxCanvasDpi",
  "Bleed",
  "Safe",
  "Crop marks"
].forEach((token) => addCheck(`Canvas PPP control exists: ${token}`, rightPanel.includes(token) || canvasEditor.includes(token)));

[
  "Biblioteca visual",
  "Composiciones",
  "Pigmentos",
  "Mezcla pigmentos",
  "Paletas",
  "Texturas",
  "Obras finales",
  "Importar carpeta",
  "Preview",
  "Carrete de",
  "doble click para importar",
  "Importar al lienzo",
  "handleApplyPaletteColor",
  "extractPaletteFromImage",
  "Guardar paleta",
  "Crear mezcla",
  "requestAddVisualAssetToCanvas"
].forEach((token) => addCheck(`Visual assets modal exists: ${token}`, visualAssetsModal.includes(token)));

[
  "getExportJpegQuality",
  "getSrgbCanvasContext",
  "sRGB",
  "jpegQuality"
].forEach((token) =>
  addCheck(`JPG sRGB export workflow exists: ${token}`, canvasEditor.includes(token))
);

[
  "professionalPrintPresets",
  "gallery-print",
  "riso-proof",
  "cropMarksEnabled"
].forEach((token) =>
  addCheck(
    `Professional print preset exists: ${token}`,
    readProjectFile("src/canvas/exportPresets.ts").includes(token)
  )
);

[
  "manualChunks",
  "fabric",
  "vector-geometry",
  "vendor"
].forEach((token) => addCheck(`Vite chunk split exists: ${token}`, viteConfig.includes(token)));

const cursorAssets = listFiles("public/cursors");
const fontAssets = listFiles("public/fonts");

addCheck("Cursor assets are present", cursorAssets.length >= 6);
addCheck("Font assets are present", fontAssets.length >= 5);
addCheck("README references the product roadmap", readme.includes("Product Roadmap"));

[
  "Figure Matrix",
  "Focus Scenarios",
  "Chainsaw Compound",
  "Export JPG",
  "Blend Modes",
  "Gradient Tool",
  "Selected Color",
  "Composition Color",
  "Fail Fast Rules"
].forEach((token) =>
  addCheck(`Visual QA matrix section exists: ${token}`, visualQaMatrix.includes(token))
);

const formLabels = Array.from(
  libraryAssets.matchAll(/label: "([^"]+)", type:/g),
  (match) => match[1]
);

formLabels.forEach((label) =>
  addCheck(
    `Visual QA matrix covers form: ${label}`,
    visualQaMatrix.includes(`| ${label} |`)
  )
);

const failedChecks = checks.filter((check) => !check.passed);

if (failedChecks.length > 0) {
  console.error("QA smoke failed:");

  failedChecks.forEach((check) => {
    console.error(`- ${check.label}`);
  });

  process.exit(1);
}

console.log(`QA smoke passed (${checks.length} checks).`);
