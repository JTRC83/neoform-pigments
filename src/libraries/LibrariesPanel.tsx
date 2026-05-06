import { useRef, useState } from "react";
import type { ChangeEvent, ReactNode } from "react";
import {
  ArrowDown,
  ArrowUp,
  Blocks,
  Download,
  Library,
  PaintBucket,
  RefreshCw,
  Shapes,
  Sparkles,
  Trash2,
  Upload
} from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import type { CanvasObjectType } from "../types/editor";
import type {
  CompositionPreset,
  LibraryTab,
  SavedComposition,
  TexturePreset
} from "../types/library";
import { clsx } from "../utils/clsx";
import {
  compositionPresets,
  formPresets,
  pigmentSwatches,
  texturePresets
} from "./libraryAssets";
import { libraryTabs } from "./libraryRegistry";

export function LibrariesPanel() {
  const compositionImportInputRef = useRef<HTMLInputElement | null>(null);
  const [activeTab, setActiveTab] = useState<LibraryTab["id"]>("forms");
  const [compositionImportMessage, setCompositionImportMessage] = useState("");
  const selectedObjectId = useEditorStore((state) => state.selectedObjectId);
  const requestAddLibraryForm = useEditorStore(
    (state) => state.requestAddLibraryForm
  );
  const requestApplyPigment = useEditorStore(
    (state) => state.requestApplyPigment
  );
  const requestApplyTexture = useEditorStore(
    (state) => state.requestApplyTexture
  );
  const requestAddComposition = useEditorStore(
    (state) => state.requestAddComposition
  );
  const requestSaveSelectionAsComposition = useEditorStore(
    (state) => state.requestSaveSelectionAsComposition
  );
  const requestUpdateCompositionFromSelection = useEditorStore(
    (state) => state.requestUpdateCompositionFromSelection
  );
  const userCompositions = useEditorStore((state) => state.userCompositions);
  const renameUserComposition = useEditorStore(
    (state) => state.renameUserComposition
  );
  const deleteUserComposition = useEditorStore(
    (state) => state.deleteUserComposition
  );
  const moveUserComposition = useEditorStore(
    (state) => state.moveUserComposition
  );
  const importUserCompositions = useEditorStore(
    (state) => state.importUserCompositions
  );
  const compositions: CompositionPreset[] = [
    ...compositionPresets,
    ...userCompositions
  ];
  const gradientTextures = texturePresets.filter(isGradientTexture);
  const bauhausTextures = texturePresets.filter((texture) => texture.group === "bauhaus");
  const popArtTextures = texturePresets.filter((texture) => texture.group === "popArt");
  const serigraphyTextures = texturePresets.filter(
    (texture) => texture.group === "serigraphy"
  );
  const utilityTextures = texturePresets.filter(
    (texture) => texture.group === "utility" || (!isGradientTexture(texture) && !texture.group)
  );
  const handleCompositionImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const parsed = JSON.parse(await file.text()) as unknown;
      const importedCompositions = parseCompositionImportFile(parsed);

      if (importedCompositions.length === 0) {
        setCompositionImportMessage("No valid compositions found.");
        return;
      }

      importUserCompositions(importedCompositions);
      setCompositionImportMessage(
        `${importedCompositions.length} composition${importedCompositions.length === 1 ? "" : "s"} imported.`
      );
    } catch {
      setCompositionImportMessage("Import failed. Use a valid JSON file.");
    } finally {
      event.currentTarget.value = "";
    }
  };
  const exportAllCompositions = () => {
    if (userCompositions.length === 0) {
      setCompositionImportMessage("No saved compositions to export.");
      return;
    }

    downloadCompositionLibraryFile(
      "neoform-compositions.json",
      userCompositions
    );
    setCompositionImportMessage(`${userCompositions.length} compositions exported.`);
  };

  return (
    <section className="min-h-0 overflow-hidden bg-paper" data-tour="libraries">
      <div className="flex h-8 items-center gap-2 border-b-2 border-ink bg-punch px-2 text-paper">
        <Library size={13} />
        <h2 className="text-xs font-black uppercase">
          Libraries
        </h2>
      </div>

      <div className="grid grid-cols-4 border-b-2 border-ink" data-tour="library-tabs">
        {libraryTabs.map((library) => (
          <button
            key={library.id}
            type="button"
            onClick={() => setActiveTab(library.id)}
            className={clsx(
              "border-r-2 border-ink px-1.5 py-1 text-left text-[9px] font-black uppercase leading-none last:border-r-0",
              activeTab === library.id ? "bg-pollen text-ink" : "bg-bone"
            )}
          >
            <span
              className="mb-1 block h-3 w-3 border-2 border-ink"
              style={{ backgroundColor: library.swatch }}
            />
            {library.label}
          </button>
        ))}
      </div>

      <div className="h-[calc(100%-4.5rem)] overflow-auto p-2">
        {activeTab === "forms" ? (
          <div className="grid grid-cols-3 gap-1.5">
            {formPresets.map((form) => (
              <button
                key={form.id}
                type="button"
                onClick={() => requestAddLibraryForm(form)}
                className="border-2 border-ink bg-bone p-1.5 text-left shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-pollen"
              >
                <span
                  className={clsx(
                    "mb-1 grid h-8 w-full place-items-center border-2 border-ink bg-paper",
                    form.type === "ellipse" && "rounded-full"
                  )}
                >
                  <ShapePreview fill={form.fill} type={form.type} />
                </span>
                <span className="flex items-center gap-1 text-[8px] font-black uppercase leading-none">
                  <Shapes size={10} />
                  {form.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "pigments" ? (
          <div className="grid grid-cols-3 gap-2">
            {pigmentSwatches.map((pigment) => (
              <button
                key={pigment.id}
                type="button"
                disabled={!selectedObjectId}
                onClick={() => requestApplyPigment(pigment)}
                className="border-2 border-ink bg-bone p-2 text-left shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0"
              >
                <span
                  className="mb-1 block h-8 w-full border-2 border-ink"
                  style={{
                    backgroundColor:
                      pigment.color === "transparent" ? "#E8E0C0" : pigment.color,
                    backgroundImage:
                      pigment.color === "transparent"
                        ? "linear-gradient(45deg, rgba(16,16,16,0.18) 25%, transparent 25%, transparent 50%, rgba(16,16,16,0.18) 50%, rgba(16,16,16,0.18) 75%, transparent 75%, transparent)"
                        : undefined,
                    backgroundSize:
                      pigment.color === "transparent" ? "12px 12px" : undefined
                  }}
                />
                <span className="flex items-center gap-1 text-[9px] font-black uppercase leading-none">
                  <PaintBucket size={10} />
                  {pigment.label}
                </span>
              </button>
            ))}
          </div>
        ) : null}

        {activeTab === "textures" ? (
          <div className="space-y-2">
            <div
              className="border-2 border-ink bg-bone p-2 text-[9px] font-black uppercase leading-tight shadow-brutal-sm"
              data-tour="textures-vector-note"
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span>Texture type</span>
                <span className="bg-punch px-1 text-paper">Vector vs Raster</span>
              </div>
              <p className="text-[8px] leading-snug text-ink/75">
                These tiles are SVG/vector patterns for objects. Analog film grain is a
                raster finish for final JPG/package exports and lives in the left sidebar.
              </p>
            </div>
            <TextureGroup
              featured
              title="Degradados / Gradients"
              textures={gradientTextures}
              selectedObjectId={selectedObjectId}
              onApply={requestApplyTexture}
            />
            <TextureGroup
              title="Bauhaus vector"
              textures={bauhausTextures}
              selectedObjectId={selectedObjectId}
              onApply={requestApplyTexture}
            />
            <TextureGroup
              title="Pop Art vector"
              textures={popArtTextures}
              selectedObjectId={selectedObjectId}
              onApply={requestApplyTexture}
            />
            <TextureGroup
              title="Serigrafía vector"
              textures={serigraphyTextures}
              selectedObjectId={selectedObjectId}
              onApply={requestApplyTexture}
            />
            <TextureGroup
              title="Utility vector"
              textures={utilityTextures}
              selectedObjectId={selectedObjectId}
              onApply={requestApplyTexture}
            />
          </div>
        ) : null}

        {activeTab === "compositions" ? (
          <div className="space-y-2">
            <div className="grid grid-cols-3 gap-1.5">
              <button
                type="button"
                onClick={requestSaveSelectionAsComposition}
                className="col-span-3 flex w-full items-center justify-between gap-2 border-2 border-ink bg-pollen px-2 py-1.5 text-left text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-mineral"
                data-tour="compositions-save"
              >
                <span>Save selected figures</span>
                <Blocks size={12} />
              </button>
              <button
                type="button"
                onClick={exportAllCompositions}
                className="flex items-center justify-center gap-1 border-2 border-ink bg-bone px-1 py-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-pollen"
              >
                <Download size={11} />
                Export all
              </button>
              <button
                type="button"
                onClick={() => compositionImportInputRef.current?.click()}
                className="flex items-center justify-center gap-1 border-2 border-ink bg-bone px-1 py-1 text-[8px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-pollen"
              >
                <Upload size={11} />
                Import
              </button>
              <span className="border-2 border-ink bg-paper px-1 py-1 text-center text-[8px] font-black uppercase">
                {userCompositions.length} own
              </span>
              <input
                ref={compositionImportInputRef}
                type="file"
                accept="application/json,.json"
                onChange={handleCompositionImport}
                className="hidden"
              />
            </div>
            {compositionImportMessage ? (
              <p className="border-2 border-ink bg-paper p-1 text-[8px] font-black uppercase leading-tight text-ink/70">
                {compositionImportMessage}
              </p>
            ) : null}
            {compositions.length === 0 ? (
              <p className="border-2 border-dashed border-ink bg-bone p-2 text-[9px] font-black uppercase leading-tight text-ink/65">
                No saved compositions yet. Select figures on the canvas and save
                them here when the app is ready.
              </p>
            ) : null}
            <div className="grid grid-cols-2 gap-2">
              {compositions.map((composition) => (
                <article
                  key={composition.id}
                  onClick={() => requestAddComposition(composition)}
                  className={clsx(
                    "cursor-pointer border-2 border-ink p-2 text-left shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-pollen",
                    composition.source === "saved" ? "bg-mineral" : "bg-bone"
                  )}
                >
                  <span className="relative mb-1 block h-10 border-2 border-ink bg-paper">
                    {composition.items?.map((item, index) => (
                      <span
                        key={`${composition.id}-${index}`}
                        className="absolute grid h-7 w-7 place-items-center"
                        style={{
                          left: `${50 + item.offsetX / 4}%`,
                          top: `${50 + item.offsetY / 4}%`,
                          transform: `translate(-50%, -50%) scale(${item.scale})`
                        }}
                      >
                        <ShapePreview compact fill={item.fill} type={item.type} />
                      </span>
                    )) ?? (
                      <SavedCompositionPreview
                        count={composition.objects?.length ?? 0}
                      />
                    )}
                  </span>
                  <span className="flex items-center gap-1 text-[9px] font-black uppercase leading-none">
                    <Blocks size={11} />
                    {composition.source === "saved" ? (
                      <input
                        defaultValue={composition.label}
                        onClick={(event) => event.stopPropagation()}
                        onFocus={(event) => event.currentTarget.select()}
                        onBlur={(event) =>
                          renameUserComposition(
                            composition.id,
                            event.currentTarget.value
                          )
                        }
                        onKeyDown={(event) => {
                          if (event.key === "Enter") {
                            event.currentTarget.blur();
                          }

                          if (event.key === "Escape") {
                            event.currentTarget.value = composition.label;
                            event.currentTarget.blur();
                          }
                        }}
                        className="min-w-0 flex-1 border-2 border-ink bg-paper px-1 py-0 text-[8px] font-black uppercase outline-none focus:bg-pollen"
                        aria-label={`Rename ${composition.label}`}
                      />
                    ) : (
                      composition.label
                    )}
                  </span>
                  {composition.source === "saved" ? (
                    <div className="mt-1 grid grid-cols-6 gap-1">
                      <CompositionIconButton
                        label="Update from current selection"
                        onClick={() =>
                          requestUpdateCompositionFromSelection(composition.id)
                        }
                      >
                        <RefreshCw size={11} />
                      </CompositionIconButton>
                      <CompositionIconButton
                        label="Move composition up"
                        disabled={
                          userCompositions.findIndex(
                            (item) => item.id === composition.id
                          ) === 0
                        }
                        onClick={() => moveUserComposition(composition.id, "up")}
                      >
                        <ArrowUp size={11} />
                      </CompositionIconButton>
                      <CompositionIconButton
                        label="Move composition down"
                        disabled={
                          userCompositions.findIndex(
                            (item) => item.id === composition.id
                          ) ===
                          userCompositions.length - 1
                        }
                        onClick={() => moveUserComposition(composition.id, "down")}
                      >
                        <ArrowDown size={11} />
                      </CompositionIconButton>
                      <CompositionIconButton
                        label="Export composition"
                        onClick={() =>
                          downloadCompositionLibraryFile(
                            `${toFileSlug(composition.label) || "composition"}.json`,
                            [composition as SavedComposition]
                          )
                        }
                      >
                        <Download size={11} />
                      </CompositionIconButton>
                      <CompositionIconButton
                        label="Delete composition"
                        onClick={() => deleteUserComposition(composition.id)}
                        danger
                      >
                        <Trash2 size={11} />
                      </CompositionIconButton>
                      <span className="grid h-5 place-items-center border-2 border-ink bg-paper text-[7px] font-black uppercase">
                        Edit
                      </span>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

type TexturePreviewProps = {
  texture: TexturePreset;
};

type TextureGroupProps = {
  featured?: boolean;
  onApply: (texture: TexturePreset) => void;
  selectedObjectId: string | null;
  textures: TexturePreset[];
  title: string;
};

function TextureGroup({
  featured = false,
  onApply,
  selectedObjectId,
  textures,
  title
}: TextureGroupProps) {
  return (
    <section>
      <div
        className={clsx(
          "mb-1 flex items-center justify-between border-2 border-ink px-1.5 py-0.5",
          featured ? "bg-punch text-paper" : "bg-pollen"
        )}
      >
        <h3 className="text-[9px] font-black uppercase">{title}</h3>
        <span className="text-[9px] font-black">{textures.length}</span>
      </div>
      <div className={clsx("grid gap-2", featured ? "grid-cols-1" : "grid-cols-2")}>
        {textures.map((texture) => (
          <button
            key={texture.id}
            type="button"
            disabled={!selectedObjectId}
            onClick={() => onApply(texture)}
            className={clsx(
              "border-2 border-ink bg-bone p-2 text-left shadow-brutal-sm transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:translate-y-0",
              featured && "bg-mineral"
            )}
          >
            <TexturePreview texture={texture} />
            <span className="mt-1 flex items-center justify-between gap-1 text-[9px] font-black uppercase leading-none">
              <span className="flex min-w-0 items-center gap-1">
                <Sparkles size={11} />
                <span className="truncate">{texture.label}</span>
              </span>
              {texture.renderMode ? (
                <span className="border border-ink bg-pollen px-1 text-[7px]">
                  {texture.renderMode === "vector" ? "Vector" : "Raster"}
                </span>
              ) : null}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

type ShapePreviewProps = {
  compact?: boolean;
  fill: string;
  type: Exclude<CanvasObjectType, "text">;
};

function ShapePreview({ compact = false, fill, type }: ShapePreviewProps) {
  const sizeClass = compact ? "h-6 w-6" : "h-6 w-10";
  const polygonClass = compact ? "h-6 w-6" : "h-7 w-10";

  if (type === "triangle") {
    return (
      <span
        className={clsx("block border-2 border-ink", polygonClass)}
        style={{
          backgroundColor: fill,
          clipPath: "polygon(50% 0, 100% 100%, 0 100%)"
        }}
      />
    );
  }

  if (type === "diamond") {
    return (
      <span
        className={clsx("block border-2 border-ink", compact ? "h-6 w-6" : "h-7 w-7")}
        style={{
          backgroundColor: fill,
          transform: "rotate(45deg)"
        }}
      />
    );
  }

  if (type === "pentagon") {
    return (
      <span
        className={clsx("block border-2 border-ink", polygonClass)}
        style={{
          backgroundColor: fill,
          clipPath: "polygon(50% 0, 100% 38%, 82% 100%, 18% 100%, 0 38%)"
        }}
      />
    );
  }

  if (type === "hexagon") {
    return (
      <span
        className={clsx("block border-2 border-ink", polygonClass)}
        style={{
          backgroundColor: fill,
          clipPath: "polygon(25% 0, 75% 0, 100% 50%, 75% 100%, 25% 100%, 0 50%)"
        }}
      />
    );
  }

  if (type === "pill") {
    return (
      <span
        className={clsx("block rounded-full border-2 border-ink", sizeClass)}
        style={{ backgroundColor: fill }}
      />
    );
  }

  if (type === "semicircle") {
    return (
      <svg
        aria-hidden="true"
        className={clsx("block", compact ? "h-6 w-7" : "h-7 w-10")}
        viewBox="0 0 48 34"
      >
        <path
          d="M4 30 A20 26 0 0 1 44 30 Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (type === "quarterCircle") {
    return (
      <svg
        aria-hidden="true"
        className={clsx("block", compact ? "h-6 w-6" : "h-7 w-7")}
        viewBox="0 0 36 36"
      >
        <path
          d="M5 31 L5 5 A26 26 0 0 1 31 31 Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (type === "starburst") {
    return (
      <span
        className={clsx("block border-2 border-ink", compact ? "h-6 w-6" : "h-8 w-8")}
        style={{
          backgroundColor: fill,
          clipPath:
            "polygon(50% 0, 57% 31%, 85% 15%, 69% 43%, 100% 50%, 69% 57%, 85% 85%, 57% 69%, 50% 100%, 43% 69%, 15% 85%, 31% 57%, 0 50%, 31% 43%, 15% 15%, 43% 31%)"
        }}
      />
    );
  }

  if (type === "scallop") {
    return (
      <svg
        aria-hidden="true"
        className={clsx("block", compact ? "h-6 w-8" : "h-7 w-10")}
        viewBox="0 0 52 34"
      >
        <path
          d="M2 5 C8 5 8 14 14 14 C20 14 20 5 26 5 C32 5 32 14 38 14 C44 14 44 5 50 5 L50 29 C44 29 44 20 38 20 C32 20 32 29 26 29 C20 29 20 20 14 20 C8 20 8 29 2 29 Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
    );
  }

  if (type === "drop") {
    return (
      <svg aria-hidden="true" className="block h-8 w-9" viewBox="0 0 48 48">
        <path
          d="M6 42V20C6 4 28 0 40 14C54 30 36 42 22 42Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "petalGrid") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {[
          "M4 4H24V24C13 24 4 15 4 4Z",
          "M44 4V24H24C24 13 33 4 44 4Z",
          "M4 44V24H24C24 35 15 44 4 44Z",
          "M44 44H24V24C35 24 44 33 44 44Z"
        ].map((path) => (
          <path
            key={path}
            d={path}
            fill={fill}
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  }

  if (type === "circleCluster") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {[14, 34].map((x) =>
          [14, 34].map((y) => (
            <circle
              key={`${x}-${y}`}
              cx={x}
              cy={y}
              r="10"
              fill={fill}
              stroke="currentColor"
              strokeWidth="2"
            />
          ))
        )}
      </svg>
    );
  }

  if (type === "crossBurst") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M20 4H28V18L38 8L44 14L34 24L44 34L38 40L28 30V44H20V30L10 40L4 34L14 24L4 14L10 8L20 18Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "semicircleStack") {
    return (
      <svg aria-hidden="true" className="block h-8 w-9" viewBox="0 0 48 48">
        {[
          "M16 16A8 8 0 0 1 32 16Z",
          "M10 28A14 14 0 0 1 38 28Z",
          "M4 44A20 20 0 0 1 44 44Z"
        ].map((path) => (
          <path
            key={path}
            d={path}
            fill={fill}
            stroke="currentColor"
            strokeWidth="2"
          />
        ))}
      </svg>
    );
  }

  if (type === "triangleGrid") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {[0, 1, 2].map((row) =>
          [0, 1, 2].map((column) => {
            const x = 5 + column * 13;
            const y = 5 + row * 13;

            return (
              <polygon
                key={`${row}-${column}`}
                points={`${x},${y} ${x + 11},${y + 11} ${x},${y + 11}`}
                fill={fill}
                stroke="currentColor"
                strokeWidth="1.5"
              />
            );
          })
        )}
      </svg>
    );
  }

  if (type === "shield") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M5 6H43V23C43 44 5 44 5 23Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "crescent") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M24 4A20 20 0 1 0 24 44A12 12 0 1 1 24 20A12 12 0 0 1 24 44A20 20 0 0 0 24 4Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          fillRule="evenodd"
        />
      </svg>
    );
  }

  if (type === "pacman") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M24 4A20 20 0 1 0 44 24H24V4Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "arch") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M8 44V24A16 16 0 0 1 40 24V44H31V24A7 7 0 0 0 17 24V44Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          fillRule="evenodd"
        />
      </svg>
    );
  }

  if (type === "asterisk") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M20 4H28V18L40 11L44 18L31 24L44 30L40 37L28 30V44H20V30L8 37L4 30L17 24L4 18L8 11L20 18Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
        />
      </svg>
    );
  }

  if (type === "cornerPinwheel") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {[0, 90, 180, 270].map((angle) => (
          <polygon
            key={angle}
            points="5,5 19,5 14,10 28,24 24,28 10,14 5,19"
            fill={fill}
            stroke="currentColor"
            strokeWidth="1.5"
            transform={`rotate(${angle} 24 24)`}
            vectorEffect="non-scaling-stroke"
          />
        ))}
      </svg>
    );
  }

  if (type === "quarterRings") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {[
          [7, 6],
          [29, 6],
          [7, 28],
          [29, 28]
        ].map(([x, y]) => (
            <path
              key={`${x}-${y}`}
              d={`M${x} ${y}H${x + 8}A10 10 0 0 0 ${x + 18} ${y + 10}V${y + 18}A18 18 0 0 1 ${x} ${y}Z`}
              fill={fill}
              stroke="currentColor"
              strokeWidth="1.2"
            />
          ))}
      </svg>
    );
  }

  if (type === "portal") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d="M41 41H24C14 41 6 33 6 24C6 12 14 5 24 5C34 5 41 13 41 24V41ZM33 33V24A9 9 0 1 0 15 24A9 9 0 0 0 24 33H33Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="1.5"
          fillRule="evenodd"
        />
        <circle cx="24" cy="24" r="6.5" fill="#3D8DC6" />
      </svg>
    );
  }

  if (type === "petalBurst") {
    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        {Array.from({ length: 12 }, (_, index) => (
          <rect
            key={index}
            x="20"
            y="3"
            width="8"
            height="18"
            rx="4"
            fill={fill}
            stroke="currentColor"
            strokeWidth="1.5"
            transform={`rotate(${index * 30} 24 24)`}
          />
        ))}
      </svg>
    );
  }

  if (type === "eye") {
    return (
      <svg aria-hidden="true" className="block h-7 w-10" viewBox="0 0 52 32">
        <path
          d="M2 16C14 2 38 2 50 16C38 30 14 30 2 16ZM20 16A6 6 0 1 0 32 16A6 6 0 1 0 20 16Z"
          fill={fill}
          stroke="currentColor"
          strokeWidth="2"
          fillRule="evenodd"
        />
      </svg>
    );
  }

  if (type === "boltClassic" || type === "boltSharp" || type === "boltStep") {
    const boltPath =
      type === "boltSharp"
        ? "M35 2L24 19H42L13 46L24 29H6Z"
        : type === "boltStep"
          ? "M16 2H36L30 17H38L31 30H39L13 46L20 30H12L18 18H10Z"
          : "M24 2H43L30 20H41L12 46L22 27H8Z";

    return (
      <svg aria-hidden="true" className="block h-8 w-8" viewBox="0 0 48 48">
        <path
          d={boltPath}
          fill={fill}
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  return (
    <span
      className={clsx(
        "block border-2 border-ink",
        sizeClass,
        type === "ellipse" && "rounded-full"
      )}
      style={{ backgroundColor: fill }}
    />
  );
}

type CompositionIconButtonProps = {
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
};

function CompositionIconButton({
  children,
  danger = false,
  disabled = false,
  label,
  onClick
}: CompositionIconButtonProps) {
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

function downloadCompositionLibraryFile(
  filename: string,
  compositions: SavedComposition[]
) {
  const blob = new Blob(
    [
      JSON.stringify(
        {
          app: "neoform-pigments",
          version: 1,
          exportedAt: new Date().toISOString(),
          compositions
        },
        null,
        2
      )
    ],
    { type: "application/json" }
  );
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function parseCompositionImportFile(value: unknown) {
  const maybeCompositions =
    Array.isArray(value)
      ? value
      : value && typeof value === "object" && "compositions" in value
        ? (value as { compositions?: unknown }).compositions
        : [];

  return Array.isArray(maybeCompositions)
    ? maybeCompositions.filter(isImportedSavedComposition)
    : [];
}

function isImportedSavedComposition(value: unknown): value is SavedComposition {
  if (!value || typeof value !== "object") {
    return false;
  }

  const composition = value as Partial<SavedComposition>;

  return (
    typeof composition.id === "string" &&
    typeof composition.label === "string" &&
    composition.source === "saved" &&
    Array.isArray(composition.objects)
  );
}

function toFileSlug(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function SavedCompositionPreview({ count }: { count: number }) {
  return (
    <span className="grid h-full place-items-center bg-[linear-gradient(135deg,#E8E0C0_0_48%,#101010_48%_52%,#90A0B8_52%)]">
      <span className="border-2 border-ink bg-pollen px-2 py-0.5 text-[9px] font-black uppercase shadow-brutal-sm">
        {count} shapes
      </span>
    </span>
  );
}

function TexturePreview({ texture }: TexturePreviewProps) {
  return (
    <span
      className="block h-9 border-2 border-ink"
      style={getTexturePreviewStyle(texture)}
    />
  );
}

function isGradientTexture(texture: TexturePreset) {
  return (
    texture.kind === "shadeGradient" ||
    texture.kind === "linearGradient" ||
    texture.kind === "radialGradient" ||
    texture.kind === "meshGradient"
  );
}

function getTexturePreviewStyle(texture: TexturePreset) {
  if (texture.kind === "shadeGradient") {
    return {
      background: `linear-gradient(135deg, #fff4cf 0%, ${texture.accent ?? texture.background} 52%, #533b2f 100%)`
    };
  }

  if (texture.kind === "linearGradient") {
    return {
      background: `linear-gradient(135deg, ${texture.background} 0%, ${texture.foreground} 52%, ${texture.accent ?? texture.background} 100%)`
    };
  }

  if (texture.kind === "radialGradient") {
    return {
      background: `radial-gradient(circle at 32% 28%, ${texture.accent ?? texture.foreground} 0 18%, ${texture.foreground} 36%, ${texture.background} 78%)`
    };
  }

  if (texture.kind === "meshGradient") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 22% 30%, ${texture.foreground} 0 18%, transparent 42%), radial-gradient(circle at 82% 34%, ${texture.accent ?? texture.foreground} 0 16%, transparent 38%), radial-gradient(circle at 58% 88%, ${texture.foreground} 0 18%, transparent 42%)`
    };
  }

  if (texture.kind === "stripes") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(135deg, ${texture.foreground} 0 4px, ${texture.background} 4px 12px)`,
      backgroundSize: "32px 32px"
    };
  }

  if (texture.kind === "fineLines") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(90deg, ${texture.foreground} 0 1px, transparent 1px 7px)`,
      backgroundSize: "16px 16px"
    };
  }

  if (texture.kind === "dots") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 8px 8px, ${texture.foreground} 0 3px, transparent 4px), radial-gradient(circle at 24px 24px, ${texture.foreground} 0 3px, transparent 4px)`,
      backgroundSize: "32px 32px"
    };
  }

  if (texture.kind === "halftone") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 6px 6px, ${texture.foreground} 0 2px, transparent 3px), radial-gradient(circle at 18px 18px, ${texture.foreground} 0 4px, transparent 5px), radial-gradient(circle at 30px 30px, ${texture.foreground} 0 6px, transparent 7px)`,
      backgroundSize: "36px 36px"
    };
  }

  if (texture.kind === "grid") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `linear-gradient(${texture.foreground} 2px, transparent 2px), linear-gradient(90deg, ${texture.foreground} 2px, transparent 2px)`,
      backgroundSize: "16px 16px"
    };
  }

  if (texture.kind === "diagonalGrid") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(45deg, transparent 0 9px, ${texture.foreground} 9px 11px, transparent 11px 20px), repeating-linear-gradient(135deg, transparent 0 9px, ${texture.foreground} 9px 11px, transparent 11px 20px)`
    };
  }

  if (texture.kind === "crosshatch") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(45deg, transparent 0 7px, ${texture.foreground} 7px 10px), repeating-linear-gradient(135deg, transparent 0 7px, ${texture.foreground} 7px 10px)`,
      backgroundSize: "32px 32px"
    };
  }

  if (texture.kind === "waves") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(ellipse at 50% 100%, transparent 0 45%, ${texture.foreground} 46% 53%, transparent 54%), radial-gradient(ellipse at 50% 0, transparent 0 45%, ${texture.foreground} 46% 53%, transparent 54%)`,
      backgroundSize: "28px 18px"
    };
  }

  if (texture.kind === "rings") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-radial-gradient(circle at center, transparent 0 5px, ${texture.foreground} 6px 8px, transparent 9px 14px)`
    };
  }

  if (texture.kind === "zigzag") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `linear-gradient(135deg, transparent 0 42%, ${texture.foreground} 43% 57%, transparent 58%), linear-gradient(45deg, transparent 0 42%, ${texture.foreground} 43% 57%, transparent 58%)`,
      backgroundSize: "22px 22px"
    };
  }

  if (texture.kind === "confetti") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `linear-gradient(35deg, transparent 0 44%, ${texture.foreground} 45% 55%, transparent 56%), linear-gradient(125deg, transparent 0 44%, ${texture.accent ?? texture.foreground} 45% 55%, transparent 56%), radial-gradient(circle at 20% 70%, ${texture.foreground} 0 3px, transparent 4px)`,
      backgroundSize: "24px 24px"
    };
  }

  if (texture.kind === "bauhausBlocks") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `linear-gradient(90deg, ${texture.foreground} 0 28%, transparent 28%), radial-gradient(circle at 70% 28%, ${texture.accent ?? texture.foreground} 0 16%, transparent 17%), linear-gradient(135deg, transparent 0 54%, #101010 55% 61%, transparent 62%), linear-gradient(0deg, transparent 0 62%, #F0B800 62% 86%, transparent 86%)`,
      backgroundSize: "54px 54px"
    };
  }

  if (texture.kind === "bauhausWeave") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `linear-gradient(90deg, transparent 0 9%, ${texture.foreground} 9% 42%, transparent 42%), radial-gradient(circle at 74% 24%, ${texture.accent ?? texture.foreground} 0 18%, transparent 19%), linear-gradient(135deg, transparent 0 46%, #101010 47% 55%, transparent 56%), linear-gradient(0deg, transparent 0 66%, #F0B800 66% 86%, transparent 86%)`,
      backgroundSize: "52px 52px"
    };
  }

  if (texture.kind === "bendayDots") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 8px 8px, ${texture.foreground} 0 4px, transparent 5px), radial-gradient(circle at 24px 24px, ${texture.accent ?? texture.foreground} 0 3px, transparent 4px)`,
      backgroundSize: "32px 32px"
    };
  }

  if (texture.kind === "popHalftone") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 7px 7px, ${texture.foreground} 0 2px, transparent 3px), radial-gradient(circle at 22px 10px, ${texture.accent ?? texture.foreground} 0 4px, transparent 5px), radial-gradient(circle at 12px 27px, ${texture.foreground} 0 6px, transparent 7px), linear-gradient(135deg, transparent 0 70%, #101010 70% 74%, transparent 74%)`,
      backgroundSize: "38px 38px"
    };
  }

  if (texture.kind === "serigraphyBars") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(90deg, ${texture.foreground} 0 4px, transparent 4px 10px), repeating-linear-gradient(90deg, transparent 0 14px, ${texture.accent ?? texture.foreground} 14px 18px, transparent 18px 28px), repeating-linear-gradient(0deg, transparent 0 25px, rgba(0,0,0,0.35) 25px 28px, transparent 28px 40px)`,
      backgroundPosition: "0 0, 5px 0, 0 0",
      backgroundSize: "56px 56px"
    };
  }

  if (texture.kind === "serigraphyScreen") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `repeating-linear-gradient(58deg, ${texture.foreground} 0 2px, transparent 2px 12px), repeating-linear-gradient(58deg, transparent 0 7px, ${texture.accent ?? texture.foreground} 7px 9px, transparent 9px 18px), radial-gradient(circle at 28% 30%, transparent 0 14%, #101010 15% 18%, transparent 19%)`,
      backgroundSize: "42px 42px"
    };
  }

  if (texture.kind === "opArtWaves") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(ellipse at 50% 0%, transparent 0 42%, ${texture.foreground} 43% 50%, transparent 51%), radial-gradient(ellipse at 50% 100%, transparent 0 42%, ${texture.foreground} 43% 50%, transparent 51%)`,
      backgroundSize: "34px 22px"
    };
  }

  if (texture.kind === "popBurst") {
    return {
      backgroundColor: texture.background,
      backgroundImage: `conic-gradient(from 0.12turn at 50% 50%, ${texture.foreground} 0 8%, transparent 8% 16%, ${texture.accent ?? texture.foreground} 16% 24%, transparent 24% 32%, ${texture.foreground} 32% 40%, transparent 40% 48%, ${texture.accent ?? texture.foreground} 48% 56%, transparent 56% 64%, ${texture.foreground} 64% 72%, transparent 72% 80%, ${texture.accent ?? texture.foreground} 80% 88%, transparent 88% 100%)`,
      backgroundSize: "44px 44px"
    };
  }

  if (
    texture.kind === "grain" ||
    texture.kind === "filmGrain" ||
    texture.kind === "noise" ||
    texture.kind === "speckle" ||
    texture.kind === "paper"
  ) {
    return {
      backgroundColor: texture.background,
      backgroundImage: `radial-gradient(circle at 12% 22%, ${texture.foreground} 0 1px, transparent 2px), radial-gradient(circle at 42% 62%, ${texture.foreground} 0 1.5px, transparent 3px), radial-gradient(circle at 78% 35%, ${texture.accent ?? texture.foreground} 0 1px, transparent 2px), radial-gradient(circle at 88% 82%, ${texture.foreground} 0 2px, transparent 3px)`,
      backgroundSize: texture.kind === "speckle" ? "18px 18px" : "12px 12px"
    };
  }

  return {
    backgroundColor: texture.background,
    backgroundImage: `linear-gradient(45deg, ${texture.foreground} 25%, transparent 25%), linear-gradient(-45deg, ${texture.foreground} 25%, transparent 25%), linear-gradient(45deg, transparent 75%, ${texture.foreground} 75%), linear-gradient(-45deg, transparent 75%, ${texture.foreground} 75%)`,
    backgroundPosition: "0 0, 0 16px, 16px -16px, -16px 0",
    backgroundSize: "32px 32px"
  };
}
