import { describe, expect, it } from 'vitest';
import type { RichMenuArea, RichMenuTab } from '@/types/line';
import { clampBounds, isBoundsInside, scaleBounds, splitEven } from './geometry';
import { GRID_PRESETS, getPreset, tabBarHeight } from './presets';
import { changeActionType, toLineAction, validateAction } from './actions';
import { buildRichMenuPayload, validateTab } from './payload';
import { AUTOLINK_PREFIX, autoLinkTabs, checkAutoLinkable } from './autolink';

const FULL = { width: 2500, height: 1686 };
const COMPACT = { width: 2500, height: 843 };

function makeTab(partial: Partial<RichMenuTab> & Pick<RichMenuTab, 'id' | 'aliasId'>): RichMenuTab {
  return {
    title: partial.aliasId,
    selected: false,
    chatBarText: 'เมนู',
    size: FULL,
    areas: [],
    ...partial,
  };
}

function area(id: string, bounds: RichMenuArea['bounds'], action: RichMenuArea['action']): RichMenuArea {
  return { id, label: id, bounds, action };
}

describe('geometry', () => {
  it('splitEven produces integers that sum exactly to total', () => {
    const parts = splitEven(2500, 3);
    expect(parts.map((p) => p.length)).toEqual([833, 834, 833]);
    expect(parts.reduce((s, p) => s + p.length, 0)).toBe(2500);
    expect(parts[2].offset + parts[2].length).toBe(2500);
  });

  it('clampBounds rounds floats and keeps the box inside the image', () => {
    expect(clampBounds({ x: -10.4, y: 1600.6, width: 3000, height: 200 }, FULL)).toEqual({
      x: 0,
      y: 1601,
      width: 2500,
      height: 85,
    });
  });

  it('clampBounds handles NaN input', () => {
    const b = clampBounds({ x: NaN, y: NaN, width: NaN, height: NaN }, FULL);
    expect(isBoundsInside(b, FULL)).toBe(true);
  });

  it('scaleBounds keeps proportions when switching full → compact', () => {
    expect(scaleBounds({ x: 0, y: 843, width: 1250, height: 843 }, FULL, COMPACT)).toEqual({
      x: 0,
      y: 422,
      width: 1250,
      height: 421,
    });
  });
});

describe('grid presets', () => {
  it.each(GRID_PRESETS.map((p) => p.id))('%s cells are integer and in bounds for both sizes', (id) => {
    for (const size of [FULL, COMPACT]) {
      const cells = getPreset(id).build(size);
      expect(cells.length).toBeGreaterThan(0);
      for (const cell of cells) expect(isBoundsInside(cell.bounds, size)).toBe(true);
      const total = cells.reduce((s, c) => s + c.bounds.width * c.bounds.height, 0);
      expect(total).toBe(size.width * size.height); // full coverage, no overlap gaps
    }
  });

  it('grid-2x3 on full size = 833/834 × 843', () => {
    const cells = getPreset('grid-2x3').build(FULL);
    expect(cells).toHaveLength(6);
    expect(cells[0].bounds).toEqual({ x: 0, y: 0, width: 833, height: 843 });
    expect(cells[4].bounds).toEqual({ x: 833, y: 843, width: 834, height: 843 });
  });

  it('grid-1x3 spans full height', () => {
    const cells = getPreset('grid-1x3').build(FULL);
    expect(cells.every((c) => c.bounds.height === 1686)).toBe(true);
  });

  it('tabbar-3col has a 400px bar on full size and scales on compact', () => {
    expect(tabBarHeight(FULL)).toBe(400);
    expect(tabBarHeight(COMPACT)).toBe(200);
    const cells = getPreset('tabbar-3col').build(FULL, { tabCount: 3 });
    expect(cells.filter((c) => c.role === 'tab')).toHaveLength(3);
    expect(cells.filter((c) => c.role === 'content').every((c) => c.bounds.y === 400)).toBe(true);
  });
});

describe('actions', () => {
  it('flags unset actions and unsafe URIs', () => {
    expect(validateAction({ type: 'none' })).not.toHaveLength(0);
    expect(validateAction({ type: 'uri', uri: 'javascript:alert(1)' })).not.toHaveLength(0);
    expect(validateAction({ type: 'uri', uri: 'https://liff.line.me/123-abc' })).toHaveLength(0);
  });

  it('flags switch to unknown alias', () => {
    expect(validateAction({ type: 'richmenuswitch', richMenuAliasId: 'tab-z' }, ['tab-a'])).not.toHaveLength(0);
    expect(validateAction({ type: 'richmenuswitch', richMenuAliasId: 'tab-a' }, ['tab-a'])).toHaveLength(0);
  });

  it('changeActionType drops fields of the previous type', () => {
    const next = changeActionType({ type: 'uri', uri: 'https://a.com', text: 'x' }, 'message');
    expect(next).not.toHaveProperty('uri');
    expect(toLineAction(next)).toEqual({ type: 'message', text: 'x' });
    expect(changeActionType({ type: 'message', text: 'hi' }, 'none')).toEqual({ type: 'none' });
  });

  it('richmenuswitch always includes data', () => {
    expect(toLineAction({ type: 'richmenuswitch', richMenuAliasId: 'tab-b' })).toEqual({
      type: 'richmenuswitch',
      richMenuAliasId: 'tab-b',
      data: 'switch-to-tab-b',
    });
  });
});

