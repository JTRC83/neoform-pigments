import {
  Hand,
  MousePointer2,
  Type
} from "lucide-react";
import { useState } from "react";
import { useEditorStore } from "../store/editorStore";
import type {
  CanvasFinishSettings,
  EditorTool,
  GradientToolDirection
} from "../types/editor";
import { clsx } from "../utils/clsx";

type ToolbarTool = {
  id: EditorTool;
  label: string;
  icon?: typeof MousePointer2;
};

const outlineShapeTools = new Set<EditorTool>([
  "rectangle",
  "ellipse",
  "triangle",
  "diamond",
  "pentagon",
  "hexagon",
  "straightLine",
  "curveLine",
  "waveLine"
]);

const tools: ToolbarTool[] = [
  { id: "select", label: "Select", icon: MousePointer2 },
  { id: "inverseSelection", label: "Inverse Select" },
  { id: "pan", label: "Pan", icon: Hand },
  { id: "rectangle", label: "Rectangle" },
  { id: "ellipse", label: "Ellipse" },
  { id: "triangle", label: "Triangle" },
  { id: "diamond", label: "Diamond" },
  { id: "pentagon", label: "Pentagon" },
  { id: "hexagon", label: "Hexagon" },
  { id: "straightLine", label: "Line" },
  { id: "curveLine", label: "Curve" },
  { id: "waveLine", label: "Wave" },
  { id: "text", label: "Text", icon: Type },
  { id: "pencilStroke", label: "Pencil" },
  { id: "nibStroke", label: "Nib" },
  { id: "markerStroke", label: "Marker" },
  { id: "gradientTool", label: "Gradient" },
  { id: "chainsawCut", label: "Chainsaw Cut" },
  { id: "lawnMower", label: "Remove BG" }
];

const grainFinishPresets: Array<
  Pick<CanvasFinishSettings, "filmGrainAmount" | "filmGrainRoughness"> & {
    label: string;
  }
> = [
  { label: "Soft", filmGrainAmount: 0.28, filmGrainRoughness: 0.35 },
  { label: "Press", filmGrainAmount: 0.46, filmGrainRoughness: 0.58 },
  { label: "Grit", filmGrainAmount: 0.68, filmGrainRoughness: 0.82 }
];

const gradientDirections: Array<{
  id: GradientToolDirection;
  label: string;
}> = [
  { id: "tl-br", label: "↘" },
  { id: "tr-bl", label: "↙" },
  { id: "left-right", label: "→" },
  { id: "right-left", label: "←" },
  { id: "top-bottom", label: "↓" },
  { id: "bottom-top", label: "↑" }
];

