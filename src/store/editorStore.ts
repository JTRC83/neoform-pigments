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
  ColorMode,
  CompositionSaveRequest,
  CanvasOrientation,
  EditorTool,
  EditorHistoryRequest,
  ExportRequest,
  LayerActionRequest,
  LibraryActionRequest,
  ProjectImportRequest,
  ProjectPersistenceRequest,
  PropertyUpdateRequest,
  SavedProject,
  SelectedObjectProperties,
  TextFontFamily
} from "../types/editor";
import type {
  CompositionPreset,
  FormPreset,
  PigmentSwatch,
  TexturePreset
} from "../types/library";
import type { SavedComposition } from "../types/library";
import { createArtboard, initialArtboard } from "../canvas/canvasPresets";
import { defaultTextFontFamily } from "../utils/textFonts";

const localProjectKey = "neoform-pigments:project:v1";
const localCompositionsKey = "neoform-pigments:user-compositions:v1";
const localCompositionsResetKey = "neoform-pigments:compositions-reset:v1";
const localColorModeKey = "neoform-pigments:color-mode:v1";

const defaultFinishSettings: CanvasFinishSettings = {
  filmGrainEnabled: false,
  filmGrainAmount: 0.45,
  filmGrainRoughness: 0.6
};

type EditorState = {
  projectName: string;
  activeTool: EditorTool;
  artboards: Artboard[];
  activeArtboardId: string;
  canvasSnapshots: Record<string, string>;
  canvasObjects: CanvasObjectSummary[];
  userCompositions: SavedComposition[];
  selectedObjectId: string | null;
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
  compositionSaveRequest: CompositionSaveRequest | null;
  selectedObjectProperties: SelectedObjectProperties | null;
  cursorStyle: CanvasCursorStyle;
  colorMode: ColorMode;
  textFontFamily: TextFontFamily;
  finishSettings: CanvasFinishSettings;
  viewSettings: CanvasViewSettings;
  setActiveTool: (tool: EditorTool) => void;
  addCanvasObject: (object: CanvasObjectSummary) => void;
  setSelectedObjectId: (id: string | null) => void;
  requestObjectSelection: (id: string | null) => void;
  toggleLayerVisibility: (id: string) => void;
  toggleLayerLock: (id: string) => void;
  deleteLayer: (id: string) => void;
  moveLayer: (id: string, direction: "up" | "down") => void;
  renameLayer: (id: string, name: string) => void;
  requestAddLibraryForm: (form: FormPreset) => void;
  requestApplyPigment: (pigment: PigmentSwatch) => void;
  requestApplyTexture: (texture: TexturePreset) => void;
  requestAddComposition: (composition: CompositionPreset) => void;
  requestSaveSelectionAsComposition: () => void;
  addUserComposition: (composition: SavedComposition) => void;
  requestExportPng: () => void;
  requestExportSvg: () => void;
  requestExportAllPng: () => void;
  requestUndo: () => void;
  requestRedo: () => void;
  requestViewportAction: (action: CanvasViewportRequest["action"]) => void;
  requestSelectedObjectPropertyUpdate: (
    properties: Partial<SelectedObjectProperties>
  ) => void;
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
  updateCanvasGuide: (id: string, position: number) => void;
  removeCanvasGuide: (id: string) => void;
  clearCanvasGuides: () => void;
  addArtboard: (format: CanvasFormat, orientation: CanvasOrientation) => void;
  updateActiveArtboardSize: (width: number, height: number) => void;
  setActiveArtboard: (id: string) => void;
  setCanvasSnapshot: (artboardId: string, snapshot: string) => void;
  setCursorStyle: (cursorStyle: CanvasCursorStyle) => void;
  setColorMode: (colorMode: ColorMode) => void;
  setTextFontFamily: (fontFamily: TextFontFamily) => void;
  setFinishSettings: (settings: Partial<CanvasFinishSettings>) => void;
};

