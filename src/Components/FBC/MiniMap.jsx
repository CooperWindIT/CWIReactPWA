import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

// A small picture of the whole diagram with a box showing the part of it
// currently on screen. Click or drag inside it to move there.
//
// The map is drawn from the node boxes alone — no text, no shape outlines,
// no arrow routing. At this size none of that would be legible, and
// recomputing the real routes for a thumbnail on every scroll would cost far
// more than the picture is worth. Connections are drawn as straight lines
// between centres purely to show how the clusters hang together.

// The panel sits directly above the zoom controls, found by measuring them
// rather than by hard-coding where they are — move the dock and the map
// follows it. These two are only the fallback for when that element isn't on
// the page at all.
const DOCK_SELECTOR = '.fc-zoomDock';
const DOCK_GAP = 10;
const FALLBACK_LEFT = 16;
const FALLBACK_BOTTOM = 84;
// Kept this far from the edge of the window in every direction.
const SCREEN_MARGIN = 8;
// The toggle is its own floating button rather than another one inside the
// zoom dock. Put there, it made that dock wider, and the undo/redo dock —
// which is pinned at a fixed offset of its own — slid straight over the top
// of it. Stacking above the dock keeps it clear of both without needing a
// single change to flow.css.
const BUTTON_SIZE = 40;

const PANEL_WIDTH = 232;
const PANEL_HEIGHT = 150;
const PANEL_PADDING = 8;
// Breathing room around the diagram inside the map, in canvas units, so
// shapes at the edge aren't flush against the border.
const CONTENT_MARGIN = 60;