export function LeftToolbar() {
  const [isGrainPanelOpen, setIsGrainPanelOpen] = useState(false);
  const activeTool = useEditorStore((state) => state.activeTool);
  const finishSettings = useEditorStore((state) => state.finishSettings);
  const gradientToolSettings = useEditorStore((state) => state.gradientToolSettings);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);
  const setFinishSettings = useEditorStore((state) => state.setFinishSettings);
  const setGradientToolSettings = useEditorStore(
    (state) => state.setGradientToolSettings
  );

  return (
    <aside className="relative flex flex-col items-center gap-2 border-r-2 border-ink bg-bone py-2">
      <button
        type="button"
        onClick={() => setIsGrainPanelOpen((isOpen) => !isOpen)}
        className={clsx(
          "grid h-9 w-9 place-items-center border-2 border-ink text-ink shadow-brutal-sm transition hover:-translate-y-0.5",
          finishSettings.filmGrainEnabled
            ? "bg-punch text-paper ring-2 ring-inset ring-ink"
            : "bg-paper hover:bg-pollen"
        )}
        title="Analog film grain finish"
        aria-label="Analog film grain finish"
        data-tour="film-grain"
      >
        <ToolbarGrainIcon />
      </button>
      <div className="flex flex-col items-center gap-2">
        {tools.map((tool) => {
        const Icon = tool.icon;
        const isShapeTool = outlineShapeTools.has(tool.id);
        const isDrawingTool =
          tool.id === "pencilStroke" ||
          tool.id === "nibStroke" ||
          tool.id === "markerStroke" ||
          tool.id === "chainsawCut";

        return (
          <button
            key={tool.id}
            type="button"
            onClick={() => setActiveTool(tool.id)}
            data-tour={getToolTourId(tool.id)}
            className={clsx(
              "grid h-9 w-9 place-items-center border-2 border-ink text-ink shadow-brutal-sm transition hover:-translate-y-0.5",
              activeTool === tool.id
                ? "bg-oxide text-paper ring-2 ring-inset ring-ink"
                : "bg-paper hover:bg-pollen"
            )}
            title={tool.label}
            aria-label={tool.label}
          >
            {isShapeTool ? (
              <ToolbarShapeIcon type={tool.id} />
            ) : isDrawingTool ? (
              <ToolbarDrawIcon type={tool.id} />
            ) : tool.id === "inverseSelection" ? (
              <ToolbarInverseSelectionIcon />
            ) : tool.id === "gradientTool" ? (
              <ToolbarGradientIcon />
            ) : tool.id === "lawnMower" ? (
              <ToolbarLawnMowerIcon />
            ) : Icon ? (
              <Icon size={15} strokeWidth={1.7} />
            ) : null}
          </button>
        );
        })}
      </div>
      {activeTool === "gradientTool" ? (
        <div
          className="absolute left-full top-28 z-40 ml-2 w-56 border-2 border-ink bg-mineral p-2 text-ink shadow-brutal"
          data-tour="gradient-tool-panel"
        >
          <div className="mb-2 border-2 border-ink bg-paper px-2 py-1">
            <span className="block text-[10px] font-black uppercase">
              Gradient tool
            </span>
            <span className="block text-[8px] font-black uppercase text-ink/65">
              Click applies. Drag over a figure to set direction.
            </span>
          </div>
          <label className="mb-2 block border-2 border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase">
            Intensity {Math.round(gradientToolSettings.intensity * 100)}%
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={gradientToolSettings.intensity}
              onChange={(event) =>
                setGradientToolSettings({
                  intensity: Number(event.currentTarget.value)
                })
              }
              className="mt-1 h-3 w-full accent-[rgb(var(--color-oxide))]"
            />
          </label>
          <div className="grid grid-cols-3 gap-1">
            {gradientDirections.map((direction) => (
              <button
                key={direction.id}
                type="button"
                onClick={() => setGradientToolSettings({ direction: direction.id })}
                className={clsx(
                  "h-8 border-2 border-ink text-sm font-black shadow-brutal-sm transition hover:-translate-y-0.5",
                  gradientToolSettings.direction === direction.id
                    ? "bg-oxide text-paper"
                    : "bg-bone text-ink"
                )}
                title={`Gradient direction ${direction.id}`}
              >
                {direction.label}
              </button>
            ))}
          </div>
          <p className="mt-2 border-2 border-ink bg-bone px-2 py-1 text-[9px] font-black uppercase leading-tight">
            Works on the selected object. Drag direction overrides these arrows.
          </p>
        </div>
      ) : null}
      {isGrainPanelOpen ? (
        <div className="absolute left-full top-2 z-40 ml-2 w-56 border-2 border-ink bg-pollen p-2 text-ink shadow-brutal">
	          <div className="mb-2 flex items-center justify-between gap-2 border-2 border-ink bg-paper px-2 py-1">
            <span className="text-[10px] font-black uppercase">Film grain</span>
            <span className="border border-ink bg-bone px-1 text-[7px] font-black uppercase text-ink">
              Raster export
            </span>
            <button
              type="button"
              onClick={() =>
                setFinishSettings({
                  filmGrainEnabled: !finishSettings.filmGrainEnabled
                })
              }
              className={clsx(
                "border-2 border-ink px-2 py-0.5 text-[10px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5",
                finishSettings.filmGrainEnabled
                  ? "bg-ink text-paper"
                  : "bg-bone text-ink"
              )}
            >
	              {finishSettings.filmGrainEnabled ? "On" : "Off"}
	            </button>
	          </div>
	          <div className="mb-2 grid grid-cols-3 gap-1">
	            {grainFinishPresets.map((preset) => (
	              <button
	                key={preset.label}
	                type="button"
	                onClick={() =>
	                  setFinishSettings({
	                    filmGrainAmount: preset.filmGrainAmount,
	                    filmGrainEnabled: true,
	                    filmGrainRoughness: preset.filmGrainRoughness
	                  })
	                }
	                className="border-2 border-ink bg-bone px-1 py-1 text-[9px] font-black uppercase shadow-brutal-sm transition hover:-translate-y-0.5 hover:bg-paper"
	              >
	                {preset.label}
	              </button>
	            ))}
	          </div>
	          <label className="mb-2 block border-2 border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase">
            Size {Math.round(finishSettings.filmGrainRoughness * 100)}%
            <input
              type="range"
              min={0.15}
              max={1}
              step={0.05}
              value={finishSettings.filmGrainRoughness}
              onChange={(event) =>
                setFinishSettings({
                  filmGrainRoughness: Number(event.currentTarget.value)
                })
              }
              className="mt-1 h-3 w-full accent-[rgb(var(--color-ink))]"
            />
          </label>
          <label className="block border-2 border-ink bg-paper px-2 py-1 text-[10px] font-black uppercase">
            Amount {Math.round(finishSettings.filmGrainAmount * 100)}%
            <input
              type="range"
              min={0.05}
              max={1}
              step={0.05}
              value={finishSettings.filmGrainAmount}
              onChange={(event) =>
                setFinishSettings({
                  filmGrainAmount: Number(event.currentTarget.value)
                })
              }
              className="mt-1 h-3 w-full accent-[rgb(var(--color-ink))]"
            />
          </label>
          <p className="mt-2 border-2 border-ink bg-bone px-2 py-1 text-[9px] font-black uppercase leading-tight">
            Raster finish for final JPG/package exports. Vector patterns stay in Textures.
          </p>
        </div>
      ) : null}
    </aside>
  );
}

function ToolbarGrainIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <circle cx="7" cy="7" r="1.6" fill="currentColor" />
      <circle cx="15" cy="6" r="1" fill="currentColor" />
      <circle cx="18" cy="12" r="1.4" fill="currentColor" />
      <circle cx="10" cy="15" r="1.1" fill="currentColor" />
      <circle cx="5" cy="18" r="0.9" fill="currentColor" />
      <circle cx="16" cy="19" r="1.2" fill="currentColor" />
      <path
        d="M4 11.5C8.8 9.5 14.5 14.4 20 10.8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function ToolbarGradientIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <defs>
        <linearGradient id="toolbar-gradient-icon" x1="4" x2="20" y1="4" y2="20">
          <stop offset="0" stopColor="currentColor" stopOpacity="0.1" />
          <stop offset="0.48" stopColor="currentColor" stopOpacity="0.65" />
          <stop offset="1" stopColor="currentColor" />
        </linearGradient>
      </defs>
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        fill="url(#toolbar-gradient-icon)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7 17L17 7M13 7H17V11"
        fill="none"
        stroke="currentColor"
        strokeLinecap="square"
        strokeLinejoin="miter"
        strokeWidth="1.7"
      />
    </svg>
  );
}

function getToolTourId(toolId: EditorTool) {
  if (toolId === "gradientTool") {
    return "gradient-tool";
  }

  if (toolId === "inverseSelection") {
    return "inverse-selection-tool";
  }

  if (toolId === "chainsawCut") {
    return "chainsaw-cut-tool";
  }

  if (toolId === "lawnMower") {
    return "remove-bg-tool";
  }

  return undefined;
}

function ToolbarInverseSelectionIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
      <path
        d="M3.5 3.5H20.5V20.5H3.5Z"
        fill="none"
        stroke="currentColor"
        strokeDasharray="2.2 2.2"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="4.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6 6L9 9M18 6L15 9M6 18L9 15M18 18L15 15"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.5"
      />
    </svg>
  );
}

