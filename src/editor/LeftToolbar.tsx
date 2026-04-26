import {
  Hand,
  MousePointer2,
  Type
} from "lucide-react";
import { useEditorStore } from "../store/editorStore";
import type { EditorTool } from "../types/editor";
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
  { id: "chainsawCut", label: "Chainsaw Cut" },
  { id: "lawnMower", label: "Remove BG" }
];

export function LeftToolbar() {
  const activeTool = useEditorStore((state) => state.activeTool);
  const setActiveTool = useEditorStore((state) => state.setActiveTool);

  return (
    <aside className="flex flex-col items-center gap-2 border-r-2 border-ink bg-bone py-2">
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
                : "bg-paper hover:bg-white"
            )}
            title={tool.label}
            aria-label={tool.label}
          >
            {isShapeTool ? (
              <ToolbarShapeIcon type={tool.id} />
            ) : isDrawingTool ? (
              <ToolbarDrawIcon type={tool.id} />
            ) : tool.id === "lawnMower" ? (
              <ToolbarLawnMowerIcon />
            ) : Icon ? (
              <Icon size={15} strokeWidth={1.7} />
            ) : null}
          </button>
        );
      })}
    </aside>
  );
}

function getToolTourId(toolId: EditorTool) {
  if (toolId === "chainsawCut") {
    return "chainsaw-cut-tool";
  }

  if (toolId === "lawnMower") {
    return "remove-bg-tool";
  }

  return undefined;
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
