import {
  Ellipse,
  FabricObject,
  Group,
  Line,
  Path,
  Polygon,
  Rect,
  Textbox,
  Triangle
} from "fabric";
import type {
  CanvasObjectSummary,
  CanvasObjectType,
  EditorTool,
  TextFontFamily
} from "../types/editor";
import { defaultTextFontFamily, getTextFontWeight } from "../utils/textFonts";

type CanvasPoint = {
  x: number;
  y: number;
};

type ShapeDimensions = {
  width: number;
  height: number;
};

type BasicShapeOptions = {
  fill?: string;
  fontFamily?: TextFontFamily;
};

export type BasicShape = Group | Textbox;
type ShapeElement = Rect | Ellipse | Triangle | Polygon | Path;

type GuideVisibilityOptions = {
  visible?: boolean;
};

const activeGuideColor = "#00C2A8";
const inactiveGuideColor = "#101010";
const guideName = "symmetry-guide";
const shapeKindName = "neoform-shape-kind";
const lineCurvatureName = "neoform-line-curvature";
const lineDimensionsName = "neoform-line-dimensions";
const lineStartWidthName = "neoform-line-start-width";
const lineEndWidthName = "neoform-line-end-width";
const symmetryTolerance = 0.035;

const shapeNames: Record<CanvasObjectType, string> = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  triangle: "Triangle",
  diamond: "Diamond",
  pentagon: "Pentagon",
  hexagon: "Hexagon",
  straightLine: "Straight Line",
  curveLine: "Curve Line",
  waveLine: "Wave Line",
  pill: "Pill",
  semicircle: "Semicircle",
  quarterCircle: "Quarter Circle",
  starburst: "Starburst",
  scallop: "Scallop",
  drop: "Drop",
  petalGrid: "Petal Grid",
  circleCluster: "Circle Cluster",
  crossBurst: "Cross Burst",
  semicircleStack: "Semicircle Stack",
  triangleGrid: "Triangle Grid",
  shield: "Shield",
  crescent: "Crescent",
  pacman: "Pacman",
  arch: "Arch",
  asterisk: "Asterisk",
  cornerPinwheel: "Corner Pinwheel",
  quarterRings: "Quarter Rings",
  portal: "Portal",
  petalBurst: "Petal Burst",
  eye: "Eye",
  boltClassic: "Classic Bolt",
  boltSharp: "Sym Bolt",
  boltStep: "Step Bolt",
  image: "Image",
  inverseSelection: "Inverse Selection",
  text: "Text",
  textOutline: "Text Outline",
  pencilStroke: "Pencil Stroke",
  nibStroke: "Nib Stroke",
  markerStroke: "Marker Stroke",
  group: "Group"
};

export function isShapeTool(
  tool: EditorTool
): tool is Extract<CanvasObjectType, EditorTool> {
  return (
    tool === "rectangle" ||
    tool === "ellipse" ||
    tool === "triangle" ||
    tool === "diamond" ||
    tool === "pentagon" ||
    tool === "hexagon" ||
    tool === "straightLine" ||
    tool === "curveLine" ||
    tool === "waveLine" ||
    tool === "text"
  );
}

export function isLineObjectType(type: CanvasObjectType | string | null | undefined) {
  return type === "straightLine" || type === "curveLine" || type === "waveLine";
}

export function isDrawingTool(
  tool: EditorTool
): tool is Extract<CanvasObjectType, EditorTool> {
  return (
    tool === "pencilStroke" ||
    tool === "nibStroke" ||
    tool === "markerStroke"
  );
}

export function isFreehandObjectType(
  type: CanvasObjectType | string | null | undefined
) {
  return (
    type === "pencilStroke" ||
    type === "nibStroke" ||
    type === "markerStroke"
  );
}

export function updateLineCurvatureForObject(
  object: FabricObject,
  curvature: number
) {
  if (!(object instanceof Group)) {
    return;
  }

  const shapeKind = object.get(shapeKindName);

  if (!isLineObjectType(shapeKind)) {
    return;
  }

  const path = object
    .getObjects()
    .find((child): child is Path => child instanceof Path && child.get("name") !== guideName);
  const dimensions = object.get(lineDimensionsName) as ShapeDimensions | undefined;
  const widths = getLineWidthsForObject(object);

  if (!path || !dimensions) {
    return;
  }

  const nextPath = new Path(
    createLinePath(shapeKind, dimensions, curvature, widths.startWidth, widths.endWidth)
  );
  path.set({ path: nextPath.path });
  object.set(lineCurvatureName, curvature);
  path.dirty = true;
  object.dirty = true;
}

