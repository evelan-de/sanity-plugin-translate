import { definePlugin } from 'sanity';

import FixReferenceAction from '../components/documentActions/FixReferenceAction';
import SyncDocumentMediaAction from '../components/documentActions/syncDocumentMediaAction';
import SyncDocumentsAction from '../components/documentActions/SyncDocumentsAction';
import TranslateAction from '../components/documentActions/TranslateAction'; // Updated casing
import { TranslationPluginOptions } from '../types/TranslationPluginOptions';
import {
  DEFAULT_RESOURCE_BUNDLE_DE,
  DEFAULT_RESOURCE_BUNDLE_EN,
} from '../utils/i18n/resourceBundles';

export const TranslationPlugin = definePlugin<void | TranslationPluginOptions>(
  (config) => {
    const BASE_URL = config?.BASE_URL;

    return {
      name: `sanity-plugin-translate`,
      document: {
        actions: [
          config?.includeTranslateAction !== false
            ? (props) => TranslateAction({ ...props, BASE_URL })
            : undefined,
          config?.includeFixReferenceAction !== false
            ? (props) => FixReferenceAction({ ...props, BASE_URL })
            : undefined,
          config?.includeSyncDocumentsAction !== false
            ? (props) => SyncDocumentsAction({ ...props, BASE_URL })
            : undefined,
          config?.includeSyncDocumentMediaAction !== false
            ? (props) => SyncDocumentMediaAction({ ...props, BASE_URL })
            : undefined,
        ],
      },
      i18n: {
        bundles: [DEFAULT_RESOURCE_BUNDLE_EN, DEFAULT_RESOURCE_BUNDLE_DE],
      },
    };
  },
);
