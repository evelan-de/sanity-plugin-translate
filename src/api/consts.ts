export const MEDIA_OBJECTS = [
  'media',
  'icon',
  'mainImage',
  'sanityIcon',
  'productImage',
];

// Default translatable field keys (moved from TranslationService)
export const DEFAULT_TRANSLATABLE_FIELD_KEYS = [
  'altText',
  'label',
  'text', // Usually this is the field name that comes from the Block Content structure that is part from "children"
  'title',
  'seoTitle',
  'description',
  'subline',
  'caption',
  'emailSubject',
  'isRequiredErrorMessage',
  'errorTitle',
  'actionButtonLabel',
  'placeholder',
  'featHeader',
  'conHeader',
  'proHeader',
  'faqHeader',
  'teaser',
  'jobTitle',
  'supportingText', // For the Testimonial stats (in Multi-card layout)
  'statNumber', // For the Testimonial stats (in Multi-card layout)
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
];

// Default translatable array field keys (moved from TranslationService)
export const DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS = ['keywords'];
