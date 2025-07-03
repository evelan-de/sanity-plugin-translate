/**
 * HTML conversion and parsing utilities for Sanity block content
 */
import { PortableTextHtmlComponents, toHTML } from '@portabletext/to-html';
import { uuid } from '@sanity/uuid';

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
 * Extract text segments with marks from HTML
 * @param html HTML string to parse
 * @returns Array of segments with text, marks, and position
 */
export const extractSegmentsFromHtml = (
  html: string,
): {
  text: string;
  marks: string[];
  startIndex: number;
  endIndex: number;
}[] => {
  const segments: {
    text: string;
    marks: string[];
    startIndex: number;
    endIndex: number;
  }[] = [];

  // Extract links with markDef keys
  const linkRegex = /<a[^>]*data-markdef-key="([^"]*)"[^>]*>([^<]*)<\/a>/g;
  let linkMatch;
  while ((linkMatch = linkRegex.exec(html)) !== null) {
    const [fullMatch, markDefKey, linkText] = linkMatch;
    if (markDefKey && linkText) {
      segments.push({
        text: linkText,
        marks: [markDefKey],
        startIndex: linkMatch.index,
        endIndex: linkMatch.index + fullMatch.length,
      });
    }
  }

  // Process standard marks (strong, em, etc.)
  for (const [tag, mark] of Object.entries(HTML_TO_MARK_MAP)) {
    const tagRegex = new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, 'g');
    let tagMatch;
    while ((tagMatch = tagRegex.exec(html)) !== null) {
      const [fullMatch, content] = tagMatch;
      if (content) {
        segments.push({
          text: content,
          marks: [mark],
          startIndex: tagMatch.index,
          endIndex: tagMatch.index + fullMatch.length,
        });
      }
    }
  }

  // Process custom marks with data-mark attribute
  const customMarkRegex = /<span[^>]*data-mark="([^"]*)"[^>]*>([^<]*)<\/span>/g;
  let customMarkMatch;
  while ((customMarkMatch = customMarkRegex.exec(html)) !== null) {
    const [fullMatch, markName, content] = customMarkMatch;
    if (markName && content) {
      segments.push({
        text: content,
        marks: [markName],
        startIndex: customMarkMatch.index,
        endIndex: customMarkMatch.index + fullMatch.length,
      });
    }
  }

  return segments.sort((a, b) => a.startIndex - b.startIndex);
};

/**
 * Build a map of character positions to marks
 * @param segments Text segments with marks
 * @param plainText Plain text version of HTML
 * @returns Map of character positions to marks
 */
export const buildMarkMap = (
  segments: {
    text: string;
    marks: string[];
    startIndex: number;
    endIndex: number;
  }[],
  plainText: string,
): Map<number, string[]> => {
  const markMap = new Map<number, string[]>();
  let currentPosition = 0;

  for (const segment of segments) {
    const segmentText = segment.text;
    const textPosition = plainText.indexOf(segmentText, currentPosition);

    if (textPosition >= 0) {
      // Apply marks to each character position
      for (let i = 0; i < segmentText.length; i++) {
        const position = textPosition + i;
        const existingMarks = markMap.get(position) || [];
        markMap.set(position, [...existingMarks, ...segment.marks]);
      }

      // Update current position to avoid re-matching the same text
      currentPosition = textPosition + segmentText.length;
    }
  }

  return markMap;
};

/**
 * Parse HTML string into Sanity spans with marks
 * @param html HTML string to parse
 * @returns Array of span objects with marks
 */
export const parseHtmlToSpans = (html: string): any[] => {
  // Extract all segments with marks from the HTML
  const segments = extractSegmentsFromHtml(html);

  // If no segments were found, extract the plain text
  if (segments.length === 0) {
    const plainText = html.replace(/<[^>]*>/g, '');
    if (plainText.trim()) {
      return [
        {
          _type: SPAN_TYPE,
          _key: uuid(),
          text: plainText,
          marks: [],
        },
      ];
    }
    return [];
  }

  // Extract plain text version for reference
  const plainText = html.replace(/<[^>]*>/g, '');

  // Build a map of character positions to marks
  const markMap = buildMarkMap(segments, plainText);

  // Create spans based on continuous runs of the same marks
  const spans: any[] = [];
  let currentMarks: string[] = [];
  let currentText = '';

  for (let i = 0; i < plainText.length; i++) {
    const char = plainText[i];
    const marksAtPosition = markMap.get(i) || [];

    // If marks changed, create a new span
    if (JSON.stringify(marksAtPosition) !== JSON.stringify(currentMarks)) {
      if (currentText) {
        spans.push({
          _type: SPAN_TYPE,
          _key: uuid(),
          text: currentText,
          marks: currentMarks,
        });
      }

      currentText = char;
      currentMarks = marksAtPosition;
    } else {
      currentText += char;
    }
  }

  // Add the last span
  if (currentText) {
    spans.push({
      _type: SPAN_TYPE,
      _key: uuid(),
      text: currentText,
      marks: currentMarks,
    });
  }

  // Filter out empty spans and merge consecutive spans with same marks
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
    // Remove the wrapping <p> tags that toHTML adds
    const cleanHtml = translatedHtml.replace(/^<p>|<\/p>$/g, '');

    // Extract block key from data attribute
    const blockKeyMatch = cleanHtml.match(/data-block-key="([^"]*)"/i);
    const blockKey = blockKeyMatch ? blockKeyMatch[1] : originalBlock._key;

    // Extract block style from data attribute
    const blockStyleMatch = cleanHtml.match(/data-block-style="([^"]*)"/i);
    const blockStyle = blockStyleMatch
      ? blockStyleMatch[1]
      : originalBlock.style;

    // Extract markDefs from data attribute
    const markDefsMatch = cleanHtml.match(/data-markdefs="([^"]*)"/i);
    let markDefs = originalBlock.markDefs || [];
    if (markDefsMatch && markDefsMatch[1]) {
      try {
        markDefs = JSON.parse(decodeURIComponent(markDefsMatch[1]));
      } catch (e) {
        console.error('Failed to parse markDefs from HTML', e);
      }
    }

    // Create a new block based on the original but with extracted data
    const newBlock = {
      ...originalBlock,
      _key: blockKey,
      style: blockStyle,
      markDefs: markDefs,
      children: [],
    };

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
    // Fallback: just replace text in first span
    const textContent = translatedHtml.replace(/<[^>]*>/g, '');
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
