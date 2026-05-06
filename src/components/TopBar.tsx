import {
  FileDown,
  FileImage,
  FileUp,
  FolderOpen,
  Images,
  Palette,
  Redo2,
  Save,
  Undo2
} from "lucide-react";
import { useEffect, useRef } from "react";
import type { ChangeEvent } from "react";
import { useEditorStore } from "../store/editorStore";
import type { ColorMode, SavedProject } from "../types/editor";

const brandName = "N€O FORM & PIGM€NT$";
const colorModes: ColorMode[] = ["standard", "light", "dark"];
const colorModeLabels: Record<ColorMode, string> = {
  dark: "Dark",
  light: "Light",
  standard: "Std"
};

type TopBarProps = {
  onOpenVisualAssets: () => void;
};

export function TopBar({ onOpenVisualAssets }: TopBarProps) {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const colorMode = useEditorStore((state) => state.colorMode);
  const setColorMode = useEditorStore((state) => state.setColorMode);
  const requestRedo = useEditorStore((state) => state.requestRedo);
  const requestUndo = useEditorStore((state) => state.requestUndo);
  const requestExportJpeg = useEditorStore((state) => state.requestExportJpeg);
  const requestExportProjectJson = useEditorStore(
    (state) => state.requestExportProjectJson
  );
  const requestImportProjectJson = useEditorStore(
    (state) => state.requestImportProjectJson
  );
  const requestOpenProject = useEditorStore((state) => state.requestOpenProject);
  const requestSaveProject = useEditorStore((state) => state.requestSaveProject);
  const cycleColorMode = () => {
    const currentIndex = colorModes.indexOf(colorMode);
    const nextMode = colorModes[(currentIndex + 1) % colorModes.length];

    setColorMode(nextMode);
  };

  useEffect(() => {
    document.documentElement.dataset.colorMode = colorMode;
  }, [colorMode]);

  const handleProjectImport = async (
    event: ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.currentTarget.files?.[0];

    if (!file) {
      return;
    }

    try {
      const project = JSON.parse(await file.text()) as SavedProject;
      requestImportProjectJson(project);
    } catch {
      window.alert("This file is not a valid neoform-pigments project.");
    } finally {
      event.currentTarget.value = "";
    }
  };

  return (
    <header className="flex items-center justify-between bg-pollen px-3 text-ink">
      <div className="flex min-w-0 items-center gap-2">
        <div className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper shadow-brutal-sm">
          <svg aria-hidden="true" className="h-6 w-6" viewBox="0 0 32 32">
            <rect x="2" y="2" width="9" height="28" fill="rgb(var(--color-oxide))" />
            <polygon
              points="12,2 30,2 20,12 30,30 20,30 11,12"
              fill="rgb(var(--color-ink))"
            />
            <circle cx="22" cy="10" r="4" fill="rgb(var(--color-mineral))" />
            <rect x="3" y="20" width="16" height="8" fill="rgb(var(--color-pollen))" />
          </svg>
        </div>
        <div className="min-w-0">
          <h1 className="truncate font-display text-base font-black leading-none">
            {brandName}
          </h1>
          <p className="text-[10px] font-black uppercase text-ink/70">
            neoform-pigments
          </p>
        </div>
      </div>

      <nav className="flex items-center gap-1" aria-label="Project actions">
        <input
          ref={importInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleProjectImport}
        />
        <button
          type="button"
          onClick={requestOpenProject}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Open saved project"
        >
          <FolderOpen size={15} />
        </button>
        <button
          type="button"
          onClick={requestSaveProject}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Save project"
        >
          <Save size={15} />
        </button>
        <button
          type="button"
          onClick={() => importInputRef.current?.click()}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Import project JSON"
        >
          <FileUp size={15} />
        </button>
        <button
          type="button"
          onClick={requestExportProjectJson}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Export project JSON"
        >
          <FileDown size={15} />
        </button>
        <button
          type="button"
          onClick={requestUndo}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Undo"
        >
          <Undo2 size={15} />
        </button>
        <button
          type="button"
          onClick={requestRedo}
          className="grid h-8 w-8 place-items-center border-2 border-ink bg-paper text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Redo"
        >
          <Redo2 size={15} />
        </button>
        <button
          type="button"
          onClick={cycleColorMode}
          className="ml-1 flex h-8 items-center gap-1 border-2 border-ink bg-bone px-2 text-[10px] font-black uppercase text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          title="Cambiar modo de color"
        >
          <Palette size={13} />
          {colorModeLabels[colorMode]}
        </button>
        <button
          type="button"
          onClick={onOpenVisualAssets}
          className="flex h-8 items-center gap-1 border-2 border-ink bg-paper px-2 text-[10px] font-black uppercase text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          data-tour="visual-library-button"
          title="Abrir biblioteca visual"
        >
          <Images size={13} />
          Library
        </button>
        <button
          type="button"
          onClick={requestExportJpeg}
          className="ml-1 flex h-8 items-center gap-1 border-2 border-ink bg-mineral px-3 text-[10px] font-black uppercase text-ink shadow-brutal-sm transition hover:-translate-y-0.5"
          data-tour="jpg-srgb-export"
          title="Export active canvas as JPG/JPEG in sRGB using current size, PPP and JPG quality"
        >
          <FileImage size={15} />
          JPG sRGB
        </button>
      </nav>
    </header>
  );
}
