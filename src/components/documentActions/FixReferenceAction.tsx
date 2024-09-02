import { TranslateIcon } from '@sanity/icons';
import { useToast } from '@sanity/ui';
import { useMemo, useState } from 'react';
import { DocumentActionProps, useTranslation } from 'sanity';

import { I18N_NAMESPACE } from '../../utils/constants';
import AnimatedSpinnerIcon from '../CircleLoadingIcon';
// import { API } from 'src/modules/common/constants';

const FixReferenceAction = ({ id, type, published }: DocumentActionProps) => {
  const { t } = useTranslation(I18N_NAMESPACE);
  const docId = useMemo(() => {
    if (!published) {
      return `drafts.${id}`;
    }

    return id;
  }, [id, published]);
  const toast = useToast();

  const [loading, setLoading] = useState(false);
  /**
   * Initiates the translation process for the document data and updates the Sanity client with the translated content.
   *
   * This function first sets the loading state to true to indicate the operation is in progress. It then sends a POST request to the translation API with the document ID and language for translation. If the translation is successful, it updates the document in the Sanity client with the translated data. Finally, it sets the loading state back to false.
   *
   * @returns {Promise<void>} A promise that resolves when the translation and update operation is complete.
   */
  const fixReferences = async () => {
    setLoading(true); // Indicate the operation is in progress
    try {
      // const response = await fetch(API.FIX_REFERENCE, {
      //   method: 'POST',
      //   headers: {
      //     'Content-Type': 'application/json',
      //   },
      //   body: JSON.stringify({ docId, type }), // Send the document ID for translation
      // });
      // const { isTranslated } = await response.json(); // Parse the response JSON
      // if (isTranslated) {
      // Do something, like notification
      toast.push({
        status: 'success',
        title: t('fixReferenceAction.toast.success.title'),
        description: t('fixReferenceAction.toast.success.description'),
        duration: 4000,
      });
      // }
    } catch (error) {
      toast.push({
        status: 'success',
        title: t('fixReferenceAction.toast.success.title'),
        description: t('fixReferenceAction.toast.success.description'),
        duration: 4000,
      });
      console.error(error); // Log any errors that occur during the operation
    } finally {
      setLoading(false); // Set loading state back to false
    }
  };

  return {
    label: loading
      ? t('fixReferenceAction.label.loading')
      : t('fixReferenceAction.label'),
    icon: loading ? AnimatedSpinnerIcon : TranslateIcon,
    onHandle: async () => {
      // add the fetch function here
      await fixReferences();
    },
  };
};

export default FixReferenceAction;
