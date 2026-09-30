import { describe, it, expect } from 'vitest';
import { buildFlexMessage } from './builder';
import { buildRichMenuPayload, validateTab } from '../richmenu/payload';
import type { FlexCard } from './types';
import type { RichMenuTab } from '@/types/line';

describe('E2E Data Verification for LINE OA Manager Setup', () => {
  it('builds valid 3-card Person Flex Carousel payload', () => {
    const cards: FlexCard[] = [
      {
        id: 'card_1',
        template: 'person',
        imageUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600',
        tag: 'คณิตศาสตร์',
        title: 'ครูสมชาย ใจดี',
        subtitle: 'ติวคณิตศาสตร์ ม.ปลาย & ตะลุยโจทย์',
        description: 'ประสบการณ์สอน 10 ปี เน้นปูพื้นฐานและเทคนิคทำข้อสอบ',
        cta: { label: 'ราคาคอร์สเรียน', type: 'message', value: 'ราคาคอร์สเรียน' },
        secondaryCta: { label: 'ดูโปรไฟล์', type: 'uri', value: 'https://line.me' },
      },
      {
        id: 'card_2',
        template: 'person',
        imageUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=600',
        tag: 'ภาษาอังกฤษ',
        title: 'ครูสมหญิง เก่งอังกฤษ',
        subtitle: 'ภาษาอังกฤษ & IELTS',
        description: 'เน้นสื่อสารและเก็งข้อสอบตรงจุด ประสบการณ์ 8 ปี',
        cta: { label: 'ราคาคอร์สเรียนตัวต่อตัว', type: 'message', value: 'ราคาคอร์สเรียนตัวต่อตัว' },
        secondaryCta: { label: 'ผลงานติวเตอร์', type: 'uri', value: 'https://line.me' },
      },
      {
        id: 'card_3',
        template: 'person',
        imageUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600',
        tag: 'ฟิสิกส์',
        title: 'ครูมานะ ฟิสิกส์แม่น',
        subtitle: 'ฟิสิกส์ ม.4-6 & A-Level',
        description: 'ติวฟิสิกส์เข้าใจง่าย ไม่ต้องท่องจำสูตร',
        cta: { label: 'สอบถามเพิ่มเติม', type: 'message', value: 'สอบถามเพิ่มเติม' },
        secondaryCta: { label: 'ทดลองเรียนฟรี', type: 'uri', value: 'https://line.me' },
      },
    ];

    const flexMsg = buildFlexMessage(cards, 'แนะนำคอร์สเรียนและติวเตอร์');
    expect(flexMsg.type).toBe('flex');
    expect(flexMsg.altText).toBe('แนะนำคอร์สเรียนและติวเตอร์');
    expect(flexMsg.contents.type).toBe('carousel');
    if (flexMsg.contents.type === 'carousel') {
      expect(flexMsg.contents.contents.length).toBe(3);
      for (const bubble of flexMsg.contents.contents) {
        expect(bubble.hero?.type).toBe('image');
        expect(bubble.hero?.aspectRatio).toBe('1:1');
      }
    }
  });

  it('builds valid Compact 2500x843 Rich Menu with 3 action links', () => {
    const compactTab: RichMenuTab = {
      id: 'tab_courses',
      title: 'เมนูคอร์สเรียนและติวเตอร์',
      aliasId: 'tab-courses',
      selected: true,
      chatBarText: 'เมนูคอร์สเรียน',
      size: { width: 2500, height: 843 },
      areas: [
        {
          id: 'area_1',
          label: 'ราคาคอร์สเรียน',
          bounds: { x: 0, y: 0, width: 833, height: 843 },
          action: {
            type: 'message',
            label: 'ราคาคอร์สเรียน',
            text: 'ราคาคอร์สเรียน',
          },
        },
        {
          id: 'area_2',
          label: 'ปุ่ม 2: ตัวต่อตัว',
          bounds: { x: 833, y: 0, width: 834, height: 843 },
          action: {
            type: 'message',
            label: 'คอร์สตัวต่อตัว',
            text: 'ราคาคอร์สเรียนตัวต่อตัว',
          },
        },
        {
          id: 'area_3',
          label: 'สอบถามเพิ่มเติม',
          bounds: { x: 1667, y: 0, width: 833, height: 843 },
          action: {
            type: 'message',
            label: 'สอบถามเพิ่มเติม',
            text: 'สอบถามเพิ่มเติม',
          },
        },
      ],
    };

    // Validation must pass with zero issues
    const issues = validateTab(compactTab, ['tab-courses']);
    expect(issues).toEqual([]);

    // Build payload according to LINE Messaging API spec
    const payload = buildRichMenuPayload(compactTab);
    expect(payload.size.width).toBe(2500);
    expect(payload.size.height).toBe(843);
    expect(payload.selected).toBe(true);
    expect(payload.name).toBe('เมนูคอร์สเรียนและติวเตอร์');
    expect(payload.chatBarText).toBe('เมนูคอร์สเรียน');
    expect(payload.areas.length).toBe(3);
    expect(payload.areas[0].action.type === 'message' && payload.areas[0].action.text).toBe('ราคาคอร์สเรียน');
    expect(payload.areas[1].action.type === 'message' && payload.areas[1].action.text).toBe('ราคาคอร์สเรียนตัวต่อตัว');
    expect(payload.areas[2].action.type === 'message' && payload.areas[2].action.text).toBe('สอบถามเพิ่มเติม');
  });
});
