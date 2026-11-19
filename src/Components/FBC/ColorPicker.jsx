import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

// The colour picker shared by every panel that offers colours — the shape
// Stroke and Background rows and the arrow Stroke row. The handful of preset
// swatches stay where they are in each panel; this is the "any other colour"
// button beside them.
//
// Laid out the way the reference tool does it: a grid of colour families, a
// row of shades for whichever family is in use, and a hex box. That shape is
// worth copying because it answers the two questions people actually have —
// "which colour" and then "how light" — without making anyone aim at a
// gradient.
//
// Two things it deliberately does NOT do:
//
//   * It doesn't use <input type="color">, which hands the job to the
//     operating system's dialog — a different look, and no keyboard support.
//   * It doesn't report a colour until one is actually chosen. Every change
//     sent up goes straight into the undo history (see handleArrowStyleChange
//     and handleUpdateNode), so one click here is one undo step.

// ---------------------------------------------------------------------------
// Palette. Five shades per family, ordered light to dark, with `base` being
// the one the grid shows and a click selects.
// ---------------------------------------------------------------------------

const FAMILIES = [
  { name: 'Ink', base: '#1e1e1e', shades: ['#495057', '#343a40', '#212529', '#1e1e1e', '#000000'] },
  { name: 'Gray', base: '#adb5bd', shades: ['#f8f9fa', '#dee2e6', '#adb5bd', '#868e96', '#495057'] },
  { name: 'Red', base: '#e03131', shades: ['#ffe3e3', '#ffa8a8', '#ff6b6b', '#e03131', '#c92a2a'] },
  { name: 'Pink', base: '#e64980', shades: ['#ffdeeb', '#faa2c1', '#f06595', '#e64980', '#a61e4d'] },
  { name: 'Grape', base: '#be4bdb', shades: ['#f3d9fa', '#e599f7', '#cc5de8', '#be4bdb', '#862e9c'] },
  { name: 'Violet', base: '#7048e8', shades: ['#e5dbff', '#b197fc', '#845ef7', '#7048e8', '#5f3dc4'] },
  { name: 'Indigo', base: '#4263eb', shades: ['#dbe4ff', '#91a7ff', '#5c7cfa', '#4263eb', '#364fc7'] },
  { name: 'Blue', base: '#1971c2', shades: ['#d0ebff', '#74c0fc', '#339af0', '#1971c2', '#1864ab'] },
  { name: 'Cyan', base: '#1098ad', shades: ['#c5f6fa', '#66d9e8', '#22b8cf', '#1098ad', '#0b7285'] },
  { name: 'Teal', base: '#0ca678', shades: ['#c3fae8', '#63e6be', '#20c997', '#0ca678', '#087f5b'] },
  { name: 'Green', base: '#2f9e44', shades: ['#d3f9d8', '#8ce99a', '#51cf66', '#2f9e44', '#2b8a3e'] },
  { name: 'Lime', base: '#74b816', shades: ['#e9fac8', '#c0eb75', '#94d82d', '#74b816', '#5c940d'] },
  { name: 'Yellow', base: '#f08c00', shades: ['#fff3bf', '#ffe066', '#fcc419', '#f08c00', '#e67700'] },
  { name: 'Orange', base: '#e8590c', shades: ['#ffe8cc', '#ffc078', '#ff922b', '#e8590c', '#d9480f'] },
  { name: 'Brown', base: '#9c6644', shades: ['#f3e8e2', '#dbc0b4', '#bf8f78', '#9c6644', '#6f4518'] },
];

// The letters printed in the corner of each grid cell, in grid order. They are
// live shortcuts while the picker is open, which is the whole point of showing
// them — a label nobody can press is just noise.
const GRID_KEYS = ['q', 'w', 'e', 'r', 't', 'a', 's', 'd', 'f', 'g', 'z', 'x', 'c', 'v', 'b'];

const TRANSPARENT = 'transparent';

const TRANSPARENT_SQUARES =
  'linear-gradient(45deg, #c9c9d4 25%, transparent 25%, transparent 75%, #c9c9d4 75%),'
  + 'linear-gradient(45deg, #c9c9d4 25%, transparent 25%, transparent 75%, #c9c9d4 75%)';

// Sized to hold exactly five cells per row: 5 x CELL + 4 gaps + the padding
// on both sides. Every box below sets box-sizing explicitly rather than
// trusting the host page's reset — without that the grid wraps at six in an
// app with content-box defaults and at five in an app with border-box.
const CELL = 32;
const CELL_GAP = 7;
const POPOVER_PADDING = 14;
const POPOVER_BORDER = 1;
const POPOVER_WIDTH =
  (CELL * 5) + (CELL_GAP * 4) + (POPOVER_PADDING * 2) + (POPOVER_BORDER * 2);

