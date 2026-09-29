'use client';

import { create } from 'zustand';
import type { ClientProfile, MenuSize, RichMenuTab, RichMenuArea } from '@/types/line';
import { clampBounds, scaleBounds } from '@/lib/richmenu/geometry';
import { autoLinkTabs } from '@/lib/richmenu/autolink';

export interface DeployStatus {
  message: string;
  isError?: boolean;
}

interface ToolkitState {
  // Client profiles
  clients: ClientProfile[];
  selectedClientId: string | null;

  // Rich menu tabs
  tabs: RichMenuTab[];
  activeTabId: string;
  selectedAreaId: string | null;

  // Deploy state
  deploying: boolean;
  deployStatus: DeployStatus | null;

  // Derived state accessors
  getActiveTab: () => RichMenuTab;
  getActiveArea: () => RichMenuArea | null;
  getCurrentClient: () => ClientProfile | null;

  // Client actions
  loadClients: () => void;
  saveClients: (clients: ClientProfile[]) => void;
  addClient: (client: ClientProfile) => void;
  deleteClient: (id: string) => void;
  selectClient: (id: string | null) => void;

  // Tab actions
  addTab: () => void;
  deleteTab: (id: string) => void;
  updateTab: (id: string, partial: Partial<RichMenuTab>) => void;
  setActiveTab: (id: string) => void;
  setDefaultTab: (id: string) => void;
  /** Change base size and rescale existing areas proportionally. */
  setTabSize: (id: string, size: MenuSize) => void;
  /** Always stores integer, clamped bounds. */
  updateActiveTabAreas: (areas: RichMenuArea[]) => void;
  /** Wire richmenuswitch bars across all tabs. Returns warnings; throws if not linkable. */
  autoLinkAllTabs: () => string[];

  // Area actions
  selectArea: (id: string | null) => void;
  updateArea: (updated: RichMenuArea) => void;
  deleteArea: (id: string) => void;

  // Deploy actions
  setDeploying: (deploying: boolean) => void;
  setDeployStatus: (status: DeployStatus | null) => void;

  // Image handling
  handleImageUpload: (file: File, tabId: string) => void;
  clearTabImage: (tabId: string) => void;
}

const LOCAL_STORAGE_KEY = 'line_toolkit_clients';

const defaultTabs: RichMenuTab[] = [
  {
    id: 'tab_1',
    title: 'แท็บ A (หน้าหลัก)',
    aliasId: 'tab-a',
    selected: true,
    chatBarText: 'เมนูหลัก',
    size: { width: 2500, height: 1686 },
    areas: [],
  },
  {
    id: 'tab_2',
    title: 'แท็บ B (โปรโมชั่น)',
    aliasId: 'tab-b',
    selected: false,
    chatBarText: 'โปรโมชั่น',
    size: { width: 2500, height: 1686 },
    areas: [],
  },
];

