import { definePlugin } from 'sanity';

import FixReferenceAction from '../components/documentActions/FixReferenceAction';
import TranslateAction from '../components/documentActions/TranslateAction'; // Updated casing
import {
  DEFAULT_RESOURCE_BUNDLE_DE,
  DEFAULT_RESOURCE_BUNDLE_EN,
} from '../utils/i18n/resourceBundles';

export const TranslationPlugin = definePlugin<void>(() => {
  return {
    name: `sanity-plugin-translate`,
    document: {
      actions: [TranslateAction, FixReferenceAction],
    },
    i18n: {
      bundles: [DEFAULT_RESOURCE_BUNDLE_EN, DEFAULT_RESOURCE_BUNDLE_DE],
    },
    // Add your schemas here
    // schema: {
    //   types: [],
    // },
  };
});