export function normalizeHex(input) {
  if (typeof input !== 'string') return null;

  let hex = input.trim().replace(/^#/, '');
  if (/^[0-9a-f]{3}$/i.test(hex)) hex = hex.split('').map((c) => c + c).join('');
  if (!/^[0-9a-f]{6}$/i.test(hex)) return null;

  return `#${hex.toLowerCase()}`;
}

function hexToRgb(hex) {
  const safe = normalizeHex(hex) || '#000000';
  return {
    r: parseInt(safe.slice(1, 3), 16),
    g: parseInt(safe.slice(3, 5), 16),
    b: parseInt(safe.slice(5, 7), 16),
  };
}

function isBlank(value) {
  return !value || value === TRANSPARENT || value === 'theme-auto';
}

// Which family's shades to show. Derived from the current colour rather than
// held in state: clicking a grid cell sets the colour, the colour picks the
// family, and the shades follow — one source of truth, nothing to keep in
// step. A hex typed between two families lands on the nearer one.
function familyFor(value) {
  const hex = normalizeHex(value);
  if (!hex) return FAMILIES[0];

  const exact = FAMILIES.find((family) => (
    family.base === hex || family.shades.includes(hex)
  ));
  if (exact) return exact;

  const { r, g, b } = hexToRgb(hex);
  let best = FAMILIES[0];
  let bestDistance = Infinity;

  FAMILIES.forEach((family) => {
    family.shades.forEach((shade) => {
      const c = hexToRgb(shade);
      const distance = (c.r - r) ** 2 + (c.g - g) ** 2 + (c.b - b) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = family;
      }
    });
  });

  return best;
}

function isLightColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  return (r * 299 + g * 587 + b * 114) / 1000 > 165;
}

