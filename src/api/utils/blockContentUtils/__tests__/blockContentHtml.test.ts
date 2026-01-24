import { describe, expect, it } from 'vitest';

import {
  parseHtmlToBlockStructure,
  parseHtmlToSpans,
} from '../blockContentHtml';

describe('parseHtmlToSpans', () => {
  it('parses plain text into a single span', () => {
    const spans = parseHtmlToSpans('Hello world');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Hello world');
    expect(spans[0].marks).toEqual([]);
    expect(spans[0]._type).toBe('span');
  });

  it('parses bold text with strong tag', () => {
    const spans = parseHtmlToSpans('<strong>Bold text</strong>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Bold text');
    expect(spans[0].marks).toContain('strong');
  });

  it('parses italic text with em tag', () => {
    const spans = parseHtmlToSpans('<em>Italic text</em>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Italic text');
    expect(spans[0].marks).toContain('em');
  });

  it('parses underline text with u tag', () => {
    const spans = parseHtmlToSpans('<u>Underlined</u>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Underlined');
    expect(spans[0].marks).toContain('underline');
  });

  it('parses strikethrough text with s tag', () => {
    const spans = parseHtmlToSpans('<s>Struck</s>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Struck');
    expect(spans[0].marks).toContain('strike-through');
  });

  it('parses code text', () => {
    const spans = parseHtmlToSpans('<code>const x = 1</code>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('const x = 1');
    expect(spans[0].marks).toContain('code');
  });

  it('parses mixed marked and unmarked text', () => {
    const spans = parseHtmlToSpans('Hello <strong>world</strong> today');
    expect(spans.length).toBeGreaterThanOrEqual(2);

    const plainSpan = spans.find((s: any) => s.text.includes('Hello'));
    expect(plainSpan).toBeDefined();
    expect(plainSpan!.marks).toEqual([]);

    const boldSpan = spans.find((s: any) => s.text === 'world');
    expect(boldSpan).toBeDefined();
    expect(boldSpan!.marks).toContain('strong');
  });

  it('parses nested marks', () => {
    const spans = parseHtmlToSpans('<strong><em>Bold and italic</em></strong>');
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Bold and italic');
    expect(spans[0].marks).toContain('strong');
    expect(spans[0].marks).toContain('em');
  });

  it('parses links with markdef key', () => {
    const spans = parseHtmlToSpans(
      '<a href="https://example.com" data-markdef-key="link1">Click here</a>',
    );
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Click here');
    expect(spans[0].marks).toContain('link1');
  });

  it('parses custom marks via data-mark attribute', () => {
    const spans = parseHtmlToSpans(
      '<span data-mark="primary">Primary text</span>',
    );
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Primary text');
    expect(spans[0].marks).toContain('primary');
  });

  it('handles br tags as newlines', () => {
    const spans = parseHtmlToSpans('Line 1<br>Line 2');
    const allText = spans.map((s: any) => s.text).join('');
    expect(allText).toContain('Line 1');
    expect(allText).toContain('\n');
    expect(allText).toContain('Line 2');
  });

  it('merges consecutive spans with same marks', () => {
    // Two adjacent text nodes with same marks should be merged
    const spans = parseHtmlToSpans(
      '<strong>Part1</strong><strong>Part2</strong>',
    );
    // The implementation merges consecutive spans with the same marks
    expect(spans).toHaveLength(1);
    expect(spans[0].text).toBe('Part1Part2');
    expect(spans[0].marks).toContain('strong');
  });

  it('generates unique _key for each span', () => {
    const spans = parseHtmlToSpans('Hello <strong>world</strong> today');
    const keys = spans.map((s: any) => s._key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it('handles empty HTML', () => {
    const spans = parseHtmlToSpans('');
    expect(spans).toHaveLength(0);
  });

  it('deduplicates marks to prevent duplicates', () => {
    // If somehow the same mark appears multiple times, it should be deduplicated
    const spans = parseHtmlToSpans(
      '<span data-mark="primary"><span data-mark="primary">Text</span></span>',
    );
    expect(spans[0].marks.filter((m: string) => m === 'primary')).toHaveLength(
      1,
    );
  });
});

describe('parseHtmlToBlockStructure', () => {
  const originalBlock = {
    _type: 'block',
    _key: 'originalKey',
    style: 'normal',
    markDefs: [],
    children: [{ _type: 'span', text: 'Original', marks: [] }],
  };

  it('parses translated HTML back to block structure', () => {
    const html =
      '<p data-block-key="key1" data-block-style="normal" data-markdefs="">Translated text</p>';
    const result = parseHtmlToBlockStructure(html, originalBlock);

    expect(result._type).toBe('block');
    expect(result.children).toBeDefined();
    expect(result.children.length).toBeGreaterThanOrEqual(1);

    const textContent = result.children.map((c: any) => c.text).join('');
    expect(textContent).toContain('Translated text');
  });

  it('preserves block key from HTML data attribute', () => {
    const html =
      '<p data-block-key="customKey" data-block-style="normal" data-markdefs="">Text</p>';
    const result = parseHtmlToBlockStructure(html, originalBlock);
    expect(result._key).toBe('customKey');
  });

  it('preserves block style from HTML data attribute', () => {
    const html =
      '<h2 data-block-key="key1" data-block-style="h2" data-markdefs="">Heading</h2>';
    const result = parseHtmlToBlockStructure(html, originalBlock);
    expect(result.style).toBe('h2');
  });

  it('preserves markDefs from HTML data attribute', () => {
    const markDefs = [
      { _key: 'link1', _type: 'link', href: 'https://example.com' },
    ];
    const encodedMarkDefs = encodeURIComponent(JSON.stringify(markDefs));
    const html = `<p data-block-key="key1" data-block-style="normal" data-markdefs="${encodedMarkDefs}">Text with <a href="https://example.com" data-markdef-key="link1">link</a></p>`;

    const result = parseHtmlToBlockStructure(html, originalBlock);
    expect(result.markDefs).toEqual(markDefs);
  });

  it('preserves marks on spans in translated content', () => {
    const html =
      '<p data-block-key="key1" data-block-style="normal" data-markdefs="">Normal <strong>Bold</strong> text</p>';
    const result = parseHtmlToBlockStructure(html, originalBlock);

    const boldSpan = result.children.find(
      (c: any) => c.text === 'Bold' || (c.text && c.marks?.includes('strong')),
    );
    expect(boldSpan).toBeDefined();
    expect(boldSpan.marks).toContain('strong');
  });

  it('falls back to original block properties when HTML has no data attributes', () => {
    const html = '<p>Simple text without attributes</p>';
    const result = parseHtmlToBlockStructure(html, originalBlock);

    // Should fall back to original block's key and style
    expect(result._key).toBe('originalKey');
    expect(result.style).toBe('normal');
  });

  it('handles complex HTML with multiple marks', () => {
    const html =
      '<p data-block-key="key1" data-block-style="normal" data-markdefs="">Start <strong><em>bold-italic</em></strong> end</p>';
    const result = parseHtmlToBlockStructure(html, originalBlock);

    const biSpan = result.children.find(
      (c: any) => c.marks?.includes('strong') && c.marks?.includes('em'),
    );
    expect(biSpan).toBeDefined();
    expect(biSpan.text).toBe('bold-italic');
  });
});
