import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { driver } from "driver.js";
import {
  ArrowDown,
  ArrowUp,
  CircleHelp,
  Eye,
  EyeOff,
  Grid3X3,
  Layers,
  Lock,
  MousePointer2,
  Ratio,
  SlidersHorizontal,
  Trash2,
  Unlock
} from "lucide-react";
import { canvasFormats } from "../canvas/canvasPresets";
import { useEditorStore } from "../store/editorStore";
import type {
  BlendMode,
  CanvasCursorStyle,
  ShadowPreset,
  TextFontFamily
} from "../types/editor";
import { clsx } from "../utils/clsx";
import { textFontOptions } from "../utils/textFonts";

const resizeTabHeight = 18;
const blendModeOptions: Array<{ label: string; value: BlendMode }> = [
  { label: "Normal", value: "source-over" },
  { label: "Multiply", value: "multiply" },
  { label: "Screen", value: "screen" },
  { label: "Overlay", value: "overlay" },
  { label: "Darken", value: "darken" },
  { label: "Lighten", value: "lighten" },
  { label: "Burn", value: "color-burn" },
  { label: "Difference", value: "difference" },
  { label: "Exclusion", value: "exclusion" }
];
const shadowPresetOptions: Array<{ label: string; value: ShadowPreset }> = [
  { label: "No shadow", value: "none" },
  { label: "Hard", value: "hard" },
  { label: "Soft", value: "soft" },
  { label: "Long", value: "long" }
];
const cursorOptions: Array<{ label: string; value: CanvasCursorStyle }> = [
  { label: "Auto", value: "auto" },
  { label: "Target", value: "target" },
  { label: "Finger", value: "finger" },
  { label: "Rocket", value: "rocket" },
  { label: "Plane", value: "paperPlane" },
  { label: "Tattoo", value: "tapHand" },
  { label: "Pencil", value: "pencil" }
];
const blendModeHints: Record<BlendMode, string> = {
  "source-over": "Normal: la capa queda tal cual encima de las demás.",
  multiply: "Multiply: oscurece el cruce, ideal para sombras y tintas.",
  screen: "Screen: aclara el cruce, útil para luces y brillos.",
  overlay: "Overlay: sube contraste mezclando claros y oscuros.",
  darken: "Darken: conserva el color más oscuro en cada zona.",
  lighten: "Lighten: conserva el color más claro en cada zona.",
  "color-burn": "Burn: quema el color y aumenta densidad.",
  difference: "Difference: invierte el cruce con efecto gráfico fuerte.",
  exclusion: "Exclusion: parecido a Difference pero más suave."
};

