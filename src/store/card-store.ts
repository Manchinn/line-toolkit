'use client';

import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { CardCta, CardTemplate, FlexCard } from '@/lib/flex/types';
import { FLEX_LIMITS } from '@/lib/flex/types';

function createCardId() {
  return `card_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
}

export function createCard(template: CardTemplate): FlexCard {
  if (template === 'person') {
    return {
      id: createCardId(),
      template,
      imageUrl: '',
      tag: 'ว่างวันนี้',
      title: 'ครูสมชาย ใจดี',
      subtitle: 'ติวคณิตศาสตร์ ม.ปลาย',
      description: 'ประสบการณ์สอน 10 ปี เน้นเข้าใจพื้นฐานและเทคนิคทำข้อสอบ',
      cta: { label: 'จองคิว', type: 'message', value: 'ขอจองคิวกับครูสมชาย' },
      secondaryCta: { label: 'ดูโปรไฟล์', type: 'uri', value: 'https://line.me' },
    };
  }
  return {
    id: createCardId(),
    template,
    imageUrl: '',
    tag: 'ขายดี',
    title: 'ชื่อสินค้า',
    subtitle: '฿390',
    description: 'รายละเอียดสินค้าแบบสั้น 1–2 บรรทัด',
    cta: { label: 'สั่งซื้อเลย', type: 'uri', value: 'https://line.me' },
  };
}

interface CardState {
  cards: FlexCard[];
  selectedCardId: string | null;
  altText: string;
  addCard: (template: CardTemplate) => void;
  updateCard: (card: FlexCard) => void;
  duplicateCard: (id: string) => void;
  deleteCard: (id: string) => void;
  moveCard: (id: string, direction: -1 | 1) => void;
  selectCard: (id: string | null) => void;
  setAltText: (altText: string) => void;
}

const initialCards = [createCard('person'), createCard('product')];

const STORAGE_KEY = 'line-toolkit-cards';

type PersistedCardState = Pick<CardState, 'cards' | 'selectedCardId' | 'altText'>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isCta(value: unknown): value is CardCta {
  return (
    isRecord(value) &&
    typeof value.label === 'string' &&
    typeof value.value === 'string' &&
    (value.type === 'uri' || value.type === 'message' || value.type === 'postback')
  );
}

function isFlexCard(value: unknown): value is FlexCard {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    (value.template === 'person' || value.template === 'product') &&
    ['imageUrl', 'tag', 'title', 'subtitle', 'description'].every((k) => typeof value[k] === 'string') &&
    isCta(value.cta) &&
    (value.secondaryCta === undefined || isCta(value.secondaryCta))
  );
}

/** localStorage is untrusted: keep the defaults unless the stored snapshot is fully valid. */
export function mergePersisted(persisted: unknown, current: CardState): CardState {
  if (!isRecord(persisted) || !Array.isArray(persisted.cards) || typeof persisted.altText !== 'string') return current;
  const cards = persisted.cards.slice(0, FLEX_LIMITS.maxCarouselBubbles);
  if (!cards.every(isFlexCard)) return current;
  const selectedCardId =
    typeof persisted.selectedCardId === 'string' && cards.some((c) => c.id === persisted.selectedCardId)
      ? persisted.selectedCardId
      : (cards[0]?.id ?? null);
  return { ...current, cards, selectedCardId, altText: persisted.altText };
}

export const useCardStore = create<CardState>()(
  persist(
    (set, get) => ({
      cards: initialCards,
      selectedCardId: initialCards[0].id,
      altText: 'แนะนำสำหรับคุณ',

      addCard: (template) => {
        if (get().cards.length >= FLEX_LIMITS.maxCarouselBubbles) return;
        const card = createCard(template);
        set({ cards: [...get().cards, card], selectedCardId: card.id });
      },

      updateCard: (card) => {
        set({ cards: get().cards.map((c) => (c.id === card.id ? card : c)) });
      },

      duplicateCard: (id) => {
        const { cards } = get();
        const idx = cards.findIndex((c) => c.id === id);
        if (idx < 0 || cards.length >= FLEX_LIMITS.maxCarouselBubbles) return;
        const copy: FlexCard = { ...cards[idx], id: createCardId() };
        set({ cards: [...cards.slice(0, idx + 1), copy, ...cards.slice(idx + 1)], selectedCardId: copy.id });
      },

      deleteCard: (id) => {
        const { cards, selectedCardId } = get();
        const next = cards.filter((c) => c.id !== id);
        set({ cards: next, selectedCardId: selectedCardId === id ? (next[0]?.id ?? null) : selectedCardId });
      },

      moveCard: (id, direction) => {
        const cards = [...get().cards];
        const idx = cards.findIndex((c) => c.id === id);
        const target = idx + direction;
        if (idx < 0 || target < 0 || target >= cards.length) return;
        [cards[idx], cards[target]] = [cards[target], cards[idx]];
        set({ cards });
      },

      selectCard: (id) => set({ selectedCardId: id }),
      setAltText: (altText) => set({ altText }),
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => localStorage),
      // Rehydrated from CardStudio after mount so SSR and first client render match.
      skipHydration: true,
      partialize: (state): PersistedCardState => ({
        cards: state.cards,
        selectedCardId: state.selectedCardId,
        altText: state.altText,
      }),
      merge: mergePersisted,
      migrate: (persistedState) => persistedState as PersistedCardState,
    }
  )
);
