# wordink

**The document editor you copy into your codebase.**

A headless, document-grade rich-text editor built on `contentEditable` and
the Selection / Range API — no third-party editor framework. Themeable with
CSS variables, plugin-based, source-owned.

[Live site](https://wordink.dev) · [Playground](https://wordink.dev/playground) ·
[Docs](https://wordink.dev/docs) · [Compare vs Google Docs / Word](https://wordink.dev/compare)

## Install

```bash
npm install wordink
```

Peer dependencies: `react@18+`, `react-dom@18+`.

## Use

```tsx
"use client";

import { useState } from "react";
import { RichTextEditor } from "wordink";

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

## Required CSS variables

The editor renders its content inside `.rte-content`. Define these CSS
variables in your global stylesheet (or via Tailwind v4 `@theme`):

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
| `--color-brand-deep`   | Primary CTA hover                  |
| `--font-sans`          | Body font                          |
| `--font-mono`          | Code blocks, inline code           |

Plus the `.rte-content` block of CSS rules (copy from the wordink repo's
`src/styles/global.css` — search for `.rte-content`, `.rte-toc`).

## Props

| Prop          | Type                                                              | Default              | Description                                                       |
|---------------|-------------------------------------------------------------------|----------------------|-------------------------------------------------------------------|
| `value`       | `string`                                                          | —                    | HTML content (controlled).                                        |
| `onChange`    | `(html: string) => void`                                          | —                    | Fires on every input.                                             |
| `placeholder` | `string`                                                          | `"Start writing…"`   | Shown when empty.                                                 |
| `minRows`     | `number`                                                          | `14`                 | Min-height (`minRows * 1.6rem`).                                  |
| `variant`     | `"card" \| "embedded"`                                            | `"card"`             | `card` draws its own border. `embedded` drops it.                 |
| `onPickImage` | `() => Promise<{ src; alt? } \| null> \| { src; alt? } \| null`  | —                    | Custom image picker. Falls back to `window.prompt` if absent.     |
| `onUpload`    | `(file: File) => Promise<string> \| string`                       | —                    | Upload handler for paste/drop. Falls back to inline data URLs.    |
| `className`   | `string`                                                          | —                    | Extra classes for the outer wrapper.                              |

## Features

Inline marks · headings 1 → 6 · font family + size · text colour · highlight ·
alignment · lists · indent · blockquote · code block · links (with popover) ·
images (URL / paste / drag-drop / upload callback) · tables · horizontal rule ·
table-of-contents placeholder · undo / redo · clear formatting · markdown
shortcuts (`**bold**`, `*italic*`, `~~strike~~`, `` `code` ``, `# heading`,
`- list`, `> quote`, `--- ` ruler) · drag-drop image overlay · copy HTML ·
download HTML · print / save as PDF · fullscreen mode · live word + char
counts · keyboard shortcuts (⌘B, ⌘I, ⌘U, ⌘K, ⌘Z, ⌘⇧Z, ⌘⇧7, ⌘⇧8).

See the [comparison page](https://wordink.dev/compare) for the full
feature-by-feature breakdown.

## License

[MIT](./LICENSE) — © 2026 [Cyber Squad Inc.](https://cybersquadinc.com)
