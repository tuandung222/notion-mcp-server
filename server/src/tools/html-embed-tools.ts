import { z } from "zod";
import { NotionService } from "../client/notion-client.js";

export function registerHtmlEmbedTools(server: any, notion: NotionService) {
  server.tool(
    "notion_insert_html_embed",
    "Insert an interactive HTML Embed block into a Notion page. Renders interactive HTML5 dashboards, benchmark reports, simulators, and JavaScript/CSS widgets directly inside Notion in an interactive iframe.",
    {
      page_id: z
        .string()
        .describe("The ID of the Notion page or parent block to append the HTML embed to."),
      url: z
        .string()
        .url()
        .describe("The publicly accessible URL of the HTML file/dashboard to embed (e.g. hosted on GitHub Pages, S3, Vercel, or Netlify)."),
      caption: z
        .string()
        .optional()
        .describe("An optional caption displayed beneath the embedded HTML widget."),
    },
    async ({
      page_id,
      url,
      caption,
    }: {
      page_id: string;
      url: string;
      caption?: string;
    }) => {
      const cleanPageId = page_id.replace(/-/g, "");

      const block: any = {
        object: "block",
        type: "embed",
        embed: {
          url: url.trim(),
          caption: caption
            ? [
                {
                  type: "text",
                  text: {
                    content: caption,
                  },
                },
              ]
            : [],
        },
      };

      await notion.appendBlocksChunked(cleanPageId, [block]);

      return {
        content: [
          {
            type: "text",
            text: `Successfully inserted interactive HTML Embed block for URL: ${url} into Notion page ${page_id}.`,
          },
        ],
      };
    }
  );
}
