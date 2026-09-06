/**
 * Mermaid Sanitizer & Auto-Healer for Notion
 * Detects and automatically fixes common LLM syntax errors in Mermaid diagrams:
 * 1. Node labels containing unquoted special characters (parentheses, brackets, colons, quotes).
 * 2. Unclosed subgraph blocks (missing `end`).
 * 3. Broken arrow operators (`-- >`, `== >`).
 * 4. Missing diagram type headers.
 * 5. Provides Graceful Fallback when a diagram cannot be safely rendered.
 */

export interface MermaidSanitizeResult {
  code: string;
  isValid: boolean;
  fixesApplied: string[];
  fallbackBlocks?: any[];
}

const VALID_DIAGRAM_TYPES = [
  "graph",
  "flowchart",
  "sequencediagram",
  "classdiagram",
  "statediagram",
  "statediagram-v2",
  "erdiagram",
  "gantt",
  "pie",
  "gitgraph",
  "mindmap",
  "quadrantchart",
  "timeline",
  "journey",
  "c4context",
];

/**
 * Strips markdown fences if LLM accidentally included them
 */
function cleanFences(code: string): string {
  let text = code.trim();
  if (text.startsWith("```mermaid")) {
    text = text.replace(/^```mermaid\s*/i, "").replace(/```\s*$/, "");
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/```\s*$/, "");
  }
  return text.trim();
}

/**
 * Automatically quotes node labels containing special characters
 * Examples:
 * - A[User (Client)] -> A["User (Client)"]
 * - B(Step 1: Init)  -> B("Step 1: Init")
 * - C{Check: valid?} -> C{"Check: valid?"}
 */
function autoQuoteLabels(line: string, fixes: string[]): string {
  // Ignore lines that are diagram headers or comments
  if (/^(graph|flowchart|sequenceDiagram|classDiagram|subgraph|end|%%)/i.test(line.trim())) {
    return line;
  }

  let modified = line;

  // 1. Match [label] where label has special chars and is NOT already quoted
  // Look for: (\w+)\s*\[([^"\]]+)\]
  modified = modified.replace(/([\w\-]+)\s*\[([^"\]]+)\]/g, (match, id, label) => {
    // Check if label contains special characters: ()[]{}":;,$/\
    if (/[():;,${}\[\]\/]/.test(label)) {
      const cleanLabel = label.replace(/"/g, "'").trim();
      fixes.push(`Auto-quoted bracket label for node "${id}"`);
      return `${id}["${cleanLabel}"]`;
    }
    return match;
  });

  // 2. Match (label) where label has special chars and is NOT already quoted
  modified = modified.replace(/([\w\-]+)\s*\(([^"()]+)\)/g, (match, id, label) => {
    if (/[:;,${}\[\]\/]/.test(label)) {
      const cleanLabel = label.replace(/"/g, "'").trim();
      fixes.push(`Auto-quoted round label for node "${id}"`);
      return `${id}("${cleanLabel}")`;
    }
    return match;
  });

  // 3. Match {label} where label has special chars and is NOT already quoted
  modified = modified.replace(/([\w\-]+)\s*\{([^"{}]+)\}/g, (match, id, label) => {
    if (/[():;,${}\[\]\/]/.test(label)) {
      const cleanLabel = label.replace(/"/g, "'").trim();
      fixes.push(`Auto-quoted brace label for node "${id}"`);
      return `${id}{"${cleanLabel}"}`;
    }
    return match;
  });

  return modified;
}

/**
 * Normalizes broken arrows: `-- >` -> `-->`, `== >` -> `==>`
 */
function normalizeArrows(line: string, fixes: string[]): string {
  let res = line;
  if (/--\s+>/.test(res)) {
    res = res.replace(/--\s+>/g, "-->");
    fixes.push("Normalized broken arrow '-- >' to '-->'");
  }
  if (/==\s+>/.test(res)) {
    res = res.replace(/==\s+>/g, "==>");
    fixes.push("Normalized broken thick arrow '== >' to '==>'");
  }
  if (/-\s+->/.test(res)) {
    res = res.replace(/-\s+->/g, "-->");
    fixes.push("Normalized spaced arrow '- ->' to '-->'");
  }
  return res;
}

/**
 * Balances unclosed `subgraph ... end` blocks
 */
function balanceSubgraphs(lines: string[], fixes: string[]): string[] {
  let subgraphsCount = 0;
  let endsCount = 0;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^subgraph\b/i.test(trimmed)) {
      subgraphsCount++;
    } else if (/^end\b/i.test(trimmed)) {
      endsCount++;
    }
  }

  if (subgraphsCount > endsCount) {
    const missing = subgraphsCount - endsCount;
    for (let i = 0; i < missing; i++) {
      lines.push("end");
    }
    fixes.push(`Auto-closed ${missing} unclosed subgraph block(s) with 'end'`);
  }

  return lines;
}

/**
 * Validates and sanitizes Mermaid code
 */
export function sanitizeMermaidCode(rawCode: string): MermaidSanitizeResult {
  const fixes: string[] = [];
  let cleaned = cleanFences(rawCode);

  if (!cleaned) {
    return {
      code: "",
      isValid: false,
      fixesApplied: ["Empty code block"],
    };
  }

  let lines = cleaned.split(/\r?\n/);

  // 1. Check header
  let firstLine = lines.find((l) => l.trim().length > 0 && !l.trim().startsWith("%%"))?.trim() || "";
  const firstWord = firstLine.split(/\s+/)[0]?.toLowerCase();

  const hasValidHeader = VALID_DIAGRAM_TYPES.some((type) =>
    firstWord.startsWith(type)
  );

  if (!hasValidHeader) {
    // Model forgot diagram header: inspect if it looks like a flowchart
    if (cleaned.includes("-->") || cleaned.includes("---") || cleaned.includes("->")) {
      lines.unshift("flowchart TD");
      fixes.push("Added missing 'flowchart TD' header");
    } else {
      // Unknown diagram type and doesn't look like flowchart
      return {
        code: cleaned,
        isValid: false,
        fixesApplied: ["Unrecognized diagram type header"],
      };
    }
  } else if (firstWord === "graph" || firstWord === "flowchart") {
    // Check if direction is missing (e.g. just "graph" or "flowchart")
    const headerParts = firstLine.split(/\s+/);
    if (headerParts.length === 1) {
      const idx = lines.indexOf(firstLine);
      if (idx !== -1) {
        lines[idx] = `${firstLine} TD`;
        fixes.push("Added default direction 'TD' to flowchart header");
      }
    }
  }

  // 2. Process each line for label quotes and arrow normalization
  lines = lines.map((line) => {
    let l = autoQuoteLabels(line, fixes);
    l = normalizeArrows(l, fixes);
    return l;
  });

  // 3. Balance subgraphs
  lines = balanceSubgraphs(lines, fixes);

  const finalCode = lines.join("\n");

  return {
    code: finalCode,
    isValid: true,
    fixesApplied: fixes,
  };
}

/**
 * Creates safe Notion blocks for a Mermaid diagram:
 * - If valid: returns native code block with language 'mermaid'.
 * - If invalid: returns code block with language 'plain text' and a gentle warning callout
 *   so Notion NEVER displays an ugly red error banner.
 */
export function createSafeMermaidNotionBlocks(rawCode: string, caption?: string): any[] {
  const result = sanitizeMermaidCode(rawCode);

  if (result.isValid) {
    const block: any = {
      object: "block",
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: {
              content: result.code,
            },
          },
        ],
        language: "mermaid",
      },
    };

    if (caption) {
      block.code.caption = [
        {
          type: "text",
          text: {
            content: caption,
          },
        },
      ];
    }

    return [block];
  }

  // Graceful Fallback Mode (Avoid ugly red Notion syntax error)
  const warningCallout = {
    object: "block",
    type: "callout",
    callout: {
      icon: { type: "emoji", emoji: "⚠️" },
      rich_text: [
        {
          type: "text",
          text: {
            content:
              "Biểu đồ Mermaid này chứa lỗi cú pháp từ model - đang lưu ở dạng mã nguồn để tránh lỗi hiển thị trên Notion.",
          },
        },
      ],
      color: "yellow_background",
    },
  };

  const plainCodeBlock = {
    object: "block",
    type: "code",
    code: {
      rich_text: [
        {
          type: "text",
          text: {
            content: rawCode,
          },
        },
      ],
      language: "plain text",
    },
  };

  return [warningCallout, plainCodeBlock];
}