export function updateLineWidthsForObject(
  object: FabricObject,
  startWidth: number,
  endWidth: number
) {
  if (!(object instanceof Group)) {
    return;
  }

  const shapeKind = object.get(shapeKindName);

  if (!isLineObjectType(shapeKind)) {
    return;
  }

  const path = object
    .getObjects()
    .find((child): child is Path => child instanceof Path && child.get("name") !== guideName);
  const dimensions = object.get(lineDimensionsName) as ShapeDimensions | undefined;
  const curvature = getLineCurvatureForObject(object);

  if (!path || !dimensions) {
    return;
  }

  const safeStartWidth = clampLineWidth(startWidth);
  const safeEndWidth = clampLineWidth(endWidth);
  const nextPath = new Path(
    createLinePath(shapeKind, dimensions, curvature, safeStartWidth, safeEndWidth)
  );
  path.set({ path: nextPath.path });
  object.set(lineStartWidthName, safeStartWidth);
  object.set(lineEndWidthName, safeEndWidth);
  path.dirty = true;
  object.dirty = true;
}

export function createBasicShape(
  tool: CanvasObjectType,
  point: CanvasPoint,
  options: BasicShapeOptions = {}
) {
  const baseProps = {
    left: 0,
    top: 0,
    originX: "center" as const,
    originY: "center" as const,
    strokeWidth: 0
  };

  if (tool === "rectangle") {
    const dimensions = { width: 150, height: 104 };
    const paint = getShapePaint(options.fill);
    const shape = new Rect({
      ...baseProps,
      ...dimensions,
      [shapeKindName]: "rectangle",
      ...paint
    });

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "ellipse") {
    const dimensions = { width: 144, height: 96 };
    const paint = getShapePaint(options.fill);
    const shape = new Ellipse({
      ...baseProps,
      rx: 72,
      ry: 48,
      [shapeKindName]: "ellipse",
      ...paint
    });

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "triangle") {
    const dimensions = { width: 138, height: 124 };
    const paint = getShapePaint(options.fill);
    const shape = new Triangle({
      ...baseProps,
      ...dimensions,
      [shapeKindName]: "triangle",
      ...paint
    });

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "diamond") {
    const dimensions = { width: 132, height: 132 };
    const paint = getShapePaint(options.fill);
    const shape = new Polygon(createDiamondPoints(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "diamond");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "pentagon") {
    const dimensions = { width: 140, height: 132 };
    const paint = getShapePaint(options.fill);
    const shape = new Polygon(createRegularPolygonPoints(5, dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "pentagon");

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "hexagon") {
    const dimensions = { width: 150, height: 130 };
    const paint = getShapePaint(options.fill);
    const shape = new Polygon(createRegularPolygonPoints(6, dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "hexagon");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (isLineObjectType(tool)) {
    const dimensions = { width: 170, height: 96 };
    const curvature = tool === "straightLine" ? 0 : tool === "curveLine" ? 36 : 18;
    const startWidth = 8;
    const endWidth = tool === "straightLine" ? 8 : 18;
    const fill = options.fill ?? "#101010";
    const shape = new Path(
      createLinePath(tool, dimensions, curvature, startWidth, endWidth),
      {
        ...baseProps,
        fill,
        stroke: fill,
        strokeWidth: 0,
        strokeLineCap: "round",
        strokeLineJoin: "round"
      }
    );
    shape.set(shapeKindName, tool);

    const group = createSymmetricShapeGroup(shape, point, dimensions, ["x"], tool);
    group.set(lineCurvatureName, curvature);
    group.set(lineDimensionsName, dimensions);
    group.set(lineStartWidthName, startWidth);
    group.set(lineEndWidthName, endWidth);

    return group;
  }

  if (tool === "pill") {
    const dimensions = { width: 156, height: 72 };
    const paint = getShapePaint(options.fill);
    const shape = new Rect({
      ...baseProps,
      ...dimensions,
      rx: dimensions.height / 2,
      ry: dimensions.height / 2,
      [shapeKindName]: "pill",
      ...paint
    });

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "semicircle") {
    const dimensions = { width: 144, height: 72 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createSemicirclePath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "semicircle");

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "quarterCircle") {
    const dimensions = { width: 124, height: 124 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createQuarterCirclePath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "quarterCircle");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "starburst") {
    const dimensions = { width: 150, height: 150 };
    const paint = getShapePaint(options.fill);
    const shape = new Polygon(createStarburstPoints(12, dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "starburst");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "scallop") {
    const dimensions = { width: 156, height: 92 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createScallopPath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "scallop");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "drop") {
    const dimensions = { width: 150, height: 150 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createDropPath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "drop");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "petalGrid") {
    const dimensions = { width: 150, height: 150 };
    const elements = createPetalGridElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "petalGrid");
  }

  if (tool === "circleCluster") {
    const dimensions = { width: 150, height: 150 };
    const elements = createCircleClusterElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(
      elements,
      point,
      dimensions,
      ["x", "y"],
      "circleCluster"
    );
  }

  if (tool === "crossBurst") {
    const dimensions = { width: 158, height: 158 };
    const elements = createCrossBurstElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "crossBurst");
  }

  if (tool === "semicircleStack") {
    const dimensions = { width: 150, height: 154 };
    const elements = createSemicircleStackElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(
      elements,
      point,
      dimensions,
      ["x", "y"],
      "semicircleStack"
    );
  }

  if (tool === "triangleGrid") {
    const dimensions = { width: 150, height: 150 };
    const elements = createTriangleGridElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "triangleGrid");
  }

  if (tool === "shield") {
    const dimensions = { width: 150, height: 142 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createShieldPath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "shield");

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "crescent") {
    const dimensions = { width: 150, height: 150 };
    const shape = createCompoundPath(createCrescentPath(dimensions), getShapePaint(options.fill));
    shape.set(shapeKindName, "crescent");

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "pacman") {
    const dimensions = { width: 150, height: 150 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createPacmanPath(dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, "pacman");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "arch") {
    const dimensions = { width: 150, height: 150 };
    const shape = createCompoundPath(createArchPath(dimensions), getShapePaint(options.fill));
    shape.set(shapeKindName, "arch");

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  if (tool === "asterisk") {
    const dimensions = { width: 144, height: 144 };
    const elements = createAsteriskElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "asterisk");
  }

  if (tool === "cornerPinwheel") {
    const dimensions = { width: 150, height: 150 };
    const shape = createCornerPinwheelShape(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(
      shape,
      point,
      dimensions,
      ["x", "y"],
      "cornerPinwheel"
    );
  }

  if (tool === "quarterRings") {
    const dimensions = { width: 150, height: 150 };
    const elements = createQuarterRingElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "quarterRings");
  }

  if (tool === "portal") {
    const dimensions = { width: 160, height: 160 };
    const elements = createPortalElements(dimensions, options.fill);

    return createSymmetricShapeGroup(elements, point, dimensions, ["y"], "portal");
  }

  if (tool === "petalBurst") {
    const dimensions = { width: 154, height: 154 };
    const elements = createPetalBurstElements(dimensions, getShapePaint(options.fill));

    return createSymmetricShapeGroup(elements, point, dimensions, ["x", "y"], "petalBurst");
  }

  if (tool === "eye") {
    const dimensions = { width: 160, height: 92 };
    const shape = createCompoundPath(createEyePath(dimensions), getShapePaint(options.fill));
    shape.set(shapeKindName, "eye");

    return createSymmetricShapeGroup(shape, point, dimensions, ["x", "y"]);
  }

  if (tool === "boltClassic" || tool === "boltSharp" || tool === "boltStep") {
    const dimensions = { width: 150, height: 190 };
    const paint = getShapePaint(options.fill);
    const shape = new Path(createBoltPath(tool, dimensions), {
      ...baseProps,
      ...paint
    });
    shape.set(shapeKindName, tool);

    return createSymmetricShapeGroup(shape, point, dimensions, ["y"]);
  }

  const fill = options.fill ?? "#101010";
  const fontFamily = options.fontFamily ?? defaultTextFontFamily;

  return new Textbox("Text", {
    ...baseProps,
    left: point.x,
    top: point.y,
    width: 180,
    fill,
    stroke: fill,
    fontFamily,
    fontSize: 36,
    fontWeight: getTextFontWeight(fontFamily),
    textAlign: "center"
  });
}

export function createShapeSummary(
  type: CanvasObjectType,
  objectNumber: number,
  artboardId: string
): CanvasObjectSummary {
  return {
    id: crypto.randomUUID(),
    artboardId,
    type,
    name: `${shapeNames[type]} ${objectNumber}`,
    visible: true,
    locked: false
  };
}

export function updateSymmetryGuidesForObject(
  object?: FabricObject | null,
  options: GuideVisibilityOptions = {}
) {
  if (!(object instanceof Group)) {
    return;
  }

  const guides = object
    .getObjects()
    .filter(
      (child): child is Line =>
        child instanceof Line && child.get("name") === guideName
    );

  if (guides.length === 0) {
    return;
  }

  const hasRegularSymmetry = getRegularSymmetryState(object);
  const guideColor = hasRegularSymmetry ? activeGuideColor : inactiveGuideColor;
  const shouldShowGuides = options.visible ?? false;

  guides.forEach((guide) => {
    guide.set({
      stroke: guideColor,
      opacity: shouldShowGuides ? (hasRegularSymmetry ? 1 : 0.72) : 0
    });
  });

  object.dirty = true;
}

function createSymmetricShapeGroup(
  shape: ShapeElement | ShapeElement[],
  point: CanvasPoint,
  dimensions: ShapeDimensions,
  axes: Array<"x" | "y">,
  shapeKind?: CanvasObjectType
) {
  const shapes = Array.isArray(shape) ? shape : [shape];
  const guides = createSymmetryGuides(dimensions, axes);

  const group = new Group([...shapes, ...guides], {
    left: point.x,
    top: point.y,
    originX: "center",
    originY: "center",
    subTargetCheck: false
  });

  group.set(shapeKindName, shapeKind ?? shapes[0]?.get(shapeKindName));
  updateSymmetryGuidesForObject(group, { visible: false });

  return group;
}

function createSymmetryGuides(
  dimensions: ShapeDimensions,
  axes: Array<"x" | "y">
) {
  const guides: Line[] = [];
  const guideProps = {
    stroke: "#101010",
    strokeWidth: 1.5,
    strokeDashArray: [7, 5],
    opacity: 0,
    selectable: false,
    evented: false,
    name: guideName,
    excludeFromExport: false
  };

  if (axes.includes("y")) {
    guides.push(
      new Line([0, -dimensions.height / 2, 0, dimensions.height / 2], guideProps)
    );
  }

  if (axes.includes("x")) {
    guides.push(
      new Line([-dimensions.width / 2, 0, dimensions.width / 2, 0], guideProps)
    );
  }

  return guides;
}

function getShapePaint(fill?: string) {
  if (fill) {
    return {
      fill,
      stroke: fill,
      strokeWidth: 0
    };
  }

  return {
    fill: "transparent",
    stroke: "#101010",
    strokeWidth: 1
  };
}

function createDiamondPoints(dimensions: ShapeDimensions) {
  return [
    { x: 0, y: -dimensions.height / 2 },
    { x: dimensions.width / 2, y: 0 },
    { x: 0, y: dimensions.height / 2 },
    { x: -dimensions.width / 2, y: 0 }
  ];
}

function createRegularPolygonPoints(sides: number, dimensions: ShapeDimensions) {
  const radiusX = dimensions.width / 2;
  const radiusY = dimensions.height / 2;
  const startAngle = -Math.PI / 2;

  return Array.from({ length: sides }, (_, index) => {
    const angle = startAngle + (index * Math.PI * 2) / sides;

    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY
    };
  });
}

function createStarburstPoints(points: number, dimensions: ShapeDimensions) {
  const outerRadiusX = dimensions.width / 2;
  const outerRadiusY = dimensions.height / 2;
  const innerRadiusX = outerRadiusX * 0.62;
  const innerRadiusY = outerRadiusY * 0.62;
  const totalPoints = points * 2;
  const startAngle = -Math.PI / 2;

  return Array.from({ length: totalPoints }, (_, index) => {
    const isOuterPoint = index % 2 === 0;
    const radiusX = isOuterPoint ? outerRadiusX : innerRadiusX;
    const radiusY = isOuterPoint ? outerRadiusY : innerRadiusY;
    const angle = startAngle + (index * Math.PI * 2) / totalPoints;

    return {
      x: Math.cos(angle) * radiusX,
      y: Math.sin(angle) * radiusY
    };
  });
}

function createLinePath(
  type: CanvasObjectType | string,
  dimensions: ShapeDimensions,
  curvature: number,
  startWidth: number,
  endWidth: number
) {
  const halfWidth = dimensions.width / 2;
  const amplitude = Math.max(-dimensions.height / 2, Math.min(dimensions.height / 2, curvature));
  const startHalfWidth = clampLineWidth(startWidth) / 2;
  const endHalfWidth = clampLineWidth(endWidth) / 2;
  const averageHalfWidth = (startHalfWidth + endHalfWidth) / 2;

  if (type === "curveLine") {
    return [
      `M ${-halfWidth} ${-startHalfWidth}`,
      `Q 0 ${-amplitude - averageHalfWidth} ${halfWidth} ${-endHalfWidth}`,
      `L ${halfWidth} ${endHalfWidth}`,
      `Q 0 ${-amplitude + averageHalfWidth} ${-halfWidth} ${startHalfWidth}`,
      "Z"
    ].join(" ");
  }

  if (type === "waveLine") {
    return [
      `M ${-halfWidth} ${-startHalfWidth}`,
      `Q ${-halfWidth * 0.66} ${-amplitude - averageHalfWidth} ${-halfWidth * 0.33} ${-averageHalfWidth}`,
      `Q 0 ${amplitude - averageHalfWidth} ${halfWidth * 0.33} ${-averageHalfWidth}`,
      `Q ${halfWidth * 0.66} ${-amplitude - averageHalfWidth} ${halfWidth} ${-endHalfWidth}`,
      `L ${halfWidth} ${endHalfWidth}`,
      `Q ${halfWidth * 0.66} ${-amplitude + averageHalfWidth} ${halfWidth * 0.33} ${averageHalfWidth}`,
      `Q 0 ${amplitude + averageHalfWidth} ${-halfWidth * 0.33} ${averageHalfWidth}`,
      `Q ${-halfWidth * 0.66} ${-amplitude + averageHalfWidth} ${-halfWidth} ${startHalfWidth}`,
      "Z"
    ].join(" ");
  }

  return [
    `M ${-halfWidth} ${-startHalfWidth}`,
    `L ${halfWidth} ${-endHalfWidth}`,
    `L ${halfWidth} ${endHalfWidth}`,
    `L ${-halfWidth} ${startHalfWidth}`,
    "Z"
  ].join(" ");
}

function createBoltPath(type: CanvasObjectType, dimensions: ShapeDimensions) {
  const scaleX = dimensions.width / 150;
  const scaleY = dimensions.height / 190;
  const toPoint = (x: number, y: number) =>
    `${Number((x * scaleX).toFixed(2))} ${Number((y * scaleY).toFixed(2))}`;
  const points =
    type === "boltSharp"
      ? [
          [42, -96],
          [4, -18],
          [66, -18],
          [-42, 96],
          [-4, 18],
          [-66, 18]
        ]
      : type === "boltStep"
        ? [
            [-32, -95],
            [50, -95],
            [24, -28],
            [56, -28],
            [25, 30],
            [55, 30],
            [-42, 96],
            [-20, 28],
            [-54, 28],
            [-28, -26],
            [-62, -26]
          ]
        : [
            [-4, -95],
            [68, -95],
            [16, -20],
            [58, -20],
            [-55, 96],
            [-17, 14],
            [-72, 14]
          ];

  return `${points
    .map(([x, y], index) => `${index === 0 ? "M" : "L"} ${toPoint(x, y)}`)
    .join(" ")} Z`;
}

export function getLineCurvatureForObject(object?: FabricObject | null) {
  if (!object || !(object instanceof Group)) {
    return 0;
  }

  return Number(object.get(lineCurvatureName) ?? 0);
}

export function getLineWidthsForObject(object?: FabricObject | null) {
  if (!object || !(object instanceof Group)) {
    return {
      startWidth: 0,
      endWidth: 0
    };
  }

  return {
    startWidth: Number(object.get(lineStartWidthName) ?? 8),
    endWidth: Number(object.get(lineEndWidthName) ?? 8)
  };
}

function clampLineWidth(value: number) {
  if (!Number.isFinite(value)) {
    return 8;
  }

  return Math.min(Math.max(value, 1), 80);
}

export function getShapeKindForObject(object?: FabricObject | null) {
  if (!object) {
    return null;
  }

  if (object instanceof Group) {
    return object.get(shapeKindName) as CanvasObjectType | null;
  }

  return object.get(shapeKindName) as CanvasObjectType | null;
}

function createSemicirclePath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;

  return `M ${-halfWidth} ${halfHeight} A ${halfWidth} ${dimensions.height} 0 0 0 ${halfWidth} ${halfHeight} L ${-halfWidth} ${halfHeight} Z`;
}

function createQuarterCirclePath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;

  return `M ${-halfWidth} ${halfHeight} L ${-halfWidth} ${-halfHeight} A ${dimensions.width} ${dimensions.height} 0 0 1 ${halfWidth} ${halfHeight} Z`;
}

