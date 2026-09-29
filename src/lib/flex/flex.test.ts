import { describe, expect, it } from 'vitest';
import { buildBubble, buildFlexContents, buildFlexMessage, validateCards } from './builder';
import type { FlexCard } from './types';

function card(partial: Partial<FlexCard> = {}): FlexCard {
  return {
    id: 'c1',
    template: 'product',
    imageUrl: 'https://example.com/a.jpg',
    tag: 'ใหม่',
    title: 'เสื้อยืด',
    subtitle: '฿390',
    description: 'ผ้าคอตตอน 100%',
    cta: { label: 'สั่งซื้อ', type: 'uri', value: 'https://shop.example.com' },
    ...partial,
  };
}

describe('flex builder', () => {
  it('builds a bubble with hero, body and footer button', () => {
    const bubble = buildBubble(card());
    expect(bubble.type).toBe('bubble');
    expect(bubble.hero?.url).toBe('https://example.com/a.jpg');
    expect(bubble.hero?.aspectRatio).toBe('20:13');
    expect(bubble.footer?.contents[0]).toMatchObject({
      type: 'button',
      action: { type: 'uri', label: 'สั่งซื้อ', uri: 'https://shop.example.com' },
    });
  });

  it('omits hero and empty text components (LINE rejects empty text)', () => {
    const bubble = buildBubble(card({ imageUrl: '', tag: '', description: '  ' }));
    expect(bubble.hero).toBeUndefined();
    const json = JSON.stringify(bubble);
    expect(json).not.toContain('"text":""');
    expect(bubble.body.contents).toHaveLength(2); // title + price
  });

  it('one card → bubble, many → carousel capped at 12', () => {
    expect(buildFlexContents([card()]).type).toBe('bubble');
    const many = Array.from({ length: 15 }, (_, i) => card({ id: `c${i}` }));
    const carousel = buildFlexContents(many);
    expect(carousel.type).toBe('carousel');
    if (carousel.type === 'carousel') expect(carousel.contents).toHaveLength(12);
  });

  it('flex message has altText fallback', () => {
    expect(buildFlexMessage([card()], '').altText).toBe('เสื้อยืด');
  });

  it('person template uses square hero', () => {
    expect(buildBubble(card({ template: 'person' })).hero?.aspectRatio).toBe('1:1');
  });

  it('validates image URL, CTA URL and titles', () => {
    expect(validateCards([card()])).toEqual([]);
    const issues = validateCards([
      card({ imageUrl: 'http://insecure.com/a.jpg', title: '', cta: { label: 'x', type: 'uri', value: 'javascript:1' } }),
    ]);
    expect(issues).toHaveLength(3);
  });
});
