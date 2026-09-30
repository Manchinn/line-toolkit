'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef, useDeferredValue } from 'react';
import { ClientProfile, LineRemoteRichMenu, LineRemoteAlias } from '@/types/line';
import {
  RefreshCw,
  Trash2,
  Star,
  Link as LinkIcon,
  AlertTriangle,
  Code2,
  Check,
  X,
  ImageIcon,
  Loader2,
  Copy,
  LayoutGrid,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface RemoteRichMenuManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  client: ClientProfile | null;
  onNotify?: (message: string, isError?: boolean) => void;
}

export default function RemoteRichMenuManagerModal({
  isOpen,
  onClose,
  client,
  onNotify,
}: RemoteRichMenuManagerModalProps) {
  const token = client?.channelAccessToken?.trim();

  const [loading, setLoading] = useState(Boolean(token));
  const [error, setError] = useState<string | null>(null);
  const [menus, setMenus] = useState<LineRemoteRichMenu[]>([]);
  const [aliases, setAliases] = useState<LineRemoteAlias[]>([]);
  const [defaultMenuId, setDefaultMenuId] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);

  // Filter & Search
  const [searchQuery, setSearchQuery] = useState('');
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const [filterType, setFilterType] = useState<'all' | 'default' | 'aliased' | 'orphan'>('all');

  // JSON Preview modal
  const [previewJsonMenu, setPreviewJsonMenu] = useState<LineRemoteRichMenu | null>(null);
  const [copiedJson, setCopiedJson] = useState(false);

  // Operational states
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [settingDefaultId, setSettingDefaultId] = useState<string | null>(null);
  const [bulkCleaning, setBulkCleaning] = useState(false);
  const [bulkProgress, setBulkProgress] = useState<{ current: number; total: number } | null>(null);
  const cancelBulkRef = useRef(false);

  // Image cache (Blob Object URLs)
  const [imageMap, setImageMap] = useState<Record<string, string>>({});
  const [imageLoadingMap, setImageLoadingMap] = useState<Record<string, boolean>>({});
  const activeBlobUrlsRef = useRef<Set<string>>(new Set());

  // Global busy flag to prevent concurrent conflicting actions
  const isBusy = Boolean(settingDefaultId) || Boolean(deletingId) || bulkCleaning;

  // Clean up blob URLs when component unmounts
  useEffect(() => {
    const urls = activeBlobUrlsRef.current;
    return () => {
      urls.forEach((url) => URL.revokeObjectURL(url));
      urls.clear();
    };
  }, []);

  // Keyboard navigation (Escape key to dismiss)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewJsonMenu) {
          setPreviewJsonMenu(null);
        } else if (!bulkCleaning) {
          onClose();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewJsonMenu, bulkCleaning, onClose]);

  // Fetch full list from /api/richmenu/list using Promise chain to avoid synchronous setState in effect
  useEffect(() => {
    let ignore = false;
    if (!token) return;

    const controller = new AbortController();

    fetch('/api/richmenu/list', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || `HTTP error ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        if (!ignore) {
          setMenus(data.menus || []);
          setAliases(data.aliases || []);
          setDefaultMenuId(data.defaultMenuId || null);
          setError(null);
          setLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!ignore && !controller.signal.aborted) {
          const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการดึงข้อมูลจาก LINE';
          setError(msg);
          setLoading(false);
          if (onNotify) onNotify(msg, true);
        }
      });

    return () => {
      ignore = true;
      controller.abort();
    };
  }, [token, refreshCount, onNotify]);

  // Manual refresh trigger
  const handleManualRefresh = useCallback(() => {
    if (isBusy) return;
    setLoading(true);
    setError(null);
    setRefreshCount((c) => c + 1);
  }, [isBusy]);

  // Lazy load image thumbnail securely via /api/richmenu/image
  const loadImageThumbnail = useCallback(
    async (richMenuId: string) => {
      if (!token || imageMap[richMenuId] || imageLoadingMap[richMenuId]) return;

      setImageLoadingMap((prev) => ({ ...prev, [richMenuId]: true }));
      try {
        const res = await fetch(`/api/richmenu/image?richMenuId=${encodeURIComponent(richMenuId)}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (res.ok) {
          const blob = await res.blob();
          const objectUrl = URL.createObjectURL(blob);
          activeBlobUrlsRef.current.add(objectUrl);
          setImageMap((prev) => ({ ...prev, [richMenuId]: objectUrl }));
        }
      } catch {
        // Silently handle image thumbnail failure
      } finally {
        setImageLoadingMap((prev) => ({ ...prev, [richMenuId]: false }));
      }
    },
    [token, imageMap, imageLoadingMap]
  );

  // Map alias by richMenuId
  const aliasByMenuId = useMemo(() => {
    const map = new Map<string, string[]>();
    aliases.forEach((a) => {
      const list = map.get(a.richMenuId) || [];
      list.push(a.richMenuAliasId);
      map.set(a.richMenuId, list);
    });
    return map;
  }, [aliases]);

  // Identify orphans (not default and not linked to any alias)
  const orphanMenuIds = useMemo(() => {
    return menus
      .filter((m) => m.richMenuId !== defaultMenuId && !aliasByMenuId.has(m.richMenuId))
      .map((m) => m.richMenuId);
  }, [menus, defaultMenuId, aliasByMenuId]);

  // Filtered menu list (using deferred search for lag-free typing)
  const filteredMenus = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return menus.filter((m) => {
      const matchesSearch =
        !query ||
        m.name.toLowerCase().includes(query) ||
        m.richMenuId.toLowerCase().includes(query) ||
        (m.chatBarText && m.chatBarText.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      const isDefault = m.richMenuId === defaultMenuId;
      const isAliased = aliasByMenuId.has(m.richMenuId);
      const isOrphan = !isDefault && !isAliased;

      if (filterType === 'default') return isDefault;
      if (filterType === 'aliased') return isAliased;
      if (filterType === 'orphan') return isOrphan;
      return true;
    });
  }, [menus, deferredSearchQuery, filterType, defaultMenuId, aliasByMenuId]);

  // Set / Unset Default
  const handleToggleDefault = async (richMenuId: string) => {
    if (!token || isBusy) return;
    const isCurrentDefault = richMenuId === defaultMenuId;
    setSettingDefaultId(richMenuId);

    try {
      const res = await fetch('/api/richmenu/list', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: isCurrentDefault ? 'unsetDefault' : 'setDefault',
          richMenuId,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to update default status');
      }

      setDefaultMenuId(isCurrentDefault ? null : richMenuId);
      if (onNotify) {
        onNotify(
          isCurrentDefault
            ? 'ปลดสถานะเมนูเริ่มต้น (Default) เรียบร้อยแล้ว'
            : `ตั้งเมนู ${richMenuId} เป็นเมนูเริ่มต้นเรียบร้อยแล้ว`
        );
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการตั้งค่า';
      if (onNotify) onNotify(msg, true);
    } finally {
      setSettingDefaultId(null);
    }
  };

  // Delete single rich menu
  const handleDeleteMenu = async (m: LineRemoteRichMenu) => {
    if (!token || isBusy) return;
    const isDefault = m.richMenuId === defaultMenuId;
    const linkedAliases = aliasByMenuId.get(m.richMenuId) || [];

    let confirmMsg = `ยืนยันการลบ Rich Menu "${m.name}" (${m.richMenuId}) ออกจาก LINE OA?`;
    if (isDefault) {
      confirmMsg += `\n⚠️ คำเตือน: เมนูนี้เป็นเมนูเริ่มต้น (Default) ระบบจะทำการปลด default ให้ด้วย`;
    }
    if (linkedAliases.length > 0) {
      confirmMsg += `\n🔗 คำเตือน: เมนูนี้ผูกกับ Alias (${linkedAliases.join(', ')}) ระบบจะทำการลบ Alias ให้ด้วย`;
    }

    if (!confirm(confirmMsg)) return;

    setDeletingId(m.richMenuId);
    try {
      const res = await fetch('/api/richmenu/list', {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ richMenuId: m.richMenuId }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Failed to delete rich menu');
      }

      // Revoke and clear cached blob URL
      const cachedUrl = imageMap[m.richMenuId];
      if (cachedUrl) {
        URL.revokeObjectURL(cachedUrl);
        activeBlobUrlsRef.current.delete(cachedUrl);
        setImageMap((prev) => {
          const next = { ...prev };
          delete next[m.richMenuId];
          return next;
        });
      }

      setMenus((prev) => prev.filter((item) => item.richMenuId !== m.richMenuId));
      if (isDefault) setDefaultMenuId(null);
      if (linkedAliases.length > 0) {
        setAliases((prev) => prev.filter((a) => a.richMenuId !== m.richMenuId));
      }

      if (onNotify) onNotify(`ลบ Rich Menu ${m.name} สำเร็จเรียบร้อย`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถลบเมนูได้';
      if (onNotify) onNotify(msg, true);
    } finally {
      setDeletingId(null);
    }
  };

  // Bulk Clean all orphan menus with Circuit Breaker and Cancellation
  const handleBulkCleanupOrphans = async () => {
    if (!token || orphanMenuIds.length === 0 || isBusy) return;

    const count = orphanMenuIds.length;
    if (
      !confirm(
        `ยืนยันลบเมนูขยะที่ไม่ได้ใช้งานทั้งหมด ${count} รายการ?\n(เมนูเหล่านี้ไม่ได้ผูกกับ Alias ใดๆ และไม่ได้ตั้งเป็น Default)`
      )
    ) {
      return;
    }

    setBulkCleaning(true);
    setBulkProgress({ current: 0, total: count });
    cancelBulkRef.current = false;

    let deletedCount = 0;
    for (let i = 0; i < orphanMenuIds.length; i++) {
      if (cancelBulkRef.current) {
        if (onNotify) onNotify(`หยุดการล้างเมนูขยะตามคำสั่ง (ลบสำเร็จ ${deletedCount}/${count} รายการ)`);
        break;
      }

      const id = orphanMenuIds[i];
      setBulkProgress({ current: i + 1, total: count });

      try {
        const res = await fetch('/api/richmenu/list', {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ richMenuId: id }),
        });

        // Circuit breaker: break immediately on Auth expired (401) or Rate limit (429)
        if (res.status === 401 || res.status === 429) {
          const errData = await res.json().catch(() => ({}));
          const reason =
            res.status === 401 ? 'Token หมดอายุหรือไม่ถูกต้อง' : 'เกินโควต้าความถี่ LINE API (Rate Limit)';
          if (onNotify) onNotify(`หยุดการทำงาน: ${reason} (${errData.error || ''})`, true);
          break;
        }

        if (res.ok) {
          deletedCount++;
          const cachedUrl = imageMap[id];
          if (cachedUrl) {
            URL.revokeObjectURL(cachedUrl);
            activeBlobUrlsRef.current.delete(cachedUrl);
          }
        }
      } catch {
        // Continue with next
      }
    }

    setBulkCleaning(false);
    setBulkProgress(null);
    if (!cancelBulkRef.current && onNotify) {
      onNotify(`ล้างเมนูขยะสำเร็จ ${deletedCount}/${count} รายการ`);
    }
    handleManualRefresh();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="remote-menu-modal-title"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget && !bulkCleaning) {
          onClose();
        }
      }}
    >
      <div className="bg-[#fcfdfc] border border-[#dce2de] rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#dce2de] bg-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#edf7ef] border border-[#b8dec4] flex items-center justify-center text-[#147a42]">
              <LayoutGrid className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="remote-menu-modal-title" className="text-base font-bold text-[#1c2620]">
                  รายการ Rich Menu บน LINE Official Account
                </h2>
                {client && (
                  <span className="text-[11px] font-medium text-[#147a42] bg-[#edf7ef] border border-[#b8dec4] px-2 py-0.5 rounded-full">
                    {client.name}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#5e6f64]">
                จัดการ ตรวจสอบ และลบเมนูค้าง/เมนูขยะ (Orphan) บนระบบของ LINE โดยตรง
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleManualRefresh}
              disabled={loading || isBusy}
              aria-label="ดึงข้อมูลล่าสุดจาก LINE"
              className="p-2 rounded-lg border border-[#dce2de] text-[#5e6f64] hover:text-[#1c2620] hover:bg-[#f2f5f3] transition-colors cursor-pointer disabled:opacity-50"
              title="ดึงข้อมูลล่าสุดจาก LINE"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={bulkCleaning}
              aria-label="ปิดหน้าต่าง"
              className="p-2 rounded-lg border border-[#dce2de] text-[#5e6f64] hover:text-[#1c2620] hover:bg-[#f2f5f3] transition-colors cursor-pointer disabled:opacity-40"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Quota & Stat Bar */}
        <div className="px-6 py-3 bg-[#f7f9f7] border-b border-[#dce2de] flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-4 text-[#5e6f64]">
            <div>
              <span>เมนูทั้งหมด: </span>
              <strong className="text-[#1c2620] font-mono">{menus.length}</strong>
              <span className="text-[11px] text-[#7d8f83]"> / 1,000 โควต้า</span>
            </div>
            <div>
              <span>ผูก Alias: </span>
              <strong className="text-indigo-700 font-mono">{aliases.length}</strong>
            </div>
            <div>
              <span>เมนูเริ่มต้น: </span>
              <strong className={defaultMenuId ? 'text-emerald-700 font-mono' : 'text-slate-500'}>
                {defaultMenuId ? 'มีแล้ว' : 'ยังไม่ได้ตั้ง'}
              </strong>
            </div>
            <div>
              <span>เมนูขยะ (Orphan): </span>
              <strong className={cn('font-mono', orphanMenuIds.length > 0 ? 'text-amber-700' : 'text-slate-600')}>
                {orphanMenuIds.length} รายการ
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {bulkCleaning ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-rose-700 font-medium flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  กำลังลบ {bulkProgress ? `(${bulkProgress.current}/${bulkProgress.total})` : ''}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    cancelBulkRef.current = true;
                  }}
                  className="px-2.5 py-1 rounded text-xs font-semibold text-rose-700 bg-rose-100 hover:bg-rose-200 transition-colors cursor-pointer"
                >
                  ยกเลิก
                </button>
              </div>
            ) : orphanMenuIds.length > 0 ? (
              <button
                type="button"
                onClick={handleBulkCleanupOrphans}
                disabled={isBusy || loading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer disabled:opacity-50"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>ล้างเมนูขยะทั้งหมด ({orphanMenuIds.length})</span>
              </button>
            ) : null}
          </div>
        </div>

        {/* Controls Bar: Filter + Search */}
        <div className="px-6 py-2.5 border-b border-[#dce2de] bg-white flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          {/* Filter Chips */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setFilterType('all')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                filterType === 'all'
                  ? 'bg-[#147a42] text-white shadow-xs'
                  : 'bg-[#f0f4f1] text-[#5e6f64] hover:bg-[#e4ece6]'
              )}
            >
              ทั้งหมด ({menus.length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('default')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                filterType === 'default'
                  ? 'bg-[#147a42] text-white shadow-xs'
                  : 'bg-[#f0f4f1] text-[#5e6f64] hover:bg-[#e4ece6]'
              )}
            >
              ⭐ Default ({defaultMenuId ? 1 : 0})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('aliased')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                filterType === 'aliased'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-[#f0f4f1] text-[#5e6f64] hover:bg-[#e4ece6]'
              )}
            >
              🔗 ผูก Alias ({menus.filter((m) => aliasByMenuId.has(m.richMenuId)).length})
            </button>
            <button
              type="button"
              onClick={() => setFilterType('orphan')}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer',
                filterType === 'orphan'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-[#f0f4f1] text-[#5e6f64] hover:bg-[#e4ece6]'
              )}
            >
              ⚠️ ขยะ/ไม่ได้ผูก ({orphanMenuIds.length})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-[#5e6f64] absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาชื่อ หรือ Rich Menu ID..."
              className="w-full pl-8 pr-3 py-1 bg-[#f7f8f7] border border-[#dce2de] rounded-lg text-xs text-[#1c2620] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#147a42]"
            />
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading && menus.length === 0 && (
            <div className="py-16 text-center text-[#5e6f64] space-y-2">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-[#147a42]" />
              <p className="text-xs">กำลังตรวจสอบรายการเมนูจาก LINE Messaging API...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!loading && !error && filteredMenus.length === 0 && (
            <div className="py-16 text-center text-[#5e6f64] space-y-1">
              <p className="text-sm font-semibold text-[#1c2620]">ไม่พบรายการ Rich Menu</p>
              <p className="text-xs">
                {menus.length === 0
                  ? 'บัญชี LINE OA นี้ยังไม่มี Rich Menu ที่ถูกสร้าง'
                  : 'ไม่มีเมนูที่ตรงกับเงื่อนไขการค้นหา/ตัวกรองนี้'}
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-3">
            {filteredMenus.map((m) => {
              const isDefault = m.richMenuId === defaultMenuId;
              const linkedAliases = aliasByMenuId.get(m.richMenuId) || [];
              const isOrphan = !isDefault && linkedAliases.length === 0;
              const isDeleting = deletingId === m.richMenuId;
              const isSettingDefault = settingDefaultId === m.richMenuId;
              const thumbUrl = imageMap[m.richMenuId];
              const isLoadingThumb = imageLoadingMap[m.richMenuId];

              return (
                <div
                  key={m.richMenuId}
                  className={cn(
                    'p-3.5 bg-white border rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 transition-all shadow-2xs',
                    isDefault
                      ? 'border-emerald-300 bg-emerald-50/20 ring-1 ring-emerald-200'
                      : isOrphan
                      ? 'border-amber-200/80 bg-amber-50/15'
                      : 'border-[#dfe5e1] hover:border-[#c8d3cc]'
                  )}
                >
                  {/* Left: Thumbnail & Info */}
                  <div className="flex items-center gap-3.5 min-w-0 flex-1">
                    {/* Thumbnail */}
                    <div
                      className="relative w-24 h-16 rounded-lg bg-slate-900 border border-slate-200 overflow-hidden shrink-0 flex items-center justify-center cursor-pointer group"
                      onClick={() => !thumbUrl && loadImageThumbnail(m.richMenuId)}
                      title={thumbUrl ? 'ภาพหน้าปกเมนู' : 'คลิกเพื่อโหลดรูปตัวอย่าง'}
                    >
                      {thumbUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={thumbUrl}
                          alt={m.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : isLoadingThumb ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
                      ) : (
                        <div className="text-center p-1">
                          <ImageIcon className="w-4 h-4 text-slate-400 mx-auto mb-0.5" />
                          <span className="text-[9px] text-slate-400 block font-mono">โหลดรูป</span>
                        </div>
                      )}
                    </div>

                    {/* Metadata */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-semibold text-sm text-[#1c2620] truncate">{m.name}</h3>

                        {isDefault && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <Star className="w-3 h-3 fill-emerald-600 text-emerald-600" />
                            Default
                          </span>
                        )}

                        {linkedAliases.map((alias) => (
                          <span
                            key={alias}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                          >
                            <LinkIcon className="w-2.5 h-2.5" />
                            <span>{alias}</span>
                          </span>
                        ))}

                        {isOrphan && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-100 text-amber-800 border border-amber-300">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            ไม่ได้ผูก (Orphan)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-[#5e6f64] flex-wrap">
                        <div className="flex items-center gap-1 font-mono text-[11px] text-[#425247]">
                          <span className="truncate max-w-[170px] sm:max-w-[220px]" title={m.richMenuId}>
                            ID: {m.richMenuId}
                          </span>
                          <button
                            type="button"
                            aria-label="คัดลอก Rich Menu ID"
                            onClick={() => {
                              navigator.clipboard.writeText(m.richMenuId);
                              if (onNotify) onNotify(`คัดลอก ID แล้ว`);
                            }}
                            className="p-1 hover:text-[#1c2620] cursor-pointer"
                            title="คัดลอก Rich Menu ID"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                        </div>
                        <span>•</span>
                        <span>
                          {m.size.width}x{m.size.height} ({m.size.height <= 1000 ? 'ครึ่งจอ' : 'เต็มจอ'})
                        </span>
                        <span>•</span>
                        <span>{m.areas.length} ปุ่ม</span>
                        {m.chatBarText && (
                          <>
                            <span>•</span>
                            <span className="truncate max-w-[120px]">แถบแชท: “{m.chatBarText}”</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Operational Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => setPreviewJsonMenu(m)}
                      disabled={bulkCleaning}
                      className="px-2.5 py-1.5 rounded-lg border border-[#dce2de] text-xs font-medium text-[#425247] hover:bg-[#f0f4f1] transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      title="ดู Schema JSON ของเมนูนี้"
                    >
                      <Code2 className="w-3.5 h-3.5" />
                      <span>JSON</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleDefault(m.richMenuId)}
                      disabled={isBusy}
                      className={cn(
                        'px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50',
                        isDefault
                          ? 'border-slate-300 text-slate-700 hover:bg-slate-100'
                          : 'border-emerald-300 text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                      )}
                    >
                      {isSettingDefault ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Star className={cn('w-3.5 h-3.5', isDefault && 'fill-slate-600')} />
                      )}
                      <span>{isDefault ? 'ปลด Default' : 'ตั้งเป็น Default'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMenu(m)}
                      disabled={isBusy}
                      aria-label="ลบ Rich Menu นี้ออกจาก LINE"
                      className="p-1.5 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors cursor-pointer disabled:opacity-50"
                      title="ลบ Rich Menu นี้ออกจาก LINE"
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3 border-t border-[#dce2de] bg-white flex items-center justify-between text-xs text-[#5e6f64] shrink-0">
          <span>
            คำเตือน: การลบเมนูหรือปลด Default มีผลทันทีกับผู้ใช้ทุกคนใน LINE Official Account
          </span>
          <button
            type="button"
            onClick={onClose}
            disabled={bulkCleaning}
            className="px-4 py-1.5 rounded-lg bg-[#26362d] text-white hover:bg-[#1c2620] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* JSON Viewer Sub-Modal */}
      {previewJsonMenu && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="preview-json-modal-title"
          className="fixed inset-0 z-60 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setPreviewJsonMenu(null);
          }}
        >
          <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl text-slate-100">
            <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <span id="preview-json-modal-title" className="text-xs font-mono font-bold">
                  {previewJsonMenu.name} (Schema JSON)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(previewJsonMenu, null, 2));
                    setCopiedJson(true);
                    setTimeout(() => setCopiedJson(false), 2000);
                  }}
                  className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 font-mono transition-colors cursor-pointer"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span>คัดลอกแล้ว</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>คัดลอก JSON</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewJsonMenu(null)}
                  aria-label="ปิดหน้าต่าง JSON"
                  className="p-1 text-slate-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
            <pre className="p-4 text-xs font-mono overflow-auto flex-1 text-emerald-300 bg-[#0d1117] leading-relaxed">
              {JSON.stringify(previewJsonMenu, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
