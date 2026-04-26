import { useRef, useState } from "react";
import type { PointerEvent as ReactPointerEvent } from "react";
import { CanvasEditor } from "../canvas/CanvasEditor";
import { TopBar } from "../components/TopBar";
import { LibrariesPanel } from "../libraries/LibrariesPanel";
import { LeftToolbar } from "./LeftToolbar";
import { RightPanel } from "./RightPanel";

const resizeTabHeight = 18;

export function EditorLayout() {
  const sidebarRef = useRef<HTMLElement | null>(null);
  const [librariesHeight, setLibrariesHeight] = useState(getDefaultLibrariesHeight);

  const handleSidebarResizeStart = (
    event: ReactPointerEvent<HTMLButtonElement>
  ) => {
    event.preventDefault();

    const startY = event.clientY;
    const startHeight = librariesHeight;
    const maxHeight = Math.max(
      0,
      (sidebarRef.current?.clientHeight ?? window.innerHeight) - resizeTabHeight
    );

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const nextHeight = startHeight + startY - moveEvent.clientY;
      setLibrariesHeight(clamp(nextHeight, 0, maxHeight));
    };

    const handlePointerUp = () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  return (
    <main className="grid h-screen grid-rows-[48px_1fr] bg-paper text-ink">
      <TopBar />
      <section className="grid min-h-0 grid-cols-[56px_minmax(0,1fr)_320px] border-t-2 border-ink">
        <LeftToolbar />
        <CanvasEditor />
        <aside
          ref={sidebarRef}
          className="grid min-h-0 border-l-2 border-ink bg-bone"
          style={{
            gridTemplateRows: `minmax(0, 1fr) ${resizeTabHeight}px minmax(0, ${librariesHeight}px)`
          }}
        >
          <RightPanel />
          <button
            type="button"
            onPointerDown={handleSidebarResizeStart}
            className="group flex cursor-row-resize items-center justify-center border-y-2 border-ink bg-pollen text-[9px] font-black uppercase tracking-wide outline-none transition hover:bg-punch hover:text-paper focus-visible:bg-punch focus-visible:text-paper"
            aria-label="Resize right sidebar panels"
            title="Arrastra para hacer más grande o pequeña la zona inferior"
            data-tour="right-panel-resize"
          >
            <span className="mr-1 text-xs leading-none">↕</span>
            Drag resize
          </button>
          <LibrariesPanel />
        </aside>
      </section>
    </main>
  );
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function getDefaultLibrariesHeight() {
  if (typeof window === "undefined") {
    return 420;
  }

  return clamp(Math.round(window.innerHeight * 0.44), 320, 920);
}
