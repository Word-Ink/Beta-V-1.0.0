# wordink editor — install guide

A headless, document-grade rich-text editor. The source lives in your
repo — no opaque npm dependency.

## 1. Copy the folder

Copy `src/components/editor/` into your project at the same path (or
wherever your shared components live). The folder is self-contained
— no internal app imports.

```
src/components/editor/
├── rich-text-editor.tsx       — main component
├── color-picker-popover.tsx   — text / highlight colour picker
├── utils.ts                   — local cn() helper
├── index.ts                   — public re-exports
└── INSTALL.md                 — this file
```

## 2. Install dependencies

```bash
npm install lucide-react clsx tailwind-merge
```

(React 18+ is assumed. The editor uses no other runtime deps.)

## 3. Add the editor styles to your global CSS

The editor renders its content inside `.rte-content`. Copy the
`.rte-content`, `.rte-toc`, and (optional) `.cursor-blink` blocks
from `src/styles/global.css` into your project's global stylesheet.

Required CSS variables (set them in `:root` or your design tokens):

| Variable               | Used for                           |
|------------------------|------------------------------------|
| `--color-bg`           | Editor surface background          |
| `--color-surface`      | Toolbar / popover background       |
| `--color-line`         | Borders                            |
| `--color-line-2`       | Hover borders                      |
| `--color-ink`          | Body text                          |
| `--color-mute`         | Secondary text                     |
| `--color-mute-2`       | Placeholder, footer counts         |
| `--color-brand`        | Active toolbar state, focus, links |
| `--color-brand-deep`   | Hover state for primary CTAs       |
| `--font-sans`          | Body font                          |
| `--font-mono`          | Code blocks, inline code           |

If you use Tailwind v4 with `@theme`, naming your design tokens
`--color-*` makes them resolve automatically.

## 4. Render the editor

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
      minRows={14}
    />
  );
}
```

## Props

| Prop          | Type                                                        | Default       | Description                                                                          |
|---------------|-------------------------------------------------------------|---------------|--------------------------------------------------------------------------------------|
| `value`       | `string`                                                    | —             | HTML content (controlled).                                                            |
| `onChange`    | `(html: string) => void`                                    | —             | Fires on every input.                                                                 |
| `placeholder` | `string`                                                    | `"Start writing…"` | Placeholder shown when the editor is empty.                                  |
| `minRows`     | `number`                                                    | `14`          | Sets the editor's `min-height` (`minRows * 1.6rem`).                                  |
| `variant`     | `"card" \| "embedded"`                                      | `"card"`      | `card` draws its own border. `embedded` drops the border (e.g. inside another card). |
| `onPickImage` | `() => Promise<{ src; alt? } \| null> \| { src; alt? } \| null` | —         | Custom image picker. If absent, falls back to `window.prompt`.                        |
| `onUpload`    | `(file: File) => Promise<string> \| string`                 | —             | Upload handler for paste / drop images. If absent, embeds inline as a data URL.       |
| `className`   | `string`                                                    | —             | Extra classes for the outer wrapper.                                                  |

## What ships

Inline marks · headings 1 → 6 · font family + size · text colour · highlight ·
alignment · lists · indent · blockquote · code block · links (with popover) ·
images (URL / paste / drag-drop / upload callback) · tables · horizontal rule ·
table-of-contents placeholder · undo / redo · clear formatting · markdown
shortcuts (`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `# heading`,
`- list`, `> quote`, `--- ` ruler) · drag-drop image overlay · copy HTML ·
download HTML · print / save as PDF · fullscreen mode · live word + char counts ·
keyboard shortcuts (⌘B, ⌘I, ⌘U, ⌘K, ⌘Z, ⌘⇧Z, ⌘⇧7, ⌘⇧8).
