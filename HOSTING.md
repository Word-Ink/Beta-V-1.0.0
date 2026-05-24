# Hosting the wordink editor for multiple projects

You have one editor (`src/components/editor/`) and a growing list of
projects that want it. Three ways to share it.

## Option A — Copy & own (recommended today)

The wordink positioning: each consuming project copies the editor folder
in, and the source belongs to that project. Updates are pulled manually
by re-copying.

In the consuming project:

```bash
# From the wordink working copy
cp -r "D:/Cyber Squad/wordink/src/components/editor" \
      "<consumer>/src/components/editor"
npm install lucide-react clsx tailwind-merge --workspace=<consumer>
```

Then drop the CSS chunks from `wordink/src/styles/global.css` (search
for `.rte-content`, `.rte-toc`, `.code-shell`) into the consumer's
global stylesheet.

**Pros:** zero dependency surface, full source ownership, matches
wordink's stated positioning.
**Cons:** updates are manual.

## Option B — Install from GitHub (once the repo is up)

Push `wordink/` to GitHub. Consumers can install directly from the
repo via npm — no registry required.

```bash
npm install github:Word-Ink/Beta-V-1.0.0#main
```

In code:

```tsx
import { RichTextEditor } from "wordink/editor";
```

For this to work cleanly, `wordink/package.json` needs an `exports`
field pointing at `src/components/editor/index.ts` plus a
`prepare` script that compiles TS → JS. Not set up yet — the current
package.json is the Astro site's, not the library's.

**Pros:** versioned via git tags, private repos work too, no npm
account needed.
**Cons:** requires a small build pipeline.

## Option C — Publish to npm (when you're ready to maintain a package)

```bash
cd <packages/editor sub-tree>
npm publish --access public
```

Consumers:

```bash
npm install @Word-Ink/Beta-V-1.0.0-editor
```

```tsx
import { RichTextEditor } from "@Word-Ink/Beta-V-1.0.0-editor";
```

**Pros:** standard install, semver, anyone can use it.
**Cons:** loses the "your source, your repo" positioning. Best done as
*both* a npm package and a shadcn-style copy CLI, like Shadcn / Radix
themes do.

## Migrating Research Goal

Research Goal currently has its own `src/components/admin/rich-text-editor.tsx`
+ `color-picker-popover.tsx`. To migrate to the wordink-hosted editor:

1. Copy the wordink editor folder (Option A above).
2. Replace Research Goal imports:
   - `@/components/admin/rich-text-editor` → `@/components/editor`
   - `@/components/admin/color-picker-popover` → unused (re-exported from editor)
3. Pass Research Goal's existing media store as callbacks:

```tsx
import { RichTextEditor } from "@/components/editor";
import { MediaPicker } from "@/components/admin/media-picker";
import { uploadFile } from "@/lib/media/media-store";

// In your component:
<RichTextEditor
  value={html}
  onChange={setHtml}
  onUpload={async (file) => {
    const item = await uploadFile(file);
    return item.dataUrl;
  }}
  onPickImage={async () => {
    // Open the existing MediaPicker, await selection, return { src, alt }
    // (see post-editor.tsx in Research Goal for the wiring pattern)
    return null;
  }}
/>
```

4. Delete the old `admin/rich-text-editor.tsx` and
   `admin/color-picker-popover.tsx` once everything wires up.

## What's new in this sync

vs. Research Goal's previous editor:
- `variant` prop (`card` | `embedded`)
- TOC placeholder button (`<div data-wordink-toc>`)
- Drag-drop visual overlay
- Word-count recompute on external value change
- Callback-based image picker (no internal MediaPicker import)
- Callback-based upload handler (no internal media-store import)
- All wordink overnight additions: H4–H6, markdown shortcuts,
  table insertion, print / copy / download HTML, drag-drop image.