export const useEditorStore = create<EditorState>((set, get) => ({
  projectName: "N€O FORM & PIGM€NT$",
  activeTool: "select",
  artboards: [initialArtboard],
  activeArtboardId: initialArtboard.id,
  canvasSnapshots: {},
  canvasObjects: [],
  userCompositions: loadUserCompositionsFromLocalStorage(),
  selectedObjectId: null,
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
  compositionSaveRequest: null,
  selectedObjectProperties: null,
  cursorStyle: "auto",
  colorMode: loadColorModeFromLocalStorage(),
  textFontFamily: defaultTextFontFamily,
  finishSettings: defaultFinishSettings,
  viewSettings: {
    customGuides: [],
    showGrid: false,
    showGoldenRatio: false
  },
  setActiveTool: (tool) => set({ activeTool: tool }),
  addCanvasObject: (object) =>
    set((state) => ({
      canvasObjects: [...state.canvasObjects, object],
      selectedObjectId: object.id
    })),
  setSelectedObjectId: (id) => set({ selectedObjectId: id }),
  requestObjectSelection: (id) =>
    set((state) => ({
      selectedObjectId: id,
      selectionRequest: {
        objectId: id,
        requestId: (state.selectionRequest?.requestId ?? 0) + 1
      }
    }))
  ,
  toggleLayerVisibility: (id) =>
    set((state) => {
      const target = state.canvasObjects.find((object) => object.id === id);
      const willBeHidden = target?.visible;
      const shouldClearSelection = willBeHidden && state.selectedObjectId === id;

      return {
        canvasObjects: state.canvasObjects.map((object) =>
          object.id === id ? { ...object, visible: !object.visible } : object
        ),
        selectedObjectId: shouldClearSelection ? null : state.selectedObjectId,
        selectionRequest: shouldClearSelection
          ? {
              objectId: null,
              requestId: (state.selectionRequest?.requestId ?? 0) + 1
            }
          : state.selectionRequest,
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          id,
          "toggle-visibility"
        )
      };
    }),
  toggleLayerLock: (id) =>
    set((state) => {
      const target = state.canvasObjects.find((object) => object.id === id);
      const willBeLocked = !target?.locked;
      const shouldClearSelection = willBeLocked && state.selectedObjectId === id;

      return {
        canvasObjects: state.canvasObjects.map((object) =>
          object.id === id ? { ...object, locked: !object.locked } : object
        ),
        selectedObjectId: shouldClearSelection ? null : state.selectedObjectId,
        selectionRequest: shouldClearSelection
          ? {
              objectId: null,
              requestId: (state.selectionRequest?.requestId ?? 0) + 1
            }
          : state.selectionRequest,
        layerActionRequest: createLayerActionRequest(
          state.layerActionRequest,
          id,
          "toggle-lock"
        )
      };
    }),
  deleteLayer: (id) =>
    set((state) => ({
      canvasObjects: state.canvasObjects.filter((object) => object.id !== id),
      selectedObjectId: state.selectedObjectId === id ? null : state.selectedObjectId,
      selectionRequest:
        state.selectedObjectId === id
          ? {
              objectId: null,
              requestId: (state.selectionRequest?.requestId ?? 0) + 1
            }
          : state.selectionRequest,
      layerActionRequest: createLayerActionRequest(
        state.layerActionRequest,
        id,
        "delete"
      )
    })),
  moveLayer: (id, direction) =>
    set((state) => {
      const object = state.canvasObjects.find((item) => item.id === id);

      if (!object) {
        return {};
      }

      const activeObjects = state.canvasObjects.filter(
        (item) => item.artboardId === object.artboardId
      );
      const activeIndex = activeObjects.findIndex((item) => item.id === id);
      const targetIndex = direction === "up" ? activeIndex + 1 : activeIndex - 1;

      if (targetIndex < 0 || targetIndex >= activeObjects.length) {
        return {};
      }

      const reorderedActiveObjects = [...activeObjects];
      [reorderedActiveObjects[activeIndex], reorderedActiveObjects[targetIndex]] = [
        reorderedActiveObjects[targetIndex],
        reorderedActiveObjects[activeIndex]
      ];

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
          id,
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
          id,
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
  requestSaveSelectionAsComposition: () =>
    set((state) => ({
      compositionSaveRequest: {
        requestId: (state.compositionSaveRequest?.requestId ?? 0) + 1
      }
    })),
  addUserComposition: (composition) =>
    set((state) => {
      const userCompositions = [...state.userCompositions, composition];
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
  setSelectedObjectProperties: (properties) =>
    set({ selectedObjectProperties: properties }),
  replaceCanvasObjectsForArtboard: (artboardId, objects) =>
    set((state) => ({
      canvasObjects: [
        ...state.canvasObjects.filter((object) => object.artboardId !== artboardId),
        ...objects
      ],
      selectedObjectId: null,
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
      finishSettings: state.finishSettings,
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

    set({
      projectName: savedProject.projectName,
      artboards: savedProject.artboards,
      activeArtboardId: savedProject.activeArtboardId,
      canvasSnapshots: savedProject.canvasSnapshots,
      canvasObjects: savedProject.canvasObjects,
      userCompositions,
      finishSettings: {
        ...defaultFinishSettings,
        ...savedProject.finishSettings
      },
      selectedObjectId: null,
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
  updateCanvasGuide: (id, position) =>
    set((state) => ({
      viewSettings: {
        ...state.viewSettings,
        customGuides: state.viewSettings.customGuides.map((guide) =>
          guide.id === id
            ? { ...guide, position: clampGuidePosition(position) }
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
      const artboard = createArtboard(format, orientation, state.artboards.length + 1);

      return {
        artboards: [...state.artboards, artboard],
        activeArtboardId: artboard.id,
        selectedObjectId: null,
        selectionRequest: null
      };
    }),
  updateActiveArtboardSize: (width, height) =>
    set((state) => ({
      artboards: state.artboards.map((artboard) =>
        artboard.id === state.activeArtboardId
          ? {
              ...artboard,
              formatId: "custom",
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
        ...settings
      }
    }))
}));

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
  objectId: string,
  action: LayerActionRequest["action"]
): LayerActionRequest {
  return {
    objectId,
    action,
    requestId: (currentRequest?.requestId ?? 0) + 1
  };
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
