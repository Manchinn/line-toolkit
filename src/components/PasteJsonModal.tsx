'use client';

import React, { useState, useEffect } from 'react';
import { X, ClipboardPaste, AlertCircle, FileCode, Trash2, CheckCircle2 } from 'lucide-react';

interface PasteJsonModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (json: unknown) => { success: boolean; error?: string };
}

const SAMPLE_JSON = `{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": true,
  "name": "Main Menu Example",
  "chatBarText": "เปิดเมนู",
  "areas": [
    {
      "bounds": { "x": 0, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "message", "text": "ดูคอร์สเรียนทั้งหมด" }
    },
    {
      "bounds": { "x": 833, "y": 0, "width": 834, "height": 843 },
      "action": { "type": "message", "text": "สมัครเรียนตัวต่อตัว" }
    },
    {
      "bounds": { "x": 1667, "y": 0, "width": 833, "height": 843 },
      "action": { "type": "uri", "uri": "https://line.me" }
    },
    {
      "bounds": { "x": 0, "y": 843, "width": 833, "height": 843 },
      "action": { "type": "message", "text": "โปรโมชั่นประจำเดือน" }
    },
    {
      "bounds": { "x": 833, "y": 843, "width": 834, "height": 843 },
      "action": { "type": "message", "text": "ตารางเรียน" }
    },
    {
      "bounds": { "x": 1667, "y": 843, "width": 833, "height": 843 },
      "action": { "type": "message", "text": "ติดต่อแอดมิน" }
    }
  ]
}`;

export default function PasteJsonModal({ isOpen, onClose, onImport }: PasteJsonModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleConfirm = () => {
    const trimmed = jsonText.trim();
    if (!trimmed) {
      setErrorMessage('กรุณาวางข้อความ JSON ก่อนกดยืนยัน');
      return;
    }

    try {
      const parsed = JSON.parse(trimmed);
      const result = onImport(parsed);
      if (result.success) {
        onClose();
      } else {
        setErrorMessage(result.error || 'โครงสร้าง JSON ไม่ตรงกับรูปแบบ LINE Rich Menu');
      }
    } catch (err: unknown) {
      const detail = err instanceof Error ? err.message : 'รูปแบบ JSON ผิดพลาด';
      setErrorMessage(`ไวยากรณ์ JSON ไม่ถูกต้อง (Syntax Error): ${detail}`);
    }
  };

  const handleKeyDownTextarea = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Ctrl+Enter or Cmd+Enter to confirm
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      handleConfirm();
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="paste-json-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="bg-[#fcfdfc] border border-[#dce2de] rounded-2xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#dce2de] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#edf7ef] border border-[#b8dec4] flex items-center justify-center text-[#147a42]">
              <ClipboardPaste className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="paste-json-title" className="text-base font-bold text-[#1c2620]">
                วางข้อความ JSON (Paste JSON)
              </h2>
              <p className="text-xs text-[#5e6f64]">
                นำเข้าข้อมูล Rich Menu หรือพื้นที่ปุ่มสัมผัส (Tap Areas) จากข้อความ JSON
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="ปิดหน้าต่าง"
            className="p-1.5 rounded-lg border border-[#dce2de] text-[#5e6f64] hover:text-[#1c2620] hover:bg-[#f2f5f3] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-4 overflow-y-auto flex-1">
          <div className="flex items-center justify-between">
            <label htmlFor="paste-json-textarea" className="text-xs font-semibold text-[#1c2620]">
              โค้ด JSON ของ LINE Rich Menu
            </label>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setJsonText(SAMPLE_JSON);
                  setErrorMessage(null);
                }}
                className="text-[11px] text-[#147a42] hover:underline flex items-center gap-1 font-medium"
              >
                <FileCode className="w-3 h-3" />
                โหลดตัวอย่าง JSON
              </button>
              {jsonText && (
                <button
                  type="button"
                  onClick={() => {
                    setJsonText('');
                    setErrorMessage(null);
                  }}
                  className="text-[11px] text-[#8a978f] hover:text-red-600 flex items-center gap-1 font-medium"
                >
                  <Trash2 className="w-3 h-3" />
                  ล้างข้อความ
                </button>
              )}
            </div>
          </div>

          <textarea
            id="paste-json-textarea"
            autoFocus
            rows={12}
            value={jsonText}
            onChange={(e) => {
              setJsonText(e.target.value);
              if (errorMessage) setErrorMessage(null);
            }}
            onKeyDown={handleKeyDownTextarea}
            placeholder={`วางข้อความ JSON ที่นี่ เช่น:\n{\n  "size": { "width": 2500, "height": 1686 },\n  "areas": [\n    {\n      "bounds": { "x": 0, "y": 0, "width": 1250, "height": 1686 },\n      "action": { "type": "message", "text": "สวัสดี" }\n    }\n  ]\n}`}
            className="w-full rounded-xl border border-[#cdd8d0] bg-white p-3 font-mono text-xs text-[#1c2620] placeholder:text-[#9bb0a4] focus:border-[#147a42] focus:outline-none focus:ring-1 focus:ring-[#147a42] transition shadow-xs resize-y"
            spellCheck={false}
          />

          {errorMessage && (
            <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" aria-hidden="true" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <div className="text-[11px] text-[#6b7d72] bg-[#f4f7f5] rounded-lg p-2.5 space-y-1">
            <p className="font-semibold text-[#2c3d33]">💡 คำแนะนำ:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li>รองรับทั้ง JSON เต็มรูปแบบของ LINE (มี size, areas, name) หรือเฉพาะรายการ areas</li>
              <li>หากมีข้อมูล <code className="font-mono bg-white px-1 py-0.5 rounded border border-[#dfe5e1]">size</code> ระบบจะปรับขนาดผืนผ้าใบให้อัตโนมัติ</li>
              <li>กด <kbd className="px-1.5 py-0.5 bg-white border border-[#cdd8d0] rounded text-[10px] font-mono">Ctrl</kbd> + <kbd className="px-1.5 py-0.5 bg-white border border-[#cdd8d0] rounded text-[10px] font-mono">Enter</kbd> เพื่อยืนยันนำเข้าข้อมูลทันที</li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-[#dce2de] bg-[#f8faf8] flex items-center justify-between shrink-0">
          <span className="text-[11px] text-[#7d8f83]">
            {jsonText.length > 0 ? `${jsonText.length.toLocaleString()} ตัวอักษร` : 'ยังไม่ได้วางข้อความ'}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-[#5e6f64] hover:text-[#1c2620] hover:bg-[#ebf0ec] rounded-lg transition"
            >
              ยกเลิก
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!jsonText.trim()}
              className="btn-emerald-solid text-xs py-2 px-4 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              ยืนยันนำเข้าข้อมูล
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
