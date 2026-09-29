import type { AreaBounds, RichMenuArea, RichMenuTab } from '@/types/line';
import { ALIAS_ID_PATTERN, LINE_LIMITS } from './actions';
import { splitEven } from './geometry';
import { tabBarHeight } from './presets';

/** Areas created by the auto-linker carry this id prefix so re-running replaces them cleanly. */
export const AUTOLINK_PREFIX = 'autolink_';

export function isAutoLinkArea(area: RichMenuArea): boolean {
  return area.id.startsWith(AUTOLINK_PREFIX);
}

export interface AutoLinkResult {
  tabs: RichMenuTab[];
  warnings: string[];
}

function overlaps(a: AreaBounds, b: AreaBounds): boolean {
  return a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
}

function contains(outer: AreaBounds, inner: AreaBounds): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.width <= outer.x + outer.width &&
    inner.y + inner.height <= outer.y + outer.height
  );
}

/** Problems that make auto-linking impossible. Empty = safe to run. */
export function checkAutoLinkable(tabs: readonly RichMenuTab[]): string[] {
  const errors: string[] = [];
  if (tabs.length < 2) errors.push('ต้องมีอย่างน้อย 2 แท็บ');

  const seen = new Set<string>();
  for (const tab of tabs) {
    if (!ALIAS_ID_PATTERN.test(tab.aliasId)) {
      errors.push(`แท็บ “${tab.title}” มี Alias ID ไม่ถูกต้อง (${tab.aliasId || 'ว่าง'})`);
    } else if (seen.has(tab.aliasId)) {
      errors.push(`Alias “${tab.aliasId}” ซ้ำกันหลายแท็บ`);
    }
    seen.add(tab.aliasId);
  }
  return errors;
}

/**
 * Generate a top tab-switch bar on every tab.
 * Segment i on every menu is a `richmenuswitch` to tabs[i].aliasId, so Tab A → Tab B and Tab B → Tab A
 * are wired automatically. Previously generated auto-link areas are replaced; user areas are kept.
 */
export function autoLinkTabs(tabs: readonly RichMenuTab[]): AutoLinkResult {
  const errors = checkAutoLinkable(tabs);
  if (errors.length > 0) throw new Error(errors.join(', '));

  const warnings: string[] = [];

  const nextTabs = tabs.map((tab) => {
    const barHeight = tabBarHeight(tab.size);
    const segments = splitEven(tab.size.width, tabs.length);

    const barAreas: RichMenuArea[] = tabs.map((target, i) => ({
      id: `${AUTOLINK_PREFIX}${target.aliasId}`,
      label: target.id === tab.id ? `${target.title} (ปัจจุบัน)` : `ไป ${target.title}`,
      bounds: { x: segments[i].offset, y: 0, width: segments[i].length, height: barHeight },
      action: {
        type: 'richmenuswitch',
        richMenuAliasId: target.aliasId,
        data: `switch-to-${target.aliasId}`,
      },
    }));

    const barRegion: AreaBounds = { x: 0, y: 0, width: tab.size.width, height: barHeight };
    // An existing tab-switch button fully inside the bar (e.g. from the "Tab Bar + 3" preset) is superseded.
    const isOldTabButton = (a: RichMenuArea) => a.action.type === 'richmenuswitch' && contains(barRegion, a.bounds);
    const replaced = tab.areas.filter((a) => !isAutoLinkArea(a) && isOldTabButton(a));
    const userAreas = tab.areas.filter((a) => !isAutoLinkArea(a) && !isOldTabButton(a));
    if (replaced.length > 0) {
      warnings.push(`“${tab.title}”: แทนที่ปุ่มสลับแท็บเดิม ${replaced.length} ปุ่มในแถบด้านบน`);
    }
    const overlapping = userAreas.filter((a) => overlaps(a.bounds, barRegion));
    if (overlapping.length > 0) {
      warnings.push(`“${tab.title}”: มี ${overlapping.length} ปุ่มทับแถบสลับแท็บด้านบน (สูง ${barHeight}px)`);
    }

    const areas = [...barAreas, ...userAreas];
    if (areas.length > LINE_LIMITS.maxAreas) {
      warnings.push(`“${tab.title}”: มีปุ่มรวม ${areas.length} จุด เกิน ${LINE_LIMITS.maxAreas}`);
    }

    return { ...tab, areas };
  });

  return { tabs: nextTabs, warnings };
}
