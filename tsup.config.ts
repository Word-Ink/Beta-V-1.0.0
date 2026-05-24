import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  splitting: false,
  external: ["react", "react-dom", "react/jsx-runtime"],
  // Mark CSS-related deps + lucide as external so consumers can dedupe.
  // (clsx / tailwind-merge / lucide-react are pre-bundled into the package
  // by default — they're tiny and stable.)
  banner: {
    js: '"use client";',
  },
});
