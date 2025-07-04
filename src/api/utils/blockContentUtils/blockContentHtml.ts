/**
 * HTML conversion and parsing utilities for Sanity block content
 */
import { PortableTextHtmlComponents, toHTML } from '@portabletext/to-html';
import { uuid } from '@sanity/uuid';
import * as htmlparser2 from 'htmlparser2';

import { HTML_TO_MARK_MAP, SPAN_TYPE } from './blockContentTypes';

/**
 * Convert a Sanity block to HTML preserving marks and markDefs
 * @param block The block to convert
 * @returns HTML string representation of the block
 */
export const convertBlockToHtml = (block: any): string => {
  try {
    // Store markDefs as JSON for perfect reconstruction
    const markDefsJson = block.markDefs
      ? encodeURIComponent(JSON.stringify(block.markDefs))
      : '';

    // Define custom components for HTML conversion
    const components: Partial<PortableTextHtmlComponents> = {
      // Standard block types with data attributes for preservation
      block: {
        normal: ({ value, children }: any) => {
          return `<p data-block-key="${value._key}" data-block-style="normal" data-markdefs="${markDefsJson}">${children}</p>`;
        },
        h1: ({ value, children }: any) => {
          return `<h1 data-block-key="${value._key}" data-block-style="h1" data-markdefs="${markDefsJson}">${children}</h1>`;
        },
        h2: ({ value, children }: any) => {
          return `<h2 data-block-key="${value._key}" data-block-style="h2" data-markdefs="${markDefsJson}">${children}</h2>`;
        },
        h3: ({ value, children }: any) => {
          return `<h3 data-block-key="${value._key}" data-block-style="h3" data-markdefs="${markDefsJson}">${children}</h3>`;
        },
        h4: ({ value, children }: any) => {
          return `<h4 data-block-key="${value._key}" data-block-style="h4" data-markdefs="${markDefsJson}">${children}</h4>`;
        },
        h5: ({ value, children }: any) => {
          return `<h5 data-block-key="${value._key}" data-block-style="h5" data-markdefs="${markDefsJson}">${children}</h5>`;
        },
        h6: ({ value, children }: any) => {
          return `<h6 data-block-key="${value._key}" data-block-style="h6" data-markdefs="${markDefsJson}">${children}</h6>`;
        },
      },
      // Handle marks
      marks: {
        // Standard marks with HTML tag equivalents
        strong: ({ children }) => {
          return `<strong>${children}</strong>`;
        },
        em: ({ children }) => {
          return `<em>${children}</em>`;
        },
        underline: ({ children }) => {
          return `<u>${children}</u>`;
        },
        'strike-through': ({ children }) => {
          return `<s>${children}</s>`;
        },
        code: ({ children }) => {
          return `<code>${children}</code>`;
        },
        // Custom marks with data attributes
        primary: ({ children }: { children: string; mark?: string }) => {
          return `<span data-mark="primary">${children}</span>`;
        },
        secondary: ({ children }: { children: string; mark?: string }) => {
          return `<span data-mark="secondary">${children}</span>`;
        },
        // Specific markDef types for better handling
        externalLink: (props) => {
          const url = props.value?.url || '#';
          const blank = props.value?.blank || false;
          return `<a href="${url}" data-is-external="true" data-blank="${blank}" data-markdef-key="${props.markKey}">${props.children}</a>`;
        },
        internalLink: (props) => {
          const pageData = JSON.stringify(props.value?.page || {});
          return `<a href="#" data-is-internal="true" data-page="${pageData}" data-markdef-key="${props.markKey}">${props.children}</a>`;
        },
        elementLink: (props) => {
          const slug = props.value?.slug?.current || '';
          return `<a href="#${slug}" data-is-element="true" data-markdef-key="${props.markKey}">${props.children}</a>`;
        },
        // Generic link handler for backward compatibility
        link: ({ children, value, markKey }) => {
          const { _key, href } = value || {};
          return `<a href="${href || '#'}" data-markdef-key="${_key || markKey}">${children}</a>`;
        },
      },
      // Handle list types including custom checkBullet
      list: {
        bullet: (props) => `<ul>${props.children}</ul>`,
        number: (props) => `<ol>${props.children}</ol>`,
        // Custom list style for checkBullet
        checkBullet: (props) => {
          return `<ul data-check-bullet="true">${props.children}</ul>`;
        },
      },
      listItem: {
        bullet: (props) => `<li>${props.children}</li>`,
        number: (props) => `<li>${props.children}</li>`,
        // Custom list item style for checkBullet
        checkBullet: (props) => {
          return `<li data-check-bullet="true">${props.children}</li>`;
        },
      },
      // Catch-all for any other custom marks
      unknownBlockStyle: ({ children, value }) => {
        return `<span data-block-style="${value.style}" data-block-key="${value._key}">${children}</span>`;
      },
      unknownMark: ({ children, markKey }) => {
        return `<span data-mark="${markKey}">${children}</span>`;
      },
      unknownList: ({ children }) => {
        return `<ul>${children}</ul>`;
      },
      unknownListItem: ({ children }) => {
        return `<li>${children}</li>`;
      },
    };

    // Convert block to HTML using the custom components
    const html = toHTML([block], { components });
    return html;
  } catch (error) {
    console.error(
      'Failed to convert block to HTML, falling back to text extraction:',
      error,
    );
    // Fallback: extract text from spans
    const validChildren =
      block.children?.filter(
        (child: any) =>
          child && child._type === SPAN_TYPE && typeof child.text === 'string',
      ) || [];
    const textParts = validChildren.map((span: any) => span.text);
    return textParts.join('');
  }
};

