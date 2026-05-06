import { defaultCanvasDpi, minCanvasDpi } from "./canvasPresets";
import type { PrintPresetId, ProfessionalExportSettings } from "../types/editor";

export const professionalPrintPresets: Record<
  PrintPresetId,
  {
    description: string;
    label: string;
    settings: ProfessionalExportSettings;
  }
> = {
  screen: {
    description: "Salida limpia para pantalla o pruebas digitales a tamano real.",
    label: "Screen",
    settings: {
      cropMarksEnabled: false,
      dpi: defaultCanvasDpi,
      bleedMm: 0,
      jpegQuality: 0.95,
      safeMarginMm: 0,
      presetId: "screen"
    }
  },
  "digital-proof": {
    description: "Archivo ligero para revisar composicion sin marcas de imprenta.",
    label: "Proof",
    settings: {
      cropMarksEnabled: false,
      dpi: minCanvasDpi,
      bleedMm: 0,
      jpegQuality: 0.9,
      safeMarginMm: 0,
      presetId: "digital-proof"
    }
  },
  "a4-print": {
    description: "Impresion domestica o print pequeno con sangrado estandar.",
    label: "A4 Print",
    settings: {
      cropMarksEnabled: true,
      dpi: defaultCanvasDpi,
      bleedMm: 3,
      jpegQuality: 0.95,
      safeMarginMm: 5,
      presetId: "a4-print"
    }
  },
  "a3-poster": {
    description: "Poster medio con margen seguro mas generoso.",
    label: "A3 Poster",
    settings: {
      cropMarksEnabled: true,
      dpi: defaultCanvasDpi,
      bleedMm: 3,
      jpegQuality: 0.96,
      safeMarginMm: 7,
      presetId: "a3-poster"
    }
  },
  "gallery-print": {
    description: "Salida cuidada para pieza final o impresion fine-art.",
    label: "Gallery",
    settings: {
      cropMarksEnabled: true,
      dpi: defaultCanvasDpi,
      bleedMm: 5,
      jpegQuality: 0.98,
      safeMarginMm: 10,
      presetId: "gallery-print"
    }
  },
  "riso-proof": {
    description: "Preparacion grafica tipo serigrafia/riso con marcas visibles.",
    label: "Riso",
    settings: {
      cropMarksEnabled: true,
      dpi: defaultCanvasDpi,
      bleedMm: 3,
      jpegQuality: 0.95,
      safeMarginMm: 6,
      presetId: "riso-proof"
    }
  },
  "social-square": {
    description: "Salida rapida para pantalla sin margen de imprenta.",
    label: "Social",
    settings: {
      cropMarksEnabled: false,
      dpi: minCanvasDpi,
      bleedMm: 0,
      jpegQuality: 0.9,
      safeMarginMm: 0,
      presetId: "social-square"
    }
  },
  custom: {
    description: "Ajustes manuales de PPP, sangrado, margen seguro y marcas.",
    label: "Custom",
    settings: {
      cropMarksEnabled: false,
      dpi: defaultCanvasDpi,
      bleedMm: 0,
      jpegQuality: 0.95,
      safeMarginMm: 0,
      presetId: "custom"
    }
  }
};
