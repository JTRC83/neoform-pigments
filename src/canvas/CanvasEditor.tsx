import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import polygonClipping from "polygon-clipping";
import type { MultiPolygon as ClipMultiPolygon, Ring as ClipRing } from "polygon-clipping";
import * as opentype from "opentype.js";
import type { Font as OpenTypeFont, PathCommand as OpenTypePathCommand } from "opentype.js";
import {
  ActiveSelection,
  Ellipse,
  FabricImage,
  Gradient,
  Group,
  Line,
  Pattern,
  Path,
  Point,
  Polygon,
  Rect,
  Shadow,
  Textbox,
  util
} from "fabric";
import type { FabricObject, TMat2D, TPointerEventInfo } from "fabric";
import { useEditorStore } from "../store/editorStore";
import { clsx } from "../utils/clsx";
import {
  createBasicShape,
  getLineCurvatureForObject,
  getLineWidthsForObject,
  getShapeKindForObject,
  createShapeSummary,
  isDrawingTool,
  isFreehandObjectType,
  isShapeTool,
  isLineObjectType,
  updateLineCurvatureForObject,
  updateLineWidthsForObject,
  updateSymmetryGuidesForObject
} from "./basicShapes";
import { defaultCanvasDpi, maxCanvasDpi, minCanvasDpi } from "./canvasPresets";
import {
  createFabricCanvas,
  disposeFabricCanvas,
  resizeFabricCanvas
} from "./fabricCanvas";
import { professionalPrintPresets } from "./exportPresets";
import { CanvasGuides } from "./CanvasGuides";
import type {
  CanvasObjectType,
  CanvasObjectSummary,
  BlendMode,
  CanvasCursorStyle,
  CanvasFinishSettings,
  ColorAdjustmentSettings,
  ColorMode,
  EditorTool,
  GradientToolDirection,
  GradientToolSettings,
  ProfessionalExportSettings,
  SavedProject,
  SelectedObjectProperties,
  TextFontFamily,
  VisualAsset
} from "../types/editor";
import type {
  CompositionPreset,
  SavedComposition,
  TexturePreset
} from "../types/library";
import { getTextFontWeight, normalizeTextFontFamily } from "../utils/textFonts";

type FabricPaint = string | Pattern | Gradient<"linear"> | Gradient<"radial">;

type DimensionUnit = "px" | "cm" | "mm";

const BASE_PRINT_DPI = defaultCanvasDpi;
const localExportCounterKey = "neoform-pigments:export-counters:v1";

type DimensionEditorState = {
  unit: DimensionUnit;
  width: string;
  height: string;
  keepRatio: boolean;
  aspectRatio: number;
};

type LineEditOverlayState = {
  curve: number;
  curveX: number;
  curveY: number;
  endWidth: number;
  endX: number;
  endY: number;
  objectId: string;
  startWidth: number;
  startX: number;
  startY: number;
};

type ExportArtboardLike = {
  id?: string;
  name: string;
  width: number;
  height: number;
};

type ProfessionalExportSpec = {
  artworkOffsetPx: number;
  bleedPx: number;
  cropMarkMarginPx: number;
  cropMarksEnabled: boolean;
  designHeightPx: number;
  designWidthPx: number;
  dpi: number;
  finalHeightPx: number;
  finalWidthPx: number;
  pageHeightPt: number;
  pageWidthPt: number;
  safeMarginPx: number;
};

type LineEditHandle = "start" | "curve" | "end";

type MotionCursorState = {
  angle: number;
  phase: "idle" | "press" | "drag" | "release";
  releaseKey: number;
  visible: boolean;
  x: number;
  y: number;
};

type MotionCursorKind = "rocket" | "paperPlane" | "finger" | "tapHand";

type VectorCutState = {
  preview: Line;
  start: Point;
  target?: FabricObject;
};

type GradientToolState = {
  preview: Line;
  start: Point;
  target: FabricObject;
};

type ContentEraseSelectionState = {
  preview: Rect;
  start: Point;
  target?: FabricObject;
};

type PressureStrokePoint = {
  pressure: number;
  width: number;
  x: number;
  y: number;
};

type PressureStrokeState = {
  points: PressureStrokePoint[];
  preview: Path;
  tool: Extract<CanvasObjectType, EditorTool>;
};

const editingOutlineStroke = "#101010";
const editingOutlineWidth = 2;
const editingOutlineState = new WeakMap<
  FabricObject,
  { stroke: unknown; strokeWidth: unknown }
>();
const shadowPresetName = "neoform-shadow-preset";
const shadeLevelName = "neoform-shade-level";
const shadeBaseColorName = "neoform-shade-base";
const shadeDirectionName = "neoform-shade-direction";
const colorAdjustmentsName = "neoform-color-adjustments";
const colorBaseFillName = "neoform-color-base-fill";
const colorBaseStrokeName = "neoform-color-base-stroke";
const pressureStrokeName = "neoform-pressure-stroke";
const visualAssetIdName = "neoform-visual-asset-id";
const vectorCutPolygonName = "neoform-vector-cut-polygon";
const vectorCutPolygonSpaceName = "neoform-vector-cut-polygon-space";
const contentEraseRectsName = "neoform-content-erase-rects";
const contentEraseClipKindName = "neoform-content-erase-clip";
const customObjectProperties = [
  "id",
  "name",
  "visible",
  "selectable",
  "evented",
  "hasControls",
  "lockMovementX",
  "lockMovementY",
  "lockScalingX",
  "lockScalingY",
  "lockRotation",
  "globalCompositeOperation",
  "neoform-shape-kind",
  "neoform-line-curvature",
  "neoform-line-dimensions",
  "neoform-line-start-width",
  "neoform-line-end-width",
  pressureStrokeName,
  shadowPresetName,
  shadeLevelName,
  shadeBaseColorName,
  shadeDirectionName,
  colorAdjustmentsName,
  colorBaseFillName,
  colorBaseStrokeName,
  visualAssetIdName,
  vectorCutPolygonName,
  vectorCutPolygonSpaceName,
  contentEraseRectsName
];
const textFontFiles: Record<TextFontFamily, string> = {
  "Archivo Black": "/fonts/archivo-black.ttf",
  "IBM Plex Mono": "/fonts/ibm-plex-mono-700.ttf",
  "Libre Baskerville": "/fonts/libre-baskerville-700.ttf",
  "Permanent Marker": "/fonts/permanent-marker.ttf",
  "Space Grotesk": "/fonts/space-grotesk-700.ttf"
};
const textFontCache = new Map<TextFontFamily, Promise<OpenTypeFont>>();
const canvasCursorOptions: CanvasCursorStyle[] = [
  "auto",
  "target",
  "finger",
  "rocket",
  "paperPlane",
  "tapHand",
  "pencil"
];
const canvasCursorLabels: Record<CanvasCursorStyle, string> = {
  auto: "Auto",
  target: "Target",
  finger: "Finger",
  rocket: "Rocket",
  paperPlane: "Plane",
  tapHand: "Tattoo",
  pencil: "Pencil"
};
const cursorThemeColors: Record<ColorMode, Record<"--color-ink" | "--color-paper", string>> = {
  dark: {
    "--color-ink": "rgb(245, 245, 245)",
    "--color-paper": "rgb(18, 18, 18)"
  },
  light: {
    "--color-ink": "rgb(16, 16, 16)",
    "--color-paper": "rgb(242, 230, 206)"
  },
  standard: {
    "--color-ink": "rgb(16, 16, 16)",
    "--color-paper": "rgb(255, 246, 216)"
  }
};