function ToolbarDrawIcon({ type }: { type: EditorTool }) {
  if (type === "pencilStroke") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path
          d="M5 17.5L16.5 6L19 8.5L7.5 20H5Z"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <path
          d="M14.8 7.7L17.3 10.2"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (type === "nibStroke") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path
          d="M12 4L18 10L14.5 20H9.5L6 10Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="1.6"
        />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <path
          d="M12 13.5V20"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.6"
        />
      </svg>
    );
  }

  if (type === "markerStroke") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path
          d="M7 17L16 8L19 11L10 20H7Z"
          fill="none"
          stroke="currentColor"
          strokeLinejoin="round"
          strokeWidth="2"
        />
        <path
          d="M6 20H12"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="2.4"
        />
      </svg>
    );
  }

  if (type === "chainsawCut") {
    return (
      <svg aria-hidden="true" className="h-7 w-7" viewBox="0 0 48 48">
        <g transform="rotate(-28 24 24) translate(-3 10) scale(1.08)">
          <path
            d="M2 18.5L3.5 13L9.8 10.4L15.4 12.1L17.8 9.2L24 10.4L23 15L47 14.3L47.6 20.5L23.7 21.3L22.5 24.4L11.5 24.8L9.8 21.6L5.5 21.8Z"
            fill="currentColor"
          />
          <path
            d="M17 10.2L22.4 1.8C23.4 0.4 25.8 1.4 25.2 3.2L23.4 9.3L30.8 9.9L28.7 13.3L20.1 12.7Z"
            fill="currentColor"
          />
        </g>
      </svg>
    );
  }

  return null;
}

function ToolbarLawnMowerIcon() {
  return (
    <svg aria-hidden="true" className="h-6 w-7" viewBox="0 0 48 32">
      <path
        d="M19 6.5A4.2 4.2 0 1 1 27.4 6.5A4.2 4.2 0 0 1 19 6.5ZM16.2 11.5C19.6 9.1 24.6 9.8 27 13.8L31.2 20.8H23.5L20.8 16.6L14.5 15.6Z"
        fill="currentColor"
      />
      <path
        d="M8 19.2C11.5 16.8 16.6 17.1 20.8 20.3L25.5 23.8H34.2L37 19.2L42.7 20.6C46.4 21.5 47.6 24.9 46.8 28H6.1Z"
        fill="currentColor"
      />
      <path
        d="M28.5 16.6L35.4 14.2L39.2 19.7L35.3 21.1L32 17.4L27.8 19.4Z"
        fill="currentColor"
      />
      <path
        d="M20 28H37L39.2 24.3L45.8 25.5C46.2 26.3 46.3 27.2 46.1 28Z"
        fill="currentColor"
      />
      <circle cx="12" cy="26" r="6" fill="currentColor" />
      <circle cx="12" cy="26" r="2.7" fill="rgb(var(--color-paper))" />
      <circle cx="39.5" cy="26.2" r="4.2" fill="currentColor" />
      <circle cx="39.5" cy="26.2" r="1.9" fill="rgb(var(--color-paper))" />
    </svg>
  );
}

function ToolbarShapeIcon({ type }: { type: EditorTool }) {
  const strokeProps = {
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 1.6
  };

  if (type === "rectangle") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <rect x="4" y="7" width="16" height="10" {...strokeProps} />
      </svg>
    );
  }

  if (type === "ellipse") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <ellipse cx="12" cy="12" rx="8" ry="5.5" {...strokeProps} />
      </svg>
    );
  }

  if (type === "triangle") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <polygon points="12,4 20,19 4,19" {...strokeProps} />
      </svg>
    );
  }

  if (type === "diamond") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <polygon points="12,3 21,12 12,21 3,12" {...strokeProps} />
      </svg>
    );
  }

  if (type === "pentagon") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <polygon points="12,3.5 20.5,9.5 17.2,20 6.8,20 3.5,9.5" {...strokeProps} />
      </svg>
    );
  }

  if (type === "hexagon") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <polygon points="7,4 17,4 22,12 17,20 7,20 2,12" {...strokeProps} />
      </svg>
    );
  }

  if (type === "straightLine") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M4 12H20" {...strokeProps} />
      </svg>
    );
  }

  if (type === "curveLine") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M4 15Q12 5 20 15" {...strokeProps} />
      </svg>
    );
  }

  if (type === "waveLine") {
    return (
      <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 24 24">
        <path d="M3 13Q6 7 9 13T15 13T21 13" {...strokeProps} />
      </svg>
    );
  }

  return null;
}
