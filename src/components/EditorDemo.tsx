import { useState } from "react";
import { RichTextEditor } from "./editor/rich-text-editor";

const SAMPLE = `<h2>The case for owning your editor</h2>
<p>Most rich-text editors are <strong>libraries you depend on</strong>. wordink is a <em>folder you own</em>. The difference matters more than it sounds.</p>
<p>Try this — select text and use the toolbar. Add a <a href="https://wordink.dev" target="_blank" rel="noopener noreferrer">link</a>. Drop a list. Try fullscreen. Press <code>⌘B</code>.</p>
<blockquote>The best abstraction is the one you can delete.</blockquote>
<p>This editor is the same one you'll copy into your repo. Every byte of it.</p>`;

export function EditorDemo({
  initialContent = SAMPLE,
  minRows = 10,
  placeholder = "Start writing…",
}: {
  initialContent?: string;
  minRows?: number;
  placeholder?: string;
}) {
  const [html, setHtml] = useState(initialContent);
  return (
    <RichTextEditor
      value={html}
      onChange={setHtml}
      minRows={minRows}
      placeholder={placeholder}
    />
  );
}