const colorAdjustmentControls: Array<{
  key: keyof ColorAdjustmentSettings;
  label: string;
  max: number;
  min: number;
  reset: number;
  step: number;
  suffix?: string;
}> = [
  { key: "exposure", label: "Exposure", max: 1, min: -1, reset: 0, step: 0.05 },
  { key: "contrast", label: "Contrast", max: 1, min: -1, reset: 0, step: 0.05 },
  { key: "saturation", label: "Saturation", max: 1, min: -1, reset: 0, step: 0.05 },
  { key: "temperature", label: "Temp", max: 1, min: -1, reset: 0, step: 0.05 },
  { key: "channelRed", label: "Red", max: 2, min: 0, reset: 1, step: 0.05, suffix: "x" },
  { key: "channelGreen", label: "Green", max: 2, min: 0, reset: 1, step: 0.05, suffix: "x" },
  { key: "channelBlue", label: "Blue", max: 2, min: 0, reset: 1, step: 0.05, suffix: "x" }
];
const colorAdjustmentGroups: Array<{
  keys: Array<keyof ColorAdjustmentSettings>;
  label: string;
}> = [
  { label: "Exposure / Contrast", keys: ["exposure", "contrast"] },
  { label: "Saturation / Temperature", keys: ["saturation", "temperature"] },
  { label: "Channel mixer", keys: ["channelRed", "channelGreen", "channelBlue"] }
];
const defaultColorAdjustments: ColorAdjustmentSettings = {
  channelBlue: 1,
  channelGreen: 1,
  channelRed: 1,
  contrast: 0,
  exposure: 0,
  saturation: 0,
  temperature: 0
};

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMotionCursorPointRef = useRef<{ x: number; y: number } | null>(null);
  const [viewportZoom, setViewportZoom] = useState(1);
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "mm">("cm");
  const [dimensionEditor, setDimensionEditor] =
    useState<DimensionEditorState | null>(null);
  const [colorAdjustmentScope, setColorAdjustmentScope] =
    useState<"composition" | "selected">("composition");
  const [isColorPanelOpen, setIsColorPanelOpen] = useState(false);
  const [lineEditOverlay, setLineEditOverlay] =
    useState<LineEditOverlayState | null>(null);
  const [motionCursor, setMotionCursor] = useState<MotionCursorState>({
    angle: 0,
    phase: "idle",
    releaseKey: 0,
    visible: false,
    x: 0,
    y: 0
  });
  const activeTool = useEditorStore((state) => state.activeTool);
  const cursorStyle = useEditorStore((state) => state.cursorStyle);
  const colorMode = useEditorStore((state) => state.colorMode);
  const setCursorStyle = useEditorStore((state) => state.setCursorStyle);
  const finishSettings = useEditorStore((state) => state.finishSettings);
  const setFinishSettings = useEditorStore((state) => state.setFinishSettings);
  const selectedObjectProperties = useEditorStore(
    (state) => state.selectedObjectProperties
  );
  const exportSettings = useEditorStore((state) => state.exportSettings);
  const setExportSettings = useEditorStore((state) => state.setExportSettings);
  const viewSettings = useEditorStore((state) => state.viewSettings);
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId);
  const activeArtboard = useEditorStore((state) =>
    state.artboards.find((artboard) => artboard.id === state.activeArtboardId)
  );
  const requestViewportAction = useEditorStore(
    (state) => state.requestViewportAction
  );
  const updateActiveArtboardSize = useEditorStore(
    (state) => state.updateActiveArtboardSize
  );
  const requestSelectedObjectPropertyUpdate = useEditorStore(
    (state) => state.requestSelectedObjectPropertyUpdate
  );
  const updateCanvasGuide = useEditorStore((state) => state.updateCanvasGuide);
  const removeCanvasGuide = useEditorStore((state) => state.removeCanvasGuide);
  const motionCursorKind: MotionCursorKind | null =
    activeTool !== "chainsawCut" &&
    activeTool !== "lawnMower" &&
    (cursorStyle === "rocket" ||
      cursorStyle === "paperPlane" ||
      cursorStyle === "finger" ||
      cursorStyle === "tapHand")
      ? cursorStyle
      : null;
  const handleMotionCursorMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!motionCursorKind) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const scaleX = event.currentTarget.offsetWidth / bounds.width;
    const scaleY = event.currentTarget.offsetHeight / bounds.height;
    const nextPoint = {
      x: (event.clientX - bounds.left) * scaleX,
      y: (event.clientY - bounds.top) * scaleY
    };
    const previousPoint = lastMotionCursorPointRef.current;
    const deltaX = previousPoint ? nextPoint.x - previousPoint.x : 1;
    const deltaY = previousPoint ? nextPoint.y - previousPoint.y : 0;
    const distance = Math.hypot(deltaX, deltaY);
    const shouldRotate =
      motionCursorKind === "rocket" || motionCursorKind === "paperPlane";

    lastMotionCursorPointRef.current = nextPoint;
    setMotionCursor((cursor) => ({
      angle:
        shouldRotate && distance > 0.9
          ? (Math.atan2(deltaY, deltaX) * 180) / Math.PI
          : shouldRotate
            ? cursor.angle
            : 0,
      phase:
        !shouldRotate &&
        distance > 2.5 &&
        (cursor.phase === "press" || cursor.phase === "drag")
          ? "drag"
          : cursor.phase === "release"
            ? "idle"
            : cursor.phase,
      releaseKey: cursor.releaseKey,
      visible: true,
      x: nextPoint.x,
      y: nextPoint.y
    }));
  };
  const handleMotionCursorPointerDown = (
    event: ReactPointerEvent<HTMLDivElement>
  ) => {
    if (!motionCursorKind) {
      return;
    }

    handleMotionCursorMove(event);

    if (motionCursorKind === "finger" || motionCursorKind === "tapHand") {
      setMotionCursor((cursor) => ({
        ...cursor,
        phase: "press",
        visible: true
      }));
    }
  };
  const handleMotionCursorPointerUp = () => {
    if (motionCursorKind !== "finger" && motionCursorKind !== "tapHand") {
      return;
    }

    setMotionCursor((cursor) => ({
      ...cursor,
      phase: "release",
      releaseKey: cursor.releaseKey + 1
    }));

    window.setTimeout(() => {
      setMotionCursor((cursor) =>
        cursor.phase === "release" ? { ...cursor, phase: "idle" } : cursor
      );
    }, 220);
  };
  const hideMotionCursor = () => {
    lastMotionCursorPointRef.current = null;
    setMotionCursor((cursor) => ({
      ...cursor,
      phase: "idle",
      visible: false
    }));
  };
  const handleViewportAction = (
    action: "zoom-in" | "zoom-out" | "fit" | "center"
  ) => {
    if (action === "zoom-in") {
      setViewportZoom((zoom) => Math.min(Number((zoom * 1.15).toFixed(2)), 2.5));
      return;
    }

    if (action === "zoom-out") {
      setViewportZoom((zoom) => Math.max(Number((zoom / 1.15).toFixed(2)), 0.45));
      return;
    }

    if (action === "fit") {
      setViewportZoom(1);
    }

    requestViewportAction(action);
  };
  const artboardDimensions = activeArtboard
    ? getArtboardDimensionLabels(activeArtboard, dimensionUnit, exportSettings.dpi)
    : null;
  const openDimensionEditor = () => {
    if (!activeArtboard) {
      return;
    }

    setDimensionEditor({
      unit: "px",
      width: String(activeArtboard.width),
      height: String(activeArtboard.height),
      keepRatio: true,
      aspectRatio: activeArtboard.width / activeArtboard.height
    });
  };
  const cycleCursorStyle = () => {
    const currentIndex = canvasCursorOptions.indexOf(cursorStyle);
    const nextCursorStyle =
      canvasCursorOptions[(currentIndex + 1) % canvasCursorOptions.length];

    setCursorStyle(nextCursorStyle);
  };
  const professionalExportLabel = `${exportSettings.dpi} PPP · ${exportSettings.bleedMm}mm bleed · ${exportSettings.safeMarginMm}mm safe`;
  const applyPrintExportPreset = (
    presetId: ProfessionalExportSettings["presetId"]
  ) => {
    const preset = professionalPrintPresets[presetId];

    if (!preset) {
      return;
    }

    setExportSettings(preset.settings);
  };
  const updateExportNumber = (
    key: "dpi" | "bleedMm" | "safeMarginMm",
    value: number
  ) => {
    if (!Number.isFinite(value)) {
      return;
    }

    const limits = {
      bleedMm: [0, 20],
      dpi: [minCanvasDpi, maxCanvasDpi],
      safeMarginMm: [0, 40]
    } as const;
    const [min, max] = limits[key];
    const nextValue = Math.min(Math.max(value, min), max);

    setExportSettings({ [key]: nextValue, presetId: "custom" });
  };
  const closeDimensionEditor = () => setDimensionEditor(null);

  useEffect(() => {
    if (!motionCursorKind) {
      hideMotionCursor();
    }
  }, [motionCursorKind]);

  const updateDimensionValue = (field: "width" | "height", value: string) => {
    setDimensionEditor((editor) => {
      if (!editor) {
        return editor;
      }

      const next = { ...editor, [field]: value };
      const parsedValue = Number(value);

      if (!editor.keepRatio || !Number.isFinite(parsedValue) || parsedValue <= 0) {
        return next;
      }

      if (field === "width") {
        next.height = formatDimensionInput(parsedValue / editor.aspectRatio, editor.unit);
      } else {
        next.width = formatDimensionInput(parsedValue * editor.aspectRatio, editor.unit);
      }

      return next;
    });
  };
  const changeDimensionEditorUnit = (unit: DimensionUnit) => {
    setDimensionEditor((editor) => {
      if (!editor || editor.unit === unit) {
        return editor;
      }

      const widthPx = dimensionValueToPixels(
        Number(editor.width),
        editor.unit,
        exportSettings.dpi
      );
      const heightPx = dimensionValueToPixels(
        Number(editor.height),
        editor.unit,
        exportSettings.dpi
      );

      return {
        ...editor,
        unit,
        width: Number.isFinite(widthPx)
          ? formatDimensionInput(
              pixelsToDimensionValue(widthPx, unit, exportSettings.dpi),
              unit
            )
          : "",
        height: Number.isFinite(heightPx)
          ? formatDimensionInput(
              pixelsToDimensionValue(heightPx, unit, exportSettings.dpi),
              unit
            )
          : ""
      };
    });
  };
  const applyDimensionEditor = () => {
    if (!dimensionEditor) {
      return;
    }

    const width = clampArtboardPixels(
      dimensionValueToPixels(
        Number(dimensionEditor.width),
        dimensionEditor.unit,
        exportSettings.dpi
      )
    );
    const height = clampArtboardPixels(
      dimensionValueToPixels(
        Number(dimensionEditor.height),
        dimensionEditor.unit,
        exportSettings.dpi
      )
    );

    if (!width || !height) {
      return;
    }

    updateActiveArtboardSize(width, height);
    closeDimensionEditor();
  };
  const beginLineHandleDrag = (
    handle: LineEditHandle,
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    if (!lineEditOverlay) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();

    const startY = event.clientY;
    const initialCurve = lineEditOverlay.curve;
    const initialStartWidth = lineEditOverlay.startWidth;
    const initialEndWidth = lineEditOverlay.endWidth;

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaY = startY - moveEvent.clientY;

      if (handle === "curve") {
        requestSelectedObjectPropertyUpdate({
          lineCurvature: clampNumber(Math.round(initialCurve + deltaY * 0.7), -72, 72)
        });
        return;
      }

      if (handle === "start") {
        requestSelectedObjectPropertyUpdate({
          lineStartWidth: clampNumber(
            Math.round(initialStartWidth + deltaY * 0.35),
            1,
            80
          )
        });
        return;
      }

      requestSelectedObjectPropertyUpdate({
        lineEndWidth: clampNumber(Math.round(initialEndWidth + deltaY * 0.35), 1, 80)
      });
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  useEffect(() => {
    if (!canvasRef.current) {
      return;
    }

    const canvas = createFabricCanvas(canvasRef.current);
    const parent = canvasRef.current.parentElement;
    const resizeObserver = new ResizeObserver(() => resizeFabricCanvas(canvas));
    let currentArtboardId = useEditorStore.getState().activeArtboardId;
    let isLoadingProject = false;
    let isRestoringHistory = false;
    let isPanning = false;
    let vectorCutState: VectorCutState | null = null;
    let gradientToolState: GradientToolState | null = null;
    let contentEraseSelectionState: ContentEraseSelectionState | null = null;
    let pressureStrokeState: PressureStrokeState | null = null;
    let lastPanPoint = { x: 0, y: 0 };
    const undoStack: Array<{ objects: CanvasObjectSummary[]; snapshot: string }> = [];
    const redoStack: typeof undoStack = [];

    applyFabricCanvasCursor(
      canvas,
      useEditorStore.getState().activeTool,
      useEditorStore.getState().cursorStyle
    );
    syncDrawingMode(canvas, useEditorStore.getState().activeTool);

    if (parent) {
      resizeObserver.observe(parent);
    }

    const syncCanvasSelectionState = (objects: FabricObject[]) => {
      const ids = objects
        .map((object) => object.get("id"))
        .filter((id): id is string => typeof id === "string");

      useEditorStore.getState().setCanvasSelection(ids);
    };

    const refreshLineEditOverlay = (object?: FabricObject | null) => {
      const shapeKind = getShapeKindForObject(object);

      if (!object || !isLineObjectType(shapeKind)) {
        setLineEditOverlay(null);
        return;
      }

      const canvasElement = canvas.getElement();
      const canvasBounds = canvasElement.getBoundingClientRect();
      const scaleX = canvasBounds.width / canvas.getWidth();
      const scaleY = canvasBounds.height / canvas.getHeight();
      const bounds = object.getBoundingRect();
      const curvature = getLineCurvatureForObject(object);
      const widths = getLineWidthsForObject(object);
      const centerY = bounds.top + bounds.height / 2;
      const curveHandleY =
        bounds.top + bounds.height / 2 - curvature - Math.sign(curvature || 1) * 26;

      setLineEditOverlay({
        curve: curvature,
        curveX: (bounds.left + bounds.width / 2) * scaleX,
        curveY: curveHandleY * scaleY,
        endWidth: widths.endWidth,
        endX: (bounds.left + bounds.width) * scaleX,
        endY: centerY * scaleY,
        objectId: String(object.get("id") ?? ""),
        startWidth: widths.startWidth,
        startX: bounds.left * scaleX,
        startY: centerY * scaleY
      });
    };

    const beginVectorCut = (event: TPointerEventInfo) => {
      const activeObject = canvas.getActiveObject();
      const target =
        activeObject && isInverseSelectionMask(activeObject)
          ? activeObject
          : (event.target as FabricObject | undefined) ?? activeObject;

      const pointer = canvas.getPointer(event.e);
      const start = new Point(pointer.x, pointer.y);
      const preview = new Line([start.x, start.y, start.x, start.y], {
        evented: false,
        selectable: false,
        stroke: "#FF4F2E",
        strokeDashArray: [10, 7],
        strokeLineCap: "square",
        strokeWidth: 2
      });

      preview.set({
        excludeFromExport: true,
        name: "chainsaw-cut-preview"
      });

      vectorCutState = {
        preview,
        start,
        target: target?.get("name") === "symmetry-guide" ? undefined : target
      };
      canvas.add(preview);
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.requestRenderAll();
    };

    const updateVectorCut = (event: TPointerEventInfo) => {
      if (!vectorCutState) {
        return false;
      }

      const pointer = canvas.getPointer(event.e);

      vectorCutState.preview.set({
        x2: pointer.x,
        y2: pointer.y
      });
      vectorCutState.preview.setCoords();
      canvas.requestRenderAll();
      return true;
    };

    const finishVectorCut = async (event: TPointerEventInfo) => {
      if (!vectorCutState) {
        return false;
      }

      const { preview, start, target: initialTarget } = vectorCutState;
      const pointer = canvas.getPointer(event.e);
      const end = new Point(pointer.x, pointer.y);

      canvas.remove(preview);
      vectorCutState = null;
      canvas.selection = true;

      if (Math.hypot(end.x - start.x, end.y - start.y) < 12) {
        canvas.requestRenderAll();
        return true;
      }

      const targets = findVectorCutTargets(
        canvas.getObjects(),
        start,
        end,
        initialTarget
      );

      if (targets.length === 0) {
        canvas.requestRenderAll();
        return true;
      }

      const cutOutcomes: Array<{ pieces: FabricObject[]; target: FabricObject }> = [];

      for (const target of targets) {
        const pieces = await createVectorCutPieces(target, start, end);

        if (pieces.length >= 2) {
          cutOutcomes.push({ pieces, target });
        }
      }

      if (cutOutcomes.length === 0) {
        canvas.setActiveObject(targets[0]);
        canvas.requestRenderAll();
        flashUnsupportedVectorCutTarget(canvas, targets[0]);
        showVectorCutNotice(
          isTextObject(targets[0])
            ? "Convierte primero el texto a Outline text para revisar contornos antes de cortarlo."
            : "Corte protegido: esta figura necesita normalización antes de cortarse sin romperse. La he dejado intacta."
        );
        return true;
      }

      const state = useEditorStore.getState();
      let nextObjects = state.canvasObjects.filter(
        (object) => object.artboardId === currentArtboardId
      );
      const createdPieces: Array<{
        piece: FabricObject;
        summary: CanvasObjectSummary;
      }> = [];

      cutOutcomes.forEach(({ pieces, target }) => {
        const oldId = String(target.get("id") ?? "");
        const oldSummary = state.canvasObjects.find((object) => object.id === oldId);
        const baseName = oldSummary?.name ?? String(target.get("name") ?? "Cut");
        const currentIndex = nextObjects.findIndex((object) => object.id === oldId);
        const insertionIndex = currentIndex >= 0 ? currentIndex : nextObjects.length;
        const summaries = pieces.map((piece, index) => ({
          artboardId: currentArtboardId,
          id: crypto.randomUUID(),
          locked: oldSummary?.locked ?? false,
          name: `${baseName} Piece ${index + 1}`,
          type: getVectorCutPieceType(piece),
          visible: oldSummary?.visible ?? true
        }));

        nextObjects = [
          ...nextObjects.slice(0, insertionIndex),
          ...summaries,
          ...nextObjects
            .slice(insertionIndex + (oldSummary ? 1 : 0))
            .filter((object) => object.id !== oldId)
        ];

        canvas.remove(target);
        pieces.forEach((piece, index) => {
          const summary = summaries[index];

          piece.set({
            id: summary.id,
            name: summary.name
          });
          piece.set("neoform-shape-kind", summary.type);
          applyLayerState(piece, summary);
          canvas.add(piece);
          createdPieces.push({ piece, summary });
        });
      });

      useEditorStore
        .getState()
        .replaceCanvasObjectsForArtboard(currentArtboardId, nextObjects);
      canvas.setActiveObject(createdPieces[0].piece);
      useEditorStore.getState().setSelectedObjectId(createdPieces[0].summary.id);
      syncSelectedObjectProperties(createdPieces[0].piece);
      refreshLineEditOverlay(createdPieces[0].piece);
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
      return true;
    };

    const beginGradientTool = (event: TPointerEventInfo) => {
      const tool = useEditorStore.getState().activeTool;

      if (tool !== "gradientTool") {
        return false;
      }

      const target =
        (event.target as FabricObject | undefined) ?? canvas.getActiveObject();

      if (!target || target.get("name") === "symmetry-guide") {
        showVectorCutNotice("Selecciona o arrastra sobre una figura para aplicar degradado.");
        return true;
      }

      const pointer = canvas.getPointer(event.e);
      const start = new Point(pointer.x, pointer.y);
      const preview = new Line([start.x, start.y, start.x, start.y], {
        evented: false,
        selectable: false,
        stroke: "#03DAC5",
        strokeDashArray: [6, 5],
        strokeLineCap: "square",
        strokeWidth: 2
      });

      preview.set({
        excludeFromExport: true,
        name: "gradient-tool-preview"
      });

      gradientToolState = {
        preview,
        start,
        target
      };
      canvas.add(preview);
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.requestRenderAll();
      return true;
    };

    const updateGradientTool = (event: TPointerEventInfo) => {
      if (!gradientToolState) {
        return false;
      }

      const pointer = canvas.getPointer(event.e);

      gradientToolState.preview.set({
        x2: pointer.x,
        y2: pointer.y
      });
      gradientToolState.preview.setCoords();
      canvas.requestRenderAll();
      return true;
    };

    const finishGradientTool = (event: TPointerEventInfo) => {
      if (!gradientToolState) {
        return false;
      }

      const { preview, start, target } = gradientToolState;
      const pointer = canvas.getPointer(event.e);
      const end = new Point(pointer.x, pointer.y);
      const dragDistance = Math.hypot(end.x - start.x, end.y - start.y);
      const settings = useEditorStore.getState().gradientToolSettings;
      const direction =
        dragDistance >= 10
          ? {
              x: end.x - start.x,
              y: end.y - start.y
            }
          : settings.direction;

      canvas.remove(preview);
      gradientToolState = null;
      canvas.selection = true;
      applyGradientToolToObject(target, settings, direction);
      canvas.setActiveObject(target);
      syncSelectedObjectProperties(target);
      refreshLineEditOverlay(target);
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
      return true;
    };

    const beginContentEraseSelection = (event: TPointerEventInfo) => {
      const tool = useEditorStore.getState().activeTool;

      if (tool !== "contentEraser") {
        return false;
      }

      const pointer = canvas.getPointer(event.e);
      const start = new Point(pointer.x, pointer.y);
      const target = event.target as FabricObject | undefined;
      const preview = new Rect({
        evented: false,
        excludeFromExport: true,
        fill: "rgba(255, 47, 125, 0.12)",
        height: 1,
        left: start.x,
        name: "content-erase-selection-preview",
        objectCaching: false,
        selectable: false,
        stroke: "#FF2F7D",
        strokeDashArray: [7, 5],
        strokeWidth: 2,
        top: start.y,
        width: 1
      });

      contentEraseSelectionState = {
        preview,
        start,
        target: target?.get("name") === "symmetry-guide" ? undefined : target
      };
      canvas.add(preview);
      canvas.bringObjectToFront(preview);
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.requestRenderAll();
      return true;
    };

    const updateContentEraseSelection = (event: TPointerEventInfo) => {
      if (!contentEraseSelectionState) {
        return false;
      }

      const pointer = canvas.getPointer(event.e);
      const { preview, start } = contentEraseSelectionState;
      const left = Math.min(start.x, pointer.x);
      const top = Math.min(start.y, pointer.y);
      const width = Math.abs(pointer.x - start.x);
      const height = Math.abs(pointer.y - start.y);

      preview.set({ height, left, top, width });
      preview.setCoords();
      canvas.requestRenderAll();
      return true;
    };

    const finishContentEraseSelection = (event: TPointerEventInfo) => {
      if (!contentEraseSelectionState) {
        return false;
      }

      const { preview, start, target } = contentEraseSelectionState;
      const pointer = canvas.getPointer(event.e);
      const selectionRect = getNormalizedRectFromPoints(start, pointer);
      const isClickDelete = selectionRect.width < 8 && selectionRect.height < 8;
      const state = useEditorStore.getState();
      const activeLayerSummaries = state.canvasObjects.filter(
        (summary) => summary.artboardId === currentArtboardId
      );
      const deletableIds = new Set(
        activeLayerSummaries
          .filter((summary) => summary.visible && !summary.locked)
          .map((summary) => summary.id)
      );
      const targetObjects = isClickDelete
        ? []
        : canvas.getObjects().filter((object) => {
            const objectId = String(object.get("id") ?? "");

            return (
              deletableIds.has(objectId) &&
              object.get("name") !== "symmetry-guide" &&
              object.get("name") !== "content-erase-selection-preview" &&
              rectsIntersect(selectionRect, object.getBoundingRect())
            );
          });

      canvas.remove(preview);
      contentEraseSelectionState = null;
      canvas.selection = true;

      if (isClickDelete) {
        const targetName = target?.get("name");
        const targetMessage = targetName
          ? `Arrastra un area sobre ${targetName} para borrar solo esa parte.`
          : "Arrastra un area para borrar solo la zona seleccionada.";

        showVectorCutNotice(targetMessage);
        canvas.requestRenderAll();
        return true;
      }

      if (targetObjects.length === 0) {
        showVectorCutNotice("No hay contenido editable dentro de la seleccion.");
        canvas.requestRenderAll();
        return true;
      }

      const result = applyContentEraseToObjects(canvas, targetObjects, selectionRect);

      if (result.applied === 0) {
        showVectorCutNotice(
          result.skipped > 0
            ? "Esta zona toca objetos ya recortados. No se borra para evitar romperlos."
            : "La seleccion es demasiado pequeña para borrar contenido."
        );
        canvas.requestRenderAll();
        return true;
      }

      syncSelectedObjectProperties(canvas.getActiveObject());
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
      showVectorCutNotice(
        `${result.applied} objeto(s) borrados parcialmente sin eliminar la capa.`
      );
      return true;
    };

    const beginPressureStroke = (event: TPointerEventInfo) => {
      const tool = useEditorStore.getState().activeTool;

      if (!isDrawingTool(tool)) {
        return false;
      }

      const pointer = canvas.getPointer(event.e);
      const settings = getDrawingBrushSettings(tool);
      const firstPoint = createPressureStrokePoint(pointer, event.e, settings);
      const preview = createPressureStrokeObject([firstPoint], settings, {
        preview: true
      });

      pressureStrokeState = {
        points: [firstPoint],
        preview,
        tool
      };
      canvas.discardActiveObject();
      canvas.selection = false;
      canvas.add(preview);
      canvas.requestRenderAll();
      return true;
    };

    const updatePressureStroke = (event: TPointerEventInfo) => {
      if (!pressureStrokeState) {
        return false;
      }

      const settings = getDrawingBrushSettings(pressureStrokeState.tool);
      const pointer = canvas.getPointer(event.e);
      const nextPoint = createPressureStrokePoint(pointer, event.e, settings);
      const previousPoint =
        pressureStrokeState.points[pressureStrokeState.points.length - 1];

      if (!shouldAddPressureStrokePoint(previousPoint, nextPoint)) {
        return true;
      }

      pressureStrokeState.points.push(nextPoint);
      canvas.remove(pressureStrokeState.preview);
      pressureStrokeState.preview = createPressureStrokeObject(
        pressureStrokeState.points,
        settings,
        { preview: true }
      );
      canvas.add(pressureStrokeState.preview);
      canvas.requestRenderAll();
      return true;
    };

    const finishPressureStroke = (event: TPointerEventInfo) => {
      if (!pressureStrokeState) {
        return false;
      }

      const { points, preview, tool } = pressureStrokeState;
      const settings = getDrawingBrushSettings(tool);
      const pointer = canvas.getPointer(event.e);
      const finalPoint = createPressureStrokePoint(pointer, event.e, settings);

      if (shouldAddPressureStrokePoint(points[points.length - 1], finalPoint)) {
        points.push(finalPoint);
      }

      canvas.remove(preview);
      pressureStrokeState = null;
      canvas.selection = true;

      if (points.length < 1) {
        canvas.requestRenderAll();
        return true;
      }

      const state = useEditorStore.getState();
      const objectNumber =
        state.canvasObjects.filter(
          (object) => object.artboardId === state.activeArtboardId
        ).length + 1;
      const summary = createShapeSummary(tool, objectNumber, state.activeArtboardId);
      const stroke = createPressureStrokeObject(points, settings, {
        preview: false
      });

      stroke.set({
        id: summary.id,
        name: summary.name,
        selectable: true,
        evented: true
      });
      stroke.set("neoform-shape-kind", tool);
      stroke.set(pressureStrokeName, true);
      applyLayerState(stroke, summary);
      canvas.add(stroke);
      canvas.setActiveObject(stroke);
      useEditorStore.getState().addCanvasObject(summary);
      syncSelectedObjectProperties(stroke);
      refreshLineEditOverlay(stroke);
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
      return true;
    };

    const handleCanvasClick = (event: TPointerEventInfo) => {
      const tool = useEditorStore.getState().activeTool;

      if (beginPressureStroke(event)) {
        return;
      }

      if (beginGradientTool(event)) {
        return;
      }

      if (beginContentEraseSelection(event)) {
        return;
      }

      if (tool === "chainsawCut") {
        beginVectorCut(event);
        return;
      }

      if (tool === "lawnMower") {
        const target = event.target as FabricObject | undefined;

        if (!target || target.get("name") === "symmetry-guide") {
          return;
        }

        removeObjectBackground(target);
        canvas.setActiveObject(target);
        syncSelectedObjectProperties(target);
        refreshLineEditOverlay(target);
        canvas.requestRenderAll();
        saveCurrentSnapshot();
        pushHistory();
        return;
      }

      if (tool === "inverseSelection") {
        const target = event.target as FabricObject | undefined;

        if (target && target.get("name") !== "symmetry-guide") {
          showVectorCutNotice("Haz click en el fondo para seleccionar el espacio libre.");
          return;
        }

        void addInverseSelectionMaskToCanvas(canvas).then((mask) => {
          if (!mask) {
            return;
          }

          saveCurrentSnapshot();
          pushHistory();
        });
        return;
      }

      if (tool === "pan" || !isShapeTool(tool)) {
        return;
      }

      const pointer = canvas.getPointer(event.e);
      const state = useEditorStore.getState();
      const objectNumber =
        state.canvasObjects.filter(
          (object) => object.artboardId === state.activeArtboardId
        ).length + 1;
      const summary = createShapeSummary(tool, objectNumber, state.activeArtboardId);
      const shape = createBasicShape(tool, pointer, {
        fontFamily: tool === "text" ? state.textFontFamily : undefined
      });

      shape.set({ id: summary.id, name: summary.name });
      applyLayerState(shape, summary);
      updateSymmetryGuidesForObject(shape, { visible: false });
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.requestRenderAll();
      useEditorStore.getState().addCanvasObject(summary);
      useEditorStore.getState().setActiveTool("select");
      refreshLineEditOverlay(shape);
      pushHistory();
    };

    const handlePathCreated = (event: unknown) => {
      const tool = useEditorStore.getState().activeTool;

      if (!isDrawingTool(tool)) {
        return;
      }

      const path = (event as { path?: FabricObject }).path;

      if (!path) {
        return;
      }

      const state = useEditorStore.getState();
      const objectNumber =
        state.canvasObjects.filter(
          (object) => object.artboardId === state.activeArtboardId
        ).length + 1;
      const summary = createShapeSummary(tool, objectNumber, state.activeArtboardId);
      const brushSettings = getDrawingBrushSettings(tool);

      path.set({
        id: summary.id,
        name: summary.name,
        fill: "",
        globalCompositeOperation: "source-over",
        opacity: brushSettings.opacity,
        stroke: brushSettings.color,
        strokeLineCap: brushSettings.lineCap,
        strokeLineJoin: brushSettings.lineJoin,
        strokeWidth: brushSettings.width,
        selectable: true,
        evented: true
      });
      path.set("neoform-shape-kind", tool);
      applyLayerState(path, summary);
      useEditorStore.getState().addCanvasObject(summary);
      canvas.setActiveObject(path);
      syncSelectedObjectProperties(path);
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
    };

    canvas.on("mouse:down", handleCanvasClick);
    canvas.on("path:created", handlePathCreated);
    canvas.on("mouse:down", (event) => {
      if (useEditorStore.getState().activeTool !== "pan") {
        return;
      }

      isPanning = true;
      canvas.setCursor("grabbing");
      lastPanPoint = getEventClientPoint(event.e);
      canvas.selection = false;
    });
    canvas.on("mouse:move", (event) => {
      if (updatePressureStroke(event)) {
        return;
      }

      if (updateVectorCut(event)) {
        return;
      }

      if (updateGradientTool(event)) {
        return;
      }

      if (updateContentEraseSelection(event)) {
        return;
      }

      if (!isPanning || useEditorStore.getState().activeTool !== "pan") {
        return;
      }

      const nextPoint = getEventClientPoint(event.e);
      const delta = {
        x: nextPoint.x - lastPanPoint.x,
        y: nextPoint.y - lastPanPoint.y
      };

      canvas.relativePan(new Point(delta.x, delta.y));
      lastPanPoint = nextPoint;
    });
    const finishPointerInteraction = () => {
      isPanning = false;
      canvas.selection = true;
      applyFabricCanvasCursor(
        canvas,
        useEditorStore.getState().activeTool,
        useEditorStore.getState().cursorStyle
      );
    };

    canvas.on("mouse:up", (event) => {
      if (finishPressureStroke(event)) {
        return;
      }

      if (finishGradientTool(event)) {
        finishPointerInteraction();
        return;
      }

      if (finishContentEraseSelection(event)) {
        finishPointerInteraction();
        return;
      }

      void finishVectorCut(event).then((handled) => {
        if (handled) {
          return;
        }

        finishPointerInteraction();
      });
    });
    canvas.on("selection:created", (event) => {
      const selectedObjects =
        canvas.getActiveObjects().length > 0
          ? canvas.getActiveObjects()
          : (event.selected ?? []);
      syncCanvasSelectionState(selectedObjects);
      syncSelectedObjectProperties(
        selectedObjects.length === 1 ? selectedObjects[0] : null
      );
      refreshLineEditOverlay(
        selectedObjects.length === 1 ? selectedObjects[0] : null
      );
      syncInverseSelectionMaskInteractivity(
        canvas,
        selectedObjects.map((object) => String(object.get("id") ?? ""))
      );
    });
    canvas.on("selection:updated", (event) => {
      const selectedObjects =
        canvas.getActiveObjects().length > 0
          ? canvas.getActiveObjects()
          : (event.selected ?? []);
      syncCanvasSelectionState(selectedObjects);
      syncSelectedObjectProperties(
        selectedObjects.length === 1 ? selectedObjects[0] : null
      );
      refreshLineEditOverlay(
        selectedObjects.length === 1 ? selectedObjects[0] : null
      );
      syncInverseSelectionMaskInteractivity(
        canvas,
        selectedObjects.map((object) => String(object.get("id") ?? ""))
      );
    });
    canvas.on("selection:cleared", () => {
      useEditorStore.getState().setCanvasSelection([]);
      useEditorStore.getState().setSelectedObjectProperties(null);
      syncInverseSelectionMaskInteractivity(canvas);
      refreshLineEditOverlay(null);
    });
    canvas.on("object:scaling", (event) => {
      showEditingOutline(event.target);
      updateSymmetryGuidesForObject(event.target, { visible: true });
      syncSelectedObjectProperties(event.target);
      refreshLineEditOverlay(event.target);
      canvas.requestRenderAll();
    });
    canvas.on("object:rotating", (event) => {
      showEditingOutline(event.target);
      updateSymmetryGuidesForObject(event.target, { visible: true });
      syncSelectedObjectProperties(event.target);
      refreshLineEditOverlay(event.target);
      canvas.requestRenderAll();
    });
    canvas.on("object:modified", (event) => {
      hideEditingOutline(event.target);
      updateSymmetryGuidesForObject(event.target, { visible: false });
      syncSelectedObjectProperties(event.target);
      refreshLineEditOverlay(event.target);
      canvas.requestRenderAll();
      pushHistory();
    });
    canvas.on("object:moving", (event) => {
      showEditingOutline(event.target);
      updateSymmetryGuidesForObject(event.target, { visible: true });
      syncSelectedObjectProperties(event.target);
      refreshLineEditOverlay(event.target);
      canvas.requestRenderAll();
    });
    canvas.on("mouse:up", (event) => {
      hideEditingOutline(event.target);
      updateSymmetryGuidesForObject(event.target, { visible: false });
      refreshLineEditOverlay(canvas.getActiveObject());
      canvas.requestRenderAll();
    });

    const loadArtboardSnapshot = async (artboardId: string) => {
      const snapshot = useEditorStore.getState().canvasSnapshots[artboardId];

      canvas.discardActiveObject();
      refreshLineEditOverlay(null);
      canvas.clear();
      canvas.backgroundColor = "#ffffff";

      if (snapshot) {
        await canvas.loadFromJSON(snapshot);
      }

      const state = useEditorStore.getState();
      canvas.getObjects().forEach((object) => {
        hideEditingOutline(object);
        const summary = state.canvasObjects.find(
          (item) => item.id === object.get("id")
        );

        if (summary) {
          applyLayerState(object, summary);
        }

        updateSymmetryGuidesForObject(object, { visible: false });
      });
      canvas.requestRenderAll();
      pushHistory();
    };

    const saveCurrentSnapshot = () => {
      const snapshot = JSON.stringify(canvas.toObject(customObjectProperties));
      useEditorStore.getState().setCanvasSnapshot(currentArtboardId, snapshot);
    };

    const createHistoryEntry = () => ({
      objects: useEditorStore
        .getState()
        .canvasObjects.filter((object) => object.artboardId === currentArtboardId),
      snapshot: JSON.stringify(canvas.toObject(customObjectProperties))
    });

    const pushHistory = () => {
      if (isRestoringHistory || isLoadingProject) {
        return;
      }

      undoStack.push(createHistoryEntry());
      redoStack.length = 0;

      if (undoStack.length > 50) {
        undoStack.shift();
      }
    };

    const handleEditorShortcuts = (event: KeyboardEvent) => {
      if (isEditableKeyboardTarget(event.target) || isDimensionModalOpen()) {
        return;
      }

      const key = event.key.toLowerCase();
      const isUndoShortcut = (event.metaKey || event.ctrlKey) && key === "z";
      const isRedoShortcut =
        ((event.metaKey || event.ctrlKey) && event.shiftKey && key === "z") ||
        ((event.metaKey || event.ctrlKey) && key === "y");

      if (isRedoShortcut) {
        event.preventDefault();
        useEditorStore.getState().requestRedo();
        return;
      }

      if (isUndoShortcut) {
        event.preventDefault();
        useEditorStore.getState().requestUndo();
        return;
      }

      if (event.key !== "Delete" && event.key !== "Backspace") {
        return;
      }

      const activeObject = canvas.getActiveObject();
      const objectId = activeObject?.get("id");

      if (!objectId) {
        return;
      }

      event.preventDefault();
      useEditorStore.getState().deleteLayer(String(objectId));
    };

    window.addEventListener("keydown", handleEditorShortcuts);

    const restoreHistoryEntry = async (entry: ReturnType<typeof createHistoryEntry>) => {
      isRestoringHistory = true;
      useEditorStore
        .getState()
        .replaceCanvasObjectsForArtboard(currentArtboardId, entry.objects);
      useEditorStore.getState().setCanvasSnapshot(currentArtboardId, entry.snapshot);
      await loadArtboardSnapshot(currentArtboardId);
      isRestoringHistory = false;
    };

    pushHistory();

    const unsubscribeArtboardChanges = useEditorStore.subscribe(
      (state, previousState) => {
        if (isLoadingProject) {
          return;
        }

        if (state.activeArtboardId === previousState.activeArtboardId) {
          return;
        }

        saveCurrentSnapshot();
        currentArtboardId = state.activeArtboardId;
        void loadArtboardSnapshot(state.activeArtboardId);
      }
    );

    const unsubscribeSelectionRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.selectionRequest?.requestId ===
          previousState.selectionRequest?.requestId
        ) {
          return;
        }

        const selectionIds =
          state.selectionRequest?.objectIds ??
          (state.selectionRequest?.objectId ? [state.selectionRequest.objectId] : []);

        if (selectionIds.length === 0) {
          canvas.discardActiveObject();
          syncInverseSelectionMaskInteractivity(canvas);
          refreshLineEditOverlay(null);
          canvas.requestRenderAll();
          return;
        }

        const objects = canvas
          .getObjects()
          .filter((item) => selectionIds.includes(String(item.get("id") ?? "")));

        if (objects.length === 0) {
          return;
        }

        if (objects.length === 1) {
          syncInverseSelectionMaskInteractivity(canvas, [
            String(objects[0].get("id") ?? "")
          ]);
          canvas.setActiveObject(objects[0]);
          syncSelectedObjectProperties(objects[0]);
          refreshLineEditOverlay(objects[0]);
        } else {
          syncInverseSelectionMaskInteractivity(
            canvas,
            objects.map((object) => String(object.get("id") ?? ""))
          );
          const selection = new ActiveSelection(objects, { canvas });

          canvas.setActiveObject(selection);
          useEditorStore.getState().setSelectedObjectProperties(null);
          refreshLineEditOverlay(null);
        }

        canvas.requestRenderAll();
      }
    );

    const unsubscribeLayerActionRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.layerActionRequest?.requestId ===
          previousState.layerActionRequest?.requestId
        ) {
          return;
        }

        const request = state.layerActionRequest;

        if (!request) {
          return;
        }

        if (request.action === "flatten") {
          void flattenCurrentArtboardLayers({
            canvas,
            currentArtboardId,
            pushHistory,
            refreshLineEditOverlay,
            saveCurrentSnapshot
          });
          return;
        }

        const requestIds =
          request.objectIds.length > 0
            ? request.objectIds
            : request.objectId
              ? [request.objectId]
              : [];
        const objects = getCanvasObjectsByIds(canvas, requestIds);
        const object = objects[0];

        if (objects.length === 0) {
          return;
        }

        if (request.action === "delete") {
          canvas.remove(...objects);
          canvas.discardActiveObject();
          refreshLineEditOverlay(null);
          canvas.requestRenderAll();
          saveCurrentSnapshot();
          pushHistory();
          return;
        }

        if (request.action === "duplicate") {
          void duplicateLayerObjects({
            canvas,
            currentArtboardId,
            objectIds: requestIds,
            pushHistory,
            refreshLineEditOverlay,
            saveCurrentSnapshot
          });
          return;
        }

        if (request.action === "group") {
          groupLayerObjects({
            canvas,
            currentArtboardId,
            objectIds: requestIds,
            pushHistory,
            refreshLineEditOverlay,
            saveCurrentSnapshot
          });
          return;
        }

        if (request.action === "ungroup") {
          ungroupLayerObjects({
            canvas,
            currentArtboardId,
            objectIds: requestIds,
            pushHistory,
            refreshLineEditOverlay,
            saveCurrentSnapshot
          });
          return;
        }

        if (
          request.action === "move-up" ||
          request.action === "move-down" ||
          request.action === "move-front" ||
          request.action === "move-back"
        ) {
          syncCanvasStackingWithSummaries(canvas, state.canvasObjects, currentArtboardId);
        }

        objects.forEach((item) => {
          const summary = state.canvasObjects.find(
            (layer) => layer.id === item.get("id")
          );

          if (summary) {
            applyLayerState(item, summary);
          }
        });

        if (
          state.canvasObjects.some(
            (summary) =>
              requestIds.includes(summary.id) &&
              (!summary.visible || summary.locked)
          )
        ) {
          canvas.discardActiveObject();
          refreshLineEditOverlay(null);
        } else {
          refreshLineEditOverlay(canvas.getActiveObject());
        }

        canvas.requestRenderAll();
        saveCurrentSnapshot();
        pushHistory();
      }
    );

    const unsubscribeLibraryActionRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.libraryActionRequest?.requestId ===
          previousState.libraryActionRequest?.requestId
        ) {
          return;
        }

        const request = state.libraryActionRequest;

        if (!request) {
          return;
        }

        if (request.action === "add-form") {
          addLibraryShape({
            canvas,
            type: request.form.type,
            fill: request.form.fill,
            namePrefix: request.form.label,
            point: {
              x: canvas.getWidth() / 2,
              y: canvas.getHeight() / 2
            }
          });
          saveCurrentSnapshot();
          pushHistory();
          return;
        }

        if (request.action === "add-composition") {
          void addCompositionToCanvas(canvas, request.composition).then(() => {
            saveCurrentSnapshot();
            pushHistory();
          });
          return;
        }

        if (request.action === "add-visual-asset") {
          const activeObject = canvas.getActiveObject();

          if (activeObject && isInverseSelectionMask(activeObject)) {
            void applyVisualAssetAsObjectFill(canvas, activeObject, request.asset).then(() => {
              saveCurrentSnapshot();
              pushHistory();
            });
            return;
          }

          void addVisualAssetImageToCanvas(canvas, request.asset).then(() => {
            saveCurrentSnapshot();
            pushHistory();
          });
          return;
        }

        const activeObject = canvas.getActiveObject();

        if (!activeObject) {
          return;
        }

        if (request.action === "apply-pigment") {
          applyFillToObject(activeObject, request.pigment.color);
        }

        if (request.action === "apply-texture") {
          void applyTextureToActiveObject({
            activeObject,
            canvas,
            pushHistory,
            saveCurrentSnapshot,
            texture: request.texture
          });
          return;
        }

        canvas.requestRenderAll();
        saveCurrentSnapshot();
        pushHistory();
      }
    );

    const unsubscribeCompositionSaveRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.compositionSaveRequest?.requestId ===
          previousState.compositionSaveRequest?.requestId
        ) {
          return;
        }

        if (!state.compositionSaveRequest) {
          return;
        }

        saveSelectionAsComposition(canvas, state.compositionSaveRequest.targetId);
      }
    );

    const unsubscribeExportRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.exportRequest?.requestId === previousState.exportRequest?.requestId
        ) {
          return;
        }

        if (!state.exportRequest) {
          return;
        }

        canvas.discardActiveObject();
        canvas.requestRenderAll();

        if (state.exportRequest.format === "png") {
          void exportCanvasAsPng(canvas);
        }

        if (state.exportRequest.format === "jpeg") {
          if (!confirmJpegExportWithFlattenedLayers(canvas, currentArtboardId)) {
            return;
          }

          void exportCanvasAsJpeg(canvas);
        }

        if (state.exportRequest.format === "svg") {
          exportCanvasAsSvg(canvas);
        }

        if (state.exportRequest.format === "all-png") {
          saveCurrentSnapshot();
          void exportAllArtboardsAsPng(canvas, currentArtboardId, loadArtboardSnapshot);
        }

        if (state.exportRequest.format === "all-jpeg") {
          saveCurrentSnapshot();
          void exportAllArtboardsAsJpeg(canvas, currentArtboardId, loadArtboardSnapshot);
        }

        if (state.exportRequest.format === "pdf") {
          void exportCanvasAsPdf(canvas);
        }

        if (state.exportRequest.format === "package") {
          saveCurrentSnapshot();
          void exportProjectPackage(canvas, currentArtboardId, loadArtboardSnapshot);
        }
      }
    );

    const unsubscribeHistoryRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.historyRequest?.requestId === previousState.historyRequest?.requestId
        ) {
          return;
        }

        const request = state.historyRequest;

        if (!request) {
          return;
        }

        if (request.action === "undo" && undoStack.length > 1) {
          redoStack.push(undoStack.pop()!);
          void restoreHistoryEntry(undoStack[undoStack.length - 1]);
        }

        if (request.action === "redo" && redoStack.length > 0) {
          const entry = redoStack.pop()!;
          undoStack.push(entry);
          void restoreHistoryEntry(entry);
        }
      }
    );

    const unsubscribePropertyUpdateRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.propertyUpdateRequest?.requestId ===
          previousState.propertyUpdateRequest?.requestId
        ) {
          return;
        }

        const request = state.propertyUpdateRequest;
        const activeObject = canvas.getActiveObject();

        if (!request || !activeObject) {
          return;
        }

        applyPropertiesToObject(activeObject, request.properties);
        updateSymmetryGuidesForObject(activeObject, { visible: false });
        syncSelectedObjectProperties(activeObject);
        refreshLineEditOverlay(activeObject);
        canvas.requestRenderAll();
        saveCurrentSnapshot();
        pushHistory();
      }
    );

    const unsubscribeTextOutlineRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.textOutlineRequest?.requestId ===
          previousState.textOutlineRequest?.requestId
        ) {
          return;
        }

        const request = state.textOutlineRequest;

        if (!request) {
          return;
        }

        void convertTextToOutline({
          canvas,
          currentArtboardId,
          objectId: request.objectId,
          pushHistory,
          refreshLineEditOverlay,
          saveCurrentSnapshot
        });
      }
    );

    const unsubscribeCursorSettings = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.activeTool === previousState.activeTool &&
          state.cursorStyle === previousState.cursorStyle &&
          state.colorMode === previousState.colorMode
        ) {
          return;
        }

        applyFabricCanvasCursor(canvas, state.activeTool, state.cursorStyle);
        syncDrawingMode(canvas, state.activeTool);
      }
    );

    const unsubscribeViewportRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.viewportRequest?.requestId === previousState.viewportRequest?.requestId
        ) {
          return;
        }

        const request = state.viewportRequest;

        if (!request) {
          return;
        }

        applyViewportAction(canvas, request.action);
      }
    );

    const unsubscribeProjectJsonExportRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.projectJsonExportRequest?.requestId ===
          previousState.projectJsonExportRequest?.requestId
        ) {
          return;
        }

        if (!state.projectJsonExportRequest) {
          return;
        }

        saveCurrentSnapshot();
        exportProjectAsJson(useEditorStore.getState().getSavedProject());
      }
    );

    const unsubscribeProjectJsonImportRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (
          state.projectJsonImportRequest?.requestId ===
          previousState.projectJsonImportRequest?.requestId
        ) {
          return;
        }

        const request = state.projectJsonImportRequest;

        if (!request) {
          return;
        }

        isLoadingProject = true;
        const imported = useEditorStore
          .getState()
          .importSavedProject(request.project);

        if (!imported) {
          isLoadingProject = false;
          window.alert("This file is not a valid neoform-pigments project.");
          return;
        }

        const nextArtboardId = useEditorStore.getState().activeArtboardId;
        currentArtboardId = nextArtboardId;
        void loadArtboardSnapshot(nextArtboardId).finally(() => {
          isLoadingProject = false;
        });
      }
    );

    const unsubscribeSaveRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (state.saveRequest?.requestId === previousState.saveRequest?.requestId) {
          return;
        }

        if (!state.saveRequest) {
          return;
        }

        saveCurrentSnapshot();
        useEditorStore.getState().saveProjectToLocalStorage();
      }
    );

    const unsubscribeOpenRequest = useEditorStore.subscribe(
      (state, previousState) => {
        if (state.openRequest?.requestId === previousState.openRequest?.requestId) {
          return;
        }

        if (!state.openRequest) {
          return;
        }

        isLoadingProject = true;
        const loaded = useEditorStore.getState().loadProjectFromLocalStorage();

        if (!loaded) {
          isLoadingProject = false;
          window.alert("No local project has been saved yet.");
          return;
        }

        const nextArtboardId = useEditorStore.getState().activeArtboardId;
        currentArtboardId = nextArtboardId;
        void loadArtboardSnapshot(nextArtboardId).finally(() => {
          isLoadingProject = false;
        });
      }
    );

    return () => {
      canvas.off("mouse:down", handleCanvasClick);
      canvas.off("path:created", handlePathCreated);
      saveCurrentSnapshot();
      unsubscribeArtboardChanges();
      unsubscribeSelectionRequest();
      unsubscribeLayerActionRequest();
      unsubscribeLibraryActionRequest();
      unsubscribeCompositionSaveRequest();
      unsubscribeExportRequest();
      unsubscribeHistoryRequest();
      unsubscribePropertyUpdateRequest();
      unsubscribeTextOutlineRequest();
      unsubscribeCursorSettings();
      unsubscribeViewportRequest();
      unsubscribeProjectJsonExportRequest();
      unsubscribeProjectJsonImportRequest();
      unsubscribeSaveRequest();
      unsubscribeOpenRequest();
      window.removeEventListener("keydown", handleEditorShortcuts);
      resizeObserver.disconnect();
      void disposeFabricCanvas(canvas);
    };
  }, []);

  return (
    <section className="relative min-h-0 overflow-hidden bg-paper">
      <div
        className="absolute inset-0 bg-[length:32px_32px]"
        style={{
          backgroundImage:
            "linear-gradient(45deg, rgb(var(--color-ink) / var(--stripe-alpha)) 25%, transparent 25%, transparent 50%, rgb(var(--color-ink) / var(--stripe-alpha)) 50%, rgb(var(--color-ink) / var(--stripe-alpha)) 75%, transparent 75%, transparent)"
        }}
      />
      <div className="absolute left-5 top-4 border-2 border-ink bg-cobalt px-2 py-0.5 text-xs font-black uppercase text-paper shadow-brutal-sm">
        {activeArtboard?.name ?? "Canvas"}
      </div>
      <div className="relative grid h-full place-items-center overflow-hidden px-6 pb-6 pt-12">
        <div
          className="relative max-h-full w-full max-w-5xl origin-center border-2 border-ink bg-white shadow-brutal transition-transform duration-150 ease-out"
          onPointerCancel={hideMotionCursor}
          onPointerDown={handleMotionCursorPointerDown}
          onPointerLeave={hideMotionCursor}
          onPointerMove={handleMotionCursorMove}
          onPointerUp={handleMotionCursorPointerUp}
          style={{
            aspectRatio: `${activeArtboard?.width ?? 1600} / ${
              activeArtboard?.height ?? 1200
            }`,
            transform: `scale(${viewportZoom})`
          }}
        >
          <div className="absolute -top-12 left-0 z-20 flex max-w-[calc(100vw-430px)] flex-wrap items-center gap-1 border-2 border-ink bg-pollen px-1.5 py-1 text-[9px] font-black uppercase text-ink shadow-brutal-sm">
            <button
              type="button"
              onClick={openDimensionEditor}
              className="border-2 border-ink bg-punch px-1.5 py-0.5 text-paper transition hover:-translate-y-0.5"
              title="Editar tamaño del lienzo"
            >
              {artboardDimensions?.pixels ?? "MVP"}
            </button>
            {artboardDimensions ? (
              <span className="border-2 border-ink bg-mineral px-1.5 py-0.5">
                {artboardDimensions.physical}
              </span>
            ) : null}
            <button
              type="button"
              onClick={() =>
                setDimensionUnit((unit) => (unit === "cm" ? "mm" : "cm"))
              }
              className="border-2 border-ink bg-cobalt px-1.5 py-0.5 text-paper transition hover:-translate-y-0.5"
              title="Cambiar unidad de medida"
            >
              {dimensionUnit}
            </button>
            <button
              type="button"
              onClick={cycleCursorStyle}
              className="border-2 border-ink bg-mineral px-1.5 py-0.5 transition hover:-translate-y-0.5"
              title="Cambiar cursor del lienzo"
              data-tour="canvas-cursor"
            >
              Cursor {canvasCursorLabels[cursorStyle]}
            </button>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsColorPanelOpen((isOpen) => !isOpen)}
                className={clsx(
                  "border-2 border-ink px-1.5 py-0.5 transition hover:-translate-y-0.5",
                  hasColorAdjustments(finishSettings.colorAdjustments)
                    ? "bg-oxide text-paper"
                    : "bg-paper"
                )}
                title="Ajustar color general de la composición"
                data-tour="global-color-grade"
              >
                Color
              </button>
              {isColorPanelOpen ? (
                <CanvasColorAdjustmentsPanel
                  scope={colorAdjustmentScope}
                  selectedAvailable={Boolean(selectedObjectProperties)}
                  settings={
                    colorAdjustmentScope === "selected" && selectedObjectProperties
                      ? selectedObjectProperties.colorAdjustments
                      : finishSettings.colorAdjustments
                  }
                  onScopeChange={setColorAdjustmentScope}
                  onChange={(colorAdjustments) =>
                    colorAdjustmentScope === "selected" && selectedObjectProperties
                      ? requestSelectedObjectPropertyUpdate({ colorAdjustments })
                      : setFinishSettings({ colorAdjustments })
                  }
                  onReset={() =>
                    colorAdjustmentScope === "selected" && selectedObjectProperties
                      ? requestSelectedObjectPropertyUpdate({
                          colorAdjustments: defaultColorAdjustments
                        })
                      : setFinishSettings({
                          colorAdjustments: defaultColorAdjustments
                        })
                  }
                />
              ) : null}
            </div>
            <label className="flex items-center gap-1 border-2 border-ink bg-paper px-1 py-0.5" title={professionalExportLabel}>
              Print
              <select
                value={exportSettings.presetId}
                onChange={(event) =>
                  applyPrintExportPreset(
                    event.currentTarget.value as ProfessionalExportSettings["presetId"]
                  )
                }
                className="w-20 bg-transparent text-[9px] font-black uppercase outline-none"
                data-tour="export-settings"
              >
                {Object.entries(professionalPrintPresets).map(([id, preset]) => (
                  <option key={id} value={id}>
                    {preset.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex items-center gap-1 border-2 border-ink bg-paper px-1 py-0.5" title="Pixels per inch">
              PPP
              <input
                type="number"
                min={minCanvasDpi}
                max={maxCanvasDpi}
                value={exportSettings.dpi}
                onChange={(event) =>
                  updateExportNumber("dpi", Number(event.currentTarget.value))
                }
                className="w-12 bg-transparent text-[9px] font-black outline-none"
              />
            </label>
          </div>
          <CanvasGuides
            customGuides={viewSettings.customGuides}
            onRemoveGuide={removeCanvasGuide}
            onUpdateGuide={updateCanvasGuide}
            showGrid={viewSettings.showGrid}
            showGoldenRatio={viewSettings.showGoldenRatio}
          />
          <canvas
            ref={canvasRef}
            className="h-full w-full"
            style={{
              cursor: getCanvasCursor(activeTool, cursorStyle, colorMode),
              filter: getColorAdjustmentPreviewFilter(
                finishSettings.colorAdjustments
              )
            }}
          />
          {motionCursorKind && motionCursor.visible ? (
            <MotionCursorOverlay
              angle={motionCursor.angle}
              kind={motionCursorKind}
              left={motionCursor.x}
              phase={motionCursor.phase}
              releaseKey={motionCursor.releaseKey}
              top={motionCursor.y}
            />
          ) : null}
          {finishSettings.filmGrainEnabled ? (
            <div
              className="pointer-events-none absolute inset-0 z-10"
              style={getFilmGrainPreviewStyle(finishSettings)}
            />
          ) : null}
          {lineEditOverlay ? (
            <div className="pointer-events-none absolute inset-0 z-30">
              <LineEditHandleButton
                label={`Start ${lineEditOverlay.startWidth}px`}
                left={lineEditOverlay.startX}
                top={lineEditOverlay.startY}
                tone="bg-mineral"
                onPointerDown={(event) => beginLineHandleDrag("start", event)}
              />
              <LineEditHandleButton
                label={`Curve ${lineEditOverlay.curve}`}
                left={lineEditOverlay.curveX}
                top={lineEditOverlay.curveY}
                tone="bg-punch text-paper"
                onPointerDown={(event) => beginLineHandleDrag("curve", event)}
              />
              <LineEditHandleButton
                label={`End ${lineEditOverlay.endWidth}px`}
                left={lineEditOverlay.endX}
                top={lineEditOverlay.endY}
                tone="bg-pollen"
                onPointerDown={(event) => beginLineHandleDrag("end", event)}
              />
            </div>
          ) : null}
        </div>
      </div>
      <div className="absolute bottom-4 left-4 z-20 flex gap-1">
        {[
          ["zoom-out", "-"],
          ["fit", "Fit"],
          ["center", "Center"],
          ["zoom-in", "+"]
        ].map(([action, label]) => (
          <button
            key={action}
            type="button"
            onClick={() =>
              handleViewportAction(
                action as "zoom-in" | "zoom-out" | "fit" | "center"
              )
            }
            className="border-2 border-ink bg-paper px-1.5 py-0.5 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
          >
            {label}
          </button>
        ))}
      </div>
      {dimensionEditor ? (
        <div
          className="absolute inset-0 z-40 grid place-items-center bg-ink/45 p-4"
          data-dimension-modal="true"
        >
          <div className="w-full max-w-md border-2 border-ink bg-paper p-3 text-ink shadow-brutal">
            <div className="flex items-start justify-between gap-3 border-b-2 border-ink pb-2">
              <div>
                <h2 className="text-lg font-black uppercase">Canvas size</h2>
                <p className="text-[10px] font-black uppercase text-ink/60">
                  {exportSettings.dpi} PPP reference for cm/mm
                </p>
              </div>
              <button
                type="button"
                onClick={closeDimensionEditor}
                className="border-2 border-ink bg-punch px-2 py-1 text-xs font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
              >
                Close
              </button>
            </div>

            <div className="mt-3 grid grid-cols-3 gap-1">
              {(["px", "cm", "mm"] as const).map((unit) => (
                <button
                  key={unit}
                  type="button"
                  onClick={() => changeDimensionEditorUnit(unit)}
                  className={clsx(
                    "border-2 border-ink px-2 py-1 text-xs font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
                    dimensionEditor.unit === unit ? "bg-pollen" : "bg-bone"
                  )}
                >
                  {unit}
                </button>
              ))}
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <label className="text-[10px] font-black uppercase">
                Width
                <input
                  type="number"
                  min={dimensionEditor.unit === "px" ? 64 : 0.1}
                  step={dimensionEditor.unit === "px" ? 1 : 0.1}
                  value={dimensionEditor.width}
                  onChange={(event) =>
                    updateDimensionValue("width", event.target.value)
                  }
                  className="mt-1 h-9 w-full border-2 border-ink bg-white px-2 text-sm font-black outline-none"
                />
              </label>
              <label className="text-[10px] font-black uppercase">
                Height
                <input
                  type="number"
                  min={dimensionEditor.unit === "px" ? 64 : 0.1}
                  step={dimensionEditor.unit === "px" ? 1 : 0.1}
                  value={dimensionEditor.height}
                  onChange={(event) =>
                    updateDimensionValue("height", event.target.value)
                  }
                  className="mt-1 h-9 w-full border-2 border-ink bg-white px-2 text-sm font-black outline-none"
                />
              </label>
            </div>

            <label className="mt-3 flex items-center gap-2 border-2 border-ink bg-mineral px-2 py-2 text-xs font-black uppercase">
              <input
                type="checkbox"
                checked={dimensionEditor.keepRatio}
                onChange={(event) =>
                  setDimensionEditor((editor) =>
                    editor
                      ? {
                          ...editor,
                          keepRatio: event.target.checked,
                          aspectRatio:
                            Number(editor.width) > 0 && Number(editor.height) > 0
                              ? Number(editor.width) / Number(editor.height)
                              : editor.aspectRatio
                        }
                      : editor
                  )
                }
                className="h-4 w-4 accent-[#ffcf24]"
              />
              Keep aspect ratio
            </label>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDimensionEditor}
                className="border-2 border-ink bg-bone px-3 py-2 text-xs font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={applyDimensionEditor}
                className="border-2 border-ink bg-cobalt px-3 py-2 text-xs font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
              >
                Apply size
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

function exportProjectAsJson(project: SavedProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], {
    type: "application/json"
  });
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = `${toFileSlug(project.projectName)}-${toFileSlug(
    project.savedAt
  )}.neoform.json`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(objectUrl);
}

function showVectorCutNotice(message: string) {
  const existingNotice = document.querySelector("[data-vector-cut-notice]");
  existingNotice?.remove();

  const notice = document.createElement("div");
  notice.dataset.vectorCutNotice = "true";
  notice.textContent = message;
  notice.style.position = "fixed";
  notice.style.left = "50%";
  notice.style.top = "72px";
  notice.style.zIndex = "9999";
  notice.style.transform = "translateX(-50%)";
  notice.style.maxWidth = "420px";
  notice.style.border = "2px solid #101010";
  notice.style.background = "#FFE900";
  notice.style.boxShadow = "4px 4px 0 #101010";
  notice.style.color = "#101010";
  notice.style.fontSize = "11px";
  notice.style.fontWeight = "900";
  notice.style.padding = "8px 10px";
  notice.style.textTransform = "uppercase";
  document.body.appendChild(notice);
  window.setTimeout(() => notice.remove(), 2600);
}

function flashUnsupportedVectorCutTarget(
  canvas: ReturnType<typeof createFabricCanvas>,
  target: FabricObject
) {
  const bounds = target.getBoundingRect();
  const warningFrame = new Rect({
    evented: false,
    excludeFromExport: true,
    fill: "transparent",
    height: bounds.height + 18,
    left: bounds.left - 9,
    name: "chainsaw-cut-warning",
    objectCaching: false,
    selectable: false,
    stroke: "#FF2F7D",
    strokeDashArray: [10, 6],
    strokeWidth: 3,
    top: bounds.top - 9,
    width: bounds.width + 18
  });

  canvas.add(warningFrame);
  canvas.bringObjectToFront(warningFrame);
  canvas.requestRenderAll();
  window.setTimeout(() => {
    canvas.remove(warningFrame);
    canvas.requestRenderAll();
  }, 1500);
}

async function exportCanvasAsPng(
  canvas: ReturnType<typeof createFabricCanvas>,
  artboardOverride?: { name: string; width: number; height: number }
) {
  await exportCanvasAsRasterImage(canvas, "png", artboardOverride);
}

async function exportCanvasAsJpeg(
  canvas: ReturnType<typeof createFabricCanvas>,
  artboardOverride?: { name: string; width: number; height: number }
) {
  await exportCanvasAsRasterImage(canvas, "jpeg", artboardOverride);
}

function confirmJpegExportWithFlattenedLayers(
  canvas: ReturnType<typeof createFabricCanvas>,
  currentArtboardId: string
) {
  if (isCurrentArtboardReadyForFinalExport(canvas, currentArtboardId)) {
    return true;
  }

  return window.confirm(
    "El lienzo tiene varias capas sin acoplar. Para un JPG final conviene pulsar primero Acoplar. " +
      "Aceptar exporta una copia raster igualmente; Cancelar vuelve al editor para acoplar capas."
  );
}

function isCurrentArtboardReadyForFinalExport(
  canvas: ReturnType<typeof createFabricCanvas>,
  currentArtboardId: string
) {
  const activeLayers = useEditorStore
    .getState()
    .canvasObjects.filter((object) => object.artboardId === currentArtboardId);

  if (activeLayers.length <= 1) {
    return true;
  }

  const activeObjects = getCanvasObjectsByIds(
    canvas,
    activeLayers.map((layer) => layer.id)
  );

  return (
    activeObjects.length === 1 &&
    activeObjects[0].get("neoform-flattened-layer") === true
  );
}

async function exportCanvasAsRasterImage(
  canvas: ReturnType<typeof createFabricCanvas>,
  format: "png" | "jpeg",
  artboardOverride?: ExportArtboardLike
) {
  const artboard = getExportArtboard(artboardOverride);
  const extension = format === "jpeg" ? "jpg" : "png";
  const filename =
    format === "jpeg"
      ? createNextExportFilename(artboard?.name ?? "canvas", extension)
      : `${toFileSlug(artboard?.name ?? "canvas")}-neoform-pigments.${extension}`;
  const dataUrl =
    format === "jpeg"
      ? await getProfessionalRasterDataUrl(canvas, "jpeg", artboard)
      : await getCanvasRasterDataUrl(canvas, format, artboard);

  if (format === "jpeg") {
    saveJpegExportAsFinalWork(dataUrl, filename, artboard);
  }

  if (format === "jpeg") {
    const jpegBlob = dataUrlToBlob(dataUrl);

    if (jpegBlob.size === 0) {
      window.alert(
        "No se ha podido generar un JPG valido. La descarga se ha cancelado para evitar crear un archivo vacio."
      );
      return;
    }

    showJpegDownloadPrompt(jpegBlob, filename);
  } else {
    downloadDataUrl(dataUrl, filename);
  }
}

function saveJpegExportAsFinalWork(
  dataUrl: string,
  filename: string,
  artboard?: ExportArtboardLike
) {
  useEditorStore.getState().addVisualAsset({
    id: crypto.randomUUID(),
    category: "final-works",
    createdAt: new Date().toISOString(),
    dataUrl,
    kind: "image",
    mimeType: "image/jpeg",
    name: filename,
    palette: [],
    sourceAssetId: artboard?.name
  });
}

async function getCanvasRasterDataUrl(
  canvas: ReturnType<typeof createFabricCanvas>,
  format: "png" | "jpeg",
  artboardOverride?: ExportArtboardLike
) {
  const state = useEditorStore.getState();
  const artboard = getExportArtboard(artboardOverride);
  const widthMultiplier = artboard ? artboard.width / canvas.getWidth() : 1;
  const heightMultiplier = artboard ? artboard.height / canvas.getHeight() : 1;
  const multiplier = Math.max(1, Math.min(widthMultiplier, heightMultiplier, 4));
  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  let dataUrl = canvas.toDataURL({
    format,
    multiplier,
    quality: format === "jpeg" ? getExportJpegQuality() : 1,
    enableRetinaScaling: false
  });
  const finishSettings = state.finishSettings;

  if (hasColorAdjustments(finishSettings.colorAdjustments)) {
    dataUrl = await applyColorAdjustmentsToDataUrl(
      dataUrl,
      finishSettings.colorAdjustments,
      mimeType
    );
  }

  if (finishSettings.filmGrainEnabled) {
    dataUrl = await applyFilmGrainToDataUrl(dataUrl, finishSettings, mimeType);
  }

  return dataUrl;
}

async function getProfessionalRasterDataUrl(
  canvas: ReturnType<typeof createFabricCanvas>,
  format: "jpeg" | "png",
  artboardOverride?: ExportArtboardLike
) {
  const state = useEditorStore.getState();
  const artboard = getExportArtboard(artboardOverride);
  const mimeType = format === "jpeg" ? "image/jpeg" : "image/png";
  const baseDataUrl = canvas.toDataURL({
    format,
    multiplier: Math.max(
      1,
      Math.min(
        artboard ? artboard.width / canvas.getWidth() : 1,
        artboard ? artboard.height / canvas.getHeight() : 1,
        4
      )
    ),
    quality: format === "jpeg" ? getExportJpegQuality() : 1,
    enableRetinaScaling: false
  });
  let dataUrl = await composeProfessionalRasterDataUrl(
    baseDataUrl,
    getProfessionalExportSpec(artboard),
    mimeType
  );

  if (hasColorAdjustments(state.finishSettings.colorAdjustments)) {
    dataUrl = await applyColorAdjustmentsToDataUrl(
      dataUrl,
      state.finishSettings.colorAdjustments,
      mimeType
    );
  }

  if (state.finishSettings.filmGrainEnabled) {
    dataUrl = await applyFilmGrainToDataUrl(dataUrl, state.finishSettings, mimeType);
  }

  return dataUrl;
}

function getExportArtboard(artboardOverride?: ExportArtboardLike) {
  const state = useEditorStore.getState();

  return (
    artboardOverride ??
    state.artboards.find((item) => item.id === state.activeArtboardId)
  );
}

function exportCanvasAsSvg(canvas: ReturnType<typeof createFabricCanvas>) {
  const state = useEditorStore.getState();
  const artboard = state.artboards.find(
    (item) => item.id === state.activeArtboardId
  );
  const blob = new Blob([canvas.toSVG()], {
    type: "image/svg+xml"
  });
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = `${toFileSlug(
    artboard?.name ?? "canvas"
  )}-neoform-pigments.svg`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  URL.revokeObjectURL(objectUrl);
}

async function exportAllArtboardsAsPng(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeArtboardId: string,
  loadArtboardSnapshot: (artboardId: string) => Promise<void>
) {
  const artboards = useEditorStore.getState().artboards;

  for (const artboard of artboards) {
    await loadArtboardSnapshot(artboard.id);
    await exportCanvasAsPng(canvas, artboard);
  }

  await loadArtboardSnapshot(activeArtboardId);
}

async function exportAllArtboardsAsJpeg(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeArtboardId: string,
  loadArtboardSnapshot: (artboardId: string) => Promise<void>
) {
  const artboards = useEditorStore.getState().artboards;

  for (const artboard of artboards) {
    await loadArtboardSnapshot(artboard.id);
    await exportCanvasAsJpeg(canvas, artboard);
  }

  await loadArtboardSnapshot(activeArtboardId);
}

async function exportCanvasAsPdf(canvas: ReturnType<typeof createFabricCanvas>) {
  const artboard = getExportArtboard();
  const spec = getProfessionalExportSpec(artboard);
  const jpegDataUrl = await getProfessionalRasterDataUrl(canvas, "jpeg", artboard);
  const pdfBytes = createPdfFromJpeg(jpegDataUrl, spec);

  downloadBlob(
    new Blob([pdfBytes], { type: "application/pdf" }),
    `${toFileSlug(artboard?.name ?? "canvas")}-neoform-pigments-${spec.dpi}dpi.pdf`
  );
}

async function exportProjectPackage(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeArtboardId: string,
  loadArtboardSnapshot: (artboardId: string) => Promise<void>
) {
  const state = useEditorStore.getState();
  const exportedAt = new Date().toISOString();
  const assets = [];

  for (const artboard of state.artboards) {
    await loadArtboardSnapshot(artboard.id);
    const spec = getProfessionalExportSpec(artboard);

    assets.push({
      artboardId: artboard.id,
      exportSpec: createProfessionalExportManifest(artboard, spec),
      height: artboard.height,
      jpegDataUrl: await getProfessionalRasterDataUrl(canvas, "jpeg", artboard),
      name: artboard.name,
      svg: canvas.toSVG(),
      width: artboard.width
    });
  }

  await loadArtboardSnapshot(activeArtboardId);

  const projectPackage = {
    app: "neoform-pigments",
    version: 1,
    exportedAt,
    note:
      "Complete package with editable project JSON plus professional JPEG previews and SVG snapshots for each canvas.",
    project: useEditorStore.getState().getSavedProject(),
    exportSettings: useEditorStore.getState().exportSettings,
    colorProfile:
      "sRGB is used for raster composition and JPEG/PDF export in the browser canvas pipeline.",
    grainDecision:
      "Analog film grain is kept as a final raster export effect; scalable vector texture alternatives live in the Textures library.",
    printRoadmap:
      "DPI, real-size metadata, bleed, safe margin, crop marks and single-canvas PDF export are included. Future phases can add vector PDF and printer-specific marks.",
    assets
  };

  downloadBlob(
    new Blob([JSON.stringify(projectPackage, null, 2)], {
      type: "application/json"
    }),
    `${toFileSlug(state.projectName)}-${toFileSlug(exportedAt)}.neoform-package.json`
  );
}

function getProfessionalExportSpec(
  artboard?: ExportArtboardLike | null
): ProfessionalExportSpec {
  const settings = useEditorStore.getState().exportSettings;
  const dpi = Math.round(settings.dpi);
  const bleedPx = mmToPixels(settings.bleedMm, dpi);
  const safeMarginPx = mmToPixels(settings.safeMarginMm, dpi);
  const cropMarkMarginPx = settings.cropMarksEnabled ? mmToPixels(6, dpi) : 0;
  const sourceWidth = artboard?.width ?? 1600;
  const sourceHeight = artboard?.height ?? 1200;
  const designWidthPx = Math.max(1, Math.round((sourceWidth / BASE_PRINT_DPI) * dpi));
  const designHeightPx = Math.max(1, Math.round((sourceHeight / BASE_PRINT_DPI) * dpi));
  const finalWidthPx = designWidthPx + (bleedPx + cropMarkMarginPx) * 2;
  const finalHeightPx = designHeightPx + (bleedPx + cropMarkMarginPx) * 2;

  return {
    artworkOffsetPx: bleedPx + cropMarkMarginPx,
    bleedPx,
    cropMarkMarginPx,
    cropMarksEnabled: settings.cropMarksEnabled,
    designHeightPx,
    designWidthPx,
    dpi,
    finalHeightPx,
    finalWidthPx,
    pageHeightPt: (finalHeightPx / dpi) * 72,
    pageWidthPt: (finalWidthPx / dpi) * 72,
    safeMarginPx
  };
}

async function composeProfessionalRasterDataUrl(
  baseDataUrl: string,
  spec: ProfessionalExportSpec,
  mimeType: "image/jpeg" | "image/png"
) {
  const image = await loadImageElement(baseDataUrl);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = spec.finalWidthPx;
  outputCanvas.height = spec.finalHeightPx;
  const context = getSrgbCanvasContext(outputCanvas);

  if (!context) {
    return baseDataUrl;
  }

  context.fillStyle = "#f8f2df";
  context.fillRect(0, 0, outputCanvas.width, outputCanvas.height);
  context.drawImage(
    image,
    spec.artworkOffsetPx,
    spec.artworkOffsetPx,
    spec.designWidthPx,
    spec.designHeightPx
  );
  drawCropMarks(context, spec);

  return outputCanvas.toDataURL(
    mimeType,
    mimeType === "image/jpeg" ? getExportJpegQuality() : 1
  );
}

function createProfessionalExportManifest(
  artboard: ExportArtboardLike,
  spec: ProfessionalExportSpec
) {
  return {
    dpi: spec.dpi,
    sourceSizePx: {
      width: artboard.width,
      height: artboard.height
    },
    designSizePx: {
      width: spec.designWidthPx,
      height: spec.designHeightPx
    },
    finalSizePx: {
      width: spec.finalWidthPx,
      height: spec.finalHeightPx
    },
    cropMarkMarginMm: roundPrintNumber(
      pixelsToMillimeters(spec.cropMarkMarginPx, spec.dpi)
    ),
    colorProfile: "sRGB",
    jpegQuality: useEditorStore.getState().exportSettings.jpegQuality,
    physicalSizeMm: {
      width: roundPrintNumber(pixelsToMillimeters(spec.designWidthPx, spec.dpi)),
      height: roundPrintNumber(pixelsToMillimeters(spec.designHeightPx, spec.dpi))
    },
    bleedMm: roundPrintNumber(pixelsToMillimeters(spec.bleedPx, spec.dpi)),
    safeMarginMm: roundPrintNumber(
      pixelsToMillimeters(spec.safeMarginPx, spec.dpi)
    ),
    cropMarks: {
      enabled: spec.cropMarksEnabled,
      position: "outside trim",
      type: "standard crop marks"
    }
  };
}

function drawCropMarks(
  context: CanvasRenderingContext2D,
  spec: ProfessionalExportSpec
) {
  if (!spec.cropMarksEnabled) {
    return;
  }

  const trimLeft = spec.cropMarkMarginPx + spec.bleedPx;
  const trimTop = spec.cropMarkMarginPx + spec.bleedPx;
  const trimRight = trimLeft + spec.designWidthPx;
  const trimBottom = trimTop + spec.designHeightPx;
  const markLength = Math.max(14, mmToPixels(5, spec.dpi));
  const gap = Math.max(4, mmToPixels(1.5, spec.dpi));
  const lineWidth = Math.max(1, Math.round(spec.dpi / 300));
  const leftOuter = Math.max(0, trimLeft - gap - markLength);
  const leftInner = Math.max(0, trimLeft - gap);
  const rightInner = Math.min(spec.finalWidthPx, trimRight + gap);
  const rightOuter = Math.min(spec.finalWidthPx, trimRight + gap + markLength);
  const topOuter = Math.max(0, trimTop - gap - markLength);
  const topInner = Math.max(0, trimTop - gap);
  const bottomInner = Math.min(spec.finalHeightPx, trimBottom + gap);
  const bottomOuter = Math.min(spec.finalHeightPx, trimBottom + gap + markLength);

  context.save();
  context.strokeStyle = "#101010";
  context.lineWidth = lineWidth;
  context.lineCap = "square";

  [
    [leftOuter, trimTop, leftInner, trimTop],
    [rightInner, trimTop, rightOuter, trimTop],
    [leftOuter, trimBottom, leftInner, trimBottom],
    [rightInner, trimBottom, rightOuter, trimBottom],
    [trimLeft, topOuter, trimLeft, topInner],
    [trimRight, topOuter, trimRight, topInner],
    [trimLeft, bottomInner, trimLeft, bottomOuter],
    [trimRight, bottomInner, trimRight, bottomOuter]
  ].forEach(([startX, startY, endX, endY]) => {
    context.beginPath();
    context.moveTo(startX, startY);
    context.lineTo(endX, endY);
    context.stroke();
  });

  context.restore();
}

function mmToPixels(mm: number, dpi: number) {
  return Math.max(0, Math.round((mm / 25.4) * dpi));
}

function createPdfFromJpeg(dataUrl: string, spec: ProfessionalExportSpec) {
  const jpegBytes = dataUrlToByteArray(dataUrl);
  const encoder = new TextEncoder();
  const objects: (string | Uint8Array)[] = [];
  const contentStream = `q\n${formatPdfNumber(spec.pageWidthPt)} 0 0 ${formatPdfNumber(
    spec.pageHeightPt
  )} 0 0 cm\n/Im0 Do\nQ`;

  objects.push("<< /Type /Catalog /Pages 2 0 R >>");
  objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
  objects.push(
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${formatPdfNumber(
      spec.pageWidthPt
    )} ${formatPdfNumber(
      spec.pageHeightPt
    )}] /Resources << /XObject << /Im0 4 0 R >> >> /Contents 5 0 R >>`
  );
  objects.push(
    encoder.encode(
      `<< /Type /XObject /Subtype /Image /Width ${spec.finalWidthPx} /Height ${spec.finalHeightPx} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${jpegBytes.length} >>\nstream\n`
    ),
    jpegBytes,
    encoder.encode("\nendstream")
  );
  objects.push(
    `<< /Length ${encoder.encode(contentStream).length} >>\nstream\n${contentStream}\nendstream`
  );

  const chunks: Uint8Array[] = [encoder.encode("%PDF-1.4\n")];
  const offsets = [0];
  let cursor = chunks[0].length;
  let objectNumber = 1;

  for (let index = 0; index < objects.length; index += 1) {
    offsets[objectNumber] = cursor;
    const header = encoder.encode(`${objectNumber} 0 obj\n`);
    chunks.push(header);
    cursor += header.length;

    if (objectNumber === 4) {
      for (let part = 3; part <= 5; part += 1) {
        const objectPart = objects[part];
        const bytes =
          objectPart instanceof Uint8Array
            ? objectPart
            : encoder.encode(String(objectPart));
        chunks.push(bytes);
        cursor += bytes.length;
      }
      index += 2;
    } else {
      const objectPart = objects[index];
      const bytes =
        objectPart instanceof Uint8Array
          ? objectPart
          : encoder.encode(String(objectPart));
      chunks.push(bytes);
      cursor += bytes.length;
    }

    const footer = encoder.encode("\nendobj\n");
    chunks.push(footer);
    cursor += footer.length;
    objectNumber += 1;
  }

  const xrefOffset = cursor;
  let xref = `xref\n0 ${objectNumber}\n0000000000 65535 f \n`;

  for (let index = 1; index < objectNumber; index += 1) {
    xref += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  }

  xref += `trailer\n<< /Size ${objectNumber} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  chunks.push(encoder.encode(xref));

  const totalLength = chunks.reduce((total, chunk) => total + chunk.length, 0);
  const output = new Uint8Array(totalLength);
  let offset = 0;

  for (const chunk of chunks) {
    output.set(chunk, offset);
    offset += chunk.length;
  }

  return output;
}

function dataUrlToByteArray(dataUrl: string) {
  const base64 = dataUrl.split(",")[1] ?? "";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function formatPdfNumber(value: number) {
  return value.toFixed(3).replace(/\.0+$/, "").replace(/(\.\d*?)0+$/, "$1");
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const downloadLink = document.createElement("a");

  downloadLink.href = dataUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
}

function downloadBlob(blob: Blob, filename: string) {
  const objectUrl = URL.createObjectURL(blob);
  const downloadLink = document.createElement("a");

  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
  revokeObjectUrlLater(objectUrl);
}

function showJpegDownloadPrompt(blob: Blob, filename: string) {
  document.querySelector("[data-jpg-download-prompt='true']")?.remove();

  const objectUrl = URL.createObjectURL(blob);
  const prompt = document.createElement("div");
  const title = document.createElement("strong");
  const details = document.createElement("span");
  const actions = document.createElement("div");
  const downloadLink = document.createElement("a");
  const previewLink = document.createElement("a");
  const closeButton = document.createElement("button");
  const formattedSize = formatFileSize(blob.size);

  prompt.dataset.jpgDownloadPrompt = "true";
  title.textContent = "JPG sRGB listo";
  details.textContent = `${filename} se ha montado como JPG real (${formattedSize}) y tambien queda guardado en Obras finales. Primero puedes abrirlo para verificarlo y despues descargarlo.`;
  downloadLink.href = objectUrl;
  downloadLink.download = filename;
  downloadLink.textContent = "Descargar JPG";
  previewLink.href = objectUrl;
  previewLink.target = "_blank";
  previewLink.rel = "noopener noreferrer";
  previewLink.textContent = "Abrir JPG";
  closeButton.type = "button";
  closeButton.textContent = "Cerrar";

  prompt.style.position = "fixed";
  prompt.style.right = "18px";
  prompt.style.top = "64px";
  prompt.style.zIndex = "10000";
  prompt.style.display = "grid";
  prompt.style.gap = "8px";
  prompt.style.width = "min(360px, calc(100vw - 32px))";
  prompt.style.border = "3px solid #101010";
  prompt.style.background = "#FFE900";
  prompt.style.boxShadow = "6px 6px 0 #101010";
  prompt.style.color = "#101010";
  prompt.style.fontSize = "12px";
  prompt.style.fontWeight = "900";
  prompt.style.padding = "12px";
  prompt.style.textTransform = "uppercase";

  title.style.fontSize = "15px";
  details.style.fontSize = "10px";
  details.style.lineHeight = "1.35";
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.alignItems = "center";

  downloadLink.style.border = "2px solid #101010";
  downloadLink.style.background = "#03DAC5";
  downloadLink.style.boxShadow = "3px 3px 0 #101010";
  downloadLink.style.color = "#101010";
  downloadLink.style.cursor = "pointer";
  downloadLink.style.fontSize = "11px";
  downloadLink.style.fontWeight = "900";
  downloadLink.style.padding = "7px 10px";
  downloadLink.style.textDecoration = "none";
  downloadLink.style.textTransform = "uppercase";
  previewLink.style.border = "2px solid #101010";
  previewLink.style.background = "#FFF8D8";
  previewLink.style.boxShadow = "3px 3px 0 #101010";
  previewLink.style.color = "#101010";
  previewLink.style.cursor = "pointer";
  previewLink.style.fontSize = "11px";
  previewLink.style.fontWeight = "900";
  previewLink.style.padding = "7px 10px";
  previewLink.style.textDecoration = "none";
  previewLink.style.textTransform = "uppercase";
  closeButton.style.width = "fit-content";
  closeButton.style.border = "2px solid #101010";
  closeButton.style.background = "#FFF8D8";
  closeButton.style.boxShadow = "3px 3px 0 #101010";
  closeButton.style.color = "#101010";
  closeButton.style.cursor = "pointer";
  closeButton.style.fontSize = "11px";
  closeButton.style.fontWeight = "900";
  closeButton.style.padding = "7px 10px";
  closeButton.style.textDecoration = "none";
  closeButton.style.textTransform = "uppercase";

  const cleanup = () => {
    prompt.remove();
    URL.revokeObjectURL(objectUrl);
  };

  downloadLink.addEventListener("click", () => {
    downloadLink.textContent = "Descargando...";
    window.setTimeout(() => {
      if (document.body.contains(prompt)) {
        downloadLink.textContent = "Descargar otra vez";
      }
    }, 1500);
  });
  closeButton.addEventListener("click", cleanup);
  window.setTimeout(() => {
    if (document.body.contains(prompt)) {
      cleanup();
    }
  }, 600_000);

  actions.append(downloadLink, previewLink, closeButton);
  prompt.append(title, details, actions);
  document.body.appendChild(prompt);
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function revokeObjectUrlLater(objectUrl: string) {
  // Chrome may still be streaming the Blob into Downloads after click.
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
}

function dataUrlToBlob(dataUrl: string) {
  const [metadata = "", payload = ""] = dataUrl.split(",");
  const mimeType = metadata.match(/^data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const isBase64 = metadata.includes(";base64");
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return new Blob([bytes], { type: mimeType });
}

function addLibraryShape({
  canvas,
  fill,
  namePrefix,
  point,
  type
}: {
  canvas: ReturnType<typeof createFabricCanvas>;
  fill: string;
  namePrefix: string;
  point: { x: number; y: number };
  type: Exclude<CanvasObjectType, "text">;
}) {
  const state = useEditorStore.getState();
  const objectNumber =
    state.canvasObjects.filter(
      (object) => object.artboardId === state.activeArtboardId
    ).length + 1;
  const summary = createShapeSummary(type, objectNumber, state.activeArtboardId);
  const shape = createBasicShape(type, point, { fill });

  summary.name = `${namePrefix} ${objectNumber}`;
  shape.set({ id: summary.id, name: summary.name });
  applyLayerState(shape, summary);
  updateSymmetryGuidesForObject(shape, { visible: false });
  canvas.add(shape);
  canvas.setActiveObject(shape);
  canvas.requestRenderAll();
  useEditorStore.getState().addCanvasObject(summary);
}

async function addVisualAssetImageToCanvas(
  canvas: ReturnType<typeof createFabricCanvas>,
  asset: VisualAsset
) {
  const state = useEditorStore.getState();
  const objectNumber =
    state.canvasObjects.filter(
      (object) => object.artboardId === state.activeArtboardId
    ).length + 1;
  const summary: CanvasObjectSummary = {
    id: crypto.randomUUID(),
    artboardId: state.activeArtboardId,
    type: "image",
    name: `${asset.name.replace(/\.[^.]+$/, "")} ${objectNumber}`,
    visible: true,
    locked: false
  };
  const image = await FabricImage.fromURL(asset.dataUrl);
  const imageWidth = Math.max(1, image.width ?? 1);
  const imageHeight = Math.max(1, image.height ?? 1);
  const maxWidth = canvas.getWidth() * 0.52;
  const maxHeight = canvas.getHeight() * 0.52;
  const scale = Math.min(maxWidth / imageWidth, maxHeight / imageHeight, 1);

  image.set({
    id: summary.id,
    name: summary.name,
    left: canvas.getWidth() / 2,
    top: canvas.getHeight() / 2,
    originX: "center",
    originY: "center"
  });
  image.set(visualAssetIdName, asset.id);
  image.scale(scale);
  applyLayerState(image, summary);
  canvas.add(image);
  canvas.setActiveObject(image);
  canvas.requestRenderAll();
  useEditorStore.getState().addCanvasObject(summary);
  syncSelectedObjectProperties(image);
}

async function applyVisualAssetAsObjectFill(
  canvas: ReturnType<typeof createFabricCanvas>,
  object: FabricObject,
  asset: VisualAsset
) {
  const patternSource = await createVisualAssetFillSource(canvas, asset.dataUrl);
  const pattern = new Pattern({
    source: patternSource,
    repeat: "no-repeat"
  });

  applyFillToObject(object, pattern);
  object.dirty = true;
  syncSelectedObjectProperties(object);
  canvas.requestRenderAll();
  showVectorCutNotice(`${asset.name} aplicada como relleno.`);
}

async function createVisualAssetFillSource(
  canvas: ReturnType<typeof createFabricCanvas>,
  dataUrl: string
) {
  const image = await loadImageElement(dataUrl);
  const source = document.createElement("canvas");
  const width = Math.max(1, Math.round(canvas.getWidth()));
  const height = Math.max(1, Math.round(canvas.getHeight()));
  const context = source.getContext("2d");

  source.width = width;
  source.height = height;

  if (!context) {
    return image;
  }

  const imageWidth = image.naturalWidth || image.width || width;
  const imageHeight = image.naturalHeight || image.height || height;
  const scale = Math.max(width / imageWidth, height / imageHeight);
  const drawWidth = imageWidth * scale;
  const drawHeight = imageHeight * scale;

  context.drawImage(
    image,
    (width - drawWidth) / 2,
    (height - drawHeight) / 2,
    drawWidth,
    drawHeight
  );

  return source;
}

async function addInverseSelectionMaskToCanvas(
  canvas: ReturnType<typeof createFabricCanvas>
) {
  const state = useEditorStore.getState();
  const currentArtboardId = state.activeArtboardId;
  const previousMaskIds = new Set(
    canvas
      .getObjects()
      .filter((object) => object.get("neoform-shape-kind") === "inverseSelection")
      .map((object) => String(object.get("id") ?? ""))
      .filter(Boolean)
  );
  const canvasObjectIds = new Set(
    state.canvasObjects
      .filter((object) => object.artboardId === currentArtboardId)
      .filter((object) => !previousMaskIds.has(object.id))
      .map((object) => object.id)
  );
  const sourceObjects = canvas
    .getObjects()
    .filter((object) => {
      const objectId = String(object.get("id") ?? "");
      const shapeKind = String(object.get("neoform-shape-kind") ?? "");

      return (
        canvasObjectIds.has(objectId) &&
        shapeKind !== "inverseSelection" &&
        object.get("name") !== "symmetry-guide" &&
        object.get("name") !== "chainsaw-cut-preview" &&
        isVectorCuttableObject(object)
      );
    });

  if (sourceObjects.length === 0) {
    showVectorCutNotice("No hay figuras visibles para invertir la seleccion.");
    return null;
  }

  const geometries = (
    await Promise.all(sourceObjects.map((object) => createBooleanCutGeometry(object)))
  ).filter((geometry): geometry is BooleanCutGeometry => Boolean(geometry));
  const objectMask = unionMultiPolygons(
    geometries.map((geometry) => geometry.multiPolygon)
  );

  if (objectMask.length === 0) {
    showVectorCutNotice("No se pudo leer la geometria de las figuras.");
    return null;
  }

  const canvasBounds: ClipMultiPolygon = [
    [
      pointsToClipRing([
        { x: 0, y: 0 },
        { x: canvas.getWidth(), y: 0 },
        { x: canvas.getWidth(), y: canvas.getHeight() },
        { x: 0, y: canvas.getHeight() }
      ])
    ]
  ];
  const inverseMask = polygonClipping.difference(canvasBounds, objectMask);

  if (inverseMask.length === 0 || getMultiPolygonArea(inverseMask) < 80) {
    showVectorCutNotice("La seleccion inversa no tiene area suficiente.");
    return null;
  }

  if (previousMaskIds.size > 0) {
    canvas.getObjects().forEach((object) => {
      const objectId = String(object.get("id") ?? "");

      if (previousMaskIds.has(objectId)) {
        canvas.remove(object);
      }
    });
    useEditorStore.getState().replaceCanvasObjectsForArtboard(
      currentArtboardId,
      useEditorStore
        .getState()
        .canvasObjects.filter(
          (object) =>
            object.artboardId === currentArtboardId && !previousMaskIds.has(object.id)
        )
    );
  }

  const nextState = useEditorStore.getState();
  const objectNumber =
    nextState.canvasObjects.filter((object) => object.artboardId === currentArtboardId)
      .length + 1;
  const summary = createShapeSummary(
    "inverseSelection",
    objectNumber,
    currentArtboardId
  );
  const mask = new Path(createPathDataFromMultiPolygon(inverseMask), {
    fill: "#ffffff",
    fillRule: "evenodd",
    objectCaching: false,
    opacity: 0.86,
    perPixelTargetFind: true,
    stroke: "transparent",
    strokeWidth: 0
  });

  mask.set({
    id: summary.id,
    name: summary.name
  });
  mask.set("neoform-shape-kind", "inverseSelection");
  mask.set(vectorCutPolygonName, createLocalMultiPolygonForObject(mask, inverseMask));
  mask.set(vectorCutPolygonSpaceName, "multiPolygon-local");
  applyLayerState(mask, summary);
  canvas.add(mask);
  syncInverseSelectionMaskInteractivity(canvas);
  canvas.discardActiveObject();
  canvas.requestRenderAll();
  useEditorStore.getState().addCanvasObject(summary);
  useEditorStore.getState().setCanvasSelection([]);
  useEditorStore.getState().setSelectedObjectProperties(null);
  useEditorStore.getState().setActiveTool("select");
  showVectorCutNotice("Seleccion inversa creada como capa editable.");

  return mask;
}

async function addCompositionToCanvas(
  canvas: ReturnType<typeof createFabricCanvas>,
  composition: CompositionPreset
) {
  if (composition.objects?.length) {
    await addSavedCompositionToCanvas(canvas, composition);
    return;
  }

  const center = {
    x: canvas.getWidth() / 2,
    y: canvas.getHeight() / 2
  };

  composition.items?.forEach((item) => {
    addLibraryShape({
      canvas,
      type: item.type,
      fill: item.fill,
      namePrefix: composition.label,
      point: {
        x: center.x + item.offsetX,
        y: center.y + item.offsetY
      }
    });

    const activeObject = canvas.getActiveObject();

    if (activeObject) {
      activeObject.scale(item.scale);
      updateSymmetryGuidesForObject(activeObject, { visible: false });
    }
  });

  canvas.requestRenderAll();
}

async function addSavedCompositionToCanvas(
  canvas: ReturnType<typeof createFabricCanvas>,
  composition: CompositionPreset
) {
  const objects = composition.objects ?? [];
  const enlivenedObjects = await util.enlivenObjects<FabricObject>(
    objects.map((item) => item.object)
  );
  const center = {
    x: canvas.getWidth() / 2,
    y: canvas.getHeight() / 2
  };
  const state = useEditorStore.getState();
  let objectNumber =
    state.canvasObjects.filter(
      (object) => object.artboardId === state.activeArtboardId
    ).length + 1;

  enlivenedObjects.forEach((object, index) => {
    const savedObject = objects[index];
    const summary = createShapeSummary(
      getCompositionObjectType(object),
      objectNumber,
      state.activeArtboardId
    );

    summary.name = `${composition.label} ${objectNumber}`;
    object.set({ id: summary.id, name: summary.name });
    object.setPositionByOrigin(
      new Point(center.x + savedObject.offsetX, center.y + savedObject.offsetY),
      "center",
      "center"
    );
    applyLayerState(object, summary);
    updateSymmetryGuidesForObject(object, { visible: false });
    canvas.add(object);
    useEditorStore.getState().addCanvasObject(summary);
    objectNumber += 1;
  });

  canvas.requestRenderAll();
}

function saveSelectionAsComposition(
  canvas: ReturnType<typeof createFabricCanvas>,
  targetCompositionId?: string
) {
  const selectedObjects = canvas.getActiveObjects();

  if (selectedObjects.length === 0) {
    window.alert("Selecciona una o varias figuras antes de guardar una composición.");
    return;
  }

  const boundingRect = getObjectsBoundingRect(selectedObjects);
  const center = {
    x: boundingRect.left + boundingRect.width / 2,
    y: boundingRect.top + boundingRect.height / 2
  };
  const objects = selectedObjects.map((object) => {
    const objectCenter = object.getCenterPoint();

    return {
      object: object.toObject(customObjectProperties) as Record<string, unknown>,
      offsetX: objectCenter.x - center.x,
      offsetY: objectCenter.y - center.y
    };
  });

  const state = useEditorStore.getState();
  const existingComposition = targetCompositionId
    ? state.userCompositions.find((composition) => composition.id === targetCompositionId)
    : undefined;

  if (targetCompositionId && !existingComposition) {
    window.alert("No se ha encontrado la composición que querías actualizar.");
    return;
  }

  const composition: SavedComposition = {
    id: existingComposition?.id ?? crypto.randomUUID(),
    label:
      existingComposition?.label ??
      `Saved ${useEditorStore.getState().userCompositions.length + 1}`,
    objects,
    source: "saved"
  };

  if (existingComposition) {
    useEditorStore.getState().updateUserComposition(composition);
    return;
  }

  useEditorStore.getState().addUserComposition(composition);
}

function getObjectsBoundingRect(objects: FabricObject[]) {
  const rects = objects.map((object) => object.getBoundingRect());
  const left = Math.min(...rects.map((rect) => rect.left));
  const top = Math.min(...rects.map((rect) => rect.top));
  const right = Math.max(...rects.map((rect) => rect.left + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.top + rect.height));

  return {
    left,
    top,
    width: right - left,
    height: bottom - top
  };
}

function getCompositionObjectType(object: FabricObject): CanvasObjectType {
  const shapeKind = getShapeKindForObject(object);

  if (shapeKind) {
    return shapeKind;
  }

  if (object instanceof Group) {
    return "group";
  }

  if (object.type === "image") {
    return "image";
  }

  return object.type === "textbox" || object.type === "text" ? "text" : "rectangle";
}

type FlattenCanvasWorkflowOptions = {
  canvas: ReturnType<typeof createFabricCanvas>;
  currentArtboardId: string;
  pushHistory: () => void;
  refreshLineEditOverlay: (object?: FabricObject | null) => void;
  saveCurrentSnapshot: () => void;
};

async function flattenCurrentArtboardLayers({
  canvas,
  currentArtboardId,
  pushHistory,
  refreshLineEditOverlay,
  saveCurrentSnapshot
}: FlattenCanvasWorkflowOptions) {
  const state = useEditorStore.getState();
  const activeLayers = state.canvasObjects.filter(
    (object) => object.artboardId === currentArtboardId
  );
  const activeLayerIds = activeLayers.map((layer) => layer.id);
  const activeObjects = getCanvasObjectsByIds(canvas, activeLayerIds);
  const visibleObjects = activeObjects.filter((object) => object.visible !== false);

  if (visibleObjects.length === 0) {
    window.alert("No hay capas visibles para acoplar.");
    return;
  }

  const shouldFlatten = window.confirm(
    "Acoplar capas convierte las capas visibles del lienzo activo en una sola capa raster. " +
      "Es ideal antes de exportar JPG, pero ya no podras editar esas capas por separado. ¿Continuar?"
  );

  if (!shouldFlatten) {
    return;
  }

  canvas.discardActiveObject();
  refreshLineEditOverlay(null);
  canvas.requestRenderAll();

  const activeArtboard = state.artboards.find(
    (artboard) => artboard.id === currentArtboardId
  );
  const flattenedDataUrl = await createFlattenedCanvasDataUrl(
    canvas,
    activeArtboard
  );
  const imageElement = await loadImageElement(flattenedDataUrl);
  const imageWidth = imageElement.naturalWidth || imageElement.width || canvas.getWidth();
  const imageHeight =
    imageElement.naturalHeight || imageElement.height || canvas.getHeight();
  const summary = createShapeSummary("image", 1, currentArtboardId);
  const flattenedImage = new FabricImage(imageElement, {
    left: 0,
    objectCaching: false,
    top: 0
  });

  summary.name = "Flattened Canvas";
  flattenedImage.set({
    id: summary.id,
    name: summary.name,
    scaleX: canvas.getWidth() / imageWidth,
    scaleY: canvas.getHeight() / imageHeight
  });
  flattenedImage.set("neoform-shape-kind", "image");
  flattenedImage.set("neoform-flattened-layer", true);

  canvas.remove(...activeObjects);
  applyLayerState(flattenedImage, summary);
  canvas.add(flattenedImage);
  canvas.setActiveObject(flattenedImage);
  useEditorStore
    .getState()
    .replaceCanvasObjectsForArtboard(currentArtboardId, [summary]);
  useEditorStore.getState().setCanvasSelection([summary.id]);
  syncSelectedObjectProperties(flattenedImage);
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
  showVectorCutNotice("Capas acopladas en una sola capa final.");
}

async function createFlattenedCanvasDataUrl(
  canvas: ReturnType<typeof createFabricCanvas>,
  artboard?: ExportArtboardLike
) {
  const targetWidth = Math.max(1, Math.round(artboard?.width ?? canvas.getWidth()));
  const targetHeight = Math.max(1, Math.round(artboard?.height ?? canvas.getHeight()));
  const multiplier = Math.max(
    1,
    Math.max(targetWidth / canvas.getWidth(), targetHeight / canvas.getHeight())
  );
  const rawDataUrl = canvas.toDataURL({
    enableRetinaScaling: false,
    format: "png",
    multiplier
  });
  const image = await loadImageElement(rawDataUrl);
  const outputCanvas = document.createElement("canvas");
  const width = targetWidth;
  const height = targetHeight;

  outputCanvas.width = width;
  outputCanvas.height = height;
  const context = getSrgbCanvasContext(outputCanvas);

  if (!context) {
    return rawDataUrl;
  }

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, width, height);
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = "high";
  context.drawImage(image, 0, 0, width, height);

  return outputCanvas.toDataURL("image/png");
}

type LayerCanvasWorkflowOptions = {
  canvas: ReturnType<typeof createFabricCanvas>;
  currentArtboardId: string;
  objectIds: string[];
  pushHistory: () => void;
  refreshLineEditOverlay: (object?: FabricObject | null) => void;
  saveCurrentSnapshot: () => void;
};

async function duplicateLayerObjects({
  canvas,
  currentArtboardId,
  objectIds,
  pushHistory,
  refreshLineEditOverlay,
  saveCurrentSnapshot
}: LayerCanvasWorkflowOptions) {
  const state = useEditorStore.getState();
  const activeLayers = getActiveLayerSummaries(currentArtboardId);
  const targetIds = new Set(objectIds);
  const existingNames = new Set(activeLayers.map((layer) => layer.name));
  const cloneRecords: Array<{
    clone: FabricObject;
    sourceId: string;
    summary: CanvasObjectSummary;
  }> = [];

  for (const layer of activeLayers) {
    if (!targetIds.has(layer.id)) {
      continue;
    }

    const source = getCanvasObjectById(canvas, layer.id);

    if (!source) {
      continue;
    }

    const clone = await source.clone(customObjectProperties);
    const summary: CanvasObjectSummary = {
      ...layer,
      id: crypto.randomUUID(),
      name: createCopyLayerName(layer.name, existingNames)
    };

    existingNames.add(summary.name);
    clone.set({
      id: summary.id,
      left: (source.left ?? 0) + 24,
      name: summary.name,
      top: (source.top ?? 0) + 24
    });
    clone.set("neoform-shape-kind", summary.type);
    assignFreshNestedLayerMetadata(clone);
    applyLayerState(clone, summary);
    clone.setCoords();

    cloneRecords.push({
      clone,
      sourceId: layer.id,
      summary
    });
  }

  if (cloneRecords.length === 0) {
    return;
  }

  const nextLayers: CanvasObjectSummary[] = [];

  activeLayers.forEach((layer) => {
    nextLayers.push(layer);
    cloneRecords
      .filter((record) => record.sourceId === layer.id)
      .forEach((record) => nextLayers.push(record.summary));
  });

  cloneRecords.forEach((record) => canvas.add(record.clone));
  state.replaceCanvasObjectsForArtboard(currentArtboardId, nextLayers);
  syncCanvasStackingWithSummaries(canvas, nextLayers, currentArtboardId);
  selectLayerObjects(
    canvas,
    cloneRecords.map((record) => record.summary.id),
    refreshLineEditOverlay
  );
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
}

function groupLayerObjects({
  canvas,
  currentArtboardId,
  objectIds,
  pushHistory,
  refreshLineEditOverlay,
  saveCurrentSnapshot
}: LayerCanvasWorkflowOptions) {
  const activeLayers = getActiveLayerSummaries(currentArtboardId);
  const targetIds = new Set(objectIds);
  const targetLayers = activeLayers.filter((layer) => targetIds.has(layer.id));

  if (targetLayers.length < 2) {
    return;
  }

  const objects = targetLayers
    .map((layer) => getCanvasObjectById(canvas, layer.id))
    .filter((object): object is FabricObject => Boolean(object));

  if (objects.length < 2) {
    return;
  }

  canvas.discardActiveObject();
  canvas.remove(...objects);

  const groupNumber =
    activeLayers.filter((layer) => layer.type === "group").length + 1;
  const groupSummary: CanvasObjectSummary = {
    artboardId: currentArtboardId,
    id: crypto.randomUUID(),
    locked: targetLayers.every((layer) => layer.locked),
    name: `Group ${groupNumber}`,
    type: "group",
    visible: targetLayers.some((layer) => layer.visible)
  };
  const group = new Group(objects, {
    subTargetCheck: false
  });

  group.set({
    id: groupSummary.id,
    name: groupSummary.name
  });
  group.set("neoform-shape-kind", "group");
  applyLayerState(group, groupSummary);
  group.setCoords();
  canvas.add(group);

  const nextLayers: CanvasObjectSummary[] = [];
  let hasInsertedGroup = false;

  activeLayers.forEach((layer) => {
    if (!targetIds.has(layer.id)) {
      nextLayers.push(layer);
      return;
    }

    if (!hasInsertedGroup) {
      nextLayers.push(groupSummary);
      hasInsertedGroup = true;
    }
  });

  useEditorStore
    .getState()
    .replaceCanvasObjectsForArtboard(currentArtboardId, nextLayers);
  syncCanvasStackingWithSummaries(canvas, nextLayers, currentArtboardId);
  selectLayerObjects(canvas, [groupSummary.id], refreshLineEditOverlay);
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
}

function ungroupLayerObjects({
  canvas,
  currentArtboardId,
  objectIds,
  pushHistory,
  refreshLineEditOverlay,
  saveCurrentSnapshot
}: LayerCanvasWorkflowOptions) {
  const activeLayers = getActiveLayerSummaries(currentArtboardId);
  const targetIds = new Set(objectIds);
  const existingIds = new Set(activeLayers.map((layer) => layer.id));
  const ungroupRecords: Array<{
    groupId: string;
    objects: FabricObject[];
    summaries: CanvasObjectSummary[];
  }> = [];

  canvas.discardActiveObject();

  activeLayers.forEach((layer) => {
    if (!targetIds.has(layer.id)) {
      return;
    }

    const group = getCanvasObjectById(canvas, layer.id);

    if (!(group instanceof Group)) {
      return;
    }

    const children = group.removeAll() as FabricObject[];
    const summaries = children.map((child, index) => {
      const childType = getCompositionObjectType(child);
      const currentId = child.get("id");
      const id =
        typeof currentId === "string" && !existingIds.has(currentId)
          ? currentId
          : crypto.randomUUID();
      const name =
        typeof child.get("name") === "string"
          ? String(child.get("name"))
          : `${layer.name} Part ${index + 1}`;
      const summary: CanvasObjectSummary = {
        artboardId: currentArtboardId,
        id,
        locked: layer.locked || Boolean(child.lockMovementX),
        name,
        type: childType,
        visible: layer.visible && child.visible !== false
      };

      existingIds.add(id);
      child.set({
        id,
        name
      });
      child.set("neoform-shape-kind", childType);
      applyLayerState(child, summary);
      child.setCoords();
      return summary;
    });

    canvas.remove(group);
    children.forEach((child) => canvas.add(child));
    ungroupRecords.push({
      groupId: layer.id,
      objects: children,
      summaries
    });
  });

  if (ungroupRecords.length === 0) {
    return;
  }

  const nextLayers: CanvasObjectSummary[] = [];

  activeLayers.forEach((layer) => {
    const record = ungroupRecords.find((item) => item.groupId === layer.id);

    if (record) {
      nextLayers.push(...record.summaries);
      return;
    }

    nextLayers.push(layer);
  });

  useEditorStore
    .getState()
    .replaceCanvasObjectsForArtboard(currentArtboardId, nextLayers);
  syncCanvasStackingWithSummaries(canvas, nextLayers, currentArtboardId);
  selectLayerObjects(
    canvas,
    ungroupRecords.flatMap((record) => record.summaries.map((summary) => summary.id)),
    refreshLineEditOverlay
  );
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
}

function getActiveLayerSummaries(artboardId: string) {
  return useEditorStore
    .getState()
    .canvasObjects.filter((object) => object.artboardId === artboardId);
}

function getCanvasObjectsByIds(
  canvas: ReturnType<typeof createFabricCanvas>,
  objectIds: string[]
) {
  const targetIds = new Set(objectIds);

  return canvas
    .getObjects()
    .filter((object) => targetIds.has(String(object.get("id") ?? "")));
}

function getCanvasObjectById(
  canvas: ReturnType<typeof createFabricCanvas>,
  objectId: string
) {
  return canvas
    .getObjects()
    .find((object) => object.get("id") === objectId);
}

function getNormalizedRectFromPoints(start: Point, end: Point) {
  const left = Math.min(start.x, end.x);
  const top = Math.min(start.y, end.y);
  const width = Math.abs(end.x - start.x);
  const height = Math.abs(end.y - start.y);

  return {
    height,
    left,
    top,
    width
  };
}

function rectsIntersect(
  first: { height: number; left: number; top: number; width: number },
  second: { height: number; left: number; top: number; width: number }
) {
  return !(
    first.left + first.width < second.left ||
    second.left + second.width < first.left ||
    first.top + first.height < second.top ||
    second.top + second.height < first.top
  );
}

function applyContentEraseToObjects(
  canvas: ReturnType<typeof createFabricCanvas>,
  objects: FabricObject[],
  eraseRect: { height: number; left: number; top: number; width: number }
) {
  if (eraseRect.width * eraseRect.height < 16) {
    return { applied: 0, skipped: 0 };
  }

  let applied = 0;
  let skipped = 0;

  objects.forEach((object) => {
    const existingRects = getContentEraseRects(object);
    const existingClipPath = object.clipPath as FabricObject | undefined;
    const hasForeignClipPath =
      existingClipPath &&
      existingRects.length === 0 &&
      existingClipPath.get(contentEraseClipKindName) !== true;

    if (hasForeignClipPath) {
      skipped += 1;
      return;
    }

    const nextRects = [...existingRects, normalizeContentEraseRect(eraseRect)];
    const clipPath = createContentEraseClipPath(canvas, nextRects);

    object.set({
      clipPath,
      dirty: true,
      objectCaching: true
    });
    object.set(contentEraseRectsName, nextRects);
    object.setCoords();
    applied += 1;
  });

  return { applied, skipped };
}

function getContentEraseRects(object: FabricObject) {
  const value = object.get(contentEraseRectsName);

  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isContentEraseRect);
}

function isContentEraseRect(
  value: unknown
): value is { height: number; left: number; top: number; width: number } {
  if (!value || typeof value !== "object") {
    return false;
  }

  const rect = value as Record<string, unknown>;

  return (
    typeof rect.left === "number" &&
    typeof rect.top === "number" &&
    typeof rect.width === "number" &&
    typeof rect.height === "number" &&
    Number.isFinite(rect.left) &&
    Number.isFinite(rect.top) &&
    Number.isFinite(rect.width) &&
    Number.isFinite(rect.height) &&
    rect.width > 0 &&
    rect.height > 0
  );
}

function normalizeContentEraseRect(rect: {
  height: number;
  left: number;
  top: number;
  width: number;
}) {
  return {
    height: Math.max(1, roundPathNumber(rect.height)),
    left: roundPathNumber(rect.left),
    top: roundPathNumber(rect.top),
    width: Math.max(1, roundPathNumber(rect.width))
  };
}

function createContentEraseClipPath(
  canvas: ReturnType<typeof createFabricCanvas>,
  rects: Array<{ height: number; left: number; top: number; width: number }>
) {
  const canvasWidth = Math.max(1, canvas.getWidth());
  const canvasHeight = Math.max(1, canvas.getHeight());
  const outerRing = [
    { x: 0, y: 0 },
    { x: canvasWidth, y: 0 },
    { x: canvasWidth, y: canvasHeight },
    { x: 0, y: canvasHeight }
  ];
  const holeRings = rects.map((rect) => [
    { x: rect.left, y: rect.top },
    { x: rect.left + rect.width, y: rect.top },
    { x: rect.left + rect.width, y: rect.top + rect.height },
    { x: rect.left, y: rect.top + rect.height }
  ]);
  const clipPath = new Path(
    [outerRing, ...holeRings]
      .map(
        (ring) =>
          ring
            .map(
              (point, index) =>
                `${index === 0 ? "M" : "L"} ${roundPathNumber(point.x)} ${roundPathNumber(point.y)}`
            )
            .join(" ") + " Z"
      )
      .join(" "),
    {
      absolutePositioned: true,
      evented: false,
      fill: "#000000",
      fillRule: "evenodd",
      objectCaching: false,
      selectable: false,
      strokeWidth: 0
    }
  );

  clipPath.set(contentEraseClipKindName, true);

  return clipPath;
}

function syncCanvasStackingWithSummaries(
  canvas: ReturnType<typeof createFabricCanvas>,
  summaries: CanvasObjectSummary[],
  artboardId: string
) {
  summaries
    .filter((summary) => summary.artboardId === artboardId)
    .forEach((summary, index) => {
      const object = getCanvasObjectById(canvas, summary.id);

      if (object) {
        canvas.moveObjectTo(object, index);
      }
    });
}

async function convertTextToOutline({
  canvas,
  currentArtboardId,
  objectId,
  pushHistory,
  refreshLineEditOverlay,
  saveCurrentSnapshot
}: {
  canvas: ReturnType<typeof createFabricCanvas>;
  currentArtboardId: string;
  objectId: string;
  pushHistory: () => void;
  refreshLineEditOverlay: (object?: FabricObject | null) => void;
  saveCurrentSnapshot: () => void;
}) {
  const target = getCanvasObjectById(canvas, objectId);

  if (!target || !isTextObject(target)) {
    showVectorCutNotice("Selecciona un texto antes de convertirlo a contorno.");
    return;
  }

  const multiPolygon = await createTextObjectMultiPolygon(target);

  if (getMultiPolygonArea(multiPolygon) < 80) {
    showVectorCutNotice("No he podido convertir este texto. Revisa tipografia o contenido.");
    return;
  }

  if (!isSafeTextOutlineGeometry(target, multiPolygon)) {
    showVectorCutNotice(
      "La conversion no es fiable con este texto. Lo dejo intacto para no romperlo."
    );
    return;
  }

  const state = useEditorStore.getState();
  const oldSummary = state.canvasObjects.find((object) => object.id === objectId);
  const summary: CanvasObjectSummary = {
    artboardId: currentArtboardId,
    id: objectId,
    locked: oldSummary?.locked ?? false,
    name: `${oldSummary?.name ?? String(target.get("name") ?? "Text")} Outline`,
    type: "textOutline",
    visible: oldSummary?.visible ?? true
  };
  const outline = createBooleanCutPieceFromMultiPolygon(multiPolygon, {
    multiPolygon,
    source: target,
    type: "textOutline"
  });
  const oldStackIndex = canvas.getObjects().indexOf(target);
  const nextObjects = state.canvasObjects
    .filter((object) => object.artboardId === currentArtboardId)
    .map((object) => (object.id === objectId ? summary : object));

  outline.set({
    id: summary.id,
    name: summary.name
  });
  outline.set("neoform-shape-kind", "textOutline");
  applyLayerState(outline, summary);
  canvas.remove(target);
  canvas.add(outline);

  if (oldStackIndex >= 0) {
    canvas.moveObjectTo(outline, oldStackIndex);
  }

  useEditorStore
    .getState()
    .replaceCanvasObjectsForArtboard(currentArtboardId, nextObjects);
  canvas.setActiveObject(outline);
  useEditorStore.getState().setSelectedObjectId(summary.id);
  syncSelectedObjectProperties(outline);
  refreshLineEditOverlay(outline);
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
}

function selectLayerObjects(
  canvas: ReturnType<typeof createFabricCanvas>,
  objectIds: string[],
  refreshLineEditOverlay: (object?: FabricObject | null) => void
) {
  const objects = getCanvasObjectsByIds(canvas, objectIds);

  if (objects.length === 0) {
    canvas.discardActiveObject();
    useEditorStore.getState().setCanvasSelection([]);
    useEditorStore.getState().setSelectedObjectProperties(null);
    refreshLineEditOverlay(null);
    return;
  }

  if (objects.length === 1) {
    canvas.setActiveObject(objects[0]);
    useEditorStore.getState().setCanvasSelection([String(objects[0].get("id"))]);
    syncSelectedObjectProperties(objects[0]);
    refreshLineEditOverlay(objects[0]);
    return;
  }

  const selection = new ActiveSelection(objects, { canvas });

  canvas.setActiveObject(selection);
  useEditorStore
    .getState()
    .setCanvasSelection(objects.map((object) => String(object.get("id"))));
  useEditorStore.getState().setSelectedObjectProperties(null);
  refreshLineEditOverlay(null);
}

function assignFreshNestedLayerMetadata(object: FabricObject) {
  if (!(object instanceof Group)) {
    return;
  }

  object.getObjects().forEach((child) => {
    if (child.get("name") === "symmetry-guide") {
      child.set({
        evented: false,
        selectable: false
      });
      return;
    }

    const type = getCompositionObjectType(child);
    const name =
      typeof child.get("name") === "string"
        ? `${String(child.get("name"))} Copy`
        : `${type} Copy`;

    child.set({
      id: crypto.randomUUID(),
      name
    });
    child.set("neoform-shape-kind", type);
    assignFreshNestedLayerMetadata(child);
  });
}

function createCopyLayerName(baseName: string, existingNames: Set<string>) {
  let name = `${baseName} Copy`;
  let copyNumber = 2;

  while (existingNames.has(name)) {
    name = `${baseName} Copy ${copyNumber}`;
    copyNumber += 1;
  }

  return name;
}

function toFileSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function createNextExportFilename(baseName: string, extension: string) {
  const baseSlug = `${toFileSlug(baseName) || "canvas"}-neoform-pigments`;
  const counter = getNextExportCounter(`${baseSlug}.${extension}`);

  return `${baseSlug}-${String(counter).padStart(3, "0")}.${extension}`;
}

function getNextExportCounter(key: string) {
  if (typeof localStorage === "undefined") {
    return 1;
  }

  const counters = readExportCounters();
  const nextCounter = (counters[key] ?? 0) + 1;

  counters[key] = nextCounter;
  localStorage.setItem(localExportCounterKey, JSON.stringify(counters));

  return nextCounter;
}

function readExportCounters() {
  if (typeof localStorage === "undefined") {
    return {};
  }

  try {
    const counters = JSON.parse(localStorage.getItem(localExportCounterKey) ?? "{}");

    if (!counters || typeof counters !== "object" || Array.isArray(counters)) {
      return {};
    }

    return Object.fromEntries(
      Object.entries(counters).filter(
        (entry): entry is [string, number] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "number" &&
          Number.isFinite(entry[1])
      )
    );
  } catch {
    return {};
  }
}

type LineEditHandleButtonProps = {
  label: string;
  left: number;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  tone: string;
  top: number;
};

function CanvasColorAdjustmentsPanel({
  onChange,
  onReset,
  onScopeChange,
  scope,
  selectedAvailable,
  settings
}: {
  onChange: (settings: ColorAdjustmentSettings) => void;
  onReset: () => void;
  onScopeChange: (scope: "composition" | "selected") => void;
  scope: "composition" | "selected";
  selectedAvailable: boolean;
  settings: ColorAdjustmentSettings;
}) {
  const effectiveScope =
    scope === "selected" && selectedAvailable ? "selected" : "composition";

  return (
    <div className="absolute left-0 top-[calc(100%+0.35rem)] z-50 w-[22rem] border-2 border-ink bg-pollen p-2 text-ink shadow-brutal">
      <div className="mb-2 flex items-center justify-between gap-2 border-2 border-ink bg-paper px-2 py-1">
        <div>
          <h3 className="text-[10px] font-black uppercase">
            {effectiveScope === "selected" ? "Selected color" : "Composition color"}
          </h3>
          <p className="text-[8px] font-black uppercase text-ink/60">
            {effectiveScope === "selected" ? "Active object" : "Preview + JPG export"}
          </p>
        </div>
        <button
          type="button"
          onClick={onReset}
          className="border-2 border-ink bg-bone px-2 py-0.5 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
        >
          Reset
        </button>
      </div>
      <div className="mb-2 grid grid-cols-2 gap-1">
        <button
          type="button"
          onClick={() => onScopeChange("composition")}
          className={clsx(
            "border-2 border-ink px-2 py-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
            effectiveScope === "composition" ? "bg-oxide text-paper" : "bg-bone"
          )}
        >
          Composition
        </button>
        <button
          type="button"
          disabled={!selectedAvailable}
          onClick={() => onScopeChange("selected")}
          className={clsx(
            "border-2 border-ink px-2 py-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 disabled:hover:translate-y-0",
            effectiveScope === "selected" ? "bg-oxide text-paper" : "bg-bone"
          )}
        >
          Selected
        </button>
      </div>
      <div className="grid gap-1.5">
        {colorAdjustmentGroups.map((group) => (
          <div key={group.label} className="border-2 border-ink bg-paper p-1.5">
            <h4 className="mb-1 text-[8px] font-black uppercase text-ink/65">
              {group.label}
            </h4>
            <div
              className={clsx(
                "grid gap-1.5",
                group.keys.length === 3 ? "grid-cols-3" : "grid-cols-2"
              )}
            >
              {colorAdjustmentControls
                .filter((control) => group.keys.includes(control.key))
                .map((control) => (
                  <CanvasColorAdjustmentSlider
                    key={control.key}
                    control={control}
                    settings={settings}
                    onChange={onChange}
                  />
                ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

type CanvasColorAdjustmentControl = (typeof colorAdjustmentControls)[number];

function CanvasColorAdjustmentSlider({
  control,
  onChange,
  settings
}: {
  control: CanvasColorAdjustmentControl;
  onChange: (settings: ColorAdjustmentSettings) => void;
  settings: ColorAdjustmentSettings;
}) {
  const value = settings[control.key];
  const displayValue =
    control.suffix === "x"
      ? `${value.toFixed(2)}x`
      : `${value > 0 ? "+" : ""}${Math.round(value * 100)}`;

  return (
    <label className="text-[8px] font-black uppercase">
      <span className="flex items-center justify-between gap-2">
        <span>{getCompactColorControlLabel(control.label)}</span>
        <span className="text-ink/60">{displayValue}</span>
      </span>
      <input
        type="range"
        min={control.min}
        max={control.max}
        step={control.step}
        value={value}
        onDoubleClick={() =>
          onChange({
            ...settings,
            [control.key]: control.reset
          })
        }
        onChange={(event) =>
          onChange({
            ...settings,
            [control.key]: Number(event.currentTarget.value)
          })
        }
        className="mt-0.5 h-3 w-full accent-[rgb(var(--color-oxide))]"
      />
    </label>
  );
}

function getCompactColorControlLabel(label: string) {
  const labels: Record<string, string> = {
    Blue: "B",
    Contrast: "Contrast",
    Exposure: "Exposure",
    Green: "G",
    Red: "R",
    Saturation: "Saturation",
    Temp: "Temp"
  };

  return labels[label] ?? label;
}

function MotionCursorOverlay({
  angle,
  kind,
  left,
  phase,
  releaseKey,
  top
}: {
  angle: number;
  kind: MotionCursorKind;
  left: number;
  phase: MotionCursorState["phase"];
  releaseKey: number;
  top: number;
}) {
  const shouldRotate = kind === "rocket" || kind === "paperPlane";
  const cursorOffset = shouldRotate
    ? "translate(-50%, -50%)"
    : kind === "tapHand"
      ? "translate(-20%, -96%)"
      : "translate(-15%, -13%)";
  const transform = `translate3d(${left}px, ${top}px, 0) ${cursorOffset}${
    shouldRotate ? ` rotate(${angle}deg)` : ""
  }`;

  return (
    <div
      className={clsx(
        "neoform-motion-cursor-shell pointer-events-none absolute z-50",
        `neoform-cursor-phase-${phase}`,
        kind === "tapHand" ? "h-28 w-28" : "h-14 w-14"
      )}
      style={{
        transform
      }}
    >
      {kind === "rocket" ? <RocketCursorIcon /> : null}
      {kind === "paperPlane" ? <PlaneCursorIcon /> : null}
      {kind === "finger" ? (
        <FingerCursorIcon phase={phase} releaseKey={releaseKey} />
      ) : null}
      {kind === "tapHand" ? <TattooCursorIcon releaseKey={releaseKey} /> : null}
    </div>
  );
}

function RocketCursorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="neoform-motion-cursor neoform-motion-cursor--rocket h-14 w-14"
      viewBox="0 0 76 56"
    >
      <path
        className="neoform-cursor-flame"
        d="M18 28C11 20.5 4 21.5 1 28C4 34.5 11 35.5 18 28Z"
        fill="rgb(var(--color-oxide))"
        stroke="#101010"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <path
        d="M18 19C31 8 53 10 71 28C53 46 31 48 18 37L24 31H13V25H24Z"
        fill="#101010"
        stroke="#ffffff"
        strokeLinejoin="round"
        strokeWidth="2.8"
      />
      <path
        d="M22 20L11 10L14 25Z"
        fill="#101010"
        stroke="#ffffff"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <path
        d="M22 36L11 46L14 31Z"
        fill="#101010"
        stroke="#ffffff"
        strokeLinejoin="round"
        strokeWidth="2.4"
      />
      <circle cx="50" cy="28" r="5.4" fill="#ffffff" />
      <circle cx="50" cy="28" r="2.5" fill="#101010" />
    </svg>
  );
}

function PlaneCursorIcon() {
  return (
    <svg
      aria-hidden="true"
      className="neoform-motion-cursor neoform-motion-cursor--plane h-14 w-14"
      viewBox="0 0 72 72"
    >
      <g
        className="neoform-plane-trail"
        fill="none"
        stroke="#101010"
        strokeLinecap="round"
        strokeWidth="4.2"
      >
        <path d="M7 51L29 30" />
        <path d="M16 61L38 40" />
        <path d="M25 70L47 49" />
      </g>
      <path
        d="M17 29L66 7L55 63L42 40L30 54L35 37Z"
        fill="#ffffff"
        stroke="#101010"
        strokeLinejoin="round"
        strokeWidth="5"
      />
      <path
        d="M66 7L35 37L55 63"
        fill="none"
        stroke="#101010"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="4"
      />
      <path
        d="M35 37L42 40L30 54"
        fill="none"
        stroke="#101010"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="3"
      />
    </svg>
  );
}

function FingerCursorIcon({
  phase,
  releaseKey
}: {
  phase: MotionCursorState["phase"];
  releaseKey: number;
}) {
  const src =
    phase === "press"
      ? "/cursors/finger-press.png"
      : phase === "drag"
        ? "/cursors/finger-drag.png"
        : phase === "release"
          ? "/cursors/finger-release.png"
          : "/cursors/finger-idle.png";

  return (
    <img
      key={phase === "release" ? `release-${releaseKey}` : phase}
      alt=""
      aria-hidden="true"
      className="neoform-finger-cursor neoform-finger-cursor-image"
      src={src}
      data-release-key={releaseKey}
    />
  );
}

function TattooCursorIcon({ releaseKey }: { releaseKey: number }) {
  return (
    <div className="neoform-tattoo-cursor" data-release-key={releaseKey}>
      <img
        alt=""
        aria-hidden="true"
        className="neoform-tattoo-cursor-image neoform-tattoo-machine"
        src="/cursors/tattoo-machine.png"
      />
      <span className="neoform-tattoo-trail" />
      <span className="neoform-tattoo-sparks" />
    </div>
  );
}

function LineEditHandleButton({
  label,
  left,
  onPointerDown,
  tone,
  top
}: LineEditHandleButtonProps) {
  return (
    <button
      type="button"
      onPointerDown={onPointerDown}
      className={clsx(
        "pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-ns-resize border-2 border-ink px-1.5 py-0.5 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-[calc(50%+2px)]",
        tone
      )}
      style={{ left, top }}
      title="Arrastra verticalmente para modificar la línea"
    >
      {label}
    </button>
  );
}

function getArtboardDimensionLabels(
  artboard: { width: number; height: number },
  unit: "cm" | "mm",
  dpi = BASE_PRINT_DPI
) {
  const widthCm = pixelsToCentimeters(artboard.width, dpi);
  const heightCm = pixelsToCentimeters(artboard.height, dpi);

  return {
    pixels: `${artboard.width} x ${artboard.height} px`,
    physical:
      unit === "cm"
        ? `${widthCm.toFixed(2)} x ${heightCm.toFixed(2)} cm`
        : `${(widthCm * 10).toFixed(1)} x ${(heightCm * 10).toFixed(1)} mm`
  };
}

function dimensionValueToPixels(
  value: number,
  unit: DimensionUnit,
  dpi = BASE_PRINT_DPI
) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (unit === "px") {
    return value;
  }

  if (unit === "cm") {
    return centimetersToPixels(value, dpi);
  }

  return centimetersToPixels(value / 10, dpi);
}

function pixelsToDimensionValue(
  pixels: number,
  unit: DimensionUnit,
  dpi = BASE_PRINT_DPI
) {
  if (unit === "px") {
    return Math.round(pixels);
  }

  const centimeters = pixelsToCentimeters(pixels, dpi);
  return unit === "cm" ? centimeters : centimeters * 10;
}

function formatDimensionInput(value: number, unit: DimensionUnit) {
  if (!Number.isFinite(value)) {
    return "";
  }

  return unit === "px" ? String(Math.round(value)) : value.toFixed(2);
}

function clampArtboardPixels(value: number) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.min(Math.max(Math.round(value), 64), 12000);
}

function clampNumber(value: number, min: number, max: number) {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

type VectorCutPoint = {
  x: number;
  y: number;
};

type VectorCutSource = {
  object: FabricObject;
  parent?: FabricObject;
  polygon: VectorCutPoint[];
};

type BooleanCutGeometry = {
  multiPolygon: ClipMultiPolygon;
  parent?: FabricObject;
  source: FabricObject;
  type: CanvasObjectType;
};

type PathCommandLike =
  | [string, ...number[]]
  | OpenTypePathCommand;

function findVectorCutTargets(
  objects: FabricObject[],
  start: Point,
  end: Point,
  preferredTarget?: FabricObject
) {
  const intersectingTargets = [...objects]
    .filter((object) => object !== preferredTarget)
    .filter((object) => doesVectorCutIntersectObject(object, start, end));
  const preferredTargets =
    preferredTarget && doesVectorCutIntersectObject(preferredTarget, start, end)
      ? [preferredTarget]
      : [];

  return [...preferredTargets, ...intersectingTargets];
}

function doesVectorCutIntersectObject(
  object: FabricObject,
  start: Point,
  end: Point
) {
  if (!isVectorCuttableObject(object, true)) {
    return false;
  }

  return createVectorCutSources(object).some((source) =>
    doesVectorCutIntersectPolygon(source.polygon, start, end)
  );
}

function doesVectorCutIntersectPolygon(
  polygon: VectorCutPoint[],
  start: VectorCutPoint,
  end: VectorCutPoint
) {

  if (polygon.length < 3) {
    return false;
  }

  if (isPointInPolygon(start, polygon) || isPointInPolygon(end, polygon)) {
    return true;
  }

  return polygon.some((point, index) => {
    const next = polygon[(index + 1) % polygon.length];

    return doSegmentsIntersect(start, end, point, next);
  });
}

async function createVectorCutPieces(
  target: FabricObject,
  start: Point,
  end: Point
) {
  const sources = createVectorCutSources(target);
  const shouldKeepUncutSources = sources.length > 1;
  const pieces: FabricObject[] = [];
  let didCut = false;

  if (sources.length === 0) {
    return [];
  }

  if (isTextObject(target)) {
    return [];
  }

  if (!canUseStableVectorCut(target, sources)) {
    return [];
  }

  const booleanPieces = await createBooleanVectorCutPieces(target, start, end);

  if (booleanPieces.length >= 2) {
    return booleanPieces;
  }

  if (shouldUseClippedVectorCut(target, sources)) {
    return createClippedVectorCutPieces(target, start, end);
  }

  sources.forEach((source) => {
    const isTouched = doesVectorCutIntersectPolygon(source.polygon, start, end);

    if (!isTouched) {
      if (shouldKeepUncutSources) {
        pieces.push(createVectorCutPieceFromPolygon(source.polygon, source.object, source.parent));
      }

      return;
    }

    const positiveSide = clipPolygonByCutLine(source.polygon, start, end, true);
    const negativeSide = clipPolygonByCutLine(source.polygon, start, end, false);

    if (polygonArea(positiveSide) < 80 || polygonArea(negativeSide) < 80) {
      if (shouldKeepUncutSources) {
        pieces.push(createVectorCutPieceFromPolygon(source.polygon, source.object, source.parent));
      }

      return;
    }

    didCut = true;
    pieces.push(
      createVectorCutPieceFromPolygon(positiveSide, source.object, source.parent),
      createVectorCutPieceFromPolygon(negativeSide, source.object, source.parent)
    );
  });

  return didCut ? pieces : [];
}

const unsupportedVectorCutKinds = new Set<CanvasObjectType>([
  "curveLine",
  "group",
  "image",
  "markerStroke",
  "nibStroke",
  "pencilStroke",
  "straightLine",
  "waveLine"
]);

function canUseStableVectorCut(target: FabricObject, sources: VectorCutSource[]) {
  if (isTextObject(target)) {
    return true;
  }

  if (target instanceof ActiveSelection) {
    return false;
  }

  const targetKind = getShapeKindForObject(target);

  return sources.every((source) => {
    const kind = getShapeKindForObject(source.object) ?? targetKind;

    return Boolean(kind && !unsupportedVectorCutKinds.has(kind));
  });
}

function shouldUseClippedVectorCut(
  target: FabricObject,
  sources: VectorCutSource[]
) {
  if (isTextObject(target)) {
    return true;
  }

  if (target instanceof ActiveSelection) {
    return true;
  }

  return sources.some((source) => {
    const kind = getShapeKindForObject(source.object);

    return (
      !isTextObject(source.object) &&
      source.object instanceof Path &&
        !isLineObjectType(kind) &&
        !isFreehandObjectType(kind)
    );
  });
}

async function createBooleanVectorCutPieces(
  target: FabricObject,
  start: Point,
  end: Point
): Promise<FabricObject[]> {
  if (target instanceof Group) {
    return createBooleanGroupCutPieces(target, start, end);
  }

  const geometry = await createBooleanCutGeometry(target);

  if (!geometry || getMultiPolygonArea(geometry.multiPolygon) < 80) {
    return [];
  }

  const positiveSide = clipMultiPolygonByCutLine(
    geometry.multiPolygon,
    start,
    end,
    true
  );
  const negativeSide = clipMultiPolygonByCutLine(
    geometry.multiPolygon,
    start,
    end,
    false
  );

  if (
    getMultiPolygonArea(positiveSide) < 80 ||
    getMultiPolygonArea(negativeSide) < 80
  ) {
    return [];
  }

  return [
    createBooleanCutPieceFromMultiPolygon(positiveSide, geometry),
    createBooleanCutPieceFromMultiPolygon(negativeSide, geometry)
  ];
}

async function createBooleanGroupCutPieces(
  target: Group,
  start: Point,
  end: Point
) {
  const childGeometries = (
    await Promise.all(
      target
        .getObjects()
        .filter((child) => isVectorCuttableObject(child) && !isTextObject(child))
        .map((child) => createBooleanCutGeometry(child, target))
    )
  ).filter((geometry): geometry is BooleanCutGeometry => {
    if (!geometry) {
      return false;
    }

    return getMultiPolygonArea(geometry.multiPolygon) >= 80;
  });

  if (childGeometries.length === 0) {
    return [];
  }

  const pieces: FabricObject[] = [];
  let didCut = false;

  childGeometries.forEach((geometry) => {
    const positiveSide = clipMultiPolygonByCutLine(
      geometry.multiPolygon,
      start,
      end,
      true
    );
    const negativeSide = clipMultiPolygonByCutLine(
      geometry.multiPolygon,
      start,
      end,
      false
    );
    const positiveArea = getMultiPolygonArea(positiveSide);
    const negativeArea = getMultiPolygonArea(negativeSide);

    if (positiveArea >= 80 && negativeArea >= 80) {
      didCut = true;
      pieces.push(
        createBooleanCutPieceFromMultiPolygon(positiveSide, geometry),
        createBooleanCutPieceFromMultiPolygon(negativeSide, geometry)
      );
      return;
    }

    pieces.push(createBooleanCutPieceFromMultiPolygon(geometry.multiPolygon, geometry));
  });

  return didCut ? pieces : [];
}

async function createBooleanCutGeometry(
  target: FabricObject,
  parent?: FabricObject
): Promise<BooleanCutGeometry | null> {
  if (!isVectorCuttableObject(target)) {
    return null;
  }

  if (target instanceof Group) {
    const childGeometries = (
      await Promise.all(
        target
          .getObjects()
          .filter((child) => isVectorCuttableObject(child))
          .map((child) => createBooleanCutGeometry(child, target))
      )
    ).filter((geometry): geometry is BooleanCutGeometry => Boolean(geometry));

    if (childGeometries.length === 0) {
      return null;
    }

    const mergedGeometry = unionMultiPolygons(
      childGeometries.map((geometry) => geometry.multiPolygon)
    );

    return mergedGeometry.length > 0
      ? {
          multiPolygon: mergedGeometry,
          parent,
          source: target,
          type: getVectorCutPieceType(target)
        }
      : null;
  }

  if (isTextObject(target)) {
    const textGeometry = await createTextObjectMultiPolygon(target);

    return textGeometry.length > 0
      ? {
          multiPolygon: textGeometry,
          parent,
          source: target,
          type: "text"
        }
      : null;
  }

  const pathGeometry = createPathObjectMultiPolygon(target);

  if (pathGeometry.length > 0) {
    return {
      multiPolygon: pathGeometry,
      parent,
      source: target,
      type: getVectorCutPieceType(target)
    };
  }

  const polygon = createObjectOutlinePolygon(target);

  return polygonArea(polygon) >= 80
    ? {
        multiPolygon: [pointsToClipPolygon(polygon)],
        parent,
        source: target,
        type: getVectorCutPieceType(target)
      }
    : null;
}

function clipMultiPolygonByCutLine(
  multiPolygon: ClipMultiPolygon,
  start: VectorCutPoint,
  end: VectorCutPoint,
  keepPositive: boolean
) {
  const halfPlane = createCutHalfPlane(multiPolygon, start, end, keepPositive);

  try {
    return polygonClipping.intersection(multiPolygon, halfPlane);
  } catch {
    return [];
  }
}

function createCutHalfPlane(
  multiPolygon: ClipMultiPolygon,
  start: VectorCutPoint,
  end: VectorCutPoint,
  keepPositive: boolean
): ClipMultiPolygon {
  const bounds = getMultiPolygonBounds(multiPolygon);
  const direction = {
    x: end.x - start.x,
    y: end.y - start.y
  };
  const length = Math.max(Math.hypot(direction.x, direction.y), 1);
  const unitDirection = {
    x: direction.x / length,
    y: direction.y / length
  };
  const unitNormal = {
    x: -unitDirection.y * (keepPositive ? 1 : -1),
    y: unitDirection.x * (keepPositive ? 1 : -1)
  };
  const span =
    Math.max(bounds.maxX - bounds.minX, bounds.maxY - bounds.minY, length) * 8 +
    10000;
  const lineStart = {
    x: start.x - unitDirection.x * span,
    y: start.y - unitDirection.y * span
  };
  const lineEnd = {
    x: end.x + unitDirection.x * span,
    y: end.y + unitDirection.y * span
  };
  const farStart = {
    x: lineStart.x + unitNormal.x * span,
    y: lineStart.y + unitNormal.y * span
  };
  const farEnd = {
    x: lineEnd.x + unitNormal.x * span,
    y: lineEnd.y + unitNormal.y * span
  };

  return [[pointsToClipRing([lineStart, lineEnd, farEnd, farStart])]];
}

function createBooleanCutPieceFromMultiPolygon(
  multiPolygon: ClipMultiPolygon,
  geometry: BooleanCutGeometry
): FabricObject {
  const source = geometry.source;
  const parent = geometry.parent;
  const fill =
    getCutPaint(source, "fill") ??
    (parent ? getCutPaint(parent, "fill") : null) ??
    "#101010";
  const stroke =
    getCutPaint(source, "stroke") ??
    (parent ? getCutPaint(parent, "stroke") : null) ??
    fill;
  const sourceOpacity = Number(source.get("opacity") ?? 1);
  const parentOpacity = parent ? Number(parent.get("opacity") ?? 1) : 1;
  const path = new Path(createPathDataFromMultiPolygon(multiPolygon), {
    fill,
    fillRule: "evenodd",
    globalCompositeOperation:
      (source.get("globalCompositeOperation") as GlobalCompositeOperation | undefined) ??
      (parent?.get("globalCompositeOperation") as GlobalCompositeOperation | undefined) ??
      "source-over",
    objectCaching: false,
    opacity: Math.min(Math.max(sourceOpacity * parentOpacity, 0), 1),
    shadow:
      (source.get("shadow") as Shadow | null) ??
      (parent?.get("shadow") as Shadow | null) ??
      null,
    stroke,
    strokeWidth: 0
  });

  path.set("neoform-shape-kind", geometry.type);
  path.set(shadowPresetName, source.get(shadowPresetName) ?? parent?.get(shadowPresetName));
  path.set(shadeLevelName, source.get(shadeLevelName) ?? parent?.get(shadeLevelName));
  path.set(
    shadeBaseColorName,
    source.get(shadeBaseColorName) ?? parent?.get(shadeBaseColorName)
  );
  path.setCoords();
  path.set(vectorCutPolygonName, createLocalMultiPolygonForObject(path, multiPolygon));
  path.set(vectorCutPolygonSpaceName, "multiPolygon-local");

  return path;
}

async function createClippedVectorCutPieces(
  target: FabricObject,
  start: Point,
  end: Point
) {
  const polygon = createObjectOutlinePolygon(target);
  const positiveSide = clipPolygonByCutLine(polygon, start, end, true);
  const negativeSide = clipPolygonByCutLine(polygon, start, end, false);

  if (polygonArea(positiveSide) < 80 || polygonArea(negativeSide) < 80) {
    return [];
  }

  return Promise.all([
    cloneVectorCutObjectWithClip(target, positiveSide),
    cloneVectorCutObjectWithClip(target, negativeSide)
  ]);
}

async function cloneVectorCutObjectWithClip(
  target: FabricObject,
  clipPoints: VectorCutPoint[]
) {
  const clone = (await target.clone(customObjectProperties)) as FabricObject;
  const sourceType = getVectorCutPieceType(target);
  const clipPath = createRelativeObjectClipPath(clipPoints, target);

  clone.set({
    clipPath,
    dirty: true,
    objectCaching: true,
    subTargetCheck: false
  });
  clone.set("neoform-shape-kind", sourceType);
  rememberVectorCutPolygon(clone, clipPath.points);
  assignFreshNestedLayerMetadata(clone);
  clone.setCoords();

  return clone;
}

function createVectorCutSources(target: FabricObject): VectorCutSource[] {
  if (!isVectorCuttableObject(target)) {
    return [];
  }

  if (target instanceof Group) {
    const childSources = target
      .getObjects()
      .flatMap((child) =>
        createVectorCutSources(child).map((source) => ({
          ...source,
          parent: source.parent ?? target
        }))
      )
      .filter((source) => polygonArea(source.polygon) >= 80);

    if (childSources.length > 0) {
      return childSources;
    }
  }

  const polygon = createObjectOutlinePolygon(target);

  return polygonArea(polygon) >= 80 ? [{ object: target, polygon }] : [];
}

function isVectorCuttableObject(object: FabricObject, requireInteractive = false) {
  return (
    Boolean(object.visible) &&
    (!requireInteractive || (object.evented !== false && object.selectable !== false)) &&
    object.get("name") !== "symmetry-guide" &&
    object.get("name") !== "chainsaw-cut-preview"
  );
}

function createVectorCutPieceFromPolygon(
  points: VectorCutPoint[],
  source: FabricObject,
  parent?: FabricObject
) {
  if (isTextObject(source)) {
    return createTextCutPieceFromPolygon(points, source, parent);
  }

  const fill =
    getCutPaint(source, "fill") ??
    (parent ? getCutPaint(parent, "fill") : null) ??
    getCutPaint(source, "stroke") ??
    "#101010";
  const stroke =
    getCutPaint(source, "stroke") ??
    (parent ? getCutPaint(parent, "stroke") : null) ??
    fill;
  const transparentFill =
    typeof fill === "string" && (fill === "" || fill === "transparent");
  const sourceOpacity = Number(source.get("opacity") ?? 1);
  const parentOpacity = parent ? Number(parent.get("opacity") ?? 1) : 1;
  const inheritedCompositeOperation =
    (source.get("globalCompositeOperation") as GlobalCompositeOperation | undefined) ??
    (parent?.get("globalCompositeOperation") as GlobalCompositeOperation | undefined) ??
    "source-over";
  const shadow =
    (source.get("shadow") as Shadow | null) ??
    (parent?.get("shadow") as Shadow | null) ??
    null;
  const strokeWidth = transparentFill
    ? Math.max(1, Number(source.get("strokeWidth") ?? parent?.get("strokeWidth") ?? 1))
    : 0;
  const piece = new Polygon(points, {
    fill: transparentFill ? "transparent" : fill,
    globalCompositeOperation: inheritedCompositeOperation,
    objectCaching: true,
    opacity: Math.min(Math.max(sourceOpacity * parentOpacity, 0), 1),
    shadow,
    stroke: transparentFill ? stroke : fill,
    strokeDashArray: source.get("strokeDashArray") as number[] | undefined,
    strokeLineCap: source.get("strokeLineCap") as CanvasLineCap | undefined,
    strokeLineJoin: "round",
    strokeMiterLimit: Number(source.get("strokeMiterLimit") ?? 4),
    strokeWidth
  });
  const sourceType = getVectorCutPieceType(source);

  piece.set("neoform-shape-kind", sourceType);
  rememberVectorCutPolygon(piece, getLocalPolygonPoints(piece, points));
  piece.set(shadowPresetName, source.get(shadowPresetName) ?? parent?.get(shadowPresetName));
  piece.set(shadeLevelName, source.get(shadeLevelName) ?? parent?.get(shadeLevelName));
  piece.set(
    shadeBaseColorName,
    source.get(shadeBaseColorName) ?? parent?.get(shadeBaseColorName)
  );

  return piece;
}

function createTextCutPieceFromPolygon(
  points: VectorCutPoint[],
  source: FabricObject,
  parent?: FabricObject
) {
  const text = String(source.get("text") ?? "");
  const sourceOptions = source.toObject(customObjectProperties) as Record<
    string,
    unknown
  >;
  const transform = util.qrDecompose(source.calcTransformMatrix());
  const parentOpacity = parent ? Number(parent.get("opacity") ?? 1) : 1;
  const sourceOpacity = Number(source.get("opacity") ?? 1);
  const clipPath = createRelativeTextClipPath(points, source);
  const textPiece = new Textbox(text, {
    ...sourceOptions,
    angle: transform.angle,
    clipPath,
    dirty: true,
    flipX: false,
    flipY: false,
    globalCompositeOperation:
      source.get("globalCompositeOperation") ??
      parent?.get("globalCompositeOperation") ??
      "source-over",
    left: transform.translateX,
    objectCaching: false,
    opacity: Math.min(Math.max(sourceOpacity * parentOpacity, 0), 1),
    originX: "center",
    originY: "center",
    scaleX: transform.scaleX,
    scaleY: transform.scaleY,
    shadow:
      (source.get("shadow") as Shadow | null) ??
      (parent?.get("shadow") as Shadow | null) ??
      null,
    skewX: transform.skewX,
    skewY: transform.skewY,
    top: transform.translateY
  });

  textPiece.set("neoform-shape-kind", "text");
  rememberVectorCutPolygon(textPiece, clipPath.points);
  textPiece.set(
    shadowPresetName,
    source.get(shadowPresetName) ?? parent?.get(shadowPresetName)
  );
  textPiece.set(
    shadeLevelName,
    source.get(shadeLevelName) ?? parent?.get(shadeLevelName)
  );
  textPiece.set(
    shadeBaseColorName,
    source.get(shadeBaseColorName) ?? parent?.get(shadeBaseColorName)
  );

  return textPiece;
}

function createAbsoluteClipPath(points: VectorCutPoint[]) {
  const clipPath = new Polygon(points, {
    fill: "#000000",
    objectCaching: false,
    selectable: false,
    evented: false,
    strokeWidth: 0
  });

  clipPath.set("absolutePositioned", true);
  clipPath.set("inverted", false);
  return clipPath;
}

function createRelativeObjectClipPath(
  points: VectorCutPoint[],
  source: FabricObject
) {
  const localPoints = getLocalPolygonPoints(source, points);
  const clipPath = new Polygon(localPoints, {
    fill: "#000000",
    left: 0,
    objectCaching: false,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    strokeWidth: 0,
    top: 0
  });

  clipPath.set("absolutePositioned", false);
  return clipPath;
}

function createRelativeTextClipPath(
  points: VectorCutPoint[],
  source: FabricObject
) {
  const localPoints = getLocalPolygonPoints(source, points);
  const clipPath = new Polygon(localPoints, {
    fill: "#000000",
    left: 0,
    objectCaching: false,
    originX: "center",
    originY: "center",
    selectable: false,
    evented: false,
    strokeWidth: 0,
    top: 0
  });

  clipPath.set("absolutePositioned", false);
  return clipPath;
}

function getLocalPolygonPoints(
  source: FabricObject,
  points: VectorCutPoint[]
) {
  const inverseMatrix = util.invertTransform(source.calcTransformMatrix());
  return removeDuplicatePolygonPoints(
    points.map((point) => {
      const transformed = new Point(point.x, point.y).transform(inverseMatrix);

      return {
        x: transformed.x,
        y: transformed.y
      };
    })
  );
}

function rememberVectorCutPolygon(
  object: FabricObject,
  localPoints: VectorCutPoint[]
) {
  object.set(vectorCutPolygonName, serializeVectorCutPolygon(localPoints));
  object.set(vectorCutPolygonSpaceName, "local");
}

function serializeVectorCutPolygon(points: Array<{ x: number; y: number }>) {
  return removeDuplicatePolygonPoints(points).map((point) => ({
    x: roundCutCoordinate(point.x),
    y: roundCutCoordinate(point.y)
  }));
}

function getStoredVectorCutPolygon(target: FabricObject): VectorCutPoint[] {
  const value = target.get(vectorCutPolygonName);
  const space = target.get(vectorCutPolygonSpaceName);

  if (space === "multiPolygon-local" && isClipMultiPolygon(value)) {
    return multiPolygonToOutline(transformLocalMultiPolygon(target, value));
  }

  if (space === "multiPolygon" && isClipMultiPolygon(value)) {
    return multiPolygonToOutline(value);
  }

  if (!Array.isArray(value)) {
    return [];
  }

  const points = removeDuplicatePolygonPoints(
    value
      .map((point) => {
        if (!point || typeof point !== "object") {
          return null;
        }

        const { x, y } = point as Partial<VectorCutPoint>;

        if (typeof x !== "number" || typeof y !== "number") {
          return null;
        }

        return { x, y };
      })
      .filter((point): point is VectorCutPoint => Boolean(point))
  );

  if (space !== "local") {
    return points;
  }

  return transformLocalPoints(target, points);
}

function getStoredVectorCutMultiPolygon(target: FabricObject): ClipMultiPolygon {
  const value = target.get(vectorCutPolygonName);
  const space = target.get(vectorCutPolygonSpaceName);

  if (!isClipMultiPolygon(value)) {
    return [];
  }

  if (space === "multiPolygon-local") {
    return transformLocalMultiPolygon(target, value);
  }

  return space === "multiPolygon" ? value : [];
}

function roundCutCoordinate(value: number) {
  return Math.round(value * 100) / 100;
}

function createObjectOutlinePolygon(target: FabricObject): VectorCutPoint[] {
  const storedCutPolygon = getStoredVectorCutPolygon(target);

  if (storedCutPolygon.length >= 3) {
    return storedCutPolygon;
  }

  if (target instanceof Group) {
    const childPolygons = target
      .getObjects()
      .filter((child) => isVectorCuttableObject(child))
      .map((child) => createObjectOutlinePolygon(child))
      .filter((polygon) => polygon.length >= 3);

    if (childPolygons.length === 1) {
      return childPolygons[0];
    }

    return createBoundsOutlinePolygon(target);
  }

  const bounds = target.getBoundingRect();
  const kind = getShapeKindForObject(target);
  const left = bounds.left;
  const top = bounds.top;
  const width = Math.max(bounds.width, 1);
  const height = Math.max(bounds.height, 1);
  const center = {
    x: left + width / 2,
    y: top + height / 2
  };

  const localPathOutline = createLocalPathOutline(target);

  if (localPathOutline.length >= 3) {
    return transformLocalPoints(target, localPathOutline);
  }

  if (target instanceof Polygon && target.points?.length >= 3) {
    return transformLocalPoints(
      target,
      target.points.map((point) => ({
        x: point.x - target.pathOffset.x,
        y: point.y - target.pathOffset.y
      }))
    );
  }

  if (target instanceof Ellipse || kind === "ellipse") {
    return transformLocalPoints(target, createEllipseObjectOutline(target));
  }

  if (target instanceof Rect) {
    return transformLocalPoints(target, createRectObjectOutline(target));
  }

  if (kind === "drop") {
    return transformLocalPoints(
      target,
      createEllipseOutline({ x: 0, y: 0 }, target.width / 2, target.height / 2)
    );
  }

  if (kind === "pill") {
    return createCapsuleOutline(left, top, width, height);
  }

  if (kind === "triangle") {
    return [
      { x: center.x, y: top },
      { x: left + width, y: top + height },
      { x: left, y: top + height }
    ];
  }

  if (kind === "diamond") {
    return [
      { x: center.x, y: top },
      { x: left + width, y: center.y },
      { x: center.x, y: top + height },
      { x: left, y: center.y }
    ];
  }

  if (kind === "pentagon") {
    return createRegularOutline(center, width / 2, height / 2, 5);
  }

  if (kind === "hexagon") {
    return createRegularOutline(center, width / 2, height / 2, 6, Math.PI / 6);
  }

  return [
    ...createBoundsOutlinePolygon(target)
  ];
}

function createPathObjectMultiPolygon(target: FabricObject): ClipMultiPolygon {
  const storedMultiPolygon = getStoredVectorCutMultiPolygon(target);

  if (storedMultiPolygon.length > 0) {
    return storedMultiPolygon;
  }

  if (target instanceof Polygon && target.points?.length >= 3) {
    const ring = transformLocalPoints(
      target,
      target.points.map((point) => ({
        x: point.x - target.pathOffset.x,
        y: point.y - target.pathOffset.y
      }))
    );

    return [pointsToClipPolygon(ring)];
  }

  if (target instanceof Ellipse) {
    return [pointsToClipPolygon(transformLocalPoints(target, createEllipseObjectOutline(target)))];
  }

  if (target instanceof Rect) {
    return [pointsToClipPolygon(transformLocalPoints(target, createRectObjectOutline(target)))];
  }

  if (!(target instanceof Path)) {
    return [];
  }

  const localRings = createLocalPathRings(target.path as PathCommandLike[]);
  const absoluteRings = localRings
    .map((ring) =>
      transformLocalPoints(
        target,
        ring.map((point) => ({
          x: point.x - target.pathOffset.x,
          y: point.y - target.pathOffset.y
        }))
      )
    )
    .filter((ring) => polygonArea(ring) >= 16);

  return ringsToMultiPolygon(absoluteRings);
}

async function createTextObjectMultiPolygon(target: FabricObject) {
  if (!isTextObject(target)) {
    return [];
  }

  const text = String(target.get("text") ?? "");

  if (!text.trim()) {
    return [];
  }

  const fontFamily = normalizeTextFontFamily(target.get("fontFamily"));
  const font = await loadOpenTypeFont(fontFamily).catch(() => null);

  if (!font) {
    return [];
  }

  const fontSize = Number(target.get("fontSize") ?? 64);
  const lineHeight = Number(target.get("lineHeight") ?? 1.16) * fontSize;
  const width = Number(target.get("width") ?? target.getScaledWidth() ?? 1);
  const height = Number(target.get("height") ?? target.getScaledHeight() ?? fontSize);
  const fontScale = fontSize / font.unitsPerEm;
  const ascender = font.ascender * fontScale;
  const charSpacingPx = (Number(target.get("charSpacing") ?? 0) / 1000) * fontSize;
  const textAlign = String(target.get("textAlign") ?? "left");
  const lines = text.split("\n");
  const rings = lines.flatMap((line, lineIndex) => {
    const baseline = -height / 2 + ascender + lineIndex * lineHeight;
    const lineWidth = getOpenTypeLineWidth(font, line, fontSize, charSpacingPx);
    const lineLeft =
      textAlign === "center"
        ? -lineWidth / 2
        : textAlign === "right"
          ? width / 2 - lineWidth
          : -width / 2;

    return createOpenTypeLineRings(font, line, lineLeft, baseline, fontSize, charSpacingPx);
  });
  const normalizedRings = normalizeTextOutlineLocalRings(rings, width, textAlign);
  const absoluteRings = normalizedRings
    .map((ring) => transformLocalPoints(target, ring))
    .filter((ring) => polygonArea(ring) >= 16);

  return ringsToMultiPolygon(absoluteRings);
}

function normalizeTextOutlineLocalRings(
  rings: VectorCutPoint[][],
  width: number,
  textAlign: string
) {
  const bounds = getPointRingsBounds(rings);

  if (!bounds) {
    return rings;
  }

  const outlineWidth = Math.max(bounds.maxX - bounds.minX, 1);
  const currentCenter = {
    x: bounds.minX + outlineWidth / 2,
    y: bounds.minY + Math.max(bounds.maxY - bounds.minY, 1) / 2
  };
  const targetCenterX =
    textAlign === "right"
      ? width / 2 - outlineWidth / 2
      : textAlign === "left"
        ? -width / 2 + outlineWidth / 2
        : 0;
  const offset = {
    x: targetCenterX - currentCenter.x,
    y: -currentCenter.y
  };

  return rings.map((ring) =>
    ring.map((point) => ({
      x: point.x + offset.x,
      y: point.y + offset.y
    }))
  );
}

function getPointRingsBounds(rings: VectorCutPoint[][]) {
  const points = rings.flat();

  if (points.length === 0) {
    return null;
  }

  return points.reduce(
    (bounds, point) => ({
      maxX: Math.max(bounds.maxX, point.x),
      maxY: Math.max(bounds.maxY, point.y),
      minX: Math.min(bounds.minX, point.x),
      minY: Math.min(bounds.minY, point.y)
    }),
    {
      maxX: Number.NEGATIVE_INFINITY,
      maxY: Number.NEGATIVE_INFINITY,
      minX: Number.POSITIVE_INFINITY,
      minY: Number.POSITIVE_INFINITY
    }
  );
}

function getOpenTypeLineWidth(
  font: OpenTypeFont,
  line: string,
  fontSize: number,
  charSpacingPx: number
) {
  const characters = Array.from(line);
  const kernedWidth = font.getAdvanceWidth(line, fontSize, { kerning: true });
  const extraSpacing = Math.max(0, characters.length - 1) * charSpacingPx;

  return kernedWidth + extraSpacing;
}

function createOpenTypeLineRings(
  font: OpenTypeFont,
  line: string,
  left: number,
  baseline: number,
  fontSize: number,
  charSpacingPx: number
) {
  if (charSpacingPx === 0) {
    const path = font.getPath(line, left, baseline, fontSize, { kerning: true });

    return createLocalPathRings(path.commands as OpenTypePathCommand[]);
  }

  let cursor = left;

  return Array.from(line).flatMap((character, index, characters) => {
    const path = font.getPath(character, cursor, baseline, fontSize);
    const nextCharacter = characters[index + 1] ?? "";
    const kerning =
      nextCharacter && typeof font.getKerningValue === "function"
        ? font.getKerningValue(
            font.charToGlyph(character),
            font.charToGlyph(nextCharacter)
          ) *
          (fontSize / font.unitsPerEm)
        : 0;

    cursor += font.getAdvanceWidth(character, fontSize) + kerning + charSpacingPx;

    return createLocalPathRings(path.commands as OpenTypePathCommand[]);
  });
}

function loadOpenTypeFont(fontFamily: TextFontFamily) {
  const cached = textFontCache.get(fontFamily);

  if (cached) {
    return cached;
  }

  const fontPromise = fetch(textFontFiles[fontFamily])
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Could not load font ${fontFamily}`);
      }

      return response.arrayBuffer();
    })
    .then((buffer) => opentype.parse(buffer));

  textFontCache.set(fontFamily, fontPromise);
  return fontPromise;
}

function createBoundsOutlinePolygon(target: FabricObject): VectorCutPoint[] {
  return target.getCoords().map((point) => ({
    x: point.x,
    y: point.y
  }));
}

function transformLocalPoints(
  object: FabricObject,
  points: VectorCutPoint[]
): VectorCutPoint[] {
  const matrix = object.calcTransformMatrix();

  return points.map((point) => {
    const transformed = new Point(point.x, point.y).transform(matrix);

    return {
      x: transformed.x,
      y: transformed.y
    };
  });
}

function createLocalPathOutline(target: FabricObject): VectorCutPoint[] {
  if (!(target instanceof Path)) {
    return [];
  }

  const rings = createLocalPathRings(target.path as PathCommandLike[]);

  if (rings.length === 0) {
    return [];
  }

  return removeDuplicatePolygonPoints(
    rings
      .sort((firstRing, secondRing) => polygonArea(secondRing) - polygonArea(firstRing))[0]
      .map((point) => ({
        x: point.x - target.pathOffset.x,
        y: point.y - target.pathOffset.y
      }))
  );
}

function createLocalPathRings(commands: PathCommandLike[]) {
  const rings: VectorCutPoint[][] = [];
  let currentRing: VectorCutPoint[] = [];
  let currentPoint: VectorCutPoint = { x: 0, y: 0 };
  let ringStart: VectorCutPoint = { x: 0, y: 0 };

  const pushPoint = (point: VectorCutPoint) => {
    currentRing.push(point);
    currentPoint = point;
  };
  const closeRing = () => {
    const ring = removeDuplicatePolygonPoints(currentRing);

    if (ring.length >= 3 && polygonArea(ring) >= 8) {
      rings.push(ring);
    }

    currentRing = [];
  };

  commands.forEach((command) => {
    const instruction = getPathCommandType(command);

    if (instruction === "M") {
      closeRing();
      const point = getPathCommandPoint(command);
      currentRing = [point];
      currentPoint = point;
      ringStart = point;
      return;
    }

    if (instruction === "L") {
      pushPoint(getPathCommandPoint(command));
      return;
    }

    if (instruction === "Q") {
      const control = getQuadraticControlPoint(command);
      const end = getPathCommandPoint(command);

      sampleQuadraticCurve(currentPoint, control, end).forEach(pushPoint);
      return;
    }

    if (instruction === "C") {
      const controls = getCubicControlPoints(command);
      const end = getPathCommandPoint(command);

      sampleCubicCurve(currentPoint, controls.first, controls.second, end).forEach(
        pushPoint
      );
      return;
    }

    if (instruction === "Z") {
      if (Math.hypot(currentPoint.x - ringStart.x, currentPoint.y - ringStart.y) > 0.5) {
        pushPoint(ringStart);
      }
      closeRing();
    }
  });

  closeRing();
  return rings;
}

function getPathCommandType(command: PathCommandLike) {
  return Array.isArray(command) ? command[0] : command.type;
}

function getPathCommandPoint(command: PathCommandLike): VectorCutPoint {
  if (Array.isArray(command)) {
    return {
      x: Number(command[command.length - 2] ?? 0),
      y: Number(command[command.length - 1] ?? 0)
    };
  }

  return "x" in command && "y" in command
    ? { x: command.x, y: command.y }
    : { x: 0, y: 0 };
}

function getQuadraticControlPoint(command: PathCommandLike): VectorCutPoint {
  if (Array.isArray(command)) {
    return {
      x: Number(command[1] ?? 0),
      y: Number(command[2] ?? 0)
    };
  }

  return "x1" in command && "y1" in command
    ? { x: command.x1, y: command.y1 }
    : getPathCommandPoint(command);
}

function getCubicControlPoints(command: PathCommandLike) {
  if (Array.isArray(command)) {
    return {
      first: {
        x: Number(command[1] ?? 0),
        y: Number(command[2] ?? 0)
      },
      second: {
        x: Number(command[3] ?? 0),
        y: Number(command[4] ?? 0)
      }
    };
  }

  return "x1" in command && "x2" in command
    ? {
        first: { x: command.x1, y: command.y1 },
        second: { x: command.x2, y: command.y2 }
      }
    : {
        first: getPathCommandPoint(command),
        second: getPathCommandPoint(command)
      };
}

function sampleQuadraticCurve(
  start: VectorCutPoint,
  control: VectorCutPoint,
  end: VectorCutPoint,
  segments = 18
) {
  return Array.from({ length: segments }, (_, index) => {
    const t = (index + 1) / segments;
    const oneMinusT = 1 - t;

    return {
      x: oneMinusT * oneMinusT * start.x + 2 * oneMinusT * t * control.x + t * t * end.x,
      y: oneMinusT * oneMinusT * start.y + 2 * oneMinusT * t * control.y + t * t * end.y
    };
  });
}

function sampleCubicCurve(
  start: VectorCutPoint,
  firstControl: VectorCutPoint,
  secondControl: VectorCutPoint,
  end: VectorCutPoint,
  segments = 28
) {
  return Array.from({ length: segments }, (_, index) => {
    const t = (index + 1) / segments;
    const oneMinusT = 1 - t;

    return {
      x:
        oneMinusT ** 3 * start.x +
        3 * oneMinusT * oneMinusT * t * firstControl.x +
        3 * oneMinusT * t * t * secondControl.x +
        t ** 3 * end.x,
      y:
        oneMinusT ** 3 * start.y +
        3 * oneMinusT * oneMinusT * t * firstControl.y +
        3 * oneMinusT * t * t * secondControl.y +
        t ** 3 * end.y
    };
  });
}

function createEllipseOutline(
  center: VectorCutPoint,
  radiusX: number,
  radiusY: number,
  segments = 36
) {
  return Array.from({ length: segments }, (_, index) => {
    const angle = (index / segments) * Math.PI * 2;

    return {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    };
  });
}

function createEllipseObjectOutline(target: FabricObject) {
  const radiusX = Number(target.get("rx") ?? target.width / 2);
  const radiusY = Number(target.get("ry") ?? target.height / 2);

  return createEllipseOutline(
    { x: 0, y: 0 },
    Math.max(1, radiusX),
    Math.max(1, radiusY)
  );
}

function createRectObjectOutline(target: FabricObject) {
  const width = Math.max(1, Number(target.get("width") ?? target.width ?? 1));
  const height = Math.max(1, Number(target.get("height") ?? target.height ?? 1));
  const radiusX = Math.min(
    width / 2,
    Math.max(0, Number(target.get("rx") ?? 0))
  );
  const radiusY = Math.min(
    height / 2,
    Math.max(0, Number(target.get("ry") ?? 0))
  );

  if (radiusX <= 0 || radiusY <= 0) {
    return [
      { x: -width / 2, y: -height / 2 },
      { x: width / 2, y: -height / 2 },
      { x: width / 2, y: height / 2 },
      { x: -width / 2, y: height / 2 }
    ];
  }

  const points: VectorCutPoint[] = [];
  const corners = [
    { centerX: width / 2 - radiusX, centerY: -height / 2 + radiusY, from: -Math.PI / 2, to: 0 },
    { centerX: width / 2 - radiusX, centerY: height / 2 - radiusY, from: 0, to: Math.PI / 2 },
    { centerX: -width / 2 + radiusX, centerY: height / 2 - radiusY, from: Math.PI / 2, to: Math.PI },
    { centerX: -width / 2 + radiusX, centerY: -height / 2 + radiusY, from: Math.PI, to: Math.PI * 1.5 }
  ];

  corners.forEach((corner) => {
    for (let step = 0; step <= 8; step += 1) {
      const angle = corner.from + ((corner.to - corner.from) * step) / 8;

      points.push({
        x: corner.centerX + Math.cos(angle) * radiusX,
        y: corner.centerY + Math.sin(angle) * radiusY
      });
    }
  });

  return points;
}

function createCapsuleOutline(
  left: number,
  top: number,
  width: number,
  height: number
) {
  const radius = height / 2;
  const leftCenter = { x: left + radius, y: top + radius };
  const rightCenter = { x: left + width - radius, y: top + radius };
  const points: VectorCutPoint[] = [];

  for (let index = 0; index <= 12; index += 1) {
    const angle = -Math.PI / 2 + (index / 12) * Math.PI;
    points.push({
      x: rightCenter.x + Math.cos(angle) * radius,
      y: rightCenter.y + Math.sin(angle) * radius
    });
  }

  for (let index = 0; index <= 12; index += 1) {
    const angle = Math.PI / 2 + (index / 12) * Math.PI;
    points.push({
      x: leftCenter.x + Math.cos(angle) * radius,
      y: leftCenter.y + Math.sin(angle) * radius
    });
  }

  return points;
}

function createRegularOutline(
  center: VectorCutPoint,
  radiusX: number,
  radiusY: number,
  sides: number,
  offset = -Math.PI / 2
) {
  return Array.from({ length: sides }, (_, index) => {
    const angle = offset + (index / sides) * Math.PI * 2;

    return {
      x: center.x + Math.cos(angle) * radiusX,
      y: center.y + Math.sin(angle) * radiusY
    };
  });
}

function pointsToClipRing(points: VectorCutPoint[]): ClipRing {
  const ring = removeDuplicatePolygonPoints(points).map(
    (point) => [roundCutCoordinate(point.x), roundCutCoordinate(point.y)] as [number, number]
  );
  const firstPoint = ring[0];
  const lastPoint = ring[ring.length - 1];

  if (
    firstPoint &&
    lastPoint &&
    (firstPoint[0] !== lastPoint[0] || firstPoint[1] !== lastPoint[1])
  ) {
    ring.push([...firstPoint]);
  }

  return ring;
}

function pointsToClipPolygon(points: VectorCutPoint[]) {
  return [pointsToClipRing(points)];
}

function ringsToMultiPolygon(rings: VectorCutPoint[][]): ClipMultiPolygon {
  const sortedRings = rings
    .filter((ring) => polygonArea(ring) >= 16)
    .sort((firstRing, secondRing) => polygonArea(secondRing) - polygonArea(firstRing));
  const polygons: ClipMultiPolygon = [];

  sortedRings.forEach((ring) => {
    const parentPolygon = polygons.find((polygon) =>
      isPointInClipRing(getRingCentroid(ring), polygon[0])
    );

    if (parentPolygon) {
      parentPolygon.push(pointsToClipRing(ring));
      return;
    }

    polygons.push(pointsToClipPolygon(ring));
  });

  return polygons;
}

function unionMultiPolygons(multiPolygons: ClipMultiPolygon[]) {
  const validPolygons = multiPolygons.filter((multiPolygon) => multiPolygon.length > 0);

  if (validPolygons.length === 0) {
    return [];
  }

  if (validPolygons.length === 1) {
    return validPolygons[0];
  }

  try {
    return validPolygons
      .slice(1)
      .reduce<ClipMultiPolygon>(
        (merged, multiPolygon) => polygonClipping.union(merged, multiPolygon),
        validPolygons[0]
      );
  } catch {
    return validPolygons.flat();
  }
}

function createPathDataFromMultiPolygon(multiPolygon: ClipMultiPolygon) {
  return multiPolygon
    .flatMap((polygon) =>
      polygon.map((ring) =>
        ring
          .map((point, index) =>
            `${index === 0 ? "M" : "L"} ${roundPathNumber(point[0])} ${roundPathNumber(point[1])}`
          )
          .join(" ") + " Z"
      )
    )
    .join(" ");
}

function getMultiPolygonArea(multiPolygon: ClipMultiPolygon) {
  return multiPolygon.reduce(
    (sum, polygon) =>
      sum +
      polygon.reduce(
        (polygonSum, ring, index) =>
          polygonSum + (index === 0 ? 1 : -1) * Math.abs(getClipRingArea(ring)),
        0
      ),
    0
  );
}

function getClipRingArea(ring: ClipRing) {
  if (ring.length < 3) {
    return 0;
  }

  return (
    ring.reduce((sum, point, index) => {
      const next = ring[(index + 1) % ring.length];

      return sum + point[0] * next[1] - next[0] * point[1];
    }, 0) / 2
  );
}

function getMultiPolygonBounds(multiPolygon: ClipMultiPolygon) {
  const points = multiPolygon.flat(2);
  const xs = points.map((point) => point[0]);
  const ys = points.map((point) => point[1]);

  return {
    maxX: Math.max(...xs, 1),
    maxY: Math.max(...ys, 1),
    minX: Math.min(...xs, 0),
    minY: Math.min(...ys, 0)
  };
}

function isSafeTextOutlineGeometry(target: FabricObject, multiPolygon: ClipMultiPolygon) {
  const points = multiPolygon.flat(2);

  if (points.length < 3 || points.some((point) => !Number.isFinite(point[0]) || !Number.isFinite(point[1]))) {
    return false;
  }

  const outlineBounds = getMultiPolygonBounds(multiPolygon);
  const targetBounds = target.getBoundingRect();
  const outlineWidth = outlineBounds.maxX - outlineBounds.minX;
  const outlineHeight = outlineBounds.maxY - outlineBounds.minY;
  const targetWidth = Math.max(targetBounds.width, 1);
  const targetHeight = Math.max(targetBounds.height, 1);
  const targetSpan = Math.max(targetWidth, targetHeight, 1);
  const outlineCenter = {
    x: outlineBounds.minX + outlineWidth / 2,
    y: outlineBounds.minY + outlineHeight / 2
  };
  const targetCenter = {
    x: targetBounds.left + targetWidth / 2,
    y: targetBounds.top + targetHeight / 2
  };
  const centerDistance = Math.hypot(
    outlineCenter.x - targetCenter.x,
    outlineCenter.y - targetCenter.y
  );

  return (
    outlineWidth >= 2 &&
    outlineHeight >= 2 &&
    outlineWidth <= targetWidth * 1.35 + 40 &&
    outlineHeight <= targetHeight * 1.45 + 40 &&
    centerDistance <= targetSpan * 0.75 + 40
  );
}

function multiPolygonToOutline(multiPolygon: ClipMultiPolygon): VectorCutPoint[] {
  const largestPolygon = multiPolygon
    .flatMap((polygon) => polygon.slice(0, 1))
    .sort((firstRing, secondRing) => Math.abs(getClipRingArea(secondRing)) - Math.abs(getClipRingArea(firstRing)))[0];

  return largestPolygon
    ? largestPolygon.map((point) => ({ x: point[0], y: point[1] }))
    : [];
}

function getRingCentroid(ring: VectorCutPoint[]) {
  const sum = ring.reduce(
    (total, point) => ({
      x: total.x + point.x,
      y: total.y + point.y
    }),
    { x: 0, y: 0 }
  );

  return {
    x: sum.x / Math.max(ring.length, 1),
    y: sum.y / Math.max(ring.length, 1)
  };
}

function isPointInClipRing(point: VectorCutPoint, ring: ClipRing) {
  return isPointInPolygon(
    point,
    ring.map(([x, y]) => ({ x, y }))
  );
}

function isClipMultiPolygon(value: unknown): value is ClipMultiPolygon {
  return (
    Array.isArray(value) &&
    value.every((polygon) =>
      Array.isArray(polygon) &&
      polygon.every((ring) =>
        Array.isArray(ring) &&
        ring.every(
          (point) =>
            Array.isArray(point) &&
            typeof point[0] === "number" &&
            typeof point[1] === "number"
        )
      )
    )
  );
}

function createLocalMultiPolygonForObject(
  object: FabricObject,
  multiPolygon: ClipMultiPolygon
) {
  return transformMultiPolygonWithMatrix(
    multiPolygon,
    util.invertTransform(object.calcTransformMatrix())
  );
}

function transformLocalMultiPolygon(
  object: FabricObject,
  multiPolygon: ClipMultiPolygon
) {
  return transformMultiPolygonWithMatrix(multiPolygon, object.calcTransformMatrix());
}

function transformMultiPolygonWithMatrix(
  multiPolygon: ClipMultiPolygon,
  matrix: TMat2D
): ClipMultiPolygon {
  return multiPolygon
    .map((polygon) =>
      polygon
        .map((ring) =>
          pointsToClipRing(
            ring.map(([x, y]) => {
              const transformed = new Point(x, y).transform(matrix);

              return {
                x: transformed.x,
                y: transformed.y
              };
            })
          )
        )
        .filter((ring) => Math.abs(getClipRingArea(ring)) >= 8)
    )
    .filter((polygon) => polygon.length > 0);
}

function clipPolygonByCutLine(
  points: VectorCutPoint[],
  start: VectorCutPoint,
  end: VectorCutPoint,
  keepPositive: boolean
) {
  const result: VectorCutPoint[] = [];

  points.forEach((current, index) => {
    const next = points[(index + 1) % points.length];
    const currentInside = isPointInsideCutSide(current, start, end, keepPositive);
    const nextInside = isPointInsideCutSide(next, start, end, keepPositive);

    if (currentInside && nextInside) {
      result.push(next);
      return;
    }

    if (currentInside && !nextInside) {
      result.push(getLineIntersection(current, next, start, end));
      return;
    }

    if (!currentInside && nextInside) {
      result.push(getLineIntersection(current, next, start, end), next);
    }
  });

  return removeDuplicatePolygonPoints(result);
}

function isPointInsideCutSide(
  point: VectorCutPoint,
  start: VectorCutPoint,
  end: VectorCutPoint,
  keepPositive: boolean
) {
  const side = crossProduct(
    { x: end.x - start.x, y: end.y - start.y },
    { x: point.x - start.x, y: point.y - start.y }
  );

  return keepPositive ? side >= -0.01 : side <= 0.01;
}

function getLineIntersection(
  segmentStart: VectorCutPoint,
  segmentEnd: VectorCutPoint,
  lineStart: VectorCutPoint,
  lineEnd: VectorCutPoint
) {
  const segment = {
    x: segmentEnd.x - segmentStart.x,
    y: segmentEnd.y - segmentStart.y
  };
  const line = {
    x: lineEnd.x - lineStart.x,
    y: lineEnd.y - lineStart.y
  };
  const denominator = crossProduct(segment, line);

  if (Math.abs(denominator) < 0.001) {
    return segmentStart;
  }

  const t =
    crossProduct(
      { x: lineStart.x - segmentStart.x, y: lineStart.y - segmentStart.y },
      line
    ) / denominator;

  return {
    x: segmentStart.x + segment.x * t,
    y: segmentStart.y + segment.y * t
  };
}

function removeDuplicatePolygonPoints(points: VectorCutPoint[]) {
  return points.filter((point, index) => {
    const previous = points[index - 1] ?? points[points.length - 1];

    return Math.hypot(point.x - previous.x, point.y - previous.y) > 0.5;
  });
}

function isPointInPolygon(point: VectorCutPoint, polygon: VectorCutPoint[]) {
  let inside = false;

  for (let index = 0, previousIndex = polygon.length - 1; index < polygon.length; previousIndex = index, index += 1) {
    const current = polygon[index];
    const previous = polygon[previousIndex];
    const intersects =
      current.y > point.y !== previous.y > point.y &&
      point.x <
        ((previous.x - current.x) * (point.y - current.y)) /
          (previous.y - current.y) +
          current.x;

    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function doSegmentsIntersect(
  firstStart: VectorCutPoint,
  firstEnd: VectorCutPoint,
  secondStart: VectorCutPoint,
  secondEnd: VectorCutPoint
) {
  const firstDirection = {
    x: firstEnd.x - firstStart.x,
    y: firstEnd.y - firstStart.y
  };
  const firstToSecondStart = {
    x: secondStart.x - firstStart.x,
    y: secondStart.y - firstStart.y
  };
  const firstToSecondEnd = {
    x: secondEnd.x - firstStart.x,
    y: secondEnd.y - firstStart.y
  };
  const secondDirection = {
    x: secondEnd.x - secondStart.x,
    y: secondEnd.y - secondStart.y
  };
  const secondToFirstStart = {
    x: firstStart.x - secondStart.x,
    y: firstStart.y - secondStart.y
  };
  const secondToFirstEnd = {
    x: firstEnd.x - secondStart.x,
    y: firstEnd.y - secondStart.y
  };
  const firstCrossStart = crossProduct(firstDirection, firstToSecondStart);
  const firstCrossEnd = crossProduct(firstDirection, firstToSecondEnd);
  const secondCrossStart = crossProduct(secondDirection, secondToFirstStart);
  const secondCrossEnd = crossProduct(secondDirection, secondToFirstEnd);

  return firstCrossStart * firstCrossEnd <= 0 && secondCrossStart * secondCrossEnd <= 0;
}

function polygonArea(points: VectorCutPoint[]) {
  if (points.length < 3) {
    return 0;
  }

  const area = points.reduce((sum, point, index) => {
    const next = points[(index + 1) % points.length];

    return sum + point.x * next.y - next.x * point.y;
  }, 0);

  return Math.abs(area / 2);
}

function crossProduct(
  first: VectorCutPoint,
  second: VectorCutPoint
) {
  return first.x * second.y - first.y * second.x;
}

function getCutPaint(
  object: FabricObject,
  property: "fill" | "stroke"
): FabricPaint | null {
  const value = object.get(property) as FabricPaint | undefined;

  if (value && value !== "") {
    return value;
  }

  if (object instanceof Group) {
    const paintedChild = object
      .getObjects()
      .find((child) => child.get("name") !== "symmetry-guide");
    const childValue = paintedChild?.get(property) as FabricPaint | undefined;

    if (childValue && childValue !== "") {
      return childValue;
    }
  }

  return null;
}

function getVectorCutPieceType(target: FabricObject): CanvasObjectType {
  const kind = getShapeKindForObject(target);

  if (kind === "text" || isTextObject(target)) {
    return "text";
  }

  if (!kind || isLineObjectType(kind) || isFreehandObjectType(kind)) {
    return "rectangle";
  }

  return kind;
}

function isTextObject(object: FabricObject) {
  return object instanceof Textbox || object.type === "textbox" || object.type === "text";
}

function getCanvasCursor(
  activeTool: EditorTool,
  cursorStyle: CanvasCursorStyle,
  colorMode?: ColorMode
) {
  const ink = getCssRgbColor("--color-ink", "#101010", colorMode);
  const paper = getCssRgbColor("--color-paper", "#ffffff", colorMode);

  if (activeTool === "chainsawCut") {
    return `url("${createCursorDataUrl(
      `<g><path d="M3 31L5 21L18 16L29 19L34 14L45 17L43 25L76 23L77 34L44 36L42 42L22 43L18 37L10 38Z" fill="${ink}"/><path d="M32 15L43 2C45 0 49 2 48 5L45 16L55 17L51 23L36 21Z" fill="${ink}"/><path d="M12 30H18L15 34H9Z" fill="${paper}"/><circle cx="67" cy="28.7" r="2.2" fill="${paper}"/></g>`,
      { height: 48, viewBox: "0 0 80 48", width: 80 }
    )}") 20 34, crosshair`;
  }

  if (activeTool === "lawnMower") {
    return `url("${createCursorDataUrl(
      `<g><path d="M25 12A6 6 0 1 1 37 12A6 6 0 0 1 25 12ZM21 19C25 14 32 14 36 20L43 30L56 32C62 33 66 37 65 44H33L29 37H21L17 27Z" fill="${ink}"/><path d="M6 33C12 30 19 30 24 34L34 41H49L53 31L65 33C72 34 75 40 73 47H4Z" fill="${ink}"/><path d="M31 31L41 30L50 20L54 24L45 35L33 36Z" fill="${ink}"/><circle cx="17" cy="45" r="8" fill="${ink}"/><circle cx="17" cy="45" r="3.5" fill="${paper}"/><circle cx="61" cy="45" r="6" fill="${ink}"/><circle cx="61" cy="45" r="2.6" fill="${paper}"/></g>`,
      { height: 56, viewBox: "0 0 76 56", width: 76 }
    )}") 25 45, pointer`;
  }

  if (activeTool === "contentEraser") {
    return `url("${createCursorDataUrl(
      `<g fill="none" stroke="${ink}" stroke-linecap="square" stroke-linejoin="miter"><rect x="5" y="5" width="30" height="30" stroke-dasharray="4 3" stroke-width="2.4"/><path d="M12 12L28 28M28 12L12 28" stroke-width="3.2"/><path d="M2 38H38" stroke="${paper}" stroke-width="3.6"/><path d="M2 38H38" stroke="${ink}" stroke-width="1.8"/></g>`
    )}") 20 20, crosshair`;
  }

  if (cursorStyle === "target") {
    return `url("${createCursorDataUrl(
      '<g fill="none" stroke="#101010" stroke-width="3" stroke-linecap="square"><circle cx="20" cy="20" r="7"/><circle cx="20" cy="20" r="13"/><circle cx="20" cy="20" r="18"/><path d="M20 1V11M20 29V39M1 20H11M29 20H39"/></g>'
    )}") 20 20, crosshair`;
  }

  if (cursorStyle === "finger") {
    return "none";
  }

  if (cursorStyle === "rocket") {
    return "none";
  }

  if (cursorStyle === "paperPlane") {
    return "none";
  }

  if (cursorStyle === "tapHand") {
    return "none";
  }

  if (cursorStyle === "pencil") {
    return `url("${createCursorDataUrl(
      '<g transform="rotate(45 20 20)" fill="#fff" stroke="#101010" stroke-width="3.5" stroke-linejoin="round"><path d="M15 4H25V28H15Z"/><path d="M15 28H25L20 37Z" fill="#101010"/><path d="M15 4L18 1H22L25 4"/><path d="M18 8V25"/></g>'
    )}") 9 31, crosshair`;
  }

  if (activeTool === "pan") {
    return "grab";
  }

  if (activeTool === "pencilStroke") {
    return `url("${createCursorDataUrl(
      '<g transform="rotate(45 20 20)" fill="#fff" stroke="#101010" stroke-width="3.5" stroke-linejoin="round"><path d="M15 4H25V28H15Z"/><path d="M15 28H25L20 37Z" fill="#101010"/><path d="M15 4L18 1H22L25 4"/><path d="M18 8V25"/></g>'
    )}") 9 31, crosshair`;
  }

  if (activeTool === "nibStroke") {
    return "crosshair";
  }

  if (activeTool === "markerStroke") {
    return "cell";
  }

  if (activeTool === "gradientTool") {
    return `url("${createCursorDataUrl(
      '<g fill="none" stroke="#101010" stroke-width="2.4" stroke-linecap="square" stroke-linejoin="miter"><rect x="5" y="5" width="30" height="30"/><path d="M10 30L30 10M23 10H30V17"/><path d="M8 8H16M8 14H12M22 32H32"/></g>'
    )}") 20 20, crosshair`;
  }

  return activeTool === "select" ? "default" : "crosshair";
}

type DrawingBrushSettings = {
  color: string;
  decimate: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  maxWidth: number;
  minWidth: number;
  opacity: number;
  pressureCurve: number;
  width: number;
};

function getDrawingBrushSettings(tool: EditorTool): DrawingBrushSettings {
  if (tool === "nibStroke") {
    return {
      color: "#101010",
      decimate: 0.35,
      lineCap: "butt",
      lineJoin: "miter",
      maxWidth: 14,
      minWidth: 1.1,
      opacity: 0.96,
      pressureCurve: 1.35,
      width: 5
    };
  }

  if (tool === "markerStroke") {
    return {
      color: "#101010",
      decimate: 0.7,
      lineCap: "round",
      lineJoin: "round",
      maxWidth: 28,
      minWidth: 7,
      opacity: 0.66,
      pressureCurve: 0.78,
      width: 16
    };
  }

  return {
    color: "#101010",
    decimate: 0.18,
    lineCap: "round",
    lineJoin: "round",
    maxWidth: 7,
    minWidth: 0.8,
    opacity: 0.92,
    pressureCurve: 1.08,
    width: 2.5
  };
}

function createPressureStrokePoint(
  pointer: { x: number; y: number },
  event: unknown,
  settings: DrawingBrushSettings
): PressureStrokePoint {
  const pressure = getPointerPressure(event);

  return {
    pressure,
    width: getPressureStrokeWidth(settings, pressure),
    x: pointer.x,
    y: pointer.y
  };
}

function getPointerPressure(event: unknown) {
  if (event && typeof event === "object") {
    const pressure = (event as { pressure?: unknown }).pressure;

    if (typeof pressure === "number" && pressure > 0) {
      return clampNumber(pressure, 0, 1);
    }

    const webkitForce = (event as { webkitForce?: unknown }).webkitForce;

    if (typeof webkitForce === "number" && webkitForce > 0) {
      return clampNumber(webkitForce / 3, 0, 1);
    }
  }

  return 0.5;
}

function getPressureStrokeWidth(
  settings: DrawingBrushSettings,
  pressure: number
) {
  const normalizedPressure = Math.pow(
    clampNumber(pressure, 0, 1),
    settings.pressureCurve
  );

  return (
    settings.minWidth +
    (settings.maxWidth - settings.minWidth) * normalizedPressure
  );
}

function shouldAddPressureStrokePoint(
  previousPoint: PressureStrokePoint | undefined,
  nextPoint: PressureStrokePoint
) {
  if (!previousPoint) {
    return true;
  }

  const distance = Math.hypot(
    nextPoint.x - previousPoint.x,
    nextPoint.y - previousPoint.y
  );
  const pressureDelta = Math.abs(nextPoint.pressure - previousPoint.pressure);

  return distance >= 1.4 || pressureDelta >= 0.035;
}

function createPressureStrokeObject(
  points: PressureStrokePoint[],
  settings: DrawingBrushSettings,
  options: { preview: boolean }
) {
  const path = new Path(createPressureStrokePath(points), {
    evented: !options.preview,
    excludeFromExport: options.preview,
    fill: settings.color,
    globalCompositeOperation: "source-over",
    name: options.preview ? "pressure-stroke-preview" : undefined,
    objectCaching: !options.preview,
    opacity: settings.opacity,
    selectable: !options.preview,
    stroke: settings.color,
    strokeLineCap: settings.lineCap,
    strokeLineJoin: settings.lineJoin,
    strokeWidth: 0
  });

  path.set(pressureStrokeName, true);
  return path;
}

function createPressureStrokePath(points: PressureStrokePoint[]) {
  if (points.length <= 1) {
    const point = points[0] ?? { width: 2, x: 0, y: 0 };
    const radius = Math.max(point.width / 2, 0.6);

    return [
      `M ${roundPathNumber(point.x - radius)} ${roundPathNumber(point.y)}`,
      `A ${roundPathNumber(radius)} ${roundPathNumber(radius)} 0 1 0 ${roundPathNumber(point.x + radius)} ${roundPathNumber(point.y)}`,
      `A ${roundPathNumber(radius)} ${roundPathNumber(radius)} 0 1 0 ${roundPathNumber(point.x - radius)} ${roundPathNumber(point.y)}`,
      "Z"
    ].join(" ");
  }

  const leftEdge: Array<{ x: number; y: number }> = [];
  const rightEdge: Array<{ x: number; y: number }> = [];

  points.forEach((point, index) => {
    const previous = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    const tangent = normalizeVector({
      x: next.x - previous.x,
      y: next.y - previous.y
    });
    const normal = { x: -tangent.y, y: tangent.x };
    const halfWidth = Math.max(point.width / 2, 0.4);

    leftEdge.push({
      x: point.x + normal.x * halfWidth,
      y: point.y + normal.y * halfWidth
    });
    rightEdge.push({
      x: point.x - normal.x * halfWidth,
      y: point.y - normal.y * halfWidth
    });
  });

  const outline = [...leftEdge, ...rightEdge.reverse()];
  const [firstPoint, ...restPoints] = outline;

  return [
    `M ${roundPathNumber(firstPoint.x)} ${roundPathNumber(firstPoint.y)}`,
    ...restPoints.map(
      (point) => `L ${roundPathNumber(point.x)} ${roundPathNumber(point.y)}`
    ),
    "Z"
  ].join(" ");
}

function normalizeVector(vector: { x: number; y: number }) {
  const length = Math.hypot(vector.x, vector.y);

  if (length < 0.001) {
    return { x: 1, y: 0 };
  }

  return {
    x: vector.x / length,
    y: vector.y / length
  };
}

function roundPathNumber(value: number) {
  return Number(value.toFixed(2));
}

function syncDrawingMode(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeTool: EditorTool
) {
  if (!isDrawingTool(activeTool)) {
    canvas.isDrawingMode = false;
    canvas.selection = activeTool !== "pan" && activeTool !== "contentEraser";
    return;
  }

  canvas.isDrawingMode = false;
  canvas.selection = false;
  canvas.discardActiveObject();
  canvas.requestRenderAll();
}

function applyFabricCanvasCursor(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeTool: EditorTool,
  cursorStyle: CanvasCursorStyle
) {
  const cursor = getCanvasCursor(activeTool, cursorStyle);

  canvas.defaultCursor = cursor;
  canvas.freeDrawingCursor = cursor;
  canvas.hoverCursor = cursor;
  canvas.moveCursor = activeTool === "pan" ? "grabbing" : cursor;
  canvas.upperCanvasEl.style.cursor = cursor;
  canvas.getElement().style.cursor = cursor;
  canvas.getElement().parentElement?.style.setProperty("cursor", cursor);
  canvas.setCursor(cursor);
}

function createCursorDataUrl(
  svgContent: string,
  options: { height?: number; viewBox?: string; width?: number } = {}
) {
  const width = options.width ?? 40;
  const height = options.height ?? 40;
  const viewBox = options.viewBox ?? `0 0 ${width} ${height}`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}">${svgContent}</svg>`
  )}`;
}

function getCssRgbColor(
  variableName: "--color-ink" | "--color-paper",
  fallback: string,
  colorMode?: ColorMode
) {
  if (colorMode) {
    return cursorThemeColors[colorMode][variableName];
  }

  if (typeof window === "undefined") {
    return fallback;
  }

  const value = window
    .getComputedStyle(document.documentElement)
    .getPropertyValue(variableName)
    .trim();
  const [red, green, blue] = value.split(/\s+/).map(Number);

  return [red, green, blue].every(Number.isFinite)
    ? `rgb(${red}, ${green}, ${blue})`
    : fallback;
}

function getFilmGrainPreviewStyle(settings: CanvasFinishSettings) {
  const grainSize = Math.round(9 - settings.filmGrainRoughness * 5);

  return {
    backgroundColor: "transparent",
    backgroundImage:
      "radial-gradient(circle at 12% 18%, rgba(255,255,255,0.8) 0 0.8px, transparent 1.5px), radial-gradient(circle at 72% 32%, rgba(0,0,0,0.72) 0 0.9px, transparent 1.6px), radial-gradient(circle at 42% 74%, rgba(255,255,255,0.58) 0 0.7px, transparent 1.5px), radial-gradient(circle at 88% 84%, rgba(0,0,0,0.62) 0 1px, transparent 1.8px)",
    backgroundSize: `${grainSize}px ${grainSize}px, ${grainSize + 3}px ${
      grainSize + 3
    }px, ${grainSize + 5}px ${grainSize + 5}px, ${grainSize + 7}px ${
      grainSize + 7
    }px`,
    mixBlendMode: "overlay",
    opacity: 0.18 + settings.filmGrainAmount * 0.52
  } as const;
}

function getColorAdjustmentPreviewFilter(settings: ColorAdjustmentSettings) {
  const exposure = 1 + settings.exposure * 0.38;
  const contrast = 1 + settings.contrast * 0.72;
  const saturation = 1 + settings.saturation * 0.95;
  const temperatureHue = settings.temperature * 7;

  return [
    `brightness(${Math.max(0.1, exposure).toFixed(3)})`,
    `contrast(${Math.max(0.1, contrast).toFixed(3)})`,
    `saturate(${Math.max(0, saturation).toFixed(3)})`,
    `hue-rotate(${temperatureHue.toFixed(2)}deg)`
  ].join(" ");
}

async function applyColorAdjustmentsToDataUrl(
  dataUrl: string,
  settings: ColorAdjustmentSettings,
  mimeType = "image/png"
) {
  const image = await loadImageElement(dataUrl);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = image.naturalWidth || image.width;
  outputCanvas.height = image.naturalHeight || image.height;
  const context = getSrgbCanvasContext(outputCanvas);

  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );
  applyColorAdjustmentsToImageData(imageData, settings);
  context.putImageData(imageData, 0, 0);

  return outputCanvas.toDataURL(
    mimeType,
    mimeType === "image/jpeg" ? getExportJpegQuality() : 1
  );
}

function applyColorAdjustmentsToImageData(
  imageData: ImageData,
  settings: ColorAdjustmentSettings
) {
  const data = imageData.data;

  for (let index = 0; index < data.length; index += 4) {
    const adjusted = applyColorAdjustmentsToRgb(
      { b: data[index + 2], g: data[index + 1], r: data[index] },
      settings
    );

    data[index] = adjusted.r;
    data[index + 1] = adjusted.g;
    data[index + 2] = adjusted.b;
  }
}

async function applyFilmGrainToDataUrl(
  dataUrl: string,
  settings: CanvasFinishSettings,
  mimeType = "image/png"
) {
  const image = await loadImageElement(dataUrl);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = image.naturalWidth || image.width;
  outputCanvas.height = image.naturalHeight || image.height;
  const context = getSrgbCanvasContext(outputCanvas);

  if (!context) {
    return dataUrl;
  }

  context.drawImage(image, 0, 0);
  const imageData = context.getImageData(
    0,
    0,
    outputCanvas.width,
    outputCanvas.height
  );
  const data = imageData.data;
  const random = createSeededRandom(
    `film-${outputCanvas.width}-${outputCanvas.height}-${settings.filmGrainAmount}-${settings.filmGrainRoughness}`
  );
  const noiseStrength = 72 * settings.filmGrainAmount;

  for (let index = 0; index < data.length; index += 4) {
    const noise = (random() - 0.5) * noiseStrength;
    data[index] = clampColorChannel(data[index] + noise);
    data[index + 1] = clampColorChannel(data[index + 1] + noise);
    data[index + 2] = clampColorChannel(data[index + 2] + noise);
  }

  context.putImageData(imageData, 0, 0);
  drawAnalogSpeckles(context, outputCanvas.width, outputCanvas.height, settings);

  return outputCanvas.toDataURL(
    mimeType,
    mimeType === "image/jpeg" ? getExportJpegQuality() : 1
  );
}

function getSrgbCanvasContext(canvas: HTMLCanvasElement) {
  try {
    const context = canvas.getContext("2d", {
      colorSpace: "srgb"
    } as CanvasRenderingContext2DSettings);

    if (context) {
      return context;
    }
  } catch {
    // Older browsers ignore colorSpace support; canvas 2D defaults to sRGB.
  }

  return canvas.getContext("2d");
}

function getExportJpegQuality() {
  const quality = useEditorStore.getState().exportSettings.jpegQuality;

  return Number.isFinite(quality) ? clampNumber(quality, 0.6, 1) : 0.95;
}

function loadImageElement(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not apply film grain"));
    image.src = src;
  });
}

function drawAnalogSpeckles(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: CanvasFinishSettings
) {
  const random = createSeededRandom(`speckles-${width}-${height}`);
  const speckleCount = Math.round(
    width * height * settings.filmGrainAmount * settings.filmGrainRoughness * 0.0025
  );
  const maxRadius = 0.7 + settings.filmGrainRoughness * 1.8;

  for (let index = 0; index < speckleCount; index += 1) {
    const isLight = random() > 0.52;
    const alpha = 0.08 + random() * 0.22 * settings.filmGrainAmount;
    context.fillStyle = isLight
      ? `rgba(255,255,255,${alpha})`
      : `rgba(0,0,0,${alpha})`;
    context.beginPath();
    context.ellipse(
      random() * width,
      random() * height,
      0.35 + random() * maxRadius,
      0.25 + random() * maxRadius * 0.7,
      random() * Math.PI,
      0,
      Math.PI * 2
    );
    context.fill();
  }
}

function clampColorChannel(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)));
}

function pixelsToCentimeters(pixels: number, dpi = BASE_PRINT_DPI) {
  return (pixels / dpi) * 2.54;
}

function pixelsToMillimeters(pixels: number, dpi = BASE_PRINT_DPI) {
  return pixelsToCentimeters(pixels, dpi) * 10;
}

function centimetersToPixels(centimeters: number, dpi = BASE_PRINT_DPI) {
  return (centimeters / 2.54) * dpi;
}

function roundPrintNumber(value: number) {
  return Math.round(value * 100) / 100;
}

function applyFillToObject(object: FabricObject, fill: FabricPaint) {
  clearShadeState(object);
  clearObjectColorAdjustmentState(object);

  if (object instanceof Group) {
    object.getObjects().forEach((child) => {
      if (!(child instanceof Line)) {
        applyPaintState(child, fill);
      }
    });

    object.dirty = true;
    return;
  }

  applyPaintState(object, fill);
}

function removeObjectBackground(object: FabricObject) {
  if (object.type === "textbox" || object.type === "text") {
    object.set({
      backgroundColor: "",
      textBackgroundColor: ""
    });
    object.dirty = true;
    return;
  }

  applyFillToObject(object, "transparent");
}

function applyPaintState(object: FabricObject, fill: FabricPaint) {
  const shapeKind = getShapeKindForObject(object);
  const isLineObject = isLineObjectType(shapeKind);
  const isFreehandObject = isFreehandObjectType(shapeKind);
  const isPressureStroke = isPressureStrokeObject(object);

  if (fill === "transparent") {
    object.set({
      fill: isLineObject || (isFreehandObject && !isPressureStroke)
        ? ""
        : "transparent",
      stroke: "#101010",
      strokeWidth: isPressureStroke
        ? 1
        : isFreehandObject
        ? Number(object.get("strokeWidth") ?? 2.5)
        : isLineObject
          ? 1
          : 1
    });
    return;
  }

  if (isLineObject || (isFreehandObject && !isPressureStroke)) {
    object.set({
      fill: "",
      stroke: fill,
      strokeWidth: isFreehandObject ? Number(object.get("strokeWidth") ?? 2.5) : 0
    });
    return;
  }

  object.set({
    fill,
    stroke: fill,
    strokeWidth: 0
  });
}

function applyColorAdjustmentsToObject(
  object: FabricObject,
  settings: ColorAdjustmentSettings
) {
  const adjustments = normalizeColorAdjustments(settings);

  getPaintTargets(object).forEach((target) => {
    const baseFill = getOrRememberBasePaint(target, "fill");
    const baseStroke = getOrRememberBasePaint(target, "stroke");

    target.set(colorAdjustmentsName, adjustments);

    if (typeof baseFill === "string" && isHexColor(baseFill)) {
      target.set("fill", applyColorAdjustmentsToHex(baseFill, adjustments));
    }

    if (typeof baseStroke === "string" && isHexColor(baseStroke)) {
      target.set("stroke", applyColorAdjustmentsToHex(baseStroke, adjustments));
    }
  });

  object.set(colorAdjustmentsName, adjustments);
  object.dirty = true;
}

function getOrRememberBasePaint(
  object: FabricObject,
  property: "fill" | "stroke"
) {
  const metadataName =
    property === "fill" ? colorBaseFillName : colorBaseStrokeName;
  const stored = object.get(metadataName);

  if (typeof stored === "string") {
    return stored;
  }

  const current = object.get(property);

  if (typeof current === "string") {
    object.set(metadataName, current);
    return current;
  }

  return current;
}

function clearObjectColorAdjustmentState(object: FabricObject) {
  object.set(colorAdjustmentsName, createDefaultColorAdjustments());
  object.set(colorBaseFillName, undefined);
  object.set(colorBaseStrokeName, undefined);

  getPaintTargets(object).forEach((target) => {
    target.set(colorAdjustmentsName, createDefaultColorAdjustments());
    target.set(colorBaseFillName, undefined);
    target.set(colorBaseStrokeName, undefined);
  });
}

function isPressureStrokeObject(object: FabricObject) {
  return object.get(pressureStrokeName) === true;
}

async function applyTextureToActiveObject({
  activeObject,
  canvas,
  pushHistory,
  saveCurrentSnapshot,
  texture
}: {
  activeObject: FabricObject;
  canvas: ReturnType<typeof createFabricCanvas>;
  pushHistory: () => void;
  saveCurrentSnapshot: () => void;
  texture: TexturePreset;
}) {
  if (texture.kind === "shadeGradient") {
    applyShadeGradientToObject(activeObject, texture.intensity ?? 0.45);
    syncSelectedObjectProperties(activeObject);
    canvas.requestRenderAll();
    saveCurrentSnapshot();
    pushHistory();
    return;
  }

  applyFillToObject(activeObject, await createTexturePaint(texture));
  syncSelectedObjectProperties(activeObject);
  canvas.requestRenderAll();
  saveCurrentSnapshot();
  pushHistory();
}

async function createTexturePaint(texture: TexturePreset): Promise<FabricPaint> {
  if (texture.kind === "linearGradient") {
    return new Gradient<"linear">({
      type: "linear",
      gradientUnits: "percentage",
      coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
      colorStops: [
        { offset: 0, color: texture.background },
        { offset: 0.52, color: texture.foreground },
        { offset: 1, color: texture.accent ?? texture.background }
      ]
    });
  }

  if (texture.kind === "radialGradient" || texture.kind === "meshGradient") {
    return new Gradient<"radial">({
      type: "radial",
      gradientUnits: "percentage",
      coords: {
        x1: 0.28,
        y1: 0.24,
        r1: 0,
        x2: 0.5,
        y2: 0.5,
        r2: 0.78
      },
      colorStops: [
        { offset: 0, color: texture.accent ?? texture.foreground },
        { offset: texture.kind === "meshGradient" ? 0.48 : 0.62, color: texture.foreground },
        { offset: 1, color: texture.background }
      ]
    });
  }

  if (isSvgTextureKind(texture.kind)) {
    return createSvgTexturePattern(texture);
  }

  return createTexturePattern(texture);
}

function isSvgTextureKind(kind: TexturePreset["kind"]) {
  return (
    kind === "filmGrain" ||
    kind === "bauhausBlocks" ||
    kind === "bauhausWeave" ||
    kind === "bendayDots" ||
    kind === "popHalftone" ||
    kind === "serigraphyBars" ||
    kind === "serigraphyScreen" ||
    kind === "opArtWaves" ||
    kind === "popBurst"
  );
}

function applyGradientToolToObject(
  object: FabricObject,
  settings: GradientToolSettings,
  direction: GradientToolDirection | { x: number; y: number } = settings.direction
) {
  applyShadeGradientToObject(object, settings.intensity, direction);
}

function applyShadeGradientToObject(
  object: FabricObject,
  level = 0.45,
  direction: GradientToolDirection | { x: number; y: number } = "tl-br"
) {
  const shadeLevel = clampNumber(level, 0, 1);

  getPaintTargets(object).forEach((target) => {
    const baseColor = getObjectBaseColor(target);
    const gradient = createShadeGradient(baseColor, shadeLevel, direction);
    const shapeKind = getShapeKindForObject(target);

    target.set(shadeLevelName, shadeLevel);
    target.set(shadeBaseColorName, baseColor);
    target.set(shadeDirectionName, typeof direction === "string" ? direction : "custom");

    if (
      isLineObjectType(shapeKind) ||
      (isFreehandObjectType(shapeKind) && !isPressureStrokeObject(target))
    ) {
      target.set({
        fill: "",
        stroke: gradient,
        strokeWidth: isFreehandObjectType(shapeKind)
          ? Number(target.get("strokeWidth") ?? 2.5)
          : 0
      });
      return;
    }

    target.set({
      fill: gradient,
      stroke: gradient,
      strokeWidth: 0
    });
  });

  object.set(shadeLevelName, shadeLevel);
  object.set(shadeBaseColorName, getObjectBaseColor(getPaintTarget(object)));
  object.set(shadeDirectionName, typeof direction === "string" ? direction : "custom");
  object.dirty = true;
}

function applyShadeLevelToObject(object: FabricObject, level: number) {
  const shadeLevel = clampNumber(level, 0, 1);
  const baseColor = getShadeBaseColor(object);

  if (shadeLevel <= 0) {
    applyFlatColorWithoutClearingShade(object, baseColor);
    clearShadeState(object);
    return;
  }

  getPaintTargets(object).forEach((target) => {
    const targetBaseColor = getShadeBaseColor(target, baseColor);
    const direction = normalizeGradientToolDirection(
      object.get(shadeDirectionName) ?? target.get(shadeDirectionName)
    );
    const gradient = createShadeGradient(targetBaseColor, shadeLevel, direction);
    const shapeKind = getShapeKindForObject(target);

    target.set(shadeLevelName, shadeLevel);
    target.set(shadeBaseColorName, targetBaseColor);
    target.set(shadeDirectionName, direction);

    if (
      isLineObjectType(shapeKind) ||
      (isFreehandObjectType(shapeKind) && !isPressureStrokeObject(target))
    ) {
      target.set({
        fill: "",
        stroke: gradient,
        strokeWidth: isFreehandObjectType(shapeKind)
          ? Number(target.get("strokeWidth") ?? 2.5)
          : 0
      });
      return;
    }

    target.set({
      fill: gradient,
      stroke: gradient,
      strokeWidth: 0
    });
  });

  object.set(shadeLevelName, shadeLevel);
  object.set(shadeBaseColorName, baseColor);
  object.set(shadeDirectionName, normalizeGradientToolDirection(object.get(shadeDirectionName)));
  object.dirty = true;
}

function createShadeGradient(
  baseColor: string,
  level: number,
  direction: GradientToolDirection | { x: number; y: number } = "tl-br"
) {
  const shadeLevel = clampNumber(level, 0, 1);
  const lightAmount = 0.06 + shadeLevel * 0.6;
  const darkAmount = 0.04 + shadeLevel * 0.54;
  const coords = getShadeGradientCoords(direction);

  return new Gradient<"linear">({
    type: "linear",
    gradientUnits: "percentage",
    coords,
    colorStops: [
      { offset: 0, color: mixHexColors(baseColor, "#ffffff", lightAmount) },
      { offset: 0.52, color: baseColor },
      { offset: 1, color: mixHexColors(baseColor, "#000000", darkAmount) }
    ]
  });
}

function normalizeGradientToolDirection(value: unknown): GradientToolDirection {
  return value === "tr-bl" ||
    value === "left-right" ||
    value === "right-left" ||
    value === "top-bottom" ||
    value === "bottom-top"
    ? value
    : "tl-br";
}

function getShadeGradientCoords(
  direction: GradientToolDirection | { x: number; y: number }
) {
  if (typeof direction !== "string") {
    const length = Math.max(Math.hypot(direction.x, direction.y), 1);
    const unit = {
      x: direction.x / length,
      y: direction.y / length
    };

    return {
      x1: clampNumber(0.5 - unit.x * 0.5, 0, 1),
      y1: clampNumber(0.5 - unit.y * 0.5, 0, 1),
      x2: clampNumber(0.5 + unit.x * 0.5, 0, 1),
      y2: clampNumber(0.5 + unit.y * 0.5, 0, 1)
    };
  }

  const coords: Record<GradientToolDirection, { x1: number; x2: number; y1: number; y2: number }> = {
    "bottom-top": { x1: 0.5, x2: 0.5, y1: 1, y2: 0 },
    "left-right": { x1: 0, x2: 1, y1: 0.5, y2: 0.5 },
    "right-left": { x1: 1, x2: 0, y1: 0.5, y2: 0.5 },
    "tl-br": { x1: 0, x2: 1, y1: 0, y2: 1 },
    "top-bottom": { x1: 0.5, x2: 0.5, y1: 0, y2: 1 },
    "tr-bl": { x1: 1, x2: 0, y1: 0, y2: 1 }
  };

  return coords[direction];
}

function getObjectBaseColor(object: FabricObject) {
  const shadeBaseColor = object.get(shadeBaseColorName);

  if (typeof shadeBaseColor === "string" && isHexColor(shadeBaseColor)) {
    return shadeBaseColor;
  }

  const fill = object.get("fill");
  const stroke = object.get("stroke");
  const fillColor = typeof fill === "string" && isHexColor(fill) ? fill : null;
  const strokeColor = typeof stroke === "string" && isHexColor(stroke) ? stroke : null;

  if (fillColor) {
    return fillColor;
  }

  if (strokeColor) {
    return strokeColor;
  }

  return "#C06830";
}

function getShadeBaseColor(object: FabricObject, fallback = "#C06830") {
  const shadeBase = object.get(shadeBaseColorName);

  if (typeof shadeBase === "string" && isHexColor(shadeBase)) {
    return shadeBase;
  }

  const objectBase = getObjectBaseColor(object);
  return isHexColor(objectBase) ? objectBase : fallback;
}

function clearShadeState(object: FabricObject) {
  object.set(shadeLevelName, 0);
  object.set(shadeBaseColorName, undefined);
  object.set(shadeDirectionName, undefined);

  getPaintTargets(object).forEach((target) => {
    target.set(shadeLevelName, 0);
    target.set(shadeBaseColorName, undefined);
    target.set(shadeDirectionName, undefined);
  });
}

function applyFlatColorWithoutClearingShade(object: FabricObject, fill: string) {
  if (object instanceof Group) {
    object.getObjects().forEach((child) => {
      if (!(child instanceof Line)) {
        applyPaintState(child, fill);
      }
    });

    object.dirty = true;
    return;
  }

  applyPaintState(object, fill);
}

function isHexColor(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value);
}

function createDefaultColorAdjustments(): ColorAdjustmentSettings {
  return {
    channelBlue: 1,
    channelGreen: 1,
    channelRed: 1,
    contrast: 0,
    exposure: 0,
    saturation: 0,
    temperature: 0
  };
}

function normalizeColorAdjustments(value: unknown): ColorAdjustmentSettings {
  if (!value || typeof value !== "object") {
    return createDefaultColorAdjustments();
  }

  const record = value as Partial<Record<keyof ColorAdjustmentSettings, unknown>>;

  return {
    channelBlue: clampNumber(Number(record.channelBlue ?? 1), 0, 2),
    channelGreen: clampNumber(Number(record.channelGreen ?? 1), 0, 2),
    channelRed: clampNumber(Number(record.channelRed ?? 1), 0, 2),
    contrast: clampNumber(Number(record.contrast ?? 0), -1, 1),
    exposure: clampNumber(Number(record.exposure ?? 0), -1, 1),
    saturation: clampNumber(Number(record.saturation ?? 0), -1, 1),
    temperature: clampNumber(Number(record.temperature ?? 0), -1, 1)
  };
}

function hasColorAdjustments(settings: ColorAdjustmentSettings) {
  return (
    Math.abs(settings.exposure) > 0.001 ||
    Math.abs(settings.contrast) > 0.001 ||
    Math.abs(settings.saturation) > 0.001 ||
    Math.abs(settings.temperature) > 0.001 ||
    Math.abs(settings.channelRed - 1) > 0.001 ||
    Math.abs(settings.channelGreen - 1) > 0.001 ||
    Math.abs(settings.channelBlue - 1) > 0.001
  );
}

function mixHexColors(source: string, target: string, amount: number) {
  const sourceRgb = hexToRgb(source);
  const targetRgb = hexToRgb(target);

  return rgbToHex({
    r: Math.round(sourceRgb.r + (targetRgb.r - sourceRgb.r) * amount),
    g: Math.round(sourceRgb.g + (targetRgb.g - sourceRgb.g) * amount),
    b: Math.round(sourceRgb.b + (targetRgb.b - sourceRgb.b) * amount)
  });
}

function hexToRgb(value: string) {
  const hex = normalizeColorValue(value).replace("#", "");

  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function applyColorAdjustmentsToHex(
  value: string,
  settings: ColorAdjustmentSettings
) {
  return rgbToHex(applyColorAdjustmentsToRgb(hexToRgb(value), settings));
}

function applyColorAdjustmentsToRgb(
  color: { b: number; g: number; r: number },
  settings: ColorAdjustmentSettings
) {
  const exposureOffset = settings.exposure * 72;
  const contrastFactor = 1 + settings.contrast * 1.25;
  const saturationFactor = 1 + settings.saturation * 1.35;
  const warmShift = settings.temperature * 34;
  let r = color.r + exposureOffset + warmShift;
  let g = color.g + exposureOffset + warmShift * 0.12;
  let b = color.b + exposureOffset - warmShift;

  r = (r - 128) * contrastFactor + 128;
  g = (g - 128) * contrastFactor + 128;
  b = (b - 128) * contrastFactor + 128;

  const luminance = r * 0.2126 + g * 0.7152 + b * 0.0722;

  r = luminance + (r - luminance) * saturationFactor;
  g = luminance + (g - luminance) * saturationFactor;
  b = luminance + (b - luminance) * saturationFactor;

  return {
    b: clampColorChannel(b * settings.channelBlue),
    g: clampColorChannel(g * settings.channelGreen),
    r: clampColorChannel(r * settings.channelRed)
  };
}

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((channel) => Math.min(Math.max(channel, 0), 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function createSvgTexturePattern(texture: TexturePreset) {
  const tileSize = texture.scale ?? 128;
  const elements =
    texture.kind === "filmGrain"
      ? createFilmGrainSvgElements(texture, tileSize)
      : createVectorTextureSvgElements(texture, tileSize);
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${tileSize}" height="${tileSize}" viewBox="0 0 ${tileSize} ${tileSize}">${elements.join("")}</svg>`;
  const image = new Image();
  image.decoding = "async";
  image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

  if (typeof image.decode === "function") {
    await image.decode();
  } else {
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("Could not load SVG texture"));
    });
  }

  return new Pattern({
    source: image,
    repeat: "repeat"
  });
}

function createFilmGrainSvgElements(texture: TexturePreset, tileSize: number) {
  const random = createSeededRandom(texture.id);
  const grainCount = Math.round(tileSize * tileSize * (texture.intensity ?? 0.2) * 0.24);
  const elements: string[] = [
    `<rect width="100%" height="100%" fill="${texture.background}" />`
  ];

  for (let index = 0; index < grainCount; index += 1) {
    const x = random() * tileSize;
    const y = random() * tileSize;
    const radiusX = 0.28 + random() * 1.35;
    const radiusY = 0.18 + random() * 0.95;
    const opacity = 0.14 + random() * 0.34;
    const color =
      index % 7 === 0 ? texture.accent ?? texture.foreground : texture.foreground;

    elements.push(
      `<ellipse cx="${x.toFixed(2)}" cy="${y.toFixed(2)}" rx="${radiusX.toFixed(2)}" ry="${radiusY.toFixed(2)}" fill="${color}" opacity="${opacity.toFixed(2)}" />`
    );
  }

  return elements;
}

function createVectorTextureSvgElements(texture: TexturePreset, tileSize: number) {
  const accent = texture.accent ?? texture.foreground;
  const elements = [
    `<rect width="100%" height="100%" fill="${texture.background}" />`
  ];

  if (texture.kind === "bauhausBlocks") {
    elements.push(
      `<rect x="0" y="0" width="${tileSize * 0.28}" height="${tileSize}" fill="${texture.foreground}" />`,
      `<circle cx="${tileSize * 0.72}" cy="${tileSize * 0.28}" r="${tileSize * 0.17}" fill="${accent}" />`,
      `<rect x="${tileSize * 0.48}" y="${tileSize * 0.62}" width="${tileSize * 0.46}" height="${tileSize * 0.24}" fill="#F0B800" />`,
      `<polygon points="${tileSize * 0.34},${tileSize * 0.18} ${tileSize * 0.92},${tileSize * 0.18} ${tileSize * 0.62},${tileSize * 0.56}" fill="#101010" />`,
      `<path d="M${tileSize * 0.36} ${tileSize * 0.92} C ${tileSize * 0.52} ${tileSize * 0.62}, ${tileSize * 0.78} ${tileSize * 0.62}, ${tileSize * 0.94} ${tileSize * 0.92}" fill="none" stroke="${accent}" stroke-width="${tileSize * 0.06}" stroke-linecap="square" />`
    );
  }

  if (texture.kind === "bauhausWeave") {
    const stroke = Math.max(4, tileSize * 0.065);

    elements.push(
      `<rect x="${tileSize * 0.08}" y="${tileSize * 0.08}" width="${tileSize * 0.34}" height="${tileSize * 0.34}" fill="${texture.foreground}" />`,
      `<circle cx="${tileSize * 0.74}" cy="${tileSize * 0.25}" r="${tileSize * 0.19}" fill="${accent}" />`,
      `<path d="M${tileSize * 0.1} ${tileSize * 0.7} H ${tileSize * 0.44} A ${tileSize * 0.17} ${tileSize * 0.17} 0 0 1 ${tileSize * 0.44} ${tileSize * 0.36}" fill="none" stroke="#101010" stroke-width="${stroke}" stroke-linecap="square" />`,
      `<path d="M${tileSize * 0.56} ${tileSize * 0.92} V ${tileSize * 0.58} A ${tileSize * 0.18} ${tileSize * 0.18} 0 0 1 ${tileSize * 0.92} ${tileSize * 0.58}" fill="none" stroke="${texture.foreground}" stroke-width="${stroke}" stroke-linecap="square" />`,
      `<polygon points="${tileSize * 0.52},${tileSize * 0.1} ${tileSize * 0.92},${tileSize * 0.1} ${tileSize * 0.72},${tileSize * 0.44}" fill="#F0B800" opacity="0.92" />`
    );
  }

  if (texture.kind === "bendayDots") {
    const step = tileSize / 4;

    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const radius = step * (0.18 + ((row + column) % 3) * 0.07);
        const color = (row + column) % 4 === 0 ? accent : texture.foreground;

        elements.push(
          `<circle cx="${step * (column + 0.5)}" cy="${step * (row + 0.5)}" r="${radius}" fill="${color}" />`
        );
      }
    }
  }

  if (texture.kind === "popHalftone") {
    const step = tileSize / 5;

    for (let row = 0; row < 5; row += 1) {
      for (let column = 0; column < 5; column += 1) {
        const diagonal = (row + column) / 8;
        const radius = step * (0.12 + diagonal * 0.24);
        const color = column % 2 === 0 ? texture.foreground : accent;

        elements.push(
          `<circle cx="${step * (column + 0.5)}" cy="${step * (row + 0.5)}" r="${radius}" fill="${color}" opacity="${(0.72 + diagonal * 0.22).toFixed(2)}" />`
        );
      }
    }

    elements.push(
      `<path d="M0 ${tileSize * 0.82} C ${tileSize * 0.26} ${tileSize * 0.68}, ${tileSize * 0.68} ${tileSize * 0.98}, ${tileSize} ${tileSize * 0.74}" fill="none" stroke="#101010" stroke-width="${Math.max(2, tileSize * 0.035)}" />`
    );
  }

  if (texture.kind === "serigraphyBars") {
    const barWidth = tileSize * 0.075;

    for (let index = 0; index < 9; index += 1) {
      const x = index * tileSize * 0.12;

      elements.push(
        `<rect x="${x}" y="0" width="${barWidth}" height="${tileSize}" fill="${texture.foreground}" />`
      );
    }

    elements.push(
      `<g transform="translate(${tileSize * 0.06} 0)" opacity="0.82"><rect x="0" y="${tileSize * 0.16}" width="${tileSize}" height="${tileSize * 0.08}" fill="${accent}" /><rect x="0" y="${tileSize * 0.72}" width="${tileSize}" height="${tileSize * 0.08}" fill="${accent}" /></g>`,
      `<path d="M0 ${tileSize * 0.44} C ${tileSize * 0.24} ${tileSize * 0.34}, ${tileSize * 0.48} ${tileSize * 0.54}, ${tileSize * 0.72} ${tileSize * 0.44} S ${tileSize * 1.12} ${tileSize * 0.48}, ${tileSize} ${tileSize * 0.44}" fill="none" stroke="#101010" stroke-width="${Math.max(2, tileSize * 0.045)}" opacity="0.72" />`
    );
  }

  if (texture.kind === "serigraphyScreen") {
    const lineWidth = Math.max(2, tileSize * 0.035);

    for (let index = -2; index < 8; index += 1) {
      const offset = index * tileSize * 0.18;

      elements.push(
        `<path d="M${offset} 0 L${offset + tileSize * 0.72} ${tileSize}" stroke="${texture.foreground}" stroke-width="${lineWidth}" opacity="0.84" />`,
        `<path d="M${offset + tileSize * 0.1} 0 L${offset + tileSize * 0.82} ${tileSize}" stroke="${accent}" stroke-width="${lineWidth}" opacity="0.48" />`
      );
    }

    elements.push(
      `<circle cx="${tileSize * 0.26}" cy="${tileSize * 0.28}" r="${tileSize * 0.18}" fill="none" stroke="#101010" stroke-width="${lineWidth * 1.1}" />`,
      `<circle cx="${tileSize * 0.72}" cy="${tileSize * 0.72}" r="${tileSize * 0.16}" fill="none" stroke="${accent}" stroke-width="${lineWidth * 1.25}" />`
    );
  }

  if (texture.kind === "opArtWaves") {
    for (let index = -1; index < 5; index += 1) {
      const y = index * tileSize * 0.25;

      elements.push(
        `<path d="M0 ${y} C ${tileSize * 0.24} ${y + tileSize * 0.32}, ${tileSize * 0.72} ${y - tileSize * 0.18}, ${tileSize} ${y + tileSize * 0.1}" fill="none" stroke="${texture.foreground}" stroke-width="${Math.max(2, tileSize * 0.055)}" stroke-linecap="round" />`
      );
    }
  }

  if (texture.kind === "popBurst") {
    const center = tileSize / 2;
    const rays = 16;

    for (let index = 0; index < rays; index += 1) {
      const angle = (index / rays) * Math.PI * 2;
      const nextAngle = ((index + 0.5) / rays) * Math.PI * 2;
      const outerRadius = tileSize * 0.72;
      const innerRadius = tileSize * 0.14;
      const color = index % 2 === 0 ? texture.foreground : accent;
      const points = [
        `${center},${center}`,
        `${center + Math.cos(angle) * innerRadius},${center + Math.sin(angle) * innerRadius}`,
        `${center + Math.cos(nextAngle) * outerRadius},${center + Math.sin(nextAngle) * outerRadius}`
      ].join(" ");

      elements.push(`<polygon points="${points}" fill="${color}" opacity="0.88" />`);
    }

    elements.push(`<circle cx="${center}" cy="${center}" r="${tileSize * 0.12}" fill="${texture.background}" />`);
  }

  return elements;
}

