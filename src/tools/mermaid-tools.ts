import { z } from "zod";
import { NotionService } from "../client/notion-client.js";

export function registerMermaidTools(server: any, notion: NotionService) {
  server.tool(
    "notion_insert_mermaid",
    "Insert a native Mermaid diagram code block (language: 'mermaid') into Notion. Notion natively renders this into an interactive, responsive vector SVG diagram, avoiding the font overflow or clipping problems of ASCII art boxes.",
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

      // Ensure no markdown fences inside code string
      let cleanedCode = mermaid_code.trim();
      if (cleanedCode.startsWith("```mermaid")) {
        cleanedCode = cleanedCode.replace(/^```mermaid\s*/, "").replace(/```$/, "").trim();
      } else if (cleanedCode.startsWith("```")) {
        cleanedCode = cleanedCode.replace(/^```\s*/, "").replace(/```$/, "").trim();
      }

      const block: any = {
        object: "block",
        type: "code",
        code: {
          rich_text: [
            {
              type: "text",
              text: {
                content: cleanedCode,
              },
            },
          ],
          language: "mermaid",
        },
      };

      if (caption) {
        block.code.caption = [
          {
            type: "text",
            text: {
              content: caption,
            },
          },
        ];
      }

      await notion.appendBlocksChunked(cleanBlockId, [block]);

      return {
        content: [
          {
            type: "text",
            text: `Successfully inserted native Mermaid diagram into Notion block ${block_id}.`,
          },
        ],
      };
    }
  );
}
