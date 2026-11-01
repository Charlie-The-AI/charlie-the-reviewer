import { defineConfig } from "tsup";

export default defineConfig({
  entry: {
    index: "src/index.ts",
    "cli/index": "src/cli/index.ts",
  },
  format: ["esm"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "node22",
  splitting: false,
  shims: true,
  banner({ entry }) {
    if (entry === "cli/index") {
      return {
        js: "#!/usr/bin/env node",
      };
    }
    return {};
  },
});