function createScallopPath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const thirdWidth = dimensions.width / 3;
  const sixthWidth = dimensions.width / 6;
  const topWave = -halfHeight + dimensions.height * 0.35;
  const bottomWave = halfHeight - dimensions.height * 0.35;

  return [
    `M ${-halfWidth} ${-halfHeight}`,
    `C ${-halfWidth + sixthWidth} ${-halfHeight} ${-halfWidth + sixthWidth} ${topWave} ${-halfWidth + thirdWidth} ${topWave}`,
    `C ${-sixthWidth} ${topWave} ${-sixthWidth} ${-halfHeight} 0 ${-halfHeight}`,
    `C ${sixthWidth} ${-halfHeight} ${sixthWidth} ${topWave} ${halfWidth - thirdWidth} ${topWave}`,
    `C ${halfWidth - sixthWidth} ${topWave} ${halfWidth - sixthWidth} ${-halfHeight} ${halfWidth} ${-halfHeight}`,
    `L ${halfWidth} ${halfHeight}`,
    `C ${halfWidth - sixthWidth} ${halfHeight} ${halfWidth - sixthWidth} ${bottomWave} ${halfWidth - thirdWidth} ${bottomWave}`,
    `C ${sixthWidth} ${bottomWave} ${sixthWidth} ${halfHeight} 0 ${halfHeight}`,
    `C ${-sixthWidth} ${halfHeight} ${-sixthWidth} ${bottomWave} ${-halfWidth + thirdWidth} ${bottomWave}`,
    `C ${-halfWidth + sixthWidth} ${bottomWave} ${-halfWidth + sixthWidth} ${halfHeight} ${-halfWidth} ${halfHeight}`,
    "Z"
  ].join(" ");
}

