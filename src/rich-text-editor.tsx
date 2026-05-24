import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronDown,
  Code,
  Copy as CopyIcon,
  Eraser,
  ExternalLink,
  FileCode,
  FileDown,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Heading5,
  Heading6,
  Highlighter,
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTree,
  Maximize2,
  Minimize2,
  Minus,
  Palette,
  Pilcrow,
  Printer,
  Quote,
  Redo,
  Strikethrough,
  Subscript,
  Superscript,
  Table as TableIcon,
  Trash2,
  Type,
  Underline as UnderlineIcon,
  Undo,
  X,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentType,
  type ReactNode,
  type SVGProps,
} from "react";

import { ColorPickerPopover } from "./color-picker-popover";
import { cn } from "./utils";

/**
 * Lightweight HTML-output rich text editor built on contentEditable +
 * the Selection API. No third-party editor library — just design
 * tokens + a thin wrapper around document.execCommand.
 *
 * Output: HTML string. Persist as-is, render with dangerouslySetInnerHTML
 * (sanitize first when shipping to prod — DOMPurify on the server-side).
 */
export interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minRows?: number;
  className?: string;
  /**
   * Visual variant. "card" (default) draws its own rounded border so
   * the editor stands alone. "embedded" drops the border and relies on
   * a parent card to wrap it.
   */
  variant?: "card" | "embedded";
  /**
   * Called when the user clicks the Image toolbar button. Return the
   * URL + optional alt for the image to insert, or null to cancel.
   * If not provided, falls back to a window.prompt-based picker.
   */
  onPickImage?: () =>
    | Promise<{ src: string; alt?: string } | null>
    | { src: string; alt?: string }
    | null;
  /**
   * Called when the user pastes or drops an image file. Should upload
   * and return the final URL to embed. If not provided, the image is
   * embedded as a data URL inline.
   */
  onUpload?: (file: File) => Promise<string> | string;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Start writing…",
  minRows = 14,
  className,
  variant = "card",
  onPickImage,
  onUpload,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const [, setActiveTick] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openMenu, setOpenMenu] = useState<null | "font" | "size">(null);
  const [counts, setCounts] = useState({ words: 0, chars: 0 });
  /** Highlight the editable area while a file is being dragged in. */
  const [editorDragOver, setEditorDragOver] = useState(false);

  const [colorPicker, setColorPicker] = useState<{
    kind: "foreColor" | "hiliteColor";
    anchor: { top: number; left: number };
  } | null>(null);

  const [linkPopover, setLinkPopover] = useState<{
    open: boolean;
    rect: { top: number; left: number } | null;
    url: string;
    newTab: boolean;
    editingEl: HTMLAnchorElement | null;
    savedRange: Range | null;
  }>({
    open: false,
    rect: null,
    url: "",
    newTab: true,
    editingEl: null,
    savedRange: null,
  });

  /** Sync external value -> editor HTML only when materially different.
   *  Also recompute word/char counts here so loading a draft from the
   *  server immediately shows the correct totals. */
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    if ((value ?? "") !== el.innerHTML) {
      el.innerHTML = value ?? "";
    }
    const text = el.innerText.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    setCounts({ words, chars: text.length });
  }, [value]);

  /** Esc exits fullscreen. Lock body scroll while fullscreen. */
  useEffect(() => {
    if (!isFullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setIsFullscreen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [isFullscreen]);

  /** Close any open toolbar menu on outside click. */
  useEffect(() => {
    if (!openMenu) return;
    function onMouseDown(e: MouseEvent) {
      const target = e.target as HTMLElement;
      if (
        !target.closest("[data-rte-menu]") &&
        !target.closest("[data-rte-trigger]")
      ) {
        setOpenMenu(null);
      }
    }
    window.addEventListener("mousedown", onMouseDown);
    return () => window.removeEventListener("mousedown", onMouseDown);
  }, [openMenu]);

  function captureSelection() {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!el.contains(range.commonAncestorContainer)) return;
    savedRangeRef.current = range.cloneRange();
  }

  function restoreSelection() {
    const el = editorRef.current;
    const range = savedRangeRef.current;
    if (!el) return;
    el.focus();
    if (!range) return;
    const sel = window.getSelection?.();
    if (!sel) return;
    sel.removeAllRanges();
    sel.addRange(range);
  }

  const commit = useCallback(() => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
    const text = el.innerText.trim();
    const words = text ? text.split(/\s+/).filter(Boolean).length : 0;
    setCounts({ words, chars: text.length });
  }, [onChange]);

  const refreshActive = useCallback(() => {
    setActiveTick((n) => n + 1);
  }, []);

  function runCommand(cmd: string, valueArg?: string) {
    const el = editorRef.current;
    if (!el) return;
    el.focus();
    document.execCommand(cmd, false, valueArg);
    commit();
    refreshActive();
  }

  function isActive(cmd: string): boolean {
    if (typeof document === "undefined") return false;
    try {
      return document.queryCommandState(cmd);
    } catch {
      return false;
    }
  }

  function currentBlock(): string {
    if (typeof document === "undefined") return "p";
    try {
      const v = document.queryCommandValue("formatBlock") || "p";
      return v.replace(/^<|>$/g, "").toLowerCase();
    } catch {
      return "p";
    }
  }

  function setBlock(tag: "p" | "h1" | "h2" | "h3" | "blockquote" | "pre") {
    runCommand("formatBlock", `<${tag}>`);
  }

  function applyInlineStyle(prop: "fontFamily" | "fontSize", val: string) {
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (range.collapsed) return;

    const span = document.createElement("span");
    span.style.setProperty(
      prop === "fontFamily" ? "font-family" : "font-size",
      val,
    );
    try {
      range.surroundContents(span);
    } catch {
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    sel.removeAllRanges();
    commit();
    refreshActive();
  }

  function setAlignment(side: "Left" | "Center" | "Right" | "Full") {
    runCommand(`justify${side}`);
  }

  function setColor(
    kind: "foreColor" | "hiliteColor" | "backColor",
    color: string,
  ) {
    restoreSelection();
    runCommand(kind, color);
  }

  function clearFormatting() {
    runCommand("removeFormat");
    runCommand("formatBlock", "<p>");
  }

  function toggleFullscreen() {
    setIsFullscreen((v) => !v);
  }

  function openLinkPopover(anchorRect?: DOMRect) {
    const el = editorRef.current;
    if (!el) return;

    const sel = window.getSelection?.();
    const savedRange =
      sel && sel.rangeCount > 0 ? sel.getRangeAt(0).cloneRange() : null;

    const existing = currentLinkElement();
    const editingEl = existing;

    const rect =
      anchorRect ??
      (existing
        ? existing.getBoundingClientRect()
        : savedRange?.getBoundingClientRect()) ??
      null;

    setLinkPopover({
      open: true,
      rect: rect
        ? {
            top: rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
          }
        : null,
      url: existing?.getAttribute("href") ?? "",
      newTab: existing?.getAttribute("target") === "_blank",
      editingEl,
      savedRange,
    });
  }

  function closeLinkPopover() {
    setLinkPopover((s) => ({ ...s, open: false }));
  }

  function applyLink(url: string, newTab: boolean) {
    const el = editorRef.current;
    if (!el) return;
    const normalised = normaliseUrl(url);
    if (!normalised) {
      closeLinkPopover();
      return;
    }

    el.focus();

    if (linkPopover.savedRange) {
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(linkPopover.savedRange);
    }

    if (linkPopover.editingEl) {
      linkPopover.editingEl.setAttribute("href", normalised);
      if (newTab) {
        linkPopover.editingEl.setAttribute("target", "_blank");
        linkPopover.editingEl.setAttribute("rel", "noopener noreferrer");
      } else {
        linkPopover.editingEl.removeAttribute("target");
        linkPopover.editingEl.removeAttribute("rel");
      }
    } else {
      const sel = window.getSelection?.();
      const selectedText = sel?.toString() ?? "";
      const attrs = newTab ? ` target="_blank" rel="noopener noreferrer"` : "";
      const inner = selectedText
        ? escapeText(selectedText)
        : escapeText(normalised);
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${escapeAttr(normalised)}"${attrs}>${inner}</a>`,
      );
    }

    commit();
    refreshActive();
    closeLinkPopover();
  }

  function removeLink() {
    const a = linkPopover.editingEl;
    if (!a) {
      closeLinkPopover();
      return;
    }
    const parent = a.parentNode;
    if (!parent) {
      closeLinkPopover();
      return;
    }
    while (a.firstChild) parent.insertBefore(a.firstChild, a);
    parent.removeChild(a);
    commit();
    refreshActive();
    closeLinkPopover();
  }

  function currentLinkElement(): HTMLAnchorElement | null {
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return null;
    let node: Node | null = sel.getRangeAt(0).startContainer;
    while (node && node !== editorRef.current) {
      if (node.nodeType === 1 && (node as HTMLElement).tagName === "A") {
        return node as HTMLAnchorElement;
      }
      node = node.parentNode;
    }
    return null;
  }

  function handleEditorClick(e: React.MouseEvent<HTMLDivElement>) {
    let node = e.target as HTMLElement | null;
    while (node && node !== editorRef.current) {
      if (node.tagName === "A") {
        e.preventDefault();
        e.stopPropagation();
        const sel = window.getSelection?.();
        const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
        if (sel && range) {
          sel.removeAllRanges();
          sel.addRange(range);
        }
        openLinkPopover(node.getBoundingClientRect());
        return;
      }
      node = node.parentElement;
    }
  }

  /** Insert image via the caller's picker, or fall back to window.prompt. */
  async function insertImage() {
    if (onPickImage) {
      const result = await onPickImage();
      if (!result) return;
      runCommand(
        "insertHTML",
        `<img src="${escapeAttr(result.src)}" alt="${escapeAttr(result.alt ?? "")}" class="rte-img" />`,
      );
      return;
    }
    const url = window.prompt("Image URL", "https://");
    if (!url) return;
    const alt = window.prompt("Alt text (for accessibility)", "") ?? "";
    runCommand(
      "insertHTML",
      `<img src="${escapeAttr(url)}" alt="${escapeAttr(alt)}" class="rte-img" />`,
    );
  }

  /**
   * Upload (or data-URL-embed) one or more files and insert them as
   * <img> tags at the current cursor position. Used by drag-drop and
   * by paste-image-from-clipboard.
   */
  async function uploadAndInsert(files: File[]) {
    for (const file of files) {
      let src: string;
      if (onUpload) {
        try {
          src = await onUpload(file);
        } catch (err) {
          console.error("wordink: image upload failed", err);
          continue;
        }
      } else {
        // Default: embed inline as a data URL.
        src = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(file);
        });
      }
      runCommand(
        "insertHTML",
        `<img src="${escapeAttr(src)}" alt="${escapeAttr(file.name)}" class="rte-img" />`,
      );
    }
  }

  function insertHr() {
    runCommand("insertHorizontalRule");
  }

  /** Drop a TOC placeholder. Consumers can swap `<div data-wordink-toc>`
   *  on the rendered page for a live list built from H2/H3 headings. */
  function insertToc() {
    runCommand(
      "insertHTML",
      `<div data-wordink-toc="true" class="rte-toc" contenteditable="false">Table of contents</div><p><br/></p>`,
    );
  }

  function insertTable() {
    const rowsStr = window.prompt("Rows", "3");
    if (rowsStr === null) return;
    const colsStr = window.prompt("Columns", "3");
    if (colsStr === null) return;
    const rows = Math.max(1, Math.min(20, parseInt(rowsStr) || 3));
    const cols = Math.max(1, Math.min(10, parseInt(colsStr) || 3));

    let html = '<table class="rte-table"><thead><tr>';
    for (let c = 0; c < cols; c++) html += `<th>Header ${c + 1}</th>`;
    html += "</tr></thead><tbody>";
    for (let r = 0; r < rows - 1; r++) {
      html += "<tr>";
      for (let c = 0; c < cols; c++) html += "<td>&nbsp;</td>";
      html += "</tr>";
    }
    html += "</tbody></table><p>&nbsp;</p>";
    runCommand("insertHTML", html);
  }

  /**
   * Markdown-style shortcuts. Fires on space — checks the text before
   * the cursor for patterns and converts them inline. Returns true if
   * the event was handled (preventDefault has been called).
   *
   * Block-level (cursor must be at start of an empty block prefix):
   *   `# `  → H1            `## `  → H2            `### ` → H3
   *   `#### ` → H4          `##### ` → H5          `###### ` → H6
   *   `- ` / `* ` → bullet  `1. ` → numbered       `> ` → blockquote
   *   ``` ``` ``` → code block (after 3 backticks + space)
   *
   * Inline (at end of text before cursor):
   *   **X** → bold     *X* / _X_ → italic     ~~X~~ → strike
   *   `X`   → inline code
   */
  function handleMarkdownShortcut(
    e: React.KeyboardEvent<HTMLDivElement>,
  ): boolean {
    if (e.key !== " ") return false;
    const sel = window.getSelection?.();
    if (!sel || sel.rangeCount === 0) return false;
    const range = sel.getRangeAt(0);
    if (!range.collapsed) return false;

    const node = range.startContainer;
    if (node.nodeType !== Node.TEXT_NODE) return false;
    const textNode = node as Text;
    const text = textNode.textContent || "";
    const offset = range.startOffset;
    const before = text.slice(0, offset);

    // ── Block-level: cursor must be at the very start of the block ──
    const block = blockOf(textNode);
    if (block && firstTextNodeOf(block) === textNode) {
      const blockMaps: { prefix: string; tag: string; cmd?: string }[] = [
        { prefix: "######", tag: "h6" },
        { prefix: "#####", tag: "h5" },
        { prefix: "####", tag: "h4" },
        { prefix: "###", tag: "h3" },
        { prefix: "##", tag: "h2" },
        { prefix: "#", tag: "h1" },
        { prefix: ">", tag: "blockquote" },
        { prefix: "```", tag: "pre" },
      ];
      for (const { prefix, tag } of blockMaps) {
        if (before === prefix) {
          e.preventDefault();
          textNode.textContent = "";
          runCommand("formatBlock", `<${tag}>`);
          return true;
        }
      }
      if (before === "-" || before === "*") {
        e.preventDefault();
        textNode.textContent = "";
        runCommand("insertUnorderedList");
        return true;
      }
      if (before === "1.") {
        e.preventDefault();
        textNode.textContent = "";
        runCommand("insertOrderedList");
        return true;
      }
      if (before === "---") {
        e.preventDefault();
        textNode.textContent = "";
        runCommand("insertHorizontalRule");
        return true;
      }
    }

    // ── Inline: last bold / italic / strike / code pattern ──
    type InlinePattern = { regex: RegExp; tag: "strong" | "em" | "s" | "code" };
    const inline: InlinePattern[] = [
      { regex: /\*\*([^*]+?)\*\*$/, tag: "strong" },
      { regex: /__([^_]+?)__$/, tag: "strong" },
      { regex: /~~([^~]+?)~~$/, tag: "s" },
      { regex: /(?<![*])\*([^*]+?)\*$/, tag: "em" },
      { regex: /(?<![_])_([^_]+?)_$/, tag: "em" },
      { regex: /`([^`]+?)`$/, tag: "code" },
    ];
    for (const { regex, tag } of inline) {
      const m = before.match(regex);
      if (m) {
        e.preventDefault();
        wrapMatch(textNode, before.length - m[0].length, offset, tag, m[1]);
        return true;
      }
    }

    return false;
  }

  /** Replace [start..end) of textNode with <tag>content</tag> + space. */
  function wrapMatch(
    textNode: Text,
    start: number,
    end: number,
    tag: string,
    content: string,
  ) {
    const fullText = textNode.textContent || "";
    const beforeText = fullText.slice(0, start);
    const afterText = fullText.slice(end);

    textNode.textContent = beforeText;

    const el = document.createElement(tag);
    el.textContent = content;
    const parent = textNode.parentNode;
    if (!parent) return;
    parent.insertBefore(el, textNode.nextSibling);

    // Trailing space + remaining text
    const trailing = document.createTextNode(" " + afterText);
    parent.insertBefore(trailing, el.nextSibling);

    // Position cursor right after the trailing space
    const newRange = document.createRange();
    newRange.setStart(trailing, 1);
    newRange.collapse(true);
    const sel = window.getSelection();
    sel?.removeAllRanges();
    sel?.addRange(newRange);

    commit();
    refreshActive();
  }

  function blockOf(node: Node): HTMLElement | null {
    let cur: Node | null =
      node.nodeType === Node.TEXT_NODE ? node.parentNode : node;
    while (cur && cur !== editorRef.current) {
      if (cur.nodeType === 1) {
        const tag = (cur as HTMLElement).tagName;
        if (
          tag === "P" || tag === "DIV" || tag === "H1" || tag === "H2" ||
          tag === "H3" || tag === "H4" || tag === "H5" || tag === "H6" ||
          tag === "BLOCKQUOTE" || tag === "PRE" || tag === "LI"
        ) {
          return cur as HTMLElement;
        }
      }
      cur = cur.parentNode;
    }
    return null;
  }

  function firstTextNodeOf(block: HTMLElement): Text | null {
    const walker = document.createTreeWalker(block, NodeFilter.SHOW_TEXT);
    return (walker.nextNode() as Text) || null;
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    if (handleMarkdownShortcut(e)) return;
    const meta = e.metaKey || e.ctrlKey;
    if (!meta) return;
    const k = e.key.toLowerCase();

    if (k === "b") {
      e.preventDefault();
      runCommand("bold");
    } else if (k === "i") {
      e.preventDefault();
      runCommand("italic");
    } else if (k === "u") {
      e.preventDefault();
      runCommand("underline");
    } else if (k === "k") {
      e.preventDefault();
      openLinkPopover();
    } else if (k === "z" && !e.shiftKey) {
      e.preventDefault();
      runCommand("undo");
    } else if (k === "y" || (k === "z" && e.shiftKey)) {
      e.preventDefault();
      runCommand("redo");
    } else if (e.shiftKey && k === "7") {
      e.preventDefault();
      runCommand("insertOrderedList");
    } else if (e.shiftKey && k === "8") {
      e.preventDefault();
      runCommand("insertUnorderedList");
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLDivElement>) {
    // Image clipboard data → route through onUpload (or data-URL).
    const files = Array.from(e.clipboardData.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length > 0) {
      e.preventDefault();
      void uploadAndInsert(files);
      return;
    }
    // Plain text fallback — strip styling.
    e.preventDefault();
    const text = e.clipboardData.getData("text/plain");
    document.execCommand("insertText", false, text);
    commit();
    refreshActive();
  }

  function handleDragOver(e: React.DragEvent<HTMLDivElement>) {
    // React to OS file drags only — ignore intra-document text drags.
    if (Array.from(e.dataTransfer.types ?? []).includes("Files")) {
      e.preventDefault();
      e.dataTransfer.dropEffect = "copy";
      if (!editorDragOver) setEditorDragOver(true);
    }
  }

  function handleDragLeave(e: React.DragEvent<HTMLDivElement>) {
    if (e.currentTarget === e.target) setEditorDragOver(false);
  }

  function handleDrop(e: React.DragEvent<HTMLDivElement>) {
    setEditorDragOver(false);
    const files = Array.from(e.dataTransfer.files ?? []).filter((f) =>
      f.type.startsWith("image/"),
    );
    if (files.length === 0) return;
    e.preventDefault();
    // Place cursor at drop point so subsequent insertHTML calls land
    // each image where the user actually dropped.
    const range = document.caretRangeFromPoint?.(e.clientX, e.clientY);
    if (range) {
      const sel = window.getSelection?.();
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
    editorRef.current?.focus();
    void uploadAndInsert(files);
  }

  const block = currentBlock();

  return (
    <div
      className={cn(
        "overflow-hidden bg-surface",
        variant === "card" &&
          "rounded-xl border border-line focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20",
        variant === "embedded" && "border-0",
        isFullscreen &&
          "fixed inset-0 z-50 flex flex-col rounded-none border-0 ring-0 focus-within:ring-0",
        className,
      )}
    >
      {/* Toolbar */}
      <div
        role="toolbar"
        aria-label="Formatting"
        className="sticky top-0 z-10 flex flex-wrap items-center gap-0.5 border-b border-line bg-surface/95 px-2 py-1.5 backdrop-blur"
      >
        <ToolGroup>
          <ToolBtn
            label="Paragraph"
            icon={Pilcrow}
            active={block === "p" || block === "div"}
            onClick={() => setBlock("p")}
          />
          <ToolBtn
            label="Heading 1"
            icon={Heading1}
            active={block === "h1"}
            onClick={() => setBlock("h1")}
          />
          <ToolBtn
            label="Heading 2"
            icon={Heading2}
            active={block === "h2"}
            onClick={() => setBlock("h2")}
          />
          <ToolBtn
            label="Heading 3"
            icon={Heading3}
            active={block === "h3"}
            onClick={() => setBlock("h3")}
          />
          <ToolBtn
            label="Heading 4"
            icon={Heading4}
            active={block === "h4"}
            onClick={() => runCommand("formatBlock", "<h4>")}
          />
          <ToolBtn
            label="Heading 5"
            icon={Heading5}
            active={block === "h5"}
            onClick={() => runCommand("formatBlock", "<h5>")}
          />
          <ToolBtn
            label="Heading 6"
            icon={Heading6}
            active={block === "h6"}
            onClick={() => runCommand("formatBlock", "<h6>")}
          />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <Dropdown
            label="Font family"
            icon={Type}
            open={openMenu === "font"}
            onToggle={(open) => {
              if (open) captureSelection();
              setOpenMenu(open ? "font" : null);
            }}
          >
            {FONT_FAMILIES.map((f) => (
              <MenuItem
                key={f.label}
                onClick={() => {
                  applyInlineStyle("fontFamily", f.css);
                  setOpenMenu(null);
                }}
              >
                <span style={{ fontFamily: f.css }}>{f.label}</span>
              </MenuItem>
            ))}
          </Dropdown>
          <Dropdown
            label="Font size"
            triggerText="Aa"
            open={openMenu === "size"}
            onToggle={(open) => {
              if (open) captureSelection();
              setOpenMenu(open ? "size" : null);
            }}
          >
            {FONT_SIZES.map((f) => (
              <MenuItem
                key={f.label}
                onClick={() => {
                  applyInlineStyle("fontSize", f.css);
                  setOpenMenu(null);
                }}
              >
                <span style={{ fontSize: f.css }}>{f.label}</span>
              </MenuItem>
            ))}
          </Dropdown>
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn label="Bold (⌘B)" icon={Bold} active={isActive("bold")} onClick={() => runCommand("bold")} />
          <ToolBtn label="Italic (⌘I)" icon={Italic} active={isActive("italic")} onClick={() => runCommand("italic")} />
          <ToolBtn label="Underline (⌘U)" icon={UnderlineIcon} active={isActive("underline")} onClick={() => runCommand("underline")} />
          <ToolBtn label="Strikethrough" icon={Strikethrough} active={isActive("strikeThrough")} onClick={() => runCommand("strikeThrough")} />
          <ToolBtn
            label="Inline code"
            icon={Code}
            onClick={() => {
              const sel = window.getSelection?.();
              const text = sel?.toString() ?? "";
              if (text) {
                runCommand("insertHTML", `<code>${escapeText(text)}</code>`);
              }
            }}
          />
          <ToolBtn label="Subscript" icon={Subscript} active={isActive("subscript")} onClick={() => runCommand("subscript")} />
          <ToolBtn label="Superscript" icon={Superscript} active={isActive("superscript")} onClick={() => runCommand("superscript")} />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn
            label="Text color"
            icon={Palette}
            active={colorPicker?.kind === "foreColor"}
            onClick={(e) => {
              captureSelection();
              const rect = e?.currentTarget.getBoundingClientRect();
              if (!rect) return;
              setColorPicker({
                kind: "foreColor",
                anchor: {
                  top: rect.bottom + window.scrollY + 6,
                  left: rect.left + window.scrollX,
                },
              });
            }}
          />
          <ToolBtn
            label="Highlight"
            icon={Highlighter}
            active={colorPicker?.kind === "hiliteColor"}
            onClick={(e) => {
              captureSelection();
              const rect = e?.currentTarget.getBoundingClientRect();
              if (!rect) return;
              setColorPicker({
                kind: "hiliteColor",
                anchor: {
                  top: rect.bottom + window.scrollY + 6,
                  left: rect.left + window.scrollX,
                },
              });
            }}
          />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn label="Align left" icon={AlignLeft} active={isActive("justifyLeft")} onClick={() => setAlignment("Left")} />
          <ToolBtn label="Align center" icon={AlignCenter} active={isActive("justifyCenter")} onClick={() => setAlignment("Center")} />
          <ToolBtn label="Align right" icon={AlignRight} active={isActive("justifyRight")} onClick={() => setAlignment("Right")} />
          <ToolBtn label="Justify" icon={AlignJustify} active={isActive("justifyFull")} onClick={() => setAlignment("Full")} />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn label="Bullet list" icon={List} active={isActive("insertUnorderedList")} onClick={() => runCommand("insertUnorderedList")} />
          <ToolBtn label="Numbered list" icon={ListOrdered} active={isActive("insertOrderedList")} onClick={() => runCommand("insertOrderedList")} />
          <ToolBtn label="Quote" icon={Quote} active={block === "blockquote"} onClick={() => setBlock("blockquote")} />
          <ToolBtn label="Code block" icon={FileCode} active={block === "pre"} onClick={() => setBlock("pre")} />
          <ToolBtn label="Decrease indent" icon={IndentDecrease} onClick={() => runCommand("outdent")} />
          <ToolBtn label="Increase indent" icon={IndentIncrease} onClick={() => runCommand("indent")} />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn
            label="Link (⌘K)"
            icon={LinkIcon}
            active={!!currentLinkElement()}
            onClick={(e) => openLinkPopover(e?.currentTarget.getBoundingClientRect())}
          />
          <ToolBtn label="Image" icon={ImageIcon} onClick={insertImage} />
          <ToolBtn label="Insert table" icon={TableIcon} onClick={insertTable} />
          <ToolBtn
            label="Table of contents"
            icon={ListTree}
            onClick={insertToc}
          />
          <ToolBtn label="Divider" icon={Minus} onClick={insertHr} />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn label="Undo (⌘Z)" icon={Undo} onClick={() => runCommand("undo")} />
          <ToolBtn label="Redo (⌘⇧Z)" icon={Redo} onClick={() => runCommand("redo")} />
          <ToolBtn label="Clear formatting" icon={Eraser} onClick={clearFormatting} />
        </ToolGroup>

        <ToolSep />

        <ToolGroup>
          <ToolBtn
            label="Copy HTML"
            icon={CopyIcon}
            onClick={async () => {
              const el = editorRef.current;
              if (!el) return;
              try {
                await navigator.clipboard.writeText(el.innerHTML);
              } catch {}
            }}
          />
          <ToolBtn
            label="Download HTML"
            icon={FileDown}
            onClick={() => {
              const el = editorRef.current;
              if (!el) return;
              const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Document — wordink</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 720px; margin: 4rem auto; padding: 0 1.5rem; line-height: 1.65; color: #111; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.2; }
  blockquote { border-left: 3px solid #999; padding: .25rem 0 .25rem 1rem; color: #555; }
  pre, code { font-family: ui-monospace, monospace; background: #f4f4f5; }
  pre { padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { padding: .1em .35em; border-radius: 3px; font-size: .9em; }
  pre code { background: transparent; padding: 0; }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid #ddd; }
</style>
</head>
<body>
${el.innerHTML}
</body>
</html>`;
              const blob = new Blob([html], { type: "text/html" });
              const url = URL.createObjectURL(blob);
              const a = document.createElement("a");
              a.href = url;
              a.download = "document.html";
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <ToolBtn
            label="Print / Save as PDF"
            icon={Printer}
            onClick={() => {
              const el = editorRef.current;
              if (!el) return;
              const w = window.open("", "_blank", "width=800,height=900");
              if (!w) return;
              w.document.write(`<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>Print — wordink</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; max-width: 720px; margin: 2rem auto; padding: 0 1.5rem; line-height: 1.65; color: #111; }
  h1, h2, h3, h4, h5, h6 { line-height: 1.2; }
  blockquote { border-left: 3px solid #999; padding: .25rem 0 .25rem 1rem; color: #555; }
  pre, code { font-family: ui-monospace, monospace; background: #f4f4f5; }
  pre { padding: 1rem; border-radius: 6px; overflow-x: auto; }
  code { padding: .1em .35em; border-radius: 3px; font-size: .9em; }
  pre code { background: transparent; padding: 0; }
  img { max-width: 100%; height: auto; }
  hr { border: 0; border-top: 1px solid #ddd; }
  @page { margin: 2cm; }
</style>
</head>
<body>${el.innerHTML}</body>
</html>`);
              w.document.close();
              w.focus();
              setTimeout(() => {
                w.print();
              }, 100);
            }}
          />
        </ToolGroup>

        <span className="ml-auto" />
        <ToolBtn
          label={isFullscreen ? "Exit fullscreen (Esc)" : "Fullscreen"}
          icon={isFullscreen ? Minimize2 : Maximize2}
          active={isFullscreen}
          onClick={toggleFullscreen}
        />
      </div>

      {/* Editable area — wrapped so the drop overlay can sit on top. */}
      <div
        className={cn(
          "relative",
          isFullscreen && "flex flex-1 flex-col overflow-hidden",
        )}
      >
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          role="textbox"
          aria-multiline="true"
          aria-placeholder={placeholder}
          spellCheck
          data-placeholder={placeholder}
          onInput={commit}
          onKeyUp={refreshActive}
          onMouseUp={refreshActive}
          onFocus={refreshActive}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleEditorClick}
          className={cn(
            "rte-content focus:outline-none",
            isFullscreen && "flex-1 overflow-y-auto",
          )}
          style={isFullscreen ? undefined : { minHeight: `${minRows * 1.6}rem` }}
        />

        {/* Drop overlay — only shown while a file is being dragged in. */}
        {editorDragOver ? (
          <div
            className="pointer-events-none absolute inset-3 z-10 flex items-center justify-center rounded-lg border-2 border-dashed border-brand bg-brand/5 text-sm font-semibold text-brand backdrop-blur-sm"
          >
            Drop image to insert
          </div>
        ) : null}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-line bg-bg/40 px-4 py-2 text-[0.6875rem] text-mute-2 font-mono">
        <span>
          <span className="font-semibold text-ink">{counts.words}</span>{" "}
          word{counts.words === 1 ? "" : "s"} ·{" "}
          <span className="font-semibold text-ink">{counts.chars}</span>{" "}
          char{counts.chars === 1 ? "" : "s"}
        </span>
        {isFullscreen ? (
          <span className="text-mute-2">Press Esc to exit fullscreen</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-brand"></span>
            Live
          </span>
        )}
      </div>

      {linkPopover.open ? (
        <LinkPopover
          rect={linkPopover.rect}
          initialUrl={linkPopover.url}
          initialNewTab={linkPopover.newTab}
          editing={!!linkPopover.editingEl}
          onApply={applyLink}
          onRemove={removeLink}
          onClose={closeLinkPopover}
        />
      ) : null}

      {colorPicker ? (
        <ColorPickerPopover
          anchor={colorPicker.anchor}
          initialColor={
            colorPicker.kind === "foreColor" ? "#f4f1fa" : "#FEF08A"
          }
          swatches={
            colorPicker.kind === "foreColor" ? TEXT_COLORS : HIGHLIGHT_COLORS
          }
          allowTransparent={colorPicker.kind === "hiliteColor"}
          onApply={(c) => setColor(colorPicker.kind, c)}
          onClose={() => setColorPicker(null)}
        />
      ) : null}
    </div>
  );
}

