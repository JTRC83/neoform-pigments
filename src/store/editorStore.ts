import { create } from "zustand";
import type {
  Artboard,
  CanvasObjectSummary,
  CanvasGuide,
  CanvasSelectionRequest,
  CanvasViewSettings,
  CanvasViewportRequest,
  CanvasFormat,
  CanvasCursorStyle,
  CanvasFinishSettings,
  ColorAdjustmentSettings,
  ColorMode,
  CompositionSaveRequest,
  CanvasOrientation,
  EditorTool,
  EditorHistoryRequest,
  ExportRequest,
  GradientToolSettings,
  LayerActionRequest,
  LibraryActionRequest,
  ProjectImportRequest,
  ProjectPersistenceRequest,
  ProfessionalExportSettings,
  PropertyUpdateRequest,
  SavedProject,
  SelectedObjectProperties,
  TextOutlineRequest,
  TextFontFamily,
  VisualAsset
} from "../types/editor";
import type {
  CompositionPreset,
  FormPreset,
  PigmentSwatch,
  TexturePreset
} from "../types/library";
import type { SavedComposition } from "../types/library";
import {
  canvasFormats,
  createArtboard,
  defaultCanvasDpi,
  getFormatPixels,
  initialArtboard,
  maxCanvasDpi,
  minCanvasDpi
} from "../canvas/canvasPresets";
import {
  deleteVisualAssetFromIndexedDb,
  loadVisualAssetsFromIndexedDb,
  replaceVisualAssetsInIndexedDb
} from "../libraries/visualAssetStorage";
import { defaultTextFontFamily } from "../utils/textFonts";

const localProjectKey = "neoform-pigments:project:v1";
const localCompositionsKey = "neoform-pigments:user-compositions:v1";
const localCompositionsResetKey = "neoform-pigments:compositions-reset:v1";
const localColorModeKey = "neoform-pigments:color-mode:v1";
const localVisualAssetsKey = "neoform-pigments:visual-assets:v1";

const defaultFinishSettings: CanvasFinishSettings = {
  colorAdjustments: createDefaultColorAdjustments(),
  filmGrainEnabled: false,
  filmGrainAmount: 0.45,
  filmGrainRoughness: 0.6
};

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

const defaultExportSettings: ProfessionalExportSettings = {
  cropMarksEnabled: false,
  dpi: defaultCanvasDpi,
  bleedMm: 0,
  jpegQuality: 0.95,
  safeMarginMm: 0,
  presetId: "screen"
};

const defaultGradientToolSettings: GradientToolSettings = {
  direction: "tl-br",
  intensity: 0.45
};

