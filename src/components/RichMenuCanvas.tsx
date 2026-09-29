'use client';

import React, { useRef, useState } from 'react';
import type { AreaBounds, MenuSize, RichMenuArea } from '@/types/line';
import { cn } from '@/lib/utils';
import { ACTION_META, LINE_LIMITS, summarizeAction } from '@/lib/richmenu/actions';
import { clampBounds } from '@/lib/richmenu/geometry';
import { isAutoLinkArea } from '@/lib/richmenu/autolink';
import ActionIcon from './ActionIcon';
import { ImagePlus, Trash2, AlertCircle } from 'lucide-react';

interface CanvasProps {
  imageSrc?: string;
  size: MenuSize;
  areas: RichMenuArea[];
  selectedAreaId: string | null;
  /** Areas with validation errors get a red marker. */
  invalidAreaIds?: ReadonlySet<string>;
  /** Extra controls rendered in the toolbar (e.g. Grid Presets). */
  toolbar?: React.ReactNode;
  onSelectArea: (id: string | null) => void;
  onUpdateAreas: (areas: RichMenuArea[]) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

/** Drawn boxes smaller than this (native px) are treated as accidental clicks. */
const MIN_DRAW_SIZE = 20;

export function createAreaId(seed: number | string = 0) {
  return `area_${seed}_${Math.random().toString(36).slice(2, 7)}`;
}

const LEGEND_TYPES = ['uri', 'message', 'richmenuswitch', 'postback', 'none'] as const;

export default function RichMenuCanvas({
  imageSrc,
  size,
  areas,
  selectedAreaId,
  invalidAreaIds,
  toolbar,
  onSelectArea,
  onUpdateAreas,
  onUploadImage,
  onClearImage,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<AreaBounds | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);
  const isFull = areas.length >= LINE_LIMITS.maxAreas;

  // Pointer position → integer LINE native coordinates, clamped to the image.
  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.round(Math.max(0, Math.min(size.width, ((e.clientX - rect.left) * size.width) / rect.width)));
    const y = Math.round(Math.max(0, Math.min(size.height, ((e.clientY - rect.top) * size.height) / rect.height)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-area-action]')) return;
    onSelectArea(null);
    if (isFull) return;

    const pos = getCanvasCoords(e);
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    try {
      containerRef.current?.setPointerCapture(e.pointerId);
    } catch {
      // Pointer capture is best-effort (unsupported on some touch browsers)
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pos = getCanvasCoords(e);
    setHoverCoords(pos);
    if (!startPos) return;
    setCurrentBox({
      x: Math.min(startPos.x, pos.x),
      y: Math.min(startPos.y, pos.y),
      width: Math.abs(pos.x - startPos.x),
      height: Math.abs(pos.y - startPos.y),
    });
  };

  const finishDrawing = () => {
    if (startPos && currentBox && currentBox.width > MIN_DRAW_SIZE && currentBox.height > MIN_DRAW_SIZE && !isFull) {
      const newArea: RichMenuArea = {
        id: createAreaId(areas.length + 1),
        label: `ปุ่ม #${areas.length + 1}`,
        bounds: clampBounds(currentBox, size),
        action: { type: 'none' },
      };
      onUpdateAreas([...areas, newArea]);
      onSelectArea(newArea.id);
    }
    setStartPos(null);
    setCurrentBox(null);
  };

  const removeArea = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onUpdateAreas(areas.filter((a) => a.id !== id));
    if (selectedAreaId === id) onSelectArea(null);
  };

  const pct = (value: number, total: number) => `${(value / total) * 100}%`;

  return (
    <div className="flex flex-col items-center select-none w-full space-y-3">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between bg-white border border-[#dce2de] px-3.5 py-2 rounded-xl text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <label className="cursor-pointer bg-[#f7f8f7] hover:bg-[#e5ebe6] text-[#26362d] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#cdd8d0]/60 shadow-sm focus-within:ring-2 focus-within:ring-[#147a42]">
            <ImagePlus className="w-3.5 h-3.5 text-[#14713d]" aria-hidden="true" />
            {imageSrc ? 'เปลี่ยนภาพเมนู' : 'อัปโหลดภาพ Rich Menu'}
            <input type="file" accept="image/png, image/jpeg" onChange={onUploadImage} className="sr-only" />
          </label>
          {imageSrc && (
            <button
              type="button"
              onClick={onClearImage}
              className="text-[#56665b] hover:text-red-500 hover:bg-[#ebf0ec]/80 px-2 py-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
            >
              <Trash2 className="w-3 h-3" aria-hidden="true" />
              ลบภาพ
            </button>
          )}
          {toolbar}
        </div>

        <div className="flex items-center gap-2 text-[11px] text-[#56665b] font-mono tabular-nums">
          <span className="bg-[#f7f8f7] px-2 py-0.5 rounded border border-[#dce2de] text-[#314237]">
            {size.width} × {size.height} px
          </span>
          <span
            className={cn(
              'px-2 py-0.5 rounded border',
              isFull ? 'bg-amber-50 border-amber-200 text-amber-700' : 'bg-[#f7f8f7] border-[#dce2de] text-[#314237]'
            )}
          >
            {areas.length}/{LINE_LIMITS.maxAreas} Areas
          </span>
        </div>
      </div>

      {/* Main Canvas Workbench */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrawing}
        onPointerCancel={finishDrawing}
        onPointerLeave={() => setHoverCoords(null)}
        style={{ aspectRatio: `${size.width} / ${size.height}`, touchAction: 'none' }}
        className={cn(
          'relative w-full bg-[#f2f4f2] border border-[#dce2de] rounded-xl overflow-hidden shadow-2xl transition-colors',
          isFull ? 'cursor-default' : 'cursor-crosshair'
        )}
      >
        {imageSrc ? (
          // eslint-disable-next-line @next/next/no-img-element -- local FileReader data URL preview
          <img
            src={imageSrc}
            width={size.width}
            height={size.height}
            alt="พรีวิวภาพ Rich Menu บนผืนผ้าใบ"
            className="w-full h-full object-cover pointer-events-none select-none"
          />
        ) : areas.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#617166] gap-2 bg-[#f2f4f2]">
            <ImagePlus className="w-10 h-10 text-zinc-600" aria-hidden="true" />
            <span className="text-xs font-medium text-[#56665b]">
              อัปโหลดภาพ Rich Menu ({size.width}×{size.height} px)
            </span>
            <span className="text-[11px] text-[#6d7c72]">คลิกลากบนภาพ หรือเลือก Grid Preset เพื่อสร้างพื้นที่กด</span>
          </div>
        ) : null}

        {/* Existing Bounding Boxes */}
        {areas.map((area, idx) => {
          const isSelected = area.id === selectedAreaId;
          const meta = ACTION_META[area.action.type] ?? ACTION_META.none;
          const isInvalid = invalidAreaIds?.has(area.id) ?? false;

          return (
            <div
              key={area.id}
              style={{
                left: pct(area.bounds.x, size.width),
                top: pct(area.bounds.y, size.height),
                width: pct(area.bounds.width, size.width),
                height: pct(area.bounds.height, size.height),
              }}
              className={cn(
                'absolute flex flex-col justify-between p-1 border-2 transition-colors overflow-hidden',
                meta.boxClass,
                // Selected on top; auto-linked tab bar above user areas so its badges stay visible (matches simulator).
                isSelected ? 'z-30 ring-2 ring-offset-1 ring-[#18241d] ring-offset-white' : isAutoLinkArea(area) ? 'z-20' : 'z-10'
              )}
            >
              <button
                type="button"
                data-area-action="select"
                aria-label={`เลือกพื้นที่กด #${idx + 1} ${area.label} (${meta.label})`}
                aria-pressed={isSelected}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectArea(area.id);
                }}
                className="absolute inset-0 w-full h-full bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white cursor-pointer z-0"
              />

              {/* Badge: top-left action type */}
              <div className="relative z-10 flex items-start justify-between gap-1 text-[10px] font-mono leading-none pointer-events-none">
                <span className={cn('px-1.5 py-0.5 rounded shadow flex items-center gap-1 font-semibold whitespace-nowrap', meta.badgeClass)}>
                  <ActionIcon type={area.action.type} className="w-2.5 h-2.5" />
                  {idx + 1} · {meta.shortLabel}
                  {isInvalid && <AlertCircle className="w-2.5 h-2.5 text-red-200" aria-label="มีข้อผิดพลาด" />}
                </span>
                <button
                  type="button"
                  data-area-action="delete"
                  aria-label={`ลบปุ่ม #${idx + 1} ${area.label}`}
                  title={`ลบปุ่ม #${idx + 1}`}
                  onClick={(e) => removeArea(area.id, e)}
                  className="pointer-events-auto bg-black/70 hover:bg-red-600 text-white w-4 h-4 shrink-0 rounded flex items-center justify-center text-xs transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  ×
                </button>
              </div>

              <div className="relative z-10 text-[10px] text-white bg-[#18241d]/85 px-1 py-0.5 rounded truncate font-mono pointer-events-none">
                {area.label} — {summarizeAction(area.action)}
              </div>
            </div>
          );
        })}

