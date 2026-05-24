import { Check, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

/**
 * Photoshop-style color picker popover.
 *
 *  - 2D saturation/value square (drag to pick within current hue)
 *  - Vertical hue slider (drag to pick hue)
 *  - Live current → new preview chip
 *  - Hex input (#RRGGBB)
 *  - R / G / B numeric inputs
 *  - Preset swatch row
 *  - Cancel + Apply buttons
 *
 * Apply-on-click design: dragging only updates the local preview.
 * Click Apply (or a swatch) to commit — this avoids fighting the
 * saved selection on every drag tick.
 */
export function ColorPickerPopover({
  anchor,
  initialColor,
  swatches,
  allowTransparent = false,
  onApply,
  onClose,
}: {
  anchor: { top: number; left: number };
  initialColor: string;
  swatches: { name: string; value: string }[];
  allowTransparent?: boolean;
  onApply: (color: string) => void;
  onClose: () => void;
}) {
  const popoverRef = useRef<HTMLDivElement>(null);
  const svRef = useRef<HTMLDivElement>(null);
  const hueRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<"sv" | "hue" | null>(null);

  const initialHsv = useMemo(() => hexToHsv(initialColor), [initialColor]);
  const [h, setH] = useState(initialHsv.h);
  const [s, setS] = useState(initialHsv.s);
  const [v, setV] = useState(initialHsv.v);

  const hex = useMemo(() => rgbToHex(hsvToRgb(h, s, v)), [h, s, v]);
  const [r, g, b] = useMemo(() => {
    const c = hsvToRgb(h, s, v);
    return [c.r, c.g, c.b];
  }, [h, s, v]);

  const updateFromSV = useCallback((clientX: number, clientY: number) => {
    const el = svRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = clamp01((clientX - rect.left) / rect.width);
    const y = clamp01((clientY - rect.top) / rect.height);
    setS(x);
    setV(1 - y);
  }, []);

  const updateFromHue = useCallback((clientY: number) => {
    const el = hueRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = clamp01((clientY - rect.top) / rect.height);
    setH(y * 360);
  }, []);

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: PointerEvent) {
      if (dragging === "sv") updateFromSV(e.clientX, e.clientY);
      else if (dragging === "hue") updateFromHue(e.clientY);
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [dragging, updateFromSV, updateFromHue]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    function onMouseDown(e: MouseEvent) {
      const t = e.target as Node;
      if (popoverRef.current && !popoverRef.current.contains(t)) onClose();
    }
    window.addEventListener("keydown", onKey);
    const id = setTimeout(() => window.addEventListener("mousedown", onMouseDown), 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onMouseDown);
      clearTimeout(id);
    };
  }, [onClose]);

  function setFromHex(input: string) {
    let v = input.trim();
    if (!v) return;
    if (!v.startsWith("#")) v = `#${v}`;
    if (!/^#[0-9a-f]{6}$/i.test(v)) return;
    const hsv = hexToHsv(v);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }

  function setFromRgb(rNew: number, gNew: number, bNew: number) {
    const c = { r: clampByte(rNew), g: clampByte(gNew), b: clampByte(bNew) };
    const hsv = rgbToHsv(c);
    setH(hsv.h);
    setS(hsv.s);
    setV(hsv.v);
  }

  return (
    <div
      ref={popoverRef}
      role="dialog"
      aria-label="Color picker"
      className="fixed z-[60] w-[18rem] rounded-xl border border-line bg-surface p-3 shadow-2xl shadow-black/40"
      style={{ top: anchor.top, left: anchor.left }}
    >
      <div className="flex gap-2">
        <div
          ref={svRef}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setDragging("sv");
            updateFromSV(e.clientX, e.clientY);
          }}
          className="relative h-36 w-[14.5rem] cursor-crosshair touch-none overflow-hidden rounded-md"
          style={{
            background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, hsl(${h} 100% 50%))`,
          }}
          aria-label="Saturation and brightness"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute size-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
            style={{ left: `${s * 100}%`, top: `${(1 - v) * 100}%` }}
          />
        </div>

        <div
          ref={hueRef}
          onPointerDown={(e) => {
            e.preventDefault();
            (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
            setDragging("hue");
            updateFromHue(e.clientY);
          }}
          className="relative h-36 w-3 cursor-pointer touch-none rounded-md"
          style={{
            background:
              "linear-gradient(to bottom, #f00 0%, #ff0 16.66%, #0f0 33.33%, #0ff 50%, #00f 66.66%, #f0f 83.33%, #f00 100%)",
          }}
          aria-label="Hue"
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -left-1 h-1.5 w-5 -translate-y-1/2 rounded-sm border-2 border-white shadow"
            style={{ top: `${(h / 360) * 100}%` }}
          />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <div className="flex h-8 w-16 overflow-hidden rounded-md ring-1 ring-line">
          <div
            className="flex-1"
            title="Current"
            style={{ background: initialColor || "transparent" }}
          />
          <div className="flex-1" title="New" style={{ background: hex }} />
        </div>
        <label className="flex flex-1 items-center gap-1 rounded-md border border-line bg-bg/40 px-2 py-1">
          <span className="text-[0.6875rem] font-mono text-mute-2">#</span>
          <input
            type="text"
            value={hex.replace(/^#/, "")}
            onChange={(e) => setFromHex(e.target.value)}
            spellCheck={false}
            maxLength={6}
            className="w-full bg-transparent font-mono text-[0.75rem] uppercase text-ink focus:outline-none"
          />
        </label>
      </div>

      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <NumberField label="R" value={r} max={255} onChange={(v) => setFromRgb(v, g, b)} />
        <NumberField label="G" value={g} max={255} onChange={(v) => setFromRgb(r, v, b)} />
        <NumberField label="B" value={b} max={255} onChange={(v) => setFromRgb(r, g, v)} />
      </div>

      {swatches.length > 0 ? (
        <div className="mt-3 border-t border-line/70 pt-2.5">
          <div className="mb-1.5 text-[0.625rem] font-bold uppercase tracking-[0.08em] text-mute-2">
            Presets
          </div>
          <div className="grid grid-cols-9 gap-1">
            {allowTransparent ? (
              <button
                type="button"
                title="No fill"
                aria-label="No fill"
                onClick={() => {
                  onApply("transparent");
                  onClose();
                }}
                className="relative size-5 overflow-hidden rounded-sm border border-line"
                style={{
                  backgroundImage:
                    "linear-gradient(45deg, #ccc 25%, transparent 25%), linear-gradient(-45deg, #ccc 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #ccc 75%), linear-gradient(-45deg, transparent 75%, #ccc 75%)",
                  backgroundSize: "6px 6px",
                  backgroundPosition: "0 0, 0 3px, 3px -3px, -3px 0",
                }}
              />
            ) : null}
            {swatches.map((c) => (
              <button
                key={c.value}
                type="button"
                title={c.name}
                aria-label={c.name}
                onClick={() => {
                  onApply(c.value);
                  onClose();
                }}
                className="size-5 rounded-sm border border-line/60 transition-transform hover:scale-110"
                style={{ background: c.value }}
              />
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-3 flex items-center justify-end gap-1.5 border-t border-line/70 pt-2.5">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-[0.75rem] font-semibold text-mute hover:bg-bg hover:text-ink"
        >
          <X className="size-3" aria-hidden />
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onApply(hex);
            onClose();
          }}
          className="inline-flex items-center gap-1 rounded-md bg-brand px-3 py-1 text-[0.75rem] font-semibold text-bg shadow-sm shadow-brand/25 hover:bg-brand-deep hover:text-ink"
        >
          <Check className="size-3" aria-hidden strokeWidth={3} />
          Apply
        </button>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex items-center gap-1 rounded-md border border-line bg-bg/40 px-2 py-1">
      <span className="text-[0.625rem] font-bold uppercase tracking-[0.08em] text-mute-2">
        {label}
      </span>
      <input
        type="number"
        min={0}
        max={max}
        value={value}
        onChange={(e) => {
          const n = Number(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        className="w-full bg-transparent text-right font-mono text-[0.75rem] text-ink focus:outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:hidden [&::-webkit-outer-spin-button]:hidden"
      />
    </label>
  );
}

/* ── Color math ─────────────────────────────────────────────── */

function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}
function clampByte(n: number): number {
  return Math.min(255, Math.max(0, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.trim().replace(/^#/, "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (!/^[0-9a-f]{6}$/i.test(h)) return { r: 0, g: 0, b: 0 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }): string {
  const toHex = (n: number) =>
    clampByte(n).toString(16).padStart(2, "0").toUpperCase();
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function rgbToHsv({
  r,
  g,
  b,
}: {
  r: number;
  g: number;
  b: number;
}): { h: number; s: number; v: number } {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === rn) h = ((gn - bn) / d) % 6;
    else if (max === gn) h = (bn - rn) / d + 2;
    else h = (rn - gn) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

function hsvToRgb(
  h: number,
  s: number,
  v: number,
): { r: number; g: number; b: number } {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let rp = 0;
  let gp = 0;
  let bp = 0;
  if (h < 60) [rp, gp, bp] = [c, x, 0];
  else if (h < 120) [rp, gp, bp] = [x, c, 0];
  else if (h < 180) [rp, gp, bp] = [0, c, x];
  else if (h < 240) [rp, gp, bp] = [0, x, c];
  else if (h < 300) [rp, gp, bp] = [x, 0, c];
  else [rp, gp, bp] = [c, 0, x];
  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
  };
}

function hexToHsv(hex: string): { h: number; s: number; v: number } {
  return rgbToHsv(hexToRgb(hex));
}