type EditorState = {
  projectName: string;
  activeTool: EditorTool;
  artboards: Artboard[];
  activeArtboardId: string;
  canvasSnapshots: Record<string, string>;
  canvasObjects: CanvasObjectSummary[];
  userCompositions: SavedComposition[];
  visualAssets: VisualAsset[];
  visualAssetsLoaded: boolean;
  selectedObjectId: string | null;
  selectedLayerIds: string[];
  selectionRequest: CanvasSelectionRequest | null;
  layerActionRequest: LayerActionRequest | null;
  libraryActionRequest: LibraryActionRequest | null;
  exportRequest: ExportRequest | null;
  saveRequest: ProjectPersistenceRequest | null;
  openRequest: ProjectPersistenceRequest | null;
  projectJsonExportRequest: ProjectPersistenceRequest | null;
  projectJsonImportRequest: ProjectImportRequest | null;
  historyRequest: EditorHistoryRequest | null;
  viewportRequest: CanvasViewportRequest | null;
  propertyUpdateRequest: PropertyUpdateRequest | null;
  textOutlineRequest: TextOutlineRequest | null;
  compositionSaveRequest: CompositionSaveRequest | null;
  selectedObjectProperties: SelectedObjectProperties | null;
  cursorStyle: CanvasCursorStyle;
  colorMode: ColorMode;
  textFontFamily: TextFontFamily;
  finishSettings: CanvasFinishSettings;
  gradientToolSettings: GradientToolSettings;
  exportSettings: ProfessionalExportSettings;
  viewSettings: CanvasViewSettings;
  setActiveTool: (tool: EditorTool) => void;
  addCanvasObject: (object: CanvasObjectSummary) => void;
  setSelectedObjectId: (id: string | null) => void;
  setCanvasSelection: (ids: string[]) => void;
  requestObjectSelection: (id: string | null) => void;
  requestLayerSelection: (ids: string[]) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayersVisibility: (ids: string[]) => void;
  toggleLayerLock: (id: string) => void;
  toggleLayersLock: (ids: string[]) => void;
  deleteLayer: (id: string) => void;
  deleteLayers: (ids: string[]) => void;
  duplicateLayers: (ids: string[]) => void;
  groupLayers: (ids: string[]) => void;
  ungroupLayers: (ids: string[]) => void;
  moveLayer: (id: string, direction: "up" | "down") => void;
  moveLayers: (ids: string[], direction: "up" | "down") => void;
  renameLayer: (id: string, name: string) => void;
  requestAddLibraryForm: (form: FormPreset) => void;
  requestApplyPigment: (pigment: PigmentSwatch) => void;
  requestApplyTexture: (texture: TexturePreset) => void;
  requestAddComposition: (composition: CompositionPreset) => void;
  requestAddVisualAssetToCanvas: (asset: VisualAsset) => void;
  requestAddCanvasLayer: (fill: string, name: string) => void;
  loadVisualAssets: () => Promise<void>;
  addVisualAsset: (asset: VisualAsset) => void;
  deleteVisualAsset: (id: string) => void;
  requestSaveSelectionAsComposition: () => void;
  requestUpdateCompositionFromSelection: (id: string) => void;
  addUserComposition: (composition: SavedComposition) => void;
  updateUserComposition: (composition: SavedComposition) => void;
  renameUserComposition: (id: string, label: string) => void;
  deleteUserComposition: (id: string) => void;
  moveUserComposition: (id: string, direction: "up" | "down") => void;
  importUserCompositions: (compositions: SavedComposition[]) => void;
  requestExportPng: () => void;
  requestExportJpeg: () => void;
  requestExportSvg: () => void;
  requestExportAllPng: () => void;
  requestExportAllJpeg: () => void;
  requestExportPdf: () => void;
  requestExportPackage: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  requestViewportAction: (action: CanvasViewportRequest["action"]) => void;
  requestSelectedObjectPropertyUpdate: (
    properties: Partial<SelectedObjectProperties>
  ) => void;
  requestConvertSelectedTextToOutline: (objectId: string) => void;
  setSelectedObjectProperties: (properties: SelectedObjectProperties | null) => void;
  replaceCanvasObjectsForArtboard: (
    artboardId: string,
    objects: CanvasObjectSummary[]
  ) => void;
  requestSaveProject: () => void;
  requestOpenProject: () => void;
  requestExportProjectJson: () => void;
  requestImportProjectJson: (project: SavedProject) => void;
  getSavedProject: () => SavedProject;
  importSavedProject: (project: SavedProject) => boolean;
  saveProjectToLocalStorage: () => void;
  loadProjectFromLocalStorage: () => boolean;
  toggleGrid: () => void;
  toggleGoldenRatio: () => void;
  addCanvasGuide: (orientation: CanvasGuide["orientation"]) => void;
  updateCanvasGuide: (id: string, position: number, angle?: number) => void;
  removeCanvasGuide: (id: string) => void;
  clearCanvasGuides: () => void;
  addArtboard: (format: CanvasFormat, orientation: CanvasOrientation) => void;
  updateActiveArtboardFormat: (
    format: CanvasFormat,
    orientation: CanvasOrientation
  ) => void;
  updateActiveArtboardSize: (width: number, height: number) => void;
  setActiveArtboard: (id: string) => void;
  setCanvasSnapshot: (artboardId: string, snapshot: string) => void;
  setCursorStyle: (cursorStyle: CanvasCursorStyle) => void;
  setColorMode: (colorMode: ColorMode) => void;
  setTextFontFamily: (fontFamily: TextFontFamily) => void;
  setFinishSettings: (settings: Partial<CanvasFinishSettings>) => void;
  setGradientToolSettings: (settings: Partial<GradientToolSettings>) => void;
  setExportSettings: (settings: Partial<ProfessionalExportSettings>) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: "N€O FORM & PIGM€NT$",
  activeTool: "select",
  artboards: [initialArtboard],
  activeArtboardId: initialArtboard.id,
  canvasSnapshots: {},
  canvasObjects: [],
  userCompositions: loadUserCompositionsFromLocalStorage(),
  visualAssets: [],
  visualAssetsLoaded: false,
  selectedObjectId: null,
  selectedLayerIds: [],
  selectionRequest: null,
  layerActionRequest: null,
  libraryActionRequest: null,
  exportRequest: null,
  saveRequest: null,
  openRequest: null,
  projectJsonExportRequest: null,
  projectJsonImportRequest: null,
  historyRequest: null,
  viewportRequest: null,
  propertyUpdateRequest: null,
  textOutlineRequest: null,
  compositionSaveRequest: null,
  selectedObjectProperties: null,
  cursorStyle: "auto",
  colorMode: loadColorModeFromLocalStorage(),
  textFontFamily: defaultTextFontFamily,
  finishSettings: defaultFinishSettings,
  gradientToolSettings: defaultGradientToolSettings,
  exportSettings: defaultExportSettings,
  viewSettings: {
    customGuides: [],
    showGrid: false,
    showGoldenRatio: false
  },
  setActiveTool: (tool) => set({ activeTool: tool }),
  addCanvasObject: (object) =>
    set((state) => ({
      canvasObjects: [...state.canvasObjects, object],
      selectedObjectId: object.id,
      selectedLayerIds: [object.id]
    })),
  setSelectedObjectId: (id) =>
    set({
      selectedObjectId: id,
      selectedLayerIds: id ? [id] : []
    }),
  setCanvasSelection: (ids) =>
    set({
      selectedObjectId: ids.length === 1 ? ids[0] : null,
      selectedLayerIds: ids
    }),
  requestObjectSelection: (id) =>
    set((state) => ({
      selectedObjectId: id,
      selectedLayerIds: id ? [id] : [],
      selectionRequest: {
        objectId: id,
        objectIds: id ? [id] : [],
        requestId: (state.selectionRequest?.requestId ?? 0) + 1
      }
    })),
  requestLayerSelection: (ids) =>
    set((state) => {
      const selectedLayerIds = uniqueIds(ids);

      return {
        selectedObjectId:
          selectedLayerIds.length === 1 ? selectedLayerIds[0] : null,
        selectedLayerIds,
        selectionRequest: {
          objectId: selectedLayerIds[0] ?? null,
          objectIds: selectedLayerIds,
          requestId: (state.selectionRequest?.requestId ?? 0) + 1
        }
      };
    }),
  toggleLayerVisibility: (id) =>
    get().toggleLayersVisibility([id]),
  toggleLayersVisibility: (ids) =>
    set((state) => {
      const targetIds = uniqueIds(ids);
      const targets = state.canvasObjects.filter((object) =>
        targetIds.includes(object.id)
      );

      if (targets.length === 0) {
        return {};
      }

      const shouldHide = targets.some((object) => object.visible);
      const nextSelectedLayerIds = shouldHide
        ? state.selectedLayerIds.filter((id) => !targetIds.includes(id))
        : state.selectedLayerIds;

      return {
        canvasObjects: state.canvasObjects.map((object) =>
          targetIds.includes(object.id)
            ? { ...object, visible: !shouldHide }
            : object
        ),
        selectedObjectId:
          nextSelectedLayerIds.length === 1 ? nextSelectedLayerIds[0] : null,
        selectedLayerIds: nextSelectedLayerIds,
        selectionRequest: shouldHide
          ? {
              objectId: nextSelectedLayerIds[0] ?? null,
              objectIds: nextSelectedLayerIds,
              requestId: (state.selectionRequest?.requestId ?? 0) + 1
            }
          : state.selectionRequest,
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          targetIds,
          "toggle-visibility"
        )
      };
    }),
  toggleLayerLock: (id) =>
    get().toggleLayersLock([id]),
  toggleLayersLock: (ids) =>
    set((state) => {
      const targetIds = uniqueIds(ids);
      const targets = state.canvasObjects.filter((object) =>
        targetIds.includes(object.id)
      );

      if (targets.length === 0) {
        return {};
      }

      const shouldLock = targets.some((object) => !object.locked);
      const nextSelectedLayerIds = shouldLock
        ? state.selectedLayerIds.filter((id) => !targetIds.includes(id))
        : state.selectedLayerIds;

      return {
        canvasObjects: state.canvasObjects.map((object) =>
          targetIds.includes(object.id)
            ? { ...object, locked: shouldLock }
            : object
        ),
        selectedObjectId:
          nextSelectedLayerIds.length === 1 ? nextSelectedLayerIds[0] : null,
        selectedLayerIds: nextSelectedLayerIds,
        selectionRequest: shouldLock
          ? {
              objectId: nextSelectedLayerIds[0] ?? null,
              objectIds: nextSelectedLayerIds,
              requestId: (state.selectionRequest?.requestId ?? 0) + 1
            }
          : state.selectionRequest,
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          targetIds,
          "toggle-lock"
        )
      };
    }),
  deleteLayer: (id) =>
    get().deleteLayers([id]),
  deleteLayers: (ids) =>
    set((state) => {
      const targetIds = uniqueIds(ids);
      const nextSelectedLayerIds = state.selectedLayerIds.filter(
        (id) => !targetIds.includes(id)
      );

      return {
        canvasObjects: state.canvasObjects.filter(
          (object) => !targetIds.includes(object.id)
        ),
        selectedObjectId:
          nextSelectedLayerIds.length === 1 ? nextSelectedLayerIds[0] : null,
        selectedLayerIds: nextSelectedLayerIds,
        selectionRequest: {
          objectId: nextSelectedLayerIds[0] ?? null,
          objectIds: nextSelectedLayerIds,
          requestId: (state.selectionRequest?.requestId ?? 0) + 1
        },
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          targetIds,
          "delete"
        )
      };
    }),
  duplicateLayers: (ids) =>
    set((state) => ({
      layerActionRequest: createLayerActionRequest(
        state.layerActionRequest,
        uniqueIds(ids),
        "duplicate"
      )
    })),
  groupLayers: (ids) =>
    set((state) => ({
      layerActionRequest: createLayerActionRequest(
        state.layerActionRequest,
        uniqueIds(ids),
        "group"
      )
    })),
  ungroupLayers: (ids) =>
    set((state) => ({
      layerActionRequest: createLayerActionRequest(
        state.layerActionRequest,
        uniqueIds(ids),
        "ungroup"
      )
    })),
  moveLayer: (id, direction) =>
    get().moveLayers([id], direction),
  moveLayers: (ids, direction) =>
    set((state) => {
      const targetIds = uniqueIds(ids);
      const object = state.canvasObjects.find((item) =>
        targetIds.includes(item.id)
      );

      if (!object) {
        return {};
      }

      const activeObjects = state.canvasObjects.filter(
        (item) => item.artboardId === object.artboardId
      );
      const reorderedActiveObjects = reorderLayerSummaries(
        activeObjects,
        targetIds,
        direction
      );

      if (reorderedActiveObjects === activeObjects) {
        return {};
      }

      let nextActiveObjectIndex = 0;

      return {
        canvasObjects: state.canvasObjects.map((item) => {
          if (item.artboardId !== object.artboardId) {
            return item;
          }

          const nextObject = reorderedActiveObjects[nextActiveObjectIndex];
          nextActiveObjectIndex += 1;
          return nextObject;
        }),
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          targetIds,
          direction === "up" ? "move-up" : "move-down"
        )
      };
    }),
  renameLayer: (id, name) =>
    set((state) => {
      const trimmedName = name.trim();

      if (!trimmedName) {
        return {};
      }

      return {
        canvasObjects: state.canvasObjects.map((object) =>
          object.id === id ? { ...object, name: trimmedName } : object
        ),
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          [id],
          "rename"
        )
      };
    }),
  requestAddLibraryForm: (form) =>
    set((state) => ({
      libraryActionRequest: {
        action: "add-form",
        form,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  requestApplyPigment: (pigment) =>
    set((state) => ({
      libraryActionRequest: {
        action: "apply-pigment",
        pigment,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  requestApplyTexture: (texture) =>
    set((state) => ({
      libraryActionRequest: {
        action: "apply-texture",
        texture,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  requestAddComposition: (composition) =>
    set((state) => ({
      libraryActionRequest: {
        action: "add-composition",
        composition,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  requestAddVisualAssetToCanvas: (asset) =>
    set((state) => ({
      libraryActionRequest: {
        action: "add-visual-asset",
        asset,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  requestAddCanvasLayer: (fill, name) =>
    set((state) => ({
      libraryActionRequest: {
        action: "add-canvas-layer",
        fill,
        name,
        requestId: (state.libraryActionRequest?.requestId ?? 0) + 1
      }
    })),
  loadVisualAssets: async () => {
    const indexedDbAssets = await loadVisualAssetsFromIndexedDb();
    const legacyAssets = loadVisualAssetsFromLocalStorage();
    const mergedVisualAssets = mergeVisualAssets(indexedDbAssets, legacyAssets);
    const visualAssets = dedupeVisualAssetsByDataUrl(mergedVisualAssets);

    set({ visualAssets, visualAssetsLoaded: true });

    if (legacyAssets.length > 0 || visualAssets.length !== mergedVisualAssets.length) {
      void replaceVisualAssetsInIndexedDb(visualAssets).then(() => {
        removeLegacyVisualAssetsFromLocalStorage();
      });
    }
  },
  addVisualAsset: (asset) =>
    set((state) => {
      const visualAssets = [
        asset,
        ...state.visualAssets.filter(
          (item) => item.id !== asset.id && item.dataUrl !== asset.dataUrl
        )
      ];

      void replaceVisualAssetsInIndexedDb(visualAssets);
      return { visualAssets };
    }),
  deleteVisualAsset: (id) =>
    set((state) => {
      const visualAssets = state.visualAssets.filter((asset) => asset.id !== id);

      void deleteVisualAssetFromIndexedDb(id);
      return { visualAssets };
    }),
  requestSaveSelectionAsComposition: () =>
    set((state) => ({
      compositionSaveRequest: {
        requestId: (state.compositionSaveRequest?.requestId ?? 0) + 1
      }
    })),
  requestUpdateCompositionFromSelection: (id) =>
    set((state) => ({
      compositionSaveRequest: {
        requestId: (state.compositionSaveRequest?.requestId ?? 0) + 1,
        targetId: id
      }
    })),
  addUserComposition: (composition) =>
    set((state) => {
      const userCompositions = [...state.userCompositions, composition];
      saveUserCompositionsToLocalStorage(userCompositions);

      return { userCompositions };
    }),
  updateUserComposition: (composition) =>
    set((state) => {
      const userCompositions = state.userCompositions.map((item) =>
        item.id === composition.id ? composition : item
      );

      saveUserCompositionsToLocalStorage(userCompositions);
      return { userCompositions };
    }),
  renameUserComposition: (id, label) =>
    set((state) => {
      const trimmedLabel = label.trim();

      if (!trimmedLabel) {
        return {};
      }

      const userCompositions = state.userCompositions.map((composition) =>
        composition.id === id
          ? { ...composition, label: trimmedLabel }
          : composition
      );

      saveUserCompositionsToLocalStorage(userCompositions);
      return { userCompositions };
    }),
  deleteUserComposition: (id) =>
    set((state) => {
      const userCompositions = state.userCompositions.filter(
        (composition) => composition.id !== id
      );

      saveUserCompositionsToLocalStorage(userCompositions);
      return { userCompositions };
    }),
  moveUserComposition: (id, direction) =>
    set((state) => {
      const currentIndex = state.userCompositions.findIndex(
        (composition) => composition.id === id
      );
      const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (
        currentIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= state.userCompositions.length
      ) {
        return {};
      }

      const userCompositions = [...state.userCompositions];
      [userCompositions[currentIndex], userCompositions[targetIndex]] = [
        userCompositions[targetIndex],
        userCompositions[currentIndex]
      ];

      saveUserCompositionsToLocalStorage(userCompositions);
      return { userCompositions };
    }),
  importUserCompositions: (compositions) =>
    set((state) => {
      const userCompositions = mergeUserCompositions(
        state.userCompositions,
        compositions
      );

      saveUserCompositionsToLocalStorage(userCompositions);
      return { userCompositions };
    }),
  requestExportPng: () =>
    set((state) => ({
      exportRequest: {
        format: "png",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportJpeg: () =>
    set((state) => ({
      exportRequest: {
        format: "jpeg",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportSvg: () =>
    set((state) => ({
      exportRequest: {
        format: "svg",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportAllPng: () =>
    set((state) => ({
      exportRequest: {
        format: "all-png",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportAllJpeg: () =>
    set((state) => ({
      exportRequest: {
        format: "all-jpeg",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportPdf: () =>
    set((state) => ({
      exportRequest: {
        format: "pdf",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportPackage: () =>
    set((state) => ({
      exportRequest: {
        format: "package",
        requestId: (state.exportRequest?.requestId ?? 0) + 1
      }
    })),
  requestUndo: () =>
    set((state) => ({
      historyRequest: {
        action: "undo",
        requestId: (state.historyRequest?.requestId ?? 0) + 1
      }
    })),
  requestRedo: () =>
    set((state) => ({
      historyRequest: {
        action: "redo",
        requestId: (state.historyRequest?.requestId ?? 0) + 1
      }
    })),
  requestViewportAction: (action) =>
    set((state) => ({
      viewportRequest: {
        action,
        requestId: (state.viewportRequest?.requestId ?? 0) + 1
      }
    })),
  requestSelectedObjectPropertyUpdate: (properties) =>
    set((state) => ({
      propertyUpdateRequest: {
        properties,
        requestId: (state.propertyUpdateRequest?.requestId ?? 0) + 1
      }
    })),
  requestConvertSelectedTextToOutline: (objectId) =>
    set((state) => ({
      textOutlineRequest: {
        objectId,
        requestId: (state.textOutlineRequest?.requestId ?? 0) + 1
      }
    })),
  setSelectedObjectProperties: (properties) =>
    set({ selectedObjectProperties: properties }),
  replaceCanvasObjectsForArtboard: (artboardId, objects) =>
    set((state) => ({
      canvasObjects: [
        ...state.canvasObjects.filter((object) => object.artboardId !== artboardId),
        ...objects
      ],
      selectedObjectId: null,
      selectedLayerIds: [],
      selectedObjectProperties: null
    })),
  requestSaveProject: () =>
    set((state) => ({
      saveRequest: {
        requestId: (state.saveRequest?.requestId ?? 0) + 1
      }
    })),
  requestOpenProject: () =>
    set((state) => ({
      openRequest: {
        requestId: (state.openRequest?.requestId ?? 0) + 1
      }
    })),
  requestExportProjectJson: () =>
    set((state) => ({
      projectJsonExportRequest: {
        requestId: (state.projectJsonExportRequest?.requestId ?? 0) + 1
      }
    })),
  requestImportProjectJson: (project) =>
    set((state) => ({
      projectJsonImportRequest: {
        project,
        requestId: (state.projectJsonImportRequest?.requestId ?? 0) + 1
      }
  })),
  getSavedProject: () => {
    const state = get();

    return {
      version: 1,
      projectName: state.projectName,
      artboards: state.artboards,
      activeArtboardId: state.activeArtboardId,
      canvasSnapshots: state.canvasSnapshots,
      canvasObjects: state.canvasObjects,
      visualAssets: state.visualAssets,
      finishSettings: state.finishSettings,
      exportSettings: state.exportSettings,
      userCompositions: state.userCompositions,
      viewSettings: state.viewSettings,
      savedAt: new Date().toISOString()
    };
  },
  importSavedProject: (savedProject) => {
    if (!isValidSavedProject(savedProject)) {
      return false;
    }

    const userCompositions =
      savedProject.userCompositions ?? get().userCompositions;
    const visualAssets = savedProject.visualAssets ?? get().visualAssets;

    set({
      projectName: savedProject.projectName,
      artboards: savedProject.artboards,
      activeArtboardId: savedProject.activeArtboardId,
      canvasSnapshots: savedProject.canvasSnapshots,
      canvasObjects: savedProject.canvasObjects,
      visualAssets,
      visualAssetsLoaded: true,
      userCompositions,
      finishSettings: {
        ...defaultFinishSettings,
        ...savedProject.finishSettings
      },
      exportSettings: {
        ...defaultExportSettings,
        ...savedProject.exportSettings
      },
      selectedObjectId: null,
      selectedLayerIds: [],
      selectionRequest: null,
      layerActionRequest: null,
      libraryActionRequest: null,
      exportRequest: null,
      projectJsonExportRequest: null,
      viewSettings: {
        ...savedProject.viewSettings,
        customGuides: savedProject.viewSettings.customGuides ?? []
      }
    });
    saveUserCompositionsToLocalStorage(userCompositions);
    void replaceVisualAssetsInIndexedDb(visualAssets);

    return true;
  },
  saveProjectToLocalStorage: () => {
    const savedProject = get().getSavedProject();

    localStorage.setItem(localProjectKey, JSON.stringify(savedProject));
  },
  loadProjectFromLocalStorage: () => {
    const rawProject = localStorage.getItem(localProjectKey);

    if (!rawProject) {
      return false;
    }

    let savedProject: SavedProject;

    try {
      savedProject = JSON.parse(rawProject) as SavedProject;
    } catch {
      return false;
    }

    return get().importSavedProject(savedProject);
  },
  toggleGrid: () =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        showGrid: !state.viewSettings.showGrid
      }
    })),
  toggleGoldenRatio: () =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        showGoldenRatio: !state.viewSettings.showGoldenRatio
      }
    })),
  addCanvasGuide: (orientation) =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        customGuides: [
          ...state.viewSettings.customGuides,
          {
            angle: getInitialGuideAngle(orientation),
            id: crypto.randomUUID(),
            orientation,
            position: getNextGuidePosition(
              state.viewSettings.customGuides,
              orientation
            )
          }
        ]
      }
    })),
  updateCanvasGuide: (id, position, angle) =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        customGuides: state.viewSettings.customGuides.map((guide) =>
          guide.id === id
            ? {
                ...guide,
                angle:
                  angle === undefined
                    ? guide.angle
                    : clampGuideAngle(angle, guide.orientation),
                position: clampGuidePosition(position)
              }
            : guide
        )
      }
    })),
  removeCanvasGuide: (id) =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        customGuides: state.viewSettings.customGuides.filter(
          (guide) => guide.id !== id
        )
      }
    })),
  clearCanvasGuides: () =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        customGuides: []
      }
    })),
  addArtboard: (format, orientation) =>
    set((state) => {
      const artboard = createArtboard(
        format,
        orientation,
        state.artboards.length + 1,
        state.exportSettings.dpi
      );

      return {
        artboards: [...state.artboards, artboard],
        activeArtboardId: artboard.id,
        selectedObjectId: null,
        selectedLayerIds: [],
        selectionRequest: null
      };
    }),
  updateActiveArtboardFormat: (format, orientation) =>
    set((state) => {
      const dimensions = getFormatPixels(format, orientation, state.exportSettings.dpi);

      return {
        artboards: state.artboards.map((artboard) =>
          artboard.id === state.activeArtboardId
            ? {
                ...artboard,
                formatId: format.id,
                orientation,
                width: dimensions.width,
                height: dimensions.height
              }
            : artboard
        )
      };
    }),
  updateActiveArtboardSize: (width, height) =>
    set((state) => ({
      artboards: state.artboards.map((artboard) =>
        artboard.id === state.activeArtboardId
          ? {
              ...artboard,
              formatId: getMatchingFormatId(
                width,
                height,
                state.exportSettings.dpi
              ),
              orientation: width >= height ? "landscape" : "portrait",
              width,
              height
            }
          : artboard
      )
    })),
  setActiveArtboard: (id) =>
    set({
      activeArtboardId: id,
      selectedObjectId: null,
      selectedLayerIds: [],
      selectionRequest: null
    }),
  setCanvasSnapshot: (artboardId, snapshot) =>
    set((state) => ({
      canvasSnapshots: {
        ...state.canvasSnapshots,
        [artboardId]: snapshot
      }
    })),
  setCursorStyle: (cursorStyle) => set({ cursorStyle }),
  setColorMode: (colorMode) => {
    saveColorModeToLocalStorage(colorMode);
    set({ colorMode });
  },
  setTextFontFamily: (textFontFamily) => set({ textFontFamily }),
  setFinishSettings: (settings) =>
    set((state) => ({
      finishSettings: {
        ...state.finishSettings,
        ...settings,
        colorAdjustments: settings.colorAdjustments
          ? {
              ...state.finishSettings.colorAdjustments,
              ...settings.colorAdjustments
            }
          : state.finishSettings.colorAdjustments
      }
    })),
  setGradientToolSettings: (settings) =>
    set((state) => ({
      gradientToolSettings: {
        ...state.gradientToolSettings,
        ...settings,
        intensity:
          typeof settings.intensity === "number"
            ? Math.min(Math.max(settings.intensity, 0), 1)
            : state.gradientToolSettings.intensity
      }
    })),
  setExportSettings: (settings) =>
    set((state) => {
      const nextDpi =
        settings.dpi === undefined
          ? state.exportSettings.dpi
          : clampDpi(settings.dpi);
      const nextExportSettings = {
        ...state.exportSettings,
        ...settings,
        dpi: nextDpi
      };

      return {
        exportSettings: nextExportSettings,
        artboards: state.artboards.map((artboard) => {
          const format = canvasFormats.find((item) => item.id === artboard.formatId);

          if (!format) {
            return artboard;
          }

          const dimensions = getFormatPixels(format, artboard.orientation, nextDpi);

          return {
            ...artboard,
            width: dimensions.width,
            height: dimensions.height
          };
        })
      };
    })
}));

function getMatchingFormatId(width: number, height: number, dpi: number) {
  const orientation = width >= height ? "landscape" : "portrait";
  const match = canvasFormats.find((format) => {
    const dimensions = getFormatPixels(format, orientation, dpi);

    return (
      Math.abs(dimensions.width - width) <= 2 &&
      Math.abs(dimensions.height - height) <= 2
    );
  });

  return match?.id ?? "custom";
}

function clampDpi(value: number) {
  if (!Number.isFinite(value)) {
    return defaultCanvasDpi;
  }

  return Math.min(Math.max(Math.round(value), minCanvasDpi), maxCanvasDpi);
}

function isValidSavedProject(project: SavedProject) {
  return (
    project.version === 1 &&
    typeof project.projectName === "string" &&
    Array.isArray(project.artboards) &&
    project.artboards.length > 0 &&
    project.artboards.some((artboard) => artboard.id === project.activeArtboardId) &&
    typeof project.canvasSnapshots === "object" &&
    Array.isArray(project.canvasObjects) &&
    typeof project.viewSettings === "object"
  );
}

function createLayerActionRequest(
  currentRequest: LayerActionRequest | null,
  objectIds: string[],
  action: LayerActionRequest["action"]
): LayerActionRequest {
  const uniqueObjectIds = uniqueIds(objectIds);

  return {
    action,
    objectId: uniqueObjectIds[0],
    objectIds: uniqueObjectIds,
    requestId: (currentRequest?.requestId ?? 0) + 1
  };
}

function uniqueIds(ids: string[]) {
  return Array.from(new Set(ids.filter(Boolean)));
}

function reorderLayerSummaries(
  layers: CanvasObjectSummary[],
  ids: string[],
  direction: "up" | "down"
) {
  const selectedIds = new Set(ids);
  const nextLayers = [...layers];
  let moved = false;

  if (direction === "up") {
    for (let index = nextLayers.length - 2; index >= 0; index -= 1) {
      const current = nextLayers[index];
      const above = nextLayers[index + 1];

      if (selectedIds.has(current.id) && !selectedIds.has(above.id)) {
        [nextLayers[index], nextLayers[index + 1]] = [above, current];
        moved = true;
      }
    }
  } else {
    for (let index = 1; index < nextLayers.length; index += 1) {
      const current = nextLayers[index];
      const below = nextLayers[index - 1];

      if (selectedIds.has(current.id) && !selectedIds.has(below.id)) {
        [nextLayers[index], nextLayers[index - 1]] = [below, current];
        moved = true;
      }
    }
  }

  return moved ? nextLayers : layers;
}

function getNextGuidePosition(
  guides: CanvasGuide[],
  orientation: CanvasGuide["orientation"]
) {
  const guidePositions = [50, 33.33, 66.67, 25, 75, 20, 80, 10, 90];
  const sameOrientationCount = guides.filter(
    (guide) => guide.orientation === orientation
  ).length;

  return guidePositions[sameOrientationCount % guidePositions.length];
}

function clampGuidePosition(position: number) {
  if (!Number.isFinite(position)) {
    return 50;
  }

  return Math.min(Math.max(position, 0), 100);
}

function getInitialGuideAngle(orientation: CanvasGuide["orientation"]) {
  if (orientation === "diagonal-down") {
    return 45;
  }

  if (orientation === "diagonal-up") {
    return -45;
  }

  return undefined;
}

function clampGuideAngle(
  angle: number,
  orientation: CanvasGuide["orientation"]
) {
  if (!Number.isFinite(angle)) {
    return getInitialGuideAngle(orientation);
  }

  return Math.min(Math.max(angle, -78), 78);
}

function loadUserCompositionsFromLocalStorage(): SavedComposition[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  if (localStorage.getItem(localCompositionsResetKey) !== "done") {
    localStorage.removeItem(localCompositionsKey);
    localStorage.setItem(localCompositionsResetKey, "done");
    return [];
  }

  const rawCompositions = localStorage.getItem(localCompositionsKey);

  if (!rawCompositions) {
    return [];
  }

  try {
    const compositions = JSON.parse(rawCompositions) as SavedComposition[];
    return Array.isArray(compositions) ? compositions.filter(isSavedComposition) : [];
  } catch {
    return [];
  }
}

function saveUserCompositionsToLocalStorage(compositions: SavedComposition[]) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(localCompositionsKey, JSON.stringify(compositions));
}

function loadVisualAssetsFromLocalStorage(): VisualAsset[] {
  if (typeof localStorage === "undefined") {
    return [];
  }

  const rawAssets = localStorage.getItem(localVisualAssetsKey);

  if (!rawAssets) {
    return [];
  }

  try {
    const assets = JSON.parse(rawAssets) as VisualAsset[];
    return Array.isArray(assets) ? assets.filter(isVisualAsset) : [];
  } catch {
    return [];
  }
}

function removeLegacyVisualAssetsFromLocalStorage() {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.removeItem(localVisualAssetsKey);
}

function mergeVisualAssets(
  indexedDbAssets: VisualAsset[],
  legacyAssets: VisualAsset[]
) {
  const assetMap = new Map<string, VisualAsset>();

  [...legacyAssets, ...indexedDbAssets].forEach((asset) => {
    assetMap.set(asset.id, asset);
  });

  return Array.from(assetMap.values()).sort(
    (firstAsset, secondAsset) =>
      new Date(secondAsset.createdAt).getTime() -
      new Date(firstAsset.createdAt).getTime()
  );
}

function dedupeVisualAssetsByDataUrl(assets: VisualAsset[]) {
  const seenDataUrls = new Set<string>();

  return assets.filter((asset) => {
    if (!asset.dataUrl) {
      return true;
    }

    if (seenDataUrls.has(asset.dataUrl)) {
      return false;
    }

    seenDataUrls.add(asset.dataUrl);
    return true;
  });
}

function mergeUserCompositions(
  currentCompositions: SavedComposition[],
  importedCompositions: SavedComposition[]
) {
  const nextCompositions = [...currentCompositions];

  importedCompositions.forEach((composition) => {
    const existingIndex = nextCompositions.findIndex(
      (item) => item.id === composition.id
    );

    if (existingIndex >= 0) {
      nextCompositions[existingIndex] = composition;
      return;
    }

    nextCompositions.push(composition);
  });

  return nextCompositions;
}

function isVisualAsset(value: unknown): value is VisualAsset {
  if (!value || typeof value !== "object") {
    return false;
  }

  const asset = value as Partial<VisualAsset>;

  return (
    typeof asset.id === "string" &&
    typeof asset.name === "string" &&
    typeof asset.dataUrl === "string" &&
    typeof asset.mimeType === "string" &&
    typeof asset.createdAt === "string" &&
    (asset.category === "compositions" ||
      asset.category === "pigments" ||
      asset.category === "pigment-mixes" ||
      asset.category === "color-palettes" ||
      asset.category === "textures" ||
      asset.category === "final-works")
  );
}

function loadColorModeFromLocalStorage(): ColorMode {
  if (typeof localStorage === "undefined") {
    return "standard";
  }

  const value = localStorage.getItem(localColorModeKey);

  return value === "light" || value === "dark" || value === "standard"
    ? value
    : "standard";
}

function saveColorModeToLocalStorage(colorMode: ColorMode) {
  if (typeof localStorage === "undefined") {
    return;
  }

  localStorage.setItem(localColorModeKey, colorMode);
}

function isSavedComposition(value: unknown): value is SavedComposition {
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
