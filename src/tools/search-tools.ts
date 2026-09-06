import { z } from "zod";
import { NotionService } from "../client/notion-client.js";

export function registerSearchTools(server: any, notion: NotionService) {
  server.tool(
    "notion_search",
    "Search pages and databases in the connected Notion workspace by title or content.",
    {
      query: z
        .string()
        .describe("The text to search for across Notion pages and databases."),
      filter_type: z
        .enum(["all", "page", "database"])
        .default("all")
        .describe("Filter results by type ('all', 'page', or 'database')."),
      page_size: z
        .number()
        .default(10)
        .describe("Number of search results to return (max 100)."),
    },
    async ({
      query,
      filter_type,
      page_size,
    }: {
      query: string;
      filter_type: "all" | "page" | "database";
      page_size: number;
    }) => {
      const filter = filter_type === "all" ? undefined : filter_type;
      const res = await notion.search(query, filter, page_size);

      const items = res.results.map((item: any) => {
        let title = "(Untitled)";
        if (item.object === "page") {
          const propTitle =
            item.properties?.title?.title ||
            item.properties?.Name?.title ||
            item.properties?.Title?.title;
          if (propTitle && propTitle.length > 0) {
            title = propTitle.map((t: any) => t.plain_text).join("");
          }
        } else if (item.object === "database") {
          if (item.title && item.title.length > 0) {
            title = item.title.map((t: any) => t.plain_text).join("");
          }
        }

        return {
          id: item.id,
          type: item.object,
          title,
          url: item.url,
          last_edited_time: item.last_edited_time,
        };
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                total: items.length,
                results: items,
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