function createTexturePattern(texture: TexturePreset) {
  const patternCanvas = document.createElement("canvas");
  const tileSize = texture.scale ?? 32;
  patternCanvas.width = tileSize;
  patternCanvas.height = tileSize;
  const context = patternCanvas.getContext("2d");

  if (!context) {
    return texture.background;
  }

  context.fillStyle = texture.background;
  context.fillRect(0, 0, tileSize, tileSize);
  context.fillStyle = texture.foreground;
  context.strokeStyle = texture.foreground;
  context.lineWidth = 4;

  if (texture.kind === "stripes") {
    context.lineWidth = Math.max(3, tileSize * 0.12);
    context.beginPath();
    context.moveTo(-tileSize * 0.25, tileSize);
    context.lineTo(tileSize, -tileSize * 0.25);
    context.moveTo(tileSize * 0.25, tileSize * 1.25);
    context.lineTo(tileSize * 1.25, tileSize * 0.25);
    context.stroke();
  }

  if (texture.kind === "dots") {
    const dotRadius = Math.max(2, tileSize * 0.1);
    context.beginPath();
    context.arc(tileSize * 0.25, tileSize * 0.25, dotRadius, 0, Math.PI * 2);
    context.arc(tileSize * 0.75, tileSize * 0.75, dotRadius, 0, Math.PI * 2);
    context.fill();
  }

  if (texture.kind === "checker") {
    const halfTile = tileSize / 2;
    context.fillRect(0, 0, halfTile, halfTile);
    context.fillRect(halfTile, halfTile, halfTile, halfTile);
  }

  if (texture.kind === "grid") {
    context.lineWidth = Math.max(1, tileSize * 0.06);
    context.beginPath();
    context.moveTo(0, tileSize * 0.25);
    context.lineTo(tileSize, tileSize * 0.25);
    context.moveTo(0, tileSize * 0.75);
    context.lineTo(tileSize, tileSize * 0.75);
    context.moveTo(tileSize * 0.25, 0);
    context.lineTo(tileSize * 0.25, tileSize);
    context.moveTo(tileSize * 0.75, 0);
    context.lineTo(tileSize * 0.75, tileSize);
    context.stroke();
  }

  if (texture.kind === "crosshatch") {
    context.lineWidth = Math.max(2, tileSize * 0.09);
    context.beginPath();
    context.moveTo(-tileSize * 0.25, tileSize);
    context.lineTo(tileSize, -tileSize * 0.25);
    context.moveTo(tileSize * 0.25, tileSize * 1.25);
    context.lineTo(tileSize * 1.25, tileSize * 0.25);
    context.moveTo(-tileSize * 0.25, 0);
    context.lineTo(tileSize, tileSize * 1.25);
    context.moveTo(tileSize * 0.25, -tileSize * 0.25);
    context.lineTo(tileSize * 1.25, tileSize * 0.75);
    context.stroke();
  }

  if (texture.kind === "fineLines") {
    context.lineWidth = 1.25;
    context.beginPath();
    for (let x = 0; x <= tileSize; x += tileSize / 4) {
      context.moveTo(x, 0);
      context.lineTo(x, tileSize);
    }
    context.stroke();
  }

  if (texture.kind === "diagonalGrid") {
    context.lineWidth = Math.max(1.5, tileSize * 0.045);
    context.beginPath();
    for (let step = -tileSize; step <= tileSize; step += tileSize / 2) {
      context.moveTo(step, tileSize);
      context.lineTo(step + tileSize, 0);
      context.moveTo(step, 0);
      context.lineTo(step + tileSize, tileSize);
    }
    context.stroke();
  }

  if (texture.kind === "waves") {
    context.lineWidth = Math.max(2, tileSize * 0.07);
    context.beginPath();
    for (let y = tileSize * 0.18; y < tileSize; y += tileSize * 0.32) {
      context.moveTo(0, y);
      for (let x = 0; x <= tileSize; x += tileSize / 4) {
        context.quadraticCurveTo(x + tileSize / 8, y + tileSize * 0.16, x + tileSize / 4, y);
      }
    }
    context.stroke();
  }

  if (texture.kind === "halftone") {
    for (let row = 0; row < 4; row += 1) {
      for (let column = 0; column < 4; column += 1) {
        const radius = ((row + column + 1) / 8) * (tileSize / 7);
        context.beginPath();
        context.arc(
          tileSize * (0.125 + column * 0.25),
          tileSize * (0.125 + row * 0.25),
          radius,
          0,
          Math.PI * 2
        );
        context.fill();
      }
    }
  }

  if (texture.kind === "rings") {
    context.lineWidth = Math.max(2, tileSize * 0.07);
    [0.18, 0.34, 0.5].forEach((radiusRatio) => {
      context.beginPath();
      context.arc(tileSize / 2, tileSize / 2, tileSize * radiusRatio, 0, Math.PI * 2);
      context.stroke();
    });
  }

  if (texture.kind === "zigzag") {
    context.lineWidth = Math.max(3, tileSize * 0.1);
    context.beginPath();
    for (let y = tileSize * 0.2; y <= tileSize; y += tileSize * 0.4) {
      context.moveTo(0, y);
      for (let x = 0; x <= tileSize; x += tileSize / 4) {
        context.lineTo(x + tileSize / 8, y + tileSize * 0.18);
        context.lineTo(x + tileSize / 4, y);
      }
    }
    context.stroke();
  }

  if (texture.kind === "confetti") {
    const accent = texture.accent ?? texture.foreground;
    const random = createSeededRandom(texture.id);

    for (let index = 0; index < 18; index += 1) {
      context.fillStyle = index % 3 === 0 ? accent : texture.foreground;
      context.save();
      context.translate(random() * tileSize, random() * tileSize);
      context.rotate(random() * Math.PI);
      context.fillRect(-tileSize * 0.04, -tileSize * 0.12, tileSize * 0.08, tileSize * 0.24);
      context.restore();
    }
  }

  if (texture.kind === "grain" || texture.kind === "noise" || texture.kind === "speckle" || texture.kind === "paper") {
    drawNoiseTexture(context, texture, tileSize);
  }

  return new Pattern({
    source: patternCanvas,
    repeat: "repeat"
  });
}

