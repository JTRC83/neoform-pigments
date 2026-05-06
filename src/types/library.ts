import type { CanvasObjectType } from "./editor";

export type LibraryTab = {
  id: "forms" | "pigments" | "textures" | "compositions";
  label: string;
  swatch: string;
};

export type FormPreset = {
  id: string;
  label: string;
  type: Exclude<CanvasObjectType, "text">;
  fill: string;
};

export type PigmentSwatch = {
  id: string;
  label: string;
  color: string;
};

export type TexturePreset = {
  id: string;
  label: string;
  background: string;
  foreground: string;
  accent?: string;
  kind:
    | "stripes"
    | "dots"
    | "checker"
    | "grid"
    | "crosshatch"
    | "fineLines"
    | "diagonalGrid"
    | "waves"
    | "halftone"
    | "rings"
    | "zigzag"
    | "confetti"
    | "bauhausBlocks"
    | "bauhausWeave"
    | "bendayDots"
    | "popHalftone"
    | "serigraphyBars"
    | "serigraphyScreen"
    | "opArtWaves"
    | "popBurst"
    | "shadeGradient"
    | "linearGradient"
    | "radialGradient"
    | "meshGradient"
    | "grain"
    | "filmGrain"
    | "noise"
    | "speckle"
    | "paper";
  group?: "gradient" | "bauhaus" | "popArt" | "serigraphy" | "utility" | "rasterFinish";
  renderMode?: "vector" | "raster-export";
  scale?: number;
  intensity?: number;
};

export type CompositionItem = {
  type: Exclude<CanvasObjectType, "text">;
  fill: string;
  offsetX: number;
  offsetY: number;
  scale: number;
};

export type SavedCompositionObject = {
  object: Record<string, unknown>;
  offsetX: number;
  offsetY: number;
};

export type CompositionPreset = {
  id: string;
  label: string;
  items?: CompositionItem[];
  objects?: SavedCompositionObject[];
  source?: "preset" | "saved";
};

export type SavedComposition = Required<
  Pick<CompositionPreset, "id" | "label" | "objects">
> & {
  source: "saved";
};
