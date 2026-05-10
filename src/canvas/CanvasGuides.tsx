import type { PointerEvent as ReactPointerEvent } from "react";
import { clsx } from "../utils/clsx";
import type { CanvasGuide } from "../types/editor";

type CanvasGuidesProps = {
  customGuides: CanvasGuide[];
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number, angle?: number) => void;
  showGrid: boolean;
  showGoldenRatio: boolean;
};

type DiagonalGuideHandle = "line" | "start" | "end";

type GuidePoint = {
  x: number;
  y: number;
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
  onUpdateGuide: (id: string, position: number, angle?: number) => void;
}) {
  if (guides.length === 0) {
    return null;
  }

  return (
    <div className="absolute inset-0" data-guide-layer="true">
      {guides.map((guide) => {
        const isVertical = guide.orientation === "vertical";
        const isHorizontal = guide.orientation === "horizontal";
        const isDiagonal = !isVertical && !isHorizontal;

        if (isDiagonal) {
          return (
            <DiagonalGuide
              key={guide.id}
              guide={guide}
              onRemoveGuide={onRemoveGuide}
              onUpdateGuide={onUpdateGuide}
            />
          );
        }

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
                isVertical
                  ? "left-1/2 top-1 -translate-x-1/2"
                  : "left-1 top-1/2 -translate-y-1/2"
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

function DiagonalGuide({
  guide,
  onRemoveGuide,
  onUpdateGuide
}: {
  guide: CanvasGuide;
  onRemoveGuide: (id: string) => void;
  onUpdateGuide: (id: string, position: number, angle?: number) => void;
}) {
  const line = getDiagonalGuideLine(guide);
  const midpoint = getLineMidpoint(line.start, line.end);

  return (
    <div className="pointer-events-none absolute inset-0 group">
      <svg
        className="pointer-events-none absolute inset-0 h-full w-full"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-hidden="true"
      >
        <line
          className="pointer-events-auto cursor-move"
          x1={line.start.x}
          y1={line.start.y}
          x2={line.end.x}
          y2={line.end.y}
          stroke="transparent"
          strokeWidth="8"
          onPointerDown={(event) =>
            handleGuideDragStart(event, guide, onUpdateGuide, "line")
          }
        />
        <line
          x1={line.start.x}
          y1={line.start.y}
          x2={line.end.x}
          y2={line.end.y}
          stroke="rgb(var(--color-cobalt))"
          strokeWidth="0.45"
          vectorEffect="non-scaling-stroke"
          strokeDasharray="8 5"
        />
      </svg>

      <GuideHandle
        label="A"
        point={line.start}
        title="Mover este extremo y anclar el opuesto"
        onPointerDown={(event) =>
          handleGuideDragStart(event, guide, onUpdateGuide, "start")
        }
      />
      <GuideHandle
        label="B"
        point={line.end}
        title="Mover este extremo y anclar el opuesto"
        onPointerDown={(event) =>
          handleGuideDragStart(event, guide, onUpdateGuide, "end")
        }
      />
      <button
        type="button"
        className="pointer-events-auto absolute grid h-5 w-5 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-ink bg-punch text-[11px] font-black leading-none text-paper opacity-90 shadow-brutal-sm transition hover:-translate-y-0.5"
        style={{ left: `${midpoint.x}%`, top: `${midpoint.y}%` }}
        onClick={(event) => {
          event.stopPropagation();
          onRemoveGuide(guide.id);
        }}
        onPointerDown={(event) => event.stopPropagation()}
        aria-label="Remove diagonal guide"
        title="Eliminar guía"
      >
        x
      </button>
    </div>
  );
}

function GuideHandle({
  label,
  onPointerDown,
  point,
  title
}: {
  label: string;
  onPointerDown: (event: ReactPointerEvent<HTMLButtonElement>) => void;
  point: GuidePoint;
  title: string;
}) {
  return (
    <button
      type="button"
      className="pointer-events-auto absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 place-items-center border-2 border-ink bg-pollen text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5"
      style={{ left: `${point.x}%`, top: `${point.y}%` }}
      onPointerDown={onPointerDown}
      title={title}
      aria-label={title}
    >
      {label}
    </button>
  );
}

function handleGuideDragStart(
  event: ReactPointerEvent<Element>,
  guide: CanvasGuide,
  onUpdateGuide: (id: string, position: number, angle?: number) => void,
  handle: DiagonalGuideHandle = "line"
) {
  event.preventDefault();
  event.stopPropagation();

  const guideContainer = event.currentTarget.closest("[data-guide-layer]");
  const canvasRect = guideContainer?.getBoundingClientRect();

  if (!canvasRect) {
    return;
  }

  const initialLine = getDiagonalGuideLine(guide);
  const anchor =
    handle === "start"
      ? initialLine.end
      : handle === "end"
        ? initialLine.start
        : null;

  const updateGuidePosition = (pointerEvent: PointerEvent) => {
    const x = ((pointerEvent.clientX - canvasRect.left) / canvasRect.width) * 100;
    const y = ((pointerEvent.clientY - canvasRect.top) / canvasRect.height) * 100;

    if (anchor) {
      const angle = normalizeGuideAngle(
        Math.atan2(y - anchor.y, x - anchor.x) * (180 / Math.PI)
      );
      const position = getDiagonalPositionForAngle(anchor, angle);

      onUpdateGuide(guide.id, position, angle);
      return;
    }

    const nextPosition = getGuidePositionFromPointer(guide, x, y);

    onUpdateGuide(guide.id, nextPosition, guide.angle);
  };

  const stopDragging = () => {
    window.removeEventListener("pointermove", updateGuidePosition);
    window.removeEventListener("pointerup", stopDragging);
  };

  updateGuidePosition(event.nativeEvent);
  window.addEventListener("pointermove", updateGuidePosition);
  window.addEventListener("pointerup", stopDragging);
}

function getGuidePositionFromPointer(
  guide: CanvasGuide,
  x: number,
  y: number
) {
  if (guide.orientation === "vertical") {
    return x;
  }

  if (guide.orientation === "horizontal") {
    return y;
  }

  const angle = getGuideAngle(guide);

  return getDiagonalPositionForAngle({ x, y }, angle);
}

function getDiagonalGuideLine(guide: CanvasGuide) {
  const angle = getGuideAngle(guide);
  const slope = Math.tan(angle * (Math.PI / 180));
  const candidates: GuidePoint[] = [
    { x: 0, y: guide.position - slope * 50 },
    { x: 100, y: guide.position + slope * 50 }
  ];

  if (Math.abs(slope) > 0.001) {
    candidates.push(
      { x: 50 - guide.position / slope, y: 0 },
      { x: 50 + (100 - guide.position) / slope, y: 100 }
    );
  }

  const points = dedupeGuidePoints(
    candidates.filter(
      (point) =>
        point.x >= -0.1 &&
        point.x <= 100.1 &&
        point.y >= -0.1 &&
        point.y <= 100.1
    )
  );

  const sortedPoints = points.sort((a, b) => a.x - b.x || a.y - b.y);

  return {
    end: sortedPoints[sortedPoints.length - 1] ?? { x: 100, y: guide.position },
    start: sortedPoints[0] ?? { x: 0, y: guide.position }
  };
}

function getGuideAngle(guide: CanvasGuide) {
  if (typeof guide.angle === "number") {
    return guide.angle;
  }

  if (guide.orientation === "diagonal-down") {
    return 45;
  }

  return -45;
}

function getDiagonalPositionForAngle(point: GuidePoint, angle: number) {
  const slope = Math.tan(angle * (Math.PI / 180));

  return point.y - slope * (point.x - 50);
}

function normalizeGuideAngle(angle: number) {
  let normalizedAngle = angle;

  while (normalizedAngle > 90) {
    normalizedAngle -= 180;
  }

  while (normalizedAngle < -90) {
    normalizedAngle += 180;
  }

  return Math.min(Math.max(normalizedAngle, -78), 78);
}

function getLineMidpoint(start: GuidePoint, end: GuidePoint) {
  return {
    x: (start.x + end.x) / 2,
    y: (start.y + end.y) / 2
  };
}

function dedupeGuidePoints(points: GuidePoint[]) {
  return points.filter(
    (point, index) =>
      !points.some(
        (otherPoint, otherIndex) =>
          otherIndex < index &&
          Math.abs(otherPoint.x - point.x) < 0.01 &&
          Math.abs(otherPoint.y - point.y) < 0.01
      )
  );
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
