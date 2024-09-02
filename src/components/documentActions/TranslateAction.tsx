import { TranslateIcon } from '@sanity/icons';
import { useToast } from '@sanity/ui';
import { useMemo, useState } from 'react';
import { DocumentActionProps, useTranslation } from 'sanity';

import { I18N_NAMESPACE } from '../../utils/constants';
import AnimatedSpinnerIcon from '../CircleLoadingIcon';

// import AnimatedSpinnerIcon from 'src/assets/icons/sanity/common/SanityCircleLoadingIcon';
// import { API } from 'src/modules/common/constants';
// import { translate } from 'src/studio/studioI18n';
// import { sanityFetch } from 'src/utils/sanityClient';

// const getApiKey = async () => {
//   const result = await sanityFetch<{
//     apiKey: string;
//   }>({
//     query: `*[_type=="jexity.translationApiKey"][0]{
//       ...
//     }`,
//   });

//   return result.apiKey;
// };

const TranslateAction = ({ id, type, published }: DocumentActionProps) => {
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation(I18N_NAMESPACE);

  const docId = useMemo(() => {
    if (!published) {
      return `drafts.${id}`;
    }

    return id;
  }, [id, published]);
  const toast = useToast();

  /**
   * Initiates the translation process for the document data and updates the Sanity client with the translated content.
   *
   * This function first sets the loading state to true to indicate the operation is in progress. It then sends a POST request to the translation API with the document ID and language for translation. If the translation is successful, it updates the document in the Sanity client with the translated data. Finally, it sets the loading state back to false.
   *
   * @returns {Promise<void>} A promise that resolves when the translation and update operation is complete.
   */
  const translateAndSaveDocument = async () => {
    setLoading(true); // Indicate the operation is in progress
    // const apiKey = await getApiKey();

    try {
      // const response = await fetch(API.TRANSLATE, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //     'x-webhook-secret': apiKey,
      //   },
      //   body: JSON.stringify({ docId, type }), // Send the document ID for translation
      // });
      // const { isTranslated } = await response.json(); // Parse the response JSON
      // if (isTranslated) {
      //   // Do something, like notification
      toast.push({
        status: 'success',
        title: t('translateAction.toast.success.title'),
        description: t('translateAction.toast.success.description'),
        duration: 4000,
      });
      // }
    } catch (error) {
      toast.push({
        status: 'error',
        title: t('translateAction.toast.error.title'),
        description: t('translateAction.toast.error.description'),
        duration: 4000,
      });
      console.error(error); // Log any errors that occur during the operation
    } finally {
      setLoading(false); // Set loading state back to false
    }
  };

  return {
    label: loading
      ? t('translateAction.label.loading')
      : t('translateAction.label'),
    icon: loading ? AnimatedSpinnerIcon : TranslateIcon,
    onHandle: async () => {
      if (loading) {
        return;
      }

      await translateAndSaveDocument();
    },
  };
};

export default TranslateAction;