export default function MiniMap({
  nodes,
  connections,
  view,
  theme,
  onJump,
  open,
  onToggle,
}) {
  const isDark = theme === 'dark';
  const surfaceRef = useRef(null);
  const draggingRef = useRef(false);

  // Measured from the zoom dock so the map always sits just above it,
  // wherever that dock happens to be, and so it can't be pushed off the
  // bottom or the side of the window by a number written here.
  const [dock, setDock] = useState(null);

  useLayoutEffect(() => {
    const place = () => {
      const el = document.querySelector(DOCK_SELECTOR);

      if (!el) {
        setDock(null);
        return;
      }

      const rect = el.getBoundingClientRect();

      // An element that is hidden, or not laid out yet, measures as nothing —
      // trusting that would pin the map to the top-left corner.
      if (!rect.width && !rect.height) {
        setDock(null);
        return;
      }

      const maxLeft = Math.max(SCREEN_MARGIN, window.innerWidth - PANEL_WIDTH - SCREEN_MARGIN);
      const left = Math.min(Math.max(SCREEN_MARGIN, rect.left), maxLeft);

      // The button sits just above the dock, and the panel just above the
      // button, so the three stack up the left edge in that order.
      const buttonBottom = Math.max(SCREEN_MARGIN, window.innerHeight - rect.top + DOCK_GAP);
      const panelBottom = buttonBottom + BUTTON_SIZE + DOCK_GAP;
      const maxPanelBottom = Math.max(SCREEN_MARGIN, window.innerHeight - PANEL_HEIGHT - SCREEN_MARGIN);

      setDock({
        left,
        buttonBottom,
        panelBottom: Math.min(panelBottom, maxPanelBottom),
      });
    };

    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, []);

  const colors = {
    bg: isDark ? '#232136' : '#ffffff',
    border: isDark ? '#3a3750' : '#e4e4ef',
    field: isDark ? '#1c1a2b' : '#f7f7fb',
    node: isDark ? '#6b6880' : '#c7c6d4',
    link: isDark ? '#4a4762' : '#dedde6',
    viewFill: 'rgba(105,110,255,0.18)',
    viewStroke: '#696eff',
    label: isDark ? '#b8b5cc' : '#6b6880',
  };

  const innerWidth = PANEL_WIDTH - PANEL_PADDING * 2;
  const innerHeight = PANEL_HEIGHT - PANEL_PADDING * 2;

  // What the map covers: everything drawn, plus wherever the viewport
  // currently is. Without the viewport in the union, scrolling away from the
  // diagram would push the box off the map and leave nothing to drag back.
  const frame = useMemo(() => {
    const boxes = nodes.map((node) => ({
      left: node.x,
      top: node.y,
      right: node.x + node.w,
      bottom: node.y + node.h,
    }));

    if (view) {
      boxes.push({
        left: view.x,
        top: view.y,
        right: view.x + view.w,
        bottom: view.y + view.h,
      });
    }

    if (!boxes.length) return null;

    const left = Math.min(...boxes.map((b) => b.left)) - CONTENT_MARGIN;
    const top = Math.min(...boxes.map((b) => b.top)) - CONTENT_MARGIN;
    const right = Math.max(...boxes.map((b) => b.right)) + CONTENT_MARGIN;
    const bottom = Math.max(...boxes.map((b) => b.bottom)) + CONTENT_MARGIN;

    const width = Math.max(1, right - left);
    const height = Math.max(1, bottom - top);

    // One scale for both axes, so the diagram keeps its proportions, and it
    // is centred in whichever direction has room left over.
    const scale = Math.min(innerWidth / width, innerHeight / height);

    return {
      left,
      top,
      scale,
      offsetX: (innerWidth - width * scale) / 2,
      offsetY: (innerHeight - height * scale) / 2,
    };
  }, [nodes, view, innerWidth, innerHeight]);

  const toMap = useCallback((x, y) => ({
    x: frame.offsetX + (x - frame.left) * frame.scale,
    y: frame.offsetY + (y - frame.top) * frame.scale,
  }), [frame]);

  // A press anywhere on the map means "put this spot in the middle of the
  // screen", and holding the button keeps following the cursor.
  const jumpToEvent = useCallback((event) => {
    const surface = surfaceRef.current;
    if (!surface || !frame || typeof onJump !== 'function') return;

    const rect = surface.getBoundingClientRect();
    const x = frame.left + (event.clientX - rect.left - frame.offsetX) / frame.scale;
    const y = frame.top + (event.clientY - rect.top - frame.offsetY) / frame.scale;

    onJump(x, y);
  }, [frame, onJump]);

  useEffect(() => {
    const onMove = (event) => {
      if (draggingRef.current) jumpToEvent(event);
    };
    const onUp = () => { draggingRef.current = false; };

    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [jumpToEvent]);

  const nodeMap = useMemo(
    () => Object.fromEntries(nodes.map((node) => [node.id, node])),
    [nodes],
  );

  const left = dock ? dock.left : FALLBACK_LEFT;

  const toggleButton = (
    <button
      type="button"
      title={open ? 'Hide the map' : 'Show the map'}
      aria-label={open ? 'Hide the map' : 'Show the map'}
      onClick={onToggle}
      style={{
        position: 'fixed',
        left,
        bottom: dock ? dock.buttonBottom : FALLBACK_BOTTOM - BUTTON_SIZE - DOCK_GAP,
        zIndex: 26,
        boxSizing: 'border-box',
        width: BUTTON_SIZE,
        height: BUTTON_SIZE,
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 0,
        border: 'none',
        borderRadius: 12,
        cursor: 'pointer',
        color: '#ffffff',
        background: open
          ? 'linear-gradient(135deg, #4338ca, #7c3aed)'
          : 'linear-gradient(135deg, #6366f1, #8b5cf6, #ec4899)',
        boxShadow: open
          ? '0 6px 18px rgba(79,70,229,0.45), 0 0 0 3px rgba(139,92,246,0.25)'
          : '0 6px 18px rgba(79,70,229,0.35)',
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 4 3 6.5v13L9 17l6 2.5 6-2.5v-13L15 6.5 9 4Z" />
        <path d="M9 4v13" />
        <path d="M15 6.5v13" />
      </svg>
    </button>
  );

  if (!open) return toggleButton;

  return (
    <>
    {toggleButton}
    <div
      style={{
        position: 'fixed',
        left,
        bottom: dock ? dock.panelBottom : FALLBACK_BOTTOM,
        zIndex: 25,
        boxSizing: 'border-box',
        width: PANEL_WIDTH,
        padding: PANEL_PADDING,
        borderRadius: 12,
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 12px 30px rgba(0,0,0,0.20)',
        userSelect: 'none',
      }}
      // The map floats over the canvas; without this a press on it would also
      // reach the canvas underneath and clear the selection.
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
      onDoubleClick={(event) => event.stopPropagation()}
    >
      <div
        ref={surfaceRef}
        onMouseDown={(event) => {
          event.preventDefault();
          draggingRef.current = true;
          jumpToEvent(event);
        }}
        style={{
          position: 'relative',
          boxSizing: 'border-box',
          width: innerWidth,
          height: innerHeight,
          borderRadius: 8,
          background: colors.field,
          overflow: 'hidden',
          cursor: frame ? 'pointer' : 'default',
        }}
      >
        {!frame && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.label,
              fontSize: 12,
            }}
          >
            Nothing drawn yet
          </div>
        )}

        {frame && (
          <svg width={innerWidth} height={innerHeight} style={{ display: 'block' }}>
            {connections.map((connection) => {
              const from = nodeMap[connection.from];
              const to = nodeMap[connection.to];
              if (!from || !to) return null;

              const a = toMap(from.x + from.w / 2, from.y + from.h / 2);
              const b = toMap(to.x + to.w / 2, to.y + to.h / 2);

              return (
                <line
                  key={connection.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={colors.link}
                  strokeWidth={1}
                />
              );
            })}

            {nodes.map((node) => {
              const topLeft = toMap(node.x, node.y);

              return (
                <rect
                  key={node.id}
                  x={topLeft.x}
                  y={topLeft.y}
                  // Never thinner than a pixel: a line shape or a slim text
                  // box would otherwise scale down to nothing and the map
                  // would be missing things the diagram clearly has.
                  width={Math.max(1.5, node.w * frame.scale)}
                  height={Math.max(1.5, node.h * frame.scale)}
                  rx={1.5}
                  fill={colors.node}
                />
              );
            })}

            {view && (() => {
              const topLeft = toMap(view.x, view.y);

              return (
                <rect
                  x={topLeft.x}
                  y={topLeft.y}
                  width={Math.max(4, view.w * frame.scale)}
                  height={Math.max(4, view.h * frame.scale)}
                  rx={2}
                  fill={colors.viewFill}
                  stroke={colors.viewStroke}
                  strokeWidth={1.5}
                />
              );
            })()}
          </svg>
        )}
      </div>

      {typeof onToggle === 'function' && (
        <button
          type="button"
          title="Hide the map"
          aria-label="Hide the map"
          onClick={onToggle}
          style={{
            position: 'absolute',
            top: 4,
            right: 4,
            width: 20,
            height: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 0,
            border: 'none',
            borderRadius: 6,
            background: 'transparent',
            color: colors.label,
            cursor: 'pointer',
            fontSize: 14,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      )}
    </div>
    </>
  );
}