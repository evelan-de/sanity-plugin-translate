import { describe, it, expect } from 'vitest';

import {
  DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS,
  DEFAULT_TRANSLATABLE_FIELD_KEYS,
} from '../../consts';
import {
  getMergedTranslatableArrayFieldKeys,
  getMergedTranslatableFieldKeys,
} from '../fieldKeyManager';

describe('getMergedTranslatableFieldKeys', () => {
  it('returns default keys when no config provided', () => {
    const result = getMergedTranslatableFieldKeys();
    expect(result).toEqual(DEFAULT_TRANSLATABLE_FIELD_KEYS);
  });

  it('returns default keys when config is undefined', () => {
    const result = getMergedTranslatableFieldKeys(undefined);
    expect(result).toEqual(DEFAULT_TRANSLATABLE_FIELD_KEYS);
  });

  it('appends custom field keys to defaults', () => {
    const config = {
      customTranslatableFieldKeys: ['customField1', 'customField2'],
    };
    const result = getMergedTranslatableFieldKeys(config);
    expect(result).toContain('customField1');
    expect(result).toContain('customField2');
    // Should still contain defaults
    expect(result).toContain('title');
    expect(result).toContain('label');
  });

  it('appends custom object field keys', () => {
    const config = {
      customTranslatableFieldKeys: [
        { type: ['myBlock'], key: 'customKey' },
      ],
    };
    const result = getMergedTranslatableFieldKeys(config);
    expect(result).toContainEqual({ type: ['myBlock'], key: 'customKey' });
  });

  it('excludes specified default string keys', () => {
    const config = {
      excludeDefaultFieldKeys: ['title', 'label'],
    };
    const result = getMergedTranslatableFieldKeys(config);
    expect(result).not.toContain('title');
    expect(result).not.toContain('label');
    // Other defaults should remain
    expect(result).toContain('description');
    expect(result).toContain('subline');
  });

  it('excludes specified default object keys by key property', () => {
    const config = {
      excludeDefaultFieldKeys: ['name'],
    };
    const result = getMergedTranslatableFieldKeys(config);
    // The { type: [...], key: 'name' } entry should be excluded
    const nameEntry = result.find(
      (k) => typeof k === 'object' && k.key === 'name',
    );
    expect(nameEntry).toBeUndefined();
  });

  it('can add custom keys and exclude defaults simultaneously', () => {
    const config = {
      customTranslatableFieldKeys: ['newField'],
      excludeDefaultFieldKeys: ['title'],
    };
    const result = getMergedTranslatableFieldKeys(config);
    expect(result).toContain('newField');
    expect(result).not.toContain('title');
    expect(result).toContain('label'); // Other defaults preserved
  });

  it('does not modify original defaults array', () => {
    const originalLength = DEFAULT_TRANSLATABLE_FIELD_KEYS.length;
    getMergedTranslatableFieldKeys({
      customTranslatableFieldKeys: ['extra'],
      excludeDefaultFieldKeys: ['title'],
    });
    expect(DEFAULT_TRANSLATABLE_FIELD_KEYS.length).toBe(originalLength);
  });
});

describe('getMergedTranslatableArrayFieldKeys', () => {
  it('returns default array keys when no config provided', () => {
    const result = getMergedTranslatableArrayFieldKeys();
    expect(result).toEqual(DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS);
  });

  it('returns default array keys when config is undefined', () => {
    const result = getMergedTranslatableArrayFieldKeys(undefined);
    expect(result).toEqual(DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS);
  });

  it('appends custom array field keys', () => {
    const config = {
      customTranslatableArrayFieldKeys: ['tags', 'categories'],
    };
    const result = getMergedTranslatableArrayFieldKeys(config);
    expect(result).toContain('tags');
    expect(result).toContain('categories');
    expect(result).toContain('keywords'); // default
  });

  it('excludes specified default array keys', () => {
    const config = {
      excludeDefaultArrayFieldKeys: ['keywords'],
    };
    const result = getMergedTranslatableArrayFieldKeys(config);
    expect(result).not.toContain('keywords');
  });

  it('can add and exclude simultaneously', () => {
    const config = {
      customTranslatableArrayFieldKeys: ['tags'],
      excludeDefaultArrayFieldKeys: ['keywords'],
    };
    const result = getMergedTranslatableArrayFieldKeys(config);
    expect(result).toContain('tags');
    expect(result).not.toContain('keywords');
  });

  it('does not modify original defaults array', () => {
    const originalLength = DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS.length;
    getMergedTranslatableArrayFieldKeys({
      customTranslatableArrayFieldKeys: ['extra'],
      excludeDefaultArrayFieldKeys: ['keywords'],
    });
    expect(DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS.length).toBe(originalLength);
  });
});
