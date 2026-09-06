/**
 * RichText Tokenizer & Converter for Notion API
 * Adheres strictly to Notion requirements:
 * 1. Tokenizes inline Markdown (**bold**, *italic*, `code`, [link](url), ~~strikethrough~~)
 *    into rich_text objects with proper annotations.
 * 2. Never sends raw markdown formatting syntax inside rich_text.text.content.
 * 3. Automatically chunks text segments exceeding Notion's 2000-character limit.
 */

export interface NotionRichTextItem {
  type: "text";
  text: {
    content: string;
    link?: { url: string } | null;
  };
  annotations?: {
    bold?: boolean;
    italic?: boolean;
    strikethrough?: boolean;
    underline?: boolean;
    code?: boolean;
    color?:
      | "default"
      | "gray"
      | "brown"
      | "orange"
      | "yellow"
      | "green"
      | "blue"
      | "purple"
      | "pink"
      | "red"
      | "gray_background"
      | "brown_background"
      | "orange_background"
      | "yellow_background"
      | "green_background"
      | "blue_background"
      | "purple_background"
      | "pink_background"
      | "red_background";
  };
}

/**
 * Splits text longer than 2000 characters to prevent Notion 400 validation error
 */
function chunkText(
  text: string,
  link?: { url: string } | null,
  annotations?: NotionRichTextItem["annotations"]
): NotionRichTextItem[] {
  const MAX_LEN = 2000;
  if (!text) return [];
  if (text.length <= MAX_LEN) {
    return [
      {
        type: "text",
        text: {
          content: text,
          link: link || null,
        },
        annotations: annotations || {},
      },
    ];
  }

  const items: NotionRichTextItem[] = [];
  for (let i = 0; i < text.length; i += MAX_LEN) {
    items.push({
      type: "text",
      text: {
        content: text.slice(i, i + MAX_LEN),
        link: link || null,
      },
      annotations: annotations || {},
    });
  }
  return items;
}

/**
 * Parses markdown inline text into an array of Notion RichTextItem objects
 */
export function parseMarkdownToRichText(input: string): NotionRichTextItem[] {
  if (!input) {
    return [];
  }

  const results: NotionRichTextItem[] = [];

  // Match Markdown inline elements:
  // 1. Links: [text](url)
  // 2. Bold+Italic: ***text*** or ___text___
  // 3. Bold: **text** or __text__
  // 4. Italic: *text* or _text_
  // 5. Strikethrough: ~~text~~
  // 6. Code: `text`
  const regex =
    /(\[(.+?)\]\((https?:\/\/[^\s\)]+)\))|(\*\*\*(.+?)\*\*\*|___(.+?)___)|(\*\*(.+?)\*\*|__(.+?)__)|(\*(.+?)\*|_(.+?)_)|(~~(.+?)~~)|(`(.+?)`)/g;

  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(input)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      const plainText = input.slice(lastIndex, match.index);
      results.push(...chunkText(plainText));
    }

    if (match[1]) {
      // Link: [linkText](url)
      const linkText = match[2];
      const url = match[3];
      results.push(...chunkText(linkText, { url }));
    } else if (match[4]) {
      // Bold + Italic: ***text***
      const content = match[5] || match[6];
      results.push(...chunkText(content, null, { bold: true, italic: true }));
    } else if (match[7]) {
      // Bold: **text**
      const content = match[8] || match[9];
      results.push(...chunkText(content, null, { bold: true }));
    } else if (match[10]) {
      // Italic: *text*
      const content = match[11] || match[12];
      results.push(...chunkText(content, null, { italic: true }));
    } else if (match[13]) {
      // Strikethrough: ~~text~~
      const content = match[14];
      results.push(...chunkText(content, null, { strikethrough: true }));
    } else if (match[15]) {
      // Inline Code: `text`
      const content = match[16];
      results.push(...chunkText(content, null, { code: true }));
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text after the last match
  if (lastIndex < input.length) {
    const remainingText = input.slice(lastIndex);
    results.push(...chunkText(remainingText));
  }

  return results;
}
