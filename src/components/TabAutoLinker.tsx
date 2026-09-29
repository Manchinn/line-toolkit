'use client';

import React, { useState } from 'react';
import type { RichMenuTab } from '@/types/line';
import { checkAutoLinkable, isAutoLinkArea } from '@/lib/richmenu/autolink';
import { tabBarHeight } from '@/lib/richmenu/presets';
import { cn } from '@/lib/utils';
import { Link2, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface TabAutoLinkerProps {
  tabs: RichMenuTab[];
  /** Runs the linker; returns warnings or throws. */
  onAutoLink: () => string[];
}

type Result = { kind: 'ok' | 'warn' | 'error'; messages: string[] };

export default function TabAutoLinker({ tabs, onAutoLink }: TabAutoLinkerProps) {
  const [result, setResult] = useState<Result | null>(null);
  const blockers = checkAutoLinkable(tabs);
  const isLinked = tabs.length > 1 && tabs.every((t) => t.areas.filter(isAutoLinkArea).length === tabs.length);

  const run = () => {
    const existing = tabs.reduce((n, t) => n + t.areas.filter(isAutoLinkArea).length, 0);
    const msg = existing
      ? `สร้างแถบสลับแท็บใหม่ทั้ง ${tabs.length} แท็บ (แทนที่แถบที่สร้างอัตโนมัติเดิม ${existing} ปุ่ม ปุ่มอื่นยังอยู่)?`
      : `สร้างแถบสลับแท็บด้านบนให้ทั้ง ${tabs.length} แท็บ และผูก richmenuswitch ข้ามกันอัตโนมัติ?`;
    if (!confirm(msg)) return;

    try {
      const warnings = onAutoLink();
      setResult(
        warnings.length
          ? { kind: 'warn', messages: warnings }
          : { kind: 'ok', messages: ['ผูกแท็บเรียบร้อย พร้อม Deploy ทั้งชุด'] }
      );
    } catch (err) {
      setResult({ kind: 'error', messages: [err instanceof Error ? err.message : String(err)] });
    }
  };

  return (
    <div className="mt-4 p-3.5 rounded-lg border border-[#fcd9b6] bg-[#fff8f1] space-y-3 text-xs">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="space-y-0.5">
          <span className="font-bold text-[#1c2620] flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-orange-600" aria-hidden="true" />
            1-Click Multi-Tab Auto Linker
          </span>
          <p className="text-[11px] text-[#5e6f64]">
            สร้างแถบสลับแท็บด้านบนของทุกเมนู (สูง {tabBarHeight({ width: 2500, height: 1686 })}px บนขนาดเต็ม / {tabBarHeight({ width: 2500, height: 843 })}px บนครึ่งจอ) แล้วผูก <code className="font-mono">richmenuswitch</code> ข้ามกันให้อัตโนมัติ
          </p>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={blockers.length > 0}
          className="shrink-0 inline-flex items-center gap-1.5 rounded-md bg-orange-500 px-3 py-1.5 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 focus-visible:ring-offset-1"
        >
          <Link2 className="w-3.5 h-3.5" aria-hidden="true" />
          {isLinked ? 'Re-Link Tab Switch Areas' : 'Auto-Link Tab Switch Areas'}
        </button>
      </div>

      {blockers.length > 0 && (
        <ul className="text-[11px] text-amber-800 space-y-0.5">
          {blockers.map((b) => (
            <li key={b} className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" aria-hidden="true" /> {b}
            </li>
          ))}
        </ul>
      )}

      {/* Link map */}
      {tabs.length > 1 && (
        <ul className="grid gap-1 sm:grid-cols-2" aria-label="แผนผังการสลับแท็บ">
          {tabs.map((tab) => {
            const targets = tab.areas
              .filter((a) => a.action.type === 'richmenuswitch' && a.action.richMenuAliasId !== tab.aliasId)
              .map((a) => a.action.richMenuAliasId)
              .filter((alias, i, arr): alias is string => !!alias && arr.indexOf(alias) === i);
            return (
              <li key={tab.id} className="flex items-center gap-1.5 font-mono text-[11px] text-[#34483b] bg-white/70 border border-[#f3e2cf] rounded px-2 py-1">
                <span className="font-semibold">{tab.aliasId}</span>
                <ArrowRight className="w-3 h-3 text-orange-500" aria-hidden="true" />
                {targets.length ? targets.join(', ') : <span className="text-[#8a978f]">ยังไม่มีปุ่มสลับ</span>}
              </li>
            );
          })}
        </ul>
      )}

      <div aria-live="polite">
        {result && (
          <ul
            className={cn(
              'rounded-md border p-2 text-[11px] space-y-0.5',
              result.kind === 'ok' && 'border-[#b8dec4] bg-[#eaf5ee] text-[#147a42]',
              result.kind === 'warn' && 'border-amber-200 bg-amber-50 text-amber-800',
              result.kind === 'error' && 'border-red-200 bg-red-50 text-red-700'
            )}
          >
            {result.messages.map((m) => (
              <li key={m} className="flex items-start gap-1">
                {result.kind === 'ok' ? (
                  <CheckCircle2 className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                ) : (
                  <AlertTriangle className="w-3 h-3 mt-0.5 shrink-0" aria-hidden="true" />
                )}
                {m}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
