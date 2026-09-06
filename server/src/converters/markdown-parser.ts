import { parseMarkdownToRichText, NotionRichTextItem } from "./rich-text.js";
import { createSafeMermaidNotionBlocks } from "./mermaid-sanitizer.js";

/**
 * Valid Notion code block languages
 */
const SUPPORTED_CODE_LANGUAGES = new Set([
  "abap", "arduino", "bash", "basic", "c", "clojure", "coffeescript", "c++", "c#",
  "css", "dart", "diff", "docker", "elixir", "elm", "erlang", "flow", "fortran",
  "f#", "gherkin", "glsl", "go", "graphql", "groovy", "haskell", "html", "java",
  "javascript", "json", "julia", "kotlin", "latex", "less", "lisp", "livescript",
  "lua", "makefile", "markdown", "markup", "matlab", "mermaid", "nix", "objective-c",
  "ocaml", "pascal", "perl", "php", "plain text", "powershell", "prolog", "protobuf",
  "python", "r", "reason", "ruby", "rust", "sass", "scala", "scheme", "scss",
  "shell", "sql", "swift", "typescript", "vb.net", "verilog", "vhdl", "visual basic",
  "webassembly", "xml", "yaml"
]);

function normalizeCodeLanguage(lang: string): string {
  const clean = lang.trim().toLowerCase();
  if (clean === "html-embed" || clean === "embed") return "html-embed";
  if (clean === "js") return "javascript";
  if (clean === "ts") return "typescript";
  if (clean === "py") return "python";
  if (clean === "sh" || clean === "zsh") return "bash";
  if (clean === "yml") return "yaml";
  if (clean === "csharp") return "c#";
  if (clean === "cpp") return "c++";
  if (SUPPORTED_CODE_LANGUAGES.has(clean)) return clean;
  return "plain text";
}

/**
 * Parses a markdown document string into an array of Notion Block objects
 */
export function markdownToNotionBlocks(markdown: string): any[] {
  if (!markdown) return [];

  const lines = markdown.split(/\r?\n/);
  const blocks: any[] = [];

  let inCodeBlock = false;
  let codeLanguage = "plain text";
  let codeBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Handle Code Blocks (```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // Closing code block
        const codeContent = codeBuffer.join("\n");
        if (codeLanguage === "mermaid") {
          blocks.push(...createSafeMermaidNotionBlocks(codeContent));
        } else if (codeLanguage === "html-embed") {
          const url = codeContent.trim();
          if (url.startsWith("http://") || url.startsWith("https://")) {
            blocks.push({
              object: "block",
              type: "embed",
              embed: {
                url,
                caption: [],
              },
            });
          }
        } else {
          blocks.push({
            object: "block",
            type: "code",
            code: {
              rich_text: parseMarkdownToRichText(codeContent),
              language: codeLanguage,
            },
          });
        }
        inCodeBlock = false;
        codeBuffer = [];
        codeLanguage = "plain text";
      } else {
        // Opening code block
        inCodeBlock = true;
        const langMatch = line.trim().slice(3).trim();
        codeLanguage = normalizeCodeLanguage(langMatch || "plain text");
        codeBuffer = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    // Empty lines
    if (!trimmed) {
      continue;
    }

    // Dividers (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({
        object: "block",
        type: "divider",
        divider: {},
      });
      continue;
    }

    // HTML iframe / embed (<iframe src="https://..."> or <embed src="https://...">)
    const iframeMatch = trimmed.match(
      /<(?:iframe|embed)\b[^>]*\bsrc=["'](https?:\/\/[^"']+)["'][^>]*>/i
    );
    if (iframeMatch) {
      blocks.push({
        object: "block",
        type: "embed",
        embed: {
          url: iframeMatch[1],
          caption: [],
        },
      });
      continue;
    }

    // Heading 1 (# ...)
    if (line.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: parseMarkdownToRichText(line.slice(2).trim()),
        },
      });
      continue;
    }

    // Heading 2 (## ...)
    if (line.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: parseMarkdownToRichText(line.slice(3).trim()),
        },
      });
      continue;
    }

    // Heading 3 (### ...)
    if (line.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: parseMarkdownToRichText(line.slice(4).trim()),
        },
      });
      continue;
    }

    // Quote (> ...)
    if (line.startsWith("> ") || line === ">") {
      blocks.push({
        object: "block",
        type: "quote",
        quote: {
          rich_text: parseMarkdownToRichText(line.slice(line.startsWith("> ") ? 2 : 1).trim()),
        },
      });
      continue;
    }

    // To-Do list (- [ ] or - [x])
    const todoMatch = line.match(/^[-*]\s+\[([ xX])\]\s+(.+)$/);
    if (todoMatch) {
      const checked = todoMatch[1].toLowerCase() === "x";
      const content = todoMatch[2];
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: parseMarkdownToRichText(content),
          checked,
        },
      });
      continue;
    }

    // Bulleted list item (- ... or * ...)
    if (/^[-*]\s+/.test(trimmed)) {
      const content = trimmed.replace(/^[-*]\s+/, "");
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: parseMarkdownToRichText(content),
        },
      });
      continue;
    }

    // Numbered list item (1. ...)
    const numberedMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
    if (numberedMatch) {
      const content = numberedMatch[2];
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: parseMarkdownToRichText(content),
        },
      });
      continue;
    }

    // Default: Paragraph
    blocks.push({
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: parseMarkdownToRichText(line),
      },
    });
  }

  // If file ended while still in code block, flush it
  if (inCodeBlock && codeBuffer.length > 0) {
    const codeContent = codeBuffer.join("\n");
    if (codeLanguage === "mermaid") {
      blocks.push(...createSafeMermaidNotionBlocks(codeContent));
    } else {
      blocks.push({
        object: "block",
        type: "code",
        code: {
          rich_text: parseMarkdownToRichText(codeContent),
          language: codeLanguage,
        },
      });
    }
  }

  return blocks;
}

/**
 * Formats rich_text array back to markdown string
 */
function richTextToMarkdown(richTextArray: any[]): string {
  if (!richTextArray || !Array.isArray(richTextArray)) return "";

  return richTextArray
    .map((item) => {
      let content = item.plain_text || item.text?.content || "";
      const ann = item.annotations;
      const url = item.text?.link?.url || item.href;

      if (ann?.code) content = `\`${content}\``;
      if (ann?.bold && ann?.italic) content = `***${content}***`;
      else if (ann?.bold) content = `**${content}**`;
      else if (ann?.italic) content = `*${content}*`;
      if (ann?.strikethrough) content = `~~${content}~~`;
      if (url) content = `[${content}](${url})`;

      return content;
    })
    .join("");
}

