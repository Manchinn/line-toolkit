'use client';

import React from 'react';
import type { MenuSize, RichMenuArea, RichMenuTab } from '@/types/line';
import { GRID_PRESETS, type GridPreset } from '@/lib/richmenu/presets';
import { createAreaId } from './RichMenuCanvas';
import { LayoutGrid } from 'lucide-react';

interface GridPresetBarProps {
  size: MenuSize;
  tabs: Pick<RichMenuTab, 'id' | 'title' | 'aliasId'>[];
  existingAreaCount: number;
  onApply: (areas: RichMenuArea[]) => void;
}

/** Tiny proportional diagram so users can see the layout before clicking. */
function PresetDiagram({ rows }: { rows: number[][] }) {
  return (
    <span className="grid gap-px w-6 h-4 shrink-0" style={{ gridTemplateRows: `repeat(${rows.length}, 1fr)` }} aria-hidden="true">
      {rows.map((cols, r) => (
        <span key={r} className="grid gap-px" style={{ gridTemplateColumns: `repeat(${cols.length}, 1fr)` }}>
          {cols.map((_, c) => (
            <span key={c} className="bg-[#147a42]/70 rounded-[1px]" />
          ))}
        </span>
      ))}
    </span>
  );
}

export function buildPresetAreas(
  preset: GridPreset,
  size: MenuSize,
  tabs: Pick<RichMenuTab, 'title' | 'aliasId'>[]
): RichMenuArea[] {
  const cells = preset.build(size, { tabCount: tabs.length });
  let tabIndex = 0;
  let contentIndex = 0;

  return cells.map((cell, i) => {
    if (cell.role === 'tab') {
      const target = tabs[tabIndex++];
      return {
        id: createAreaId(i + 1),
        label: target ? `แท็บ ${target.title}` : `แท็บ #${tabIndex}`,
        bounds: cell.bounds,
        action: target
          ? { type: 'richmenuswitch', richMenuAliasId: target.aliasId, data: `switch-to-${target.aliasId}` }
          : { type: 'none' },
      };
    }
    contentIndex += 1;
    return { id: createAreaId(i + 1), label: `ปุ่ม #${contentIndex}`, bounds: cell.bounds, action: { type: 'none' } };
  });
}

export default function GridPresetBar({ size, tabs, existingAreaCount, onApply }: GridPresetBarProps) {
  const apply = (preset: GridPreset) => {
    if (
      existingAreaCount > 0 &&
      !confirm(`ใช้ ${preset.label} จะแทนที่ปุ่มเดิม ${existingAreaCount} ปุ่มในแท็บนี้ (ภาพพื้นหลังยังอยู่) ยืนยัน?`)
    ) {
      return;
    }
    onApply(buildPresetAreas(preset, size, tabs));
  };

  return (
    <div className="flex items-center gap-1 flex-wrap" role="group" aria-label="Grid Presets">
      <span className="text-[11px] text-[#56665b] flex items-center gap-1 pl-1 border-l border-[#dce2de] ml-1">
        <LayoutGrid className="w-3 h-3 text-[#14713d]" aria-hidden="true" />
        Grid Presets:
      </span>
      {GRID_PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          onClick={() => apply(preset)}
          title={preset.description}
          className="bg-[#f7f8f7] hover:bg-[#e5ebe6] text-[#26362d] border border-[#cdd8d0]/60 px-2 py-1 rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
        >
          <PresetDiagram rows={preset.diagram} />
          {preset.label}
        </button>
      ))}
    </div>
  );
}
