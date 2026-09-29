'use client';

import React, { useId, useState } from 'react';
import type { ActionType, AreaAction, MenuSize, RichMenuArea, RichMenuTab } from '@/types/line';
import { cn } from '@/lib/utils';
import {
  ACTION_META,
  EDITABLE_ACTION_TYPES,
  LINE_LIMITS,
  changeActionType,
  toLineAction,
  validateAction,
} from '@/lib/richmenu/actions';
import { clampBounds } from '@/lib/richmenu/geometry';
import ActionIcon from './ActionIcon';
import { Trash2, CircleDot, Copy, Check, Code2, ChevronDown, ChevronUp, LayoutGrid, AlertCircle } from 'lucide-react';

interface ActionEditorProps {
  area: RichMenuArea | null;
  /** All tabs, used for the richmenuswitch target dropdown. */
  tabs: Pick<RichMenuTab, 'id' | 'title' | 'aliasId'>[];
  currentTabId: string;
  tabSize: MenuSize;
  onUpdateArea: (updated: RichMenuArea) => void;
  onDeleteArea: (id: string) => void;
}

const inputClass =
  'w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]';
const labelClass = 'text-[10px] font-medium text-[#56665b] uppercase tracking-wider flex items-center justify-between';

function Counter({ value, max }: { value: string | undefined; max: number }) {
  const len = value?.length ?? 0;
  return <span className={cn('font-mono normal-case tabular-nums', len > max ? 'text-red-600' : 'text-[#8a978f]')}>{len}/{max}</span>;
}

type BoundsKey = keyof RichMenuArea['bounds'];
const BOUNDS_FIELDS: { key: BoundsKey; label: string }[] = [
  { key: 'x', label: 'X (แนวนอน)' },
  { key: 'y', label: 'Y (แนวตั้ง)' },
  { key: 'width', label: 'Width' },
  { key: 'height', label: 'Height' },
];

type AlignPreset = 'left50' | 'right50' | 'top50' | 'bottom50' | 'full';
const ALIGN_PRESETS: { id: AlignPreset; label: string }[] = [
  { id: 'left50', label: 'ซีกซ้าย 50%' },
  { id: 'right50', label: 'ซีกขวา 50%' },
  { id: 'top50', label: 'ครึ่งบน 50%' },
  { id: 'bottom50', label: 'ครึ่งล่าง 50%' },
  { id: 'full', label: 'เต็มจอ 100%' },
];