export const useToolkitStore = create<ToolkitState>((set, get) => ({
  // Initial state
  clients: [],
  selectedClientId: null,
  tabs: defaultTabs,
  activeTabId: 'tab_1',
  selectedAreaId: null,
  deploying: false,
  deployStatus: null,

  // Derived state accessors
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || tabs[0];
  },

  getActiveArea: () => {
    const { selectedAreaId } = get();
    const activeTab = get().getActiveTab();
    if (!selectedAreaId) return null;
    return activeTab.areas.find((a) => a.id === selectedAreaId) || null;
  },

  getCurrentClient: () => {
    const { clients, selectedClientId } = get();
    if (!selectedClientId) return null;
    return clients.find((c) => c.id === selectedClientId) || null;
  },

  // Client actions
  loadClients: () => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: ClientProfile[] = JSON.parse(stored);
        set({ clients: parsed });
      }
    } catch {
      // Ignore parse errors from corrupted localStorage
    }
  },

  saveClients: (clients) => {
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(clients));
    } catch {
      // Ignore localStorage quota errors
    }
    set({ clients });
  },

  addClient: (client) => {
    const next = [...get().clients, client];
    get().saveClients(next);
  },

  deleteClient: (id) => {
    const { clients, selectedClientId } = get();
    const next = clients.filter((c) => c.id !== id);
    get().saveClients(next);
    if (selectedClientId === id) {
      set({ selectedClientId: null });
    }
  },

  selectClient: (id) => {
    set({ selectedClientId: id });
  },

  // Tab actions
  addTab: () => {
    const { tabs } = get();
    const index = tabs.length + 1;
    const char = String.fromCharCode(64 + index);
    const newTab: RichMenuTab = {
      id: `tab_${Date.now()}`,
      title: `แท็บ ${char}`,
      aliasId: `tab-${char.toLowerCase()}`,
      selected: false,
      chatBarText: `เมนู ${char}`,
      size: { width: 2500, height: 1686 },
      areas: [],
    };
    set({ tabs: [...tabs, newTab], activeTabId: newTab.id, selectedAreaId: null });
  },

  deleteTab: (id: string) => {
    const { tabs, activeTabId } = get();
    if (tabs.length <= 1) return;
    const nextTabs = tabs.filter((t) => t.id !== id);
    const nextActiveId = activeTabId === id ? nextTabs[0].id : activeTabId;
    set({ tabs: nextTabs, activeTabId: nextActiveId, selectedAreaId: null });
  },

  updateTab: (id, partial) => {
    set({
      tabs: get().tabs.map((t) => (t.id === id ? { ...t, ...partial } : t)),
    });
  },

  setDefaultTab: (id: string) => {
    set({
      tabs: get().tabs.map((t) => ({ ...t, selected: t.id === id })),
    });
  },

  setTabSize: (id, size) => {
    set({
      tabs: get().tabs.map((t) =>
        t.id === id
          ? { ...t, size, areas: t.areas.map((a) => ({ ...a, bounds: scaleBounds(a.bounds, t.size, size) })) }
          : t
      ),
    });
  },

  autoLinkAllTabs: () => {
    const { tabs, warnings } = autoLinkTabs(get().tabs);
    set({ tabs, selectedAreaId: null });
    return warnings;
  },

  setActiveTab: (id) => {
    set({ activeTabId: id, selectedAreaId: null });
  },

  updateActiveTabAreas: (areas) => {
    const { activeTabId } = get();
    set({
      tabs: get().tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, areas: areas.map((a) => ({ ...a, bounds: clampBounds(a.bounds, t.size) })) }
          : t
      ),
    });
  },

  // Area actions
  selectArea: (id) => {
    set({ selectedAreaId: id });
  },

  updateArea: (updated: RichMenuArea) => {
    const { activeTabId } = get();
    set({
      tabs: get().tabs.map((t) =>
        t.id === activeTabId
          ? {
              ...t,
              areas: t.areas.map((a) =>
                a.id === updated.id ? { ...updated, bounds: clampBounds(updated.bounds, t.size) } : a
              ),
            }
          : t
      ),
    });
  },

  deleteArea: (id: string) => {
    const { activeTabId, selectedAreaId } = get();
    set({
      tabs: get().tabs.map((t) =>
        t.id === activeTabId
          ? { ...t, areas: t.areas.filter((a) => a.id !== id) }
          : t
      ),
      selectedAreaId: selectedAreaId === id ? null : selectedAreaId,
    });
  },

  // Deploy actions
  setDeploying: (deploying) => {
    set({ deploying });
  },

  setDeployStatus: (deployStatus) => {
    set({ deployStatus });
  },

  // Image handling
  handleImageUpload: (file, tabId) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      set({
        tabs: get().tabs.map((t) =>
          t.id === tabId
            ? { ...t, imagePreviewUrl: dataUrl, imageFile: file }
            : t
        ),
      });
    };
    reader.readAsDataURL(file);
  },

  clearTabImage: (tabId: string) => {
    set({
      tabs: get().tabs.map((t) =>
        t.id === tabId
          ? { ...t, imagePreviewUrl: undefined, imageFile: undefined }
          : t
      ),
    });
  },
}));