export default function ColorPicker({
  value,
  onChange,
  theme,
  title = 'More colours',
  allowTransparent = false,
  size = 28,
}) {
  const isDark = theme === 'dark';

  const [open, setOpen] = useState(false);
  const [hexText, setHexText] = useState('');
  const [hexFocused, setHexFocused] = useState(false);
  const [position, setPosition] = useState({ top: -9999, left: -9999 });

  const triggerRef = useRef(null);
  const popoverRef = useRef(null);
  const hexRef = useRef(null);

  const colors = {
    bg: isDark ? '#2b2840' : '#ffffff',
    border: isDark ? '#413d5c' : '#e4e4ef',
    ink: isDark ? '#f1f1f5' : '#1f1f1f',
    label: isDark ? '#b8b5cc' : '#6b6880',
    fieldBg: isDark ? '#232136' : '#f7f7fb',
    cellBg: isDark ? '#232136' : '#f1f0f7',
    accent: '#696eff',
  };

  const blank = isBlank(value);
  const currentHex = normalizeHex(value) || '#1e1e1e';
  const family = familyFor(currentHex);

  // Backgrounds trade the last family for a "no fill" cell, so the grid stays
  // an even five by three. Brown is the one least missed, and the hex box
  // still reaches it.
  const gridCells = allowTransparent
    ? [{ transparent: true }, ...FAMILIES.slice(0, 14)]
    : FAMILIES;

  const emit = useCallback((color) => {
    if (color === TRANSPARENT) {
      onChange(TRANSPARENT);
      return;
    }
    const safe = normalizeHex(color);
    if (safe) onChange(safe);
  }, [onChange]);

  // Close on a press outside, and handle every key the picker claims while it
  // is open. The letters matter here: e, v and c are tool shortcuts in the
  // editor and Escape clears the selection, so each one this picker uses has
  // to be stopped before it reaches those window handlers.
  useEffect(() => {
    if (!open) return undefined;

    const onDocDown = (event) => {
      if (popoverRef.current?.contains(event.target)) return;
      if (triggerRef.current?.contains(event.target)) return;
      setOpen(false);
    };

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        return;
      }

      // Typing in the hex box is typing, not shortcuts.
      if (event.target === hexRef.current) return;
      if (event.ctrlKey || event.metaKey || event.altKey) return;

      // Shift+1..5 picks a shade of the family in use. Read from `code`
      // because Shift+1 arrives as "!" on most layouts.
      const shadeMatch = /^Digit([1-5])$/.exec(event.code || '');
      if (event.shiftKey && shadeMatch) {
        event.preventDefault();
        event.stopPropagation();
        emit(family.shades[Number(shadeMatch[1]) - 1]);
        return;
      }

      if (event.shiftKey) return;

      const index = GRID_KEYS.indexOf(event.key.toLowerCase());
      if (index === -1 || index >= gridCells.length) return;

      event.preventDefault();
      event.stopPropagation();
      const cell = gridCells[index];
      emit(cell.transparent ? TRANSPARENT : cell.base);
    };

    document.addEventListener('mousedown', onDocDown, true);
    document.addEventListener('keydown', onKeyDown, true);
    return () => {
      document.removeEventListener('mousedown', onDocDown, true);
      document.removeEventListener('keydown', onKeyDown, true);
    };
  }, [open, emit, family, gridCells]);

  // The panels scroll and the canvas sits inside a scaled, transformed
  // element, so the popover is rendered into the body and positioned against
  // the trigger's box on screen. Anywhere else it would be clipped by the
  // panel edge or thrown off-target by the canvas zoom.
  useLayoutEffect(() => {
    if (!open) return;

    const trigger = triggerRef.current;
    const popover = popoverRef.current;
    if (!trigger || !popover) return;

    const rect = trigger.getBoundingClientRect();
    const height = popover.offsetHeight;
    const margin = 8;

    // Opens beside the panel it belongs to, not beside the button. The button
    // sits a long way inside a narrow panel — anchored to the button, the
    // popover lands on top of the rows underneath it, hiding the Background
    // swatches while you are choosing a colour. The panel is the trigger's
    // positioned ancestor, so it can be found without being passed in; the
    // width test is there so a trigger loose on the page falls back to its own
    // edge rather than being thrown to the far side of the window.
    const parent = trigger.offsetParent;
    const parentRect = parent && parent !== document.body
      ? parent.getBoundingClientRect()
      : null;
    const anchor = parentRect && parentRect.width <= 420 ? parentRect : rect;

    let left = anchor.right + margin;
    if (left + POPOVER_WIDTH > window.innerWidth - margin) {
      left = Math.max(margin, anchor.left - POPOVER_WIDTH - margin);
    }

    let top = rect.top;
    if (top + height > window.innerHeight - margin) {
      top = Math.max(margin, window.innerHeight - height - margin);
    }

    setPosition({ top, left });
  }, [open]);

  const commitHexText = useCallback(() => {
    setHexFocused(false);
    const safe = normalizeHex(hexText);
    if (safe) emit(safe);
  }, [hexText, emit]);

  const pickFromScreen = useCallback(async () => {
    if (typeof window === 'undefined' || !('EyeDropper' in window)) return;
    try {
      // eslint-disable-next-line new-cap
      const result = await new window.EyeDropper().open();
      emit(result.sRGBHex);
    } catch {
      // Dismissed — nothing to do.
    }
  }, [emit]);

  const canEyedrop = typeof window !== 'undefined' && 'EyeDropper' in window;

  const cellStyle = (color, active, transparent) => ({
    position: 'relative',
    boxSizing: 'border-box',
    width: CELL,
    height: CELL,
    padding: 0,
    borderRadius: 7,
    cursor: 'pointer',
    backgroundColor: transparent ? 'transparent' : color,
    backgroundImage: transparent ? TRANSPARENT_SQUARES : 'none',
    backgroundSize: '10px 10px',
    backgroundPosition: '0 0, 5px 5px',
    border: active
      ? `2px solid ${colors.accent}`
      : `1px solid ${isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.12)'}`,
    outline: active ? `2px solid ${colors.bg}` : 'none',
    outlineOffset: -4,
  });

  const keyHintStyle = (color, transparent) => ({
    position: 'absolute',
    right: 3,
    bottom: 1,
    fontSize: 9,
    lineHeight: 1.2,
    pointerEvents: 'none',
    color: transparent || isLightColor(color) ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.6)',
  });

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        title={title}
        onClick={() => setOpen((prev) => !prev)}
        style={{
          width: size,
          height: size,
          boxSizing: 'border-box',
          padding: 0,
          borderRadius: 7,
          position: 'relative',
          cursor: 'pointer',
          // The ring of hues is what tells this button apart from the preset
          // swatches beside it. Without it people read it as one more preset
          // and never find out there is a picker here at all.
          background: 'conic-gradient(#ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)',
          border: `1px solid ${isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.18)'}`,
          outline: open ? `2px solid ${colors.accent}` : 'none',
          outlineOffset: 1,
          display: 'block',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 4,
            borderRadius: 4,
            // Longhand on purpose: swapping between a colour and the
            // chequerboard changes one of these on re-render, and React warns
            // when a shorthand and its longhands are mixed on one element.
            backgroundColor: blank ? 'transparent' : currentHex,
            backgroundImage: blank ? TRANSPARENT_SQUARES : 'none',
            backgroundSize: '8px 8px',
            backgroundPosition: '0 0, 4px 4px',
            boxShadow: `0 0 0 1px ${isDark ? 'rgba(0,0,0,0.45)' : 'rgba(255,255,255,0.9)'}`,
          }}
        />
      </button>

      {open && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            zIndex: 4000,
            boxSizing: 'border-box',
            width: POPOVER_WIDTH,
            padding: POPOVER_PADDING,
            borderRadius: 12,
            background: colors.bg,
            border: `1px solid ${colors.border}`,
            boxShadow: '0 16px 40px rgba(0,0,0,0.28)',
            color: colors.ink,
            fontSize: 12,
            userSelect: 'none',
          }}
          onMouseDown={(event) => event.stopPropagation()}
          onClick={(event) => event.stopPropagation()}
          onDoubleClick={(event) => event.stopPropagation()}
        >
          <div style={{ color: colors.label, fontWeight: 500, marginBottom: 8 }}>Colors</div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: CELL_GAP }}>
            {gridCells.map((cell, index) => {
              const transparent = Boolean(cell.transparent);
              const color = transparent ? TRANSPARENT : cell.base;
              const active = transparent ? blank : (!blank && family.name === cell.name);

              return (
                <button
                  key={transparent ? 'transparent' : cell.name}
                  type="button"
                  title={transparent ? 'No fill' : cell.name}
                  onClick={() => emit(color)}
                  style={cellStyle(color, active, transparent)}
                >
                  <span style={keyHintStyle(color, transparent)}>{GRID_KEYS[index]}</span>
                </button>
              );
            })}
          </div>

          <div style={{ color: colors.label, fontWeight: 500, margin: '14px 0 8px' }}>Shades</div>

          <div style={{ display: 'flex', gap: CELL_GAP }}>
            {family.shades.map((shade, index) => (
              <button
                key={shade}
                type="button"
                title={shade}
                onClick={() => emit(shade)}
                style={cellStyle(shade, !blank && currentHex === shade, false)}
              >
                <span style={keyHintStyle(shade, false)}>{`⇧${index + 1}`}</span>
              </button>
            ))}
          </div>

          <div style={{ color: colors.label, fontWeight: 500, margin: '14px 0 8px' }}>Hex code</div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div
              style={{
                flex: 1,
                minWidth: 0,
                display: 'flex',
                alignItems: 'center',
                height: 30,
                padding: '0 8px',
                borderRadius: 7,
                border: `1px solid ${colors.border}`,
                background: colors.fieldBg,
              }}
            >
              <span style={{ color: colors.label, marginRight: 6 }}>#</span>
              <input
                ref={hexRef}
                type="text"
                spellCheck={false}
                value={hexFocused ? hexText : currentHex.slice(1)}
                onFocus={() => { setHexFocused(true); setHexText(currentHex.slice(1)); }}
                onChange={(event) => setHexText(event.target.value)}
                onBlur={commitHexText}
                onKeyDown={(event) => {
                  if (event.key !== 'Enter') return;
                  // Only blur — the blur handler commits. Doing it here too
                  // would send the same colour twice and leave a duplicate
                  // step in the undo history.
                  event.preventDefault();
                  event.currentTarget.blur();
                }}
                style={{
                  flex: 1,
                  minWidth: 0,
                  border: 'none',
                  outline: 'none',
                  background: 'transparent',
                  color: colors.ink,
                  font: 'inherit',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
                  textTransform: 'lowercase',
                }}
              />
            </div>

            {canEyedrop && (
              <button
                type="button"
                title="Pick a colour from the screen"
                onClick={pickFromScreen}
                style={{
                  width: 30,
                  height: 30,
                  flex: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                  borderRadius: 7,
                  border: `1px solid ${colors.border}`,
                  background: colors.fieldBg,
                  color: colors.ink,
                  cursor: 'pointer',
                }}
              >
                <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                  <path
                    d="M10.5 2.5a1.8 1.8 0 0 1 2.5 2.5l-1 1 1 1-1.5 1.5-1-1-4 4L3 13l.5-3.5 4-4-1-1L8 3l1 1 1.5-1.5Z"
                    stroke="currentColor"
                    strokeWidth="1.2"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            )}
          </div>

          <div style={{ color: colors.label, marginTop: 12, lineHeight: 1.5 }}>
            Tip: press a letter for a colour, ⇧1–⇧5 for a shade.
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}