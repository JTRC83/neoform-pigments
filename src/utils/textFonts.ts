import type { TextFontFamily } from "../types/editor";

export const defaultTextFontFamily: TextFontFamily = "Space Grotesk";

export const textFontOptions: Array<{
  label: string;
  note: string;
  value: TextFontFamily;
}> = [
  {
    label: "Space Grotesk",
    note: "Geometric",
    value: "Space Grotesk"
  },
  {
    label: "Archivo Black",
    note: "Poster",
    value: "Archivo Black"
  },
  {
    label: "Libre Baskerville",
    note: "Serif",
    value: "Libre Baskerville"
  },
  {
    label: "IBM Plex Mono",
    note: "Mono",
    value: "IBM Plex Mono"
  },
  {
    label: "Permanent Marker",
    note: "Marker",
    value: "Permanent Marker"
  }
];

const textFontValues = textFontOptions.map((font) => font.value);

export function normalizeTextFontFamily(value: unknown): TextFontFamily {
  return textFontValues.includes(value as TextFontFamily)
    ? (value as TextFontFamily)
    : defaultTextFontFamily;
}

export function getTextFontWeight(fontFamily: TextFontFamily) {
  if (fontFamily === "Permanent Marker") {
    return 400;
  }

  if (fontFamily === "Archivo Black") {
    return 400;
  }

  return 700;
}
