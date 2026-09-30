import { describe, expect, it } from 'vitest';
import { createCard, mergePersisted, useCardStore } from './card-store';

const current = useCardStore.getState();

describe('mergePersisted (card store rehydration)', () => {
  it('restores a valid snapshot', () => {
    const card = { ...createCard('product'), title: 'สินค้าที่บันทึกไว้', noCta: true };
    const merged = mergePersisted({ cards: [card], selectedCardId: card.id, altText: 'alt' }, current);
    expect(merged.cards).toEqual([card]);
    expect(merged.cards[0].noCta).toBe(true);
    expect(merged.selectedCardId).toBe(card.id);
    expect(merged.altText).toBe('alt');
    expect(typeof merged.addCard).toBe('function'); // actions are kept
  });

  it('falls back to defaults on corrupted or tampered data', () => {
    expect(mergePersisted(null, current)).toBe(current);
    expect(mergePersisted({ cards: 'x', altText: '' }, current)).toBe(current);
    const bad = { ...createCard('person'), cta: { label: 'x', type: 'evil', value: '' } };
    expect(mergePersisted({ cards: [bad], selectedCardId: null, altText: '' }, current)).toBe(current);
  });

  it('repairs a dangling selection and caps the carousel at 12', () => {
    const cards = Array.from({ length: 15 }, () => createCard('person'));
    const merged = mergePersisted({ cards, selectedCardId: 'gone', altText: '' }, current);
    expect(merged.cards).toHaveLength(12);
    expect(merged.selectedCardId).toBe(cards[0].id);
  });
});
