import { Client } from "@notionhq/client";
import axios, { AxiosInstance } from "axios";
import dotenv from "dotenv";
import { delay, chunkArray, withRetry } from "./rate-limiter.js";

dotenv.config();

/**
 * Extracts Notion API token from environment variables.
 * Checks NOTION_API_KEY, NOTION_TOKEN, or parses OPENAPI_MCP_HEADERS for seamless compatibility.
 */
function resolveNotionToken(): string {
  if (process.env.NOTION_API_KEY) {
    return process.env.NOTION_API_KEY.trim();
  }
  if (process.env.NOTION_TOKEN) {
    return process.env.NOTION_TOKEN.trim();
  }
  if (process.env.OPENAPI_MCP_HEADERS) {
    try {
      const headers = JSON.parse(process.env.OPENAPI_MCP_HEADERS);
      const authHeader = headers.Authorization || headers.authorization;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        return authHeader.replace("Bearer ", "").trim();
      }
    } catch {
      // ignore JSON parse error
    }
  }
  return "";
}

export class NotionService {
  public client: Client;
  private http: AxiosInstance;
  private token: string;
  private notionVersion: string;

  constructor(token?: string, version: string = "2022-06-28") {
    this.token = token || resolveNotionToken();
    this.notionVersion = process.env.NOTION_VERSION || version;

    if (!this.token) {
      console.warn(
        "[NotionService] Warning: Notion token is missing! Please set NOTION_API_KEY in .env or environment."
      );
    }

    this.client = new Client({
      auth: this.token,
      notionVersion: this.notionVersion,
    });

    this.http = axios.create({
      baseURL: "https://api.notion.com/v1",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Notion-Version": this.notionVersion,
        "Content-Type": "application/json",
      },
    });
  }

  /**
   * Appends blocks to a parent block/page in chunks of 100 with exponential backoff
   * and 350ms pause between chunks to comply with Notion rate limits.
   */
  async appendBlocksChunked(
    blockId: string,
    blocks: any[],
    chunkSize: number = 100,
    delayBetweenChunksMs: number = 350
  ): Promise<{ totalAppended: number; chunksCount: number }> {
    if (!blocks || blocks.length === 0) {
      return { totalAppended: 0, chunksCount: 0 };
    }

    const chunks = chunkArray(blocks, chunkSize);
    let totalAppended = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      await withRetry(async () => {
        await this.client.blocks.children.append({
          block_id: blockId,
          children: chunk,
        });
      });

      totalAppended += chunk.length;

      // Small pause between batches to prevent 429 Rate Limit
      if (i < chunks.length - 1 && delayBetweenChunksMs > 0) {
        await delay(delayBetweenChunksMs);
      }
    }

    return { totalAppended, chunksCount: chunks.length };
  }

  /**
   * Recursively retrieves all children blocks of a block/page, handling pagination
   */
  async getAllBlockChildren(
    blockId: string,
    recursive: boolean = true,
    currentDepth: number = 0,
    maxDepth: number = 5
  ): Promise<any[]> {
    const allBlocks: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: any = await withRetry(async () => {
        return await this.client.blocks.children.list({
          block_id: blockId,
          start_cursor: startCursor,
          page_size: 100,
        });
      });

      for (const block of response.results) {
        allBlocks.push(block);
        if (
          recursive &&
          block.has_children &&
          currentDepth < maxDepth &&
          block.type !== "child_page" &&
          block.type !== "child_database"
        ) {
          block.children = await this.getAllBlockChildren(
            block.id,
            recursive,
            currentDepth + 1,
            maxDepth
          );
        }
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;

      if (hasMore) {
        await delay(200);
      }
    }

    return allBlocks;
  }

  /**
   * Search Notion workspace for pages and databases
   */
  async search(query: string, filterType?: "page" | "database", pageSize: number = 10) {
    const filter = filterType
      ? {
          value: filterType,
          property: "object",
        }
      : undefined;

    return await withRetry(async () => {
      return await this.client.search({
        query,
        filter: filter as any,
        page_size: pageSize,
      });
    });
  }

  /**
   * Create a new page under a parent page or database
   */
  async createPage(params: {
    parentId: string;
    parentType?: "page_id" | "database_id";
    title: string;
    iconEmoji?: string;
    coverUrl?: string;
    initialBlocks?: any[];
  }) {
    const parent: any =
      params.parentType === "database_id"
        ? { database_id: params.parentId }
        : { page_id: params.parentId };

    const properties: any =
      params.parentType === "database_id"
        ? {
            Name: {
              title: [
                {
                  text: {
                    content: params.title,
                  },
                },
              ],
            },
          }
        : {
            title: [
              {
                text: {
                  content: params.title,
                },
              },
            ],
          };

    const icon = params.iconEmoji
      ? { type: "emoji" as const, emoji: params.iconEmoji }
      : undefined;

    const cover = params.coverUrl
      ? { type: "external" as const, external: { url: params.coverUrl } }
      : undefined;

    const initialBlocksToCreate = (params.initialBlocks || []).slice(0, 100);
    const remainingBlocks = (params.initialBlocks || []).slice(100);

    const createdPage = await withRetry(async () => {
      return await this.client.pages.create({
        parent,
        properties,
        icon,
        cover,
        children: initialBlocksToCreate.length > 0 ? initialBlocksToCreate : undefined,
      });
    });

    // If more than 100 initial blocks, append the rest in chunks
    if (remainingBlocks.length > 0) {
      await this.appendBlocksChunked(createdPage.id, remainingBlocks);
    }

    return createdPage;
  }

  /**
   * Call Notion Markdown endpoint (Enhanced Markdown API) if supported
   */
  async updatePageMarkdown(
    pageId: string,
    markdown: string,
    type: "replace_content" | "update_content" = "replace_content"
  ) {
    const payload: any = {
      page_id: pageId,
      type,
    };

    if (type === "replace_content") {
      payload.replace_content = {
        new_str: markdown,
        allow_deleting_content: true,
      };
    }

    return await withRetry(async () => {
      const response = await this.http.patch(`/pages/${pageId}/markdown`, payload);
      return response.data;
    });
  }

  /**
   * Finds an existing child database inside a parent page
   */
  async findDatabaseInPage(pageId: string): Promise<string | null> {
    const blocks = await this.getAllBlockChildren(pageId, false);
    for (const block of blocks) {
      if (block.type === "child_database") {
        return block.id;
      }
    }
    return null;
  }

  /**
   * Creates an inline Book / Tutorial Database inside a parent page
   */
  async createBookDatabase(parentPageId: string, title: string = "Mục Lục & Tiến Độ") {
    return await withRetry(async () => {
      return await this.client.databases.create({
        parent: { type: "page_id", page_id: parentPageId },
        title: [{ type: "text", text: { content: title } }],
        is_inline: true,
        properties: {
          Title: { title: {} },
          Order: { number: { format: "number" } },
          Status: {
            select: {
              options: [
                { name: "Chưa dịch", color: "red" },
                { name: "Bản nháp", color: "yellow" },
                { name: "Đã hoàn thành", color: "green" },
              ],
            },
          },
          Tags: { multi_select: {} },
          Words: { number: { format: "number" } },
          FilePath: { rich_text: {} },
          FileHash: { rich_text: {} },
        },
      });
    });
  }

  /**
   * Queries all entries in a database to map FilePath -> Page
   */
  async queryDatabaseEntries(databaseId: string): Promise<
    Array<{
      pageId: string;
      url: string;
      filePath: string;
      fileHash: string;
      order: number;
      title: string;
    }>
  > {
    const entries: any[] = [];
    let hasMore = true;
    let startCursor: string | undefined = undefined;

    while (hasMore) {
      const response: any = await withRetry(async () => {
        return await this.client.databases.query({
          database_id: databaseId,
          start_cursor: startCursor,
          page_size: 100,
        });
      });

      for (const page of response.results) {
        const filePath =
          page.properties?.FilePath?.rich_text?.[0]?.plain_text || "";
        const fileHash =
          page.properties?.FileHash?.rich_text?.[0]?.plain_text || "";
        const order = page.properties?.Order?.number || 0;
        const title =
          page.properties?.Title?.title?.[0]?.plain_text ||
          page.properties?.Name?.title?.[0]?.plain_text ||
          "(Untitled)";

        entries.push({
          pageId: page.id,
          url: page.url,
          filePath,
          fileHash,
          order,
          title,
        });
      }

      hasMore = response.has_more;
      startCursor = response.next_cursor || undefined;
      if (hasMore) {
        await delay(200);
      }
    }

    return entries;
  }

  /**
   * Creates a new chapter entry in the Book Database or updates existing one
   */
  async upsertChapterEntry(params: {
    databaseId: string;
    existingPageId?: string | null;
    title: string;
    order: number;
    status: "Chưa dịch" | "Bản nháp" | "Đã hoàn thành";
    tags: string[];
    words: number;
    filePath: string;
    fileHash: string;
    blocks: any[];
    iconEmoji?: string;
  }): Promise<{ pageId: string; action: "created" | "updated" | "skipped" }> {
    const properties: any = {
      Title: {
        title: [
          {
            text: {
              content: params.title,
            },
          },
        ],
      },
      Order: {
        number: params.order,
      },
      Status: {
        select: {
          name: params.status,
        },
      },
      Tags: {
        multi_select: params.tags.map((t) => ({ name: t.replace(/,/g, "") })),
      },
      Words: {
        number: params.words,
      },
      FilePath: {
        rich_text: [
          {
            text: {
              content: params.filePath,
            },
          },
        ],
      },
      FileHash: {
        rich_text: [
          {
            text: {
              content: params.fileHash,
            },
          },
        ],
      },
    };

    const icon = params.iconEmoji
      ? { type: "emoji" as const, emoji: params.iconEmoji }
      : { type: "emoji" as const, emoji: "📄" };

    if (params.existingPageId) {
      // Update properties
      await withRetry(async () => {
        await this.client.pages.update({
          page_id: params.existingPageId!,
          properties,
          icon,
        });
      });

      // Clear existing blocks (retrieve children and delete) and append new blocks
      const existingBlocks = await this.getAllBlockChildren(
        params.existingPageId,
        false
      );
      for (const b of existingBlocks) {
        try {
          await withRetry(async () => {
            await this.client.blocks.delete({ block_id: b.id });
          });
        } catch {
          // ignore block deletion error
        }
      }

      // Append new blocks
      if (params.blocks.length > 0) {
        await this.appendBlocksChunked(params.existingPageId, params.blocks);
      }

      return { pageId: params.existingPageId, action: "updated" };
    } else {
      // Create new page
      const initialBlocks = params.blocks.slice(0, 100);
      const remainingBlocks = params.blocks.slice(100);

      const createdPage = await withRetry(async () => {
        return await this.client.pages.create({
          parent: { database_id: params.databaseId },
          properties,
          icon,
          children: initialBlocks.length > 0 ? initialBlocks : undefined,
        });
      });

      if (remainingBlocks.length > 0) {
        await this.appendBlocksChunked(createdPage.id, remainingBlocks);
      }

      return { pageId: createdPage.id, action: "created" };
    }
  }

  /**
   * Delete or archive a single block
   */
  async deleteBlock(blockId: string): Promise<any> {
    const cleanId = blockId.replace(/-/g, "");
    return await withRetry(async () => {
      return await this.client.blocks.delete({ block_id: cleanId });
    });
  }

  /**
   * Update page metadata, title, icon, cover, archive status, or database properties
   */
  async updatePage(params: {
    pageId: string;
    title?: string;
    iconEmoji?: string;
    coverUrl?: string;
    archived?: boolean;
    properties?: Record<string, any>;
  }): Promise<any> {
    const cleanId = params.pageId.replace(/-/g, "");
    const payload: any = {
      page_id: cleanId,
    };

    if (params.archived !== undefined) {
      payload.archived = params.archived;
    }

    if (params.iconEmoji) {
      payload.icon = { type: "emoji" as const, emoji: params.iconEmoji };
    }

    if (params.coverUrl) {
      payload.cover = {
        type: "external" as const,
        external: { url: params.coverUrl },
      };
    }

    const builtProperties: Record<string, any> = {};

    if (params.title) {
      builtProperties.title = [
        {
          text: {
            content: params.title,
          },
        },
      ];
    }

    if (params.properties) {
      let pageSchema: Record<string, any> | undefined;
      try {
        const pageInfo: any = await withRetry(async () => {
          return await this.client.pages.retrieve({ page_id: cleanId });
        });
        pageSchema = pageInfo.properties;
      } catch (e) {
        // ignore if fails, fallback to heuristic
      }

      for (const [key, val] of Object.entries(params.properties)) {
        const propSchema = pageSchema?.[key];
        const propType = propSchema?.type;

        if (
          val &&
          typeof val === "object" &&
          !Array.isArray(val) &&
          ("select" in val ||
            "rich_text" in val ||
            "status" in val ||
            "multi_select" in val ||
            "title" in val ||
            "number" in val ||
            "checkbox" in val)
        ) {
          // Direct raw Notion property structure
          builtProperties[key] = val;
        } else if (propType) {
          switch (propType) {
            case "select":
              builtProperties[key] = { select: val ? { name: String(val) } : null };
              break;
            case "status":
              builtProperties[key] = { status: val ? { name: String(val) } : null };
              break;
            case "multi_select":
              const arr = Array.isArray(val) ? val : [val];
              builtProperties[key] = {
                multi_select: arr.map((v: any) => ({ name: String(v) })),
              };
              break;
            case "rich_text":
              builtProperties[key] = {
                rich_text: [
                  {
                    type: "text",
                    text: { content: String(val ?? "") },
                  },
                ],
              };
              break;
            case "title":
              builtProperties[key] = {
                title: [
                  {
                    type: "text",
                    text: { content: String(val ?? "") },
                  },
                ],
              };
              break;
            case "number":
              builtProperties[key] = {
                number: val !== null && val !== undefined ? Number(val) : null,
              };
              break;
            case "checkbox":
              builtProperties[key] = {
                checkbox: Boolean(val),
              };
              break;
            default:
              builtProperties[key] =
                typeof val === "object"
                  ? val
                  : {
                      rich_text: [
                        {
                          type: "text",
                          text: { content: String(val ?? "") },
                        },
                      ],
                    };
              break;
          }
        } else {
          // Fallback heuristic if pageSchema not available
          if (typeof val === "string") {
            builtProperties[key] = { select: { name: val } };
          } else if (Array.isArray(val)) {
            builtProperties[key] = {
              multi_select: val.map((v: string) => ({ name: String(v) })),
            };
          } else if (typeof val === "number") {
            builtProperties[key] = { number: val };
          } else if (typeof val === "boolean") {
            builtProperties[key] = { checkbox: val };
          } else if (val && typeof val === "object") {
            builtProperties[key] = val;
          }
        }
      }
    }

    if (Object.keys(builtProperties).length > 0) {
      payload.properties = builtProperties;
    }

    return await withRetry(async () => {
      return await this.client.pages.update(payload);
    });
  }

  /**
   * Query database with flexible filter and sort
   */
  async queryDatabase(params: {
    databaseId: string;
    filterProperty?: string;
    filterValue?: string;
    sortProperty?: string;
    sortDirection?: "ascending" | "descending";
    pageSize?: number;
  }): Promise<{ total: number; results: any[] }> {
    const cleanId = params.databaseId.replace(/-/g, "");
    let filter: any = undefined;

    if (params.filterProperty && params.filterValue !== undefined) {
      let propType: string | undefined;
      try {
        const dbInfo: any = await withRetry(async () => {
          return await this.client.databases.retrieve({ database_id: cleanId });
        });
        propType = dbInfo.properties?.[params.filterProperty]?.type;
      } catch (err) {
        // ignore error if retrieve fails
      }

      if (propType) {
        switch (propType) {
          case "select":
            filter = {
              property: params.filterProperty,
              select: { equals: params.filterValue },
            };
            break;
          case "status":
            filter = {
              property: params.filterProperty,
              status: { equals: params.filterValue },
            };
            break;
          case "multi_select":
            filter = {
              property: params.filterProperty,
              multi_select: { contains: params.filterValue },
            };
            break;
          case "title":
            filter = {
              property: params.filterProperty,
              title: { contains: params.filterValue },
            };
            break;
          case "rich_text":
            filter = {
              property: params.filterProperty,
              rich_text: { contains: params.filterValue },
            };
            break;
          case "number":
            filter = {
              property: params.filterProperty,
              number: { equals: Number(params.filterValue) },
            };
            break;
          case "checkbox":
            filter = {
              property: params.filterProperty,
              checkbox: { equals: params.filterValue === "true" || params.filterValue === "1" },
            };
            break;
          default:
            filter = {
              property: params.filterProperty,
              rich_text: { contains: params.filterValue },
            };
            break;
        }
      } else {
        // Default to rich_text if property type not determined
        filter = {
          property: params.filterProperty,
          rich_text: { contains: params.filterValue },
        };
      }
    }

    let sorts: any = undefined;
    if (params.sortProperty) {
      sorts = [
        {
          property: params.sortProperty,
          direction: params.sortDirection || "ascending",
        },
      ];
    }

    const response: any = await withRetry(async () => {
      return await this.client.databases.query({
        database_id: cleanId,
        filter,
        sorts,
        page_size: params.pageSize || 50,
      });
    });

    const parsedResults = response.results.map((page: any) => {
      const props: Record<string, any> = {};
      for (const [key, prop] of Object.entries<any>(page.properties || {})) {
        switch (prop.type) {
          case "title":
            props[key] = prop.title?.[0]?.plain_text || "";
            break;
          case "rich_text":
            props[key] = prop.rich_text?.[0]?.plain_text || "";
            break;
          case "select":
            props[key] = prop.select?.name || null;
            break;
          case "multi_select":
            props[key] = prop.multi_select?.map((m: any) => m.name) || [];
            break;
          case "number":
            props[key] = prop.number;
            break;
          case "checkbox":
            props[key] = prop.checkbox;
            break;
          case "date":
            props[key] = prop.date?.start || null;
            break;
          default:
            props[key] = prop[prop.type];
            break;
        }
      }

      return {
        id: page.id,
        url: page.url,
        archived: page.archived,
        createdTime: page.created_time,
        lastEditedTime: page.last_edited_time,
        properties: props,
      };
    });

    return {
      total: parsedResults.length,
      results: parsedResults,
    };
  }

  /**
   * Create a generic database with customizable schema
   */
  async createGenericDatabase(params: {
    parentPageId: string;
    title: string;
    isInline?: boolean;
    propertiesSchema?: Record<string, any>;
  }): Promise<any> {
    const cleanParentId = params.parentPageId.replace(/-/g, "");

    // Default schema if not provided
    const defaultSchema: Record<string, any> = {
      Name: { title: {} },
      Status: {
        select: {
          options: [
            { name: "Todo", color: "red" },
            { name: "In Progress", color: "yellow" },
            { name: "Done", color: "green" },
          ],
        },
      },
      Tags: { multi_select: {} },
    };

    const properties = params.propertiesSchema || defaultSchema;

    return await withRetry(async () => {
      return await this.client.databases.create({
        parent: { type: "page_id", page_id: cleanParentId },
        title: [{ type: "text", text: { content: params.title } }],
        is_inline: params.isInline ?? true,
        properties,
      });
    });
  }
}