/**
 * Parse HTML string into Sanity spans with marks using htmlparser2
 * @param html HTML string to parse
 * @returns Array of span objects with marks
 */
export const parseHtmlToSpans = (html: string): any[] => {
  // Store the spans we'll create
  const spans: any[] = [];

  // Track current text and marks
  let currentText = '';
  const currentMarks: string[] = [];

  // Function to create a span with the current text and marks
  const createSpan = () => {
    if (currentText.trim()) {
      spans.push({
        _type: SPAN_TYPE,
        _key: uuid(),
        text: currentText,
        marks: [...currentMarks], // Create a copy to avoid reference issues
      });
    }
    currentText = '';
  };

  // Create parser instance
  const parser = new htmlparser2.Parser(
    {
      onopentag(name, attributes) {
        // If we have accumulated text, create a span before changing marks
        if (currentText) {
          createSpan();
        }

        // Add mark based on tag type
        if (name === 'a' && attributes['data-markdef-key']) {
          currentMarks.push(attributes['data-markdef-key']);
        } else if (name === 'span' && attributes['data-mark']) {
          currentMarks.push(attributes['data-mark']);
        } else if (HTML_TO_MARK_MAP[name]) {
          currentMarks.push(HTML_TO_MARK_MAP[name]);
        }
      },
      ontext(text) {
        // Add text to current accumulation
        currentText += text;
      },
      onclosetag(name) {
        // Create a span with the accumulated text
        createSpan();

        // Remove the mark associated with this tag
        if (name === 'a' || name === 'span' || HTML_TO_MARK_MAP[name]) {
          // Find the mark to remove
          let markToRemove: string | undefined;

          if (name === 'a') {
            // Find any markDef key in the marks array
            markToRemove = currentMarks.find(
              (mark) =>
                !Object.values(HTML_TO_MARK_MAP).includes(mark) &&
                !mark.startsWith('primary') &&
                !mark.startsWith('secondary'),
            );
          } else if (name === 'span') {
            // Find any custom mark (primary/secondary)
            markToRemove = currentMarks.find(
              (mark) => mark === 'primary' || mark === 'secondary',
            );
          } else if (HTML_TO_MARK_MAP[name]) {
            // Find the standard HTML mark
            markToRemove = HTML_TO_MARK_MAP[name];
          }

          if (markToRemove) {
            const index = currentMarks.indexOf(markToRemove);
            if (index !== -1) {
              currentMarks.splice(index, 1);
            }
          }
        }
      },
    },
    { decodeEntities: true },
  );

  // Parse the HTML
  parser.write(html);
  parser.end();

  // Create the final span if there's any remaining text
  if (currentText) {
    createSpan();
  }

  // Merge consecutive spans with the same marks
  return spans
    .filter((span) => span.text.trim())
    .reduce((merged: any[], current: any) => {
      if (merged.length === 0) {
        return [current];
      }

      const previous = merged[merged.length - 1];
      const haveSameMarks =
        JSON.stringify(previous.marks) === JSON.stringify(current.marks);

      if (haveSameMarks) {
        previous.text += current.text;
        return merged;
      }

      return [...merged, current];
    }, []);
};

