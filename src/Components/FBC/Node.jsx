import React, { useRef, useState, useCallback, useEffect, useLayoutEffect } from 'react';
import NodeShape from './NodeShape';
import styles from './Node.module.css';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

const SVG_SHAPES = ['diamond', 'parallelogram', 'hexagon', 'cylinder'];
// Breathing room kept between the lowest line of text and the shape's bottom
// border when the shape auto-grows to fit its text.
const TEXT_FIT_PADDING = 10;
// A text shape has no border of its own — its box IS the text, so it gets a
// hairline of breathing room instead of the roomier allowance a bordered
// shape needs. Enough that the selection outline doesn't sit on the glyphs
// and the caret at the end of a line is still visible.
// Exported because Canvas.jsx has to subtract it to recover the width of the
// text itself when it scales a text shape — see the resize branch there.
export const TEXT_SHAPE_PADDING = 6;
// The smallest a text shape's type may get. Exported for the same reason:
// Canvas has to scale the wrap width by the font change that ACTUALLY lands,
// and this is where that change stops.
export const MIN_TEXT_FONT_SIZE = 10;
// An empty text shape still needs somewhere to put the caret.
const MIN_TEXT_SHAPE_WIDTH = 24;
// Floor for the wrap ceiling, so a text shape dragged very small still has a
// line to write on rather than one letter per row.
const MIN_TEXT_WRAP_WIDTH = 48;
// Used only until Canvas has measured the viewport (first render, or if the
// prop is ever missing).
const DEFAULT_TEXT_WRAP_WIDTH = 720;
const CP_POSITIONS = [
  { left: '50%', top: '0%', pos: 'top' },
  { left: '100%', top: '50%', pos: 'right' },
  { left: '50%', top: '100%', pos: 'bottom' },
  { left: '0%', top: '50%', pos: 'left' },
];

// A "line" shape isn't drawn through NodeShape (that file only knows the
// filled/outlined polygon shapes) — it's a free-hand stroke between two
// points the user actually dragged between, drawn using the node's own
// x1/y1/x2/y2 (set when the line is created — see Canvas.jsx's drawingLine
// handling and flowbuilder2.js's handleCanvasCreateLine). Older line nodes
// that predate endpoints (e.g. dropped in from the toolbar rather than
// drawn) fall back to a plain corner-to-corner diagonal of the box. Keeping
// this local here means no changes are needed to NodeShape.jsx or
// Node.module.css to support it.
function LineShape({ node, strokeColor }) {
  const w = Math.max(node.w, 1);
  const h = Math.max(node.h, 1);

  const hasEndpoints =
    typeof node.x1 === 'number' &&
    typeof node.y1 === 'number' &&
    typeof node.x2 === 'number' &&
    typeof node.y2 === 'number';

  // Endpoints are stored in absolute canvas coordinates; make them local to
  // this node's own box (whose top-left is node.x/node.y) to draw them.
  const x1 = hasEndpoints ? node.x1 - node.x : 0;
  const y1 = hasEndpoints ? node.y1 - node.y : 0;
  const x2 = hasEndpoints ? node.x2 - node.x : w;
  const y2 = hasEndpoints ? node.y2 - node.y : h;

  return (
    <svg
      className={styles.lineShape}
      width={w}
      height={h}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        overflow: 'visible',
        pointerEvents: 'none',
      }}
    >
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={strokeColor}
        strokeWidth={3}
        strokeLinecap="round"
      />
    </svg>
  );
}

// A shape holds a LIST of independently placed text blocks (node.texts), not
// a single label — that's what lets someone drop one caption in a corner and
// a second one elsewhere in the same shape instead of the first one following
// the cursor around.
//
// Diagrams saved before this existed only have node.label (plus possibly a
// labelX/labelY from the single-label placement step), so those are read here
// as one equivalent block. An x/y of null means "centered", which is how a
// plain legacy label always rendered.
function getNodeTexts(node) {
  if (Array.isArray(node.texts)) return node.texts;

  if (node.label && `${node.label}`.trim()) {
    return [{
      id: `${node.id}-legacy`,
      x: typeof node.labelX === 'number' ? node.labelX : null,
      y: typeof node.labelY === 'number' ? node.labelY : null,
      value: node.label,
    }];
  }

  return [];
}

