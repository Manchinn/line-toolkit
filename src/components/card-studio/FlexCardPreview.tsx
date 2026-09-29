'use client';

import React from 'react';
import type { FlexCard } from '@/lib/flex/types';
import { CARD_TEMPLATE_META } from '@/lib/flex/types';
import { cn } from '@/lib/utils';
import { ImageOff } from 'lucide-react';

interface FlexCardPreviewProps {
  card: FlexCard;
  selected?: boolean;
  hasError?: boolean;
  onSelect?: () => void;
}

/** Visual approximation of the generated bubble (mega, hero + body + footer). */
export default function FlexCardPreview({ card, selected, hasError, onSelect }: FlexCardPreviewProps) {
  const meta = CARD_TEMPLATE_META[card.template];
  const [w, h] = meta.aspectRatio.split(':').map(Number);
  const isProduct = card.template === 'product';
  const imageUrl = card.imageUrl.trim();

  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`เลือกการ์ด ${card.title || 'ไม่มีหัวข้อ'}`}
      className={cn(
        'w-[240px] shrink-0 snap-start overflow-hidden rounded-2xl bg-white text-left shadow-md transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#06C755]',
        selected ? 'ring-2 ring-[#06C755]' : 'ring-1 ring-black/5 hover:ring-[#06C755]/50',
        hasError && !selected && 'ring-red-400'
      )}
    >
      <div className="relative w-full bg-[#eef1ef]" style={{ aspectRatio: `${w} / ${h}` }}>
        {imageUrl.startsWith('https://') ? (
          // eslint-disable-next-line @next/next/no-img-element -- arbitrary user-provided remote URL preview
          <img src={imageUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-[10px] text-[#8a978f]">
            <ImageOff className="h-5 w-5" aria-hidden="true" />
            {imageUrl ? 'ต้องเป็น https://' : 'ไม่มีรูป (จะไม่ใส่ hero)'}
          </div>
        )}
      </div>

      <div className="space-y-1.5 p-4">
        {card.tag.trim() && (
          <span className="inline-block rounded-md px-2 py-0.5 text-[10px] font-bold" style={{ color: meta.tagColor, backgroundColor: meta.tagBg }}>
            {card.tag}
          </span>
        )}
        <p className="line-clamp-2 text-[15px] font-bold leading-snug text-[#111]">{card.title || 'ไม่มีหัวข้อ'}</p>
        {card.subtitle.trim() && (
          <p className={cn(isProduct ? 'text-sm font-bold text-[#06C755]' : 'text-xs text-[#555]')}>{card.subtitle}</p>
        )}
        {card.description.trim() && <p className="line-clamp-4 text-xs leading-relaxed text-[#8c8c8c]">{card.description}</p>}
      </div>

      <div className="space-y-1 px-3 pb-3">
        <span className="block truncate rounded-md bg-[#06C755] py-2 text-center text-xs font-semibold text-white">
          {card.cta.label || 'ดูเพิ่มเติม'}
        </span>
        {card.secondaryCta?.label.trim() && (
          <span className="block truncate py-1.5 text-center text-xs font-semibold text-[#555]">{card.secondaryCta.label}</span>
        )}
      </div>
    </button>
  );
}
