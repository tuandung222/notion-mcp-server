import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import dotenv from "dotenv";
import { NotionService } from "./client/notion-client.js";
import { registerMarkdownTools } from "./tools/markdown-tools.js";
import { registerMermaidTools } from "./tools/mermaid-tools.js";
import { registerPageTools } from "./tools/page-tools.js";
import { registerSearchTools } from "./tools/search-tools.js";
import { registerBookTools } from "./tools/book-tools.js";
import { registerHtmlEmbedTools } from "./tools/html-embed-tools.js";

dotenv.config();

async function main() {
  const server = new McpServer({
    name: "custom-notion-mcp-server",
    version: "1.0.0",
  });

  const notion = new NotionService();

  // Register modular tools
  registerMarkdownTools(server, notion);
  registerMermaidTools(server, notion);
  registerPageTools(server, notion);
  registerSearchTools(server, notion);
  registerBookTools(server, notion);
  registerHtmlEmbedTools(server, notion);

  // Connect stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("[Custom Notion MCP] Server is running on stdio transport.");
}

main().catch((error) => {
  console.error("[Custom Notion MCP] Fatal server error:", error);
  process.exit(1);
});
