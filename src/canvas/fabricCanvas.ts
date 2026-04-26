import { Canvas } from "fabric";

export type FabricCanvasInstance = Canvas;

export function createFabricCanvas(element: HTMLCanvasElement) {
  const { width, height } = getCanvasSize(element);

  return new Canvas(element, {
    width,
    height,
    backgroundColor: "#ffffff",
    preserveObjectStacking: true,
    selection: true
  });
}

export function resizeFabricCanvas(canvas: FabricCanvasInstance) {
  const element = canvas.getElement();
  const { width, height } = getCanvasSize(element);

  canvas.setDimensions({ width, height });
  canvas.requestRenderAll();
}

export function disposeFabricCanvas(canvas: FabricCanvasInstance) {
  return canvas.dispose();
}

function getCanvasSize(element: HTMLCanvasElement) {
  const parent = element.parentElement;

  return {
    width: parent?.clientWidth ?? 1024,
    height: parent?.clientHeight ?? 768
  };
}
