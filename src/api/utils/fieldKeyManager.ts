import { FieldKeyConfig } from '../../types/translationApi';
import {
  DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS,
  DEFAULT_TRANSLATABLE_FIELD_KEYS,
} from '../consts';

/**
 * Merges custom translatable field keys with defaults, excluding specified keys
 */
export function getMergedTranslatableFieldKeys(
  config?: FieldKeyConfig,
): (string | { type: string[]; key: string })[] {
  let mergedKeys = [...DEFAULT_TRANSLATABLE_FIELD_KEYS];

  // Add custom field keys if provided
  if (config?.customTranslatableFieldKeys) {
    mergedKeys = [...mergedKeys, ...config.customTranslatableFieldKeys];
  }

  // Remove excluded default keys if specified
  if (
    config?.excludeDefaultFieldKeys &&
    config.excludeDefaultFieldKeys.length > 0
  ) {
    mergedKeys = mergedKeys.filter((key) => {
      if (typeof key === 'string') {
        return !config.excludeDefaultFieldKeys!.includes(key);
      }
      // For object keys, check if the key property should be excluded
      return !config.excludeDefaultFieldKeys!.includes(key.key);
    });
  }

  return mergedKeys;
}

/**
 * Merges custom translatable array field keys with defaults, excluding specified keys
 */
export function getMergedTranslatableArrayFieldKeys(
  config?: FieldKeyConfig,
): string[] {
  let mergedKeys = [...DEFAULT_TRANSLATABLE_ARRAY_FIELD_KEYS];

  // Add custom array field keys if provided
  if (config?.customTranslatableArrayFieldKeys) {
    mergedKeys = [...mergedKeys, ...config.customTranslatableArrayFieldKeys];
  }

  // Remove excluded default keys if specified
  if (
    config?.excludeDefaultArrayFieldKeys &&
    config.excludeDefaultArrayFieldKeys.length > 0
  ) {
    mergedKeys = mergedKeys.filter(
      (key) => !config.excludeDefaultArrayFieldKeys!.includes(key),
    );
  }

  return mergedKeys;
}
