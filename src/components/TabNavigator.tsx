'use client';

import React from 'react';
import { RichMenuTab, RichMenuArea } from '@/types/line';
import { cn } from '@/lib/utils';
import {
  Layers,
  Plus,
  Trash2,
  Check,
  Link,
  MessageSquare,
  ArrowLeftRight,
  Send,
  Sliders,
} from 'lucide-react';

interface TabNavigatorProps {
  tabs: RichMenuTab[];
  activeTabId: string;
  selectedAreaId: string | null;
  onSelectTab: (id: string) => void;
  onAddTab: () => void;
  onDeleteTab: (id: string) => void;
  onSetDefaultTab: (id: string) => void;
  onUpdateTab: (id: string, partial: Partial<RichMenuTab>) => void;
  onSelectArea: (id: string | null) => void;
  onDeleteArea: (id: string) => void;
}

export default function TabNavigator({
  tabs,
  activeTabId,
  selectedAreaId,
  onSelectTab,
  onAddTab,
  onDeleteTab,
  onSetDefaultTab,
  onUpdateTab,
  onSelectArea,
  onDeleteArea,
}: TabNavigatorProps) {
  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0];

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'uri':
        return <Link className="w-3 h-3 text-[#14713d]" />;
      case 'message':
        return <MessageSquare className="w-3 h-3 text-[#166594]" />;
      case 'richmenuswitch':
        return <ArrowLeftRight className="w-3 h-3 text-[#754794]" />;
      default:
        return <Send className="w-3 h-3 text-[#94631a]" />;
    }
  };

  const getActionSummary = (area: RichMenuArea) => {
    switch (area.action.type) {
      case 'uri':
        return area.action.uri || 'ไม่มี URI';
      case 'message':
        return `"${area.action.text || ''}"`;
      case 'richmenuswitch':
        return `Switch -> ${area.action.richMenuAliasId || 'N/A'}`;
      default:
        return 'Postback Action';
    }
  };

  return (
    <div className="space-y-3.5">
      {/* Tab Suite Card */}
      <div className="bg-white border border-[#dce2de] rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-3.5 h-3.5 text-[#56665b]" />
            <span className="text-[11px] font-semibold text-[#314237] uppercase tracking-wider">
              ชุดแท็บเมนู ({tabs.length} แท็บ)
            </span>
          </div>
          <button
            type="button"
            onClick={onAddTab}
            className="text-[11px] font-medium text-[#14713d] hover:text-[#136638] bg-[#edf7ef] hover:bg-[#e4f3e7] px-2 py-0.5 rounded border border-[#badbc4] transition-all flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            เพิ่มแท็บ
          </button>
        </div>

        {/* Tab List */}
        <div className="space-y-1.5" role="list">
          {tabs.map((tab) => {
            const isActive = tab.id === activeTabId;
            return (
              <div
                key={tab.id}
                role="listitem"
                className={cn(
                  'group p-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors select-none gap-1.5',
                  isActive
                    ? 'border-[#69ab80] bg-[#eef7f0] text-[#173723]'
                    : 'border-[#dce2de] bg-[#f7f8f7] text-[#56665b] hover:border-[#cdd8d0] hover:text-[#26362d]'
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectTab(tab.id)}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] cursor-pointer"
                >
                  <span
                    className={cn(
                      'w-1.5 h-1.5 rounded-full shrink-0',
                      isActive ? 'bg-emerald-500' : 'bg-zinc-400'
                    )}
                    aria-hidden="true"
                  />
                  <div className="truncate">
                    <span className="font-medium">{tab.title}</span>
                    <span className="ml-1.5 font-mono text-[10px] text-[#617166]">({tab.aliasId})</span>
                  </div>
                </button>

                <div className="flex items-center gap-1 shrink-0">
                  {tab.selected ? (
                    <span
                      aria-label="แท็บเริ่มต้น (Default Tab)"
                      className="text-[10px] font-mono bg-[#e6f3e9] text-[#17613a] border border-[#badbc4] px-1.5 py-0.5 rounded flex items-center gap-1"
                    >
                      <Check className="w-2.5 h-2.5" aria-hidden="true" />
                      Default
                    </span>
                  ) : (
                    <button
                      type="button"
                      title="ตั้งเป็นแท็บเริ่มต้นที่แสดงเมื่อเปิดห้องแชท"
                      aria-label={`ตั้งแท็บ ${tab.title} เป็นแท็บเริ่มต้น`}
                      onClick={() => onSetDefaultTab(tab.id)}
                      className="text-[10px] text-[#56665b] hover:text-[#136638] hover:bg-[#ebf0ec] px-1.5 py-0.5 rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-[#147a42]"
                    >
                      Set Default
                    </button>
                  )}

                  {tabs.length > 1 && (
                    <button
                      type="button"
                      title={`ลบแท็บ ${tab.title}`}
                      aria-label={`ลบแท็บ ${tab.title}`}
                      onClick={() => {
                        if (confirm(`ยืนยันการลบแท็บ “${tab.title}”?`)) {
                          onDeleteTab(tab.id);
                        }
                      }}
                      className="text-[#617166] hover:text-red-500 p-1 hover:bg-[#ebf0ec] rounded transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                    >
                      <Trash2 className="w-3 h-3" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab Config Drawer */}
        {activeTab && (
          <div className="pt-2.5 border-t border-[#dce2de] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-[#56665b] uppercase tracking-wider flex items-center gap-1">
                <Sliders className="w-3 h-3" aria-hidden="true" />
                การตั้งค่าแท็บปัจจุบัน
              </span>
              <span className="text-[10px] font-mono text-[#617166]">{activeTab.aliasId}</span>
            </div>

            <div>
              <label htmlFor="tab-title-input" className="text-[10px] text-[#56665b] block mb-0.5">ชื่อแท็บ (Title)</label>
              <input
                id="tab-title-input"
                name="tabTitle"
                type="text"
                value={activeTab.title}
                onChange={(e) => onUpdateTab(activeTab.id, { title: e.target.value })}
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2.5 py-1 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="tab-alias-input" className="text-[10px] text-[#56665b] block mb-0.5">Alias ID (สำหรับสลับ)</label>
                <input
                  id="tab-alias-input"
                  name="tabAliasId"
                  type="text"
                  value={activeTab.aliasId}
                  onChange={(e) => onUpdateTab(activeTab.id, { aliasId: e.target.value })}
                  className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2.5 py-1 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
                />
              </div>
              <div>
                <label htmlFor="tab-chatbar-input" className="text-[10px] text-[#56665b] block mb-0.5">ข้อความ Chat Bar</label>
                <input
                  id="tab-chatbar-input"
                  name="tabChatBarText"
                  type="text"
                  value={activeTab.chatBarText}
                  onChange={(e) => onUpdateTab(activeTab.id, { chatBarText: e.target.value })}
                  className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2.5 py-1 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="tab-size-select" className="text-[10px] text-[#56665b] block mb-0.5">สัดส่วนเมนู LINE (Resolution)</label>
              <select
                id="tab-size-select"
                name="tabResolution"
                value={activeTab.size.height}
                onChange={(e) =>
                  onUpdateTab(activeTab.id, {
                    size: { width: 2500, height: Number(e.target.value) },
                  })
                }
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-md px-2 py-1 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] cursor-pointer"
              >
                <option value={1686}>เต็มจอ (2500 × 1686 px)</option>
                <option value={843}>ครึ่งจอ / กะทัดรัด (2500 × 843 px)</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* Action Layers Tree Card */}
      <div className="bg-white border border-[#dce2de] rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-semibold text-[#314237] uppercase tracking-wider">
              เลเยอร์ปุ่มในแท็บนี้ ({activeTab.areas.length})
            </span>
          </div>
          <span className="text-[10px] text-[#617166] font-mono">
            {activeTab.size.width}×{activeTab.size.height}
          </span>
        </div>

        {activeTab.areas.length === 0 ? (
          <div className="p-3 bg-[#f7f8f7] border border-dashed border-[#dce2de] rounded-lg text-center text-[#617166] text-xs">
            ยังไม่มีปุ่ม — ลากเมาส์บนผืนผ้าใบเพื่อสร้างปุ่ม
          </div>
        ) : (
          <div className="space-y-1.5 max-h-[260px] overflow-y-auto pr-1" role="list">
            {activeTab.areas.map((area, idx) => {
              const isSelected = area.id === selectedAreaId;
              return (
                <div
                  key={area.id}
                  role="listitem"
                  className={cn(
                    'group p-1.5 rounded-lg border text-xs flex items-center justify-between transition-colors select-none gap-1.5',
                    isSelected
                      ? 'border-[#69ab80] bg-[#eef7f0] text-[#173723]'
                      : 'border-[#dce2de] bg-[#f7f8f7] text-[#56665b] hover:border-[#cdd8d0] hover:text-[#26362d]'
                  )}
                >
                  <button
                    type="button"
                    onClick={() => onSelectArea(area.id)}
                    className="flex items-center gap-2 min-w-0 flex-1 text-left p-1 rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] cursor-pointer"
                  >
                    <span className="shrink-0" aria-hidden="true">{getActionIcon(area.action.type)}</span>
                    <div className="truncate">
                      <span className="font-mono text-[11px] font-semibold text-[#314237] mr-1.5">
                        #{idx + 1}
                      </span>
                      <span className="font-medium text-[#26362d]">{area.label}</span>
                      <span className="block text-[10px] text-[#617166] truncate font-mono">
                        {getActionSummary(area)}
                      </span>
                    </div>
                  </button>

                  <button
                    type="button"
                    title={`ลบปุ่ม ${area.label}`}
                    aria-label={`ลบปุ่ม ${area.label}`}
                    onClick={() => onDeleteArea(area.id)}
                    className="text-[#617166] hover:text-red-500 p-1 hover:bg-[#ebf0ec] rounded transition-colors shrink-0 focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500"
                  >
                    <Trash2 className="w-3 h-3" aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}