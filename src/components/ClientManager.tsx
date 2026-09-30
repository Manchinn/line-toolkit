'use client';

import React, { useState } from 'react';
import { ClientProfile } from '@/types/line';
import { cn } from '@/lib/utils';
import { Building2, Plus, Trash2, CheckCircle2, X, LayoutGrid } from 'lucide-react';

interface ClientManagerProps {
  clients: ClientProfile[];
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  onAddClient: (client: ClientProfile) => void;
  onDeleteClient: (id: string) => void;
  onOpenRemoteManager?: () => void;
}

export default function ClientManager({
  clients,
  selectedClientId,
  onSelectClient,
  onAddClient,
  onDeleteClient,
  onOpenRemoteManager,
}: ClientManagerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [name, setName] = useState('');
  const [channelId, setChannelId] = useState('');
  const [token, setToken] = useState('');
  const [notes, setNotes] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId) || null;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !token.trim()) return;

    const newClient: ClientProfile = {
      id: `client_${Date.now()}`,
      name: name.trim(),
      channelId: channelId.trim(),
      channelAccessToken: token.trim(),
      notes: notes.trim() || undefined,
    };
    onAddClient(newClient);
    setName('');
    setChannelId('');
    setToken('');
    setNotes('');
    setIsOpen(false);
  };

  return (
    <div className="bg-white border border-[#dce2de] rounded-xl p-3.5 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="w-3.5 h-3.5 text-[#56665b]" />
          <span className="text-xs font-semibold text-[#314237] uppercase tracking-wider">
            บัญชี LINE Official Account
          </span>
        </div>
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-expanded={isOpen}
          className={cn(
            'text-[11px] font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1 cursor-pointer',
            isOpen
              ? 'bg-[#e5ebe6] text-[#314237] hover:bg-[#dce8de]'
              : 'text-[#14713d] hover:text-[#136638] hover:bg-[#edf7ef]'
          )}
        >
          {isOpen ? (
            <>
              <X className="w-3 h-3" aria-hidden="true" />
              ปิดฟอร์ม
            </>
          ) : (
            <>
              <Plus className="w-3 h-3" aria-hidden="true" />
              เพิ่มบัญชี
            </>
          )}
        </button>
      </div>

      {/* Select Client Dropdown */}
      <div className="flex items-center gap-2">
        <select
          id="client-select"
          value={selectedClientId || ''}
          onChange={(e) => onSelectClient(e.target.value || null)}
          aria-label="เลือกบัญชี LINE OA"
          className="flex-1 bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] cursor-pointer font-medium"
        >
          <option value="">-- เลือกลูกค้า / บัญชี LINE OA --</option>
          {clients.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} {c.channelId ? `(${c.channelId})` : ''}
            </option>
          ))}
        </select>
        {selectedClient && (
          <button
            type="button"
            title={`ลบบัญชี ${selectedClient.name}`}
            aria-label={`ลบบัญชี ${selectedClient.name}`}
            onClick={() => {
              if (confirm(`ยืนยันการลบบัญชี “${selectedClient.name}” ออกจากรายการในเบราว์เซอร์นี้?`)) {
                onDeleteClient(selectedClient.id);
              }
            }}
            className="p-1.5 rounded-lg border border-[#dce2de] text-[#56665b] hover:text-red-500 hover:border-red-300 hover:bg-red-50 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {selectedClient && (
        <div className="pt-2 border-t border-[#dce2de] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <p className="text-xs text-[#56665b]">
            เลือกบัญชี <strong className="text-[#1c2620]">{selectedClient.name}</strong> · ข้อมูลโปรไฟล์เก็บในเบราว์เซอร์นี้
          </p>
          {onOpenRemoteManager && (
            <button
              type="button"
              onClick={onOpenRemoteManager}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#147a42] bg-[#edf7ef] hover:bg-[#dff0e3] border border-[#b8dec4] transition-colors cursor-pointer shrink-0"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>จัดการเมนูบน LINE</span>
            </button>
          )}
        </div>
      )}

      {/* Add Client Form */}
      {isOpen && (
        <form onSubmit={handleCreate} className="pt-3 border-t border-[#dce2de] space-y-2.5">
          <div>
            <label htmlFor="client-name" className="text-xs font-medium text-[#56665b] uppercase tracking-wider block mb-1">
              ชื่อบัญชี / องค์กร *
            </label>
            <input
              id="client-name"
              name="clientName"
              type="text"
              required
              autoComplete="organization"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="เช่น Cafe Amazon สาขา 1"
              className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] placeholder:text-[#6d7c72]"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label htmlFor="client-channel-id" className="text-xs font-medium text-[#56665b] uppercase tracking-wider block mb-1">
                Channel ID
              </label>
              <input
                id="client-channel-id"
                name="channelId"
                type="text"
                autoComplete="off"
                spellCheck={false}
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                placeholder="2001234567"
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] font-mono placeholder:text-[#6d7c72]"
              />
            </div>
            <div>
              <label htmlFor="client-notes" className="text-xs font-medium text-[#56665b] uppercase tracking-wider block mb-1">
                บันทึกย่อ (Notes)
              </label>
              <input
                id="client-notes"
                name="notes"
                type="text"
                autoComplete="off"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="โน้ตสั้นๆ"
                className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] placeholder:text-[#6d7c72]"
              />
            </div>
          </div>
          <div>
            <label htmlFor="client-token" className="text-xs font-medium text-[#56665b] uppercase tracking-wider block mb-1">
              Channel Access Token (Long-Lived) *
            </label>
            <textarea
              id="client-token"
              name="channelAccessToken"
              required
              rows={2}
              autoComplete="off"
              spellCheck={false}
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="คัดลอกจาก LINE Developers Console > Messaging API"
              className="w-full bg-[#f7f8f7] border border-[#dce2de] rounded-lg px-2.5 py-1.5 text-xs text-[#26362d] font-mono focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42] placeholder:text-[#6d7c72] leading-relaxed"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-[#147a42] hover:bg-[#116736] text-white font-medium py-1.5 rounded-lg text-xs transition-colors shadow cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
            บันทึกโปรไฟล์ในเบราว์เซอร์
          </button>
        </form>
      )}
    </div>
  );
}