function drawNoiseTexture(
  context: CanvasRenderingContext2D,
  texture: TexturePreset,
  tileSize: number
) {
  const random = createSeededRandom(texture.id);
  const intensity = texture.intensity ?? 0.15;
  const speckles = Math.round(tileSize * tileSize * intensity);

  context.globalAlpha = texture.kind === "noise" ? 0.22 : 0.18;

  for (let index = 0; index < speckles; index += 1) {
    const x = random() * tileSize;
    const y = random() * tileSize;
    const radius =
      texture.kind === "speckle" ? 0.8 + random() * 2.2 : 0.45 + random() * 1.1;

    context.fillStyle =
      texture.kind === "paper" && index % 5 === 0
        ? texture.accent ?? texture.foreground
        : texture.foreground;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  if (texture.kind === "paper") {
    context.globalAlpha = 0.08;
    context.strokeStyle = texture.foreground;
    context.lineWidth = 1;
    for (let index = 0; index < 18; index += 1) {
      const y = random() * tileSize;
      context.beginPath();
      context.moveTo(0, y);
      context.bezierCurveTo(
        tileSize * 0.25,
        y + random() * 8 - 4,
        tileSize * 0.75,
        y + random() * 8 - 4,
        tileSize,
        y + random() * 8 - 4
      );
      context.stroke();
    }
  }

  context.globalAlpha = 1;
}

function createSeededRandom(seed: string) {
  let value = 2166136261;

  for (let index = 0; index < seed.length; index += 1) {
    value ^= seed.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }

  return () => {
    value += 0x6d2b79f5;
    let next = value;
    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);
    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
}

function syncSelectedObjectProperties(object?: FabricObject | null) {
  if (!object) {
    useEditorStore.getState().setSelectedObjectProperties(null);
    return;
  }

  const paintTarget = getPaintTarget(object);
  const colorAdjustments = normalizeColorAdjustments(
    object.get(colorAdjustmentsName) ?? paintTarget.get(colorAdjustmentsName)
  );
  const baseFill = paintTarget.get(colorBaseFillName);
  const baseStroke = paintTarget.get(colorBaseStrokeName);
  const fill = normalizeColorValue(
    String(
      hasColorAdjustments(colorAdjustments) && typeof baseFill === "string"
        ? baseFill
        : paintTarget.get("fill") ?? "#101010"
    )
  );
  const stroke = normalizeColorValue(
    String(
      hasColorAdjustments(colorAdjustments) && typeof baseStroke === "string"
        ? baseStroke
        : paintTarget.get("stroke") ?? "#101010"
    )
  );
  const strokeWidth = Number(paintTarget.get("strokeWidth") ?? 0);
  const shapeKind = getShapeKindForObject(object);
  const readsPaintFromStroke =
    (isLineObjectType(shapeKind) || isFreehandObjectType(shapeKind)) &&
    !isPressureStrokeObject(paintTarget);
  const lineWidths = getLineWidthsForObject(object);
  const textFontFamily = normalizeTextFontFamily(paintTarget.get("fontFamily"));

  useEditorStore.getState().setSelectedObjectProperties({
    fill:
      Number(object.get(shadeLevelName) ?? paintTarget.get(shadeLevelName) ?? 0) > 0
        ? getShadeBaseColor(paintTarget)
        : readsPaintFromStroke
          ? stroke
          : fill,
    stroke,
    strokeWidth,
    opacity: Number(object.opacity ?? 1),
    blendMode: normalizeBlendMode(object.globalCompositeOperation),
    shadowPreset: normalizeShadowPreset(object.get(shadowPresetName)),
    shadeLevel: Number(
      object.get(shadeLevelName) ?? paintTarget.get(shadeLevelName) ?? 0
    ),
    colorAdjustments,
    lineCurvature: getLineCurvatureForObject(object),
    lineStartWidth: lineWidths.startWidth,
    lineEndWidth: lineWidths.endWidth,
    fontFamily: textFontFamily,
    x: Math.round(object.left ?? 0),
    y: Math.round(object.top ?? 0),
    width: Math.round(object.getScaledWidth()),
    height: Math.round(object.getScaledHeight())
  });
}

function applyPropertiesToObject(
  object: FabricObject,
  properties: Partial<SelectedObjectProperties>
) {
  const paintTargets = getPaintTargets(object);

  if (properties.fill) {
    applyFillToObject(object, properties.fill);
  }

  if (properties.stroke) {
    paintTargets.forEach((target) => target.set({ stroke: properties.stroke }));
  }

  if (typeof properties.strokeWidth === "number") {
    paintTargets.forEach((target) =>
      target.set({ strokeWidth: properties.strokeWidth })
    );
  }

  if (properties.fontFamily) {
    const fontFamily = normalizeTextFontFamily(properties.fontFamily);

    object.set({
      fontFamily,
      fontWeight: getTextFontWeight(fontFamily)
    });
  }

  if (typeof properties.lineCurvature === "number") {
    updateLineCurvatureForObject(object, properties.lineCurvature);
  }

  if (typeof properties.shadeLevel === "number") {
    applyShadeLevelToObject(object, properties.shadeLevel);
  }

  if (properties.colorAdjustments) {
    applyColorAdjustmentsToObject(object, properties.colorAdjustments);
  }

  if (
    typeof properties.lineStartWidth === "number" ||
    typeof properties.lineEndWidth === "number"
  ) {
    const currentWidths = getLineWidthsForObject(object);
    updateLineWidthsForObject(
      object,
      properties.lineStartWidth ?? currentWidths.startWidth,
      properties.lineEndWidth ?? currentWidths.endWidth
    );
  }

  object.set({
    left: properties.x ?? object.left,
    top: properties.y ?? object.top,
    opacity: properties.opacity ?? object.opacity,
    globalCompositeOperation:
      properties.blendMode ?? object.globalCompositeOperation
  });

  if (properties.shadowPreset) {
    applyShadowPreset(object, properties.shadowPreset);
  }

  if (properties.width && object.width) {
    object.scaleX = properties.width / object.width;
  }

  if (properties.height && object.height) {
    object.scaleY = properties.height / object.height;
  }

  object.setCoords();
  object.dirty = true;
}

function normalizeBlendMode(value: unknown): BlendMode {
  const supportedBlendModes: BlendMode[] = [
    "source-over",
    "multiply",
    "screen",
    "overlay",
    "darken",
    "lighten",
    "color-burn",
    "difference",
    "exclusion"
  ];

  return supportedBlendModes.includes(value as BlendMode)
    ? (value as BlendMode)
    : "source-over";
}

function normalizeShadowPreset(value: unknown): SelectedObjectProperties["shadowPreset"] {
  return value === "hard" || value === "soft" || value === "long" ? value : "none";
}

function applyShadowPreset(
  object: FabricObject,
  preset: SelectedObjectProperties["shadowPreset"]
) {
  object.set(shadowPresetName, preset);

  if (preset === "none") {
    object.set({ shadow: null });
    return;
  }

  const shadowOptions =
    preset === "hard"
      ? { color: "rgba(16,16,16,0.75)", blur: 0, offsetX: 8, offsetY: 8 }
      : preset === "long"
        ? { color: "rgba(16,16,16,0.55)", blur: 0, offsetX: 18, offsetY: 18 }
        : { color: "rgba(16,16,16,0.35)", blur: 18, offsetX: 8, offsetY: 10 };

  object.set({
    shadow: new Shadow(shadowOptions)
  });
}

function applyViewportAction(
  canvas: ReturnType<typeof createFabricCanvas>,
  action: "zoom-in" | "zoom-out" | "fit" | "center"
) {
  if (action === "fit" || action === "center") {
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    canvas.requestRenderAll();
    return;
  }

  const zoom = canvas.getZoom();
  const nextZoom =
    action === "zoom-in"
      ? Math.min(zoom * 1.2, 4)
      : Math.max(zoom / 1.2, 0.25);

  canvas.zoomToPoint(
    new Point(canvas.getWidth() / 2, canvas.getHeight() / 2),
    nextZoom
  );
  canvas.requestRenderAll();
}

function getPaintTarget(object: FabricObject) {
  return getPaintTargets(object)[0] ?? object;
}

function showEditingOutline(object?: FabricObject | null) {
  if (!object) {
    return;
  }

  getPaintTargets(object).forEach((target) => {
    if (!editingOutlineState.has(target)) {
      editingOutlineState.set(target, {
        stroke: target.get("stroke"),
        strokeWidth: target.get("strokeWidth")
      });
    }

    target.set({
      stroke: editingOutlineStroke,
      strokeWidth: Math.max(Number(target.get("strokeWidth") ?? 0), editingOutlineWidth)
    });
  });

  object.dirty = true;
}

function hideEditingOutline(object?: FabricObject | null) {
  if (!object) {
    return;
  }

  getPaintTargets(object).forEach((target) => {
    const previousState = editingOutlineState.get(target);

    if (!previousState) {
      return;
    }

    target.set({
      stroke: previousState.stroke,
      strokeWidth: previousState.strokeWidth
    });
    editingOutlineState.delete(target);
  });

  object.dirty = true;
  object.setCoords();
}

function getPaintTargets(object: FabricObject) {
  if (object instanceof Group) {
    return object
      .getObjects()
      .filter((child): child is FabricObject => !(child instanceof Line));
  }

  return [object];
}

function normalizeColorValue(value: string) {
  return /^#[0-9a-f]{6}$/i.test(value) ? value : "#101010";
}

function getEventClientPoint(event: MouseEvent | TouchEvent | PointerEvent) {
  if ("touches" in event && event.touches[0]) {
    return {
      x: event.touches[0].clientX,
      y: event.touches[0].clientY
    };
  }

  if ("changedTouches" in event && event.changedTouches[0]) {
    return {
      x: event.changedTouches[0].clientX,
      y: event.changedTouches[0].clientY
    };
  }

  if ("clientX" in event) {
    return {
      x: event.clientX,
      y: event.clientY
    };
  }

  return { x: 0, y: 0 };
}

function isEditableKeyboardTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  return (
    target.isContentEditable ||
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement
  );
}

