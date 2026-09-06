import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

export interface BookChapterFile {
  filePath: string;           // Relative file path (e.g. "01-part1/02-attention.md")
  absolutePath: string;       // Full absolute path
  title: string;              // Chapter title
  order: number;              // Numeric order (e.g. 1, 2, 3...)
  content: string;            // Raw markdown text (without YAML frontmatter)
  rawContent: string;         // Entire file content
  fileHash: string;           // SHA-256 hash of content
  wordCount: number;          // Estimated word count
  tags: string[];             // Extracted tags
  status: "Chưa dịch" | "Bản nháp" | "Đã hoàn thành";
  subSectionOf?: string;      // Parent chapter identifier if nested
}

/**
 * Natural sort helper (e.g. "1-intro", "2-setup", "10-advanced")
 */
function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Parses basic YAML frontmatter (between --- and ---)
 */
function parseFrontmatter(content: string): {
  frontmatter: Record<string, any>;
  body: string;
} {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) {
    return { frontmatter: {}, body: content };
  }

  const yamlStr = match[1];
  const body = match[2];
  const frontmatter: Record<string, any> = {};

  for (const line of yamlStr.split(/\r?\n/)) {
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      const key = line.slice(0, colonIndex).trim();
      let value: any = line.slice(colonIndex + 1).trim();

      // Simple type coercion
      if (value.startsWith("[") && value.endsWith("]")) {
        // Simple array: [a, b, c]
        value = value
          .slice(1, -1)
          .split(",")
          .map((s: string) => s.trim().replace(/^["']|["']$/g, ""));
      } else if (value.startsWith('"') && value.endsWith('"')) {
        value = value.slice(1, -1);
      } else if (value.startsWith("'") && value.endsWith("'")) {
        value = value.slice(1, -1);
      } else if (!isNaN(Number(value))) {
        value = Number(value);
      }

      frontmatter[key] = value;
    }
  }

  return { frontmatter, body };
}

/**
 * Extracts title from markdown body (# Heading) or filename
 */
function extractTitle(body: string, filename: string): string {
  const headingMatch = body.match(/^#\s+(.+)$/m);
  if (headingMatch) {
    return headingMatch[1].trim();
  }

  // Fallback: clean filename (e.g. "01-introduction.md" -> "01 Introduction")
  const base = path.basename(filename, path.extname(filename));
  return base.replace(/[-_]/g, " ").replace(/^\d+\s*/, "").trim() || base;
}

/**
 * Scans a folder recursively for Markdown files and orders them naturally
 */
export function scanBookFolder(folderPath: string): BookChapterFile[] {
  if (!fs.existsSync(folderPath)) {
    throw new Error(`Folder path does not exist: ${folderPath}`);
  }

  const results: BookChapterFile[] = [];

  function walk(dir: string, baseDir: string, currentOrder: { count: number }) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Sort entries naturally
    entries.sort((a, b) => naturalSort(a.name, b.name));

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(baseDir, fullPath);

      if (entry.isDirectory()) {
        // Skip hidden and build directories
        if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
        walk(fullPath, baseDir, currentOrder);
      } else if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext === ".md" || ext === ".markdown") {
          currentOrder.count++;
          const raw = fs.readFileSync(fullPath, "utf-8");
          const { frontmatter, body } = parseFrontmatter(raw);

          const title =
            frontmatter.title || extractTitle(body, entry.name);
          const order =
            typeof frontmatter.order === "number"
              ? frontmatter.order
              : currentOrder.count;

          const words = body.trim().split(/\s+/).filter(Boolean).length;
          const hash = crypto
            .createHash("sha256")
            .update(raw.trim())
            .digest("hex")
            .slice(0, 16);

          let status: BookChapterFile["status"] = "Đã hoàn thành";
          if (frontmatter.status === "draft" || frontmatter.status === "Bản nháp") {
            status = "Bản nháp";
          } else if (
            frontmatter.status === "todo" ||
            frontmatter.status === "Chưa dịch"
          ) {
            status = "Chưa dịch";
          }

          const tags: string[] = Array.isArray(frontmatter.tags)
            ? frontmatter.tags
            : [];

          results.push({
            filePath: relPath,
            absolutePath: fullPath,
            title,
            order,
            content: body,
            rawContent: raw,
            fileHash: hash,
            wordCount: words,
            tags,
            status,
          });
        }
      }
    }
  }

  walk(folderPath, folderPath, { count: 0 });

  // Final sort by order
  results.sort((a, b) => a.order - b.order);
  return results;
}
