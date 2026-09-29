import type { ActionType, AreaAction } from '@/types/line';

/** LINE Messaging API limits (rich menu object / action objects). */
export const LINE_LIMITS = {
  maxAreas: 20,
  chatBarText: 14,
  menuName: 300,
  actionLabel: 20,
  messageText: 300,
  postbackData: 300,
  postbackDisplayText: 300,
  uri: 1000,
  aliasId: 32,
} as const;

export const ALIAS_ID_PATTERN = /^[a-zA-Z0-9_-]{1,32}$/;
const ALLOWED_URI_SCHEMES = ['http:', 'https:', 'line:', 'tel:'];

export interface ActionMeta {
  type: ActionType;
  label: string;
  shortLabel: string;
  /** Canvas box classes (border + tint). */
  boxClass: string;
  /** Badge classes on canvas / table. */
  badgeClass: string;
  /** Active segmented-control classes. */
  activeClass: string;
  /** Swatch colour for legends. */
  swatchClass: string;
}

export const ACTION_META: Record<ActionType, ActionMeta> = {
  uri: {
    type: 'uri',
    label: 'เปิดลิงก์ / LIFF',
    shortLabel: 'URI',
    boxClass: 'border-sky-500 bg-sky-500/15 hover:bg-sky-500/25',
    badgeClass: 'bg-sky-600 text-white',
    activeClass: 'bg-sky-600 text-white shadow-sm',
    swatchClass: 'bg-sky-500',
  },
  message: {
    type: 'message',
    label: 'ส่งข้อความ',
    shortLabel: 'MSG',
    boxClass: 'border-emerald-500 bg-emerald-500/15 hover:bg-emerald-500/25',
    badgeClass: 'bg-emerald-600 text-white',
    activeClass: 'bg-emerald-600 text-white shadow-sm',
    swatchClass: 'bg-emerald-500',
  },
  richmenuswitch: {
    type: 'richmenuswitch',
    label: 'สลับแท็บเมนู',
    shortLabel: 'SWITCH',
    boxClass: 'border-orange-500 bg-orange-500/15 hover:bg-orange-500/25',
    badgeClass: 'bg-orange-500 text-white',
    activeClass: 'bg-orange-500 text-white shadow-sm',
    swatchClass: 'bg-orange-500',
  },
  postback: {
    type: 'postback',
    label: 'Postback',
    shortLabel: 'POSTBACK',
    boxClass: 'border-violet-500 bg-violet-500/15 hover:bg-violet-500/25',
    badgeClass: 'bg-violet-600 text-white',
    activeClass: 'bg-violet-600 text-white shadow-sm',
    swatchClass: 'bg-violet-500',
  },
  none: {
    type: 'none',
    label: 'ยังไม่กำหนด',
    shortLabel: 'UNSET',
    boxClass: 'border-zinc-400 border-dashed bg-zinc-500/10 hover:bg-zinc-500/20',
    badgeClass: 'bg-zinc-500 text-white',
    activeClass: 'bg-zinc-600 text-white shadow-sm',
    swatchClass: 'bg-zinc-400',
  },
};

export const EDITABLE_ACTION_TYPES: ActionType[] = ['uri', 'message', 'richmenuswitch', 'postback', 'none'];

const KNOWN_TYPES = new Set<string>(EDITABLE_ACTION_TYPES);

export function isActionType(value: unknown): value is ActionType {
  return typeof value === 'string' && KNOWN_TYPES.has(value);
}

export function isSafeUri(uri: string): boolean {
  try {
    return ALLOWED_URI_SCHEMES.includes(new URL(uri).protocol);
  } catch {
    return false;
  }
}