function isDimensionModalOpen() {
  return Boolean(document.querySelector("[data-dimension-modal='true']"));
}

function applyLayerState(
  object: FabricObject,
  summary: { name: string; visible: boolean; locked: boolean }
) {
  const canInteract = summary.visible && !summary.locked;
  const isPassThroughMask = object.get("neoform-shape-kind") === "inverseSelection";

  object.set({
    name: summary.name,
    visible: summary.visible,
    selectable: isPassThroughMask ? false : canInteract,
    evented: isPassThroughMask ? false : canInteract,
    hasControls: isPassThroughMask ? false : canInteract,
    lockMovementX: summary.locked,
    lockMovementY: summary.locked,
    lockScalingX: summary.locked,
    lockScalingY: summary.locked,
    lockRotation: summary.locked
  });
}

function syncInverseSelectionMaskInteractivity(
  canvas: ReturnType<typeof createFabricCanvas>,
  selectedIds: string[] = []
) {
  const selectedIdSet = new Set(selectedIds);

  canvas.getObjects().forEach((object) => {
    if (!isInverseSelectionMask(object)) {
      return;
    }

    const objectId = String(object.get("id") ?? "");
    const isLocked =
      object.lockMovementX === true ||
      object.lockMovementY === true ||
      object.lockScalingX === true ||
      object.lockScalingY === true ||
      object.lockRotation === true;
    const canEdit =
      selectedIdSet.has(objectId) &&
      object.visible !== false &&
      !isLocked;

    object.set({
      evented: canEdit,
      hasControls: canEdit,
      hoverCursor: canEdit ? "move" : "default",
      selectable: canEdit
    });
  });
}

function isInverseSelectionMask(object: FabricObject) {
  return object.get("neoform-shape-kind") === "inverseSelection";
}
