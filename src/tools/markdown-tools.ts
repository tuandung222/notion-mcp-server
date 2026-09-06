import { z } from "zod";
import { NotionService } from "../client/notion-client.js";
import { markdownToNotionBlocks } from "../converters/markdown-parser.js";

export function registerMarkdownTools(server: any, notion: NotionService) {
  // Tool 1: notion_append_markdown
  server.tool(
    "notion_append_markdown",
    "Parse and append rich Markdown content to a Notion page or block. Automatically formats headings, lists, quotes, inline bold/italic/code/links into standard Notion rich_text annotations, and safely chunks requests (100 blocks/chunk) to prevent rate limits.",
    {
      block_id: z
        .string()
        .describe("The ID of the parent page or block to append markdown content to."),
      markdown: z
        .string()
        .describe("The Markdown content to parse and append to Notion."),
    },
    async ({ block_id, markdown }: { block_id: string; markdown: string }) => {
      const cleanBlockId = block_id.replace(/-/g, "");
      const blocks = markdownToNotionBlocks(markdown);

      if (blocks.length === 0) {
        return {
          content: [
            {
              type: "text",
              text: "No valid blocks generated from markdown input.",
            },
          ],
        };
      }

      const result = await notion.appendBlocksChunked(cleanBlockId, blocks);

      return {
        content: [
          {
            type: "text",
            text: `Successfully parsed and appended ${result.totalAppended} blocks in ${result.chunksCount} chunk(s) to block ${block_id}.`,
          },
        ],
      };
    }
  );

  // Tool 2: notion_update_page_markdown (Enhanced Markdown Endpoint)
  server.tool(
    "notion_update_page_markdown",
    "Update a Notion page using Notion's official Enhanced Markdown endpoint. Supports replacing the entire content or updating targeted content.",
    {
      page_id: z
        .string()
        .describe("The ID of the Notion page to update with Markdown."),
      markdown: z
        .string()
        .describe("The complete Markdown string to replace the page content."),
      type: z
        .enum(["replace_content", "update_content"])
        .default("replace_content")
        .describe("The type of update ('replace_content' overwrites the page content)."),
    },
    async ({ page_id, markdown, type }: { page_id: string; markdown: string; type: "replace_content" | "update_content" }) => {
      const cleanPageId = page_id.replace(/-/g, "");
      const res = await notion.updatePageMarkdown(cleanPageId, markdown, type);

      return {
        content: [
          {
            type: "text",
            text: `Successfully updated page ${page_id} via Enhanced Markdown API. Response: ${JSON.stringify(
              res
            )}`,
          },
        ],
      };
    }
  );
}
