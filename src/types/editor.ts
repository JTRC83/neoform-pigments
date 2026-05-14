import type {
  CompositionPreset,
  FormPreset,
  PigmentSwatch,
  SavedComposition,
  TexturePreset
} from "./library";

export type EditorTool =
  | "select"
  | "inverseSelection"
  | "pan"
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "straightLine"
  | "curveLine"
  | "waveLine"
  | "text"
  | "pencilStroke"
  | "nibStroke"
  | "markerStroke"
  | "gradientTool"
  | "contentEraser"
  | "chainsawCut"
  | "lawnMower";

export type CanvasObjectType =
  | "rectangle"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "pentagon"
  | "hexagon"
  | "straightLine"
  | "curveLine"
  | "waveLine"
  | "pill"
  | "semicircle"
  | "quarterCircle"
  | "starburst"
  | "scallop"
  | "drop"
  | "petalGrid"
  | "circleCluster"
  | "crossBurst"
  | "semicircleStack"
  | "triangleGrid"
  | "shield"
  | "crescent"
  | "pacman"
  | "arch"
  | "asterisk"
  | "cornerPinwheel"
  | "quarterRings"
  | "portal"
  | "petalBurst"
  | "eye"
  | "boltClassic"
  | "boltSharp"
  | "boltStep"
  | "image"
  | "inverseSelection"
  | "text"
  | "textOutline"
  | "pencilStroke"
  | "nibStroke"
  | "markerStroke"
  | "group";

export type CanvasObjectSummary = {
  id: string;
  artboardId: string;
  type: CanvasObjectType;
  name: string;
  visible: boolean;
  locked: boolean;
};

export type CanvasSelectionRequest = {
  objectId: string | null;
  objectIds?: string[];
  requestId: number;
};

export type BlendMode =
  | "source-over"
  | "multiply"
  | "screen"
  | "overlay"
  | "darken"
  | "lighten"
  | "color-burn"
  | "difference"
  | "exclusion";

export type ShadowPreset = "none" | "hard" | "soft" | "long";

export type CanvasCursorStyle =
  | "auto"
  | "target"
  | "finger"
  | "rocket"
  | "paperPlane"
  | "tapHand"
  | "pencil";

export type CanvasFinishSettings = {
  filmGrainEnabled: boolean;
  filmGrainAmount: number;
  filmGrainRoughness: number;
  colorAdjustments: ColorAdjustmentSettings;
};

export type ColorAdjustmentSettings = {
  exposure: number;
  contrast: number;
  saturation: number;
  temperature: number;
  channelRed: number;
  channelGreen: number;
  channelBlue: number;
};

export type GradientToolDirection =
  | "tl-br"
  | "tr-bl"
  | "left-right"
  | "right-left"
  | "top-bottom"
  | "bottom-top";

export type GradientToolSettings = {
  direction: GradientToolDirection;
  intensity: number;
};

export type ImageMaskShape =
  | "none"
  | "rectangle"
  | "ellipse"
  | "rounded"
  | "triangle"
  | "diamond"
  | "hexagon"
  | "star";

export type PrintPresetId =
  | "screen"
  | "digital-proof"
  | "a4-print"
  | "a3-poster"
  | "gallery-print"
  | "riso-proof"
  | "social-square"
  | "custom";

export type ProfessionalExportSettings = {
  cropMarksEnabled: boolean;
  dpi: number;
  bleedMm: number;
  jpegQuality: number;
  safeMarginMm: number;
  presetId: PrintPresetId;
};

export type ColorMode = "light" | "standard" | "dark";

export type TextFontFamily =
  | "Space Grotesk"
  | "Archivo Black"
  | "Libre Baskerville"
  | "IBM Plex Mono"
  | "Permanent Marker";

export type LayerActionType =
  | "delete"
  | "duplicate"
  | "group"
  | "ungroup"
  | "toggle-visibility"
  | "toggle-lock"
  | "move-up"
  | "move-down"
  | "move-front"
  | "move-back"
  | "rename"
  | "flatten";

