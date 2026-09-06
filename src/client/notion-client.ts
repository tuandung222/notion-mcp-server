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
}
