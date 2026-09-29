import type { AreaBounds, MenuSize } from '@/types/line';
import { gridCells } from './geometry';

export type PresetCellRole = 'tab' | 'content';

export interface PresetCell {
  role: PresetCellRole;
  bounds: AreaBounds;
}

export type GridPresetId = 'grid-2x3' | 'grid-2x2' | 'tabbar-3col' | 'grid-1x3';

export interface GridPreset {
  id: GridPresetId;
  label: string;
  description: string;
  /** Mini diagram for the preset button: rows of column weights. */
  diagram: number[][];
  build: (size: MenuSize, options?: { tabCount?: number }) => PresetCell[];
}

/** Tab bar height at full size (1686px); scaled proportionally for other sizes. */
export const TAB_BAR_HEIGHT_FULL = 400;
const FULL_HEIGHT = 1686;

export function tabBarHeight(size: MenuSize): number {
  return Math.round((TAB_BAR_HEIGHT_FULL * size.height) / FULL_HEIGHT);
}

function fullRegion(size: MenuSize): AreaBounds {
  return { x: 0, y: 0, width: size.width, height: size.height };
}

const content = (bounds: AreaBounds): PresetCell => ({ role: 'content', bounds });

export const GRID_PRESETS: GridPreset[] = [
  {
    id: 'grid-2x3',
    label: 'Grid 2×3',
    description: '6 ช่องเท่ากัน',
    diagram: [
      [1, 1, 1],
      [1, 1, 1],
    ],
    build: (size) => gridCells(fullRegion(size), 2, 3).map(content),
  },
  {
    id: 'grid-2x2',
    label: 'Grid 2×2',
    description: '4 ช่องใหญ่',
    diagram: [
      [1, 1],
      [1, 1],
    ],
    build: (size) => gridCells(fullRegion(size), 2, 2).map(content),
  },
  {
    id: 'tabbar-3col',
    label: 'Tab Bar + 3',
    description: 'แถบแท็บบน + 3 ช่องล่าง',
    diagram: [[1, 1], [1, 1, 1]],
    build: (size, options) => {
      const barHeight = tabBarHeight(size);
      const tabCount = Math.min(3, Math.max(2, options?.tabCount ?? 2));
      const tabs = gridCells({ x: 0, y: 0, width: size.width, height: barHeight }, 1, tabCount).map(
        (bounds): PresetCell => ({ role: 'tab', bounds })
      );
      const cols = gridCells(
        { x: 0, y: barHeight, width: size.width, height: size.height - barHeight },
        1,
        3
      ).map(content);
      return [...tabs, ...cols];
    },
  },
  {
    id: 'grid-1x3',
    label: 'Grid 1×3',
    description: '3 ช่องแนวตั้งเต็มความสูง',
    diagram: [[1, 1, 1]],
    build: (size) => gridCells(fullRegion(size), 1, 3).map(content),
  },
];

export function getPreset(id: GridPresetId): GridPreset {
  const preset = GRID_PRESETS.find((p) => p.id === id);
  if (!preset) throw new Error(`Unknown grid preset: ${id}`);
  return preset;
}
