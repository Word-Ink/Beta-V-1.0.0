/**
 * wordink editor — public API.
 *
 * Copy this folder (`src/components/editor/`) into your project and
 * install the four dependencies listed in INSTALL.md. The editor is
 * fully self-contained: no internal app imports, no media-store
 * coupling — uploads and image-pickers are passed in as props.
 *
 * Minimal usage:
 *   import { RichTextEditor } from "@/components/editor";
 *   <RichTextEditor value={html} onChange={setHtml} />
 *
 * With your own upload backend:
 *   <RichTextEditor
 *     value={html}
 *     onChange={setHtml}
 *     onUpload={async (file) => myUpload(file)}
 *     onPickImage={async () => openMyMediaLibrary()}
 *   />
 */

export { RichTextEditor } from "./rich-text-editor";
export type { RichTextEditorProps } from "./rich-text-editor";

export { ColorPickerPopover } from "./color-picker-popover";

export { cn } from "./utils";
