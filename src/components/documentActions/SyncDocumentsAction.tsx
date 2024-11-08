import { TranslateIcon } from '@sanity/icons';
import { useToast } from '@sanity/ui';
import { useMemo, useState } from 'react';
import { DocumentActionProps, useClient, useTranslation } from 'sanity';

import { TranslationPluginOptions } from '../../types/TranslationPluginOptions';
import { API, I18N_NAMESPACE } from '../../utils/constants';
import AnimatedSpinnerIcon from '../CircleLoadingIcon';

// import AnimatedSpinnerIcon from 'src/assets/icons/sanity/common/SanityCircleLoadingIcon';
// import { API } from 'src/modules/common/constants';
// import { translate } from 'src/studio/studioI18n';
// import { sanityFetch } from 'src/utils/sanityClient';

type ExtendedDocumentActionProps = DocumentActionProps &
  TranslationPluginOptions;

const SyncDocumentsAction = ({
  id,
  type,
  published,
  BASE_URL,
}: ExtendedDocumentActionProps) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(I18N_NAMESPACE);
  const client = useClient({
    apiVersion: '2021-10-21',
  });

  const docId = useMemo(() => {
    return id;
  }, [id]);

  const toast = useToast();

  const getApiKey = async () => {
    const result = await client.fetch<{
      apiKey: string;
    }>(`*[_type=="jexity.translationApiKey"][0]{
      apiKey
    }`);

    return result.apiKey;
  };

  /**
   * Initiates the translation process for the document data and updates the Sanity client with the translated content.
   *
   * This function first sets the loading state to true to indicate the operation is in progress. It then sends a POST request to the translation API with the document ID and language for translation. If the translation is successful, it updates the document in the Sanity client with the translated data. Finally, it sets the loading state back to false.
   *
   * @returns {Promise<void>} A promise that resolves when the translation and update operation is complete.
   */
  const translateAndSyncOtherDocuments = async () => {
    setLoading(true); // Indicate the operation is in progress
    const apiKey = await getApiKey();

    try {
      const response = await fetch(`${BASE_URL}${API.SYNC_DOCUMENTS}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-webhook-secret': apiKey,
        },
        body: JSON.stringify({ docId, type, published: !!published }), // Send the document ID for translation
      });
      const { isTranslated } = await response.json(); // Parse the respons

      if (isTranslated) {
        // Do something, like notificatione JSON
        toast.push({
          status: 'success',
          title: t('syncDocumentsAction.toast.success.title'),
          description: t('syncDocumentsAction.toast.success.description'),
          duration: 4000,
        });
      }
    } catch (error) {
      toast.push({
        status: 'error',
        title: t('syncDocumentsAction.toast.error.title'),
        description: t('syncDocumentsAction.toast.error.description'),
        duration: 4000,
      });
      console.error(error); // Log any errors that occur during the operation
    } finally {
      setLoading(false); // Set loading state back to false
    }
  };

  return {
    label: loading
      ? t('syncDocumentsAction.label.loading')
      : t('syncDocumentsAction.label'),
    icon: loading ? AnimatedSpinnerIcon : TranslateIcon,
    onHandle: async () => {
      if (loading) {
        return;
      }

      await translateAndSyncOtherDocuments();
    },
  };
};

export default SyncDocumentsAction;
