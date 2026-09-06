import { z } from "zod";
import { NotionService } from "../client/notion-client.js";

export function registerBlockTools(server: any, notion: NotionService) {
  server.tool(
    "notion_delete_block",
    "Delete (or archive) a specific block on a Notion page by its block ID. Useful for removing obsolete paragraphs, dividers, or invalid diagrams without re-uploading the whole page.",
    {
      block_id: z
        .string()
        .describe("The ID of the block to delete/archive."),
    },
    async ({ block_id }: { block_id: string }) => {
      const cleanBlockId = block_id.replace(/-/g, "");
      await notion.deleteBlock(cleanBlockId);

      return {
        content: [
          {
            type: "text",
            text: `Successfully deleted/archived Notion block: ${block_id}`,
          },
        ],
      };
    }
  );
}