export type LayerActionRequest = {
  action: LayerActionType;
  objectId?: string;
  objectIds: string[];
  requestId: number;
};

export type LibraryActionRequest =
  | {
      action: "add-form";
      form: FormPreset;
      requestId: number;
    }
  | {
      action: "apply-pigment";
      pigment: PigmentSwatch;
      requestId: number;
    }
  | {
      action: "apply-texture";
      texture: TexturePreset;
      requestId: number;
    }
  | {
      action: "add-composition";
      composition: CompositionPreset;
      requestId: number;
    }
  | {
      action: "add-visual-asset";
      asset: VisualAsset;
      requestId: number;
    }
  | {
      action: "add-canvas-layer";
      fill: string;
      name: string;
      requestId: number;
    };

export type VisualAssetCategory =
  | "compositions"
  | "pigments"
  | "pigment-mixes"
  | "color-palettes"
  | "textures"
  | "final-works";

export type VisualAsset = {
  id: string;
  category: VisualAssetCategory;
  createdAt: string;
  dataUrl: string;
  kind?: "image" | "palette" | "mix";
  mimeType: string;
  name: string;
  paletteLayout?: "line" | "grid" | "block";
  palette?: string[];
  sourceAssetId?: string;
};

export type CompositionSaveRequest = {
  requestId: number;
  targetId?: string;
};

export type ExportRequest = {
  format:
    | "png"
    | "jpeg"
    | "svg"
    | "all-png"
    | "all-jpeg"
    | "pdf"
    | "package";
  requestId: number;
};

export type ProjectPersistenceRequest = {
  requestId: number;
};

export type ProjectImportRequest = {
  project: SavedProject;
  requestId: number;
};

export type EditorHistoryRequest = {
  action: "undo" | "redo";
  requestId: number;
};

export type CanvasViewportRequest = {
  action: "zoom-in" | "zoom-out" | "fit" | "center";
  requestId: number;
};

export type SelectedObjectProperties = {
  fill: string;
  stroke: string;
  strokeWidth: number;
  opacity: number;
  blendMode: BlendMode;
  shadowPreset: ShadowPreset;
  shadeLevel: number;
  colorAdjustments: ColorAdjustmentSettings;
  lineCurvature: number;
  lineStartWidth: number;
  lineEndWidth: number;
  fontFamily: TextFontFamily;
  imageMaskShape: ImageMaskShape;
  imageMaskScale: number;
  imageMaskImageZoom: number;
  imageMaskOffsetX: number;
  imageMaskOffsetY: number;
  x: number;
  y: number;
  width: number;
  height: number;
};

export type PropertyUpdateRequest = {
  properties: Partial<SelectedObjectProperties>;
  requestId: number;
};

export type TextOutlineRequest = {
  objectId: string;
  requestId: number;
};

export type CanvasViewSettings = {
  customGuides: CanvasGuide[];
  showGrid: boolean;
  showGoldenRatio: boolean;
};

export type CanvasGuide = {
  id: string;
  angle?: number;
  orientation: "vertical" | "horizontal" | "diagonal-down" | "diagonal-up";
  position: number;
};

export type CanvasOrientation = "landscape" | "portrait";

export type CanvasFormat = {
  id: string;
  label: string;
  width: number;
  height: number;
  widthMm?: number;
  heightMm?: number;
};

export type Artboard = {
  id: string;
  name: string;
  formatId: string;
  orientation: CanvasOrientation;
  width: number;
  height: number;
};

export type SavedProject = {
  version: 1;
  projectName: string;
  artboards: Artboard[];
  activeArtboardId: string;
  canvasSnapshots: Record<string, string>;
  canvasObjects: CanvasObjectSummary[];
  visualAssets?: VisualAsset[];
  finishSettings?: CanvasFinishSettings;
  exportSettings?: ProfessionalExportSettings;
  userCompositions?: SavedComposition[];
  viewSettings: CanvasViewSettings;
  savedAt: string;
};
