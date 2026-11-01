import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import type { FileContext } from "../types/index.js";
import { estimateTokenCount } from "../utils/tokens.js";

export interface ContextCollectorOptions {
  cwd?: string;
  maxContextTokens?: number;
  maxFiles?: number;
  maxFileSizeKb?: number;
}

export class ContextCollector {
  private cwd: string;
  private maxContextTokens: number;
  private maxFiles: number;
  private maxFileSizeBytes: number;

  constructor(options: ContextCollectorOptions = {}) {
    this.cwd = options.cwd || process.cwd();
    this.maxContextTokens = options.maxContextTokens ?? 10000;
    this.maxFiles = options.maxFiles ?? 5;
    this.maxFileSizeBytes = (options.maxFileSizeKb ?? 50) * 1024;
  }

  /**
   * Collects bounded context for a list of changed files.
   */
  collectContextForFiles(changedFilePaths: string[]): Map<string, FileContext[]> {
    const contextMap = new Map<string, FileContext[]>();
    let totalTokensUsed = 0;
    let totalFilesCollected = 0;

    for (const filePath of changedFilePaths) {
      if (totalFilesCollected >= this.maxFiles || totalTokensUsed >= this.maxContextTokens) {
        break;
      }

      const fileContexts: FileContext[] = [];

      // 1. Look for corresponding test file
      const testContext = this.findTestFile(filePath);
      if (
        testContext &&
        totalTokensUsed + estimateTokenCount(testContext.content) <= this.maxContextTokens
      ) {
        fileContexts.push(testContext);
        totalTokensUsed += estimateTokenCount(testContext.content);
        totalFilesCollected++;
      }

      // 2. Look for types / interface definitions if in TypeScript / JavaScript
      if (filePath.endsWith(".ts") || filePath.endsWith(".tsx")) {
        const typeContext = this.findTypeDefinition(filePath);
        if (
          typeContext &&
          totalTokensUsed + estimateTokenCount(typeContext.content) <= this.maxContextTokens
        ) {
          fileContexts.push(typeContext);
          totalTokensUsed += estimateTokenCount(typeContext.content);
          totalFilesCollected++;
        }
      }

      if (fileContexts.length > 0) {
        contextMap.set(filePath, fileContexts);
      }
    }

    return contextMap;
  }

  private findTestFile(filePath: string): FileContext | null {
    const dir = dirname(filePath);
    const parts = filePath.split("/");
    const filename = parts[parts.length - 1]!;
    const nameWithoutExt = filename.substring(0, filename.lastIndexOf(".")) || filename;
    const ext = filename.substring(filename.lastIndexOf(".")) || "";

    const candidatePaths = [
      join(dir, `${nameWithoutExt}.test${ext}`),
      join(dir, `${nameWithoutExt}.spec${ext}`),
      join(dir, "__tests__", `${nameWithoutExt}.test${ext}`),
      join(dir, "__tests__", `${nameWithoutExt}.spec${ext}`),
      join("tests", `${nameWithoutExt}.test${ext}`),
    ];

    for (const cand of candidatePaths) {
      const full = resolve(this.cwd, cand);
      if (existsSync(full)) {
        return this.readFileContext(full, cand, "test");
      }
    }

    return null;
  }

  private findTypeDefinition(filePath: string): FileContext | null {
    const dir = dirname(filePath);
    const candidatePaths = [
      join(dir, "types.ts"),
      join(dir, "types/index.ts"),
      join(dir, "interface.ts"),
      join(dir, "interfaces.ts"),
    ];

    for (const cand of candidatePaths) {
      const full = resolve(this.cwd, cand);
      if (existsSync(full) && cand !== filePath) {
        return this.readFileContext(full, cand, "type_definition");
      }
    }

    return null;
  }

  private readFileContext(
    fullPath: string,
    relativePath: string,
    reason: FileContext["reason"]
  ): FileContext | null {
    try {
      const stats = statSync(fullPath);
      if (stats.size > this.maxFileSizeBytes) {
        return null;
      }
      const content = readFileSync(fullPath, "utf-8");
      // Truncate if exceeds reasonable lines
      const lines = content.split("\n");
      const truncated = lines.slice(0, 150).join("\n");

      return {
        path: relativePath,
        content: truncated,
        reason,
      };
    } catch {
      return null;
    }
  }
}