/** Only http(s) may be opened from the browser (preview / simulator). */
export function isBrowserOpenableUri(uri: string): boolean {
  try {
    const { protocol } = new URL(uri);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

export function summarizeAction(action: AreaAction): string {
  switch (action.type) {
    case 'uri':
      return action.uri || 'ยังไม่ใส่ URL';
    case 'message':
      return action.text ? `“${action.text}”` : 'ยังไม่ใส่ข้อความ';
    case 'richmenuswitch':
      return `→ ${action.richMenuAliasId || 'ยังไม่เลือกแท็บ'}`;
    case 'postback':
      return `data: ${action.data || '-'}`;
    default:
      return 'ยังไม่กำหนด Action';
  }
}

/** Returns a list of human-readable problems (Thai). Empty = valid. */
export function validateAction(action: AreaAction, knownAliases?: readonly string[]): string[] {
  const errors: string[] = [];
  if (action.label && action.label.length > LINE_LIMITS.actionLabel) {
    errors.push(`label ยาวเกิน ${LINE_LIMITS.actionLabel} ตัวอักษร`);
  }

  switch (action.type) {
    case 'none':
      errors.push('ยังไม่ได้กำหนด Action');
      break;
    case 'uri':
      if (!action.uri) errors.push('ยังไม่ได้ใส่ URL');
      else if (action.uri.length > LINE_LIMITS.uri) errors.push(`URL ยาวเกิน ${LINE_LIMITS.uri} ตัวอักษร`);
      else if (!isSafeUri(action.uri)) errors.push('URL ต้องขึ้นต้นด้วย https://, http://, line:// หรือ tel:');
      break;
    case 'message':
      if (!action.text?.trim()) errors.push('ยังไม่ได้ใส่ข้อความ');
      else if (action.text.length > LINE_LIMITS.messageText) errors.push(`ข้อความยาวเกิน ${LINE_LIMITS.messageText} ตัวอักษร`);
      break;
    case 'richmenuswitch':
      if (!action.richMenuAliasId) errors.push('ยังไม่ได้เลือกแท็บปลายทาง');
      else if (!ALIAS_ID_PATTERN.test(action.richMenuAliasId)) errors.push('Alias ID ใช้ได้เฉพาะ a-z, 0-9, _ และ - (สูงสุด 32 ตัว)');
      else if (knownAliases && !knownAliases.includes(action.richMenuAliasId)) {
        errors.push(`ไม่พบแท็บที่มี Alias “${action.richMenuAliasId}”`);
      }
      if (action.data && action.data.length > LINE_LIMITS.postbackData) errors.push(`data ยาวเกิน ${LINE_LIMITS.postbackData} ตัวอักษร`);
      break;
    case 'postback':
      if (!action.data) errors.push('ยังไม่ได้ใส่ postback data');
      else if (action.data.length > LINE_LIMITS.postbackData) errors.push(`data ยาวเกิน ${LINE_LIMITS.postbackData} ตัวอักษร`);
      if (action.displayText && action.displayText.length > LINE_LIMITS.postbackDisplayText) {
        errors.push(`displayText ยาวเกิน ${LINE_LIMITS.postbackDisplayText} ตัวอักษร`);
      }
      break;
  }
  return errors;
}

/** LINE action object — only the fields LINE accepts for each type. */
export type LineAction =
  | { type: 'uri'; label?: string; uri: string }
  | { type: 'message'; label?: string; text: string }
  | { type: 'richmenuswitch'; label?: string; richMenuAliasId: string; data: string }
  | { type: 'postback'; label?: string; data: string; displayText?: string };

/** Convert editor action to a LINE action object. Returns null for `none`. */
export function toLineAction(action: AreaAction): LineAction | null {
  const label = action.label?.trim() ? { label: action.label.trim() } : {};
  switch (action.type) {
    case 'uri':
      return { type: 'uri', ...label, uri: action.uri ?? '' };
    case 'message':
      return { type: 'message', ...label, text: action.text ?? '' };
    case 'richmenuswitch': {
      const alias = action.richMenuAliasId ?? '';
      return { type: 'richmenuswitch', ...label, richMenuAliasId: alias, data: action.data || `switch-to-${alias}` };
    }
    case 'postback':
      return {
        type: 'postback',
        ...label,
        data: action.data ?? '',
        ...(action.displayText ? { displayText: action.displayText } : {}),
      };
    default:
      return null;
  }
}

/** Reset action fields when switching type so stale fields never leak into the payload. */
export function changeActionType(action: AreaAction, type: ActionType): AreaAction {
  const base: AreaAction = { type, ...(action.label ? { label: action.label } : {}) };
  switch (type) {
    case 'uri':
      return { ...base, uri: action.uri ?? '' };
    case 'message':
      return { ...base, text: action.text ?? '' };
    case 'richmenuswitch':
      return { ...base, richMenuAliasId: action.richMenuAliasId ?? '' };
    case 'postback':
      return { ...base, data: action.data ?? '', displayText: action.displayText };
    default:
      return base;
  }
}