/* ── Toolbar primitives ─────────────────────────────────────── */

function ToolGroup({ children }: { children: ReactNode }) {
  return <div className="flex items-center gap-0.5">{children}</div>;
}

function ToolSep() {
  return <span aria-hidden className="mx-1 h-5 w-px shrink-0 bg-line" />;
}

function ToolBtn({
  label,
  icon: Icon,
  active = false,
  onClick,
}: {
  label: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  active?: boolean;
  onClick: (e?: React.MouseEvent<HTMLButtonElement>) => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      onMouseDown={(e) => {
        e.preventDefault();
        onClick(e);
      }}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md transition-colors",
        active
          ? "bg-brand/15 text-brand"
          : "text-mute hover:bg-bg hover:text-ink",
      )}
    >
      <Icon className="size-3.5" aria-hidden />
    </button>
  );
}

function Dropdown({
  label,
  icon: Icon,
  triggerText,
  open,
  onToggle,
  children,
}: {
  label: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
  triggerText?: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        data-rte-trigger
        title={label}
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onMouseDown={(e) => {
          e.preventDefault();
          onToggle(!open);
        }}
        className={cn(
          "inline-flex h-8 items-center gap-1 rounded-md px-2 transition-colors",
          open ? "bg-brand/15 text-brand" : "text-mute hover:bg-bg hover:text-ink",
        )}
      >
        {Icon ? <Icon className="size-3.5" aria-hidden /> : null}
        {triggerText ? (
          <span className="text-[0.75rem] font-semibold">{triggerText}</span>
        ) : null}
        <ChevronDown className="size-3" aria-hidden />
      </button>
      {open ? (
        <div
          data-rte-menu
          role="menu"
          className="absolute left-0 top-full z-30 mt-1 min-w-[12rem] overflow-hidden rounded-lg border border-line bg-surface py-1 shadow-lg shadow-black/30"
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

function MenuItem({
  onClick,
  children,
}: {
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => {
        e.preventDefault();
        onClick();
      }}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[0.8125rem] text-ink hover:bg-bg"
    >
      {children}
    </button>
  );
}

/* ── Catalogues ─────────────────────────────────────────────── */

const FONT_FAMILIES: { label: string; css: string }[] = [
  { label: "System default", css: "var(--font-sans, system-ui)" },
  { label: "Sans-serif", css: "system-ui, -apple-system, sans-serif" },
  { label: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { label: "Monospace", css: "var(--font-mono, ui-monospace), SFMono-Regular, Menlo, monospace" },
  { label: "Inter", css: "Inter, system-ui, sans-serif" },
  { label: "Courier", css: "'Courier New', Courier, monospace" },
];

const FONT_SIZES: { label: string; css: string }[] = [
  { label: "12px", css: "12px" },
  { label: "14px", css: "14px" },
  { label: "16px", css: "16px" },
  { label: "18px", css: "18px" },
  { label: "20px", css: "20px" },
  { label: "24px", css: "24px" },
  { label: "28px", css: "28px" },
  { label: "32px", css: "32px" },
];

const TEXT_COLORS: { name: string; value: string }[] = [
  { name: "Default", value: "#f4f1fa" },
  { name: "Mute", value: "#a8a3b5" },
  { name: "Cyan", value: "#22d3ee" },
  { name: "Sky", value: "#0ea5e9" },
  { name: "Indigo", value: "#6366f1" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Pink", value: "#ec4899" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Red", value: "#ef4444" },
  { name: "Amber", value: "#f59e0b" },
  { name: "Lime", value: "#84cc16" },
  { name: "Emerald", value: "#10b981" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Black", value: "#000000" },
];

const HIGHLIGHT_COLORS: { name: string; value: string }[] = [
  { name: "Clear", value: "transparent" },
  { name: "Yellow", value: "#fef08a" },
  { name: "Amber", value: "#fde68a" },
  { name: "Lime", value: "#d9f99d" },
  { name: "Mint", value: "#bbf7d0" },
  { name: "Sky", value: "#bae6fd" },
  { name: "Lavender", value: "#ddd6fe" },
  { name: "Pink", value: "#fbcfe8" },
  { name: "Rose", value: "#fecdd3" },
  { name: "Salmon", value: "#fed7aa" },
  { name: "Sand", value: "#fde68a" },
  { name: "Slate", value: "#e2e8f0" },
  { name: "Stone", value: "#e7e5e4" },
  { name: "Coral", value: "#fecaca" },
];

/* ── Helpers ────────────────────────────────────────────────── */

function escapeText(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(s: string): string {
  return escapeText(s);
}

function normaliseUrl(raw: string): string | null {
  const s = raw.trim();
  if (!s) return null;
  if (/^(https?:\/\/|mailto:|tel:|#|\/)/i.test(s)) return s;
  if (/^[\w.-]+(\.[a-z]{2,})/i.test(s)) return `https://${s}`;
  return s;
}

/* ── LinkPopover ────────────────────────────────────────────── */

function LinkPopover({
  rect,
  initialUrl,
  initialNewTab,
  editing,
  onApply,
  onRemove,
  onClose,
}: {
  rect: { top: number; left: number } | null;
  initialUrl: string;
  initialNewTab: boolean;
  editing: boolean;
  onApply: (url: string, newTab: boolean) => void;
  onRemove: () => void;
  onClose: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [url, setUrl] = useState(initialUrl);
  const [newTab, setNewTab] = useState(initialNewTab);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onClick(e: MouseEvent) {
      const node = popoverRef.current;
      if (!node) return;
      if (!node.contains(e.target as Node)) onClose();
    }
    window.addEventListener("keydown", onKey);
    const t = setTimeout(() => window.addEventListener("mousedown", onClick), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onClick);
      clearTimeout(t);
    };
  }, [onClose]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    onApply(url, newTab);
  }

  const style: React.CSSProperties = rect
    ? { top: rect.top, left: rect.left }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label={editing ? "Edit link" : "Insert link"}
      className="fixed z-50 w-[20rem] rounded-xl border border-line bg-surface p-2.5 shadow-xl shadow-black/40"
      style={style}
    >
      <form onSubmit={submit} className="flex flex-col gap-2">
        <div className="flex items-center gap-2 rounded-lg border border-line bg-bg/40 px-2.5 py-1.5">
          <LinkIcon className="size-3.5 shrink-0 text-mute-2" aria-hidden />
          <input
            ref={inputRef}
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https:// or paste a URL"
            spellCheck={false}
            autoComplete="off"
            className="w-full bg-transparent text-[0.8125rem] text-ink placeholder:text-mute-2 focus:outline-none"
          />
          {url ? (
            <button
              type="button"
              onClick={() => setUrl("")}
              aria-label="Clear URL"
              className="text-mute-2 hover:text-ink"
            >
              <X className="size-3" aria-hidden />
            </button>
          ) : null}
        </div>

        <label className="flex cursor-pointer items-center gap-2 px-1 text-[0.75rem] text-mute">
          <input
            type="checkbox"
            checked={newTab}
            onChange={(e) => setNewTab(e.target.checked)}
            className="size-3.5 rounded border-line text-brand focus:ring-brand/30"
          />
          <ExternalLink className="size-3 text-mute-2" aria-hidden />
          Open in a new tab
        </label>

        <div className="flex items-center gap-1.5 pt-0.5">
          <button
            type="submit"
            className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-[0.75rem] font-semibold text-bg shadow-sm shadow-brand/25 hover:bg-brand-deep hover:text-ink"
          >
            <Check className="size-3" aria-hidden strokeWidth={3} />
            {editing ? "Update" : "Insert"}
          </button>
          {editing ? (
            <button
              type="button"
              onClick={onRemove}
              aria-label="Remove link"
              title="Remove link"
              className="inline-flex size-7 items-center justify-center rounded-md text-mute hover:bg-rose-500/10 hover:text-rose-400"
            >
              <Trash2 className="size-3.5" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            aria-label="Cancel"
            className="inline-flex size-7 items-center justify-center rounded-md text-mute hover:bg-bg hover:text-ink"
          >
            <X className="size-3.5" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}
