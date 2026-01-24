import { beforeEach, describe, expect, it } from 'vitest';

import {
  blockContentMap,
  clearBlockContentMap,
  findContextForHeaderBlock,
} from '../blockContentContext';
import { BlockInfo } from '../blockContentTypes';

describe('clearBlockContentMap', () => {
  it('clears all entries from blockContentMap', () => {
    blockContentMap.set('key1', {
      fieldName: 'body',
      blockIndex: 0,
      isHeader: false,
      arrayPath: 'body',
    });
    blockContentMap.set('key2', {
      fieldName: 'body',
      blockIndex: 1,
      isHeader: true,
      arrayPath: 'body',
    });

    expect(blockContentMap.size).toBe(2);
    clearBlockContentMap();
    expect(blockContentMap.size).toBe(0);
  });

  it('works when map is already empty', () => {
    clearBlockContentMap();
    expect(blockContentMap.size).toBe(0);
  });
});

describe('findContextForHeaderBlock', () => {
  let blockContextMap: Map<number, BlockInfo>;

  beforeEach(() => {
    blockContextMap = new Map();
  });

  it('returns text of the next normal block after header', () => {
    const nestedArray = [
      {
        _type: 'block',
        style: 'h1',
        children: [{ _type: 'span', text: 'Title' }],
      },
      {
        _type: 'block',
        style: 'normal',
        children: [{ _type: 'span', text: 'Context paragraph' }],
      },
    ];

    blockContextMap.set(0, { text: 'Title', isNormal: false, isHeader: true });
    blockContextMap.set(1, {
      text: 'Context paragraph',
      isNormal: true,
      isHeader: false,
    });

    const context = findContextForHeaderBlock(nestedArray, blockContextMap, 0);
    expect(context).toBe('Context paragraph');
  });

  it('skips non-normal blocks to find context', () => {
    const nestedArray = [
      { _type: 'block', style: 'h1' },
      { _type: 'block', style: 'h2' },
      { _type: 'block', style: 'normal' },
    ];

    blockContextMap.set(0, {
      text: 'Main Title',
      isNormal: false,
      isHeader: true,
    });
    blockContextMap.set(1, {
      text: 'Subtitle',
      isNormal: false,
      isHeader: true,
    });
    blockContextMap.set(2, {
      text: 'Body text',
      isNormal: true,
      isHeader: false,
    });

    const context = findContextForHeaderBlock(nestedArray, blockContextMap, 0);
    expect(context).toBe('Body text');
  });

  it('returns undefined when no normal block follows header', () => {
    const nestedArray = [
      { _type: 'block', style: 'h1' },
      { _type: 'block', style: 'h2' },
    ];

    blockContextMap.set(0, { text: 'Title', isNormal: false, isHeader: true });
    blockContextMap.set(1, {
      text: 'Subtitle',
      isNormal: false,
      isHeader: true,
    });

    const context = findContextForHeaderBlock(nestedArray, blockContextMap, 0);
    expect(context).toBeUndefined();
  });

  it('returns undefined when header is the last block', () => {
    const nestedArray = [
      { _type: 'block', style: 'normal' },
      { _type: 'block', style: 'h1' },
    ];

    blockContextMap.set(0, { text: 'Intro', isNormal: true, isHeader: false });
    blockContextMap.set(1, {
      text: 'Trailing Title',
      isNormal: false,
      isHeader: true,
    });

    const context = findContextForHeaderBlock(nestedArray, blockContextMap, 1);
    expect(context).toBeUndefined();
  });

  it('returns the first normal block when multiple follow', () => {
    const nestedArray = [
      { _type: 'block', style: 'h1' },
      { _type: 'block', style: 'normal' },
      { _type: 'block', style: 'normal' },
    ];

    blockContextMap.set(0, { text: 'Header', isNormal: false, isHeader: true });
    blockContextMap.set(1, {
      text: 'First paragraph',
      isNormal: true,
      isHeader: false,
    });
    blockContextMap.set(2, {
      text: 'Second paragraph',
      isNormal: true,
      isHeader: false,
    });

    const context = findContextForHeaderBlock(nestedArray, blockContextMap, 0);
    expect(context).toBe('First paragraph');
  });
});
