import type { PointerEvent as ReactPointerEvent } from "react";
import { clsx } from "../utils/clsx";
import type { CanvasGuide } from "../types/editor";

type CanvasGuidesProps = {
  customGuides: CanvasGuide[];
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number) => void;
  showGrid: boolean;
  showGoldenRatio: boolean;
};

export function CanvasGuides({
  customGuides,
  onRemoveGuide,
  onUpdateGuide,
  showGrid,
  showGoldenRatio
}: CanvasGuidesProps) {
  return (
    <div className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
      {showGrid ? <GridOverlay /> : null}
      {showGoldenRatio ? <GoldenRatioOverlay /> : null}
      <CustomGuides
        guides={customGuides}
        onRemoveGuide={onRemoveGuide}
        onUpdateGuide={onUpdateGuide}
      />
    </div>
  );
}

function GridOverlay() {
  return (
    <div
      className="absolute inset-0 bg-[length:32px_32px]"
      style={{
        backgroundImage:
          "linear-gradient(rgb(var(--color-ink) / 0.18) 1px, transparent 1px), linear-gradient(90deg, rgb(var(--color-ink) / 0.18) 1px, transparent 1px)"
      }}
    />
  );
}

function CustomGuides({
  guides,
  onRemoveGuide,
  onUpdateGuide
}: {
  guides: CanvasGuide[];
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number) => void;
}) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0">
      {guides.map((guide) => {
        const isVertical = guide.orientation === "vertical";

        return (
          <div
            key={guide.id}
            className={clsx(
              "pointer-events-auto absolute group",
              isVertical
                ? "top-0 h-full w-4 -translate-x-1/2 cursor-ew-resize"
                : "left-0 h-4 w-full -translate-y-1/2 cursor-ns-resize"
            )}
            onPointerDown={(event) =>
              handleGuideDragStart(event, guide, onUpdateGuide)
            }
            style={
              isVertical
                ? { left: `${guide.position}%` }
                : { top: `${guide.position}%` }
            }
            title="Arrastra la guía"
          >
            <span
              className={clsx(
                "absolute border-cobalt",
                isVertical
                  ? "left-1/2 top-0 h-full border-l-2"
                  : "left-0 top-1/2 w-full border-t-2"
              )}
            />
            <button
              type="button"
              className={clsx(
                "pointer-events-auto absolute grid h-5 w-5 place-items-center border-2 border-ink bg-punch text-[11px] font-black leading-none text-paper opacity-90 shadow-brutal-sm transition hover:-translate-y-0.5",
                isVertical ? "left-1/2 top-1 -translate-x-1/2" : "left-1 top-1/2 -translate-y-1/2"
              )}
              onClick={(event) => {
                event.stopPropagation();
                onRemoveGuide(guide.id);
              }}
              onPointerDown={(event) => event.stopPropagation()}
              aria-label="Remove guide"
              title="Eliminar guía"
            >
              x
            </button>
          </div>
        );
      })}
    </div>
  );
}

function handleGuideDragStart(
  event: ReactPointerEvent<HTMLDivElement>,
  guide: CanvasGuide,
  onUpdateGuide: (id: string, position: number) => void
) {
  event.preventDefault();
  event.stopPropagation();

  const guideContainer = event.currentTarget.parentElement;
  const canvasRect = guideContainer?.getBoundingClientRect();

  if (!canvasRect) {
    return;
  }

  const updateGuidePosition = (pointerEvent: PointerEvent) => {
    const nextPosition =
      guide.orientation === "vertical"
        ? ((pointerEvent.clientX - canvasRect.left) / canvasRect.width) * 100
        : ((pointerEvent.clientY - canvasRect.top) / canvasRect.height) * 100;

    onUpdateGuide(guide.id, nextPosition);
  };

  const stopDragging = () => {
    window.removeEventListener("pointermove", updateGuidePosition);
    window.removeEventListener("pointerup", stopDragging);
  };

  updateGuidePosition(event.nativeEvent);
  window.addEventListener("pointermove", updateGuidePosition);
  window.addEventListener("pointerup", stopDragging);
}

function GoldenRatioOverlay() {
  const verticalLines = ["left-[38.2%]", "left-[61.8%]"];
  const horizontalLines = ["top-[38.2%]", "top-[61.8%]"];

  return (
    <div className="absolute inset-0">
      {verticalLines.map((position) => (
        <div
          key={position}
          className={clsx(
            "absolute top-0 h-full border-l-2 border-punch",
            position
          )}
        />
      ))}
      {horizontalLines.map((position) => (
        <div
          key={position}
          className={clsx(
            "absolute left-0 w-full border-t-2 border-punch",
            position
          )}
        />
      ))}
      <div className="absolute left-[61.8%] top-[38.2%] border-2 border-ink bg-punch px-2 py-0.5 text-[10px] font-black uppercase text-paper shadow-brutal-sm">
        phi
      </div>
    </div>
  );
}
