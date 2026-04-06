import type { SocialTemplate } from './types';

const TEMPLATES: SocialTemplate[] = [
  {
    id: 'quote-card',
    name: 'Quote Card',
    category: 'educational',
    description: 'Display an inspirational or educational quote with attribution.',
    textSlots: ['quote_text', 'attribution'],
    textSlotLabels: { quote_text: 'Quote', attribution: 'Attribution' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'quick-tip',
    name: 'Quick Tip',
    category: 'quick_tips',
    description: 'Share a numbered quick tip with supporting text.',
    textSlots: ['tip_number', 'tip_text'],
    textSlotLabels: { tip_number: 'Tip Number', tip_text: 'Tip Text' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'promo-cta',
    name: 'Promo CTA',
    category: 'promotional',
    description: 'Promotional post with a headline and call to action.',
    textSlots: ['headline', 'cta_text'],
    textSlotLabels: { headline: 'Headline', cta_text: 'Call to Action' },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'testimonial',
    name: 'Testimonial',
    category: 'customer_stories',
    description: 'Showcase a customer testimonial with name and role.',
    textSlots: ['testimonial_text', 'customer_name', 'customer_role'],
    textSlotLabels: {
      testimonial_text: 'Testimonial',
      customer_name: 'Customer Name',
      customer_role: 'Role / Company',
    },
    format: ['1080x1080', '1080x1920'],
  },
  {
    id: 'behind-scenes',
    name: 'Behind the Scenes',
    category: 'behind_the_scenes',
    description: 'Give followers a behind-the-scenes look with a caption.',
    textSlots: ['caption_text'],
    textSlotLabels: { caption_text: 'Caption' },
    format: ['1080x1080', '1080x1920'],
  },
];

export function getAllTemplates(): SocialTemplate[] {
  return TEMPLATES;
}

export function getTemplate(id: string): SocialTemplate | undefined {
  return TEMPLATES.find((t) => t.id === id);
}

export function getTemplateForCategory(category: string): SocialTemplate | undefined {
  return TEMPLATES.find((t) => t.category === category);
}
