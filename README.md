# neoform-pigments

Local-first digital art composition editor for N€0Form&Pigment$.

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- Fabric.js
- Zustand

## Install

```bash
npm install
```

## Run

```bash
npm run dev
```

## Build

```bash
npm run build
```

## Project Structure

```text
src/
  components/
  editor/
  canvas/
  libraries/
  effects/
  pigment/
  store/
  types/
  utils/
```

## MVP Order

1. Setup
2. Layout
3. Fabric.js
4. Basic shapes
5. Layers panel
6. Libraries
7. Export

Read `PRD.md` before implementing product behavior. The current version intentionally ships only the base editor layout and isolated Fabric.js setup point.
