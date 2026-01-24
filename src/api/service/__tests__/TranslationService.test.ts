import { beforeEach, describe, expect, it } from 'vitest';

import { clearBlockContentMap } from '../../utils/blockContentUtils';
import {
  mapFieldsToTranslate,
  replaceTranslations,
} from '../TranslationService';

type TranslatableFieldKey = string | { type: string[]; key: string };

const defaultFieldKeys: TranslatableFieldKey[] = [
  'title',
  'label',
  'description',
  'subline',
  'text',
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
];

const defaultArrayFieldKeys = ['keywords'];

describe('mapFieldsToTranslate', () => {
  beforeEach(() => {
    clearBlockContentMap();
  });

  it('collects simple string fields matching translatable keys', () => {
    const data = {
      _type: 'page',
      title: 'Page Title',
      description: 'Page Description',
      slug: 'page-slug', // not translatable
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toContainEqual({
      key: 'title',
      value: 'Page Title',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'description',
      value: 'Page Description',
    });
    // 'slug' is not in defaultFieldKeys
    const slugField = fieldsToTranslate.find((f) => f.value === 'page-slug');
    expect(slugField).toBeUndefined();
  });

  it('skips empty and whitespace-only strings', () => {
    const data = {
      _type: 'page',
      title: '',
      description: '   ',
      label: 'Valid',
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toHaveLength(1);
    expect(fieldsToTranslate[0]).toEqual({ key: 'label', value: 'Valid' });
  });

  it('handles type-specific field definitions', () => {
    const data = {
      _type: 'form',
      name: 'Contact Form',
      title: 'Form Title',
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'form',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    // 'name' should be collected for 'form' type
    expect(fieldsToTranslate).toContainEqual({
      key: 'name',
      value: 'Contact Form',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'title',
      value: 'Form Title',
    });
  });

  it('skips name field for types not in the definition', () => {
    const data = {
      _type: 'page',
      name: 'Some Name',
      title: 'Page Title',
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    // 'name' should NOT be collected for 'page' type
    const nameField = fieldsToTranslate.find((f) => f.value === 'Some Name');
    expect(nameField).toBeUndefined();
    expect(fieldsToTranslate).toContainEqual({
      key: 'title',
      value: 'Page Title',
    });
  });

  it('recursively collects fields from nested objects', () => {
    const data = {
      _type: 'page',
      title: 'Top Level',
      seo: {
        _type: 'seo',
        title: 'SEO Title',
        description: 'SEO Description',
      },
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toContainEqual({
      key: 'title',
      value: 'Top Level',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'seo.title',
      value: 'SEO Title',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'seo.description',
      value: 'SEO Description',
    });
  });

  it('handles deeply nested objects with correct paths', () => {
    const data = {
      _type: 'page',
      content: {
        _type: 'content',
        hero: {
          _type: 'hero',
          title: 'Hero Title',
          cta: {
            _type: 'link',
            label: 'Click',
          },
        },
      },
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toContainEqual({
      key: 'content.hero.title',
      value: 'Hero Title',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'content.hero.cta.label',
      value: 'Click',
    });
  });

  it('collects array fields marked as translatable', () => {
    const data = {
      _type: 'page',
      title: 'Page',
      keywords: ['keyword1', 'keyword2'],
    };

    const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(arrayFieldsToTranslate).toContainEqual({
      key: 'keywords',
      value: ['keyword1', 'keyword2'],
    });
    expect(fieldsToTranslate).toContainEqual({ key: 'title', value: 'Page' });
  });

  it('skips _translations key', () => {
    const data = {
      _type: 'page',
      title: 'Page Title',
      _translations: { en: { title: 'English' } },
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toHaveLength(1);
    expect(fieldsToTranslate[0]).toEqual({ key: 'title', value: 'Page Title' });
  });

  it('handles block content arrays', () => {
    const data = {
      _type: 'page',
      body: [
        {
          _type: 'block',
          children: [{ _type: 'span', text: 'Hello block', marks: [] }],
          style: 'normal',
        },
      ],
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    // Block content text should be collected (with uuid key)
    const blockField = fieldsToTranslate.find((f) => f.value === 'Hello block');
    expect(blockField).toBeDefined();
  });

  it('handles block content with custom block types containing nested objects', () => {
    const data = {
      _type: 'page',
      body: [
        {
          _type: 'block',
          children: [{ _type: 'span', text: 'Intro text', marks: [] }],
          style: 'normal',
        },
        {
          _type: 'ctaSection',
          _key: 'cta1',
          title: 'CTA Title',
          primaryCta: {
            _type: 'link',
            label: 'Button Label',
            subline: 'Button Subline',
          },
        },
      ],
    };

    const { fieldsToTranslate } = mapFieldsToTranslate(
      data,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    // Direct string on custom block
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.title',
      value: 'CTA Title',
    });

    // Nested object fields
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.primaryCta.label',
      value: 'Button Label',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.primaryCta.subline',
      value: 'Button Subline',
    });
  });

  it('returns empty arrays for null data', () => {
    const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(
      null,
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toHaveLength(0);
    expect(arrayFieldsToTranslate).toHaveLength(0);
  });

  it('returns empty arrays for non-object data', () => {
    const { fieldsToTranslate, arrayFieldsToTranslate } = mapFieldsToTranslate(
      'string',
      'page',
      '',
      defaultFieldKeys,
      defaultArrayFieldKeys,
    );

    expect(fieldsToTranslate).toHaveLength(0);
    expect(arrayFieldsToTranslate).toHaveLength(0);
  });
});

describe('replaceTranslations', () => {
  beforeEach(() => {
    clearBlockContentMap();
  });

  it('replaces string fields using translation map', () => {
    const obj: Record<string, unknown> = {
      title: 'Original Title',
      description: 'Original Description',
    };

    const fieldsToTranslate = [
      { key: 'title', value: 'Original Title' },
      { key: 'description', value: 'Original Description' },
    ];

    const translationMap = new Map<string, string>();
    translationMap.set('title', 'Translated Title');
    translationMap.set('description', 'Translated Description');

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: [],
      fieldsToTranslate,
      translationMap,
      translatableArrayFieldKeys: [],
    });

    expect(obj.title).toBe('Translated Title');
    expect(obj.description).toBe('Translated Description');
  });

  it('replaces string fields using batched translations array', () => {
    const obj: Record<string, unknown> = {
      title: 'Original',
      label: 'Button',
    };

    const fieldsToTranslate = [
      { key: 'title', value: 'Original' },
      { key: 'label', value: 'Button' },
    ];

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: ['Übersetzt', 'Knopf'],
      fieldsToTranslate,
      translatableArrayFieldKeys: [],
    });

    expect(obj.title).toBe('Übersetzt');
    expect(obj.label).toBe('Knopf');
  });

  it('recursively replaces fields in nested objects', () => {
    const obj: Record<string, unknown> = {
      title: 'Top',
      seo: {
        title: 'SEO Title',
        description: 'SEO Desc',
      },
    };

    const fieldsToTranslate = [
      { key: 'title', value: 'Top' },
      { key: 'seo.title', value: 'SEO Title' },
      { key: 'seo.description', value: 'SEO Desc' },
    ];

    const translationMap = new Map<string, string>();
    translationMap.set('title', 'Oben');
    translationMap.set('seo.title', 'SEO Titel');
    translationMap.set('seo.description', 'SEO Beschreibung');

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: [],
      fieldsToTranslate,
      translationMap,
      translatableArrayFieldKeys: [],
    });

    expect(obj.title).toBe('Oben');
    expect((obj.seo as any).title).toBe('SEO Titel');
    expect((obj.seo as any).description).toBe('SEO Beschreibung');
  });

  it('replaces translatable array fields', () => {
    const obj: Record<string, unknown> = {
      keywords: ['apple', 'banana'],
    };

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [
        { key: 'keywords', value: ['Apfel', 'Banane'] },
      ],
      batchedTranslations: [],
      fieldsToTranslate: [],
      translatableArrayFieldKeys: ['keywords'],
    });

    expect(obj.keywords).toEqual(['Apfel', 'Banane']);
  });

  it('skips _translations key', () => {
    const obj: Record<string, unknown> = {
      title: 'Page',
      _translations: { en: { title: 'English' } },
    };

    const fieldsToTranslate = [{ key: 'title', value: 'Page' }];
    const translationMap = new Map<string, string>();
    translationMap.set('title', 'Seite');

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: [],
      fieldsToTranslate,
      translationMap,
      translatableArrayFieldKeys: [],
    });

    expect(obj.title).toBe('Seite');
    expect((obj._translations as any).en.title).toBe('English'); // unchanged
  });

  it('does not replace fields that do not match value', () => {
    const obj: Record<string, unknown> = {
      title: 'Different Value',
    };

    const fieldsToTranslate = [{ key: 'title', value: 'Original Value' }];
    const translationMap = new Map<string, string>();
    translationMap.set('title', 'Translated');

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: [],
      fieldsToTranslate,
      translationMap,
      translatableArrayFieldKeys: [],
    });

    // Should NOT be replaced because value doesn't match
    expect(obj.title).toBe('Different Value');
  });

  it('handles deeply nested objects with path-based keys', () => {
    const obj: Record<string, unknown> = {
      content: {
        hero: {
          cta: {
            label: 'Click Me',
          },
        },
      },
    };

    const fieldsToTranslate = [
      { key: 'content.hero.cta.label', value: 'Click Me' },
    ];

    const translationMap = new Map<string, string>();
    translationMap.set('content.hero.cta.label', 'Klick Mich');

    replaceTranslations({
      obj,
      batchedArrayFieldTranslations: [],
      batchedTranslations: [],
      fieldsToTranslate,
      translationMap,
      translatableArrayFieldKeys: [],
    });

    expect((obj.content as any).hero.cta.label).toBe('Klick Mich');
  });

  it('handles null/non-object input gracefully', () => {
    expect(() =>
      replaceTranslations({
        obj: null,
        batchedArrayFieldTranslations: [],
        batchedTranslations: [],
        fieldsToTranslate: [],
        translatableArrayFieldKeys: [],
      }),
    ).not.toThrow();

    expect(() =>
      replaceTranslations({
        obj: 'string',
        batchedArrayFieldTranslations: [],
        batchedTranslations: [],
        fieldsToTranslate: [],
        translatableArrayFieldKeys: [],
      }),
    ).not.toThrow();
  });
});
