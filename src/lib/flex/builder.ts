import { isSafeUri } from '@/lib/richmenu/actions';
import { CARD_TEMPLATE_META, FLEX_LIMITS, type CardCta, type FlexCard } from './types';

/* ---------- Flex JSON shapes (subset used by the studio) ---------- */

export type FlexAction =
  | { type: 'uri'; label: string; uri: string }
  | { type: 'message'; label: string; text: string }
  | { type: 'postback'; label: string; data: string; displayText?: string };

export interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  weight?: 'regular' | 'bold';
  color?: string;
  wrap?: boolean;
  maxLines?: number;
  margin?: string;
}

export interface FlexBox {
  type: 'box';
  layout: 'vertical' | 'horizontal' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingStart?: string;
  paddingEnd?: string;
  paddingTop?: string;
  paddingBottom?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  flex?: number;
}

export interface FlexButton {
  type: 'button';
  action: FlexAction;
  style: 'primary' | 'secondary' | 'link';
  height?: 'sm' | 'md';
  color?: string;
}

export interface FlexFiller {
  type: 'filler';
}

export type FlexComponent = FlexText | FlexBox | FlexButton | FlexFiller;

export interface FlexImage {
  type: 'image';
  url: string;
  size: 'full';
  aspectRatio: string;
  aspectMode: 'cover';
}

export interface FlexBubble {
  type: 'bubble';
  size: 'mega';
  hero?: FlexImage;
  body: FlexBox;
  footer?: FlexBox;
}

export interface FlexCarousel {
  type: 'carousel';
  contents: FlexBubble[];
}

export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble | FlexCarousel;
}

/* ---------- Builders ---------- */

const PRIMARY_COLOR = '#06C755';

function toFlexAction(cta: CardCta): FlexAction {
  const label = cta.label.trim().slice(0, FLEX_LIMITS.buttonLabel) || 'ดูเพิ่มเติม';
  switch (cta.type) {
    case 'message':
      return { type: 'message', label, text: cta.value || label };
    case 'postback':
      return { type: 'postback', label, data: cta.value || 'action=cta', displayText: label };
    default:
      return { type: 'uri', label, uri: cta.value };
  }
}

function text(value: string, extra: Omit<FlexText, 'type' | 'text'> = {}): FlexText | null {
  const trimmed = value.trim();
  return trimmed ? { type: 'text', text: trimmed, ...extra } : null;
}

function compact<T>(items: (T | null | undefined)[]): T[] {
  return items.filter((item): item is T => item != null);
}

export function buildBubble(card: FlexCard): FlexBubble {
  const meta = CARD_TEMPLATE_META[card.template];
  const isProduct = card.template === 'product';

  const tag = card.tag.trim()
    ? ({
        type: 'box',
        layout: 'horizontal',
        contents: [
          { type: 'box', layout: 'vertical', flex: 0, backgroundColor: meta.tagBg, cornerRadius: 'md',
            paddingStart: '8px', paddingEnd: '8px', paddingTop: '2px', paddingBottom: '2px',
            contents: [{ type: 'text', text: card.tag.trim(), size: 'xxs', color: meta.tagColor, weight: 'bold' }] },
          { type: 'filler' },
        ],
      } satisfies FlexBox)
    : null;

  const body: FlexBox = {
    type: 'box',
    layout: 'vertical',
    spacing: 'sm',
    paddingAll: '16px',
    contents: compact<FlexComponent>([
      tag,
      text(card.title || 'ไม่มีหัวข้อ', { size: 'lg', weight: 'bold', color: '#111111', wrap: true, maxLines: 2 }),
      text(
        card.subtitle,
        isProduct
          ? { size: 'md', weight: 'bold', color: PRIMARY_COLOR }
          : { size: 'sm', color: '#555555', wrap: true }
      ),
      text(card.description, { size: 'sm', color: '#8C8C8C', wrap: true, maxLines: 4, margin: 'sm' }),
    ]),
  };

  const hasPrimaryLabel = Boolean(card.cta.label.trim());
  const hasSecondaryLabel = Boolean(card.secondaryCta?.label.trim());
  const hideFooter = Boolean(card.noCta) || (!hasPrimaryLabel && !hasSecondaryLabel);

  const buttons = hideFooter
    ? []
    : compact<FlexButton>([
        hasPrimaryLabel
          ? { type: 'button', style: 'primary', height: 'sm', color: PRIMARY_COLOR, action: toFlexAction(card.cta) }
          : null,
        hasSecondaryLabel && card.secondaryCta
          ? { type: 'button', style: 'link', height: 'sm', color: '#555555', action: toFlexAction(card.secondaryCta) }
          : null,
      ]);

  const footer: FlexBox | undefined =
    !hideFooter && buttons.length > 0
      ? { type: 'box', layout: 'vertical', spacing: 'sm', paddingAll: '12px', contents: buttons }
      : undefined;

  return {
    type: 'bubble',
    size: 'mega',
    ...(card.imageUrl.trim()
      ? { hero: { type: 'image', url: card.imageUrl.trim(), size: 'full', aspectRatio: meta.aspectRatio, aspectMode: 'cover' } }
      : {}),
    body,
    ...(footer ? { footer } : {}),
  };
}

