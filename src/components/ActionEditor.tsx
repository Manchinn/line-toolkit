'use client';

import React, { useState } from 'react';
import { RichMenuArea, ActionType } from '@/types/line';
import { cn } from '@/lib/utils';
import {
  Link,
  MessageSquare,
  ArrowLeftRight,
  Trash2,
  CircleDot,
  Copy,
  Check,
  Code2,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
} from 'lucide-react';

interface ActionEditorProps {
  area: RichMenuArea | null;
  totalAreas: number;
  availableAliases: string[];
  tabSize?: { width: number; height: number };
  onUpdateArea: (updated: RichMenuArea) => void;
  onDeleteArea: (id: string) => void;
}

export default function ActionEditor({
  area,
  availableAliases,
  tabSize = { width: 2500, height: 1686 },
  onUpdateArea,
  onDeleteArea,
}: ActionEditorProps) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);

  if (!area) {
    return (
      <div className="bg-white border border-[#dce2de] rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-[300px] text-[#617166]">
        <CircleDot className="w-8 h-8 text-[#6d7c72] mb-2 stroke-[1.5]" />
        <p className="text-xs font-semibold text-[#314237]">ยังไม่ได้เลือกปุ่ม Action Area</p>
        <p className="text-[11px] text-[#617166] mt-1 max-w-[200px]">
          คลิกที่กล่องบนรูปภาพ หรือคลิกเลือกจากรายการเลเยอร์ด้านซ้าย
        </p>
      </div>
    );
  }

  const handleTypeChange = (type: ActionType) => {
    onUpdateArea({
      ...area,
      action: {
        ...area.action,
        type,
      },
    });
  };

  const handleBoundsChange = (key: keyof RichMenuArea['bounds'], value: number) => {
    const num = Math.max(0, isNaN(value) ? 0 : value);
    onUpdateArea({
      ...area,
      bounds: {
        ...area.bounds,
        [key]: num,
      },
    });
  };

  // Quick alignment presets
  const applyPreset = (preset: 'left50' | 'right50' | 'top50' | 'bottom50' | 'full') => {
    const w = tabSize.width;
    const h = tabSize.height;
    let nextBounds = { ...area.bounds };

    switch (preset) {
      case 'left50':
        nextBounds = { x: 0, y: 0, width: Math.round(w / 2), height: h };
        break;
      case 'right50':
        nextBounds = { x: Math.round(w / 2), y: 0, width: Math.round(w / 2), height: h };
        break;
      case 'top50':
        nextBounds = { x: 0, y: 0, width: w, height: Math.round(h / 2) };
        break;
      case 'bottom50':
        nextBounds = { x: 0, y: Math.round(h / 2), width: w, height: Math.round(h / 2) };
        break;
      case 'full':
        nextBounds = { x: 0, y: 0, width: w, height: h };
        break;
    }

    onUpdateArea({ ...area, bounds: nextBounds });
  };

  const copyJson = async () => {
    try {
      const jsonStr = JSON.stringify(area, null, 2);
      await navigator.clipboard.writeText(jsonStr);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard write failed / insecure context fallback
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Main Inspector Card */}
      <div className="bg-white border border-[#dce2de] rounded-xl p-3.5 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#dce2de]">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" aria-hidden="true" />
            <input
              type="text"
              name="areaLabel"
              aria-label="ชื่อปุ่ม Action Area"
              value={area.label}
              onChange={(e) => onUpdateArea({ ...area, label: e.target.value })}
              className="font-semibold text-xs text-[#18241d] bg-transparent border-b border-dashed border-[#cdd8d0] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42] py-0.5"
            />
          </div>
          <button
            type="button"
            title={`ลบปุ่ม ${area.label}`}
            aria-label={`ลบปุ่ม ${area.label}`}
            onClick={() => onDeleteArea(area.id)}
            className="text-[11px] text-[#56665b] hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors flex items-center gap-1 cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            ลบปุ่ม
          </button>
        </div>

        {/* Action Type Segmented Control */}
        <div>
          <span id="action-type-label" className="text-[10px] font-medium text-[#56665b] uppercase tracking-wider block mb-1.5">
            ประเภทการกระทำ (Action Type)
          </span>
          <div
            role="radiogroup"
            aria-labelledby="action-type-label"
            className="grid grid-cols-3 gap-1 bg-[#f7f8f7] p-1 rounded-lg border border-[#dce2de] text-[11px]"
          >
            <button
              type="button"
              role="radio"
              aria-checked={area.action.type === 'uri'}
              onClick={() => handleTypeChange('uri')}
              className={cn(
                'py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]',
                area.action.type === 'uri'
                  ? 'bg-[#147a42] text-white shadow-sm'
                  : 'text-[#56665b] hover:text-[#26362d]'
              )}
            >
              <Link className="w-3 h-3" aria-hidden="true" />
              เปิดลิงก์
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={area.action.type === 'message'}
              onClick={() => handleTypeChange('message')}
              className={cn(
                'py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]',
                area.action.type === 'message'
                  ? 'bg-[#166594] text-white shadow-sm'
                  : 'text-[#56665b] hover:text-[#26362d]'
              )}
            >
              <MessageSquare className="w-3 h-3" aria-hidden="true" />
              ส่งแชท
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={area.action.type === 'richmenuswitch'}
              onClick={() => handleTypeChange('richmenuswitch')}
              className={cn(
                'py-1.5 px-2 rounded-md font-medium transition-colors flex items-center justify-center gap-1 cursor-pointer select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]',
                area.action.type === 'richmenuswitch'
                  ? 'bg-[#754794] text-white shadow-sm'
                  : 'text-[#56665b] hover:text-[#26362d]'
              )}
            >
              <ArrowLeftRight className="w-3 h-3" aria-hidden="true" />
              สลับแท็บ
            </button>
          </div>
        </div>

        {/* Dynamic Fields */}
        {area.action.type === 'uri' && (
          <div className="space-y-1">
            <label htmlFor="action-uri-input" className="text-[10px] font-medium text-[#56665b] uppercase tracking-wider block">
              URL ปลายทาง (https:// หรือ line://)
            </label>
            <input
              id="action-uri-input"
              name="actionUri"
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={area.action.uri || ''}
              onChange={(e) =>
                onUpdateArea({
                  ...area,
                  action: { ...area.action, uri: e.target.value },
                })
              }
              placeholder="https://example.com"
              className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] font-mono"
            />
          </div>
        )}

        {area.action.type === 'message' && (
          <div className="space-y-1">
            <label htmlFor="action-message-input" className="text-[10px] font-medium text-[#56665b] uppercase tracking-wider block">
              ข้อความที่ส่งในแชทเมื่อกดปุ่ม
            </label>
            <input
              id="action-message-input"
              name="actionMessageText"
              type="text"
              value={area.action.text || ''}
              onChange={(e) =>
                onUpdateArea({
                  ...area,
                  action: { ...area.action, text: e.target.value },
                })
              }
              placeholder="เช่น สอบถามโปรโมชั่นล่าสุด"
              className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
            />
          </div>
        )}

        {area.action.type === 'richmenuswitch' && (
          <div className="space-y-1.5">
            <label htmlFor="action-alias-select" className="text-[10px] font-medium text-[#56665b] uppercase tracking-wider block">
              สลับไปยังแท็บ (Target Alias ID)
            </label>
            <select
              id="action-alias-select"
              name="actionTargetAlias"
              value={area.action.richMenuAliasId || ''}
              onChange={(e) =>
                onUpdateArea({
                  ...area,
                  action: { ...area.action, richMenuAliasId: e.target.value },
                })
              }
              className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] cursor-pointer font-mono"
            >
              <option value="">-- เลือกแท็บปลายทาง --</option>
              {availableAliases.map((alias) => (
                <option key={alias} value={alias}>
                  {alias}
                </option>
              ))}
            </select>
            <p className="text-[10px] text-[#617166]">
              * สลับเมนูบนมือถือทันทีแบบ Zero Latency ไม่ส่งข้อความเข้าแชท
            </p>
          </div>
        )}

        {/* Geometry & Precise Pixel Editor */}
        <div className="pt-3 border-t border-[#dce2de] space-y-2">
          <div className="flex items-center justify-between">
            <span id="pixel-geometry-heading" className="text-[10px] font-semibold text-[#56665b] uppercase tracking-wider">
              พิกัดปุ่ม (Pixel Geometry)
            </span>
            <span className="text-[10px] text-[#617166] font-mono tabular-nums">
              Max {tabSize.width}×{tabSize.height}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2" role="group" aria-labelledby="pixel-geometry-heading">
            <div>
              <label htmlFor="bounds-x-input" className="text-[10px] text-[#617166] font-mono block mb-0.5">X (จุดเริ่มต้นแนวนอน)</label>
              <input
                id="bounds-x-input"
                name="boundsX"
                type="number"
                min={0}
                max={tabSize.width}
                step={1}
                value={area.bounds.x}
                onChange={(e) => handleBoundsChange('x', parseInt(e.target.value))}
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="bounds-y-input" className="text-[10px] text-[#617166] font-mono block mb-0.5">Y (จุดเริ่มต้นแนวตั้ง)</label>
              <input
                id="bounds-y-input"
                name="boundsY"
                type="number"
                min={0}
                max={tabSize.height}
                step={1}
                value={area.bounds.y}
                onChange={(e) => handleBoundsChange('y', parseInt(e.target.value))}
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="bounds-width-input" className="text-[10px] text-[#617166] font-mono block mb-0.5">Width (ความกว้าง)</label>
              <input
                id="bounds-width-input"
                name="boundsWidth"
                type="number"
                min={20}
                max={tabSize.width}
                step={1}
                value={area.bounds.width}
                onChange={(e) => handleBoundsChange('width', parseInt(e.target.value))}
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="bounds-height-input" className="text-[10px] text-[#617166] font-mono block mb-0.5">Height (ความสูง)</label>
              <input
                id="bounds-height-input"
                name="boundsHeight"
                type="number"
                min={20}
                max={tabSize.height}
                step={1}
                value={area.bounds.height}
                onChange={(e) => handleBoundsChange('height', parseInt(e.target.value))}
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] tabular-nums"
              />
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="pt-1.5 flex items-center gap-1 text-[10px] text-[#56665b] flex-wrap">
            <span className="text-[#617166] mr-1 flex items-center gap-1">
              <LayoutGrid className="w-2.5 h-2.5" aria-hidden="true" />
              Presets:
            </span>
            <button
              type="button"
              onClick={() => applyPreset('left50')}
              className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
            >
              ซีกซ้าย 50%
            </button>
            <button
              type="button"
              onClick={() => applyPreset('right50')}
              className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
            >
              ซีกขวา 50%
            </button>
            <button
              type="button"
              onClick={() => applyPreset('top50')}
              className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
            >
              ครึ่งบน 50%
            </button>
            <button
              type="button"
              onClick={() => applyPreset('bottom50')}
              className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
            >
              ครึ่งล่าง 50%
            </button>
            <button
              type="button"
              onClick={() => applyPreset('full')}
              className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
            >
              เต็มจอ 100%
            </button>
          </div>
        </div>
      </div>

      {/* Raw LINE JSON Card */}
      <div className="bg-white border border-[#dce2de] rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            aria-expanded={showJson}
            className="text-[11px] font-semibold text-[#56665b] uppercase tracking-wider flex items-center gap-1.5 hover:text-[#26362d] transition-colors cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42] rounded px-1"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            LINE Area Schema
            {showJson ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="text-[10px] text-[#56665b] hover:text-[#26362d] bg-[#edf1ed] hover:bg-[#e5ebe6] px-2 py-0.5 rounded transition-colors flex items-center gap-1 cursor-pointer font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
          >
            {copied ? (
              <>
                <Check className="w-2.5 h-2.5 text-[#14713d]" aria-hidden="true" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-2.5 h-2.5" aria-hidden="true" />
                Copy
              </>
            )}
          </button>
        </div>

        {showJson && (
          <pre className="text-[10px] font-mono text-[#56665b] bg-[#f2f4f2] p-2.5 rounded-lg max-h-[160px] overflow-y-auto leading-relaxed border border-[#dce2de] select-all">
            {JSON.stringify(
              {
                bounds: area.bounds,
                action: area.action,
              },
              null,
              2
            )}
          </pre>
        )}
      </div>
    </div>
  );
}
