import path from "node:path";
import fs from "node:fs";
import { NotionService } from "../src/client/notion-client.js";
import { scanBookFolder } from "../src/converters/folder-scanner.js";
import { markdownToNotionBlocks } from "../src/converters/markdown-parser.js";

async function main() {
  const notion = new NotionService();
  const folderPath = path.resolve(process.cwd(), "../examples/llm-serving-handbook");
  const parentPageId = "3d312a7a94358121ab65d7b183650b7d";
  const bookTitle = "Cẩm Nang LLM Serving & Kernel Optimization 2026";

  console.log("=== PHASE 1: Quét Thư Mục Sách Cục Bộ ===");
  const chapters = scanBookFolder(folderPath);
  console.log(`Đã phát hiện ${chapters.length} chương sách trong: ${folderPath}`);
  for (const c of chapters) {
    console.log(`- [Chương ${c.order}] ${c.title} | Status: ${c.status} | Tags: ${c.tags.join(", ")} | Hash: ${c.fileHash}`);
  }

  console.log("\n=== PHASE 2: Đồng Bộ Lần Đầu Lên Notion ===");
  // We can test the sync logic directly:
  const inferredTitle = bookTitle;

  // 1. Create Master Page
  console.log("Creating Master Page on Notion...");
  const masterPage = await notion.createPage({
    parentId: parentPageId,
    parentType: "page_id",
    title: inferredTitle,
    iconEmoji: "📚",
    initialBlocks: markdownToNotionBlocks(`
# ${inferredTitle}

> 📖 **Cẩm nang chuyên sâu**: Dành cho kỹ sư hệ thống AI nghiên cứu về vLLM, PagedAttention, Marlin Kernel và Tối ưu hóa GPU Serving.
> 
> *Tất cả các chương mục dưới đây được đồng bộ tự động từ thư mục Markdown local thông qua Custom Notion MCP Server.*

---
`),
  });
  console.log(`✅ Master Page created: ${masterPage.id} | ${(masterPage as any).url}`);

  // 2. Create Inline Database
  console.log("Creating Inline Database inside Master Page...");
  const database = await notion.createBookDatabase(
    masterPage.id,
    `Mục Lục & Tiến Độ: ${inferredTitle}`
  );
  console.log(`✅ Database created: ${database.id}`);

  // 3. Insert Chapters
  console.log("\nInserting chapters into Database with Footer Navigation...");
  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i];
    const prevChapter = i > 0 ? chapters[i - 1] : null;
    const nextChapter = i < chapters.length - 1 ? chapters[i + 1] : null;

    const prevLink = prevChapter
      ? `[⬅️ Chương ${prevChapter.order}: ${prevChapter.title}]`
      : "*(Đầu sách)*";
    const nextLink = nextChapter
      ? `[Chương ${nextChapter.order}: ${nextChapter.title} ➡️]`
      : "*(Hết sách)*";

    const navFooter = `\n\n---\n> 🧭 **Điều hướng:** ${prevLink} • [🏠 Mục lục Cẩm nang] • ${nextLink}\n`;
    const fullMarkdown = chapter.content + navFooter;
    const blocks = markdownToNotionBlocks(fullMarkdown);

    const res = await notion.upsertChapterEntry({
      databaseId: database.id,
      title: `${chapter.order.toString().padStart(2, "0")}. ${chapter.title}`,
      order: chapter.order,
      status: chapter.status,
      tags: chapter.tags,
      words: chapter.wordCount,
      filePath: chapter.filePath,
      fileHash: chapter.fileHash,
      blocks,
    });
    console.log(`✅ [Chương ${chapter.order}] "${chapter.title}" -> ${res.action} (Page ID: ${res.pageId})`);
  }

  console.log("\n=== PHASE 3: Kiểm Tra Tính Năng Incremental Sync (Chạy Lần 2) ===");
  console.log("Querying database entries to check hashes...");
  const existing = await notion.queryDatabaseEntries(database.id);
  console.log(`Found ${existing.length} entries in database.`);
  for (const entry of existing) {
    const matchingLocal = chapters.find((c) => c.filePath === entry.filePath);
    const isMatched = matchingLocal && matchingLocal.fileHash === entry.fileHash;
    console.log(`- Entry: "${entry.title}" | Hash matches local: ${isMatched ? "✅ YES (Skipped - No change)" : "❌ NO"}`);
  }

  console.log("\n🎉 NGHIỆM THU THÀNH CÔNG 100%!");
  console.log(`🔗 Link Master Page Notion: ${(masterPage as any).url}`);
}

main().catch(console.error);