// Reads a contentEditable's content back as plain text, preserving the line
// breaks the user made with Shift/Alt+Enter and decoding entities (&nbsp;
// etc.) that the browser inserts while typing.
function readEditableText(el) {
  if (!el) return '';

  const raw = el.innerHTML
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(div|p)>/gi, '\n')
    .replace(/<[^>]+>/g, '');

  const decoder = document.createElement('textarea');
  decoder.innerHTML = raw;

  return decoder.value.trim();
}

export default function Node({
  node,
  layer,
  sideControls,
  selected,
  theme,
  dimmed,
  searchMatched,
  searchActive,
  mode,
  connectFrom,
  onMouseDown,
  onResizeStart,
  onLineEndpointDragStart,
  onQuickCreateFromNode,
  onReadModeDoubleClick,
  onSelect,
  onToggle,
  onConnect,
  onTextsChange,
  onAutoResize,
  maxTextWidth,
  markedForErase,
  autoEdit,
  onAutoEditConsumed,
  readMode,
}) {
  // Which text block is currently open for editing (null = none). Replaces
  // the old single `editing` boolean now that a shape can hold several.
  const [editingTextId, setEditingTextId] = useState(null);
  const [hoveredCp, setHoveredCp] = useState(null);
  const innerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  // Live DOM nodes for each text block, keyed by block id — measured by the
  // auto-grow effect below to work out how tall the shape has to be.
  const textElRefs = useRef({});

  const texts = getNodeTexts(node);

  const clearHoverTimeout = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
  }, []);

  const openQuickAdd = useCallback((position) => {
    clearHoverTimeout();
    setHoveredCp(position);
  }, [clearHoverTimeout]);

  const closeQuickAddSoon = useCallback(() => {
    clearHoverTimeout();
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredCp(null);
      hoverTimeoutRef.current = null;
    }, 160);
  }, [clearHoverTimeout]);

  const handleMouseDown = useCallback((event) => {
    if (event.target.classList.contains(styles.cp) || event.target.classList.contains(styles.resizeHandle)) return;

    // Pressing inside the text block that's currently open for editing has to
    // be left entirely to the browser: that press is the start of a
    // click-and-drag text selection. The node-drag path below calls
    // preventDefault() and begins moving the shape, which cancels the native
    // selection before it starts — which is why highlighting part of a label
    // did nothing while Ctrl+A (never routed through mousedown) worked fine.
    const pressedTextId = event.target.closest?.('[data-textid]')?.dataset?.textid;
    if (editingTextId && pressedTextId === editingTextId) {
      // Still kept from the canvas, so it doesn't start a rubber-band select.
      event.stopPropagation();
      return;
    }

    if (mode === 'connect') {
      onConnect(node.id);
      return;
    }

    if (mode === 'select' && !readMode) {
      // Shift counts as additive alongside Ctrl/Cmd — Shift+click is what most
      // people reach for first to build up a selection.
      onSelect(node.id, { additive: event.ctrlKey || event.metaKey || event.shiftKey });
      onMouseDown(event, node.id);
    }
  }, [mode, node.id, onConnect, onMouseDown, onSelect, readMode, editingTextId]);


  // Puts the caret at the end of the given editable element on the next tick
  // (after React has actually rendered it as contentEditable).
  const focusEditable = useCallback((textId) => {
    setTimeout(() => {
      const el = innerRef.current;
      if (!el || el.dataset.textid !== textId) return;

      el.focus();

      const range = document.createRange();
      range.selectNodeContents(el);
      // Collapse to the end instead of leaving everything selected. A full
      // "select all" range meant the very first Shift+Enter / Alt+Enter
      // deleted the existing text via insertLineBreak's range.deleteContents(),
      // so the first press looked like it did nothing.
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 0);
  }, []);

  // A text node created by double-clicking empty canvas (or by the Text tool)
  // arrives already carrying one empty block and flagged for auto-focus, so
  // the same gesture that created it also drops the caret in. Without this it
  // took four clicks: two to create the node, two more on the node itself
  // before anything could be typed.
  useEffect(() => {
    if (!autoEdit || readMode) return;

    const firstBlock = texts[0];
    if (!firstBlock) return;

    setEditingTextId(firstBlock.id);
    focusEditable(firstBlock.id);

    // Cleared immediately so this fires once: the flag lives in the parent's
    // state, and leaving it set would re-grab focus on later re-renders.
    if (typeof onAutoEditConsumed === 'function') onAutoEditConsumed();
    // Keyed on the flag alone — re-running as `texts` changes would fight the
    // user for the caret while they type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoEdit]);

  const handleDoubleClick = useCallback((event) => {
    if (readMode || mode !== "select") return;

    // Double-clicking ON an existing text block reopens THAT block for
    // editing.
    const hitText = event.target.closest?.('[data-textid]');
    if (hitText?.dataset?.textid) {
      // Already editing this block? Then this double-click is the browser's
      // "select the word under the cursor" gesture — leave it alone.
      // focusEditable() would otherwise collapse the caret to the very end and
      // wipe out the word that was just highlighted.
      if (editingTextId === hitText.dataset.textid) {
        event.stopPropagation();
        return;
      }

      setEditingTextId(hitText.dataset.textid);
      focusEditable(hitText.dataset.textid);
      return;
    }

    // Double-clicking anywhere ELSE in the shape edits the shape's own label,
    // which is a single block in the middle. It does not start a second block
    // at the spot that was clicked: a shape has one caption, and scattering
    // extra fragments around its interior by accident was easier to do than to
    // undo. Text that belongs somewhere specific is its own object, placed
    // with the Text tool.
    if (texts.length) {
      const existing = texts[0];
      setEditingTextId(existing.id);
      focusEditable(existing.id);
      return;
    }

    // Leaving x and y unset is what centres the block (see getTextBlockStyle).
    // Storing a measured midpoint instead would freeze the caption in place
    // the first time the shape was resized.
    const newText = {
      id: `${node.id}-t${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      x: null,
      y: null,
      value: '',
    };

    onTextsChange(node.id, [...texts, newText]);
    setEditingTextId(newText.id);
    focusEditable(newText.id);
  }, [mode, readMode, node.id, onTextsChange, texts, focusEditable, editingTextId]);

  // Finishing an edit: save the typed value back onto that one block, and
  // drop the block entirely if it was left empty so abandoned double-clicks
  // don't litter the shape with invisible empty text nodes.
  const handleTextBlur = useCallback((textId) => {
    const value = readEditableText(innerRef.current);

    const nextTexts = value
      ? texts.map((t) => (t.id === textId ? { ...t, value } : t))
      : texts.filter((t) => t.id !== textId);

    onTextsChange(node.id, nextTexts);
    setEditingTextId(null);
  }, [node.id, onTextsChange, texts]);

  // A press anywhere outside this node ends the edit.
  //
  // Clicking another shape cannot be relied on to blur the caret. handleMouseDown
  // above, and the drag start in Canvas.jsx, both call preventDefault() so a
  // shape can be dragged — and that also cancels the browser's focus change.
  // The contentEditable keeps focus, onBlur never fires, and the caret sits
  // blinking in a shape the user has already clicked away from, so the next
  // keystroke lands in the wrong one.
  useEffect(() => {
    if (!editingTextId) return undefined;

    const handleDocumentDown = (event) => {
      // Presses inside this node are its own business: moving the caret
      // between blocks, grabbing a resize handle, dragging the shape.
      if (event.target?.closest?.(`[data-nodeid="${node.id}"]`)) return;

      const el = innerRef.current;

      // Blurring is preferred over committing directly, because it goes
      // through the element's own onBlur — one commit, one history entry.
      // Calling handleTextBlur here as well would commit twice and leave a
      // duplicate undo step that looks like undo doing nothing.
      if (el && document.activeElement === el) {
        el.blur();
        return;
      }

      // Not actually focused (the press that opened it was swallowed, say):
      // nothing will fire onBlur, so close it here.
      handleTextBlur(editingTextId);
    };

    // Capture phase, so the edit is committed before whatever was clicked
    // starts handling the press.
    document.addEventListener('mousedown', handleDocumentDown, true);
    return () => document.removeEventListener('mousedown', handleDocumentDown, true);
  }, [editingTextId, node.id, handleTextBlur]);

  const insertLineBreak = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertLineBreak');
  }, []);

  const handleTextKeyDown = useCallback((event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      innerRef.current?.blur();
      return;
    }

    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (event.shiftKey || event.altKey) {
      insertLineBreak();
    } else {
      // Plain Enter finishes this block. The next double-click elsewhere in
      // the shape then starts a separate one.
      innerRef.current?.blur();
    }
  }, [insertLineBreak]);

  const isConnectSource = connectFrom === node.id;
  const strokeColor = !node.strokeColor || node.strokeColor === 'theme-auto'
    ? (theme === 'dark' ? '#ffffff' : '#1f1f1f')
    : node.strokeColor;
  const fillColor = node.fillColor || 'transparent';
  const fontFamily = node.fontFamily || 'Segoe UI';
  const fontSize = Math.max(MIN_TEXT_FONT_SIZE, Number(node.fontSize || 16));
  // A plain inline-style override on the wrapper div (see lineOverrideStyle
  // below) turned out not to be enough to blank out the rectangle
  // border/background for a line — whatever CSS paints that box is
  // apparently stronger than an inline style (e.g. an !important rule, or a
  // ::before/::after pseudo-element, which inline styles on the element
  // itself can never reach). diamond/hexagon/parallelogram/cylinder already
  // prove out a "no box chrome, just my own SVG content" class exists in
  // this stylesheet — borrowing shape_diamond's CLASS (not its polygon
  // rendering, which stays gated on node.shape === 'diamond' elsewhere) for
  // a line's wrapper div reuses that same proven "invisible box" styling
  // instead of fighting shape_rect's CSS from here. An image borrows the
  // same class for the same reason: the picture IS the content, so it needs
  // no rectangle drawn around it.
  // An oval is a circle that isn't forced square — Canvas.jsx only locks the
  // aspect ratio for 'circle', so the same fully-rounded styling stretched
  // over a non-square box reads as an ellipse. There's no shape_oval class in
  // the stylesheet, so it borrows shape_circle's (and sets the radius inline
  // below as a backstop in case that class does more than round the corners).
  const isLineShape = node.shape === 'line';
  const isOvalShape = node.shape === 'oval';
  const isImageShape = node.shape === 'image';

  // A free text shape sizes itself to what has been typed: it grows sideways
  // as you type and only breaks a line where the writer asked for one with
  // Shift+Enter or Alt+Enter — or when the line reaches the far side of the
  // screen, where carrying on sideways would just run the words out of sight.
  // Every other shape keeps the old behaviour: its width is the user's own
  // choice and the text wraps inside it.
  const autoWidth = node.shape === 'text';

  // Where an unbroken line gives up and wraps. Normally the width of what's on
  // screen, handed down by Canvas. A text shape that has been resized by hand
  // carries its own ceiling instead, so the lines it was left with are the
  // lines it keeps — see the resize branch in Canvas.jsx, which scales this
  // and the font size by the same amount so the words break in the same
  // places at any size.
  // Deliberately NOT rounded: a resize scales this and the font size by one
  // factor, and snapping either to a whole pixel is enough drift to move a
  // line break.
  const wrapCeiling = Math.max(
    MIN_TEXT_WRAP_WIDTH,
    Number(node.wrapWidth) > 0
      ? Number(node.wrapWidth)
      : (Number(maxTextWidth) > 0 ? Number(maxTextWidth) : DEFAULT_TEXT_WRAP_WIDTH),
  );
  const shapeClass = isLineShape || isImageShape
    ? (styles.shape_diamond || styles.shape_rect)
    : isOvalShape
      ? (styles.shape_circle || styles.shape_rect)
      : (styles[`shape_${node.shape}`] || styles.shape_rect);

  // Leaving select mode (or entering read mode) mid-edit: commit whatever was
  // typed into the open block and close it, rather than stranding an editable
  // element in a mode where it shouldn't be interactive.
  useEffect(() => {
    if (!readMode && mode === "select") return;
    if (!editingTextId) return;

    const value = readEditableText(innerRef.current);
    const nextTexts = value
      ? texts.map((t) => (t.id === editingTextId ? { ...t, value } : t))
      : texts.filter((t) => t.id !== editingTextId);

    onTextsChange(node.id, nextTexts);
    setEditingTextId(null);
    innerRef.current?.blur();

    try {
      const sel = window.getSelection?.();
      sel?.removeAllRanges();
    } catch (e) {}

    try {
      document.activeElement?.blur?.();
    } catch (e) {}
  }, [readMode, mode, editingTextId, node.id, onTextsChange, texts]);
  const isTextShape = node.shape === "text";

  // A text shape used to be re-styled into a bordered, drop-shadowed white
  // card as soon as the diagram was locked — so plain text turned into a
  // pill-shaped box the moment you switched to read mode, looking nothing
  // like what you laid out while editing. Locking now only makes the diagram
  // read-only; it doesn't restyle anything, so text reads as text in both
  // modes.

  // IMPORTANT: .nodeInner — not the outer .node div — is what actually
  // paints each shape's border/background (it spans the whole node and
  // flex-centers the label inside it). That's why earlier attempts to blank
  // a line's box by overriding the OUTER div did nothing, and why giving
  // .nodeInner `position: absolute` collapsed a shape into a narrow strip:
  // it kept its height:100% but shrank its width to fit the text. So both
  // of the overrides below target .nodeInner, and neither one ever takes it
  // out of normal flow.
  const lineOverrideStyle = isLineShape || isImageShape
    ? { background: 'transparent', border: 'none', boxShadow: 'none' }
    : {};

  const ovalOverrideStyle = isOvalShape ? { borderRadius: '50%' } : {};

  // Marked by an in-progress eraser stroke: grayed back and desaturated so
  // it's obvious what the stroke has caught, while staying visible enough to
  // swipe back over with Alt. Nothing is actually deleted until the mouse
  // button is released (see Canvas.jsx).
  const erasePreviewStyle = markedForErase
    ? { opacity: 0.25, filter: 'grayscale(1)' }
    : {};

  // Positions one text block inside the shape. An x/y of null means the block
  // is centered (how a legacy single label always looked); a number means it
  // sits exactly where that spot was double-clicked.
  //
  // Each block is absolutely positioned WITHIN .nodeInner — .nodeInner itself
  // is never taken out of flow, since it's the element that paints the
  // shape's border/background and must keep filling the node at full size.
  // Offsets are clamped to the node's CURRENT size so text stays inside its
  // shape even after the shape is later resized smaller than it was when the
  // spot was picked, and the vertical offset is pulled up about half a line
  // so the clicked point lands mid-text, where a caret visually belongs.
  const getTextBlockStyle = (textBlock) => {
    const isEditingThisBlock = editingTextId === textBlock.id;

    const base = {
      position: 'absolute',
      fontFamily,
      fontSize: `${fontSize}px`,
      lineHeight: 1.25,
      whiteSpace: 'pre-wrap',
      // max-content is what makes the box follow the text: the block is as
      // wide as the longest line wants to be, and the max-width below is the
      // only thing that ever makes it wrap. Measuring it then reads the width
      // actually used, not the width it was given.
      ...(autoWidth ? { width: 'max-content' } : null),
      // Highlighting has to be explicitly allowed on the block being edited —
      // the surrounding node chrome disables text selection so shapes can be
      // dragged without smearing a selection across their labels. Blocks that
      // aren't being edited keep that behavior, so dragging a shape by its
      // text still moves the shape.
      userSelect: isEditingThisBlock ? 'text' : 'none',
      WebkitUserSelect: isEditingThisBlock ? 'text' : 'none',
      // Long unbroken strings wrap instead of running out past the shape's
      // right edge — the shape grows downward to fit (see the auto-grow
      // effect below), so height is the only dimension that has to react.
      // A word longer than the whole line still has to break somewhere, but
      // only then — autoWidth text breaks between words everywhere else.
      overflowWrap: 'break-word',
      wordBreak: autoWidth ? 'normal' : 'break-word',
      outline: 'none',
      // Wide enough to type into comfortably, never wider than the shape.
      minWidth: 8,
      // Only the block actually open for editing claims the text cursor.
      // Elsewhere a press on a label drags the shape, so the shape's own
      // move cursor should show through — otherwise a text shape, which is
      // nothing but label, would never show that it can be moved.
      cursor: !readMode && isEditingThisBlock ? 'text' : 'inherit',
    };

    if (typeof textBlock.x !== 'number' || typeof textBlock.y !== 'number') {
      return {
        ...base,
        left: '50%',
        top: '50%',
        transform: 'translate(-50%, -50%)',
        // The ceiling is the screen (or the hand-set width), never the box's
        // own width — being clamped by the width it is about to decide is
        // what made the old text wrap at 160px forever.
        maxWidth: autoWidth ? wrapCeiling : '100%',
        textAlign: 'center',
      };
    }

    const left = Math.max(0, Math.min(textBlock.x, Math.max(0, node.w - 12)));
    const top = Math.max(0, Math.min(textBlock.y - fontSize * 0.6, Math.max(0, node.h - fontSize - 2)));

    return {
      ...base,
      left,
      top,
      maxWidth: autoWidth ? wrapCeiling : Math.max(12, node.w - left),
      textAlign: 'left',
    };
  };

  // Auto-grow: after each render, measure what the text blocks actually need
  // and ask the parent to raise the shape's height if they no longer fit.
  // Typing wraps text onto new lines, which would otherwise spill out past
  // the bottom border.
  //
  // Measured against each block's UNCLAMPED top (its intended offset, not the
  // one squeezed to fit the current height). Using the clamped value would
  // move the target every time the box grew, taking several passes to settle;
  // this way the needed height is a fixed target and converges immediately.
  //
  // offsetHeight is layout height, so the canvas's CSS zoom transform doesn't
  // distort it — these stay in the node's own coordinate space.
  //
  // Images are excluded: growing the box to fit a caption would stretch the
  // picture's frame, and the caption is meant to sit ON the image anyway.
  const fitBoxToText = useCallback(() => {
    if (isLineShape || isImageShape || !texts.length || typeof onAutoResize !== 'function') return;

    let neededH = 0;
    let neededW = 0;

    texts.forEach((textBlock) => {
      const el = textElRefs.current[textBlock.id];
      if (!el) return;

      const blockHeight = el.offsetHeight;

      if (typeof textBlock.y === 'number') {
        neededH = Math.max(neededH, Math.max(0, textBlock.y - fontSize * 0.6) + blockHeight);
      } else {
        // A centered block needs at least its own height to sit inside.
        neededH = Math.max(neededH, blockHeight);
      }

      // Same reasoning as the height above: measured from the block's
      // UNCLAMPED left, so the target doesn't move as the box resizes.
      const left = typeof textBlock.x === 'number' ? Math.max(0, textBlock.x) : 0;
      neededW = Math.max(neededW, left + el.offsetWidth);
    });

    // Every other shape: only ever taller, never narrower, because its width
    // belongs to the user and the text wraps to it.
    if (!autoWidth) {
      const needed = neededH + TEXT_FIT_PADDING;
      if (needed > node.h) onAutoResize(node.id, { h: Math.ceil(needed) });
      return;
    }

    // A text shape's box is the text, so it shrinks as well as grows — that is
    // what stops a sentence that has been shortened from leaving a selection
    // box stretched out across empty canvas.
    const w = Math.max(MIN_TEXT_SHAPE_WIDTH, Math.ceil(neededW + TEXT_SHAPE_PADDING));
    const h = Math.max(Math.ceil(fontSize * 1.25), Math.ceil(neededH + TEXT_SHAPE_PADDING));

    if (w !== node.w || h !== node.h) {
      onAutoResize(node.id, { w, h, exact: true });
    }
  }, [isLineShape, isImageShape, autoWidth, wrapCeiling, texts, onAutoResize, fontSize, node.w, node.h, node.id]);

  useLayoutEffect(fitBoxToText);

  // Typing inside a contentEditable mutates the DOM directly without any
  // React state change, so the effect above wouldn't re-run until the edit was
  // committed on blur — the text would visibly spill out of the shape the
  // whole time you were writing it. Re-measuring on each input keeps the box
  // growing line by line as you type.
  const handleTextInput = useCallback(() => {
    fitBoxToText();
  }, [fitBoxToText]);

  return (
    <div
    className={[
      styles.node,
      shapeClass,
      selected ? styles.selected : '',
      isConnectSource ? styles.connectSource : '',
      readMode ? styles.readOnly : '',
      dimmed ? styles.dimmed : '',
      searchMatched ? styles.searchMatched : '',
      searchActive ? styles.searchActive : '',
    ].join(' ')}
    style={{
      left: node.x,
      top: node.y,
      width: node.w,
      height: node.h,
      // Set by the canvas from how deeply this shape is nested. A shape that
      // encloses others sits below the connection layer so its fill can't
      // blot out the arrows crossing it.
      ...(typeof layer === 'number' ? { zIndex: layer } : {}),
      '--node-stroke': strokeColor,
      '--node-fill': fillColor,
      ...lineOverrideStyle,
      ...erasePreviewStyle,
    }}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      data-nodeid={node.id}
    >
      {SVG_SHAPES.includes(node.shape) && (
        <NodeShape shape={node.shape} w={node.w} h={node.h} strokeColor={strokeColor} fillColor={fillColor} />
      )}

      {isLineShape && (
        <LineShape node={node} strokeColor={strokeColor} />
      )}

      {/* A pasted / dropped / picked image. Rendered BEFORE .nodeInner so the
          text blocks inside it still land on top — double-clicking an image
          captions it rather than being swallowed by the picture.
          object-fit: contain means dragging a corner handle never distorts
          the image; it just letterboxes inside whatever box it's given. */}
      {isImageShape && node.src && (
        <img
          src={node.src}
          alt=""
          draggable={false}
          style={{
            position: 'absolute',
            inset: 0,
            width: '100%',
            height: '100%',
            objectFit: 'contain',
            pointerEvents: 'none',
            userSelect: 'none',
          }}
        />
      )}

      {/* .nodeInner is the shape's visual body: it paints the border and
          background and must keep filling the node at full size, so it is
          never repositioned and is no longer the editable element itself.
          The text blocks below are absolutely positioned inside it, which is
          what allows several independent captions per shape. */}
      <div
        className={styles.nodeInner}
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
          position: 'relative',
          // A line has to blank its box HERE — overriding the outer .node div
          // never touched the element actually drawing that rectangle.
          ...lineOverrideStyle,
          ...ovalOverrideStyle,
        }}
      >
        {texts.map((textBlock) => {
          const isEditingThis = editingTextId === textBlock.id;

          return (
            <div
              key={textBlock.id}
              ref={(el) => {
                // Every block is tracked for measurement (auto-grow); the one
                // being edited additionally drives focus/caret placement.
                if (el) textElRefs.current[textBlock.id] = el;
                else delete textElRefs.current[textBlock.id];
                if (isEditingThis) innerRef.current = el;
              }}
              data-textid={textBlock.id}
              className={styles.nodeText}
              contentEditable={isEditingThis && !readMode}
              suppressContentEditableWarning
              onBlur={isEditingThis ? () => handleTextBlur(textBlock.id) : undefined}
              onKeyDown={isEditingThis ? handleTextKeyDown : undefined}
              onInput={isEditingThis ? handleTextInput : undefined}
              style={getTextBlockStyle(textBlock)}
            >
              {textBlock.value}
            </div>
          );
        })}
      </div>

      {!readMode && CP_POSITIONS.map((cp) => (

        <React.Fragment key={cp.pos}>
          <div
            className={styles.cp}
            // Crosshair for the same reason the resize handles name theirs:
            // a connection point starts an arrow, not a move, and it sits on
            // top of a shape that now says move.
            style={{ left: cp.left, top: cp.top, cursor: 'crosshair' }}
            onMouseDown={(event) => {
              event.stopPropagation();
              onConnect(node.id);
            }}
            onMouseEnter={() => openQuickAdd(cp.pos)}
            onMouseLeave={closeQuickAddSoon}
            data-pos={cp.pos}
          />

          {hoveredCp === cp.pos && (
            <button
              type="button"
              className={[styles.quickAdd, styles[`quickAdd_${cp.pos}`]].join(' ')}
              onMouseEnter={() => openQuickAdd(cp.pos)}
              onMouseLeave={closeQuickAddSoon}
              onMouseDown={(event) => {
                clearHoverTimeout();
                event.stopPropagation();
                event.preventDefault();
                onQuickCreateFromNode(node.id, cp.pos);
                setHoveredCp(null);
              }}
              title={`Create ${node.shape} node`}
            >
              <PlusOutlined />
            </button>
          )}
        </React.Fragment>
      ))}

      {!readMode && selected && mode === 'select' && (
        isLineShape ? (
          // A line has two ends, not four corners — drag either dot to move
          // just that endpoint (see Canvas.jsx's handleLineEndpointDragStart),
          // instead of the box-style corner resize every other shape uses.
          <>
            <div
              className={styles.resizeHandle}
              style={{
                position: 'absolute',
                left: (node.x1 ?? node.x) - node.x,
                top: (node.y1 ?? node.y) - node.y,
                transform: 'translate(-50%, -50%)',
                cursor: 'crosshair',
              }}
              onMouseDown={(event) => onLineEndpointDragStart(event, node.id, 0)}
            />
            <div
              className={styles.resizeHandle}
              style={{
                position: 'absolute',
                left: (node.x2 ?? node.x + node.w) - node.x,
                top: (node.y2 ?? node.y + node.h) - node.y,
                transform: 'translate(-50%, -50%)',
                cursor: 'crosshair',
              }}
              onMouseDown={(event) => onLineEndpointDragStart(event, node.id, 1)}
            />
          </>
        ) : (
          <>
            {['nw', 'ne', 'se', 'sw'].map((handle) => (
              <div
                key={handle}
                className={[styles.resizeHandle, styles[`resizeHandle_${handle}`]].join(' ')}
                // Stated here rather than left to the stylesheet: the shape
                // now sets a move cursor, and anything on top of it that does
                // not say otherwise would inherit it and promise the wrong
                // gesture.
                style={{ cursor: handle === 'nw' || handle === 'se' ? 'nwse-resize' : 'nesw-resize' }}
                onMouseDown={(event) => onResizeStart(event, node.id, handle)}
              />
            ))}
          </>
        )
      )}


      {readMode && sideControls?.map((control) => (
        <button
          type="button"
          key={control.side}
          className={[
            styles.expandHint,
            styles[`expandHint_${control.side}`],
            control.collapsed ? styles.expandBtnOpen : styles.expandBtnClose
          ].join(' ')}
          onClick={(event) => {
            event.stopPropagation();
            onToggle(node.id, control.side);
          }}
          title={`${control.collapsed ? 'Open' : 'Close'} ${control.side} branch`}
        >
          {control.collapsed ? <PlusOutlined /> : <MinusOutlined />}
        </button>
      ))}
    </div>
  );
}