import React, { useRef, useState, useCallback, useEffect } from 'react';
import NodeShape from './NodeShape';
import styles from './Node.module.css';
import { PlusOutlined, MinusOutlined } from '@ant-design/icons';

const SVG_SHAPES = ['diamond', 'parallelogram', 'hexagon', 'cylinder'];
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

export default function Node({
  node,
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
  onLabelChange,
  readMode,
}) {
  const [editing, setEditing] = useState(false);
  const [hoveredCp, setHoveredCp] = useState(null);
  const innerRef = useRef(null);
  const hoverTimeoutRef = useRef(null);

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

    if (mode === 'connect') {
      onConnect(node.id);
      return;
    }

    if (mode === 'select' && !readMode) {
      onSelect(node.id, { additive: event.ctrlKey || event.metaKey });
      onMouseDown(event, node.id);
    }
  }, [mode, node.id, onConnect, onMouseDown, onSelect, readMode]);


  const handleDoubleClick = useCallback(() => {
    if (readMode || mode !== "select") return;

    setEditing(true);

    setTimeout(() => {
      if (!innerRef.current) return;
      innerRef.current.focus();

      const range = document.createRange();
      range.selectNodeContents(innerRef.current);
      // Collapse to the end instead of leaving everything selected.
      // A full "select all" range meant the very first Shift+Enter /
      // Alt+Enter deleted the existing label text via insertLineBreak's
      // range.deleteContents(), so the first press looked like it did
      // nothing and a second press was needed to see a visible break.
      range.collapse(false);

      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
    }, 0);
  }, [mode, readMode]);

  const handleBlur = useCallback(() => {
    const el = innerRef.current;
    if (el) {
      const raw = el.innerHTML
        .replace(/<br\s*\/?>/gi, '\n')
        .replace(/<\/(div|p)>/gi, '\n')
        .replace(/<[^>]+>/g, '');

      // Decode HTML entities (&nbsp;, &amp;, etc.) safely.
      const decoder = document.createElement('textarea');
      decoder.innerHTML = raw;

      onLabelChange(node.id, decoder.value.trim());
    }
    setEditing(false);
  }, [node.id, onLabelChange]);


  const insertLineBreak = useCallback(() => {
    const el = innerRef.current;
    if (!el) return;
    el.focus();
    document.execCommand('insertLineBreak');
  }, []);


  const handleKeyDown = useCallback((event) => {
    if (event.key !== 'Enter') return;
    event.preventDefault();

    if (event.shiftKey || event.altKey) {
      insertLineBreak();
    } else {
      innerRef.current?.blur();
    }
  }, [insertLineBreak]);

  const isConnectSource = connectFrom === node.id;
  const strokeColor = !node.strokeColor || node.strokeColor === 'theme-auto'
    ? (theme === 'dark' ? '#ffffff' : '#1f1f1f')
    : node.strokeColor;
  const fillColor = node.fillColor || 'transparent';
  const fontFamily = node.fontFamily || 'Segoe UI';
  const fontSize = Math.max(10, Number(node.fontSize || 16));
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
  // instead of fighting shape_rect's CSS from here.
  const shapeClass = node.shape === 'line'
    ? (styles.shape_diamond || styles.shape_rect)
    : (styles[`shape_${node.shape}`] || styles.shape_rect);
  const isLineShape = node.shape === 'line';

  useEffect(() => {
    if (!readMode && mode === "select") return;

    if (editing && innerRef.current) {
      onLabelChange(node.id, innerRef.current.textContent?.trim() || "");
    }

    setEditing(false);
    innerRef.current?.blur();

    try {
      const sel = window.getSelection?.();
      sel?.removeAllRanges();
    } catch (e) {}

    try {
      document.activeElement?.blur?.();
    } catch (e) {}
  }, [readMode, mode, editing, node.id, onLabelChange]);
  const isTextShape = node.shape === "text";

const textReadOnlyStyle =
  readMode && isTextShape
    ? {
        width: Math.max(node.w || 0, 130),
        minHeight: 54,
        padding: "10px 16px",
        border: `2px solid ${strokeColor}`,
        borderRadius: "16px",
        background: theme === "dark" ? "rgba(30,30,30,0.95)" : "#ffffff",
        boxShadow: "0 6px 16px rgba(0,0,0,0.10)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {};
    const textReadOnlyInnerStyle =
    readMode && isTextShape
      ? {
          width: "100%",
          textAlign: "center",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          whiteSpace: "nowrap",
        }
      : {};

  // There's no dedicated `shape_line` class in Node.module.css, so the
  // shapeClass lookup above falls back to `shape_rect` for a line node —
  // which would paint the usual rectangle border/background behind our
  // diagonal stroke. Override those inline instead of touching the CSS
  // module: a line should show nothing but the stroke itself.
  const lineOverrideStyle = isLineShape
    ? { background: 'transparent', border: 'none', boxShadow: 'none' }
    : {};

  return (
    <div
    className={[
      styles.node,
      shapeClass,
      selected ? styles.selected : '',
      isConnectSource ? styles.connectSource : '',
      readMode ? styles.readOnly : '',
      isTextShape && readMode ? styles.textShapeReadOnly : '',
      dimmed ? styles.dimmed : '',
      searchMatched ? styles.searchMatched : '',
      searchActive ? styles.searchActive : '',
    ].join(' ')}
    style={{
      left: node.x,
      top: node.y,
      width: node.w,
      height: node.h,
      '--node-stroke': strokeColor,
      '--node-fill': fillColor,
      ...lineOverrideStyle,
      ...textReadOnlyStyle,
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

      {/* <div
        ref={innerRef}
        className={styles.nodeInner}
        // contentEditable={editing}
        contentEditable={editing && !readMode}
        suppressContentEditableWarning
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={{
          fontFamily,
          fontSize: `${fontSize}px`,
        }}
      >
        {node.label}
      </div> */}
      <div
  ref={innerRef}
  className={styles.nodeInner}
  contentEditable={editing && !readMode}
  suppressContentEditableWarning
  onBlur={handleBlur}
  onKeyDown={handleKeyDown}
  tabIndex={readMode ? -1 : 0}
  style={{
    fontFamily,
    fontSize: `${fontSize}px`,
    ...textReadOnlyInnerStyle,
  }}
>
  {node.label}
</div>

      {/* {!readMode && CP_POSITIONS.map((cp) => (
        <div
          key={cp.pos}
          className={styles.cp}
          style={{ left: cp.left, top: cp.top }}
          onMouseDown={(event) => {
            event.stopPropagation();
            onConnect(node.id);
          }}
          data-pos={cp.pos}
        />
      ))} */}

      {!readMode && CP_POSITIONS.map((cp) => (

        <React.Fragment key={cp.pos}>
          <div
            className={styles.cp}
            style={{ left: cp.left, top: cp.top }}
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