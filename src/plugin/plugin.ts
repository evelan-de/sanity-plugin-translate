import { definePlugin } from 'sanity';

export const SanityPlugin = definePlugin<void>(() => {
  return {
    name: `your-sanity-plugin-name`,
    // Add your schemas here
    // schema: {
    //   types: [],
    // },
  };
});
