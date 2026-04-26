import { useEffect, useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import {
  Gradient,
  Group,
  Line,
  Pattern,
  PencilBrush,
  Point,
  Polygon,
  Shadow,
  util
} from "fabric";
import type { FabricObject, TPointerEventInfo } from "fabric";
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
import {
  createFabricCanvas,
  disposeFabricCanvas,
  resizeFabricCanvas
} from "./fabricCanvas";
import { CanvasGuides } from "./CanvasGuides";
import type {
  CanvasObjectType,
  CanvasObjectSummary,
  BlendMode,
  CanvasCursorStyle,
  CanvasFinishSettings,
  ColorMode,
  EditorTool,
  SavedProject,
  SelectedObjectProperties,
  TextFontFamily
} from "../types/editor";
import type { CompositionPreset, TexturePreset } from "../types/library";
import { getTextFontWeight, normalizeTextFontFamily } from "../utils/textFonts";

type FabricPaint = string | Pattern | Gradient<"linear"> | Gradient<"radial">;

type DimensionUnit = "px" | "cm" | "mm";

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

const editingOutlineStroke = "#101010";
const editingOutlineWidth = 2;
const editingOutlineState = new WeakMap<
  FabricObject,
  { stroke: unknown; strokeWidth: unknown }
>();
const shadowPresetName = "neoform-shadow-preset";
const shadeLevelName = "neoform-shade-level";
const shadeBaseColorName = "neoform-shade-base";
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
  shadowPresetName,
  shadeLevelName,
  shadeBaseColorName
];
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