describe('payload', () => {
  it('skips unset areas, clamps bounds, and only emits LINE fields', () => {
    const tab = makeTab({
      id: 't1',
      aliasId: 'tab-a',
      areas: [
        area('a1', { x: 0.4, y: 0, width: 2600, height: 843.2 }, { type: 'uri', uri: 'https://line.me', text: 'stale' }),
        area('a2', { x: 0, y: 843, width: 100, height: 100 }, { type: 'none' }),
      ],
    });
    const payload = buildRichMenuPayload(tab);
    expect(payload.areas).toEqual([
      { bounds: { x: 0, y: 0, width: 2500, height: 843 }, action: { type: 'uri', uri: 'https://line.me' } },
    ]);
  });

  it('validateTab reports out-of-bounds and unset areas', () => {
    const tab = makeTab({
      id: 't1',
      aliasId: 'tab-a',
      areas: [
        area('a1', { x: 2400, y: 0, width: 200, height: 100 }, { type: 'message', text: 'hi' }),
        area('a2', { x: 0, y: 0, width: 100, height: 100 }, { type: 'none' }),
      ],
    });
    const issues = validateTab(tab);
    expect(issues.map((i) => i.areaId)).toEqual(['a1', 'a2']);
  });

  it('validateTab passes a correct tab', () => {
    const tab = makeTab({
      id: 't1',
      aliasId: 'tab-a',
      areas: [area('a1', { x: 0, y: 0, width: 2500, height: 1686 }, { type: 'message', text: 'hi' })],
    });
    expect(validateTab(tab, ['tab-a'])).toEqual([]);
  });
});

describe('autoLinkTabs', () => {
  const tabs = [
    makeTab({ id: 't1', aliasId: 'tab-a', title: 'A' }),
    makeTab({
      id: 't2',
      aliasId: 'tab-b',
      title: 'B',
      size: COMPACT,
      areas: [area('user1', { x: 0, y: 500, width: 2500, height: 343 }, { type: 'message', text: 'x' })],
    }),
  ];

  it('links Tab A → Tab B and Tab B → Tab A', () => {
    const { tabs: linked, warnings } = autoLinkTabs(tabs);
    expect(warnings).toEqual([]);

    const [a, b] = linked;
    const aSwitch = a.areas.find((x) => x.action.richMenuAliasId === 'tab-b');
    const bSwitch = b.areas.find((x) => x.action.richMenuAliasId === 'tab-a');
    expect(aSwitch?.bounds).toEqual({ x: 1250, y: 0, width: 1250, height: 400 });
    expect(bSwitch?.bounds).toEqual({ x: 0, y: 0, width: 1250, height: 200 });

    // user areas are kept, generated payloads are valid
    expect(b.areas.some((x) => x.id === 'user1')).toBe(true);
    for (const t of linked) expect(validateTab(t, ['tab-a', 'tab-b'])).toEqual([]);
  });

  it('is idempotent (re-running replaces generated areas)', () => {
    const once = autoLinkTabs(tabs).tabs;
    const twice = autoLinkTabs(once).tabs;
    expect(twice[0].areas.filter((x) => x.id.startsWith(AUTOLINK_PREFIX))).toHaveLength(2);
    expect(twice).toEqual(once);
  });

  it('warns when a user area overlaps the bar', () => {
    const overlapping = [
      tabs[0],
      { ...tabs[1], areas: [area('u', { x: 0, y: 0, width: 100, height: 100 }, { type: 'none' })] },
    ];
    expect(autoLinkTabs(overlapping).warnings).toHaveLength(1);
  });

  it('replaces tab-switch buttons from the Tab Bar preset instead of stacking a second bar', () => {
    const presetTab = {
      ...tabs[0],
      areas: [
        area('old-tab', { x: 0, y: 0, width: 1250, height: 400 }, { type: 'richmenuswitch', richMenuAliasId: 'tab-b' }),
        area('content', { x: 0, y: 400, width: 2500, height: 1286 }, { type: 'message', text: 'x' }),
      ],
    };
    const { tabs: linked, warnings } = autoLinkTabs([presetTab, tabs[1]]);
    expect(linked[0].areas.map((a) => a.id)).toEqual([`${AUTOLINK_PREFIX}tab-a`, `${AUTOLINK_PREFIX}tab-b`, 'content']);
    expect(warnings).toHaveLength(1); // informs about the replaced button
  });

  it('rejects single tab and duplicate aliases', () => {
    expect(checkAutoLinkable([tabs[0]])).not.toHaveLength(0);
    expect(checkAutoLinkable([tabs[0], { ...tabs[1], aliasId: 'tab-a' }])).not.toHaveLength(0);
    expect(() => autoLinkTabs([tabs[0]])).toThrow();
  });
});
