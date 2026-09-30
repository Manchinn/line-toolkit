export type CardTemplate = 'person' | 'product';

export type CardCtaType = 'uri' | 'message' | 'postback';

export interface CardCta {
  label: string;
  type: CardCtaType;
  /** URL for `uri`, text for `message`, data for `postback`. */
  value: string;
}

export interface FlexCard {
  id: string;
  template: CardTemplate;
  /** Public HTTPS image URL (LINE fetches it — data URLs are not allowed). */
  imageUrl: string;
  tag: string;
  title: string;
  /** Person: role/specialty. Product: price line. */
  subtitle: string;
  description: string;
  cta: CardCta;
  /** Optional second button. */
  secondaryCta?: CardCta;
  /** When true, omits the CTA footer buttons (Pure Image / No CTA mode). */
  noCta?: boolean;
}

export const CARD_TEMPLATE_META: Record<
  CardTemplate,
  { label: string; subtitleLabel: string; aspectRatio: string; tagColor: string; tagBg: string }
> = {
  person: {
    label: 'บุคคล (Person / Tutor / Doctor)',
    subtitleLabel: 'ตำแหน่ง / ความเชี่ยวชาญ',
    aspectRatio: '1:1',
    tagColor: '#0B7A3E',
    tagBg: '#E6F4EC',
  },
  product: {
    label: 'สินค้า (Product)',
    subtitleLabel: 'ราคา',
    aspectRatio: '20:13',
    tagColor: '#B45309',
    tagBg: '#FEF3E2',
  },
};

export const FLEX_LIMITS = {
  maxCarouselBubbles: 12,
  altText: 400,
  buttonLabel: 40,
  imageUrl: 2000,
} as const;
