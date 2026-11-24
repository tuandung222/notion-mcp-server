/**
 * RichText Tokenizer & Converter for Notion API
 * Adheres strictly to Notion requirements:
 * 1. Tokenizes inline Markdown (**bold**, *italic*, `code`, [link](url), ~~strikethrough~~)
 *    into rich_text objects with proper annotations.
 * 2. Never sends raw markdown formatting syntax inside rich_text.text.content.
 * 3. Automatically chunks text segments exceeding Notion's 2000-character limit.
 */

export interface NotionRichTextItem {
  type: "text" | "equation";
  text?: {
    content: string;
    link?: { url: string } | null;
  };
  equation?: {
    expression: string;
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

function appendRestored(
  results: NotionRichTextItem[],
  text: string,
  codeSpans: string[],
  mathSpans: string[],
  annotations: NotionRichTextItem["annotations"] = {}
): void {
  if (!text) return;
  const parts = text.split(/(\u0000(?:CODE|MATH)_\d+\u0000)/);
  for (const p of parts) {
    const codeMatch = p.match(/^\u0000CODE_(\d+)\u0000$/);
    const mathMatch = p.match(/^\u0000MATH_(\d+)\u0000$/);
    if (codeMatch) {
      const idx = parseInt(codeMatch[1], 10);
      results.push(...chunkText(codeSpans[idx], null, { code: true, ...(annotations || {}) }));
    } else if (mathMatch) {
      const idx = parseInt(mathMatch[1], 10);
      results.push({
        type: "equation",
        equation: { expression: mathSpans[idx].trim() },
      });
    } else if (p.length > 0) {
      results.push(...chunkText(p, null, annotations));
    }
  }
}

/**
 * Parses markdown inline text into an array of Notion RichTextItem objects
 */
export function parseMarkdownToRichText(input: string): NotionRichTextItem[] {
  if (!input) {
    return [];
  }

  // Step 1: Protect inline code spans (`...`) and inline math ($...$)
  const codeSpans: string[] = [];
  const mathSpans: string[] = [];
  let protectedText = input.replace(/`([^`]+?)`/g, (_, code) => {
    const idx = codeSpans.length;
    codeSpans.push(code);
    return `\u0000CODE_${idx}\u0000`;
  });

  // Protect inline math: $formula$ (exclude $$ which is block math)
  protectedText = protectedText.replace(/(?<!\$)\$(?!\$)(.+?)(?<!\$)\$(?!\$)/g, (_, math) => {
    const idx = mathSpans.length;
    mathSpans.push(math);
    return `\u0000MATH_${idx}\u0000`;
  });

  // Step 2: Parse Markdown inline elements with strict precedence:
  const regex =
    /(\[(.+?)\]\((https?:\/\/[^\s\)]+)\))|(\*\*\*(.+?)\*\*\*|___(.+?)___)|(\*\*(.+?)\*\*|__(.+?)__)|(\*(.+?)\*|(?<!\w)_(.+?)_(?!\w))|(~~(.+?)~~)|(\u0000CODE_(\d+)\u0000)|(\u0000MATH_(\d+)\u0000)/g;

  const results: NotionRichTextItem[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(protectedText)) !== null) {
    // Text before match
    if (match.index > lastIndex) {
      const plainText = protectedText.slice(lastIndex, match.index);
      appendRestored(results, plainText, codeSpans, mathSpans);
    }

    if (match[1]) {
      // Link: [linkText](url)
      const linkText = match[2];
      const url = match[3];
      results.push(...chunkText(linkText, { url }));
    } else if (match[4]) {
      // Bold + Italic: ***text***
      const content = match[5] || match[6];
      appendRestored(results, content, codeSpans, mathSpans, { bold: true, italic: true });
    } else if (match[7]) {
      // Bold: **text**
      const content = match[8] || match[9];
      appendRestored(results, content, codeSpans, mathSpans, { bold: true });
    } else if (match[10]) {
      // Italic: *text* or _text_
      const content = match[11] || match[12];
      appendRestored(results, content, codeSpans, mathSpans, { italic: true });
    } else if (match[13]) {
      // Strikethrough: ~~text~~
      const content = match[14];
      appendRestored(results, content, codeSpans, mathSpans, { strikethrough: true });
    } else if (match[15]) {
      // Protected Code Span placeholder
      const codeIdx = parseInt(match[16], 10);
      results.push(...chunkText(codeSpans[codeIdx], null, { code: true }));
    } else if (match[17]) {
      // Protected Math Span placeholder
      const mathIdx = parseInt(match[18], 10);
      results.push({
        type: "equation",
        equation: { expression: mathSpans[mathIdx].trim() },
      });
    }

    lastIndex = regex.lastIndex;
  }

  // Trailing text after the last match
  if (lastIndex < protectedText.length) {
    const remainingText = protectedText.slice(lastIndex);
    appendRestored(results, remainingText, codeSpans, mathSpans);
  }

  return results;
}