function createCompoundPath(path: string, paint: ReturnType<typeof getShapePaint>) {
  const shape = new Path(path, {
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    ...paint
  });

  shape.set("fillRule", "evenodd");
  return shape;
}

function createDropPath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;

  return [
    `M ${-halfWidth} ${halfHeight}`,
    `L ${-halfWidth} ${-halfHeight * 0.08}`,
    `C ${-halfWidth} ${-halfHeight * 0.92} ${halfWidth * 0.08} ${-halfHeight * 1.1} ${halfWidth * 0.56} ${-halfHeight * 0.58}`,
    `C ${halfWidth * 1.15} ${halfHeight * 0.05} ${halfWidth * 0.58} ${halfHeight} ${0} ${halfHeight}`,
    "Z"
  ].join(" ");
}

function createPetalGridElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const cell = dimensions.width / 2;
  const radius = cell / 2;
  const offsets = [
    { x: -radius, y: -radius, angle: 0 },
    { x: radius, y: -radius, angle: 90 },
    { x: -radius, y: radius, angle: -90 },
    { x: radius, y: radius, angle: 180 }
  ];

  return offsets.map(({ x, y, angle }) => {
    const petal = new Path(createPetalCellPath(cell), {
      left: x,
      top: y,
      angle,
      originX: "center",
      originY: "center",
      ...paint
    });
    petal.set(shapeKindName, "petalGrid");
    return petal;
  });
}

