'use client';

import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useToolkitStore } from '@/store/toolkit-store';
import RichMenuCanvas from '@/components/RichMenuCanvas';
import ActionEditor from '@/components/ActionEditor';
import ClientManager from '@/components/ClientManager';
import GridPresetBar from '@/components/GridPresetBar';
import TabAutoLinker from '@/components/TabAutoLinker';
import DeviceSimulator from '@/components/DeviceSimulator';
import CardStudio from '@/components/card-studio/CardStudio';
import RemoteRichMenuManagerModal from '@/components/RemoteRichMenuManagerModal';
import SectionErrorBoundary from '@/components/ErrorBoundary';
import ActionIcon from '@/components/ActionIcon';
import { createAreaId } from '@/components/RichMenuCanvas';
import { ACTION_META, LINE_LIMITS, isActionType, summarizeAction } from '@/lib/richmenu/actions';
import { buildRichMenuPayload, validateTab } from '@/lib/richmenu/payload';
import { clampBounds, isBoundsInside } from '@/lib/richmenu/geometry';
import { cn } from '@/lib/utils';
import {
  Rocket,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Copy,
  Check,
  Plus,
  Trash2,
  Download,
  Upload,
  Edit2,
  Sliders,
  CheckCheck,
  Code2,
  LayoutGrid,
} from 'lucide-react';
import type { AreaAction, AreaBounds, MenuSize, RichMenuArea } from '@/types/line';

type NavKey = 'builder' | 'preview' | 'tabs' | 'client' | 'json' | 'deploy' | 'cards';

/** Parse an imported LINE rich menu area into an editor area (unknown actions → unset). */
function importArea(raw: unknown, idx: number, size: MenuSize): RichMenuArea {
  const a = (raw && typeof raw === 'object' ? raw : {}) as { bounds?: Partial<AreaBounds>; action?: Partial<AreaAction> };
  const b = a.bounds ?? {};
  const type = a.action?.type;
  const action: AreaAction = isActionType(type) ? { ...a.action, type } : { type: 'none' };
  return {
    id: createAreaId(idx),
    label: `ปุ่ม #${idx + 1}`,
    bounds: clampBounds(
      { x: Number(b.x ?? 0), y: Number(b.y ?? 0), width: Number(b.width ?? size.width), height: Number(b.height ?? size.height) },
      size
    ),
    action,
  };
}