        {/* Current Drawing Box */}
        {currentBox && (
          <div
            style={{
              left: pct(currentBox.x, size.width),
              top: pct(currentBox.y, size.height),
              width: pct(currentBox.width, size.width),
              height: pct(currentBox.height, size.height),
            }}
            className="absolute border-2 border-dashed border-zinc-500 bg-zinc-500/15 pointer-events-none z-40"
          >
            <div className="absolute top-1 left-1 bg-[#18241d] text-white text-[10px] font-mono px-1 rounded tabular-nums">
              {currentBox.width} × {currentBox.height}
            </div>
          </div>
        )}
      </div>

      {/* Legend + Status */}
      <div className="flex items-center justify-between w-full text-[11px] text-[#617166] font-mono px-1 gap-3 flex-wrap">
        <ul className="flex items-center gap-3 flex-wrap" aria-label="สีตามประเภท Action">
          {LEGEND_TYPES.map((type) => (
            <li key={type} className="flex items-center gap-1">
              <span className={cn('w-2.5 h-2.5 rounded-sm', ACTION_META[type].swatchClass)} aria-hidden="true" />
              {ACTION_META[type].label}
            </li>
          ))}
        </ul>
        <span className="tabular-nums">
          {isFull
            ? `ครบ ${LINE_LIMITS.maxAreas} ปุ่มแล้ว (สูงสุดของ LINE)`
            : `พิกัด: ${hoverCoords ? `X ${hoverCoords.x}, Y ${hoverCoords.y}` : '-'}`}
        </span>
      </div>
    </div>
  );
}
