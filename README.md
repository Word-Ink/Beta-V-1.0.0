<div align="center">

# wordink

**The document editor you copy into your codebase.**

A headless, document-grade rich-text editor built on `contentEditable` and the
Selection / Range API — no third-party editor framework, no opaque dependency.
Themeable with CSS variables, plugin-based, and the source lives in **your**
repo.

[Live site](https://wordink.dev) · [Playground](https://wordink.dev/playground) ·
[Docs](https://wordink.dev/docs) · [Compare](https://wordink.dev/compare)

</div>

---

## Status

**v0.1.0 — early access.** The editor and the marketing site live in this
repo. Aiming for Google Docs / Microsoft Word feature parity, shipped as
source you own.

## What ships today

Inline marks · headings 1 → 6 · font family + size · text colour · highlight ·
alignment · lists · indent · blockquote · code block · links (with popover) ·
images (URL / paste / drag-drop / upload callback) · tables · horizontal rule ·
table-of-contents placeholder · undo / redo · clear formatting · markdown
shortcuts (`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `# heading`,
`- list`, `> quote`, `--- ` ruler) · drag-drop image overlay · copy HTML ·
download HTML · print / save as PDF · fullscreen mode · live word + char
counts · keyboard shortcuts (⌘B, ⌘I, ⌘U, ⌘K, ⌘Z, ⌘⇧Z, ⌘⇧7, ⌘⇧8).

See the [comparison page](https://wordink.dev/compare) for the full
feature-by-feature breakdown vs. Google Docs, MS Word, and Tiptap / Lexical.

## Use it in your project

Today: copy the editor folder into your repo (the wordink positioning).

```bash
# Copy the editor source
cp -r src/components/editor /path/to/your/project/src/components/editor

# Install the four runtime deps
npm install react react-dom lucide-react clsx tailwind-merge
```

Then drop the `.rte-content`, `.rte-toc`, and (optionally) `.code-shell`
blocks from `src/styles/global.css` into your project's global stylesheet,
and render:

```tsx
"use client";
import { useState } from "react";
import { RichTextEditor } from "@/components/editor";

export function PostEditor() {
  const [html, setHtml] = useState("");
  return (
    <RichTextEditor
      value={html}
      onChange={setHtml}
      placeholder="Start writing…"
    />
  );
}
```

See [`src/components/editor/INSTALL.md`](./src/components/editor/INSTALL.md)
for the full prop reference + required CSS variables.

Other distribution paths (npm publish, GitHub install, shadcn-style CLI) are
laid out in [`HOSTING.md`](./HOSTING.md).

## Develop the site locally

```bash
npm install
npm run dev    # http://localhost:4321
```

The repo contains both the marketing site (Astro) and the editor source
(React, mounted as an Astro island on `/` and `/playground`).

| Command           | Action                                  |
| ----------------- | --------------------------------------- |
| `npm run dev`     | Dev server with HMR at `localhost:4321` |
| `npm run build`   | Static site build to `./dist/`          |
| `npm run preview` | Preview the production build            |

Stack: Astro 4 · React 18 · Tailwind v4 · Geist (Sans + Mono) ·
`@fontsource-variable` · `lucide-react` icons.

## License

MIT — see [LICENSE](./LICENSE).

## Credits

Built and maintained by **[Cyber Squad Inc.](https://cybersquadinc.com)**