function createPetalCellPath(size: number) {
  const half = size / 2;

  return [
    `M ${-half} ${-half}`,
    `L ${half} ${-half}`,
    `L ${half} ${half}`,
    `C ${half * 0.08} ${half} ${-half} ${half * 0.08} ${-half} ${-half}`,
    "Z"
  ].join(" ");
}

function createCircleClusterElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const radius = dimensions.width * 0.24;
  const offset = radius;

  return [
    { x: -offset, y: -offset },
    { x: offset, y: -offset },
    { x: -offset, y: offset },
    { x: offset, y: offset }
  ].map(({ x, y }) => {
    const circle = new Ellipse({
      left: x,
      top: y,
      originX: "center",
      originY: "center",
      rx: radius,
      ry: radius,
      ...paint
    });
    circle.set(shapeKindName, "circleCluster");
    return circle;
  });
}

function createCrossBurstElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const arm = dimensions.width * 0.34;
  const bar = dimensions.width * 0.32;
  const diagonal = dimensions.width * 0.33;
  const elements: ShapeElement[] = [
    new Rect({
      left: 0,
      top: 0,
      width: bar,
      height: dimensions.height,
      originX: "center",
      originY: "center",
      ...paint
    }),
    new Rect({
      left: 0,
      top: 0,
      width: dimensions.width,
      height: bar,
      originX: "center",
      originY: "center",
      ...paint
    })
  ];

  [
    { x: -arm, y: -arm },
    { x: arm, y: -arm },
    { x: -arm, y: arm },
    { x: arm, y: arm }
  ].forEach(({ x, y }) => {
    elements.push(
      new Polygon(createDiamondPoints({ width: diagonal, height: diagonal }), {
        left: x,
        top: y,
        originX: "center",
        originY: "center",
        ...paint
      })
    );
  });

  elements.forEach((element) => element.set(shapeKindName, "crossBurst"));
  return elements;
}

function createSemicircleStackElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const stack = [
    { width: dimensions.width * 0.52, y: -dimensions.height * 0.34 },
    { width: dimensions.width * 0.78, y: 0 },
    { width: dimensions.width, y: dimensions.height * 0.34 }
  ];

  return stack.map(({ width, y }) => {
    const height = width / 2;
    const shape = new Path(createSemicirclePath({ width, height }), {
      left: 0,
      top: y,
      originX: "center",
      originY: "center",
      ...paint
    });
    shape.set(shapeKindName, "semicircleStack");
    return shape;
  });
}

function createTriangleGridElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const cell = dimensions.width / 3;
  const start = -dimensions.width / 2 + cell / 2;
  const elements: Polygon[] = [];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const triangle = new Polygon(
        [
          { x: -cell / 2, y: -cell / 2 },
          { x: cell / 2, y: cell / 2 },
          { x: -cell / 2, y: cell / 2 }
        ],
        {
          left: start + column * cell,
          top: start + row * cell,
          originX: "center",
          originY: "center",
          ...paint
        }
      );
      triangle.set(shapeKindName, "triangleGrid");
      elements.push(triangle);
    }
  }

  return elements;
}

function createShieldPath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;

  return [
    `M ${-halfWidth} ${-halfHeight}`,
    `L ${halfWidth} ${-halfHeight}`,
    `L ${halfWidth} ${-halfHeight * 0.1}`,
    `C ${halfWidth} ${halfHeight * 0.85} ${-halfWidth} ${halfHeight * 0.85} ${-halfWidth} ${-halfHeight * 0.1}`,
    "Z"
  ].join(" ");
}

function createCrescentPath(dimensions: ShapeDimensions) {
  const outerRadius = dimensions.width / 2;
  const innerRadius = outerRadius * 0.58;

  return [
    createCirclePath(0, 0, outerRadius),
    createCirclePath(0, outerRadius * 0.28, innerRadius)
  ].join(" ");
}

