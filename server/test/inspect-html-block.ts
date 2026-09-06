import { NotionService } from "../src/client/notion-client.js";

async function main() {
  const notion = new NotionService();
  const pageId = "3d312a7a9435808bb79bf35f4d048caa";
  console.log(`Inspecting blocks on page ${pageId}...`);
  try {
    const blocks = await notion.getAllBlockChildren(pageId, false);
    console.log(`Found ${blocks.length} block(s).`);
    for (const b of blocks) {
      console.log(`- Block ID: ${b.id}`);
      console.log(`  Type: ${b.type}`);
      console.log(`  Data:`, JSON.stringify(b[b.type], null, 2));
    }
  } catch (err: any) {
    console.error("Failed:", err?.message || err);
  }
}

main();
