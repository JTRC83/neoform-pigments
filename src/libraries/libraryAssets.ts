import type {
  CompositionPreset,
  FormPreset,
  PigmentSwatch,
  TexturePreset
} from "../types/library";

export const formPresets: FormPreset[] = [
  { id: "solar-block", label: "Solar Block", type: "rectangle", fill: "#F0B800" },
  { id: "mineral-orbit", label: "Mineral Orbit", type: "ellipse", fill: "#90A0B8" },
  { id: "signal-delta", label: "Signal Delta", type: "triangle", fill: "#C03030" },
  { id: "ochre-diamond", label: "Ochre Diamond", type: "diamond", fill: "#E0C070" },
  { id: "klein-pentagon", label: "Klein Pentagon", type: "pentagon", fill: "#002FA7" },
  { id: "stack-hexagon", label: "Stack Hexagon", type: "hexagon", fill: "#608848" },
  { id: "orange-pill", label: "Orange Pill", type: "pill", fill: "#C06830" },
  { id: "blue-semicircle", label: "Blue Semi", type: "semicircle", fill: "#0068C0" },
  { id: "sun-quarter", label: "Sun Quarter", type: "quarterCircle", fill: "#F0B800" },
  { id: "green-starburst", label: "Green Star", type: "starburst", fill: "#608848" },
  { id: "red-scallop", label: "Red Scallop", type: "scallop", fill: "#C03030" },
  { id: "klein-drop", label: "Klein Drop", type: "drop", fill: "#0068C0" },
  { id: "orange-petals", label: "Orange Petals", type: "petalGrid", fill: "#F06000" },
  { id: "sun-dots-form", label: "Sun Dots", type: "circleCluster", fill: "#F0B800" },
  { id: "green-cross", label: "Green Cross", type: "crossBurst", fill: "#008850" },
  { id: "rose-stack", label: "Rose Stack", type: "semicircleStack", fill: "#F89898" },
  { id: "orange-tri-grid", label: "Tri Grid", type: "triangleGrid", fill: "#F06000" },
  { id: "rose-shield", label: "Rose Shield", type: "shield", fill: "#F89898" },
  { id: "green-crescent", label: "Green Crescent", type: "crescent", fill: "#008850" },
  { id: "red-pacman", label: "Red Pacman", type: "pacman", fill: "#F02020" },
  { id: "rose-arch", label: "Rose Arch", type: "arch", fill: "#F89898" },
  { id: "pink-asterisk", label: "Pink Asterisk", type: "asterisk", fill: "#F0A0D0" },
  { id: "orange-pinwheel", label: "Pinwheel", type: "cornerPinwheel", fill: "#FFA420" },
  { id: "cream-rings", label: "Cream Rings", type: "quarterRings", fill: "#D8CCB4" },
  { id: "cream-portal", label: "Portal Dot", type: "portal", fill: "#E8E0C0" },
  { id: "green-petal-burst", label: "Petal Burst", type: "petalBurst", fill: "#00A888" },
  { id: "pink-eye", label: "Pink Eye", type: "eye", fill: "#EC4A8A" },
  { id: "ink-bolt-classic", label: "Classic Bolt", type: "boltClassic", fill: "#101010" },
  { id: "ink-bolt-sharp", label: "Sym Bolt", type: "boltSharp", fill: "#101010" },
  { id: "ink-bolt-step", label: "Step Bolt", type: "boltStep", fill: "#101010" }
];

export const pigmentSwatches: PigmentSwatch[] = [
  { id: "no-fill", label: "No Fill", color: "transparent" },
  { id: "chaos-cream", label: "Chaos Cream", color: "#E8E0C0" },
  { id: "deep-ink", label: "Deep Ink", color: "#000000" },
  { id: "graphite", label: "Graphite", color: "#303030" },
  { id: "block-red", label: "Block Red", color: "#C03030" },
  { id: "burnt-orange", label: "Burnt Orange", color: "#C06830" },
  { id: "sun-block", label: "Sun Block", color: "#F0B800" },
  { id: "ochre-light", label: "Ochre Light", color: "#E0C070" },
  { id: "dust-blue", label: "Dust Blue", color: "#90A0B8" },
  { id: "process-blue", label: "Process Blue", color: "#0068C0" },
  { id: "klein-blue", label: "Klein Blue", color: "#002FA7" },
  { id: "stack-green", label: "Stack Green", color: "#608848" },
  { id: "bauhaus-turquoise", label: "Bauhaus Turquoise", color: "#00A8A8" },
  { id: "neo-turquoise", label: "Neo Turquoise", color: "#00C2A8" },
  { id: "signal-orange", label: "Signal Orange", color: "#F06000" },
  { id: "bauhaus-orange", label: "Bauhaus Orange", color: "#F47A20" },
  { id: "cadmium-yellow", label: "Cadmium Yellow", color: "#FFD100" },
  { id: "primary-red", label: "Primary Red", color: "#E03028" },
  { id: "bauhaus-pink", label: "Bauhaus Pink", color: "#EC4A8A" },
  { id: "deep-teal", label: "Deep Teal", color: "#007A78" }
];

