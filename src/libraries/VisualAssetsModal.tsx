import {
  ChevronLeft,
  ChevronRight,
  Images,
  Palette,
  Upload,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";
import { useEditorStore } from "../store/editorStore";
import type { VisualAsset, VisualAssetCategory } from "../types/editor";
import { clsx } from "../utils/clsx";

const visualAssetCategories: Array<{
  accent: string;
  code: string;
  description: string;
  id: VisualAssetCategory;
  importHint: string;
  label: string;
}> = [
  {
    accent: "#FF7A1A",
    code: "CMP",
    description: "Sets visuales y referencias para crear o reutilizar composiciones.",
    id: "compositions",
    importHint: "Guarda referencias o renders de composiciones para reutilizarlas.",
    label: "Composiciones"
  },
  {
    accent: "#0068C0",
    code: "PIG",
    description: "Imagenes de cartas de color, muestras y pigmentos base.",
    id: "pigments",
    importHint: "Extrae colores desde imagenes y aplicalos como pigmentos.",
    label: "Pigmentos"
  },
  {
    accent: "#00A676",
    code: "MIX",
    description: "Pruebas y mezclas de color para construir paletas propias.",
    id: "pigment-mixes",
    importHint: "Crea mezclas a partir de colores extraidos.",
    label: "Mezcla pigmentos"
  },
  {
    accent: "#FFE900",
    code: "PAL",
    description: "Paletas extraidas desde imagenes o creadas como combinaciones propias.",
    id: "color-palettes",
    importHint: "Usa swatches clicables para pintar el objeto seleccionado.",
    label: "Paletas"
  },
  {
    accent: "#E9468A",
    code: "TEX",
    description: "Tramas, acabados, papeles, ruido visual y patrones de referencia.",
    id: "textures",
    importHint: "Importa texturas como imagen o referencia visual en el lienzo.",
    label: "Texturas"
  },
  {
    accent: "#101010",
    code: "FIN",
    description: "Obras finales, exports y piezas cerradas para revisar o reutilizar.",
    id: "final-works",
    importHint: "Revisa exports JPG guardados y reimportalos si necesitas montar pruebas.",
    label: "Obras finales"
  }
];

type VisualAssetsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function VisualAssetsModal({ isOpen, onClose }: VisualAssetsModalProps) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const folderInputRef = useRef<HTMLInputElement | null>(null);
  const [activeCategory, setActiveCategory] =
    useState<VisualAssetCategory>("compositions");
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(null);
  const [status, setStatus] = useState("");
  const visualAssets = useEditorStore((state) => state.visualAssets);
  const visualAssetsLoaded = useEditorStore((state) => state.visualAssetsLoaded);
  const loadVisualAssets = useEditorStore((state) => state.loadVisualAssets);
  const addVisualAsset = useEditorStore((state) => state.addVisualAsset);
  const deleteVisualAsset = useEditorStore((state) => state.deleteVisualAsset);
  const requestApplyPigment = useEditorStore((state) => state.requestApplyPigment);
  const requestAddVisualAssetToCanvas = useEditorStore(
    (state) => state.requestAddVisualAssetToCanvas
  );
  const activeCategoryMeta =
    visualAssetCategories.find((category) => category.id === activeCategory) ??
    visualAssetCategories[0];
  const filteredAssets = visualAssets.filter(
    (asset) => asset.category === activeCategory
  );
  const selectedAsset =
    filteredAssets.find((asset) => asset.id === selectedAssetId) ??
    filteredAssets[0] ??
    null;
  const selectedAssetIndex = selectedAsset
    ? filteredAssets.findIndex((asset) => asset.id === selectedAsset.id)
    : -1;
  const categoryCounts = visualAssetCategories.reduce<Record<VisualAssetCategory, number>>(
    (counts, category) => {
      counts[category.id] = visualAssets.filter(
        (asset) => asset.category === category.id
      ).length;
      return counts;
    },
    {
      compositions: 0,
      "color-palettes": 0,
      "final-works": 0,
      "pigment-mixes": 0,
      pigments: 0,
      textures: 0
    }
  );

  useEffect(() => {
    if (isOpen && !visualAssetsLoaded) {
      void loadVisualAssets().catch(() => {
        setStatus("No se pudo cargar la biblioteca desde IndexedDB.");
      });
    }
  }, [isOpen, loadVisualAssets, visualAssetsLoaded]);

  useEffect(() => {
    if (filteredAssets.length === 0) {
      setSelectedAssetId(null);
      return;
    }

    if (!selectedAssetId || !filteredAssets.some((asset) => asset.id === selectedAssetId)) {
      setSelectedAssetId(filteredAssets[0].id);
    }
  }, [activeCategory, filteredAssets, selectedAssetId]);

  if (!isOpen) {
    return null;
  }

  const handleFileImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.currentTarget.files ?? []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length === 0) {
      event.currentTarget.value = "";
      setStatus("No se han encontrado imagenes validas.");
      return;
    }

    const importedAssets = await Promise.all(
      files.map((file) => createVisualAssetFromFile(file, activeCategory))
    );

    importedAssets.forEach(addVisualAsset);
    setSelectedAssetId(importedAssets[0]?.id ?? null);
    event.currentTarget.value = "";
    setStatus(`${importedAssets.length} elementos importados en ${activeCategoryMeta.label}.`);
  };

  const handleUseAsset = (asset: VisualAsset) => {
    requestAddVisualAssetToCanvas(asset);
    setStatus(`${asset.name} enviada al lienzo activo.`);
  };

  const handleApplyPaletteColor = (asset: VisualAsset, color: string) => {
    requestApplyPigment({
      color,
      id: `visual-${asset.id}-${color}`,
      label: `${asset.name} ${color}`
    });
    setStatus(`${color} aplicado al objeto seleccionado.`);
  };

  const handleDeleteAsset = (asset: VisualAsset) => {
    if (!window.confirm(`Eliminar "${asset.name}" de esta biblioteca local?`)) {
      return;
    }

    deleteVisualAsset(asset.id);
    if (asset.id === selectedAssetId) {
      const remainingAssets = filteredAssets.filter((item) => item.id !== asset.id);
      setSelectedAssetId(remainingAssets[0]?.id ?? null);
    }
    setStatus(`${asset.name} eliminada.`);
  };

  const handleSaveExtractedPalette = (asset: VisualAsset) => {
    const palette = asset.palette ?? [];

    if (palette.length === 0) {
      setStatus("Esta imagen todavia no tiene colores extraidos.");
      return;
    }

    const paletteAsset = createPaletteVisualAsset({
      category: "color-palettes",
      colors: palette,
      kind: "palette",
      name: `Paleta - ${asset.name}`,
      sourceAssetId: asset.id
    });

    addVisualAsset(paletteAsset);
    setActiveCategory("color-palettes");
    setSelectedAssetId(paletteAsset.id);
    setStatus("Paleta guardada en la carpeta Paletas.");
  };

  const handleSavePigmentMix = (asset: VisualAsset) => {
    const palette = asset.palette ?? [];

    if (palette.length < 2) {
      setStatus("Necesitamos al menos dos colores para crear una mezcla.");
      return;
    }

    const mixAsset = createPaletteVisualAsset({
      category: "pigment-mixes",
      colors: createPigmentMixPalette(palette),
      kind: "mix",
      name: `Mezcla - ${asset.name}`,
      sourceAssetId: asset.id
    });

    addVisualAsset(mixAsset);
    setActiveCategory("pigment-mixes");
    setSelectedAssetId(mixAsset.id);
    setStatus("Mezcla de pigmentos guardada.");
  };

  const moveSelection = (direction: "next" | "previous") => {
    if (filteredAssets.length === 0) {
      return;
    }

    const currentIndex = Math.max(0, selectedAssetIndex);
    const nextIndex =
      direction === "next"
        ? (currentIndex + 1) % filteredAssets.length
        : (currentIndex - 1 + filteredAssets.length) % filteredAssets.length;

    setSelectedAssetId(filteredAssets[nextIndex].id);
  };

  return (
    <section
      className="fixed inset-0 z-50 grid grid-rows-[auto_1fr] bg-paper text-ink"
      role="dialog"
      aria-modal="true"
      aria-label="Visual asset library"
    >
      <header className="flex items-center gap-3 border-b-2 border-ink bg-pollen px-4 py-3">
        <div className="grid h-10 w-10 place-items-center border-2 border-ink bg-mineral shadow-brutal-sm">
          <Images size={20} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display text-xl font-black uppercase leading-none">
            Biblioteca visual
          </h2>
          <p className="text-[11px] font-black uppercase text-ink/70">
            Mini-Bridge local: carpetas, preview, carrete e importacion directa
          </p>
        </div>
        <div className="ml-auto hidden border-2 border-ink bg-paper px-3 py-2 text-[10px] font-black uppercase shadow-brutal-sm md:block">
          IndexedDB · {visualAssets.length} assets
        </div>
        <button
          type="button"
          onClick={onClose}
          className="grid h-9 w-9 place-items-center border-2 border-ink bg-punch text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Cerrar biblioteca visual"
        >
          <X size={18} />
        </button>
      </header>

      <div className="grid min-h-0 grid-cols-[300px_minmax(0,1fr)]">
        <aside className="grid min-h-0 grid-rows-[auto_1fr_auto] border-r-2 border-ink bg-bone">
          <div className="border-b-2 border-ink bg-paper p-3">
            <p className="text-[10px] font-black uppercase text-ink/60">
              Carpetas de trabajo
            </p>
            <p className="mt-1 text-xs font-black uppercase">
              Selecciona una categoria para navegar su carrete.
            </p>
          </div>

          <div className="min-h-0 overflow-y-auto p-3">
            <div className="grid gap-2">
              {visualAssetCategories.map((category) => (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category.id);
                    setStatus("");
                  }}
                  className={clsx(
                    "group grid grid-cols-[44px_minmax(0,1fr)_auto] items-center gap-2 border-2 border-ink p-2 text-left shadow-brutal-sm transition hover:-translate-y-0.5",
                    activeCategory === category.id ? "bg-mineral" : "bg-paper"
                  )}
                >
                  <span
                    className="grid h-10 w-10 place-items-center border-2 border-ink text-[10px] font-black uppercase"
                    style={{ backgroundColor: category.accent }}
                  >
                    {category.code}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-xs font-black uppercase">
                      {category.label}
                    </span>
                    <span className="mt-1 block truncate text-[9px] font-bold uppercase text-ink/60">
                      {category.importHint}
                    </span>
                  </span>
                  <span className="border-2 border-ink bg-pollen px-1.5 py-0.5 text-[10px] font-black">
                    {categoryCounts[category.id]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="border-t-2 border-ink bg-paper p-3 text-[10px] font-black uppercase">
            <p>{activeCategoryMeta.description}</p>
            <p className="mt-2 text-ink/60">
              Las imagenes grandes viven en IndexedDB, no en localStorage.
            </p>
          </div>
        </aside>

        <main className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)_156px] overflow-hidden p-4">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileImport}
          />
          <input
            ref={folderInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileImport}
            {...({ webkitdirectory: "", directory: "" } as Record<string, string>)}
          />

          <div className="flex flex-wrap items-center gap-2 border-2 border-ink bg-bone p-2 shadow-brutal-sm">
            <div>
              <h3 className="font-display text-lg font-black uppercase leading-none">
                {activeCategoryMeta.label}
              </h3>
              <p className="text-[11px] font-black uppercase text-ink/60">
                {filteredAssets.length} elementos disponibles
              </p>
            </div>
            {selectedAsset ? (
              <div className="border-2 border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase shadow-brutal-sm">
                {selectedAssetIndex + 1} / {filteredAssets.length} ·{" "}
                {selectedAsset.name}
              </div>
            ) : null}
            <button
              type="button"
              onClick={() => selectedAsset && handleUseAsset(selectedAsset)}
              disabled={!selectedAsset}
              className="border-2 border-ink bg-punch px-3 py-2 text-[10px] font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45"
            >
              Importar al lienzo
            </button>
            {selectedAsset?.palette?.[0] ? (
              <button
                type="button"
                onClick={() => handleApplyPaletteColor(selectedAsset, selectedAsset.palette?.[0] ?? "#101010")}
                className="border-2 border-ink bg-mineral px-3 py-2 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
              >
                Aplicar color
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="ml-auto flex h-9 items-center gap-2 border-2 border-ink bg-pollen px-3 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
            >
              <Upload size={14} />
              Importar imagenes
            </button>
            <button
              type="button"
              onClick={() => folderInputRef.current?.click()}
              className="flex h-9 items-center gap-2 border-2 border-ink bg-paper px-3 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
            >
              <Upload size={14} />
              Importar carpeta
            </button>
          </div>

          {status ? (
            <div className="mt-3 border-2 border-ink bg-pollen px-3 py-2 text-[11px] font-black uppercase shadow-brutal-sm">
              {status}
            </div>
          ) : null}

          {filteredAssets.length === 0 ? (
            <div className="mt-4 grid min-h-0 place-items-center border-2 border-dashed border-ink bg-bone p-8 text-center">
              <div>
                <Images className="mx-auto mb-3" size={42} />
                <p className="font-display text-lg font-black uppercase">
                  No hay elementos todavia
                </p>
                <p className="mt-1 max-w-md text-xs font-black uppercase text-ink/60">
                  Importa imagenes, extrae paletas o crea mezclas para empezar a poblar esta categoria.
                </p>
              </div>
            </div>
          ) : (
            <>
              <section className="mt-4 grid min-h-0 grid-cols-[44px_minmax(0,1fr)_44px_260px] gap-3 overflow-hidden">
                <button
                  type="button"
                  onClick={() => moveSelection("previous")}
                  className="grid place-items-center border-2 border-ink bg-paper shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Imagen anterior"
                >
                  <ChevronLeft size={22} />
                </button>

                <div className="grid min-h-0 place-items-center overflow-hidden border-2 border-ink bg-neutral-950 p-4 shadow-brutal-sm">
                  {selectedAsset ? (
                    <img
                      src={selectedAsset.dataUrl}
                      alt={selectedAsset.name}
                      className="max-h-full max-w-full object-contain"
                    />
                  ) : null}
                </div>

                <button
                  type="button"
                  onClick={() => moveSelection("next")}
                  className="grid place-items-center border-2 border-ink bg-paper shadow-brutal-sm transition hover:-translate-y-0.5"
                  title="Imagen siguiente"
                >
                  <ChevronRight size={22} />
                </button>

                <aside className="min-h-0 overflow-y-auto border-2 border-ink bg-bone p-3 shadow-brutal-sm">
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-xs font-black uppercase">Preview</h4>
                    <span
                      className="border-2 border-ink px-1.5 py-0.5 text-[9px] font-black uppercase"
                      style={{ backgroundColor: activeCategoryMeta.accent }}
                    >
                      {activeCategoryMeta.code}
                    </span>
                  </div>
                  {selectedAsset ? (
                    <>
                      <p className="mt-2 break-words text-[11px] font-black uppercase">
                        {selectedAsset.name}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase text-ink/60">
                        {getAssetKindLabel(selectedAsset)} · {selectedAsset.mimeType.replace("image/", "")}
                      </p>
                      <p className="mt-1 text-[10px] font-black uppercase text-ink/60">
                        {new Date(selectedAsset.createdAt).toLocaleDateString()}
                      </p>
                      {selectedAsset.palette?.length ? (
                        <div className="mt-3">
                          <div className="mb-1 flex items-center gap-1 text-[10px] font-black uppercase">
                            <Palette size={12} />
                            Colores utilizables
                          </div>
                          <div className="grid grid-cols-4 gap-1">
                            {selectedAsset.palette.map((color) => (
                              <button
                                key={color}
                                type="button"
                                onClick={() => handleApplyPaletteColor(selectedAsset, color)}
                                className="h-8 border-2 border-ink shadow-brutal-sm transition hover:-translate-y-0.5"
                                style={{ backgroundColor: color }}
                                title={`Aplicar ${color}`}
                              />
                            ))}
                          </div>
                          <p className="mt-1 break-words text-[9px] font-black uppercase text-ink/60">
                            Click en un color para aplicarlo al objeto seleccionado.
                          </p>
                        </div>
                      ) : null}
                      <div className="mt-4 grid gap-2">
                        <button
                          type="button"
                          onClick={() => handleUseAsset(selectedAsset)}
                          className="border-2 border-ink bg-punch px-2 py-2 text-[10px] font-black uppercase text-paper shadow-brutal-sm transition hover:-translate-y-0.5"
                        >
                          Importar al lienzo
                        </button>
                        {selectedAsset.palette?.length ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleSaveExtractedPalette(selectedAsset)}
                              className="border-2 border-ink bg-pollen px-2 py-2 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                            >
                              Guardar paleta
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSavePigmentMix(selectedAsset)}
                              className="border-2 border-ink bg-mineral px-2 py-2 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
                            >
                              Crear mezcla
                            </button>
                          </>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => handleDeleteAsset(selectedAsset)}
                          className="border-2 border-ink bg-paper px-2 py-2 text-[10px] font-black uppercase text-punch shadow-brutal-sm transition hover:-translate-y-0.5"
                        >
                          Borrar de esta carpeta
                        </button>
                      </div>
                    </>
                  ) : null}
                </aside>
              </section>

              <section className="mt-3 min-h-0 border-2 border-ink bg-bone p-2 shadow-brutal-sm">
                <div className="mb-2 flex items-center justify-between">
                  <h4 className="text-[10px] font-black uppercase">
                    Carrete de {activeCategoryMeta.label}
                  </h4>
                  <p className="text-[9px] font-black uppercase text-ink/60">
                    Click para previsualizar · doble click para importar
                  </p>
                </div>
                <div className="flex h-[104px] gap-2 overflow-x-auto pb-1">
                  {filteredAssets.map((asset) => (
                    <button
                      key={asset.id}
                      type="button"
                      onClick={() => setSelectedAssetId(asset.id)}
                      onDoubleClick={() => handleUseAsset(asset)}
                      className={clsx(
                        "h-24 w-28 shrink-0 border-2 p-1 shadow-brutal-sm transition hover:-translate-y-0.5",
                        selectedAsset?.id === asset.id
                          ? "border-punch bg-mineral"
                          : "border-ink bg-paper"
                      )}
                      title={asset.name}
                    >
                      <img
                        src={asset.dataUrl}
                        alt={asset.name}
                        className="h-16 w-full border-2 border-ink bg-bone object-cover"
                      />
                      <span className="mt-1 block truncate text-[8px] font-black uppercase">
                        {asset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            </>
          )}
        </main>
      </div>
    </section>
  );
}

async function createVisualAssetFromFile(
  file: File,
  category: VisualAssetCategory
): Promise<VisualAsset> {
  const dataUrl = await readFileAsDataUrl(file);
  const palette = await extractPaletteFromImage(dataUrl).catch(() => []);

  return {
    id: crypto.randomUUID(),
    category,
    createdAt: new Date().toISOString(),
    dataUrl,
    kind: "image",
    mimeType: file.type || "image/png",
    name: file.name,
    palette
  };
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error(`Could not read ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function createPaletteVisualAsset({
  category,
  colors,
  kind,
  name,
  sourceAssetId
}: {
  category: VisualAssetCategory;
  colors: string[];
  kind: "palette" | "mix";
  name: string;
  sourceAssetId?: string;
}): VisualAsset {
  return {
    id: crypto.randomUUID(),
    category,
    createdAt: new Date().toISOString(),
    dataUrl: createPaletteSvgDataUrl(colors, name),
    kind,
    mimeType: "image/svg+xml",
    name,
    palette: colors,
    sourceAssetId
  };
}

function createPigmentMixPalette(colors: string[]) {
  const mixColors: string[] = [];

  colors.forEach((color, index) => {
    const nextColor = colors[(index + 1) % colors.length];

    mixColors.push(color);
    if (nextColor) {
      mixColors.push(mixHexColors(color, nextColor));
    }
  });

  return uniqueColors(mixColors).slice(0, 10);
}

function getAssetKindLabel(asset: VisualAsset) {
  if (asset.kind === "palette") {
    return "Paleta";
  }

  if (asset.kind === "mix") {
    return "Mezcla";
  }

  return "Imagen";
}

function createPaletteSvgDataUrl(colors: string[], title: string) {
  const safeTitle = escapeSvgText(title);
  const swatchWidth = 96;
  const width = Math.max(1, colors.length) * swatchWidth;
  const height = 140;
  const swatches = colors
    .map(
      (color, index) => `
        <rect x="${index * swatchWidth}" y="0" width="${swatchWidth}" height="96" fill="${color}" />
        <text x="${index * swatchWidth + 8}" y="118" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="#111">${color}</text>
      `
    )
    .join("");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <rect width="100%" height="100%" fill="#F7E7B7" />
      ${swatches}
      <text x="8" y="136" font-family="Arial, sans-serif" font-size="10" font-weight="900" fill="#111">${safeTitle}</text>
    </svg>
  `;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

async function extractPaletteFromImage(dataUrl: string, maxColors = 8) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d", { willReadFrequently: true });

  if (!context) {
    return [];
  }

  const maxSize = 96;
  const ratio = Math.min(maxSize / image.width, maxSize / image.height, 1);
  canvas.width = Math.max(1, Math.round(image.width * ratio));
  canvas.height = Math.max(1, Math.round(image.height * ratio));
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
  const counts = new Map<string, number>();

  for (let index = 0; index < pixels.length; index += 16) {
    const alpha = pixels[index + 3] ?? 255;

    if (alpha < 128) {
      continue;
    }

    const color = rgbToHex(
      quantizeColor(pixels[index] ?? 0),
      quantizeColor(pixels[index + 1] ?? 0),
      quantizeColor(pixels[index + 2] ?? 0)
    );

    counts.set(color, (counts.get(color) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .sort((firstEntry, secondEntry) => secondEntry[1] - firstEntry[1])
    .map(([color]) => color)
    .slice(0, maxColors);
}

function loadImage(dataUrl: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();

    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not extract palette."));
    image.src = dataUrl;
  });
}

function quantizeColor(value: number) {
  return Math.min(255, Math.max(0, Math.round(value / 24) * 24));
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("")
    .toUpperCase()}`;
}

function mixHexColors(firstColor: string, secondColor: string) {
  const firstRgb = hexToRgb(firstColor);
  const secondRgb = hexToRgb(secondColor);

  return rgbToHex(
    Math.round((firstRgb.red + secondRgb.red) / 2),
    Math.round((firstRgb.green + secondRgb.green) / 2),
    Math.round((firstRgb.blue + secondRgb.blue) / 2)
  );
}

function hexToRgb(color: string) {
  const hex = color.replace("#", "");

  return {
    red: Number.parseInt(hex.slice(0, 2), 16),
    green: Number.parseInt(hex.slice(2, 4), 16),
    blue: Number.parseInt(hex.slice(4, 6), 16)
  };
}

function uniqueColors(colors: string[]) {
  return Array.from(new Set(colors));
}

function escapeSvgText(text: string) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
