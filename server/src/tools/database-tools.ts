import { z } from "zod";
import { NotionService } from "../client/notion-client.js";

export function registerDatabaseTools(server: any, notion: NotionService) {
  // Tool: notion_query_database
  server.tool(
    "notion_query_database",
    "Query items/rows from a Notion Database with optional filtering by property (Status, Tags, Title, RichText) and sorting. Returns clean JSON records with IDs, URLs, and parsed property values.",
    {
      database_id: z
        .string()
        .describe("The ID of the Notion Database to query."),
      filter_property: z
        .string()
        .optional()
        .describe("Optional property name to filter by (e.g. 'Status', 'Tags', 'Name')."),
      filter_value: z
        .string()
        .optional()
        .describe("Optional value to match for the filter property (e.g. 'Chưa dịch', 'Bản nháp', 'GPU')."),
      sort_property: z
        .string()
        .optional()
        .describe("Optional property name to sort by (e.g. 'Order', 'Last edited time')."),
      sort_direction: z
        .enum(["ascending", "descending"])
        .default("ascending")
        .describe("Sorting direction ('ascending' or 'descending')."),
      page_size: z
        .number()
        .default(50)
        .describe("Maximum number of records to return (default: 50, max: 100)."),
    },
    async ({
      database_id,
      filter_property,
      filter_value,
      sort_property,
      sort_direction,
      page_size,
    }: {
      database_id: string;
      filter_property?: string;
      filter_value?: string;
      sort_property?: string;
      sort_direction?: "ascending" | "descending";
      page_size?: number;
    }) => {
      const cleanDbId = database_id.replace(/-/g, "");
      const res = await notion.queryDatabase({
        databaseId: cleanDbId,
        filterProperty: filter_property,
        filterValue: filter_value,
        sortProperty: sort_property,
        sortDirection: sort_direction,
        pageSize: page_size,
      });

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(res, null, 2),
          },
        ],
      };
    }
  );

  // Tool: notion_create_database
  server.tool(
    "notion_create_database",
    "Create a new generic Notion database with custom column properties (Status, Select, Multi-select, Number, Date, Checkbox) under a parent page.",
    {
      parent_page_id: z
        .string()
        .describe("The ID of the parent page where the database will be created."),
      title: z
        .string()
        .describe("The title of the new database (e.g. 'Bảng Thuật Ngữ Kỹ Thuật', 'Tasks')."),
      is_inline: z
        .boolean()
        .default(true)
        .describe("Whether the database is embedded inline inside the parent page (default: true)."),
      properties_schema: z
        .record(z.any())
        .optional()
        .describe(
          "Optional custom Notion properties schema object. If omitted, creates default Name, Status, and Tags columns."
        ),
    },
    async ({
      parent_page_id,
      title,
      is_inline,
      properties_schema,
    }: {
      parent_page_id: string;
      title: string;
      is_inline: boolean;
      properties_schema?: Record<string, any>;
    }) => {
      const cleanParentId = parent_page_id.replace(/-/g, "");
      const db = await notion.createGenericDatabase({
        parentPageId: cleanParentId,
        title,
        isInline: is_inline,
        propertiesSchema: properties_schema,
      });

      return {
        content: [
          {
            type: "text",
            text: `Successfully created database "${title}"!\n- Database ID: ${db.id}\n- URL: ${db.url}`,
          },
        ],
      };
    }
  );
}