export function CanvasEditor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lastMotionCursorPointRef = useRef<{ x: number; y: number } | null>(null);
  const [viewportZoom, setViewportZoom] = useState(1);
  const [dimensionUnit, setDimensionUnit] = useState<"cm" | "mm">("cm");
  const [dimensionEditor, setDimensionEditor] =
    useState<DimensionEditorState | null>(null);
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
    ? getArtboardDimensionLabels(activeArtboard, dimensionUnit)
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

      const widthPx = dimensionValueToPixels(Number(editor.width), editor.unit);
      const heightPx = dimensionValueToPixels(Number(editor.height), editor.unit);

      return {
        ...editor,
        unit,
        width: Number.isFinite(widthPx)
          ? formatDimensionInput(pixelsToDimensionValue(widthPx, unit), unit)
          : "",
        height: Number.isFinite(heightPx)
          ? formatDimensionInput(pixelsToDimensionValue(heightPx, unit), unit)
          : ""
      };
    });
  };
  const applyDimensionEditor = () => {
    if (!dimensionEditor) {
      return;
    }

    const width = clampArtboardPixels(
      dimensionValueToPixels(Number(dimensionEditor.width), dimensionEditor.unit)
    );
    const height = clampArtboardPixels(
      dimensionValueToPixels(Number(dimensionEditor.height), dimensionEditor.unit)
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
      const target =
        (event.target as FabricObject | undefined) ?? canvas.getActiveObject();

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

    const finishVectorCut = (event: TPointerEventInfo) => {
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

      const target =
        initialTarget && doesVectorCutIntersectObject(initialTarget, start, end)
          ? initialTarget
          : findVectorCutTarget(canvas.getObjects(), start, end);

      if (!target) {
        canvas.requestRenderAll();
        return true;
      }

      const cutPieces = createVectorCutPieces(target, start, end);

      if (cutPieces.length !== 2) {
        canvas.setActiveObject(target);
        canvas.requestRenderAll();
        return true;
      }

      const state = useEditorStore.getState();
      const oldId = String(target.get("id") ?? "");
      const oldSummary = state.canvasObjects.find((object) => object.id === oldId);
      const pieceType = getVectorCutPieceType(target);
      const currentObjects = state.canvasObjects.filter(
        (object) => object.artboardId === currentArtboardId
      );
      const insertionIndex = Math.max(
        0,
        currentObjects.findIndex((object) => object.id === oldId)
      );
      const baseName = oldSummary?.name ?? String(target.get("name") ?? "Cut");
      const summaries = cutPieces.map((piece, index) => ({
        artboardId: currentArtboardId,
        id: crypto.randomUUID(),
        locked: oldSummary?.locked ?? false,
        name: `${baseName} Piece ${index + 1}`,
        type: pieceType,
        visible: oldSummary?.visible ?? true
      }));
      const nextObjects = [
        ...currentObjects.slice(0, insertionIndex),
        ...summaries,
        ...currentObjects
          .slice(insertionIndex + (oldSummary ? 1 : 0))
          .filter((object) => object.id !== oldId)
      ];

      canvas.remove(target);
      cutPieces.forEach((piece, index) => {
        const summary = summaries[index];

        piece.set({
          id: summary.id,
          name: summary.name
        });
        piece.set("neoform-shape-kind", summary.type);
        applyLayerState(piece, summary);
        canvas.add(piece);
      });

      useEditorStore
        .getState()
        .replaceCanvasObjectsForArtboard(currentArtboardId, nextObjects);
      canvas.setActiveObject(cutPieces[0]);
      useEditorStore.getState().setSelectedObjectId(summaries[0].id);
      syncSelectedObjectProperties(cutPieces[0]);
      refreshLineEditOverlay(cutPieces[0]);
      canvas.requestRenderAll();
      saveCurrentSnapshot();
      pushHistory();
      return true;
    };

    const handleCanvasClick = (event: TPointerEventInfo) => {
      const tool = useEditorStore.getState().activeTool;

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
      if (updateVectorCut(event)) {
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
    canvas.on("mouse:up", (event) => {
      if (finishVectorCut(event)) {
        return;
      }

      isPanning = false;
      canvas.selection = true;
      applyFabricCanvasCursor(
        canvas,
        useEditorStore.getState().activeTool,
        useEditorStore.getState().cursorStyle
      );
    });
    canvas.on("selection:created", (event) => {
      const selected = event.selected?.[0];
      useEditorStore.getState().setSelectedObjectId(String(selected?.get("id") ?? ""));
      syncSelectedObjectProperties(selected);
      refreshLineEditOverlay(selected);
    });
    canvas.on("selection:updated", (event) => {
      const selected = event.selected?.[0];
      useEditorStore.getState().setSelectedObjectId(String(selected?.get("id") ?? ""));
      syncSelectedObjectProperties(selected);
      refreshLineEditOverlay(selected);
    });
    canvas.on("selection:cleared", () => {
      useEditorStore.getState().setSelectedObjectId(null);
      useEditorStore.getState().setSelectedObjectProperties(null);
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

        if (!state.selectionRequest?.objectId) {
          canvas.discardActiveObject();
          refreshLineEditOverlay(null);
          canvas.requestRenderAll();
          return;
        }

        const object = canvas
          .getObjects()
          .find((item) => item.get("id") === state.selectionRequest?.objectId);

        if (!object) {
          return;
        }

        canvas.setActiveObject(object);
        syncSelectedObjectProperties(object);
        refreshLineEditOverlay(object);
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

        const object = canvas
          .getObjects()
          .find((item) => item.get("id") === request.objectId);

        if (!object) {
          return;
        }

        if (request.action === "delete") {
          canvas.remove(object);
          canvas.discardActiveObject();
          refreshLineEditOverlay(null);
          canvas.requestRenderAll();
          saveCurrentSnapshot();
          pushHistory();
          return;
        }

        if (request.action === "move-up") {
          canvas.bringObjectForward(object);
        }

        if (request.action === "move-down") {
          canvas.sendObjectBackwards(object);
        }

        const summary = state.canvasObjects.find(
          (item) => item.id === request.objectId
        );

        if (summary) {
          applyLayerState(object, summary);
        }

        if (
          summary &&
          (!summary.visible || summary.locked) &&
          canvas.getActiveObject()?.get("id") === request.objectId
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

        saveSelectionAsComposition(canvas);
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

        if (state.exportRequest.format === "svg") {
          exportCanvasAsSvg(canvas);
        }

        if (state.exportRequest.format === "all-png") {
          saveCurrentSnapshot();
          void exportAllArtboardsAsPng(canvas, currentArtboardId, loadArtboardSnapshot);
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
            <button
              type="button"
              onClick={() =>
                setFinishSettings({
                  filmGrainEnabled: !finishSettings.filmGrainEnabled
                })
              }
              className={clsx(
                "border-2 border-ink px-1.5 py-0.5 transition hover:-translate-y-0.5",
                finishSettings.filmGrainEnabled
                  ? "bg-ink text-paper"
                  : "bg-paper"
              )}
              title="Activar acabado global de grano analógico"
              data-tour="film-grain"
            >
              Grain{" "}
              {finishSettings.filmGrainEnabled
                ? `${Math.round(finishSettings.filmGrainAmount * 100)}%`
                : "Off"}
            </button>
            {finishSettings.filmGrainEnabled ? (
              <>
                <label className="flex items-center gap-1 border-2 border-ink bg-paper px-1 py-0.5">
                  Size
                  <input
                    type="range"
                    min={0.15}
                    max={1}
                    step={0.05}
                    value={finishSettings.filmGrainRoughness}
                    onChange={(event) =>
                      setFinishSettings({
                        filmGrainRoughness: Number(event.currentTarget.value)
                      })
                    }
                    className="h-3 w-16 accent-ink"
                  />
                </label>
                <label className="flex items-center gap-1 border-2 border-ink bg-paper px-1 py-0.5">
                  Amount
                  <input
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={finishSettings.filmGrainAmount}
                    onChange={(event) =>
                      setFinishSettings({
                        filmGrainAmount: Number(event.currentTarget.value)
                      })
                    }
                    className="h-3 w-16 accent-ink"
                  />
                </label>
              </>
            ) : null}
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
            style={{ cursor: getCanvasCursor(activeTool, cursorStyle, colorMode) }}
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
                  300 DPI reference for cm/mm
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

async function exportCanvasAsPng(
  canvas: ReturnType<typeof createFabricCanvas>,
  artboardOverride?: { name: string; width: number; height: number }
) {
  const state = useEditorStore.getState();
  const artboard =
    artboardOverride ??
    state.artboards.find((item) => item.id === state.activeArtboardId);
  const widthMultiplier = artboard ? artboard.width / canvas.getWidth() : 1;
  const heightMultiplier = artboard ? artboard.height / canvas.getHeight() : 1;
  const multiplier = Math.max(1, Math.min(widthMultiplier, heightMultiplier, 4));
  let dataUrl = canvas.toDataURL({
    format: "png",
    multiplier,
    enableRetinaScaling: false
  });
  const finishSettings = state.finishSettings;

  if (finishSettings.filmGrainEnabled) {
    dataUrl = await applyFilmGrainToDataUrl(dataUrl, finishSettings);
  }

  const downloadLink = document.createElement("a");

  downloadLink.href = dataUrl;
  downloadLink.download = `${toFileSlug(
    artboard?.name ?? "canvas"
  )}-neoform-pigments.png`;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  downloadLink.remove();
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

function saveSelectionAsComposition(canvas: ReturnType<typeof createFabricCanvas>) {
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

  useEditorStore.getState().addUserComposition({
    id: crypto.randomUUID(),
    label: `Saved ${useEditorStore.getState().userCompositions.length + 1}`,
    objects,
    source: "saved"
  });
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

  return object.type === "textbox" || object.type === "text" ? "text" : "rectangle";
}

function toFileSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type LineEditHandleButtonProps = {
  label: string;
  left: number;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  tone: string;
  top: number;
};

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
  const transform = shouldRotate
    ? `translate(-50%, -50%) rotate(${angle}deg)`
    : kind === "tapHand"
      ? "translate(-20%, -96%)"
      : "translate(-15%, -13%)";

  return (
    <div
      className={clsx(
        "neoform-motion-cursor-shell pointer-events-none absolute z-50",
        `neoform-cursor-phase-${phase}`,
        kind === "tapHand" ? "h-20 w-20" : "h-14 w-14"
      )}
      style={{
        left,
        top,
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
  unit: "cm" | "mm"
) {
  const widthCm = pixelsToCentimeters(artboard.width);
  const heightCm = pixelsToCentimeters(artboard.height);

  return {
    pixels: `${artboard.width} x ${artboard.height} px`,
    physical:
      unit === "cm"
        ? `${widthCm.toFixed(2)} x ${heightCm.toFixed(2)} cm`
        : `${(widthCm * 10).toFixed(1)} x ${(heightCm * 10).toFixed(1)} mm`
  };
}

function dimensionValueToPixels(value: number, unit: DimensionUnit) {
  if (!Number.isFinite(value) || value <= 0) {
    return 0;
  }

  if (unit === "px") {
    return value;
  }

  if (unit === "cm") {
    return centimetersToPixels(value);
  }

  return centimetersToPixels(value / 10);
}

function pixelsToDimensionValue(pixels: number, unit: DimensionUnit) {
  if (unit === "px") {
    return Math.round(pixels);
  }

  const centimeters = pixelsToCentimeters(pixels);
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

function findVectorCutTarget(
  objects: FabricObject[],
  start: Point,
  end: Point
) {
  return [...objects]
    .reverse()
    .find((object) => doesVectorCutIntersectObject(object, start, end));
}

function doesVectorCutIntersectObject(
  object: FabricObject,
  start: Point,
  end: Point
) {
  if (
    !object.visible ||
    object.get("name") === "symmetry-guide" ||
    object.get("name") === "chainsaw-cut-preview"
  ) {
    return false;
  }

  const polygon = createObjectOutlinePolygon(object);

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

function createVectorCutPieces(
  target: FabricObject,
  start: Point,
  end: Point
) {
  const sourcePolygon = createObjectOutlinePolygon(target);

  if (sourcePolygon.length < 3) {
    return [];
  }

  const positiveSide = clipPolygonByCutLine(sourcePolygon, start, end, true);
  const negativeSide = clipPolygonByCutLine(sourcePolygon, start, end, false);

  if (polygonArea(positiveSide) < 80 || polygonArea(negativeSide) < 80) {
    return [];
  }

  const fill = getCutPaint(target, "fill") ?? getCutPaint(target, "stroke") ?? "#101010";
  const stroke = getCutPaint(target, "stroke") ?? fill;
  const transparentFill = typeof fill === "string" && (fill === "" || fill === "transparent");

  return [positiveSide, negativeSide].map(
    (points) =>
      new Polygon(points, {
        fill: transparentFill ? "transparent" : fill,
        globalCompositeOperation:
          (target.get("globalCompositeOperation") as GlobalCompositeOperation | undefined) ??
          "source-over",
        objectCaching: false,
        opacity: Number(target.get("opacity") ?? 1),
        shadow: target.get("shadow") as Shadow | null,
        stroke: transparentFill ? stroke : fill,
        strokeLineJoin: "round",
        strokeWidth: transparentFill ? 1 : 0
      })
  );
}

function createObjectOutlinePolygon(target: FabricObject): VectorCutPoint[] {
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

  if (kind === "ellipse" || kind === "drop") {
    return createEllipseOutline(center, width / 2, height / 2);
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
    { x: left, y: top },
    { x: left + width, y: top },
    { x: left + width, y: top + height },
    { x: left, y: top + height }
  ];
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

  if (!kind || kind === "text" || isLineObjectType(kind) || isFreehandObjectType(kind)) {
    return "rectangle";
  }

  return kind;
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

  return activeTool === "select" ? "default" : "crosshair";
}

type DrawingBrushSettings = {
  color: string;
  decimate: number;
  lineCap: CanvasLineCap;
  lineJoin: CanvasLineJoin;
  opacity: number;
  width: number;
};

function getDrawingBrushSettings(tool: EditorTool): DrawingBrushSettings {
  if (tool === "nibStroke") {
    return {
      color: "#101010",
      decimate: 0.35,
      lineCap: "butt",
      lineJoin: "miter",
      opacity: 0.96,
      width: 5
    };
  }

  if (tool === "markerStroke") {
    return {
      color: "#101010",
      decimate: 0.7,
      lineCap: "round",
      lineJoin: "round",
      opacity: 0.66,
      width: 16
    };
  }

  return {
    color: "#101010",
    decimate: 0.18,
    lineCap: "round",
    lineJoin: "round",
    opacity: 0.92,
    width: 2.5
  };
}

function syncDrawingMode(
  canvas: ReturnType<typeof createFabricCanvas>,
  activeTool: EditorTool
) {
  if (!isDrawingTool(activeTool)) {
    canvas.isDrawingMode = false;
    canvas.selection = activeTool !== "pan";
    return;
  }

  const brushSettings = getDrawingBrushSettings(activeTool);
  const brush = new PencilBrush(canvas);

  brush.color = brushSettings.color;
  brush.width = brushSettings.width;
  brush.decimate = brushSettings.decimate;
  brush.strokeLineCap = brushSettings.lineCap;
  brush.strokeLineJoin = brushSettings.lineJoin;
  brush.limitedToCanvasSize = true;

  canvas.freeDrawingBrush = brush;
  canvas.isDrawingMode = true;
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

async function applyFilmGrainToDataUrl(
  dataUrl: string,
  settings: CanvasFinishSettings
) {
  const image = await loadImageElement(dataUrl);
  const outputCanvas = document.createElement("canvas");
  outputCanvas.width = image.naturalWidth || image.width;
  outputCanvas.height = image.naturalHeight || image.height;
  const context = outputCanvas.getContext("2d");

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

  return outputCanvas.toDataURL("image/png");
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

function pixelsToCentimeters(pixels: number) {
  return (pixels / 300) * 2.54;
}

function centimetersToPixels(centimeters: number) {
  return (centimeters / 2.54) * 300;
}

function applyFillToObject(object: FabricObject, fill: FabricPaint) {
  clearShadeState(object);

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

  if (fill === "transparent") {
    object.set({
      fill: isLineObject || isFreehandObject ? "" : "transparent",
      stroke: "#101010",
      strokeWidth: isFreehandObject
        ? Number(object.get("strokeWidth") ?? 2.5)
        : isLineObject
          ? 1
          : 1
    });
    return;
  }

  if (isLineObject || isFreehandObject) {
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

  if (texture.kind === "filmGrain") {
    return createSvgTexturePattern(texture);
  }

  return createTexturePattern(texture);
}

function applyShadeGradientToObject(object: FabricObject, level = 0.45) {
  const shadeLevel = clampNumber(level, 0, 1);

  getPaintTargets(object).forEach((target) => {
    const baseColor = getObjectBaseColor(target);
    const gradient = createShadeGradient(baseColor, shadeLevel);
    const shapeKind = getShapeKindForObject(target);

    target.set(shadeLevelName, shadeLevel);
    target.set(shadeBaseColorName, baseColor);

    if (isLineObjectType(shapeKind) || isFreehandObjectType(shapeKind)) {
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
    const gradient = createShadeGradient(targetBaseColor, shadeLevel);
    const shapeKind = getShapeKindForObject(target);

    target.set(shadeLevelName, shadeLevel);
    target.set(shadeBaseColorName, targetBaseColor);

    if (isLineObjectType(shapeKind) || isFreehandObjectType(shapeKind)) {
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
  object.dirty = true;
}

function createShadeGradient(baseColor: string, level: number) {
  const shadeLevel = clampNumber(level, 0, 1);
  const lightAmount = 0.06 + shadeLevel * 0.6;
  const darkAmount = 0.04 + shadeLevel * 0.54;

  return new Gradient<"linear">({
    type: "linear",
    gradientUnits: "percentage",
    coords: { x1: 0, y1: 0, x2: 1, y2: 1 },
    colorStops: [
      { offset: 0, color: mixHexColors(baseColor, "#ffffff", lightAmount) },
      { offset: 0.52, color: baseColor },
      { offset: 1, color: mixHexColors(baseColor, "#000000", darkAmount) }
    ]
  });
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

  getPaintTargets(object).forEach((target) => {
    target.set(shadeLevelName, 0);
    target.set(shadeBaseColorName, undefined);
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

function rgbToHex({ b, g, r }: { b: number; g: number; r: number }) {
  return `#${[r, g, b]
    .map((channel) => Math.min(Math.max(channel, 0), 255).toString(16).padStart(2, "0"))
    .join("")}`;
}

async function createSvgTexturePattern(texture: TexturePreset) {
  const tileSize = texture.scale ?? 128;
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
  const fill = normalizeColorValue(String(paintTarget.get("fill") ?? "#101010"));
  const stroke = normalizeColorValue(String(paintTarget.get("stroke") ?? "#101010"));
  const strokeWidth = Number(paintTarget.get("strokeWidth") ?? 0);
  const shapeKind = getShapeKindForObject(object);
  const lineWidths = getLineWidthsForObject(object);
  const textFontFamily = normalizeTextFontFamily(paintTarget.get("fontFamily"));

  useEditorStore.getState().setSelectedObjectProperties({
    fill:
      Number(object.get(shadeLevelName) ?? paintTarget.get(shadeLevelName) ?? 0) > 0
        ? getShadeBaseColor(paintTarget)
        : isLineObjectType(shapeKind) || isFreehandObjectType(shapeKind)
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

  object.set({
    name: summary.name,
    visible: summary.visible,
    selectable: canInteract,
    evented: canInteract,
    hasControls: canInteract,
    lockMovementX: summary.locked,
    lockMovementY: summary.locked,
    lockScalingX: summary.locked,
    lockScalingY: summary.locked,
    lockRotation: summary.locked
  });
}