/**
 * Converts Notion Block hierarchy back into clean Markdown
 */
export function notionBlocksToMarkdown(blocks: any[], indentLevel: number = 0): string {
  const indent = "  ".repeat(indentLevel);
  const markdownLines: string[] = [];

  for (const block of blocks) {
    const type = block.type;
    const data = block[type];

    switch (type) {
      case "heading_1":
        markdownLines.push(`# ${richTextToMarkdown(data.rich_text)}\n`);
        break;
      case "heading_2":
        markdownLines.push(`## ${richTextToMarkdown(data.rich_text)}\n`);
        break;
      case "heading_3":
        markdownLines.push(`### ${richTextToMarkdown(data.rich_text)}\n`);
        break;
      case "paragraph":
        markdownLines.push(`${indent}${richTextToMarkdown(data.rich_text)}\n`);
        break;
      case "bulleted_list_item":
        markdownLines.push(`${indent}- ${richTextToMarkdown(data.rich_text)}`);
        break;
      case "numbered_list_item":
        markdownLines.push(`${indent}1. ${richTextToMarkdown(data.rich_text)}`);
        break;
      case "to_do":
        const check = data.checked ? "x" : " ";
        markdownLines.push(`${indent}- [${check}] ${richTextToMarkdown(data.rich_text)}`);
        break;
      case "quote":
        markdownLines.push(`${indent}> ${richTextToMarkdown(data.rich_text)}\n`);
        break;
      case "divider":
        markdownLines.push(`---\n`);
        break;
      case "code":
        markdownLines.push(
          `\`\`\`${data.language || ""}\n${richTextToMarkdown(data.rich_text)}\n\`\`\`\n`
        );
        break;
      case "embed":
        markdownLines.push(`<iframe src="${data.url}"></iframe>\n`);
        break;
      default:
        if (data?.rich_text) {
          markdownLines.push(`${indent}${richTextToMarkdown(data.rich_text)}\n`);
        }
        break;
    }

    if (block.children && Array.isArray(block.children) && block.children.length > 0) {
      markdownLines.push(notionBlocksToMarkdown(block.children, indentLevel + 1));
    }
  }

  return markdownLines.join("\n");
}
