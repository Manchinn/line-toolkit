import type { AreaBounds, MenuSize } from '@/types/line';

/** Smallest tap area the editor allows (px, native resolution). */
export const MIN_AREA_SIZE = 1;

function toInt(value: number): number {
  return Number.isFinite(value) ? Math.round(value) : 0;
}

/**
 * Force bounds to integers and keep them fully inside the image.
 * x/y are clamped first, then width/height are shrunk to fit the remaining space.
 */
export function clampBounds(bounds: AreaBounds, size: MenuSize): AreaBounds {
  const x = Math.min(Math.max(0, toInt(bounds.x)), size.width - MIN_AREA_SIZE);
  const y = Math.min(Math.max(0, toInt(bounds.y)), size.height - MIN_AREA_SIZE);
  const width = Math.min(Math.max(MIN_AREA_SIZE, toInt(bounds.width)), size.width - x);
  const height = Math.min(Math.max(MIN_AREA_SIZE, toInt(bounds.height)), size.height - y);
  return { x, y, width, height };
}

export function isBoundsInside(bounds: AreaBounds, size: MenuSize): boolean {
  const values = [bounds.x, bounds.y, bounds.width, bounds.height];
  return (
    values.every(Number.isInteger) &&
    bounds.x >= 0 &&
    bounds.y >= 0 &&
    bounds.width > 0 &&
    bounds.height > 0 &&
    bounds.x + bounds.width <= size.width &&
    bounds.y + bounds.height <= size.height
  );
}

/**
 * Split `total` px into `parts` integer segments that sum exactly to `total`.
 * Remainder pixels go to the last segments, e.g. 2500/3 → [833, 833, 834].
 */
export function splitEven(total: number, parts: number): { offset: number; length: number }[] {
  const count = Math.max(1, Math.floor(parts));
  return Array.from({ length: count }, (_, i) => {
    const start = Math.round((total * i) / count);
    const end = Math.round((total * (i + 1)) / count);
    return { offset: start, length: end - start };
  });
}

/** Build a rows × cols grid inside a rectangle region. */
export function gridCells(region: AreaBounds, rows: number, cols: number): AreaBounds[] {
  const ys = splitEven(region.height, rows);
  const xs = splitEven(region.width, cols);
  return ys.flatMap((row) =>
    xs.map((col) => ({
      x: region.x + col.offset,
      y: region.y + row.offset,
      width: col.length,
      height: row.length,
    }))
  );
}

/** Rescale bounds when the base size changes (e.g. 1686 → 843) so the layout keeps its shape. */
export function scaleBounds(bounds: AreaBounds, from: MenuSize, to: MenuSize): AreaBounds {
  const sx = to.width / from.width;
  const sy = to.height / from.height;
  return clampBounds(
    {
      x: bounds.x * sx,
      y: bounds.y * sy,
      width: bounds.width * sx,
      height: bounds.height * sy,
    },
    to
  );
}
