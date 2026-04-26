import type { Artboard, CanvasFormat, CanvasOrientation } from "../types/editor";

export const canvasFormats: CanvasFormat[] = [
  { id: "square", label: "Square", width: 1080, height: 1080 },
  { id: "classic", label: "Classic 4:3", width: 1600, height: 1200 },
  { id: "wide", label: "Wide 16:9", width: 1920, height: 1080 },
  { id: "poster", label: "Poster", width: 1200, height: 1800 },
  { id: "story", label: "Story", width: 1080, height: 1920 }
];

export function createArtboard(
  format: CanvasFormat,
  orientation: CanvasOrientation,
  artboardNumber: number
): Artboard {
  const isLandscape = orientation === "landscape";
  const width = isLandscape
    ? Math.max(format.width, format.height)
    : Math.min(format.width, format.height);
  const height = isLandscape
    ? Math.min(format.width, format.height)
    : Math.max(format.width, format.height);

  return {
    id: crypto.randomUUID(),
    name: `Canvas ${artboardNumber}`,
    formatId: format.id,
    orientation,
    width,
    height
  };
}

export const initialArtboard = createArtboard(canvasFormats[1], "landscape", 1);
