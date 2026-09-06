import { NotionService } from "../src/client/notion-client.js";
import { markdownToNotionBlocks } from "../src/converters/markdown-parser.js";

async function main() {
  const notion = new NotionService();
  console.log("🔍 Searching Notion workspace for accessible pages...");

  const searchRes = await notion.search("", "page", 5);
  console.log(`Found ${searchRes.results.length} accessible page(s).`);

  if (searchRes.results.length === 0) {
    console.log("No pages found. The Notion integration might need to be shared with a page.");
    return;
  }

  for (const page of searchRes.results) {
    const p: any = page;
    const title =
      p.properties?.title?.title?.[0]?.plain_text ||
      p.properties?.Name?.title?.[0]?.plain_text ||
      "(Untitled Page)";
    console.log(`- Page: "${title}" | ID: ${p.id} | URL: ${p.url}`);
  }

  // Pick the first page to append a demo section
  const targetPage: any = searchRes.results[0];
  const pageTitle =
    targetPage.properties?.title?.title?.[0]?.plain_text ||
    targetPage.properties?.Name?.title?.[0]?.plain_text ||
    "(Untitled)";
  console.log(`\n🎯 Selected target page: "${pageTitle}" (${targetPage.id})`);

  // Prepare a demo markdown with rich formatting and native Mermaid diagram
  const demoMarkdown = `
---

## ⚡ Custom Notion MCP Server Live Demo

*Tài liệu này được sinh và đẩy tự động bởi **Custom Notion MCP Server** của bạn.*

### 🛠️ Các tính năng đã được kích hoạt:
- **RichText Formatting**: Tự động nhận diện chữ **đậm**, chữ *nghiêng*, \`code inline\`, và link [GitHub Repo](https://github.com/tuandung222/notion-mcp-server).
- **Auto-Chunking**: Tự động chia nhỏ blocks thành batch 100 và delay chống Rate Limit 429.
- **Native Vector Mermaid**: Không dùng ASCII Art, hiển thị biểu đồ SVG co giãn sắc nét!

### 📊 Sơ đồ Kiến trúc Custom MCP Server:
\`\`\`mermaid
graph LR
    subgraph Client [AI Assistants]
        A[Google Antigravity / Claude / Cursor]
    end

    subgraph MCP [Custom Notion MCP Server]
        B[Stdio Transport] --> C[Markdown Parser]
        B --> D[Mermaid Block Generator]
        C --> E[RichText Tokenizer]
        E --> F[Chunking & Rate Limiter]
        D --> F
    end

    subgraph NotionCloud [Notion Cloud API]
        F -->|Batch 100 / Exponential Backoff| G[Notion API v1]
        G --> H[(Notion Workspace)]
    end

    A --> B
\`\`\`

- [x] Khởi tạo custom repository
- [x] Triển khai bộ parse Markdown sang RichText annotations
- [x] Tích hợp Mermaid vector diagram
- [x] Push mã nguồn lên GitHub: tuandung222/notion-mcp-server
- [x] Live test trực tiếp trên Notion workspace

> *"Automation is good, but resilient automation with clean formatting is superpower!"*
`;

  console.log("\n🚀 Converting markdown to blocks and appending to Notion...");
  const blocks = markdownToNotionBlocks(demoMarkdown);
  console.log(`Generated ${blocks.length} Notion blocks.`);

  const appendResult = await notion.appendBlocksChunked(targetPage.id, blocks);
  console.log(`\n✅ Thành công! Đã thêm ${appendResult.totalAppended} blocks vào Notion page.`);
  console.log(`🔗 Mở trang Notion để xem kết quả: ${targetPage.url}`);

  console.log("\n📖 Đọc ngược nội dung trang từ Notion API qua notionBlocksToMarkdown:");
  const { notionBlocksToMarkdown } = await import("../src/converters/markdown-parser.js");
  const allBlocks = await notion.getAllBlockChildren(targetPage.id, false);
  const recentBlocks = allBlocks.slice(-15);
  console.log(notionBlocksToMarkdown(recentBlocks));
}

main().catch((err) => {
  console.error("❌ Error running demo:", err?.message || err);
});
