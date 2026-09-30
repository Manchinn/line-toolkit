'use client';

import React, { useId } from 'react';
import type { CardCta, CardCtaType, CardTemplate, FlexCard } from '@/lib/flex/types';
import { CARD_TEMPLATE_META, FLEX_LIMITS } from '@/lib/flex/types';
import { cn } from '@/lib/utils';
import { ArrowLeft, ArrowRight, Copy, Trash2 } from 'lucide-react';

interface CardEditorProps {
  card: FlexCard;
  index: number;
  total: number;
  canDuplicate: boolean;
  onChange: (card: FlexCard) => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onMove: (direction: -1 | 1) => void;
}

const inputClass = 'form-input text-xs py-1.5';
const CTA_TYPES: { value: CardCtaType; label: string; placeholder: string }[] = [
  { value: 'uri', label: 'เปิดลิงก์', placeholder: 'https://liff.line.me/…' },
  { value: 'message', label: 'ส่งข้อความ', placeholder: 'ข้อความที่ส่งเข้าแชท' },
  { value: 'postback', label: 'Postback', placeholder: 'action=book&id=1' },
];

function CtaFields({ legend, cta, onChange }: { legend: string; cta: CardCta; onChange: (cta: CardCta) => void }) {
  const uid = useId();
  const meta = CTA_TYPES.find((t) => t.value === cta.type) ?? CTA_TYPES[0];
  return (
    <fieldset className="space-y-1.5 rounded-lg border border-[#dfe5e1] p-2.5">
      <legend className="px-1 text-[10px] font-semibold uppercase tracking-wider text-[#56665b]">{legend}</legend>
      <div className="grid grid-cols-[1fr_auto] gap-2">
        <div>
          <label htmlFor={`${uid}-label`} className="sr-only">ข้อความบนปุ่ม</label>
          <input
            id={`${uid}-label`}
            value={cta.label}
            maxLength={FLEX_LIMITS.buttonLabel}
            onChange={(e) => onChange({ ...cta, label: e.target.value })}
            placeholder="ข้อความบนปุ่ม"
            className={inputClass}
          />
        </div>
        <div>
          <label htmlFor={`${uid}-type`} className="sr-only">ประเภทปุ่ม</label>
          <select
            id={`${uid}-type`}
            value={cta.type}
            onChange={(e) => onChange({ ...cta, type: e.target.value as CardCtaType })}
            className={cn(inputClass, 'w-auto cursor-pointer')}
          >
            {CTA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
      </div>
      <label htmlFor={`${uid}-value`} className="sr-only">{meta.label}</label>
      <input
        id={`${uid}-value`}
        value={cta.value}
        spellCheck={false}
        onChange={(e) => onChange({ ...cta, value: e.target.value })}
        placeholder={meta.placeholder}
        className={cn(inputClass, cta.type !== 'message' && 'font-mono')}
      />
    </fieldset>
  );
}

export default function CardEditor({ card, index, total, canDuplicate, onChange, onDuplicate, onDelete, onMove }: CardEditorProps) {
  const uid = useId();
  const meta = CARD_TEMPLATE_META[card.template];
  const trimmedImageUrl = card.imageUrl.trim();
  // Empty is allowed (card renders without a hero); anything else must be https.
  const isImageUrlInvalid = trimmedImageUrl !== '' && !trimmedImageUrl.startsWith('https://');
  const set = <K extends keyof FlexCard>(key: K, value: FlexCard[K]) => onChange({ ...card, [key]: value });
  const iconBtn = 'rounded p-1 text-[#56665b] hover:bg-[#ebf0ec] hover:text-[#1c2620] disabled:opacity-40 disabled:hover:bg-transparent focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 border-b border-[#dfe5e1] pb-2">
        <span className="text-xs font-bold text-[#1c2620]">การ์ด #{index + 1}</span>
        <div className="flex items-center gap-0.5">
          <button type="button" className={iconBtn} disabled={index === 0} onClick={() => onMove(-1)} aria-label="เลื่อนไปทางซ้าย">
            <ArrowLeft className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" className={iconBtn} disabled={index === total - 1} onClick={() => onMove(1)} aria-label="เลื่อนไปทางขวา">
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" className={iconBtn} disabled={!canDuplicate} onClick={onDuplicate} aria-label="ทำสำเนาการ์ด">
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
          <button type="button" className={cn(iconBtn, 'hover:text-red-600')} onClick={onDelete} aria-label="ลบการ์ด">
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="form-group !mb-0">
        <span className="form-label">เทมเพลต</span>
        <div className="preset-pills" role="radiogroup" aria-label="เทมเพลตการ์ด">
          {(Object.keys(CARD_TEMPLATE_META) as CardTemplate[]).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={card.template === t}
              onClick={() => set('template', t)}
              className={cn('preset-pill-btn', card.template === t && 'active')}
            >
              {CARD_TEMPLATE_META[t].label}
            </button>
          ))}
        </div>
      </div>

      <div className="form-group !mb-0">
        <label htmlFor={`${uid}-img`} className="form-label">รูปภาพ (URL แบบ https:// · อัตราส่วน {meta.aspectRatio})</label>
        <input
          id={`${uid}-img`}
          type="url"
          spellCheck={false}
          value={card.imageUrl}
          onChange={(e) => set('imageUrl', e.target.value)}
          placeholder="https://cdn.example.com/photo.jpg"
          aria-invalid={isImageUrlInvalid}
          aria-describedby={isImageUrlInvalid ? `${uid}-img-hint` : undefined}
          className={cn(inputClass, 'font-mono', isImageUrlInvalid && 'border-amber-400')}
        />
        {isImageUrlInvalid && (
          <p id={`${uid}-img-hint`} className="mt-1 text-[11px] text-amber-700">
            LINE รับเฉพาะ URL แบบ https:// (ไม่รับ http, data: หรือไฟล์ในเครื่อง)
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div className="form-group !mb-0">
          <label htmlFor={`${uid}-tag`} className="form-label">ป้ายกำกับ (Tag)</label>
          <input id={`${uid}-tag`} value={card.tag} onChange={(e) => set('tag', e.target.value)} placeholder="เช่น ใหม่, ว่างวันนี้" className={inputClass} />
        </div>
        <div className="form-group !mb-0">
          <label htmlFor={`${uid}-sub`} className="form-label">{meta.subtitleLabel}</label>
          <input id={`${uid}-sub`} value={card.subtitle} onChange={(e) => set('subtitle', e.target.value)} className={inputClass} />
        </div>
      </div>

      <div className="form-group !mb-0">
        <label htmlFor={`${uid}-title`} className="form-label">หัวข้อ</label>
        <input id={`${uid}-title`} value={card.title} onChange={(e) => set('title', e.target.value)} className={inputClass} />
      </div>

      <div className="form-group !mb-0">
        <label htmlFor={`${uid}-desc`} className="form-label">คำอธิบายย่อ</label>
        <textarea id={`${uid}-desc`} rows={2} value={card.description} onChange={(e) => set('description', e.target.value)} className={cn(inputClass, 'resize-y')} />
      </div>

      <div className="rounded-lg border border-[#dfe5e1] bg-[#f8faf8] p-3">
        <label className="flex items-center gap-2.5 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={Boolean(card.noCta)}
            onChange={(e) => set('noCta', e.target.checked)}
            className="h-4 w-4 rounded border-[#b8dec4] text-[#147a42] focus:ring-[#147a42] accent-[#147a42]"
          />
          <span className="text-xs font-semibold text-[#1c2620]">
            ซ่อนปุ่ม Call-to-Action (No CTA / Pure Image Mode)
          </span>
        </label>
        <p className="mt-1 text-[11px] text-[#5e6f64] pl-6.5">
          {card.noCta
            ? 'โหมดภาพล้วน / ไม่แสดงปุ่มท้ายการ์ด (Footer Block จะถูกตัดออกโดยสมบูรณ์)'
            : 'แสดงปุ่ม Call-to-Action ด้านล่างของการ์ด'}
        </p>
      </div>

      {!card.noCta && (
        <>
          <CtaFields legend="ปุ่มหลัก (Call-to-Action)" cta={card.cta} onChange={(cta) => set('cta', cta)} />
          <CtaFields
            legend="ปุ่มรอง (ไม่บังคับ — เว้นข้อความว่างเพื่อซ่อน)"
            cta={card.secondaryCta ?? { label: '', type: 'uri', value: '' }}
            onChange={(cta) => set('secondaryCta', cta)}
          />
        </>
      )}
    </div>
  );
}
