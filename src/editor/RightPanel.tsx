import { useRef, useState } from "react";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent
} from "react";
import { driver } from "driver.js";
import {
  ArrowDown,
  ArrowUp,
  CheckSquare,
  ChevronsDown,
  ChevronsUp,
  CircleHelp,
  Copy,
  Eye,
  EyeOff,
  Grid3X3,
  Group as GroupIcon,
  Layers,
  Lock,
  MousePointer2,
  Ratio,
  SlidersHorizontal,
  Square,
  Trash2,
  Ungroup,
  Unlock
} from "lucide-react";
import {
  canvasFormats,
  getFormatPixels,
  maxCanvasDpi,
  minCanvasDpi
} from "../canvas/canvasPresets";
import { professionalPrintPresets } from "../canvas/exportPresets";
import { useEditorStore } from "../store/editorStore";
import type {
  BlendMode,
  CanvasCursorStyle,
  PrintPresetId,
  ProfessionalExportSettings,
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
      element: "[data-tour='tour-button']",
      popover: {
        title: "Tour por tareas reales",
        description:
          "Este recorrido no explica botones sueltos: sigue el flujo normal de trabajo, desde preparar el lienzo hasta exportar JPG.",
        side: "left" as const,
        align: "start" as const
      }
    },
    {
      element: "[data-tour='right-inspector']",
      popover: {
        title: "1. Inspector",
        description:
          "Aqui vive el control fino: herramienta activa, guias, lienzos, propiedades y capas. Si algo se selecciona en el canvas, normalmente se ajusta desde aqui.",
        side: "left" as const,
        align: "start" as const
      }
    },
    {
      element: "[data-tour='canvas-cursor']",
      popover: {
        title: "2. Cursor rapido",
        description:
          "Cambia el cursor junto a las medidas del lienzo. Es el acceso rapido si estas dibujando y quieres pasar de Auto a Rocket, Plane, Tattoo o Pencil.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='export-settings']",
      popover: {
        title: "3. Medidas y PPP",
        description:
          "Antes de exportar, define PPP, formato A1-A5/poster, orientacion, calidad JPG y marcas de corte. El JPG usa estos valores.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='film-grain']",
      popover: {
        title: "4. Grano final",
        description:
          "Esto no es una textura vectorial: es un acabado raster de pelicula analogica para el JPG final. Para tramas escalables usa Textures.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='jpg-srgb-export']",
      popover: {
        title: "5. Exportar JPG sRGB",
        description:
          "Boton principal de salida. Exporta el lienzo activo como JPG/JPEG en sRGB, respeta PPP/calidad actuales y guarda copia en Obras finales.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='visual-library-button']",
      popover: {
        title: "6. Biblioteca visual",
        description:
          "Abre el mini-Bridge local para composiciones, pigmentos, mezclas, paletas, texturas y Obras finales. Las imagenes grandes se guardan en IndexedDB para no saturar localStorage.",
        side: "bottom" as const
      }
    },
    {
      element: "[data-tour='cursor-style']",
      popover: {
        title: "7. Cursor detallado",
        description:
          "Aqui tienes el mismo control con todos los estilos. Si trabajas con tableta, Auto o Pencil suelen ser los mas practicos.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='chainsaw-cut-tool']",
      popover: {
        title: "8. Motosierra",
        description:
          "Selecciona la motosierra y arrastra una linea recta atravesando una figura. Las formas simples se dividen en piezas vectoriales; las complejas usan fallback estable cuando hace falta.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='content-eraser-tool']",
      popover: {
        title: "9. Borrado limpio",
        description:
          "Esta herramienta no corta geometria: arrastra un rectangulo y elimina las capas completas que toque, o haz clic sobre una figura para borrarla sin romper su forma.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='gradient-tool']",
      popover: {
        title: "10. Degradado directo",
        description:
          "Nueva herramienta del sidebar izquierdo: selecciona Gradient y haz clic sobre una figura para aplicar luz/sombra. Si arrastras, defines la direccion del degradado.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='gradient-tool-panel']",
      popover: {
        title: "11. Intensidad y direccion",
        description:
          "Configura la intensidad con el slider y elige una direccion base. Arrastrar en el lienzo sobrescribe visualmente la direccion.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='remove-bg-tool']",
      popover: {
        title: "12. Quitar fondo",
        description:
          "El cortacesped retira el relleno/fondo de una figura y mantiene una silueta seleccionable. Es util para trabajar con huecos y contornos.",
        side: "right" as const
      }
    },
    {
      element: "[data-tour='guides-canvases']",
      popover: {
        title: "12. Guias y lienzos",
        description:
          "Activa cuadricula, proporcion aurea y guias libres. Tambien puedes cambiar formato o crear lienzos verticales/horizontales.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='properties']",
      popover: {
        title: "13. Propiedades del objeto",
        description:
          "Con un objeto seleccionado ajustas color, borde, opacidad, posicion, tamano y Shade. Para texto tambien aparece Font y Outline text.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='selected-color-adjustments']",
      popover: {
        title: "14. Color seleccionado",
        description:
          "Estos sliders corrigen solo el objeto activo: exposicion, contraste, saturacion, temperatura y canales RGB separados.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='global-color-grade']",
      popover: {
        title: "15. Color de composicion",
        description:
          "Aqui corriges el resultado general del lienzo y del JPG final. Es el control correcto para imagenes importadas, texturas y acabado global.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='layers']",
      popover: {
        title: "16. Capas",
        description:
          "Cada figura es una capa. Puedes seleccionar una, varias con Cmd/Ctrl, rango con Shift, renombrar y navegar si hay muchas.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='layers-actions']",
      popover: {
        title: "17. Acciones multiples",
        description:
          "Duplica, agrupa, desagrupa, oculta, bloquea, mueve o borra varias capas a la vez. Si algo sale mal, Undo esta arriba.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='libraries']",
      popover: {
        title: "18. Bibliotecas laterales",
        description:
          "Forms crea figuras, Pigments colorea, Textures aplica tramas/degradados y Compositions reutiliza conjuntos guardados.",
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
        title: "19. Tabs de biblioteca",
        description:
          "Mini paso: crea una figura desde Forms, dale color en Pigments, aplica una trama en Textures y guardala como Composition si quieres reutilizarla.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='textures-vector-note']",
      popover: {
        title: "20. Texturas",
        description:
          "Las tarjetas marcadas Vector son patrones SVG escalables por objeto. El grano analogico final queda separado como Raster export.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='compositions-save']",
      popover: {
        title: "21. Composiciones",
        description:
          "Selecciona varias figuras en el lienzo y guarda el conjunto para reutilizarlo en cualquier lienzo. Despues puedes renombrar, actualizar, ordenar o exportar.",
        side: "left" as const
      }
    },
    {
      element: "[data-tour='layer-effects']",
      popover: {
        title: "22. Fusion y efectos",
        description:
          "Dentro de cada capa controlas opacidad, sombra y modo de fusion. El preview ayuda a entender Multiply, Screen, Overlay y Difference antes de aplicarlos fuerte.",
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
  const selectedLayerIds = useEditorStore((state) => state.selectedLayerIds);
  const requestSelectedObjectPropertyUpdate = useEditorStore(
    (state) => state.requestSelectedObjectPropertyUpdate
  );
  const requestConvertSelectedTextToOutline = useEditorStore(
    (state) => state.requestConvertSelectedTextToOutline
  );
  const viewSettings = useEditorStore((state) => state.viewSettings);
  const toggleGrid = useEditorStore((state) => state.toggleGrid);
  const toggleGoldenRatio = useEditorStore((state) => state.toggleGoldenRatio);
  const addCanvasGuide = useEditorStore((state) => state.addCanvasGuide);
  const clearCanvasGuides = useEditorStore((state) => state.clearCanvasGuides);
  const addArtboard = useEditorStore((state) => state.addArtboard);
  const updateActiveArtboardFormat = useEditorStore(
    (state) => state.updateActiveArtboardFormat
  );
  const exportSettings = useEditorStore((state) => state.exportSettings);
  const setExportSettings = useEditorStore((state) => state.setExportSettings);
  const setActiveArtboard = useEditorStore((state) => state.setActiveArtboard);
  const toggleLayerVisibility = useEditorStore(
    (state) => state.toggleLayerVisibility
  );
  const toggleLayersVisibility = useEditorStore(
    (state) => state.toggleLayersVisibility
  );
  const toggleLayerLock = useEditorStore((state) => state.toggleLayerLock);
  const toggleLayersLock = useEditorStore((state) => state.toggleLayersLock);
  const deleteLayer = useEditorStore((state) => state.deleteLayer);
  const deleteLayers = useEditorStore((state) => state.deleteLayers);
  const duplicateLayers = useEditorStore((state) => state.duplicateLayers);
  const groupLayers = useEditorStore((state) => state.groupLayers);
  const ungroupLayers = useEditorStore((state) => state.ungroupLayers);
  const moveLayer = useEditorStore((state) => state.moveLayer);
  const moveLayers = useEditorStore((state) => state.moveLayers);
  const renameLayer = useEditorStore((state) => state.renameLayer);
  const requestObjectSelection = useEditorStore(
    (state) => state.requestObjectSelection
  );
  const requestLayerSelection = useEditorStore(
    (state) => state.requestLayerSelection
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
  const selectedLayerSet = new Set(selectedLayerIds);
  const selectedLayerActionIds =
    selectedLayerIds.length > 0
      ? selectedLayerIds
      : selectedObjectId
        ? [selectedObjectId]
        : [];
  const selectedLayerActionSet = new Set(selectedLayerActionIds);
  const selectedLayers = activeCanvasObjects.filter((layer) =>
    selectedLayerActionSet.has(layer.id)
  );
  const selectedLayerCount = selectedLayerActionIds.length;
  const canGroupLayers = selectedLayerCount > 1;
  const canUngroupLayers = selectedLayers.some((layer) => layer.type === "group");
  const selectedLayersCanMoveUp = selectedLayers.some((layer) => {
    const layerIndex = activeCanvasObjects.findIndex((item) => item.id === layer.id);

    return layerIndex >= 0 && layerIndex < activeCanvasObjects.length - 1;
  });
  const selectedLayersCanMoveDown = selectedLayers.some((layer) => {
    const layerIndex = activeCanvasObjects.findIndex((item) => item.id === layer.id);

    return layerIndex > 0;
  });
  const selectedLayersCanMoveFront = selectedLayersCanMoveUp;
  const selectedLayersCanMoveBack = selectedLayersCanMoveDown;
  const activeFormatId = activeArtboard
    ? getMatchingCanvasFormatId(activeArtboard, exportSettings.dpi)
    : canvasFormats[3].id;
  const selectedFormat =
    canvasFormats.find((format) => format.id === activeFormatId) ?? canvasFormats[3];
  const selectedOrientation = activeArtboard?.orientation ?? "landscape";
  const selectedFormatPreview = getCanvasFormatPreview(
    selectedFormat,
    exportSettings.dpi,
    activeArtboard,
    activeFormatId === "custom",
    selectedOrientation
  );
  const handleCanvasFormatChange = (formatId: string) => {
    const format = canvasFormats.find((item) => item.id === formatId);

    if (!format) {
      return;
    }

    updateActiveArtboardFormat(format, selectedOrientation);
  };
  const applyActiveArtboardOrientation = (orientation: "landscape" | "portrait") => {
    updateActiveArtboardFormat(selectedFormat, orientation);
  };
  const applyProfessionalPrintPreset = (presetId: PrintPresetId) => {
    const preset = professionalPrintPresets[presetId];

    if (!preset) {
      return;
    }

    setExportSettings(preset.settings);
  };
  const updateProfessionalExportNumber = (
    key: "dpi" | "bleedMm" | "jpegQuality" | "safeMarginMm",
    value: number
  ) => {
    if (!Number.isFinite(value)) {
      return;
    }

    const limits = {
      bleedMm: [0, 20],
      dpi: [minCanvasDpi, maxCanvasDpi],
      jpegQuality: [0.6, 1],
      safeMarginMm: [0, 40]
    } as const;
    const [min, max] = limits[key];

    setExportSettings({
      [key]: clamp(value, min, max),
      presetId: "custom"
    } as Partial<ProfessionalExportSettings>);
  };
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
  const handleLayerSelection = (
    layerId: string,
    event: ReactMouseEvent<HTMLButtonElement | HTMLDivElement>
  ) => {
    if (event.shiftKey && selectedLayerIds.length > 0) {
      const anchorId = selectedLayerIds[selectedLayerIds.length - 1];
      const anchorIndex = layers.findIndex((layer) => layer.id === anchorId);
      const targetIndex = layers.findIndex((layer) => layer.id === layerId);

      if (anchorIndex >= 0 && targetIndex >= 0) {
        const [start, end] =
          anchorIndex < targetIndex
            ? [anchorIndex, targetIndex]
            : [targetIndex, anchorIndex];
        const rangeIds = layers.slice(start, end + 1).map((layer) => layer.id);

        requestLayerSelection(Array.from(new Set([...selectedLayerIds, ...rangeIds])));
        return;
      }
    }

    if (event.metaKey || event.ctrlKey) {
      requestLayerSelection(
        selectedLayerSet.has(layerId)
          ? selectedLayerIds.filter((id) => id !== layerId)
          : [...selectedLayerIds, layerId]
      );
      return;
    }

    requestObjectSelection(layerId);
  };
  const toggleLayerSelection = (layerId: string) => {
    requestLayerSelection(
      selectedLayerSet.has(layerId)
        ? selectedLayerIds.filter((id) => id !== layerId)
        : [...selectedLayerIds, layerId]
    );
  };
  const clearLayerSelection = () => requestLayerSelection([]);

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
                  onClick={() => addCanvasGuide("diagonal-down")}
                  className="flex h-6 items-center justify-center border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Add diagonal guide from top-left to bottom-right"
                >
                  D \
                </button>
                <button
                  type="button"
                  onClick={() => addCanvasGuide("diagonal-up")}
                  className="flex h-6 items-center justify-center border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Add diagonal guide from bottom-left to top-right"
                >
                  D /
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
	                <label className="col-span-2 flex h-6 items-center gap-1 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase">
	                  PPP
	                  <input
	                    type="number"
	                    min={minCanvasDpi}
	                    max={maxCanvasDpi}
	                    value={exportSettings.dpi}
	                    onChange={(event) =>
	                      updateProfessionalExportNumber(
	                        "dpi",
	                        Number(event.currentTarget.value)
	                      )
	                    }
	                    className="min-w-0 flex-1 bg-transparent text-[9px] font-black outline-none"
	                  />
	                </label>
	                <select
	                  value={exportSettings.presetId}
	                  onChange={(event) =>
	                    applyProfessionalPrintPreset(
	                      event.currentTarget.value as PrintPresetId
	                    )
	                  }
	                  className="col-span-2 h-6 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase outline-none"
	                  data-tour="export-settings"
	                  title={
	                    professionalPrintPresets[exportSettings.presetId]?.description ??
	                    "Print export preset"
	                  }
	                >
	                  {Object.entries(professionalPrintPresets).map(([id, preset]) => (
	                    <option key={id} value={id}>
	                      Print · {preset.label}
	                    </option>
	                  ))}
	                </select>
	                <select
	                  value={activeFormatId}
	                  onChange={(event) => handleCanvasFormatChange(event.target.value)}
	                  className="col-span-2 h-6 border-2 border-ink bg-bone px-1 text-[9px] font-black uppercase outline-none"
                >
                  {activeFormatId === "custom" ? (
                    <option value="custom">Custom current size</option>
                  ) : null}
                  {canvasFormats.map((format) => (
                    <option key={format.id} value={format.id}>
                      {format.label}
                    </option>
                  ))}
                </select>
	                <span className="col-span-2 border-2 border-ink bg-paper px-1 py-0.5 text-[8px] font-black uppercase text-ink/70">
	                  {selectedFormatPreview}
	                </span>
	                <label className="flex h-6 items-center gap-1 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase">
	                  Bleed
	                  <input
	                    type="number"
	                    min={0}
	                    max={20}
	                    step={0.5}
	                    value={exportSettings.bleedMm}
	                    onChange={(event) =>
	                      updateProfessionalExportNumber(
	                        "bleedMm",
	                        Number(event.currentTarget.value)
	                      )
	                    }
	                    className="min-w-0 flex-1 bg-transparent text-right text-[9px] font-black outline-none"
	                  />
	                  mm
	                </label>
	                <label className="flex h-6 items-center gap-1 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase">
	                  Safe
	                  <input
	                    type="number"
	                    min={0}
	                    max={40}
	                    step={0.5}
	                    value={exportSettings.safeMarginMm}
	                    onChange={(event) =>
	                      updateProfessionalExportNumber(
	                        "safeMarginMm",
	                        Number(event.currentTarget.value)
	                      )
	                    }
	                    className="min-w-0 flex-1 bg-transparent text-right text-[9px] font-black outline-none"
	                  />
	                  mm
	                </label>
	                <label className="col-span-2 flex h-6 items-center gap-1 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase">
	                  JPG Q
	                  <input
	                    type="number"
	                    min={60}
	                    max={100}
	                    step={1}
	                    value={Math.round(exportSettings.jpegQuality * 100)}
	                    onChange={(event) =>
	                      updateProfessionalExportNumber(
	                        "jpegQuality",
	                        Number(event.currentTarget.value) / 100
	                      )
	                    }
	                    className="min-w-0 flex-1 bg-transparent text-right text-[9px] font-black outline-none"
	                  />
	                  %
	                </label>
	                <button
	                  type="button"
	                  onClick={() =>
	                    setExportSettings({
	                      cropMarksEnabled: !exportSettings.cropMarksEnabled,
	                      presetId: "custom"
	                    })
	                  }
	                  className={clsx(
	                    "col-span-2 h-6 border-2 border-ink px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
	                    exportSettings.cropMarksEnabled
	                      ? "bg-punch text-paper"
	                      : "bg-bone"
	                  )}
	                  title="Add crop marks outside the trim area in JPG/PDF exports"
	                >
	                  Crop marks {exportSettings.cropMarksEnabled ? "On" : "Off"}
	                </button>
	                <button
	                  type="button"
	                  onClick={() => applyActiveArtboardOrientation("landscape")}
                  className="h-6 border-2 border-ink bg-mineral px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Apply horizontal orientation to active canvas"
                >
                  H
                </button>
                <button
                  type="button"
                  onClick={() => applyActiveArtboardOrientation("portrait")}
                  className="h-6 border-2 border-ink bg-pollen px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Apply vertical orientation to active canvas"
                >
                  V
                </button>
                <button
                  type="button"
                  onClick={() => addArtboard(selectedFormat, "landscape")}
                  className="h-6 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Add horizontal canvas"
                >
                  +H
                </button>
                <button
                  type="button"
                  onClick={() => addArtboard(selectedFormat, "portrait")}
                  className="h-6 border-2 border-ink bg-paper px-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Add vertical canvas"
                >
                  +V
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
                <>
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
                  <button
                    type="button"
                    onClick={() =>
                      selectedObjectId &&
                      requestConvertSelectedTextToOutline(selectedObjectId)
                    }
                    className="col-span-2 h-9 border-2 border-ink bg-punch px-2 text-[9px] font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
                    title="Convierte el texto en contornos vectoriales editables"
                  >
                    Outline text
                  </button>
                </>
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
              <div className="col-span-8 grid grid-cols-4 gap-1 border-2 border-ink bg-bone p-1">
                <button
                  type="button"
                  onClick={() => moveLayers(selectedLayerActionIds, "front")}
                  disabled={!selectedLayersCanMoveFront}
                  className="h-7 border-2 border-ink bg-paper px-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Enviar la selección al frente"
                >
                  Front
                </button>
                <button
                  type="button"
                  onClick={() => moveLayers(selectedLayerActionIds, "up")}
                  disabled={!selectedLayersCanMoveUp}
                  className="h-7 border-2 border-ink bg-paper px-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Subir una posición"
                >
                  Up
                </button>
                <button
                  type="button"
                  onClick={() => moveLayers(selectedLayerActionIds, "down")}
                  disabled={!selectedLayersCanMoveDown}
                  className="h-7 border-2 border-ink bg-paper px-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Bajar una posición"
                >
                  Down
                </button>
                <button
                  type="button"
                  onClick={() => moveLayers(selectedLayerActionIds, "back")}
                  disabled={!selectedLayersCanMoveBack}
                  className="h-7 border-2 border-ink bg-paper px-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
                  title="Enviar la selección al fondo"
                >
                  Back
                </button>
              </div>
            </div>
          ) : (
            <p className="text-[9px] font-black uppercase text-ink/55">
              Select an object
            </p>
          )}
        </article>

        <article
          ref={layersPanelRef}
          className="grid min-h-0 grid-rows-[auto_auto_auto_minmax(0,1fr)] overflow-hidden border-2 border-ink bg-paper p-1.5 shadow-brutal-sm"
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

          <div
            className="mt-1 grid grid-cols-12 gap-1 border-2 border-ink bg-bone p-1"
            data-tour="layers-actions"
          >
            <button
              type="button"
              onClick={clearLayerSelection}
              className="col-span-2 border-2 border-ink bg-paper px-1 py-0.5 text-[8px] font-black uppercase transition hover:bg-pollen disabled:opacity-45"
              disabled={selectedLayerCount === 0}
              title="Clear layer selection"
            >
              {selectedLayerCount} selected
            </button>
            <LayerIconButton
              label="Duplicate selected layers"
              disabled={selectedLayerCount === 0}
              onClick={() => duplicateLayers(selectedLayerActionIds)}
            >
              <Copy size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Group selected layers"
              disabled={!canGroupLayers}
              onClick={() => groupLayers(selectedLayerActionIds)}
            >
              <GroupIcon size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Ungroup selected groups"
              disabled={!canUngroupLayers}
              onClick={() => ungroupLayers(selectedLayerActionIds)}
            >
              <Ungroup size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Toggle selected visibility"
              disabled={selectedLayerCount === 0}
              onClick={() => toggleLayersVisibility(selectedLayerActionIds)}
            >
              <EyeOff size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Toggle selected lock"
              disabled={selectedLayerCount === 0}
              onClick={() => toggleLayersLock(selectedLayerActionIds)}
            >
              <Lock size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Send selected layers to front"
              disabled={!selectedLayersCanMoveFront}
              onClick={() => moveLayers(selectedLayerActionIds, "front")}
            >
              <ChevronsUp size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Move selected layers up"
              disabled={!selectedLayersCanMoveUp}
              onClick={() => moveLayers(selectedLayerActionIds, "up")}
            >
              <ArrowUp size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Move selected layers down"
              disabled={!selectedLayersCanMoveDown}
              onClick={() => moveLayers(selectedLayerActionIds, "down")}
            >
              <ArrowDown size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Send selected layers to back"
              disabled={!selectedLayersCanMoveBack}
              onClick={() => moveLayers(selectedLayerActionIds, "back")}
            >
              <ChevronsDown size={13} />
            </LayerIconButton>
            <LayerIconButton
              label="Delete selected layers"
              disabled={selectedLayerCount === 0}
              onClick={() => deleteLayers(selectedLayerActionIds)}
              danger
            >
              <Trash2 size={13} />
            </LayerIconButton>
          </div>

          <div className="mt-1 min-h-0 space-y-1 overflow-auto pr-1">
            {layers.length === 0 ? (
              <p className="border-2 border-dashed border-ink/45 bg-bone p-1.5 text-[9px] font-bold uppercase text-ink/60">
                No layers yet
              </p>
            ) : (
              layers.map((layer) => (
                <div
                  key={layer.id}
                  onClick={(event) => handleLayerSelection(layer.id, event)}
                  className={clsx(
                    "cursor-pointer border-2 border-ink p-1 shadow-brutal-sm transition hover:-translate-y-0.5",
                    selectedLayerSet.has(layer.id) ? "bg-mineral" : "bg-bone",
                    !layer.visible && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        handleLayerSelection(layer.id, event);
                      }}
                      className="grid h-6 w-6 shrink-0 place-items-center border-2 border-ink bg-paper transition hover:-translate-y-0.5"
                      title="Select layer. Use Shift for range or Cmd/Ctrl for multi-select."
                    >
                      {selectedLayerSet.has(layer.id) ? (
                        <CheckSquare size={12} />
                      ) : (
                        <Square size={12} />
                      )}
                    </button>
                    <input
                      defaultValue={layer.name}
                      onClick={(event) => event.stopPropagation()}
                      onFocus={(event) => event.currentTarget.select()}
                      onBlur={(event) =>
                        renameLayer(layer.id, event.currentTarget.value)
                      }
                      onKeyDown={(event) => {
                        if (event.key === "Enter") {
                          event.currentTarget.blur();
                        }

                        if (event.key === "Escape") {
                          event.currentTarget.value = layer.name;
                          event.currentTarget.blur();
                        }
                      }}
                      title="Rename layer. Enter saves, Escape cancels."
                      className="min-w-0 flex-1 border-2 border-ink bg-paper px-1 py-0 text-[9px] font-black outline-none focus:bg-pollen"
                      aria-label={`Rename ${layer.name}`}
                    />
                    <span className="shrink-0 text-[9px] font-black uppercase text-ink/65">
                      {layer.type}
                    </span>
                  </div>

                  <div className="mt-1 grid grid-cols-8 gap-1">
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
                      label="Duplicate layer"
                      onClick={() => duplicateLayers([layer.id])}
                    >
                      <Copy size={14} />
                    </LayerIconButton>
                    <LayerIconButton
                      label="Send layer to front"
                      disabled={
                        activeCanvasObjects.findIndex(
                          (object) => object.id === layer.id
                        ) ===
                        activeCanvasObjects.length - 1
                      }
                      onClick={() => moveLayer(layer.id, "front")}
                    >
                      <ChevronsUp size={14} />
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
                      label="Send layer to back"
                      disabled={
                        activeCanvasObjects.findIndex(
                          (object) => object.id === layer.id
                        ) === 0
                      }
                      onClick={() => moveLayer(layer.id, "back")}
                    >
                      <ChevronsDown size={14} />
                    </LayerIconButton>
                    <LayerIconButton
                      label="Delete layer"
                      onClick={() => deleteLayer(layer.id)}
                      danger
                    >
                      <Trash2 size={14} />
                    </LayerIconButton>
                  </div>

                  {selectedLayerCount <= 1 &&
                  selectedObjectId === layer.id &&
                  selectedObjectProperties ? (
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
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
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

function getCanvasFormatPreview(
  format: (typeof canvasFormats)[number],
  dpi: number,
  activeArtboard?: { width: number; height: number } | null,
  isCustom = false,
  orientation: "landscape" | "portrait" = "portrait"
) {
  if (isCustom && activeArtboard) {
    const widthCm = ((activeArtboard.width / dpi) * 2.54).toFixed(2);
    const heightCm = ((activeArtboard.height / dpi) * 2.54).toFixed(2);

    return `Custom · ${activeArtboard.width} x ${activeArtboard.height} px · ${widthCm} x ${heightCm} cm @ ${dpi} PPP`;
  }

  const dimensions = getFormatPixels(format, orientation, dpi);
  const physicalWidth = orientation === "landscape"
    ? Math.max(format.widthMm ?? 0, format.heightMm ?? 0)
    : Math.min(format.widthMm ?? 0, format.heightMm ?? 0);
  const physicalHeight = orientation === "landscape"
    ? Math.min(format.widthMm ?? 0, format.heightMm ?? 0)
    : Math.max(format.widthMm ?? 0, format.heightMm ?? 0);
  const physical = format.widthMm && format.heightMm
    ? `${physicalWidth} x ${physicalHeight} mm`
    : "Custom px";

  return `${physical} · ${dimensions.width} x ${dimensions.height} px @ ${dpi} PPP`;
}

function getMatchingCanvasFormatId(
  artboard: { formatId: string; orientation: "landscape" | "portrait"; width: number; height: number },
  dpi: number
) {
  const exactFormat = canvasFormats.find((format) => format.id === artboard.formatId);

  if (exactFormat) {
    return exactFormat.id;
  }

  const match = canvasFormats.find((format) => {
    const dimensions = getFormatPixels(format, artboard.orientation, dpi);

    return (
      Math.abs(dimensions.width - artboard.width) <= 2 &&
      Math.abs(dimensions.height - artboard.height) <= 2
    );
  });

  return match?.id ?? "custom";
}

function millimetersToPixels(millimeters: number, dpi: number) {
  return Math.round((millimeters / 25.4) * dpi);
}