function createPacmanPath(dimensions: ShapeDimensions) {
  const radius = dimensions.width / 2;

  return [
    `M ${0} ${-radius}`,
    `A ${radius} ${radius} 0 1 0 ${radius} ${0}`,
    `L ${0} ${0}`,
    "Z"
  ].join(" ");
}

function createArchPath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const thickness = dimensions.width * 0.28;
  const innerHalfWidth = halfWidth - thickness;
  const innerTop = -halfHeight + thickness;

  return [
    `M ${-halfWidth} ${halfHeight}`,
    `L ${-halfWidth} ${0}`,
    `A ${halfWidth} ${halfWidth} 0 0 1 ${halfWidth} ${0}`,
    `L ${halfWidth} ${halfHeight}`,
    `L ${innerHalfWidth} ${halfHeight}`,
    `L ${innerHalfWidth} ${0}`,
    `A ${innerHalfWidth} ${innerHalfWidth} 0 0 0 ${-innerHalfWidth} ${0}`,
    `L ${-innerHalfWidth} ${halfHeight}`,
    "Z",
    `M ${-innerHalfWidth} ${0}`,
    `A ${innerHalfWidth} ${innerHalfWidth} 0 0 1 ${innerHalfWidth} ${0}`,
    `L ${innerHalfWidth} ${innerTop}`,
    `A ${innerHalfWidth} ${innerHalfWidth} 0 0 0 ${-innerHalfWidth} ${innerTop}`,
    "Z"
  ].join(" ");
}

function createAsteriskElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const armLength = dimensions.width * 0.92;
  const armWidth = dimensions.width * 0.18;

  return [0, 45, 90, 135].map((angle) => {
    const arm = new Rect({
      left: 0,
      top: 0,
      width: armLength,
      height: armWidth,
      rx: armWidth / 2,
      ry: armWidth / 2,
      angle,
      originX: "center",
      originY: "center",
      ...paint
    });
    arm.set(shapeKindName, "asterisk");
    return arm;
  });
}

function createCornerPinwheelShape(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const scale = dimensions.width / 48;
  const basePoints = [
    { x: -19, y: -19 },
    { x: -5, y: -19 },
    { x: -10, y: -14 },
    { x: 4, y: 0 },
    { x: 0, y: 4 },
    { x: -14, y: -10 },
    { x: -19, y: -5 }
  ];
  const path = [0, 90, 180, 270]
    .map((angle) => {
      const radians = (angle * Math.PI) / 180;
      const points = basePoints.map((point) => {
        const x = point.x * scale;
        const y = point.y * scale;

        return {
          x: x * Math.cos(radians) - y * Math.sin(radians),
          y: x * Math.sin(radians) + y * Math.cos(radians)
        };
      });

      return [
        `M ${points[0].x} ${points[0].y}`,
        ...points.slice(1).map((point) => `L ${point.x} ${point.y}`),
        "Z"
      ].join(" ");
    })
    .join(" ");
  const pinwheel = new Path(path, {
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    ...paint
  });

  pinwheel.set(shapeKindName, "cornerPinwheel");
  return pinwheel;
}

function createQuarterRingElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const size = dimensions.width * 0.46;
  const offset = dimensions.width * 0.27;

  return [
    { x: -offset, y: -offset, angle: 0 },
    { x: offset, y: -offset, angle: 0 },
    { x: -offset, y: offset, angle: 0 },
    { x: offset, y: offset, angle: 0 }
  ].map(({ x, y, angle }) => {
    const ring = createCompoundPath(createQuarterRingPath(size), paint);
    ring.set({
      left: x,
      top: y,
      angle
    });
    ring.set(shapeKindName, "quarterRings");
    return ring;
  });
}

function createQuarterRingPath(size: number) {
  const outer = size / 2;
  const inner = outer * 0.58;
  const bottom = outer * 0.95;
  const top = -outer * 0.95;

  return [
    `M ${-outer} ${top}`,
    `L ${-inner} ${top}`,
    `A ${inner} ${inner} 0 0 0 ${inner} ${inner}`,
    `L ${inner} ${bottom}`,
    `A ${outer} ${outer} 0 0 1 ${-outer} ${top}`,
    "Z"
  ].join(" ");
}

function createPortalElements(dimensions: ShapeDimensions, fill?: string) {
  const ringPaint = getShapePaint(fill ?? "#E8E0C0");
  const dotPaint = getShapePaint(fill ? fill : "#0068C0");
  const ring = createCompoundPath(createPortalPath(dimensions), ringPaint);
  const dot = new Ellipse({
    left: 0,
    top: 0,
    originX: "center",
    originY: "center",
    rx: dimensions.width * 0.18,
    ry: dimensions.width * 0.18,
    ...dotPaint
  });

  ring.set(shapeKindName, "portal");
  dot.set(shapeKindName, "portal");
  return [ring, dot];
}

