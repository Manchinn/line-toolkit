'use client';

import React, { useRef, useState } from 'react';
import { RichMenuArea } from '@/types/line';
import { cn } from '@/lib/utils';
import { ImagePlus, Trash2, Plus, Link, MessageSquare, ArrowLeftRight, Send } from 'lucide-react';

interface CanvasProps {
  imageSrc?: string;
  size: { width: number; height: number };
  areas: RichMenuArea[];
  selectedAreaId: string | null;
  onSelectArea: (id: string | null) => void;
  onUpdateAreas: (areas: RichMenuArea[]) => void;
  onUploadImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearImage: () => void;
}

function createAreaId(index: number) {
  return `area_${index}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function RichMenuCanvas({
  imageSrc,
  size,
  areas,
  selectedAreaId,
  onSelectArea,
  onUpdateAreas,
  onUploadImage,
  onClearImage,
}: CanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPos, setStartPos] = useState<{ x: number; y: number } | null>(null);
  const [currentBox, setCurrentBox] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [hoverCoords, setHoverCoords] = useState<{ x: number; y: number } | null>(null);

  // Calculate coordinates relative to LINE native resolution
  const getCanvasCoords = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const scaleX = size.width / rect.width;
    const scaleY = size.height / rect.height;

    const x = Math.round(Math.max(0, Math.min(size.width, (e.clientX - rect.left) * scaleX)));
    const y = Math.round(Math.max(0, Math.min(size.height, (e.clientY - rect.top) * scaleY)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('[data-area-action]')) return;

    const pos = getCanvasCoords(e);
    setIsDrawing(true);
    setStartPos(pos);
    setCurrentBox({ x: pos.x, y: pos.y, width: 0, height: 0 });
    onSelectArea(null);
    try {
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    } catch {
      // Ignore pointer capture fail
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const pos = getCanvasCoords(e);
    setHoverCoords(pos);

    if (!isDrawing || !startPos) return;

    const x = Math.min(startPos.x, pos.x);
    const y = Math.min(startPos.y, pos.y);
    const width = Math.abs(pos.x - startPos.x);
    const height = Math.abs(pos.y - startPos.y);

    setCurrentBox({ x, y, width, height });
  };

  const handlePointerUp = () => {
    if (isDrawing && currentBox && currentBox.width > 20 && currentBox.height > 20) {
      const newArea: RichMenuArea = {
        id: createAreaId(areas.length + 1),
        label: `ปุ่ม #${areas.length + 1}`,
        bounds: currentBox,
        action: {
          type: 'uri',
          uri: 'https://line.me',
        },
      };
      onUpdateAreas([...areas, newArea]);
      onSelectArea(newArea.id);
    }
    setIsDrawing(false);
    setStartPos(null);
    setCurrentBox(null);
  };

  const addQuickArea = () => {
    const newArea: RichMenuArea = {
      id: createAreaId(areas.length + 1),
      label: `ปุ่ม #${areas.length + 1}`,
      bounds: {
        x: 0,
        y: 0,
        width: Math.round(size.width / 2),
        height: size.height,
      },
      action: {
        type: 'uri',
        uri: 'https://line.me',
      },
    };
    onUpdateAreas([...areas, newArea]);
    onSelectArea(newArea.id);
  };

  const removeArea = (id: string, e: React.MouseEvent | React.PointerEvent) => {
    e.stopPropagation();
    onUpdateAreas(areas.filter((a) => a.id !== id));
    if (selectedAreaId === id) onSelectArea(null);
  };

  const getAreaBorderColor = (type: string, isSelected: boolean) => {
    if (isSelected) {
      return 'border-[#147a42] border-2 bg-[#147a42]/20 z-20';
    }
    switch (type) {
      case 'uri':
        return 'border-[#69ab80] bg-emerald-500/10 hover:border-emerald-400 z-10';
      case 'message':
        return 'border-sky-500/80 bg-sky-500/10 hover:border-sky-400 z-10';
      case 'richmenuswitch':
        return 'border-purple-500/80 bg-purple-500/10 hover:border-purple-400 z-10';
      default:
        return 'border-amber-500/80 bg-amber-500/10 hover:border-amber-400 z-10';
    }
  };

  const getAreaIcon = (type: string) => {
    switch (type) {
      case 'uri':
        return <Link className="w-2.5 h-2.5" aria-hidden="true" />;
      case 'message':
        return <MessageSquare className="w-2.5 h-2.5" aria-hidden="true" />;
      case 'richmenuswitch':
        return <ArrowLeftRight className="w-2.5 h-2.5" aria-hidden="true" />;
      default:
        return <Send className="w-2.5 h-2.5" aria-hidden="true" />;
    }
  };

  return (
    <div className="flex flex-col items-center select-none w-full space-y-3">
      {/* Top Controls Bar */}
      <div className="w-full flex items-center justify-between bg-white border border-[#dce2de] px-3.5 py-2 rounded-xl text-xs flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <label className="cursor-pointer bg-[#f7f8f7] hover:bg-[#e5ebe6] text-[#26362d] px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border border-[#cdd8d0]/60 shadow-sm focus-within:ring-2 focus-within:ring-[#147a42]">
            <ImagePlus className="w-3.5 h-3.5 text-[#14713d]" aria-hidden="true" />
            {imageSrc ? 'เปลี่ยนภาพเมนู' : 'อัปโหลดภาพ Rich Menu'}
            <input
              type="file"
              accept="image/png, image/jpeg"
              onChange={onUploadImage}
              className="sr-only"
            />
          </label>
          <button
            type="button"
            onClick={addQuickArea}
            className="bg-[#f7f8f7] hover:bg-[#e5ebe6] text-[#26362d] border border-[#cdd8d0]/60 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
            title="เพิ่มปุ่มแบบค่าเริ่มต้นลงบนผืนผ้าใบ"
          >
            <Plus className="w-3 h-3 text-[#14713d]" aria-hidden="true" />
            เพิ่มปุ่ม
          </button>
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
        </div>

        <div className="flex items-center gap-3 text-[11px] text-[#56665b] font-mono tabular-nums">
          <span className="bg-[#f7f8f7] px-2 py-0.5 rounded border border-[#dce2de] text-[#314237]">
            {size.width} × {size.height} px
          </span>
          <span className="bg-[#f7f8f7] px-2 py-0.5 rounded border border-[#dce2de] text-[#314237]">
            {areas.length} Action{areas.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Main Canvas Workbench */}
      <div
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => {
          setHoverCoords(null);
          if (isDrawing) handlePointerUp();
        }}
        onPointerLeave={() => {
          setHoverCoords(null);
        }}
        style={{
          aspectRatio: `${size.width} / ${size.height}`,
          touchAction: 'none',
        }}
        className="relative w-full bg-[#f2f4f2] border border-[#dce2de] rounded-xl overflow-hidden cursor-crosshair shadow-2xl transition-colors"
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
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-[#617166] gap-2 bg-[#f2f4f2]">
            <ImagePlus className="w-10 h-10 text-zinc-600" aria-hidden="true" />
            <span className="text-xs font-medium text-[#56665b]">
              อัปโหลดภาพ Rich Menu ({size.width}×{size.height} px)
            </span>
            <span className="text-[11px] text-[#6d7c72]">
              หรือคลิกลากบนภาพ / กดปุ่ม &quot;เพิ่มปุ่ม&quot; เพื่อกำหนดพื้นที่กด
            </span>
          </div>
        )}

        {/* Existing Bounding Boxes */}
        {areas.map((area, idx) => {
          const isSelected = area.id === selectedAreaId;
          const leftPct = (area.bounds.x / size.width) * 100;
          const topPct = (area.bounds.y / size.height) * 100;
          const widthPct = (area.bounds.width / size.width) * 100;
          const heightPct = (area.bounds.height / size.height) * 100;

          return (
            <div
              key={area.id}
              style={{
                left: `${leftPct}%`,
                top: `${topPct}%`,
                width: `${widthPct}%`,
                height: `${heightPct}%`,
              }}
              className={cn(
                'absolute flex flex-col justify-between p-1.5 transition-colors border group select-none',
                getAreaBorderColor(area.action.type, isSelected)
              )}
            >
              {/* Clickable Select Surface */}
              <button
                type="button"
                data-area-action="select"
                aria-label={`เลือกพื้นที่กด #${idx + 1} ${area.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectArea(area.id);
                }}
                className="absolute inset-0 w-full h-full bg-transparent focus:outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer z-0"
              />

              {/* Box Top Header */}
              <div className="relative z-10 flex items-center justify-between text-[10px] font-mono leading-none pointer-events-none">
                <span
                  className={cn(
                    'px-1.5 py-0.5 rounded shadow flex items-center gap-1 font-semibold',
                    isSelected ? 'bg-white text-zinc-950 font-bold' : 'bg-[#18241d] text-white'
                  )}
                >
                  {getAreaIcon(area.action.type)}
                  #{idx + 1} {area.action.type.toUpperCase()}
                </span>
                <button
                  type="button"
                  data-area-action="delete"
                  aria-label={`ลบปุ่ม #${idx + 1} ${area.label}`}
                  title={`ลบปุ่ม #${idx + 1} ${area.label}`}
                  onClick={(e) => removeArea(area.id, e)}
                  className="pointer-events-auto bg-black/70 hover:bg-red-600 text-white w-4 h-4 rounded flex items-center justify-center text-xs opacity-100 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-white"
                >
                  ×
                </button>
              </div>

              {/* Box Label / Payload Text */}
              <div className="relative z-10 text-[10px] text-white bg-[#18241d]/90 px-1 py-0.5 rounded truncate font-mono pointer-events-none">
                {area.action.type === 'uri' && (area.action.uri || 'ไม่มี URI')}
                {area.action.type === 'message' && `“${area.action.text || ''}”`}
                {area.action.type === 'richmenuswitch' && `Switch -> ${area.action.richMenuAliasId || 'N/A'}`}
                {area.action.type === 'postback' && `Data: ${area.action.data || 'N/A'}`}
              </div>
            </div>
          );
        })}

        {/* Current Drawing Box */}
        {isDrawing && currentBox && (
          <div
            style={{
              left: `${(currentBox.x / size.width) * 100}%`,
              top: `${(currentBox.y / size.height) * 100}%`,
              width: `${(currentBox.width / size.width) * 100}%`,
              height: `${(currentBox.height / size.height) * 100}%`,
            }}
            className="absolute border border-emerald-500 bg-emerald-500/20 pointer-events-none z-30 shadow-[0_0_15px_rgba(16,185,129,0.3)]"
          >
            <div className="absolute top-1 left-1 bg-[#18241d] text-white text-[10px] font-mono px-1 rounded tabular-nums">
              {currentBox.width} × {currentBox.height}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Status Bar */}
      <div className="flex items-center justify-between w-full text-[11px] text-[#617166] font-mono px-1">
        <div className="flex items-center gap-3">
          <span>คลิกลากหรือแตะเพื่อกำหนดพื้นที่</span>
          <span>•</span>
          <span className="tabular-nums">
            พิกัด: {hoverCoords ? `X: ${hoverCoords.x}, Y: ${hoverCoords.y}` : '-'}
          </span>
        </div>
        <div>
          <span>LINE Standard Pixel Coordinates</span>
        </div>
      </div>
    </div>
  );
}
