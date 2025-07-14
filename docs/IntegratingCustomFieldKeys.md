# Implementing Customizable Field Keys

This guide explains how to implement and use the customizable field keys feature in your Sanity project. It provides detailed instructions for configuring custom translatable fields in your API implementation.

## Overview

The customizable field keys feature allows you to specify which fields should be translated in your Sanity documents. This is implemented by configuring the `TranslationService` when you instantiate it in your API routes.

## Implementation Approach

The Sanity Translate plugin works as follows:

1. **Document Actions**: The plugin provides document actions in the Sanity Studio UI
2. **API Calls**: When a document action is triggered, it makes an API call to your project's API routes
3. **Translation Service**: Your API routes instantiate the `TranslationService` to perform the actual translation

Customizable field keys are configured at the third step, when you instantiate the `TranslationService` in your API routes.

## Configuring Custom Field Keys

### In Your API Route

To use customizable field keys, configure them when instantiating the `TranslationService` in your API route:

```typescript
// Example: Next.js API route (app/api/translate/route.ts)
import { TranslationService } from 'sanity-plugin-translate/service';
import { translationApiRequestBody, FieldKeyConfig } from 'sanity-plugin-translate/types';
import { sanityClient } from './your-sanity-client';

export async function POST(req) {
  const body = await req.json();
  const { docId, type } = body;
  
  // Define your custom field keys
  const fieldKeyConfig: FieldKeyConfig = {
    customTranslatableFieldKeys: ['summary', 'metaDescription'],
    customTranslatableArrayFieldKeys: ['tags'],
    excludeDefaultFieldKeys: ['placeholder'],
    excludeDefaultArrayFieldKeys: [],
  };
  
  // Instantiate TranslationService with custom field keys
  const translationService = new TranslationService({
    client: sanityClient,
    deeplApiKey: process.env.DEEPL_API_KEY,
    fieldKeyConfig, // Pass your field key configuration
  });
  
  // Use the service for translation
  const result = await translationService.translateDocument({ data: { docId, type } });
  
  return new Response(JSON.stringify({ isTranslated: true }));
}
```

### Using Constants for Type Safety

For better type safety and reusability, you can define your custom field keys as constants:

```typescript
// fieldKeyConfig.ts
import { FieldKeyConfig } from 'sanity-plugin-translate/types';

/**
 * Custom translatable field keys configuration
 */
export const FIELD_KEY_CONFIG: FieldKeyConfig = {
  customTranslatableFieldKeys: [
    'summary',
    'metaDescription',
    { type: ['product'], key: 'specifications' },
  ],
  customTranslatableArrayFieldKeys: ['tags', 'categories'],
  excludeDefaultFieldKeys: ['placeholder'],
  excludeDefaultArrayFieldKeys: [],
};
```

Then import and use it in your API route:

```typescript
import { FIELD_KEY_CONFIG } from './fieldKeyConfig';

// In your API route handler
const translationService = new TranslationService({
  client: sanityClient,
  deeplApiKey: process.env.DEEPL_API_KEY,
  fieldKeyConfig: FIELD_KEY_CONFIG,
});
```

## How It Works

### TranslationService Implementation

The `TranslationService` has been updated to use the field key configuration for translation:

```typescript
// src/api/service/TranslationService.ts
constructor(config: TranslationServiceOptions) {
  this.client = config.client;
  this.previewClient = config.previewClient;
  this.deeplApiKey = config.deeplApiKey;

  // Initialize field keys using configuration
  this.translatableFieldKeys = getMergedTranslatableFieldKeys(config.fieldKeyConfig);
  this.translatableArrayFieldKeys = getMergedTranslatableArrayFieldKeys(config.fieldKeyConfig);
}
```

When you provide a `fieldKeyConfig` object, the service merges your custom keys with the default keys and applies any exclusions you've specified.

### Field Key Manager

The field key manager utilities handle merging custom keys with defaults and applying exclusions:

```typescript
// src/api/utils/fieldKeyManager.ts

/**
 * Merges custom translatable field keys with defaults, excluding specified keys
 */
export function getMergedTranslatableFieldKeys(
  config?: FieldKeyConfig
): (string | { type: string[]; key: string })[] {
  if (!config) return DEFAULT_TRANSLATABLE_FIELD_KEYS;

  const {
    customTranslatableFieldKeys = [],
    excludeDefaultFieldKeys = [],
  } = config;

  // Filter default keys based on exclusions
  const filteredDefaults = DEFAULT_TRANSLATABLE_FIELD_KEYS.filter((key) => {
    if (typeof key === 'string') {
      return !excludeDefaultFieldKeys.includes(key);
    }
    return true; // Keep complex type keys by default
  });

  // Merge filtered defaults with custom keys
  return [...filteredDefaults, ...customTranslatableFieldKeys];
}
```