export default function ActionEditor({ area, tabs, currentTabId, tabSize, onUpdateArea, onDeleteArea }: ActionEditorProps) {
  const [showJson, setShowJson] = useState(false);
  const [copied, setCopied] = useState(false);
  const uid = useId();

  if (!area) {
    return (
      <div className="bg-white border border-[#dce2de] rounded-xl p-5 text-center flex flex-col items-center justify-center min-h-[240px] text-[#617166]">
        <CircleDot className="w-8 h-8 text-[#6d7c72] mb-2 stroke-[1.5]" aria-hidden="true" />
        <p className="text-xs font-semibold text-[#314237]">ยังไม่ได้เลือกพื้นที่กด</p>
        <p className="text-[11px] text-[#617166] mt-1 max-w-[220px]">
          คลิกกล่องบนผืนผ้าใบ หรือกด “แก้ไข” ในตาราง Areas เพื่อตั้งค่า Action
        </p>
      </div>
    );
  }

  const action = area.action;
  const errors = validateAction(action, tabs.map((t) => t.aliasId));
  const setAction = (next: AreaAction) => onUpdateArea({ ...area, action: next });
  const patchAction = (partial: Partial<AreaAction>) => setAction({ ...action, ...partial });

  const handleBoundsChange = (key: BoundsKey, raw: string) => {
    const value = parseInt(raw, 10);
    onUpdateArea({ ...area, bounds: clampBounds({ ...area.bounds, [key]: Number.isNaN(value) ? 0 : value }, tabSize) });
  };

  const applyAlign = (preset: AlignPreset) => {
    const w = tabSize.width;
    const h = tabSize.height;
    const half = { w: Math.round(w / 2), h: Math.round(h / 2) };
    const map: Record<AlignPreset, RichMenuArea['bounds']> = {
      left50: { x: 0, y: 0, width: half.w, height: h },
      right50: { x: half.w, y: 0, width: w - half.w, height: h },
      top50: { x: 0, y: 0, width: w, height: half.h },
      bottom50: { x: 0, y: half.h, width: w, height: h - half.h },
      full: { x: 0, y: 0, width: w, height: h },
    };
    onUpdateArea({ ...area, bounds: map[preset] });
  };

  const linePreview = { bounds: area.bounds, action: toLineAction(action) };

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(linePreview, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context) — nothing to do
    }
  };

  const id = (name: string) => `${uid}-${name}`;

  return (
    <div className="space-y-3.5">
      <div className="bg-white border border-[#dce2de] rounded-xl p-3.5 space-y-3.5">
        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-[#dce2de] gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span className={cn('w-2.5 h-2.5 rounded-full shrink-0', ACTION_META[action.type].swatchClass)} aria-hidden="true" />
            <input
              type="text"
              aria-label="ชื่อปุ่ม (ใช้ภายในเครื่องมือ)"
              value={area.label}
              onChange={(e) => onUpdateArea({ ...area, label: e.target.value })}
              className="min-w-0 font-semibold text-xs text-[#18241d] bg-transparent border-b border-dashed border-[#cdd8d0] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42] py-0.5"
            />
          </div>
          <button
            type="button"
            onClick={() => onDeleteArea(area.id)}
            className="text-[11px] text-[#56665b] hover:text-red-500 p-1 hover:bg-red-50 rounded transition-colors flex items-center gap-1 shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
          >
            <Trash2 className="w-3 h-3" aria-hidden="true" />
            ลบปุ่ม
          </button>
        </div>

        {/* Action Type */}
        <div>
          <span id={id('type')} className={cn(labelClass, 'mb-1.5')}>
            ประเภท Action (action.type)
          </span>
          <div
            role="radiogroup"
            aria-labelledby={id('type')}
            className="grid grid-cols-3 sm:grid-cols-5 gap-1 bg-[#f7f8f7] p-1 rounded-lg border border-[#dce2de] text-[11px]"
          >
            {EDITABLE_ACTION_TYPES.map((type: ActionType) => {
              const active = action.type === type;
              return (
                <button
                  key={type}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setAction(changeActionType(action, type))}
                  className={cn(
                    'py-1.5 px-1.5 rounded-md font-medium transition-colors flex items-center justify-center gap-1 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]',
                    active ? ACTION_META[type].activeClass : 'text-[#56665b] hover:text-[#26362d] hover:bg-white'
                  )}
                >
                  <ActionIcon type={type} />
                  {ACTION_META[type].label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Dynamic Fields */}
        {action.type === 'uri' && (
          <div className="space-y-1">
            <label htmlFor={id('uri')} className={labelClass}>
              URL / LIFF URL <Counter value={action.uri} max={LINE_LIMITS.uri} />
            </label>
            <input
              id={id('uri')}
              type="url"
              autoComplete="off"
              spellCheck={false}
              value={action.uri ?? ''}
              onChange={(e) => patchAction({ uri: e.target.value })}
              placeholder="https://liff.line.me/1234567890-AbCdEfGh"
              className={cn(inputClass, 'font-mono')}
            />
            <div className="flex gap-1 flex-wrap text-[10px]">
              {['https://liff.line.me/', 'https://line.me/R/', 'tel:'].map((prefix) => (
                <button
                  key={prefix}
                  type="button"
                  onClick={() => patchAction({ uri: prefix })}
                  className="font-mono bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
                >
                  {prefix}
                </button>
              ))}
            </div>
          </div>
        )}

        {action.type === 'message' && (
          <div className="space-y-1">
            <label htmlFor={id('text')} className={labelClass}>
              ข้อความที่ผู้ใช้จะส่งเข้าแชท <Counter value={action.text} max={LINE_LIMITS.messageText} />
            </label>
            <textarea
              id={id('text')}
              rows={2}
              value={action.text ?? ''}
              onChange={(e) => patchAction({ text: e.target.value })}
              placeholder="เช่น สอบถามโปรโมชั่นล่าสุด"
              className={cn(inputClass, 'resize-y')}
            />
          </div>
        )}

        {action.type === 'richmenuswitch' && (
          <div className="space-y-2">
            <div className="space-y-1">
              <label htmlFor={id('alias')} className={labelClass}>
                สลับไปแท็บ
              </label>
              <select
                id={id('alias')}
                value={tabs.some((t) => t.aliasId === action.richMenuAliasId) ? action.richMenuAliasId : ''}
                onChange={(e) => patchAction({ richMenuAliasId: e.target.value })}
                className={cn(inputClass, 'cursor-pointer')}
              >
                <option value="">-- เลือกแท็บปลายทาง --</option>
                {tabs.map((t) => (
                  <option key={t.id} value={t.aliasId}>
                    {t.title} ({t.aliasId}){t.id === currentTabId ? ' • แท็บนี้' : ''}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label htmlFor={id('alias-id')} className={labelClass}>
                  richMenuAliasId
                </label>
                <input
                  id={id('alias-id')}
                  type="text"
                  spellCheck={false}
                  value={action.richMenuAliasId ?? ''}
                  onChange={(e) => patchAction({ richMenuAliasId: e.target.value.trim() })}
                  placeholder="tab-b"
                  className={cn(inputClass, 'font-mono')}
                />
              </div>
              <div className="space-y-1">
                <label htmlFor={id('switch-data')} className={labelClass}>
                  data (postback)
                </label>
                <input
                  id={id('switch-data')}
                  type="text"
                  spellCheck={false}
                  value={action.data ?? ''}
                  onChange={(e) => patchAction({ data: e.target.value })}
                  placeholder={`switch-to-${action.richMenuAliasId || 'tab-b'}`}
                  className={cn(inputClass, 'font-mono')}
                />
              </div>
            </div>
          </div>
        )}

        {action.type === 'postback' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <div className="space-y-1">
              <label htmlFor={id('pb-data')} className={labelClass}>
                data <Counter value={action.data} max={LINE_LIMITS.postbackData} />
              </label>
              <input
                id={id('pb-data')}
                type="text"
                spellCheck={false}
                value={action.data ?? ''}
                onChange={(e) => patchAction({ data: e.target.value })}
                placeholder="action=buy&itemid=123"
                className={cn(inputClass, 'font-mono')}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={id('pb-display')} className={labelClass}>
                displayText (ไม่บังคับ)
              </label>
              <input
                id={id('pb-display')}
                type="text"
                value={action.displayText ?? ''}
                onChange={(e) => patchAction({ displayText: e.target.value || undefined })}
                placeholder="ข้อความที่แสดงในแชท"
                className={inputClass}
              />
            </div>
          </div>
        )}

        {action.type !== 'none' && (
          <div className="space-y-1">
            <label htmlFor={id('label')} className={labelClass}>
              action.label (ไม่บังคับ — ใช้กับ accessibility) <Counter value={action.label} max={LINE_LIMITS.actionLabel} />
            </label>
            <input
              id={id('label')}
              type="text"
              value={action.label ?? ''}
              onChange={(e) => patchAction({ label: e.target.value || undefined })}
              className={inputClass}
            />
          </div>
        )}

        {errors.length > 0 && (
          <ul className="text-[11px] text-red-700 bg-red-50 border border-red-200 rounded-lg p-2 space-y-0.5" aria-live="polite">
            {errors.map((err) => (
              <li key={err} className="flex items-start gap-1">
                <AlertCircle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                {err}
              </li>
            ))}
          </ul>
        )}

        {/* Geometry */}
        <div className="pt-3 border-t border-[#dce2de] space-y-2">
          <div className="flex items-center justify-between">
            <span id={id('geo')} className="text-[10px] font-semibold text-[#56665b] uppercase tracking-wider">
              พิกัดปุ่ม (Pixel Geometry)
            </span>
            <span className="text-[10px] text-[#617166] font-mono tabular-nums">
              Max {tabSize.width}×{tabSize.height} · จำนวนเต็มเท่านั้น
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2" role="group" aria-labelledby={id('geo')}>
            {BOUNDS_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={id(`b-${key}`)} className="text-[10px] text-[#617166] font-mono block mb-0.5">
                  {label}
                </label>
                <input
                  id={id(`b-${key}`)}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={key === 'x' || key === 'width' ? tabSize.width : tabSize.height}
                  step={1}
                  value={area.bounds[key]}
                  onChange={(e) => handleBoundsChange(key, e.target.value)}
                  className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] tabular-nums"
                />
              </div>
            ))}
          </div>

          <div className="pt-1.5 flex items-center gap-1 text-[10px] text-[#56665b] flex-wrap">
            <span className="text-[#617166] mr-1 flex items-center gap-1">
              <LayoutGrid className="w-2.5 h-2.5" aria-hidden="true" />
              จัดตำแหน่ง:
            </span>
            {ALIGN_PRESETS.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => applyAlign(p.id)}
                className="bg-[#f7f8f7] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded border border-[#dce2de] text-[#314237] focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* LINE Area JSON */}
      <div className="bg-white border border-[#dce2de] rounded-xl p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setShowJson(!showJson)}
            aria-expanded={showJson}
            className="text-[11px] font-semibold text-[#56665b] uppercase tracking-wider flex items-center gap-1.5 hover:text-[#26362d] transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42] rounded px-1"
          >
            <Code2 className="w-3.5 h-3.5" aria-hidden="true" />
            LINE Area Schema
            {showJson ? <ChevronUp className="w-3 h-3" aria-hidden="true" /> : <ChevronDown className="w-3 h-3" aria-hidden="true" />}
          </button>
          <button
            type="button"
            onClick={copyJson}
            className="text-[10px] text-[#56665b] hover:text-[#26362d] bg-[#edf1ed] hover:bg-[#e5ebe6] px-2 py-0.5 rounded transition-colors flex items-center gap-1 font-mono focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
          >
            {copied ? <Check className="w-2.5 h-2.5 text-[#14713d]" aria-hidden="true" /> : <Copy className="w-2.5 h-2.5" aria-hidden="true" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        {showJson && (
          <pre className="text-[10px] font-mono text-[#56665b] bg-[#f2f4f2] p-2.5 rounded-lg max-h-[160px] overflow-y-auto leading-relaxed border border-[#dce2de] select-all">
            {action.type === 'none' ? '// ยังไม่กำหนด Action — พื้นที่นี้จะไม่ถูกส่งไป LINE' : JSON.stringify(linePreview, null, 2)}
          </pre>
        )}
      </div>
    </div>
  );
}
