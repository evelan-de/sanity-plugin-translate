import { describe, it, expect } from 'vitest';

import {
  isBlockContent,
  isValidSpan,
  shouldUseHtmlForBlock,
} from '../blockContentDetection';

describe('isBlockContent', () => {
  it('returns true for a valid block content array', () => {
    const array = [
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'Hello' }],
      },
    ];
    expect(isBlockContent(array)).toBe(true);
  });

  it('returns true when array has multiple blocks including one with spans', () => {
    const array = [
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'First' }],
      },
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'Second' }],
      },
    ];
    expect(isBlockContent(array)).toBe(true);
  });

  it('returns true when array has mix of blocks and custom types', () => {
    const array = [
      {
        _type: 'block',
        children: [{ _type: 'span', text: 'Hello' }],
      },
      {
        _type: 'ctaSection',
        title: 'Custom',
      },
    ];
    expect(isBlockContent(array)).toBe(true);
  });

  it('returns false for an empty array', () => {
    expect(isBlockContent([])).toBe(false);
  });

  it('returns false for null/undefined', () => {
    expect(isBlockContent(null as any)).toBe(false);
    expect(isBlockContent(undefined as any)).toBe(false);
  });

  it('returns false when no items have _type block', () => {
    const array = [
      { _type: 'image', src: 'photo.jpg' },
      { _type: 'ctaSection', title: 'Custom' },
    ];
    expect(isBlockContent(array)).toBe(false);
  });

  it('returns false when block has no children with spans', () => {
    const array = [
      {
        _type: 'block',
        children: [{ _type: 'image', src: 'inline.jpg' }],
      },
    ];
    expect(isBlockContent(array)).toBe(false);
  });

  it('returns false when block has no children property', () => {
    const array = [{ _type: 'block' }];
    expect(isBlockContent(array)).toBe(false);
  });

  it('returns false for non-array input', () => {
    expect(isBlockContent('string' as any)).toBe(false);
  });
});

describe('isValidSpan', () => {
  it('returns true for a valid span with text', () => {
    expect(isValidSpan({ _type: 'span', text: 'Hello' })).toBe(true);
  });

  it('returns true for span with empty string text', () => {
    expect(isValidSpan({ _type: 'span', text: '' })).toBe(true);
  });

  it('returns falsy for null', () => {
    expect(isValidSpan(null)).toBeFalsy();
  });

  it('returns falsy for undefined', () => {
    expect(isValidSpan(undefined)).toBeFalsy();
  });

  it('returns false for non-span type', () => {
    expect(isValidSpan({ _type: 'image', text: 'Hello' })).toBe(false);
  });

  it('returns false when text is not a string', () => {
    expect(isValidSpan({ _type: 'span', text: 123 })).toBe(false);
  });

  it('returns false when text property is missing', () => {
    expect(isValidSpan({ _type: 'span' })).toBe(false);
  });
});

describe('shouldUseHtmlForBlock', () => {
  it('returns false for a simple block with one child and no marks', () => {
    const block = {
      _type: 'block',
      children: [{ _type: 'span', text: 'Simple', marks: [] }],
    };
    expect(shouldUseHtmlForBlock(block)).toBe(false);
  });

  it('returns true when a child has marks', () => {
    const block = {
      _type: 'block',
      children: [{ _type: 'span', text: 'Bold text', marks: ['strong'] }],
    };
    expect(shouldUseHtmlForBlock(block)).toBe(true);
  });

  it('returns true when block has markDefs', () => {
    const block = {
      _type: 'block',
      markDefs: [{ _key: 'link1', _type: 'link', href: 'https://example.com' }],
      children: [{ _type: 'span', text: 'Link text', marks: [] }],
    };
    expect(shouldUseHtmlForBlock(block)).toBe(true);
  });

  it('returns true when block has multiple children', () => {
    const block = {
      _type: 'block',
      children: [
        { _type: 'span', text: 'First', marks: [] },
        { _type: 'span', text: 'Second', marks: [] },
      ],
    };
    expect(shouldUseHtmlForBlock(block)).toBe(true);
  });

  it('returns false for non-block type', () => {
    const block = {
      _type: 'image',
      children: [{ _type: 'span', text: 'text', marks: ['strong'] }],
    };
    expect(shouldUseHtmlForBlock(block)).toBe(false);
  });

  it('returns false for null input', () => {
    expect(shouldUseHtmlForBlock(null)).toBe(false);
  });

  it('returns false for block without children', () => {
    const block = { _type: 'block' };
    expect(shouldUseHtmlForBlock(block)).toBe(false);
  });

  it('returns false when children is not an array', () => {
    const block = { _type: 'block', children: 'not-an-array' };
    expect(shouldUseHtmlForBlock(block)).toBe(false);
  });
});
