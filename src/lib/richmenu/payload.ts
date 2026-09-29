import type { AreaBounds, MenuSize, RichMenuArea, RichMenuTab } from '@/types/line';
import { ALIAS_ID_PATTERN, LINE_LIMITS, toLineAction, validateAction, type LineAction } from './actions';
import { clampBounds, isBoundsInside } from './geometry';

export interface RichMenuPayload {
  size: MenuSize;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: { bounds: AreaBounds; action: LineAction }[];
}

export interface TabIssue {
  areaId?: string;
  message: string;
}

/** Minimal shape needed to build/validate a payload (also used by the deploy route). */
export type TabLike = Pick<RichMenuTab, 'title' | 'aliasId' | 'selected' | 'chatBarText' | 'size'> & {
  areas: Array<Pick<RichMenuArea, 'bounds' | 'action'> & Partial<Pick<RichMenuArea, 'id' | 'label'>>>;
};

const VALID_SIZES: MenuSize[] = [
  { width: 2500, height: 1686 },
  { width: 2500, height: 843 },
  { width: 1200, height: 810 },
  { width: 1200, height: 405 },
  { width: 800, height: 540 },
  { width: 800, height: 270 },
];

export function isValidMenuSize(size: MenuSize): boolean {
  return VALID_SIZES.some((s) => s.width === size.width && s.height === size.height);
}

/**
 * Build the object sent to POST /v2/bot/richmenu.
 * Bounds are always integer + clamped; unset (`none`) areas are skipped.
 */
export function buildRichMenuPayload(tab: TabLike): RichMenuPayload {
  const areas = tab.areas.flatMap((area) => {
    const action = toLineAction(area.action);
    return action ? [{ bounds: clampBounds(area.bounds, tab.size), action }] : [];
  });

  return {
    size: tab.size,
    selected: tab.selected,
    name: (tab.title || tab.aliasId || 'Rich Menu').slice(0, LINE_LIMITS.menuName),
    chatBarText: tab.chatBarText,
    areas,
  };
}

/** Everything that would make LINE reject (or mis-render) the menu. Empty = ready to deploy. */
export function validateTab(tab: TabLike, knownAliases?: readonly string[]): TabIssue[] {
  const issues: TabIssue[] = [];

  if (!isValidMenuSize(tab.size)) {
    issues.push({ message: `ขนาด ${tab.size.width}×${tab.size.height} ไม่ใช่ขนาดที่ LINE รองรับ` });
  }
  if (!tab.chatBarText.trim()) issues.push({ message: 'ยังไม่ได้ใส่ Chat Bar Text' });
  else if (tab.chatBarText.length > LINE_LIMITS.chatBarText) {
    issues.push({ message: `Chat Bar Text ยาวเกิน ${LINE_LIMITS.chatBarText} ตัวอักษร` });
  }
  if (tab.aliasId && !ALIAS_ID_PATTERN.test(tab.aliasId)) {
    issues.push({ message: `Alias “${tab.aliasId}” ใช้ได้เฉพาะ a-z, 0-9, _ และ - (สูงสุด 32 ตัว)` });
  }
  if (tab.areas.length === 0) issues.push({ message: 'ยังไม่มีพื้นที่กด (ต้องมีอย่างน้อย 1)' });
  if (tab.areas.length > LINE_LIMITS.maxAreas) {
    issues.push({ message: `มีพื้นที่กด ${tab.areas.length} จุด เกินกำหนด ${LINE_LIMITS.maxAreas}` });
  }

  tab.areas.forEach((area, idx) => {
    const name = `#${idx + 1}${area.label ? ` ${area.label}` : ''}`;
    if (!isBoundsInside(area.bounds, tab.size)) {
      issues.push({ areaId: area.id, message: `${name}: พิกัดไม่เป็นจำนวนเต็มหรือเกินขอบภาพ` });
    }
    for (const err of validateAction(area.action, knownAliases)) {
      issues.push({ areaId: area.id, message: `${name}: ${err}` });
    }
  });

  return issues;
}