function startRightSidebarTour() {
  const steps = [
    {
      element: "[data-tour='right-inspector']",
      popover: {
        title: "Inspector",
        description:
          "Aquí controlas el lienzo, el objeto seleccionado, capas, guías y efectos.",
        side: "left" as const,
        align: "start" as const
      }
    },
    {
      element: "[data-tour='canvas-cursor']",
      popover: {
        title: "Cursor rápido",
        description:
          "Este botón está junto a las medidas del lienzo para cambiar el tipo de cursor sin buscar en paneles.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='film-grain']",
      popover: {
        title: "Grano analógico",
        description:
          "Activa un acabado final de película analógica. Se previsualiza en el lienzo y se aplica al PNG exportado.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='cursor-style']",
      popover: {
        title: "Cursores",
        description:
          "Elige el cursor que te resulte más cómodo: diana, dedo, cohete, avión, mano o lápiz.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='chainsaw-cut-tool']",
      popover: {
        title: "Motosierra: corte vectorial",
        description:
          "Arrastra una línea recta, incluso empezando fuera de la figura. Al soltar, la figura cruzada se divide en dos piezas vectoriales cerradas y editables.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='remove-bg-tool']",
      popover: {
        title: "Cortacésped: quitar fondo",
        description:
          "Haz clic sobre una figura o texto para retirar su relleno/fondo y dejar una silueta editable con contorno.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='guides-canvases']",
      popover: {
        title: "Guías y lienzos",
        description:
          "Activa cuadrícula, proporción áurea, guías libres y crea lienzos verticales u horizontales.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='properties']",
      popover: {
        title: "Propiedades",
        description:
          "Ajusta color, tamaño, opacidad y el degradado Light / Shadow con la barra Shade.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='layers']",
      popover: {
        title: "Capas",
        description:
          "Selecciona, ordena, bloquea, elimina y controla opacidad, sombra y modo de fusión por capa.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='libraries']",
      popover: {
        title: "Bibliotecas",
        description:
          "Forms, Pigments, Textures y Compositions viven aquí. Las pestañas cambian el tipo de material.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='right-panel-resize']",
      popover: {
        title: "Altura de paneles",
        description:
          "Arrastra esta pestaña para dar más espacio al inspector o a las bibliotecas según lo que estés usando.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='library-tabs']",
      popover: {
        title: "Tabs de biblioteca",
        description:
          "Forms añade figuras, Pigments aplica color, Textures aplica acabados y Compositions reutiliza conjuntos.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='compositions-save']",
      popover: {
        title: "Guardar composiciones",
        description:
          "Selecciona varias figuras en el lienzo y guarda el conjunto para reutilizarlo en cualquier lienzo.",
        side: "left" as const
      }
    }
  ].filter((step) => document.querySelector(step.element));

  driver({
    animate: true,
    doneBtnText: "Listo",
    nextBtnText: "Siguiente",
    prevBtnText: "Atrás",
    progressText: "{{current}} / {{total}}",
    showProgress: true,
    steps
  }).drive();
}

export function RightPanel() {
  const inspectorBodyRef = useRef<HTMLDivElement | null>(null);
  const layersPanelRef = useRef<HTMLElement | null>(null);
  const [selectedFormatId, setSelectedFormatId] = useState(canvasFormats[1].id);
  const [layersHeight, setLayersHeight] = useState(getDefaultLayersHeight);
  const activeTool = useEditorStore((state) => state.activeTool);
  const cursorStyle = useEditorStore((state) => state.cursorStyle);
  const setCursorStyle = useEditorStore((state) => state.setCursorStyle);
  const textFontFamily = useEditorStore((state) => state.textFontFamily);
  const setTextFontFamily = useEditorStore((state) => state.setTextFontFamily);
  const artboards = useEditorStore((state) => state.artboards);
  const activeArtboardId = useEditorStore((state) => state.activeArtboardId);
  const activeArtboard = artboards.find((artboard) => artboard.id === activeArtboardId);
  const canvasObjects = useEditorStore((state) => state.canvasObjects);
  const selectedObjectProperties = useEditorStore(
    (state) => state.selectedObjectProperties
  );
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const requestSelectedObjectPropertyUpdate = useEditorStore(
    (state) => state.requestSelectedObjectPropertyUpdate
  );
  const viewSettings = useEditorStore((state) => state.viewSettings);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const toggleGoldenRatio = useEditorStore((state) => state.toggleGoldenRatio);
  const addCanvasGuide = useEditorStore((state) => state.addCanvasGuide);
  const clearCanvasGuides = useEditorStore((state) => state.clearCanvasGuides);
  const addArtboard = useEditorStore((state) => state.addArtboard);
  const setActiveArtboard = useEditorStore((state) => state.setActiveArtboard);
  const toggleLayerVisibility = useEditorStore(
    (state) => state.toggleLayerVisibility
  );
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const moveLayer = useEditorStore((state) => state.moveLayer);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const requestObjectSelection = useEditorStore(
    (state) => state.requestObjectSelection
  );
  const activeCanvasObjects = canvasObjects.filter(
    (item) => item.artboardId === activeArtboardId
  );
  const selectedObject = activeCanvasObjects.find(
    (item) => item.id === selectedObjectId
  );
  const selectedObjectIsLine =
    selectedObject?.type === "straightLine" ||
    selectedObject?.type === "curveLine" ||
    selectedObject?.type === "waveLine";
  const selectedObjectIsFreehand =
    selectedObject?.type === "pencilStroke" ||
    selectedObject?.type === "nibStroke" ||
    selectedObject?.type === "markerStroke";
  const selectedObjectUsesStrokeColor =
    selectedObjectIsLine || selectedObjectIsFreehand;
  const selectedObjectIsText = selectedObject?.type === "text";
  const layers = [...activeCanvasObjects].reverse();
  const selectedFormat =
    canvasFormats.find((format) => format.id === selectedFormatId) ??
    canvasFormats[0];
  const handleLayersResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = layersHeight;
    const bodyBottom =
      inspectorBodyRef.current?.getBoundingClientRect().bottom ?? window.innerHeight;
    const layersTop =
      layersPanelRef.current?.getBoundingClientRect().top ?? event.clientY;
    const maxHeight = Math.max(0, bodyBottom - layersTop - resizeTabHeight);

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight + moveEvent.clientY - startY;
      setLayersHeight(clamp(nextHeight, 0, maxHeight));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <section
      className="min-h-0 overflow-hidden border-b-2 border-ink bg-bone"
      data-tour="right-inspector"
    >
      <div className="flex h-8 items-center gap-2 border-b-2 border-ink bg-mineral px-2">
        <SlidersHorizontal size={13} />
        <h2 className="text-xs font-black uppercase text-ink">
          Inspector
        </h2>
        <button
          type="button"
          onClick={startRightSidebarTour}
          className="ml-auto flex h-5 animate-pulse items-center gap-1 border-2 border-ink bg-punch px-1.5 text-[9px] font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
          data-tour="tour-button"
          title="Tour del sidebar derecho"
        >
          <CircleHelp size={10} />
          Tour guiado
        </button>
      </div>

      <div
        ref={inspectorBodyRef}
        className="grid h-[calc(100%-2rem)] content-start gap-1.5 overflow-auto p-1.5"
        style={{
          gridTemplateRows: `auto auto auto minmax(0, ${layersHeight}px) ${resizeTabHeight}px`
        }}
      >
        <div className="grid grid-cols-2 gap-1.5">
          <article className="border-2 border-ink bg-paper p-1.5 shadow-brutal-sm">
            <div className="flex items-center gap-1.5">
              <MousePointer2 size={11} />
              <h3 className="text-[9px] font-black uppercase">Tool</h3>
            </div>
            <p className="truncate text-[10px] font-bold capitalize">{activeTool}</p>
            <label
              className="mt-1 block text-[8px] font-black uppercase"
              data-tour="cursor-style"
            >
              Cursor
              <select
                value={cursorStyle}
                onChange={(event) =>
                  setCursorStyle(event.currentTarget.value as CanvasCursorStyle)
                }
                className="mt-0.5 h-5 w-full border-2 border-ink bg-bone px-0.5 text-[8px] font-black uppercase outline-none"
              >
                {cursorOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="mt-1 block text-[8px] font-black uppercase">
              Text font
              <select
                value={
                  selectedObjectIsText && selectedObjectProperties
                    ? selectedObjectProperties.fontFamily
                    : textFontFamily
                }
                onChange={(event) => {
                  const fontFamily = event.currentTarget.value as TextFontFamily;

                  setTextFontFamily(fontFamily);

                  if (selectedObjectIsText) {
                    requestSelectedObjectPropertyUpdate({ fontFamily });
                  }
                }}
                className="mt-0.5 h-5 w-full border-2 border-ink bg-bone px-0.5 text-[8px] font-black uppercase outline-none"
              >
                {textFontOptions.map((font) => (
                  <option key={font.value} value={font.value}>
                    {font.label}
                  </option>
                ))}
              </select>
            </label>
          </article>

          <article className="border-2 border-ink bg-paper p-1.5 shadow-brutal-sm">
            <h3 className="text-[9px] font-black uppercase">Selection</h3>
            <p className="truncate text-[10px] font-bold">
              {selectedObject?.name ?? "No object"}
            </p>
          </article>
        </div>

        <article
          className="border-2 border-ink bg-paper p-1.5 shadow-brutal-sm"
          data-tour="guides-canvases"
        >
          <div className="grid grid-cols-2 gap-1.5">
            <div>
              <h3 className="text-[9px] font-black uppercase">Guides</h3>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <button
                  type="button"
                  onClick={toggleGrid}
                  className={clsx(
                    "flex h-6 items-center justify-center gap-1 border-2 border-ink px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
                    viewSettings.showGrid ? "bg-pollen" : "bg-bone"
                  )}
                >
                  <Grid3X3 size={10} />
                  Grid
                </button>
                <button
                  type="button"
                  onClick={toggleGoldenRatio}
                  className={clsx(
                    "flex h-6 items-center justify-center gap-1 border-2 border-ink px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
                    viewSettings.showGoldenRatio
                      ? "bg-punch text-paper"
                      : "bg-bone"
                  )}
                >
                  <Ratio size={10} />
                  Phi
                </button>
                <button
                  type="button"
                  onClick={() => addCanvasGuide("vertical")}
                  className="flex h-6 items-center justify-center border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                >
                  V Guide
                </button>
                <button
                  type="button"
                  onClick={() => addCanvasGuide("horizontal")}
                  className="flex h-6 items-center justify-center border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                >
                  H Guide
                </button>
                <button
                  type="button"
                  onClick={clearCanvasGuides}
                  className="col-span-2 flex h-6 items-center justify-center border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                >
                  Clear guides
                </button>
              </div>
            </div>

            <div>
              <h3 className="text-[9px] font-black uppercase">Canvases</h3>
              <div className="mt-1 grid grid-cols-2 gap-1">
                <select
                  value={selectedFormatId}
                  onChange={(event) => setSelectedFormatId(event.target.value)}
                  className="col-span-2 h-6 border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase outline-none"
                >
                  {canvasFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => addArtboard(selectedFormat, "landscape")}
                  className="h-6 border-2 border-ink bg-mineral px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                >
                  H
                </button>
                <button
                  type="button"
                  onClick={() => addArtboard(selectedFormat, "portrait")}
                  className="h-6 border-2 border-ink bg-pollen px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                >
                  V
                </button>
              </div>
            </div>
          </div>

          <div className="mt-1 flex gap-1 overflow-x-auto pb-0.5">
            {artboards.map((artboard) => (
              <button
                key={artboard.id}
                type="button"
                onClick={() => setActiveArtboard(artboard.id)}
                className={clsx(
                  "shrink-0 border-2 border-ink px-1.5 py-0.5 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
                  activeArtboardId === artboard.id
                    ? "bg-punch text-paper"
                    : "bg-bone"
                )}
              >
                {artboard.name.replace("Canvas ", "C")}
              </button>
            ))}
          </div>
        </article>

        <article
          className="border-2 border-ink bg-paper p-1.5 shadow-brutal-sm"
          data-tour="properties"
        >
          <h3 className="text-[9px] font-black uppercase">Properties</h3>
          {selectedObjectProperties ? (
            <div className="mt-1 grid grid-cols-8 gap-1">
              <PropertyColorInput
                label={selectedObjectUsesStrokeColor ? "Color" : "Fill"}
                value={selectedObjectProperties.fill}
                onChange={(fill) => requestSelectedObjectPropertyUpdate({ fill })}
              />
              {!selectedObjectIsLine ? (
                <>
                  <PropertyColorInput
                    label="Stroke"
                    value={selectedObjectProperties.stroke}
                    onChange={(stroke) =>
                      requestSelectedObjectPropertyUpdate({ stroke })
                    }
                  />
                  <PropertyNumberInput
                    label="Line"
                    value={selectedObjectProperties.strokeWidth}
                    min={0}
                    step={1}
                    onChange={(strokeWidth) =>
                      requestSelectedObjectPropertyUpdate({ strokeWidth })
                    }
                  />
                </>
              ) : null}
              {selectedObjectIsText ? (
                <div className="col-span-2">
                  <PropertySelectInput<TextFontFamily>
                    label="Font"
                    options={textFontOptions}
                    value={selectedObjectProperties.fontFamily}
                    onChange={(fontFamily) => {
                      setTextFontFamily(fontFamily);
                      requestSelectedObjectPropertyUpdate({ fontFamily });
                    }}
                  />
                </div>
              ) : null}
              <PropertyNumberInput
                label="Opacity"
                value={selectedObjectProperties.opacity}
                min={0}
                max={1}
                step={0.05}
                onChange={(opacity) =>
                  requestSelectedObjectPropertyUpdate({ opacity })
                }
              />
              <label className="col-span-2 text-[8px] font-black uppercase">
                Shade {Math.round(selectedObjectProperties.shadeLevel * 100)}%
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.05}
                  value={selectedObjectProperties.shadeLevel}
                  onChange={(event) =>
                    requestSelectedObjectPropertyUpdate({
                      shadeLevel: Number(event.currentTarget.value)
                    })
                  }
                  className="mt-0.5 h-4 w-full accent-[#C06830]"
                />
              </label>
              {selectedObjectIsLine ? (
                <>
                  <PropertyNumberInput
                    label="Curve"
                    value={selectedObjectProperties.lineCurvature}
                    min={-48}
                    max={48}
                    step={2}
                    onChange={(lineCurvature) =>
                      requestSelectedObjectPropertyUpdate({ lineCurvature })
                    }
                  />
                  <PropertyNumberInput
                    label="Start"
                    value={selectedObjectProperties.lineStartWidth}
                    min={1}
                    max={80}
                    step={1}
                    onChange={(lineStartWidth) =>
                      requestSelectedObjectPropertyUpdate({ lineStartWidth })
                    }
                  />
                  <PropertyNumberInput
                    label="End"
                    value={selectedObjectProperties.lineEndWidth}
                    min={1}
                    max={80}
                    step={1}
                    onChange={(lineEndWidth) =>
                      requestSelectedObjectPropertyUpdate({ lineEndWidth })
                    }
                  />
                </>
              ) : null}
              <PropertyNumberInput
                label="X"
                value={selectedObjectProperties.x}
                onChange={(x) => requestSelectedObjectPropertyUpdate({ x })}
              />
              <PropertyNumberInput
                label="Y"
                value={selectedObjectProperties.y}
                onChange={(y) => requestSelectedObjectPropertyUpdate({ y })}
              />
              <PropertyNumberInput
                label="W"
                value={selectedObjectProperties.width}
                min={1}
                onChange={(width) =>
                  requestSelectedObjectPropertyUpdate({ width })
                }
              />
              <PropertyNumberInput
                label="H"
                value={selectedObjectProperties.height}
                min={1}
                onChange={(height) =>
                  requestSelectedObjectPropertyUpdate({ height })
                }
              />
            </div>
          ) : (
            <p className="text-[9px] font-black uppercase text-ink/55">
              Select an object
            </p>
          )}
        </article>

        <article
          ref={layersPanelRef}
          className="grid min-h-0 grid-rows-[auto_auto_minmax(0,1fr)] overflow-hidden border-2 border-ink bg-paper p-1.5 shadow-brutal-sm"
          data-tour="layers"
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers size={11} />
              <h3 className="text-[9px] font-black uppercase">Layers</h3>
            </div>
            <span className="border-2 border-ink bg-pollen px-1.5 text-[10px] font-black">
              {activeCanvasObjects.length}
            </span>
          </div>

          <p className="text-[9px] font-black uppercase text-ink/65">
            {activeArtboard?.name ?? "Canvas"}
          </p>

          <div className="mt-1 min-h-0 space-y-1 overflow-auto pr-1">
            {layers.length === 0 ? (
              <p className="border-2 border-dashed border-ink/45 bg-bone p-1.5 text-[9px] font-bold uppercase text-ink/60">
                No layers yet
              </p>
            ) : (
              layers.map((layer) => (
                <div
                  key={layer.id}
                  className={clsx(
                    "border-2 border-ink p-1 shadow-brutal-sm",
                    selectedObjectId === layer.id ? "bg-mineral" : "bg-bone",
                    !layer.visible && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => requestObjectSelection(layer.id)}
                      className="grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-paper transition hover:-translate-y-0.5"
                      title="Select layer"
                    >
                      <MousePointer2 size={10} />
                    </button>
                    <input
                      defaultValue={layer.name}
                      onBlur={(event) =>
                        renameLayer(layer.id, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }
                      }}
                    className="min-w-0 flex-1 border-2 border-ink bg-paper px-1 py-0 text-[9px] font-black outline-none"
                      aria-label={`Rename ${layer.name}`}
                    />
                    <span className="shrink-0 text-[9px] font-black uppercase text-ink/65">
                      {layer.type}
                    </span>
                  </div>

                  <div className="mt-1 grid grid-cols-5 gap-1">
                    <LayerIconButton
                      label={layer.visible ? "Hide layer" : "Show layer"}
                      onClick={() => toggleLayerVisibility(layer.id)}
                    >
                      {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                    </LayerIconButton>
                    <LayerIconButton
                      label={layer.locked ? "Unlock layer" : "Lock layer"}
                      onClick={() => toggleLayerLock(layer.id)}
                    >
                      {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                    </LayerIconButton>
                    <LayerIconButton
                      label="Move layer up"
                      disabled={
                        activeCanvasObjects.findIndex(
                          (object) => object.id === layer.id
                        ) ===
                        activeCanvasObjects.length - 1
                      }
                      onClick={() => moveLayer(layer.id, "up")}
                    >
                      <ArrowUp size={14} />
                    </LayerIconButton>
                    <LayerIconButton
                      label="Move layer down"
                      disabled={
                        activeCanvasObjects.findIndex(
                          (object) => object.id === layer.id
                        ) === 0
                      }
                      onClick={() => moveLayer(layer.id, "down")}
                    >
                      <ArrowDown size={14} />
                    </LayerIconButton>
                    <LayerIconButton
                      label="Delete layer"
                      onClick={() => deleteLayer(layer.id)}
                      danger
                    >
                      <Trash2 size={14} />
                    </LayerIconButton>
                  </div>

                  {selectedObjectId === layer.id && selectedObjectProperties ? (
                    <div
                      className="mt-1 grid grid-cols-[1fr_84px_78px] gap-1 border-2 border-ink bg-paper p-1"
                      data-tour="layer-effects"
                    >
                      <label className="text-[8px] font-black uppercase">
                        Opacity {Math.round(selectedObjectProperties.opacity * 100)}%
                        <input
                          type="range"
                          min={0}
                          max={1}
                          step={0.05}
                          value={selectedObjectProperties.opacity}
                          onChange={(event) =>
                            requestSelectedObjectPropertyUpdate({
                              opacity: Number(event.currentTarget.value)
                            })
                          }
                          className="mt-0.5 h-4 w-full accent-ink"
                        />
                      </label>
                      <PropertySelectInput
                        label="Blend"
                        options={blendModeOptions}
                        value={selectedObjectProperties.blendMode}
                        onChange={(blendMode) =>
                          requestSelectedObjectPropertyUpdate({ blendMode })
                        }
                      />
                      <PropertySelectInput
                        label="Shadow"
                        options={shadowPresetOptions}
                        value={selectedObjectProperties.shadowPreset}
                        onChange={(shadowPreset) =>
                          requestSelectedObjectPropertyUpdate({ shadowPreset })
                        }
                      />
                      <BlendModePreview mode={selectedObjectProperties.blendMode} />
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </article>

        <button
          type="button"
          onPointerDown={handleLayersResizeStart}
          className="group flex cursor-row-resize items-center justify-center border-2 border-ink bg-pollen text-[9px] font-black uppercase tracking-wide outline-none transition hover:bg-punch hover:text-paper focus-visible:bg-punch focus-visible:text-paper"
          aria-label="Resize layers panel"
          title="Arrastra desde abajo para cambiar la altura de Layers"
        >
          <span className="mr-1 text-xs leading-none">↕</span>
          Drag resize
        </button>
      </div>
    </section>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultLayersHeight() {
  if (typeof window === "undefined") {
    return 360;
  }

  return clamp(Math.round(window.innerHeight * 0.34), 260, 520);
}

type PropertyColorInputProps = {
  label: string;
  onChange: (value: string) => void;
  value: string;
};

function PropertyColorInput({ label, onChange, value }: PropertyColorInputProps) {
  return (
    <label className="text-[8px] font-black uppercase">
      {label}
      <input
        type="color"
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="mt-0.5 h-5 w-full border-2 border-ink bg-paper p-0"
      />
    </label>
  );
}

type PropertyNumberInputProps = {
  label: string;
  max?: number;
  min?: number;
  onChange: (value: number) => void;
  step?: number;
  value: number;
};

function PropertyNumberInput({
  label,
  max,
  min,
  onChange,
  step = 1,
  value
}: PropertyNumberInputProps) {
  return (
    <label className="text-[8px] font-black uppercase">
      {label}
      <input
        type="number"
        max={max}
        min={min}
        step={step}
        value={Number.isFinite(value) ? Number(value.toFixed(2)) : 0}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="mt-0.5 h-5 w-full border-2 border-ink bg-bone px-0.5 text-[9px] font-black outline-none"
      />
    </label>
  );
}

type PropertySelectInputProps<T extends string> = {
  label: string;
  onChange: (value: T) => void;
  options: Array<{ label: string; value: T }>;
  value: T;
};

function PropertySelectInput<T extends string>({
  label,
  onChange,
  options,
  value
}: PropertySelectInputProps<T>) {
  return (
    <label className="text-[8px] font-black uppercase">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.currentTarget.value as T)}
        className="mt-0.5 h-5 w-full border-2 border-ink bg-bone px-0.5 text-[8px] font-black uppercase outline-none"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function BlendModePreview({ mode }: { mode: BlendMode }) {
  const mixBlendMode = mode === "source-over" ? "normal" : mode;

  return (
    <div className="col-span-3 border-2 border-ink bg-bone p-1">
      <div className="mb-1 flex items-center justify-between gap-2">
        <span className="text-[8px] font-black uppercase">Blend preview</span>
        <span className="text-[8px] font-black uppercase text-ink/60">
          {blendModeOptions.find((option) => option.value === mode)?.label}
        </span>
      </div>
      <div className="relative h-8 overflow-hidden border-2 border-ink bg-paper">
        <span className="absolute inset-0 bg-[linear-gradient(135deg,#F0B800_0_50%,#0068C0_50%)]" />
        <span className="absolute left-8 top-1 h-6 w-12 rounded-full bg-punch opacity-90" />
        <span
          className="absolute left-14 top-1 h-6 w-12 rounded-full bg-[#00C2A8] opacity-90"
          style={{ mixBlendMode }}
        />
      </div>
      <p className="mt-1 text-[8px] font-bold uppercase leading-tight text-ink/70">
        {blendModeHints[mode]}
      </p>
    </div>
  );
}

type LayerIconButtonProps = {
  children: React.ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function LayerIconButton({
  children,
  danger = false,
  disabled = false,
  label,
  onClick
}: LayerIconButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        "grid h-5 place-items-center border-2 border-ink bg-paper transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35 disabled:hover:translate-y-0",
        danger && "bg-oxide text-paper"
      )}
      title={label}
      aria-label={label}
    >
      {children}
    </button>
  );
}
