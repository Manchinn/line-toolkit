'use client';

import React, { useEffect, useRef, useState } from 'react';
import type { RichMenuArea, RichMenuTab } from '@/types/line';
import { cn } from '@/lib/utils';
import { isBrowserOpenableUri } from '@/lib/richmenu/actions';
import { isAutoLinkArea } from '@/lib/richmenu/autolink';
import { ChevronDown, ChevronUp, ExternalLink, Keyboard, RotateCcw, X, ChevronLeft, Menu } from 'lucide-react';

interface DeviceSimulatorProps {
  tabs: RichMenuTab[];
  /** Show tap-area outlines on top of the menu image. */
  showAreas?: boolean;
}

type ChatItem =
  | { id: number; kind: 'user'; text: string }
  | { id: number; kind: 'system'; text: string };

type Notice =
  | { kind: 'uri'; uri: string; openable: boolean }
  | { kind: 'info'; text: string };

const MAX_CHAT_ITEMS = 30;

function defaultTabId(tabs: RichMenuTab[]) {
  return (tabs.find((t) => t.selected) ?? tabs[0])?.id ?? '';
}

export default function DeviceSimulator({ tabs, showAreas: initialShowAreas = true }: DeviceSimulatorProps) {
  const [currentTabId, setCurrentTabId] = useState(() => defaultTabId(tabs));
  const [menuOpen, setMenuOpen] = useState(true);
  const [showAreas, setShowAreas] = useState(initialShowAreas);
  const [chat, setChat] = useState<ChatItem[]>([]);
  const [notice, setNotice] = useState<Notice | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(1);

  // Fall back to the default tab if the current one was deleted in the builder.
  const tab = tabs.find((t) => t.id === currentTabId) ?? tabs.find((t) => t.id === defaultTabId(tabs));

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ block: 'end' });
  }, [chat]);

  const push = (kind: ChatItem['kind'], text: string) => {
    const id = nextId.current++;
    setChat((prev) => [...prev, { id, kind, text }].slice(-MAX_CHAT_ITEMS));
  };

  const handleTap = (area: RichMenuArea) => {
    const { action } = area;
    switch (action.type) {
      case 'richmenuswitch': {
        const target = tabs.find((t) => t.aliasId === action.richMenuAliasId);
        if (target) {
          setCurrentTabId(target.id);
          setNotice(null);
        } else {
          setNotice({ kind: 'info', text: `ไม่พบแท็บที่มี Alias “${action.richMenuAliasId || '-'}”` });
        }
        break;
      }
      case 'message':
        if (action.text) push('user', action.text);
        else setNotice({ kind: 'info', text: 'ปุ่มนี้ยังไม่ได้ใส่ข้อความ' });
        break;
      case 'uri':
        setNotice({ kind: 'uri', uri: action.uri ?? '', openable: isBrowserOpenableUri(action.uri ?? '') });
        break;
      case 'postback':
        if (action.displayText) push('user', action.displayText);
        push('system', `postback → webhook  data=${action.data || '-'}`);
        break;
      default:
        setNotice({ kind: 'info', text: `“${area.label}” ยังไม่ได้กำหนด Action` });
    }
  };

  const reset = () => {
    setCurrentTabId(defaultTabId(tabs));
    setChat([]);
    setNotice(null);
    setMenuOpen(true);
  };

  if (!tab) return null;

  return (
    <div className="flex flex-col items-center gap-3">
      {/* Phone frame */}
      <div className="relative w-[300px] rounded-[2.5rem] border-[10px] border-[#101512] bg-[#101512] shadow-2xl">
        <div className="absolute left-1/2 top-1.5 z-20 h-4 w-20 -translate-x-1/2 rounded-full bg-black" aria-hidden="true" />
        <div className="relative flex h-[580px] flex-col overflow-hidden rounded-[1.9rem] bg-[#8ca3c4]">
          {/* LINE header */}
          <div className="flex items-center gap-2 bg-[#2b3a55] px-3 pb-2 pt-7 text-white">
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
            <span className="flex-1 truncate text-xs font-semibold">LINE Official Account</span>
            <Menu className="h-4 w-4 opacity-80" aria-hidden="true" />
          </div>

          {/* Chat area */}
          <div className="flex-1 space-y-2 overflow-y-auto px-3 py-3 text-[11px]" aria-live="polite" aria-label="ห้องแชทจำลอง">
            <div className="flex items-end gap-1.5">
              <span className="h-6 w-6 shrink-0 rounded-full bg-[#06C755]" aria-hidden="true" />
              <p className="max-w-[75%] rounded-2xl rounded-bl-sm bg-white px-2.5 py-1.5 text-[#111]">
                สวัสดีครับ ลองกดปุ่มบน Rich Menu ด้านล่างได้เลย
              </p>
            </div>
            {chat.map((item) =>
              item.kind === 'user' ? (
                <div key={item.id} className="flex justify-end">
                  <p className="max-w-[75%] whitespace-pre-wrap break-words rounded-2xl rounded-br-sm bg-[#06C755] px-2.5 py-1.5 text-white shadow-sm">
                    {item.text}
                  </p>
                </div>
              ) : (
                <div key={item.id} className="flex justify-center">
                  <span className="max-w-[90%] truncate rounded-full bg-black/25 px-2 py-0.5 font-mono text-[10px] text-white">
                    {item.text}
                  </span>
                </div>
              )
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Notice / URI tooltip */}
          {notice && (
            <div role="status" className="absolute inset-x-3 top-16 z-10 rounded-xl bg-[#18241d]/95 p-2.5 text-[11px] text-white shadow-lg">
              <div className="flex items-start gap-2">
                <div className="min-w-0 flex-1 space-y-1">
                  {notice.kind === 'uri' ? (
                    <>
                      <span className="block text-[10px] uppercase tracking-wider text-sky-300">เปิดลิงก์ (uri)</span>
                      <span className="block break-all font-mono">{notice.uri || '(ว่าง)'}</span>
                      {notice.openable ? (
                        <a
                          href={notice.uri}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-sky-300 underline hover:text-sky-200"
                        >
                          <ExternalLink className="h-3 w-3" aria-hidden="true" /> เปิดในแท็บใหม่
                        </a>
                      ) : (
                        <span className="block text-[10px] text-amber-300">ลิงก์แบบนี้เปิดได้เฉพาะในแอป LINE</span>
                      )}
                    </>
                  ) : (
                    <span>{notice.text}</span>
                  )}
                </div>
                <button type="button" onClick={() => setNotice(null)} aria-label="ปิด" className="rounded p-0.5 hover:bg-white/10 focus:outline-none focus-visible:ring-1 focus-visible:ring-white">
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </div>
            </div>
          )}

          {/* Rich menu */}
          {menuOpen && (
            <div
              className="relative w-full shrink-0 bg-[#e9ecea]"
              style={{ aspectRatio: `${tab.size.width} / ${tab.size.height}` }}
            >
              {tab.imagePreviewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- local data URL preview
                <img src={tab.imagePreviewUrl} alt={`Rich menu: ${tab.title}`} className="h-full w-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-[#6d7c72]">
                  ยังไม่มีภาพของ “{tab.title}”
                </div>
              )}
              {tab.areas.map((area) => (
                <button
                  key={area.id}
                  type="button"
                  onClick={() => handleTap(area)}
                  aria-label={`${area.label} (${area.action.type})`}
                  style={{
                    left: `${(area.bounds.x / tab.size.width) * 100}%`,
                    top: `${(area.bounds.y / tab.size.height) * 100}%`,
                    width: `${(area.bounds.width / tab.size.width) * 100}%`,
                    height: `${(area.bounds.height / tab.size.height) * 100}%`,
                  }}
                  className={cn(
                    'absolute transition-colors active:bg-black/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white',
                    // the auto-linked tab bar stays tappable even when a user area overlaps it
                    isAutoLinkArea(area) && 'z-10',
                    showAreas ? 'border border-dashed border-white/80 bg-white/5 hover:bg-white/20' : 'hover:bg-black/10'
                  )}
                >
                  {showAreas && !tab.imagePreviewUrl && (
                    <span className="block truncate px-0.5 text-[8px] text-[#34483b]">{area.label}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Chat bar */}
          <div className="flex h-11 shrink-0 items-center border-t border-[#d5dbd7] bg-white text-[#34483b]">
            <span className="flex h-full w-11 items-center justify-center border-r border-[#e3e8e5]" aria-hidden="true">
              <Keyboard className="h-4 w-4" />
            </span>
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              aria-expanded={menuOpen}
              className="flex h-full flex-1 items-center justify-center gap-1 text-[11px] font-semibold hover:bg-[#f4f6f5] focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#06C755]"
            >
              <span className="truncate">{tab.chatBarText || 'เมนู'}</span>
              {menuOpen ? <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" /> : <ChevronUp className="h-3.5 w-3.5" aria-hidden="true" />}
            </button>
          </div>
        </div>
      </div>

      {/* Simulator controls */}
      <div className="flex items-center gap-3 text-[11px] text-[#5e6f64]">
        <span className="font-mono">
          แท็บ: <strong className="text-[#1c2620]">{tab.aliasId}</strong>
        </span>
        <label className="flex items-center gap-1 cursor-pointer">
          <input type="checkbox" checked={showAreas} onChange={(e) => setShowAreas(e.target.checked)} className="accent-[#147a42]" />
          แสดงขอบปุ่ม
        </label>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1 text-[#147a42] hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42] rounded"
        >
          <RotateCcw className="h-3 w-3" aria-hidden="true" /> รีเซ็ต
        </button>
      </div>
    </div>
  );
}