/**
 * Parse translated HTML back to Sanity block structure with preserved marks
 * @param translatedHtml The translated HTML string
 * @param originalBlock The original block structure to use as template
 * @returns Updated block with translated content and preserved marks
 */
export const parseHtmlToBlockStructure = (
  translatedHtml: string,
  originalBlock: any,
): any => {
  try {
    // Create a new block based on the original
    const newBlock = {
      ...originalBlock,
      _key: originalBlock._key, // Default to original key, will be updated if found in HTML
      style: originalBlock.style, // Default to original style, will be updated if found in HTML
      markDefs: originalBlock.markDefs || [], // Default to original markDefs, will be updated if found in HTML
      children: [],
    };

    // Track if we've found the block attributes
    let foundBlockKey = false;
    let foundBlockStyle = false;
    let foundMarkDefs = false;

    // Create a simple parser to extract block attributes
    const attributeParser = new htmlparser2.Parser(
      {
        onopentag(_, attributes) {
          // Extract block key from data attribute
          if (!foundBlockKey && attributes['data-block-key']) {
            newBlock._key = attributes['data-block-key'];
            foundBlockKey = true;
          }

          // Extract block style from data attribute
          if (!foundBlockStyle && attributes['data-block-style']) {
            newBlock.style = attributes['data-block-style'];
            foundBlockStyle = true;
          }

          // Extract markDefs from data attribute
          if (!foundMarkDefs && attributes['data-markdefs']) {
            try {
              newBlock.markDefs = JSON.parse(
                decodeURIComponent(attributes['data-markdefs']),
              );
              foundMarkDefs = true;
            } catch (e) {
              console.error('Failed to parse markDefs from HTML', e);
            }
          }
        },
      },
      { decodeEntities: true },
    );

    // Parse the HTML to extract block attributes
    attributeParser.write(translatedHtml);
    attributeParser.end();

    // Remove the wrapping <p> tags that toHTML adds if they exist
    // This is still using regex but only for a very simple case
    const cleanHtml = translatedHtml.replace(/^<p>|<\/p>$/g, '');

    // Parse HTML and convert back to spans with marks
    const spans = parseHtmlToSpans(cleanHtml);

    // Add spans to the block
    newBlock.children = spans;

    return newBlock;
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      'Failed to parse HTML back to block structure, falling back to text:',
      error,
    );

    // Create a plain text parser for the fallback
    let textContent = '';
    const textParser = new htmlparser2.Parser(
      {
        ontext(text) {
          textContent += text;
        },
      },
      { decodeEntities: true },
    );

    // Parse the HTML to extract text content
    textParser.write(translatedHtml);
    textParser.end();

    return {
      ...originalBlock,
      children: [
        {
          _type: SPAN_TYPE,
          text: textContent,
          marks: [],
        },
      ],
    };
  }
};
