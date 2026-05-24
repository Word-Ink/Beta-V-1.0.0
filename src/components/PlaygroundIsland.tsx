import { useEffect, useMemo, useState } from "react";
import { Copy, RotateCcw, Sparkles } from "lucide-react";
import { RichTextEditor } from "./editor/rich-text-editor";
import { cn } from "./editor/utils";

const PRESETS = {
  blog: {
    label: "Blog post",
    minRows: 14,
    content: `<h2>The case for owning your editor</h2>
<p>Most rich-text editors are <strong>libraries you depend on</strong>. wordink is a <em>folder you own</em>. The difference matters more than it sounds.</p>
<h3>What changes</h3>
<ul>
  <li>Paste handling is yours. Tweak it for your domain.</li>
  <li>Toolbar layout is yours. Shadcn, Radix, your own.</li>
  <li>The dependency tree is just <em>react</em>.</li>
</ul>
<blockquote>The best abstraction is the one you can delete.</blockquote>`,
  },
  email: {
    label: "Email",
    minRows: 7,
    content: `<p>Hey team,</p>
<p>The first build of <strong>wordink</strong> is live. Grab it with <code>npx wordink add editor</code>.</p>
<p>Take a look at the <a href="https://wordink.dev/docs" target="_blank" rel="noopener noreferrer">docs</a> when you have a sec.</p>
<p>— RG</p>`,
  },
  comment: {
    label: "Comment",
    minRows: 3,
    content: `<p>Yeah, you can configure allowed protocols in the link plugin's options. Default is <code>http</code> and <code>https</code> only.</p>`,
  },
  docs: {
    label: "Documentation",
    minRows: 12,
    content: `<h2>Configuring the link plugin</h2>
<p>The link plugin accepts a small set of options. The most useful one is <code>protocols</code>.</p>
<h3>Default behaviour</h3>
<p>By default, only <code>http</code> and <code>https</code> URLs are accepted. Other protocols are rejected silently.</p>
<pre>const link = defineCommand({
  name: "link",
  options: { protocols: ["http", "https", "mailto"] },
});</pre>`,
  },
} as const;

type PresetKey = keyof typeof PRESETS;

const ACCENTS = [
  { name: "Cyan", value: "#22d3ee", deep: "#0891b2", soft: "#67e8f9" },
  { name: "Green", value: "#34d399", deep: "#059669", soft: "#6ee7b7" },
  { name: "Purple", value: "#a78bfa", deep: "#7c3aed", soft: "#c4b5fd" },
  { name: "Amber", value: "#f59e0b", deep: "#d97706", soft: "#fcd34d" },
];

const FONTS = [
  { name: "Geist Sans", css: `"Geist Variable", "Geist", system-ui, sans-serif` },
  { name: "System", css: "system-ui, -apple-system, sans-serif" },
  { name: "Serif", css: "Georgia, 'Times New Roman', serif" },
  { name: "Geist Mono", css: `"Geist Mono Variable", "Geist Mono", ui-monospace, monospace` },
];

const PLUGINS = [
  { name: "Link", shipped: true },
  { name: "Image", shipped: true },
  { name: "Color", shipped: true },
  { name: "Tables", shipped: false },
  { name: "Slash menu", shipped: false },
  { name: "Mentions", shipped: false },
];