function createPortalPath(dimensions: ShapeDimensions) {
  const half = dimensions.width / 2;
  const thickness = dimensions.width * 0.16;
  const outerLeft = -half * 0.94;
  const outerRight = half * 0.94;
  const outerTop = -half * 0.94;
  const outerBottom = half * 0.86;
  const innerLeft = outerLeft + thickness;
  const innerRight = outerRight - thickness;
  const innerTop = outerTop + thickness;
  const innerBottom = outerBottom - thickness;
  const innerRadius = (innerRight - innerLeft) / 2;

  return [
    `M ${outerRight} ${outerBottom}`,
    `L ${outerRight} ${0}`,
    `C ${outerRight} ${outerTop * 0.54} ${half * 0.52} ${outerTop} ${0} ${outerTop}`,
    `C ${outerLeft} ${outerTop} ${outerLeft} ${-half * 0.32} ${outerLeft} ${0}`,
    `C ${outerLeft} ${half * 0.56} ${-half * 0.32} ${outerBottom} ${0} ${outerBottom}`,
    `L ${outerRight} ${outerBottom}`,
    "Z",
    `M ${innerRight} ${innerBottom}`,
    `L ${innerRight} ${0}`,
    `A ${innerRadius} ${innerRadius} 0 1 0 ${innerLeft} ${0}`,
    `A ${innerRadius} ${innerRadius} 0 1 0 ${innerRight} ${0}`,
    `L ${innerRight} ${innerBottom}`,
    "Z"
  ].join(" ");
}

function createPetalBurstElements(
  dimensions: ShapeDimensions,
  paint: ReturnType<typeof getShapePaint>
) {
  const petalLength = dimensions.width * 0.48;
  const petalWidth = dimensions.width * 0.18;
  const radius = dimensions.width * 0.28;

  return Array.from({ length: 12 }, (_, index) => {
    const angle = (index * 360) / 12;
    const radians = (angle * Math.PI) / 180;
    const petal = new Rect({
      left: Math.cos(radians) * radius,
      top: Math.sin(radians) * radius,
      width: petalLength,
      height: petalWidth,
      rx: petalWidth / 2,
      ry: petalWidth / 2,
      angle,
      originX: "center",
      originY: "center",
      ...paint
    });
    petal.set(shapeKindName, "petalBurst");
    return petal;
  });
}

function createEyePath(dimensions: ShapeDimensions) {
  const halfWidth = dimensions.width / 2;
  const halfHeight = dimensions.height / 2;
  const pupilRadius = Math.min(dimensions.width, dimensions.height) * 0.28;

  return [
    `M ${-halfWidth} 0`,
    `C ${-halfWidth * 0.35} ${-halfHeight} ${halfWidth * 0.35} ${-halfHeight} ${halfWidth} 0`,
    `C ${halfWidth * 0.35} ${halfHeight} ${-halfWidth * 0.35} ${halfHeight} ${-halfWidth} 0`,
    "Z",
    createCirclePath(0, 0, pupilRadius)
  ].join(" ");
}

function createCirclePath(centerX: number, centerY: number, radius: number) {
  return [
    `M ${centerX - radius} ${centerY}`,
    `A ${radius} ${radius} 0 1 0 ${centerX + radius} ${centerY}`,
    `A ${radius} ${radius} 0 1 0 ${centerX - radius} ${centerY}`,
    "Z"
  ].join(" ");
}

function getRegularSymmetryState(group: Group) {
  const shape = group
    .getObjects()
    .find((child) => child.get("name") !== guideName);
  const shapeKind =
    group.get(shapeKindName) ?? shape?.get(shapeKindName) ?? inferShapeKind(shape);

  if (!shape) {
    return false;
  }

  const width = Math.abs(Number(shape.width ?? 0) * Number(group.scaleX ?? 1));
  const height = Math.abs(Number(shape.height ?? 0) * Number(group.scaleY ?? 1));

  if (width <= 0 || height <= 0) {
    return false;
  }

  if (shapeKind === "rectangle" || shapeKind === "ellipse" || shapeKind === "diamond") {
    return areDimensionsEqual(width, height);
  }

  // For angular and custom library shapes, the guide turns active when the shape
  // keeps its authored proportion while transforming.
  return Math.abs(Number(group.scaleX ?? 1) - Number(group.scaleY ?? 1)) < 0.02;
}

function areDimensionsEqual(width: number, height: number) {
  const delta = Math.abs(width - height);
  const largestDimension = Math.max(width, height);

  return delta / largestDimension <= symmetryTolerance;
}

function inferShapeKind(shape?: FabricObject) {
  if (shape instanceof Rect) {
    return "rectangle";
  }

  if (shape instanceof Ellipse) {
    return "ellipse";
  }

  if (shape instanceof Triangle) {
    return "triangle";
  }

  if (shape instanceof Polygon) {
    return "polygon";
  }

  return null;
}
