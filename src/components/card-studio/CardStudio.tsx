'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useCardStore } from '@/store/card-store';
import { buildFlexContents, buildFlexMessage, validateCards } from '@/lib/flex/builder';
import { FLEX_LIMITS } from '@/lib/flex/types';
import { cn } from '@/lib/utils';
import FlexCardPreview from './FlexCardPreview';
import CardEditor from './CardEditor';
import { AlertCircle, Check, CheckCheck, Code2, Copy, Package, Plus, UserRound } from 'lucide-react';

type JsonMode = 'message' | 'contents';

export default function CardStudio() {
  const { cards, selectedCardId, altText, addCard, updateCard, duplicateCard, deleteCard, moveCard, selectCard, setAltText } =
    useCardStore();
  const [jsonMode, setJsonMode] = useState<JsonMode>('message');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void useCardStore.persist.rehydrate();
  }, []);

  const selected = cards.find((c) => c.id === selectedCardId) ?? null;
  const selectedIndex = selected ? cards.indexOf(selected) : -1;
  const isFull = cards.length >= FLEX_LIMITS.maxCarouselBubbles;
  const issues = useMemo(() => validateCards(cards), [cards]);
  const invalidIds = useMemo(() => new Set(issues.map((i) => i.cardId).filter(Boolean)), [issues]);

  const json = useMemo(() => {
    if (cards.length === 0) return '';
    const value = jsonMode === 'message' ? buildFlexMessage(cards, altText) : buildFlexContents(cards);
    return JSON.stringify(value, null, 2);
  }, [cards, altText, jsonMode]);

  const copy = async () => {
    if (!json) return;
    try {
      await navigator.clipboard.writeText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context)
    }
  };

  const addBtn =
    'inline-flex items-center gap-1.5 rounded-md border border-[#cdd8d0] bg-[#f7f8f7] px-2.5 py-1.5 text-xs font-medium text-[#26362d] hover:bg-[#e5ebe6] disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]';

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={addBtn} disabled={isFull} onClick={() => addCard('person')}>
            <Plus className="h-3 w-3" aria-hidden="true" />
            <UserRound className="h-3.5 w-3.5 text-[#147a42]" aria-hidden="true" /> การ์ดบุคคล
          </button>
          <button type="button" className={addBtn} disabled={isFull} onClick={() => addCard('product')}>
            <Plus className="h-3 w-3" aria-hidden="true" />
            <Package className="h-3.5 w-3.5 text-orange-600" aria-hidden="true" /> การ์ดสินค้า
          </button>
        </div>
        <span className="font-mono text-[11px] text-[#5e6f64]">
          {cards.length}/{FLEX_LIMITS.maxCarouselBubbles} cards · {cards.length > 1 ? 'Carousel' : 'Bubble'}
        </span>
      </div>

      {/* Carousel preview */}
      <div className="rounded-xl bg-[#8ca3c4] p-4">
        {cards.length === 0 ? (
          <p className="py-10 text-center text-xs text-white/90">ยังไม่มีการ์ด — เพิ่มการ์ดบุคคลหรือสินค้าด้านบน</p>
        ) : (
          <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto pb-2" aria-label="พรีวิว Carousel (ปัดแนวนอน)">
            {cards.map((card) => (
              <FlexCardPreview
                key={card.id}
                card={card}
                selected={card.id === selectedCardId}
                hasError={invalidIds.has(card.id)}
                onSelect={() => selectCard(card.id)}
              />
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* Editor */}
        <div className="rounded-lg border border-[#dfe5e1] p-3.5">
          {selected ? (
            <CardEditor
              key={selected.id}
              card={selected}
              index={selectedIndex}
              total={cards.length}
              canDuplicate={!isFull}
              onChange={updateCard}
              onDuplicate={() => duplicateCard(selected.id)}
              onDelete={() => deleteCard(selected.id)}
              onMove={(d) => moveCard(selected.id, d)}
            />
          ) : (
            <p className="py-8 text-center text-xs text-[#5e6f64]">เลือกการ์ดจากพรีวิวเพื่อแก้ไข</p>
          )}
        </div>

        {/* JSON output */}
        <div className="space-y-2">
          <div className="form-group !mb-0">
            <label htmlFor="flex-alt-text" className="form-label">altText (ข้อความแจ้งเตือน / ห้องแชท)</label>
            <input
              id="flex-alt-text"
              value={altText}
              maxLength={FLEX_LIMITS.altText}
              onChange={(e) => setAltText(e.target.value)}
              className="form-input text-xs py-1.5"
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#dfe5e1] pb-2">
            <span className="flex items-center gap-1.5 font-mono text-xs font-semibold text-[#1c2620]">
              <Code2 className="h-4 w-4 text-[#147a42]" aria-hidden="true" /> flex-message.json
            </span>
            <div className="flex items-center gap-2">
              <div className="flex rounded bg-[#f0f4f1] p-0.5 font-mono text-[11px]" role="radiogroup" aria-label="รูปแบบ JSON">
                {(['message', 'contents'] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    role="radio"
                    aria-checked={jsonMode === mode}
                    onClick={() => setJsonMode(mode)}
                    title={mode === 'message' ? 'Message object สำหรับ Messaging API (push/reply)' : 'เฉพาะ contents สำหรับวางใน Flex Message Simulator'}
                    className={cn('rounded px-2 py-0.5', jsonMode === mode ? 'bg-white text-[#1c2620] shadow-sm' : 'text-[#5e6f64]')}
                  >
                    {mode === 'message' ? 'Message API' : 'Simulator'}
                  </button>
                ))}
              </div>
              <button type="button" onClick={copy} disabled={!json} className="btn-emerald-outline text-xs py-1 px-2.5">
                {copied ? <Check className="h-3 w-3" aria-hidden="true" /> : <Copy className="h-3 w-3" aria-hidden="true" />}
                {copied ? 'Copied!' : 'Copy Flex JSON'}
              </button>
            </div>
          </div>

          <pre className="max-h-80 overflow-auto rounded-lg bg-[#18231c] p-4 font-mono text-[11px] leading-relaxed text-[#d2edd9]">
            {json || '// ยังไม่มีการ์ด'}
          </pre>

          <div aria-live="polite">
            {issues.length === 0 ? (
              <p className="flex items-center gap-1.5 text-xs text-[#147a42]">
                <CheckCheck className="h-4 w-4" aria-hidden="true" /> พร้อมใช้งานกับ LINE Messaging API
              </p>
            ) : (
              <ul className="space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                {issues.map((issue, i) => (
                  <li key={`${issue.cardId ?? 'all'}-${i}`} className="flex items-start gap-1">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    {issue.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
