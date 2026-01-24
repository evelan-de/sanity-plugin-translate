import { describe, it, expect, beforeEach } from 'vitest';

import { clearBlockContentMap } from '../blockContentContext';
import { processBlockContent } from '../blockContentProcessing';

type FieldToTranslate = {
  key: string;
  value: string;
  context?: string;
  isHtml?: boolean;
};

type TranslatableFieldKey = string | { type: string[]; key: string };

// Default translatable field keys matching the plugin's consts
const translatableFieldKeys: TranslatableFieldKey[] = [
  'label',
  'title',
  'description',
  'subline',
  'text',
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
];

describe('processBlockContent - nested object fields in custom block types', () => {
  let fieldsToTranslate: FieldToTranslate[];

  beforeEach(() => {
    fieldsToTranslate = [];
    clearBlockContentMap();
  });

  it('collects translatable string fields from nested objects within custom blocks', () => {
    const blockContent = [
      {
        _type: 'block',
        _key: 'block1',
        children: [{ _type: 'span', text: 'Hello world', marks: [] }],
        style: 'normal',
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        title: 'Section Title',
        primaryCta: {
          _type: 'link',
          label: 'Click Me',
          subline: 'More info here',
          href: '/some-path',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Should collect the direct string field 'title' from the custom block
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.title',
      value: 'Section Title',
    });

    // Should collect 'label' from the nested primaryCta object
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.primaryCta.label',
      value: 'Click Me',
    });

    // Should collect 'subline' from the nested primaryCta object
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.1.primaryCta.subline',
      value: 'More info here',
    });
  });

  it('collects fields from multiple nested objects within a custom block', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'link',
          label: 'Primary Label',
          href: '/primary',
        },
        secondaryCta: {
          _type: 'link',
          label: 'Secondary Label',
          subline: 'Secondary subline',
          href: '/secondary',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.label',
      value: 'Primary Label',
    });

    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.secondaryCta.label',
      value: 'Secondary Label',
    });

    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.secondaryCta.subline',
      value: 'Secondary subline',
    });
  });

  it('recurses into deeply nested objects', () => {
    const blockContent = [
      {
        _type: 'heroSection',
        _key: 'hero1',
        content: {
          _type: 'heroContent',
          cta: {
            _type: 'link',
            label: 'Deep Label',
          },
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.content.cta.label',
      value: 'Deep Label',
    });
  });

  it('skips system fields (starting with _) in nested objects', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'link',
          _key: 'should-not-appear',
          label: 'Valid Label',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Should NOT collect _key or _type
    const systemFields = fieldsToTranslate.filter(
      (f) => f.value === 'should-not-appear' || f.value === 'link',
    );
    expect(systemFields).toHaveLength(0);

    // Should collect valid label
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.label',
      value: 'Valid Label',
    });
  });

  it('skips empty string fields in nested objects', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'link',
          label: '',
          subline: '   ',
          title: 'Valid Title',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Empty/whitespace-only strings should NOT be collected
    const emptyFields = fieldsToTranslate.filter(
      (f) => f.value.trim() === '',
    );
    expect(emptyFields).toHaveLength(0);

    // Valid non-empty title should be collected
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.title',
      value: 'Valid Title',
    });
  });

  it('only collects fields matching translatableFieldKeys', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'link',
          label: 'Translatable',
          href: '/not-translatable',
          someRandomField: 'Also not translatable',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // 'href' and 'someRandomField' are NOT in translatableFieldKeys
    expect(fieldsToTranslate).toHaveLength(1);
    expect(fieldsToTranslate[0]).toEqual({
      key: 'body.0.primaryCta.label',
      value: 'Translatable',
    });
  });

  it('respects type-specific field definitions in nested objects', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'form',
          name: 'Should be translated (form type)',
          label: 'Also translated',
        },
        secondaryCta: {
          _type: 'link',
          name: 'Should NOT be translated (link type not in name definition)',
          label: 'This is translated',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // 'name' field should only be collected for types in { type: ['form', 'pageCategory', 'category'], key: 'name' }
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.name',
      value: 'Should be translated (form type)',
    });

    // 'name' on 'link' type should NOT be collected
    const linkNameField = fieldsToTranslate.find(
      (f) => f.key === 'body.0.secondaryCta.name',
    );
    expect(linkNameField).toBeUndefined();

    // 'label' is a generic string key, so it works for any type
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.label',
      value: 'Also translated',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.secondaryCta.label',
      value: 'This is translated',
    });
  });

  it('handles nested objects alongside block content arrays in custom blocks', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        title: 'CTA Title',
        primaryCta: {
          _type: 'link',
          label: 'Click here',
        },
        content: [
          {
            _type: 'block',
            _key: 'nested-block1',
            children: [
              { _type: 'span', text: 'Block content text', marks: [] },
            ],
            style: 'normal',
          },
        ],
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Direct string field on custom block
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.title',
      value: 'CTA Title',
    });

    // Nested object field
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.label',
      value: 'Click here',
    });

    // Block content field (collected via UUID key in blockContentMap)
    const blockContentFields = fieldsToTranslate.filter(
      (f) => f.value === 'Block content text',
    );
    expect(blockContentFields).toHaveLength(1);
  });

  it('handles custom block at a non-zero index with correct path', () => {
    const blockContent = [
      {
        _type: 'block',
        _key: 'block1',
        children: [{ _type: 'span', text: 'First block', marks: [] }],
        style: 'normal',
      },
      {
        _type: 'block',
        _key: 'block2',
        children: [{ _type: 'span', text: 'Second block', marks: [] }],
        style: 'normal',
      },
      {
        _type: 'ctaSection',
        _key: 'cta1',
        primaryCta: {
          _type: 'link',
          label: 'CTA at index 2',
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'content.body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Nested object field with correct path (block at index 2)
    expect(fieldsToTranslate).toContainEqual({
      key: 'content.body.2.primaryCta.label',
      value: 'CTA at index 2',
    });
  });

  it('does not collect non-translatable nested arrays', () => {
    const blockContent = [
      {
        _type: 'ctaSection',
        _key: 'cta1',
        title: 'Section',
        tags: ['tag1', 'tag2'], // plain array, not block content
        primaryCta: {
          _type: 'link',
          label: 'Button',
          items: ['item1', 'item2'], // plain array inside nested object
        },
      },
    ];

    processBlockContent(
      blockContent,
      'body',
      'body',
      fieldsToTranslate,
      translatableFieldKeys,
    );

    // Should only collect the string fields, not array values
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.title',
      value: 'Section',
    });
    expect(fieldsToTranslate).toContainEqual({
      key: 'body.0.primaryCta.label',
      value: 'Button',
    });

    // Should not have collected anything from the plain arrays
    const arrayFields = fieldsToTranslate.filter(
      (f) => f.value === 'tag1' || f.value === 'item1',
    );
    expect(arrayFields).toHaveLength(0);
  });
});
