import { defineConfig } from "tsup";

export default defineConfig([
  // Library build
  {
    entry: {
      index: "src/index.ts",
    },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "node22",
    splitting: false,
    shims: true,
  },

  // CLI build
  {
    entry: {
      "cli/index": "src/cli/index.ts",
    },
    format: ["esm"],
    dts: false,
    sourcemap: true,
    clean: false,
    target: "node22",
    splitting: false,
    shims: true,
    banner: {
      js: "#!/usr/bin/env node",
    },
  },
]);
