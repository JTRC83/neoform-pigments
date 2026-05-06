import type { Artboard, CanvasFormat, CanvasOrientation } from "../types/editor";

export const defaultCanvasDpi = 300;
export const minCanvasDpi = 150;
export const maxCanvasDpi = 600;

export const canvasFormats: CanvasFormat[] = [
  createPrintFormat("a1", "A1 594 x 841 mm", 594, 841),
  createPrintFormat("a2", "A2 420 x 594 mm", 420, 594),
  createPrintFormat("a3", "A3 297 x 420 mm", 297, 420),
  createPrintFormat("a4", "A4 210 x 297 mm", 210, 297),
  createPrintFormat("a5", "A5 148 x 210 mm", 148, 210),
  createPrintFormat("poster-50x70", "Poster 50 x 70 cm", 500, 700)
];

export function createArtboard(
  format: CanvasFormat,
  orientation: CanvasOrientation,
  artboardNumber: number,
  dpi = defaultCanvasDpi
): Artboard {
  const dimensions = getFormatPixels(format, orientation, dpi);

  return {
    id: crypto.randomUUID(),
    name: `Canvas ${artboardNumber}`,
    formatId: format.id,
    orientation,
    width: dimensions.width,
    height: dimensions.height
  };
}

export function getFormatPixels(
  format: CanvasFormat,
  orientation: CanvasOrientation,
  dpi = defaultCanvasDpi
) {
  const baseWidth = format.widthMm
    ? millimetersToPixels(format.widthMm, dpi)
    : format.width;
  const baseHeight = format.heightMm
    ? millimetersToPixels(format.heightMm, dpi)
    : format.height;
  const isLandscape = orientation === "landscape";

  return {
    width: isLandscape ? Math.max(baseWidth, baseHeight) : Math.min(baseWidth, baseHeight),
    height: isLandscape ? Math.min(baseWidth, baseHeight) : Math.max(baseWidth, baseHeight)
  };
}

function createPrintFormat(
  id: string,
  label: string,
  widthMm: number,
  heightMm: number
): CanvasFormat {
  return {
    id,
    label,
    width: millimetersToPixels(widthMm, defaultCanvasDpi),
    height: millimetersToPixels(heightMm, defaultCanvasDpi),
    widthMm,
    heightMm
  };
}

function millimetersToPixels(millimeters: number, dpi: number) {
  return Math.round((millimeters / 25.4) * dpi);
}

export const initialArtboard = createArtboard(canvasFormats[3], "landscape", 1);