export default function Home() {
  const {
    clients,
    selectedClientId,
    tabs,
    activeTabId,
    selectedAreaId,
    deploying,
    deployStatus,
    getActiveTab,
    getActiveArea,
    getCurrentClient,
    loadClients,
    selectClient,
    addClient,
    deleteClient,
    addTab,
    deleteTab,
    updateTab,
    setTabSize,
    autoLinkAllTabs,
    setDefaultTab,
    setActiveTab,
    selectArea,
    updateActiveTabAreas,
    updateArea,
    deleteArea,
    setDeploying,
    setDeployStatus,
    handleImageUpload,
    clearTabImage,
  } = useToolkitStore();

  const [activeNavSection, setActiveNavSection] = useState<NavKey>('builder');
  const [batchDeploying, setBatchDeploying] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [jsonMinified, setJsonMinified] = useState(false);
  const [isRemoteManagerOpen, setIsRemoteManagerOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const jsonImportRef = useRef<HTMLInputElement>(null);

  const activeTab = getActiveTab();
  const activeArea = getActiveArea();
  const currentClient = getCurrentClient();
  const knownAliases = useMemo(() => tabs.map((t) => t.aliasId), [tabs]);
  const tabIssues = useMemo(() => validateTab(activeTab, knownAliases), [activeTab, knownAliases]);
  const invalidAreaIds = useMemo(
    () => new Set(tabIssues.flatMap((i) => (i.areaId ? [i.areaId] : []))),
    [tabIssues]
  );
  const linePayload = useMemo(() => buildRichMenuPayload(activeTab), [activeTab]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  const onImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleImageUpload(file, activeTabId);
  };

  const handleSizePreset = (width: number, height: number) => {
    setTabSize(activeTab.id, { width, height });
  };

  const handleAddQuickArea = () => {
    if (activeTab.areas.length >= LINE_LIMITS.maxAreas) {
      setDeployStatus({ message: `แท็บนี้มีปุ่มครบ ${LINE_LIMITS.maxAreas} ปุ่มแล้ว (สูงสุดของ LINE)`, isError: true });
      return;
    }
    const newArea: RichMenuArea = {
      id: createAreaId(activeTab.areas.length + 1),
      label: `ปุ่ม #${activeTab.areas.length + 1}`,
      bounds: { x: 0, y: 0, width: Math.round(activeTab.size.width / 2), height: activeTab.size.height },
      action: { type: 'none' },
    };
    updateActiveTabAreas([...activeTab.areas, newArea]);
    selectArea(newArea.id);
  };

  const handleClearAllAreas = () => {
    if (activeTab.areas.length === 0) return;
    if (confirm(`คุณต้องการลบปุ่มทั้งหมด (${activeTab.areas.length} ปุ่ม) ในแท็บนี้ใช่หรือไม่?`)) {
      updateActiveTabAreas([]);
      selectArea(null);
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(linePayload, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `richmenu_${activeTab.aliasId || 'schema'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        const size: MenuSize =
          json.size && Number.isInteger(json.size.width) && Number.isInteger(json.size.height) ? json.size : activeTab.size;
        if (json.size) {
          updateTab(activeTab.id, {
            size,
            chatBarText: json.chatBarText || activeTab.chatBarText,
            title: json.name || activeTab.title,
            selected: json.selected ?? activeTab.selected,
          });
        }
        if (Array.isArray(json.areas)) {
          const importedAreas = (json.areas as unknown[])
            .slice(0, LINE_LIMITS.maxAreas)
            .map((a, idx) => importArea(a, idx, size));
          updateActiveTabAreas(importedAreas);
          selectArea(null);
        }
        setDeployStatus({ message: 'นำเข้า JSON สำเร็จเรียบร้อย' });
      } catch {
        setDeployStatus({ message: 'ไฟล์ JSON ไม่ถูกต้องตามรูปแบบของ LINE', isError: true });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };


  const copyJsonPayload = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(linePayload, null, jsonMinified ? 0 : 2));
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    } catch {
      // ignore clipboard error
    }
  };

  // Deploy single active tab
  const handleDeployCurrentTab = async () => {
    if (!currentClient?.channelAccessToken) {
      setDeployStatus({ message: 'กรุณาเลือกบัญชีลูกค้าที่มี Channel Access Token ก่อนกดยิง API', isError: true });
      document.getElementById('sec-client')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (!activeTab.imagePreviewUrl) {
      setDeployStatus({ message: `กรุณาอัปโหลดภาพของ “${activeTab.title}” ก่อนกดยิง API`, isError: true });
      document.getElementById('sec-settings')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (tabIssues.length > 0) {
      setDeployStatus({ message: `แก้ไขก่อน Deploy: ${tabIssues.map((i) => i.message).join(' · ')}`, isError: true });
      document.getElementById('sec-json')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    if (!confirm(`ยืนยันการ Deploy แท็บ “${activeTab.title}” ขึ้น LINE OA ของ “${currentClient.name}”?`)) return;
    setDeploying(true);
    setDeployStatus({ message: `กำลังสร้างและอัปโหลดเมนู “${activeTab.title}” ขึ้น LINE API…` });

    try {
      const res = await fetch('/api/richmenu/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: currentClient.channelAccessToken,
          tab: activeTab,
          imageBase64: activeTab.imagePreviewUrl,
          isDefault: activeTab.selected,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        setDeployStatus({ message: `Deploy ล้มเหลว: ${result.error}`, isError: true });
      } else {
        setDeployStatus({
          message: `สำเร็จ! สร้าง Rich Menu ID: ${result.richMenuId} (Alias: ${result.aliasId || '-'}) เรียบร้อย`,
        });
      }
    } catch (err: unknown) {
      setDeployStatus({ message: `เกิดข้อผิดพลาดในการเชื่อมต่อ: ${err instanceof Error ? err.message : String(err)}`, isError: true });
    } finally {
      setDeploying(false);
    }
  };

  // Batch Deploy Entire Tab Suite
  const handleBatchDeployAll = async () => {
    if (!currentClient?.channelAccessToken) {
      setDeployStatus({ message: 'กรุณาเลือกบัญชีลูกค้าที่มี Channel Access Token ก่อน Deploy', isError: true });
      document.getElementById('sec-client')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const missingImages = tabs.filter((t) => !t.imagePreviewUrl);
    if (missingImages.length > 0) {
      setDeployStatus({
        message: `มี ${missingImages.length} แท็บที่ยังไม่ได้อัปโหลดภาพ (${missingImages.map((t) => t.title).join(', ')}) กรุณาใส่รูปให้ครบก่อนยิงชุดรวม`,
        isError: true,
      });
      document.getElementById('sec-tabs')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }

    const invalidTabs = tabs
      .map((t) => ({ tab: t, issues: validateTab(t, knownAliases) }))
      .filter((r) => r.issues.length > 0);
    if (invalidTabs.length > 0) {
      setDeployStatus({
        message: `มี ${invalidTabs.length} แท็บที่ยังไม่พร้อม: ${invalidTabs
          .map((r) => `${r.tab.title} (${r.issues[0].message}${r.issues.length > 1 ? ` +${r.issues.length - 1}` : ''})`)
          .join(', ')}`,
        isError: true,
      });
      return;
    }

    if (!confirm(`ยืนยันการ Deploy ทั้งชุด (${tabs.length} แท็บ) ขึ้น LINE OA ของ “${currentClient.name}”?`)) {
      return;
    }

    setBatchDeploying(true);
    setDeploying(true);

    try {
      for (let i = 0; i < tabs.length; i++) {
        const tab = tabs[i];
        setDeployStatus({
          message: `[${i + 1}/${tabs.length}] กำลัง Deploy แท็บ “${tab.title}” (${tab.aliasId})…`,
        });

        const res = await fetch('/api/richmenu/deploy', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: currentClient.channelAccessToken,
            tab,
            imageBase64: tab.imagePreviewUrl,
            isDefault: tab.selected,
          }),
        });

        const result = await res.json();
        if (!res.ok) {
          throw new Error(`แท็บ “${tab.title}” ผิดพลาด: ${result.error}`);
        }
      }

      setDeployStatus({
        message: `สำเร็จครบทั้งชุด! Deploy ทั้งหมด ${tabs.length} แท็บ พร้อมแมป Alias สลับเมนูเรียบร้อย 🚀`,
      });
    } catch (err: unknown) {
      setDeployStatus({ message: `ชุด Deploy ขัดข้อง: ${err instanceof Error ? err.message : String(err)}`, isError: true });
    } finally {
      setBatchDeploying(false);
      setDeploying(false);
    }
  };

  const scrollToSection = (id: string, navKey: NavKey) => {
    setActiveNavSection(navKey);
    const el = document.getElementById(id);
    if (!el) return;
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: isReduced ? 'auto' : 'smooth' });
  };

  const isAreaInBounds = activeTab.areas.every((a) => isBoundsInside(a.bounds, activeTab.size));
  const actionIssues = tabIssues.filter((i) => i.areaId);

  return (
    <main className="toolkit-wrap">
      <a href="#main-content" className="skip-link">
        ข้ามไปยังเนื้อหาหลัก
      </a>

      {/* Top Header */}
      <header className="toolkit-header">
        <div className="toolkit-title">
          <span className="th-subtitle">ระบบสร้างและจัดการ LINE Official Account Rich Menu</span>
          <h1>LINE Messaging Toolkit</h1>
        </div>

        <div className="flex items-center gap-3 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => {
              if (!currentClient) {
                scrollToSection('sec-client', 'client');
                setDeployStatus({ message: 'กรุณาเลือกลูกค้า / ใส่ Channel Access Token ในส่วน Account ก่อน', isError: true });
                return;
              }
              setIsRemoteManagerOpen(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-white border border-[#b8dec4] text-[#147a42] hover:bg-[#edf7ef] shadow-2xs text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer"
            title="ตรวจสอบและลบเมนูบน LINE OA โดยตรง"
          >
            <LayoutGrid className="w-4 h-4 text-[#147a42]" />
            <span>จัดการเมนูบน LINE</span>
            {currentClient ? (
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-0.5" title="พร้อมเชื่อมต่อ" />
            ) : null}
          </button>

          <div className="toolkit-status-box" aria-label="สถานะการเชื่อมต่อระบบ">
            <div className="flex items-center justify-between text-[#5e6f64]">
              <span>Connection:</span>
              <span className="text-[#147a42] font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[#147a42]" aria-hidden="true" />
                Local Storage
              </span>
            </div>
            <div className="flex items-center justify-between text-[#5e6f64]">
              <span>Account:</span>
              <span className="font-semibold text-[#1c2620] truncate max-w-[120px]">
                {currentClient ? currentClient.name : 'ยังไม่เลือก'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[#5e6f64]">
              <span>Active Tab:</span>
              <span className="text-[#147a42] font-semibold">
                {activeTab.aliasId || 'tab-a'}
              </span>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Segmented Strip */}
      <nav className="nav-segmented-strip" aria-label="แถบเมนูหลักของเครื่องมือ">
        <button
          type="button"
          onClick={() => scrollToSection('sec-settings', 'builder')}
          className={cn('nav-tab-btn', activeNavSection === 'builder' && 'active')}
        >
          <span className="nav-num">01</span>
          <span>Builder (Rich Menu)</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-tabs', 'tabs')}
          className={cn('nav-tab-btn', activeNavSection === 'tabs' && 'active')}
        >
          <span className="nav-num">02</span>
          <span>Manage Tabs ({tabs.length})</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-client', 'client')}
          className={cn('nav-tab-btn', activeNavSection === 'client' && 'active')}
        >
          <span className="nav-num">03</span>
          <span>Account ({clients.length})</span>
        </button>

        <button
          type="button"
          onClick={() => {
            if (!currentClient) {
              scrollToSection('sec-client', 'client');
              setDeployStatus({ message: 'กรุณาเลือกลูกค้า / ใส่ Channel Access Token ในส่วน Account ก่อน', isError: true });
            } else {
              setIsRemoteManagerOpen(true);
            }
          }}
          className="nav-tab-btn text-[#147a42] hover:bg-[#edf7ef]"
          title="เปิดหน้าต่างตรวจสอบและลบเมนูบน LINE OA"
        >
          <span className="nav-num">LINE</span>
          <span className="flex items-center gap-1">
            <span>Remote Menus</span>
            {currentClient && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
          </span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-json', 'json')}
          className={cn('nav-tab-btn', activeNavSection === 'json' && 'active')}
        >
          <span className="nav-num">04</span>
          <span>JSON Schema</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-deploy', 'deploy')}
          className={cn('nav-tab-btn', activeNavSection === 'deploy' && 'active')}
        >
          <span className="nav-num">05</span>
          <span>Deploy & Push</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-preview', 'preview')}
          className={cn('nav-tab-btn', activeNavSection === 'preview' && 'active')}
        >
          <span className="nav-num">06</span>
          <span>Device Simulator</span>
        </button>

        <button
          type="button"
          onClick={() => scrollToSection('sec-cards', 'cards')}
          className={cn('nav-tab-btn', activeNavSection === 'cards' && 'active')}
        >
          <span className="nav-num">07</span>
          <span>Card Studio</span>
        </button>
      </nav>

      <div id="main-content">
        {/* Hidden inputs for JSON import */}
        <input
          type="file"
          ref={jsonImportRef}
          accept="application/json"
          onChange={handleImportJson}
          className="sr-only"
        />

        {/* 01.1 Settings Section */}
        <section id="sec-settings" className="section-two-col" aria-labelledby="settings-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">01.1</span>
            <h2 id="settings-heading">Settings</h2>
            <p>กำหนดรูปภาพพื้นหลัง สัดส่วนของเมนู และข้อความที่จะปรากฏบนห้องแชทของ LINE</p>
          </div>

          <div className="section-content space-y-4">
            {/* Image Source & Upload */}
            <div className="form-group">
              <label className="form-label">Base Image / ภาพเมนู LINE</label>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg"
                  onChange={onImageUpload}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="btn-emerald-solid text-xs py-2 px-3"
                >
                  <Upload className="w-3.5 h-3.5" aria-hidden="true" />
                  {activeTab.imagePreviewUrl ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดภาพเมนู (Browse Image)'}
                </button>
                {activeTab.imagePreviewUrl && (
                  <button
                    type="button"
                    onClick={() => clearTabImage(activeTab.id)}
                    className="text-xs text-[#c93b2b] hover:bg-red-50 px-2.5 py-2 rounded-md transition-colors flex items-center gap-1 border border-red-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
                    ลบรูป
                  </button>
                )}
                <span className="text-xs text-[#5e6f64] ml-auto font-mono">
                  {activeTab.imagePreviewUrl ? '✔ โหลดภาพพร้อมใช้งาน' : 'ยังไม่มีภาพ'}
                </span>
              </div>
            </div>

            {/* Base Size (px) with Presets */}
            <div className="form-group">
              <label className="form-label">Base size (px) / สัดส่วนเมนู</label>
              <div className="flex items-center gap-3 flex-wrap">
                <input
                  type="text"
                  readOnly
                  value={`${activeTab.size.width} × ${activeTab.size.height} px`}
                  className="form-input form-input-mono w-44 font-semibold text-xs py-1.5"
                />
                <div className="preset-pills">
                  <button
                    type="button"
                    onClick={() => handleSizePreset(2500, 1686)}
                    className={cn(
                      'preset-pill-btn',
                      activeTab.size.height === 1686 && 'active'
                    )}
                  >
                    2500×1686 (เต็มจอ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSizePreset(2500, 843)}
                    className={cn(
                      'preset-pill-btn',
                      activeTab.size.height === 843 && 'active'
                    )}
                  >
                    2500×843 (ครึ่งจอ)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSizePreset(1200, 810)}
                    className={cn(
                      'preset-pill-btn',
                      activeTab.size.width === 1200 && 'active'
                    )}
                  >
                    1200×810 (ขนาดกลาง)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSizePreset(800, 540)}
                    className={cn(
                      'preset-pill-btn',
                      activeTab.size.width === 800 && 'active'
                    )}
                  >
                    800×540 (กะทัดรัด)
                  </button>
                </div>
              </div>
            </div>

            {/* Menu Title & Chat Bar Text */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label htmlFor="setting-menu-title" className="form-label">
                  ชื่อเมนูภายในระบบ (Menu Name)
                </label>
                <input
                  id="setting-menu-title"
                  type="text"
                  value={activeTab.title}
                  onChange={(e) => updateTab(activeTab.id, { title: e.target.value })}
                  placeholder="เช่น เมนูหลัก หน้าโปรโมชั่น"
                  className="form-input"
                />
              </div>

              <div className="form-group">
                <label htmlFor="setting-chatbar-text" className="form-label">
                  ข้อความบนแถบแชท (Chat Bar Text)
                </label>
                <input
                  id="setting-chatbar-text"
                  type="text"
                  value={activeTab.chatBarText}
                  onChange={(e) => updateTab(activeTab.id, { chatBarText: e.target.value })}
                  placeholder="เช่น เมนูหลัก หรือ กดที่นี่เพื่อเปิดเมนู"
                  className="form-input"
                />
              </div>
            </div>
          </div>
        </section>

        {/* 01.2 Tap Areas Section */}
        <section id="sec-areas" className="section-two-col" aria-labelledby="areas-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">01.2</span>
            <h2 id="areas-heading">Tap Areas</h2>
            <p>กำหนดพื้นที่สัมผัสบนรูปภาพ ลากเมาส์/ทัชบนผืนผ้าใบ หรือกดเพิ่มปุ่มด่วน</p>

            <div className="quick-links">
              <button
                type="button"
                onClick={handleAddQuickArea}
                className="quick-link-btn font-semibold"
              >
                <Plus className="w-3.5 h-3.5" aria-hidden="true" />
                + เพิ่มปุ่มใหม่ (Add Area)
              </button>
              <button
                type="button"
                onClick={() => jsonImportRef.current?.click()}
                className="quick-link-btn"
              >
                <Upload className="w-3 h-3" aria-hidden="true" />
                Import from JSON
              </button>
              <button
                type="button"
                onClick={handleExportJson}
                className="quick-link-btn"
              >
                <Download className="w-3 h-3" aria-hidden="true" />
                Export to JSON
              </button>
              <button
                type="button"
                onClick={handleClearAllAreas}
                className="quick-link-btn danger"
              >
                <Trash2 className="w-3 h-3" aria-hidden="true" />
                Clear all areas
              </button>
            </div>
          </div>

          <div className="section-content space-y-5">
            {/* Visual Canvas */}
            <SectionErrorBoundary title="Rich Menu Canvas">
            <RichMenuCanvas
              imageSrc={activeTab.imagePreviewUrl}
              size={activeTab.size}
              areas={activeTab.areas}
              selectedAreaId={selectedAreaId}
              onSelectArea={selectArea}
              invalidAreaIds={invalidAreaIds}
              onUpdateAreas={updateActiveTabAreas}
              onUploadImage={onImageUpload}
              onClearImage={() => clearTabImage(activeTab.id)}
              toolbar={
                <GridPresetBar
                  size={activeTab.size}
                  tabs={tabs}
                  existingAreaCount={activeTab.areas.length}
                  onApply={(areas) => {
                    updateActiveTabAreas(areas);
                    selectArea(areas[0]?.id ?? null);
                  }}
                />
              }
            />
            </SectionErrorBoundary>

            {/* Action Settings Inspector (opens when an area is clicked) */}
            <div
              id="area-inspector"
              className={cn(
                'rounded-lg border p-4 transition-colors',
                activeArea ? 'bg-[#f6faf7] border-[#b8dec4]' : 'bg-white border-[#dfe5e1]'
              )}
            >
              {activeArea && (
                <div className="flex items-center justify-between pb-3 mb-3 border-b border-[#b8dec4]">
                  <span className="text-xs font-bold text-[#147a42] uppercase tracking-wider flex items-center gap-1.5">
                    <Sliders className="w-3.5 h-3.5" aria-hidden="true" />
                    Action Settings: {activeArea.label}
                  </span>
                  <button type="button" onClick={() => selectArea(null)} className="text-xs text-[#5e6f64] hover:text-[#1c2620]">
                    ปิดแถบปรับแต่ง
                  </button>
                </div>
              )}
              <ActionEditor
                area={activeArea}
                tabs={tabs}
                currentTabId={activeTab.id}
                tabSize={activeTab.size}
                onUpdateArea={updateArea}
                onDeleteArea={deleteArea}
              />
            </div>

            {/* Areas Table (AREAS 3/20) */}
            <div className="pt-2">
              <div className="flex items-center justify-between pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-[#1c2620]">
                  AREAS ({activeTab.areas.length}/{LINE_LIMITS.maxAreas})
                </span>
                <span className="text-xs text-[#5e6f64] font-mono">
                  พิกัดตามอัตราส่วนจริง LINE Native (Max {activeTab.size.width}×{activeTab.size.height})
                </span>
              </div>

              {activeTab.areas.length === 0 ? (
                <div className="p-4 bg-[#f8faf8] border border-dashed border-[#dfe5e1] rounded-lg text-center text-[#5e6f64] text-xs">
                  ยังไม่มีพื้นที่กด — คลิกลากเมาส์บนภาพด้านบน หรือกด “+ เพิ่มปุ่มใหม่” ทางซ้าย
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="areas-table">
                    <thead>
                      <tr>
                        <th style={{ width: '40px' }}>#</th>
                        <th style={{ width: '120px' }}>Action Type</th>
                        <th>Action Target / Payload</th>
                        <th style={{ width: '220px' }}>Bounds [X, Y, W, H]</th>
                        <th style={{ width: '100px', textAlign: 'right' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeTab.areas.map((area, idx) => {
                        const isSelected = area.id === selectedAreaId;
                        const meta = ACTION_META[area.action.type] ?? ACTION_META.none;
                        return (
                          <tr
                            key={area.id}
                            onClick={() => selectArea(area.id)}
                            className={cn('transition-colors cursor-pointer', isSelected && 'selected')}
                          >
                            <td className="font-mono font-bold text-[#147a42]">
                              {idx + 1}
                            </td>
                            <td>
                              <span className={cn('inline-flex items-center gap-1 font-semibold text-[10px] px-1.5 py-0.5 rounded font-mono', meta.badgeClass)}>
                                <ActionIcon type={area.action.type} />
                                {meta.shortLabel}
                              </span>
                            </td>
                            <td className={cn('font-mono text-xs truncate max-w-[280px]', invalidAreaIds.has(area.id) ? 'text-red-600' : 'text-[#34483b]')}>
                              {summarizeAction(area.action)}
                            </td>
                            <td className="font-mono text-xs text-[#5e6f64]">
                              [{area.bounds.x}, {area.bounds.y}, {area.bounds.width}, {area.bounds.height}]
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    selectArea(isSelected ? null : area.id);
                                    if (!isSelected) document.getElementById('area-inspector')?.scrollIntoView({ block: 'nearest' });
                                  }}
                                  className="text-xs text-[#147a42] hover:underline font-semibold flex items-center gap-1"
                                >
                                  <Edit2 className="w-3 h-3" aria-hidden="true" />
                                  {isSelected ? 'ปิด' : 'แก้ไข'}
                                </button>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteArea(area.id);
                                  }}
                                  className="text-xs text-[#c93b2b] hover:underline"
                                >
                                  ลบ
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        </section>

        {/* 01.3 Rich Menu JSON Section */}
        <section id="sec-json" className="section-two-col" aria-labelledby="json-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">01.3</span>
            <h2 id="json-heading">Rich Menu JSON</h2>
            <p>ตรวจสอบโครงสร้าง JSON ที่ส่งออกไปยัง LINE Messaging API พร้อมการตรวจสอบความถูกต้อง</p>
          </div>

          <div className="section-content">
            {/* JSON Code Box Header */}
            <div className="flex items-center justify-between pb-2 mb-2 border-b border-[#dfe5e1]">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                <span className="text-xs font-semibold text-[#1c2620] font-mono">
                  richmenu-schema.json
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setJsonMinified(!jsonMinified)}
                  className="text-xs text-[#5e6f64] hover:text-[#1c2620] px-2 py-1 bg-[#f0f4f1] rounded font-mono"
                >
                  {jsonMinified ? 'Beautify' : 'Minify'}
                </button>
                <button
                  type="button"
                  onClick={copyJsonPayload}
                  className="btn-emerald-outline text-xs py-1 px-2.5"
                >
                  {copiedJson ? (
                    <>
                      <Check className="w-3 h-3 text-[#147a42]" aria-hidden="true" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" aria-hidden="true" />
                      Copy JSON
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Code Block */}
            <pre className="bg-[#18231c] text-[#d2edd9] p-4 rounded-lg font-mono text-xs overflow-x-auto max-h-72 leading-relaxed select-all">
              {JSON.stringify(linePayload, null, jsonMinified ? 0 : 2)}
            </pre>

            {/* Validation Checklist */}
            <div className="validation-checklist" aria-label="ผลการตรวจสอบ Schema">
              <span className="validation-item">
                {tabIssues.length === 0 ? (
                  <CheckCheck className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
                )}
                {tabIssues.length === 0 ? 'OK Valid LINE Schema' : `${tabIssues.length} Issue(s)`}
              </span>
              <span className="validation-item">
                {actionIssues.length === 0 ? (
                  <CheckCheck className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                )}
                {actionIssues.length === 0 ? 'OK Actions Configured' : 'Actions Incomplete'}
              </span>
              <span className="validation-item">
                <CheckCheck className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                OK Base size ({activeTab.size.width}×{activeTab.size.height})
              </span>
              <span className="validation-item">
                {activeTab.imagePreviewUrl ? (
                  <CheckCheck className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-amber-600" aria-hidden="true" />
                )}
                {activeTab.imagePreviewUrl ? 'OK Base Image Loaded' : 'Waiting Image'}
              </span>
              <span className="validation-item">
                {isAreaInBounds ? (
                  <CheckCheck className="w-4 h-4 text-[#147a42]" aria-hidden="true" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" aria-hidden="true" />
                )}
                {isAreaInBounds ? 'OK Bounds in Canvas' : 'Area Out of Bounds'}
              </span>
            </div>

            {tabIssues.length > 0 && (
              <ul className="mt-3 space-y-0.5 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800" aria-label="สิ่งที่ต้องแก้ก่อน Deploy">
                {tabIssues.map((issue, i) => (
                  <li key={`${issue.areaId ?? 'tab'}-${i}`} className="flex items-start gap-1">
                    <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                    {issue.areaId ? (
                      <button type="button" onClick={() => selectArea(issue.areaId ?? null)} className="text-left hover:underline">
                        {issue.message}
                      </button>
                    ) : (
                      issue.message
                    )}
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 text-[11px] text-[#5e6f64]">
              * พื้นที่ที่ยังไม่กำหนด Action จะไม่ถูกใส่ใน JSON และระบบจะไม่ให้ Deploy จนกว่าจะแก้ครบ
            </p>
          </div>
        </section>

        {/* 06 Device Simulator */}
        <section id="sec-preview" className="section-two-col" aria-labelledby="preview-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">06</span>
            <h2 id="preview-heading">Live Device Simulator</h2>
            <p>ทดลองกดปุ่มบน Rich Menu เหมือนบนมือถือจริง — สลับแท็บ, ส่งข้อความ, เปิดลิงก์ และพับ/เปิดเมนูผ่าน Chat Bar</p>
          </div>
          <div className="section-content flex justify-center bg-[#f4f6f5]">
            <SectionErrorBoundary title="Device Simulator">
              <DeviceSimulator tabs={tabs} />
            </SectionErrorBoundary>
          </div>
        </section>

        {/* 01.4 Deploy & Push Section */}
        <section id="sec-deploy" className="section-two-col" aria-labelledby="deploy-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">01.4</span>
            <h2 id="deploy-heading">Deploy to LINE</h2>
            <p>ส่งข้อมูลเมนูและอัปโหลดภาพขึ้น LINE Messaging API เพื่อเปิดใช้งานจริงบน LINE OA</p>
          </div>

          <div className="section-content space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-group">
                <label className="form-label">บัญชีลูกค้าที่จะส่ง (Target Client)</label>
                <select
                  value={selectedClientId || ''}
                  onChange={(e) => selectClient(e.target.value || null)}
                  className="form-input font-medium"
                >
                  <option value="">-- เลือกบัญชีลูกค้า --</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Channel Access Token</label>
                <input
                  type="password"
                  readOnly
                  value={currentClient?.channelAccessToken || ''}
                  placeholder={currentClient ? '••••••••••••••••••••' : 'ยังไม่ได้เลือกบัญชี'}
                  className="form-input form-input-mono text-xs bg-[#f4f8f5]"
                />
              </div>
            </div>

            {/* Deploy Actions */}
            <div className="pt-2 flex items-center gap-3 flex-wrap">
              <button
                type="button"
                onClick={handleDeployCurrentTab}
                disabled={deploying || !currentClient || !activeTab.imagePreviewUrl}
                className="btn-emerald-solid"
              >
                {deploying && !batchDeploying ? (
                  <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                ) : (
                  <Rocket className="w-4 h-4" aria-hidden="true" />
                )}
                Deploy Rich Menu แท็บนี้ -&gt;
              </button>

              <button
                type="button"
                onClick={handleBatchDeployAll}
                disabled={deploying || !currentClient || tabs.length <= 1}
                className="btn-emerald-outline"
              >
                {batchDeploying && <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />}
                Deploy ทั้งชุด ({tabs.length} แท็บพร้อมสลับ Alias)
              </button>

              <span className="text-xs text-[#5e6f64] ml-auto">
                {activeTab.selected ? '⭐ แท็บนี้เป็น Default Rich Menu' : 'แท็บนี้เป็นเมนูย่อย'}
              </span>
            </div>

            {/* Live Status Feedback */}
            <div aria-live="polite" aria-atomic="true">
              {deployStatus && (
                <div
                  role="status"
                  className={cn(
                    'mt-3 flex items-start gap-2.5 p-3 rounded-lg text-xs font-mono border',
                    deployStatus.isError
                      ? 'bg-red-50 border-red-200 text-red-700'
                      : 'bg-[#eaf5ee] border-[#b8dec4] text-[#147a42]'
                  )}
                >
                  {deployStatus.isError ? (
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" aria-hidden="true" />
                  )}
                  <span>{deployStatus.message}</span>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 02: Manage Tabs */}
        <section id="sec-tabs" className="section-two-col" aria-labelledby="tab-mgmt-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">02</span>
            <h2 id="tab-mgmt-heading">Manage Tabs</h2>
            <p>จัดการชุดแท็บเมนูสำหรับการทำระบบสลับเมนูแบบ Multi-tab (Alias Switching)</p>
            <button
              type="button"
              onClick={addTab}
              className="quick-link-btn font-semibold mt-2"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              + สร้างแท็บใหม่
            </button>
          </div>

          <div className="section-content">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {tabs.map((tab) => {
                const isActive = tab.id === activeTab.id;
                return (
                  <div
                    key={tab.id}
                    className={cn(
                      'p-3.5 rounded-lg border transition-all text-xs space-y-2',
                      isActive
                        ? 'border-[#147a42] bg-[#f4faf6] shadow-sm'
                        : 'border-[#dfe5e1] bg-[#ffffff] hover:border-[#b8dec4]'
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#1c2620]">{tab.title}</span>
                      {tab.selected ? (
                        <span className="text-[10px] bg-[#eaf5ee] text-[#147a42] border border-[#b8dec4] px-1.5 py-0.5 rounded font-mono font-semibold">
                          Default
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setDefaultTab(tab.id)}
                          className="text-[10px] text-[#5e6f64] hover:text-[#147a42]"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    <div className="font-mono text-[11px] text-[#5e6f64]">
                      Alias: <strong className="text-[#1c2620]">{tab.aliasId}</strong>
                    </div>

                    <div className="flex items-center justify-between pt-1 border-t border-[#dfe5e1] text-[11px]">
                      <span className="text-[#5e6f64]">{tab.areas.length} ปุ่ม</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setActiveTab(tab.id);
                            scrollToSection('sec-settings', 'builder');
                          }}
                          className="text-[#147a42] font-semibold hover:underline"
                        >
                          เปิดแก้ไข
                        </button>
                        {tabs.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`ลบแท็บ “${tab.title}”?`)) deleteTab(tab.id);
                            }}
                            className="text-[#c93b2b] hover:underline"
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <SectionErrorBoundary title="Auto Linker">
              <TabAutoLinker tabs={tabs} onAutoLink={autoLinkAllTabs} />
            </SectionErrorBoundary>
          </div>
        </section>

        {/* Section 03: Accounts / Client Manager */}
        <section id="sec-client" className="section-two-col" aria-labelledby="client-mgmt-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">03</span>
            <h2 id="client-mgmt-heading">Account Profile</h2>
            <p>จัดการโปรไฟล์ลูกค้าและ LINE Channel Access Token เพื่อสลับบัญชีทำงานได้อย่างสะดวก</p>
            {currentClient && (
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsRemoteManagerOpen(true)}
                  className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-[#147a42] bg-[#edf7ef] hover:bg-[#dff0e3] border border-[#b8dec4] transition-colors cursor-pointer"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>จัดการเมนูบน LINE</span>
                </button>
              </div>
            )}
          </div>

          <div className="section-content">
            <ClientManager
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClient={selectClient}
              onAddClient={addClient}
              onDeleteClient={deleteClient}
              onOpenRemoteManager={() => setIsRemoteManagerOpen(true)}
            />
          </div>
        </section>

        {/* 07 Card Studio (Flex Message) */}
        <section id="sec-cards" className="section-two-col" aria-labelledby="cards-heading">
          <div className="section-sidebar">
            <span className="section-num-badge">07</span>
            <h2 id="cards-heading">Card Studio</h2>
            <p>สร้าง Card / Carousel แบบ LINE OA Manager (บุคคล / สินค้า) แล้ว Copy เป็น Flex Message JSON ไปใช้กับ Messaging API ได้ทันที</p>
          </div>
          <div className="section-content">
            <SectionErrorBoundary title="Card Studio">
              <CardStudio />
            </SectionErrorBoundary>
          </div>
        </section>
      </div>

      {/* Clean Editorial Footer */}
      <footer className="mt-16 pt-8 border-t border-[#dfe5e1] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5e6f64] gap-4">
        <div>
          <strong>LINE Messaging Toolkit Studio</strong> — ออกแบบและส่งเมนูขึ้น LINE Messaging API
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono">
          <span>LINE OA Official API v2</span>
          <span>•</span>
          <span>Next.js 16 + React 19</span>
        </div>
      </footer>

      {/* Remote Rich Menu Manager Modal (Live LINE OA Overview & Cleanup) */}
      {isRemoteManagerOpen && (
        <RemoteRichMenuManagerModal
          isOpen={isRemoteManagerOpen}
          onClose={() => setIsRemoteManagerOpen(false)}
          client={currentClient}
          onNotify={(msg, isErr) => setDeployStatus({ message: msg, isError: isErr })}
        />
      )}
    </main>
  );
}
