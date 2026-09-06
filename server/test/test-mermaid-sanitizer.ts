import {
  sanitizeMermaidCode,
  createSafeMermaidNotionBlocks,
} from "../src/converters/mermaid-sanitizer.js";

function runMermaidSanitizerTests() {
  console.log("=== TEST 1: Auto-Quoting Labels with Special Characters ===");
  const badLabelsCode = `
graph TD
  A[User (Auth Client)] --> B(Step 1: Validate Token)
  B --> C{Status: 200 OK?}
  C -->|Yes: Valid| D[(DB: Storage $USD)]
`;
  const res1 = sanitizeMermaidCode(badLabelsCode);
  console.log("Fixes applied:", res1.fixesApplied);
  console.log("Cleaned Code:\n", res1.code);

  if (!res1.code.includes('A["User (Auth Client)"]')) {
    throw new Error("Failed to auto-quote bracket label with parentheses");
  }
  if (!res1.code.includes('B("Step 1: Validate Token")')) {
    throw new Error("Failed to auto-quote round label with colon");
  }
  if (!res1.code.includes('C{"Status: 200 OK?"}')) {
    throw new Error("Failed to auto-quote brace label with colon");
  }
  console.log("✅ Test 1 Passed: Special characters auto-quoted successfully!");

  console.log("\n=== TEST 2: Unclosed Subgraph Auto-Balancing ===");
  const unclosedSubgraphCode = `
flowchart TD
  subgraph ClusterA [Cluster A]
    A --> B
    subgraph SubClusterB [Sub Cluster B]
      B --> C
`;
  const res2 = sanitizeMermaidCode(unclosedSubgraphCode);
  console.log("Fixes applied:", res2.fixesApplied);
  console.log("Cleaned Code:\n", res2.code);

  const endMatches = (res2.code.match(/\bend\b/g) || []).length;
  if (endMatches !== 2) {
    throw new Error(`Expected 2 'end' tags, got ${endMatches}`);
  }
  console.log("✅ Test 2 Passed: Auto-closed 2 missing 'end' blocks!");

  console.log("\n=== TEST 3: Broken Arrow Normalization ===");
  const brokenArrowsCode = `
graph LR
  A -- > B
  B == > C
  C - -> D
`;
  const res3 = sanitizeMermaidCode(brokenArrowsCode);
  console.log("Fixes applied:", res3.fixesApplied);
  console.log("Cleaned Code:\n", res3.code);

  if (res3.code.includes("-- >") || res3.code.includes("== >") || res3.code.includes("- ->")) {
    throw new Error("Found un-normalized broken arrows");
  }
  console.log("✅ Test 3 Passed: All broken arrows normalized to --> and ==>!");

  console.log("\n=== TEST 4: Missing Diagram Header Recovery ===");
  const missingHeaderCode = `
  A[Client] --> B[Server]
  B --> C[Database]
`;
  const res4 = sanitizeMermaidCode(missingHeaderCode);
  console.log("Fixes applied:", res4.fixesApplied);
  console.log("Cleaned Code:\n", res4.code);

  if (!res4.code.startsWith("flowchart TD")) {
    throw new Error("Failed to add missing 'flowchart TD' header");
  }
  console.log("✅ Test 4 Passed: Automatically recovered missing flowchart header!");

  console.log("\n=== TEST 5: Graceful Fallback on Irreparable Garbage ===");
  const garbageCode = `
This is just some random pseudo-code that LLM accidentally wrapped in mermaid:
function calculateTotal(items) {
  return items.sum();
}
`;
  const blocks = createSafeMermaidNotionBlocks(garbageCode);
  console.log("Generated fallback blocks count:", blocks.length);
  console.log("Block types:", blocks.map((b) => b.type));

  const hasCallout = blocks.some((b) => b.type === "callout");
  const codeBlock = blocks.find((b) => b.type === "code");

  if (!hasCallout || codeBlock?.code?.language !== "plain text") {
    throw new Error("Graceful fallback failed: expected callout and plain text code block");
  }
  console.log("✅ Test 5 Passed: Graceful fallback activated safely without throwing Notion error!");

  console.log("\n🎉 ALL MERMAID SANITIZER TESTS PASSED 100%!");
}

runMermaidSanitizerTests();