export const texturePresets: TexturePreset[] = [
  {
    id: "light-shadow",
    label: "Light / Shadow",
    background: "#F4E8C8",
    foreground: "#7A6048",
    accent: "#C06830",
    kind: "shadeGradient",
    group: "gradient"
  },
  {
    id: "chaos-mesh",
    label: "Chaos Mesh",
    background: "#E8E0C0",
    foreground: "#F06000",
    accent: "#90A0B8",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "oxide-mesh",
    label: "Oxide Mesh",
    background: "#E8E0C0",
    foreground: "#C06830",
    accent: "#F0B800",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "klein-mesh",
    label: "Klein Mesh",
    background: "#002FA7",
    foreground: "#0068C0",
    accent: "#E8E0C0",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "mineral-mesh",
    label: "Mineral Mesh",
    background: "#90A0B8",
    foreground: "#E8E0C0",
    accent: "#303030",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "rose-mesh",
    label: "Rose Mesh",
    background: "#F89898",
    foreground: "#EC4A8A",
    accent: "#E8E0C0",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "sun-gradient",
    label: "Sun Fade",
    background: "#F0B800",
    foreground: "#C06830",
    accent: "#E8E0C0",
    kind: "linearGradient",
    group: "gradient"
  },
  {
    id: "klein-radial",
    label: "Klein Glow",
    background: "#002FA7",
    foreground: "#0068C0",
    accent: "#E8E0C0",
    kind: "radialGradient",
    group: "gradient"
  },
  {
    id: "cream-ink-grid",
    label: "Cream Grid",
    background: "#E8E0C0",
    foreground: "#303030",
    kind: "grid",
    group: "utility",
    renderMode: "vector"
  },
  {
    id: "micro-grid",
    label: "Micro Grid",
    background: "#E8E0C0",
    foreground: "#101010",
    kind: "grid",
    group: "utility",
    renderMode: "vector",
    scale: 16
  },
  {
    id: "ink-stripes",
    label: "Ink Stripes",
    background: "#E8E0C0",
    foreground: "#000000",
    kind: "stripes",
    group: "utility",
    renderMode: "vector"
  },
  {
    id: "fine-cream-lines",
    label: "Fine Lines",
    background: "#E8E0C0",
    foreground: "#303030",
    kind: "fineLines",
    group: "utility",
    renderMode: "vector",
    scale: 20
  },
  {
    id: "sun-dots",
    label: "Sun Dots",
    background: "#F0B800",
    foreground: "#303030",
    kind: "dots",
    group: "popArt",
    renderMode: "vector"
  },
  {
    id: "dust-grid",
    label: "Dust Grid",
    background: "#90A0B8",
    foreground: "#303030",
    kind: "grid",
    group: "utility",
    renderMode: "vector"
  },
  {
    id: "blue-diagonal-grid",
    label: "Blue Lattice",
    background: "#90A0B8",
    foreground: "#303030",
    kind: "diagonalGrid",
    group: "utility",
    renderMode: "vector",
    scale: 34
  },
  {
    id: "klein-dots",
    label: "Klein Dots",
    background: "#002FA7",
    foreground: "#E8E0C0",
    kind: "dots",
    group: "popArt",
    renderMode: "vector"
  },
  {
    id: "klein-rings",
    label: "Klein Rings",
    background: "#002FA7",
    foreground: "#E8E0C0",
    kind: "rings",
    group: "popArt",
    renderMode: "vector",
    scale: 38
  },
  {
    id: "green-check",
    label: "Green Check",
    background: "#608848",
    foreground: "#303030",
    kind: "checker",
    group: "utility",
    renderMode: "vector"
  },
  {
    id: "orange-hatch",
    label: "Orange Hatch",
    background: "#C06830",
    foreground: "#303030",
    kind: "crosshatch",
    group: "serigraphy",
    renderMode: "vector"
  },
  {
    id: "orange-zigzag",
    label: "Orange Zig",
    background: "#C06830",
    foreground: "#303030",
    kind: "zigzag",
    group: "bauhaus",
    renderMode: "vector",
    scale: 32
  },
  {
    id: "red-stripes",
    label: "Red Stripes",
    background: "#C03030",
    foreground: "#E8E0C0",
    kind: "stripes",
    group: "serigraphy",
    renderMode: "vector"
  },
  {
    id: "ochre-check",
    label: "Ochre Check",
    background: "#E0C070",
    foreground: "#303030",
    kind: "checker",
    group: "utility",
    renderMode: "vector"
  },
  {
    id: "turquoise-mesh",
    label: "Turquoise Mesh",
    background: "#03DAC5",
    foreground: "#3700B3",
    accent: "#BB86FC",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "carbon-mesh",
    label: "Carbon Mesh",
    background: "#121212",
    foreground: "#CF6679",
    accent: "#03DAC5",
    kind: "meshGradient",
    group: "gradient"
  },
  {
    id: "bauhaus-register",
    label: "Register Lines",
    background: "#F4E8C8",
    foreground: "#101010",
    kind: "fineLines",
    group: "serigraphy",
    renderMode: "vector",
    scale: 12
  },
  {
    id: "vector-stipple",
    label: "Vector Stipple",
    background: "#F4E8C8",
    foreground: "#303030",
    kind: "halftone",
    group: "serigraphy",
    renderMode: "vector",
    scale: 18
  },
  {
    id: "rosette-screen",
    label: "Print Rosette",
    background: "#F4E8C8",
    foreground: "#C06830",
    accent: "#002FA7",
    kind: "dots",
    group: "popArt",
    renderMode: "vector",
    scale: 22
  },
  {
    id: "fiber-hatch",
    label: "Fiber Hatch",
    background: "#E8E0C0",
    foreground: "#303030",
    kind: "crosshatch",
    group: "serigraphy",
    renderMode: "vector",
    scale: 18
  },
  {
    id: "offset-screen",
    label: "Offset Lattice",
    background: "#90A0B8",
    foreground: "#E8E0C0",
    kind: "diagonalGrid",
    group: "serigraphy",
    renderMode: "vector",
    scale: 22
  },
  {
    id: "bauhaus-block-print",
    label: "Bauhaus Blocks",
    background: "#F4E8C8",
    foreground: "#E03028",
    accent: "#002FA7",
    kind: "bauhausBlocks",
    group: "bauhaus",
    renderMode: "vector",
    scale: 72
  },
  {
    id: "bauhaus-weave-primary",
    label: "Bauhaus Weave",
    background: "#F4E8C8",
    foreground: "#F06000",
    accent: "#008850",
    kind: "bauhausWeave",
    group: "bauhaus",
    renderMode: "vector",
    scale: 84
  },
  {
    id: "bauhaus-arch-grid",
    label: "Arch Grid",
    background: "#E8E0C0",
    foreground: "#002FA7",
    accent: "#F0B800",
    kind: "bauhausWeave",
    group: "bauhaus",
    renderMode: "vector",
    scale: 96
  },
  {
    id: "pop-benday-red",
    label: "Pop Benday",
    background: "#F4E8C8",
    foreground: "#E03028",
    accent: "#F0B800",
    kind: "bendayDots",
    group: "popArt",
    renderMode: "vector",
    scale: 48
  },
  {
    id: "pop-halftone-klein",
    label: "Pop Halftone",
    background: "#F4E8C8",
    foreground: "#002FA7",
    accent: "#E03028",
    kind: "popHalftone",
    group: "popArt",
    renderMode: "vector",
    scale: 74
  },
  {
    id: "serigraphy-bars-klein",
    label: "Serigraphy Bars",
    background: "#002FA7",
    foreground: "#E8E0C0",
    accent: "#F06000",
    kind: "serigraphyBars",
    group: "serigraphy",
    renderMode: "vector",
    scale: 64
  },
  {
    id: "screenprint-offset-red",
    label: "Offset Screen",
    background: "#F4E8C8",
    foreground: "#E03028",
    accent: "#002FA7",
    kind: "serigraphyScreen",
    group: "serigraphy",
    renderMode: "vector",
    scale: 78
  },
  {
    id: "op-art-waves-ink",
    label: "Op Waves",
    background: "#E8E0C0",
    foreground: "#101010",
    kind: "opArtWaves",
    group: "popArt",
    renderMode: "vector",
    scale: 72
  },
  {
    id: "pop-burst-turquoise",
    label: "Pop Burst",
    background: "#03DAC5",
    foreground: "#3700B3",
    accent: "#BB86FC",
    kind: "popBurst",
    group: "popArt",
    renderMode: "vector",
    scale: 80
  }
];

export const compositionPresets: CompositionPreset[] = [];
