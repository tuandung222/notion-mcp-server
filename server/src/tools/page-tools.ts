import { z } from "zod";
import { NotionService } from "../client/notion-client.js";
import {
  markdownToNotionBlocks,
  notionBlocksToMarkdown,
} from "../converters/markdown-parser.js";

export function registerPageTools(server: any, notion: NotionService) {
  // Tool: notion_get_page_content
  server.tool(
    "notion_get_page_content",
    "Retrieve all content and blocks of a Notion page. Supports recursive fetching of nested children blocks, and automatically converts the block hierarchy into readable Markdown or structured JSON.",
    {
      page_id: z
        .string()
        .describe("The ID of the Notion page or block to read."),
      format: z
        .enum(["markdown", "json"])
        .default("markdown")
        .describe("Format of the output ('markdown' for clean human/AI-readable text, 'json' for raw block tree)."),
      recursive: z
        .boolean()
        .default(true)
        .describe("Whether to recursively retrieve children of nested blocks."),
      max_depth: z
        .number()
        .default(5)
        .describe("Maximum recursive depth for nested blocks (default 5)."),
    },
    async ({
      page_id,
      format,
      recursive,
      max_depth,
    }: {
      page_id: string;
      format: "markdown" | "json";
      recursive: boolean;
      max_depth: number;
    }) => {
      const cleanPageId = page_id.replace(/-/g, "");
      const blocks = await notion.getAllBlockChildren(
        cleanPageId,
        recursive,
        0,
        max_depth
      );

      if (format === "markdown") {
        const md = notionBlocksToMarkdown(blocks);
        return {
          content: [
            {
              type: "text",
              text: md || "(Page is empty)",
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(blocks, null, 2),
          },
        ],
      };
    }
  );

  // Tool: notion_create_page
  server.tool(
    "notion_create_page",
    "Create a new Notion page under a parent page or database with optional icon, cover, and initial Markdown content.",
    {
      parent_id: z
        .string()
        .describe("The ID of the parent page or database."),
      parent_type: z
        .enum(["page_id", "database_id"])
        .default("page_id")
        .describe("Whether the parent is a page or a database."),
      title: z
        .string()
        .describe("The title of the new page."),
      icon_emoji: z
        .string()
        .optional()
        .describe("An optional single emoji for the page icon (e.g. '📘', '⚡')."),
      cover_url: z
        .string()
        .optional()
        .describe("An optional external URL for the page cover image."),
      initial_markdown: z
        .string()
        .optional()
        .describe("Optional initial content formatted as Markdown to populate the page."),
    },
    async ({
      parent_id,
      parent_type,
      title,
      icon_emoji,
      cover_url,
      initial_markdown,
    }: {
      parent_id: string;
      parent_type: "page_id" | "database_id";
      title: string;
      icon_emoji?: string;
      cover_url?: string;
      initial_markdown?: string;
    }) => {
      const cleanParentId = parent_id.replace(/-/g, "");
      const initialBlocks = initial_markdown
        ? markdownToNotionBlocks(initial_markdown)
        : [];

      const page = await notion.createPage({
        parentId: cleanParentId,
        parentType: parent_type,
        title,
        iconEmoji: icon_emoji,
        coverUrl: cover_url,
        initialBlocks,
      });

      return {
        content: [
          {
            type: "text",
            text: `Page "${title}" created successfully!\n- Page ID: ${page.id}\n- URL: ${(page as any).url}`,
          },
        ],
      };
    }
  );

  // Tool: notion_update_page
  server.tool(
    "notion_update_page",
    "Update a Notion page's metadata, title, icon emoji, cover image, archive/delete status, or database row properties (Status, Tags, Numbers, Checkboxes).",
    {
      page_id: z
        .string()
        .describe("The ID of the Notion page or database row to update."),
      title: z
        .string()
        .optional()
        .describe("New title for the page."),
      icon_emoji: z
        .string()
        .optional()
        .describe("New emoji icon for the page (e.g. '✅', '🚀')."),
      cover_url: z
        .string()
        .optional()
        .describe("New external URL for page cover image."),
      archived: z
        .boolean()
        .optional()
        .describe("Set to true to archive (delete) the page, or false to restore."),
      properties: z
        .record(z.any())
        .optional()
        .describe(
          "Key-value dictionary of database properties to update (e.g. {'Status': 'Đã hoàn thành', 'Order': 3, 'Tags': ['LLM', 'GPU']})."
        ),
    },
    async ({
      page_id,
      title,
      icon_emoji,
      cover_url,
      archived,
      properties,
    }: {
      page_id: string;
      title?: string;
      icon_emoji?: string;
      cover_url?: string;
      archived?: boolean;
      properties?: Record<string, any>;
    }) => {
      const cleanId = page_id.replace(/-/g, "");
      const res = await notion.updatePage({
        pageId: cleanId,
        title,
        iconEmoji: icon_emoji,
        coverUrl: cover_url,
        archived,
        properties,
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated page ${page_id}!\n- Title: ${(res as any).properties?.title?.title?.[0]?.plain_text || title || "(unchanged)"}\n- Archived: ${res.archived}\n- URL: ${res.url}`,
          },
        ],
      };
    }
  );
}