export const buildFlexBubble = buildBubble;

/** One card → bubble, 2+ cards → carousel (LINE max 12). */
export function buildFlexContents(cards: readonly FlexCard[]): FlexBubble | FlexCarousel {
  if (cards.length === 0) throw new Error('ต้องมีการ์ดอย่างน้อย 1 ใบ');
  const bubbles = cards.slice(0, FLEX_LIMITS.maxCarouselBubbles).map(buildBubble);
  return bubbles.length === 1 ? bubbles[0] : { type: 'carousel', contents: bubbles };
}

export function buildFlexMessage(cards: readonly FlexCard[], altText: string): FlexMessage {
  const alt = altText.trim().slice(0, FLEX_LIMITS.altText) || cards[0]?.title || 'Flex Message';
  return { type: 'flex', altText: alt, contents: buildFlexContents(cards) };
}

/* ---------- Validation ---------- */

export interface CardIssue {
  cardId?: string;
  message: string;
}

function validateCta(cta: CardCta, prefix: string): string[] {
  const errors: string[] = [];
  if (!cta.label.trim()) errors.push(`${prefix}: ยังไม่ได้ใส่ข้อความปุ่ม`);
  else if (cta.label.length > FLEX_LIMITS.buttonLabel) errors.push(`${prefix}: ข้อความปุ่มยาวเกิน ${FLEX_LIMITS.buttonLabel} ตัว`);
  if (cta.type === 'uri' && !isSafeUri(cta.value)) errors.push(`${prefix}: URL ไม่ถูกต้อง (ต้องเป็น https://, line:// หรือ tel:)`);
  if (cta.type === 'postback' && !cta.value.trim()) errors.push(`${prefix}: ยังไม่ได้ใส่ postback data`);
  return errors;
}

export function validateCards(cards: readonly FlexCard[]): CardIssue[] {
  const issues: CardIssue[] = [];
  if (cards.length === 0) issues.push({ message: 'ยังไม่มีการ์ด' });
  if (cards.length > FLEX_LIMITS.maxCarouselBubbles) {
    issues.push({ message: `Carousel รองรับสูงสุด ${FLEX_LIMITS.maxCarouselBubbles} ใบ (ใบที่เกินจะไม่ถูกส่งออก)` });
  }

  cards.forEach((card, idx) => {
    const name = `การ์ด #${idx + 1}`;
    const push = (message: string) => issues.push({ cardId: card.id, message });

    if (!card.title.trim()) push(`${name}: ยังไม่ได้ใส่หัวข้อ`);
    const url = card.imageUrl.trim();
    if (url) {
      if (!url.startsWith('https://')) push(`${name}: รูปต้องเป็น URL แบบ https:// (LINE ไม่รับ http หรือไฟล์ในเครื่อง)`);
      else if (url.length > FLEX_LIMITS.imageUrl) push(`${name}: URL รูปยาวเกิน ${FLEX_LIMITS.imageUrl} ตัว`);
    }
    if (!card.noCta) {
      if (card.cta.label.trim()) {
        validateCta(card.cta, `${name} ปุ่มหลัก`).forEach(push);
      }
      if (card.secondaryCta?.label.trim()) {
        validateCta(card.secondaryCta, `${name} ปุ่มรอง`).forEach(push);
      }
    }
  });

  return issues;
}
