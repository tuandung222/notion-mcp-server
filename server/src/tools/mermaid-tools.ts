import { z } from "zod";
import { NotionService } from "../client/notion-client.js";
import { createSafeMermaidNotionBlocks } from "../converters/mermaid-sanitizer.js";

export function registerMermaidTools(server: any, notion: NotionService) {
  server.tool(
    "notion_insert_mermaid",
    "Insert a native Mermaid diagram code block (language: 'mermaid') into Notion with automatic syntax healing (quotes unquoted special characters, balances subgraphs, normalizes arrows) and graceful fallback to avoid red Notion syntax error banners.",
    {
      block_id: z
        .string()
        .describe("The ID of the page or block to append the Mermaid diagram to."),
      mermaid_code: z
        .string()
        .describe(
          "The Mermaid diagram syntax string (e.g. 'graph TD; A[Client] --> B[Server];')."
        ),
      caption: z
        .string()
        .optional()
        .describe("Optional caption for the diagram."),
    },
    async ({
      block_id,
      mermaid_code,
      caption,
    }: {
      block_id: string;
      mermaid_code: string;
      caption?: string;
    }) => {
      const cleanBlockId = block_id.replace(/-/g, "");
      const blocks = createSafeMermaidNotionBlocks(mermaid_code, caption);

      await notion.appendBlocksChunked(cleanBlockId, blocks);

      return {
        content: [
          {
            type: "text",
            text: `Successfully processed and inserted Mermaid diagram blocks into Notion block ${block_id}.`,
          },
        ],
      };
    }
  );
}

