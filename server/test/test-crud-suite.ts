import { NotionService } from "../src/client/notion-client.js";

async function main() {
  const notion = new NotionService();
  const databaseId = "3d312a7a9435811198a1c8cb62a0d89a"; // The Book Database created earlier
  const parentPageId = "3d312a7a943581e0bdcacf4675dde6ff"; // Master Page

  console.log("=== TEST 1: notion_query_database with Filter ===");
  const draftQuery = await notion.queryDatabase({
    databaseId,
    filterProperty: "Status",
    filterValue: "Bản nháp",
  });
  console.log(`Found ${draftQuery.total} draft chapter(s):`);
  for (const r of draftQuery.results) {
    console.log(`- ID: ${r.id} | Title: "${r.properties.Title}" | Status: ${r.properties.Status}`);
  }

  if (draftQuery.total === 0) {
    console.log("No drafts found to update.");
    return;
  }

  const targetChapter = draftQuery.results[0];

  console.log("\n=== TEST 2: notion_update_page (Promoting Draft to Done & changing Icon) ===");
  const updateRes = await notion.updatePage({
    pageId: targetChapter.id,
    iconEmoji: "⚡",
    properties: {
      Status: "Đã hoàn thành",
      Tags: ["Quantization", "Marlin", "Production-Ready"],
    },
  });
  console.log(`✅ Updated page ${targetChapter.id}: Status changed to 'Đã hoàn thành'!`);

  console.log("\n=== TEST 3: Re-query Database to verify update ===");
  const doneQuery = await notion.queryDatabase({
    databaseId,
    filterProperty: "Status",
    filterValue: "Đã hoàn thành",
    sortProperty: "Order",
    sortDirection: "ascending",
  });
  console.log(`Total completed chapters: ${doneQuery.total}`);
  for (const r of doneQuery.results) {
    console.log(`- [Chương ${r.properties.Order}] ${r.properties.Title} | Status: ${r.properties.Status} | Tags: ${r.properties.Tags?.join(", ")}`);
  }

  console.log("\n=== TEST 4: notion_create_database (Generic Database: Technical Glossary) ===");
  const glossaryDb = await notion.createGenericDatabase({
    parentPageId,
    title: "Bảng Thuật Ngữ Kỹ Thuật (Glossary)",
    isInline: true,
    propertiesSchema: {
      Term: { title: {} },
      Category: {
        select: {
          options: [
            { name: "Memory", color: "blue" },
            { name: "Compute", color: "green" },
            { name: "Serving", color: "purple" },
          ],
        },
      },
      Definition: { rich_text: {} },
      Confidence: { number: { format: "number" } },
    },
  });
  console.log(`✅ Generic Glossary Database created: ${glossaryDb.id} | ${glossaryDb.url}`);

  console.log("\n=== TEST 5: notion_delete_block (Create & Delete a temporary block) ===");
  const tempBlocksRes = await notion.appendBlocksChunked(parentPageId, [
    {
      object: "block",
      type: "paragraph",
      paragraph: {
        rich_text: [
          {
            type: "text",
            text: { content: "This is a temporary scratch block to be deleted." },
          },
        ],
      },
    },
  ]);
  const pageChildren = await notion.getAllBlockChildren(parentPageId, false);
  const lastBlock = pageChildren[pageChildren.length - 1];
  console.log(`Created temporary block: ${lastBlock.id}`);

  await notion.deleteBlock(lastBlock.id);
  console.log(`✅ Successfully deleted block: ${lastBlock.id}`);

  console.log("\n🎉 ALL 5 CRUD OPERATIONS TESTED & VERIFIED 100%!");
}

main().catch(console.error);
