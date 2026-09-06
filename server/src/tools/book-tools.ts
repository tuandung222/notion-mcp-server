import { z } from "zod";
import path from "node:path";
import { NotionService } from "../client/notion-client.js";
import { scanBookFolder, BookChapterFile } from "../converters/folder-scanner.js";
import { markdownToNotionBlocks } from "../converters/markdown-parser.js";

export function registerBookTools(server: any, notion: NotionService) {
  server.tool(
    "notion_sync_book_database",
    "Scan a local folder of Markdown files (chapters/articles) and sync it to Notion as a Master Book Hub with an Inline Database of chapters. Supports incremental sync (only updates modified files via SHA256 checksum), automatic footer navigation between chapters, and rich formatting with native Mermaid diagrams.",
    {
      folder_path: z
        .string()
        .describe("The absolute path to the local directory containing markdown chapters/files."),
      parent_page_id: z
        .string()
        .describe("The Notion Page ID where the book Master Page will be created (or target existing book page)."),
      book_title: z
        .string()
        .optional()
        .describe("The title of the book or tutorial series. Defaults to the folder name."),
      book_icon: z
        .string()
        .default("📚")
        .describe("An emoji for the Master Page icon (default '📚')."),
      enable_footer_nav: z
        .boolean()
        .default(true)
        .describe("Whether to automatically generate Previous/Next chapter navigation links at the footer of each page."),
      force_update: z
        .boolean()
        .default(false)
        .describe("If true, overwrites all chapters even if file checksum hash has not changed."),
    },
    async ({
      folder_path,
      parent_page_id,
      book_title,
      book_icon,
      enable_footer_nav,
      force_update,
    }: {
      folder_path: string;
      parent_page_id: string;
      book_title?: string;
      book_icon: string;
      enable_footer_nav: boolean;
      force_update: boolean;
    }) => {
      const cleanParentId = parent_page_id.replace(/-/g, "");

      // 1. Scan local folder
      const resolvedFolder = path.resolve(folder_path);
      const chapters = scanBookFolder(resolvedFolder);

      if (chapters.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: `No markdown (.md) files found in folder: ${resolvedFolder}`,
            },
          ],
        };
      }

      const inferredTitle = book_title || path.basename(resolvedFolder).replace(/[-_]/g, " ");

      // 2. Check or Create Master Page
      // Check if parent_page_id itself already contains a Book Database
      let masterPageId = cleanParentId;
      let databaseId = await notion.findDatabaseInPage(masterPageId);

      if (!databaseId) {
        // Create a new Master Book Page under parent
        const masterPage = await notion.createPage({
          parentId: cleanParentId,
          parentType: "page_id",
          title: inferredTitle,
          iconEmoji: book_icon,
          initialBlocks: markdownToNotionBlocks(`
# ${inferredTitle}

> 📖 **Cẩm nang tổng hợp**: Toàn bộ tài liệu, chương mục và tiến độ được tự động đồng bộ từ local repository.

---
`),
        });
        masterPageId = masterPage.id;

        // Create inline database inside the new Master Page
        const createdDb = await notion.createBookDatabase(
          masterPageId,
          `Mục Lục & Tiến Độ: ${inferredTitle}`
        );
        databaseId = createdDb.id;
      }

      // 3. Query existing entries in database for incremental sync
      const existingEntries = await notion.queryDatabaseEntries(databaseId);
      const existingMap = new Map<
        string,
        { pageId: string; fileHash: string; order: number; title: string }
      >();
      for (const entry of existingEntries) {
        if (entry.filePath) {
          existingMap.set(entry.filePath, entry);
        }
      }

      // 4. Process each chapter
      let createdCount = 0;
      let updatedCount = 0;
      let skippedCount = 0;
      const resultsSummary: any[] = [];

      for (let i = 0; i < chapters.length; i++) {
        const chapter = chapters[i];
        const existing = existingMap.get(chapter.filePath);

        // Check if content is unchanged
        if (
          !force_update &&
          existing &&
          existing.fileHash === chapter.fileHash
        ) {
          skippedCount++;
          resultsSummary.push({
            order: chapter.order,
            title: chapter.title,
            filePath: chapter.filePath,
            status: "Skipped (Unchanged)",
            pageId: existing.pageId,
          });
          continue;
        }

        // Prepare content with optional Footer Navigation
        let finalMarkdown = chapter.content;
        if (enable_footer_nav) {
          const prevChapter = i > 0 ? chapters[i - 1] : null;
          const nextChapter = i < chapters.length - 1 ? chapters[i + 1] : null;

          const prevLink = prevChapter
            ? `[⬅️ ${prevChapter.order}. ${prevChapter.title}]`
            : "*(Đầu sách)*";
          const nextLink = nextChapter
            ? `[${nextChapter.order}. ${nextChapter.title} ➡️]`
            : "*(Hết sách)*";

          finalMarkdown += `\n\n---\n> 🧭 **Điều hướng:** ${prevLink} • [🏠 Mục lục chính] • ${nextLink}\n`;
        }

        const blocks = markdownToNotionBlocks(finalMarkdown);

        const upsertRes = await notion.upsertChapterEntry({
          databaseId,
          existingPageId: existing ? existing.pageId : null,
          title: `${chapter.order.toString().padStart(2, "0")}. ${chapter.title}`,
          order: chapter.order,
          status: chapter.status,
          tags: chapter.tags,
          words: chapter.wordCount,
          filePath: chapter.filePath,
          fileHash: chapter.fileHash,
          blocks,
        });

        if (upsertRes.action === "created") {
          createdCount++;
        } else if (upsertRes.action === "updated") {
          updatedCount++;
        }

        resultsSummary.push({
          order: chapter.order,
          title: chapter.title,
          filePath: chapter.filePath,
          status: upsertRes.action === "created" ? "Created" : "Updated",
          pageId: upsertRes.pageId,
        });
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                success: true,
                bookTitle: inferredTitle,
                masterPageId,
                databaseId,
                stats: {
                  totalChapters: chapters.length,
                  created: createdCount,
                  updated: updatedCount,
                  skipped: skippedCount,
                },
                chapters: resultsSummary,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
