# Customizable Translatable Field Keys

## Overview

The Sanity Plugin Translate allows you to customize which fields are considered translatable in your Sanity documents. This feature gives you fine-grained control over the translation process by enabling you to:

- Add custom field keys to the default list of translatable fields
- Add custom array field keys to the default list of translatable array fields
- Exclude specific default field keys from translation
- Exclude specific default array field keys from translation

This document explains how to configure and use customizable translatable field keys in your Sanity project.

## Default Translatable Fields

By default, the plugin translates the following field keys:

### Default Translatable Field Keys
```typescript
[
  'altText',
  'label',
  'text', // Used in Block Content structure within "children"
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
  'supportingText', // For Testimonial stats in Multi-card layout
  'statNumber', // For Testimonial stats in Multi-card layout
  { type: ['form', 'pageCategory', 'category'], key: 'name' },
]
```

### Default Translatable Array Field Keys
```typescript
['keywords']
```

## Configuration Options

The plugin offers four configuration options for customizing translatable field keys:

### 1. `customTranslatableFieldKeys`

An array of additional field keys to translate. Each item can be either:
- A simple string (e.g., `'summary'`)
- An object with `type` and `key` properties, where:
  - `type` is an array of document types where this field should be translated
  - `key` is the field name to translate

### 2. `customTranslatableArrayFieldKeys`

An array of additional array field keys to translate (e.g., `'tags'`).

### 3. `excludeDefaultFieldKeys`

An array of default field keys to exclude from translation (e.g., `'placeholder'`).

### 4. `excludeDefaultArrayFieldKeys`

An array of default array field keys to exclude from translation (e.g., `'keywords'`).

## Usage Examples

### Adding Custom Field Keys

```typescript
// In your API route that handles translation requests (e.g., pages/api/translate.ts)
import { TranslationService } from 'sanity-plugin-translate/service';
import { FieldKeyConfig } from 'sanity-plugin-translate/types';
import { createClient } from '@sanity/client';

// Create Sanity client
const client = createClient({
  projectId: process.env.SANITY_PROJECT_ID,
  dataset: process.env.SANITY_DATASET,
  token: process.env.SANITY_TOKEN,
  useCdn: false,
});

// Define your custom field keys
const fieldKeyConfig: FieldKeyConfig = {
  customTranslatableFieldKeys: [
    'summary',
    'metaDescription',
    { type: ['product'], key: 'specifications' }
  ]
};

// Use the TranslationService with custom field keys
const translationService = new TranslationService({
  client,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig,
});
```

### Adding Custom Array Field Keys

```typescript
const fieldKeyConfig: FieldKeyConfig = {
  customTranslatableArrayFieldKeys: ['tags', 'categories']
};

const translationService = new TranslationService({
  client,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig,
});
```

### Excluding Default Field Keys

```typescript
const fieldKeyConfig: FieldKeyConfig = {
  excludeDefaultFieldKeys: ['placeholder', 'supportingText']
};

const translationService = new TranslationService({
  client,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig,
});
```

### Combining Multiple Options

```typescript
const fieldKeyConfig: FieldKeyConfig = {
  customTranslatableFieldKeys: [
    'summary',
    { type: ['product'], key: 'specifications' }
  ],
  customTranslatableArrayFieldKeys: ['tags'],
  excludeDefaultFieldKeys: ['placeholder'],
  excludeDefaultArrayFieldKeys: []
};

const translationService = new TranslationService({
  client,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig,
});
```

## How It Works

When you configure custom field keys for the `TranslationService`:

1. The service merges your custom field keys with the default ones (unless excluded)
2. These merged keys are used internally by the `TranslationService`
3. The service uses these keys to identify which fields should be translated during the document translation process

The merging process preserves all default keys unless explicitly excluded, ensuring backward compatibility with existing projects.

## Type-Specific Field Keys

For fields that should only be translated in specific document types, use the object format:

```javascript
{ type: ['blogPost', 'page'], key: 'excerpt' }
```

This configuration will only translate the `excerpt` field in documents of type `blogPost` or `page`.

## Best Practices

1. **Start with defaults**: Begin with the default field keys and customize as needed.
2. **Be selective**: Only translate fields that contain human-readable text.
3. **Consider context**: Some fields might need special handling based on document type.
4. **Test thoroughly**: Always test translations after customizing field keys.
5. **Document your choices**: Keep a record of your customizations for future reference.

## Technical Implementation

The customizable field keys feature is implemented through:

- `FieldKeyConfig` type exported from the plugin for type safety
- `fieldKeyManager.ts` utility functions for merging and filtering keys
- `TranslationService` constructor accepting a `fieldKeyConfig` parameter

This implementation ensures backward compatibility while providing flexibility for project-specific requirements.

## Important Note

Customizable field keys should be configured when instantiating the `TranslationService` in your API route, not via plugin options in `sanity.config.ts`. This approach provides better separation of concerns and allows for different field key configurations in different API routes if needed.

For more detailed information on integrating custom field keys into your project, see [Integrating Custom Field Keys](./IntegratingCustomFieldKeys.md).