export function PlaygroundIsland() {
  const [preset, setPreset] = useState<PresetKey>("blog");
  const [accentIdx, setAccentIdx] = useState(0);
  const [fontIdx, setFontIdx] = useState(0);
  const [plugins, setPlugins] = useState<string[]>(["Link", "Image", "Color"]);
  const [html, setHtml] = useState(PRESETS.blog.content);
  const [outputTab, setOutputTab] = useState<"html" | "json">("html");
  const [copied, setCopied] = useState(false);

  const accent = ACCENTS[accentIdx];
  const font = FONTS[fontIdx];

  // Live word + character count
  const counts = useMemo(() => {
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    const words = text ? text.split(" ").length : 0;
    return { words, chars: text.length, bytes: new Blob([html]).size };
  }, [html]);

  function loadPreset(key: PresetKey) {
    setPreset(key);
    setHtml(PRESETS[key].content);
  }

  function reset() {
    setHtml(PRESETS[preset].content);
  }

  async function copyOutput() {
    try {
      await navigator.clipboard.writeText(
        outputTab === "html" ? html : JSON.stringify({ html }, null, 2),
      );
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  function togglePlugin(name: string, shipped: boolean) {
    if (!shipped) return;
    setPlugins((cur) =>
      cur.includes(name) ? cur.filter((p) => p !== name) : [...cur, name],
    );
  }

  // Apply accent + font as CSS variables on the wrapper
  const wrapperStyle = {
    "--color-brand": accent.value,
    "--color-brand-deep": accent.deep,
    "--color-brand-soft": accent.soft,
    "--font-sans": font.css,
  } as React.CSSProperties;

  return (
    <div
      style={wrapperStyle}
      className="grid lg:grid-cols-[240px_minmax(0,1fr)_320px] border border-line rounded-xl overflow-hidden bg-bg min-h-[640px]"
    >
      {/* Left: Controls */}
      <aside className="bg-surface/30 p-5 border-r border-line">
        <Section label="Preset">
          <div className="space-y-1">
            {(Object.keys(PRESETS) as PresetKey[]).map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => loadPreset(key)}
                className={cn(
                  "w-full text-sm px-3 py-1.5 rounded text-left border",
                  preset === key
                    ? "text-brand bg-brand/10 border-brand/30 font-medium"
                    : "text-mute hover:text-ink hover:bg-surface/50 border-transparent",
                )}
              >
                {PRESETS[key].label}
              </button>
            ))}
          </div>
        </Section>

        <Section label="Plugins">
          <div className="space-y-2">
            {PLUGINS.map(({ name, shipped }) => {
              const on = plugins.includes(name);
              return (
                <label
                  key={name}
                  className={cn(
                    "flex items-center justify-between text-sm cursor-pointer",
                    !shipped && "opacity-60 cursor-not-allowed",
                  )}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={on && shipped ? "text-ink" : "text-mute"}>
                      {name}
                    </span>
                    {!shipped && (
                      <span className="font-mono text-[9px] uppercase tracking-wider px-1 py-px rounded bg-surface-2 border border-line text-mute-2">
                        Soon
                      </span>
                    )}
                  </span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={on && shipped}
                    disabled={!shipped}
                    onClick={() => togglePlugin(name, shipped)}
                    className={cn(
                      "w-7 h-4 rounded-full transition-colors flex items-center px-0.5 flex-shrink-0",
                      on && shipped ? "bg-brand" : "bg-line",
                    )}
                  >
                    <span
                      className={cn(
                        "w-3 h-3 rounded-full bg-bg transition-transform",
                        on && shipped ? "translate-x-3" : "translate-x-0",
                      )}
                    />
                  </button>
                </label>
              );
            })}
          </div>
        </Section>

        <Section label="Accent">
          <div className="grid grid-cols-4 gap-2">
            {ACCENTS.map((a, i) => (
              <button
                key={a.name}
                type="button"
                onClick={() => setAccentIdx(i)}
                title={a.name}
                aria-label={a.name}
                className={cn(
                  "aspect-square rounded-md transition-all relative",
                  i === accentIdx
                    ? "ring-2 ring-ink ring-offset-2 ring-offset-surface"
                    : "hover:scale-105",
                )}
                style={{ background: a.value }}
              />
            ))}
          </div>
        </Section>

        <Section label="Font">
          <div className="space-y-1">
            {FONTS.map((f, i) => (
              <button
                key={f.name}
                type="button"
                onClick={() => setFontIdx(i)}
                className={cn(
                  "w-full text-sm px-3 py-1.5 rounded text-left border",
                  i === fontIdx
                    ? "text-brand bg-brand/10 border-brand/30 font-medium"
                    : "text-mute hover:text-ink hover:bg-surface/50 border-transparent",
                )}
                style={{ fontFamily: f.css }}
              >
                {f.name}
              </button>
            ))}
          </div>
        </Section>

        <button
          type="button"
          onClick={reset}
          className="w-full mt-2 inline-flex items-center justify-center gap-2 text-xs text-mute hover:text-ink border border-line rounded-md px-3 py-2 hover:bg-surface/50 transition-colors"
        >
          <RotateCcw className="size-3" />
          Reset preset
        </button>
      </aside>

      {/* Center: Editor */}
      <main className="bg-bg flex flex-col min-w-0" style={{ fontFamily: font.css }}>
        <RichTextEditor
          value={html}
          onChange={setHtml}
          minRows={PRESETS[preset].minRows}
          placeholder="Start typing…"
          className="rounded-none border-0 border-r-0 border-l-0 flex-1"
        />
      </main>

      {/* Right: Output */}
      <aside className="bg-surface/20 border-l border-line flex flex-col min-w-0">
        <div className="flex items-center border-b border-line">
          <button
            type="button"
            onClick={() => setOutputTab("html")}
            className={cn(
              "px-4 py-2.5 text-xs font-mono uppercase tracking-wider relative",
              outputTab === "html"
                ? "text-ink bg-bg border-r border-line"
                : "text-mute-2 hover:text-mute border-r border-line",
            )}
          >
            HTML
            {outputTab === "html" && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
            )}
          </button>
          <button
            type="button"
            onClick={() => setOutputTab("json")}
            className={cn(
              "px-4 py-2.5 text-xs font-mono uppercase tracking-wider relative",
              outputTab === "json"
                ? "text-ink bg-bg border-r border-line"
                : "text-mute-2 hover:text-mute",
            )}
          >
            JSON
            {outputTab === "json" && (
              <span className="absolute inset-x-0 top-0 h-0.5 bg-brand" />
            )}
          </button>
          <button
            type="button"
            onClick={copyOutput}
            className="ml-auto mr-3 text-xs font-mono text-mute-2 hover:text-ink transition-colors inline-flex items-center gap-1.5"
            aria-label="Copy"
          >
            <Copy className="size-3" />
            {copied ? "Copied" : "Copy"}
          </button>
        </div>
        <div className="flex-1 p-4 overflow-auto max-h-[640px]">
          <pre className="text-[11px] font-mono leading-relaxed text-mute whitespace-pre-wrap break-words m-0">
            {outputTab === "html"
              ? prettyHtml(html)
              : JSON.stringify({ html, words: counts.words, chars: counts.chars }, null, 2)}
          </pre>
        </div>
        <div className="px-4 py-2 border-t border-line text-[10px] font-mono text-mute-2 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Sparkles className="size-3 text-brand" />
            Live
          </span>
          <span>
            {counts.words} words · {counts.bytes} bytes
          </span>
        </div>
      </aside>
    </div>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-6 last:mb-0">
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-mute-2 mb-3">
        {label}
      </p>
      {children}
    </div>
  );
}

/**
 * Best-effort HTML prettifier — adds newlines between major block tags so the
 * output panel is readable. Not a full formatter (no nested indenting), but
 * good enough for a live preview.
 */
function prettyHtml(html: string): string {
  return html
    .replace(/></g, ">\n<")
    .replace(/(<\/(?:h\d|p|ul|ol|li|blockquote|pre|div)>)/g, "$1");
}