### FieldKeyConfig Type

The `FieldKeyConfig` type defines the structure for custom field key configuration:

```typescript
export interface FieldKeyConfig {
  customTranslatableFieldKeys?: (string | { type: string[]; key: string })[];
  customTranslatableArrayFieldKeys?: string[];
  excludeDefaultFieldKeys?: string[];
  excludeDefaultArrayFieldKeys?: string[];
}
```

This type is exported from the plugin and can be imported in your project for type safety.

## Testing Your Implementation

To verify that your implementation is working correctly:

1. Configure your API route with custom field keys
2. Create a document with fields matching your custom keys
3. Use the "Translate Document" action from the document menu
4. Verify that your custom fields are being translated
5. Check that excluded fields are not translated

## Example: Next.js API Route (App Router)

Here's a complete example of a Next.js API route using the App Router:

```typescript
// app/api/translate/route.ts
import { NextRequest } from 'next/server';
import { TranslationService } from 'sanity-plugin-translate/service';
import { translationApiRequestBody, FieldKeyConfig } from 'sanity-plugin-translate/types';
import { sanityClient } from '../../lib/sanity';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 minutes timeout for long translations

export async function POST(req: NextRequest) {
  // Validate webhook secret
  const webhook_secret = req.headers.get('x-webhook-secret');
  if (!webhook_secret || webhook_secret !== process.env.SANITY_TRANSLATE_WEBHOOK_SECRET) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // Parse and validate request body
  const body = await req.json();
  const parsedBody = translationApiRequestBody.safeParse(body);
  if (!parsedBody.success) {
    return new Response('Invalid request body', { status: 400 });
  }
  
  // Define custom field keys
  const fieldKeyConfig: FieldKeyConfig = {
    customTranslatableFieldKeys: [
      'summary',
      'metaDescription',
      { type: ['product'], key: 'specifications' }
    ],
    customTranslatableArrayFieldKeys: ['tags'],
    excludeDefaultFieldKeys: ['placeholder'],
    excludeDefaultArrayFieldKeys: [],
  };
  
  try {
    // Initialize TranslationService with custom field keys
    const translationService = new TranslationService({
      client: sanityClient,
      deeplApiKey: process.env.DEEPL_API_KEY || '',
      fieldKeyConfig, // Pass your field key configuration
    });
    
    // Translate the document
    const { isTranslated, translatedJsonData } = await translationService.translateDocument({
      data: parsedBody.data,
    });
    
    return new Response(
      JSON.stringify({ isTranslated, translatedTexts: translatedJsonData }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Translation error:', error);
    return new Response(
      JSON.stringify({ error: 'Translation failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
```

## Troubleshooting

If your custom field keys are not being translated:

1. **Check API Configuration**: Ensure your API route is correctly configuring the TranslationService
2. **Verify Field Names**: Make sure the field names match exactly with your schema
3. **Type-Specific Fields**: For type-specific fields, verify that the document type is correct
4. **Console Logging**: Add console logs to check the merged field keys in your API route
5. **API Response**: Check the API response for any error messages

## Advanced Configuration Examples

### Type-Specific Field Translation

```typescript
const fieldKeyConfig: FieldKeyConfig = {
  customTranslatableFieldKeys: [
    { type: ['product'], key: 'specifications' },
    { type: ['article', 'blog'], key: 'excerpt' }
  ]
};
```

### Excluding Default Fields

```typescript
const fieldKeyConfig: FieldKeyConfig = {
  excludeDefaultFieldKeys: ['placeholder', 'supportingText'],
  excludeDefaultArrayFieldKeys: ['keywords']
};
```

## Best Practices

1. **Be Selective**: Only translate fields that contain human-readable text
2. **Consider Document Types**: Use type-specific fields for targeted translation
3. **Test Thoroughly**: Always test translations after customizing field keys
4. **Document Your Choices**: Keep a record of your customizations for future reference
5. **Centralize Configuration**: Define your field key configuration in a separate file for reuse
