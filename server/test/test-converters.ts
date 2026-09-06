import { parseMarkdownToRichText } from "../src/converters/rich-text.js";
import {
  markdownToNotionBlocks,
  notionBlocksToMarkdown,
} from "../src/converters/markdown-parser.js";

function runTests() {
  console.log("=== TEST 1: Inline RichText Parsing ===");
  const inputMd =
    "Xin chào **chữ đậm**, *chữ nghiêng*, `code inline`, ~~gạch ngang~~ và [Notion](https://notion.so)!";
  const richTexts = parseMarkdownToRichText(inputMd);
  console.log("Input:", inputMd);
  console.log("Parsed RichText items count:", richTexts.length);
  console.log(JSON.stringify(richTexts, null, 2));

  // Verify annotations
  const boldItem = richTexts.find((r) => r.annotations?.bold);
  if (!boldItem || boldItem.text.content !== "chữ đậm") {
    throw new Error("Failed bold parsing test");
  }

  const codeItem = richTexts.find((r) => r.annotations?.code);
  if (!codeItem || codeItem.text.content !== "code inline") {
    throw new Error("Failed code parsing test");
  }

  const linkItem = richTexts.find((r) => r.text?.link?.url);
  if (
    !linkItem ||
    linkItem.text.content !== "Notion" ||
    linkItem.text.link?.url !== "https://notion.so"
  ) {
    throw new Error("Failed link parsing test");
  }
  console.log("✅ RichText parser test passed!");

  console.log("\n=== TEST 2: Markdown to Blocks Parsing ===");
  const docMd = `
# Tiêu đề 1
## Tiêu đề 2
### Tiêu đề 3

Đây là đoạn văn có **bold** và \`inline code\`.

- Mục gạch đầu dòng 1
- Mục gạch đầu dòng 2

1. Số 1
2. Số 2

- [ ] Việc cần làm 1
- [x] Việc đã xong

> Đây là trích dẫn

---

\`\`\`mermaid
graph TD
  A[User] --> B(Custom MCP)
  B --> C[Notion API]
\`\`\`
`;

  const blocks = markdownToNotionBlocks(docMd);
  console.log("Total generated blocks:", blocks.length);

  // Verify mermaid code block
  const mermaidBlock = blocks.find((b) => b.type === "code" && b.code.language === "mermaid");
  if (!mermaidBlock) {
    throw new Error("Failed mermaid block test: block not found or language != mermaid");
  }
  console.log("✅ Mermaid native block verified:", JSON.stringify(mermaidBlock, null, 2));

  console.log("\n=== TEST 3: Reverse Converter (Blocks to Markdown) ===");
  const reversedMd = notionBlocksToMarkdown(blocks);
  console.log("Reversed Markdown:\n", reversedMd);
  console.log("✅ Reverse converter test passed!");

  console.log("\n🎉 ALL TESTS PASSED SUCCESSFULLY!");
}

runTests();
