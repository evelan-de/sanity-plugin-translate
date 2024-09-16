# Sanity Plugin Translate

This Sanity plugin leverages the DeepL API to provide translation capabilities within Sanity Studio. It is designed to enhance content management systems by allowing automatic translation of text fields and document references based on specified languages.

## Features

- **Translation Integration**: Utilizes the `deepl-node` library to integrate with the DeepL API for robust translation capabilities.
- **Document Actions**: Includes actions for translating documents and fixing references within the Sanity Studio.
- **Configurable**: Supports configuration for different environments with customizable plugin options.

## Installation

1. Install the plugin via npm or yarn:

   ```bash
   npm install sanity-plugin-translate
   # or
   yarn add sanity-plugin-translate
   ```

2. Include the plugin in your Sanity Studio's configuration.

## Usage

After installation, the translation actions can be triggered from the document actions dropdown in the Sanity Studio. Ensure you have the necessary API keys and configurations set up as described in the plugin documentation.

## Develop & Test

This plugin uses [@sanity/plugin-kit](https://github.com/sanity-io/plugin-kit) with default configuration for build & watch scripts.

See [Testing a plugin in Sanity Studio](https://github.com/sanity-io/plugin-kit#testing-a-plugin-in-sanity-studio) on how to run this plugin with hotreload in the studio.

## License

[MIT](LICENSE) © Evelan

## More Information

- **Repository**: [GitHub](https://github.com/evelan-de/sanity-plugin-translate)
- **Issues**: [GitHub Issues](https://github.com/evelan-de/sanity-plugin-translate/issues)
- **Author**: Evelan <kontakt@evelan.de>

For more details on configuration and advanced usage, refer to the [official documentation](https://github.com/evelan-de/sanity-plugin-translate#readme).
