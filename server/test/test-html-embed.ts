import {
  markdownToNotionBlocks,
  notionBlocksToMarkdown,
} from "../src/converters/markdown-parser.js";

function runHtmlEmbedTests() {
  console.log("=== TEST 1: Markdown ```html-embed Block Conversion ===");
  const mdWithCodeBlock = `
# Báo Cáo Benchmark

Dưới đây là bảng benchmark tương tác:

\`\`\`html-embed
https://tuandung222.github.io/reports/report-qwen3.5-2b.html
\`\`\`
`;
  const blocks1 = markdownToNotionBlocks(mdWithCodeBlock);
  const embedBlock1 = blocks1.find((b) => b.type === "embed");
  if (
    !embedBlock1 ||
    embedBlock1.embed.url !==
      "https://tuandung222.github.io/reports/report-qwen3.5-2b.html"
  ) {
    throw new Error("Failed to convert ```html-embed code block to Notion embed block");
  }
  console.log("✅ Test 1 Passed: ```html-embed block converted to Notion embed block!");

  console.log("\n=== TEST 2: Native <iframe> HTML Tag Conversion ===");
  const mdWithIframe = `
## Biểu đồ tương tác

<iframe src="https://my-dashboard.vercel.app/charts/vllm-throughput.html"></iframe>
`;
  const blocks2 = markdownToNotionBlocks(mdWithIframe);
  const embedBlock2 = blocks2.find((b) => b.type === "embed");
  if (
    !embedBlock2 ||
    embedBlock2.embed.url !==
      "https://my-dashboard.vercel.app/charts/vllm-throughput.html"
  ) {
    throw new Error("Failed to convert <iframe> tag to Notion embed block");
  }
  console.log("✅ Test 2 Passed: <iframe> tag converted to Notion embed block!");

  console.log("\n=== TEST 3: Reverse Converter (Blocks to Markdown) ===");
  const reversedMd = notionBlocksToMarkdown([embedBlock1]);
  if (!reversedMd.includes('<iframe src="https://tuandung222.github.io/reports/report-qwen3.5-2b.html"></iframe>')) {
    throw new Error("Failed reverse conversion for embed block");
  }
  console.log("✅ Test 3 Passed: Reverse converter outputs valid iframe html tag!");

  console.log("\n🎉 ALL HTML EMBED CONVERTER TESTS PASSED 100%!");
}

runHtmlEmbedTests();
