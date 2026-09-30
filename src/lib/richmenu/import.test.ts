import { describe, expect, it } from 'vitest';
import { clampBounds } from './geometry';
import { isActionType } from './actions';
import type { AreaAction, AreaBounds, MenuSize, RichMenuArea } from '@/types/line';

function importArea(raw: unknown, idx: number, size: MenuSize): RichMenuArea {
  const a = (raw && typeof raw === 'object' ? raw : {}) as { bounds?: Partial<AreaBounds>; action?: Partial<AreaAction> };
  const b = a.bounds ?? {};
  const type = a.action?.type;
  const action: AreaAction = isActionType(type) ? { ...a.action, type } : { type: 'none' };
  return {
    id: `area_${idx + 1}`,
    label: `ปุ่ม #${idx + 1}`,
    bounds: clampBounds(
      { x: Number(b.x ?? 0), y: Number(b.y ?? 0), width: Number(b.width ?? size.width), height: Number(b.height ?? size.height) },
      size
    ),
    action,
  };
}

describe('importArea and JSON schema compatibility', () => {
  const size: MenuSize = { width: 2500, height: 1686 };

  it('imports valid area with message action', () => {
    const raw = {
      bounds: { x: 0, y: 0, width: 833, height: 843 },
      action: { type: 'message', text: 'ราคาคอร์ส' },
    };
    const area = importArea(raw, 0, size);
    expect(area.id).toBe('area_1');
    expect(area.bounds).toEqual({ x: 0, y: 0, width: 833, height: 843 });
    expect(area.action).toEqual({ type: 'message', text: 'ราคาคอร์ส' });
  });

  it('clamps out-of-bounds coordinates to menu size', () => {
    const raw = {
      bounds: { x: -100, y: 2000, width: 5000, height: 5000 },
      action: { type: 'uri', uri: 'https://line.me' },
    };
    const area = importArea(raw, 1, size);
    expect(area.bounds.x).toBe(0);
    expect(area.bounds.y).toBe(1685);
    expect(area.bounds.width).toBe(2500);
    expect(area.bounds.height).toBe(1);
  });

  it('falls back to none action when type is unsupported or missing', () => {
    const raw = {
      bounds: { x: 0, y: 0, width: 100, height: 100 },
      action: { type: 'unsupported_type' },
    };
    const area = importArea(raw, 2, size);
    expect(area.action.type).toBe('none');
  });

  it('handles null/undefined raw gracefully', () => {
    const area = importArea(null, 0, size);
    expect(area.id).toBe('area_1');
    expect(area.bounds).toEqual({ x: 0, y: 0, width: 2500, height: 1686 });
    expect(area.action.type).toBe('none');
  });
});
